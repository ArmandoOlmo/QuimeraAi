-- ============================================================================
-- Canonical Chatbot Engine Event Log
-- ============================================================================
-- Project-scoped audit trail for ChatCore/Chatbot Engine actions across public
-- surfaces. Public writes flow through the widget API service role; dashboard
-- reads are restricted to authenticated project members.

CREATE TABLE IF NOT EXISTS public.chatbot_engine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.social_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.social_messages(id) ON DELETE SET NULL,
  lead_id TEXT,
  appointment_id UUID REFERENCES public.project_appointments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  action_type TEXT,
  action_status TEXT NOT NULL DEFAULT 'observed',
  source_surface TEXT,
  source_module TEXT NOT NULL DEFAULT 'chatbot-engine',
  idempotency_key TEXT,
  correlation_id TEXT,
  request_fingerprint TEXT,
  actor_type TEXT NOT NULL DEFAULT 'visitor',
  actor_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chatbot_engine_events_action_status_check CHECK (
    action_status IN ('allowed', 'blocked', 'executed', 'observed', 'failed', 'duplicate')
  ),
  CONSTRAINT chatbot_engine_events_actor_type_check CHECK (
    actor_type IN ('visitor', 'project_user', 'system', 'anonymous')
  ),
  CONSTRAINT chatbot_engine_events_metadata_object_check CHECK (
    jsonb_typeof(metadata) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS chatbot_engine_events_project_created_idx
  ON public.chatbot_engine_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chatbot_engine_events_project_action_created_idx
  ON public.chatbot_engine_events(project_id, action_type, created_at DESC)
  WHERE action_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS chatbot_engine_events_project_status_created_idx
  ON public.chatbot_engine_events(project_id, action_status, created_at DESC);

CREATE INDEX IF NOT EXISTS chatbot_engine_events_conversation_idx
  ON public.chatbot_engine_events(conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chatbot_engine_events_lead_idx
  ON public.chatbot_engine_events(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chatbot_engine_events_appointment_idx
  ON public.chatbot_engine_events(appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chatbot_engine_events_correlation_idx
  ON public.chatbot_engine_events(correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chatbot_engine_events_project_event_idempotency_uidx
  ON public.chatbot_engine_events(project_id, event_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_project_chatbot_engine_member(target_project_id UUID)
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

ALTER TABLE public.chatbot_engine_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can read chatbot engine events" ON public.chatbot_engine_events;
CREATE POLICY "Project members can read chatbot engine events"
  ON public.chatbot_engine_events
  FOR SELECT
  TO authenticated
  USING (public.is_project_chatbot_engine_member(project_id));

DROP POLICY IF EXISTS "Project members can insert chatbot engine events" ON public.chatbot_engine_events;
CREATE POLICY "Project members can insert chatbot engine events"
  ON public.chatbot_engine_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_chatbot_engine_member(project_id));

GRANT EXECUTE ON FUNCTION public.is_project_chatbot_engine_member(UUID) TO authenticated;
GRANT SELECT, INSERT ON public.chatbot_engine_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_engine_events TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'chatbot_engine_events'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_engine_events;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
