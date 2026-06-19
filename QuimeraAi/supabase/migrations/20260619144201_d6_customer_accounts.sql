-- D6 Customer Accounts
-- Links storefront auth users to store_users, store_customers and store_orders.

ALTER TABLE public.store_users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.store_users ADD COLUMN IF NOT EXISTS public_store_id TEXT;

CREATE INDEX IF NOT EXISTS store_users_auth_user_id_idx ON public.store_users(auth_user_id);
CREATE INDEX IF NOT EXISTS store_users_project_email_lookup_idx ON public.store_users(project_id, lower(email));

ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_user_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own store user profile" ON public.store_users;
DROP POLICY IF EXISTS "Users can update own store user profile" ON public.store_users;
DROP POLICY IF EXISTS "Project members can manage store users" ON public.store_users;
DROP POLICY IF EXISTS "Project members can view store user segments" ON public.store_user_segments;
DROP POLICY IF EXISTS "Project members can manage store user segments" ON public.store_user_segments;
DROP POLICY IF EXISTS "Users can view own store user activities" ON public.store_user_activities;
DROP POLICY IF EXISTS "Project members can manage store user activities" ON public.store_user_activities;
DROP POLICY IF EXISTS "Store users can view linked customer orders" ON public.store_orders;

CREATE POLICY "Users can view own store user profile"
ON public.store_users
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND auth_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own store user profile"
ON public.store_users
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND auth_user_id = (SELECT auth.uid()))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND auth_user_id = (SELECT auth.uid()));

CREATE POLICY "Project members can manage store users"
ON public.store_users
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Project members can view store user segments"
ON public.store_user_segments
FOR SELECT
TO authenticated
USING (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Project members can manage store user segments"
ON public.store_user_segments
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Users can view own store user activities"
ON public.store_user_activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_users su
    WHERE su.id = store_user_activities.user_id
      AND su.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Project members can manage store user activities"
ON public.store_user_activities
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Store users can view linked customer orders"
ON public.store_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_users su
    WHERE su.project_id = store_orders.project_id
      AND su.auth_user_id = (SELECT auth.uid())
      AND lower(su.email) = lower(store_orders.customer_email)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_user_segments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_user_activities TO authenticated;
GRANT SELECT, UPDATE ON public.store_customers TO authenticated;
GRANT SELECT ON public.store_orders TO authenticated;
