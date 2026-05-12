-- 1. Fix infinite recursion in tenant_members
DROP POLICY IF EXISTS "Tenant members readable by members" ON public.tenant_members;

-- Create a security definer function to get user's tenants without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.get_auth_user_tenants()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Tenant members readable by members" ON public.tenant_members 
FOR SELECT USING (
  user_id = auth.uid() OR 
  tenant_id IN (SELECT public.get_auth_user_tenants())
);

-- 2. Create missing settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id)
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings readable by everyone" ON public.settings;
CREATE POLICY "Settings readable by everyone" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Settings editable by superadmins" ON public.settings;
CREATE POLICY "Settings editable by superadmins" ON public.settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin')
);

-- 3. Create missing service_audit_logs table
CREATE TABLE IF NOT EXISTS public.service_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES public.users(id),
  user_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.service_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs readable by superadmins" ON public.service_audit_logs;
CREATE POLICY "Audit logs readable by superadmins" ON public.service_audit_logs FOR SELECT USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin')
);
DROP POLICY IF EXISTS "Audit logs insertable by superadmins" ON public.service_audit_logs;
CREATE POLICY "Audit logs insertable by superadmins" ON public.service_audit_logs FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'superadmin')
);

-- 4. Create missing onboarding_progress table
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_step TEXT,
  completed BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own onboarding" ON public.onboarding_progress;
CREATE POLICY "Users can manage their own onboarding" ON public.onboarding_progress FOR ALL USING (
  id = auth.uid()
);

-- 5. Create missing custom_domains table
CREATE TABLE IF NOT EXISTS public.custom_domains (
  domain TEXT PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending',
  ssl_status TEXT DEFAULT 'pending',
  dns_verified BOOLEAN DEFAULT false,
  cloud_run_target TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read custom domains" ON public.custom_domains;
CREATE POLICY "Users can read custom domains" ON public.custom_domains FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage their own custom domains" ON public.custom_domains;
CREATE POLICY "Users can manage their own custom domains" ON public.custom_domains FOR ALL USING (
  user_id = auth.uid()
);
