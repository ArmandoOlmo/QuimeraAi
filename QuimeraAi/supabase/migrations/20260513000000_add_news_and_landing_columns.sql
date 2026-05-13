-- Migration to add missing columns to news_items and app_landing_config
-- Created to avoid modifying the original migration 20260505000000

-- 1. Add tags and video_url to news_items
ALTER TABLE public.news_items
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_url text;

-- 2. Add data column to app_landing_config for extensibility
ALTER TABLE public.app_landing_config
ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

-- 3. Ensure language exists in news_items (it was in the old plan but maybe not applied)
ALTER TABLE public.news_items
ADD COLUMN IF NOT EXISTS language text DEFAULT 'es',
ADD COLUMN IF NOT EXISTS translation_group text;

-- 4. Comment on columns for clarity
COMMENT ON COLUMN public.news_items.tags IS 'Array of strings for categorizing news';
COMMENT ON COLUMN public.news_items.video_url IS 'Optional URL for an embedded video in the news modal';
COMMENT ON COLUMN public.news_items.translation_group IS 'Shared ID linking translations of the same news item';
COMMENT ON COLUMN public.app_landing_config.data IS 'Flexible storage for landing page configuration fields (testimonials, extras, etc.)';
