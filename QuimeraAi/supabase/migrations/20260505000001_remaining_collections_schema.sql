-- ========================================================================================
-- QUIMERA AI: REMAINING FIREBASE COLLECTIONS MIGRATION
-- This script creates the Supabase tables necessary to fully sunset Firebase Firestore.
-- Covers CMS, CRM (Leads), Files, Custom Components, Prompts, and Admin Settings.
-- ========================================================================================

-- Cleanup any existing incomplete tables
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.lead_activities CASCADE;
DROP TABLE IF EXISTS public.lead_tasks CASCADE;
DROP TABLE IF EXISTS public.library_leads CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.global_files CASCADE;
DROP TABLE IF EXISTS public.admin_assets CASCADE;
DROP TABLE IF EXISTS public.custom_components CASCADE;
DROP TABLE IF EXISTS public.component_defaults CASCADE;
DROP TABLE IF EXISTS public.prompts CASCADE;
DROP TABLE IF EXISTS public.pending_admins CASCADE;

-- 1. CMS POSTS
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid,
    title text NOT NULL,
    slug text,
    content text,
    excerpt text,
    featured_image text,
    category text,
    status text DEFAULT 'draft',
    tags text[],
    author_name text,
    published_at timestamptz,
    is_featured boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. CRM LEADS
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    project_id text NOT NULL,
    name text,
    email text,
    phone text,
    company text,
    status text,
    source text,
    value numeric,
    tags text[],
    notes text,
    custom_data jsonb,
    last_contact_date timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    project_id text NOT NULL,
    type text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    project_id text NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamptz,
    status text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.library_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    project_id text NOT NULL,
    name text,
    email text,
    phone text,
    company text,
    industry text,
    source text,
    status text,
    is_imported boolean DEFAULT false,
    imported_at timestamptz,
    imported_lead_id uuid,
    created_at timestamptz DEFAULT now()
);

-- 3. FILES & ASSETS
CREATE TABLE IF NOT EXISTS public.files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    project_id text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    size integer,
    type text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.global_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    url text NOT NULL,
    size integer,
    type text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    url text NOT NULL,
    size integer,
    type text,
    category text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- 4. EDITOR & COMPONENTS
CREATE TABLE IF NOT EXISTS public.custom_components (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    icon text,
    data jsonb,
    is_global boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.component_defaults (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL UNIQUE,
    data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. ADMIN SETTINGS
CREATE TABLE IF NOT EXISTS public.prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    content text NOT NULL,
    type text,
    category text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pending_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    role text DEFAULT 'admin',
    invited_by uuid,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);


-- ========================================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================================================================

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_admins ENABLE ROW LEVEL SECURITY;

-- ========================================================================================
-- RLS POLICIES
-- ========================================================================================

-- CMS Posts: Public read, but users manage their tenant's posts
CREATE POLICY "Public can view published posts" ON public.posts FOR SELECT USING (status = 'published');
CREATE POLICY "Tenant members can view all their posts" ON public.posts FOR SELECT USING (tenant_id IN (SELECT public.get_auth_user_tenants()));
CREATE POLICY "Tenant members can manage their posts" ON public.posts FOR ALL USING (tenant_id IN (SELECT public.get_auth_user_tenants()));

-- CRM (Leads, Activities, Tasks, Library): Strictly isolated to tenant members
CREATE POLICY "Tenant members can manage leads" ON public.leads FOR ALL USING (tenant_id IN (SELECT public.get_auth_user_tenants()));
CREATE POLICY "Tenant members can manage lead activities" ON public.lead_activities FOR ALL USING (tenant_id IN (SELECT public.get_auth_user_tenants()));
CREATE POLICY "Tenant members can manage lead tasks" ON public.lead_tasks FOR ALL USING (tenant_id IN (SELECT public.get_auth_user_tenants()));
CREATE POLICY "Tenant members can manage library leads" ON public.library_leads FOR ALL USING (tenant_id IN (SELECT public.get_auth_user_tenants()));

-- Files: Public read, tenant isolated write
CREATE POLICY "Public can view files" ON public.files FOR SELECT USING (true);
CREATE POLICY "Tenant members can manage their files" ON public.files FOR ALL USING (tenant_id IN (SELECT public.get_auth_user_tenants()));

-- Global Files & Admin Assets: Public read, superadmin write
CREATE POLICY "Public can view global files" ON public.global_files FOR SELECT USING (true);
CREATE POLICY "Superadmins can manage global files" ON public.global_files FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin'));

CREATE POLICY "Public can view admin assets" ON public.admin_assets FOR SELECT USING (true);
CREATE POLICY "Superadmins can manage admin assets" ON public.admin_assets FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin'));

-- Components: Public read, superadmin write (or tenant write if not global)
CREATE POLICY "Public can view global components" ON public.custom_components FOR SELECT USING (is_global = true);
CREATE POLICY "Tenant members can view their components" ON public.custom_components FOR SELECT USING (tenant_id IN (SELECT public.get_auth_user_tenants()));
CREATE POLICY "Tenant members can manage their components" ON public.custom_components FOR ALL USING (tenant_id IN (SELECT public.get_auth_user_tenants()));
CREATE POLICY "Superadmins can manage all components" ON public.custom_components FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin'));

CREATE POLICY "Public can view component defaults" ON public.component_defaults FOR SELECT USING (true);
CREATE POLICY "Superadmins can manage component defaults" ON public.component_defaults FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin'));

-- Prompts: Superadmin only
CREATE POLICY "Superadmins can manage prompts" ON public.prompts FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin'));

-- Pending Admins: Superadmin only
CREATE POLICY "Superadmins can manage pending admins" ON public.pending_admins FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin'));
