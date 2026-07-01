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
    const payload = {
      projectId: requireString(body.projectId, 'projectId', 120),
      sourceTenantId: requireString(body.sourceTenantId || body.agencyTenantId, 'sourceTenantId', 120),
      targetClientTenantId: requireString(body.targetClientTenantId, 'targetClientTenantId', 120),
      projectName: body.projectName,
      name: body.name,
    };

    const result = await invokeAgencyOnboardingAction('transferProject', payload, { authorization });
    sendJson(res, result.status, result.body);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to transfer Agency project.');
  }
}
