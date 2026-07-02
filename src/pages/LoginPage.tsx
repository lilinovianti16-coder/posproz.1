/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ✅ Halaman Login & Daftar Akun
 * Autentikasi user dengan username & password
 * Default admin: admin / admin123
 * Default super_admin: superadmin / superadmin123
 * Fitur daftar akun baru via WhatsApp (hanya Super Admin)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, User, AlertCircle, Eye, EyeOff, Phone, CheckCircle, X } from 'lucide-react';
import { indexdbUser } from '@/lib/indexdbUser';
import { useSettingsStore } from '@/store/useSettingsStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const storeInfo = useSettingsStore(state => state.storeInfo);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State untuk fitur daftar via WhatsApp
  const [showRegister, setShowRegister] = useState(false);
  const [registerStep, setRegisterStep] = useState<'input' | 'success'>('input');
  const [regName, setRegName] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // ✅ Jika sudah login, redirect ke page sesuai role
  useEffect(() => {
    if (indexdbUser.isLoggedIn()) {
      const user = indexdbUser.getCurrentUser();
      if (user) {
        redirectByRole(user.role);
      }
    }
  }, [navigate]);

  const redirectByRole = (role: string) => {
    if (role === 'super_admin' || role === 'admin') navigate('/', { replace: true });
    else if (role === 'kasir') navigate('/pos', { replace: true });
    else if (role === 'gudang') navigate('/inventory', { replace: true });
    else navigate('/', { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await indexdbUser.login(username.trim(), password.trim());
      if (result.success && result.user) {
        redirectByRole(result.user.role);
      } else {
        setError(result.error || 'Login gagal');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Kirim permintaan daftar akun baru via WhatsApp ke Super Admin
   */
  const handleRegisterWA = async () => {
    if (!regName.trim() || !regStoreName.trim() || !regPhone.trim()) {
      setError('Semua field wajib diisi untuk pendaftaran');
      return;
    }

    setRegLoading(true);
    setError('');

    try {
      // Format pesan WhatsApp
      const message = encodeURIComponent(
        `*PERMINTAAN DAFTAR AKUN BARU - POS KASIR*\n\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `📋 *Data Pendaftaran:*\n` +
        `• Nama Lengkap: ${regName.trim()}\n` +
        `• Nama Toko: ${regStoreName.trim()}\n` +
        `• No. WhatsApp: ${regPhone.trim()}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `Halo Super Admin, saya ingin mendaftarkan akun baru untuk POS Kasir.` +
        `\nMohon dibuatkan akun dengan data di atas. Terima kasih. 🙏`
      );

      // Nomor tujuan: nomor yang terdaftar di pengaturan toko, atau default
      const targetPhone = storeInfo.phone?.replace(/[^0-9]/g, '') || '6285188745184';
      // Jika nomor diawali 0, ganti dengan 62
      const formattedPhone = targetPhone.startsWith('0') 
        ? '62' + targetPhone.slice(1) 
        : targetPhone.startsWith('62') 
          ? targetPhone 
          : '62' + targetPhone;

      const waUrl = `https://wa.me/${formattedPhone}?text=${message}`;

      // Buka WhatsApp di tab baru
      window.open(waUrl, '_blank');

      // Tampilkan sukses
      setRegisterStep('success');
      
      // Reset form setelah 5 detik
      setTimeout(() => {
        setRegName('');
        setRegStoreName('');
        setRegPhone('');
        setRegisterStep('input');
        setShowRegister(false);
      }, 5000);
    } catch (err) {
      console.error('Register WA error:', err);
      setError('Gagal membuka WhatsApp. Pastikan perangkat Anda memiliki aplikasi WhatsApp.');
    } finally {
      setRegLoading(false);
    }
  };

  const resetRegister = () => {
    setShowRegister(false);
    setRegisterStep('input');
    setRegName('');
    setRegStoreName('');
    setRegPhone('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#10B981] to-emerald-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-[28px] flex items-center justify-center mx-auto shadow-lg">
            <Store size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mt-4 tracking-tight">POS Kasir</h1>
          <p className="text-emerald-100 font-bold text-sm mt-1">Sistem Kasir Offline</p>
        </div>

        {/* Card Login */}
        <div className="bg-white rounded-[40px] p-8 shadow-2xl">
          {!showRegister ? (
            <>
              <h2 className="text-xl font-black text-slate-800 tracking-tight mb-6">Masuk</h2>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-[16px] flex items-center gap-3">
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Username</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Masukkan username"
                      className="w-full bg-slate-50 border border-slate-100 pl-10 pr-4 py-4 rounded-2xl font-bold text-slate-700 focus:border-[#10B981] focus:bg-white outline-none transition-all"
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full bg-slate-50 border border-slate-100 pl-10 pr-12 py-4 rounded-2xl font-bold text-slate-700 focus:border-[#10B981] focus:bg-white outline-none transition-all"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#10B981] hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 mt-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lock size={18} />
                  )}
                  MASUK
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">atau</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Tombol Daftar via WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  setShowRegister(true);
                  setError('');
                }}
                className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
              >
                <Phone size={18} className="text-emerald-500" />
                DAFTAR AKUN BARU VIA WHATSAPP
              </button>

              <p className="text-[10px] text-slate-400 font-medium text-center mt-3 leading-relaxed">
                Ingin menggunakan POS Kasir?<br />
                Daftar sekarang melalui WhatsApp ke Super Admin
              </p>
            </>
          ) : (
            <>
              {/* FORM DAFTAR VIA WHATSAPP */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {registerStep === 'input' ? 'Daftar Akun Baru' : 'Permintaan Terkirim!'}
                </h2>
                <button
                  type="button"
                  onClick={resetRegister}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {registerStep === 'input' ? (
                <>
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-[16px] flex items-center gap-3">
                      <AlertCircle size={16} className="text-red-500 shrink-0" />
                      <p className="text-xs font-bold text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="p-4 bg-emerald-50 rounded-[24px] border border-emerald-100 mb-5">
                    <p className="text-[11px] font-bold text-emerald-700 leading-relaxed">
                      Isi data diri Anda, lalu kirim permintaan via WhatsApp ke Super Admin. 
                      Akun akan dibuatkan oleh Super Admin.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="Contoh: Ahmad Fauzi"
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:border-[#10B981] focus:bg-white outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Toko</label>
                      <input
                        type="text"
                        value={regStoreName}
                        onChange={e => setRegStoreName(e.target.value)}
                        placeholder="Contoh: Toko Herman"
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:border-[#10B981] focus:bg-white outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">No. WhatsApp Aktif</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={e => setRegPhone(e.target.value)}
                          placeholder="Contoh: 081234567890"
                          className="w-full bg-slate-50 border border-slate-100 pl-10 pr-4 py-4 rounded-2xl font-bold text-slate-700 focus:border-[#10B981] focus:bg-white outline-none transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium px-1">
                        Nomor ini akan digunakan untuk login & konfirmasi akun
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRegisterWA}
                    disabled={regLoading}
                    className="w-full bg-[#25D366] hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-60 mt-5"
                  >
                    {regLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Phone size={20} />
                    )}
                    KIRIM VIA WHATSAPP
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowRegister(false); setError(''); }}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 mt-3 transition-all py-2"
                  >
                    Kembali ke Login
                  </button>
                </>
              ) : (
                /* SUCCESS STEP */
                <div className="text-center py-6 space-y-4 animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-lg">Permintaan Terkirim! 🎉</p>
                    <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">
                      Data Anda telah siap dikirim ke Super Admin melalui WhatsApp.
                      <br />
                      Silakan tunggu konfirmasi dari Super Admin untuk aktivasi akun.
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-[20px] border border-emerald-100 text-left space-y-1">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ringkasan Data:</p>
                    <p className="text-xs font-bold text-slate-700">Nama: {regName}</p>
                    <p className="text-xs font-bold text-slate-700">Toko: {regStoreName}</p>
                    <p className="text-xs font-bold text-slate-700">WA: {regPhone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetRegister}
                    className="px-6 py-3 bg-[#10B981] hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-green-100 active:scale-95"
                  >
                    TUTUP
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;