import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    calculateMarkup,
    DEFAULT_AGENCY_PLAN_LIMITS,
    isFiniteAgencyLimit,
    sanitizeAgencyPlanLimits,
    validateAgencyPlan,
    type AgencyPlan,
} from '../../types/agencyPlans';
import { isMissingCanonicalAgencyPlanTableError } from '../../services/agencyPlansService';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const basePlan = {
    id: 'plan_test',
    tenantId: 'agency_tenant_1',
    name: 'Growth',
    description: 'Growth service plan',
    color: '#3b82f6',
    price: 99,
    baseCost: 29,
    limits: { ...DEFAULT_AGENCY_PLAN_LIMITS },
    features: {
        websiteBuilder: true,
        visualEditor: true,
        templates: true,
        cmsEnabled: true,
        crmEnabled: true,
        ecommerceEnabled: true,
        emailMarketing: true,
        chatbotEnabled: true,
        customDomain: true,
        removeBranding: true,
        analyticsEnabled: true,
    },
    isActive: true,
    isDefault: false,
    isArchived: false,
    clientCount: 0,
    createdAt: { seconds: 0, nanoseconds: 0 },
    updatedAt: { seconds: 0, nanoseconds: 0 },
} satisfies AgencyPlan;

describe('Agency service plans', () => {
    it('rejects negative and non-finite commercial limits', () => {
        const result = validateAgencyPlan({
            ...basePlan,
            limits: {
                ...basePlan.limits,
                maxProjects: -1,
                maxAiCredits: Number.POSITIVE_INFINITY,
            },
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining([
            expect.stringContaining('maxProjects'),
            expect.stringContaining('maxAiCredits'),
        ]));
    });

    it('sanitizes plan limits to finite defaults without preserving unlimited sentinels', () => {
        const limits = sanitizeAgencyPlanLimits({
            maxProjects: -1,
            maxUsers: 0,
            maxAiCredits: Number.POSITIVE_INFINITY,
            maxProducts: 250,
        });

        expect(limits.maxProjects).toBe(DEFAULT_AGENCY_PLAN_LIMITS.maxProjects);
        expect(limits.maxUsers).toBe(1);
        expect(limits.maxAiCredits).toBe(DEFAULT_AGENCY_PLAN_LIMITS.maxAiCredits);
        expect(limits.maxProducts).toBe(250);
    });

    it('only treats finite non-negative values as valid agency limits', () => {
        expect(isFiniteAgencyLimit(0)).toBe(true);
        expect(isFiniteAgencyLimit(100)).toBe(true);
        expect(isFiniteAgencyLimit(-1)).toBe(false);
        expect(isFiniteAgencyLimit(Number.NaN)).toBe(false);
        expect(isFiniteAgencyLimit(Number.POSITIVE_INFINITY)).toBe(false);
    });

    it('calculates markup from the configured base cost instead of the default project cost', () => {
        expect(calculateMarkup(150, 50)).toEqual({
            markup: 100,
            markupPercentage: 200,
        });
    });

    it('rejects service plans priced below their configured base cost', () => {
        const result = validateAgencyPlan({
            ...basePlan,
            price: 80,
            baseCost: 99,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('El precio mínimo debe ser $99 (costo base del plan)');
    });

    it('does not treat canonical table permission failures as legacy-table fallback', () => {
        expect(isMissingCanonicalAgencyPlanTableError({
            code: 'PGRST205',
            message: "Could not find the table 'public.agency_service_plans' in the schema cache",
        })).toBe(true);

        expect(isMissingCanonicalAgencyPlanTableError({
            code: '42P01',
            message: 'relation "public.agency_service_plans" does not exist',
        })).toBe(true);

        expect(isMissingCanonicalAgencyPlanTableError({
            code: '42501',
            message: 'permission denied for table agency_service_plans',
        })).toBe(false);
    });

    it('keeps the plan editor wired to editable base cost and base-cost markup', () => {
        const editor = read('components/dashboard/agency/plans/AgencyPlanEditor.tsx');
        const manager = read('components/dashboard/agency/plans/AgencyPlanManager.tsx');
        const service = read('services/agencyPlansService.ts');
        const apiClient = read('services/agency/agencyPlanMutationApiClient.ts');

        expect(editor).toContain('currentBaseCost');
        expect(editor).toContain("updateField('baseCost'");
        expect(editor).toContain('calculateMarkup(formData.price || 0, currentBaseCost)');
        expect(editor).toContain('saveAgencyPlanThroughApi');
        expect(manager).toContain('archiveAgencyPlanThroughApi');
        expect(manager).toContain('restoreAgencyPlanThroughApi');
        expect(manager).toContain('deleteAgencyPlanThroughApi');
        expect(apiClient).toContain("'/api/agency/plans/save'");
        expect(apiClient).toContain("'/api/agency/plans/archive'");
        expect(apiClient).toContain("'/api/agency/plans/restore'");
        expect(apiClient).toContain("'/api/agency/plans/delete'");
        expect(service).toContain('base_cost: baseCost');
    });

    it('exposes protected Vercel routes for canonical Agency service-plan mutations', () => {
        const planRouteLib = read('api/agency/plans/_lib.ts');
        const saveRoute = read('api/agency/plans/save.ts');
        const archiveRoute = read('api/agency/plans/archive.ts');
        const restoreRoute = read('api/agency/plans/restore.ts');
        const deleteRoute = read('api/agency/plans/delete.ts');

        expect(planRouteLib).toContain('requireAgencyPlanAccess');
        expect(planRouteLib).toContain("moduleId: 'agency-service-plans'");
        expect(planRouteLib).toContain("requiredPermission: 'canManageBilling'");
        expect(planRouteLib).toContain("from(AGENCY_SERVICE_PLANS_TABLE)");
        expect(planRouteLib).toContain("from(AGENCY_CLIENTS_TABLE)");
        expect(planRouteLib).toContain('price must be greater than or equal to baseCost');
        expect(saveRoute).toContain('saveAgencyServicePlan');
        expect(archiveRoute).toContain('archiveAgencyServicePlan');
        expect(restoreRoute).toContain('restoreAgencyServicePlan');
        expect(deleteRoute).toContain('deleteAgencyServicePlan');
    });
});
