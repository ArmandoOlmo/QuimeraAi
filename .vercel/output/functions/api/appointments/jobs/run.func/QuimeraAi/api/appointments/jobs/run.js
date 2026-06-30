import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { processAppointmentEmailLogs } from '../../../services/appointments/serverless/appointmentEmailDeliveryService.js';
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
        const result = await processAppointmentEmailLogs(getSupabaseAdmin(), {
            limit: Number(process.env.APPOINTMENT_EMAIL_JOB_LIMIT || 25),
            resendApiKey: process.env.RESEND_API_KEY,
            defaultFromEmail: process.env.APPOINTMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL,
        });
        send(res, 200, result);
    }
    catch (error) {
        send(res, error.status || 500, { error: error.message || 'Failed to process appointment email jobs.' });
    }
}
//# sourceMappingURL=run.js.map