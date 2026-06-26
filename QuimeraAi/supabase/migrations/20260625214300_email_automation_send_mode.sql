ALTER TABLE public.email_automations
  ADD COLUMN IF NOT EXISTS send_mode TEXT NOT NULL DEFAULT 'manual_send';

CREATE INDEX IF NOT EXISTS email_automations_send_mode_idx
  ON public.email_automations(project_id, send_mode, status);
