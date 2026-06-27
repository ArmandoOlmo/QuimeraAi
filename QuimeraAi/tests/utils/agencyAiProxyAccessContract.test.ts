import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency AI proxy canonical access contract', () => {
    const aiProxy = read('supabase/functions/ai-proxy/index.ts');

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
});
