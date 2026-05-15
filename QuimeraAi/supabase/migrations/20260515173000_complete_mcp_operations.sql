-- ================================================================================
-- Complete Quimera MCP operations
-- Rate limits, async job states, and tenant-based API key policies.
-- ================================================================================

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

DROP POLICY IF EXISTS "Owners can manage API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Tenant members can manage MCP API keys" ON public.api_keys;
CREATE POLICY "Tenant members can manage MCP API keys"
  ON public.api_keys
  FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = api_keys.project_id
        AND (p.user_id = auth.uid() OR p.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = api_keys.project_id
        AND (p.user_id = auth.uid() OR p.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
    )
  );

CREATE TABLE IF NOT EXISTS public.mcp_rate_limits (
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  last_request_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (api_key_id, bucket, window_start)
);

ALTER TABLE public.mcp_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view MCP rate limits" ON public.mcp_rate_limits;
CREATE POLICY "Tenant members can view MCP rate limits"
  ON public.mcp_rate_limits
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage MCP rate limits" ON public.mcp_rate_limits;
CREATE POLICY "Service role can manage MCP rate limits"
  ON public.mcp_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS mcp_rate_limits_tenant_id_idx ON public.mcp_rate_limits(tenant_id);
CREATE INDEX IF NOT EXISTS mcp_rate_limits_window_start_idx ON public.mcp_rate_limits(window_start DESC);

ALTER TABLE public.mcp_generation_jobs
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;

UPDATE public.mcp_generation_jobs
SET status = 'pending'
WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS mcp_generation_jobs_pending_idx
  ON public.mcp_generation_jobs(created_at ASC)
  WHERE status = 'pending';
