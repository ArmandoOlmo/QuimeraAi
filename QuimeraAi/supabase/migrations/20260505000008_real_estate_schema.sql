-- Real Estate Schema

-- Use gen_random_uuid() from pgcrypto (enabled by default in Supabase)

-- Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    property_type TEXT NOT NULL DEFAULT 'house',
    bedrooms INTEGER DEFAULT 0,
    bathrooms NUMERIC DEFAULT 0,
    square_feet INTEGER DEFAULT 0,
    year_built INTEGER,
    parking_spaces INTEGER,
    lot_size NUMERIC,
    latitude NUMERIC,
    longitude NUMERIC,
    amenities TEXT[] DEFAULT '{}',
    images JSONB DEFAULT '[]', -- Array of PropertyImage objects
    video_url TEXT,
    virtual_tour_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS properties_project_id_idx ON public.properties(project_id);
CREATE INDEX IF NOT EXISTS properties_status_idx ON public.properties(status);
CREATE INDEX IF NOT EXISTS properties_slug_idx ON public.properties(slug);

-- RLS Policies
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Access (for Active properties)
CREATE POLICY "Public read access for active properties"
    ON public.properties FOR SELECT
    USING (status = 'active');

-- 2. Owner Read Access (all statuses)
CREATE POLICY "Owners can view all their properties"
    ON public.properties FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid() OR tenant_id IN (
                SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
            )
        )
    );

-- 3. Owner Insert Access
CREATE POLICY "Owners can create properties"
    ON public.properties FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid() OR tenant_id IN (
                SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
            )
        )
    );

-- 4. Owner Update Access
CREATE POLICY "Owners can update properties"
    ON public.properties FOR UPDATE
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid() OR tenant_id IN (
                SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid() OR tenant_id IN (
                SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
            )
        )
    );

-- 5. Owner Delete Access
CREATE POLICY "Owners can delete properties"
    ON public.properties FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid() OR tenant_id IN (
                SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
            )
        )
    );

-- Automatic updated_at trigger
CREATE OR REPLACE FUNCTION update_properties_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION update_properties_updated_at_column();
