-- Normalize tenant plan/type/access contracts after the Agency Engine migration.
-- The app treats public.tenants as the source of tenant presence, platform
-- subscription plans as tenant entitlements, and agency_service_plans as the
-- agency-owned service plans assigned to agency clients.

-- Keep the Supabase subscription plan catalog aligned with the canonical app
-- catalog so Stripe sync does not inherit stale prices or missing agency flags.
with canonical_plan_updates(id, price_monthly, price_annually, agency_enabled) as (
  values
    ('free', 0::numeric, 0::numeric, false),
    ('individual', 49::numeric, 39::numeric, false),
    ('agency_starter', 99::numeric, 79::numeric, true),
    ('agency_pro', 199::numeric, 159::numeric, true),
    ('agency_scale', 399::numeric, 319::numeric, true),
    ('enterprise', 299::numeric, 249::numeric, false)
)
update public.subscription_plans sp
set
  price_monthly = cpu.price_monthly,
  price_annually = cpu.price_annually,
  features = case
    when cpu.agency_enabled
      then coalesce(sp.features, '{}'::jsonb) || '{"agencyEnabled": true, "agencyModule": true}'::jsonb
    else coalesce(sp.features, '{}'::jsonb)
  end,
  updated_at = now()
from canonical_plan_updates cpu
where sp.id = cpu.id;

create or replace function public.create_personal_tenant(
  p_user_id uuid,
  p_tenant_name text,
  p_slug text,
  p_settings jsonb default '{}'::jsonb,
  p_limits jsonb default '{}'::jsonb,
  p_usage jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_membership_id text;
  v_owner_permissions jsonb := '{
    "canManageProjects": true,
    "canManageLeads": true,
    "canManageCMS": true,
    "canManageEcommerce": true,
    "canManageRealEstate": true,
    "canManageFiles": true,
    "canManageDomains": true,
    "canInviteMembers": true,
    "canRemoveMembers": true,
    "canViewAnalytics": true,
    "canManageBilling": true,
    "canManageSettings": true,
    "canExportData": true
  }'::jsonb;
begin
  select id into v_tenant_id
  from public.tenants
  where owner_user_id = p_user_id
    and type in ('individual', 'personal')
  order by case when type = 'individual' then 0 else 1 end, created_at asc
  limit 1;

  if v_tenant_id is null then
    insert into public.tenants (
      name,
      slug,
      owner_user_id,
      type,
      subscription_plan,
      status,
      settings,
      limits,
      usage,
      billing
    )
    values (
      p_tenant_name,
      p_slug,
      p_user_id,
      'individual',
      'free',
      'active',
      p_settings,
      public.quimera_sanitize_plan_limits(p_limits, 'free'),
      p_usage,
      jsonb_build_object('effectivePlanId', 'free')
    )
    returning id into v_tenant_id;
  else
    update public.tenants
    set
      type = 'individual',
      subscription_plan = public.quimera_normalize_plan_id(subscription_plan),
      limits = public.quimera_sanitize_plan_limits(limits, subscription_plan),
      billing = coalesce(billing, '{}'::jsonb)
        || jsonb_build_object('effectivePlanId', public.quimera_normalize_plan_id(subscription_plan)),
      updated_at = now()
    where id = v_tenant_id
      and type = 'personal';
  end if;

  v_membership_id := v_tenant_id || '_' || p_user_id;

  insert into public.tenant_members (id, tenant_id, user_id, role, permissions, invited_by, joined_at)
  values (
    v_membership_id,
    v_tenant_id,
    p_user_id,
    'agency_owner',
    v_owner_permissions,
    p_user_id,
    now()
  )
  on conflict (id) do update set
    role = 'agency_owner',
    permissions = coalesce(public.tenant_members.permissions, '{}'::jsonb) || v_owner_permissions;

  return v_tenant_id;
end;
$$;

revoke all on function public.create_personal_tenant(uuid, text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_personal_tenant(uuid, text, text, jsonb, jsonb, jsonb) to authenticated, service_role;

update public.tenants
set
  type = 'individual',
  subscription_plan = public.quimera_normalize_plan_id(subscription_plan),
  limits = public.quimera_sanitize_plan_limits(limits, subscription_plan),
  billing = coalesce(billing, '{}'::jsonb)
    || jsonb_build_object('effectivePlanId', public.quimera_normalize_plan_id(subscription_plan)),
  updated_at = now()
where type = 'personal';

update public.tenants
set
  type = 'agency',
  subscription_plan = public.quimera_normalize_plan_id(subscription_plan),
  limits = public.quimera_sanitize_plan_limits(limits, subscription_plan),
  billing = coalesce(billing, '{}'::jsonb)
    || jsonb_build_object(
      'effectivePlanId', public.quimera_normalize_plan_id(subscription_plan),
      'isAgencyBilling', true
    ),
  settings = coalesce(settings, '{}'::jsonb)
    || jsonb_build_object(
      'enabledFeatures',
      jsonb_build_array('projects', 'cms', 'leads', 'ecommerce', 'realEstate', 'chat', 'email', 'domains', 'analytics', 'api')
    ),
  updated_at = now()
where type in ('individual', 'personal')
  and public.quimera_normalize_plan_id(subscription_plan) in ('agency_starter', 'agency_pro', 'agency_scale');

with role_defaults(role, default_permissions) as (
  values
    ('agency_owner', '{
      "canManageProjects": true,
      "canManageLeads": true,
      "canManageCMS": true,
      "canManageEcommerce": true,
      "canManageRealEstate": true,
      "canManageFiles": true,
      "canManageDomains": true,
      "canInviteMembers": true,
      "canRemoveMembers": true,
      "canViewAnalytics": true,
      "canManageBilling": true,
      "canManageSettings": true,
      "canExportData": true
    }'::jsonb),
    ('agency_admin', '{
      "canManageProjects": true,
      "canManageLeads": true,
      "canManageCMS": true,
      "canManageEcommerce": true,
      "canManageRealEstate": true,
      "canManageFiles": true,
      "canManageDomains": true,
      "canInviteMembers": true,
      "canRemoveMembers": false,
      "canViewAnalytics": true,
      "canManageBilling": false,
      "canManageSettings": false,
      "canExportData": true
    }'::jsonb),
    ('agency_member', '{
      "canManageProjects": true,
      "canManageLeads": true,
      "canManageCMS": true,
      "canManageEcommerce": false,
      "canManageRealEstate": false,
      "canManageFiles": true,
      "canManageDomains": false,
      "canInviteMembers": false,
      "canRemoveMembers": false,
      "canViewAnalytics": true,
      "canManageBilling": false,
      "canManageSettings": false,
      "canExportData": false
    }'::jsonb),
    ('client', '{
      "canManageProjects": true,
      "canManageLeads": true,
      "canManageCMS": true,
      "canManageEcommerce": true,
      "canManageRealEstate": true,
      "canManageFiles": true,
      "canManageDomains": false,
      "canInviteMembers": false,
      "canRemoveMembers": false,
      "canViewAnalytics": true,
      "canManageBilling": false,
      "canManageSettings": false,
      "canExportData": false
    }'::jsonb)
)
update public.tenant_members tm
set permissions = case
  when tm.role = 'agency_owner'
    then coalesce(tm.permissions, '{}'::jsonb) || rd.default_permissions
  else rd.default_permissions || coalesce(tm.permissions, '{}'::jsonb)
end
from role_defaults rd
where tm.role = rd.role
  and (
    tm.permissions is null
    or not (tm.permissions ? 'canManageBilling')
    or not (tm.permissions ? 'canManageProjects')
    or not (tm.permissions ? 'canViewAnalytics')
    or not (tm.permissions ? 'canExportData')
    or (tm.role = 'agency_owner' and tm.permissions <> (coalesce(tm.permissions, '{}'::jsonb) || rd.default_permissions))
  );

insert into public.agency_service_plans (
  id,
  tenant_id,
  name,
  description,
  color,
  price,
  base_cost,
  limits,
  features,
  is_active,
  is_default,
  is_archived,
  client_count,
  created_at,
  updated_at
)
select
  'default_' || replace(t.id::text, '-', ''),
  t.id,
  'Default Client Plan',
  'Default service plan for agency-managed clients',
  '#10b981',
  99,
  29,
  jsonb_build_object(
    'maxProjects', 1,
    'maxUsers', 3,
    'maxStorageGB', 5,
    'maxAiCredits', 500,
    'maxProducts', 50,
    'maxLeads', 500,
    'maxEmailsPerMonth', 1000
  ),
  jsonb_build_object(
    'websiteBuilder', true,
    'visualEditor', true,
    'templates', true,
    'cmsEnabled', true,
    'crmEnabled', true,
    'ecommerceEnabled', true,
    'emailMarketing', true,
    'chatbotEnabled', true,
    'customDomain', true,
    'removeBranding', true,
    'analyticsEnabled', true
  ),
  true,
  true,
  false,
  0,
  now(),
  now()
from public.tenants t
where t.type = 'agency'
  and not exists (
    select 1
    from public.agency_service_plans asp
    where asp.tenant_id = t.id
  )
on conflict (id) do update set
  features = excluded.features,
  is_active = true,
  is_archived = false,
  is_default = true,
  updated_at = now();

with ranked as (
  select
    id,
    tenant_id,
    row_number() over (partition by tenant_id order by price asc, created_at asc, id asc) as rn,
    count(*) filter (where is_default) over (partition by tenant_id) as default_count
  from public.agency_service_plans
  where is_active = true
    and is_archived = false
)
update public.agency_service_plans asp
set
  is_default = ranked.rn = 1,
  updated_at = now()
from ranked
where asp.id = ranked.id
  and ranked.default_count <> 1;

with default_plans as (
  select tenant_id, id
  from public.agency_service_plans
  where is_active = true
    and is_archived = false
    and is_default = true
)
update public.agency_clients ac
set
  agency_plan_id = default_plans.id,
  metadata = coalesce(ac.metadata, '{}'::jsonb)
    || jsonb_build_object('planAssignedBy', 'normalize_tenant_plan_access'),
  updated_at = now()
from default_plans
where ac.agency_tenant_id = default_plans.tenant_id
  and ac.agency_plan_id is null;

update public.agency_service_plans asp
set
  client_count = coalesce(client_counts.client_count, 0),
  updated_at = now()
from (
  select asp.id, count(ac.client_tenant_id)::integer as client_count
  from public.agency_service_plans asp
  left join public.agency_clients ac on ac.agency_plan_id = asp.id
  group by asp.id
) client_counts
where asp.id = client_counts.id;

update public.subscriptions s
set
  plan_id = public.quimera_normalize_plan_id(t.subscription_plan),
  ai_credits_usage = coalesce(s.ai_credits_usage, '{}'::jsonb)
    || jsonb_build_object('planId', public.quimera_normalize_plan_id(t.subscription_plan)),
  updated_at = now()
from public.tenants t
where s.tenant_id = t.id
  and t.type = 'agency'
  and public.quimera_normalize_plan_id(s.plan_id) <> public.quimera_normalize_plan_id(t.subscription_plan);
