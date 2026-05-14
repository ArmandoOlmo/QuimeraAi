-- Fix news_items RLS policies and missing columns
-- Created: 2026-05-13

-- ============================================================================
-- ADD MISSING COLUMNS (if migration 20260505000000 was already applied)
-- ============================================================================
ALTER TABLE public.news_items ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.news_items ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.news_items ADD COLUMN IF NOT EXISTS language text DEFAULT 'es';
ALTER TABLE public.news_items ADD COLUMN IF NOT EXISTS translation_group text;

-- ============================================================================
-- FIX news_items RLS POLICIES
-- ============================================================================
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users read published news" ON public.news_items;
DROP POLICY IF EXISTS "Public read published news" ON public.news_items;
DROP POLICY IF EXISTS "Authenticated users can create news" ON public.news_items;
DROP POLICY IF EXISTS "News creators can update own news" ON public.news_items;
DROP POLICY IF EXISTS "News creators can delete own news" ON public.news_items;
DROP POLICY IF EXISTS "Admin full access to news" ON public.news_items;

-- Create new policies
CREATE POLICY "Public read published news" ON public.news_items
    FOR SELECT TO public USING (status = 'published');

CREATE POLICY "Admin and owner can create news" ON public.news_items
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('superadmin', 'admin', 'owner'))
    );

CREATE POLICY "Admin and owner can update news" ON public.news_items
    FOR UPDATE TO authenticated USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('superadmin', 'admin', 'owner'))
    ) WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('superadmin', 'admin', 'owner'))
    );

CREATE POLICY "Admin and owner can delete news" ON public.news_items
    FOR DELETE TO authenticated USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('superadmin', 'admin', 'owner'))
    );

CREATE POLICY "Admin full access to news" ON public.news_items
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin'));

-- ============================================================================
-- FIX news_user_states RLS POLICIES
-- ============================================================================
ALTER TABLE public.news_user_states ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users read/write own news states" ON public.news_user_states;
DROP POLICY IF EXISTS "Users read own news states" ON public.news_user_states;
DROP POLICY IF EXISTS "Users insert own news states" ON public.news_user_states;
DROP POLICY IF EXISTS "Users update own news states" ON public.news_user_states;
DROP POLICY IF EXISTS "Users delete own news states" ON public.news_user_states;

-- Create new policies
CREATE POLICY "Users read own news states" ON public.news_user_states
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own news states" ON public.news_user_states
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own news states" ON public.news_user_states
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own news states" ON public.news_user_states
    FOR DELETE TO authenticated USING (user_id = auth.uid());
