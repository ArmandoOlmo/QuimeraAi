import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const createSnapshotFromProject = vi.fn();
  const previewSnapshotApplication = vi.fn();
  const applySnapshot = vi.fn();
  const getUser = vi.fn();
  const from = vi.fn();
  class MockAgencySnapshotService {
    createSnapshotFromProject = createSnapshotFromProject;
    previewSnapshotApplication = previewSnapshotApplication;
    applySnapshot = applySnapshot;
  }
  const AgencySnapshotService = vi.fn(MockAgencySnapshotService);

  return {
    createSnapshotFromProject,
    previewSnapshotApplication,
    applySnapshot,
    getUser,
    from,
    AgencySnapshotService,
  };
});

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

vi.mock('../../services/agency/agencySnapshotService.js', () => ({
  AgencySnapshotService: mocks.AgencySnapshotService,
}));

import createSnapshotHandler from '../../api/agency/snapshots/create.ts';
import previewSnapshotHandler from '../../api/agency/snapshots/apply-preview.ts';
import applySnapshotHandler from '../../api/agency/snapshots/apply.ts';

type MockResponse = {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (body?: string) => void;
};

function createRequest(method: string, body?: unknown, headers: Record<string, string> = {}) {
  const rawBody = typeof body === 'string'
    ? body
    : body === undefined
      ? ''
      : JSON.stringify(body);
  const request = Readable.from(rawBody ? [rawBody] : []) as any;
  request.method = method;
  request.url = '/api/agency/snapshots/test';
  request.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return request;
}

function createResponse(): MockResponse {
  return {
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
  };
}

function jsonBody(res: MockResponse) {
  return JSON.parse(res.body || '{}');
}

function queryResult(data: Record<string, unknown> | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  return query;
}

describe('Agency snapshot Vercel API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@agency.test', app_metadata: {} } },
      error: null,
    });
    mocks.from.mockImplementation((table: string) => {
      if (table === 'users') return queryResult({ role: 'agency_owner', email: 'owner@agency.test' });
      if (table === 'tenants') return queryResult({
        id: 'agency-1',
        type: 'agency',
        status: 'active',
        subscription_plan: 'agency_pro',
        limits: {},
        usage: {},
        owner_user_id: 'other-user',
      });
      if (table === 'tenant_members') return queryResult({
        role: 'agency_owner',
        permissions: { canManageProjects: true },
      });
      if (table === 'settings') return queryResult({
        config: { services: { agency: { status: 'public' } } },
      });
      return queryResult(null);
    });
  });

  it('requires a user bearer token before creating snapshots', async () => {
    const res = createResponse();

    await createSnapshotHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      sourceProjectId: 'project-source-1',
      name: 'Starter',
    }), res as any);

    expect(res.statusCode).toBe(401);
    expect(jsonBody(res)).toEqual({ error: 'Authorization bearer token is required.' });
    expect(mocks.AgencySnapshotService).not.toHaveBeenCalled();
  });

  it('creates snapshots with service-role execution and the authenticated user id', async () => {
    mocks.createSnapshotFromProject.mockResolvedValue({
      snapshot: { id: 'snapshot-1', agency_tenant_id: 'agency-1', name: 'Starter', status: 'active' },
      version: {
        id: 'version-1',
        snapshot_id: 'snapshot-1',
        version: 1,
        label: 'Initial',
        checksum: 'checksum-1',
        metadata: { includedModules: ['website-builder'] },
        payload: { shouldNotLeak: true },
      },
      checksum: 'checksum-1',
      payload: {
        sourceProject: { id: 'project-source-1', tenantId: 'agency-1', name: 'Source' },
        includedModules: ['website-builder'],
        readiness: { isReady: true, blockers: [], warnings: [] },
        draftSafety: { noAutoPublish: true },
      },
    });
    const res = createResponse();

    await createSnapshotHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      sourceProjectId: 'project-source-1',
      name: 'Starter',
      status: 'active',
      tags: ['agency-template'],
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(200);
    expect(mocks.createSnapshotFromProject).toHaveBeenCalledWith(expect.objectContaining({
      agencyTenantId: 'agency-1',
      sourceProjectId: 'project-source-1',
      name: 'Starter',
      status: 'active',
      createdBy: 'user-1',
      tags: ['agency-template'],
    }));
    expect(jsonBody(res).version).not.toHaveProperty('payload');
  });

  it('previews snapshot application through the canonical service', async () => {
    mocks.previewSnapshotApplication.mockResolvedValue({
      schemaVersion: 1,
      source: 'agency_snapshot_service',
      readiness: { isReady: true, blockers: [], warnings: [] },
      idempotencyKey: 'agency-snapshot:agency-1:snapshot-1',
    });
    const res = createResponse();

    await previewSnapshotHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      snapshotId: 'snapshot-1',
      targetProjectId: 'project-target-1',
      clientTenantId: 'client-1',
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(200);
    expect(mocks.previewSnapshotApplication).toHaveBeenCalledWith(expect.objectContaining({
      agencyTenantId: 'agency-1',
      snapshotId: 'snapshot-1',
      targetProjectId: 'project-target-1',
      clientTenantId: 'client-1',
      appliedBy: 'user-1',
    }));
    expect(jsonBody(res)).toMatchObject({ idempotencyKey: 'agency-snapshot:agency-1:snapshot-1' });
  });

  it('applies snapshots idempotently with the authenticated user id', async () => {
    mocks.applySnapshot.mockResolvedValue({
      status: 'applied',
      applicationId: 'application-1',
      preview: {
        idempotencyKey: 'agency-snapshot:agency-1:snapshot-1',
        readiness: { isReady: true, blockers: [], warnings: [] },
      },
    });
    const res = createResponse();

    await applySnapshotHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      snapshotId: 'snapshot-1',
      targetProjectId: 'project-target-1',
      idempotencyKey: 'agency-snapshot:agency-1:snapshot-1',
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(200);
    expect(mocks.applySnapshot).toHaveBeenCalledWith(expect.objectContaining({
      agencyTenantId: 'agency-1',
      snapshotId: 'snapshot-1',
      targetProjectId: 'project-target-1',
      appliedBy: 'user-1',
      idempotencyKey: 'agency-snapshot:agency-1:snapshot-1',
    }));
    expect(jsonBody(res)).toMatchObject({ status: 'applied', applicationId: 'application-1' });
  });

  it('returns a conflict when the service rejects an unsafe application', async () => {
    mocks.applySnapshot.mockResolvedValue({
      status: 'failed',
      error: 'snapshot_archived',
      preview: {
        readiness: { isReady: false, blockers: ['snapshot_archived'], warnings: [] },
      },
    });
    const res = createResponse();

    await applySnapshotHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      snapshotId: 'snapshot-1',
      targetProjectId: 'project-target-1',
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(409);
    expect(jsonBody(res)).toMatchObject({ status: 'failed', error: 'snapshot_archived' });
  });
});
