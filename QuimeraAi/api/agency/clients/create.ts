import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AGENCY_JSON_HEADERS,
  handleAgencyApiError,
  invokeAgencyOnboardingAction,
  optionalFiniteNumber,
  readJsonBody,
  requireBearerToken,
  requireString,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/stripeEdgeProxy.js';

const CLIENT_CREATE_ALLOWED_FIELDS = [
  'agencyTenantId',
  'businessName',
  'industry',
  'contactEmail',
  'contactPhone',
  'projectTemplate',
  'enabledFeatures',
  'initialUsers',
  'logoUrl',
  'primaryColor',
  'secondaryColor',
  'monthlyPrice',
  'selectedPlanId',
  'selectedPlanName',
  'setupBilling',
  'aiStudioMode',
  'generateWebsite',
  'generateStorefront',
  'generateEcommerce',
  'generateChatbot',
  'generateEmailFlows',
  'generateAppointments',
  'generateRestaurantModule',
  'generateRealtyModule',
  'generateBioPage',
  'generateMediaAssets',
] as const;

function pickClientCreatePayload(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of CLIENT_CREATE_ALLOWED_FIELDS) {
    if (body[field] !== undefined) payload[field] = body[field];
  }
  return payload;
}

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
    const payload = pickClientCreatePayload(body);
    payload.agencyTenantId = requireString(body.agencyTenantId, 'agencyTenantId', 120);
    payload.businessName = requireString(body.businessName, 'businessName', 180);
    payload.contactEmail = requireString(body.contactEmail, 'contactEmail', 320).toLowerCase();
    payload.monthlyPrice = optionalFiniteNumber(body.monthlyPrice, 'monthlyPrice');

    const result = await invokeAgencyOnboardingAction('autoProvision', payload, { authorization });
    sendJson(res, result.status, result.body);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to create Agency client.');
  }
}
