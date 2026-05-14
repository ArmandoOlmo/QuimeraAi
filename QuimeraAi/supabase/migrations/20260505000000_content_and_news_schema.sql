-- Migration for App Content, Agency Content, and News Collections

-- ============================================================================
-- GLOBAL APP CONTENT (Public Landing Page & Global Quimera Data)
-- ============================================================================

-- App Articles (Blog)
CREATE TABLE IF NOT EXISTS public.app_articles (
    id text PRIMARY KEY,
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text NOT NULL,
    category text,
    tags jsonb DEFAULT '[]'::jsonb,
    image_url text,
    author text,
    status text DEFAULT 'draft',
    featured boolean DEFAULT false,
    priority integer DEFAULT 0,
    language text DEFAULT 'es',
    translation_group text,
    read_time integer DEFAULT 1,
    views integer DEFAULT 0,
    published_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for published app articles" ON public.app_articles
    FOR SELECT TO public USING (status = 'published');

CREATE POLICY "Admin and owner full access to app articles" ON public.app_articles
    FOR ALL TO authenticated USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('superadmin', 'admin', 'owner'))
    );

-- App Navigation
CREATE TABLE IF NOT EXISTS public.app_navigation (
    id text PRIMARY KEY DEFAULT 'main',
    links jsonb DEFAULT '[]'::jsonb,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_navigation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for app navigation" ON public.app_navigation
    FOR SELECT TO public USING (true);

CREATE POLICY "Admin full access to app navigation" ON public.app_navigation
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin'));

-- App Legal Pages
CREATE TABLE IF NOT EXISTS public.app_legal_pages (
    id text PRIMARY KEY, -- type_language e.g., privacy-policy_es
    type text NOT NULL,
    language text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'draft',
    last_updated timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(type, language)
);

ALTER TABLE public.app_legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for published app legal pages" ON public.app_legal_pages
    FOR SELECT TO public USING (status = 'published');

CREATE POLICY "Admin full access to app legal pages" ON public.app_legal_pages
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin'));

-- App Landing Config
CREATE TABLE IF NOT EXISTS public.app_landing_config (
    id text PRIMARY KEY DEFAULT 'landing',
    hero_title text,
    hero_subtitle text,
    hero_image text,
    features jsonb DEFAULT '[]'::jsonb,
    cta_text text,
    cta_link text,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_landing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for app landing config" ON public.app_landing_config
    FOR SELECT TO public USING (true);

CREATE POLICY "Admin full access to app landing config" ON public.app_landing_config
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin'));


-- ============================================================================
-- AGENCY CONTENT (Tenant specific)
-- ============================================================================

-- Agency Articles
CREATE TABLE IF NOT EXISTS public.agency_articles (
    id text PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text NOT NULL,
    category text,
    tags jsonb DEFAULT '[]'::jsonb,
    image_url text,
    author text,
    status text DEFAULT 'draft',
    featured boolean DEFAULT false,
    language text DEFAULT 'es',
    translation_group text,
    read_time integer DEFAULT 1,
    views integer DEFAULT 0,
    published_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, slug)
);

ALTER TABLE public.agency_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for published agency articles" ON public.agency_articles
    FOR SELECT TO public USING (status = 'published');

CREATE POLICY "Tenant members full access to agency articles" ON public.agency_articles
    FOR ALL TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    );

-- Agency Navigation
CREATE TABLE IF NOT EXISTS public.agency_navigation (
    id text PRIMARY KEY DEFAULT 'main',
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    links jsonb DEFAULT '[]'::jsonb,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, id)
);

ALTER TABLE public.agency_navigation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for agency navigation" ON public.agency_navigation
    FOR SELECT TO public USING (true);

CREATE POLICY "Tenant members full access to agency navigation" ON public.agency_navigation
    FOR ALL TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    );

-- Agency Legal Pages
CREATE TABLE IF NOT EXISTS public.agency_legal_pages (
    id text PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    type text NOT NULL,
    language text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'draft',
    last_updated timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, type, language)
);

ALTER TABLE public.agency_legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for published agency legal pages" ON public.agency_legal_pages
    FOR SELECT TO public USING (status = 'published');

CREATE POLICY "Tenant members full access to agency legal pages" ON public.agency_legal_pages
    FOR ALL TO authenticated USING (
        tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    );


-- ============================================================================
-- NEWS AND UPDATES
-- ============================================================================

-- News Items
CREATE TABLE IF NOT EXISTS public.news_items (
    id text PRIMARY KEY,
    title text NOT NULL,
    excerpt text NOT NULL,
    content text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'draft',
    priority integer DEFAULT 0,
    featured boolean DEFAULT false,
    image_url text,
    link_url text,
    link_text text,
    targeting jsonb DEFAULT '{"type": "all"}'::jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    video_url text,
    language text DEFAULT 'es',
    translation_group text,
    views integer DEFAULT 0,
    clicks integer DEFAULT 0,
    publish_at timestamptz,
    expire_at timestamptz,
    created_by text,
    updated_by text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read published news
CREATE POLICY "Public read published news" ON public.news_items
    FOR SELECT TO public USING (status = 'published');

-- Authenticated users can create news items
CREATE POLICY "Authenticated users can create news" ON public.news_items
    FOR INSERT TO authenticated WITH CHECK (true);

-- Creators can update their own news items
CREATE POLICY "News creators can update own news" ON public.news_items
    FOR UPDATE TO authenticated USING (auth.uid()::text = created_by) WITH CHECK (true);

-- Creators can delete their own news items
CREATE POLICY "News creators can delete own news" ON public.news_items
    FOR DELETE TO authenticated USING (auth.uid()::text = created_by);

-- Superadmins have full access to all news items
CREATE POLICY "Admin full access to news" ON public.news_items
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin'));

-- News User States
CREATE TABLE IF NOT EXISTS public.news_user_states (
    id text PRIMARY KEY, -- user_id_news_id
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    news_id text REFERENCES public.news_items(id) ON DELETE CASCADE,
    read boolean DEFAULT false,
    read_at timestamptz,
    dismissed boolean DEFAULT false,
    dismissed_at timestamptz,
    clicked boolean DEFAULT false,
    clicked_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, news_id)
);

ALTER TABLE public.news_user_states ENABLE ROW LEVEL SECURITY;

-- Users can read their own news states
CREATE POLICY "Users read own news states" ON public.news_user_states
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can insert their own news states
CREATE POLICY "Users insert own news states" ON public.news_user_states
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Users can update their own news states
CREATE POLICY "Users update own news states" ON public.news_user_states
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Users can delete their own news states
CREATE POLICY "Users delete own news states" ON public.news_user_states
    FOR DELETE TO authenticated USING (user_id = auth.uid());


-- Setup trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_app_articles_updated_at BEFORE UPDATE ON public.app_articles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_app_navigation_updated_at BEFORE UPDATE ON public.app_navigation FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_app_legal_pages_updated_at BEFORE UPDATE ON public.app_legal_pages FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_app_landing_config_updated_at BEFORE UPDATE ON public.app_landing_config FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_agency_articles_updated_at BEFORE UPDATE ON public.agency_articles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_agency_navigation_updated_at BEFORE UPDATE ON public.agency_navigation FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_agency_legal_pages_updated_at BEFORE UPDATE ON public.agency_legal_pages FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_news_items_updated_at BEFORE UPDATE ON public.news_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_news_user_states_updated_at BEFORE UPDATE ON public.news_user_states FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
