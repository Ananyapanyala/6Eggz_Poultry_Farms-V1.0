CREATE TABLE IF NOT EXISTS customer_marketing_preferences (
  email TEXT PRIMARY KEY,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  consent_source TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_marketing_optin ON customer_marketing_preferences(marketing_opt_in, updated_at DESC);