import { describe, expect, it } from 'vitest';
import {
    DEFAULT_AGENCY_PLAN_LIMITS,
    isFiniteAgencyLimit,
    sanitizeAgencyPlanLimits,
    validateAgencyPlan,
    type AgencyPlan,
} from '../../types/agencyPlans';
import { isMissingCanonicalAgencyPlanTableError } from '../../services/agencyPlansService';

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
});
