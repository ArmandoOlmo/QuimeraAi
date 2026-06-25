import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';
import { processGoogleCalendarSyncJobs } from '../../../../services/appointments/appointmentGoogleCalendarSyncService.ts';
import {
  JSON_HEADERS,
  send,
  sendNoContent,
  tokenFromRequest,
} from '../_lib.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    sendNoContent(res);
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
    const result = await processGoogleCalendarSyncJobs(getSupabaseAdmin(), {
      limit: Number(process.env.GOOGLE_CALENDAR_SYNC_JOB_LIMIT || 25),
      webhookUrl: process.env.GOOGLE_CALENDAR_WEBHOOK_URL,
    });
    res.writeHead(200, JSON_HEADERS);
    res.end(JSON.stringify(result));
  } catch (error: any) {
    send(res, error.status || 500, { error: error.message || 'Failed to process Google Calendar sync jobs.' });
  }
}
