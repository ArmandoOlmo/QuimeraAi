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

export const AGENCY_APPROVAL_SELECT = [
    'id',
    'agency_tenant_id',
    'client_tenant_id',
    'project_id',
    'related_entity_type',
    'related_entity_id',
    'approval_type',
    'status',
    'title',
    'description',
    'requested_by',
    'requested_at',
    'due_at',
    'responded_by',
    'responded_at',
    'response_note',
    'metadata',
    'created_at',
].join(',');

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseAgencyApprovalMetadata(value: unknown): Record<string, unknown> {
    if (isRecord(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return {};

    try {
        const parsed = JSON.parse(value);
        return isRecord(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export function normalizePortalApprovalDecision(value: unknown): PortalApprovalDecision {
    if (value === 'approved' || value === 'rejected' || value === 'change_requested') return value;
    throw new Error('Unsupported approval decision');
}

export function mapAgencyApprovalRow(row: any): PortalApproval {
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
        metadata: parseAgencyApprovalMetadata(row.metadata),
    };
}

export function buildClientApprovalResponsePayload(
    approvalId: string,
    decision: PortalApprovalDecision,
    responseNote?: string,
) {
    const normalizedApprovalId = String(approvalId || '').trim();
    if (!normalizedApprovalId) throw new Error('approvalId is required');

    return {
        action: 'respondClientApproval',
        approvalId: normalizedApprovalId,
        decision: normalizePortalApprovalDecision(decision),
        responseNote: String(responseNote || '').trim(),
    };
}

export async function listClientPortalApprovals(
    client: any,
    clientTenantId?: string | null,
    options: { limit?: number } = {},
): Promise<PortalApproval[]> {
    if (!clientTenantId) return [];

    const limit = Math.max(1, Math.min(Number(options.limit || 25), 100));
    const { data, error } = await client
        .from('agency_client_approvals')
        .select(AGENCY_APPROVAL_SELECT)
        .eq('client_tenant_id', clientTenantId)
        .order('requested_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data || []).map(mapAgencyApprovalRow);
}

export async function respondClientPortalApproval(
    client: any,
    approvalId: string,
    decision: PortalApprovalDecision,
    responseNote?: string,
) {
    const payload = buildClientApprovalResponsePayload(approvalId, decision, responseNote);
    const sessionResult = typeof client.auth?.getSession === 'function'
        ? await client.auth.getSession()
        : null;
    const accessToken = sessionResult?.data?.session?.access_token;

    if (accessToken && typeof fetch === 'function') {
        const response = await fetch('/api/agency/approvals/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                approvalId: payload.approvalId,
                decision: payload.decision,
                responseNote: payload.responseNote,
            }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to respond to approval');
        return data;
    }

    const { data, error } = await client.functions.invoke('onboarding-api', {
        body: payload,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
}
