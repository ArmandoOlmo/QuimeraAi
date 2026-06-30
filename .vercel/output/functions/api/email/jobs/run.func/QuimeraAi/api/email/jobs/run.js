import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { createEmailProviderRegistry, createResendEmailProvider, } from '../../../services/email/serverless/emailProviderService.js';
import { processEmailOutbox } from '../../../services/email/serverless/emailOutboxProcessor.js';
const JSON_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
function send(res, status, body) {
    res.writeHead(status, JSON_HEADERS);
    res.end(JSON.stringify(body));
}
function tokenFromRequest(req) {
    const cronHeader = req.headers['x-cron-secret'];
    if (typeof cronHeader === 'string')
        return cronHeader;
    const auth = req.headers.authorization;
    const value = Array.isArray(auth) ? auth[0] : auth;
    return value?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}
export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, JSON_HEADERS);
        res.end();
        return;
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
        send(res, 405, { error: 'Method not allowed' });
        return;
    }
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        send(res, 500, { error: 'CRON_SECRET is not configured.' });
        return;
    }
    if (tokenFromRequest(req) !== cronSecret) {
        send(res, 401, { error: 'Unauthorized.' });
        return;
    }
    try {
        const url = new URL(req.url || '/', 'https://quimera.ai');
        const provider = createResendEmailProvider(process.env.RESEND_API_KEY);
        const providers = createEmailProviderRegistry({
            resendApiKey: process.env.RESEND_API_KEY,
            sendGridApiKey: process.env.SENDGRID_API_KEY,
        });
        const result = await processEmailOutbox({
            supabase: getSupabaseAdmin(),
            provider,
            providers,
            projectId: url.searchParams.get('projectId') || undefined,
            campaignId: url.searchParams.get('campaignId') || undefined,
            idempotencyKey: url.searchParams.get('idempotencyKey') || undefined,
            limit: Number(url.searchParams.get('limit') || process.env.EMAIL_OUTBOX_JOB_LIMIT || 50),
            rateLimit: {
                maxPerRun: Number(process.env.EMAIL_OUTBOX_MAX_PER_RUN || 0) || undefined,
                maxPerMinute: Number(process.env.EMAIL_OUTBOX_MAX_PER_MINUTE || 0) || undefined,
                retryAfterSeconds: Number(process.env.EMAIL_OUTBOX_RETRY_AFTER_SECONDS || 0) || undefined,
            },
        });
        send(res, 200, result);
    }
    catch (error) {
        send(res, error.status || 500, { error: error.message || 'Failed to process email outbox.' });
    }
}
//# sourceMappingURL=run.js.map