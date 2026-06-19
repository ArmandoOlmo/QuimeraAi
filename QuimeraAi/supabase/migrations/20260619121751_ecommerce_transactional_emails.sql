-- D2 Ecommerce transactional emails.
-- Additive migration: aligns Email Hub tables with project/store identifiers and
-- enables ecommerce transactional email logs without changing public checkout flow.

CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT DEFAULT 'resend',
  api_key_configured BOOLEAN DEFAULT false,
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
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subject TEXT,
  preview_text TEXT,
  type TEXT,
  html_content TEXT,
  email_document JSONB,
  audience_type TEXT,
  audience_segment_id TEXT,
  custom_recipient_emails JSONB,
  status TEXT DEFAULT 'draft',
  stats JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  category TEXT,
  status TEXT DEFAULT 'draft',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  audience_id TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  template_id TEXT,
  subject TEXT,
  delay_minutes INTEGER,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB DEFAULT '[]'::jsonb,
  accepts_marketing BOOLEAN,
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

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT,
  template_id TEXT,
  campaign_id TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  customer_id TEXT,
  subject TEXT,
  status TEXT,
  provider_message_id TEXT,
  provider TEXT,
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
  clicked_links JSONB,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
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

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_audiences ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.email_settings SET project_id = COALESCE(project_id, store_id), store_id = COALESCE(store_id, project_id);
UPDATE public.email_campaigns SET project_id = COALESCE(project_id, store_id), store_id = COALESCE(store_id, project_id), created_by = COALESCE(created_by, user_id);
UPDATE public.email_automations SET project_id = COALESCE(project_id, store_id), store_id = COALESCE(store_id, project_id);
UPDATE public.email_audiences SET project_id = COALESCE(project_id, store_id), store_id = COALESCE(store_id, project_id), created_by = COALESCE(created_by, user_id);
UPDATE public.email_logs SET project_id = COALESCE(project_id, store_id), store_id = COALESCE(store_id, project_id);

CREATE UNIQUE INDEX IF NOT EXISTS email_settings_project_id_unique_idx ON public.email_settings(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS email_settings_store_id_unique_idx ON public.email_settings(store_id);

CREATE INDEX IF NOT EXISTS email_campaigns_project_id_idx ON public.email_campaigns(project_id);
CREATE INDEX IF NOT EXISTS email_campaigns_store_id_idx ON public.email_campaigns(store_id);
CREATE INDEX IF NOT EXISTS email_automations_project_id_idx ON public.email_automations(project_id);
CREATE INDEX IF NOT EXISTS email_automations_store_id_idx ON public.email_automations(store_id);
CREATE INDEX IF NOT EXISTS email_audiences_project_id_idx ON public.email_audiences(project_id);
CREATE INDEX IF NOT EXISTS email_audiences_store_id_idx ON public.email_audiences(store_id);
CREATE INDEX IF NOT EXISTS email_logs_project_id_idx ON public.email_logs(project_id);
CREATE INDEX IF NOT EXISTS email_logs_store_id_idx ON public.email_logs(store_id);
CREATE INDEX IF NOT EXISTS email_logs_order_template_idx ON public.email_logs(order_id, template_id);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON public.email_logs(sent_at DESC);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants can manage their email settings" ON public.email_settings;
DROP POLICY IF EXISTS "Tenants can manage their email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Tenants can manage their email automations" ON public.email_automations;
DROP POLICY IF EXISTS "Tenants can manage their email audiences" ON public.email_audiences;
DROP POLICY IF EXISTS "Tenants can view their email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Project members can manage email settings" ON public.email_settings;
DROP POLICY IF EXISTS "Project members can manage email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Project members can manage email automations" ON public.email_automations;
DROP POLICY IF EXISTS "Project members can manage email audiences" ON public.email_audiences;
DROP POLICY IF EXISTS "Project members can view email logs" ON public.email_logs;

CREATE POLICY "Project members can manage email settings"
ON public.email_settings
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)))
WITH CHECK (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)));

CREATE POLICY "Project members can manage email campaigns"
ON public.email_campaigns
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)))
WITH CHECK (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)));

CREATE POLICY "Project members can manage email automations"
ON public.email_automations
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)))
WITH CHECK (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)));

CREATE POLICY "Project members can manage email audiences"
ON public.email_audiences
FOR ALL
TO authenticated
USING (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)))
WITH CHECK (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)));

CREATE POLICY "Project members can view email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (public.is_project_owner_or_tenant(COALESCE(project_id, store_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_automations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_audiences TO authenticated;
GRANT SELECT ON public.email_logs TO authenticated;
