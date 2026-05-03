CREATE TABLE IF NOT EXISTS project_deployment_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE project_deployment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdl_all" ON project_deployment_logs FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
