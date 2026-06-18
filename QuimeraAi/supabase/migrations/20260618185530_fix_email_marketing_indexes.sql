-- Resolve Supabase performance advisor findings for email marketing tables.

DROP INDEX IF EXISTS public.email_settings_store_id_uidx;

CREATE INDEX IF NOT EXISTS email_campaigns_created_by_idx
  ON public.email_campaigns(created_by);

CREATE INDEX IF NOT EXISTS email_audiences_created_by_idx
  ON public.email_audiences(created_by);

CREATE INDEX IF NOT EXISTS email_automations_created_by_idx
  ON public.email_automations(created_by);
