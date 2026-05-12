-- Fix tenant_members INSERT policy — the previous version referenced tenant_members
-- in its own WITH CHECK, causing infinite RLS recursion (500 Internal Server Error).
-- 
-- New policy: you can insert a member into any tenant you OWN (checked via tenants table only).

DROP POLICY IF EXISTS "Users can insert tenant members" ON public.tenant_members;
CREATE POLICY "Users can insert tenant members" ON public.tenant_members FOR INSERT WITH CHECK (
  -- The inserting user must be the owner of the target tenant
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_user_id = auth.uid())
);

-- Fix UPDATE policy similarly (was also self-referencing)
DROP POLICY IF EXISTS "Users can update tenant members" ON public.tenant_members;
CREATE POLICY "Users can update tenant members" ON public.tenant_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_user_id = auth.uid())
);

-- Fix DELETE policy similarly
DROP POLICY IF EXISTS "Users can delete tenant members" ON public.tenant_members;
CREATE POLICY "Users can delete tenant members" ON public.tenant_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_user_id = auth.uid())
);
