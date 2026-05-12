-- ============================================================================
-- Migration: Add published_data column to projects table
-- Purpose: Replace Firestore publicStores with Supabase-native publishing
-- ============================================================================

-- 1. Add published_data JSONB column (stores full project snapshot on publish)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS published_data JSONB;

-- 2. Add published_at timestamp
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 3. RLS: Allow public (unauthenticated) read access for published projects
-- This is essential for SSR rendering of public websites.
-- The existing policies only allow tenant members to read projects.
DROP POLICY IF EXISTS "Public can read published projects" ON public.projects;
CREATE POLICY "Public can read published projects" ON public.projects
  FOR SELECT TO anon
  USING (published_data IS NOT NULL);
