import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { requireSupabaseUser } from '../../_lib/mcpKeys.js';
import {
  assertGoogleCalendarProjectAccess,
  disconnectGoogleCalendarIntegration,
  getGoogleCalendarIntegrationStatus,
} from '../../../services/appointments/appointmentGoogleCalendarSyncService.js';
import {
  JSON_HEADERS,
  normalizeString,
  readBody,
  requestOrigin,
  send,
  sendNoContent,
} from './_lib.js';

function queryValue(req: IncomingMessage, key: string): string | undefined {
  const url = new URL(req.url || '/', requestOrigin(req));
  return url.searchParams.get(key) || undefined;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'DELETE') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const user = await requireSupabaseUser(supabase, req);
    const body = req.method === 'DELETE' ? await readBody(req) : {};
    const projectId = normalizeString(queryValue(req, 'projectId') || body.projectId, 120);
    const calendarId = normalizeString(queryValue(req, 'calendarId') || body.calendarId, 500) || 'primary';
    if (!projectId) {
      send(res, 400, { error: 'projectId is required.' });
      return;
    }

    await assertGoogleCalendarProjectAccess(supabase, user.id, projectId);
    if (req.method === 'DELETE') {
      await disconnectGoogleCalendarIntegration(supabase, projectId, calendarId);
      res.writeHead(200, JSON_HEADERS);
      res.end(JSON.stringify({ connected: false, projectId, calendarId }));
      return;
    }

    const status = await getGoogleCalendarIntegrationStatus(supabase, projectId, calendarId);
    res.writeHead(200, JSON_HEADERS);
    res.end(JSON.stringify(status));
  } catch (error: any) {
    send(res, error.status || 500, { error: error.message || 'Failed to read Google Calendar status.' });
  }
}
