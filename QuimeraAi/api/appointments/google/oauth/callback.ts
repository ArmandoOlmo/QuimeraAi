import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';
import {
  assertGoogleCalendarProjectAccess,
  createOrRenewGoogleCalendarWatch,
  exchangeGoogleCalendarCode,
  syncGoogleCalendarIntegration,
  upsertGoogleCalendarIntegration,
  verifyGoogleCalendarOAuthState,
} from '../../../../services/appointments/appointmentGoogleCalendarSyncService.js';
import {
  googleRedirectUri,
  redirectWithStatus,
  requestOrigin,
  safeReturnUrl,
  send,
} from '../_lib.js';

function queryValue(req: IncomingMessage, key: string): string | undefined {
  const url = new URL(req.url || '/', requestOrigin(req));
  const value = url.searchParams.get(key);
  return value || undefined;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  const fallbackReturnUrl = safeReturnUrl(req, undefined);
  let returnUrl = fallbackReturnUrl;

  try {
    const code = queryValue(req, 'code');
    const state = queryValue(req, 'state');
    const oauthError = queryValue(req, 'error');
    if (oauthError) {
      redirectWithStatus(res, returnUrl, { googleCalendar: 'error', reason: oauthError });
      return;
    }
    if (!code || !state) {
      redirectWithStatus(res, returnUrl, { googleCalendar: 'error', reason: 'missing_code_or_state' });
      return;
    }

    const stateSecret = process.env.GOOGLE_CALENDAR_OAUTH_STATE_SECRET || process.env.CRON_SECRET;
    if (!stateSecret) throw Object.assign(new Error('GOOGLE_CALENDAR_OAUTH_STATE_SECRET is not configured.'), { status: 500 });
    const payload = verifyGoogleCalendarOAuthState(state, stateSecret);
    returnUrl = safeReturnUrl(req, payload.returnUrl);

    const supabase = getSupabaseAdmin();
    const project = await assertGoogleCalendarProjectAccess(supabase, payload.userId, payload.projectId);
    const tokens = await exchangeGoogleCalendarCode(code, {
      redirectUri: googleRedirectUri(req),
    });

    let integration = await upsertGoogleCalendarIntegration(supabase, {
      projectId: payload.projectId,
      tenantId: project.tenantId,
      userId: payload.userId,
      calendarId: payload.calendarId || 'primary',
      calendarName: payload.calendarId === 'primary' || !payload.calendarId ? 'Primary calendar' : payload.calendarId,
      tokens,
    }, {
      redirectUri: googleRedirectUri(req),
    });

    try {
      integration = await createOrRenewGoogleCalendarWatch(supabase, integration, {
        webhookUrl: process.env.GOOGLE_CALENDAR_WEBHOOK_URL,
      });
      await syncGoogleCalendarIntegration(supabase, integration, {
        forceFullSync: true,
        pushToGoogle: true,
        pullFromGoogle: true,
        limit: Number(process.env.GOOGLE_CALENDAR_INITIAL_SYNC_LIMIT || 100),
      });
    } catch (syncError: any) {
      redirectWithStatus(res, returnUrl, {
        googleCalendar: 'connected',
        sync: 'pending',
        reason: syncError.message || 'initial_sync_pending',
      });
      return;
    }

    redirectWithStatus(res, returnUrl, { googleCalendar: 'connected', sync: 'synced' });
  } catch (error: any) {
    redirectWithStatus(res, returnUrl, {
      googleCalendar: 'error',
      reason: error.message || 'callback_failed',
    });
  }
}
