import { createHash, timingSafeEqual } from 'node:crypto';
export const MCP_SCOPES = [
    'projects:read',
    'projects:write',
    'templates:read',
    'templates:write',
    'ai:generate_content',
    'ai:generate_image',
    'ai:generate_batch',
    'ai:apply_to_project',
    'leads:read',
    'leads:write',
    'cms:read',
    'cms:write',
    'commerce:read',
    'commerce:write',
    'appointments:read',
    'appointments:write',
    'domains:read',
    'domains:write',
    'reports:read',
];
export const MCP_AI_SCOPES = MCP_SCOPES.filter((scope) => scope.startsWith('ai:'));
function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}
function secureCompare(a, b) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length)
        return false;
    return timingSafeEqual(left, right);
}
function parseBearer(req) {
    const header = req.headers.authorization || req.headers.Authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (!value)
        return null;
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
}
function getKeyPrefix(apiKey) {
    const parts = apiKey.split('_');
    if (parts.length >= 2)
        return `${parts[0]}_${parts[1]}`;
    return apiKey.slice(0, 12);
}
function normalizeScopes(row) {
    const raw = row.scopes || row.permissions || row.metadata?.scopes || row.metadata?.permissions;
    if (Array.isArray(raw))
        return raw.filter((scope) => typeof scope === 'string');
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                return parsed.filter((scope) => typeof scope === 'string');
        }
        catch {
            return raw.split(',').map((scope) => scope.trim()).filter(Boolean);
        }
    }
    return [];
}
export function hasScope(scopes, required) {
    const namespace = required.split(':')[0];
    return (scopes.includes(required) ||
        scopes.includes(`${namespace}:*`) ||
        scopes.includes('admin:*') ||
        scopes.includes('*'));
}
export function requireScope(auth, required) {
    if (!hasScope(auth.scopes, required)) {
        throw Object.assign(new Error(`Insufficient scope: ${required}`), {
            code: 'INSUFFICIENT_SCOPE',
            status: 403,
            currentScopes: auth.scopes,
            requiredScope: required,
        });
    }
}
export function requireAnyScope(auth, requiredScopes) {
    if (requiredScopes.some((scope) => hasScope(auth.scopes, scope)))
        return;
    throw Object.assign(new Error(`Insufficient scope. Required one of: ${requiredScopes.join(', ')}`), {
        code: 'INSUFFICIENT_SCOPE',
        status: 403,
        currentScopes: auth.scopes,
        requiredScope: requiredScopes[0],
    });
}
async function resolveTenantFromProject(supabase, projectId) {
    if (!projectId)
        return null;
    const { data, error } = await supabase
        .from('projects')
        .select('tenant_id')
        .eq('id', projectId)
        .maybeSingle();
    if (error)
        throw error;
    return data?.tenant_id || null;
}
export async function authenticateMcpRequest(req, supabase) {
    const rawKey = parseBearer(req);
    if (!rawKey) {
        throw Object.assign(new Error('Missing Bearer API key.'), { status: 401, code: 'UNAUTHORIZED' });
    }
    const keyPrefix = getKeyPrefix(rawKey);
    const keyHash = sha256(rawKey);
    const { data: prefixedRows, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_prefix', keyPrefix);
    if (error)
        throw error;
    let rows = prefixedRows || [];
    if (rows.length === 0) {
        const { data: fallbackRows, error: fallbackError } = await supabase
            .from('api_keys')
            .select('*');
        if (fallbackError)
            throw fallbackError;
        rows = fallbackRows || [];
    }
    const matchingRow = (rows || []).find((row) => {
        if (typeof row.key_hash !== 'string')
            return false;
        return secureCompare(row.key_hash, keyHash);
    });
    if (!matchingRow) {
        throw Object.assign(new Error('Invalid API key.'), { status: 401, code: 'UNAUTHORIZED' });
    }
    if (matchingRow.status && matchingRow.status !== 'active') {
        throw Object.assign(new Error('API key is not active.'), { status: 403, code: 'KEY_INACTIVE' });
    }
    if (matchingRow.expires_at && new Date(matchingRow.expires_at).getTime() < Date.now()) {
        throw Object.assign(new Error('API key has expired.'), { status: 403, code: 'KEY_EXPIRED' });
    }
    const tenantId = matchingRow.tenant_id || await resolveTenantFromProject(supabase, matchingRow.project_id);
    if (!tenantId) {
        throw Object.assign(new Error('API key is not associated with a tenant.'), {
            status: 403,
            code: 'TENANT_NOT_RESOLVED',
        });
    }
    await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', matchingRow.id);
    const scopes = normalizeScopes(matchingRow);
    return {
        apiKeyId: matchingRow.id,
        keyName: matchingRow.name,
        tenantId,
        projectId: matchingRow.project_id || undefined,
        userId: matchingRow.user_id || matchingRow.created_by || undefined,
        scopes,
        agentId: matchingRow.agent_id || `api_key:${matchingRow.id}`,
    };
}
export function assertTenantAccess(auth, tenantId) {
    const resolvedTenantId = tenantId || auth.tenantId;
    if (resolvedTenantId !== auth.tenantId && !hasScope(auth.scopes, 'admin:*')) {
        throw Object.assign(new Error('Tenant access denied.'), {
            status: 403,
            code: 'TENANT_ACCESS_DENIED',
        });
    }
    return resolvedTenantId;
}
//# sourceMappingURL=mcpAuth.js.map