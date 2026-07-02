# Database Architecture & Data Flow (NEW)

## 🏗️ Arsitektur Baru: SQLite (sql.js) + Supabase Sync

Sejak 2 Juli 2026, sistem penyimpanan data telah **direstrukturisasi total**:

```
┌──────────────────────────────────────────────────────────────────┐
│                    YOUR APP (React + Vite)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                   DatabaseService.ts                       │  │
│   │                                                           │  │
│   │   ┌─────────────────────┐   ┌─────────────────────────┐  │  │
│   │   │  sql.js (SQLite)    │   │   Supabase PostgreSQL    │  │  │
│   │   │  ──────────────     │   │   ──────────────         │  │  │
│   │   │  Offline First ✅   │   │   Cloud Backup ☁️        │  │  │
│   │   │  SQL Murni ✅       │   │   Auto Sync 🔄           │  │  │
│   │   │  localStorage Persist│  │   Opsional ⚙️            │  │  │
│   │   └─────────────────────┘   └─────────────────────────┘  │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │   BRIDGE LAYER (src/lib/indexdb*.ts)                      │  │
│   │   ─────────────────────────────                           │  │
│   │   File-file ini adalah WRAPPER agar kode halaman           │  │
│   │   yang masih menggunakan import lama tetap berfungsi.      │  │
│   │   Semua method dipanggil ke DatabaseService di belakang.   │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│   🚫 TIDAK DIGUNAKAN LAGI:                                      │
│   - ❌ IndexedDB (native browser API)                           │
│   - ❌ Firebase Firestore                                       │
│   - ❌ Dexie.js                                                  │
│   - ❌ service/db/DatabaseService.ts (lama)                     │
│   - ❌ Multi-layer storage                                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Struktur Database (SQLite)

### 1. Tabel `products`

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT (PK) | ID unik produk |
| `name` | TEXT | Nama produk |
| `sku` | TEXT | Kode SKU |
| `barcode` | TEXT | Kode barcode |
| `category` | TEXT | Kategori (default: "Umum") |
| `price_retail` | INTEGER | Harga eceran |
| `price_wholesale` | INTEGER | Harga grosir |
| `price_cost` | INTEGER | Harga modal |
| `stock` | INTEGER | Stok tersedia |
| `min_stock` | INTEGER | Stok minimum |
| `supplier_id` | TEXT | ID supplier |
| `supplier_name` | TEXT | Nama supplier |
| `created_at` | INTEGER | Timestamp (ms) |
| `updated_at` | INTEGER | Timestamp (ms) |

### 2. Tabel `transactions`

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT (PK) | ID unik transaksi |
| `total` | INTEGER | Total transaksi |
| `subtotal` | INTEGER | Subtotal sebelum diskon |
| `discount_amount` | INTEGER | Jumlah diskon |
| `customer_name` | TEXT | Nama pelanggan |
| `payment_method` | TEXT | Metode pembayaran |
| `paid_amount` | INTEGER | Jumlah dibayar |
| `change_amount` | INTEGER | Kembalian |
| `created_at` | INTEGER | Timestamp (ms) |
| `updated_at` | INTEGER | Timestamp (ms) |

### 3. Tabel `transaction_items`

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | TEXT (PK) | ID unik item |
| `transaction_id` | TEXT (FK) | ID transaksi |
| `product_id` | TEXT | ID produk |
| `product_name` | TEXT | Nama produk saat transaksi |
| `sku` | TEXT | SKU |
| `qty` | INTEGER | Jumlah |
| `price_at_sale` | INTEGER | Harga saat transaksi |
| `price_cost` | INTEGER | Harga modal |
| `subtotal` | INTEGER | Subtotal item |
| `created_at` | INTEGER | Timestamp (ms) |

### 4-15. Tabel Lainnya

- `customers` — Data pelanggan
- `suppliers` — Data supplier
- `categories` — Kategori produk
- `debts` — Hutang piutang
- `discounts` — Diskon
- `expenses` — Pengeluaran
- `restocks` — Restok barang
- `restock_items` — Item restok
- `returs` — Retur barang
- `retur_items` — Item retur
- `users` — User/Akun
- `sync_queue` — Antrian sinkronisasi ke Supabase

> **Catatan:** Semua tabel menggunakan `INTEGER` untuk timestamp (dalam milliseconds) — bukan `TEXT` — agar sorting dan filtering lebih cepat.

---

## 🔄 Alur Data: Create Transaction (Contoh)

```
User Checkout (POSPage)
      │
      ▼
handleFinishCheckout()
      │
      ▼
indexdbTransaksi.create()  ← bridge wrapper
      │
      ▼
DatabaseService.createTransaction()
      │
      ├── 1. BEGIN TRANSACTION
      ├── 2. INSERT INTO transactions ...
      ├── 3. INSERT INTO transaction_items ... (loop items)
      ├── 4. COMMIT
      │
      ├── 5. addToSyncQueue('transactions', id, 'create', ...)
      │
      └── 6. ✅ Selesai — data tersimpan di SQLite lokal
```

### Sinkronisasi ke Supabase (Opsional)

```
Online? ──Ya──► db.syncToSupabase()
                  │
                  ├── SELECT * FROM sync_queue WHERE status='pending'
                  ├── For each pending item:
                  │   ├── upsert ke Supabase
                  │   └── UPDATE sync_queue SET status='synced'
                  │
                  └── ✅ Data di cloud = data di lokal

Offline? ──Tidak──► Data tetap aman di SQLite lokal
                      Sync otomatis saat online next time
```

---

## 📦 File-File Utama

| File | Fungsi |
|------|--------|
| `src/lib/DatabaseService.ts` | **INTI** — SQLite + Supabase sync (800+ baris) |
| `src/lib/supabaseClient.ts` | Koneksi Supabase |
| `src/lib/indexdbBarang.ts` | Bridge wrapper (produk) |
| `src/lib/indexdbTransaksi.ts` | Bridge wrapper (transaksi) |
| `src/lib/indexdbCustomer.ts` | Bridge wrapper (pelanggan) |
| `src/lib/indexdbSupplier.ts` | Bridge wrapper (supplier) |
| `src/lib/indexdb*.ts` | Bridge wrapper lainnya |
| `src/lib/firebaseClient.ts` | **NONAKTIF** — hanya stub |

---

## 📱 Platform Behavior

| Platform | SQLite (sql.js) | Supabase Sync |
|----------|:--------------:|:-------------:|
| **Browser (Chrome/Edge/Firefox)** | ✅ (via WASM) | ✅ Jika dikonfigurasi |
| **Android (Capacitor)** | ✅ (via WASM) | ✅ Jika dikonfigurasi |
| **Windows (Tauri)** | ✅ (via WASM) | ✅ Jika dikonfigurasi |

> **Persistensi:** Database SQLite disimpan di `localStorage` sebagai base64 string.
> Auto-persist setiap 5 detik. Data tidak hilang selama localStorage tidak dibersihkan.

---

## 🚀 Cara Setup Supabase

1. Buat project di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** → paste isi `docs/SUPABASE_MIGRATION.sql` → RUN
3. Buka **Project Settings** → **API** → copy `Project URL` dan `anon public key`
4. Buat file `.env` di root project (copy dari `.env.example`):
   ```
   VITE_SUPABASE_URL=https://your-project-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
5. Restart dev server

---

## 🔍 Debugging

### Cek Database di Console
```javascript
// Buka F12 → Console
await db.init();

// Cek jumlah produk
db.getProductCount();

// Cek semua produk
db.getAllProducts();

// Query SQL langsung
db.query('SELECT * FROM products');

// Cek statistik
db.getStats();

// Force sync ke Supabase
await db.syncToSupabase();
```

### Cek Data di Supabase
```
Buka Supabase Dashboard → Table Editor → pilih tabel
```

---

## 🧹 Catatan Penting

1. **SQLite adalah source of truth** — semua data utama ada di sini
2. **File indexdb*.ts hanya bridge** — tidak ada data di IndexedDB asli
3. **Supabase opsional** — tanpa .env aplikasi tetap jalan (offline mode)
4. **Auto-persist** — database disimpan ke localStorage tiap 5 detik
5. **Sync queue** — perubahan dicatat, dikirim ke Supabase saat online
6. **Firebase NONAKTIF** — sudah tidak digunakan