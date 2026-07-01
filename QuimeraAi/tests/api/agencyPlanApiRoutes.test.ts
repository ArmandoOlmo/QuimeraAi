import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rows: {
    users: [] as any[],
    tenants: [] as any[],
    tenant_members: [] as any[],
    settings: [] as any[],
    agency_service_plans: [] as any[],
    agency_clients: [] as any[],
  },
}));

class FakeQuery {
  private filters: Array<{ key: string; value: unknown; op: 'eq' | 'neq' }> = [];
  private mode: 'select' | 'update' | 'upsert' | 'delete' = 'select';
  private updatePayload: Record<string, unknown> | null = null;
  private upsertPayload: Record<string, unknown> | null = null;
  private selectOptions: { count?: string; head?: boolean } | undefined;

  constructor(private readonly table: keyof typeof mocks.rows) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    this.mode = 'select';
    this.selectOptions = options;
    return this;
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value, op: 'eq' });
    return this;
  }

  neq(key: string, value: unknown) {
    this.filters.push({ key, value, op: 'neq' });
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.mode = 'update';
    this.updatePayload = payload;
    return this;
  }

  upsert(payload: Record<string, unknown>) {
    this.mode = 'upsert';
    this.upsertPayload = payload;
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  async maybeSingle() {
    const rows = this.filteredRows();
    return { data: rows[0] || null, error: null };
  }

  then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
    return this.execute().then(resolve, reject);
  }

  private tableRows() {
    return mocks.rows[this.table] as any[];
  }

  private filteredRows() {
    return this.tableRows().filter(row => this.filters.every(filter => {
      const matches = row[filter.key] === filter.value;
      return filter.op === 'eq' ? matches : !matches;
    }));
  }

  private async execute() {
    if (this.selectOptions?.head && this.selectOptions.count === 'exact') {
      return { data: null, count: this.filteredRows().length, error: null };
    }

    if (this.mode === 'update') {
      const rows = this.filteredRows();
      rows.forEach(row => Object.assign(row, this.updatePayload));
      return { data: rows, error: null };
    }

    if (this.mode === 'upsert') {
      const payload = { ...(this.upsertPayload || {}) };
      const rows = this.tableRows();
      const existing = rows.find(row => row.id === payload.id);
      if (existing) {
        Object.assign(existing, payload);
      } else {
        rows.push(payload);
      }
      return { data: payload, error: null };
    }

    if (this.mode === 'delete') {
      const rows = this.tableRows();
      const deleteIds = new Set(this.filteredRows().map(row => row.id));
      mocks.rows[this.table] = rows.filter(row => !deleteIds.has(row.id)) as any;
      return { data: null, error: null };
    }

    return { data: this.filteredRows(), error: null };
  }
}

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: () => ({
    auth: { getUser: mocks.getUser },
    from: (table: keyof typeof mocks.rows) => new FakeQuery(table),
  }),
}));

import savePlanHandler from '../../api/agency/plans/save.ts';
import archivePlanHandler from '../../api/agency/plans/archive.ts';

type MockResponse = {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (status: number, headers: Record<string, string>) => void;
  end: (body?: string) => void;
};

function createRequest(method: string, body?: unknown, headers: Record<string, string> = {}) {
  const rawBody = body === undefined ? '' : JSON.stringify(body);
  const request = Readable.from(rawBody ? [rawBody] : []) as any;
  request.method = method;
  request.url = '/api/agency/plans/test';
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

function seedAccess(
  permissions: Record<string, boolean> | null = { canManageBilling: true },
  role = 'agency_admin',
  userRole = 'user',
) {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'ops@agency.test', app_metadata: {} } },
    error: null,
  });
  mocks.rows.users = [{ id: 'user-1', role: userRole, email: 'ops@agency.test' }];
  mocks.rows.tenants = [{ id: 'agency-1', status: 'active', subscription_plan: 'agency_pro', owner_user_id: 'owner-2' }];
  mocks.rows.tenant_members = permissions
    ? [{ tenant_id: 'agency-1', user_id: 'user-1', role, permissions }]
    : [];
  mocks.rows.settings = [{ id: 'serviceAvailability', config: { services: { agency: { status: 'public' } } } }];
}

describe('Agency service plan Vercel API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mocks.rows).forEach((key) => {
      mocks.rows[key as keyof typeof mocks.rows] = [];
    });
    seedAccess();
  });

  it('requires a user bearer token before saving service plans', async () => {
    const res = createResponse();

    await savePlanHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      plan: { tenantId: 'agency-1', name: 'Growth', price: 149, baseCost: 49 },
    }), res as any);

    expect(res.statusCode).toBe(401);
    expect(jsonBody(res)).toEqual({ error: 'Authorization bearer token is required.' });
    expect(mocks.rows.agency_service_plans).toEqual([]);
  });

  it('saves canonical service plans with base cost, limits, features, and user audit fields', async () => {
    const res = createResponse();

    await savePlanHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      plan: {
        tenantId: 'agency-1',
        name: 'Growth',
        description: 'Growth plan',
        price: 149,
        baseCost: 49,
        isDefault: true,
        limits: { maxProjects: 3, maxUsers: 5, maxAiCredits: 900 },
        features: { crmEnabled: true, ecommerceEnabled: true },
      },
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(200);
    const body = jsonBody(res);
    expect(body).toMatchObject({ success: true, planId: expect.stringMatching(/^plan_/) });
    expect(mocks.rows.agency_service_plans[0]).toMatchObject({
      tenant_id: 'agency-1',
      name: 'Growth',
      price: 149,
      base_cost: 49,
      is_default: true,
      created_by: 'user-1',
      updated_by: 'user-1',
      limits: expect.objectContaining({ maxProjects: 3, maxUsers: 5, maxAiCredits: 900 }),
      features: expect.objectContaining({ crmEnabled: true, ecommerceEnabled: true }),
    });
  });

  it('rejects service plans priced below their base cost', async () => {
    const res = createResponse();

    await savePlanHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      plan: { tenantId: 'agency-1', name: 'Underwater', price: 25, baseCost: 49 },
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res).error).toContain('price must be greater than or equal to baseCost');
    expect(mocks.rows.agency_service_plans).toEqual([]);
  });

  it('prevents archiving plans with active clients', async () => {
    mocks.rows.agency_service_plans = [{
      id: 'plan-1',
      tenant_id: 'agency-1',
      name: 'Growth',
      client_count: 0,
      is_archived: false,
    }];
    mocks.rows.agency_clients = [{
      agency_tenant_id: 'agency-1',
      client_tenant_id: 'client-1',
      agency_plan_id: 'plan-1',
    }];
    const res = createResponse();

    await archivePlanHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      planId: 'plan-1',
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(409);
    expect(jsonBody(res).error).toContain('active client');
    expect(mocks.rows.agency_service_plans[0].is_archived).toBe(false);
  });

  it('requires canManageBilling or agency ownership for service-plan mutation', async () => {
    seedAccess({ canManageBilling: false }, 'agency_member');
    const res = createResponse();

    await savePlanHandler(createRequest('POST', {
      agencyTenantId: 'agency-1',
      plan: { tenantId: 'agency-1', name: 'Growth', price: 149, baseCost: 49 },
    }, {
      Authorization: 'Bearer user_token',
    }), res as any);

    expect(res.statusCode).toBe(403);
    expect(jsonBody(res)).toEqual({ error: 'Agency service access denied.' });
  });

  it('keeps platform Owner and Super Admin aliases above agency membership permission gates', async () => {
    for (const userRole of ['owner', 'superadmin', 'super_admin']) {
      seedAccess(null, 'agency_member', userRole);
      const res = createResponse();

      await savePlanHandler(createRequest('POST', {
        agencyTenantId: 'agency-1',
        plan: { tenantId: 'agency-1', name: `Growth ${userRole}`, price: 149, baseCost: 49 },
      }, {
        Authorization: 'Bearer user_token',
      }), res as any);

      expect(res.statusCode).toBe(200);
    }
  });
});
