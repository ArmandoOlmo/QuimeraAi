-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Las tablas están vacías según la consulta a la API, así que las eliminamos
-- para asegurarnos de que el esquema sea el correcto para nuestra migración.
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.tenant_members CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==========================================
-- 1. USERS (Perfil Extendido)
-- ==========================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,
  role TEXT DEFAULT 'user',
  preferences JSONB DEFAULT '{}'::jsonb,
  onboarding_state JSONB DEFAULT '{}'::jsonb,
  job_title TEXT,
  bio TEXT,
  phone TEXT,
  department TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Disparador para crear el perfil automáticamente cuando un usuario se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, photo_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email, 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 2. TENANTS (Workspaces / Agencias)
-- ==========================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  company_name TEXT,
  type TEXT NOT NULL, -- 'individual' | 'agency_client'
  owner_user_id UUID REFERENCES public.users(id),
  owner_tenant_id UUID REFERENCES public.tenants(id), -- Para sub-clientes
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing JSONB DEFAULT '{}'::jsonb,
  trial_ends_at TIMESTAMPTZ,
  parent_credits_pool_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

-- ==========================================
-- 3. TENANT MEMBERS (Membresías / Permisos)
-- ==========================================
CREATE TABLE public.tenant_members (
  id TEXT PRIMARY KEY, -- ID Compuesto: tenantId_userId
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agency_member',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  invited_by UUID REFERENCES public.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_access_at TIMESTAMPTZ,
  title TEXT,
  department TEXT,
  UNIQUE(tenant_id, user_id)
);

-- ==========================================
-- 4. PROJECTS (Websites)
-- ==========================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  favicon_url TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  pages JSONB DEFAULT '[]'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,
  theme JSONB DEFAULT '{}'::jsonb,
  brand_identity JSONB DEFAULT '{}'::jsonb,
  component_order JSONB DEFAULT '[]'::jsonb,
  section_visibility JSONB DEFAULT '{}'::jsonb,
  source_template_id UUID,
  menus JSONB DEFAULT '[]'::jsonb,
  ai_assistant_config JSONB DEFAULT '{}'::jsonb,
  seo_config JSONB DEFAULT '{}'::jsonb,
  crm_config JSONB DEFAULT '{}'::jsonb,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- SEGURIDAD (Row Level Security - RLS)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON public.users;
CREATE POLICY "Users can view and edit their own profile" ON public.users FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Tenants readable by members" ON public.tenants;
CREATE POLICY "Tenants readable by members" ON public.tenants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenant_members WHERE tenant_id = tenants.id AND user_id = auth.uid())
  OR owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Tenant members readable by members" ON public.tenant_members;
CREATE POLICY "Tenant members readable by members" ON public.tenant_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_members.tenant_id AND tm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Projects readable by tenant members" ON public.projects;
CREATE POLICY "Projects readable by tenant members" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenant_members WHERE tenant_id = projects.tenant_id AND user_id = auth.uid())
);
