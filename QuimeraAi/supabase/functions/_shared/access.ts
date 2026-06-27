import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";
import {
  resolveServiceAccess,
  type ServiceAccessDecision,
  type ServiceAccessInput,
} from "../../../services/access/serviceAccessEngine.ts";
import type { AiCreditOperation } from "../../../types/subscription.ts";
import type { PlatformServiceId } from "../../../types/serviceAvailability.ts";

type SupabaseClient = ReturnType<typeof createClient>;

export interface EdgeAccessOptions {
  tenantId?: string | null;
  projectId?: string | null;
  moduleId?: string;
  serviceId?: PlatformServiceId;
  featureKey?: ServiceAccessInput["featureKey"];
  action?: string;
  requiredPermission?: string;
  aiOperation?: AiCreditOperation;
  customCredits?: number;
  requestedUsage?: ServiceAccessInput["requestedUsage"];
}

export interface EdgeAccessContext {
  supabase: SupabaseClient;
  user: { id: string; email?: string | null; role?: string | null };
  tenant: Record<string, unknown> | null;
  membership: Record<string, unknown> | null;
  decision: ServiceAccessDecision;
}

export class EdgeAccessError extends Error {
  status: number;
  decision: ServiceAccessDecision;

  constructor(decision: ServiceAccessDecision, status = 403) {
    super(decision.message);
    this.name = "EdgeAccessError";
    this.status = status;
    this.decision = decision;
  }
}

export function edgeAccessErrorResponse(error: unknown): Response {
  if (error instanceof EdgeAccessError) {
    return new Response(JSON.stringify({ error: error.message, decision: error.decision }), {
      status: error.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Access validation failed" }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function fromTable(supabase: SupabaseClient, table: string) {
  return supabase.from(table as never) as any;
}

async function getJwtUser(req: Request, supabase: SupabaseClient) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new EdgeAccessError({
      allowed: false,
      reasonCode: "not_authenticated",
      message: "Missing Authorization header",
    }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) {
    throw new EdgeAccessError({
      allowed: false,
      reasonCode: "not_authenticated",
      message: "Invalid token",
    }, 401);
  }
  return data.user;
}

async function resolveProjectContext(supabase: SupabaseClient, projectId?: string | null): Promise<Record<string, unknown> | null> {
  if (!projectId) return null;
  const { data } = await fromTable(supabase, "projects")
    .select("tenant_id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  return data || null;
}

async function auditAccessDecision(
  supabase: SupabaseClient,
  input: ServiceAccessInput,
  decision: ServiceAccessDecision,
) {
  if (decision.allowed && !decision.adminOverride) return;
  try {
    await fromTable(supabase, "service_access_audit_logs").insert({
      tenant_id: input.tenantId || null,
      user_id: input.userId || null,
      user_role: input.userRole || null,
      module_id: input.moduleId || null,
      service_id: input.serviceId || null,
      feature_key: input.featureKey ? String(input.featureKey) : null,
      action: input.action || null,
      reason_code: decision.reasonCode,
      allowed: decision.allowed,
      admin_override: decision.adminOverride || false,
      decision,
    });
  } catch (error) {
    console.warn("[access] could not write access audit log", error);
  }
}

export async function requireServiceAccess(req: Request, options: EdgeAccessOptions): Promise<EdgeAccessContext> {
  const supabase = getAdminClient();
  const authUser = await getJwtUser(req, supabase);

  const [{ data: userRow }, projectContext] = await Promise.all([
    fromTable(supabase, "users").select("role, email").eq("id", authUser.id).maybeSingle(),
    resolveProjectContext(supabase, options.projectId),
  ]);

  const tenantId = options.tenantId || String(projectContext?.tenant_id || "");
  const userRole = String(userRow?.role || authUser.app_metadata?.role || "user").trim().toLowerCase();

  const [{ data: tenant }, { data: membership }, { data: subscription }, { data: serviceSettings }] = await Promise.all([
    tenantId
      ? fromTable(supabase, "tenants").select("id, type, status, subscription_plan, limits, usage, billing, owner_user_id").eq("id", tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
    tenantId
      ? fromTable(supabase, "tenant_members").select("role, permissions").eq("tenant_id", tenantId).eq("user_id", authUser.id).maybeSingle()
      : Promise.resolve({ data: null }),
    tenantId
      ? fromTable(supabase, "subscriptions").select("plan_id, status, ai_credits_usage").eq("tenant_id", tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
    fromTable(supabase, "settings").select("config").eq("id", "serviceAvailability").maybeSingle(),
  ]);

  const isPlatformRole = userRole === "owner" || userRole === "superadmin";
  const isTenantOwner = Boolean(tenant?.owner_user_id && tenant.owner_user_id === authUser.id);
  const isProjectOwner = Boolean(projectContext?.user_id && projectContext.user_id === authUser.id);

  if (tenantId && !membership && !isTenantOwner && !isProjectOwner && !isPlatformRole) {
    const decision: ServiceAccessDecision = {
      allowed: false,
      reasonCode: "permission_missing",
      message: "No tienes acceso a este workspace",
      requiredService: options.serviceId,
      requiredFeature: options.featureKey ? String(options.featureKey) : undefined,
    };
    await auditAccessDecision(supabase, {
      userId: authUser.id,
      userRole,
      tenantId,
      projectId: options.projectId || undefined,
      serviceId: options.serviceId,
      moduleId: options.moduleId,
      featureKey: options.featureKey,
      action: options.action,
    }, decision);
    throw new EdgeAccessError(decision, 403);
  }

  const input: ServiceAccessInput = {
    userId: authUser.id,
    userRole,
    tenantId: tenantId || undefined,
    tenantStatus: tenant?.status,
    projectId: options.projectId || undefined,
    planId: subscription?.plan_id || tenant?.subscription_plan || "free",
    subscriptionStatus: subscription?.status || tenant?.status || "active",
    serviceId: options.serviceId,
    serviceAvailability: serviceSettings?.config?.services,
    moduleId: options.moduleId,
    featureKey: options.featureKey,
    action: options.action,
    requiredPermission: options.requiredPermission,
    permissions: membership?.permissions || undefined,
    planLimits: tenant?.limits || undefined,
    currentUsage: tenant?.usage || undefined,
    requestedUsage: options.requestedUsage,
    aiOperation: options.aiOperation,
    customCredits: options.customCredits,
    aiCreditsUsage: subscription?.ai_credits_usage ? {
      creditsIncluded: subscription.ai_credits_usage.creditsIncluded,
      creditsUsed: subscription.ai_credits_usage.creditsUsed,
      creditsRemaining: subscription.ai_credits_usage.creditsRemaining,
    } : undefined,
  };

  const decision = resolveServiceAccess(input);
  await auditAccessDecision(supabase, input, decision);

  if (!decision.allowed) {
    throw new EdgeAccessError(decision, decision.reasonCode === "credits_exceeded" ? 402 : 403);
  }

  return {
    supabase,
    user: { id: authUser.id, email: userRow?.email || authUser.email, role: userRole },
    tenant: tenant || null,
    membership: membership || null,
    decision,
  };
}
