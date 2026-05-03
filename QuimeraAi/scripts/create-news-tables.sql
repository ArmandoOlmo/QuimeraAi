-- scripts/create-news-tables.sql
-- Create news tables for Supabase Migration

-- 1. Create news table
CREATE TABLE IF NOT EXISTS news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    body TEXT,
    image_url TEXT,
    video_url TEXT,
    cta JSONB, -- {label, url, isExternal}
    category VARCHAR(50),
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'draft',
    publish_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ,
    targeting JSONB, -- {type, roles[], plans[], tenantIds[]}
    featured BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    language VARCHAR(10) DEFAULT 'es',
    translation_group VARCHAR(100),
    translated_from VARCHAR(100),
    translation_status VARCHAR(50)
);

-- 2. Create news_user_states table
CREATE TABLE IF NOT EXISTS news_user_states (
    id VARCHAR(255) PRIMARY KEY, -- userId_newsId
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    news_id UUID REFERENCES news(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, news_id)
);

-- 3. Enable RLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_user_states ENABLE ROW LEVEL SECURITY;

-- 4. Policies for news table
-- Anyone authenticated can read published news, or owners/admins can read all
CREATE POLICY "Authenticated users can read published news or owners all" ON news
    FOR SELECT TO authenticated 
    USING (status = 'published' OR (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'superadmin', 'admin', 'manager'));

-- Only owners/admins can insert/update/delete news
CREATE POLICY "Owners can insert news" ON news
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'superadmin', 'admin', 'manager'));

CREATE POLICY "Owners can update news" ON news
    FOR UPDATE TO authenticated
    USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'superadmin', 'admin', 'manager'))
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'superadmin', 'admin', 'manager'));

CREATE POLICY "Owners can delete news" ON news
    FOR DELETE TO authenticated
    USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'superadmin', 'admin', 'manager'));

-- 5. Policies for news_user_states
-- Users can only see their own state
CREATE POLICY "Users can view their own news state" ON news_user_states
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own state
CREATE POLICY "Users can insert their own news state" ON news_user_states
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own state
CREATE POLICY "Users can update their own news state" ON news_user_states
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 6. Helper functions/triggers for updated_at
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_news_updated_at ON news;
CREATE TRIGGER update_news_updated_at
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_news_updated_at();

CREATE OR REPLACE FUNCTION update_news_user_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_news_user_states_updated_at ON news_user_states;
CREATE TRIGGER update_news_user_states_updated_at
    BEFORE UPDATE ON news_user_states
    FOR EACH ROW
    EXECUTE FUNCTION update_news_user_states_updated_at();
