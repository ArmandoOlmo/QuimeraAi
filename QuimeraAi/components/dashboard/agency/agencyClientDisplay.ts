import type { Tenant } from '../../../types/multiTenant';

const TENANT_TYPE_AS_PLAN_IDS = new Set(['agency_client']);

function readText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text.length > 0 ? text : null;
}

function humanizePlanId(value: string): string {
    return value
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, char => char.toUpperCase());
}

export function resolveAgencyClientServicePlanLabel(
    client: Pick<Tenant, 'subscriptionPlan' | 'billing'> & {
        agencyPlanName?: string | null;
        agencyPlanId?: string | null;
    },
    fallback = 'No service plan',
): string {
    const billing = (client.billing || {}) as Record<string, unknown>;
    const servicePlanName = readText(client.agencyPlanName)
        || readText(billing.agencyPlanName)
        || readText(billing.agency_plan_name);

    if (servicePlanName) return servicePlanName;

    const servicePlanId = readText(client.agencyPlanId)
        || readText(billing.agencyPlanId)
        || readText(billing.agency_plan_id);

    if (servicePlanId) return humanizePlanId(servicePlanId);

    const effectivePlanId = readText(billing.effectivePlanId)
        || readText(billing.effective_plan_id)
        || readText(client.subscriptionPlan);

    if (effectivePlanId && !TENANT_TYPE_AS_PLAN_IDS.has(effectivePlanId)) {
        return humanizePlanId(effectivePlanId);
    }

    return fallback;
}
