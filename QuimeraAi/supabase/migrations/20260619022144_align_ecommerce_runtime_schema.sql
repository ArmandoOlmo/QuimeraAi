-- Align Ecommerce V2 runtime contract with existing legacy tables.
-- This migration is additive: no columns are dropped or renamed.
-- Identifier contract is intentionally dual:
-- - project_id / UUID store_id are project-backed admin/cart identifiers.
-- - public_store_id / public store_products.store_id reference public_stores.id.

-- Store products: canonical store_id with legacy project_id compatibility.
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN DEFAULT false;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

UPDATE public.store_products
SET inventory_quantity = quantity
WHERE inventory_quantity IS NULL
  AND quantity IS NOT NULL;

CREATE INDEX IF NOT EXISTS store_products_store_id_idx ON public.store_products(store_id);
CREATE INDEX IF NOT EXISTS store_products_store_status_idx ON public.store_products(store_id, status);
CREATE INDEX IF NOT EXISTS store_products_store_slug_idx ON public.store_products(store_id, slug);

-- Store categories: storefront code reads categories by store_id/data.
ALTER TABLE public.store_categories ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.store_categories ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_categories ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS store_categories_store_id_idx ON public.store_categories(store_id);
CREATE INDEX IF NOT EXISTS store_categories_store_slug_idx ON public.store_categories(store_id, slug);

-- Store settings: checkout runtime reads both flat columns and data fallback.
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS paypal_client_id TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS notify_on_new_order BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS notify_on_low_stock BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS send_order_confirmation BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS send_shipping_notification BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS terms_and_conditions_url TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT;

CREATE INDEX IF NOT EXISTS store_settings_store_id_idx ON public.store_settings(store_id);

-- Store carts: project-backed store_id, legacy project_id, public storefront id, and stable identity fields.
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS store_id UUID;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC DEFAULT 0;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS cart_hash TEXT;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_carts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.store_carts
SET total_amount = COALESCE(subtotal, 0) - COALESCE(discount_amount, 0) + COALESCE(shipping_amount, 0) + COALESCE(tax_amount, 0)
WHERE total_amount IS NULL
   OR total_amount = 0;

CREATE INDEX IF NOT EXISTS store_carts_store_id_idx ON public.store_carts(store_id);
CREATE INDEX IF NOT EXISTS store_carts_public_store_id_idx ON public.store_carts(public_store_id);
CREATE INDEX IF NOT EXISTS store_carts_status_idx ON public.store_carts(status);
CREATE INDEX IF NOT EXISTS store_carts_session_token_idx ON public.store_carts(session_token);

-- Store orders: canonical order fields used by checkout, webhooks, and mappers.
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS pricing JSONB;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS cart_hash TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe JSONB;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC DEFAULT 0;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

UPDATE public.store_orders
SET shipping_amount = CASE
      WHEN shipping_amount IS NULL OR shipping_amount = 0 THEN COALESCE(shipping_cost, 0)
      ELSE shipping_amount
    END,
    total_amount = CASE
      WHEN total_amount IS NULL OR total_amount = 0 THEN COALESCE(total, 0)
      ELSE total_amount
    END,
    stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, payment_intent_id)
WHERE shipping_amount IS NULL
   OR shipping_amount = 0
   OR total_amount IS NULL
   OR total_amount = 0
   OR stripe_payment_intent_id IS NULL;

CREATE INDEX IF NOT EXISTS store_orders_store_id_idx ON public.store_orders(store_id);
CREATE INDEX IF NOT EXISTS store_orders_store_status_idx ON public.store_orders(store_id, status);
CREATE INDEX IF NOT EXISTS store_orders_user_id_idx ON public.store_orders(user_id);
CREATE INDEX IF NOT EXISTS store_orders_customer_id_idx ON public.store_orders(customer_id);
CREATE INDEX IF NOT EXISTS store_orders_payment_intent_idx ON public.store_orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS store_orders_stripe_payment_intent_idx ON public.store_orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS store_orders_stripe_checkout_session_idx ON public.store_orders(stripe_checkout_session_id);

-- Store order items: add canonical fields without adding strict FKs.
ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS store_order_items_store_id_idx ON public.store_order_items(store_id);
CREATE INDEX IF NOT EXISTS store_order_items_product_id_idx ON public.store_order_items(product_id);

-- Store customers: canonical store_id and JSON compatibility payload.
ALTER TABLE public.store_customers ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.store_customers ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_customers ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.store_customers ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

DO $$
DECLARE
  target_table TEXT;
  store_id_type TEXT;
  has_project_id BOOLEAN;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'store_products',
    'store_categories',
    'store_settings',
    'store_carts',
    'store_orders',
    'store_customers'
  ]
  LOOP
    SELECT c.udt_name INTO store_id_type
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = target_table
      AND c.column_name = 'store_id';

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = target_table
        AND c.column_name = 'project_id'
    ) INTO has_project_id;

    IF has_project_id AND store_id_type = 'uuid' THEN
      EXECUTE format(
        'UPDATE public.%I SET store_id = project_id WHERE store_id IS NULL AND project_id IS NOT NULL',
        target_table
      );
    ELSIF has_project_id AND store_id_type IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I SET store_id = project_id::text WHERE store_id IS NULL AND project_id IS NOT NULL',
        target_table
      );
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS store_customers_store_id_idx ON public.store_customers(store_id);
CREATE INDEX IF NOT EXISTS store_customers_store_email_idx ON public.store_customers(store_id, email);
CREATE INDEX IF NOT EXISTS store_customers_user_id_idx ON public.store_customers(user_id);

-- Optional discount/review fields already used by admin mappers.
ALTER TABLE public.store_discounts ADD COLUMN IF NOT EXISTS can_combine BOOLEAN DEFAULT false;
ALTER TABLE public.store_discounts ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false;
ALTER TABLE public.store_discounts ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_discounts ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS admin_response_at TIMESTAMPTZ;
ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS public_store_id TEXT;
ALTER TABLE public.store_reviews ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add safe unique indexes only when existing data will not violate them.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.store_orders
    WHERE payment_intent_id IS NOT NULL
    GROUP BY payment_intent_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS store_orders_payment_intent_uidx
      ON public.store_orders(payment_intent_id)
      WHERE payment_intent_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.store_orders
    WHERE stripe_payment_intent_id IS NOT NULL
    GROUP BY stripe_payment_intent_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS store_orders_stripe_payment_intent_uidx
      ON public.store_orders(stripe_payment_intent_id)
      WHERE stripe_payment_intent_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.store_orders
    WHERE stripe_checkout_session_id IS NOT NULL
    GROUP BY stripe_checkout_session_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS store_orders_stripe_checkout_session_uidx
      ON public.store_orders(stripe_checkout_session_id)
      WHERE stripe_checkout_session_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.store_carts
    WHERE store_id IS NOT NULL
      AND user_id IS NOT NULL
    GROUP BY store_id, user_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS store_carts_store_user_uidx
      ON public.store_carts(store_id, user_id)
      WHERE store_id IS NOT NULL
        AND user_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.store_carts
    WHERE store_id IS NOT NULL
      AND session_token IS NOT NULL
    GROUP BY store_id, session_token
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS store_carts_store_session_uidx
      ON public.store_carts(store_id, session_token)
      WHERE store_id IS NOT NULL
        AND session_token IS NOT NULL;
  END IF;
END $$;
