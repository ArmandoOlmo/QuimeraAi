import { describe, expect, it, vi } from 'vitest';
import { checkEmailProviderReadiness, provisionEmailProviderDomain } from '../../services/email/emailProviderService.ts';

const response = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
}) as Response;

describe('checkEmailProviderReadiness', () => {
    it('verifies a Resend sending domain from server-side API state', async () => {
        const fetchImpl = vi.fn(async () => response(200, {
            data: [
                {
                    id: 'domain_123',
                    name: 'example.com',
                    status: 'verified',
                    capabilities: { sending: 'enabled' },
                },
            ],
        }));

        const result = await checkEmailProviderReadiness({
            providerName: 'resend',
            resendApiKey: 're_test',
            sendingDomain: 'mail.example.com',
            webhookSigningConfigured: true,
            fetchImpl,
        });

        expect(fetchImpl).toHaveBeenCalledWith('https://api.resend.com/domains', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({ Authorization: 'Bearer re_test' }),
        }));
        expect(result.providerConfigured).toBe(true);
        expect(result.providerStatus).toBe('configured');
        expect(result.domainStatus).toBe('verified');
        expect(result.matchedDomain).toBe('example.com');
        expect(result.webhookConfigured).toBe(true);
        expect(result.warnings).toEqual([]);
    });

    it('verifies a SendGrid authenticated domain from server-side API state', async () => {
        const fetchImpl = vi.fn(async () => response(200, [
            {
                id: 44,
                domain: 'example.com',
                subdomain: 'mail',
                valid: true,
                dns: {
                    mail_cname: {
                        type: 'cname',
                        host: 'mail.example.com',
                        data: 'sendgrid.net',
                        valid: true,
                    },
                },
            },
        ]));

        const result = await checkEmailProviderReadiness({
            providerName: 'sendgrid',
            sendGridApiKey: 'SG.test',
            sendingDomain: 'https://mail.example.com',
            webhookSigningConfigured: true,
            fetchImpl,
        });

        expect(fetchImpl).toHaveBeenCalledWith(
            expect.stringContaining('https://api.sendgrid.com/v3/whitelabel/domains?'),
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({ Authorization: 'Bearer SG.test' }),
            }),
        );
        expect(result.providerConfigured).toBe(true);
        expect(result.providerStatus).toBe('configured');
        expect(result.domainStatus).toBe('verified');
        expect(result.matchedDomain).toBe('mail.example.com');
        expect(result.webhookConfigured).toBe(true);
        expect((result.raw as any)?.records).toEqual([
            {
                label: 'mail_cname',
                type: 'cname',
                host: 'mail.example.com',
                value: 'sendgrid.net',
                status: 'verified',
                priority: undefined,
            },
        ]);
        expect(result.warnings).toEqual([]);
    });

    it('does not mark provider configured when the server-side API key is missing', async () => {
        const fetchImpl = vi.fn();

        const result = await checkEmailProviderReadiness({
            providerName: 'resend',
            sendingDomain: 'example.com',
            fetchImpl,
        });

        expect(fetchImpl).not.toHaveBeenCalled();
        expect(result.providerConfigured).toBe(false);
        expect(result.providerStatus).toBe('not_configured');
        expect(result.domainStatus).toBe('not_configured');
        expect(result.warnings).toContain('resend API key is not configured server-side.');
    });

    it('marks invalid provider credentials as not configured', async () => {
        const fetchImpl = vi.fn(async () => response(401, { message: 'Unauthorized' }));

        const result = await checkEmailProviderReadiness({
            providerName: 'sendgrid',
            sendGridApiKey: 'SG.invalid',
            sendingDomain: 'example.com',
            fetchImpl,
        });

        expect(result.providerConfigured).toBe(false);
        expect(result.providerStatus).toBe('not_configured');
        expect(result.providerError).toBe('Unauthorized');
    });
});

describe('provisionEmailProviderDomain', () => {
    it('creates a Resend domain and returns pending DNS records', async () => {
        const fetchImpl = vi.fn(async (url: string, options?: RequestInit) => {
            if (url === 'https://api.resend.com/domains' && options?.method === 'GET') {
                return response(200, { data: [] });
            }
            if (url === 'https://api.resend.com/domains' && options?.method === 'POST') {
                return response(200, {
                    id: 'domain_new',
                    name: 'mail.example.com',
                    status: 'not_started',
                    records: [
                        {
                            record: 'DKIM',
                            name: 'selector._domainkey.mail.example.com',
                            type: 'CNAME',
                            value: 'selector.dkim.amazonses.com',
                            status: 'not_started',
                        },
                    ],
                });
            }
            throw new Error(`Unexpected request: ${url}`);
        });

        const result = await provisionEmailProviderDomain({
            providerName: 'resend',
            resendApiKey: 're_test',
            sendingDomain: 'mail.example.com',
            fetchImpl: fetchImpl as any,
        });

        expect(fetchImpl).toHaveBeenCalledWith('https://api.resend.com/domains', expect.objectContaining({ method: 'GET' }));
        expect(fetchImpl).toHaveBeenCalledWith('https://api.resend.com/domains', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'mail.example.com' }),
        }));
        expect(result.providerConfigured).toBe(true);
        expect(result.action).toBe('created');
        expect(result.domainStatus).toBe('pending');
        expect(result.dkimStatus).toBe('pending');
        expect((result.raw as any)?.records).toEqual([
            expect.objectContaining({
                label: 'records.1',
                type: 'CNAME',
                host: 'selector._domainkey.mail.example.com',
                value: 'selector.dkim.amazonses.com',
                status: 'not_started',
            }),
        ]);
    });

    it('validates an existing SendGrid domain and merges DNS validation detail', async () => {
        const fetchImpl = vi.fn(async (url: string, options?: RequestInit) => {
            if (String(url).startsWith('https://api.sendgrid.com/v3/whitelabel/domains?') && options?.method === 'GET') {
                return response(200, [
                    {
                        id: 44,
                        domain: 'mail.example.com',
                        valid: false,
                        dns: {
                            mail_cname: {
                                type: 'cname',
                                host: 'mail.mail.example.com',
                                data: 'sendgrid.net',
                                valid: false,
                            },
                        },
                    },
                ]);
            }
            if (url === 'https://api.sendgrid.com/v3/whitelabel/domains/44/validate' && options?.method === 'POST') {
                return response(200, {
                    id: 44,
                    valid: true,
                    validation_results: {
                        mail_cname: { valid: true, reason: null },
                    },
                });
            }
            throw new Error(`Unexpected request: ${url}`);
        });

        const result = await provisionEmailProviderDomain({
            providerName: 'sendgrid',
            sendGridApiKey: 'SG.test',
            sendingDomain: 'mail.example.com',
            fetchImpl: fetchImpl as any,
        });

        expect(fetchImpl).toHaveBeenCalledWith(
            'https://api.sendgrid.com/v3/whitelabel/domains/44/validate',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(result.providerConfigured).toBe(true);
        expect(result.action).toBe('validated');
        expect(result.domainStatus).toBe('verified');
        expect((result.raw as any)?.records).toEqual([
            expect.objectContaining({
                label: 'mail_cname',
                type: 'cname',
                host: 'mail.mail.example.com',
                value: 'sendgrid.net',
                status: 'verified',
            }),
        ]);
    });
});
