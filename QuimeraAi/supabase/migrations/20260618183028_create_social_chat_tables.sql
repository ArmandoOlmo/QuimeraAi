-- ============================================================================
-- Social chat persistence for AI Assistant inbox, analytics, and web widget
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.social_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('facebook', 'whatsapp', 'instagram', 'web')),
  participant_id TEXT NOT NULL,
  participant_name TEXT,
  participant_avatar TEXT,
  participant_email TEXT,
  participant_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending', 'escalated')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  notes TEXT,
  lead_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.social_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.social_conversations(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('facebook', 'whatsapp', 'instagram', 'web')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  sender_avatar TEXT,
  recipient_id TEXT,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'template')),
  media_url TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  response TEXT,
  response_timestamp TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  processed_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  ai_confidence NUMERIC,
  escalated_to_human BOOLEAN NOT NULL DEFAULT FALSE,
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_conversations_project_last_message
  ON public.social_conversations(project_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_conversations_project_channel_status
  ON public.social_conversations(project_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_social_conversations_participant
  ON public.social_conversations(project_id, channel, participant_id);
CREATE INDEX IF NOT EXISTS idx_social_conversations_lead_id
  ON public.social_conversations(lead_id);

CREATE INDEX IF NOT EXISTS idx_social_messages_conversation_timestamp
  ON public.social_messages(conversation_id, "timestamp" ASC);
CREATE INDEX IF NOT EXISTS idx_social_messages_project_timestamp
  ON public.social_messages(project_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_social_messages_project_channel
  ON public.social_messages(project_id, channel, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_social_messages_sender_recipient
  ON public.social_messages(project_id, sender_id, recipient_id);

CREATE OR REPLACE FUNCTION public.set_social_chat_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_social_conversations_updated_at ON public.social_conversations;
CREATE TRIGGER set_social_conversations_updated_at
  BEFORE UPDATE ON public.social_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_social_chat_updated_at();

DROP TRIGGER IF EXISTS set_social_messages_updated_at ON public.social_messages;
CREATE TRIGGER set_social_messages_updated_at
  BEFORE UPDATE ON public.social_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_social_chat_updated_at();

ALTER TABLE public.social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_project_chat_member(target_project_id UUID)
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
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.tenant_members tm
          WHERE tm.tenant_id = p.tenant_id
            AND tm.user_id = auth.uid()
            AND COALESCE(tm.status, 'active') = 'active'
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Project members can read social conversations" ON public.social_conversations;
CREATE POLICY "Project members can read social conversations"
  ON public.social_conversations
  FOR SELECT
  USING (public.is_project_chat_member(project_id));

DROP POLICY IF EXISTS "Project members can manage social conversations" ON public.social_conversations;
CREATE POLICY "Project members can manage social conversations"
  ON public.social_conversations
  FOR UPDATE
  USING (public.is_project_chat_member(project_id))
  WITH CHECK (public.is_project_chat_member(project_id));

DROP POLICY IF EXISTS "Project members can delete social conversations" ON public.social_conversations;
CREATE POLICY "Project members can delete social conversations"
  ON public.social_conversations
  FOR DELETE
  USING (public.is_project_chat_member(project_id));

DROP POLICY IF EXISTS "Project members can insert social conversations" ON public.social_conversations;
CREATE POLICY "Project members can insert social conversations"
  ON public.social_conversations
  FOR INSERT
  WITH CHECK (public.is_project_chat_member(project_id));

DROP POLICY IF EXISTS "Project members can read social messages" ON public.social_messages;
CREATE POLICY "Project members can read social messages"
  ON public.social_messages
  FOR SELECT
  USING (public.is_project_chat_member(project_id));

DROP POLICY IF EXISTS "Project members can manage social messages" ON public.social_messages;
CREATE POLICY "Project members can manage social messages"
  ON public.social_messages
  FOR UPDATE
  USING (public.is_project_chat_member(project_id))
  WITH CHECK (public.is_project_chat_member(project_id));

DROP POLICY IF EXISTS "Project members can delete social messages" ON public.social_messages;
CREATE POLICY "Project members can delete social messages"
  ON public.social_messages
  FOR DELETE
  USING (public.is_project_chat_member(project_id));

DROP POLICY IF EXISTS "Project members can insert social messages" ON public.social_messages;
CREATE POLICY "Project members can insert social messages"
  ON public.social_messages
  FOR INSERT
  WITH CHECK (public.is_project_chat_member(project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_messages TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_conversations;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
