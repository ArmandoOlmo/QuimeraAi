-- Harden public ecommerce RLS without removing the public storefront read surface.

-- Public catalog should expose only active products. Owners retain authenticated write access.
DROP POLICY IF EXISTS "sp_select" ON public.store_products;
DROP POLICY IF EXISTS "sp_manage" ON public.store_products;
CREATE POLICY "sp_manage" ON public.store_products
    FOR ALL TO authenticated
    USING (
        store_id IN (
            SELECT public_stores.id
            FROM public.public_stores
            WHERE public_stores.user_id = auth.uid()
        )
    )
    WITH CHECK (
        store_id IN (
            SELECT public_stores.id
            FROM public.public_stores
            WHERE public_stores.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "ps_manage" ON public.public_stores;
CREATE POLICY "ps_manage" ON public.public_stores
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Owner policies should not run SECURITY DEFINER owner checks for anon requests.
DROP POLICY IF EXISTS "Owners can manage products" ON public.store_products;
CREATE POLICY "Owners can manage products" ON public.store_products
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Owners can manage categories" ON public.store_categories;
CREATE POLICY "Owners can manage categories" ON public.store_categories
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Owners can manage store settings" ON public.store_settings;
CREATE POLICY "Owners can manage store settings" ON public.store_settings
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Owners can manage customers" ON public.store_customers;
CREATE POLICY "Owners can manage customers" ON public.store_customers
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Owners can manage discounts" ON public.store_discounts;
CREATE POLICY "Owners can manage discounts" ON public.store_discounts
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Owners can manage reviews" ON public.store_reviews;
CREATE POLICY "Owners can manage reviews" ON public.store_reviews
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Owners manage store users" ON public.store_users;
CREATE POLICY "Owners manage store users" ON public.store_users
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Owners can manage orders" ON public.store_orders;
CREATE POLICY "Owners can manage orders" ON public.store_orders
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "so_all" ON public.store_orders;
CREATE POLICY "so_all" ON public.store_orders
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
        OR store_id IN (
            SELECT public_stores.id
            FROM public.public_stores
            WHERE public_stores.user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR store_id IN (
            SELECT public_stores.id
            FROM public.public_stores
            WHERE public_stores.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can manage order items" ON public.store_order_items;
CREATE POLICY "Owners can manage order items" ON public.store_order_items
    FOR ALL TO authenticated
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

-- Public COD fallback inserts must be constrained and token-addressable.
DROP POLICY IF EXISTS "Public can insert orders" ON public.store_orders;
CREATE POLICY "Public can insert orders" ON public.store_orders
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        project_id IS NOT NULL
        AND store_id = project_id::text
        AND EXISTS (
            SELECT 1
            FROM public.public_stores ps
            WHERE ps.id = store_orders.store_id
        )
        AND customer_email IS NOT NULL
        AND position('@' in customer_email) > 1
        AND position('.' in split_part(customer_email, '@', 2)) > 1
        AND coalesce(customer_name, '') <> ''
        AND jsonb_typeof(coalesce(items, '[]'::jsonb)) = 'array'
        AND jsonb_array_length(coalesce(items, '[]'::jsonb)) BETWEEN 1 AND 100
        AND coalesce(subtotal, 0) >= 0
        AND coalesce(discount_amount, 0) >= 0
        AND coalesce(shipping_cost, 0) >= 0
        AND coalesce(tax_amount, 0) >= 0
        AND coalesce(total, 0) >= 0
        AND status IN ('pending', 'confirmed')
        AND payment_status IN ('pending', 'paid')
        AND fulfillment_status IN ('unfulfilled', 'partial', 'fulfilled')
        AND payment_method IN ('cod', 'stripe', 'paypal')
        AND coalesce(data, '{}'::jsonb) ? 'orderAccessTokenHash'
    );

-- Public reviews are allowed only as pending reviews against active products.
DROP POLICY IF EXISTS "Public can insert reviews" ON public.store_reviews;
CREATE POLICY "Public can insert reviews" ON public.store_reviews
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        project_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.store_products sp
            WHERE sp.id::text = store_reviews.product_id::text
              AND sp.project_id = store_reviews.project_id
              AND sp.status = 'active'
        )
        AND rating BETWEEN 1 AND 5
        AND status = 'pending'
        AND coalesce(verified_purchase, false) = false
        AND coalesce(helpful_votes, 0) = 0
        AND position('@' in customer_email) > 1
        AND position('.' in split_part(customer_email, '@', 2)) > 1
        AND length(trim(customer_name)) BETWEEN 2 AND 120
        AND length(trim(title)) BETWEEN 2 AND 160
        AND length(trim(comment)) BETWEEN 5 AND 5000
    );

-- Dashboard/customer carts are authenticated data, not public writable records.
DROP POLICY IF EXISTS "Public can manage carts by ID" ON public.store_carts;
CREATE POLICY "Store users manage own cart" ON public.store_carts
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Customer inserts should be scoped to an existing store and sane public fields.
DROP POLICY IF EXISTS "Public can insert customers" ON public.store_customers;
CREATE POLICY "Public can insert customers" ON public.store_customers
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        project_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.public_stores ps
            WHERE ps.id = store_customers.project_id::text
        )
        AND position('@' in email) > 1
        AND position('.' in split_part(email, '@', 2)) > 1
        AND length(trim(first_name)) BETWEEN 1 AND 120
        AND length(trim(last_name)) BETWEEN 1 AND 120
        AND coalesce(total_orders, 0) = 0
        AND coalesce(total_spent, 0) = 0
    );

DROP POLICY IF EXISTS "Public can insert order items" ON public.store_order_items;

-- Wishlist persistence is for authenticated store customers. Guests use localStorage.
DROP POLICY IF EXISTS "Public can manage wishlists" ON public.store_wishlists;
CREATE POLICY "Store users read own wishlists" ON public.store_wishlists
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.store_users su
            WHERE su.project_id = store_wishlists.store_id
              AND su.id = store_wishlists.user_id
              AND (
                su.id = auth.uid()
                OR su.metadata->>'authUserId' = auth.uid()::text
                OR su.email = auth.jwt()->>'email'
              )
        )
    );
CREATE POLICY "Store users insert own wishlists" ON public.store_wishlists
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.store_users su
                WHERE su.project_id = store_wishlists.store_id
                  AND su.id = store_wishlists.user_id
                  AND (
                    su.id = auth.uid()
                    OR su.metadata->>'authUserId' = auth.uid()::text
                    OR su.email = auth.jwt()->>'email'
                  )
            )
        )
        AND EXISTS (
            SELECT 1
            FROM public.store_products sp
            WHERE sp.id = store_wishlists.product_id
              AND sp.project_id = store_wishlists.store_id
              AND sp.status = 'active'
        )
    );
CREATE POLICY "Store users delete own wishlists" ON public.store_wishlists
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.store_users su
            WHERE su.project_id = store_wishlists.store_id
              AND su.id = store_wishlists.user_id
              AND (
                su.id = auth.uid()
                OR su.metadata->>'authUserId' = auth.uid()::text
                OR su.email = auth.jwt()->>'email'
              )
        )
    );

-- Stock notifications are managed through the Edge Function to avoid public email enumeration.
DROP POLICY IF EXISTS "Public can manage stock notifications" ON public.store_stock_notifications;
CREATE POLICY "Owners can manage stock notifications" ON public.store_stock_notifications
    FOR ALL TO authenticated
    USING (public.is_project_owner_or_tenant(project_id))
    WITH CHECK (public.is_project_owner_or_tenant(project_id));

-- Public anon no longer needs to execute this SECURITY DEFINER helper directly.
REVOKE EXECUTE ON FUNCTION public.is_project_owner_or_tenant(uuid) FROM anon;
