import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

export type PortalApprovalStatus = 'pending' | 'approved' | 'rejected' | 'change_requested' | 'cancelled' | 'expired';
export type PortalApprovalDecision = 'approved' | 'rejected' | 'change_requested';

export interface PortalApproval {
    id: string;
    agencyTenantId: string;
    clientTenantId: string;
    projectId?: string | null;
    relatedEntityType: string;
    relatedEntityId?: string | null;
    approvalType: string;
    status: PortalApprovalStatus;
    title: string;
    description?: string | null;
    requestedBy?: string | null;
    requestedAt: string;
    dueAt?: string | null;
    respondedBy?: string | null;
    respondedAt?: string | null;
    responseNote?: string | null;
    metadata: Record<string, unknown>;
}

function mapApproval(row: any): PortalApproval {
    let metadata: Record<string, unknown> = {};
    if (row.metadata && typeof row.metadata === 'object') {
        metadata = row.metadata;
    } else if (typeof row.metadata === 'string') {
        try {
            metadata = JSON.parse(row.metadata || '{}');
        } catch {
            metadata = {};
        }
    }

    return {
        id: row.id,
        agencyTenantId: row.agency_tenant_id,
        clientTenantId: row.client_tenant_id,
        projectId: row.project_id,
        relatedEntityType: row.related_entity_type || 'project',
        relatedEntityId: row.related_entity_id,
        approvalType: row.approval_type || 'project_review',
        status: row.status || 'pending',
        title: row.title || 'Approval request',
        description: row.description,
        requestedBy: row.requested_by,
        requestedAt: row.requested_at || row.created_at,
        dueAt: row.due_at,
        respondedBy: row.responded_by,
        respondedAt: row.responded_at,
        responseNote: row.response_note,
        metadata,
    };
}

export function usePortalApprovals(clientTenantId?: string | null) {
    const [approvals, setApprovals] = useState<PortalApproval[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isResponding, setIsResponding] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchApprovals = useCallback(async () => {
        if (!clientTenantId) {
            setApprovals([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('agency_client_approvals')
                .select('*')
                .eq('client_tenant_id', clientTenantId)
                .order('requested_at', { ascending: false })
                .limit(25);

            if (fetchError) throw fetchError;
            setApprovals((data || []).map(mapApproval));
        } catch (err: any) {
            setError(err?.message || 'Could not load approvals');
            setApprovals([]);
        } finally {
            setIsLoading(false);
        }
    }, [clientTenantId]);

    useEffect(() => {
        fetchApprovals();
    }, [fetchApprovals]);

    const respondApproval = useCallback(async (
        approvalId: string,
        decision: PortalApprovalDecision,
        responseNote?: string,
    ) => {
        setIsResponding(approvalId);
        setError(null);

        try {
            const { data, error: responseError } = await supabase.functions.invoke('onboarding-api', {
                body: {
                    action: 'respondClientApproval',
                    approvalId,
                    decision,
                    responseNote,
                },
            });

            if (responseError) throw responseError;
            if (data?.error) throw new Error(data.error);
            await fetchApprovals();
            return data;
        } catch (err: any) {
            setError(err?.message || 'Could not respond to approval');
            throw err;
        } finally {
            setIsResponding(null);
        }
    }, [fetchApprovals]);

    const pendingApprovals = useMemo(
        () => approvals.filter(approval => approval.status === 'pending'),
        [approvals],
    );

    return {
        approvals,
        pendingApprovals,
        isLoading,
        isResponding,
        error,
        fetchApprovals,
        respondApproval,
    };
}
