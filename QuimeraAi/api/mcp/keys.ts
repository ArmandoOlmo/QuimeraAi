import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import {
  assertUserTenantAccess,
  createMcpApiKey,
  normalizeRequestedScopes,
  requireSupabaseUser,
} from '../_lib/mcpKeys.js';
import { MCP_SCOPES } from '../_lib/mcpAuth.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage & { body?: any }): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function getQueryParam(req: IncomingMessage, name: string): string | null {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `https://${host}`);
  return url.searchParams.get(name);
}

function normalizeKey(row: Record<string, any>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    projectId: row.project_id,
    name: row.name,
    keyPreview: row.metadata?.keyPreview || row.key_prefix || 'qma_live',
    scopes: row.scopes || [],
    status: row.status || 'active',
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    callsLast30Days: Number(row.callsLast30Days || 0),
  };
}

async function countCallsLast30Days(apiKeyId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await getSupabaseAdmin()
    .from('api_logs')
    .select('id', { count: 'exact', head: true })
    .filter('metadata->>api_key_id', 'eq', apiKeyId)
    .gte('created_at', since);
  return count || 0;
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, JSON_HEADERS);
    res.end();
    return;
  }

  const supabase = getSupabaseAdmin();

  try {
    const user = await requireSupabaseUser(supabase, req);

    if (req.method === 'GET') {
      const tenantId = getQueryParam(req, 'tenantId');
      if (!tenantId) throw Object.assign(new Error('tenantId is required.'), { status: 400 });
      await assertUserTenantAccess(supabase, user.id, tenantId);

      const { data, error } = await supabase
        .from('api_keys')
        .select('id, tenant_id, project_id, name, key_prefix, scopes, status, created_at, last_used_at, expires_at, metadata')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = await Promise.all((data || []).map(async (row) => ({
        ...row,
        callsLast30Days: await countCallsLast30Days(row.id),
      })));
      send(res, 200, { keys: rows.map(normalizeKey), availableScopes: MCP_SCOPES });
      return;
    }

    if (req.method !== 'POST') {
      send(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = await readJson(req);
    const action = body.action || 'create';
    const tenantId = body.tenantId;
    if (!tenantId) throw Object.assign(new Error('tenantId is required.'), { status: 400 });
    await assertUserTenantAccess(supabase, user.id, tenantId);

    if (action === 'create') {
      const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'MCP Agent Key';
      const scopes = normalizeRequestedScopes(body.scopes || body.permissions);
      if (scopes.length === 0) throw Object.assign(new Error('At least one valid scope is required.'), { status: 400 });

      const expiresAt = body.expiresInDays
        ? new Date(Date.now() + Number(body.expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const key = createMcpApiKey();

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          tenant_id: tenantId,
          project_id: body.projectId || null,
          user_id: user.id,
          name,
          key_hash: key.keyHash,
          key_prefix: key.keyPrefix,
          scopes,
          status: 'active',
          expires_at: expiresAt,
          metadata: {
            keyPreview: key.keyPreview,
            createdBy: user.id,
            createdByEmail: user.email,
            purpose: 'mcp',
          },
        })
        .select('id, tenant_id, project_id, name, key_prefix, scopes, status, created_at, last_used_at, expires_at, metadata')
        .single();

      if (error) throw error;
      send(res, 201, { success: true, apiKey: key.apiKey, key: normalizeKey(data) });
      return;
    }

    if (action === 'revoke') {
      if (!body.keyId) throw Object.assign(new Error('keyId is required.'), { status: 400 });
      const { data: existing, error: findError } = await supabase
        .from('api_keys')
        .select('id, tenant_id, metadata')
        .eq('id', body.keyId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (findError) throw findError;
      if (!existing) throw Object.assign(new Error('API key not found.'), { status: 404 });

      const { error } = await supabase
        .from('api_keys')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          metadata: {
            ...(existing.metadata || {}),
            revokedBy: user.id,
            revokedAt: new Date().toISOString(),
          },
        })
        .eq('id', body.keyId);

      if (error) throw error;
      send(res, 200, { success: true });
      return;
    }

    throw Object.assign(new Error(`Unsupported action: ${action}`), { status: 400 });
  } catch (error: any) {
    send(res, error.status || 500, {
      error: error.message || 'Internal server error',
      details: error.details,
    });
  }
}
