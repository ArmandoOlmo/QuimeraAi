import { describe, expect, it, vi } from 'vitest';
import {
    AGENCY_APPROVAL_SELECT,
    buildClientApprovalResponsePayload,
    listClientPortalApprovals,
    mapAgencyApprovalRow,
    normalizePortalApprovalDecision,
    parseAgencyApprovalMetadata,
    respondClientPortalApproval,
} from '../../services/agency/agencyApprovalService';

function createListClient(rows: any[], error: any = null) {
    const calls: Record<string, unknown> = {};
    const query = {
        select(fields: string) {
            calls.select = fields;
            return query;
        },
        eq(column: string, value: unknown) {
            calls.eq = [column, value];
            return query;
        },
        order(column: string, options: unknown) {
            calls.order = [column, options];
            return query;
        },
        limit(value: number) {
            calls.limit = value;
            return Promise.resolve({ data: rows, error });
        },
    };

    return {
        calls,
        client: {
            from(table: string) {
                calls.table = table;
                return query;
            },
        },
    };
}

describe('agencyApprovalService', () => {
    it('maps approval rows with safe defaults and parsed metadata', () => {
        expect(parseAgencyApprovalMetadata('{bad json')).toEqual({});
        expect(parseAgencyApprovalMetadata({ source: 'portal' })).toEqual({ source: 'portal' });

        const approval = mapAgencyApprovalRow({
            id: 'approval-1',
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            status: null,
            title: null,
            metadata: '{"module":"website"}',
            created_at: '2026-07-01T00:00:00.000Z',
        });

        expect(approval).toMatchObject({
            id: 'approval-1',
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-1',
            relatedEntityType: 'project',
            approvalType: 'project_review',
            status: 'pending',
            title: 'Approval request',
            requestedAt: '2026-07-01T00:00:00.000Z',
            metadata: { module: 'website' },
        });
    });

    it('validates approval response payloads before invoking onboarding-api', () => {
        expect(buildClientApprovalResponsePayload(' approval-1 ', 'change_requested', '  Needs edits  ')).toEqual({
            action: 'respondClientApproval',
            approvalId: 'approval-1',
            decision: 'change_requested',
            responseNote: 'Needs edits',
        });

        expect(() => buildClientApprovalResponsePayload('', 'approved')).toThrow('approvalId is required');
        expect(() => normalizePortalApprovalDecision('pending')).toThrow('Unsupported approval decision');
    });

    it('lists client portal approvals through an explicit client-safe select', async () => {
        const { client, calls } = createListClient([{
            id: 'approval-1',
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            title: 'Launch approval',
            status: 'pending',
            metadata: {},
        }]);

        const approvals = await listClientPortalApprovals(client, 'client-1', { limit: 500 });

        expect(approvals).toHaveLength(1);
        expect(approvals[0].title).toBe('Launch approval');
        expect(calls).toMatchObject({
            table: 'agency_client_approvals',
            select: AGENCY_APPROVAL_SELECT,
            eq: ['client_tenant_id', 'client-1'],
            order: ['requested_at', { ascending: false }],
            limit: 100,
        });
        expect(AGENCY_APPROVAL_SELECT).not.toBe('*');
    });

    it('routes approval responses through onboarding-api instead of direct table updates', async () => {
        const invoke = vi.fn(async () => ({ data: { success: true, status: 'approved' }, error: null }));
        const client = { functions: { invoke } };

        await expect(respondClientPortalApproval(client, 'approval-1', 'approved', 'Ok')).resolves.toMatchObject({
            success: true,
            status: 'approved',
        });
        expect(invoke).toHaveBeenCalledWith('onboarding-api', {
            body: {
                action: 'respondClientApproval',
                approvalId: 'approval-1',
                decision: 'approved',
                responseNote: 'Ok',
            },
        });
    });
});
