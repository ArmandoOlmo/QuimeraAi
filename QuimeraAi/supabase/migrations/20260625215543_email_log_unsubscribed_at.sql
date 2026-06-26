ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS email_logs_unsubscribed_at_idx
  ON public.email_logs(unsubscribed_at DESC)
  WHERE unsubscribed_at IS NOT NULL;
