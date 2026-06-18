-- Email marketing runtime schema.
-- The deployed email-api Edge Function and dashboard both depend on these
-- tables. Keep this migration additive so it can repair partially migrated DBs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'resend',
  api_key_configured BOOLEAN NOT NULL DEFAULT false,
  from_email TEXT,
  from_name TEXT,
  reply_to TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#4f46e5',
  footer_text TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  transactional JSONB DEFAULT '{}'::jsonb,
  marketing JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT DEFAULT '',
  preview_text TEXT DEFAULT '',
  type TEXT DEFAULT 'newsletter',
  html_content TEXT DEFAULT '',
  email_document JSONB,
  audience_type TEXT DEFAULT 'all',
  audience_segment_id TEXT,
  custom_recipient_emails JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft',
  stats JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  automation_id TEXT,
  automation_step_id TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB DEFAULT '[]'::jsonb,
  accepts_marketing BOOLEAN DEFAULT true,
  has_ordered BOOLEAN,
  min_orders INTEGER,
  max_orders INTEGER,
  min_total_spent NUMERIC,
  max_total_spent NUMERIC,
  tags JSONB DEFAULT '[]'::jsonb,
  exclude_tags JSONB DEFAULT '[]'::jsonb,
  last_order_days_ago INTEGER,
  source JSONB DEFAULT '[]'::jsonb,
  static_members JSONB DEFAULT '[]'::jsonb,
  static_member_count INTEGER DEFAULT 0,
  estimated_count INTEGER DEFAULT 0,
  last_count_update TIMESTAMPTZ,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'welcome',
  category TEXT DEFAULT 'lifecycle',
  status TEXT DEFAULT 'draft',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  audience_id TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  template_id TEXT,
  subject TEXT,
  delay_minutes INTEGER DEFAULT 0,
  stats JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT,
  template_id TEXT,
  campaign_id TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  customer_id TEXT,
  subject TEXT,
  status TEXT DEFAULT 'queued',
  provider_message_id TEXT,
  provider TEXT DEFAULT 'resend',
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  bounce_type TEXT,
  bounce_message TEXT,
  error_message TEXT,
  error_code TEXT,
  order_id TEXT,
  lead_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at JSONB,
  clicked_links JSONB DEFAULT '[]'::jsonb,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Align partially created tables from earlier migration attempts.
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'resend';
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS api_key_configured BOOLEAN DEFAULT false;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS from_email TEXT;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS from_name TEXT;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS reply_to TEXT;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#4f46e5';
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS transactional JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS marketing JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS preview_text TEXT DEFAULT '';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS html_content TEXT DEFAULT '';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS email_document JSONB;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS audience_type TEXT DEFAULT 'all';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS audience_segment_id TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS custom_recipient_emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS automation_id TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS automation_step_id TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS accepts_marketing BOOLEAN DEFAULT true;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS has_ordered BOOLEAN;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS min_orders INTEGER;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS max_orders INTEGER;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS min_total_spent NUMERIC;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS max_total_spent NUMERIC;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS exclude_tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS last_order_days_ago INTEGER;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS source JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS static_members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS static_member_count INTEGER DEFAULT 0;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS estimated_count INTEGER DEFAULT 0;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS last_count_update TIMESTAMPTZ;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'lifecycle';
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS audience_id TEXT;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'resend';
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS bounce_type TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS bounce_message TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS error_code TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS opened_at JSONB;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS clicked_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS email_settings_store_id_uidx ON public.email_settings(store_id);
CREATE INDEX IF NOT EXISTS email_campaigns_store_id_idx ON public.email_campaigns(store_id);
CREATE INDEX IF NOT EXISTS email_campaigns_status_idx ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS email_campaigns_created_at_idx ON public.email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS email_audiences_store_id_idx ON public.email_audiences(store_id);
CREATE INDEX IF NOT EXISTS email_automations_store_id_idx ON public.email_automations(store_id);
CREATE INDEX IF NOT EXISTS email_automations_status_idx ON public.email_automations(status);
CREATE INDEX IF NOT EXISTS email_logs_store_id_idx ON public.email_logs(store_id);
CREATE INDEX IF NOT EXISTS email_logs_campaign_id_idx ON public.email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_recipient_email_idx ON public.email_logs(lower(recipient_email));

CREATE OR REPLACE FUNCTION public.set_email_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_email_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_email_settings_updated_at ON public.email_settings;
CREATE TRIGGER set_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_email_updated_at();

DROP TRIGGER IF EXISTS set_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER set_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_email_updated_at();

DROP TRIGGER IF EXISTS set_email_audiences_updated_at ON public.email_audiences;
CREATE TRIGGER set_email_audiences_updated_at
  BEFORE UPDATE ON public.email_audiences
  FOR EACH ROW EXECUTE FUNCTION public.set_email_updated_at();

DROP TRIGGER IF EXISTS set_email_automations_updated_at ON public.email_automations;
CREATE TRIGGER set_email_automations_updated_at
  BEFORE UPDATE ON public.email_automations
  FOR EACH ROW EXECUTE FUNCTION public.set_email_updated_at();

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Email settings project members can read" ON public.email_settings;
DROP POLICY IF EXISTS "Email settings project members can insert" ON public.email_settings;
DROP POLICY IF EXISTS "Email settings project members can update" ON public.email_settings;
DROP POLICY IF EXISTS "Email settings project members can delete" ON public.email_settings;
DROP POLICY IF EXISTS "Email campaigns project members can read" ON public.email_campaigns;
DROP POLICY IF EXISTS "Email campaigns project members can insert" ON public.email_campaigns;
DROP POLICY IF EXISTS "Email campaigns project members can update" ON public.email_campaigns;
DROP POLICY IF EXISTS "Email campaigns project members can delete" ON public.email_campaigns;
DROP POLICY IF EXISTS "Email audiences project members can read" ON public.email_audiences;
DROP POLICY IF EXISTS "Email audiences project members can insert" ON public.email_audiences;
DROP POLICY IF EXISTS "Email audiences project members can update" ON public.email_audiences;
DROP POLICY IF EXISTS "Email audiences project members can delete" ON public.email_audiences;
DROP POLICY IF EXISTS "Email automations project members can read" ON public.email_automations;
DROP POLICY IF EXISTS "Email automations project members can insert" ON public.email_automations;
DROP POLICY IF EXISTS "Email automations project members can update" ON public.email_automations;
DROP POLICY IF EXISTS "Email automations project members can delete" ON public.email_automations;
DROP POLICY IF EXISTS "Email logs project members can read" ON public.email_logs;

CREATE POLICY "Email settings project members can read"
  ON public.email_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_settings.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email settings project members can insert"
  ON public.email_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_settings.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email settings project members can update"
  ON public.email_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_settings.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_settings.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email settings project members can delete"
  ON public.email_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_settings.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email campaigns project members can read"
  ON public.email_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_campaigns.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email campaigns project members can insert"
  ON public.email_campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_campaigns.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email campaigns project members can update"
  ON public.email_campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_campaigns.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_campaigns.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email campaigns project members can delete"
  ON public.email_campaigns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_campaigns.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email audiences project members can read"
  ON public.email_audiences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_audiences.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email audiences project members can insert"
  ON public.email_audiences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_audiences.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email audiences project members can update"
  ON public.email_audiences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_audiences.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_audiences.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email audiences project members can delete"
  ON public.email_audiences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_audiences.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email automations project members can read"
  ON public.email_automations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_automations.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email automations project members can insert"
  ON public.email_automations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_automations.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email automations project members can update"
  ON public.email_automations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_automations.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_automations.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email automations project members can delete"
  ON public.email_automations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_automations.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Email logs project members can read"
  ON public.email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = email_logs.store_id
        AND (
          p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tenant_members tm
            WHERE tm.tenant_id = p.tenant_id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_audiences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_automations TO authenticated;
GRANT SELECT ON public.email_logs TO authenticated;

DO $$
DECLARE
  rel_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;

  FOREACH rel_name IN ARRAY ARRAY[
    'email_settings',
    'email_campaigns',
    'email_audiences',
    'email_automations',
    'email_logs'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = rel_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', rel_name);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
