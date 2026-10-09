CREATE TABLE IF NOT EXISTS rnd_costs (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES rnd_projects(id) ON DELETE CASCADE,
  cost_category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_paise BIGINT NOT NULL DEFAULT 0,
  quote_status TEXT NOT NULL DEFAULT 'Estimate Needed',
  supplier_or_lab TEXT NOT NULL DEFAULT '',
  incurred_on DATE,
  reference TEXT NOT NULL DEFAULT '',
  entered_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(amount_paise >= 0)
)