import { describe, expect, it } from 'vitest';

import { resolveAgencyClientServicePlanLabel } from '../../components/dashboard/agency/agencyClientDisplay';
import type { Tenant } from '../../types/multiTenant';

function client(partial: Partial<Tenant> & { agencyPlanName?: string | null; agencyPlanId?: string | null }) {
    return {
        subscriptionPlan: 'individual',
        billing: {},
        ...partial,
    } as Tenant & { agencyPlanName?: string | null; agencyPlanId?: string | null };
}

describe('agency client display helpers', () => {
    it('prioritizes the agency service plan name over platform subscription fields', () => {
        expect(resolveAgencyClientServicePlanLabel(client({
            subscriptionPlan: 'agency_pro',
            billing: {
                agencyPlanName: 'Growth Ops',
                effectivePlanId: 'individual',
            },
        }))).toBe('Growth Ops');
    });

    it('uses the assigned agency service plan id when the plan name is missing', () => {
        expect(resolveAgencyClientServicePlanLabel(client({
            subscriptionPlan: 'individual',
            billing: {
                agencyPlanId: 'plan_growth',
            },
        }))).toBe('Plan Growth');
    });

    it('does not display agency_client as a subscription plan label', () => {
        expect(resolveAgencyClientServicePlanLabel(client({
            subscriptionPlan: 'agency_client' as unknown as Tenant['subscriptionPlan'],
            billing: {},
        }), 'Sin plan')).toBe('Sin plan');
    });

    it('falls back to a valid effective platform plan when no agency service plan is assigned', () => {
        expect(resolveAgencyClientServicePlanLabel(client({
            subscriptionPlan: 'agency_client' as unknown as Tenant['subscriptionPlan'],
            billing: {
                effectivePlanId: 'individual',
            },
        }))).toBe('Individual');
    });
});
