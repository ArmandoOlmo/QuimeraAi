#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const requiredTables = [
  'agency_service_plans',
  'agency_clients',
  'agency_project_transfers',
  'agency_client_approvals',
  'agency_client_payment_links',
  'agency_activity',
  'agency_reports',
  'agency_client_notes',
  'agency_usage_ledger',
  'agency_billing_events',
  'agency_snapshots',
  'agency_snapshot_versions',
  'agency_snapshot_applications',
  'subscription_plans',
];

const requiredColumns = {
  agency_usage_ledger: [
    'id',
    'agency_tenant_id',
    'client_tenant_id',
    'source_module',
    'usage_type',
    'usage_quantity',
    'unit_cost',
    'platform_cost',
    'client_price',
    'agency_markup_type',
    'agency_markup_value',
    'margin_amount',
    'billing_status',
    'idempotency_key',
    'source_entity_type',
    'source_entity_id',
  ],
  agency_billing_events: [
    'id',
    'provider',
    'event_id',
    'provider_event_id',
    'idempotency_key',
    'stripe_checkout_session_id',
    'stripe_subscription_id',
    'status',
    'processed_at',
  ],
  agency_snapshot_versions: ['id', 'snapshot_id', 'version', 'payload', 'included_modules', 'readiness', 'checksum'],
  agency_snapshot_applications: ['id', 'snapshot_id', 'snapshot_version_id', 'preview', 'applied_changes', 'error', 'completed_at', 'idempotency_key'],
};

const protectedFromAnonTables = [
  'agency_service_plans',
  'agency_clients',
  'agency_project_transfers',
  'agency_client_approvals',
  'agency_client_payment_links',
  'agency_activity',
  'agency_reports',
  'agency_client_notes',
  'agency_usage_ledger',
  'agency_billing_events',
  'agency_snapshots',
  'agency_snapshot_versions',
  'agency_snapshot_applications',
];

const requiredIndexes = [
  'agency_usage_ledger_agency_idempotency_uidx',
  'agency_billing_events_provider_event_id_uidx',
  'agency_billing_events_idempotency_uidx',
  'agency_snapshot_applications_agency_idempotency_uidx',
];

function sqlValues(values) {
  return values.map(value => `('${String(value).replaceAll("'", "''")}')`).join(',\n    ');
}

function sqlColumnValues(columnsByTable) {
  return Object.entries(columnsByTable)
    .flatMap(([table, columns]) => columns.map(column => `('${table}', '${column}')`))
    .join(',\n    ');
}

const sql = `
with required_tables(table_name) as (
  values
    ${sqlValues(requiredTables)}
),
required_columns(table_name, column_name) as (
  values
    ${sqlColumnValues(requiredColumns)}
),
protected_tables(table_name) as (
  values
    ${sqlValues(protectedFromAnonTables)}
),
required_indexes(index_name) as (
  values
    ${sqlValues(requiredIndexes)}
),
table_status as (
  select
    rt.table_name,
    c.relrowsecurity
  from required_tables rt
  left join pg_class c
    on c.relname = rt.table_name
  left join pg_namespace n
    on n.oid = c.relnamespace
   and n.nspname = 'public'
)
select
  coalesce((
    select jsonb_agg(table_name order by table_name)
    from table_status
    where relrowsecurity is null
  ), '[]'::jsonb) as missing_tables,
  coalesce((
    select jsonb_agg(table_name order by table_name)
    from table_status
    where relrowsecurity is false
  ), '[]'::jsonb) as rls_disabled,
  coalesce((
    select jsonb_agg(concat(rc.table_name, '.', rc.column_name) order by rc.table_name, rc.column_name)
    from required_columns rc
    left join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = rc.table_name
     and c.column_name = rc.column_name
    where c.column_name is null
  ), '[]'::jsonb) as missing_columns,
  coalesce((
    select jsonb_agg(index_name order by index_name)
    from required_indexes ri
    left join pg_indexes i
      on i.schemaname = 'public'
     and i.indexname = ri.index_name
    where i.indexname is null
  ), '[]'::jsonb) as missing_indexes,
  coalesce((
    select jsonb_agg(label order by label)
    from (
      select distinct concat(g.table_name, ':', g.privilege_type) as label
      from information_schema.role_table_grants g
      join protected_tables pt
        on pt.table_name = g.table_name
      where g.table_schema = 'public'
        and g.grantee = 'anon'
    ) grants
  ), '[]'::jsonb) as unexpected_anon_grants;
`;

function readAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  const tokenPath = `${homedir()}/.supabase/access-token`;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf8').trim();
  return '';
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function run() {
  const accessToken = readAccessToken();
  if (!accessToken) {
    console.error('agency-schema-contract-probe: missing SUPABASE_ACCESS_TOKEN');
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
  const failures = [
    ['missing_tables', normalizeArray(row.missing_tables)],
    ['rls_disabled', normalizeArray(row.rls_disabled)],
    ['missing_columns', normalizeArray(row.missing_columns)],
    ['missing_indexes', normalizeArray(row.missing_indexes)],
    ['unexpected_anon_grants', normalizeArray(row.unexpected_anon_grants)],
  ].filter(([, values]) => values.length > 0);

  if (failures.length > 0) {
    console.error(`agency-schema-contract-probe: FAIL ${failures.map(([name, values]) => `${name}=${values.join('|')}`).join(' ')}`);
    process.exitCode = 1;
    return;
  }

  console.log('agency-schema-contract-probe: PASS Agency schema contract tables, columns, RLS, anon grants, and idempotency indexes are production-ready');
}

try {
  run();
} catch (error) {
  console.error(`agency-schema-contract-probe: ${error?.message || error}`);
  process.exitCode = 1;
}
