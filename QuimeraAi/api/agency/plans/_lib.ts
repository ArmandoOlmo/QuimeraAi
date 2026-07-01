import type { IncomingMessage } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAgencyServiceAccess } from '../_lib/agencyAccess.js';
import { AgencyApiError, normalizeString, requireString } from '../_lib/stripeEdgeProxy.js';

const AGENCY_SERVICE_PLANS_TABLE = 'agency_service_plans';
const AGENCY_CLIENTS_TABLE = 'agency_clients';
const PLAN_ID_PREFIX = 'plan_';

const DEFAULT_LIMITS = {
  maxProjects: 1,
  maxUsers: 3,
  maxStorageGB: 5,
  maxAiCredits: 500,
  maxProducts: 50,
  maxLeads: 500,
  maxEmailsPerMonth: 1000,
};

const DEFAULT_FEATURES = {
  websiteBuilder: true,
  visualEditor: true,
  templates: true,
  cmsEnabled: true,
  crmEnabled: false,
  ecommerceEnabled: false,
  emailMarketing: false,
  chatbotEnabled: true,
  customDomain: false,
  removeBranding: false,
  analyticsEnabled: true,
};

type AgencyPlanInput = Record<string, any>;

export function generateAgencyPlanId(): string {
  const random = Math.random().toString(36).slice(2, 14).padEnd(12, '0');
  return `${PLAN_ID_PREFIX}${random.slice(0, 12)}`;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function sanitizeLimits(raw: unknown) {
  const source = asRecord(raw);
  const next: Record<string, number> = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(DEFAULT_LIMITS)) {
    if (source[key] === undefined) continue;
    next[key] = finiteNumber(source[key], next[key]);
  }
  next.maxProjects = Math.max(1, next.maxProjects);
  next.maxUsers = Math.max(1, next.maxUsers);
  return next;
}

function sanitizeFeatures(raw: unknown) {
  const source = asRecord(raw);
  const next: Record<string, boolean> = { ...DEFAULT_FEATURES };
  for (const key of Object.keys(DEFAULT_FEATURES)) {
    if (source[key] !== undefined) next[key] = source[key] === true;
  }
  return next;
}

function ensureValidCommercialShape(input: {
  name: string;
  price: number;
  baseCost: number;
  limits: Record<string, number>;
}) {
  const errors: string[] = [];
  if (!input.name) errors.push('name is required.');
  if (input.name.length > 80) errors.push('name must be 80 characters or less.');
  if (!Number.isFinite(input.price) || input.price < 0) errors.push('price must be a finite non-negative number.');
  if (!Number.isFinite(input.baseCost) || input.baseCost < 0) errors.push('baseCost must be a finite non-negative number.');
  if (input.price < input.baseCost) errors.push(`price must be greater than or equal to baseCost (${input.baseCost}).`);
  Object.entries(input.limits).forEach(([key, value]) => {
    if (!Number.isFinite(value) || value < 0) errors.push(`${key} must be finite and non-negative.`);
  });
  if (input.limits.maxProjects < 1) errors.push('maxProjects must be at least 1.');
  if (input.limits.maxUsers < 1) errors.push('maxUsers must be at least 1.');
  if (errors.length) throw new AgencyApiError(errors.join(' '), 400);
}

export async function requireAgencyPlanAccess(req: IncomingMessage, agencyTenantId: string, action: string) {
  return requireAgencyServiceAccess(req, {
    tenantId: agencyTenantId,
    moduleId: 'agency-service-plans',
    serviceId: 'agency',
    featureKey: 'agencyModule',
    requiredPermission: 'canManageBilling',
    action,
  });
}

export function readPlanInput(body: Record<string, unknown>): AgencyPlanInput {
  return asRecord(body.plan || body);
}

export function agencyTenantIdFromPlanInput(body: Record<string, unknown>, input: AgencyPlanInput): string {
  return requireString(input.tenantId || input.tenant_id || body.agencyTenantId, 'agencyTenantId', 120);
}

export async function fetchAgencyServicePlan(
  supabase: SupabaseClient,
  agencyTenantId: string,
  planId: string,
): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from(AGENCY_SERVICE_PLANS_TABLE)
    .select('id,tenant_id,name,client_count,is_default,is_archived')
    .eq('id', planId)
    .eq('tenant_id', agencyTenantId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AgencyApiError('Agency service plan not found.', 404);
  return data as Record<string, any>;
}

export async function countAgencyPlanClients(
  supabase: SupabaseClient,
  agencyTenantId: string,
  planId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(AGENCY_CLIENTS_TABLE)
    .select('client_tenant_id', { count: 'exact', head: true })
    .eq('agency_tenant_id', agencyTenantId)
    .eq('agency_plan_id', planId);

  if (error) throw error;
  return count ?? 0;
}

export async function saveAgencyServicePlan(
  supabase: SupabaseClient,
  agencyTenantId: string,
  input: AgencyPlanInput,
  userId: string,
) {
  const now = new Date().toISOString();
  const planId = normalizeString(input.id, 120) || generateAgencyPlanId();
  const { data: existing, error: existingError } = await supabase
    .from(AGENCY_SERVICE_PLANS_TABLE)
    .select('id,tenant_id,client_count,created_at,created_by')
    .eq('id', planId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing && String((existing as any).tenant_id) !== agencyTenantId) {
    throw new AgencyApiError('Agency service plan belongs to another tenant.', 403);
  }

  const name = requireString(input.name, 'name', 80);
  const baseCost = finiteNumber(input.baseCost ?? input.base_cost, 29);
  const price = finiteNumber(input.price, 0);
  const limits = sanitizeLimits(input.limits);
  const features = sanitizeFeatures(input.features);
  ensureValidCommercialShape({ name, price, baseCost, limits });

  if (input.isDefault === true || input.is_default === true) {
    const { error: defaultsError } = await supabase
      .from(AGENCY_SERVICE_PLANS_TABLE)
      .update({ is_default: false, updated_at: now, updated_by: userId })
      .eq('tenant_id', agencyTenantId)
      .eq('is_default', true)
      .neq('id', planId);
    if (defaultsError) throw defaultsError;
  }

  const row = {
    id: planId,
    tenant_id: agencyTenantId,
    name,
    description: normalizeString(input.description, 1000) || '',
    color: normalizeString(input.color, 40) || '#3b82f6',
    price,
    base_cost: baseCost,
    limits,
    features,
    is_active: input.isActive ?? input.is_active ?? true,
    is_default: input.isDefault ?? input.is_default ?? false,
    is_archived: input.isArchived ?? input.is_archived ?? false,
    client_count: Number((existing as any)?.client_count ?? input.clientCount ?? input.client_count ?? 0),
    created_by: (existing as any)?.created_by || userId,
    updated_by: userId,
    created_at: (existing as any)?.created_at || now,
    updated_at: now,
    archived_at: input.archivedAt ?? input.archived_at ?? null,
  };

  const { error: upsertError } = await supabase
    .from(AGENCY_SERVICE_PLANS_TABLE)
    .upsert(row, { onConflict: 'id' });
  if (upsertError) throw upsertError;

  return { success: true, planId, plan: row };
}

export async function archiveAgencyServicePlan(
  supabase: SupabaseClient,
  agencyTenantId: string,
  planId: string,
  userId: string,
) {
  const plan = await fetchAgencyServicePlan(supabase, agencyTenantId, planId);
  const clientCount = await countAgencyPlanClients(supabase, agencyTenantId, planId);
  if (clientCount > 0 || Number(plan.client_count || 0) > 0) {
    throw new AgencyApiError(`This plan has ${Math.max(clientCount, Number(plan.client_count || 0))} active client(s). Reassign clients before archiving.`, 409);
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from(AGENCY_SERVICE_PLANS_TABLE)
    .update({
      is_archived: true,
      is_active: false,
      is_default: false,
      archived_at: now,
      updated_at: now,
      updated_by: userId,
      client_count: clientCount,
    })
    .eq('id', planId)
    .eq('tenant_id', agencyTenantId);

  if (error) throw error;
  return { success: true, planId };
}

export async function restoreAgencyServicePlan(
  supabase: SupabaseClient,
  agencyTenantId: string,
  planId: string,
  userId: string,
) {
  await fetchAgencyServicePlan(supabase, agencyTenantId, planId);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from(AGENCY_SERVICE_PLANS_TABLE)
    .update({
      is_archived: false,
      is_active: true,
      archived_at: null,
      updated_at: now,
      updated_by: userId,
    })
    .eq('id', planId)
    .eq('tenant_id', agencyTenantId);

  if (error) throw error;
  return { success: true, planId };
}

export async function deleteAgencyServicePlan(
  supabase: SupabaseClient,
  agencyTenantId: string,
  planId: string,
) {
  const plan = await fetchAgencyServicePlan(supabase, agencyTenantId, planId);
  const clientCount = await countAgencyPlanClients(supabase, agencyTenantId, planId);
  if (clientCount > 0 || Number(plan.client_count || 0) > 0) {
    throw new AgencyApiError(`This plan has ${Math.max(clientCount, Number(plan.client_count || 0))} active client(s). Reassign clients before deleting.`, 409);
  }

  const { error } = await supabase
    .from(AGENCY_SERVICE_PLANS_TABLE)
    .delete()
    .eq('id', planId)
    .eq('tenant_id', agencyTenantId);

  if (error) throw error;
  return { success: true, planId };
}
