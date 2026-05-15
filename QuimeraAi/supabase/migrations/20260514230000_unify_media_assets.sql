-- ================================================================================
-- MEDIA ASSETS UNIFICATION
-- Combines admin_assets + global_files into a single media_assets table.
-- Also moves storage paths under the unified media/{category}/ convention.
-- ================================================================================

-- 1. CREATE THE UNIFIED TABLE
CREATE TABLE IF NOT EXISTS public.media_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    url text NOT NULL,
    size integer DEFAULT 0,
    type text DEFAULT 'image/png',
    -- Unified category (replaces admin_assets.category and inferred from folder)
    category text NOT NULL DEFAULT 'other',
    -- Virtual folder path for the library sidebar tree
    folder_path text,
    -- Tags for searchability
    tags text[] DEFAULT '{}'::text[],
    description text,
    is_ai_generated boolean DEFAULT false,
    ai_prompt text,
    -- System assets (brand logos, previews) are protected from deletion
    is_system_asset boolean DEFAULT false,
    -- Which content pieces use this asset (article ids, news ids, template ids)
    used_in jsonb DEFAULT '[]'::jsonb,
    usage_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- 2. MIGRATE DATA FROM admin_assets
INSERT INTO public.media_assets (
    id, name, url, size, type, category,
    folder_path, tags, description,
    is_ai_generated, ai_prompt, is_system_asset,
    used_in, metadata, created_at
)
SELECT
    id,
    name,
    url,
    COALESCE(size, 0),
    COALESCE(type, 'image/png'),
    COALESCE(category, 'other'),
    'media/' || COALESCE(category, 'other'),
    CASE
        WHEN metadata->'tags' IS NOT NULL AND jsonb_typeof(metadata->'tags') = 'array' THEN
            ARRAY(SELECT jsonb_array_elements_text(metadata->'tags'))
        ELSE '{}'::text[]
    END,
    metadata->>'description',
    COALESCE((metadata->>'isAiGenerated')::boolean, false),
    metadata->>'aiPrompt',
    false,
    COALESCE(metadata->'usedIn', '[]'::jsonb),
    COALESCE(metadata, '{}'::jsonb),
    COALESCE(created_at, now())
FROM public.admin_assets
ON CONFLICT (id) DO NOTHING;

-- 3. MIGRATE DATA FROM global_files (infer category from folder convention)
INSERT INTO public.media_assets (
    id, name, url, size, type, category,
    folder_path, tags, description,
    is_ai_generated, ai_prompt, is_system_asset,
    used_in, metadata, created_at, created_by
)
SELECT
    id,
    name,
    url,
    COALESCE(size, 0),
    COALESCE(type, 'image/png'),
    CASE
        WHEN (metadata->>'storagePath') LIKE '%brand%' OR (metadata->>'storagePath') LIKE '%logo%' THEN 'icon'
        WHEN (metadata->>'storagePath') LIKE '%background%' THEN 'background'
        WHEN (metadata->>'storagePath') LIKE '%template%' THEN 'template'
        WHEN (metadata->>'storagePath') LIKE '%icon%' THEN 'icon'
        ELSE 'other'
    END,
    REPLACE(
        REPLACE(
            COALESCE(metadata->>'storagePath', 'global/files/'),
            'global/files/', 'media/'
        ),
        'admin/assets/', 'media/'
    ),
    '{}'::text[],
    metadata->>'description',
    false,
    metadata->>'aiPrompt',
    false,
    '[]'::jsonb,
    COALESCE(metadata, '{}'::jsonb),
    COALESCE(created_at, now()),
    (metadata->>'uploadedBy')::uuid
FROM public.global_files
ON CONFLICT (id) DO NOTHING;

-- Mark known brand/system assets
UPDATE public.media_assets
SET is_system_asset = true
WHERE name IN ('Quimera Logo', 'Changelog Preview', 'E-commerce Preview')
   OR folder_path LIKE '%brand%';

-- 4. RLS POLICIES

-- Public read access
DROP POLICY IF EXISTS "Public can view media assets" ON public.media_assets;
CREATE POLICY "Public can view media assets" ON public.media_assets
    FOR SELECT TO public USING (true);

-- Admins (owner, superadmin, admin) have full CRUD access
DROP POLICY IF EXISTS "Admins can manage media assets" ON public.media_assets;
CREATE POLICY "Admins can manage media assets" ON public.media_assets
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role IN ('owner', 'superadmin', 'admin')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role IN ('owner', 'superadmin', 'admin')
        )
    );

-- Protect system assets from deletion by non-superadmins
DROP POLICY IF EXISTS "Only superadmins can delete system assets" ON public.media_assets;
CREATE POLICY "Only superadmins can delete system assets" ON public.media_assets
    FOR DELETE USING (
        is_system_asset = false
        OR auth.uid() IN (
            SELECT id FROM public.users WHERE role IN ('owner', 'superadmin')
        )
    );

-- 5. AUTO-UPDATE TIMESTAMP
DROP TRIGGER IF EXISTS set_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER set_media_assets_updated_at
    BEFORE UPDATE ON public.media_assets
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 6. REAL-TIME SUPPORT
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.media_assets;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

-- 7. INDEXES FOR COMMON QUERIES
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON public.media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder_path ON public.media_assets(folder_path);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON public.media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_is_system ON public.media_assets(is_system_asset);

-- 8. CLEANUP OLD TABLES (kept for backwards compatibility during rollout)
-- After the rollout is stable and confirmed, uncomment:
-- DROP TABLE IF EXISTS public.admin_assets CASCADE;
-- DROP TABLE IF EXISTS public.global_files CASCADE;
