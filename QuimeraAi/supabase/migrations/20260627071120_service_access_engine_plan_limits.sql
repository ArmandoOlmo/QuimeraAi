-- Service Access Engine data foundation.
-- Commercial plans must never represent unlimited limits. Owner/Super Admin
-- override is enforced in application/Edge runtime by role, not plan data.

create or replace function public.quimera_normalize_plan_id(plan_id text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(plan_id, 'free'))
    when 'hobby' then 'individual'
    when 'starter' then 'individual'
    when 'pro' then 'individual'
    when 'agency' then 'agency_starter'
    when 'agency_plus' then 'agency_pro'
    when 'agency_client' then 'individual'
    when 'free' then 'free'
    when 'individual' then 'individual'
    when 'agency_starter' then 'agency_starter'
    when 'agency_pro' then 'agency_pro'
    when 'agency_scale' then 'agency_scale'
    when 'enterprise' then 'enterprise'
    else 'free'
  end
$$;

create or replace function public.quimera_canonical_plan_limits(plan_id text)
returns jsonb
language plpgsql
immutable
as $$
begin
  case public.quimera_normalize_plan_id(plan_id)
    when 'individual' then
      return jsonb_build_object(
        'maxProjects', 1, 'maxUsers', 1, 'maxStorageGB', 10, 'maxAiCredits', 500,
        'maxSubClients', 0, 'maxDomains', 1, 'maxLeads', 1000, 'maxProducts', 100,
        'maxEmailsPerMonth', 5000, 'maxReports', 10, 'maxApiCalls', 1000,
        'includedProjects', 1, 'maxBillableProjects', 1, 'projectCost', 0,
        'hardLimit', true, 'billingModel', 'subscription'
      );
    when 'agency_starter' then
      return jsonb_build_object(
        'maxProjects', 25, 'maxUsers', 5, 'maxStorageGB', 50, 'maxAiCredits', 2000,
        'maxSubClients', 25, 'maxDomains', 25, 'maxLeads', 10000, 'maxProducts', 500,
        'maxEmailsPerMonth', 10000, 'maxReports', 25, 'maxApiCalls', 5000,
        'includedProjects', 0, 'maxBillableProjects', 25, 'projectCost', 29,
        'hardLimit', true, 'billingModel', 'pay_per_project'
      );
    when 'agency_pro' then
      return jsonb_build_object(
        'maxProjects', 100, 'maxUsers', 15, 'maxStorageGB', 200, 'maxAiCredits', 5000,
        'maxSubClients', 100, 'maxDomains', 100, 'maxLeads', 50000, 'maxProducts', 2000,
        'maxEmailsPerMonth', 50000, 'maxReports', 100, 'maxApiCalls', 25000,
        'includedProjects', 0, 'maxBillableProjects', 100, 'projectCost', 29,
        'hardLimit', true, 'billingModel', 'pay_per_project'
      );
    when 'agency_scale' then
      return jsonb_build_object(
        'maxProjects', 250, 'maxUsers', 50, 'maxStorageGB', 1000, 'maxAiCredits', 15000,
        'maxSubClients', 250, 'maxDomains', 250, 'maxLeads', 150000, 'maxProducts', 10000,
        'maxEmailsPerMonth', 150000, 'maxReports', 500, 'maxApiCalls', 100000,
        'includedProjects', 0, 'maxBillableProjects', 250, 'projectCost', 29,
        'hardLimit', true, 'billingModel', 'pay_per_project'
      );
    when 'enterprise' then
      return jsonb_build_object(
        'maxProjects', 500, 'maxUsers', 250, 'maxStorageGB', 2000, 'maxAiCredits', 25000,
        'maxSubClients', 500, 'maxDomains', 500, 'maxLeads', 500000, 'maxProducts', 50000,
        'maxEmailsPerMonth', 500000, 'maxReports', 1000, 'maxApiCalls', 250000,
        'includedProjects', 500, 'maxBillableProjects', 500, 'projectCost', 0,
        'hardLimit', true, 'billingModel', 'custom_contract'
      );
    else
      return jsonb_build_object(
        'maxProjects', 1, 'maxUsers', 1, 'maxStorageGB', 1, 'maxAiCredits', 60,
        'maxSubClients', 0, 'maxDomains', 0, 'maxLeads', 50, 'maxProducts', 0,
        'maxEmailsPerMonth', 0, 'maxReports', 0, 'maxApiCalls', 0,
        'includedProjects', 0, 'maxBillableProjects', 0, 'projectCost', 0,
        'hardLimit', true, 'billingModel', 'free'
      );
  end case;
end;
$$;

create or replace function public.quimera_sanitize_plan_limits(raw_limits jsonb, fallback_plan_id text)
returns jsonb
language plpgsql
immutable
as $$
declare
  fallback jsonb := public.quimera_canonical_plan_limits(fallback_plan_id);
  result jsonb := fallback;
  key text;
  raw_value jsonb;
  number_value numeric;
  numeric_keys text[] := array[
    'maxProjects', 'maxUsers', 'maxStorageGB', 'maxAiCredits', 'maxSubClients',
    'maxDomains', 'maxLeads', 'maxProducts', 'maxEmailsPerMonth', 'maxReports',
    'maxApiCalls', 'includedProjects', 'maxBillableProjects', 'projectCost'
  ];
begin
  if raw_limits is null or jsonb_typeof(raw_limits) <> 'object' then
    return fallback;
  end if;

  foreach key in array numeric_keys loop
    raw_value := raw_limits -> key;
    if jsonb_typeof(raw_value) = 'number' then
      number_value := (raw_value #>> '{}')::numeric;
      if number_value >= 0 and number_value < 1000000000 then
        result := jsonb_set(result, array[key], to_jsonb(number_value), true);
      end if;
    end if;
  end loop;

  if jsonb_typeof(raw_limits -> 'hardLimit') = 'boolean' then
    result := jsonb_set(result, '{hardLimit}', raw_limits -> 'hardLimit', true);
  end if;

  if raw_limits ->> 'billingModel' in ('free', 'subscription', 'pay_per_project', 'custom_contract') then
    result := jsonb_set(result, '{billingModel}', to_jsonb(raw_limits ->> 'billingModel'), true);
  end if;

  return result;
end;
$$;

create or replace function public.quimera_plan_limits_are_finite(limits jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  key text;
  value jsonb;
  number_value numeric;
  numeric_keys text[] := array[
    'maxProjects', 'maxUsers', 'maxStorageGB', 'maxAiCredits', 'maxSubClients',
    'maxDomains', 'maxLeads', 'maxProducts', 'maxEmailsPerMonth', 'maxReports',
    'maxApiCalls', 'includedProjects', 'maxBillableProjects', 'projectCost'
  ];
begin
  if limits is null or jsonb_typeof(limits) <> 'object' then
    return false;
  end if;

  foreach key in array numeric_keys loop
    value := limits -> key;
    if value is null then
      continue;
    end if;
    if jsonb_typeof(value) <> 'number' then
      return false;
    end if;
    number_value := (value #>> '{}')::numeric;
    if number_value < 0 or number_value >= 1000000000 then
      return false;
    end if;
  end loop;

  if limits ? 'billingModel'
    and coalesce(limits ->> 'billingModel', '') not in ('free', 'subscription', 'pay_per_project', 'custom_contract') then
    return false;
  end if;

  return true;
end;
$$;

alter table public.subscription_plans
  add column if not exists billing_model text,
  add column if not exists included_projects integer,
  add column if not exists max_billable_projects integer,
  add column if not exists project_cost numeric(10, 2),
  add column if not exists is_agency_plan boolean not null default false,
  add column if not exists is_legacy boolean not null default false,
  add column if not exists canonical_plan_id text;

insert into public.subscription_plans (
  id, name, description, price_monthly, price_annually, color, icon,
  is_featured, is_popular, show_in_landing, landing_order, limits, features,
  billing_model, included_projects, max_billable_projects, project_cost,
  is_agency_plan, is_legacy, canonical_plan_id
) values
  ('free', 'Free', 'Perfecto para explorar y proyectos personales', 0, 0, '#6b7280', 'Sparkles', false, false, true, 0,
   public.quimera_canonical_plan_limits('free'), '{"aiWebBuilder":true,"visualEditor":true,"templates":true,"aiAssistant":true,"aiImageGeneration":true}'::jsonb,
   'free', 0, 0, 0, false, false, 'free'),
  ('individual', 'Individual', 'Todo incluido para emprendedores y freelancers', 49, 39, '#6366f1', 'User', true, true, true, 1,
   public.quimera_canonical_plan_limits('individual'), '{}'::jsonb,
   'subscription', 1, 1, 0, false, false, 'individual'),
  ('agency_starter', 'Agency Starter', 'Para agencias que comienzan con límites finitos por proyecto', 99, 79, '#10b981', 'Building2', false, false, true, 2,
   public.quimera_canonical_plan_limits('agency_starter'), '{}'::jsonb,
   'pay_per_project', 0, 25, 29, true, false, 'agency_starter'),
  ('agency_pro', 'Agency Pro', 'Para agencias en crecimiento con límites finitos y pool compartido', 199, 159, '#8b5cf6', 'Building2', true, true, true, 3,
   public.quimera_canonical_plan_limits('agency_pro'), '{}'::jsonb,
   'pay_per_project', 0, 100, 29, true, false, 'agency_pro'),
  ('agency_scale', 'Agency Scale', 'Para agencias de alto volumen con límites finitos configurables', 399, 319, '#f59e0b', 'Crown', false, false, true, 4,
   public.quimera_canonical_plan_limits('agency_scale'), '{}'::jsonb,
   'pay_per_project', 0, 250, 29, true, false, 'agency_scale'),
  ('enterprise', 'Enterprise', 'Soluciones personalizadas de alto volumen con límites configurables', 299, 249, '#f59e0b', 'Crown', false, false, true, 5,
   public.quimera_canonical_plan_limits('enterprise'), '{}'::jsonb,
   'custom_contract', 500, 500, 0, false, false, 'enterprise')
on conflict (id) do update set
  limits = public.quimera_sanitize_plan_limits(excluded.limits || public.subscription_plans.limits, excluded.id),
  billing_model = excluded.billing_model,
  included_projects = excluded.included_projects,
  max_billable_projects = excluded.max_billable_projects,
  project_cost = excluded.project_cost,
  is_agency_plan = excluded.is_agency_plan,
  is_legacy = false,
  canonical_plan_id = excluded.canonical_plan_id,
  updated_at = now();

update public.subscription_plans
set
  canonical_plan_id = public.quimera_normalize_plan_id(id),
  is_legacy = id <> public.quimera_normalize_plan_id(id),
  limits = public.quimera_sanitize_plan_limits(limits, id),
  billing_model = public.quimera_sanitize_plan_limits(limits, id) ->> 'billingModel',
  included_projects = ((public.quimera_sanitize_plan_limits(limits, id) ->> 'includedProjects')::numeric)::integer,
  max_billable_projects = ((public.quimera_sanitize_plan_limits(limits, id) ->> 'maxBillableProjects')::numeric)::integer,
  project_cost = (public.quimera_sanitize_plan_limits(limits, id) ->> 'projectCost')::numeric,
  is_agency_plan = public.quimera_normalize_plan_id(id) in ('agency_starter', 'agency_pro', 'agency_scale');

alter table public.subscription_plans
  drop constraint if exists subscription_plans_limits_finite_chk;

alter table public.subscription_plans
  add constraint subscription_plans_limits_finite_chk
  check (public.quimera_plan_limits_are_finite(limits));

alter table public.subscription_plans
  drop constraint if exists subscription_plans_no_agency_client_plan_chk;

alter table public.subscription_plans
  add constraint subscription_plans_no_agency_client_plan_chk
  check (id <> 'agency_client' and canonical_plan_id <> 'agency_client');

update public.tenants
set type = 'individual'
where type = 'personal';

update public.tenants t
set
  type = 'agency_client',
  subscription_plan = coalesce(
    nullif(public.quimera_normalize_plan_id(t.billing ->> 'effectivePlanId'), 'free'),
    public.quimera_normalize_plan_id(parent.subscription_plan),
    'individual'
  ),
  billing = coalesce(t.billing, '{}'::jsonb)
    || jsonb_build_object(
      'mode', coalesce(t.billing ->> 'mode', 'included_in_parent'),
      'effectivePlanId', coalesce(
        nullif(public.quimera_normalize_plan_id(t.billing ->> 'effectivePlanId'), 'free'),
        public.quimera_normalize_plan_id(parent.subscription_plan),
        'individual'
      )
    )
from public.tenants parent
where t.subscription_plan = 'agency_client'
  and parent.id = t.owner_tenant_id;

update public.tenants
set
  subscription_plan = public.quimera_normalize_plan_id(subscription_plan),
  limits = public.quimera_sanitize_plan_limits(limits, subscription_plan),
  billing = coalesce(billing, '{}'::jsonb)
    || jsonb_build_object('effectivePlanId', public.quimera_normalize_plan_id(subscription_plan))
where true;

alter table public.tenants
  drop constraint if exists tenants_subscription_plan_not_agency_client_chk;

alter table public.tenants
  add constraint tenants_subscription_plan_not_agency_client_chk
  check (subscription_plan <> 'agency_client');

alter table public.tenants
  drop constraint if exists tenants_limits_finite_chk;

alter table public.tenants
  add constraint tenants_limits_finite_chk
  check (public.quimera_plan_limits_are_finite(limits));

update public.subscriptions
set
  plan_id = public.quimera_normalize_plan_id(plan_id),
  ai_credits_usage = case
    when ai_credits_usage is null then ai_credits_usage
    else jsonb_set(
      jsonb_set(
        jsonb_set(
          ai_credits_usage,
          '{planId}',
          to_jsonb(public.quimera_normalize_plan_id(plan_id)),
          true
        ),
        '{planCreditsIncluded}',
        to_jsonb(((public.quimera_canonical_plan_limits(plan_id) ->> 'maxAiCredits')::numeric)::integer),
        true
      ),
      '{creditsIncluded}',
      to_jsonb(greatest(
        case
          when jsonb_typeof(ai_credits_usage -> 'creditsIncluded') = 'number'
            then (ai_credits_usage ->> 'creditsIncluded')::numeric
          else 0
        end,
        (public.quimera_canonical_plan_limits(plan_id) ->> 'maxAiCredits')::numeric
      )),
      true
    )
  end
where true;

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_id_not_agency_client_chk;

alter table public.subscriptions
  add constraint subscriptions_plan_id_not_agency_client_chk
  check (plan_id <> 'agency_client');

create table if not exists public.service_access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  user_role text,
  module_id text,
  service_id text,
  feature_key text,
  action text,
  reason_code text not null,
  allowed boolean not null default false,
  admin_override boolean not null default false,
  decision jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_access_audit_logs_tenant_created_idx
  on public.service_access_audit_logs(tenant_id, created_at desc);

create index if not exists service_access_audit_logs_user_created_idx
  on public.service_access_audit_logs(user_id, created_at desc);

alter table public.service_access_audit_logs enable row level security;

revoke all on table public.service_access_audit_logs from anon, authenticated;
grant select on table public.service_access_audit_logs to authenticated;
grant insert, select, update, delete on table public.service_access_audit_logs to service_role;

drop policy if exists "Platform owners can read service access audit logs" on public.service_access_audit_logs;
create policy "Platform owners can read service access audit logs"
on public.service_access_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role in ('owner', 'superadmin')
  )
);
