import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { markGoogleCalendarWebhookPending } from '../../../services/appointments/appointmentGoogleCalendarSyncService.js';
import { send, sendNoContent } from './_lib.js';

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
    const result = await markGoogleCalendarWebhookPending(getSupabaseAdmin(), req.headers);
    if (!result.matched && result.reason === 'token_mismatch') {
      send(res, 401, { error: 'Invalid Google Calendar channel token.' });
      return;
    }
    sendNoContent(res);
  } catch (_error) {
    sendNoContent(res);
  }
}
