-- D2 Ecommerce transactional email event contract.
-- Additive only: keeps the existing Email Marketing email_logs table canonical.

ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE public.email_logs
SET
  event_type = COALESCE(event_type, metadata->>'eventType'),
  template_type = COALESCE(template_type, template_id),
  idempotency_key = COALESCE(idempotency_key, metadata->>'idempotencyKey')
WHERE type = 'transactional';

CREATE INDEX IF NOT EXISTS email_logs_event_type_idx
  ON public.email_logs(event_type);

CREATE INDEX IF NOT EXISTS email_logs_template_type_idx
  ON public.email_logs(template_type);

CREATE UNIQUE INDEX IF NOT EXISTS email_logs_transactional_idempotency_uidx
  ON public.email_logs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
