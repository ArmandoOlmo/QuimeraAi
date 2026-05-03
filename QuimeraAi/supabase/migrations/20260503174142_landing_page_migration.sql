-- ============================================================================
-- Landing Page Migration: Firebase → Supabase
-- Tables: landing_sections, platform_leads, subscription_plans, service_config
-- ============================================================================

-- 1. Landing Page Sections
-- Stores the configuration for each section of the public landing page
CREATE TABLE IF NOT EXISTS landing_sections (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Landing sections are publicly readable, admin-only write
ALTER TABLE landing_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landing sections are publicly readable"
  ON landing_sections FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage landing sections"
  ON landing_sections FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_landing_sections_order ON landing_sections("order");

-- 2. Platform Leads
-- Stores leads captured from the public landing page (contact form, chatbot, etc.)
CREATE TABLE IF NOT EXISTS platform_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  company TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'contact-page',
  status TEXT NOT NULL DEFAULT 'new',
  score INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  project_id TEXT DEFAULT '__platform__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Anyone can create leads (public form), only authenticated can read
ALTER TABLE platform_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create platform leads"
  ON platform_leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read platform leads"
  ON platform_leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update platform leads"
  ON platform_leads FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 3. Subscription Plans
-- Stores subscription plan configurations (previously in Firestore subscriptionPlans collection)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  
  -- Pricing
  price_monthly NUMERIC(10,2) DEFAULT 0,
  price_annually NUMERIC(10,2) DEFAULT 0,
  
  -- Stripe integration
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annually TEXT,
  
  -- Display
  color TEXT DEFAULT '#6b7280',
  icon TEXT DEFAULT 'Sparkles',
  is_featured BOOLEAN DEFAULT false,
  is_popular BOOLEAN DEFAULT false,
  
  -- Landing page visibility
  show_in_landing BOOLEAN DEFAULT false,
  landing_order INTEGER DEFAULT 99,
  
  -- Plan limits (stored as JSONB for flexibility)
  limits JSONB DEFAULT '{}',
  
  -- Plan features (stored as JSONB for flexibility)
  features JSONB DEFAULT '{}',
  
  -- Status
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  
  -- Metadata
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Plans are publicly readable (landing page pricing), admin-only write
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscription plans are publicly readable"
  ON subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage subscription plans"
  ON subscription_plans FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Service Configuration
-- Stores global service availability settings (chatbot, ecommerce, etc.)
CREATE TABLE IF NOT EXISTS service_config (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  status_reason TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Service config is publicly readable, admin-only write
ALTER TABLE service_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service config is publicly readable"
  ON service_config FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage service config"
  ON service_config FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Service audit log
CREATE TABLE IF NOT EXISTS service_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status JSONB,
  new_status JSONB,
  performed_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read audit log"
  ON service_audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can write audit log"
  ON service_audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
