import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import {
    listClientPortalApprovals,
    respondClientPortalApproval,
    type PortalApproval,
    type PortalApprovalDecision,
    type PortalApprovalStatus,
} from '../services/agency/agencyApprovalService';

export type { PortalApproval, PortalApprovalDecision, PortalApprovalStatus };

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
            setApprovals(await listClientPortalApprovals(supabase, clientTenantId, { limit: 25 }));
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
            const data = await respondClientPortalApproval(supabase, approvalId, decision, responseNote);
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
