-- Canonical Agency Engine data model.
-- This is additive and keeps legacy agencyPlans-compatible services from breaking
-- while the app moves to public.agency_service_plans.

create or replace function public.quimera_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and translate(lower(coalesce(u.role, 'user')), ' _-', '') in ('owner', 'superadmin')
  );
$$;

create or replace function public.quimera_can_manage_agency(p_agency_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.quimera_is_platform_owner()
    or exists (
      select 1
      from public.tenants t
      where t.id = p_agency_tenant_id
        and t.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = p_agency_tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('agency_owner', 'agency_admin')
    );
$$;

create or replace function public.quimera_can_view_agency_relationship(
  p_agency_tenant_id uuid,
  p_client_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.quimera_can_manage_agency(p_agency_tenant_id)
    or exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = p_client_tenant_id
        and tm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.tenants t
      where t.id = p_client_tenant_id
        and t.owner_user_id = auth.uid()
    );
$$;

create or replace function public.quimera_can_manage_agency(p_agency_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_agency_tenant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.quimera_can_manage_agency(p_agency_tenant_id::uuid)
    else false
  end;
$$;

create or replace function public.quimera_can_view_agency_relationship(
  p_agency_tenant_id text,
  p_client_tenant_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_agency_tenant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and p_client_tenant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.quimera_can_view_agency_relationship(p_agency_tenant_id::uuid, p_client_tenant_id::uuid)
    else false
  end;
$$;

revoke all on function public.quimera_is_platform_owner() from public;
revoke all on function public.quimera_can_manage_agency(uuid) from public;
revoke all on function public.quimera_can_manage_agency(text) from public;
revoke all on function public.quimera_can_view_agency_relationship(uuid, uuid) from public;
revoke all on function public.quimera_can_view_agency_relationship(text, text) from public;
grant execute on function public.quimera_is_platform_owner() to authenticated;
grant execute on function public.quimera_can_manage_agency(uuid) to authenticated;
grant execute on function public.quimera_can_manage_agency(text) to authenticated;
grant execute on function public.quimera_can_view_agency_relationship(uuid, uuid) to authenticated;
grant execute on function public.quimera_can_view_agency_relationship(text, text) to authenticated;

create table if not exists public.agency_service_plans (
  id text primary key default ('plan_' || replace(gen_random_uuid()::text, '-', '')),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  color text,
  price numeric(10, 2) not null default 0,
  base_cost numeric(10, 2) not null default 29,
  markup numeric(10, 2) generated always as (price - base_cost) stored,
  markup_percentage numeric(10, 2) generated always as (
    case when base_cost > 0 then ((price - base_cost) / base_cost) * 100 else 0 end
  ) stored,
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  client_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint agency_service_plans_price_finite_chk check (price >= 0 and price < 1000000000 and base_cost >= 0 and base_cost < 1000000000),
  constraint agency_service_plans_limits_finite_chk check (public.quimera_plan_limits_are_finite(limits))
);

create unique index if not exists agency_service_plans_one_default_idx
  on public.agency_service_plans(tenant_id)
  where is_default = true and is_archived = false;

create index if not exists agency_service_plans_tenant_active_idx
  on public.agency_service_plans(tenant_id, is_active, is_archived, price);

create table if not exists public.agency_clients (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_tenant_id uuid not null references public.tenants(id) on delete cascade,
  status text not null default 'active',
  lifecycle_stage text not null default 'onboarding',
  health_score integer not null default 70 check (health_score >= 0 and health_score <= 100),
  agency_plan_id text references public.agency_service_plans(id) on delete set null,
  billing_mode text not null default 'included_in_parent' check (billing_mode in ('direct', 'agency_managed', 'included_in_parent')),
  onboarding_status text not null default 'draft',
  project_count integer not null default 0,
  primary_project_id uuid references public.projects(id) on delete set null,
  client_owner_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_tenant_id, client_tenant_id)
);

create index if not exists agency_clients_agency_status_idx
  on public.agency_clients(agency_tenant_id, status, lifecycle_stage);

create index if not exists agency_clients_client_idx
  on public.agency_clients(client_tenant_id);

create table if not exists public.agency_project_transfers (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_project_id uuid not null references public.projects(id) on delete cascade,
  target_project_id uuid not null references public.projects(id) on delete cascade,
  transfer_mode text not null default 'copy' check (transfer_mode in ('copy')),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  transferred_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_tenant_id, source_project_id, target_project_id)
);

create index if not exists agency_project_transfers_agency_created_idx
  on public.agency_project_transfers(agency_tenant_id, created_at desc);

create index if not exists agency_project_transfers_client_idx
  on public.agency_project_transfers(client_tenant_id, created_at desc);

create table if not exists public.agency_client_approvals (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  related_entity_type text not null default 'project',
  related_entity_id text,
  approval_type text not null default 'project_review' check (
    approval_type in ('project_review', 'publish', 'email_send', 'billing', 'domain', 'content', 'report', 'transfer', 'other')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'change_requested', 'cancelled', 'expired')
  ),
  title text not null,
  description text,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  response_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_client_approvals_agency_status_idx
  on public.agency_client_approvals(agency_tenant_id, status, requested_at desc);

create index if not exists agency_client_approvals_client_status_idx
  on public.agency_client_approvals(client_tenant_id, status, requested_at desc);

create index if not exists agency_client_approvals_project_idx
  on public.agency_client_approvals(project_id, requested_at desc);

create table if not exists public.agency_client_payment_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_tenant_id uuid not null references public.tenants(id) on delete cascade,
  agency_plan_id text references public.agency_service_plans(id) on delete set null,
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'cancelled', 'expired')
  ),
  plan_name text not null,
  plan_features jsonb not null default '[]'::jsonb,
  monthly_price numeric(10, 2) not null,
  currency text not null default 'usd',
  expires_at timestamptz not null,
  checkout_started_at timestamptz,
  completed_at timestamptz,
  stripe_customer_id text,
  stripe_product_id text,
  stripe_price_id text,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_client_payment_links_price_finite_chk check (
    monthly_price > 0 and monthly_price < 1000000000
  )
);

create index if not exists agency_client_payment_links_token_idx
  on public.agency_client_payment_links(token);

create index if not exists agency_client_payment_links_agency_status_idx
  on public.agency_client_payment_links(agency_tenant_id, status, created_at desc);

create index if not exists agency_client_payment_links_client_created_idx
  on public.agency_client_payment_links(client_tenant_id, created_at desc);

create table if not exists public.agency_activity (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid references public.tenants(id) on delete cascade,
  client_tenant_id uuid references public.tenants(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  type text not null,
  title text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.agency_activity
  add column if not exists agency_tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists client_tenant_id uuid references public.tenants(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists title text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists agency_activity_agency_created_idx
  on public.agency_activity(agency_tenant_id, created_at desc);

create index if not exists agency_activity_client_created_idx
  on public.agency_activity(client_tenant_id, created_at desc);

create table if not exists public.agency_reports (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_tenant_id uuid references public.tenants(id) on delete set null,
  report_type text not null,
  period_start date,
  period_end date,
  data jsonb not null default '{}'::jsonb,
  ai_summary text,
  status text not null default 'draft',
  generated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists agency_reports_agency_created_idx
  on public.agency_reports(agency_tenant_id, created_at desc);

create table if not exists public.agency_client_notes (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_tenant_id uuid not null references public.tenants(id) on delete cascade,
  note text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'client_visible')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists agency_client_notes_client_created_idx
  on public.agency_client_notes(client_tenant_id, created_at desc);

insert into public.agency_clients (
  agency_tenant_id,
  client_tenant_id,
  status,
  lifecycle_stage,
  billing_mode,
  onboarding_status,
  project_count,
  client_owner_email,
  metadata
)
select
  t.owner_tenant_id,
  t.id,
  coalesce(t.status, 'active'),
  coalesce(t.billing ->> 'lifecycleStage', 'active'),
  coalesce(nullif(t.billing ->> 'mode', ''), 'included_in_parent'),
  coalesce(t.billing ->> 'onboardingStatus', 'existing'),
  coalesce((t.usage ->> 'projectCount')::integer, 0),
  t.email,
  jsonb_build_object(
    'source', 'tenant_backfill',
    'effectivePlanId', coalesce(t.billing ->> 'effectivePlanId', t.subscription_plan),
    'legacyAgencyPlanId', t.billing ->> 'agencyPlanId'
  )
from public.tenants t
where t.type = 'agency_client'
  and t.owner_tenant_id is not null
on conflict (agency_tenant_id, client_tenant_id) do update set
  status = excluded.status,
  billing_mode = excluded.billing_mode,
  project_count = excluded.project_count,
  client_owner_email = excluded.client_owner_email,
  updated_at = now();

alter table public.agency_service_plans enable row level security;
alter table public.agency_clients enable row level security;
alter table public.agency_project_transfers enable row level security;
alter table public.agency_client_approvals enable row level security;
alter table public.agency_client_payment_links enable row level security;
alter table public.agency_activity enable row level security;
alter table public.agency_reports enable row level security;
alter table public.agency_client_notes enable row level security;

revoke all on table public.agency_service_plans from anon, authenticated;
revoke all on table public.agency_clients from anon, authenticated;
revoke all on table public.agency_project_transfers from anon, authenticated;
revoke all on table public.agency_client_approvals from anon, authenticated;
revoke all on table public.agency_client_payment_links from anon, authenticated;
revoke all on table public.agency_activity from anon, authenticated;
revoke all on table public.agency_reports from anon, authenticated;
revoke all on table public.agency_client_notes from anon, authenticated;

grant select, insert, update, delete on table public.agency_service_plans to authenticated;
grant select, insert, update, delete on table public.agency_clients to authenticated;
grant select, insert, update, delete on table public.agency_project_transfers to authenticated;
grant select, insert, update, delete on table public.agency_client_approvals to authenticated;
grant select, insert, update, delete on table public.agency_client_payment_links to authenticated;
grant select, insert, update, delete on table public.agency_activity to authenticated;
grant select, insert, update, delete on table public.agency_reports to authenticated;
grant select, insert, update, delete on table public.agency_client_notes to authenticated;
grant select, insert, update, delete on table public.agency_service_plans to service_role;
grant select, insert, update, delete on table public.agency_clients to service_role;
grant select, insert, update, delete on table public.agency_project_transfers to service_role;
grant select, insert, update, delete on table public.agency_client_approvals to service_role;
grant select, insert, update, delete on table public.agency_client_payment_links to service_role;
grant select, insert, update, delete on table public.agency_activity to service_role;
grant select, insert, update, delete on table public.agency_reports to service_role;
grant select, insert, update, delete on table public.agency_client_notes to service_role;

drop policy if exists "Agency can manage service plans" on public.agency_service_plans;
create policy "Agency can manage service plans"
on public.agency_service_plans
for all
to authenticated
using (public.quimera_can_manage_agency(tenant_id))
with check (public.quimera_can_manage_agency(tenant_id));

drop policy if exists "Agency and clients can view relationships" on public.agency_clients;
create policy "Agency and clients can view relationships"
on public.agency_clients
for select
to authenticated
using (public.quimera_can_view_agency_relationship(agency_tenant_id, client_tenant_id));

drop policy if exists "Agency can manage client relationships" on public.agency_clients;
create policy "Agency can manage client relationships"
on public.agency_clients
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id))
with check (public.quimera_can_manage_agency(agency_tenant_id));

drop policy if exists "Agency and clients can view project transfers" on public.agency_project_transfers;
create policy "Agency and clients can view project transfers"
on public.agency_project_transfers
for select
to authenticated
using (public.quimera_can_view_agency_relationship(agency_tenant_id, client_tenant_id));

drop policy if exists "Agency can manage project transfers" on public.agency_project_transfers;
create policy "Agency can manage project transfers"
on public.agency_project_transfers
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id))
with check (public.quimera_can_manage_agency(agency_tenant_id));

drop policy if exists "Agency and clients can view approvals" on public.agency_client_approvals;
create policy "Agency and clients can view approvals"
on public.agency_client_approvals
for select
to authenticated
using (public.quimera_can_view_agency_relationship(agency_tenant_id, client_tenant_id));

drop policy if exists "Agency can manage approvals" on public.agency_client_approvals;
create policy "Agency can manage approvals"
on public.agency_client_approvals
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id))
with check (public.quimera_can_manage_agency(agency_tenant_id));

drop policy if exists "Agency and clients can view payment links" on public.agency_client_payment_links;
create policy "Agency and clients can view payment links"
on public.agency_client_payment_links
for select
to authenticated
using (public.quimera_can_view_agency_relationship(agency_tenant_id, client_tenant_id));

drop policy if exists "Agency can manage payment links" on public.agency_client_payment_links;
create policy "Agency can manage payment links"
on public.agency_client_payment_links
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id))
with check (public.quimera_can_manage_agency(agency_tenant_id));

drop policy if exists "Agency can manage activity" on public.agency_activity;
create policy "Agency can manage activity"
on public.agency_activity
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id))
with check (public.quimera_can_manage_agency(agency_tenant_id));

drop policy if exists "Agency can manage reports" on public.agency_reports;
create policy "Agency can manage reports"
on public.agency_reports
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id))
with check (public.quimera_can_manage_agency(agency_tenant_id));

drop policy if exists "Clients can view sent reports" on public.agency_reports;
create policy "Clients can view sent reports"
on public.agency_reports
for select
to authenticated
using (
  status in ('sent', 'published')
  and client_tenant_id in (
    select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
  )
);

drop policy if exists "Agency can manage client notes" on public.agency_client_notes;
create policy "Agency can manage client notes"
on public.agency_client_notes
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id))
with check (public.quimera_can_manage_agency(agency_tenant_id));

drop policy if exists "Clients can view client-visible notes" on public.agency_client_notes;
create policy "Clients can view client-visible notes"
on public.agency_client_notes
for select
to authenticated
using (
  visibility = 'client_visible'
  and client_tenant_id in (
    select tm.tenant_id from public.tenant_members tm where tm.user_id = auth.uid()
  )
);
