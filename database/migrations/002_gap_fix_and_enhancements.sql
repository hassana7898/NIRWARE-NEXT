-- =============================================================
-- NIRWARE NEXT - Migration 002: Production Gap Fix & Enhancements
-- Atomic Idempotency State, Company Settings, Enterprise Indexes
-- =============================================================

-- 1. Enhance Idempotency Keys with Atomic Locking States
ALTER TABLE idempotency_keys
  ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ALTER COLUMN response_status DROP NOT NULL,
  ALTER COLUMN response_body DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_status ON idempotency_keys(status, locked_at);

-- 2. Company Settings Table (Dynamic Configuration for Vouchers, Print, Header, Signatories)
CREATE TABLE IF NOT EXISTS company_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  company_name VARCHAR(200) NOT NULL DEFAULT 'شرکت تولید خوراک طیور نیروار گلستان',
  legal_name VARCHAR(200) NOT NULL DEFAULT 'صنایع خوراک دام و طیور نیروار (سهامی خاص)',
  registration_number VARCHAR(50) DEFAULT '۱۴۲۸۵',
  national_id VARCHAR(50) DEFAULT '۱۰۱۰۰۵۴۸۹۲۱',
  phone VARCHAR(50) DEFAULT '۰۱۷-۳۲۴۵۰۰۰۰',
  email VARCHAR(100) DEFAULT 'info@nirware.ir',
  factory_address TEXT DEFAULT 'استان گلستان، کیلومتر ۵ جاده گرگان به آق‌قلا، شهرک صنعتی، فاز ۲، کارخانه خوراک نیروار',
  office_address TEXT DEFAULT 'گرگان، میدان شهدا، برج فناوری، طبقه ۴',
  logo_url TEXT DEFAULT '/logo.svg',
  signatory_manager_title VARCHAR(100) DEFAULT 'مدیر فنی و کارخانه',
  signatory_manager_name VARCHAR(100) DEFAULT 'مهندس احسان حسینی',
  signatory_scale_title VARCHAR(100) DEFAULT 'متصدی باسکول و کنترل کیفی',
  signatory_scale_name VARCHAR(100) DEFAULT 'محمدرضا سمیعی',
  signatory_driver_title VARCHAR(100) DEFAULT 'راننده ناوگان ترابری',
  signatory_farmer_title VARCHAR(100) DEFAULT 'مرغدار تحویل‌گیرنده نهاده',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings row if not present
INSERT INTO company_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 3. Enterprise Audit & Operational Composite Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_feed_orders_farmer_status ON feed_orders(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_feed_orders_created_desc ON feed_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_quotas_farmer_status ON feed_quotas(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_flocks_house_status ON flocks(poultry_house_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_status ON deliveries(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_product_created ON inventory_ledger(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_batches_created_desc ON production_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_remittances_created_desc ON inbound_remittances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_remittances_created_desc ON outbound_remittances(created_at DESC);
