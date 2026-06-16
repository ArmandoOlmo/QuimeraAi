-- Quimera Realty Suite Supabase storage/RLS hardening.
-- This migration is intentionally incremental over 20260616000000_realty_suite_foundation.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep security definer helpers out of the exposed public schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.can_manage_realty_record(
    p_project_id text,
    p_tenant_id text,
    p_user_id text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
      AND (
        (SELECT auth.uid())::text = NULLIF(p_user_id, '')
        OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id::text = (SELECT auth.uid())::text
              AND u.role IN ('owner', 'superadmin', 'admin')
        )
        OR EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id::text = NULLIF(p_project_id, '')
              AND (
                p.user_id::text = (SELECT auth.uid())::text
                OR EXISTS (
                    SELECT 1
                    FROM public.tenants t
                    WHERE t.id = p.tenant_id
                      AND t.owner_user_id::text = (SELECT auth.uid())::text
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.tenant_members tm
                    WHERE tm.tenant_id = p.tenant_id
                      AND tm.user_id::text = (SELECT auth.uid())::text
                )
              )
        )
        OR EXISTS (
            SELECT 1
            FROM public.tenants t
            WHERE t.id::text = NULLIF(p_tenant_id, '')
              AND t.owner_user_id::text = (SELECT auth.uid())::text
        )
        OR EXISTS (
            SELECT 1
            FROM public.tenant_members tm
            WHERE tm.tenant_id::text = NULLIF(p_tenant_id, '')
              AND tm.user_id::text = (SELECT auth.uid())::text
        )
      );
$$;

REVOKE ALL ON FUNCTION private.can_manage_realty_record(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_manage_realty_record(text, text, text) TO authenticated;

-- Drop policies before type alignment so old UUID policy expressions do not block changes.
DO $$
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY (ARRAY[
              'real_estate_profiles',
              'agents',
              'properties',
              'property_media',
              'property_documents',
              'property_leads',
              'property_lead_events',
              'property_ai_generations',
              'property_campaigns',
              'property_open_houses',
              'property_favorites',
              'property_saved_searches'
          ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
    END LOOP;
END;
$$;

-- Realty identity columns use text because the frontend compatibility layer treats
-- Supabase/Firebase-style IDs as strings.
DO $$
DECLARE
    constraint_record record;
    v_table_name text;
    v_column_name text;
BEGIN
    FOR constraint_record IN
        SELECT c.conrelid::regclass AS table_name, c.conname
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE c.contype = 'f'
          AND n.nspname = 'public'
          AND cl.relname = ANY (ARRAY[
              'real_estate_profiles',
              'agents',
              'properties',
              'property_media',
              'property_documents',
              'property_leads',
              'property_lead_events',
              'property_ai_generations',
              'property_campaigns',
              'property_open_houses',
              'property_favorites',
              'property_saved_searches'
          ])
          AND EXISTS (
              SELECT 1
              FROM unnest(c.conkey) key(attnum)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = key.attnum
              WHERE a.attname IN ('user_id', 'project_id', 'tenant_id')
          )
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', constraint_record.table_name, constraint_record.conname);
    END LOOP;

    FOREACH v_table_name IN ARRAY ARRAY[
        'real_estate_profiles',
        'agents',
        'properties',
        'property_media',
        'property_documents',
        'property_leads',
        'property_lead_events',
        'property_ai_generations',
        'property_campaigns',
        'property_open_houses',
        'property_favorites',
        'property_saved_searches'
    ]
    LOOP
        FOREACH v_column_name IN ARRAY ARRAY['user_id', 'project_id', 'tenant_id']
        LOOP
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = v_table_name
                  AND column_name = v_column_name
                  AND data_type <> 'text'
            ) THEN
                EXECUTE format(
                    'ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',
                    v_table_name,
                    v_column_name,
                    v_column_name
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- Ensure the complete Realty properties contract exists, without dropping legacy columns.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description_short text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description_long text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'sale';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS address_line_1 text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS address_line_2 text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS half_bathrooms numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS area_sqft numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lot_sqft numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS hoa_fee numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS taxes numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS amenities jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS main_image_url text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS virtual_tour_url text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_score integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lead_count integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_enabled boolean DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'properties'
          AND column_name = 'amenities'
          AND udt_name <> 'jsonb'
    ) THEN
        ALTER TABLE public.properties
            ALTER COLUMN amenities DROP DEFAULT,
            ALTER COLUMN amenities TYPE jsonb USING to_jsonb(amenities),
            ALTER COLUMN amenities SET DEFAULT '[]'::jsonb;
    END IF;
END;
$$;

UPDATE public.properties p
SET
    tenant_id = COALESCE(p.tenant_id, pr.tenant_id::text),
    user_id = COALESCE(p.user_id, pr.user_id::text, t.owner_user_id::text),
    description_long = COALESCE(p.description_long, p.description),
    description_short = COALESCE(p.description_short, NULLIF(left(COALESCE(p.description, ''), 240), '')),
    address_line_1 = COALESCE(p.address_line_1, p.address),
    postal_code = COALESCE(p.postal_code, p.zip_code),
    area_sqft = COALESCE(p.area_sqft, p.square_feet::numeric),
    lot_sqft = COALESCE(p.lot_sqft, p.lot_size),
    main_image_url = COALESCE(p.main_image_url, p.images->0->>'url')
FROM public.projects pr
LEFT JOIN public.tenants t ON t.id = pr.tenant_id
WHERE p.project_id = pr.id::text
  AND (
    p.tenant_id IS NULL
    OR p.user_id IS NULL
    OR p.description_long IS NULL
    OR p.description_short IS NULL
    OR p.address_line_1 IS NULL
    OR p.postal_code IS NULL
    OR p.area_sqft IS NULL
    OR p.lot_sqft IS NULL
    OR p.main_image_url IS NULL
  );

-- Defaults and timestamps for every Realty table.
DO $$
DECLARE
    v_table_name text;
BEGIN
    FOREACH v_table_name IN ARRAY ARRAY[
        'real_estate_profiles',
        'agents',
        'properties',
        'property_media',
        'property_documents',
        'property_leads',
        'property_lead_events',
        'property_ai_generations',
        'property_campaigns',
        'property_open_houses',
        'property_favorites',
        'property_saved_searches'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN created_at SET DEFAULT now()', v_table_name);
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN updated_at SET DEFAULT now()', v_table_name);
    END LOOP;
END;
$$;

-- Indexes required by the Realty Suite data access paths.
CREATE UNIQUE INDEX IF NOT EXISTS properties_project_slug_unique_idx ON public.properties(project_id, slug);
CREATE INDEX IF NOT EXISTS properties_user_id_idx ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS properties_project_id_idx ON public.properties(project_id);
CREATE INDEX IF NOT EXISTS properties_tenant_id_idx ON public.properties(tenant_id);
CREATE INDEX IF NOT EXISTS properties_status_idx ON public.properties(status);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS properties_transaction_type_idx ON public.properties(transaction_type);
CREATE INDEX IF NOT EXISTS properties_city_idx ON public.properties(city);
CREATE INDEX IF NOT EXISTS properties_slug_idx ON public.properties(slug);
CREATE INDEX IF NOT EXISTS properties_agent_id_idx ON public.properties(agent_id);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON public.properties(created_at);

CREATE INDEX IF NOT EXISTS agents_user_id_idx ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS agents_project_id_idx ON public.agents(project_id);
CREATE INDEX IF NOT EXISTS agents_tenant_id_idx ON public.agents(tenant_id);
CREATE INDEX IF NOT EXISTS agents_created_at_idx ON public.agents(created_at);

CREATE INDEX IF NOT EXISTS real_estate_profiles_user_id_idx ON public.real_estate_profiles(user_id);
CREATE INDEX IF NOT EXISTS real_estate_profiles_project_id_idx ON public.real_estate_profiles(project_id);
CREATE INDEX IF NOT EXISTS real_estate_profiles_tenant_id_idx ON public.real_estate_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS real_estate_profiles_created_at_idx ON public.real_estate_profiles(created_at);

CREATE INDEX IF NOT EXISTS property_media_user_id_idx ON public.property_media(user_id);
CREATE INDEX IF NOT EXISTS property_media_project_id_idx ON public.property_media(project_id);
CREATE INDEX IF NOT EXISTS property_media_tenant_id_idx ON public.property_media(tenant_id);
CREATE INDEX IF NOT EXISTS property_media_property_id_idx ON public.property_media(property_id);
CREATE INDEX IF NOT EXISTS property_media_created_at_idx ON public.property_media(created_at);
CREATE INDEX IF NOT EXISTS property_media_storage_path_idx ON public.property_media(storage_path);

CREATE INDEX IF NOT EXISTS property_documents_user_id_idx ON public.property_documents(user_id);
CREATE INDEX IF NOT EXISTS property_documents_project_id_idx ON public.property_documents(project_id);
CREATE INDEX IF NOT EXISTS property_documents_tenant_id_idx ON public.property_documents(tenant_id);
CREATE INDEX IF NOT EXISTS property_documents_property_id_idx ON public.property_documents(property_id);
CREATE INDEX IF NOT EXISTS property_documents_created_at_idx ON public.property_documents(created_at);
CREATE INDEX IF NOT EXISTS property_documents_storage_path_idx ON public.property_documents(storage_path);

CREATE INDEX IF NOT EXISTS property_leads_user_id_idx ON public.property_leads(user_id);
CREATE INDEX IF NOT EXISTS property_leads_project_id_idx ON public.property_leads(project_id);
CREATE INDEX IF NOT EXISTS property_leads_tenant_id_idx ON public.property_leads(tenant_id);
CREATE INDEX IF NOT EXISTS property_leads_property_id_idx ON public.property_leads(property_id);
CREATE INDEX IF NOT EXISTS property_leads_stage_idx ON public.property_leads(stage);
CREATE INDEX IF NOT EXISTS property_leads_created_at_idx ON public.property_leads(created_at);

CREATE INDEX IF NOT EXISTS property_lead_events_user_id_idx ON public.property_lead_events(user_id);
CREATE INDEX IF NOT EXISTS property_lead_events_project_id_idx ON public.property_lead_events(project_id);
CREATE INDEX IF NOT EXISTS property_lead_events_tenant_id_idx ON public.property_lead_events(tenant_id);
CREATE INDEX IF NOT EXISTS property_lead_events_property_id_idx ON public.property_lead_events(property_id);
CREATE INDEX IF NOT EXISTS property_lead_events_lead_id_idx ON public.property_lead_events(property_lead_id);
CREATE INDEX IF NOT EXISTS property_lead_events_created_at_idx ON public.property_lead_events(created_at);

CREATE INDEX IF NOT EXISTS property_ai_generations_user_id_idx ON public.property_ai_generations(user_id);
CREATE INDEX IF NOT EXISTS property_ai_generations_project_id_idx ON public.property_ai_generations(project_id);
CREATE INDEX IF NOT EXISTS property_ai_generations_tenant_id_idx ON public.property_ai_generations(tenant_id);
CREATE INDEX IF NOT EXISTS property_ai_generations_property_id_idx ON public.property_ai_generations(property_id);
CREATE INDEX IF NOT EXISTS property_ai_generations_created_at_idx ON public.property_ai_generations(created_at);

CREATE INDEX IF NOT EXISTS property_campaigns_user_id_idx ON public.property_campaigns(user_id);
CREATE INDEX IF NOT EXISTS property_campaigns_project_id_idx ON public.property_campaigns(project_id);
CREATE INDEX IF NOT EXISTS property_campaigns_tenant_id_idx ON public.property_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS property_campaigns_property_id_idx ON public.property_campaigns(property_id);
CREATE INDEX IF NOT EXISTS property_campaigns_created_at_idx ON public.property_campaigns(created_at);

CREATE INDEX IF NOT EXISTS property_open_houses_user_id_idx ON public.property_open_houses(user_id);
CREATE INDEX IF NOT EXISTS property_open_houses_project_id_idx ON public.property_open_houses(project_id);
CREATE INDEX IF NOT EXISTS property_open_houses_tenant_id_idx ON public.property_open_houses(tenant_id);
CREATE INDEX IF NOT EXISTS property_open_houses_property_id_idx ON public.property_open_houses(property_id);
CREATE INDEX IF NOT EXISTS property_open_houses_created_at_idx ON public.property_open_houses(created_at);

CREATE INDEX IF NOT EXISTS property_favorites_user_id_idx ON public.property_favorites(user_id);
CREATE INDEX IF NOT EXISTS property_favorites_project_id_idx ON public.property_favorites(project_id);
CREATE INDEX IF NOT EXISTS property_favorites_tenant_id_idx ON public.property_favorites(tenant_id);
CREATE INDEX IF NOT EXISTS property_favorites_property_id_idx ON public.property_favorites(property_id);
CREATE INDEX IF NOT EXISTS property_favorites_created_at_idx ON public.property_favorites(created_at);

CREATE INDEX IF NOT EXISTS property_saved_searches_user_id_idx ON public.property_saved_searches(user_id);
CREATE INDEX IF NOT EXISTS property_saved_searches_project_id_idx ON public.property_saved_searches(project_id);
CREATE INDEX IF NOT EXISTS property_saved_searches_tenant_id_idx ON public.property_saved_searches(tenant_id);
CREATE INDEX IF NOT EXISTS property_saved_searches_created_at_idx ON public.property_saved_searches(created_at);

-- updated_at triggers.
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
DROP TRIGGER IF EXISTS set_properties_realty_updated_at ON public.properties;
CREATE TRIGGER set_properties_realty_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_real_estate_profiles_updated_at ON public.real_estate_profiles;
CREATE TRIGGER set_real_estate_profiles_updated_at BEFORE UPDATE ON public.real_estate_profiles FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_agents_updated_at ON public.agents;
CREATE TRIGGER set_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_media_updated_at ON public.property_media;
CREATE TRIGGER set_property_media_updated_at BEFORE UPDATE ON public.property_media FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_documents_updated_at ON public.property_documents;
CREATE TRIGGER set_property_documents_updated_at BEFORE UPDATE ON public.property_documents FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_leads_updated_at ON public.property_leads;
CREATE TRIGGER set_property_leads_updated_at BEFORE UPDATE ON public.property_leads FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_lead_events_updated_at ON public.property_lead_events;
CREATE TRIGGER set_property_lead_events_updated_at BEFORE UPDATE ON public.property_lead_events FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_ai_generations_updated_at ON public.property_ai_generations;
CREATE TRIGGER set_property_ai_generations_updated_at BEFORE UPDATE ON public.property_ai_generations FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_campaigns_updated_at ON public.property_campaigns;
CREATE TRIGGER set_property_campaigns_updated_at BEFORE UPDATE ON public.property_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_open_houses_updated_at ON public.property_open_houses;
CREATE TRIGGER set_property_open_houses_updated_at BEFORE UPDATE ON public.property_open_houses FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_favorites_updated_at ON public.property_favorites;
CREATE TRIGGER set_property_favorites_updated_at BEFORE UPDATE ON public.property_favorites FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_property_saved_searches_updated_at ON public.property_saved_searches;
CREATE TRIGGER set_property_saved_searches_updated_at BEFORE UPDATE ON public.property_saved_searches FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

-- Data API grants. RLS remains the source of row-level access.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.properties TO anon;
GRANT SELECT ON public.property_media TO anon;
GRANT INSERT ON public.property_leads TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.real_estate_profiles,
    public.agents,
    public.properties,
    public.property_media,
    public.property_documents,
    public.property_leads,
    public.property_lead_events,
    public.property_ai_generations,
    public.property_campaigns,
    public.property_open_houses,
    public.property_favorites,
    public.property_saved_searches
TO authenticated;

-- RLS policies.
ALTER TABLE public.real_estate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_open_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active public properties"
ON public.properties FOR SELECT
TO anon, authenticated
USING (status = 'active' AND public_enabled = true);

CREATE POLICY "Realty members can select properties"
ON public.properties FOR SELECT
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members can insert properties"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members can update properties"
ON public.properties FOR UPDATE
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members can delete properties"
ON public.properties FOR DELETE
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage profiles"
ON public.real_estate_profiles FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage agents"
ON public.agents FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Public can read media for public properties"
ON public.property_media FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.properties p
        WHERE p.id = property_media.property_id
          AND p.status = 'active'
          AND p.public_enabled = true
    )
);

CREATE POLICY "Realty members manage property media"
ON public.property_media FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage property documents"
ON public.property_documents FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Public can insert leads for public properties"
ON public.property_leads FOR INSERT
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.properties p
        WHERE p.id = property_leads.property_id
          AND p.status = 'active'
          AND p.public_enabled = true
          AND p.user_id = property_leads.user_id
          AND (property_leads.project_id IS NULL OR property_leads.project_id = '' OR p.project_id = property_leads.project_id)
    )
);

CREATE POLICY "Realty members manage property leads"
ON public.property_leads FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage property lead events"
ON public.property_lead_events FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage property AI generations"
ON public.property_ai_generations FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage property campaigns"
ON public.property_campaigns FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage property open houses"
ON public.property_open_houses FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage property favorites"
ON public.property_favorites FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Realty members manage property saved searches"
ON public.property_saved_searches FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

-- The original helper lived in public. Policies above no longer depend on it.
DO $$
BEGIN
    IF to_regprocedure('public.can_manage_realty_record(uuid, uuid, uuid)') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.can_manage_realty_record(uuid, uuid, uuid) FROM PUBLIC;
    END IF;
END;
$$;
DROP FUNCTION IF EXISTS public.can_manage_realty_record(uuid, uuid, uuid);

-- Storage buckets and policies.
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('property-media', 'property-media', false),
    ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO UPDATE
SET public = excluded.public;

DO $$
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = ANY (ARRAY[
              'Property media public read for public properties',
              'Property media owners can read',
              'Property media owners can upload',
              'Property media owners can update',
              'Property media owners can delete',
              'Property documents owners can read',
              'Property documents owners can upload',
              'Property documents owners can update',
              'Property documents owners can delete'
          ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
    END LOOP;
END;
$$;

CREATE POLICY "Property media public read for public properties"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'property-media'
    AND EXISTS (
        SELECT 1
        FROM public.property_media pm
        JOIN public.properties p ON p.id = pm.property_id
        WHERE pm.storage_path = storage.objects.name
          AND p.status = 'active'
          AND p.public_enabled = true
    )
);

CREATE POLICY "Property media owners can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Property media owners can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Property media owners can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Property media owners can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Property documents owners can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Property documents owners can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Property documents owners can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Property documents owners can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
