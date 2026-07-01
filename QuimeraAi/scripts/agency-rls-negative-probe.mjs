#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const syntheticUserId = '00000000-0000-4000-8000-000000000001';
const syntheticAgencyOwnerId = '00000000-0000-4000-8000-000000000002';
const syntheticOtherClientUserId = '00000000-0000-4000-8000-000000000003';
const agencyTenantId = '10000000-0000-4000-8000-000000000001';
const clientTenantId = '10000000-0000-4000-8000-000000000002';
const otherClientTenantId = '10000000-0000-4000-8000-000000000003';
const agencyPlanId = 'plan_agency_rls_probe';

const sql = `
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('${syntheticUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agency-rls-client@example.invalid', '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('${syntheticAgencyOwnerId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agency-rls-owner@example.invalid', '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('${syntheticOtherClientUserId}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agency-rls-other-client@example.invalid', '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.users (id, name, email, role)
values
  ('${syntheticUserId}', 'Agency RLS Client', 'agency-rls-client@example.invalid', 'user'),
  ('${syntheticAgencyOwnerId}', 'Agency RLS Owner', 'agency-rls-owner@example.invalid', 'user'),
  ('${syntheticOtherClientUserId}', 'Agency RLS Other Client', 'agency-rls-other-client@example.invalid', 'user')
on conflict (id) do update
set name = excluded.name,
    email = excluded.email,
    role = excluded.role;

insert into public.tenants (id, name, slug, type, owner_user_id, owner_tenant_id, subscription_plan, status)
values
  ('${agencyTenantId}', 'Agency RLS Probe Agency', 'agency-rls-probe-agency', 'agency', '${syntheticAgencyOwnerId}', null, 'agency_pro', 'active'),
  ('${clientTenantId}', 'Agency RLS Probe Client', 'agency-rls-probe-client', 'agency_client', '${syntheticUserId}', '${agencyTenantId}', 'individual', 'active'),
  ('${otherClientTenantId}', 'Agency RLS Probe Other Client', 'agency-rls-probe-other-client', 'agency_client', '${syntheticOtherClientUserId}', '${agencyTenantId}', 'individual', 'active')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    type = excluded.type,
    owner_user_id = excluded.owner_user_id,
    owner_tenant_id = excluded.owner_tenant_id,
    subscription_plan = excluded.subscription_plan,
    status = excluded.status;

insert into public.tenant_members (id, tenant_id, user_id, role, permissions, joined_at)
values
  ('${agencyTenantId}_${syntheticAgencyOwnerId}', '${agencyTenantId}', '${syntheticAgencyOwnerId}', 'agency_owner', '{"canManageBilling":true}'::jsonb, now()),
  ('${clientTenantId}_${syntheticUserId}', '${clientTenantId}', '${syntheticUserId}', 'client_owner', '{}'::jsonb, now()),
  ('${otherClientTenantId}_${syntheticOtherClientUserId}', '${otherClientTenantId}', '${syntheticOtherClientUserId}', 'client_owner', '{}'::jsonb, now())
on conflict (tenant_id, user_id) do update
set role = excluded.role,
    permissions = excluded.permissions;

insert into public.agency_service_plans (id, tenant_id, name, price, base_cost, features, limits, is_active, is_archived)
values ('${agencyPlanId}', '${agencyTenantId}', 'RLS Probe Plan', 200, 75, '{"seo":true}'::jsonb, '{"projects":3}'::jsonb, true, false)
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    name = excluded.name,
    price = excluded.price,
    base_cost = excluded.base_cost,
    features = excluded.features,
    limits = excluded.limits,
    is_active = excluded.is_active,
    is_archived = excluded.is_archived;

insert into public.agency_clients (agency_tenant_id, client_tenant_id, status, lifecycle_stage, agency_plan_id, billing_mode, onboarding_status, metadata)
values
  ('${agencyTenantId}', '${clientTenantId}', 'active', 'live', '${agencyPlanId}', 'direct', 'paid', '{"probe":"own-client"}'::jsonb),
  ('${agencyTenantId}', '${otherClientTenantId}', 'active', 'live', '${agencyPlanId}', 'direct', 'paid', '{"probe":"other-client"}'::jsonb)
on conflict (agency_tenant_id, client_tenant_id) do update
set status = excluded.status,
    lifecycle_stage = excluded.lifecycle_stage,
    agency_plan_id = excluded.agency_plan_id,
    billing_mode = excluded.billing_mode,
    onboarding_status = excluded.onboarding_status,
    metadata = excluded.metadata;

insert into public.agency_client_notes (agency_tenant_id, client_tenant_id, note, visibility, created_by)
values
  ('${agencyTenantId}', '${clientTenantId}', 'RLS probe internal note', 'internal', '${syntheticAgencyOwnerId}'),
  ('${agencyTenantId}', '${clientTenantId}', 'RLS probe visible note', 'client_visible', '${syntheticAgencyOwnerId}'),
  ('${agencyTenantId}', '${otherClientTenantId}', 'RLS probe other visible note', 'client_visible', '${syntheticAgencyOwnerId}');

insert into public.agency_reports (agency_tenant_id, client_tenant_id, report_type, period_start, period_end, data, ai_summary, status, generated_by)
values
  ('${agencyTenantId}', '${clientTenantId}', 'monthly_summary', current_date - interval '30 days', current_date, '{"revenue":200,"margin":125}'::jsonb, 'Internal draft summary', 'draft', '${syntheticAgencyOwnerId}'),
  ('${agencyTenantId}', '${clientTenantId}', 'monthly_summary', current_date - interval '30 days', current_date, '{"public":"sent"}'::jsonb, 'Client visible sent summary', 'sent', '${syntheticAgencyOwnerId}'),
  ('${agencyTenantId}', '${otherClientTenantId}', 'monthly_summary', current_date - interval '30 days', current_date, '{"public":"other"}'::jsonb, 'Other client sent summary', 'sent', '${syntheticAgencyOwnerId}');

insert into public.agency_client_payment_links (token, agency_tenant_id, client_tenant_id, agency_plan_id, status, plan_name, plan_features, monthly_price, currency, expires_at, created_by)
values
  ('agency-rls-probe-own-link', '${agencyTenantId}', '${clientTenantId}', '${agencyPlanId}', 'pending', 'RLS Probe Plan', '["seo"]'::jsonb, 200, 'usd', now() + interval '7 days', '${syntheticAgencyOwnerId}'),
  ('agency-rls-probe-other-link', '${agencyTenantId}', '${otherClientTenantId}', '${agencyPlanId}', 'pending', 'RLS Probe Plan', '["seo"]'::jsonb, 200, 'usd', now() + interval '7 days', '${syntheticAgencyOwnerId}')
on conflict (token) do update
set status = excluded.status,
    expires_at = excluded.expires_at;

insert into public.agency_usage_ledger (agency_tenant_id, client_tenant_id, agency_plan_id, source, usage_type, usage_quantity, unit_cost, unit_price, billing_status, idempotency_key)
values ('${agencyTenantId}', '${clientTenantId}', '${agencyPlanId}', 'rls-probe', 'subscription', 1, 75, 200, 'active', 'agency-rls-probe-ledger');

insert into public.agency_billing_events (provider, event_id, event_type, agency_tenant_id, client_tenant_id, payment_link_token, status, payload)
values ('stripe', 'evt_agency_rls_probe', 'invoice.paid', '${agencyTenantId}', '${clientTenantId}', 'agency-rls-probe-own-link', 'processed', '{"probe":true}'::jsonb)
on conflict (provider, event_id) do update
set status = excluded.status,
    payload = excluded.payload;

set local role authenticated;
select set_config('request.jwt.claim.sub','${syntheticUserId}', true);
select set_config('request.jwt.claim.role','authenticated', true);
select
  (select count(*) from public.agency_usage_ledger where agency_tenant_id = '${agencyTenantId}') as ledger_rows,
  (select count(*) from public.agency_billing_events where agency_tenant_id = '${agencyTenantId}') as billing_event_rows,
  (select count(*) from public.agency_service_plans where tenant_id = '${agencyTenantId}') as agency_service_plan_rows,
  (select count(*) from public.subscription_plans where coalesce(show_in_landing, false) = false or coalesce(is_archived, false) = true) as private_subscription_rows,
  (select count(*) from public.agency_clients where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${clientTenantId}') as own_relationship_rows,
  (select count(*) from public.agency_clients where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${otherClientTenantId}') as other_relationship_rows,
  (select count(*) from public.agency_client_notes where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${clientTenantId}' and visibility = 'client_visible') as own_visible_note_rows,
  (select count(*) from public.agency_client_notes where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${clientTenantId}' and visibility = 'internal') as own_internal_note_rows,
  (select count(*) from public.agency_client_notes where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${otherClientTenantId}') as other_note_rows,
  (select count(*) from public.agency_reports where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${clientTenantId}' and status in ('sent', 'published')) as own_sent_report_rows,
  (select count(*) from public.agency_reports where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${clientTenantId}' and status = 'draft') as own_draft_report_rows,
  (select count(*) from public.agency_reports where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${otherClientTenantId}') as other_report_rows,
  (select count(*) from public.agency_client_payment_links where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${clientTenantId}') as own_payment_link_rows,
  (select count(*) from public.agency_client_payment_links where agency_tenant_id = '${agencyTenantId}' and client_tenant_id = '${otherClientTenantId}') as other_payment_link_rows;
rollback;
`;

function readAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  const tokenPath = `${homedir()}/.supabase/access-token`;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf8').trim();
  return '';
}

function run() {
  const accessToken = readAccessToken();
  if (!accessToken) {
    console.error('agency-rls-negative-probe: missing SUPABASE_ACCESS_TOKEN');
    process.exitCode = 1;
    return;
  }

  const output = execFileSync('npx', ['supabase', 'db', 'query', '--linked', '--output', 'json', sql], {
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const jsonStart = output.indexOf('{');
  const jsonEnd = output.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    throw new Error('Supabase CLI did not return JSON output');
  }

  const result = JSON.parse(output.slice(jsonStart, jsonEnd + 1));
  const row = result.rows?.[0] || {};
  const expectedZero = [
    ['agency_usage_ledger', row.ledger_rows],
    ['agency_billing_events', row.billing_event_rows],
    ['agency_service_plans', row.agency_service_plan_rows],
    ['private_subscription_plans', row.private_subscription_rows],
    ['other_agency_client_relationships', row.other_relationship_rows],
    ['own_internal_notes', row.own_internal_note_rows],
    ['other_client_notes', row.other_note_rows],
    ['own_draft_reports', row.own_draft_report_rows],
    ['other_client_reports', row.other_report_rows],
    ['other_client_payment_links', row.other_payment_link_rows],
  ].filter(([, value]) => Number(value) !== 0);
  const expectedOne = [
    ['own_agency_client_relationship', row.own_relationship_rows],
    ['own_client_visible_notes', row.own_visible_note_rows],
    ['own_sent_reports', row.own_sent_report_rows],
    ['own_payment_links', row.own_payment_link_rows],
  ].filter(([, value]) => Number(value) !== 1);
  const failures = [...expectedZero, ...expectedOne];

  if (failures.length > 0) {
    console.error(`agency-rls-negative-probe: FAIL ${failures.map(([name, value]) => `${name}=${value}`).join(' ')}`);
    process.exitCode = 1;
    return;
  }

  console.log('agency-rls-negative-probe: PASS synthetic client sees only client-visible Agency rows and no internal billing/cost rows');
}

try {
  run();
} catch (error) {
  console.error(`agency-rls-negative-probe: ${error?.message || error}`);
  process.exitCode = 1;
}
