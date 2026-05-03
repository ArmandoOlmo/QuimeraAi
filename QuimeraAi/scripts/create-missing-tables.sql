-- scripts/create-missing-tables.sql

CREATE TABLE IF NOT EXISTS project_lead_activities (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_lead_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_leads (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS global_files (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_assets (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_lead_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_assets ENABLE ROW LEVEL SECURITY;

-- Project Lead Activities
CREATE POLICY "pla_all" ON project_lead_activities FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Project Lead Tasks
CREATE POLICY "plt_all" ON project_lead_tasks FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Library Leads
CREATE POLICY "ll_all" ON library_leads FOR ALL USING (user_id = auth.uid());

-- Global Files
CREATE POLICY "gf_select" ON global_files FOR SELECT USING (true);
CREATE POLICY "gf_insert" ON global_files FOR INSERT WITH CHECK (auth_get_user_role() IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "gf_update" ON global_files FOR UPDATE USING (auth_get_user_role() IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "gf_delete" ON global_files FOR DELETE USING (auth_get_user_role() IN ('superadmin', 'owner', 'admin'));

-- Admin Assets
CREATE POLICY "aa_select" ON admin_assets FOR SELECT USING (true);
CREATE POLICY "aa_insert" ON admin_assets FOR INSERT WITH CHECK (auth_get_user_role() IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "aa_update" ON admin_assets FOR UPDATE USING (auth_get_user_role() IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "aa_delete" ON admin_assets FOR DELETE USING (auth_get_user_role() IN ('superadmin', 'owner', 'admin'));
