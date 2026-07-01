import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AGENCY_JSON_HEADERS,
  handleAgencyApiError,
  invokeAgencyStripeAction,
  readJsonBody,
  requireString,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/stripeEdgeProxy.js';

function tokenFromQuery(req: IncomingMessage): string | undefined {
  try {
    const url = new URL(req.url || '/', 'https://quimera.ai');
    return url.searchParams.get('token') || undefined;
  } catch (_error) {
    return undefined;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, AGENCY_JSON_HEADERS);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    sendMethodNotAllowed(res);
    return;
  }

  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const token = requireString(body.token || tokenFromQuery(req), 'token', 220);
    const result = await invokeAgencyStripeAction('agencyBilling-getPaymentLinkInfo', { token });

    sendJson(res, result.status, result.body);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to load Agency payment link.');
  }
}
