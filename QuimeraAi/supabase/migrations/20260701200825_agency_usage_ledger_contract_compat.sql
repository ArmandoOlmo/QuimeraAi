-- Align Agency production-ready tables with the SaaS Mode operating contract.
-- This migration is additive and keeps compatibility with the first Agency
-- hardening migration while exposing the canonical field names requested by
-- Agency V1: source_module/client_price on usage, provider idempotency on
-- billing events, and explicit snapshot preview/apply payload columns.

alter table public.agency_usage_ledger
  add column if not exists source_module text not null default 'manual',
  add column if not exists client_price numeric(14, 4) not null default 0,
  add column if not exists agency_markup_type text not null default 'percentage',
  add column if not exists agency_markup_value numeric(14, 4) not null default 0,
  add column if not exists invoice_id text,
  add column if not exists stripe_invoice_item_id text,
  add column if not exists source_entity_type text,
  add column if not exists source_entity_id text;

update public.agency_usage_ledger
set source_module = coalesce(nullif(source_module, ''), source, 'manual')
where source_module is null or source_module = '';

update public.agency_usage_ledger
set client_price = unit_price
where client_price = 0
  and unit_price > 0;

update public.agency_usage_ledger
set agency_markup_value = case
    when unit_cost > 0 then round(((unit_price - unit_cost) / unit_cost) * 100, 4)
    else 0
  end
where agency_markup_value = 0
  and unit_price > unit_cost;

alter table public.agency_usage_ledger
  alter column billing_status set default 'unbilled';

alter table public.agency_usage_ledger
  drop constraint if exists agency_usage_ledger_usage_type_check,
  drop constraint if exists agency_usage_ledger_billing_status_check,
  drop constraint if exists agency_usage_ledger_client_price_check,
  drop constraint if exists agency_usage_ledger_agency_markup_type_check,
  drop constraint if exists agency_usage_ledger_agency_markup_value_check;

alter table public.agency_usage_ledger
  add constraint agency_usage_ledger_usage_type_check check (
    usage_type in (
      'ai_tokens',
      'ai_credits',
      'email_send',
      'media_generation',
      'storage_gb',
      'project_count',
      'domain',
      'appointment_booking',
      'ecommerce_order',
      'automation_run',
      'api_call',
      'subscription',
      'project',
      'storage',
      'seat',
      'email',
      'snapshot',
      'report',
      'other'
    )
  ),
  add constraint agency_usage_ledger_billing_status_check check (
    billing_status in (
      'unbilled',
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
  add constraint agency_usage_ledger_client_price_check check (
    client_price >= 0 and client_price < 1000000000
  ),
  add constraint agency_usage_ledger_agency_markup_type_check check (
    agency_markup_type in ('percentage', 'fixed', 'none')
  ),
  add constraint agency_usage_ledger_agency_markup_value_check check (
    agency_markup_value >= 0 and agency_markup_value < 1000000000
  );

create index if not exists agency_usage_ledger_source_module_idx
  on public.agency_usage_ledger(agency_tenant_id, source_module, usage_type, created_at desc);

alter table public.agency_billing_events
  add column if not exists provider_event_id text,
  add column if not exists idempotency_key text;

update public.agency_billing_events
set provider_event_id = event_id
where provider_event_id is null
  and event_id is not null;

update public.agency_billing_events
set idempotency_key = concat(provider, ':', event_id)
where idempotency_key is null
  and provider is not null
  and event_id is not null;

create unique index if not exists agency_billing_events_provider_event_id_uidx
  on public.agency_billing_events(provider, provider_event_id)
  where provider_event_id is not null;

create unique index if not exists agency_billing_events_idempotency_uidx
  on public.agency_billing_events(idempotency_key)
  where idempotency_key is not null;

alter table public.agency_snapshots
  add column if not exists industry text,
  add column if not exists version integer not null default 1;

alter table public.agency_snapshots
  drop constraint if exists agency_snapshots_version_check;

alter table public.agency_snapshots
  add constraint agency_snapshots_version_check check (version > 0);

alter table public.agency_snapshot_versions
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists included_modules jsonb not null default '[]'::jsonb,
  add column if not exists readiness jsonb not null default '{}'::jsonb;

update public.agency_snapshot_versions
set payload = case
    when payload = '{}'::jsonb then data
    else payload
  end,
  included_modules = case
    when included_modules = '[]'::jsonb then coalesce(data->'includedModules', metadata->'includedModules', '[]'::jsonb)
    else included_modules
  end,
  readiness = case
    when readiness = '{}'::jsonb then coalesce(data->'readiness', metadata->'readiness', '{}'::jsonb)
    else readiness
  end;

alter table public.agency_snapshot_applications
  add column if not exists preview jsonb not null default '{}'::jsonb,
  add column if not exists applied_changes jsonb not null default '[]'::jsonb,
  add column if not exists error text,
  add column if not exists completed_at timestamptz;

update public.agency_snapshot_applications
set preview = metadata->'preview'
where preview = '{}'::jsonb
  and metadata ? 'preview';

update public.agency_snapshot_applications
set applied_changes = metadata->'appliedChanges'
where applied_changes = '[]'::jsonb
  and metadata ? 'appliedChanges';

update public.agency_snapshot_applications
set error = error_message
where error is null
  and error_message is not null;

update public.agency_snapshot_applications
set completed_at = applied_at
where completed_at is null
  and applied_at is not null;

alter table public.agency_snapshot_applications
  drop constraint if exists agency_snapshot_applications_status_check;

alter table public.agency_snapshot_applications
  add constraint agency_snapshot_applications_status_check check (
    status in ('pending', 'previewed', 'applying', 'applied', 'failed', 'cancelled')
  );
