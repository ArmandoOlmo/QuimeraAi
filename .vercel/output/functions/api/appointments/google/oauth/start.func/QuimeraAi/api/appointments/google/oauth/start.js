import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';
import { requireSupabaseUser } from '../../../_lib/mcpKeys.js';
import { assertGoogleCalendarProjectAccess, buildGoogleCalendarOAuthUrl, } from '../../../../services/appointments/appointmentGoogleCalendarSyncService.js';
import { googleRedirectUri, JSON_HEADERS, normalizeString, readBody, safeReturnUrl, send, sendNoContent, } from '../_lib.js';
export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendNoContent(res);
        return;
    }
    if (req.method !== 'POST') {
        send(res, 405, { error: 'Method not allowed' });
        return;
    }
    try {
        const supabase = getSupabaseAdmin();
        const user = await requireSupabaseUser(supabase, req);
        const body = await readBody(req);
        const projectId = normalizeString(body.projectId, 120);
        if (!projectId) {
            send(res, 400, { error: 'projectId is required.' });
            return;
        }
        await assertGoogleCalendarProjectAccess(supabase, user.id, projectId);
        const redirectUri = googleRedirectUri(req);
        const authorizationUrl = buildGoogleCalendarOAuthUrl({
            projectId,
            userId: user.id,
            calendarId: normalizeString(body.calendarId, 500) || 'primary',
            returnUrl: safeReturnUrl(req, body.returnUrl),
        }, {
            redirectUri,
        });
        res.writeHead(200, JSON_HEADERS);
        res.end(JSON.stringify({ authorizationUrl, redirectUri }));
    }
    catch (error) {
        send(res, error.status || 500, { error: error.message || 'Failed to start Google Calendar OAuth.' });
    }
}
//# sourceMappingURL=start.js.map