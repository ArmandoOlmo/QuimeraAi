-- Fix Infinite Recursion in RLS Policies

-- 1. Replace FOR ALL with specific commands on global settings to prevent SELECT queries from evaluating the role subquery
DROP POLICY IF EXISTS "gs_manage" ON global_settings;
CREATE POLICY "gs_insert" ON global_settings FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "gs_update" ON global_settings FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "gs_delete" ON global_settings FOR DELETE USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));

DROP POLICY IF EXISTS "tpl_manage" ON templates;
CREATE POLICY "tpl_insert" ON templates FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "tpl_update" ON templates FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "tpl_delete" ON templates FOR DELETE USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));

DROP POLICY IF EXISTS "pr_manage" ON prompts;
CREATE POLICY "pr_insert" ON prompts FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "pr_update" ON prompts FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));
CREATE POLICY "pr_delete" ON prompts FOR DELETE USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin'));

-- 2. Fix tenants and tenant_members mutual recursion by using SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION auth_is_tenant_member(t_id text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members 
    WHERE tenant_id = t_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION auth_is_tenant_owner(t_id text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = t_id AND owner_id = auth.uid()
  );
$$;

-- Drop recursive policies
DROP POLICY IF EXISTS "tenants_select" ON tenants;
DROP POLICY IF EXISTS "tm_select" ON tenant_members;
DROP POLICY IF EXISTS "tm_insert" ON tenant_members;
DROP POLICY IF EXISTS "tm_manage" ON tenant_members;
DROP POLICY IF EXISTS "tm_delete" ON tenant_members;

-- Recreate policies using the non-recursive helper functions
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (
  owner_id = auth.uid() OR auth_is_tenant_member(id)
);

CREATE POLICY "tm_select" ON tenant_members FOR SELECT USING (
  user_id = auth.uid() OR auth_is_tenant_owner(tenant_id)
);

CREATE POLICY "tm_insert" ON tenant_members FOR INSERT WITH CHECK (
  auth_is_tenant_owner(tenant_id) OR user_id = auth.uid()
);

CREATE POLICY "tm_manage" ON tenant_members FOR UPDATE USING (
  auth_is_tenant_owner(tenant_id)
);

CREATE POLICY "tm_delete" ON tenant_members FOR DELETE USING (
  auth_is_tenant_owner(tenant_id)
);
