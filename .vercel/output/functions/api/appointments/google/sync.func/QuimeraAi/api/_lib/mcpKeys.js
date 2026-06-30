import { createHash, randomBytes } from 'node:crypto';
import { MCP_SCOPES } from './mcpAuth.js';
export const DEFAULT_MCP_SCOPES = [
    'projects:read',
    'projects:write',
    'templates:read',
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
    'reports:read',
];
export function createMcpApiKey() {
    const keyPrefix = 'qma_live';
    const secret = randomBytes(32).toString('base64url');
    const apiKey = `${keyPrefix}_${secret}`;
    return {
        apiKey,
        keyHash: createHash('sha256').update(apiKey).digest('hex'),
        keyPrefix,
        keyPreview: `${keyPrefix}_...${secret.slice(-8)}`,
    };
}
export function parseBearerToken(req) {
    const raw = req.headers.authorization;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
}
export function normalizeRequestedScopes(scopes) {
    const requested = Array.isArray(scopes) ? scopes.filter((scope) => typeof scope === 'string') : DEFAULT_MCP_SCOPES;
    const allowed = new Set(MCP_SCOPES);
    return requested.filter((scope) => allowed.has(scope) || scope.endsWith(':*') || scope === '*');
}
export async function requireSupabaseUser(supabase, req) {
    const token = parseBearerToken(req);
    if (!token) {
        throw Object.assign(new Error('Missing Supabase Bearer token.'), { status: 401 });
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        throw Object.assign(new Error('Invalid Supabase session.'), { status: 401, details: error?.message });
    }
    return { id: data.user.id, email: data.user.email || undefined };
}
export async function assertUserTenantAccess(supabase, userId, tenantId) {
    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', tenantId)
        .eq('owner_user_id', userId)
        .maybeSingle();
    if (tenantError)
        throw tenantError;
    if (tenant)
        return;
    const { data: membership, error: membershipError } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .maybeSingle();
    if (membershipError)
        throw membershipError;
    if (!membership) {
        throw Object.assign(new Error('Tenant access denied.'), { status: 403 });
    }
}
//# sourceMappingURL=mcpKeys.js.map