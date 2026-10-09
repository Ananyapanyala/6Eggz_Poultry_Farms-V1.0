CREATE TABLE IF NOT EXISTS rnd_validation_gates (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES rnd_projects(id) ON DELETE CASCADE,
  gate_code TEXT NOT NULL,
  gate_name TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Not Started',
  reviewer TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  decision TEXT NOT NULL DEFAULT '',
  evidence_summary TEXT NOT NULL DEFAULT '',
  report_id BIGINT,
  mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, gate_code)
)