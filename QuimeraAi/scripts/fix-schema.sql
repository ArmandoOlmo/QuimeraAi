-- ============================================================
-- FIX SCHEMA: Drop broken tables and recreate with correct schema
-- ============================================================

-- Drop tables with wrong schema (CASCADE removes dependent objects)
DROP TABLE IF EXISTS project_leads CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS project_appointments CASCADE;
DROP TABLE IF EXISTS project_posts CASCADE;
DROP TABLE IF EXISTS project_finance CASCADE;
DROP TABLE IF EXISTS store_products CASCADE;
DROP TABLE IF EXISTS store_categories CASCADE;
DROP TABLE IF EXISTS store_discounts CASCADE;
DROP TABLE IF EXISTS store_reviews CASCADE;
DROP TABLE IF EXISTS store_stock_notifications CASCADE;
DROP TABLE IF EXISTS store_orders CASCADE;
DROP TABLE IF EXISTS user_carts CASCADE;
DROP TABLE IF EXISTS store_wishlists CASCADE;
DROP TABLE IF EXISTS store_customers CASCADE;
DROP TABLE IF EXISTS store_segments CASCADE;
DROP TABLE IF EXISTS store_user_activities CASCADE;
DROP TABLE IF EXISTS public_stores CASCADE;
DROP TABLE IF EXISTS tenant_invites CASCADE;
DROP TABLE IF EXISTS agency_activity CASCADE;
DROP TABLE IF EXISTS tenant_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS custom_domains CASCADE;
DROP TABLE IF EXISTS subdomains CASCADE;
DROP TABLE IF EXISTS custom_components CASCADE;
DROP TABLE IF EXISTS changelog CASCADE;
DROP TABLE IF EXISTS prompts CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS global_settings CASCADE;

-- ============================================================
-- Recreate with correct schema (TEXT PKs + JSONB data)
-- ============================================================

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_members (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_leads (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_appointments (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_posts (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_finance (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE custom_domains (
  domain_name TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subdomains (
  subdomain_name TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public_stores (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE store_products (
  id TEXT PRIMARY KEY,
  store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE store_orders (
  id TEXT PRIMARY KEY,
  store_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE global_settings (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE changelog (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE custom_components (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_invites (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agency_activity (
  id TEXT PRIMARY KEY,
  agency_tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_activity ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Tenants
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (
  owner_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM tenant_members WHERE tenant_id = tenants.id)
);
CREATE POLICY "tenants_insert" ON tenants FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "tenants_update" ON tenants FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "tenants_delete" ON tenants FOR DELETE USING (owner_id = auth.uid());

-- Tenant Members
CREATE POLICY "tm_select" ON tenant_members FOR SELECT USING (
  tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
);
CREATE POLICY "tm_insert" ON tenant_members FOR INSERT WITH CHECK (
  tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()) OR user_id = auth.uid()
);
CREATE POLICY "tm_manage" ON tenant_members FOR UPDATE USING (
  tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
);
CREATE POLICY "tm_delete" ON tenant_members FOR DELETE USING (
  tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
);

-- Projects
CREATE POLICY "proj_select" ON projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "proj_insert" ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "proj_update" ON projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "proj_delete" ON projects FOR DELETE USING (user_id = auth.uid());

-- Project subcollections
CREATE POLICY "pl_all" ON project_leads FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
CREATE POLICY "pf_all" ON project_files FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
CREATE POLICY "pa_all" ON project_appointments FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
CREATE POLICY "pp_all" ON project_posts FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
CREATE POLICY "pfin_all" ON project_finance FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Domains
CREATE POLICY "cd_all" ON custom_domains FOR ALL USING (user_id = auth.uid());
CREATE POLICY "sd_all" ON subdomains FOR ALL USING (user_id = auth.uid());

-- Stores
CREATE POLICY "ps_select" ON public_stores FOR SELECT USING (true);
CREATE POLICY "ps_manage" ON public_stores FOR ALL USING (user_id = auth.uid());
CREATE POLICY "sp_select" ON store_products FOR SELECT USING (true);
CREATE POLICY "sp_manage" ON store_products FOR ALL USING (store_id IN (SELECT id FROM public_stores WHERE user_id = auth.uid()));
CREATE POLICY "so_all" ON store_orders FOR ALL USING (user_id = auth.uid() OR store_id IN (SELECT id FROM public_stores WHERE user_id = auth.uid()));

-- Global read tables
CREATE POLICY "gs_select" ON global_settings FOR SELECT USING (true);
CREATE POLICY "gs_manage" ON global_settings FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "tpl_select" ON templates FOR SELECT USING (true);
CREATE POLICY "tpl_manage" ON templates FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "cl_select" ON changelog FOR SELECT USING (true);
CREATE POLICY "cc_select" ON custom_components FOR SELECT USING (true);
CREATE POLICY "cc_manage" ON custom_components FOR ALL USING (user_id = auth.uid());
CREATE POLICY "pr_select" ON prompts FOR SELECT USING (true);
CREATE POLICY "pr_manage" ON prompts FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "ti_select" ON tenant_invites FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "ti_manage" ON tenant_invites FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
CREATE POLICY "aa_all" ON agency_activity FOR ALL USING (agency_tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
