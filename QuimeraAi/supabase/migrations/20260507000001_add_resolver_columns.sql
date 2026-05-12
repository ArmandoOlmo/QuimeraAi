-- ============================================================================
-- Add columns needed by server-side resolvers
-- ============================================================================

-- 1. Add username column to users for subdomain resolution (username.quimera.ai)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON public.users(username) WHERE username IS NOT NULL;

-- 2. Add agency_landing_tenant_id to custom_domains for agency landing resolution
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS agency_landing_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
