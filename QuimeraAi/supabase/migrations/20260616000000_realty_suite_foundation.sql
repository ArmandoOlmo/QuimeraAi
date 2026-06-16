-- Quimera Realty Suite Supabase foundation
-- Incremental, non-destructive alignment of the legacy public.properties table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_realty_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_realty_record(
    p_project_id uuid,
    p_tenant_id uuid,
    p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
      AND (
        (SELECT auth.uid()) = p_user_id
        OR EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id = p_project_id
              AND (
                p.user_id = (SELECT auth.uid())
                OR EXISTS (
                    SELECT 1
                    FROM public.tenant_members tm
                    WHERE tm.tenant_id = p.tenant_id
                      AND tm.user_id = (SELECT auth.uid())
                )
              )
        )
        OR EXISTS (
            SELECT 1
            FROM public.tenant_members tm
            WHERE tm.tenant_id = p_tenant_id
              AND tm.user_id = (SELECT auth.uid())
        )
      );
$$;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.real_estate_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    brokerage_name text,
    license_number text,
    phone text,
    email text,
    website text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    photo_url text,
    license_number text,
    bio text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Existing legacy table created in 20260505000008_real_estate_schema.sql.
-- Add the richer Realty Suite contract without dropping legacy columns.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
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
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS main_image_url text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_score integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lead_count integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_enabled boolean DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

UPDATE public.properties p
SET
    user_id = COALESCE(p.user_id, pr.user_id, t.owner_user_id),
    tenant_id = COALESCE(p.tenant_id, pr.tenant_id),
    description_long = COALESCE(p.description_long, p.description),
    description_short = COALESCE(p.description_short, NULLIF(left(COALESCE(p.description, ''), 240), '')),
    address_line_1 = COALESCE(p.address_line_1, p.address),
    postal_code = COALESCE(p.postal_code, p.zip_code),
    area_sqft = COALESCE(p.area_sqft, p.square_feet::numeric),
    lot_sqft = COALESCE(p.lot_sqft, p.lot_size),
    main_image_url = COALESCE(p.main_image_url, p.images->0->>'url'),
    public_enabled = CASE WHEN p.status = 'active' THEN true ELSE COALESCE(p.public_enabled, false) END
FROM public.projects pr
LEFT JOIN public.tenants t ON t.id = pr.tenant_id
WHERE p.project_id = pr.id;

ALTER TABLE public.properties ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.properties ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.properties ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.properties ALTER COLUMN property_type SET NOT NULL;

-- Legacy amenities was text[]. Align to jsonb for richer component data.
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

CREATE TABLE IF NOT EXISTS public.property_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    url text NOT NULL,
    storage_path text,
    media_type text DEFAULT 'image',
    alt_text text,
    position integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_url text,
    storage_path text,
    document_type text DEFAULT 'other',
    is_private boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text,
    stage text DEFAULT 'new',
    lead_type text DEFAULT 'buyer',
    preferred_date timestamptz,
    budget numeric,
    source text DEFAULT 'realty-website',
    crm_lead_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_lead_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    property_lead_id uuid NOT NULL REFERENCES public.property_leads(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    note text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_ai_generations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    kind text NOT NULL,
    prompt text NOT NULL,
    output text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    campaign_type text NOT NULL DEFAULT 'social',
    title text NOT NULL,
    status text DEFAULT 'draft',
    content jsonb DEFAULT '{}'::jsonb,
    scheduled_at timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_open_houses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz,
    timezone text DEFAULT 'America/Puerto_Rico',
    status text DEFAULT 'scheduled',
    notes text,
    registration_enabled boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    visitor_id text,
    email text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_saved_searches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text,
    email text,
    criteria jsonb DEFAULT '{}'::jsonb,
    frequency text DEFAULT 'weekly',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS properties_project_slug_unique_idx ON public.properties(project_id, slug);
CREATE INDEX IF NOT EXISTS properties_user_id_idx ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS properties_tenant_id_idx ON public.properties(tenant_id);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS properties_transaction_type_idx ON public.properties(transaction_type);
CREATE INDEX IF NOT EXISTS properties_city_idx ON public.properties(city);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON public.properties(created_at);
CREATE INDEX IF NOT EXISTS properties_agent_id_idx ON public.properties(agent_id);

CREATE INDEX IF NOT EXISTS agents_user_id_idx ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS agents_project_id_idx ON public.agents(project_id);
CREATE INDEX IF NOT EXISTS agents_tenant_id_idx ON public.agents(tenant_id);

CREATE INDEX IF NOT EXISTS real_estate_profiles_user_id_idx ON public.real_estate_profiles(user_id);
CREATE INDEX IF NOT EXISTS real_estate_profiles_project_id_idx ON public.real_estate_profiles(project_id);
CREATE INDEX IF NOT EXISTS real_estate_profiles_tenant_id_idx ON public.real_estate_profiles(tenant_id);

CREATE INDEX IF NOT EXISTS property_media_user_id_idx ON public.property_media(user_id);
CREATE INDEX IF NOT EXISTS property_media_project_id_idx ON public.property_media(project_id);
CREATE INDEX IF NOT EXISTS property_media_tenant_id_idx ON public.property_media(tenant_id);
CREATE INDEX IF NOT EXISTS property_media_property_id_idx ON public.property_media(property_id);
CREATE INDEX IF NOT EXISTS property_media_position_idx ON public.property_media(property_id, position);

CREATE INDEX IF NOT EXISTS property_documents_user_id_idx ON public.property_documents(user_id);
CREATE INDEX IF NOT EXISTS property_documents_project_id_idx ON public.property_documents(project_id);
CREATE INDEX IF NOT EXISTS property_documents_tenant_id_idx ON public.property_documents(tenant_id);
CREATE INDEX IF NOT EXISTS property_documents_property_id_idx ON public.property_documents(property_id);

CREATE INDEX IF NOT EXISTS property_leads_user_id_idx ON public.property_leads(user_id);
CREATE INDEX IF NOT EXISTS property_leads_project_id_idx ON public.property_leads(project_id);
CREATE INDEX IF NOT EXISTS property_leads_tenant_id_idx ON public.property_leads(tenant_id);
CREATE INDEX IF NOT EXISTS property_leads_property_id_idx ON public.property_leads(property_id);
CREATE INDEX IF NOT EXISTS property_leads_stage_idx ON public.property_leads(stage);
CREATE INDEX IF NOT EXISTS property_leads_created_at_idx ON public.property_leads(created_at);

CREATE INDEX IF NOT EXISTS property_lead_events_user_id_idx ON public.property_lead_events(user_id);
CREATE INDEX IF NOT EXISTS property_lead_events_project_id_idx ON public.property_lead_events(project_id);
CREATE INDEX IF NOT EXISTS property_lead_events_tenant_id_idx ON public.property_lead_events(tenant_id);
CREATE INDEX IF NOT EXISTS property_lead_events_lead_id_idx ON public.property_lead_events(property_lead_id);

CREATE INDEX IF NOT EXISTS property_ai_generations_user_id_idx ON public.property_ai_generations(user_id);
CREATE INDEX IF NOT EXISTS property_ai_generations_project_id_idx ON public.property_ai_generations(project_id);
CREATE INDEX IF NOT EXISTS property_ai_generations_tenant_id_idx ON public.property_ai_generations(tenant_id);
CREATE INDEX IF NOT EXISTS property_ai_generations_property_id_idx ON public.property_ai_generations(property_id);

CREATE INDEX IF NOT EXISTS property_campaigns_user_id_idx ON public.property_campaigns(user_id);
CREATE INDEX IF NOT EXISTS property_campaigns_project_id_idx ON public.property_campaigns(project_id);
CREATE INDEX IF NOT EXISTS property_campaigns_tenant_id_idx ON public.property_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS property_campaigns_property_id_idx ON public.property_campaigns(property_id);

CREATE INDEX IF NOT EXISTS property_open_houses_user_id_idx ON public.property_open_houses(user_id);
CREATE INDEX IF NOT EXISTS property_open_houses_project_id_idx ON public.property_open_houses(project_id);
CREATE INDEX IF NOT EXISTS property_open_houses_tenant_id_idx ON public.property_open_houses(tenant_id);
CREATE INDEX IF NOT EXISTS property_open_houses_property_id_idx ON public.property_open_houses(property_id);

CREATE INDEX IF NOT EXISTS property_favorites_user_id_idx ON public.property_favorites(user_id);
CREATE INDEX IF NOT EXISTS property_favorites_project_id_idx ON public.property_favorites(project_id);
CREATE INDEX IF NOT EXISTS property_favorites_tenant_id_idx ON public.property_favorites(tenant_id);
CREATE INDEX IF NOT EXISTS property_favorites_property_id_idx ON public.property_favorites(property_id);

CREATE INDEX IF NOT EXISTS property_saved_searches_user_id_idx ON public.property_saved_searches(user_id);
CREATE INDEX IF NOT EXISTS property_saved_searches_project_id_idx ON public.property_saved_searches(project_id);
CREATE INDEX IF NOT EXISTS property_saved_searches_tenant_id_idx ON public.property_saved_searches(tenant_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Data API grants
-- New Supabase projects may not expose SQL-created tables automatically.
-- RLS still controls row-level visibility after these grants.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_realty_record(uuid, uuid, uuid) TO authenticated;
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

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Public read access for active properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can view all their properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can create properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can update properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete properties" ON public.properties;

CREATE POLICY "Public can read active public properties"
ON public.properties FOR SELECT
TO anon, authenticated
USING (status = 'active' AND public_enabled = true);

CREATE POLICY "Users can select own properties"
ON public.properties FOR SELECT
TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users can insert own properties"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id AND public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users can update own properties"
ON public.properties FOR UPDATE
TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users can delete own properties"
ON public.properties FOR DELETE
TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id));

-- Own-record policies for tables with direct user_id ownership.
CREATE POLICY "Users manage own real estate profiles" ON public.real_estate_profiles
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users manage own agents" ON public.agents
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

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

CREATE POLICY "Users manage own property media" ON public.property_media
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users manage own property documents" ON public.property_documents
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Public can insert leads for public properties"
ON public.property_leads FOR INSERT
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.properties p
        WHERE p.id = property_leads.property_id
          AND p.project_id = property_leads.project_id
          AND p.user_id = property_leads.user_id
          AND p.status = 'active'
          AND p.public_enabled = true
    )
);

CREATE POLICY "Users manage own property leads" ON public.property_leads
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users manage own property lead events" ON public.property_lead_events
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users manage own property AI generations" ON public.property_ai_generations
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users manage own property campaigns" ON public.property_campaigns
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users manage own property open houses" ON public.property_open_houses
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users manage own property favorites" ON public.property_favorites
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

CREATE POLICY "Users manage own property saved searches" ON public.property_saved_searches
FOR ALL TO authenticated
USING (public.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (public.can_manage_realty_record(project_id, tenant_id, user_id));

-- ---------------------------------------------------------------------------
-- Storage buckets and policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('property-media', 'property-media', false),
    ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Property media public read for public properties" ON storage.objects;
DROP POLICY IF EXISTS "Property media owners can read" ON storage.objects;
DROP POLICY IF EXISTS "Property media owners can upload" ON storage.objects;
DROP POLICY IF EXISTS "Property media owners can update" ON storage.objects;
DROP POLICY IF EXISTS "Property media owners can delete" ON storage.objects;
DROP POLICY IF EXISTS "Property documents owners can read" ON storage.objects;
DROP POLICY IF EXISTS "Property documents owners can upload" ON storage.objects;
DROP POLICY IF EXISTS "Property documents owners can update" ON storage.objects;
DROP POLICY IF EXISTS "Property documents owners can delete" ON storage.objects;

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
