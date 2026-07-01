#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const syntheticUserId = '00000000-0000-4000-8000-000000000001';

const sql = `
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','${syntheticUserId}', true);
select set_config('request.jwt.claim.role','authenticated', true);
select
  (select count(*) from public.agency_usage_ledger) as ledger_rows,
  (select count(*) from public.agency_billing_events) as billing_event_rows,
  (select count(*) from public.subscription_plans where coalesce(show_in_landing, false) = false or coalesce(is_archived, false) = true) as private_subscription_rows;
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
  const failures = [
    ['agency_usage_ledger', row.ledger_rows],
    ['agency_billing_events', row.billing_event_rows],
    ['private_subscription_plans', row.private_subscription_rows],
  ].filter(([, value]) => Number(value) !== 0);

  if (failures.length > 0) {
    console.error(`agency-rls-negative-probe: FAIL ${failures.map(([name, value]) => `${name}=${value}`).join(' ')}`);
    process.exitCode = 1;
    return;
  }

  console.log('agency-rls-negative-probe: PASS synthetic authenticated user sees 0 protected Agency billing rows');
}

try {
  run();
} catch (error) {
  console.error(`agency-rls-negative-probe: ${error?.message || error}`);
  process.exitCode = 1;
}
