import { describe, expect, it, vi } from 'vitest';
import { runProductionReadinessProbe } from '../../scripts/production-readiness-probe.mjs';

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
  STRIPE_SECRET_KEY: ['sk', 'test', '123456789012345678901234'].join('_'),
  GOOGLE_CALENDAR_CLIENT_ID: 'quimera-client.apps.googleusercontent.com',
  GOOGLE_CALENDAR_CLIENT_SECRET: 'google-client-secret-with-length',
  GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 'q').toString('base64'),
  GOOGLE_CALENDAR_REDIRECT_URI: 'https://www.quimera.ai/api/appointments/google/oauth/callback',
  GOOGLE_CALENDAR_WEBHOOK_URL: 'https://www.quimera.ai/api/appointments/google/webhook',
};

describe('production readiness probe', () => {
  it('passes live read-only checks with valid production-shaped env', async () => {
    const fetchImpl = vi.fn(async (url: URL | string) => ({
      status: 200,
      json: async () => String(url).includes('cloudflare') ? { success: true } : {},
    }));

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
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://api.resend.com/domains'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://api.stripe.com/v1/account'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('fails when required server-only secrets are missing', async () => {
    const result = await runProductionReadinessProbe({
      env: {
        ...VALID_ENV,
        CRON_SECRET: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
      },
      live: false,
      strict: true,
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'CRON_SECRET', status: 'fail' }),
      expect.objectContaining({ name: 'SUPABASE_SERVICE_ROLE_KEY', status: 'fail' }),
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
