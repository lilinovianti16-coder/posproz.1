-- =====================================================
-- SUPABASE MIGRATION SCRIPT
-- Untuk Toko Herman POS - Offline SQLite + Supabase Sync
-- =====================================================
-- Jalankan SQL ini di Supabase Dashboard → SQL Editor

-- 1. TABLE: products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  sku TEXT NOT NULL DEFAULT '',
  barcode TEXT DEFAULT '',
  category TEXT DEFAULT 'Umum',
  price_retail BIGINT DEFAULT 0,
  price_wholesale BIGINT DEFAULT 0,
  price_cost BIGINT DEFAULT 0,
  stock BIGINT DEFAULT 0,
  min_stock BIGINT DEFAULT 0,
  supplier_id TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 2. TABLE: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  total BIGINT DEFAULT 0,
  subtotal BIGINT DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  customer_name TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'cash',
  paid_amount BIGINT DEFAULT 0,
  change_amount BIGINT DEFAULT 0,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- 3. TABLE: transaction_items
CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  qty BIGINT DEFAULT 0,
  price_at_sale BIGINT DEFAULT 0,
  price_cost BIGINT DEFAULT 0,
  subtotal BIGINT DEFAULT 0,
  created_at BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ti_transaction ON transaction_items(transaction_id);

-- 4. TABLE: customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  credit_limit BIGINT DEFAULT 0,
  credit_used BIGINT DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 5. TABLE: suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  npwp TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  product_count BIGINT DEFAULT 0,
  total_purchases BIGINT DEFAULT 0,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 6. TABLE: categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at BIGINT DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- 7. TABLE: debts (hutang piutang)
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  customer_id TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  transaction_id TEXT DEFAULT '',
  amount BIGINT DEFAULT 0,
  paid_amount BIGINT DEFAULT 0,
  remaining BIGINT DEFAULT 0,
  due_date BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT DEFAULT '',
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);

-- 8. TABLE: discounts
CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  type TEXT DEFAULT 'percentage',
  value BIGINT DEFAULT 0,
  min_purchase BIGINT DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

-- 9. TABLE: expenses (pengeluaran)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  description TEXT DEFAULT '',
  amount BIGINT DEFAULT 0,
  category TEXT DEFAULT 'Operasional',
  notes TEXT DEFAULT '',
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at);

-- 10. TABLE: restocks
CREATE TABLE IF NOT EXISTS restocks (
  id TEXT PRIMARY KEY,
  supplier_id TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  total_amount BIGINT DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_restocks_supplier ON restocks(supplier_id);

-- 11. TABLE: restock_items
CREATE TABLE IF NOT EXISTS restock_items (
  id TEXT PRIMARY KEY,
  restock_id TEXT NOT NULL REFERENCES restocks(id) ON DELETE CASCADE,
  product_id TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  qty BIGINT DEFAULT 0,
  unit_price BIGINT DEFAULT 0,
  subtotal BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ri_restock ON restock_items(restock_id);

-- 12. TABLE: returs
CREATE TABLE IF NOT EXISTS returs (
  id TEXT PRIMARY KEY,
  retur_type TEXT DEFAULT 'customer',
  reference_id TEXT DEFAULT '',
  total_amount BIGINT DEFAULT 0,
  reason TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

-- 13. TABLE: retur_items
CREATE TABLE IF NOT EXISTS retur_items (
  id TEXT PRIMARY KEY,
  retur_id TEXT NOT NULL REFERENCES returs(id) ON DELETE CASCADE,
  product_id TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  qty BIGINT DEFAULT 0,
  unit_price BIGINT DEFAULT 0,
  subtotal BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_returi_retur ON retur_items(retur_id);

-- 14. TABLE: users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT DEFAULT '',
  role TEXT DEFAULT 'pegawai',
  name TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 15. TABLE: sync_queue (untuk offline -> online sync)
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create','update','delete')),
  payload TEXT DEFAULT '{}',
  created_at BIGINT DEFAULT 0,
  synced_at BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE restocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returs ENABLE ROW LEVEL SECURITY;
ALTER TABLE retur_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Izinkan anon key untuk semua operasi (sesuaikan untuk production)
CREATE POLICY "Allow all anon" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON transaction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON debts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON discounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON restocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON restock_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON returs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON retur_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon" ON sync_queue FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- SEED DATA: Insert kategori default
-- =====================================================
INSERT INTO categories (id, name, created_at) VALUES
  ('cat_makanan', 'Makanan', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('cat_minuman', 'Minuman', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('cat_elektronik', 'Elektronik', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('cat_rumah_tangga', 'Rumah Tangga', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('cat_atk', 'Alat Tulis Kantor', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('cat_umum', 'Umum', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (id) DO NOTHING;

-- Insert user admin default
INSERT INTO users (id, username, password, role, name, is_active, created_at, updated_at)
VALUES (
  'user_admin',
  'admin',
  'admin123',
  'admin',
  'Administrator',
  1,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VIEWS untuk laporan
-- =====================================================

-- Daily sales summary
CREATE OR REPLACE VIEW daily_sales AS
SELECT 
  DATE(TO_TIMESTAMP(created_at / 1000)) AS sale_date,
  COUNT(*) AS transaction_count,
  SUM(total) AS total_sales,
  SUM(paid_amount) AS total_paid,
  SUM(change_amount) AS total_change
FROM transactions
GROUP BY DATE(TO_TIMESTAMP(created_at / 1000))
ORDER BY sale_date DESC;

-- Product sales summary
CREATE OR REPLACE VIEW product_sales AS
SELECT 
  ti.product_id,
  ti.product_name,
  ti.sku,
  COUNT(DISTINCT ti.transaction_id) AS times_sold,
  SUM(ti.qty) AS total_qty,
  SUM(ti.subtotal) AS total_revenue
FROM transaction_items ti
GROUP BY ti.product_id, ti.product_name, ti.sku
ORDER BY total_qty DESC;