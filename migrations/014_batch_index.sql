CREATE INDEX IF NOT EXISTS idx_rnd_projects_status ON rnd_projects(status);
CREATE INDEX IF NOT EXISTS idx_rnd_gates_project_sequence ON rnd_validation_gates(project_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_lab_reports_project_date ON lab_reports(project_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_egg_batches_release_date ON egg_batches(release_status, production_date DESC);
CREATE INDEX IF NOT EXISTS idx_farm_daily_records_date ON farm_daily_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_rnd_measurements_project_date ON rnd_measurements(project_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_rnd_costs_project ON rnd_costs(project_id, incurred_on DESC)