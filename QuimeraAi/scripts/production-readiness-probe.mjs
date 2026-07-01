#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

const PRODUCTION_ORIGIN = 'https://www.quimera.ai';
const DEFAULT_TIMEOUT_MS = 8000;

const PLACEHOLDER_PATTERN = /^(your_|placeholder|changeme|change-me|example|ci-placeholder|test-|dummy)/i;

export function parseProbeArgs(args = []) {
  const options = {
    live: false,
    strict: false,
    json: false,
    requireCloudflare: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--live') options.live = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--require-cloudflare') options.requireCloudflare = true;
    else if (arg === '--timeout-ms') {
      const next = Number(args[index + 1]);
      if (Number.isFinite(next) && next > 0) options.timeoutMs = next;
      index += 1;
    }
  }

  return options;
}

export async function runProductionReadinessProbe(input = {}) {
  const env = input.env || process.env;
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  const options = {
    live: Boolean(input.live),
    strict: Boolean(input.strict),
    requireCloudflare: Boolean(input.requireCloudflare),
    timeoutMs: Number(input.timeoutMs || DEFAULT_TIMEOUT_MS),
  };
  const checks = [];

  const add = (check) => {
    checks.push({
      name: check.name,
      status: check.status,
      severity: check.severity || (check.status === 'fail' ? 'critical' : 'info'),
      evidence: check.evidence,
    });
  };

  const requireValue = (name, config = {}) => {
    const value = readEnv(env, name);
    const minLength = Number(config.minLength || 1);
    if (!value) {
      if (hasVercelProductionEnv(name)) {
        add({ name, status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
        return '';
      }

      add({ name, status: 'fail', severity: 'critical', evidence: 'missing' });
      return '';
    }
    if (PLACEHOLDER_PATTERN.test(value)) {
      add({ name, status: 'fail', severity: 'critical', evidence: 'placeholder-like value' });
      return value;
    }
    if (value.length < minLength) {
      add({ name, status: 'fail', severity: 'critical', evidence: `too short; length ${value.length}` });
      return value;
    }
    if (config.pattern && !config.pattern.test(value)) {
      add({ name, status: 'fail', severity: 'critical', evidence: config.patternEvidence || 'unexpected format' });
      return value;
    }
    add({ name, status: 'pass', evidence: `present; length ${value.length}` });
    return value;
  };

  const requireUrl = (name, config = {}) => {
    const value = requireValue(name, { minLength: config.minLength || 8 });
    const parsed = parseUrl(value);
    if (!value) {
      if (hasVercelProductionEnv(name)) {
        add({ name: `${name}:url`, status: 'skip', severity: 'info', evidence: 'value not available to local probe' });
      }
      return '';
    }
    if (!parsed) {
      add({ name: `${name}:url`, status: 'fail', severity: 'critical', evidence: 'not a valid URL' });
      return value;
    }
    if (config.httpsOnly && parsed.protocol !== 'https:') {
      add({ name: `${name}:url`, status: 'fail', severity: 'critical', evidence: 'must use https' });
      return value;
    }
    if (config.expectedOrigin && parsed.origin !== config.expectedOrigin) {
      add({
        name: `${name}:origin`,
        status: options.strict ? 'fail' : 'warn',
        severity: options.strict ? 'critical' : 'warning',
        evidence: `origin is ${parsed.origin}; expected ${config.expectedOrigin}`,
      });
    } else {
      add({ name: `${name}:url`, status: 'pass', evidence: `valid URL; host ${parsed.host}` });
    }
    return value;
  };

  const supabaseUrl = readEnv(env, 'SUPABASE_URL') || readEnv(env, 'VITE_SUPABASE_URL');
  const supabaseProjectRef = readEnv(env, 'SUPABASE_PROJECT_REF') || inferSupabaseProjectRef(supabaseUrl);
  const supabaseAccessToken = readEnv(env, 'SUPABASE_ACCESS_TOKEN');
  const supabaseEdgeSecretNames = parseNameSet(readEnv(env, 'SUPABASE_EDGE_SECRET_NAMES'));
  const vercelProductionEnvNames = parseNameSet(readEnv(env, 'VERCEL_PRODUCTION_ENV_NAMES'));
  const canLiveCheckSupabaseEdgeSecrets = Boolean(supabaseAccessToken && supabaseProjectRef && options.live);
  const hasVercelProductionEnv = (name) => vercelProductionEnvNames.has(name);
  const cronSecret = requireValue('CRON_SECRET', { minLength: 24 });
  const appBaseUrl = requireUrl('APP_BASE_URL', { httpsOnly: true, expectedOrigin: PRODUCTION_ORIGIN });
  const publicAppUrl = requireUrl('VITE_PUBLIC_APP_URL', { httpsOnly: true, expectedOrigin: PRODUCTION_ORIGIN });
  const serviceRoleKey = requireValue('SUPABASE_SERVICE_ROLE_KEY', { minLength: 80 });
  const publicSupabaseUrl = requireValue('VITE_SUPABASE_URL', { minLength: 8 });
  const anonKey = requireValue('VITE_SUPABASE_ANON_KEY', { minLength: 40 });
  const resendApiKey = readEnv(env, 'RESEND_API_KEY');
  const sendGridApiKey = readEnv(env, 'SENDGRID_API_KEY');
  validateEmailProviderConfig(add, resendApiKey, sendGridApiKey, hasVercelProductionEnv);
  const appointmentFrom = readEnv(env, 'APPOINTMENT_EMAIL_FROM') || readEnv(env, 'RESEND_FROM_EMAIL');
  if (appointmentFrom) {
    add({ name: 'APPOINTMENT_EMAIL_FROM_OR_RESEND_FROM_EMAIL', status: 'pass', evidence: 'present' });
  } else if (hasVercelProductionEnv('APPOINTMENT_EMAIL_FROM') || hasVercelProductionEnv('RESEND_FROM_EMAIL')) {
    add({ name: 'APPOINTMENT_EMAIL_FROM_OR_RESEND_FROM_EMAIL', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
  } else {
    add({ name: 'APPOINTMENT_EMAIL_FROM_OR_RESEND_FROM_EMAIL', status: 'fail', severity: 'critical', evidence: 'missing' });
  }
  const stripeSecretKey = requireValue('STRIPE_SECRET_KEY', {
    minLength: 20,
    pattern: /^sk_(test|live)_/,
    patternEvidence: 'expected Stripe secret key prefix',
  });
  requireRuntimeOrEdgeSecret('STRIPE_WEBHOOK_SECRET', {
    minLength: 20,
    pattern: /^whsec_/,
    patternEvidence: 'expected Stripe webhook signing secret prefix',
  });
  requireRuntimeOrEdgeSecret('STRIPE_SYNC_SECRET', { minLength: 24 });
  validateStripePublishableKey(add, readEnv(env, 'VITE_STRIPE_PUBLISHABLE_KEY'), hasVercelProductionEnv);
  const googleClientId = readEnv(env, 'GOOGLE_CALENDAR_CLIENT_ID') || readEnv(env, 'VITE_GOOGLE_CLIENT_ID');
  validateGoogleConfig(env, add, googleClientId, cronSecret, hasVercelProductionEnv);

  if (!supabaseUrl && (hasVercelProductionEnv('SUPABASE_URL') || hasVercelProductionEnv('VITE_SUPABASE_URL'))) {
    add({ name: 'SUPABASE_URL_OR_VITE_SUPABASE_URL', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
  } else if (!supabaseUrl) {
    add({ name: 'SUPABASE_URL_OR_VITE_SUPABASE_URL', status: 'fail', severity: 'critical', evidence: 'missing' });
  } else if (!parseUrl(supabaseUrl)) {
    add({ name: 'SUPABASE_URL_OR_VITE_SUPABASE_URL', status: 'fail', severity: 'critical', evidence: 'not a valid URL' });
  } else {
    add({
      name: 'SUPABASE_URL_OR_VITE_SUPABASE_URL',
      status: 'pass',
      evidence: `valid URL; host ${parseUrl(supabaseUrl).host}`,
    });
  }

  const cloudflareToken = readEnv(env, 'CLOUDFLARE_API_TOKEN');
  const cloudflareAccountId = readEnv(env, 'CLOUDFLARE_ACCOUNT_ID');
  validateCloudflareShape(add, cloudflareToken, cloudflareAccountId, options.requireCloudflare, hasVercelProductionEnv);

  if (options.live) {
    if (!fetchImpl) {
      add({ name: 'network', status: 'fail', severity: 'critical', evidence: 'fetch is unavailable' });
    } else {
      await runLiveChecks({
        add,
        fetchImpl,
        timeoutMs: options.timeoutMs,
        supabaseUrl,
        supabaseProjectRef,
        supabaseAccessToken,
        supabaseEdgeSecretNames,
        serviceRoleKey,
        anonKey,
        resendApiKey,
        sendGridApiKey,
        stripeSecretKey,
        cloudflareToken,
        googleConfigured: Boolean(googleClientId && readEnv(env, 'GOOGLE_CALENDAR_CLIENT_SECRET')),
      });
    }
  } else {
    add({ name: 'live-connectivity', status: 'skip', severity: 'info', evidence: 'run with --live to validate provider credentials' });
  }

  const criticalFailures = checks.filter(check => check.status === 'fail' && check.severity === 'critical');
  const warnings = checks.filter(check => check.status === 'warn' || check.severity === 'warning');

  return {
    ok: criticalFailures.length === 0,
    checkedAt: new Date().toISOString(),
    mode: {
      live: options.live,
      strict: options.strict,
      requireCloudflare: options.requireCloudflare,
    },
    summary: {
      passed: checks.filter(check => check.status === 'pass').length,
      failed: criticalFailures.length,
      warnings: warnings.length,
      skipped: checks.filter(check => check.status === 'skip').length,
    },
    checks,
  };

  function requireRuntimeOrEdgeSecret(name, config = {}) {
    const runtimeValue = readEnv(env, name);
    if (runtimeValue) {
      requireValue(name, config);
      return runtimeValue;
    }

    if (hasVercelProductionEnv(name)) {
      add({ name, status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
      return '';
    }

    if (supabaseEdgeSecretNames.has(name)) {
      add({ name, status: 'pass', evidence: 'configured in Supabase Edge secrets list' });
      return '';
    }

    if (canLiveCheckSupabaseEdgeSecrets) {
      add({ name, status: 'skip', severity: 'info', evidence: 'will verify via Supabase Edge secrets live check' });
      return '';
    }

    add({ name, status: 'fail', severity: 'critical', evidence: 'missing runtime value or Supabase Edge secret verification' });
    return '';
  }
}

function validateEmailProviderConfig(add, resendApiKey, sendGridApiKey, hasVercelProductionEnv = () => false) {
  if (!resendApiKey && !sendGridApiKey) {
    if (hasVercelProductionEnv('RESEND_API_KEY')) {
      add({ name: 'EMAIL_PROVIDER_API_KEY', status: 'pass', evidence: 'Resend configured in Vercel Production; value not available to local probe' });
      add({ name: 'RESEND_API_KEY', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
      add({ name: 'SENDGRID_API_KEY', status: 'skip', severity: 'info', evidence: 'not configured; Resend provider is available' });
      return;
    }

    if (hasVercelProductionEnv('SENDGRID_API_KEY')) {
      add({ name: 'EMAIL_PROVIDER_API_KEY', status: 'pass', evidence: 'SendGrid configured in Vercel Production; value not available to local probe' });
      add({ name: 'RESEND_API_KEY', status: 'skip', severity: 'info', evidence: 'not configured; SendGrid provider is available' });
      add({ name: 'SENDGRID_API_KEY', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
      return;
    }

    add({ name: 'EMAIL_PROVIDER_API_KEY', status: 'fail', severity: 'critical', evidence: 'missing RESEND_API_KEY or SENDGRID_API_KEY' });
    add({ name: 'RESEND_API_KEY', status: 'skip', severity: 'info', evidence: 'not configured' });
    add({ name: 'SENDGRID_API_KEY', status: 'skip', severity: 'info', evidence: 'not configured' });
    return;
  }

  const configuredProviders = [
    resendApiKey ? 'Resend' : null,
    sendGridApiKey ? 'SendGrid' : null,
  ].filter(Boolean).join(', ');
  add({ name: 'EMAIL_PROVIDER_API_KEY', status: 'pass', evidence: `${configuredProviders} configured` });

  if (!resendApiKey) {
    add({ name: 'RESEND_API_KEY', status: 'skip', severity: 'info', evidence: 'not configured; SendGrid provider is available' });
  } else if (PLACEHOLDER_PATTERN.test(resendApiKey)) {
    add({ name: 'RESEND_API_KEY', status: 'fail', severity: 'critical', evidence: 'placeholder-like value' });
  } else if (resendApiKey.length < 20) {
    add({ name: 'RESEND_API_KEY', status: 'fail', severity: 'critical', evidence: `too short; length ${resendApiKey.length}` });
  } else if (!/^re_/.test(resendApiKey)) {
    add({ name: 'RESEND_API_KEY', status: 'fail', severity: 'critical', evidence: 'expected Resend key prefix' });
  } else {
    add({ name: 'RESEND_API_KEY', status: 'pass', evidence: `present; length ${resendApiKey.length}` });
  }

  if (!sendGridApiKey) {
    add({ name: 'SENDGRID_API_KEY', status: 'skip', severity: 'info', evidence: 'not configured; Resend provider is available' });
  } else if (PLACEHOLDER_PATTERN.test(sendGridApiKey)) {
    add({ name: 'SENDGRID_API_KEY', status: 'fail', severity: 'critical', evidence: 'placeholder-like value' });
  } else if (sendGridApiKey.length < 20) {
    add({ name: 'SENDGRID_API_KEY', status: 'fail', severity: 'critical', evidence: `too short; length ${sendGridApiKey.length}` });
  } else {
    add({ name: 'SENDGRID_API_KEY', status: 'pass', evidence: `present; length ${sendGridApiKey.length}` });
  }
}

function validateStripePublishableKey(add, publishableKey, hasVercelProductionEnv = () => false) {
  if (!publishableKey) {
    if (hasVercelProductionEnv('VITE_STRIPE_PUBLISHABLE_KEY')) {
      add({ name: 'VITE_STRIPE_PUBLISHABLE_KEY', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
      return;
    }

    add({
      name: 'VITE_STRIPE_PUBLISHABLE_KEY',
      status: 'warn',
      severity: 'warning',
      evidence: 'missing global fallback; checkout can still use per-store stripe_publishable_key',
    });
    return;
  }

  if (PLACEHOLDER_PATTERN.test(publishableKey)) {
    add({ name: 'VITE_STRIPE_PUBLISHABLE_KEY', status: 'fail', severity: 'critical', evidence: 'placeholder-like value' });
    return;
  }

  if (!/^pk_(test|live)_/.test(publishableKey)) {
    add({ name: 'VITE_STRIPE_PUBLISHABLE_KEY', status: 'fail', severity: 'critical', evidence: 'expected Stripe publishable key prefix' });
    return;
  }

  add({ name: 'VITE_STRIPE_PUBLISHABLE_KEY', status: 'pass', evidence: `present; length ${publishableKey.length}` });
}

function validateGoogleConfig(env, add, googleClientId, cronSecret, hasVercelProductionEnv = () => false) {
  if (!googleClientId) {
    if (hasVercelProductionEnv('GOOGLE_CALENDAR_CLIENT_ID') || hasVercelProductionEnv('VITE_GOOGLE_CLIENT_ID')) {
      add({ name: 'GOOGLE_CALENDAR_CLIENT_ID_OR_VITE_GOOGLE_CLIENT_ID', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
    } else {
      add({ name: 'GOOGLE_CALENDAR_CLIENT_ID_OR_VITE_GOOGLE_CLIENT_ID', status: 'fail', severity: 'critical', evidence: 'missing' });
    }
  } else if (!/\.apps\.googleusercontent\.com$/.test(googleClientId)) {
    add({ name: 'GOOGLE_CALENDAR_CLIENT_ID_OR_VITE_GOOGLE_CLIENT_ID', status: 'fail', severity: 'critical', evidence: 'unexpected client id shape' });
  } else {
    add({ name: 'GOOGLE_CALENDAR_CLIENT_ID_OR_VITE_GOOGLE_CLIENT_ID', status: 'pass', evidence: 'present; expected OAuth client id shape' });
  }

  const clientSecret = readEnv(env, 'GOOGLE_CALENDAR_CLIENT_SECRET');
  if (!clientSecret) {
    if (hasVercelProductionEnv('GOOGLE_CALENDAR_CLIENT_SECRET')) {
      add({ name: 'GOOGLE_CALENDAR_CLIENT_SECRET', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
    } else {
      add({ name: 'GOOGLE_CALENDAR_CLIENT_SECRET', status: 'fail', severity: 'critical', evidence: 'missing' });
    }
  } else if (clientSecret.length < 20 || PLACEHOLDER_PATTERN.test(clientSecret)) {
    add({ name: 'GOOGLE_CALENDAR_CLIENT_SECRET', status: 'fail', severity: 'critical', evidence: 'unexpected secret shape' });
  } else {
    add({ name: 'GOOGLE_CALENDAR_CLIENT_SECRET', status: 'pass', evidence: `present; length ${clientSecret.length}` });
  }

  const encryptionKey = readEnv(env, 'GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) {
    if (hasVercelProductionEnv('GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY')) {
      add({ name: 'GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
    } else {
      add({ name: 'GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY', status: 'fail', severity: 'critical', evidence: 'missing' });
    }
  } else if (!isStrongGoogleEncryptionKey(encryptionKey)) {
    add({
      name: 'GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY',
      status: 'warn',
      severity: 'warning',
      evidence: 'runtime can hash arbitrary input, but 32-byte hex/base64 key is preferred',
    });
  } else {
    add({ name: 'GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY', status: 'pass', evidence: 'present; 32-byte hex/base64 shape' });
  }

  const stateSecret = readEnv(env, 'GOOGLE_CALENDAR_OAUTH_STATE_SECRET') || cronSecret;
  if (stateSecret || hasVercelProductionEnv('GOOGLE_CALENDAR_OAUTH_STATE_SECRET') || hasVercelProductionEnv('CRON_SECRET')) {
    add({ name: 'GOOGLE_CALENDAR_OAUTH_STATE_SECRET_OR_CRON_SECRET', status: 'pass', evidence: 'present' });
  } else {
    add({ name: 'GOOGLE_CALENDAR_OAUTH_STATE_SECRET_OR_CRON_SECRET', status: 'fail', severity: 'critical', evidence: 'missing' });
  }

  validateUrlValue(add, 'GOOGLE_CALENDAR_REDIRECT_URI', readEnv(env, 'GOOGLE_CALENDAR_REDIRECT_URI'), '/api/appointments/google/oauth/callback', PRODUCTION_ORIGIN, hasVercelProductionEnv);
  validateUrlValue(add, 'GOOGLE_CALENDAR_WEBHOOK_URL', readEnv(env, 'GOOGLE_CALENDAR_WEBHOOK_URL'), '/api/appointments/google/webhook', PRODUCTION_ORIGIN, hasVercelProductionEnv);
}

function validateUrlValue(add, name, value, expectedPath, expectedOrigin = PRODUCTION_ORIGIN, hasVercelProductionEnv = () => false) {
  if (!value) {
    if (hasVercelProductionEnv(name)) {
      add({ name, status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
    } else {
      add({ name, status: 'fail', severity: 'critical', evidence: 'missing' });
    }
    return;
  }
  const parsed = parseUrl(value);
  if (!parsed) {
    add({ name, status: 'fail', severity: 'critical', evidence: 'not a valid URL' });
    return;
  }
  if (parsed.protocol !== 'https:') {
    add({ name, status: 'fail', severity: 'critical', evidence: 'must use https' });
    return;
  }
  if (expectedOrigin && parsed.origin !== expectedOrigin) {
    add({ name: `${name}:origin`, status: 'fail', severity: 'critical', evidence: `origin is ${parsed.origin}; expected ${expectedOrigin}` });
    return;
  }
  if (expectedPath && parsed.pathname !== expectedPath) {
    add({ name: `${name}:path`, status: 'fail', severity: 'critical', evidence: `path is ${parsed.pathname}; expected ${expectedPath}` });
    return;
  }
  add({ name, status: 'pass', evidence: `valid URL; origin ${parsed.origin}; path ${parsed.pathname}` });
}

function validateCloudflareShape(add, token, accountId, requireCloudflare, hasVercelProductionEnv = () => false) {
  const hasConfiguredCloudflareToken = hasVercelProductionEnv('CLOUDFLARE_API_TOKEN');
  const hasConfiguredCloudflareAccountId = hasVercelProductionEnv('CLOUDFLARE_ACCOUNT_ID');

  if (!token && !accountId && !requireCloudflare && !hasConfiguredCloudflareToken && !hasConfiguredCloudflareAccountId) {
    add({ name: 'CLOUDFLARE_API_TOKEN', status: 'skip', severity: 'info', evidence: 'not configured; browser token exposure remains disabled' });
    add({ name: 'CLOUDFLARE_ACCOUNT_ID', status: 'skip', severity: 'info', evidence: 'not configured; browser token exposure remains disabled' });
    return;
  }

  if (!token) {
    if (hasConfiguredCloudflareToken) {
      add({ name: 'CLOUDFLARE_API_TOKEN', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
    } else {
      add({
        name: 'CLOUDFLARE_API_TOKEN',
        status: requireCloudflare ? 'fail' : 'warn',
        severity: requireCloudflare ? 'critical' : 'warning',
        evidence: 'missing',
      });
    }
  } else if (token.length < 20 || PLACEHOLDER_PATTERN.test(token)) {
    add({ name: 'CLOUDFLARE_API_TOKEN', status: 'fail', severity: 'critical', evidence: 'unexpected token shape' });
  } else {
    add({ name: 'CLOUDFLARE_API_TOKEN', status: 'pass', evidence: `present; length ${token.length}` });
  }

  if (!accountId) {
    if (hasConfiguredCloudflareAccountId) {
      add({ name: 'CLOUDFLARE_ACCOUNT_ID', status: 'pass', evidence: 'configured in Vercel Production; value not available to local probe' });
    } else {
      add({
        name: 'CLOUDFLARE_ACCOUNT_ID',
        status: requireCloudflare ? 'fail' : 'warn',
        severity: requireCloudflare ? 'critical' : 'warning',
        evidence: 'missing',
      });
    }
  } else if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    add({ name: 'CLOUDFLARE_ACCOUNT_ID', status: 'fail', severity: 'critical', evidence: 'unexpected account id shape' });
  } else {
    add({ name: 'CLOUDFLARE_ACCOUNT_ID', status: 'pass', evidence: 'present; expected account id shape' });
  }
}

async function runLiveChecks(input) {
  await Promise.all([
    checkSupabase(input),
    checkAgencySupabaseSchema(input),
    checkAgencyRlsNegative(input),
    checkSupabaseEdgeSecrets(input),
    checkResend(input),
    checkSendGrid(input),
    checkStripe(input),
    checkGoogleCalendarDiscovery(input),
    checkCloudflare(input),
  ]);
}

async function checkAgencySupabaseSchema({ add, fetchImpl, timeoutMs, supabaseUrl, serviceRoleKey }) {
  if (!supabaseUrl || !serviceRoleKey || !parseUrl(supabaseUrl)) {
    add({ name: 'agency-supabase-schema', status: 'skip', severity: 'info', evidence: 'missing URL or service role shape prerequisite' });
    return;
  }

  const requiredTables = [
    'agency_service_plans',
    'agency_clients',
    'agency_client_payment_links',
    'agency_client_approvals',
    'agency_reports',
    'agency_activity',
    'agency_usage_ledger',
    'agency_billing_events',
    'agency_snapshots',
    'agency_snapshot_versions',
    'agency_snapshot_applications',
    'subscription_plans',
  ];
  const requiredColumnChecks = [
    {
      table: 'agency_usage_ledger',
      columns: [
        'id',
        'source_module',
        'usage_type',
        'unit_cost',
        'platform_cost',
        'client_price',
        'agency_markup_type',
        'agency_markup_value',
        'margin_amount',
        'idempotency_key',
        'source_entity_type',
        'source_entity_id',
      ],
    },
    {
      table: 'agency_billing_events',
      columns: [
        'id',
        'provider',
        'event_id',
        'provider_event_id',
        'idempotency_key',
        'stripe_checkout_session_id',
        'stripe_subscription_id',
        'processed_at',
      ],
    },
    {
      table: 'agency_snapshot_versions',
      columns: ['id', 'payload', 'included_modules', 'readiness', 'checksum'],
    },
    {
      table: 'agency_snapshot_applications',
      columns: ['id', 'preview', 'applied_changes', 'error', 'completed_at', 'idempotency_key'],
    },
  ];

  const tableResults = await Promise.all(requiredTables.map(async (table) => {
    const endpoint = new URL(`/rest/v1/${table}`, supabaseUrl);
    endpoint.searchParams.set('select', 'id');
    endpoint.searchParams.set('limit', '0');
    const response = await safeFetch(fetchImpl, endpoint, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }, timeoutMs);
    return { table, response };
  }));
  const columnResults = await Promise.all(requiredColumnChecks.map(async (check) => {
    const endpoint = new URL(`/rest/v1/${check.table}`, supabaseUrl);
    endpoint.searchParams.set('select', check.columns.join(','));
    endpoint.searchParams.set('limit', '0');
    const response = await safeFetch(fetchImpl, endpoint, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }, timeoutMs);
    return { ...check, response };
  }));

  const failedTables = tableResults.filter(({ response }) => !response.ok || response.status >= 400);
  const failedColumns = columnResults.filter(({ response }) => !response.ok || response.status >= 400);
  if (failedTables.length === 0 && failedColumns.length === 0) {
    add({
      name: 'agency-supabase-schema',
      status: 'pass',
      evidence: `${requiredTables.length} Agency tables and ${requiredColumnChecks.length} production column contracts reachable with service role`,
    });
    return;
  }

  const evidenceParts = [];
  if (failedTables.length > 0) {
    evidenceParts.push(`unreachable tables: ${failedTables.map(({ table }) => table).join(', ')}`);
  }
  if (failedColumns.length > 0) {
    evidenceParts.push(`missing contract columns: ${failedColumns.map(({ table, columns }) => `${table}(${columns.join(',')})`).join(', ')}`);
  }

  add({
    name: 'agency-supabase-schema',
    status: 'fail',
    severity: 'critical',
    evidence: evidenceParts.join('; '),
  });
}

async function checkSupabaseEdgeSecrets({
  add,
  fetchImpl,
  timeoutMs,
  supabaseProjectRef,
  supabaseAccessToken,
  supabaseEdgeSecretNames,
}) {
  const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_SYNC_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_URL'];
  if (supabaseEdgeSecretNames?.size) {
    const missingFromNames = required.filter(name => !supabaseEdgeSecretNames.has(name));
    if (missingFromNames.length === 0) {
      add({ name: 'supabase-edge-secrets', status: 'pass', evidence: `${required.length} required Edge secret names present` });
      return;
    }
  }

  if (!supabaseProjectRef || !supabaseAccessToken) {
    add({ name: 'supabase-edge-secrets', status: 'skip', severity: 'info', evidence: 'SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN missing' });
    return;
  }

  const response = await safeFetch(fetchImpl, `https://api.supabase.com/v1/projects/${supabaseProjectRef}/secrets`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${supabaseAccessToken}` },
  }, timeoutMs);

  if (!response.ok || response.status >= 400) {
    add({ name: 'supabase-edge-secrets', status: 'fail', severity: 'critical', evidence: response.evidence });
    return;
  }

  const body = await response.json().catch(() => []);
  const names = new Set(Array.isArray(body) ? body.map(secret => secret?.name).filter(Boolean) : []);
  const missing = required.filter(name => !names.has(name));
  if (missing.length > 0) {
    add({ name: 'supabase-edge-secrets', status: 'fail', severity: 'critical', evidence: `missing Edge secrets: ${missing.join(', ')}` });
    return;
  }

  add({ name: 'supabase-edge-secrets', status: 'pass', evidence: `${required.length} required Edge secret names present` });
}

async function checkAgencyRlsNegative({ add, fetchImpl, timeoutMs, supabaseUrl, anonKey }) {
  if (!supabaseUrl || !anonKey || !parseUrl(supabaseUrl)) {
    add({ name: 'agency-rls-negative-anon', status: 'skip', severity: 'info', evidence: 'missing URL or anon key prerequisite' });
    return;
  }

  const probes = [
    {
      table: 'agency_usage_ledger',
      method: 'GET',
      search: { select: 'id', limit: '1' },
      expectedCode: '42501',
    },
    {
      table: 'agency_billing_events',
      method: 'GET',
      search: { select: 'id', limit: '1' },
      expectedCode: '42501',
    },
    {
      table: 'subscription_plans',
      method: 'POST',
      body: {},
      expectedCode: '42501',
    },
  ];

  const results = await Promise.all(probes.map(async (probe) => {
    const endpoint = new URL(`/rest/v1/${probe.table}`, supabaseUrl);
    Object.entries(probe.search || {}).forEach(([key, value]) => endpoint.searchParams.set(key, value));
    const response = await safeFetch(fetchImpl, endpoint, {
      method: probe.method,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    }, timeoutMs);
    const body = await response.json().catch(() => ({}));
    return {
      ...probe,
      status: response.status,
      code: typeof body?.code === 'string' ? body.code : '',
      evidence: response.evidence,
    };
  }));

  const leaks = results.filter(result => result.status < 400 || result.code !== result.expectedCode);
  if (leaks.length === 0) {
    add({ name: 'agency-rls-negative-anon', status: 'pass', evidence: `${results.length} anonymous Agency billing probes denied with 42501` });
    return;
  }

  add({
    name: 'agency-rls-negative-anon',
    status: 'fail',
    severity: 'critical',
    evidence: leaks.map(result => `${result.method} ${result.table} returned HTTP ${result.status}${result.code ? ` code ${result.code}` : ''}`).join('; '),
  });
}

async function checkSupabase({ add, fetchImpl, timeoutMs, supabaseUrl, serviceRoleKey }) {
  if (!supabaseUrl || !serviceRoleKey || !parseUrl(supabaseUrl)) {
    add({ name: 'supabase-rest-readonly', status: 'skip', severity: 'info', evidence: 'missing URL or service role shape prerequisite' });
    return;
  }
  const endpoint = new URL('/rest/v1/email_outbox', supabaseUrl);
  endpoint.searchParams.set('select', 'id');
  endpoint.searchParams.set('limit', '0');
  const response = await safeFetch(fetchImpl, endpoint, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  }, timeoutMs);
  if (response.ok && response.status < 400) {
    add({ name: 'supabase-rest-readonly', status: 'pass', evidence: `service role accepted by PostgREST; status ${response.status}` });
  } else {
    add({ name: 'supabase-rest-readonly', status: 'fail', severity: 'critical', evidence: response.evidence });
  }
}

async function checkResend({ add, fetchImpl, timeoutMs, resendApiKey }) {
  if (!resendApiKey) {
    add({ name: 'resend-api-readonly', status: 'skip', severity: 'info', evidence: 'RESEND_API_KEY missing' });
    return;
  }
  const response = await safeFetch(fetchImpl, 'https://api.resend.com/domains', {
    method: 'GET',
    headers: { Authorization: `Bearer ${resendApiKey}` },
  }, timeoutMs);
  if (response.ok && response.status < 400) {
    add({ name: 'resend-api-readonly', status: 'pass', evidence: `Resend accepted API key; status ${response.status}` });
  } else {
    add({ name: 'resend-api-readonly', status: 'fail', severity: 'critical', evidence: response.evidence });
  }
}

async function checkSendGrid({ add, fetchImpl, timeoutMs, sendGridApiKey }) {
  if (!sendGridApiKey) {
    add({ name: 'sendgrid-api-readonly', status: 'skip', severity: 'info', evidence: 'SENDGRID_API_KEY not configured' });
    return;
  }
  const response = await safeFetch(fetchImpl, 'https://api.sendgrid.com/v3/user/account', {
    method: 'GET',
    headers: { Authorization: `Bearer ${sendGridApiKey}` },
  }, timeoutMs);
  if (response.ok && response.status < 400) {
    add({ name: 'sendgrid-api-readonly', status: 'pass', evidence: `SendGrid accepted API key; status ${response.status}` });
  } else {
    add({ name: 'sendgrid-api-readonly', status: 'fail', severity: 'critical', evidence: response.evidence });
  }
}

async function checkStripe({ add, fetchImpl, timeoutMs, stripeSecretKey }) {
  if (!stripeSecretKey) {
    add({ name: 'stripe-account-readonly', status: 'skip', severity: 'info', evidence: 'STRIPE_SECRET_KEY missing' });
    return;
  }
  const response = await safeFetch(fetchImpl, 'https://api.stripe.com/v1/account', {
    method: 'GET',
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  }, timeoutMs);
  if (response.ok && response.status < 400) {
    add({ name: 'stripe-account-readonly', status: 'pass', evidence: `Stripe accepted secret key; status ${response.status}` });
  } else {
    add({ name: 'stripe-account-readonly', status: 'fail', severity: 'critical', evidence: response.evidence });
  }
}

async function checkGoogleCalendarDiscovery({ add, fetchImpl, timeoutMs, googleConfigured }) {
  if (!googleConfigured) {
    add({ name: 'google-calendar-discovery', status: 'skip', severity: 'info', evidence: 'Google Calendar OAuth config missing' });
    return;
  }
  const response = await safeFetch(fetchImpl, 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest', {
    method: 'GET',
  }, timeoutMs);
  if (response.ok && response.status < 400) {
    add({
      name: 'google-calendar-discovery',
      status: 'pass',
      evidence: `Google Calendar API reachable; status ${response.status}; OAuth secret shape validated separately`,
    });
  } else {
    add({ name: 'google-calendar-discovery', status: 'fail', severity: 'critical', evidence: response.evidence });
  }
}

async function checkCloudflare({ add, fetchImpl, timeoutMs, cloudflareToken }) {
  if (!cloudflareToken) {
    add({ name: 'cloudflare-token-verify', status: 'skip', severity: 'info', evidence: 'CLOUDFLARE_API_TOKEN not configured' });
    return;
  }
  const response = await safeFetch(fetchImpl, 'https://api.cloudflare.com/client/v4/user/tokens/verify', {
    method: 'GET',
    headers: { Authorization: `Bearer ${cloudflareToken}` },
  }, timeoutMs);
  if (!response.ok || response.status >= 400) {
    add({ name: 'cloudflare-token-verify', status: 'fail', severity: 'critical', evidence: response.evidence });
    return;
  }
  const body = await response.json().catch(() => ({}));
  if (body?.success === true) {
    add({ name: 'cloudflare-token-verify', status: 'pass', evidence: `Cloudflare accepted API token; status ${response.status}` });
  } else {
    add({ name: 'cloudflare-token-verify', status: 'fail', severity: 'critical', evidence: 'Cloudflare token verify returned success=false' });
  }
}

async function safeFetch(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);
    return {
      ok: true,
      status: response.status,
      json: () => response.json(),
      evidence: `HTTP ${response.status}`,
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 0,
      json: async () => ({}),
      evidence: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : `request failed: ${error?.message || 'unknown error'}`,
    };
  }
}

function readEnv(env, name) {
  const value = env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

function parseNameSet(value) {
  return new Set(String(value || '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean));
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch (_error) {
    return null;
  }
}

function inferSupabaseProjectRef(supabaseUrl) {
  const parsed = parseUrl(supabaseUrl);
  if (!parsed) return '';
  const firstHostPart = parsed.hostname.split('.')[0] || '';
  return /^[a-z0-9]{20}$/i.test(firstHostPart) ? firstHostPart : '';
}

function isStrongGoogleEncryptionKey(value) {
  const trimmed = value.trim();
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return true;
  try {
    return Buffer.from(trimmed, 'base64').length === 32;
  } catch (_error) {
    return false;
  }
}

function printReport(result, json = false) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Production readiness probe: ${result.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Checked at: ${result.checkedAt}`);
  console.log(`Mode: live=${result.mode.live} strict=${result.mode.strict} requireCloudflare=${result.mode.requireCloudflare}`);
  console.log(`Summary: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.warnings} warnings, ${result.summary.skipped} skipped`);
  for (const check of result.checks) {
    console.log(`[${check.status.toUpperCase()}] ${check.name} - ${check.evidence}`);
  }
}

async function main() {
  const options = parseProbeArgs(process.argv.slice(2));
  const result = await runProductionReadinessProbe(options);
  printReport(result, options.json);
  if (options.strict && !result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(`Production readiness probe failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
