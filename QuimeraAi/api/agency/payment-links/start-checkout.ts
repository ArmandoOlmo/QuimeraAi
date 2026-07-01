import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AGENCY_JSON_HEADERS,
  bearerTokenFromRequest,
  handleAgencyApiError,
  invokeAgencyStripeAction,
  readJsonBody,
  requireString,
  safePaymentReturnUrl,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/stripeEdgeProxy.js';

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
    const body = await readJsonBody(req);
    const token = requireString(body.token, 'token', 220);
    const result = await invokeAgencyStripeAction('agencyBilling-confirmClientPayment', {
      token,
      successUrl: safePaymentReturnUrl(req, token, body.successUrl, 'success'),
      cancelUrl: safePaymentReturnUrl(req, token, body.cancelUrl, 'cancelled'),
    }, {
      authorization: bearerTokenFromRequest(req),
    });

    sendJson(res, result.status, result.body);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to start Agency checkout.');
  }
}
