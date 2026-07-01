-- Allow the Super Admin subscription dashboard to read and adjust AI credit data
-- through the Supabase Data API without relying on legacy Firebase-style tables.

GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT ON public.ai_credits_transactions TO authenticated;
GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.tenant_members TO authenticated;

DROP POLICY IF EXISTS "Platform owners can read all tenants" ON public.tenants;
CREATE POLICY "Platform owners can read all tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Platform owners can read all projects" ON public.projects;
CREATE POLICY "Platform owners can read all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Platform owners can read all tenant members" ON public.tenant_members;
CREATE POLICY "Platform owners can read all tenant members"
ON public.tenant_members
FOR SELECT
TO authenticated
USING (public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Platform owners can read all subscriptions" ON public.subscriptions;
CREATE POLICY "Platform owners can read all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Platform owners can update subscription credits" ON public.subscriptions;
CREATE POLICY "Platform owners can update subscription credits"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (public.global_assistant_is_platform_owner())
WITH CHECK (public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Platform owners can read ai credit transactions" ON public.ai_credits_transactions;
CREATE POLICY "Platform owners can read ai credit transactions"
ON public.ai_credits_transactions
FOR SELECT
TO authenticated
USING (public.global_assistant_is_platform_owner());

DROP POLICY IF EXISTS "Platform owners can insert ai credit transactions" ON public.ai_credits_transactions;
CREATE POLICY "Platform owners can insert ai credit transactions"
ON public.ai_credits_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.global_assistant_is_platform_owner());
