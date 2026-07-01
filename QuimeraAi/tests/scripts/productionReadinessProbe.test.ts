import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { runProductionReadinessProbe } from '../../scripts/production-readiness-probe.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VALID_ENV = {
  CRON_SECRET: 'cron-secret-with-enough-entropy-123456',
  APP_BASE_URL: 'https://www.quimera.ai',
  VITE_PUBLIC_APP_URL: 'https://www.quimera.ai',
  SUPABASE_URL: 'https://elfcrnhffuvntlfuvumd.supabase.co',
  VITE_SUPABASE_URL: 'https://elfcrnhffuvntlfuvumd.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-with-enough-length-to-look-like-a-real-server-only-secret-value-1234567890',
  VITE_SUPABASE_ANON_KEY: 'anon-key-with-enough-length-for-public-runtime-validation',
  RESEND_API_KEY: 're_123456789012345678901234567890',
  APPOINTMENT_EMAIL_FROM: 'Quimera Ai <no-reply@quimera.ai>',
  VITE_STRIPE_PUBLISHABLE_KEY: ['pk', 'test', '123456789012345678901234'].join('_'),
  STRIPE_SECRET_KEY: ['sk', 'test', '123456789012345678901234'].join('_'),
  STRIPE_WEBHOOK_SECRET: ['whsec', '123456789012345678901234'].join('_'),
  STRIPE_SYNC_SECRET: 'stripe-sync-secret-with-enough-entropy',
  GOOGLE_CALENDAR_CLIENT_ID: 'quimera-client.apps.googleusercontent.com',
  GOOGLE_CALENDAR_CLIENT_SECRET: 'google-client-secret-with-length',
  GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 'q').toString('base64'),
  GOOGLE_CALENDAR_REDIRECT_URI: 'https://www.quimera.ai/api/appointments/google/oauth/callback',
  GOOGLE_CALENDAR_WEBHOOK_URL: 'https://www.quimera.ai/api/appointments/google/webhook',
};

describe('production readiness probe', () => {
  it('keeps browser Supabase env references statically replaceable by Vite', () => {
    const source = readFileSync(resolve(__dirname, '../../supabase.ts'), 'utf8');

    expect(source).toContain('import.meta.env.VITE_SUPABASE_URL');
    expect(source).toContain('import.meta.env.VITE_SUPABASE_ANON_KEY');
    expect(source).not.toContain("getRuntimeEnv('VITE_SUPABASE_URL')");
    expect(source).not.toContain("getRuntimeEnv('VITE_SUPABASE_ANON_KEY')");
  });

  it('passes live read-only checks with valid production-shaped env', async () => {
    const fetchImpl = vi.fn(async (_url: URL | string, init?: RequestInit) => {
      const authorization = String((init?.headers as Record<string, string> | undefined)?.Authorization || '');
      if (authorization.includes(VALID_ENV.VITE_SUPABASE_ANON_KEY)) {
        return { status: 401, json: async () => ({ code: '42501' }) };
      }

      return {
        status: 200,
        json: async () => String(_url).includes('cloudflare') ? { success: true } : {},
      };
    });

    const result = await runProductionReadinessProbe({
      env: {
        ...VALID_ENV,
        CLOUDFLARE_API_TOKEN: 'cloudflare-token-with-valid-looking-length',
        CLOUDFLARE_ACCOUNT_ID: 'ccb57f67da1dab2a06002657d8ea5fb1',
      },
      fetchImpl,
      live: true,
      strict: true,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.failed).toBe(0);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'agency-supabase-schema', status: 'pass' }),
      expect.objectContaining({ name: 'agency-rls-negative-anon', status: 'pass' }),
    ]));
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://api.resend.com/domains'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://api.stripe.com/v1/account'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('fails live readiness when anonymous callers can reach protected Agency billing tables', async () => {
    const fetchImpl = vi.fn(async (_url: URL | string) => ({
      status: 200,
      json: async () => ({}),
    }));

    const result = await runProductionReadinessProbe({
      env: VALID_ENV,
      fetchImpl,
      live: true,
      strict: true,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'agency-rls-negative-anon', status: 'fail' }),
    ]));
  });

  it('fails live readiness when Agency production contract columns are missing', async () => {
    const fetchImpl = vi.fn(async (_url: URL | string, init?: RequestInit) => {
      const url = String(_url);
      const authorization = String((init?.headers as Record<string, string> | undefined)?.Authorization || '');
      if (authorization.includes(VALID_ENV.VITE_SUPABASE_ANON_KEY)) {
        return { status: 401, json: async () => ({ code: '42501' }) };
      }
      if (url.includes('agency_usage_ledger') && url.includes('source_module')) {
        return { status: 400, json: async () => ({ code: 'PGRST204' }) };
      }
      return { status: 200, json: async () => ({}) };
    });

    const result = await runProductionReadinessProbe({
      env: VALID_ENV,
      fetchImpl,
      live: true,
      strict: true,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'agency-supabase-schema',
        status: 'fail',
        evidence: expect.stringContaining('missing contract columns: agency_usage_ledger'),
      }),
      expect.objectContaining({ name: 'agency-rls-negative-anon', status: 'pass' }),
    ]));
  });

  it('fails when required server-only secrets are missing', async () => {
    const result = await runProductionReadinessProbe({
      env: {
        ...VALID_ENV,
        CRON_SECRET: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        STRIPE_WEBHOOK_SECRET: '',
        STRIPE_SYNC_SECRET: '',
      },
      live: false,
      strict: true,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'CRON_SECRET', status: 'fail' }),
      expect.objectContaining({ name: 'SUPABASE_SERVICE_ROLE_KEY', status: 'fail' }),
      expect.objectContaining({ name: 'STRIPE_WEBHOOK_SECRET', status: 'fail' }),
      expect.objectContaining({ name: 'STRIPE_SYNC_SECRET', status: 'fail' }),
    ]));
  });

  it('accepts Stripe webhook and sync secrets when they are verified as Supabase Edge secrets', async () => {
    const envWithEdgeSecrets: Partial<typeof VALID_ENV> = { ...VALID_ENV };
    delete envWithEdgeSecrets.STRIPE_WEBHOOK_SECRET;
    delete envWithEdgeSecrets.STRIPE_SYNC_SECRET;

    const result = await runProductionReadinessProbe({
      env: {
        ...envWithEdgeSecrets,
        SUPABASE_EDGE_SECRET_NAMES: [
          'STRIPE_SECRET_KEY',
          'STRIPE_WEBHOOK_SECRET',
          'STRIPE_SYNC_SECRET',
          'SUPABASE_SERVICE_ROLE_KEY',
          'SUPABASE_URL',
        ].join(','),
      },
      live: false,
      strict: true,
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'STRIPE_WEBHOOK_SECRET', status: 'pass' }),
      expect.objectContaining({ name: 'STRIPE_SYNC_SECRET', status: 'pass' }),
    ]));
  });

  it('treats Cloudflare as optional unless explicitly required', async () => {
    const optionalResult = await runProductionReadinessProbe({
      env: VALID_ENV,
      live: false,
      strict: true,
    });
    expect(optionalResult.ok).toBe(true);
    expect(optionalResult.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'CLOUDFLARE_API_TOKEN', status: 'skip' }),
    ]));

    const requiredResult = await runProductionReadinessProbe({
      env: VALID_ENV,
      live: false,
      strict: true,
      requireCloudflare: true,
    });
    expect(requiredResult.ok).toBe(false);
    expect(requiredResult.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'CLOUDFLARE_API_TOKEN', status: 'fail' }),
      expect.objectContaining({ name: 'CLOUDFLARE_ACCOUNT_ID', status: 'fail' }),
    ]));
  });

  it('reports partially configured optional Cloudflare env from Vercel Production names', async () => {
    const result = await runProductionReadinessProbe({
      env: {
        ...VALID_ENV,
        VERCEL_PRODUCTION_ENV_NAMES: 'CLOUDFLARE_ACCOUNT_ID',
      },
      live: false,
      strict: true,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.warnings).toBe(1);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'CLOUDFLARE_API_TOKEN', status: 'warn' }),
      expect.objectContaining({
        name: 'CLOUDFLARE_ACCOUNT_ID',
        status: 'pass',
        evidence: expect.stringContaining('configured in Vercel Production'),
      }),
    ]));
  });

  it('accepts SendGrid as the configured email provider without Resend', async () => {
    const envWithoutResend: Partial<typeof VALID_ENV> = { ...VALID_ENV };
    delete envWithoutResend.RESEND_API_KEY;
    const result = await runProductionReadinessProbe({
      env: {
        ...envWithoutResend,
        SENDGRID_API_KEY: 'sendgrid-key-with-enough-length-for-production-shape',
      },
      live: false,
      strict: true,
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'EMAIL_PROVIDER_API_KEY', status: 'pass' }),
      expect.objectContaining({ name: 'RESEND_API_KEY', status: 'skip' }),
      expect.objectContaining({ name: 'SENDGRID_API_KEY', status: 'pass' }),
    ]));
  });

  it('fails Google callback URLs outside the production origin', async () => {
    const result = await runProductionReadinessProbe({
      env: {
        ...VALID_ENV,
        GOOGLE_CALENDAR_REDIRECT_URI: 'https://attacker.example/api/appointments/google/oauth/callback',
      },
      live: false,
      strict: true,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'GOOGLE_CALENDAR_REDIRECT_URI:origin', status: 'fail' }),
    ]));
  });

  it('accepts Vercel Production env names when sensitive values are not downloadable locally', async () => {
    const fetchImpl = vi.fn(async () => ({
      status: 401,
      json: async () => ({ code: '42501' }),
    }));

    const result = await runProductionReadinessProbe({
      env: {
        SUPABASE_URL: VALID_ENV.SUPABASE_URL,
        VITE_SUPABASE_URL: VALID_ENV.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: VALID_ENV.VITE_SUPABASE_ANON_KEY,
        VERCEL_PRODUCTION_ENV_NAMES: [
          'CRON_SECRET',
          'APP_BASE_URL',
          'VITE_PUBLIC_APP_URL',
          'SUPABASE_SERVICE_ROLE_KEY',
          'RESEND_API_KEY',
          'APPOINTMENT_EMAIL_FROM',
          'VITE_STRIPE_PUBLISHABLE_KEY',
          'STRIPE_SECRET_KEY',
          'STRIPE_WEBHOOK_SECRET',
          'STRIPE_SYNC_SECRET',
          'GOOGLE_CALENDAR_CLIENT_ID',
          'GOOGLE_CALENDAR_CLIENT_SECRET',
          'GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY',
          'GOOGLE_CALENDAR_REDIRECT_URI',
          'GOOGLE_CALENDAR_WEBHOOK_URL',
        ].join(','),
      },
      fetchImpl,
      live: true,
      strict: true,
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'CRON_SECRET',
        status: 'pass',
        evidence: expect.stringContaining('configured in Vercel Production'),
      }),
      expect.objectContaining({ name: 'APP_BASE_URL:url', status: 'skip' }),
      expect.objectContaining({ name: 'RESEND_API_KEY', status: 'pass' }),
      expect.objectContaining({ name: 'STRIPE_SECRET_KEY', status: 'pass' }),
      expect.objectContaining({ name: 'resend-api-readonly', status: 'skip' }),
      expect.objectContaining({ name: 'stripe-account-readonly', status: 'skip' }),
      expect.objectContaining({ name: 'agency-supabase-schema', status: 'skip' }),
      expect.objectContaining({ name: 'agency-rls-negative-anon', status: 'pass' }),
    ]));
  });

  it('does not include secret values in serialized output', async () => {
    const secretValue = ['sk', 'test', 'super_secret_value_that_must_not_leak'].join('_');
    const result = await runProductionReadinessProbe({
      env: {
        ...VALID_ENV,
        STRIPE_SECRET_KEY: secretValue,
      },
      live: false,
      strict: true,
    });

    expect(JSON.stringify(result)).not.toContain(secretValue);
    expect(JSON.stringify(result)).not.toContain(VALID_ENV.RESEND_API_KEY);
    expect(JSON.stringify(result)).not.toContain(VALID_ENV.SUPABASE_SERVICE_ROLE_KEY);
  });
});
