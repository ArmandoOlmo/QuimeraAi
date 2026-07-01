import type { IncomingMessage, ServerResponse } from 'node:http';
import { AgencySnapshotService } from '../../../services/agency/agencySnapshotService.js';
import { requireAgencyServiceAccess } from '../_lib/agencyAccess.js';
import {
  AGENCY_JSON_HEADERS,
  handleAgencyApiError,
  normalizeString,
  readJsonBody,
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
    const body = await readJsonBody(req);
    const agencyTenantId = requireString(body.agencyTenantId, 'agencyTenantId', 120);
    const access = await requireAgencyServiceAccess(req, {
      tenantId: agencyTenantId,
      moduleId: 'agency-project-transfer',
      serviceId: 'agency',
      featureKey: 'agencyModule',
      requiredPermission: 'canManageProjects',
      action: 'agency-snapshot-preview',
    });

    const service = new AgencySnapshotService(access.supabase as any);
    const preview = await service.previewSnapshotApplication({
      agencyTenantId,
      snapshotId: requireString(body.snapshotId, 'snapshotId', 120),
      snapshotVersionId: normalizeString(body.snapshotVersionId, 120) || null,
      clientTenantId: normalizeString(body.clientTenantId, 120) || null,
      targetProjectId: requireString(body.targetProjectId, 'targetProjectId', 120),
      appliedBy: access.user.id,
      idempotencyKey: normalizeString(body.idempotencyKey, 300) || null,
    });

    sendJson(res, 200, preview);
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to preview Agency snapshot.');
  }
}
