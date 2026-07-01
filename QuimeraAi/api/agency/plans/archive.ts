import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AGENCY_JSON_HEADERS,
  handleAgencyApiError,
  readJsonBody,
  requireString,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/stripeEdgeProxy.js';
import {
  archiveAgencyServicePlan,
  requireAgencyPlanAccess,
} from './_lib.js';

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
    const agencyTenantId = requireString(body.agencyTenantId, 'agencyTenantId', 120);
    const planId = requireString(body.planId, 'planId', 120);
    const access = await requireAgencyPlanAccess(req, agencyTenantId, 'agency-service-plan-archive');
    const result = await archiveAgencyServicePlan(access.supabase, agencyTenantId, planId, access.user.id);
    sendJson(res, 200, result);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to archive Agency service plan.');
  }
}
