import type { IncomingMessage } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { AgencyApiError, normalizeString, requireBearerToken } from './stripeEdgeProxy.js';

type SupabaseQueryResult<T = any> = { data?: T | null; error?: { message?: string | null } | null };

export interface AgencyServiceAccessOptions {
  tenantId: string;
  moduleId?: string;
  serviceId?: 'agency';
  featureKey?: 'agencyModule';
  requiredPermission?: string;
  action?: string;
}

export interface AgencyServiceAccessContext {
  supabase: SupabaseClient;
  user: {
    id: string;
    email?: string | null;
    role?: string | null;
  };
  tenant: Record<string, any> | null;
  membership: Record<string, any> | null;
}

export function authorizationTokenFromBearer(authorization: string): string {
  const normalized = normalizeString(authorization, 4096);
  if (!normalized?.startsWith('Bearer ')) {
    throw new AgencyApiError('Authorization bearer token is required.', 401);
  }
  const token = normalized.slice('Bearer '.length).trim();
  if (!token) throw new AgencyApiError('Authorization bearer token is required.', 401);
  return token;
}

function throwIfQueryError(result: SupabaseQueryResult, fallback: string): void {
  if (result.error) {
    throw new AgencyApiError(result.error.message || fallback, 500);
  }
}

function readServiceStatus(config: unknown, serviceId = 'agency'): string {
  const source = config && typeof config === 'object' ? config as Record<string, any> : {};
  const services = source.services && typeof source.services === 'object' ? source.services as Record<string, any> : {};
  const service = services[serviceId];
  if (typeof service === 'string') return service;
  if (service && typeof service === 'object' && typeof service.status === 'string') return service.status;
  return 'public';
}

function hasPermission(permissions: unknown, permission?: string): boolean {
  if (!permission) return true;
  const source = permissions && typeof permissions === 'object' ? permissions as Record<string, any> : {};
  if (source[permission] === true) return true;
  const parts = permission.split('.');
  let cursor: unknown = source;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return false;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor === true;
}

function isAgencyOperatorRole(role: unknown): boolean {
  return ['agency_owner', 'agency_admin'].includes(String(role || '').trim().toLowerCase());
}

function isAgencyOwnerRole(role: unknown): boolean {
  return String(role || '').trim().toLowerCase() === 'agency_owner';
}

function isPlatformOwnerRole(role: unknown): boolean {
  const normalized = String(role || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  return normalized === 'owner' || normalized === 'superadmin';
}

export async function requireAgencyServiceAccess(
  req: IncomingMessage,
  options: AgencyServiceAccessOptions,
): Promise<AgencyServiceAccessContext> {
  const tenantId = normalizeString(options.tenantId, 120);
  if (!tenantId) throw new AgencyApiError('agencyTenantId is required.', 400);

  const authorization = requireBearerToken(req);
  const token = authorizationTokenFromBearer(authorization);
  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const authUser = authData?.user;

  if (authError || !authUser?.id) {
    throw new AgencyApiError('Invalid authorization token.', 401);
  }

  const [
    userResult,
    tenantResult,
    membershipResult,
    serviceSettingsResult,
  ] = await Promise.all([
    supabase.from('users').select('role,email').eq('id', authUser.id).maybeSingle(),
    supabase.from('tenants').select('id,type,status,subscription_plan,limits,usage,billing,owner_user_id').eq('id', tenantId).maybeSingle(),
    supabase.from('tenant_members').select('role,permissions').eq('tenant_id', tenantId).eq('user_id', authUser.id).maybeSingle(),
    supabase.from('settings').select('config').eq('id', 'serviceAvailability').maybeSingle(),
  ]);

  [userResult, tenantResult, membershipResult, serviceSettingsResult].forEach((result) => {
    throwIfQueryError(result as SupabaseQueryResult, 'Access validation failed.');
  });

  const userRow = (userResult.data || {}) as Record<string, any>;
  const tenant = tenantResult.data as Record<string, any> | null;
  const membership = membershipResult.data as Record<string, any> | null;
  const serviceSettings = serviceSettingsResult.data as Record<string, any> | null;
  const userRole = String(userRow.role || authUser.app_metadata?.role || 'user').trim().toLowerCase();
  const isPlatformRole = isPlatformOwnerRole(userRole);
  const isTenantOwner = Boolean(tenant?.owner_user_id && tenant.owner_user_id === authUser.id);

  if (!tenant) {
    throw new AgencyApiError('Agency tenant not found.', 404);
  }

  if (!membership && !isTenantOwner && !isPlatformRole) {
    throw new AgencyApiError('No access to this Agency workspace.', 403);
  }

  if (!isPlatformRole && !['active', 'trial'].includes(String(tenant.status || '').toLowerCase())) {
    throw new AgencyApiError('Agency workspace is not active.', 403);
  }

  const serviceStatus = readServiceStatus(serviceSettings?.config, options.serviceId || 'agency');
  if (!isPlatformRole && serviceStatus !== 'public') {
    throw new AgencyApiError('Agency service is not available.', 403);
  }

  const role = membership?.role;
  const operatorRoleAllowed = isAgencyOperatorRole(role) || isTenantOwner || isPlatformRole;
  const permissionAllowed = hasPermission(membership?.permissions, options.requiredPermission);
  const ownerAllowed = isAgencyOwnerRole(role) || isTenantOwner || isPlatformRole;
  if (options.requiredPermission) {
    if (!ownerAllowed && !permissionAllowed) {
      throw new AgencyApiError('Agency service access denied.', 403);
    }
  } else if (!operatorRoleAllowed && !permissionAllowed) {
    throw new AgencyApiError('Agency service access denied.', 403);
  }

  return {
    supabase,
    user: {
      id: authUser.id,
      email: userRow.email || authUser.email,
      role: userRole,
    },
    tenant,
    membership,
  };
}
