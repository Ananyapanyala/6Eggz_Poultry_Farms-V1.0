CREATE TABLE IF NOT EXISTS feed_batches (
  id BIGSERIAL PRIMARY KEY,
  feed_batch_code TEXT NOT NULL UNIQUE,
  feed_type TEXT NOT NULL,
  supplier_name TEXT NOT NULL DEFAULT '',
  ingredients_summary TEXT NOT NULL DEFAULT '',
  supplier_coa_reference TEXT NOT NULL DEFAULT '',
  manufacture_date DATE,
  received_date DATE,
  expiry_date DATE,
  qc_status TEXT NOT NULL DEFAULT 'Pending',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)