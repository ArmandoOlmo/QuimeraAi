import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency AI proxy canonical access contract', () => {
    const aiProxy = read('supabase/functions/ai-proxy/index.ts');
    const aiGateway = read('api/_lib/aiGateway.ts');
    const aiCreditsService = read('services/aiCreditsService.ts');
    const edgeAccess = read('supabase/functions/_shared/access.ts');
    const authContext = read('contexts/core/AuthContext.tsx');
    const aiContext = read('contexts/ai/AIContext.tsx');
    const useCreditsUsage = read('hooks/useCreditsUsage.ts');
    const useAiCredits = read('hooks/useAiCredits.ts');

    it('validates shared AI credit pools through canonical agency_clients relationships', () => {
        expect(aiProxy).toContain('async function isAgencyClientRelationshipLinked');
        expect(aiProxy).toContain(".from('agency_clients')");
        expect(aiProxy).toContain(".select('agency_tenant_id')");
        expect(aiProxy).toContain(".eq('agency_tenant_id', agencyTenantId)");
        expect(aiProxy).toContain(".eq('client_tenant_id', clientTenantId)");
        expect(aiProxy).toContain('const ownerLinked = authorizedTenant?.owner_tenant_id === tenantId');
        expect(aiProxy).toContain('await isAgencyClientRelationshipLinked(admin, tenantId, authorizedTenantId)');
        expect(aiProxy).toContain("return jsonResponse({ error: 'Invalid shared credits pool tenant' }, { status: 403 })");
    });

    it('resolves Agency Engine credit pools from agency_clients when owner_tenant_id is absent', () => {
        expect(aiProxy).toContain('async function resolveAgencyRelationshipPoolTenant');
        expect(aiProxy).toContain('const relationshipPool = await resolveAgencyRelationshipPoolTenant(admin, tenantId)');
        expect(aiProxy).toContain(".eq('client_tenant_id', clientTenantId)");
        expect(aiProxy).toContain('const agencyTenantId = cleanUuid(relationship?.agency_tenant_id)');
        expect(aiProxy).toContain("SHARED_POOL_PLAN_IDS.has(cleanString(parentTenant.subscription_plan))");
        expect(aiProxy).toContain('poolTenantId: agencyTenantId');
        expect(aiProxy).toContain('isSharedPool: true');
    });

    it('preserves Owner and Super Admin unlimited credits across the MCP AI gateway', () => {
        expect(aiGateway).toContain('async function isPlatformUnlimitedActor');
        expect(aiGateway).toContain(".from('users')");
        expect(aiGateway).toContain(".select('role, email')");
        expect(aiGateway).toContain('isConfiguredOwnerEmail(data?.email)');
        expect(aiGateway).toContain("return normalized === 'owner' || normalized === 'superadmin'");
        expect(aiGateway).toContain('if (adminOverride) return;');
        expect(aiGateway).toContain('const chargedCredits = adminOverride ? 0 : creditsUsed');
        expect(aiGateway).toContain('credits_used: chargedCredits');
        expect(aiGateway).toContain('admin_override: adminOverride');
        expect(aiGateway).toContain('creditsUsed: adminOverride ? 0 : creditsUsed');
    });

    it('passes platform role through client AI credit prechecks and legacy consumers', () => {
        expect(authContext).toContain("role: effectiveRole as any");
        expect(edgeAccess).toContain('function resolveEdgeUserRole');
        expect(edgeAccess).toContain('authUser?.app_metadata?.isOwner === true');
        expect(edgeAccess).toContain('Deno.env.get("OWNER_EMAIL")');
        expect(edgeAccess).toContain('Deno.env.get("VITE_OWNER_EMAIL")');
        expect(edgeAccess).toContain('const userRole = resolveEdgeUserRole');
        expect(aiProxy).toContain('creditsRemaining: null');
        expect(aiProxy).toContain('adminOverride: true');
        expect(aiCreditsService).toContain('isPlatformUnlimitedUser(userRole)');
        expect(aiCreditsService).toContain('Créditos omitidos por rol interno de plataforma');
        expect(aiCreditsService).toContain('data?.adminOverride === true');
        expect(aiCreditsService).toContain('customCredits?: number,');
        expect(aiCreditsService).toContain('userRole?: string | null');
        expect(aiCreditsService).toContain('return checkCreditsAvailable(tenantId, creditsRequired, userRole)');
        expect(aiCreditsService).toContain('userRole?: string;');
        expect(aiContext).toContain('const { user, currentTenant, userDocument, isUserOwner } = useAuth()');
        expect(aiContext).toContain("const userRole = isUserOwner ? 'owner' : userDocument?.role");
        expect(aiContext).toContain('canPerformOperation(tenantId, creditOperation, videoCredits, userRole)');
        expect(aiContext).toContain('userRole,');
        expect(useCreditsUsage).toContain("const userRole = isUserOwner ? 'owner' : userDocument?.role");
        expect(useCreditsUsage).toContain('resolvePlanIdForPlatformRole(subscriptionPlanKey, userRole)');
        expect(useCreditsUsage).toContain("resolvePlanIdForPlatformRole(currentTenant?.subscriptionPlan || 'free', userRole)");
        expect(useCreditsUsage).toContain('getPlatformUnlimitedPlan(userRole)');
        expect(useCreditsUsage).toContain("plan: plan.name");
        expect(useCreditsUsage).toContain("planId: planKey");
        expect(useCreditsUsage).toContain("isUnlimited: isUnlimitedCreditsUser");
        expect(useAiCredits).toContain('const { userDocument, loadingAuth, isUserOwner } = useAuth();');
        expect(useAiCredits).toContain("const userRole = isUserOwner ? 'owner' : userDocument?.role");
        expect(useAiCredits).toContain('getPlatformUnlimitedPlan(userRole) || planData');
        expect(useAiCredits).toContain('const creditsRemaining = isOwner ? Number.POSITIVE_INFINITY : usage?.creditsRemaining ?? 0');
        expect(useAiCredits).toContain('return canPerformOperation(tenantId, operation, undefined, userRole)');
        expect(useAiCredits).toContain('userRole: restOptions.userRole || userRole');
        expect(useAiCredits).toContain('userRole: pendingOptions?.userRole || userRole');
        expect(useAiCredits).toContain("label: '∞'");
    });
});
