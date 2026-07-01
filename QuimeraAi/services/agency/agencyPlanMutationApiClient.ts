import { supabase } from '../../supabase';
import type { AgencyPlan } from '../../types/agencyPlans';

async function postAgencyPlanApi<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Tu sesion expiro. Inicia sesion de nuevo.');

    const response = await fetch(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    const text = await response.text();
    let body: unknown = {};
    if (text) {
        try {
            body = JSON.parse(text);
        } catch {
            body = { error: text };
        }
    }
    if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body
            ? String((body as { error?: unknown }).error || '')
            : '';
        throw new Error(message || `Agency service plan API failed with ${response.status}`);
    }
    return body as T;
}

export function saveAgencyPlanThroughApi(plan: Partial<AgencyPlan>) {
    return postAgencyPlanApi<{ success: boolean; planId?: string; error?: string }>('/api/agency/plans/save', {
        agencyTenantId: plan.tenantId,
        plan,
    });
}

export function archiveAgencyPlanThroughApi(agencyTenantId: string, planId: string) {
    return postAgencyPlanApi<{ success: boolean; error?: string }>('/api/agency/plans/archive', {
        agencyTenantId,
        planId,
    });
}

export function restoreAgencyPlanThroughApi(agencyTenantId: string, planId: string) {
    return postAgencyPlanApi<{ success: boolean; error?: string }>('/api/agency/plans/restore', {
        agencyTenantId,
        planId,
    });
}

export function deleteAgencyPlanThroughApi(agencyTenantId: string, planId: string) {
    return postAgencyPlanApi<{ success: boolean; error?: string }>('/api/agency/plans/delete', {
        agencyTenantId,
        planId,
    });
}
