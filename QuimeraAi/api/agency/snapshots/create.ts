import type { IncomingMessage, ServerResponse } from 'node:http';
import { AgencySnapshotService, type AgencySnapshotStatus, type AgencySnapshotType } from '../../../services/agency/agencySnapshotService.js';
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

const VALID_SNAPSHOT_TYPES = new Set<AgencySnapshotType>([
  'project_template',
  'client_stack',
  'workflow',
  'content_pack',
  'full_agency_template',
  'other',
]);

const VALID_SNAPSHOT_STATUSES = new Set<AgencySnapshotStatus>(['draft', 'active', 'archived']);

function optionalSnapshotType(value: unknown): AgencySnapshotType | undefined {
  const normalized = normalizeString(value, 80) as AgencySnapshotType | undefined;
  if (!normalized) return undefined;
  return VALID_SNAPSHOT_TYPES.has(normalized) ? normalized : undefined;
}

function optionalSnapshotStatus(value: unknown): AgencySnapshotStatus | undefined {
  const normalized = normalizeString(value, 40) as AgencySnapshotStatus | undefined;
  if (!normalized) return undefined;
  return VALID_SNAPSHOT_STATUSES.has(normalized) ? normalized : undefined;
}

function optionalTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return Array.from(new Set(value
    .map(item => normalizeString(item, 80))
    .filter((item): item is string => Boolean(item))))
    .slice(0, 20);
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
    const body = await readJsonBody(req);
    const agencyTenantId = requireString(body.agencyTenantId, 'agencyTenantId', 120);
    const access = await requireAgencyServiceAccess(req, {
      tenantId: agencyTenantId,
      moduleId: 'agency-project-transfer',
      serviceId: 'agency',
      featureKey: 'agencyModule',
      requiredPermission: 'canManageProjects',
      action: 'agency-snapshot-create',
    });

    const service = new AgencySnapshotService(access.supabase as any);
    const result = await service.createSnapshotFromProject({
      agencyTenantId,
      sourceProjectId: requireString(body.sourceProjectId, 'sourceProjectId', 120),
      name: requireString(body.name, 'name', 180),
      description: normalizeString(body.description, 1000) || null,
      industry: normalizeString(body.industry, 160) || null,
      snapshotType: optionalSnapshotType(body.snapshotType),
      status: optionalSnapshotStatus(body.status),
      tags: optionalTags(body.tags),
      createdBy: access.user.id,
      versionLabel: normalizeString(body.versionLabel, 180) || null,
    });

    sendJson(res, 200, {
      snapshot: result.snapshot,
      version: {
        id: result.version.id,
        snapshot_id: result.version.snapshot_id,
        version: result.version.version,
        label: result.version.label,
        checksum: result.version.checksum,
        metadata: result.version.metadata,
      },
      checksum: result.checksum,
      payloadSummary: {
        sourceProject: result.payload.sourceProject,
        includedModules: result.payload.includedModules,
        readiness: result.payload.readiness,
        draftSafety: result.payload.draftSafety,
      },
    });
  } catch (error) {
    handleAgencyApiError(res, error, 'Failed to create Agency snapshot.');
  }
}
