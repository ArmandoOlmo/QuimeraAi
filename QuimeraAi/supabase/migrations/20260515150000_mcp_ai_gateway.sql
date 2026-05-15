-- ================================================================================
-- MCP AI Gateway support
-- Adds tenant/scopes metadata to API keys and stores generation job status.
-- ================================================================================

ALTER TABLE public.api_keys
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS api_keys_tenant_id_idx ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS api_keys_key_prefix_idx ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS api_keys_status_idx ON public.api_keys(status);

CREATE TABLE IF NOT EXISTS public.mcp_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  agent_id text,
  status text NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mcp_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view MCP generation jobs" ON public.mcp_generation_jobs;
CREATE POLICY "Tenant members can view MCP generation jobs"
  ON public.mcp_generation_jobs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage MCP generation jobs" ON public.mcp_generation_jobs;
CREATE POLICY "Service role can manage MCP generation jobs"
  ON public.mcp_generation_jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS mcp_generation_jobs_tenant_id_idx ON public.mcp_generation_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS mcp_generation_jobs_project_id_idx ON public.mcp_generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS mcp_generation_jobs_status_idx ON public.mcp_generation_jobs(status);
CREATE INDEX IF NOT EXISTS mcp_generation_jobs_created_at_idx ON public.mcp_generation_jobs(created_at DESC);
