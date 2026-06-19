-- Add checkout idempotency and Stripe webhook event logging for Ecommerce V2.
-- This migration is additive only: no data rewrites, no destructive schema changes.

CREATE TABLE IF NOT EXISTS public.store_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'stripe',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payment_intent_id TEXT,
  checkout_session_id TEXT,
  order_id TEXT,
  store_id TEXT,
  project_id UUID,
  status TEXT NOT NULL DEFAULT 'received',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe';
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'received';
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.store_payment_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.store_payment_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS store_payment_events_payment_intent_idx
  ON public.store_payment_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS store_payment_events_checkout_session_idx
  ON public.store_payment_events(checkout_session_id);
CREATE INDEX IF NOT EXISTS store_payment_events_order_id_idx
  ON public.store_payment_events(order_id);
CREATE INDEX IF NOT EXISTS store_payment_events_event_type_idx
  ON public.store_payment_events(event_type);
CREATE INDEX IF NOT EXISTS store_payment_events_created_at_idx
  ON public.store_payment_events(created_at);
CREATE INDEX IF NOT EXISTS store_payment_events_project_id_idx
  ON public.store_payment_events(project_id);
CREATE INDEX IF NOT EXISTS store_payment_events_store_id_idx
  ON public.store_payment_events(store_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.store_payment_events
    WHERE provider IS NOT NULL
      AND event_id IS NOT NULL
    GROUP BY provider, event_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS store_payment_events_provider_event_id_uidx
      ON public.store_payment_events(provider, event_id)
      WHERE event_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping store_payment_events_provider_event_id_uidx because duplicate events exist.';
  END IF;
END $$;

ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS cart_hash TEXT;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS pricing JSONB;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe JSONB;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS store_orders_checkout_idempotency_idx
  ON public.store_orders(checkout_idempotency_key);
CREATE INDEX IF NOT EXISTS store_orders_cart_hash_idx
  ON public.store_orders(cart_hash);
CREATE INDEX IF NOT EXISTS store_orders_status_payment_status_idx
  ON public.store_orders(status, payment_status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.store_orders
    WHERE checkout_idempotency_key IS NOT NULL
    GROUP BY checkout_idempotency_key
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS store_orders_checkout_idempotency_key_uidx
      ON public.store_orders(checkout_idempotency_key)
      WHERE checkout_idempotency_key IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping store_orders_checkout_idempotency_key_uidx because duplicate checkout keys exist.';
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
  ELSE
    RAISE NOTICE 'Skipping store_orders_stripe_payment_intent_uidx because duplicate payment intents exist.';
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
  ELSE
    RAISE NOTICE 'Skipping store_orders_stripe_checkout_session_uidx because duplicate checkout sessions exist.';
  END IF;
END $$;
