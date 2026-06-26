-- Canonical Chatbot Engine -> Finance draft requests.
-- ChatCore can create quote/invoice drafts for review, but it must not create
-- Stripe payments, PaymentIntents, Checkout Sessions, payouts, or ledger entries.

ALTER TABLE public.accounting_invoices
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT 'Due on receipt',
  ADD COLUMN IF NOT EXISTS reminder_note TEXT,
  ADD COLUMN IF NOT EXISTS ai_optimized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_optimized_terms TEXT,
  ADD COLUMN IF NOT EXISTS ai_optimized_reminder TEXT,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_component TEXT,
  ADD COLUMN IF NOT EXISTS source_event TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.accounting_invoices
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounting_invoices_metadata_object_check'
      AND conrelid = 'public.accounting_invoices'::regclass
  ) THEN
    ALTER TABLE public.accounting_invoices
      ADD CONSTRAINT accounting_invoices_metadata_object_check
      CHECK (
        jsonb_typeof(COALESCE(metadata, '{}'::jsonb)) = 'object'
        AND octet_length(COALESCE(metadata, '{}'::jsonb)::text) <= 8192
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS accounting_invoices_project_status_idx
  ON public.accounting_invoices(project_id, status, issue_date DESC);

CREATE INDEX IF NOT EXISTS accounting_invoices_source_entity_idx
  ON public.accounting_invoices(project_id, source_module, source_entity_type, source_entity_id)
  WHERE source_module IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS accounting_invoices_project_idempotency_uidx
  ON public.accounting_invoices(project_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
