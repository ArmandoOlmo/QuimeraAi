import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AGENCY_JSON_HEADERS,
  handleAgencyApiError,
  invokeAgencyOnboardingAction,
  readJsonBody,
  requireBearerToken,
  requireString,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/stripeEdgeProxy.js';

const VALID_APPROVAL_DECISIONS = new Set(['approved', 'rejected', 'change_requested']);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, AGENCY_JSON_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  try {
    const authorization = requireBearerToken(req);
    const body = await readJsonBody(req);
    const decision = requireString(body.decision, 'decision', 80);
    if (!VALID_APPROVAL_DECISIONS.has(decision)) {
      sendJson(res, 400, { error: 'Unsupported approval decision.' });
      return;
    }

    const result = await invokeAgencyOnboardingAction('respondClientApproval', {
      approvalId: requireString(body.approvalId, 'approvalId', 120),
      decision,
      responseNote: typeof body.responseNote === 'string' ? body.responseNote.trim() : '',
    }, { authorization });
    sendJson(res, result.status, result.body);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to respond to Agency approval.');
  }
}
