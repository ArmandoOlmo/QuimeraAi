export class EmailProviderRequestError extends Error {
    constructor(message, input = {}) {
        super(message);
        this.name = 'EmailProviderRequestError';
        this.statusCode = input.statusCode;
        this.retryAfterSeconds = input.retryAfterSeconds;
        this.provider = input.provider;
    }
}
export function createResendEmailProvider(apiKey) {
    if (!apiKey)
        return undefined;
    return {
        name: 'resend',
        async send(input) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    from: input.from,
                    to: input.to,
                    subject: input.subject,
                    html: input.html,
                    text: input.text,
                    reply_to: input.replyTo,
                    headers: input.headers,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new EmailProviderRequestError(String(data?.message || data?.error || 'Email provider request failed'), {
                    statusCode: response.status,
                    retryAfterSeconds: parseRetryAfter(response.headers.get('retry-after')),
                    provider: 'resend',
                });
            }
            return {
                providerMessageId: data?.id ? String(data.id) : undefined,
                raw: data,
            };
        },
    };
}
export function createSendGridEmailProvider(apiKey) {
    if (!apiKey)
        return undefined;
    return {
        name: 'sendgrid',
        async send(input) {
            const from = parseEmailHeader(input.from);
            if (!from.email)
                throw new Error('SendGrid requires a valid from email');
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    personalizations: [{
                            to: input.to.map(email => ({ email })),
                            subject: input.subject,
                            custom_args: input.customArgs,
                        }],
                    from: from.name ? { email: from.email, name: from.name } : { email: from.email },
                    reply_to: input.replyTo ? { email: input.replyTo } : undefined,
                    content: [
                        ...(input.text ? [{ type: 'text/plain', value: input.text }] : []),
                        { type: 'text/html', value: input.html },
                    ],
                    headers: input.headers,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new EmailProviderRequestError(String(data?.errors?.[0]?.message || data?.message || 'Email provider request failed'), {
                    statusCode: response.status,
                    retryAfterSeconds: parseRetryAfter(response.headers.get('retry-after')),
                    provider: 'sendgrid',
                });
            }
            return {
                providerMessageId: response.headers.get('x-message-id') || undefined,
                raw: data,
            };
        },
    };
}
export function createEmailProviderRegistry(input) {
    return {
        resend: createResendEmailProvider(input.resendApiKey),
        sendgrid: createSendGridEmailProvider(input.sendGridApiKey),
    };
}
export async function checkEmailProviderReadiness(input) {
    const provider = normalizeProviderName(input.providerName);
    const checkedAt = new Date().toISOString();
    const webhookConfigured = Boolean(input.webhookSigningConfigured);
    const base = {
        provider,
        providerConfigured: false,
        providerStatus: 'not_configured',
        domainStatus: 'not_configured',
        dkimStatus: 'not_configured',
        spfStatus: 'not_configured',
        dmarcStatus: 'not_configured',
        webhookConfigured,
        checkedAt,
        warnings: [],
    };
    if (provider === 'unset') {
        return { ...base, warnings: ['Provider is unset.'] };
    }
    const apiKey = provider === 'sendgrid' ? input.sendGridApiKey : input.resendApiKey;
    if (!apiKey) {
        return { ...base, warnings: [`${provider} API key is not configured server-side.`] };
    }
    const fetcher = input.fetchImpl || fetch;
    try {
        return provider === 'sendgrid'
            ? await checkSendGridReadiness({ apiKey, sendingDomain: input.sendingDomain, webhookConfigured, checkedAt, fetcher })
            : await checkResendReadiness({ apiKey, sendingDomain: input.sendingDomain, webhookConfigured, checkedAt, fetcher });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            ...base,
            providerConfigured: true,
            providerStatus: 'needs_review',
            providerError: message,
            warnings: [`Could not verify ${provider} readiness: ${message}`],
        };
    }
}
export async function provisionEmailProviderDomain(input) {
    const provider = normalizeProviderName(input.providerName);
    const checkedAt = new Date().toISOString();
    const sendingDomain = normalizeDomain(input.sendingDomain);
    const base = {
        provider,
        providerConfigured: false,
        providerStatus: 'not_configured',
        action: 'not_configured',
        sendingDomain,
        domainStatus: 'not_configured',
        dkimStatus: 'not_configured',
        spfStatus: 'not_configured',
        dmarcStatus: 'not_configured',
        checkedAt,
        warnings: [],
    };
    if (provider === 'unset') {
        return { ...base, warnings: ['Provider is unset.'] };
    }
    if (!sendingDomain) {
        return { ...base, warnings: ['No sending domain is configured for this project.'] };
    }
    const apiKey = provider === 'sendgrid' ? input.sendGridApiKey : input.resendApiKey;
    if (!apiKey) {
        return { ...base, warnings: [`${provider} API key is not configured server-side.`] };
    }
    const fetcher = input.fetchImpl || fetch;
    try {
        return provider === 'sendgrid'
            ? await provisionSendGridDomain({ apiKey, sendingDomain, checkedAt, fetcher })
            : await provisionResendDomain({ apiKey, sendingDomain, checkedAt, fetcher });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            ...base,
            providerConfigured: true,
            providerStatus: 'needs_review',
            action: 'failed',
            domainStatus: 'failed',
            dkimStatus: 'failed',
            spfStatus: 'failed',
            providerError: message,
            warnings: [`Could not provision ${provider} domain: ${message}`],
        };
    }
}
export function resolveEmailProvider(input) {
    const name = normalizeProviderName(input.providerName);
    if (name === 'unset')
        return undefined;
    const fromRegistry = input.providers?.[name];
    if (fromRegistry)
        return fromRegistry;
    if (input.provider?.name === name)
        return input.provider;
    return undefined;
}
export function isValidEmail(value) {
    if (!value)
        return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
export function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}
export function buildFromHeader(input) {
    const email = String(input.fromEmail || '').trim();
    const name = String(input.fromName || '').trim();
    if (!name)
        return email;
    const safeName = name.replace(/"/g, '');
    return `${safeName} <${email}>`;
}
export function isProviderRateLimitError(error) {
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : undefined;
    const message = error instanceof Error ? error.message : String(error || '');
    return statusCode === 429 || /rate\s*limit|too many requests|retry after/i.test(message);
}
export function getProviderRetryAfterSeconds(error, fallbackSeconds = 60) {
    const explicit = typeof error === 'object' && error !== null && 'retryAfterSeconds' in error
        ? Number(error.retryAfterSeconds)
        : 0;
    return Number.isFinite(explicit) && explicit > 0
        ? Math.min(explicit, 60 * 60)
        : fallbackSeconds;
}
function normalizeProviderName(value) {
    const provider = String(value || 'resend').toLowerCase();
    if (provider === 'sendgrid')
        return 'sendgrid';
    if (provider === 'unset')
        return 'unset';
    return 'resend';
}
async function checkResendReadiness(input) {
    const response = await input.fetcher('https://api.resend.com/domains', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${input.apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json().catch(() => ({}));
    const providerConfigured = isAuthenticatedProviderResponse(response.status);
    if (!response.ok) {
        return providerErrorResult({
            provider: 'resend',
            status: response.status,
            providerConfigured,
            webhookConfigured: input.webhookConfigured,
            checkedAt: input.checkedAt,
            data,
        });
    }
    const domains = Array.isArray(data?.data) ? data.data : [];
    const match = findResendDomain(domains, input.sendingDomain);
    const domainStatus = mapResendDomainStatus(match);
    return {
        provider: 'resend',
        providerConfigured: true,
        providerStatus: 'configured',
        domainStatus,
        dkimStatus: domainStatus === 'not_configured' ? 'not_configured' : domainStatus,
        spfStatus: domainStatus === 'not_configured' ? 'not_configured' : domainStatus,
        dmarcStatus: 'not_configured',
        webhookConfigured: input.webhookConfigured,
        checkedAt: input.checkedAt,
        matchedDomain: match?.name ? String(match.name) : undefined,
        warnings: buildDomainWarnings(input.sendingDomain, domainStatus, input.webhookConfigured),
        raw: sanitizeProviderReadinessRaw(match),
    };
}
async function checkSendGridReadiness(input) {
    const url = new URL('https://api.sendgrid.com/v3/whitelabel/domains');
    url.searchParams.set('limit', '100');
    if (input.sendingDomain)
        url.searchParams.set('domain', normalizeDomain(input.sendingDomain));
    const response = await input.fetcher(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${input.apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json().catch(() => ({}));
    const providerConfigured = isAuthenticatedProviderResponse(response.status);
    if (!response.ok) {
        return providerErrorResult({
            provider: 'sendgrid',
            status: response.status,
            providerConfigured,
            webhookConfigured: input.webhookConfigured,
            checkedAt: input.checkedAt,
            data,
        });
    }
    const domains = Array.isArray(data) ? data : Array.isArray(data?.result) ? data.result : [];
    const match = findSendGridDomain(domains, input.sendingDomain);
    const domainStatus = mapSendGridDomainStatus(match);
    return {
        provider: 'sendgrid',
        providerConfigured: true,
        providerStatus: 'configured',
        domainStatus,
        dkimStatus: domainStatus === 'not_configured' ? 'not_configured' : domainStatus,
        spfStatus: domainStatus === 'not_configured' ? 'not_configured' : domainStatus,
        dmarcStatus: 'not_configured',
        webhookConfigured: input.webhookConfigured,
        checkedAt: input.checkedAt,
        matchedDomain: match ? readSendGridDomainName(match) : undefined,
        warnings: buildDomainWarnings(input.sendingDomain, domainStatus, input.webhookConfigured),
        raw: sanitizeProviderReadinessRaw(match),
    };
}
async function provisionResendDomain(input) {
    const listResponse = await input.fetcher('https://api.resend.com/domains', {
        method: 'GET',
        headers: providerJsonHeaders(input.apiKey),
    });
    const listData = await listResponse.json().catch(() => ({}));
    if (!listResponse.ok) {
        return providerDomainErrorResult({
            provider: 'resend',
            status: listResponse.status,
            sendingDomain: input.sendingDomain,
            checkedAt: input.checkedAt,
            data: listData,
        });
    }
    const domains = Array.isArray(listData?.data) ? listData.data : [];
    const match = findResendDomain(domains, input.sendingDomain);
    if (match?.id) {
        const verifyResponse = await input.fetcher(`https://api.resend.com/domains/${encodeURIComponent(String(match.id))}/verify`, {
            method: 'POST',
            headers: providerJsonHeaders(input.apiKey),
        });
        const verifyData = await verifyResponse.json().catch(() => ({}));
        if (!verifyResponse.ok) {
            return providerDomainErrorResult({
                provider: 'resend',
                status: verifyResponse.status,
                sendingDomain: input.sendingDomain,
                checkedAt: input.checkedAt,
                data: verifyData,
                raw: match,
            });
        }
        const refreshed = await retrieveResendDomain(input.fetcher, input.apiKey, String(match.id));
        const raw = {
            ...(refreshed || match),
            verification: unwrapProviderData(verifyData),
        };
        const domainStatus = mapResendDomainStatus(raw);
        return buildProviderDomainResult({
            provider: 'resend',
            action: domainStatus === 'verified' ? 'validated' : 'verification_started',
            sendingDomain: input.sendingDomain,
            checkedAt: input.checkedAt,
            raw,
            matchedDomain: readOptionalProviderString(raw.name),
            providerDomainId: String(match.id),
            domainStatus,
        });
    }
    const createResponse = await input.fetcher('https://api.resend.com/domains', {
        method: 'POST',
        headers: providerJsonHeaders(input.apiKey),
        body: JSON.stringify({ name: input.sendingDomain }),
    });
    const createData = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) {
        return providerDomainErrorResult({
            provider: 'resend',
            status: createResponse.status,
            sendingDomain: input.sendingDomain,
            checkedAt: input.checkedAt,
            data: createData,
        });
    }
    const raw = unwrapProviderData(createData);
    const domainStatus = mapResendDomainStatus(raw);
    return buildProviderDomainResult({
        provider: 'resend',
        action: 'created',
        sendingDomain: input.sendingDomain,
        checkedAt: input.checkedAt,
        raw,
        matchedDomain: readOptionalProviderString(raw?.name),
        providerDomainId: readOptionalProviderString(raw?.id),
        domainStatus,
    });
}
async function provisionSendGridDomain(input) {
    const url = new URL('https://api.sendgrid.com/v3/whitelabel/domains');
    url.searchParams.set('limit', '100');
    url.searchParams.set('domain', input.sendingDomain);
    const listResponse = await input.fetcher(url.toString(), {
        method: 'GET',
        headers: providerJsonHeaders(input.apiKey),
    });
    const listData = await listResponse.json().catch(() => ({}));
    if (!listResponse.ok) {
        return providerDomainErrorResult({
            provider: 'sendgrid',
            status: listResponse.status,
            sendingDomain: input.sendingDomain,
            checkedAt: input.checkedAt,
            data: listData,
        });
    }
    const domains = Array.isArray(listData) ? listData : Array.isArray(listData?.result) ? listData.result : [];
    const match = findSendGridDomain(domains, input.sendingDomain);
    if (match?.id) {
        const validateResponse = await input.fetcher(`https://api.sendgrid.com/v3/whitelabel/domains/${encodeURIComponent(String(match.id))}/validate`, {
            method: 'POST',
            headers: providerJsonHeaders(input.apiKey),
        });
        const validateData = await validateResponse.json().catch(() => ({}));
        if (!validateResponse.ok) {
            return providerDomainErrorResult({
                provider: 'sendgrid',
                status: validateResponse.status,
                sendingDomain: input.sendingDomain,
                checkedAt: input.checkedAt,
                data: validateData,
                raw: match,
            });
        }
        const raw = mergeSendGridValidation(match, validateData);
        const domainStatus = mapSendGridDomainStatus(raw);
        return buildProviderDomainResult({
            provider: 'sendgrid',
            action: domainStatus === 'verified' ? 'validated' : 'verification_started',
            sendingDomain: input.sendingDomain,
            checkedAt: input.checkedAt,
            raw,
            matchedDomain: readSendGridDomainName(raw),
            providerDomainId: String(match.id),
            domainStatus,
        });
    }
    const createResponse = await input.fetcher('https://api.sendgrid.com/v3/whitelabel/domains', {
        method: 'POST',
        headers: providerJsonHeaders(input.apiKey),
        body: JSON.stringify({
            domain: input.sendingDomain,
            automatic_security: true,
        }),
    });
    const createData = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) {
        return providerDomainErrorResult({
            provider: 'sendgrid',
            status: createResponse.status,
            sendingDomain: input.sendingDomain,
            checkedAt: input.checkedAt,
            data: createData,
        });
    }
    const raw = unwrapProviderData(createData);
    const domainStatus = mapSendGridDomainStatus(raw);
    return buildProviderDomainResult({
        provider: 'sendgrid',
        action: 'created',
        sendingDomain: input.sendingDomain,
        checkedAt: input.checkedAt,
        raw,
        matchedDomain: readSendGridDomainName(raw),
        providerDomainId: readOptionalProviderString(raw?.id),
        domainStatus,
    });
}
function providerErrorResult(input) {
    const message = readProviderError(input.data) || `Provider readiness request failed with status ${input.status}.`;
    return {
        provider: input.provider,
        providerConfigured: input.providerConfigured,
        providerStatus: input.providerConfigured ? 'needs_review' : 'not_configured',
        domainStatus: 'not_configured',
        dkimStatus: 'not_configured',
        spfStatus: 'not_configured',
        dmarcStatus: 'not_configured',
        webhookConfigured: input.webhookConfigured,
        checkedAt: input.checkedAt,
        providerError: message,
        warnings: [message],
    };
}
function providerDomainErrorResult(input) {
    const providerConfigured = isAuthenticatedProviderResponse(input.status);
    const message = readProviderError(input.data) || `Provider domain automation request failed with status ${input.status}.`;
    return {
        provider: input.provider,
        providerConfigured,
        providerStatus: providerConfigured ? 'needs_review' : 'not_configured',
        action: 'failed',
        sendingDomain: input.sendingDomain,
        domainStatus: 'failed',
        dkimStatus: 'failed',
        spfStatus: 'failed',
        dmarcStatus: 'not_configured',
        checkedAt: input.checkedAt,
        providerError: message,
        warnings: [message],
        raw: sanitizeProviderReadinessRaw(input.raw || input.data),
    };
}
function buildProviderDomainResult(input) {
    const raw = sanitizeProviderReadinessRaw(input.raw);
    const dkimStatus = summarizeDnsRecordStatus(raw, 'dkim', input.domainStatus);
    const spfStatus = summarizeDnsRecordStatus(raw, 'spf', input.domainStatus);
    return {
        provider: input.provider,
        providerConfigured: true,
        providerStatus: 'configured',
        action: input.action,
        sendingDomain: input.sendingDomain,
        matchedDomain: input.matchedDomain,
        providerDomainId: input.providerDomainId,
        domainStatus: input.domainStatus,
        dkimStatus,
        spfStatus,
        dmarcStatus: summarizeDnsRecordStatus(raw, 'dmarc', 'not_configured'),
        checkedAt: input.checkedAt,
        warnings: buildProviderDomainWarnings(input.action, input.domainStatus),
        raw,
    };
}
function buildProviderDomainWarnings(action, domainStatus) {
    const warnings = [];
    if (action === 'created')
        warnings.push('Provider domain was created. Add the DNS records before validating.');
    if (domainStatus !== 'verified')
        warnings.push('Sending domain DNS is not verified yet.');
    return warnings;
}
function isAuthenticatedProviderResponse(status) {
    return status !== 401 && status !== 403;
}
function findResendDomain(domains, sendingDomain) {
    const target = normalizeDomain(sendingDomain);
    if (!target)
        return undefined;
    return domains.find(domain => domainMatches(target, domain?.name));
}
function findSendGridDomain(domains, sendingDomain) {
    const target = normalizeDomain(sendingDomain);
    if (!target)
        return undefined;
    return domains.find(domain => domainMatches(target, readSendGridDomainName(domain)));
}
function readSendGridDomainName(domain) {
    const base = normalizeDomain(domain?.domain);
    const subdomain = normalizeDomain(domain?.subdomain);
    if (subdomain && base && !subdomain.endsWith(`.${base}`))
        return `${subdomain}.${base}`;
    return subdomain || base;
}
function domainMatches(target, providerDomain) {
    const candidate = normalizeDomain(providerDomain);
    if (!target || !candidate)
        return false;
    return target === candidate || target.endsWith(`.${candidate}`) || candidate.endsWith(`.${target}`);
}
function normalizeDomain(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/\.$/, '');
}
function mapResendDomainStatus(domain) {
    if (!domain)
        return 'not_configured';
    const status = String(domain.status || '').toLowerCase();
    const sending = String(domain.capabilities?.sending || '').toLowerCase();
    if (status === 'verified')
        return 'verified';
    if (status.includes('fail') || status === 'rejected')
        return 'failed';
    if (!status && sending === 'enabled')
        return 'verified';
    return 'pending';
}
function mapSendGridDomainStatus(domain) {
    if (!domain)
        return 'not_configured';
    if (domain.valid === true)
        return 'verified';
    if (domain.valid === false)
        return 'pending';
    return 'pending';
}
function buildDomainWarnings(sendingDomain, domainStatus, webhookConfigured) {
    const warnings = [];
    if (!sendingDomain)
        warnings.push('No sending domain is configured for this project.');
    if (sendingDomain && domainStatus !== 'verified') {
        warnings.push('Sending domain is not verified by the selected provider.');
    }
    if (!webhookConfigured)
        warnings.push('Webhook signing secret/public key is not configured server-side.');
    return warnings;
}
function sanitizeProviderReadinessRaw(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const raw = value;
    return {
        id: raw.id,
        name: raw.name,
        domain: raw.domain,
        subdomain: raw.subdomain,
        status: raw.status,
        valid: raw.valid,
        default: raw.default,
        capabilities: raw.capabilities,
        validationResults: raw.validation_results,
        verification: raw.verification,
        records: extractDnsRecords(raw),
    };
}
function extractDnsRecords(raw) {
    const candidates = [];
    for (const key of ['records', 'dns_records', 'dnsRecords']) {
        const value = raw[key];
        if (Array.isArray(value))
            candidates.push(...value.map((item, index) => ({ label: `${key}.${index + 1}`, value: item })));
    }
    for (const key of ['dns', 'mail_cname', 'dkim', 'dkim1', 'dkim2', 'spf', 'dmarc', 'validation_results']) {
        const value = raw[key];
        if (!value || typeof value !== 'object')
            continue;
        if (Array.isArray(value)) {
            candidates.push(...value.map((item, index) => ({ label: `${key}.${index + 1}`, value: item })));
        }
        else if (looksLikeDnsRecord(value)) {
            candidates.push({ label: key, value });
        }
        else {
            for (const [label, item] of Object.entries(value)) {
                candidates.push({ label, value: item });
            }
        }
    }
    return candidates
        .map(candidate => normalizeDnsRecord(candidate))
        .filter(Boolean);
}
function looksLikeDnsRecord(value) {
    if (!value || typeof value !== 'object')
        return false;
    const record = value;
    return Boolean(record.type || record.record_type || record.host || record.hostname || record.name || record.value || record.data || record.target);
}
function normalizeDnsRecord(candidate) {
    if (!candidate || typeof candidate !== 'object')
        return null;
    const wrapped = candidate;
    const rawValue = wrapped.value;
    const label = readOptionalProviderString(wrapped.label);
    const record = rawValue && typeof rawValue === 'object'
        ? rawValue
        : wrapped;
    const host = readOptionalProviderString(record.host || record.hostname || record.name || record.record || record.domain);
    const value = readOptionalProviderString(record.value || record.data || record.target || record.points_to || record.pointsTo);
    const type = readOptionalProviderString(record.type || record.record_type || record.recordType);
    const status = readOptionalProviderString(record.status)
        || (record.valid === true ? 'verified' : record.valid === false ? 'pending' : undefined);
    const priority = readOptionalProviderString(record.priority);
    const reason = readOptionalProviderString(record.reason);
    if (!host && !value && !type)
        return null;
    return { label, type, host, value, status, priority, reason };
}
function readOptionalProviderString(value) {
    const text = String(value || '').trim();
    return text || undefined;
}
function readProviderError(data) {
    if (!data || typeof data !== 'object')
        return '';
    const value = data;
    return String(value.message || value.error || value.errors?.[0]?.message || '').trim();
}
function providerJsonHeaders(apiKey) {
    return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };
}
function unwrapProviderData(value) {
    if (!value || typeof value !== 'object')
        return value;
    const data = value.data;
    return data && typeof data === 'object' && !Array.isArray(data) ? data : value;
}
async function retrieveResendDomain(fetcher, apiKey, domainId) {
    const response = await fetcher(`https://api.resend.com/domains/${encodeURIComponent(domainId)}`, {
        method: 'GET',
        headers: providerJsonHeaders(apiKey),
    });
    if (!response.ok)
        return undefined;
    const data = await response.json().catch(() => ({}));
    return unwrapProviderData(data);
}
function mergeSendGridValidation(domain, validation) {
    const validationResults = validation?.validation_results || {};
    const dns = domain?.dns && typeof domain.dns === 'object' ? { ...domain.dns } : {};
    for (const [key, result] of Object.entries(validationResults)) {
        const current = dns[key] && typeof dns[key] === 'object' ? dns[key] : {};
        const valid = result?.valid;
        dns[key] = {
            ...current,
            ...result,
            status: valid === true ? 'verified' : valid === false ? 'pending' : current.status,
        };
    }
    return {
        ...domain,
        valid: typeof validation?.valid === 'boolean' ? validation.valid : domain?.valid,
        validation_results: validationResults,
        dns,
    };
}
function summarizeDnsRecordStatus(raw, group, fallback) {
    const records = Array.isArray(raw?.records) ? raw.records : [];
    const groupRecords = records.filter((record) => {
        const text = `${record.label || ''} ${record.host || ''} ${record.type || ''}`.toLowerCase();
        return text.includes(group);
    });
    if (groupRecords.length === 0)
        return fallback;
    if (groupRecords.every((record) => String(record.status || '').toLowerCase() === 'verified'))
        return 'verified';
    if (groupRecords.some((record) => /fail|invalid|error/i.test(String(record.status || record.reason || ''))))
        return 'failed';
    return 'pending';
}
function parseRetryAfter(value) {
    if (!value)
        return undefined;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0)
        return Math.ceil(numeric);
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
        return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
    }
    return undefined;
}
function parseEmailHeader(value) {
    const text = String(value || '').trim();
    const match = text.match(/^(.*)<([^>]+)>$/);
    if (!match)
        return { email: text, name: '' };
    return {
        name: match[1].trim().replace(/^"|"$/g, ''),
        email: match[2].trim(),
    };
}
//# sourceMappingURL=emailProviderService.js.map