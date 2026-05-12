CREATE TABLE public.deployment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  domain_id TEXT,
  action TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  error TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.deployment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deployment logs isolated by tenant" 
ON public.deployment_logs 
FOR ALL 
USING (tenant_id IN (SELECT public.get_auth_user_tenants()));
