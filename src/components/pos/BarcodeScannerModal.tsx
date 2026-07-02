/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, AlertTriangle, RefreshCw, FlashlightIcon, ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

/**
 * BarcodeScannerModal — Kamera Scanner untuk HP
 * 
 * 🔧 OPTIMASI KHUSUS ANDROID:
 * - decodeFromCanvas (bukan decodeFromImageData) — kompatibel dengan Android WebView
 * - Resolusi canvas 640x480 — cukup besar untuk barcode terbaca
 * - TRY_HARDER = true — penting untuk kamera HP yang kurang fokus
 * - Interval 500ms — lebih responsif
 * - Semua format barcode umum didukung
 */
const BarcodeScannerModal: React.FC<Props> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const hasScannedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const readerRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [scanFileError, setScanFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  const SCAN_INTERVAL = 500; // 500ms — lebih responsif
  const MAX_SCAN_ATTEMPTS = 60; // ~30 detik timeout

  /**
   * Buat ZXing reader sekali saja (cache)
   */
  const getReader = useCallback(async () => {
    if (readerRef.current) return readerRef.current;

    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');

    const hints = new Map();
    // ✅ Semua format barcode umum
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.ITF,
    ]);
    // ✅ TRY_HARDER penting untuk kamera HP yang kurang fokus
    hints.set(DecodeHintType.TRY_HARDER, true);

    readerRef.current = new BrowserMultiFormatReader(hints);
    return readerRef.current;
  }, []);

  /**
   * Inisialisasi kamera
   */
  const initCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      setLoading(false);
      return;
    }

    if (!window.isSecureContext) {
      setError('❌ Aplikasi tidak berjalan di HTTPS atau localhost.\n\nKamera hanya bekerja di lingkungan aman (HTTPS/localhost).');
      setLoading(false);
      return;
    }

    try {
      // 🔥 Resolusi 720p — cukup besar untuk barcode terbaca, tidak terlalu berat
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Cek torch
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.();
        if (capabilities?.torch) {
          setTorchSupported(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraAvailable(true);
      setLoading(false);

      // Mulai periodic scan
      startPeriodicScan();
    } catch (err: any) {
      console.error('Camera init error:', err);

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError('❌ Akses kamera ditolak.\n\nSilakan izinkan kamera di browser Anda.');
        setLoading(false);
        return;
      }

      if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraAvailable(false);
        setLoading(false);
        return;
      }

      // Fallback — coba tanpa resolusi spesifik
      if (err?.name === 'OverconstrainedError') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
          }
          setCameraAvailable(true);
          setLoading(false);
          startPeriodicScan();
          return;
        } catch {}
      }

      setError(`❌ Gagal membuka kamera.\n\nError: ${err?.message || err?.name || 'Unknown'}`);
      setLoading(false);
    }
  }, []);

  /**
   * 🔥 PERIODIC SCANNING — decode langsung dari canvas (kompatibel Android WebView)
   * 
   * Menggunakan decodeFromCanvas (bukan decodeFromImageData) karena:
   * - decodeFromImageData sering gagal di Android WebView
   * - decodeFromCanvas bekerja langsung dengan elemen canvas
   * - Lebih stabil di berbagai browser
   */
  const startPeriodicScan = useCallback(() => {
    if (scanTimerRef.current) return;

    const scanFrame = async () => {
      if (hasScannedRef.current || isProcessingRef.current) return;
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < 2) return;

      isProcessingRef.current = true;

      try {
        // 🔥 Gambar frame video ke canvas dengan resolusi 640x480
        canvas.width = 640;
        canvas.height = 480;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 🔥 Decode BARCODE langsung dari CANVAS (kompatibel Android)
        const reader = await getReader();
        const result = await reader.decodeFromCanvas(canvas);

        if (result?.getText() && !hasScannedRef.current) {
          hasScannedRef.current = true;
          const decodedText = result.getText();
          console.log('✅ Barcode terdeteksi:', decodedText);
          cleanup();
          onScan(decodedText);
          onClose();
        }
      } catch {
        // Tidak ada barcode — lanjut
      } finally {
        isProcessingRef.current = false;
        setScanCount(prev => prev + 1);
      }
    };

    scanTimerRef.current = window.setInterval(scanFrame, SCAN_INTERVAL);

    timeoutRef.current = window.setTimeout(() => {
      if (!hasScannedRef.current) {
        setError('⏱️ Waktu scan habis.\n\nTidak ada barcode terdeteksi dalam 30 detik. Silakan coba:\n1. Pencahayaan lebih terang\n2. Posisikan barcode di tengah frame\n3. Atau gunakan unggah foto');
        cleanup();
      }
    }, MAX_SCAN_ATTEMPTS * SCAN_INTERVAL);
  }, [getReader, onScan, onClose]);

  const cleanup = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    initCamera();

    return () => {
      cleanup();
    };
  }, [initCamera, cleanup]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.warn('Torch not supported:', err);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setScanFileError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = await getReader();
      const imageUrl = URL.createObjectURL(file);
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);

      if (result?.getText()) {
        cleanup();
        onScan(result.getText());
        onClose();
      }
    } catch (err: any) {
      console.error('Scan file error:', err);
      setScanFileError('Tidak dapat membaca barcode dari foto. Pastikan foto jelas dan barcode berada di dalam frame.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRetry = () => {
    hasScannedRef.current = false;
    isProcessingRef.current = false;
    setError(null);
    setScanCount(0);
    setLoading(true);
    cleanup();
    initCamera();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-90/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                <Camera size={20} strokeWidth={2.5} />
             </div>
             <div>
                <h2 className="font-black text-lg text-slate-800 tracking-tight leading-none uppercase">Scanner Kamera</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest text-[#10B981]">
                  {cameraAvailable ? 'Arahkan ke barcode — scan otomatis' : 'Unggah foto barcode'}
                </p>
             </div>
          </div>
          <button 
            onClick={() => { cleanup(); onClose(); }} 
            className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="rounded-[24px] border-2 border-red-100 bg-red-50 p-8 text-center">
              <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
              <p className="text-sm font-bold text-red-700 mb-6 whitespace-pre-line">{error}</p>
              
              <button 
                onClick={handleRetry} 
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all"
              >
                <RefreshCw size={16} /> COBA LAGI
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[#10B981] text-white py-3 rounded-xl font-bold mt-3 hover:bg-emerald-600 transition-all"
              >
                <ImageIcon size={16} className="inline mr-1" /> Unggah Foto Barcode
              </button>
            </div>
          ) : cameraAvailable === false ? (
            <div className="rounded-[24px] border-2 border-slate-100 bg-slate-50 p-8 text-center space-y-4">
              <Camera size={40} className="text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-black text-slate-700">Kamera tidak tersedia</p>
                <p className="text-xs text-slate-500 mt-1">Perangkat ini tidak memiliki kamera atau browser tidak mendukung akses kamera.</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[#10B981] hover:bg-emerald-600 text-white py-3 rounded-2xl font-black transition-all"
              >
                <ImageIcon size={16} className="inline mr-1" /> Unggah Foto Barcode
              </button>
              {scanFileError && (
                <p className="text-[10px] text-red-600 font-bold">{scanFileError}</p>
              )}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[24px] border-2 border-slate-100 bg-slate-950 aspect-video shadow-inner">
              <video 
                ref={videoRef}
                id="reader" 
                className="w-full h-full object-cover"
                playsInline 
                muted 
                autoPlay
              />
              
              {loading && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 text-white z-10">
                  <Camera size={40} className="text-indigo-400 mb-4 animate-pulse" />
                  <p className="text-sm font-bold">Membuka kamera...</p>
                  <p className="text-xs text-slate-400 mt-1">Harap izinkan akses kamera</p>
                </div>
              )}

              {!loading && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="relative w-56 h-32">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
                      <div className="absolute left-2 right-2 h-0.5 bg-indigo-400/60 animate-pulse rounded-full" style={{ top: '50%' }} />
                    </div>
                  </div>

                  {torchSupported && (
                    <button
                      onClick={toggleTorch}
                      className={cn(
                        "absolute top-3 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        torchOn 
                          ? "bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-200" 
                          : "bg-slate-800/70 text-white hover:bg-slate-700"
                      )}
                    >
                      <FlashlightIcon size={18} />
                    </button>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-white/60 bg-slate-900/60 px-2 py-1 rounded-lg">
                      Scan ke-{scanCount}
                    </span>
                    <span className="text-[9px] font-bold text-white/60 bg-slate-900/60 px-2 py-1 rounded-lg">
                      {torchOn ? '🔦 Flash ON' : 'Gunakan flash jika gelap'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-6 bg-slate-50 flex flex-col items-center gap-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             {cameraAvailable ? '📸 Scan otomatis setiap 0.5 detik' : '📤 Unggah foto untuk scan'}
           </p>
           <p className="text-[9px] font-bold text-blue-400 italic">Pastikan pencahayaan cukup & barcode tidak buram</p>
        </div>
      </motion.div>
    </div>
  );
};

export default BarcodeScannerModal;