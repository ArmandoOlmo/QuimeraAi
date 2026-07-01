import { describe, expect, it } from 'vitest';
import {
    buildAgencyActivityInsert,
    buildAgencyApprovalRespondedActivity,
    buildAgencyClientCreatedActivity,
    buildAgencyPaymentReceivedActivity,
    buildAgencyProjectTransferredActivity,
    buildAgencyReportGeneratedActivity,
    buildAgencySnapshotAppliedActivity,
    insertAgencyActivity,
} from '../../services/agency/agencyActivityService';

const now = new Date('2026-07-01T16:00:00.000Z');

describe('agencyActivityService', () => {
    it('builds normalized Agency activity inserts with safe defaults', () => {
        expect(buildAgencyActivityInsert({
            agencyTenantId: 'agency-1',
            type: 'access_changed',
            title: 'Access changed',
        }, now)).toEqual({
            agency_tenant_id: 'agency-1',
            client_tenant_id: null,
            project_id: null,
            type: 'access_changed',
            title: 'Access changed',
            description: null,
            metadata: {},
            created_by: null,
            created_at: '2026-07-01T16:00:00.000Z',
        });
    });

    it('builds canonical payment received activity without exposing internal margin data', () => {
        const row = buildAgencyPaymentReceivedActivity({
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-1',
            agencyPlanId: 'plan-growth',
            stripeCheckoutSessionId: 'cs_123',
            stripeSubscriptionId: 'sub_123',
        }, now);

        expect(row).toMatchObject({
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            type: 'payment_received',
            title: 'Client subscription activated',
            metadata: {
                agencyPlanId: 'plan-growth',
                stripeCheckoutSessionId: 'cs_123',
                stripeSubscriptionId: 'sub_123',
                source: 'stripe-webhook',
            },
        });
        expect(JSON.stringify(row)).not.toMatch(/base_cost|margin|markup|unit_cost/i);
    });

    it('builds draft-safe snapshot activity payloads', () => {
        expect(buildAgencySnapshotAppliedActivity({
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-1',
            targetProjectId: 'project-1',
            applicationId: 'application-1',
            snapshotId: 'snapshot-1',
            snapshotVersionId: 'version-1',
            appliedBy: 'user-1',
            includedModules: ['website-builder', 'crm-leads'],
        }, now)).toMatchObject({
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            project_id: 'project-1',
            type: 'snapshot_applied',
            created_by: 'user-1',
            metadata: {
                source: 'agency_snapshot_service',
                applicationId: 'application-1',
                snapshotId: 'snapshot-1',
                snapshotVersionId: 'version-1',
                includedModules: ['website-builder', 'crm-leads'],
                noAutoPublish: true,
                noRuntimeActivated: true,
                requiresClientApproval: true,
            },
        });
    });

    it('builds report generated activity with Client Portal delivery metadata', () => {
        expect(buildAgencyReportGeneratedActivity({
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-1',
            reportId: 'report-1',
            template: 'monthly_summary',
            generatedBy: 'user-1',
            summary: {
                totalClients: 1,
                totalRevenue: 1200,
                totalOrders: 4,
                totalMrr: 250,
                moduleReadiness: {
                    moduleReadinessRate: 75,
                    activeModuleSlots: 3,
                    totalModuleSlots: 4,
                    clientsWithAgencyOperatingSystem: 1,
                },
            },
            aiSummary: 'Agency report prepared.',
            reportStatus: 'sent',
            publishToClientPortal: true,
            metadata: {
                source: 'global-assistant',
                actionId: 'action-1',
                reportStatus: 'draft',
            },
        }, now)).toMatchObject({
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            type: 'report_generated',
            description: 'Agency report prepared.',
            created_by: 'user-1',
            metadata: {
                source: 'global-assistant',
                actionId: 'action-1',
                reportId: 'report-1',
                template: 'monthly_summary',
                totalClients: 1,
                totalRevenue: 1200,
                totalOrders: 4,
                totalMrr: 250,
                reportStatus: 'sent',
                clientPortalVisible: true,
                portalPublicationStatus: 'sent',
                moduleReadinessRate: 75,
                activeModuleSlots: 3,
                totalModuleSlots: 4,
                clientsWithAgencyOperatingSystem: 1,
            },
        });
    });

    it('builds onboarding client creation activity payloads', () => {
        expect(buildAgencyClientCreatedActivity({
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-1',
            projectId: 'project-1',
            businessName: 'Acme Studio',
            selectedPlanId: 'plan-growth',
            selectedPlanName: 'Growth',
            effectivePlanId: 'agency_pro',
            billingMode: 'agency_managed',
            modules: ['website-builder', 'crm-leads'],
            agencyOperatingSystem: { enabledClient360ModuleIds: ['website-builder'] },
            invitesSent: 2,
            createdBy: 'user-1',
        }, now)).toMatchObject({
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            project_id: 'project-1',
            type: 'client_created',
            title: 'Cliente creado: Acme Studio',
            description: 'Agency Engine provisionó Acme Studio con 2 módulos en draft.',
            created_by: 'user-1',
            metadata: {
                selectedPlanId: 'plan-growth',
                selectedPlanName: 'Growth',
                effectivePlanId: 'agency_pro',
                billingMode: 'agency_managed',
                modules: ['website-builder', 'crm-leads'],
                agencyOperatingSystem: { enabledClient360ModuleIds: ['website-builder'] },
                invitesSent: 2,
                source: 'onboarding-api',
            },
        });
    });

    it('builds project transfer activity payloads without publishing runtime state', () => {
        expect(buildAgencyProjectTransferredActivity({
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-1',
            projectId: 'project-2',
            projectName: 'Acme Website',
            clientName: 'Acme Studio',
            transferredBy: 'user-1',
            metadata: {
                modulesCopied: 4,
                approvalId: 'approval-1',
                accessDecision: 'allowed',
                sourceProjectName: 'Source Website',
                targetProjectName: 'Acme Website',
            },
        }, now)).toMatchObject({
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            project_id: 'project-2',
            type: 'project_transferred',
            title: 'Proyecto transferido: Acme Website',
            description: 'Agency Engine transfirió Acme Website a Acme Studio como borrador.',
            created_by: 'user-1',
            metadata: {
                modulesCopied: 4,
                approvalId: 'approval-1',
                accessDecision: 'allowed',
                sourceProjectName: 'Source Website',
                targetProjectName: 'Acme Website',
            },
        });
    });

    it('builds client approval response activity payloads', () => {
        expect(buildAgencyApprovalRespondedActivity({
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-1',
            projectId: 'project-1',
            approvalId: 'approval-1',
            approvalTitle: 'Review homepage',
            decision: 'change_requested',
            responseNote: '',
            clientName: 'Acme Studio',
            respondedBy: 'client-user-1',
        }, now)).toMatchObject({
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            project_id: 'project-1',
            type: 'approval_responded',
            title: 'Respuesta de aprobación: Review homepage',
            description: 'Acme Studio pidió cambios en Review homepage.',
            created_by: 'client-user-1',
            metadata: {
                approvalId: 'approval-1',
                decision: 'change_requested',
                responseNote: '',
                source: 'client-portal',
            },
        });
    });

    it('inserts Agency activity through the canonical table', async () => {
        const calls: any[] = [];
        const client = {
            from(table: string) {
                calls.push({ method: 'from', table });
                return {
                    insert(row: any) {
                        calls.push({ method: 'insert', table, row });
                        return Promise.resolve({ data: { id: 'activity-1' }, error: null });
                    },
                };
            },
        };

        const result = await insertAgencyActivity(client, {
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-1',
            type: 'note_created',
            title: 'Note created',
        });

        expect(result.data).toEqual({ id: 'activity-1' });
        expect(calls).toEqual([
            { method: 'from', table: 'agency_activity' },
            expect.objectContaining({
                method: 'insert',
                table: 'agency_activity',
                row: expect.objectContaining({
                    agency_tenant_id: 'agency-1',
                    client_tenant_id: 'client-1',
                    type: 'note_created',
                    title: 'Note created',
                }),
            }),
        ]);
    });
});
