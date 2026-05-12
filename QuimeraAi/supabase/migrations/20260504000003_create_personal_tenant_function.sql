-- Create a SECURITY DEFINER function to bootstrap a personal tenant + membership.
-- This bypasses RLS entirely, breaking the circular dependency between
-- tenants and tenant_members policies.

CREATE OR REPLACE FUNCTION public.create_personal_tenant(
  p_user_id UUID,
  p_tenant_name TEXT,
  p_slug TEXT,
  p_settings JSONB DEFAULT '{}'::jsonb,
  p_limits JSONB DEFAULT '{}'::jsonb,
  p_usage JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
  v_membership_id TEXT;
BEGIN
  -- Check if a personal tenant already exists for this user
  SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE owner_user_id = p_user_id AND type = 'personal'
    LIMIT 1;

  -- If not found, create it
  IF v_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug, owner_user_id, type, subscription_plan, status, settings, limits, usage)
    VALUES (p_tenant_name, p_slug, p_user_id, 'personal', 'free', 'active', p_settings, p_limits, p_usage)
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Ensure membership exists (upsert)
  v_membership_id := v_tenant_id || '_' || p_user_id;
  
  INSERT INTO public.tenant_members (id, tenant_id, user_id, role, permissions, invited_by, joined_at)
  VALUES (
    v_membership_id,
    v_tenant_id,
    p_user_id,
    'agency_owner',
    '{"canManageUsers": true, "canManageSettings": true, "canManageProjects": true, "canManageBilling": true, "canManageContent": true}'::jsonb,
    p_user_id,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
