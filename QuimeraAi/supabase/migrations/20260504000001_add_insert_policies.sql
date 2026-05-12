-- 1. Add INSERT policy for tenants
DROP POLICY IF EXISTS "Users can insert tenants" ON public.tenants;
CREATE POLICY "Users can insert tenants" ON public.tenants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Add UPDATE policy for tenants
DROP POLICY IF EXISTS "Users can update their tenants" ON public.tenants;
CREATE POLICY "Users can update their tenants" ON public.tenants FOR UPDATE USING (owner_user_id = auth.uid());

-- 3. Add DELETE policy for tenants
DROP POLICY IF EXISTS "Users can delete their tenants" ON public.tenants;
CREATE POLICY "Users can delete their tenants" ON public.tenants FOR DELETE USING (owner_user_id = auth.uid());

-- 4. Add INSERT policy for tenant_members
DROP POLICY IF EXISTS "Users can insert tenant members" ON public.tenant_members;
CREATE POLICY "Users can insert tenant members" ON public.tenant_members FOR INSERT WITH CHECK (
  -- The user is inserting themselves into a tenant they own
  (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_user_id = auth.uid()))
  -- OR the user inserting the row is an admin/owner of the tenant
  OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_members.tenant_id AND tm.user_id = auth.uid() AND (tm.role = 'agency_owner' OR tm.role = 'agency_admin'))
);

-- 5. Add UPDATE policy for tenant_members
DROP POLICY IF EXISTS "Users can update tenant members" ON public.tenant_members;
CREATE POLICY "Users can update tenant members" ON public.tenant_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_members.tenant_id AND tm.user_id = auth.uid() AND (tm.role = 'agency_owner' OR tm.role = 'agency_admin'))
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_user_id = auth.uid())
);

-- 6. Add DELETE policy for tenant_members
DROP POLICY IF EXISTS "Users can delete tenant members" ON public.tenant_members;
CREATE POLICY "Users can delete tenant members" ON public.tenant_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_members.tenant_id AND tm.user_id = auth.uid() AND (tm.role = 'agency_owner' OR tm.role = 'agency_admin'))
  OR EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_user_id = auth.uid())
);

-- 7. Add INSERT policy for projects
DROP POLICY IF EXISTS "Users can insert projects" ON public.projects;
CREATE POLICY "Users can insert projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Add UPDATE policy for projects
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
CREATE POLICY "Users can update projects" ON public.projects FOR UPDATE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = projects.tenant_id AND tm.user_id = auth.uid())
);

-- 9. Add DELETE policy for projects
DROP POLICY IF EXISTS "Users can delete projects" ON public.projects;
CREATE POLICY "Users can delete projects" ON public.projects FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = projects.tenant_id AND tm.user_id = auth.uid())
);
