-- ============================================================================
-- Canonical Appointments Engine foundation
-- ============================================================================
-- Additive only: keep project_appointments as the source of truth and introduce
-- canonical blocked times plus metadata required by dashboard, public booking,
-- ChatCore, CRM, Email, Analytics, Ecommerce, and Google Calendar flows.

ALTER TABLE public.project_appointments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'dashboard',
  ADD COLUMN IF NOT EXISTS source_component TEXT,
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS source_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS public_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS created_by_system BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS booking_service_id TEXT,
  ADD COLUMN IF NOT EXISTS ecommerce_product_id TEXT,
  ADD COLUMN IF NOT EXISTS ecommerce_order_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.lead_activities
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.lead_tasks
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.project_appointment_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  color TEXT,
  recurrence JSONB,
  source TEXT NOT NULL DEFAULT 'dashboard',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_appointment_blocks_valid_range CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS public.project_google_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_calendar',
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  calendar_name TEXT,
  google_account_email TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional',
  conflict_policy TEXT NOT NULL DEFAULT 'quimera_wins_owned_google_wins_external',
  oauth_tokens_encrypted JSONB NOT NULL DEFAULT '{}'::jsonb,
  oauth_token_expires_at TIMESTAMPTZ,
  oauth_scope TEXT,
  sync_token TEXT,
  sync_token_updated_at TIMESTAMPTZ,
  last_full_sync_at TIMESTAMPTZ,
  last_incremental_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_error TEXT,
  watch_channel_id TEXT,
  watch_resource_id TEXT,
  watch_resource_uri TEXT,
  watch_token_hash TEXT,
  watch_expires_at TIMESTAMPTZ,
  watch_address TEXT,
  webhook_pending_sync BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_last_state TEXT,
  webhook_last_message_number TEXT,
  webhook_last_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_google_calendar_integrations_provider_check CHECK (provider = 'google_calendar'),
  CONSTRAINT project_google_calendar_integrations_status_check CHECK (status IN ('connected', 'disconnected', 'error')),
  CONSTRAINT project_google_calendar_integrations_direction_check CHECK (sync_direction IN ('bidirectional', 'quimera_to_google', 'google_to_quimera'))
);

CREATE INDEX IF NOT EXISTS project_appointments_project_start_idx
  ON public.project_appointments(project_id, start_date);

CREATE INDEX IF NOT EXISTS project_appointments_project_source_idx
  ON public.project_appointments(project_id, source);

CREATE INDEX IF NOT EXISTS project_appointments_source_lead_idx
  ON public.project_appointments(source_lead_id)
  WHERE source_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS project_appointments_correlation_idx
  ON public.project_appointments(correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_appointments_project_idempotency_uidx
  ON public.project_appointments(project_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS project_appointment_blocks_project_start_idx
  ON public.project_appointment_blocks(project_id, start_date);

CREATE INDEX IF NOT EXISTS project_appointment_blocks_project_range_idx
  ON public.project_appointment_blocks(project_id, start_date, end_date);

CREATE UNIQUE INDEX IF NOT EXISTS project_appointment_blocks_legacy_source_uidx
  ON public.project_appointment_blocks(project_id, ((metadata->>'legacy_source')))
  WHERE metadata ? 'legacy_source';

CREATE UNIQUE INDEX IF NOT EXISTS project_google_calendar_integrations_project_calendar_uidx
  ON public.project_google_calendar_integrations(project_id, provider, calendar_id);

CREATE INDEX IF NOT EXISTS project_google_calendar_integrations_watch_channel_idx
  ON public.project_google_calendar_integrations(watch_channel_id)
  WHERE watch_channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS project_google_calendar_integrations_pending_idx
  ON public.project_google_calendar_integrations(webhook_pending_sync, watch_expires_at)
  WHERE status = 'connected' AND sync_enabled = TRUE;

CREATE OR REPLACE FUNCTION public.is_project_appointments_member(target_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = target_project_id
      AND (
        p.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.tenant_members tm
          WHERE tm.tenant_id = p.tenant_id
            AND tm.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

ALTER TABLE public.project_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_appointment_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_google_calendar_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read project appointments" ON public.project_appointments;
DROP POLICY IF EXISTS "Users can manage project appointments" ON public.project_appointments;

DROP POLICY IF EXISTS "Project members can read canonical appointments" ON public.project_appointments;
CREATE POLICY "Project members can read canonical appointments"
  ON public.project_appointments
  FOR SELECT
  TO authenticated
  USING (
    public.is_project_appointments_member(project_id)
    OR organizer_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Project members can insert canonical appointments" ON public.project_appointments;
CREATE POLICY "Project members can insert canonical appointments"
  ON public.project_appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_project_appointments_member(project_id)
    OR organizer_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Project members can update canonical appointments" ON public.project_appointments;
CREATE POLICY "Project members can update canonical appointments"
  ON public.project_appointments
  FOR UPDATE
  TO authenticated
  USING (
    public.is_project_appointments_member(project_id)
    OR organizer_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_project_appointments_member(project_id)
    OR organizer_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Project members can delete canonical appointments" ON public.project_appointments;
CREATE POLICY "Project members can delete canonical appointments"
  ON public.project_appointments
  FOR DELETE
  TO authenticated
  USING (
    public.is_project_appointments_member(project_id)
    OR organizer_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Project members can read appointment blocks" ON public.project_appointment_blocks;
CREATE POLICY "Project members can read appointment blocks"
  ON public.project_appointment_blocks
  FOR SELECT
  TO authenticated
  USING (public.is_project_appointments_member(project_id));

DROP POLICY IF EXISTS "Project members can insert appointment blocks" ON public.project_appointment_blocks;
CREATE POLICY "Project members can insert appointment blocks"
  ON public.project_appointment_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_appointments_member(project_id));

DROP POLICY IF EXISTS "Project members can update appointment blocks" ON public.project_appointment_blocks;
CREATE POLICY "Project members can update appointment blocks"
  ON public.project_appointment_blocks
  FOR UPDATE
  TO authenticated
  USING (public.is_project_appointments_member(project_id))
  WITH CHECK (public.is_project_appointments_member(project_id));

DROP POLICY IF EXISTS "Project members can delete appointment blocks" ON public.project_appointment_blocks;
CREATE POLICY "Project members can delete appointment blocks"
  ON public.project_appointment_blocks
  FOR DELETE
  TO authenticated
  USING (public.is_project_appointments_member(project_id));

DROP POLICY IF EXISTS "Project members can insert appointment email logs" ON public.email_logs;
CREATE POLICY "Project members can insert appointment email logs"
  ON public.email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_project_appointments_member(COALESCE(project_id, store_id))
    AND metadata->>'triggeredBy' = 'appointments-engine'
    AND metadata->>'sourceModule' = 'appointments'
  );

DROP POLICY IF EXISTS "Project members can insert appointment deposit orders" ON public.store_orders;
CREATE POLICY "Project members can insert appointment deposit orders"
  ON public.store_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_project_appointments_member(project_id)
    AND COALESCE(metadata, data)->>'triggeredBy' = 'appointments-engine'
    AND COALESCE(metadata, data)->>'sourceModule' = 'appointments'
  );

GRANT EXECUTE ON FUNCTION public.is_project_appointments_member(UUID) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_appointment_blocks TO authenticated;
GRANT INSERT ON public.email_logs TO authenticated;
GRANT INSERT ON public.store_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_appointments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_appointment_blocks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_google_calendar_integrations TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_appointment_blocks;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
