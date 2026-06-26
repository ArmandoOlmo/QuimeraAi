-- Canonical Email Marketing Engine foundation.
-- Additive only: preserve the existing Email Hub tables while adding the
-- runtime metadata, suppression, event, and outbox primitives needed for
-- project-scoped safe sends.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.email_settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_status TEXT NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS sending_domain TEXT,
  ADD COLUMN IF NOT EXISTS domain_status TEXT NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS dkim_status TEXT NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS spf_status TEXT NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS dmarc_status TEXT NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS compliance JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tracking JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS webhook_configured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_component TEXT,
  ADD COLUMN IF NOT EXISTS source_event TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_component TEXT,
  ADD COLUMN IF NOT EXISTS source_event TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_modified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS safe_to_edit BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS send_mode TEXT NOT NULL DEFAULT 'manual_send',
  ADD COLUMN IF NOT EXISTS readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.email_audiences
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_component TEXT,
  ADD COLUMN IF NOT EXISTS source_event TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_modified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS safe_to_edit BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.email_automations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_component TEXT,
  ADD COLUMN IF NOT EXISTS source_event TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_modified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS safe_to_edit BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS automation_id TEXT,
  ADD COLUMN IF NOT EXISTS automation_step_id TEXT,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_component TEXT,
  ADD COLUMN IF NOT EXISTS source_event TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS email_kind TEXT NOT NULL DEFAULT 'marketing',
  ADD COLUMN IF NOT EXISTS suppression_checked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skipped_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual',
  suppression_scope TEXT NOT NULL DEFAULT 'marketing',
  source TEXT,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  provider_message_id TEXT,
  source_module TEXT,
  source_event TEXT,
  source_entity_type TEXT,
  source_entity_id TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.email_automations(id) ON DELETE SET NULL,
  automation_step_id TEXT,
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  email_kind TEXT NOT NULL DEFAULT 'marketing',
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  text_content TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  error_message TEXT,
  skipped_reason TEXT,
  source_module TEXT,
  source_component TEXT,
  source_event TEXT,
  source_entity_type TEXT,
  source_entity_id TEXT,
  correlation_id TEXT,
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  automation_id UUID REFERENCES public.email_automations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_event_id TEXT,
  provider_message_id TEXT,
  event_type TEXT NOT NULL,
  recipient_email TEXT,
  source_module TEXT,
  source_event TEXT,
  source_entity_type TEXT,
  source_entity_id TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS skipped_reason TEXT;

UPDATE public.email_settings es
SET tenant_id = COALESCE(es.tenant_id, p.tenant_id)
FROM public.projects p
WHERE p.id = COALESCE(es.project_id, es.store_id)
  AND es.tenant_id IS NULL;

UPDATE public.email_campaigns ec
SET tenant_id = COALESCE(ec.tenant_id, p.tenant_id)
FROM public.projects p
WHERE p.id = COALESCE(ec.project_id, ec.store_id)
  AND ec.tenant_id IS NULL;

UPDATE public.email_audiences ea
SET tenant_id = COALESCE(ea.tenant_id, p.tenant_id)
FROM public.projects p
WHERE p.id = COALESCE(ea.project_id, ea.store_id)
  AND ea.tenant_id IS NULL;

UPDATE public.email_automations ea
SET tenant_id = COALESCE(ea.tenant_id, p.tenant_id)
FROM public.projects p
WHERE p.id = COALESCE(ea.project_id, ea.store_id)
  AND ea.tenant_id IS NULL;

UPDATE public.email_logs el
SET tenant_id = COALESCE(el.tenant_id, p.tenant_id),
    idempotency_key = COALESCE(el.idempotency_key, el.metadata->>'idempotencyKey')
FROM public.projects p
WHERE p.id = COALESCE(el.project_id, el.store_id)
  AND (el.tenant_id IS NULL OR el.idempotency_key IS NULL);

CREATE INDEX IF NOT EXISTS email_settings_tenant_id_idx ON public.email_settings(tenant_id);
CREATE INDEX IF NOT EXISTS email_campaigns_tenant_id_idx ON public.email_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS email_campaigns_source_idx ON public.email_campaigns(source_module, source_event);
CREATE INDEX IF NOT EXISTS email_campaigns_idempotency_idx ON public.email_campaigns(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_audiences_tenant_id_idx ON public.email_audiences(tenant_id);
CREATE INDEX IF NOT EXISTS email_audiences_source_idx ON public.email_audiences(source_module, source_event);
CREATE INDEX IF NOT EXISTS email_automations_tenant_id_idx ON public.email_automations(tenant_id);
CREATE INDEX IF NOT EXISTS email_automations_trigger_idx ON public.email_automations(project_id, source_event, status);
CREATE INDEX IF NOT EXISTS email_logs_tenant_id_idx ON public.email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS email_logs_idempotency_idx ON public.email_logs(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_logs_provider_message_idx ON public.email_logs(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS email_logs_source_idx ON public.email_logs(source_module, source_event, source_entity_id);

CREATE INDEX IF NOT EXISTS email_suppressions_project_idx ON public.email_suppressions(project_id);
CREATE INDEX IF NOT EXISTS email_suppressions_tenant_idx ON public.email_suppressions(tenant_id);
CREATE INDEX IF NOT EXISTS email_suppressions_email_idx ON public.email_suppressions(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_project_email_scope_uidx
  ON public.email_suppressions(project_id, lower(email), suppression_scope)
  WHERE active;

CREATE INDEX IF NOT EXISTS email_outbox_project_status_idx ON public.email_outbox(project_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS email_outbox_campaign_idx ON public.email_outbox(campaign_id);
CREATE INDEX IF NOT EXISTS email_outbox_recipient_idx ON public.email_outbox(lower(recipient_email));
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_project_idempotency_uidx
  ON public.email_outbox(project_id, idempotency_key);

CREATE INDEX IF NOT EXISTS email_events_project_idx ON public.email_events(project_id);
CREATE INDEX IF NOT EXISTS email_events_log_idx ON public.email_events(email_log_id);
CREATE INDEX IF NOT EXISTS email_events_provider_message_idx ON public.email_events(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS email_events_provider_event_uidx
  ON public.email_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS email_events_idempotency_uidx
  ON public.email_events(project_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DROP TRIGGER IF EXISTS set_email_suppressions_updated_at ON public.email_suppressions;
CREATE TRIGGER set_email_suppressions_updated_at
  BEFORE UPDATE ON public.email_suppressions
  FOR EACH ROW EXECUTE FUNCTION public.set_email_updated_at();

DROP TRIGGER IF EXISTS set_email_outbox_updated_at ON public.email_outbox;
CREATE TRIGGER set_email_outbox_updated_at
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_email_updated_at();

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can manage email suppressions" ON public.email_suppressions;
CREATE POLICY "Project members can manage email suppressions"
  ON public.email_suppressions
  FOR ALL
  TO authenticated
  USING (public.is_project_owner_or_tenant(project_id))
  WITH CHECK (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Project members can view email outbox" ON public.email_outbox;
CREATE POLICY "Project members can view email outbox"
  ON public.email_outbox
  FOR SELECT
  TO authenticated
  USING (public.is_project_owner_or_tenant(project_id));

DROP POLICY IF EXISTS "Project members can view email events" ON public.email_events;
CREATE POLICY "Project members can view email events"
  ON public.email_events
  FOR SELECT
  TO authenticated
  USING (project_id IS NOT NULL AND public.is_project_owner_or_tenant(project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO authenticated;
GRANT SELECT ON public.email_outbox TO authenticated;
GRANT SELECT ON public.email_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_outbox TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_events TO service_role;
