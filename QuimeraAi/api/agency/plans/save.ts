import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AGENCY_JSON_HEADERS,
  handleAgencyApiError,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/stripeEdgeProxy.js';
import {
  agencyTenantIdFromPlanInput,
  readPlanInput,
  requireAgencyPlanAccess,
  saveAgencyServicePlan,
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
    const plan = readPlanInput(body);
    const agencyTenantId = agencyTenantIdFromPlanInput(body, plan);
    const access = await requireAgencyPlanAccess(req, agencyTenantId, 'agency-service-plan-save');
    const result = await saveAgencyServicePlan(access.supabase, agencyTenantId, plan, access.user.id);
    sendJson(res, 200, result);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to save Agency service plan.');
  }
}
