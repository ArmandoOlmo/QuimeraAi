import { describe, expect, it } from 'vitest';
import {
    attachDefaultGlobalAssistantActionHandlers,
    GLOBAL_ASSISTANT_ACTIONS,
    GlobalAssistantActionRegistry,
    resolveCurrentAssistantContext,
} from '../../services/globalAssistant';
import type { AssistantAction } from '../../types/globalAssistant';

type Row = Record<string, any>;

class FakeSupabaseQuery {
    private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private payload: Row[] = [];
    private updatePayload: Row = {};
    private filters: Array<(row: Row) => boolean> = [];

    constructor(
        private readonly table: string,
        private readonly rowsByTable: Record<string, Row[]>,
        private readonly nextId: (table: string) => string,
    ) {}

    insert(payload: Row | Row[]) {
        this.operation = 'insert';
        this.payload = Array.isArray(payload) ? payload : [payload];
        return this;
    }

    update(payload: Row) {
        this.operation = 'update';
        this.updatePayload = payload;
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    select() {
        return this;
    }

    eq(field: string, value: unknown) {
        this.filters.push(row => row[field] === value);
        return this;
    }

    in(field: string, values: unknown[]) {
        this.filters.push(row => values.includes(row[field]));
        return this;
    }

    limit() {
        return this;
    }

    maybeSingle() {
        return Promise.resolve(this.execute(true));
    }

    single() {
        return Promise.resolve(this.execute(true));
    }

    then(resolve: (value: any) => void, reject: (reason: unknown) => void) {
        return Promise.resolve(this.execute(false)).then(resolve, reject);
    }

    private execute(single: boolean) {
        const rows = this.rowsByTable[this.table] || (this.rowsByTable[this.table] = []);

        if (this.operation === 'insert') {
            const inserted = this.payload.map(row => ({
                id: row.id || this.nextId(this.table),
                ...row,
            }));
            rows.push(...inserted);
            return { data: single ? inserted[0] : inserted, error: null };
        }

        if (this.operation === 'delete') {
            const keep = rows.filter(row => !this.filters.every(filter => filter(row)));
            this.rowsByTable[this.table] = keep;
            return { data: null, error: null };
        }

        if (this.operation === 'update') {
            const updated = rows
                .filter(row => this.filters.every(filter => filter(row)))
                .map(row => {
                    Object.assign(row, this.updatePayload);
                    return row;
                });
            return { data: single ? updated[0] || null : updated, error: null };
        }

        const filtered = rows.filter(row => this.filters.every(filter => filter(row)));
        return { data: single ? filtered[0] || null : filtered, error: null };
    }
}

const createFakeSupabase = () => {
    const rowsByTable: Record<string, Row[]> = {};
    const functionInvocations: Array<{ functionName: string; options?: Row }> = [];
    const functionResponses: Record<string, { data?: unknown; error?: unknown }> = {};
    let counter = 0;

    return {
        rowsByTable,
        functionInvocations,
        functionResponses,
        functions: {
            invoke(functionName: string, options?: Row) {
                functionInvocations.push({ functionName, options });
                const configured = functionResponses[functionName];
                if (configured) return Promise.resolve(configured);
                return Promise.resolve({ data: { success: true }, error: null });
            },
        },
        from(table: string) {
            return new FakeSupabaseQuery(table, rowsByTable, prefix => `${prefix}_${++counter}`);
        },
    };
};

const buildAgencyRuntime = () => {
    const fakeSupabase = createFakeSupabase();
    const definitions = attachDefaultGlobalAssistantActionHandlers(GLOBAL_ASSISTANT_ACTIONS, {
        supabase: fakeSupabase,
        now: () => '2026-06-26T13:30:00.000Z',
        createId: prefix => `${prefix}_fixed`,
    });
    const registry = new GlobalAssistantActionRegistry(definitions);
    const context = resolveCurrentAssistantContext({
        userId: 'user-1',
        tenantId: 'agency-1',
        role: 'owner',
        mode: 'owner',
        activeProject: {
            id: 'project-1',
            name: 'Agency HQ',
            status: 'Draft',
            tenantId: 'agency-1',
            userId: 'user-1',
        },
        activeServices: ['agency'],
        featureFlags: ['agencyModule'],
    });

    return { fakeSupabase, registry, context };
};

const buildAgencyClient360Action = (input: Row): AssistantAction => ({
    id: 'action-open-agency-client-360',
    taskId: 'task-agency',
    actionType: 'open_agency_client_360',
    module: 'agency',
    target: { module: 'agency' },
    input,
    projectId: 'project-1',
    tenantId: 'agency-1',
    userId: 'user-1',
    mode: 'owner',
    requiresConfirmation: false,
    status: 'previewed',
    createdAt: '2026-06-26T13:00:00.000Z',
    updatedAt: '2026-06-26T13:00:00.000Z',
});

const buildAgencyReportAction = (input: Row): AssistantAction => ({
    id: 'action-create-agency-report',
    taskId: 'task-agency-report',
    actionType: 'create_agency_report',
    module: 'agency',
    target: { module: 'agency' },
    input,
    projectId: null,
    tenantId: 'agency-1',
    userId: 'user-1',
    mode: 'owner',
    requiresConfirmation: false,
    status: 'previewed',
    createdAt: '2026-06-26T13:00:00.000Z',
    updatedAt: '2026-06-26T13:00:00.000Z',
});

const buildAgencyClientProvisioningAction = (input: Row): AssistantAction => ({
    id: 'action-create-agency-client',
    taskId: 'task-agency-client',
    actionType: 'create_agency_client',
    module: 'agency',
    target: { module: 'agency' },
    input,
    projectId: null,
    tenantId: 'agency-1',
    userId: 'user-1',
    mode: 'owner',
    requiresConfirmation: true,
    status: 'confirmed',
    createdAt: '2026-06-26T13:00:00.000Z',
    updatedAt: '2026-06-26T13:00:00.000Z',
});

const buildAgencyProjectTransferAction = (input: Row): AssistantAction => ({
    id: 'action-transfer-agency-project',
    taskId: 'task-agency-transfer',
    actionType: 'transfer_agency_project',
    module: 'agency',
    target: { module: 'agency' },
    input,
    projectId: 'source-project-1',
    tenantId: 'agency-1',
    userId: 'user-1',
    mode: 'owner',
    requiresConfirmation: true,
    status: 'confirmed',
    createdAt: '2026-06-26T13:00:00.000Z',
    updatedAt: '2026-06-26T13:00:00.000Z',
});

describe('Global Assistant Agency Client 360 handler', () => {
    it('opens Client 360 with a canonical managed-client snapshot', async () => {
        const { fakeSupabase, registry, context } = buildAgencyRuntime();
        fakeSupabase.rowsByTable.agency_clients = [{
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            agency_plan_id: 'plan-growth',
            billing_mode: 'direct',
            onboarding_status: 'active',
            lifecycle_stage: 'operating',
            updated_at: '2026-06-26T14:00:00.000Z',
        }];
        fakeSupabase.rowsByTable.agency_service_plans = [{
            id: 'plan-growth',
            tenant_id: 'agency-1',
            name: 'Growth Ops',
            price: 240,
            base_cost: 29,
            is_active: true,
            is_archived: false,
            client_count: 1,
        }];
        fakeSupabase.rowsByTable.tenants = [{
            id: 'client-1',
            name: 'Client One',
            email: 'client@example.test',
            type: 'agency_client',
            billing: { agencyPlanId: 'plan-growth', monthlyPrice: 260, mode: 'direct' },
            subscription_plan: 'individual',
            usage: { projectCount: 3 },
            updated_at: '2026-06-26T14:10:00.000Z',
        }];

        const definition = registry.get('open_agency_client_360');
        const input = {
            tenantId: 'agency-1',
            clientTenantId: 'client-1',
            section: 'billing',
        };

        const result = await definition!.execute!(input, {
            action: buildAgencyClient360Action(input),
            context,
        }) as Row;

        expect(result.afterSnapshot).toMatchObject({
            navigation: {
                type: 'view',
                view: 'agency',
                moduleItem: 'client-360',
                tenantId: 'agency-1',
                clientTenantId: 'client-1',
                section: 'billing',
                sourceModule: 'global-assistant',
            },
            client360: {
                clientTenantId: 'client-1',
                name: 'Client One',
                email: 'client@example.test',
                agencyPlanId: 'plan-growth',
                agencyPlanName: 'Growth Ops',
                billingMode: 'direct',
                lifecycleStage: 'operating',
                monthlyPrice: 260,
                projectCount: 3,
            },
            sourceTables: ['agency_clients', 'agency_service_plans', 'tenants'],
        });
        expect(result.diff).toMatchObject({
            opened: ['agency.client360.client-1.billing'],
            agencyTenantId: 'agency-1',
            sourceTables: ['agency_clients', 'agency_service_plans', 'tenants'],
        });
    });

    it('blocks Client 360 navigation for tenants outside the active agency', async () => {
        const { fakeSupabase, registry, context } = buildAgencyRuntime();
        fakeSupabase.rowsByTable.agency_clients = [{
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            agency_plan_id: 'plan-growth',
        }];
        fakeSupabase.rowsByTable.tenants = [{
            id: 'external-client',
            owner_tenant_id: 'other-agency',
            name: 'External Client',
            type: 'agency_client',
        }];

        const definition = registry.get('open_agency_client_360');
        const input = {
            tenantId: 'agency-1',
            clientTenantId: 'external-client',
            section: 'overview',
        };

        await expect(definition!.execute!(input, {
            action: buildAgencyClient360Action(input),
            context,
        })).rejects.toThrow('Agency Client 360 can only open clients managed by the active agency tenant.');
    });

    it('creates a draft agency report and activity event from managed clients', async () => {
        const { fakeSupabase, registry, context } = buildAgencyRuntime();
        fakeSupabase.rowsByTable.agency_clients = [{
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            agency_plan_id: 'plan-growth',
            billing_mode: 'agency_managed',
            onboarding_status: 'active',
            lifecycle_stage: 'operating',
            metadata: {
                agencyOperatingSystem: {
                    source: 'agency-engine',
                    client360ModuleIds: ['businessBlueprint', 'website-builder', 'ecommerce', 'analytics'],
                    enabledClient360ModuleIds: ['website-builder', 'ecommerce'],
                    generatedModuleIds: ['website-builder', 'ecommerce-engine'],
                },
            },
            updated_at: '2026-06-26T14:00:00.000Z',
        }];
        fakeSupabase.rowsByTable.agency_service_plans = [{
            id: 'plan-growth',
            tenant_id: 'agency-1',
            name: 'Growth Ops',
            price: 240,
            base_cost: 29,
            is_active: true,
            is_archived: false,
            client_count: 1,
        }];
        fakeSupabase.rowsByTable.tenants = [{
            id: 'client-1',
            name: 'Client One',
            email: 'client@example.test',
            type: 'agency_client',
            billing: { agencyPlanId: 'plan-growth', monthlyPrice: 260, mode: 'agency_managed' },
            subscription_plan: 'individual',
            usage: { projectCount: 3 },
            updated_at: '2026-06-26T14:10:00.000Z',
        }];

        const definition = registry.get('create_agency_report');
        const input = {
            tenantId: 'agency-1',
            clientTenantId: 'client-1',
            reportType: 'client_monthly',
            periodStart: '2026-06-01',
            periodEnd: '2026-06-26',
            publishToClientPortal: true,
        };

        const result = await definition!.execute!(input, {
            action: buildAgencyReportAction(input),
            context,
        }) as Row;

        expect(fakeSupabase.rowsByTable.projects || []).toEqual([]);
        expect(fakeSupabase.rowsByTable.agency_reports).toHaveLength(1);
        expect(fakeSupabase.rowsByTable.agency_reports[0]).toMatchObject({
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            report_type: 'client_monthly',
            period_start: '2026-06-01',
            period_end: '2026-06-26',
            status: 'sent',
            generated_by: 'user-1',
        });
        expect(fakeSupabase.rowsByTable.agency_reports[0].data).toMatchObject({
            source: 'global-assistant',
            clientPortal: {
                publishRequested: true,
                visible: true,
                status: 'sent',
                clientTenantId: 'client-1',
                requiresSingleClient: true,
            },
            metrics: {
                clientCount: 1,
                totalMonthlyRevenue: 260,
                totalProjects: 3,
                byBillingMode: { agency_managed: 1 },
                byLifecycleStage: { operating: 1 },
                moduleReadiness: {
                    clientsWithAgencyOperatingSystem: 1,
                    activeModuleSlots: 2,
                    totalModuleSlots: 4,
                    moduleReadinessRate: 50,
                    enabledClient360ModuleIds: ['ecommerce', 'website-builder'],
                    generatedModuleIds: ['ecommerce-engine', 'website-builder'],
                },
            },
            sourceTables: ['agency_clients', 'agency_service_plans', 'tenants', 'agency_reports', 'agency_activity'],
        });
        expect(fakeSupabase.rowsByTable.agency_activity).toHaveLength(1);
        expect(fakeSupabase.rowsByTable.agency_activity[0]).toMatchObject({
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            type: 'report_generated',
            title: 'Agency report generated',
            created_by: 'user-1',
        });
        expect(fakeSupabase.rowsByTable.agency_activity[0].metadata).toMatchObject({
            source: 'global-assistant',
            actionId: 'action-create-agency-report',
            reportType: 'client_monthly',
            selectedClientIds: ['client-1'],
            periodStart: '2026-06-01',
            periodEnd: '2026-06-26',
            reportStatus: 'sent',
            clientPortalVisible: true,
            portalPublicationStatus: 'sent',
            moduleReadinessRate: 50,
            activeModuleSlots: 2,
            totalModuleSlots: 4,
            clientsWithAgencyOperatingSystem: 1,
        });
        expect(result.afterSnapshot).toMatchObject({
            agencyTenantId: 'agency-1',
            status: 'sent',
            portalPublicationStatus: 'sent',
            clientPortalVisible: true,
            summary: {
                clientCount: 1,
                totalMonthlyRevenue: 260,
                totalProjects: 3,
                moduleReadiness: {
                    clientsWithAgencyOperatingSystem: 1,
                    activeModuleSlots: 2,
                    totalModuleSlots: 4,
                    moduleReadinessRate: 50,
                },
            },
            aiSummary: 'Agency client monthly report prepared for 1 client from 2026-06-01 to 2026-06-26. Agency OS readiness 50% (2/4 Client 360 slots).',
            sourceTables: ['agency_clients', 'agency_service_plans', 'tenants', 'agency_reports', 'agency_activity'],
        });
        expect(result.diff).toMatchObject({
            reported: ['agency.report.agency-1.agency_reports_1'],
            selectedClientIds: ['client-1'],
            portalPublicationStatus: 'sent',
            clientPortalVisible: true,
            mutatesData: true,
        });

        const rollback = await definition!.rollback!(input, {
            action: buildAgencyReportAction(input),
            context,
            snapshot: {
                id: 'snapshot-report-1',
                actionId: 'action-create-agency-report',
                beforeSnapshot: {},
                afterSnapshot: result.afterSnapshot,
                createdAt: '2026-06-26T13:31:00.000Z',
            },
        });

        expect(rollback.diff).toMatchObject({
            rolledBack: ['agency_activity', 'agency_reports'],
        });
        expect(fakeSupabase.rowsByTable.agency_reports).toHaveLength(0);
        expect(fakeSupabase.rowsByTable.agency_activity).toHaveLength(0);
    });

    it('blocks agency reports for clients outside the active agency', async () => {
        const { fakeSupabase, registry, context } = buildAgencyRuntime();
        fakeSupabase.rowsByTable.agency_clients = [{
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            agency_plan_id: 'plan-growth',
        }];
        fakeSupabase.rowsByTable.tenants = [{
            id: 'external-client',
            owner_tenant_id: 'other-agency',
            name: 'External Client',
            type: 'agency_client',
        }];

        const definition = registry.get('create_agency_report');
        const input = {
            tenantId: 'agency-1',
            clientTenantId: 'external-client',
            reportType: 'client_monthly',
        };

        await expect(definition!.execute!(input, {
            action: buildAgencyReportAction(input),
            context,
        })).rejects.toThrow('Agency reports can only include clients managed by the active agency tenant.');
    });

    it('creates an agency client through onboarding-api with a canonical service plan', async () => {
        const { fakeSupabase, registry, context } = buildAgencyRuntime();
        fakeSupabase.rowsByTable.agency_service_plans = [{
            id: 'plan-growth',
            tenant_id: 'agency-1',
            name: 'Growth Ops',
            price: 240,
            base_cost: 29,
            is_active: true,
            is_default: true,
            is_archived: false,
            limits: { maxProjects: 5, maxUsers: 3, maxAiCredits: 1000 },
        }];
        fakeSupabase.functionResponses['onboarding-api'] = {
            data: {
                success: true,
                agencyTenantId: 'agency-1',
                clientTenantId: 'client-new-1',
                projectId: 'project-new-1',
                selectedPlanId: 'plan-growth',
                selectedPlanName: 'Growth Ops',
                limits: { maxProjects: 5, maxUsers: 3, maxAiCredits: 1000 },
                modules: ['website-builder', 'crm-leads', 'chatbot-engine', 'media-assets', 'finance'],
                invitesSent: 1,
                provisioningSummary: {
                    tenantCreated: true,
                    projectCreated: true,
                    businessBlueprintCreated: true,
                    moduleActivationsPrepared: true,
                    billingMode: 'agency_managed',
                    activityLogged: true,
                },
            },
            error: null,
        };

        const definition = registry.get('create_agency_client');
        const input = {
            tenantId: 'agency-1',
            businessName: 'Client One Studio',
            industry: 'professional_services',
            contactEmail: 'owner@clientone.test',
            contactPhone: '787-555-0101',
            selectedPlanId: 'plan-growth',
            enabledFeatures: ['cms', 'leads', 'chatbot', 'finance'],
            generateWebsite: true,
            generateChatbot: true,
            generateMediaAssets: true,
        };

        const result = await definition!.execute!(input, {
            action: buildAgencyClientProvisioningAction(input),
            context,
        }) as Row;

        expect(fakeSupabase.functionInvocations).toHaveLength(1);
        expect(fakeSupabase.functionInvocations[0]).toMatchObject({
            functionName: 'onboarding-api',
            options: {
                body: {
                    action: 'autoProvision',
                    agencyTenantId: 'agency-1',
                    businessName: 'Client One Studio',
                    industry: 'professional_services',
                    contactEmail: 'owner@clientone.test',
                    contactPhone: '787-555-0101',
                    selectedPlanId: 'plan-growth',
                    selectedPlanName: 'Growth Ops',
                    setupBilling: true,
                    monthlyPrice: 240,
                    enabledFeatures: ['cms', 'leads', 'chatbot', 'finance'],
                    initialUsers: [{
                        email: 'owner@clientone.test',
                        name: 'Client One Studio',
                        role: 'client_admin',
                    }],
                    generateWebsite: true,
                    generateChatbot: true,
                    generateMediaAssets: true,
                    metadata: {
                        source: 'global-assistant',
                        actionId: 'action-create-agency-client',
                        taskId: 'task-agency-client',
                    },
                },
            },
        });
        expect(result.afterSnapshot).toMatchObject({
            agencyTenantId: 'agency-1',
            clientTenantId: 'client-new-1',
            projectId: 'project-new-1',
            selectedPlan: {
                id: 'plan-growth',
                name: 'Growth Ops',
                monthlyPrice: 240,
                setupBilling: true,
            },
            provisioning: {
                success: true,
                selectedPlanId: 'plan-growth',
                provisioningSummary: {
                    businessBlueprintCreated: true,
                    moduleActivationsPrepared: true,
                    billingMode: 'agency_managed',
                },
            },
        });
        expect(result.diff).toMatchObject({
            clientTenantId: 'client-new-1',
            projectId: 'project-new-1',
            selectedPlanId: 'plan-growth',
            mutatesData: true,
            reviewRequired: true,
            businessBlueprintCreated: true,
            moduleActivationsPrepared: true,
            billingMode: 'agency_managed',
            invitesSent: 1,
        });
        expect(result.diff.created).toEqual(expect.arrayContaining([
            'tenant.client-new-1',
            'project.project-new-1',
            'agency_clients.relationship',
            'businessBlueprint.draft',
            'moduleActivations.prepared',
            'agency_activity.client_created',
        ]));
        expect(result.diff.sourceTables).toEqual(expect.arrayContaining([
            'agency_clients',
            'agency_service_plans',
            'tenants',
            'onboarding-api',
            'projects',
            'tenant_modules',
            'project_modules',
            'tenant_invites',
            'agency_activity',
        ]));
    });

    it('blocks agency client provisioning when selectedPlanId is not an active plan for the agency', async () => {
        const { fakeSupabase, registry, context } = buildAgencyRuntime();
        fakeSupabase.rowsByTable.agency_service_plans = [{
            id: 'plan-growth',
            tenant_id: 'agency-1',
            name: 'Growth Ops',
            price: 240,
            is_active: true,
            is_archived: false,
        }];

        const definition = registry.get('create_agency_client');
        const input = {
            tenantId: 'agency-1',
            businessName: 'External Plan Client',
            contactEmail: 'owner@external.test',
            selectedPlanId: 'plan-other-agency',
        };

        await expect(definition!.execute!(input, {
            action: buildAgencyClientProvisioningAction(input),
            context,
        })).rejects.toThrow('Agency client provisioning requires an active service plan owned by the active agency tenant.');
        expect(fakeSupabase.functionInvocations).toEqual([]);
    });

    it('transfers an agency project through onboarding-api for a managed client', async () => {
        const { fakeSupabase, registry, context } = buildAgencyRuntime();
        fakeSupabase.rowsByTable.agency_clients = [{
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            agency_plan_id: 'plan-growth',
            billing_mode: 'agency_managed',
            onboarding_status: 'active',
            lifecycle_stage: 'operating',
        }];
        fakeSupabase.rowsByTable.agency_service_plans = [{
            id: 'plan-growth',
            tenant_id: 'agency-1',
            name: 'Growth Ops',
            price: 240,
            base_cost: 29,
            is_active: true,
            is_archived: false,
        }];
        fakeSupabase.rowsByTable.tenants = [{
            id: 'client-1',
            name: 'Client One',
            email: 'client@example.test',
            type: 'agency_client',
            billing: { agencyPlanId: 'plan-growth', monthlyPrice: 260, mode: 'agency_managed' },
            subscription_plan: 'individual',
            usage: { projectCount: 3 },
        }];
        fakeSupabase.functionResponses['onboarding-api'] = {
            data: {
                success: true,
                agencyTenantId: 'agency-1',
                sourceProjectId: 'source-project-1',
                targetClientTenantId: 'client-1',
                newProjectId: 'copied-project-1',
                modulesCopied: 4,
                transferSummary: {
                    copiedAsDraft: true,
                    published: false,
                    approvalRequested: true,
                    agencyOperatingSystemAttached: true,
                    enabledClient360ModuleIds: ['businessBlueprint', 'website-builder', 'ecommerce'],
                    generatedModuleIds: ['ai-business-blueprint', 'website-builder', 'ecommerce-engine'],
                    currentProjects: 4,
                    maxProjects: 25,
                },
            },
            error: null,
        };

        const definition = registry.get('transfer_agency_project');
        const input = {
            tenantId: 'agency-1',
            projectId: 'source-project-1',
            targetClientTenantId: 'client-1',
            projectName: 'Client One Draft Website',
        };

        const result = await definition!.execute!(input, {
            action: buildAgencyProjectTransferAction(input),
            context,
        }) as Row;

        expect(fakeSupabase.functionInvocations).toHaveLength(1);
        expect(fakeSupabase.functionInvocations[0]).toMatchObject({
            functionName: 'onboarding-api',
            options: {
                body: {
                    action: 'transferProject',
                    sourceTenantId: 'agency-1',
                    targetClientTenantId: 'client-1',
                    projectId: 'source-project-1',
                    projectName: 'Client One Draft Website',
                    metadata: {
                        source: 'global-assistant',
                        actionId: 'action-transfer-agency-project',
                        taskId: 'task-agency-transfer',
                    },
                },
            },
        });
        expect(result.afterSnapshot).toMatchObject({
            agencyTenantId: 'agency-1',
            client: {
                clientTenantId: 'client-1',
                agencyPlanId: 'plan-growth',
                agencyPlanName: 'Growth Ops',
            },
            transfer: {
                success: true,
                newProjectId: 'copied-project-1',
                transferSummary: {
                    copiedAsDraft: true,
                    published: false,
                    approvalRequested: true,
                },
            },
        });
        expect(result.diff).toMatchObject({
            transferred: ['agency.projectTransfer.source-project-1.client-1'],
            sourceProjectId: 'source-project-1',
            targetClientTenantId: 'client-1',
            newProjectId: 'copied-project-1',
            mutatesData: true,
            reviewRequired: true,
            copiedAsDraft: true,
            approvalRequested: true,
            agencyOperatingSystemAttached: true,
            agencyOperatingSystemModuleIds: ['businessBlueprint', 'website-builder', 'ecommerce'],
            generatedModuleIds: ['ai-business-blueprint', 'website-builder', 'ecommerce-engine'],
        });
        expect(result.diff.sourceTables).toEqual(expect.arrayContaining([
            'agency_clients',
            'agency_service_plans',
            'tenants',
            'onboarding-api',
            'agency_project_transfers',
            'agency_client_approvals',
            'agency_activity',
        ]));
    });

    it('blocks project transfer for clients outside the active agency before invoking onboarding-api', async () => {
        const { fakeSupabase, registry, context } = buildAgencyRuntime();
        fakeSupabase.rowsByTable.agency_clients = [{
            agency_tenant_id: 'agency-1',
            client_tenant_id: 'client-1',
            agency_plan_id: 'plan-growth',
        }];

        const definition = registry.get('transfer_agency_project');
        const input = {
            tenantId: 'agency-1',
            projectId: 'source-project-1',
            targetClientTenantId: 'external-client',
        };

        await expect(definition!.execute!(input, {
            action: buildAgencyProjectTransferAction(input),
            context,
        })).rejects.toThrow('Agency Project Transfer can only target clients managed by the active agency tenant.');
        expect(fakeSupabase.functionInvocations).toEqual([]);
    });
});
