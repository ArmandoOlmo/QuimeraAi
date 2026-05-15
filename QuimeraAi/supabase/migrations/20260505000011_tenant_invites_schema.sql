-- Tenant Invites Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenant Invites
CREATE TABLE IF NOT EXISTS public.tenant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agency_member',
    custom_permissions JSONB,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invited_by_name TEXT,
    token TEXT UNIQUE NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy: tenant_invites may exist without newer columns
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agency_member';
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS custom_permissions JSONB;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS invited_by_name TEXT;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS accepted_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.tenant_invites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS tenant_invites_tenant_id_idx ON public.tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_invites_token_idx ON public.tenant_invites(token);
CREATE INDEX IF NOT EXISTS tenant_invites_email_idx ON public.tenant_invites(email);

-- RLS Policies
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Access for valid tokens
CREATE POLICY "Public can view valid invites by token"
    ON public.tenant_invites FOR SELECT
    USING (status = 'pending' AND expires_at > NOW());

-- 2. Tenant Read Access
CREATE POLICY "Tenant members can view their invites"
    ON public.tenant_invites FOR SELECT
    USING (
        tenant_id::text IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
        )
    );

-- 3. Tenant Insert Access
CREATE POLICY "Tenant admins can create invites"
    ON public.tenant_invites FOR INSERT
    WITH CHECK (
        tenant_id::text IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid() AND (role = 'agency_admin' OR role = 'agency_owner')
        )
    );

-- 4. Tenant Update Access
CREATE POLICY "Tenant admins can update invites"
    ON public.tenant_invites FOR UPDATE
    USING (
        tenant_id::text IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid() AND (role = 'agency_admin' OR role = 'agency_owner')
        )
    )
    WITH CHECK (
        tenant_id::text IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid() AND (role = 'agency_admin' OR role = 'agency_owner')
        )
    );

-- 5. User Self Update (Accept/Reject)
CREATE POLICY "Users can accept their own invites"
    ON public.tenant_invites FOR UPDATE
    USING (status = 'pending' AND expires_at > NOW() AND auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_tenant_invites_updated_at 
    BEFORE UPDATE ON public.tenant_invites 
    FOR EACH ROW 
    EXECUTE FUNCTION update_properties_updated_at_column();
