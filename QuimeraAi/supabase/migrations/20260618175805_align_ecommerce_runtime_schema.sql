-- Align legacy ecommerce tables with the current dashboard/storefront runtime.
-- These changes are additive and safe for databases that already have the
-- newer schema.

CREATE TABLE IF NOT EXISTS public.public_stores (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_categories ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.public_stores(id) ON DELETE CASCADE;
ALTER TABLE public.store_categories ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_categories ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.store_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS store_id TEXT REFERENCES public.public_stores(id) ON DELETE CASCADE;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.store_stock_notifications ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.store_stock_notifications ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.store_stock_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
DECLARE
  target_table TEXT;
  id_type TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'store_products',
    'store_categories',
    'store_orders',
    'store_carts',
    'store_wishlists',
    'store_stock_notifications'
  ]
  LOOP
    SELECT data_type
    INTO id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = target_table
      AND column_name = 'id';

    IF id_type = 'uuid' THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()', target_table);
    ELSIF id_type IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()::text', target_table);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS pricing JSONB;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS cart_hash TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe JSONB;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS paypal_client_id TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS notify_on_new_order BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS notify_on_low_stock BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS send_order_confirmation BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS send_shipping_notification BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS terms_and_conditions_url TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT;

ALTER TABLE public.store_discounts ADD COLUMN IF NOT EXISTS can_combine BOOLEAN DEFAULT false;
ALTER TABLE public.store_discounts ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false;

ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS admin_response_at TIMESTAMPTZ;
ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.store_reviews ALTER COLUMN product_id TYPE TEXT USING product_id::text;

CREATE UNIQUE INDEX IF NOT EXISTS store_wishlists_user_store_product_uidx
  ON public.store_wishlists (user_id, store_id, product_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS store_stock_notifications_store_product_email_uidx
  ON public.store_stock_notifications (store_id, product_id, lower(email));
