ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_customer_user_created ON orders(customer_user_id,created_at DESC) WHERE customer_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  recipient_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Telangana',
  pin_code TEXT NOT NULL,
  delivery_instructions TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON customer_addresses(user_id,created_at DESC);