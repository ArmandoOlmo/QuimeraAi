-- Storefront customer auth has historically stored the Supabase Auth user id
-- either as store_users.id or in metadata.authUserId. Support both shapes so
-- customer account, profile, and order history work across existing rows.

DROP POLICY IF EXISTS "Store users read own profile" ON public.store_users;
CREATE POLICY "Store users read own profile"
ON public.store_users
FOR SELECT
USING (
  id = auth.uid()
  OR metadata->>'authUserId' = auth.uid()::text
  OR email = auth.jwt()->>'email'
);

DROP POLICY IF EXISTS "Store users update own profile" ON public.store_users;
CREATE POLICY "Store users update own profile"
ON public.store_users
FOR UPDATE
USING (
  id = auth.uid()
  OR metadata->>'authUserId' = auth.uid()::text
  OR email = auth.jwt()->>'email'
)
WITH CHECK (
  id = auth.uid()
  OR metadata->>'authUserId' = auth.uid()::text
  OR email = auth.jwt()->>'email'
);

DROP POLICY IF EXISTS "Store users insert own activities" ON public.store_user_activities;
CREATE POLICY "Store users insert own activities"
ON public.store_user_activities
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.store_users su
    WHERE su.project_id = store_user_activities.project_id
      AND su.id = store_user_activities.user_id
      AND (
        su.id = auth.uid()
        OR su.metadata->>'authUserId' = auth.uid()::text
        OR su.email = auth.jwt()->>'email'
      )
  )
);

DROP POLICY IF EXISTS "Store users read own activities" ON public.store_user_activities;
CREATE POLICY "Store users read own activities"
ON public.store_user_activities
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.store_users su
    WHERE su.project_id = store_user_activities.project_id
      AND su.id = store_user_activities.user_id
      AND (
        su.id = auth.uid()
        OR su.metadata->>'authUserId' = auth.uid()::text
        OR su.email = auth.jwt()->>'email'
      )
  )
);

DROP POLICY IF EXISTS "Store customers can read own orders" ON public.store_orders;
CREATE POLICY "Store customers can read own orders"
ON public.store_orders
FOR SELECT
USING (
  customer_email = auth.jwt()->>'email'
  AND EXISTS (
    SELECT 1
    FROM public.store_users su
    WHERE su.project_id = store_orders.project_id
      AND su.email = auth.jwt()->>'email'
      AND (
        su.id = auth.uid()
        OR su.metadata->>'authUserId' = auth.uid()::text
        OR su.email = auth.jwt()->>'email'
      )
  )
);
