import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { requireSupabaseUser } from '../../_lib/mcpKeys.js';
import {
  assertGoogleCalendarProjectAccess,
  syncGoogleCalendarIntegration,
} from '../../../services/appointments/appointmentGoogleCalendarSyncService.ts';
import {
  JSON_HEADERS,
  normalizeString,
  readBody,
  send,
  sendNoContent,
} from './_lib.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
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
    const calendarId = normalizeString(body.calendarId, 500) || 'primary';
    if (!projectId) {
      send(res, 400, { error: 'projectId is required.' });
      return;
    }

    await assertGoogleCalendarProjectAccess(supabase, user.id, projectId);
    const { data: integration, error } = await supabase
      .from('project_google_calendar_integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('provider', 'google_calendar')
      .eq('calendar_id', calendarId)
      .eq('status', 'connected')
      .maybeSingle();
    if (error) throw error;
    if (!integration) {
      send(res, 404, { error: 'Google Calendar is not connected for this project.' });
      return;
    }

    const summary = await syncGoogleCalendarIntegration(supabase, integration, {
      forceFullSync: Boolean(body.forceFullSync),
      pushToGoogle: body.pushToGoogle !== false,
      pullFromGoogle: body.pullFromGoogle !== false,
      limit: Number(body.limit || process.env.GOOGLE_CALENDAR_MANUAL_SYNC_LIMIT || 100),
    });

    res.writeHead(200, JSON_HEADERS);
    res.end(JSON.stringify({ summary }));
  } catch (error: any) {
    send(res, error.status || 500, { error: error.message || 'Failed to sync Google Calendar.' });
  }
}
