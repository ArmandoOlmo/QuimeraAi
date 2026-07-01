import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import createPaymentLinkHandler from '../../api/agency/payment-links/create.ts';
import paymentLinkInfoHandler from '../../api/agency/payment-links/info.ts';
import startCheckoutHandler from '../../api/agency/payment-links/start-checkout.ts';
import stripeWebhookHandler from '../../api/agency/stripe/webhook.ts';
import createAgencyClientHandler from '../../api/agency/clients/create.ts';
import transferAgencyProjectHandler from '../../api/agency/projects/transfer.ts';
import respondAgencyApprovalHandler from '../../api/agency/approvals/respond.ts';

type MockResponse = {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (body?: string) => void;
};

const ORIGINAL_ENV = { ...process.env };

function createRequest(
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
  url = '/api/agency/test',
) {
  const rawBody = typeof body === 'string'
    ? body
    : body === undefined
      ? ''
      : JSON.stringify(body);
  const request = Readable.from(rawBody ? [rawBody] : []) as any;
  request.method = method;
  request.url = url;
  request.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return request;
}

function createResponse(): MockResponse {
  return {
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };
}

function jsonBody(res: MockResponse) {
  return JSON.parse(res.body || '{}');
}

describe('Agency Vercel API routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon_test_key',
      APP_BASE_URL: 'https://www.quimera.ai',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it('requires a user bearer token before creating an Agency payment link', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await createPaymentLinkHandler(createRequest('POST', {
      clientTenantId: 'client-1',
      planId: 'plan-1',
    }), res as any);

    expect(res.statusCode).toBe(401);
    expect(jsonBody(res)).toEqual({ error: 'Authorization bearer token is required.' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards private payment link creation to the canonical Supabase Stripe API action', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      data: {
        paymentUrl: 'https://www.quimera.ai/pay/pay_123',
        expiresAt: '2026-07-03T00:00:00.000Z',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await createPaymentLinkHandler(createRequest('POST', {
      clientTenantId: 'client-1',
      planId: 'plan-1',
      customPrice: 250,
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toMatchObject({ paymentUrl: 'https://www.quimera.ai/pay/pay_123' });
    expect(fetchSpy).toHaveBeenCalledWith('https://example.supabase.co/functions/v1/stripe-api', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer user_token',
        apikey: 'anon_test_key',
      }),
      body: JSON.stringify({
        action: 'agencyBilling-createClientPaymentLink',
        clientTenantId: 'client-1',
        planId: 'plan-1',
        customPrice: 250,
      }),
    }));
  });

  it('rejects non-positive custom payment link prices before proxying to Edge', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await createPaymentLinkHandler(createRequest('POST', {
      clientTenantId: 'client-1',
      planId: 'plan-1',
      customPrice: 0,
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res)).toEqual({ error: 'customPrice must be greater than 0.' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('loads payment link info through the public Stripe API action with server-side anon auth', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      data: {
        status: 'pending',
        clientName: 'Client A',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await paymentLinkInfoHandler(createRequest(
      'GET',
      undefined,
      {},
      '/api/agency/payment-links/info?token=pay_123',
    ), res as any);

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toMatchObject({ status: 'pending', clientName: 'Client A' });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      action: 'agencyBilling-getPaymentLinkInfo',
      token: 'pay_123',
    });
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer anon_test_key');
  });

  it('sanitizes public checkout return URLs before creating a Stripe Checkout Session', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      data: {
        success: true,
        checkoutSessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await startCheckoutHandler(createRequest('POST', {
      token: 'pay_123',
      successUrl: 'https://evil.example/success',
      cancelUrl: 'javascript:alert(1)',
    }, {
      Origin: 'https://www.quimera.ai',
    }), res as any);

    expect(res.statusCode).toBe(200);
    const forwardedBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(forwardedBody).toMatchObject({
      action: 'agencyBilling-confirmClientPayment',
      token: 'pay_123',
      successUrl: 'https://www.quimera.ai/pay/pay_123?checkout=success',
      cancelUrl: 'https://www.quimera.ai/pay/pay_123?checkout=cancelled',
    });
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer anon_test_key');
  });

  it('proxies Stripe webhooks with the raw body and signature for Edge verification', async () => {
    const fetchSpy = vi.fn(async (_url, init) => new Response(JSON.stringify({
      received: true,
      rawBody: init?.body,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();
    const rawBody = '{"id":"evt_agency_123","type":"invoice.paid"}';

    await stripeWebhookHandler(createRequest('POST', rawBody, {
      'Stripe-Signature': 't=1782925000,v1=signed',
      'Content-Type': 'application/json',
    }), res as any);

    expect(res.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith('https://example.supabase.co/functions/v1/stripe-webhook', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'stripe-signature': 't=1782925000,v1=signed',
        apikey: 'anon_test_key',
      }),
      body: rawBody,
    }));
  });

  it('rejects Stripe webhook requests without a signature before proxying', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await stripeWebhookHandler(createRequest('POST', '{"id":"evt_missing_sig"}'), res as any);

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res)).toEqual({ error: 'Missing Stripe signature.' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('provisions agency clients through the canonical onboarding-api action with an allowlisted payload', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      clientTenantId: 'client-tenant-1',
      projectId: 'project-1',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await createAgencyClientHandler(createRequest('POST', {
      action: 'attemptedOverride',
      agencyTenantId: 'agency-1',
      businessName: 'Client Co',
      contactEmail: 'OWNER@CLIENT.CO',
      selectedPlanId: 'plan-growth',
      monthlyPrice: '250',
      setupBilling: true,
      unexpectedField: 'must-not-forward',
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(200);
    const forwardedBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(fetchSpy.mock.calls[0][0]).toBe('https://example.supabase.co/functions/v1/onboarding-api');
    expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer user_token');
    expect(forwardedBody).toMatchObject({
      action: 'autoProvision',
      agencyTenantId: 'agency-1',
      businessName: 'Client Co',
      contactEmail: 'owner@client.co',
      selectedPlanId: 'plan-growth',
      monthlyPrice: 250,
      setupBilling: true,
    });
    expect(forwardedBody).not.toHaveProperty('unexpectedField');
  });

  it('transfers agency projects through onboarding-api with user auth', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      newProjectId: 'project-copy-1',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await transferAgencyProjectHandler(createRequest('POST', {
      projectId: 'project-1',
      sourceTenantId: 'agency-1',
      targetClientTenantId: 'client-1',
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      action: 'transferProject',
      projectId: 'project-1',
      sourceTenantId: 'agency-1',
      targetClientTenantId: 'client-1',
    });
  });

  it('responds to client approvals through onboarding-api and rejects unsupported decisions', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
      success: true,
      status: 'approved',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await respondAgencyApprovalHandler(createRequest('POST', {
      approvalId: 'approval-1',
      decision: 'approved',
      responseNote: 'Looks good',
    }, {
      Authorization: 'Bearer client_token',
    }), res as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      action: 'respondClientApproval',
      approvalId: 'approval-1',
      decision: 'approved',
      responseNote: 'Looks good',
    });

    const invalidRes = createResponse();
    await respondAgencyApprovalHandler(createRequest('POST', {
      approvalId: 'approval-1',
      decision: 'pending',
    }, {
      Authorization: 'Bearer client_token',
    }), invalidRes as any);

    expect(invalidRes.statusCode).toBe(400);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
