import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AGENCY_JSON_HEADERS,
  handleAgencyApiError,
  invokeAgencyStripeAction,
  optionalPositiveNumber,
  readJsonBody,
  requireBearerToken,
  requireString,
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
    const authorization = requireBearerToken(req);
    const body = await readJsonBody(req);
    const clientTenantId = requireString(body.clientTenantId, 'clientTenantId', 120);
    const planId = requireString(body.planId, 'planId', 120);
    const customPrice = optionalPositiveNumber(body.customPrice, 'customPrice');

    const result = await invokeAgencyStripeAction('agencyBilling-createClientPaymentLink', {
      clientTenantId,
      planId,
      customPrice,
    }, { authorization });

    sendJson(res, result.status, result.body);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to create Agency payment link.');
  }
}
