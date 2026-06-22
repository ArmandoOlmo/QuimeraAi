-- Inventory reservation foundation for Ecommerce V2.
-- Reservations prevent oversell between checkout intent creation and payment success.

CREATE TABLE IF NOT EXISTS public.store_inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  store_id TEXT,
  public_store_id TEXT,
  order_id TEXT,
  checkout_idempotency_key TEXT,
  payment_intent_id TEXT,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'committed', 'released', 'expired', 'cancelled')
  ),
  expires_at TIMESTAMPTZ NOT NULL,
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  store_id TEXT,
  public_store_id TEXT,
  reservation_id UUID REFERENCES public.store_inventory_reservations(id) ON DELETE SET NULL,
  order_id TEXT,
  checkout_idempotency_key TEXT,
  payment_intent_id TEXT,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  type TEXT NOT NULL CHECK (
    type IN ('reserve', 'release', 'commit', 'restock', 'adjust', 'refund', 'cancel', 'expire')
  ),
  quantity_delta INTEGER NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  idempotency_key TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_inventory_reservations_idempotency_uidx
  ON public.store_inventory_reservations(idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS store_inventory_movements_idempotency_uidx
  ON public.store_inventory_movements(idempotency_key);

CREATE INDEX IF NOT EXISTS store_inventory_reservations_product_active_idx
  ON public.store_inventory_reservations(project_id, product_id, COALESCE(variant_id, ''), status, expires_at);

CREATE INDEX IF NOT EXISTS store_inventory_reservations_checkout_idx
  ON public.store_inventory_reservations(checkout_idempotency_key);

CREATE INDEX IF NOT EXISTS store_inventory_reservations_order_idx
  ON public.store_inventory_reservations(order_id);

CREATE INDEX IF NOT EXISTS store_inventory_reservations_payment_intent_idx
  ON public.store_inventory_reservations(payment_intent_id);

CREATE INDEX IF NOT EXISTS store_inventory_movements_product_idx
  ON public.store_inventory_movements(project_id, product_id, COALESCE(variant_id, ''), created_at DESC);

CREATE INDEX IF NOT EXISTS store_inventory_movements_order_idx
  ON public.store_inventory_movements(order_id);

ALTER TABLE public.store_inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view inventory reservations" ON public.store_inventory_reservations;
CREATE POLICY "Project members can view inventory reservations"
ON public.store_inventory_reservations
FOR SELECT
TO authenticated
USING (
  project_id IS NOT NULL
  AND is_project_owner_or_tenant(project_id)
);

DROP POLICY IF EXISTS "Project members can view inventory movements" ON public.store_inventory_movements;
CREATE POLICY "Project members can view inventory movements"
ON public.store_inventory_movements
FOR SELECT
TO authenticated
USING (
  project_id IS NOT NULL
  AND is_project_owner_or_tenant(project_id)
);

REVOKE ALL ON TABLE public.store_inventory_reservations FROM anon;
REVOKE ALL ON TABLE public.store_inventory_movements FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_inventory_reservations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_inventory_movements FROM authenticated;
GRANT SELECT ON TABLE public.store_inventory_reservations TO authenticated;
GRANT SELECT ON TABLE public.store_inventory_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_inventory_reservations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_inventory_movements TO service_role;

DROP TRIGGER IF EXISTS update_store_inventory_reservations_updated_at ON public.store_inventory_reservations;
CREATE TRIGGER update_store_inventory_reservations_updated_at
BEFORE UPDATE ON public.store_inventory_reservations
FOR EACH ROW EXECUTE FUNCTION update_properties_updated_at_column();

CREATE OR REPLACE FUNCTION public.reserve_store_inventory_line(
  p_project_id UUID,
  p_store_id TEXT,
  p_public_store_id TEXT,
  p_order_id TEXT,
  p_checkout_idempotency_key TEXT,
  p_payment_intent_id TEXT,
  p_product_id TEXT,
  p_variant_id TEXT,
  p_quantity INTEGER,
  p_expires_at TIMESTAMPTZ,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_product public.store_products%ROWTYPE;
  v_existing public.store_inventory_reservations%ROWTYPE;
  v_reservation public.store_inventory_reservations%ROWTYPE;
  v_data JSONB;
  v_variants JSONB;
  v_variant JSONB;
  v_status TEXT;
  v_track_inventory BOOLEAN;
  v_on_hand INTEGER := 0;
  v_active_reserved INTEGER := 0;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Inventory reservation quantity must be greater than zero';
  END IF;

  IF p_checkout_idempotency_key IS NULL OR p_checkout_idempotency_key = '' THEN
    RAISE EXCEPTION 'checkout idempotency key is required for inventory reservation';
  END IF;

  SELECT *
  INTO v_product
  FROM public.store_products
  WHERE id::text = p_product_id
    AND (p_project_id IS NULL OR project_id = p_project_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found for inventory reservation', p_product_id;
  END IF;

  v_data := COALESCE(v_product.data, '{}'::jsonb);
  v_status := COALESCE(v_product.status, v_data->>'status', 'draft');
  v_track_inventory := COALESCE(
    v_product.track_inventory,
    NULLIF(v_data->>'trackInventory', '')::boolean,
    NULLIF(v_data->>'track_inventory', '')::boolean,
    true
  );

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Product % is not available for purchase', p_product_id;
  END IF;

  IF v_track_inventory IS FALSE THEN
    RETURN NULL;
  END IF;

  IF p_variant_id IS NOT NULL AND p_variant_id <> '' THEN
    v_variants := COALESCE(v_product.variants, v_data->'variants', '[]'::jsonb);

    SELECT variant
    INTO v_variant
    FROM jsonb_array_elements(v_variants) AS variant
    WHERE variant->>'id' = p_variant_id
    LIMIT 1;

    IF v_variant IS NULL THEN
      RAISE EXCEPTION 'Variant % not found for product %', p_variant_id, p_product_id;
    END IF;

    v_on_hand := GREATEST(0, COALESCE(NULLIF(v_variant->>'quantity', '')::integer, 0));
  ELSE
    v_on_hand := GREATEST(
      0,
      COALESCE(
        v_product.quantity,
        v_product.inventory_quantity,
        NULLIF(v_data->>'quantity', '')::integer,
        NULLIF(v_data->>'inventoryQuantity', '')::integer,
        NULLIF(v_data->>'inventory_quantity', '')::integer,
        0
      )
    );
  END IF;

  SELECT *
  INTO v_existing
  FROM public.store_inventory_reservations
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  SELECT COALESCE(SUM(quantity), 0)::integer
  INTO v_active_reserved
  FROM public.store_inventory_reservations
  WHERE product_id = p_product_id
    AND COALESCE(variant_id, '') = COALESCE(p_variant_id, '')
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND status = 'active'
    AND expires_at > now()
    AND idempotency_key <> p_idempotency_key;

  IF v_on_hand - v_active_reserved < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.store_inventory_reservations
    SET
      project_id = COALESCE(p_project_id, project_id),
      store_id = COALESCE(p_store_id, store_id),
      public_store_id = COALESCE(p_public_store_id, public_store_id),
      order_id = COALESCE(p_order_id, order_id),
      checkout_idempotency_key = COALESCE(p_checkout_idempotency_key, checkout_idempotency_key),
      payment_intent_id = COALESCE(p_payment_intent_id, payment_intent_id),
      product_id = p_product_id,
      variant_id = NULLIF(p_variant_id, ''),
      quantity = p_quantity,
      status = CASE WHEN status = 'committed' THEN status ELSE 'active' END,
      expires_at = CASE WHEN status = 'committed' THEN expires_at ELSE p_expires_at END,
      released_at = CASE WHEN status = 'committed' THEN released_at ELSE NULL END,
      expired_at = CASE WHEN status = 'committed' THEN expired_at ELSE NULL END,
      cancelled_at = CASE WHEN status = 'committed' THEN cancelled_at ELSE NULL END,
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
      updated_at = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_reservation;
  ELSE
    INSERT INTO public.store_inventory_reservations (
      project_id,
      store_id,
      public_store_id,
      order_id,
      checkout_idempotency_key,
      payment_intent_id,
      product_id,
      variant_id,
      quantity,
      status,
      expires_at,
      idempotency_key,
      metadata
    )
    VALUES (
      p_project_id,
      p_store_id,
      p_public_store_id,
      p_order_id,
      p_checkout_idempotency_key,
      p_payment_intent_id,
      p_product_id,
      NULLIF(p_variant_id, ''),
      p_quantity,
      'active',
      p_expires_at,
      p_idempotency_key,
      COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING * INTO v_reservation;
  END IF;

  INSERT INTO public.store_inventory_movements (
    project_id,
    store_id,
    public_store_id,
    reservation_id,
    order_id,
    checkout_idempotency_key,
    payment_intent_id,
    product_id,
    variant_id,
    type,
    quantity_delta,
    quantity_before,
    quantity_after,
    idempotency_key,
    reason,
    metadata
  )
  VALUES (
    v_reservation.project_id,
    v_reservation.store_id,
    v_reservation.public_store_id,
    v_reservation.id,
    v_reservation.order_id,
    v_reservation.checkout_idempotency_key,
    v_reservation.payment_intent_id,
    v_reservation.product_id,
    v_reservation.variant_id,
    'reserve',
    -v_reservation.quantity,
    v_on_hand,
    v_on_hand,
    'inventory:movement:reserve:' || v_reservation.idempotency_key,
    'checkout_reservation',
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN to_jsonb(v_reservation);
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_store_inventory_reservation(
  p_reservation_id UUID,
  p_order_id TEXT DEFAULT NULL,
  p_payment_intent_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_committed_at TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_reservation public.store_inventory_reservations%ROWTYPE;
  v_product public.store_products%ROWTYPE;
  v_data JSONB;
  v_variants JSONB;
  v_next_variants JSONB;
  v_on_hand INTEGER := 0;
  v_next_on_hand INTEGER := 0;
  v_movement_key TEXT;
BEGIN
  SELECT *
  INTO v_reservation
  FROM public.store_inventory_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory reservation % not found', p_reservation_id;
  END IF;

  IF v_reservation.status = 'committed' THEN
    RETURN to_jsonb(v_reservation);
  END IF;

  IF v_reservation.status <> 'active' THEN
    RETURN to_jsonb(v_reservation);
  END IF;

  SELECT *
  INTO v_product
  FROM public.store_products
  WHERE id::text = v_reservation.product_id
    AND (v_reservation.project_id IS NULL OR project_id = v_reservation.project_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found for inventory commit', v_reservation.product_id;
  END IF;

  v_data := COALESCE(v_product.data, '{}'::jsonb);

  IF v_reservation.variant_id IS NOT NULL AND v_reservation.variant_id <> '' THEN
    v_variants := COALESCE(v_product.variants, v_data->'variants', '[]'::jsonb);

    SELECT GREATEST(0, COALESCE(NULLIF(variant->>'quantity', '')::integer, 0))
    INTO v_on_hand
    FROM jsonb_array_elements(v_variants) AS variant
    WHERE variant->>'id' = v_reservation.variant_id
    LIMIT 1;

    v_on_hand := COALESCE(v_on_hand, 0);
    v_next_on_hand := GREATEST(0, v_on_hand - v_reservation.quantity);

    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN variant->>'id' = v_reservation.variant_id
            THEN jsonb_set(variant, '{quantity}', to_jsonb(v_next_on_hand), true)
          ELSE variant
        END
      ),
      '[]'::jsonb
    )
    INTO v_next_variants
    FROM jsonb_array_elements(v_variants) AS variant;

    UPDATE public.store_products
    SET
      variants = v_next_variants,
      data = jsonb_set(v_data, '{variants}', v_next_variants, true),
      updated_at = p_committed_at
    WHERE id = v_product.id;
  ELSE
    v_on_hand := GREATEST(
      0,
      COALESCE(
        v_product.quantity,
        v_product.inventory_quantity,
        NULLIF(v_data->>'quantity', '')::integer,
        NULLIF(v_data->>'inventoryQuantity', '')::integer,
        NULLIF(v_data->>'inventory_quantity', '')::integer,
        0
      )
    );
    v_next_on_hand := GREATEST(0, v_on_hand - v_reservation.quantity);

    UPDATE public.store_products
    SET
      quantity = v_next_on_hand,
      inventory_quantity = v_next_on_hand,
      data = jsonb_set(
        jsonb_set(v_data, '{quantity}', to_jsonb(v_next_on_hand), true),
        '{inventoryQuantity}',
        to_jsonb(v_next_on_hand),
        true
      ),
      updated_at = p_committed_at
    WHERE id = v_product.id;
  END IF;

  UPDATE public.store_inventory_reservations
  SET
    status = 'committed',
    order_id = COALESCE(p_order_id, order_id),
    payment_intent_id = COALESCE(p_payment_intent_id, payment_intent_id),
    committed_at = p_committed_at,
    updated_at = p_committed_at
  WHERE id = v_reservation.id
  RETURNING * INTO v_reservation;

  v_movement_key := COALESCE(
    NULLIF(p_idempotency_key, ''),
    'inventory:movement:commit:' || v_reservation.id::text || ':' || COALESCE(p_payment_intent_id, p_order_id, 'checkout')
  );

  INSERT INTO public.store_inventory_movements (
    project_id,
    store_id,
    public_store_id,
    reservation_id,
    order_id,
    checkout_idempotency_key,
    payment_intent_id,
    product_id,
    variant_id,
    type,
    quantity_delta,
    quantity_before,
    quantity_after,
    idempotency_key,
    reason,
    metadata,
    created_at
  )
  VALUES (
    v_reservation.project_id,
    v_reservation.store_id,
    v_reservation.public_store_id,
    v_reservation.id,
    v_reservation.order_id,
    v_reservation.checkout_idempotency_key,
    v_reservation.payment_intent_id,
    v_reservation.product_id,
    v_reservation.variant_id,
    'commit',
    -v_reservation.quantity,
    v_on_hand,
    v_next_on_hand,
    v_movement_key,
    'payment_success',
    '{}'::jsonb,
    p_committed_at
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN to_jsonb(v_reservation);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_store_inventory_reservation(
  p_reservation_id UUID,
  p_status TEXT DEFAULT 'released',
  p_reason TEXT DEFAULT 'checkout_released',
  p_released_at TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_reservation public.store_inventory_reservations%ROWTYPE;
  v_next_status TEXT;
  v_movement_type TEXT;
  v_movement_key TEXT;
BEGIN
  v_next_status := COALESCE(NULLIF(p_status, ''), 'released');

  IF v_next_status NOT IN ('released', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid reservation release status %', v_next_status;
  END IF;

  SELECT *
  INTO v_reservation
  FROM public.store_inventory_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory reservation % not found', p_reservation_id;
  END IF;

  IF v_reservation.status = 'committed' OR v_reservation.status <> 'active' THEN
    RETURN to_jsonb(v_reservation);
  END IF;

  UPDATE public.store_inventory_reservations
  SET
    status = v_next_status,
    released_at = CASE WHEN v_next_status = 'released' THEN p_released_at ELSE released_at END,
    expired_at = CASE WHEN v_next_status = 'expired' THEN p_released_at ELSE expired_at END,
    cancelled_at = CASE WHEN v_next_status = 'cancelled' THEN p_released_at ELSE cancelled_at END,
    updated_at = p_released_at
  WHERE id = v_reservation.id
  RETURNING * INTO v_reservation;

  v_movement_type := CASE
    WHEN v_next_status = 'expired' THEN 'expire'
    WHEN v_next_status = 'cancelled' THEN 'cancel'
    ELSE 'release'
  END;
  v_movement_key := 'inventory:movement:' || v_movement_type || ':' || v_reservation.id::text;

  INSERT INTO public.store_inventory_movements (
    project_id,
    store_id,
    public_store_id,
    reservation_id,
    order_id,
    checkout_idempotency_key,
    payment_intent_id,
    product_id,
    variant_id,
    type,
    quantity_delta,
    idempotency_key,
    reason,
    metadata,
    created_at
  )
  VALUES (
    v_reservation.project_id,
    v_reservation.store_id,
    v_reservation.public_store_id,
    v_reservation.id,
    v_reservation.order_id,
    v_reservation.checkout_idempotency_key,
    v_reservation.payment_intent_id,
    v_reservation.product_id,
    v_reservation.variant_id,
    v_movement_type,
    v_reservation.quantity,
    v_movement_key,
    p_reason,
    '{}'::jsonb,
    p_released_at
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN to_jsonb(v_reservation);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_store_inventory_reservations(
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_reservation_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_reservation_id IN
    SELECT id
    FROM public.store_inventory_reservations
    WHERE status = 'active'
      AND expires_at <= p_now
  LOOP
    PERFORM public.release_store_inventory_reservation(
      v_reservation_id,
      'expired',
      'reservation_ttl_expired',
      p_now
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_store_inventory_line(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TEXT, JSONB
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_store_inventory_reservation(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_store_inventory_reservation(
  UUID, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_store_inventory_reservations(TIMESTAMPTZ) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reserve_store_inventory_line(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TEXT, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_store_inventory_reservation(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_store_inventory_reservation(
  UUID, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_store_inventory_reservations(TIMESTAMPTZ) TO service_role;
