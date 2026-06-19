-- Harden Ecommerce V2 row-level security before enabling production checkout.
-- This migration changes policies only. It does not mutate ecommerce data.

-- RLS must remain enabled on every exposed ecommerce table.
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_customers ENABLE ROW LEVEL SECURITY;

-- Remove broad or unsafe ecommerce policies from older migrations.
DROP POLICY IF EXISTS "Public can view active products" ON public.store_products;
DROP POLICY IF EXISTS "Public can view categories" ON public.store_categories;
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public can manage carts by ID" ON public.store_carts;
DROP POLICY IF EXISTS "Public can manage wishlists" ON public.store_wishlists;
DROP POLICY IF EXISTS "Public can manage stock notifications" ON public.store_stock_notifications;
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Public can insert reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Public can insert orders" ON public.store_orders;
DROP POLICY IF EXISTS "Public can insert order items" ON public.store_order_items;
DROP POLICY IF EXISTS "Public can insert customers" ON public.store_customers;
DROP POLICY IF EXISTS "Owners can manage store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Owners can manage categories" ON public.store_categories;
DROP POLICY IF EXISTS "Owners can manage products" ON public.store_products;
DROP POLICY IF EXISTS "Owners can manage customers" ON public.store_customers;
DROP POLICY IF EXISTS "Owners can manage orders" ON public.store_orders;
DROP POLICY IF EXISTS "Owners can manage order items" ON public.store_order_items;
DROP POLICY IF EXISTS "Owners can manage reviews" ON public.store_reviews;

DROP POLICY IF EXISTS "Storefront can view active products" ON public.store_products;
DROP POLICY IF EXISTS "Storefront can view public categories" ON public.store_categories;
DROP POLICY IF EXISTS "Storefront can view active store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Storefront can view approved reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Project members can manage store products" ON public.store_products;
DROP POLICY IF EXISTS "Project members can manage store categories" ON public.store_categories;
DROP POLICY IF EXISTS "Project members can manage store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Project members can manage store reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Users can view own carts" ON public.store_carts;
DROP POLICY IF EXISTS "Users can create own carts" ON public.store_carts;
DROP POLICY IF EXISTS "Users can update own carts" ON public.store_carts;
DROP POLICY IF EXISTS "Users can delete own carts" ON public.store_carts;
DROP POLICY IF EXISTS "Anonymous can create session carts" ON public.store_carts;
DROP POLICY IF EXISTS "Project members can view store carts" ON public.store_carts;
DROP POLICY IF EXISTS "Users can manage own wishlists" ON public.store_wishlists;
DROP POLICY IF EXISTS "Project members can view store wishlists" ON public.store_wishlists;
DROP POLICY IF EXISTS "Storefront can create stock notifications" ON public.store_stock_notifications;
DROP POLICY IF EXISTS "Project members can manage stock notifications" ON public.store_stock_notifications;
DROP POLICY IF EXISTS "Storefront can create pending reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Users can view own orders" ON public.store_orders;
DROP POLICY IF EXISTS "Project members can view store orders" ON public.store_orders;
DROP POLICY IF EXISTS "Project members can update store orders" ON public.store_orders;
DROP POLICY IF EXISTS "Users can view own order items" ON public.store_order_items;
DROP POLICY IF EXISTS "Project members can view store order items" ON public.store_order_items;
DROP POLICY IF EXISTS "Project members can update store order items" ON public.store_order_items;
DROP POLICY IF EXISTS "Users can view own customer profile" ON public.store_customers;
DROP POLICY IF EXISTS "Users can update own customer profile" ON public.store_customers;
DROP POLICY IF EXISTS "Project members can manage store customers" ON public.store_customers;

-- Storefront read access. Public product reads require explicit active/published state.
CREATE POLICY "Storefront can view active products"
ON public.store_products
FOR SELECT
TO anon, authenticated
USING (
  status = 'active'
  OR lower(COALESCE(data->>'status', '')) IN ('active', 'published')
);

-- Categories are public storefront navigation. Hide rows explicitly marked inactive in JSON.
CREATE POLICY "Storefront can view public categories"
ON public.store_categories
FOR SELECT
TO anon, authenticated
USING (
  lower(COALESCE(data->>'isActive', data->>'is_active', 'true')) <> 'false'
);

-- RLS cannot hide individual columns. Keep public settings row access limited to active stores;
-- sensitive checkout/payment actions must still be handled server-side.
CREATE POLICY "Storefront can view active store settings"
ON public.store_settings
FOR SELECT
TO anon, authenticated
USING (COALESCE(is_active, true) = true);

CREATE POLICY "Storefront can view approved reviews"
ON public.store_reviews
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- Project owner/member management. project_id is the admin/dashboard identity.
CREATE POLICY "Project members can manage store products"
ON public.store_products
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Project members can manage store categories"
ON public.store_categories
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Project members can manage store settings"
ON public.store_settings
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Project members can manage store reviews"
ON public.store_reviews
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));

-- Carts: authenticated users can manage only their own rows. Anonymous clients may
-- create session-token rows, but cannot globally read/update/delete carts through RLS.
CREATE POLICY "Users can view own carts"
ON public.store_carts
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own carts"
ON public.store_carts
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND user_id = (SELECT auth.uid())
  AND (project_id IS NOT NULL OR store_id IS NOT NULL OR public_store_id IS NOT NULL)
);

CREATE POLICY "Users can update own carts"
ON public.store_carts
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND user_id = (SELECT auth.uid())
  AND (project_id IS NOT NULL OR store_id IS NOT NULL OR public_store_id IS NOT NULL)
);

CREATE POLICY "Users can delete own carts"
ON public.store_carts
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Anonymous can create session carts"
ON public.store_carts
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND session_token IS NOT NULL
  AND length(session_token) BETWEEN 16 AND 256
  AND status = 'active'
  AND (project_id IS NOT NULL OR store_id IS NOT NULL OR public_store_id IS NOT NULL)
);

CREATE POLICY "Project members can view store carts"
ON public.store_carts
FOR SELECT
TO authenticated
USING (
  public.is_project_owner_or_tenant(project_id)
  OR public.is_project_owner_or_tenant(store_id)
);

-- Wishlists: only authenticated users own wishlist rows; project members may inspect
-- rows for support/analytics without public global access.
CREATE POLICY "Users can manage own wishlists"
ON public.store_wishlists
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Project members can view store wishlists"
ON public.store_wishlists
FOR SELECT
TO authenticated
USING (public.is_project_owner_or_tenant(store_id));

-- Stock notifications: public can only submit new notifications. Email lists and
-- notification status remain admin-only.
CREATE POLICY "Storefront can create stock notifications"
ON public.store_stock_notifications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND position('@' in email) > 1
  AND product_id IS NOT NULL
  AND COALESCE(project_id, store_id) IS NOT NULL
  AND COALESCE(notified, false) = false
);

CREATE POLICY "Project members can manage stock notifications"
ON public.store_stock_notifications
FOR ALL
TO authenticated
USING (
  public.is_project_owner_or_tenant(project_id)
  OR public.is_project_owner_or_tenant(store_id)
)
WITH CHECK (
  public.is_project_owner_or_tenant(project_id)
  OR public.is_project_owner_or_tenant(store_id)
);

-- Reviews: public can create pending reviews only. Moderation and responses are admin-only.
CREATE POLICY "Storefront can create pending reviews"
ON public.store_reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  COALESCE(status, 'pending') = 'pending'
  AND rating BETWEEN 1 AND 5
  AND product_id IS NOT NULL
  AND customer_name IS NOT NULL
  AND length(customer_name) BETWEEN 1 AND 160
  AND customer_email IS NOT NULL
  AND length(customer_email) BETWEEN 3 AND 320
  AND position('@' in customer_email) > 1
  AND verified_purchase IS NOT TRUE
  AND COALESCE(helpful_votes, 0) = 0
  AND admin_response IS NULL
  AND admin_response_at IS NULL
);

-- Orders are not publicly writable. Checkout/order creation must go through trusted
-- server-side code that uses the service role and still respects application checks.
CREATE POLICY "Users can view own orders"
ON public.store_orders
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Project members can view store orders"
ON public.store_orders
FOR SELECT
TO authenticated
USING (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Project members can update store orders"
ON public.store_orders
FOR UPDATE
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));

CREATE POLICY "Users can view own order items"
ON public.store_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_orders o
    WHERE o.id::text = store_order_items.order_id::text
      AND o.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Project members can view store order items"
ON public.store_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_orders o
    WHERE o.id::text = store_order_items.order_id::text
      AND public.is_project_owner_or_tenant(o.project_id)
  )
);

CREATE POLICY "Project members can update store order items"
ON public.store_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_orders o
    WHERE o.id::text = store_order_items.order_id::text
      AND public.is_project_owner_or_tenant(o.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.store_orders o
    WHERE o.id::text = store_order_items.order_id::text
      AND public.is_project_owner_or_tenant(o.project_id)
  )
);

-- Customers: authenticated customers can read/update their own profile when linked
-- by user_id. Project members retain CRUD for admin/customer support workflows.
CREATE POLICY "Users can view own customer profile"
ON public.store_customers
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own customer profile"
ON public.store_customers
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

CREATE POLICY "Project members can manage store customers"
ON public.store_customers
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(project_id))
WITH CHECK (public.is_project_owner_or_tenant(project_id));
