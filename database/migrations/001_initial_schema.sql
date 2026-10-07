-- NIRWARE NEXT - Production-Grade Database Schema
-- Industrial Poultry Feed Factory & Farmer Management System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Sessions (Session Management)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 3. Audit Logs (Transactional Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  request_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 4. Idempotency Keys (Prevent Duplicate Operations)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- 5. Farmers (Poultry Owners)
CREATE TABLE IF NOT EXISTS farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(150) NOT NULL,
  business_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(20) UNIQUE NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  contact_person VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmers_user_id ON farmers(user_id);
CREATE INDEX IF NOT EXISTS idx_farmers_national_id ON farmers(national_id);

-- 6. Farms
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  license_number VARCHAR(50) NOT NULL,
  location VARCHAR(200) NOT NULL,
  total_capacity NUMERIC(12, 2) NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_farmer_id ON farms(farmer_id);

-- 7. Poultry Houses (سالن‌ها)
CREATE TABLE IF NOT EXISTS poultry_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  capacity NUMERIC(12, 2) NOT NULL,
  house_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poultry_houses_farm_id ON poultry_houses(farm_id);

-- 8. Flocks (گله‌ها و دوره‌ها)
CREATE TABLE IF NOT EXISTS flocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poultry_house_id UUID NOT NULL REFERENCES poultry_houses(id) ON DELETE CASCADE,
  flock_code VARCHAR(50) NOT NULL,
  breed VARCHAR(80) NOT NULL,
  chick_count INTEGER NOT NULL,
  initial_weight_grams NUMERIC(8, 2) NOT NULL DEFAULT 42,
  final_weight_grams NUMERIC(8, 2) NOT NULL DEFAULT 0,
  mortality_count INTEGER NOT NULL DEFAULT 0,
  feed_consumed_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  exceptional_feed_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  conversion_ratio NUMERIC(6, 3) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flocks_house_id ON flocks(poultry_house_id);
CREATE INDEX IF NOT EXISTS idx_flocks_status ON flocks(status);

-- 9. Daily Flock Records (ثبت روزانه سالن)
CREATE TABLE IF NOT EXISTS daily_flock_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  bird_count INTEGER NOT NULL,
  mortality_count INTEGER NOT NULL DEFAULT 0,
  feed_consumption_kg NUMERIC(10, 2) NOT NULL,
  avg_weight_grams NUMERIC(8, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_flock_date UNIQUE (flock_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_records_flock_id ON daily_flock_records(flock_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_flock_records(record_date);

-- 10. Feed Quotas (سهمیه دان دولتی و مصوب)
CREATE TABLE IF NOT EXISTS feed_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
  approved_quantity_kg NUMERIC(12, 2) NOT NULL,
  used_quantity_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotas_farmer ON feed_quotas(farmer_id);
CREATE INDEX IF NOT EXISTS idx_quotas_flock ON feed_quotas(flock_id);
CREATE INDEX IF NOT EXISTS idx_quotas_status ON feed_quotas(status);

-- 11. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

-- 12. Products (Raw Materials & Finished Goods)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'KG',
  product_type VARCHAR(30) NOT NULL,
  min_stock_level_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

-- 13. Formulas / BOM (فرمولاسیون و جیره)
CREATE TABLE IF NOT EXISTS formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  batch_size_kg NUMERIC(10, 2) NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formulas_product ON formulas(product_id);

-- 14. Formula Items (اقلام جیره)
CREATE TABLE IF NOT EXISTS formula_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
  raw_material_product_id UUID NOT NULL REFERENCES products(id),
  quantity_kg NUMERIC(10, 2) NOT NULL,
  percentage NUMERIC(6, 3) NOT NULL,
  tolerance_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.5
);

CREATE INDEX IF NOT EXISTS idx_formula_items_formula ON formula_items(formula_id);

-- 15. Feed Orders (سفارش خوراک)
CREATE TABLE IF NOT EXISTS feed_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  flock_id UUID NOT NULL REFERENCES flocks(id),
  quota_id UUID NOT NULL REFERENCES feed_quotas(id),
  product_id UUID NOT NULL REFERENCES products(id),
  requested_quantity_kg NUMERIC(12, 2) NOT NULL,
  approved_quantity_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  delivery_address TEXT NOT NULL,
  delivery_date_needed DATE NOT NULL,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_orders_farmer ON feed_orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_feed_orders_status ON feed_orders(status);
CREATE INDEX IF NOT EXISTS idx_feed_orders_created ON feed_orders(created_at);

-- 16. Production Batches (بچ‌های تولید)
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  formula_id UUID NOT NULL REFERENCES formulas(id),
  feed_order_id UUID REFERENCES feed_orders(id),
  target_quantity_kg NUMERIC(12, 2) NOT NULL,
  actual_produced_quantity_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
  operator_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_batches_formula ON production_batches(formula_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(status);

-- 17. Inventory Ledger (دفتر کل انبار - ثبت تغییرناپذیر)
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  transaction_type VARCHAR(30) NOT NULL,
  quantity_delta_kg NUMERIC(12, 2) NOT NULL,
  running_balance_kg NUMERIC(12, 2) NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(100) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_product ON inventory_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_created ON inventory_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_ref ON inventory_ledger(reference_type, reference_id);

-- 18. Drivers (رانندگان ناوگان حمل)
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(100) NOT NULL,
  national_id VARCHAR(20) UNIQUE NOT NULL,
  license_number VARCHAR(50) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_user ON drivers(user_id);

-- 19. Vehicles (خودروها و کامیون‌ها)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  plate_number VARCHAR(30) UNIQUE NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  max_capacity_kg NUMERIC(12, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(driver_id);

-- 20. Deliveries (بارنامه‌ها و ارسال)
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number VARCHAR(50) UNIQUE NOT NULL,
  feed_order_id UUID NOT NULL REFERENCES feed_orders(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
  origin_scale_weight_kg NUMERIC(12, 2) NOT NULL,
  destination_scale_weight_kg NUMERIC(12, 2),
  otp_hash TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INTEGER NOT NULL DEFAULT 0,
  signature_data TEXT,
  photo_url TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(feed_order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- 21. Inbound Remittances (حواله‌های ورود مواد اولیه)
CREATE TABLE IF NOT EXISTS inbound_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_number VARCHAR(50) UNIQUE NOT NULL,
  seller_name VARCHAR(150) NOT NULL,
  raw_material_product_id UUID NOT NULL REFERENCES products(id),
  bill_number VARCHAR(50) NOT NULL,
  origin_location VARCHAR(150) NOT NULL,
  invoice_weight_kg NUMERIC(12, 2) NOT NULL,
  scale_weight_kg NUMERIC(12, 2) NOT NULL,
  shortage_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  wastage_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  transport_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  driver_name VARCHAR(100) NOT NULL,
  driver_phone VARCHAR(20) NOT NULL,
  driver_iban VARCHAR(35),
  scale_operator_id UUID REFERENCES users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_product ON inbound_remittances(raw_material_product_id);
CREATE INDEX IF NOT EXISTS idx_inbound_received ON inbound_remittances(received_at);

-- 22. Outbound Remittances (حواله‌های خروج خوراک)
CREATE TABLE IF NOT EXISTS outbound_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_number VARCHAR(50) UNIQUE NOT NULL,
  delivery_id UUID NOT NULL REFERENCES deliveries(id),
  feed_order_id UUID NOT NULL REFERENCES feed_orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  dispatched_weight_kg NUMERIC(12, 2) NOT NULL,
  scale_operator_id UUID REFERENCES users(id),
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_delivery ON outbound_remittances(delivery_id);
CREATE INDEX IF NOT EXISTS idx_outbound_product ON outbound_remittances(product_id);
