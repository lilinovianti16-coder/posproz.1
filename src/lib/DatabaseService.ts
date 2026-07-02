/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🗄️ DatabaseService — SQLite (sql.js) + Supabase Sync
 * 
 * Arsitektur:
 * - Utama: SQLite via sql.js (WASM) — offline first, SQL murni
 * - Cloud: Supabase PostgreSQL — sync otomatis saat online
 * - Tidak ada IndexedDB, Firebase, atau layer lain
 * 
 * Cara Pakai:
 *   import { db } from '@/lib/DatabaseService';
 *   await db.init();
 *   const products = await db.query('SELECT * FROM products');
 *   await db.execute('INSERT INTO products ...');
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { supabase, isPostgresConfigured } from './supabaseClient';

// ============================================================
// TYPES
// ============================================================
export interface DBProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price_retail: number;
  price_wholesale: number;
  price_cost: number;
  stock: number;
  min_stock: number;
  supplier_id?: string;
  supplier_name?: string;
  created_at: number;
  updated_at: number;
}

export interface DBTransaction {
  id: string;
  total: number;
  subtotal: number;
  discount_amount: number;
  customer_name: string;
  payment_method: string;
  paid_amount: number;
  change_amount: number;
  created_at: number;
  updated_at: number;
}

export interface DBTransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  qty: number;
  price_at_sale: number;
  price_cost: number;
  subtotal: number;
  created_at: number;
}

export interface DBCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  credit_limit: number;
  credit_used: number;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface DBSupplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  contact_person: string;
  npwp: string;
  notes: string;
  product_count: number;
  total_purchases: number;
  created_at: number;
  updated_at: number;
}

export interface DBDebt {
  id: string;
  customer_id: string;
  customer_name: string;
  transaction_id: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  due_date: number;
  status: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface DBDiscount {
  id: string;
  name: string;
  type: string;
  value: number;
  min_purchase: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface DBExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface DBRestock {
  id: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface DBRestockItem {
  id: string;
  restock_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface DBRetur {
  id: string;
  retur_type: string;
  reference_id: string;
  total_amount: number;
  reason: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface DBReturItem {
  id: string;
  retur_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface DBUser {
  id: string;
  username: string;
  password: string;
  role: string;
  name: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface DBCategory {
  id: string;
  name: string;
  created_at: number;
}

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  created_at: number;
  synced_at: number;
  status: 'pending' | 'synced' | 'failed';
}

// ============================================================
// SQL SCHEMA
// ============================================================
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  sku TEXT NOT NULL DEFAULT '',
  barcode TEXT DEFAULT '',
  category TEXT DEFAULT 'Umum',
  price_retail INTEGER DEFAULT 0,
  price_wholesale INTEGER DEFAULT 0,
  price_cost INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  supplier_id TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  total INTEGER DEFAULT 0,
  subtotal INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  customer_name TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'cash',
  paid_amount INTEGER DEFAULT 0,
  change_amount INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  product_id TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  qty INTEGER DEFAULT 0,
  price_at_sale INTEGER DEFAULT 0,
  price_cost INTEGER DEFAULT 0,
  subtotal INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT 0,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  credit_limit INTEGER DEFAULT 0,
  credit_used INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  npwp TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  product_count INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  customer_id TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  transaction_id TEXT DEFAULT '',
  amount INTEGER DEFAULT 0,
  paid_amount INTEGER DEFAULT 0,
  remaining INTEGER DEFAULT 0,
  due_date INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  type TEXT DEFAULT 'percentage',
  value INTEGER DEFAULT 0,
  min_purchase INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  description TEXT DEFAULT '',
  amount INTEGER DEFAULT 0,
  category TEXT DEFAULT 'Operasional',
  notes TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS restocks (
  id TEXT PRIMARY KEY,
  supplier_id TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  total_amount INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS restock_items (
  id TEXT PRIMARY KEY,
  restock_id TEXT NOT NULL,
  product_id TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  qty INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  subtotal INTEGER DEFAULT 0,
  FOREIGN KEY (restock_id) REFERENCES restocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS returs (
  id TEXT PRIMARY KEY,
  retur_type TEXT DEFAULT 'customer',
  reference_id TEXT DEFAULT '',
  total_amount INTEGER DEFAULT 0,
  reason TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS retur_items (
  id TEXT PRIMARY KEY,
  retur_id TEXT NOT NULL,
  product_id TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  qty INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  subtotal INTEGER DEFAULT 0,
  FOREIGN KEY (retur_id) REFERENCES returs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT DEFAULT '',
  role TEXT DEFAULT 'pegawai',
  name TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT 0,
  synced_at INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending'
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ti_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_restocks_supplier ON restocks(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ri_restock ON restock_items(restock_id);
CREATE INDEX IF NOT EXISTS idx_returi_retur ON retur_items(retur_id);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);

-- Seed: kategori default
INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat_makanan', 'Makanan', 0);
INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat_minuman', 'Minuman', 0);
INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat_elektronik', 'Elektronik', 0);
INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat_rumah_tangga', 'Rumah Tangga', 0);
INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat_atk', 'Alat Tulis Kantor', 0);
INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat_umum', 'Umum', 0);

-- Seed: user admin default
INSERT OR IGNORE INTO users (id, username, password, role, name, is_active, created_at, updated_at)
VALUES ('user_admin', 'admin', 'admin123', 'admin', 'Administrator', 1, 0, 0);

-- Seed: user super_admin default (hanya bisa diakses oleh pemilik toko)
INSERT OR IGNORE INTO users (id, username, password, role, name, is_active, created_at, updated_at)
VALUES ('user_super', 'superadmin', 'superadmin123', 'super_admin', 'Super Administrator', 1, 0, 0);
`;

// ============================================================
// DATABASE SERVICE CLASS
// ============================================================
class DatabaseService {
  private sqlDb: SqlJsDatabase | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private dbName = 'tokoberman_pos';

  /**
   * Inisialisasi database SQLite
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    try {
      // Load sql.js WASM
      const SQL = await initSqlJs({
        locateFile: (file: string) => `/sql-wasm-browser.wasm`
      });
      // Note: locateFile returns the full path regardless of the 'file' parameter
      // because we only have one WASM file in public/

      // Coba load database dari localStorage (persist)
      const savedDb = localStorage.getItem(this.dbName);
      if (savedDb) {
        const buffer = this.base64ToArrayBuffer(savedDb);
        this.sqlDb = new SQL.Database(buffer);
      } else {
        this.sqlDb = new SQL.Database();
      }

      // Jalankan schema
      this.sqlDb.run(SCHEMA_SQL);
      this.initialized = true;

      console.log('🗄️ [DatabaseService]: SQLite siap digunakan.');
      
      // Auto-save ke localStorage setiap 5 detik
      setInterval(() => this.persist(), 5000);
    } catch (error) {
      console.error('🗄️ [DatabaseService]: Gagal init:', error);
      throw error;
    }
  }

  // ============================================================
  // PERSISTENCE (localStorage)
  // ============================================================
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Simpan database SQLite ke localStorage
   */
  private persist(): void {
    if (!this.sqlDb) return;
    try {
      const data = this.sqlDb.export();
      const base64 = this.arrayBufferToBase64(data);
      localStorage.setItem(this.dbName, base64);
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Export database sebagai file .sqlite untuk download/backup
   */
  exportToFile(): Uint8Array {
    if (!this.sqlDb) throw new Error('DB not initialized');
    return this.sqlDb.export();
  }

  /**
   * Import database dari Uint8Array
   */
  importFromFile(data: Uint8Array): void {
    const SQL = initSqlJs();
    // Akan di-reinit dengan data baru
  }

  // ============================================================
  // QUERY EXECUTION
  // ============================================================

  /**
   * Eksekusi query SELECT, return array of objects
   */
  query<T = any>(sql: string, params?: any[]): T[] {
    if (!this.sqlDb) throw new Error('Database belum diinisialisasi. Panggil db.init() dulu.');
    
    const stmt = this.sqlDb.prepare(sql);
    if (params) stmt.bind(params);

    const results: T[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as T;
      results.push(row);
    }
    stmt.free();
    return results;
  }

  /**
   * Eksekusi query INSERT/UPDATE/DELETE, return number of rows affected
   */
  execute(sql: string, params?: any[]): number {
    if (!this.sqlDb) throw new Error('Database belum diinisialisasi. Panggil db.init() dulu.');
    
    if (params) {
      this.sqlDb.run(sql, params);
    } else {
      this.sqlDb.run(sql);
    }
    
    return this.sqlDb.getRowsModified();
  }

  /**
   * Eksekusi multiple statements (untuk schema migration)
   */
  executeMany(sql: string): void {
    if (!this.sqlDb) throw new Error('Database belum diinisialisasi.');
    this.sqlDb.run(sql);
  }

  /**
   * Get single row
   */
  get<T = any>(sql: string, params?: any[]): T | null {
    const results = this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  // ============================================================
  // TRANSACTION HELPERS (atomic operations)
  // ============================================================

  /**
   * Begin transaction
   */
  beginTransaction(): void {
    this.execute('BEGIN TRANSACTION');
  }

  /**
   * Commit transaction
   */
  commit(): void {
    this.execute('COMMIT');
  }

  /**
   * Rollback transaction
   */
  rollback(): void {
    this.execute('ROLLBACK');
  }

  /**
   * Execute a callback within a transaction (auto commit/rollback)
   */
  transaction<T>(callback: () => T): T {
    try {
      this.beginTransaction();
      const result = callback();
      this.commit();
      return result;
    } catch (error) {
      this.rollback();
      throw error;
    }
  }

  // ============================================================
  // SYNC KE SUPABASE
  // ============================================================

  /**
   * Catat perubahan ke sync_queue untuk dikirim ke Supabase nanti
   */
  private addToSyncQueue(tableName: string, recordId: string, operation: 'create' | 'update' | 'delete', payload: any): void {
    const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.execute(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, payload, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [id, tableName, recordId, operation, JSON.stringify(payload), Date.now()]
    );
  }

  /**
   * Sinkronisasi data yang pending ke Supabase
   * Panggil method ini saat online
   */
  async syncToSupabase(): Promise<{ synced: number; failed: number }> {
    if (!isPostgresConfigured) {
      console.warn('⚠️ [Sync]: Supabase tidak dikonfigurasi. Sync skipped.');
      return { synced: 0, failed: 0 };
    }

    const pendingItems = this.query<SyncQueueItem>(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50`
    );

    if (pendingItems.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        let error = null;

        switch (item.operation) {
          case 'create':
          case 'update': {
            const payload = JSON.parse(item.payload);
            const { error: e } = await supabase
              .from(item.table_name)
              .upsert(payload);
            error = e;
            break;
          }
          case 'delete': {
            const { error: e } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.record_id);
            error = e;
            break;
          }
        }

        if (error) {
          console.warn(`⚠️ [Sync]: Gagal sync ${item.table_name}/${item.record_id}:`, error);
          failed++;
        } else {
          // Tandai sudah sync
          this.execute(
            `UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
            [Date.now(), item.id]
          );
          synced++;
        }
      } catch (e) {
        console.error(`⚠️ [Sync]: Error sync ${item.table_name}/${item.record_id}:`, e);
        failed++;
      }
    }

    // Hapus yang sudah sync (cleanup)
    this.execute(`DELETE FROM sync_queue WHERE status = 'synced' AND synced_at < ?`, [Date.now() - 86400000]);

    console.log(`🔄 [Sync]: ${synced} synced, ${failed} failed.`);
    return { synced, failed };
  }

  // ============================================================
  // PRODUCT OPERATIONS (contoh operasi spesifik)
  // ============================================================

  async createProduct(data: Partial<DBProduct>): Promise<string> {
    const id = data.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    
    this.execute(
      `INSERT INTO products (id, name, sku, barcode, category, price_retail, price_wholesale, price_cost, stock, min_stock, supplier_id, supplier_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.name || '', data.sku || '', data.barcode || '', data.category || 'Umum',
        data.price_retail || 0, data.price_wholesale || 0, data.price_cost || 0,
        data.stock || 0, data.min_stock || 0, data.supplier_id || '', data.supplier_name || '',
        now, now
      ]
    );

    this.addToSyncQueue('products', id, 'create', {
      id, name: data.name, sku: data.sku, barcode: data.barcode, category: data.category,
      price_retail: data.price_retail, price_wholesale: data.price_wholesale, price_cost: data.price_cost,
      stock: data.stock, min_stock: data.min_stock, supplier_id: data.supplier_id,
      supplier_name: data.supplier_name, created_at: now, updated_at: now
    });

    return id;
  }

  async updateProduct(data: Partial<DBProduct>): Promise<void> {
    if (!data.id) throw new Error('Product ID diperlukan');
    const now = Date.now();

    this.execute(
      `UPDATE products SET name=?, sku=?, barcode=?, category=?, price_retail=?, price_wholesale=?, price_cost=?, stock=?, min_stock=?, supplier_id=?, supplier_name=?, updated_at=? WHERE id=?`,
      [
        data.name || '', data.sku || '', data.barcode || '', data.category || 'Umum',
        data.price_retail || 0, data.price_wholesale || 0, data.price_cost || 0,
        data.stock || 0, data.min_stock || 0, data.supplier_id || '', data.supplier_name || '',
        now, data.id
      ]
    );

    this.addToSyncQueue('products', data.id, 'update', {
      id: data.id, name: data.name, sku: data.sku, barcode: data.barcode, category: data.category,
      price_retail: data.price_retail, price_wholesale: data.price_wholesale, price_cost: data.price_cost,
      stock: data.stock, min_stock: data.min_stock, supplier_id: data.supplier_id,
      supplier_name: data.supplier_name, updated_at: now
    });
  }

  deleteProduct(id: string): void {
    this.execute('DELETE FROM products WHERE id = ?', [id]);
    this.addToSyncQueue('products', id, 'delete', { id });
  }

  getAllProducts(): DBProduct[] {
    return this.query<DBProduct>('SELECT * FROM products ORDER BY name ASC');
  }

  getProductById(id: string): DBProduct | null {
    return this.get<DBProduct>('SELECT * FROM products WHERE id = ?', [id]);
  }

  searchProducts(query: string): DBProduct[] {
    const q = `%${query}%`;
    return this.query<DBProduct>(
      `SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? OR barcode LIKE ? ORDER BY name ASC LIMIT 20`,
      [q, q, q]
    );
  }

  getProductCount(): number {
    const result = this.get<{ count: number }>('SELECT COUNT(*) as count FROM products');
    return result?.count || 0;
  }

  // ============================================================
  // TRANSACTION OPERATIONS
  // ============================================================

  async createTransaction(
    total: number,
    items: Array<{
      product_id: string;
      product_name: string;
      sku?: string;
      qty: number;
      price_at_sale: number;
      price_cost?: number;
    }>,
    customerName?: string,
    paymentMethod?: string,
    paidAmount?: number,
    subtotal?: number,
    discountAmount?: number
  ): Promise<string> {
    const id = `TRX-${Date.now()}`;
    const now = Date.now();

    this.transaction(() => {
      // Insert transaction
      this.execute(
        `INSERT INTO transactions (id, total, subtotal, discount_amount, customer_name, payment_method, paid_amount, change_amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, total, subtotal ?? total, discountAmount ?? 0, customerName || '',
          paymentMethod || 'cash', paidAmount ?? total,
          Math.max(0, (paidAmount ?? total) - total), now, now
        ]
      );

      // Insert items
      for (const item of items) {
        const itemId = `${id}_ITM${Math.random().toString(36).slice(2, 6)}`;
        const itemSubtotal = item.qty * item.price_at_sale;
        this.execute(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, sku, qty, price_at_sale, price_cost, subtotal, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId, id, item.product_id, item.product_name, item.sku || '',
            item.qty, item.price_at_sale, item.price_cost || 0, itemSubtotal, now
          ]
        );
      }
    });

    // Catat untuk sync
    this.addToSyncQueue('transactions', id, 'create', {
      id, total, subtotal: subtotal ?? total, discount_amount: discountAmount ?? 0,
      customer_name: customerName, payment_method: paymentMethod ?? 'cash',
      paid_amount: paidAmount ?? total, change_amount: Math.max(0, (paidAmount ?? total) - total),
      created_at: now, updated_at: now
    });

    return id;
  }

  getAllTransactions(): DBTransaction[] {
    return this.query<DBTransaction>('SELECT * FROM transactions ORDER BY created_at DESC');
  }

  getTransactionById(id: string): DBTransaction | null {
    return this.get<DBTransaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  }

  getTransactionItems(transactionId: string): DBTransactionItem[] {
    return this.query<DBTransactionItem>(
      'SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY created_at ASC',
      [transactionId]
    );
  }

  getTransactionCount(): number {
    const result = this.get<{ count: number }>('SELECT COUNT(*) as count FROM transactions');
    return result?.count || 0;
  }

  deleteTransaction(id: string): void {
    this.execute('DELETE FROM transaction_items WHERE transaction_id = ?', [id]);
    this.execute('DELETE FROM transactions WHERE id = ?', [id]);
    this.addToSyncQueue('transactions', id, 'delete', { id });
  }

  // ============================================================
  // CUSTOMER OPERATIONS
  // ============================================================

  async createCustomer(data: Partial<DBCustomer>): Promise<string> {
    const id = data.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    this.execute(
      `INSERT INTO customers (id, name, phone, email, address, city, credit_limit, credit_used, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name || '', data.phone || '', data.email || '', data.address || '',
       data.city || '', data.credit_limit || 0, data.credit_used || 0, data.notes || '', now, now]
    );

    this.addToSyncQueue('customers', id, 'create', { ...data, id, created_at: now, updated_at: now });
    return id;
  }

  updateCustomer(data: Partial<DBCustomer>): void {
    if (!data.id) throw new Error('Customer ID diperlukan');
    const now = Date.now();
    this.execute(
      `UPDATE customers SET name=?, phone=?, email=?, address=?, city=?, credit_limit=?, credit_used=?, notes=?, updated_at=? WHERE id=?`,
      [data.name, data.phone, data.email, data.address, data.city, data.credit_limit, data.credit_used, data.notes, now, data.id]
    );
    this.addToSyncQueue('customers', data.id, 'update', { ...data, updated_at: now });
  }

  deleteCustomer(id: string): void {
    this.execute('DELETE FROM customers WHERE id = ?', [id]);
    this.addToSyncQueue('customers', id, 'delete', { id });
  }

  getAllCustomers(): DBCustomer[] {
    return this.query<DBCustomer>('SELECT * FROM customers ORDER BY name ASC');
  }

  getCustomerById(id: string): DBCustomer | null {
    return this.get<DBCustomer>('SELECT * FROM customers WHERE id = ?', [id]);
  }

  searchCustomers(query: string): DBCustomer[] {
    const q = `%${query}%`;
    return this.query<DBCustomer>(
      'SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name ASC',
      [q, q]
    );
  }

  // ============================================================
  // SUPPLIER OPERATIONS
  // ============================================================

  async createSupplier(data: Partial<DBSupplier>): Promise<string> {
    const id = data.id || `supp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    this.execute(
      `INSERT INTO suppliers (id, name, phone, address, contact_person, npwp, notes, product_count, total_purchases, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name || '', data.phone || '', data.address || '', data.contact_person || '',
       data.npwp || '', data.notes || '', data.product_count || 0, data.total_purchases || 0, now, now]
    );
    this.addToSyncQueue('suppliers', id, 'create', { ...data, id, created_at: now, updated_at: now });
    return id;
  }

  updateSupplier(data: Partial<DBSupplier>): void {
    if (!data.id) throw new Error('Supplier ID diperlukan');
    const now = Date.now();
    this.execute(
      `UPDATE suppliers SET name=?, phone=?, address=?, contact_person=?, npwp=?, notes=?, product_count=?, total_purchases=?, updated_at=? WHERE id=?`,
      [data.name, data.phone, data.address, data.contact_person, data.npwp, data.notes, data.product_count, data.total_purchases, now, data.id]
    );
    this.addToSyncQueue('suppliers', data.id, 'update', { ...data, updated_at: now });
  }

  deleteSupplier(id: string): void {
    this.execute('DELETE FROM suppliers WHERE id = ?', [id]);
    this.addToSyncQueue('suppliers', id, 'delete', { id });
  }

  getAllSuppliers(): DBSupplier[] {
    return this.query<DBSupplier>('SELECT * FROM suppliers ORDER BY name ASC');
  }

  getSupplierById(id: string): DBSupplier | null {
    return this.get<DBSupplier>('SELECT * FROM suppliers WHERE id = ?', [id]);
  }

  searchSuppliers(query: string): DBSupplier[] {
    const q = `%${query}%`;
    return this.query<DBSupplier>(
      'SELECT * FROM suppliers WHERE name LIKE ? OR phone LIKE ? OR npwp LIKE ? ORDER BY name ASC',
      [q, q, q]
    );
  }

  // ============================================================
  // CATEGORY OPERATIONS
  // ============================================================

  getAllCategories(): DBCategory[] {
    return this.query<DBCategory>('SELECT * FROM categories ORDER BY name ASC');
  }

  createCategory(name: string): string {
    const id = `cat_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    this.execute(
      'INSERT OR IGNORE INTO categories (id, name, created_at) VALUES (?, ?, ?)',
      [id, name, Date.now()]
    );
    this.addToSyncQueue('categories', id, 'create', { id, name, created_at: Date.now() });
    return id;
  }

  deleteCategory(id: string): void {
    this.execute('DELETE FROM categories WHERE id = ?', [id]);
    this.addToSyncQueue('categories', id, 'delete', { id });
  }

  // ============================================================
  // DEBT OPERATIONS
  // ============================================================

  getAllDebts(): DBDebt[] {
    return this.query<DBDebt>('SELECT * FROM debts ORDER BY created_at DESC');
  }

  createDebt(data: Partial<DBDebt>): string {
    const id = data.id || `debt_${Date.now()}`;
    const now = Date.now();
    const remaining = (data.amount || 0) - (data.paid_amount || 0);
    this.execute(
      `INSERT INTO debts (id, customer_id, customer_name, transaction_id, amount, paid_amount, remaining, due_date, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.customer_id, data.customer_name, data.transaction_id, data.amount, data.paid_amount, remaining, data.due_date, data.status || 'active', data.notes, now, now]
    );
    this.addToSyncQueue('debts', id, 'create', { ...data, id, remaining, created_at: now, updated_at: now });
    return id;
  }

  // ============================================================
  // DISCOUNT OPERATIONS
  // ============================================================

  getAllDiscounts(): DBDiscount[] {
    return this.query<DBDiscount>('SELECT * FROM discounts ORDER BY name ASC');
  }

  createDiscount(data: Partial<DBDiscount>): string {
    const id = data.id || `disc_${Date.now()}`;
    const now = Date.now();
    this.execute(
      `INSERT INTO discounts (id, name, type, value, min_purchase, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.type || 'percentage', data.value, data.min_purchase || 0, data.is_active ?? 1, now, now]
    );
    this.addToSyncQueue('discounts', id, 'create', { ...data, id, created_at: now, updated_at: now });
    return id;
  }

  // ============================================================
  // EXPENSE OPERATIONS
  // ============================================================

  getAllExpenses(): DBExpense[] {
    return this.query<DBExpense>('SELECT * FROM expenses ORDER BY created_at DESC');
  }

  createExpense(data: Partial<DBExpense>): string {
    const id = data.id || `exp_${Date.now()}`;
    const now = Date.now();
    this.execute(
      `INSERT INTO expenses (id, description, amount, category, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.description || '', data.amount || 0, data.category || 'Operasional', data.notes || '', now, now]
    );
    this.addToSyncQueue('expenses', id, 'create', { ...data, id, created_at: now, updated_at: now });
    return id;
  }

  // ============================================================
  // USER OPERATIONS
  // ============================================================

  getAllUsers(): DBUser[] {
    return this.query<DBUser>('SELECT * FROM users ORDER BY name ASC');
  }

  getUserByUsername(username: string): DBUser | null {
    return this.get<DBUser>('SELECT * FROM users WHERE username = ?', [username]);
  }

  getUserById(id: string): DBUser | null {
    return this.get<DBUser>('SELECT * FROM users WHERE id = ?', [id]);
  }

  isAdmin(): boolean {
    // Default check — bisa diganti dengan auth state
    const user = this.getUserByUsername('admin');
    return user?.role === 'admin';
  }

  // ============================================================
  // RESTOK OPERATIONS
  // ============================================================

  getAllRestocks(): DBRestock[] {
    return this.query<DBRestock>('SELECT * FROM restocks ORDER BY created_at DESC');
  }

  getRestockItems(restockId: string): DBRestockItem[] {
    return this.query<DBRestockItem>(
      'SELECT * FROM restock_items WHERE restock_id = ? ORDER BY created_at ASC',
      [restockId]
    );
  }

  // ============================================================
  // RETUR OPERATIONS
  // ============================================================

  getAllReturs(): DBRetur[] {
    return this.query<DBRetur>('SELECT * FROM returs ORDER BY created_at DESC');
  }

  getReturItems(returId: string): DBReturItem[] {
    return this.query<DBReturItem>(
      'SELECT * FROM retur_items WHERE retur_id = ? ORDER BY created_at ASC',
      [returId]
    );
  }

  // ============================================================
  // UTILITY
  // ============================================================

  /**
   * Hapus semua data (factory reset)
   */
  clearAll(): void {
    if (!this.sqlDb) return;
    
    const tables = [
      'products', 'transactions', 'transaction_items', 'customers',
      'suppliers', 'categories', 'debts', 'discounts', 'expenses',
      'restocks', 'restock_items', 'returs', 'retur_items', 'users',
      'sync_queue'
    ];

    for (const table of tables) {
      this.execute(`DELETE FROM ${table}`);
    }

    // Re-seed
    this.executeMany(SCHEMA_SQL);
    localStorage.removeItem(this.dbName);
    console.log('🗄️ [DatabaseService]: Semua data dihapus.');
  }

  /**
   * Dapatkan statistik database
   */
  getStats(): Record<string, number> {
    const tables = [
      'products', 'transactions', 'customers', 'suppliers',
      'categories', 'debts', 'discounts', 'expenses', 'restocks',
      'returs', 'users', 'sync_queue'
    ];

    const stats: Record<string, number> = {};
    for (const table of tables) {
      const result = this.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = result?.count || 0;
    }

    return stats;
  }

  /**
   * Cek apakah database sudah siap
   */
  isReady(): boolean {
    return this.initialized && this.sqlDb !== null;
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================
export const db = new DatabaseService();