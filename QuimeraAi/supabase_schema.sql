-- ==========================================
-- QUIMERA AI - SUPABASE SCHEMA MIGRATION
-- ==========================================
-- Este script crea las tablas equivalentes a las colecciones de Firestore.
-- Utiliza un enfoque híbrido: columnas relacionales estrictas para IDs y relaciones,
-- y una columna `data JSONB` para almacenar el payload flexible de la app y evitar romperla.

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. USERS & MULTI-TENANCY
-- ==========================================

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'user',
    email TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_members (
    id TEXT PRIMARY KEY, -- Format: tenantId_userId
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. PROJECTS (Subcolecciones de Firestore)
-- ==========================================

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE project_leads (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE project_files (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE project_appointments (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE project_posts (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE project_finance (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. DOMAINS & E-COMMERCE
-- ==========================================

CREATE TABLE custom_domains (
    domain_name TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subdomains (
    subdomain_name TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public_stores (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE store_products (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE store_categories (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE store_discounts (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE store_reviews (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE store_stock_notifications (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE store_orders (
    id TEXT PRIMARY KEY,
    store_id TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_carts (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_id TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. GLOBALS & ADMIN
-- ==========================================

CREATE TABLE global_settings (
    id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE templates (
    id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE changelog (
    id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE custom_components (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_invites (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agency_activity (
    id TEXT PRIMARY KEY,
    agency_tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) BASICS
-- ==========================================


ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Ejemplo de políticas básicas
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Superadmin overrides (assumes data->>'role' = 'superadmin' or 'owner')
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
    (SELECT data->>'role' FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner')
);

CREATE POLICY "Users can view their own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Custom Components: Everyone can view, but only creators or admins can edit
CREATE POLICY "Anyone can view custom components" ON custom_components FOR SELECT USING (true);
CREATE POLICY "Users can manage their custom components" ON custom_components FOR ALL USING (auth.uid() = user_id);

-- Prompts: Everyone can view, only admins can manage
CREATE POLICY "Anyone can view prompts" ON prompts FOR SELECT USING (true);
CREATE POLICY "Admins can manage prompts" ON prompts FOR ALL USING (
    (SELECT data->>'role' FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin')
);

-- Tenants: Members can view, owners/admins can manage
CREATE POLICY "Users can view their tenants" ON tenants FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM tenant_members WHERE tenant_id = tenants.id) OR owner_id = auth.uid()
);
CREATE POLICY "Owners can manage tenants" ON tenants FOR ALL USING (owner_id = auth.uid());

-- Tenant Members: Members can view other members in the same tenant
CREATE POLICY "Users can view members of their tenants" ON tenant_members FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
);
CREATE POLICY "Tenant owners can manage members" ON tenant_members FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
);

CREATE TABLE store_wishlists (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    product_id TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Customers
CREATE TABLE store_customers (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Segments
CREATE TABLE store_segments (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store User Activities
CREATE TABLE store_user_activities (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES store_customers(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for these tables
ALTER TABLE store_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view their own wishlists" ON store_wishlists FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can manage store customers" ON store_customers FOR ALL USING (true);
CREATE POLICY "Admins can manage store segments" ON store_segments FOR ALL USING (true);
CREATE POLICY "Admins can manage store user activities" ON store_user_activities FOR ALL USING (true);

-- Store Stock Notifications
CREATE TABLE store_stock_notifications (
    id TEXT PRIMARY KEY,
    store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
    product_id TEXT,
    email TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE store_stock_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage stock notifications" ON store_stock_notifications FOR ALL USING (true);

-- ============================================================================
-- MODULE: EMAIL MARKETING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT,
    preview_text TEXT,
    type TEXT,
    html_content TEXT,
    email_document JSONB,
    audience_type TEXT,
    audience_segment_id TEXT,
    custom_recipient_emails JSONB,
    status TEXT,
    stats JSONB,
    tags JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    category TEXT,
    status TEXT,
    trigger_config JSONB,
    audience_id TEXT,
    steps JSONB,
    template_id TEXT,
    subject TEXT,
    delay_minutes INTEGER,
    stats JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    provider TEXT,
    api_key_configured BOOLEAN DEFAULT false,
    from_email TEXT,
    from_name TEXT,
    reply_to TEXT,
    logo_url TEXT,
    primary_color TEXT,
    footer_text TEXT,
    social_links JSONB,
    transactional JSONB,
    marketing JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para email_campaigns
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can manage their email campaigns" ON public.email_campaigns
    FOR ALL USING (store_id IN (
        SELECT project_id FROM public.tenant_users WHERE user_id = auth.uid()
    ));

-- RLS para email_automations
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can manage their email automations" ON public.email_automations
    FOR ALL USING (store_id IN (
        SELECT project_id FROM public.tenant_users WHERE user_id = auth.uid()
    ));

-- RLS para email_settings
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can manage their email settings" ON public.email_settings
    FOR ALL USING (store_id IN (
        SELECT project_id FROM public.tenant_users WHERE user_id = auth.uid()
    ));


CREATE TABLE IF NOT EXISTS public.email_audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    filters JSONB,
    accepts_marketing BOOLEAN,
    has_ordered BOOLEAN,
    min_orders INTEGER,
    max_orders INTEGER,
    min_total_spent NUMERIC,
    max_total_spent NUMERIC,
    tags JSONB,
    exclude_tags JSONB,
    last_order_days_ago INTEGER,
    source JSONB,
    static_members JSONB,
    static_member_count INTEGER,
    estimated_count INTEGER DEFAULT 0,
    last_count_update TIMESTAMP WITH TIME ZONE,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
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
    metadata JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at JSONB,
    clicked_links JSONB,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    complained_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.email_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can manage their email audiences" ON public.email_audiences
    FOR ALL USING (store_id IN (
        SELECT project_id FROM public.tenant_users WHERE user_id = auth.uid()
    ));

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their email logs" ON public.email_logs
    FOR SELECT USING (store_id IN (
        SELECT project_id FROM public.tenant_users WHERE user_id = auth.uid()
    ));
