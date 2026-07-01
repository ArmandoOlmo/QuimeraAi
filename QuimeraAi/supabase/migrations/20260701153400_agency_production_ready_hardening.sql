-- Agency Engine production readiness hardening.
-- Additive data model for usage, snapshots, and Agency Stripe events, plus
-- RLS hardening for platform billing plans and legacy Agency activity access.

alter table public.subscription_plans enable row level security;

drop policy if exists "Anyone can manage subscription plans" on public.subscription_plans;
drop policy if exists "Authenticated users can manage subscription plans" on public.subscription_plans;
drop policy if exists "Subscription plans are publicly readable" on public.subscription_plans;
drop policy if exists "Public can read active landing subscription plans" on public.subscription_plans;
drop policy if exists "Platform owners can read all subscription plans" on public.subscription_plans;
drop policy if exists "Platform owners can manage subscription plans" on public.subscription_plans;

revoke all on table public.subscription_plans from anon, authenticated;
grant select on table public.subscription_plans to anon, authenticated;
grant insert, update, delete on table public.subscription_plans to authenticated;
grant select, insert, update, delete on table public.subscription_plans to service_role;

create policy "Public can read active landing subscription plans"
on public.subscription_plans
for select
to anon, authenticated
using (
  coalesce(is_archived, false) = false
  and coalesce(show_in_landing, false) = true
);

create policy "Platform owners can read all subscription plans"
on public.subscription_plans
for select
to authenticated
using (public.quimera_is_platform_owner());

create policy "Platform owners can manage subscription plans"
on public.subscription_plans
for all
to authenticated
using (public.quimera_is_platform_owner())
with check (public.quimera_is_platform_owner());

drop policy if exists "Agency members manage agency activity" on public.agency_activity;
drop policy if exists "Agency can manage activity" on public.agency_activity;
create policy "Agency can manage activity"
on public.agency_activity
for all
to authenticated
using (
  agency_tenant_id is not null
  and public.quimera_can_manage_agency(agency_tenant_id::text)
)
with check (
  agency_tenant_id is not null
  and public.quimera_can_manage_agency(agency_tenant_id::text)
);

create table if not exists public.agency_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_tenant_id uuid references public.tenants(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  agency_plan_id text references public.agency_service_plans(id) on delete set null,
  source text not null default 'manual',
  usage_type text not null check (
    usage_type in (
      'subscription',
      'project',
      'ai_credits',
      'storage',
      'seat',
      'email',
      'domain',
      'snapshot',
      'report',
      'other'
    )
  ),
  usage_quantity numeric(14, 4) not null default 1 check (usage_quantity >= 0 and usage_quantity < 1000000000),
  unit_cost numeric(14, 4) not null default 0 check (unit_cost >= 0 and unit_cost < 1000000000),
  unit_price numeric(14, 4) not null default 0 check (unit_price >= 0 and unit_price < 1000000000),
  revenue_amount numeric(14, 4) generated always as (round(usage_quantity * unit_price, 4)) stored,
  platform_cost numeric(14, 4) generated always as (round(usage_quantity * unit_cost, 4)) stored,
  markup_amount numeric(14, 4) generated always as (round((usage_quantity * unit_price) - (usage_quantity * unit_cost), 4)) stored,
  margin_amount numeric(14, 4) generated always as (round((usage_quantity * unit_price) - (usage_quantity * unit_cost), 4)) stored,
  margin_percentage numeric(8, 4) generated always as (
    case
      when (usage_quantity * unit_price) > 0
        then round((((usage_quantity * unit_price) - (usage_quantity * unit_cost)) / (usage_quantity * unit_price)) * 100, 4)
      else 0
    end
  ) stored,
  currency text not null default 'usd',
  billing_status text not null default 'recorded' check (
    billing_status in (
      'recorded',
      'pending',
      'active',
      'trial',
      'trialing',
      'paid',
      'past_due',
      'failed',
      'cancelled',
      'void'
    )
  ),
  billing_period_start date,
  billing_period_end date,
  provider text,
  provider_event_id text,
  stripe_event_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_usage_ledger_agency_created_idx
  on public.agency_usage_ledger(agency_tenant_id, created_at desc);
create index if not exists agency_usage_ledger_client_created_idx
  on public.agency_usage_ledger(client_tenant_id, created_at desc);
create index if not exists agency_usage_ledger_type_period_idx
  on public.agency_usage_ledger(agency_tenant_id, usage_type, billing_period_start, billing_period_end);
create unique index if not exists agency_usage_ledger_agency_idempotency_uidx
  on public.agency_usage_ledger(agency_tenant_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.agency_snapshots (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  snapshot_type text not null default 'project_template' check (
    snapshot_type in ('project_template', 'client_stack', 'workflow', 'content_pack', 'full_agency_template', 'other')
  ),
  visibility text not null default 'private' check (visibility in ('private', 'agency', 'client_portal')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  source_project_id uuid references public.projects(id) on delete set null,
  tags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists agency_snapshots_agency_status_idx
  on public.agency_snapshots(agency_tenant_id, status, updated_at desc);

create table if not exists public.agency_snapshot_versions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.agency_snapshots(id) on delete cascade,
  version integer not null check (version > 0),
  label text,
  data jsonb not null default '{}'::jsonb,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (snapshot_id, version)
);

create index if not exists agency_snapshot_versions_snapshot_created_idx
  on public.agency_snapshot_versions(snapshot_id, created_at desc);

create table if not exists public.agency_snapshot_applications (
  id uuid primary key default gen_random_uuid(),
  agency_tenant_id uuid not null references public.tenants(id) on delete cascade,
  snapshot_id uuid not null references public.agency_snapshots(id) on delete restrict,
  snapshot_version_id uuid references public.agency_snapshot_versions(id) on delete set null,
  client_tenant_id uuid references public.tenants(id) on delete set null,
  source_project_id uuid references public.projects(id) on delete set null,
  target_project_id uuid references public.projects(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'applied', 'failed', 'cancelled')),
  idempotency_key text,
  applied_by uuid references auth.users(id) on delete set null,
  applied_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_snapshot_applications_agency_created_idx
  on public.agency_snapshot_applications(agency_tenant_id, created_at desc);
create index if not exists agency_snapshot_applications_client_created_idx
  on public.agency_snapshot_applications(client_tenant_id, created_at desc);
create unique index if not exists agency_snapshot_applications_agency_idempotency_uidx
  on public.agency_snapshot_applications(agency_tenant_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.agency_billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  event_id text not null,
  event_type text not null,
  agency_tenant_id uuid references public.tenants(id) on delete set null,
  client_tenant_id uuid references public.tenants(id) on delete set null,
  payment_link_id uuid references public.agency_client_payment_links(id) on delete set null,
  payment_link_token text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  status text not null default 'received' check (status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  payload jsonb not null default '{}'::jsonb,
  processing_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists agency_billing_events_agency_created_idx
  on public.agency_billing_events(agency_tenant_id, created_at desc);
create index if not exists agency_billing_events_client_created_idx
  on public.agency_billing_events(client_tenant_id, created_at desc);
create index if not exists agency_billing_events_subscription_idx
  on public.agency_billing_events(stripe_subscription_id);
create index if not exists agency_billing_events_checkout_session_idx
  on public.agency_billing_events(stripe_checkout_session_id);
create unique index if not exists agency_billing_events_provider_event_id_uidx
  on public.agency_billing_events(provider, event_id);

alter table public.agency_usage_ledger enable row level security;
alter table public.agency_snapshots enable row level security;
alter table public.agency_snapshot_versions enable row level security;
alter table public.agency_snapshot_applications enable row level security;
alter table public.agency_billing_events enable row level security;

revoke all on table public.agency_usage_ledger from anon, authenticated;
revoke all on table public.agency_snapshots from anon, authenticated;
revoke all on table public.agency_snapshot_versions from anon, authenticated;
revoke all on table public.agency_snapshot_applications from anon, authenticated;
revoke all on table public.agency_billing_events from anon, authenticated;

grant select, insert, update, delete on table public.agency_usage_ledger to authenticated;
grant select, insert, update, delete on table public.agency_snapshots to authenticated;
grant select, insert, update, delete on table public.agency_snapshot_versions to authenticated;
grant select, insert, update, delete on table public.agency_snapshot_applications to authenticated;
grant select on table public.agency_billing_events to authenticated;

grant select, insert, update, delete on table public.agency_usage_ledger to service_role;
grant select, insert, update, delete on table public.agency_snapshots to service_role;
grant select, insert, update, delete on table public.agency_snapshot_versions to service_role;
grant select, insert, update, delete on table public.agency_snapshot_applications to service_role;
grant select, insert, update, delete on table public.agency_billing_events to service_role;

drop policy if exists "Agency can manage usage ledger" on public.agency_usage_ledger;
create policy "Agency can manage usage ledger"
on public.agency_usage_ledger
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id::text))
with check (public.quimera_can_manage_agency(agency_tenant_id::text));

drop policy if exists "Agency can manage snapshots" on public.agency_snapshots;
create policy "Agency can manage snapshots"
on public.agency_snapshots
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id::text))
with check (public.quimera_can_manage_agency(agency_tenant_id::text));

drop policy if exists "Agency can manage snapshot versions" on public.agency_snapshot_versions;
create policy "Agency can manage snapshot versions"
on public.agency_snapshot_versions
for all
to authenticated
using (
  exists (
    select 1
    from public.agency_snapshots s
    where s.id = snapshot_id
      and public.quimera_can_manage_agency(s.agency_tenant_id::text)
  )
)
with check (
  exists (
    select 1
    from public.agency_snapshots s
    where s.id = snapshot_id
      and public.quimera_can_manage_agency(s.agency_tenant_id::text)
  )
);

drop policy if exists "Agency can manage snapshot applications" on public.agency_snapshot_applications;
create policy "Agency can manage snapshot applications"
on public.agency_snapshot_applications
for all
to authenticated
using (public.quimera_can_manage_agency(agency_tenant_id::text))
with check (public.quimera_can_manage_agency(agency_tenant_id::text));

drop policy if exists "Agency can read billing events" on public.agency_billing_events;
create policy "Agency can read billing events"
on public.agency_billing_events
for select
to authenticated
using (
  agency_tenant_id is not null
  and public.quimera_can_manage_agency(agency_tenant_id::text)
);
