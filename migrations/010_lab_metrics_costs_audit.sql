CREATE TABLE IF NOT EXISTS rnd_measurements (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES rnd_projects(id) ON DELETE CASCADE,
  gate_id BIGINT REFERENCES rnd_validation_gates(id) ON DELETE SET NULL,
  phase TEXT NOT NULL,
  sample_id TEXT NOT NULL DEFAULT '',
  metric_name TEXT NOT NULL,
  result_value NUMERIC,
  result_text TEXT NOT NULL DEFAULT '',
  result_unit TEXT NOT NULL DEFAULT '',
  measurement_basis TEXT NOT NULL DEFAULT '',
  measurement_date DATE,
  method TEXT NOT NULL DEFAULT '',
  source_report_id BIGINT REFERENCES lab_reports(id) ON DELETE SET NULL,
  is_validated BOOLEAN NOT NULL DEFAULT FALSE,
  entered_by TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)