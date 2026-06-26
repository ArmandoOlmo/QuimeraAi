import { describe, expect, it } from 'vitest';
import {
    attachDefaultGlobalAssistantActionHandlers,
    GLOBAL_ASSISTANT_ACTIONS,
    GlobalAssistantActionRegistry,
    GlobalAssistantAuditService,
    GlobalAssistantMemoryService,
    GlobalAssistantRuntime,
    GlobalAssistantTaskService,
    resolveCurrentAssistantContext,
} from '../../services/globalAssistant';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';

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

    neq(field: string, value: unknown) {
        this.filters.push(row => row[field] !== value);
        return this;
    }

    in(field: string, values: unknown[]) {
        this.filters.push(row => values.includes(row[field]));
        return this;
    }

    lt(field: string, value: unknown) {
        this.filters.push(row => row[field] < value);
        return this;
    }

    gt(field: string, value: unknown) {
        this.filters.push(row => row[field] > value);
        return this;
    }

    limit() {
        return this;
    }

    or() {
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
    let counter = 0;

    return {
        rowsByTable,
        from(table: string) {
            return new FakeSupabaseQuery(table, rowsByTable, (prefix) => `${prefix}_${++counter}`);
        },
    };
};

const activeProject = {
    id: 'project-1',
    name: 'Casa Luna',
    status: 'Draft' as const,
    tenantId: 'tenant-1',
    userId: 'user-1',
};

const buildRuntime = (activeServices: string[], featureFlags: string[]) => {
    const fakeSupabase = createFakeSupabase();
    const definitions = attachDefaultGlobalAssistantActionHandlers(GLOBAL_ASSISTANT_ACTIONS, {
        supabase: fakeSupabase,
        now: () => '2026-06-26T13:30:00.000Z',
        createId: prefix => `${prefix}_fixed`,
    });
    const registry = new GlobalAssistantActionRegistry(definitions);
    const memoryService = new GlobalAssistantMemoryService();
    const taskService = new GlobalAssistantTaskService();
    const auditService = new GlobalAssistantAuditService();
    const runtime = new GlobalAssistantRuntime(registry, memoryService, taskService, auditService);
    const context = resolveCurrentAssistantContext({
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'owner',
        mode: 'owner',
        activeProject,
        activeServices,
        featureFlags,
    });

    return { fakeSupabase, runtime, registry, context, auditService };
};

const buildWebsitePlan = (): WebsitePlan => ({
    source: 'chat',
    generationMode: 'from-scratch',
    businessProfile: {
        businessName: 'Casa Luna',
        industry: 'appointments and ecommerce',
        description: 'A bilingual service business with ChatCore.',
        tagline: 'Reserve smarter',
        services: [{ name: 'VIP Reservation', description: 'Reviewed appointment flow.' }],
        contactInfo: { city: 'San Juan', country: 'Puerto Rico', email: 'hello@casaluna.test' },
        hasEcommerce: true,
    },
    brandProfile: {
        colors: {
            primary: '#0f766e',
            secondary: '#111827',
            accent: '#f59e0b',
            background: '#f8fafc',
            surface: '#ffffff',
            text: '#111827',
        },
        visualStyle: 'clean service',
    },
    contentMap: { pages: [], products: [] },
    componentPlan: [
        { component: 'heroLead', reason: 'Lead capture', confidence: 0.9 },
        { component: 'chatbot', reason: 'ChatCore', confidence: 0.9 },
    ],
    assetPlan: [],
    qualityGoals: ['canonical chatbot engine'],
});

const buildBusinessBlueprint = () => createBusinessBlueprintFromWebsitePlan(buildWebsitePlan(), {
    now: '2026-06-26T00:00:00.000Z',
    projectId: 'project-1',
    tenantId: 'tenant-1',
});

const buildRealtyBusinessBlueprint = () => createBusinessBlueprintFromWebsitePlan({
    ...buildWebsitePlan(),
    businessProfile: {
        ...buildWebsitePlan().businessProfile,
        businessName: 'Costa Realty',
        industry: 'real estate',
        description: 'Real estate brokerage with listings, showing requests, and buyer leads.',
        services: [{ name: 'Private showing', description: 'Reviewed showing request flow.' }],
        hasEcommerce: false,
    },
    contentMap: {
        pages: [],
        products: [],
        properties: [{
            title: 'Ocean View Condo',
            description: 'Draft property for showing requests.',
            price: 750000,
            city: 'San Juan',
            propertyType: 'condo',
        }],
    },
    componentPlan: [
        { component: 'realEstateListings', reason: 'Listings', confidence: 0.95 },
        { component: 'leads', reason: 'Property leads', confidence: 0.85 },
    ],
    qualityGoals: ['reviewed realty engine'],
}, {
    now: '2026-06-26T00:00:00.000Z',
    projectId: 'project-1',
    tenantId: 'tenant-1',
});

const websiteTheme = {
    globalColors: {
        primary: '#0f766e',
        secondary: '#111827',
        accent: '#f59e0b',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#111827',
    },
    fontFamilyHeader: 'Inter',
    fontFamilyBody: 'Inter',
    fontFamilyButton: 'Inter',
};

const buildWebsiteProjectRow = (): Row => ({
    id: 'project-1',
    name: 'Casa Luna',
    status: 'Draft',
    tenant_id: 'tenant-1',
    user_id: 'user-1',
    data: {
        data: {
            hero: {
                headline: 'Original headline',
                subheadline: 'Original subheadline',
            },
            features: {
                title: 'Original features',
            },
        },
        theme: websiteTheme,
        brandIdentity: { name: 'Casa Luna', industry: 'hospitality' },
        componentOrder: ['hero', 'features', 'chatbot'],
        sectionVisibility: { hero: true, features: true, chatbot: true },
        pages: [{
            id: 'home',
            title: 'Home',
            slug: '/',
            sections: ['hero', 'features', 'chatbot'],
            sectionData: {
                hero: {
                    headline: 'Original headline',
                    subheadline: 'Original subheadline',
                },
                features: {
                    title: 'Original features',
                },
            },
            isHomePage: true,
        }],
        businessBlueprint: buildBusinessBlueprint(),
    },
    theme: websiteTheme,
    brand_identity: { name: 'Casa Luna', industry: 'hospitality' },
    component_order: ['hero', 'features', 'chatbot'],
    section_visibility: { hero: true, features: true, chatbot: true },
    pages: [{
        id: 'home',
        title: 'Home',
        slug: '/',
        sections: ['hero', 'features', 'chatbot'],
        sectionData: {
            hero: {
                headline: 'Original headline',
                subheadline: 'Original subheadline',
            },
            features: {
                title: 'Original features',
            },
        },
        isHomePage: true,
    }],
    published_data: null,
    published_at: null,
    last_updated: '2026-06-26T12:00:00.000Z',
});

const buildAssistantAction = (actionType: string, input: Row): any => ({
    id: `action-${actionType}`,
    taskId: 'task-website',
    actionType,
    module: 'website',
    target: { module: 'website' },
    input,
    projectId: 'project-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    safetyLevel: 'high',
    requiresConfirmation: true,
    status: 'previewed',
    createdAt: '2026-06-26T13:00:00.000Z',
    updatedAt: '2026-06-26T13:00:00.000Z',
});

describe('Global Assistant default action handlers', () => {
    it('creates and rolls back a review-gated AI Studio project draft from a dashboard request', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime([], ['websiteBuilder']);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea un website para un restaurante con menu y citas',
            enabledFeatures: ['websiteBuilder'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_project_from_prompt']);
        expect(planned.plan.status).toBe('preview');
        expect(planned.task.status).toBe('waiting_for_confirmation');
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const projects = fakeSupabase.rowsByTable.projects;

        expect(applied.task.status).toBe('completed');
        expect(projects).toHaveLength(1);
        expect(projects[0]).toMatchObject({
            name: 'restaurante con menu y citas',
            status: 'Draft',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            last_updated: '2026-06-26T13:30:00.000Z',
        });
        expect(projects[0].data).toMatchObject({
            id: projects[0].id,
            status: 'Draft',
            assistantDrafts: {
                projectCreation: {
                    generatedByAI: true,
                    needsReview: true,
                    noAutoPublish: true,
                    sourceComponent: 'OperatingLayer',
                },
                website: {
                    generatedByAI: true,
                    needsReview: true,
                    noAutoPublish: true,
                    sourceComponent: 'OperatingLayer',
                },
            },
            businessBlueprint: {
                projectId: projects[0].id,
                needsReview: true,
                websiteBlueprint: {
                    needsReview: true,
                },
            },
            globalAssistant: {
                actionType: 'create_project_from_prompt',
                generatedByAI: true,
                needsReview: true,
                noAutoPublish: true,
            },
        });
        expect(projects[0].data.componentOrder).toEqual(expect.arrayContaining(['hero', 'menu', 'chatbot', 'footer']));
        expect(applied.actions[0].afterSnapshot).toMatchObject({
            table: 'projects',
            id: projects[0].id,
            projectId: projects[0].id,
            reviewRequired: true,
            noAutoPublish: true,
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.projects).toHaveLength(0);
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('creates a review-gated Website Builder intake draft on the active project and rolls it back', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], ['websiteBuilder']);
        fakeSupabase.rowsByTable.projects = [buildWebsiteProjectRow()];
        const planned = await runtime.planRequest({
            context,
            request: 'Agrega una seccion de testimonios al website',
            enabledFeatures: ['websiteBuilder'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_website_from_prompt']);
        expect(planned.task.status).toBe('waiting_for_confirmation');
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const project = fakeSupabase.rowsByTable.projects[0];

        expect(applied.task.status).toBe('completed');
        expect(project.data.assistantDrafts.websiteGeneration).toMatchObject({
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
            noAutoPublish: true,
            prompt: 'Agrega una seccion de testimonios al website',
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
        });
        expect(applied.actions[0].beforeSnapshot).toMatchObject({
            table: 'projects',
            id: 'project-1',
            projectId: 'project-1',
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.assistantDrafts?.websiteGeneration).toBeUndefined();
        expect(fakeSupabase.rowsByTable.projects[0].data.data.hero.headline).toBe('Original headline');
    });

    it('creates and rolls back a review-gated email campaign draft', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['emailMarketing'], ['emailMarketing']);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea una campana de email para reservas VIP',
            enabledServices: ['emailMarketing'],
            enabledFeatures: ['emailMarketing'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_email_campaign']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const campaigns = fakeSupabase.rowsByTable.email_campaigns;

        expect(applied.task.status).toBe('completed');
        expect(campaigns).toHaveLength(1);
        expect(campaigns[0]).toMatchObject({
            project_id: 'project-1',
            status: 'draft',
            generated_by_ai: true,
            needs_review: true,
            source_module: 'global-assistant',
            source_component: 'OperatingLayer',
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.email_campaigns).toHaveLength(0);
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('generates review-gated email copy as a draft campaign without queueing sends', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['emailMarketing'], ['emailMarketing']);
        const planned = await runtime.planRequest({
            context,
            request: 'Genera copy de email para reservas VIP',
            enabledServices: ['emailMarketing'],
            enabledFeatures: ['emailMarketing'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['generate_email_copy']);
        expect(planned.plan.status).toBe('preview');
        expect(planned.plan.requiresConfirmation).toBe(false);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const campaigns = fakeSupabase.rowsByTable.email_campaigns;

        expect(applied.task.status).toBe('completed');
        expect(campaigns).toHaveLength(1);
        expect(campaigns[0]).toMatchObject({
            project_id: 'project-1',
            store_id: 'project-1',
            status: 'draft',
            generated_by_ai: true,
            needs_review: true,
            safe_to_edit: true,
            source_module: 'global-assistant',
            source_component: 'OperatingLayer',
            source_event: 'generate_email_copy',
        });
        expect(campaigns[0].metadata).toMatchObject({
            noAutoSend: true,
            globalAssistant: {
                actionType: 'generate_email_copy',
                needsReview: true,
            },
        });
        expect(campaigns[0].email_document).toMatchObject({
            status: 'needs_review',
            generatedByAI: true,
            needsReview: true,
        });
        expect(fakeSupabase.rowsByTable.email_outbox || []).toHaveLength(0);
        expect(fakeSupabase.rowsByTable.email_logs || []).toHaveLength(0);

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.email_campaigns).toHaveLength(0);
    });

    it('updates active email campaign copy and rolls back the previous campaign snapshot', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['emailMarketing'], ['emailMarketing']);
        fakeSupabase.rowsByTable.email_campaigns = [{
            id: 'campaign-1',
            project_id: 'project-1',
            store_id: 'project-1',
            name: 'Original campaign',
            subject: 'Original subject',
            preview_text: 'Original preview',
            html_content: '<p>Original body</p>',
            email_document: { subject: 'Original subject' },
            status: 'draft',
            generated_by_ai: false,
            needs_review: false,
            safe_to_edit: true,
            metadata: { source: 'manual' },
            created_at: '2026-06-26T12:00:00.000Z',
            updated_at: '2026-06-26T12:00:00.000Z',
        }];
        const campaignContext = {
            ...context,
            activeEntityType: 'email_campaign',
            activeEntityId: 'campaign-1',
        };
        const planned = await runtime.planRequest({
            context: campaignContext,
            request: 'Genera copy de email para esta campana con asunto Reservas VIP',
            enabledServices: ['emailMarketing'],
            enabledFeatures: ['emailMarketing'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['generate_email_copy']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: campaignContext });

        expect(applied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.email_campaigns[0]).toMatchObject({
            id: 'campaign-1',
            status: 'draft',
            generated_by_ai: true,
            needs_review: true,
        });
        expect(fakeSupabase.rowsByTable.email_campaigns[0].subject).toBe('Reservas VIP');
        expect(fakeSupabase.rowsByTable.email_campaigns[0].metadata).toMatchObject({
            noAutoSend: true,
            globalAssistant: {
                actionType: 'generate_email_copy',
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: campaignContext,
        });

        expect(fakeSupabase.rowsByTable.email_campaigns[0]).toMatchObject({
            subject: 'Original subject',
            preview_text: 'Original preview',
            html_content: '<p>Original body</p>',
            generated_by_ai: false,
            needs_review: false,
            updated_at: '2026-06-26T12:00:00.000Z',
        });
    });

    it('creates an ecommerce product draft with assistant review metadata', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['ecommerce'], ['ecommerceEnabled']);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea un producto llamado Cafe Premium con precio 12',
            enabledServices: ['ecommerce'],
            enabledFeatures: ['ecommerceEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_product']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const products = fakeSupabase.rowsByTable.store_products;

        expect(applied.task.status).toBe('completed');
        expect(products).toHaveLength(1);
        expect(products[0].data).toMatchObject({
            project_id: 'project-1',
            store_id: 'project-1',
            status: 'draft',
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
        });
        expect(products[0].data.metadata.globalAssistant.actionType).toBe('create_product');
    });

    it('searches and summarizes CRM leads without mutating rows', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['crm'], []);
        fakeSupabase.rowsByTable.leads = [
            { id: 'lead-1', tenant_id: 'tenant-1', project_id: 'project-1', name: 'Maria Torres', email: 'maria@test.com', status: 'new', source: 'bio_page', value: 250, tags: ['vip'] },
            { id: 'lead-2', tenant_id: 'tenant-1', project_id: 'project-1', name: 'Luis Rivera', email: 'luis@test.com', status: 'qualified', source: 'chatbot', value: 500, tags: [] },
            { id: 'lead-other', tenant_id: 'tenant-1', project_id: 'project-2', name: 'Maria Other', email: 'other@test.com', status: 'new', source: 'manual', value: 100 },
        ];
        fakeSupabase.rowsByTable.lead_tasks = [
            { id: 'task-1', tenant_id: 'tenant-1', project_id: 'project-1', lead_id: 'lead-1', title: 'Call Maria', status: 'open', is_completed: false },
            { id: 'task-2', tenant_id: 'tenant-1', project_id: 'project-1', lead_id: 'lead-2', title: 'Done', status: 'completed', is_completed: true },
        ];
        fakeSupabase.rowsByTable.lead_activities = [
            { id: 'activity-1', tenant_id: 'tenant-1', project_id: 'project-1', lead_id: 'lead-1', type: 'note' },
        ];

        const searchPlan = await runtime.planRequest({
            context,
            request: 'Busca Maria en CRM',
            enabledServices: ['crm'],
            enabledFeatures: [],
        });

        expect(searchPlan.plan.actions.map(action => action.actionType)).toEqual(['search_leads']);
        expect(searchPlan.plan.requiresConfirmation).toBe(false);
        const searchApplied = await runtime.applyTask({ taskId: searchPlan.task.id, context });

        expect(searchApplied.task.status).toBe('completed');
        expect(searchApplied.actions[0].afterSnapshot).toMatchObject({
            kind: 'lead_search',
            projectId: 'project-1',
            query: 'Maria',
            matchCount: 1,
            matches: [
                expect.objectContaining({ id: 'lead-1', name: 'Maria Torres' }),
            ],
        });

        const summaryPlan = await runtime.planRequest({
            context,
            request: 'Analiza los leads del CRM',
            enabledServices: ['crm'],
            enabledFeatures: [],
        });

        expect(summaryPlan.plan.actions.map(action => action.actionType)).toEqual(['summarize_leads']);
        const summaryApplied = await runtime.applyTask({ taskId: summaryPlan.task.id, context });

        expect(summaryApplied.task.status).toBe('completed');
        expect(summaryApplied.actions[0].afterSnapshot).toMatchObject({
            kind: 'lead_summary',
            summary: {
                totalLeads: 2,
                totalValue: 750,
                openTasks: 1,
                activityCount: 1,
                byStatus: {
                    new: 1,
                    qualified: 1,
                },
                bySource: {
                    bio_page: 1,
                    chatbot: 1,
                },
            },
        });
        expect(fakeSupabase.rowsByTable.leads).toHaveLength(3);
        expect(fakeSupabase.rowsByTable.lead_tasks).toHaveLength(2);
    });

    it('creates a CRM lead with customer request notes and summary metadata', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['crm'], []);
        const request = 'Crea un lead CRM para Maria interesada en una cita VIP';
        const planned = await runtime.planRequest({
            context,
            request,
            enabledServices: ['crm'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_lead']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const lead = fakeSupabase.rowsByTable.leads[0];

        expect(applied.task.status).toBe('completed');
        expect(lead.notes).toContain('Customer request / Solicitud del cliente:');
        expect(lead.notes).toContain(request);
        expect(lead.custom_data).toMatchObject({
            customerRequest: request,
            needsReview: true,
        });
        expect(lead.custom_data.customerRequestSummary).toContain(request);
    });

    it('updates an active CRM lead with confirmation and rollback', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['crm'], []);
        fakeSupabase.rowsByTable.leads = [{
            id: 'lead-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            name: 'Maria Torres',
            email: 'maria@test.com',
            status: 'new',
            source: 'manual',
            value: 100,
            tags: ['vip'],
            notes: '',
            custom_data: { leadScore: 20 },
            created_at: '2026-06-26T12:00:00.000Z',
            updated_at: '2026-06-26T12:00:00.000Z',
        }];
        const leadContext = {
            ...context,
            activeEntityType: 'crm_lead',
            activeEntityId: 'lead-1',
        };
        const planned = await runtime.planRequest({
            context: leadContext,
            request: 'Actualiza este lead a qualified con valor 750',
            enabledServices: ['crm'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_lead']);
        expect(planned.plan.requiresConfirmation).toBe(true);
        expect(planned.task.status).toBe('waiting_for_confirmation');
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: leadContext });

        expect(applied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.leads[0]).toMatchObject({
            status: 'qualified',
            value: 750,
            updated_at: '2026-06-26T13:30:00.000Z',
        });
        expect(fakeSupabase.rowsByTable.leads[0].custom_data).toMatchObject({
            leadScore: 20,
            globalAssistant: {
                actionType: 'update_lead',
                needsReview: true,
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: leadContext,
        });

        expect(fakeSupabase.rowsByTable.leads[0]).toMatchObject({
            status: 'new',
            value: 100,
            updated_at: '2026-06-26T12:00:00.000Z',
        });
    });

    it('creates and rolls back a CRM follow-up task for the active lead', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['crm'], []);
        fakeSupabase.rowsByTable.leads = [{
            id: 'lead-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            name: 'Maria Torres',
            status: 'qualified',
        }];
        const leadContext = {
            ...context,
            activeEntityType: 'lead',
            activeEntityId: 'lead-1',
        };
        const planned = await runtime.planRequest({
            context: leadContext,
            request: 'Crea una tarea de seguimiento para llamar a Maria manana',
            enabledServices: ['crm'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_follow_up_task']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: leadContext });
        const tasks = fakeSupabase.rowsByTable.lead_tasks;

        expect(applied.task.status).toBe('completed');
        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toMatchObject({
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            lead_id: 'lead-1',
            status: 'open',
            is_completed: false,
        });
        expect(tasks[0].metadata).toMatchObject({
            generatedByAI: true,
            needsReview: true,
            priority: 'medium',
            globalAssistant: {
                actionType: 'create_follow_up_task',
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: leadContext,
        });

        expect(fakeSupabase.rowsByTable.lead_tasks).toHaveLength(0);
    });

    it('updates ecommerce product pricing with confirmation and rollback', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['ecommerce'], ['ecommerceEnabled']);
        fakeSupabase.rowsByTable.store_products = [{
            id: 'product-1',
            project_id: 'project-1',
            name: 'Cafe Premium',
            price: 12,
            currency: 'USD',
            quantity: 5,
            data: {
                name: 'Cafe Premium',
                price: 12,
                currency: 'USD',
            },
            created_at: '2026-06-26T12:00:00.000Z',
            updated_at: '2026-06-26T12:00:00.000Z',
        }];
        const productContext = {
            ...context,
            activeEntityType: 'ecommerce_product',
            activeEntityId: 'product-1',
        };
        const planned = await runtime.planRequest({
            context: productContext,
            request: 'Actualiza el precio del producto a 18.50',
            enabledServices: ['ecommerce'],
            enabledFeatures: ['ecommerceEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_price']);
        expect(planned.plan.requiresConfirmation).toBe(true);
        expect(planned.task.status).toBe('waiting_for_confirmation');

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context: productContext });
        const product = fakeSupabase.rowsByTable.store_products[0];

        expect(applied.task.status).toBe('completed');
        expect(product).toMatchObject({
            price: 18.5,
            currency: 'USD',
            updated_at: '2026-06-26T13:30:00.000Z',
        });
        expect(product.data).toMatchObject({
            price: 18.5,
            currency: 'USD',
            metadata: {
                globalAssistant: {
                    actionType: 'update_price',
                    needsReview: true,
                },
            },
        });
        expect(applied.actions[0].beforeSnapshot).toMatchObject({
            table: 'store_products',
            id: 'product-1',
            row: {
                price: 12,
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: productContext,
        });

        expect(fakeSupabase.rowsByTable.store_products[0]).toMatchObject({
            price: 12,
            currency: 'USD',
            updated_at: '2026-06-26T12:00:00.000Z',
        });
    });

    it('updates ecommerce inventory on the active product context', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['ecommerce'], ['ecommerceEnabled']);
        fakeSupabase.rowsByTable.store_products = [{
            id: 'product-1',
            project_id: 'project-1',
            name: 'Cafe Premium',
            price: 12,
            quantity: 5,
            inventory_quantity: 5,
            data: {
                name: 'Cafe Premium',
                quantity: 5,
                inventory_quantity: 5,
            },
            created_at: '2026-06-26T12:00:00.000Z',
            updated_at: '2026-06-26T12:00:00.000Z',
        }];
        const productContext = {
            ...context,
            activeEntityType: 'store_product',
            activeEntityId: 'product-1',
        };
        const planned = await runtime.planRequest({
            context: productContext,
            request: 'Actualiza el inventario a 9',
            enabledServices: ['ecommerce'],
            enabledFeatures: ['ecommerceEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_inventory']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: productContext });

        expect(applied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.store_products[0]).toMatchObject({
            quantity: 9,
            inventory_quantity: 9,
        });
        expect(fakeSupabase.rowsByTable.store_products[0].data).toMatchObject({
            quantity: 9,
            inventory_quantity: 9,
            inventoryQuantity: 9,
        });
    });

    it('creates ecommerce category and inactive discount drafts', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['ecommerce'], ['ecommerceEnabled']);
        const categoryPlan = await runtime.planRequest({
            context,
            request: 'Crea una categoria ecommerce llamada Cafes Especiales',
            enabledServices: ['ecommerce'],
            enabledFeatures: ['ecommerceEnabled'],
        });

        expect(categoryPlan.plan.actions.map(action => action.actionType)).toEqual(['create_category']);
        runtime.confirmPlan({ taskId: categoryPlan.task.id, confirmedBy: 'user-1' });
        const categoryApplied = await runtime.applyTask({ taskId: categoryPlan.task.id, context });

        expect(categoryApplied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.store_categories).toHaveLength(1);
        expect(fakeSupabase.rowsByTable.store_categories[0]).toMatchObject({
            project_id: 'project-1',
            store_id: 'project-1',
            position: 0,
        });
        expect(fakeSupabase.rowsByTable.store_categories[0].data).toMatchObject({
            generatedByAI: true,
            needsReview: true,
            safeToEdit: true,
        });

        const discountPlan = await runtime.planRequest({
            context,
            request: 'Crea un descuento de 15% para ecommerce',
            enabledServices: ['ecommerce'],
            enabledFeatures: ['ecommerceEnabled'],
        });

        expect(discountPlan.plan.actions.map(action => action.actionType)).toEqual(['create_discount']);
        runtime.confirmPlan({ taskId: discountPlan.task.id, confirmedBy: 'user-1' });
        const discountApplied = await runtime.applyTask({ taskId: discountPlan.task.id, context });

        expect(discountApplied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.store_discounts).toHaveLength(1);
        expect(fakeSupabase.rowsByTable.store_discounts[0]).toMatchObject({
            project_id: 'project-1',
            type: 'percentage',
            value: 15,
            is_active: false,
            is_automatic: false,
        });
        expect(fakeSupabase.rowsByTable.store_discounts[0].data).toMatchObject({
            status: 'draft',
            generatedByAI: true,
            needsReview: true,
            noAutoPublish: true,
        });
    });

    it('stores generated product copy as a review-gated draft on the active product', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['ecommerce'], ['ecommerceEnabled']);
        fakeSupabase.rowsByTable.store_products = [{
            id: 'product-1',
            project_id: 'project-1',
            name: 'Cafe Premium',
            data: { name: 'Cafe Premium' },
            created_at: '2026-06-26T12:00:00.000Z',
            updated_at: '2026-06-26T12:00:00.000Z',
        }];
        const productContext = {
            ...context,
            activeModule: 'ecommerce' as const,
            activeEntityType: 'product',
            activeEntityId: 'product-1',
        };
        const planned = await runtime.planRequest({
            context: productContext,
            request: 'Genera product copy premium para este producto',
            enabledServices: ['ecommerce'],
            enabledFeatures: ['ecommerceEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['generate_product_copy']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: productContext });

        expect(applied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.store_products[0].data.assistantDrafts.productCopy).toMatchObject({
            status: 'needs_review',
            generatedByAI: true,
            needsReview: true,
            noAutoPublish: true,
        });
        expect(fakeSupabase.rowsByTable.store_products[0].description).toBeUndefined();
    });

    it('creates and rolls back a Media AI image generation draft asset', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['aiFeatures'], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Genera una imagen hero 16:9 para Casa Luna',
            enabledServices: ['aiFeatures'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['generate_image']);
        expect(planned.plan.status).toBe('preview');
        expect(planned.plan.blockers).toEqual([]);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const assets = fakeSupabase.rowsByTable.media_assets;

        expect(applied.task.status).toBe('completed');
        expect(assets).toHaveLength(1);
        expect(assets[0]).toMatchObject({
            category: 'ai_generated',
            type: 'image/svg+xml',
            is_ai_generated: true,
            is_system_asset: false,
            usage_count: 0,
        });
        expect(assets[0].url).toContain('data:image/svg+xml');
        expect(assets[0].metadata).toMatchObject({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            mediaKind: 'image',
            generationStatus: 'draft_prompt',
            generatedByAI: true,
            needsReview: true,
            readyForMediaAI: true,
            noAutoPublish: true,
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.media_assets).toHaveLength(0);
    });

    it('creates a Media AI video generation draft without invoking provider jobs', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['aiFeatures'], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Genera un video promocional corto para Casa Luna',
            enabledServices: ['aiFeatures'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['generate_video']);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const assets = fakeSupabase.rowsByTable.media_assets;

        expect(applied.task.status).toBe('completed');
        expect(assets).toHaveLength(1);
        expect(assets[0]).toMatchObject({
            category: 'ai_generated',
            is_ai_generated: true,
        });
        expect(assets[0].metadata).toMatchObject({
            mediaKind: 'video',
            generationStatus: 'draft_prompt',
            generationMode: 'draft_prompt',
            noAutoPublish: true,
        });
        expect(fakeSupabase.rowsByTable.video_generation_jobs || []).toHaveLength(0);
    });

    it('creates a generic Media AI asset draft from a prompt', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['aiFeatures'], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea un asset visual para la campana de Casa Luna',
            enabledServices: ['aiFeatures'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_asset_from_prompt']);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const assets = fakeSupabase.rowsByTable.media_assets;

        expect(applied.task.status).toBe('completed');
        expect(assets).toHaveLength(1);
        expect(assets[0]).toMatchObject({
            category: 'ai_generated',
            is_ai_generated: true,
            is_system_asset: false,
        });
        expect(assets[0].metadata).toMatchObject({
            mediaKind: 'asset',
            generationStatus: 'draft_prompt',
            generatedByAI: true,
            needsReview: true,
            readyForMediaAI: true,
            noAutoPublish: true,
        });
        expect(fakeSupabase.rowsByTable.video_generation_jobs || []).toHaveLength(0);
    });

    it('attaches an active Media AI asset to a selected website section and rolls it back', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['aiFeatures'], ['websiteBuilder']);
        fakeSupabase.rowsByTable.projects = [buildWebsiteProjectRow()];
        fakeSupabase.rowsByTable.media_assets = [{
            id: 'asset-hero',
            name: 'Hero Image',
            url: 'https://cdn.quimera.test/hero.jpg',
            type: 'image/jpeg',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            metadata: {
                projectId: 'project-1',
                tenantId: 'tenant-1',
            },
        }];
        const mediaContext = {
            ...context,
            activeModule: 'media' as const,
            selectedSection: 'hero',
            activeEntityType: 'media_asset',
            activeEntityId: 'asset-hero',
        };

        const planned = await runtime.planRequest({
            context: mediaContext,
            request: 'Adjunta este asset a la seccion hero',
            enabledServices: ['aiFeatures'],
            enabledFeatures: ['websiteBuilder'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['attach_asset_to_section']);
        expect(planned.plan.blockers).toEqual([]);
        expect(planned.plan.status).toBe('preview');
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                operation: 'attach_media_asset_to_section',
                sectionId: 'hero',
                assetId: 'asset-hero',
                needsReview: true,
                noAutoPublish: true,
            },
            diff: {
                attached: ['media_assets.asset-hero'],
                reviewRequired: true,
                rollback: 'restore_previous_project_website_columns',
            },
        });
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: mediaContext });
        const project = fakeSupabase.rowsByTable.projects[0];

        expect(applied.task.status).toBe('completed');
        expect(project.data.data.hero.imageUrl).toBe('https://cdn.quimera.test/hero.jpg');
        expect(project.pages[0].sectionData.hero.imageUrl).toBe('https://cdn.quimera.test/hero.jpg');
        expect(project.data.data.hero.assistantMediaAttachments.imageUrl).toMatchObject({
            assetId: 'asset-hero',
            assetUrl: 'https://cdn.quimera.test/hero.jpg',
            generatedByAI: true,
            needsReview: true,
            noAutoPublish: true,
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
        });
        expect(project.data.assistantDrafts.website).toMatchObject({
            lastActionType: 'attach_asset_to_section',
            generatedByAI: true,
            needsReview: true,
        });
        expect(fakeSupabase.rowsByTable.media_assets).toHaveLength(1);

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: mediaContext,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.data.hero.imageUrl).toBeUndefined();
        expect(fakeSupabase.rowsByTable.projects[0].pages[0].sectionData.hero.imageUrl).toBeUndefined();
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('runs analytics snapshots from project-scoped module data without writing rows', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['analytics', 'crm', 'ecommerce'], []);
        fakeSupabase.rowsByTable.leads = [
            { id: 'lead-1', project_id: 'project-1', status: 'new', source: 'chat', created_at: '2026-06-26T12:00:00.000Z' },
            { id: 'lead-2', project_id: 'project-2', status: 'new', source: 'chat', created_at: '2026-06-26T12:05:00.000Z' },
        ];
        fakeSupabase.rowsByTable.store_products = [
            { id: 'product-1', project_id: 'project-1', data: { name: 'Cafe Premium' }, created_at: '2026-06-26T12:10:00.000Z' },
        ];

        const planned = await runtime.planRequest({
            context,
            request: 'Analiza analytics y blockers del proyecto Casa Luna',
            enabledServices: ['analytics', 'crm', 'ecommerce'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['identify_blockers']);
        expect(planned.plan.requiresConfirmation).toBe(false);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const snapshot = applied.actions[0].afterSnapshot as any;

        expect(applied.task.status).toBe('completed');
        expect(snapshot.kind).toBe('blockers');
        expect(snapshot.summary).toMatchObject({
            projectId: 'project-1',
            projectName: 'Casa Luna',
            totalSignals: 2,
        });
        expect(snapshot.analytics.modules.leads).toMatchObject({
            count: 1,
            byStatus: { new: 1 },
            sampleIds: ['lead-1'],
        });
        expect(snapshot.analytics.modules.products).toMatchObject({
            count: 1,
            sampleIds: ['product-1'],
        });
        expect(snapshot.analytics.blockers).toContain('ecommerce_has_no_orders');
        expect(fakeSupabase.rowsByTable.leads).toHaveLength(2);
        expect(fakeSupabase.rowsByTable.store_products).toHaveLength(1);
    });

    it('applies safe navigation handlers without mutating module data', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], ['websiteBuilder']);
        const planned = await runtime.planRequest({
            context,
            request: 'Abre el Website Builder',
            enabledServices: [],
            enabledFeatures: ['websiteBuilder'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['open_website_builder']);
        expect(planned.plan.requiresConfirmation).toBe(false);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });

        expect(applied.task.status).toBe('completed');
        expect(applied.actions[0].afterSnapshot).toMatchObject({
            navigation: {
                type: 'view',
                view: 'editor',
                projectId: 'project-1',
                actionType: 'open_website_builder',
                sourceModule: 'global-assistant',
                sourceComponent: 'OperatingLayer',
            },
        });
        expect(fakeSupabase.rowsByTable.projects || []).toHaveLength(0);
    });

    it('updates website section copy through project state and rolls it back', async () => {
        const { fakeSupabase, registry, context } = buildRuntime([], ['websiteBuilder']);
        fakeSupabase.rowsByTable.projects = [buildWebsiteProjectRow()];
        const definition = registry.get('update_section_copy');
        expect(definition?.execute).toBeTypeOf('function');
        expect(definition?.rollback).toBeTypeOf('function');

        const input = {
            projectId: 'project-1',
            sectionId: 'hero',
            path: 'headline',
            value: 'Reserva tu experiencia VIP',
            request: 'Actualiza el headline del hero',
        };
        const action = buildAssistantAction('update_section_copy', input);
        const result = await definition!.execute!(input, { action, context }) as Row;
        const project = fakeSupabase.rowsByTable.projects[0];

        expect(project.data.data.hero.headline).toBe('Reserva tu experiencia VIP');
        expect(project.pages[0].sectionData.hero.headline).toBe('Reserva tu experiencia VIP');
        expect(project.data.assistantDrafts.website).toMatchObject({
            generatedByAI: true,
            needsReview: true,
            sourceModule: 'global-assistant',
            lastActionType: 'update_section_copy',
        });
        const heroBlueprint = project.data.businessBlueprint.websiteBlueprint.sectionBlueprints
            .find((section: Row) => section.type === 'hero');
        expect(heroBlueprint.metadata).toMatchObject({
            userModified: true,
            lockedFromRegeneration: true,
            lastEditedBy: 'user-1',
        });
        expect(result.diff).toMatchObject({
            rollback: 'restore_previous_project_website_columns',
        });

        await definition!.rollback!(input, {
            action,
            snapshot: {
                id: 'rollback-website-copy',
                actionId: action.id,
                beforeSnapshot: result.beforeSnapshot,
                afterSnapshot: result.afterSnapshot,
                createdAt: '2026-06-26T13:30:00.000Z',
            },
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.data.hero.headline).toBe('Original headline');
        expect(fakeSupabase.rowsByTable.projects[0].pages[0].sectionData.hero.headline).toBe('Original headline');
        expect(fakeSupabase.rowsByTable.projects[0].last_updated).toBe('2026-06-26T12:00:00.000Z');
    });

    it('updates website section visibility and order in the canonical project columns', async () => {
        const { fakeSupabase, registry, context } = buildRuntime([], ['websiteBuilder']);
        fakeSupabase.rowsByTable.projects = [buildWebsiteProjectRow()];
        const toggleDefinition = registry.get('toggle_section_visibility');
        const reorderDefinition = registry.get('reorder_sections');

        const toggleInput = {
            projectId: 'project-1',
            sectionId: 'hero',
            visible: false,
            request: 'Oculta la seccion hero',
        };
        await toggleDefinition!.execute!(toggleInput, {
            action: buildAssistantAction('toggle_section_visibility', toggleInput),
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].section_visibility.hero).toBe(false);
        expect(fakeSupabase.rowsByTable.projects[0].data.sectionVisibility.hero).toBe(false);
        expect(fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.websiteBlueprint.sectionVisibility.hero).toBe(false);

        const reorderInput = {
            projectId: 'project-1',
            newOrder: ['features', 'hero'],
            request: 'Reordena las secciones: features primero y hero segundo',
        };
        await reorderDefinition!.execute!(reorderInput, {
            action: buildAssistantAction('reorder_sections', reorderInput),
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].component_order).toEqual(['features', 'hero', 'chatbot']);
        expect(fakeSupabase.rowsByTable.projects[0].data.componentOrder).toEqual(['features', 'hero', 'chatbot']);
        expect(fakeSupabase.rowsByTable.projects[0].pages[0].sections).toEqual(['features', 'hero', 'chatbot']);
        expect(fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.websiteBlueprint.componentOrder).toEqual(['features', 'hero', 'chatbot']);
    });

    it('publishes the current Website Builder snapshot and rolls back publish state', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['ecommerce'], ['websiteBuilder', 'ecommerceEnabled']);
        fakeSupabase.rowsByTable.projects = [buildWebsiteProjectRow()];
        fakeSupabase.rowsByTable.store_products = [
            {
                id: 'product-active',
                project_id: 'project-1',
                name: 'VIP Reservation',
                status: 'active',
                price: 120,
                data: { slug: 'vip-reservation' },
            },
            {
                id: 'product-draft',
                project_id: 'project-1',
                name: 'Draft Product',
                status: 'draft',
            },
        ];
        fakeSupabase.rowsByTable.store_categories = [
            {
                id: 'category-services',
                project_id: 'project-1',
                name: 'Services',
                data: { slug: 'services' },
            },
        ];
        fakeSupabase.rowsByTable.posts = [
            {
                id: 'post-1',
                tenant_id: 'tenant-1',
                title: 'Reserva VIP',
                status: 'published',
                tags: ['project:project-1'],
                published_at: '2026-06-26T10:00:00.000Z',
            },
        ];

        const planned = await runtime.planRequest({
            context,
            request: 'Publica el website',
            enabledServices: ['ecommerce'],
            enabledFeatures: ['websiteBuilder', 'ecommerceEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['publish_website']);
        expect(planned.plan.requiresConfirmation).toBe(true);
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                operation: 'publish_website',
                table: 'projects',
                status: 'Published',
            },
            diff: {
                critical: true,
                rollback: 'restore_previous_project_publish_state',
            },
        });

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const project = fakeSupabase.rowsByTable.projects[0];

        expect(applied.task.status).toBe('completed');
        expect(project).toMatchObject({
            status: 'Published',
            published_at: '2026-06-26T13:30:00.000Z',
            last_updated: '2026-06-26T13:30:00.000Z',
        });
        expect(project.published_data).toMatchObject({
            id: 'project-1',
            name: 'Casa Luna',
            tenantId: 'tenant-1',
            userId: 'user-1',
            data: {
                hero: {
                    headline: 'Original headline',
                },
            },
            componentOrder: ['hero', 'features', 'chatbot'],
            sectionVisibility: { hero: true, features: true, chatbot: true },
            publishedAt: '2026-06-26T13:30:00.000Z',
            globalAssistant: {
                publishedByAssistant: true,
                request: 'Publica el website',
            },
        });
        expect(project.published_data.ecommerce.products.map((item: Row) => item.id)).toEqual(['product-active']);
        expect(project.published_data.ecommerce.categories.map((item: Row) => item.id)).toEqual(['category-services']);
        expect(project.published_data.posts.map((item: Row) => item.id)).toEqual(['post-1']);
        expect(applied.actions[0].diff).toMatchObject({
            critical: true,
            stats: {
                productsPublished: 1,
                categoriesPublished: 1,
                postsPublished: 1,
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0]).toMatchObject({
            status: 'Draft',
            published_at: null,
            published_data: null,
            last_updated: '2026-06-26T12:00:00.000Z',
        });
    });

    it('unpublishes a website and rolls back the previous public snapshot', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], ['websiteBuilder']);
        const projectRow = buildWebsiteProjectRow();
        projectRow.status = 'Published';
        projectRow.published_at = '2026-06-25T10:00:00.000Z';
        projectRow.published_data = {
            id: 'project-1',
            name: 'Casa Luna',
            data: { hero: { headline: 'Published headline' } },
            publishedAt: '2026-06-25T10:00:00.000Z',
        };
        fakeSupabase.rowsByTable.projects = [projectRow];

        const planned = await runtime.planRequest({
            context,
            request: 'Despublica el website',
            enabledServices: [],
            enabledFeatures: ['websiteBuilder'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['unpublish_website']);
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                operation: 'unpublish_website',
                status: 'Draft',
                publishedData: null,
            },
        });

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context });

        expect(fakeSupabase.rowsByTable.projects[0]).toMatchObject({
            status: 'Draft',
            published_at: null,
            published_data: null,
            last_updated: '2026-06-26T13:30:00.000Z',
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0]).toMatchObject({
            status: 'Published',
            published_at: '2026-06-25T10:00:00.000Z',
            published_data: {
                id: 'project-1',
                name: 'Casa Luna',
                data: { hero: { headline: 'Published headline' } },
                publishedAt: '2026-06-25T10:00:00.000Z',
            },
            last_updated: '2026-06-26T12:00:00.000Z',
        });
    });

    it('blocks website publish while Global Assistant drafts still need review', async () => {
        const { fakeSupabase, registry, context } = buildRuntime([], ['websiteBuilder']);
        const projectRow = buildWebsiteProjectRow();
        projectRow.data.assistantDrafts = {
            website: {
                needsReview: true,
            },
        };
        fakeSupabase.rowsByTable.projects = [projectRow];
        const definition = registry.get('publish_website');
        const input = {
            projectId: 'project-1',
            request: 'Publica el website',
        };

        await expect(definition!.execute!(input, {
            action: buildAssistantAction('publish_website', input),
            context,
        })).rejects.toThrow('Global Assistant website draft still needs review');
    });

    it('updates Storefront Builder draft sections and rolls back without publishing', async () => {
        const { fakeSupabase, registry, context } = buildRuntime(['ecommerce'], ['ecommerceEnabled']);
        fakeSupabase.rowsByTable.projects = [buildWebsiteProjectRow()];
        const definition = registry.get('add_storefront_section');
        expect(definition?.execute).toBeTypeOf('function');
        expect(definition?.rollback).toBeTypeOf('function');

        const input = {
            projectId: 'project-1',
            sectionType: 'saleCountdown',
            data: {
                title: 'Oferta VIP',
                endDate: '2026-07-31T23:59:00.000Z',
                variant: 'banner',
            },
            request: 'Agrega un sale countdown al storefront',
        };
        const action = buildAssistantAction('add_storefront_section', input);
        const result = await definition!.execute!(input, { action, context }) as Row;
        const project = fakeSupabase.rowsByTable.projects[0];

        expect(project.component_order).toEqual(['hero', 'features', 'chatbot']);
        expect(project.section_visibility.saleCountdown).toBeUndefined();
        expect(project.data.componentOrder).toEqual(['hero', 'features', 'chatbot']);
        expect(project.data.sectionVisibility.saleCountdown).toBeUndefined();
        expect(project.data.data.storefrontEditor).toMatchObject({
            templateState: 'draft',
            source: 'global-assistant',
            needsReview: true,
            safeToEdit: true,
        });
        expect(project.data.data.storefrontEditor.draft.componentOrder).toContain('saleCountdown');
        expect(project.data.data.storefrontEditor.draft.sectionVisibility.saleCountdown).toBe(true);
        expect(project.data.data.storefrontEditor.draft.sectionSettings.saleCountdown).toMatchObject({
            title: 'Oferta VIP',
            endDate: '2026-07-31T23:59:00.000Z',
            variant: 'banner',
        });
        const saleCountdownBlueprint = project.data.businessBlueprint.storefrontBlueprint.sections
            .find((section: Row) => section.type === 'saleCountdown');
        expect(saleCountdownBlueprint).toMatchObject({
            status: 'needs_review',
            needsReview: true,
            generatedByAI: true,
            userModified: false,
        });
        expect(project.data.assistantDrafts.storefront).toMatchObject({
            noAutoPublish: true,
            sourceModule: 'global-assistant',
            lastActionType: 'add_storefront_section',
        });
        expect(fakeSupabase.rowsByTable.public_stores || []).toHaveLength(0);

        await definition!.rollback!(input, {
            action,
            snapshot: {
                id: 'rollback-storefront-section',
                actionId: action.id,
                beforeSnapshot: result.beforeSnapshot,
                afterSnapshot: result.afterSnapshot,
                createdAt: '2026-06-26T13:30:00.000Z',
            },
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.data.storefrontEditor).toBeUndefined();
        expect(fakeSupabase.rowsByTable.projects[0].component_order).toEqual(['hero', 'features', 'chatbot']);
        expect(fakeSupabase.rowsByTable.public_stores || []).toHaveLength(0);
    });

    it('updates Storefront theme and product-card style as review-gated drafts', async () => {
        const { fakeSupabase, registry, context } = buildRuntime(['ecommerce'], ['ecommerceEnabled']);
        fakeSupabase.rowsByTable.projects = [buildWebsiteProjectRow()];
        const themeDefinition = registry.get('edit_storefront_theme');
        const cardDefinition = registry.get('update_product_card_style');

        const themeInput = {
            projectId: 'project-1',
            updates: {
                primaryColor: '#123456',
                backgroundColor: '#f7f3ed',
                headingColor: '#111111',
            },
            request: 'Cambia colores del theme del storefront',
        };
        await themeDefinition!.execute!(themeInput, {
            action: buildAssistantAction('edit_storefront_theme', themeInput),
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.data.storefrontEditor.draft.themeSettings).toMatchObject({
            primaryColor: '#123456',
            backgroundColor: '#f7f3ed',
            headingColor: '#111111',
        });
        expect(fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.storefrontBlueprint).toMatchObject({
            status: 'needs_review',
            needsReview: true,
        });

        const cardInput = {
            projectId: 'project-1',
            updates: {
                productCardVariant: 'editorial',
            },
            request: 'Cambia product cards del storefront a editorial',
        };
        await cardDefinition!.execute!(cardInput, {
            action: buildAssistantAction('update_product_card_style', cardInput),
            context,
        });

        const editorSettings = fakeSupabase.rowsByTable.projects[0].data.data.storefrontEditor.draft.sectionSettings;
        expect(editorSettings.featuredProducts).toMatchObject({
            cardStyle: 'editorial',
            productCardVariant: 'editorial',
        });
        expect(fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.storefrontBlueprint.productCardVariant).toBe('editorial');
        expect(fakeSupabase.rowsByTable.public_stores || []).toHaveLength(0);
    });

    it('requires confirmation before switching to another resolved project', async () => {
        const { runtime, context } = buildRuntime([], []);
        const projectAwareContext = {
            ...context,
            snapshot: {
                ...context.snapshot,
                availableProjects: [
                    activeProject,
                    {
                        id: 'project-2',
                        name: { es: 'Clinica Mar', en: 'Ocean Clinic' },
                        status: 'Draft',
                        tenantId: 'tenant-1',
                        userId: 'user-1',
                    },
                ],
            },
        };
        const planned = await runtime.planRequest({
            context: projectAwareContext,
            request: 'Cambia al proyecto Clinica Mar',
            enabledServices: [],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['switch_project']);
        expect(planned.plan.requiresConfirmation).toBe(true);
        expect(planned.task.status).toBe('waiting_for_confirmation');
        expect(planned.plan.actions[0].input).toMatchObject({ projectId: 'project-2' });

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context: projectAwareContext });

        expect(applied.task.status).toBe('completed');
        expect(applied.actions[0].afterSnapshot).toMatchObject({
            navigation: {
                view: 'dashboard',
                projectId: 'project-2',
                projectName: 'Clinica Mar',
                actionType: 'switch_project',
            },
        });
    });

    it('searches projects from the Operating Layer context without mutating rows', async () => {
        const { runtime, context } = buildRuntime([], []);
        const projectAwareContext = {
            ...context,
            activeModule: 'project' as const,
            snapshot: {
                ...context.snapshot,
                availableProjects: [
                    activeProject,
                    {
                        id: 'project-2',
                        name: 'Sol Realty',
                        status: 'Published',
                        tenantId: 'tenant-1',
                        userId: 'user-1',
                        description: 'Luxury real estate portfolio',
                    },
                ],
            },
        };
        const planned = await runtime.planRequest({
            context: projectAwareContext,
            request: 'Busca proyectos Sol',
            enabledServices: [],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['search_projects']);
        expect(planned.plan.requiresConfirmation).toBe(false);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: projectAwareContext });

        expect(applied.task.status).toBe('completed');
        expect(applied.actions[0].afterSnapshot).toMatchObject({
            kind: 'project_search',
            query: 'Busca proyectos Sol',
            matchCount: 1,
            matches: [
                expect.objectContaining({
                    id: 'project-2',
                    name: 'Sol Realty',
                    status: 'Published',
                    tenantId: 'tenant-1',
                }),
            ],
            source: 'context_snapshot',
        });
        expect(applied.actions[0].diff).toMatchObject({
            searched: ['projects'],
            mutatesData: false,
        });
    });

    it('searches tenants in Super Admin mode without mutating tenant rows', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], []);
        fakeSupabase.rowsByTable.tenants = [
            {
                id: 'tenant-casa',
                name: 'Casa Luna Workspace',
                email: 'owner@casaluna.test',
                company_name: 'Casa Luna LLC',
                type: 'agency',
                status: 'active',
                subscription_plan: 'agency_pro',
                owner_user_id: 'owner-1',
                limits: { maxProjects: 50, maxUsers: 20, maxStorageGB: 100, maxAiCredits: 5000 },
                usage: { projectCount: 12, userCount: 6, storageUsedGB: 22.5, aiCreditsUsed: 1440 },
                created_at: '2026-06-01T00:00:00.000Z',
                updated_at: '2026-06-26T00:00:00.000Z',
            },
            {
                id: 'tenant-ocean',
                name: 'Ocean Clinic',
                email: 'owner@ocean.test',
                company_name: 'Ocean Health',
                type: 'individual',
                status: 'trial',
                subscription_plan: 'pro',
                owner_user_id: 'owner-2',
            },
        ];
        const superAdminContext = {
            ...context,
            actor: {
                ...context.actor,
                role: 'super_admin',
                mode: 'super_admin' as const,
                isSuperAdmin: true,
            },
            admin: {
                ...context.admin,
                enabled: true,
                adminView: 'tenants',
            },
            activeModule: 'admin' as const,
        };

        const planned = await runtime.planRequest({
            context: superAdminContext,
            request: 'Busca tenants Casa',
            userPermissions: ['assistant:admin:use'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['search_tenants']);
        expect(planned.plan.status).toBe('draft');
        expect(planned.plan.requiresConfirmation).toBe(false);
        expect(planned.plan.blockers).toEqual([]);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: superAdminContext });

        expect(applied.task.status).toBe('completed');
        expect(applied.actions[0].afterSnapshot).toMatchObject({
            kind: 'tenant_search',
            query: 'Busca tenants Casa',
            matchCount: 1,
            source: 'supabase.tenants',
            scope: 'all_tenants',
            matches: [{
                id: 'tenant-casa',
                name: 'Casa Luna Workspace',
                email: 'owner@casaluna.test',
                companyName: 'Casa Luna LLC',
                status: 'active',
                subscriptionPlan: 'agency_pro',
                usage: {
                    projectCount: 12,
                    userCount: 6,
                    storageUsedGB: 22.5,
                    aiCreditsUsed: 1440,
                },
            }],
        });
        expect(applied.actions[0].diff).toMatchObject({
            searched: ['tenants'],
            mutatesData: false,
            actionType: 'search_tenants',
        });
        expect(fakeSupabase.rowsByTable.tenants).toHaveLength(2);
    });

    it('updates project metadata with confirmation and rollback', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], []);
        const projectRow = buildWebsiteProjectRow();
        projectRow.status = 'Draft';
        projectRow.description = 'Old description';
        projectRow.category = 'Hospitality';
        projectRow.tags = ['old'];
        projectRow.data = {
            ...projectRow.data,
            name: 'Casa Luna',
            status: 'Draft',
            description: 'Old description',
            category: 'Hospitality',
            tags: ['old'],
        };
        fakeSupabase.rowsByTable.projects = [projectRow];
        const projectContext = {
            ...context,
            activeModule: 'project' as const,
        };

        const planned = await runtime.planRequest({
            context: projectContext,
            request: 'Cambia el nombre del proyecto a Casa Sol',
            enabledServices: [],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_project_metadata']);
        expect(planned.plan.requiresConfirmation).toBe(true);
        expect(planned.task.status).toBe('waiting_for_confirmation');
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                operation: 'update_project_metadata',
                table: 'projects',
                id: 'project-1',
                noAutoPublish: true,
            },
            diff: {
                rollback: 'restore_previous_project_metadata',
            },
        });

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context: projectContext });

        expect(applied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.projects[0]).toMatchObject({
            name: 'Casa Sol',
            status: 'Draft',
            last_updated: '2026-06-26T13:30:00.000Z',
        });
        expect(fakeSupabase.rowsByTable.projects[0].data).toMatchObject({
            name: 'Casa Sol',
            description: 'Old description',
            category: 'Hospitality',
            tags: ['old'],
            lastUpdated: '2026-06-26T13:30:00.000Z',
            assistantDrafts: {
                projectMetadata: {
                    generatedByAI: true,
                    needsReview: true,
                    sourceComponent: 'OperatingLayer',
                    changedKeys: ['name'],
                },
            },
        });
        expect(applied.actions[0].beforeSnapshot).toMatchObject({
            table: 'projects',
            id: 'project-1',
            row: {
                name: 'Casa Luna',
                description: 'Old description',
                tags: ['old'],
            },
        });
        expect(applied.actions[0].diff).toMatchObject({
            updated: ['projects.project-1.name'],
            rollback: 'restore_previous_project_metadata',
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: projectContext,
        });

        expect(fakeSupabase.rowsByTable.projects[0]).toMatchObject({
            name: 'Casa Luna',
            description: 'Old description',
            category: 'Hospitality',
            tags: ['old'],
            last_updated: '2026-06-26T12:00:00.000Z',
        });
        expect(fakeSupabase.rowsByTable.projects[0].data).toMatchObject({
            name: 'Casa Luna',
            status: 'Draft',
            description: 'Old description',
            category: 'Hospitality',
            tags: ['old'],
        });
    });

    it('blocks appointment plans until required schedule fields are structured', async () => {
        const { runtime, context } = buildRuntime(['appointments'], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea una cita para hablar con el cliente',
            enabledServices: ['appointments'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_appointment']);
        expect(planned.task.status).toBe('failed');
        expect(planned.plan.status).toBe('blocked');
        expect(planned.plan.blockers.join(' ')).toContain('create_appointment: appointment.startDate is required before apply.');
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                table: 'project_appointments',
                status: 'draft',
                needsReview: true,
            },
            diff: {
                created: ['project_appointments.$pending'],
                reviewRequired: true,
            },
        });
    });

    it('creates and rolls back a canonical appointment from a scheduled request', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['appointments'], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea una cita para Ana el 2026-07-01T14:00:00.000Z hasta 2026-07-01T15:00:00.000Z',
            enabledServices: ['appointments'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_appointment']);
        expect(planned.task.status).toBe('waiting_for_confirmation');
        expect(planned.plan.blockers).toEqual([]);

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const appointments = fakeSupabase.rowsByTable.project_appointments;

        expect(applied.task.status).toBe('completed');
        expect(appointments).toHaveLength(1);
        expect(appointments[0]).toMatchObject({
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            start_date: '2026-07-01T14:00:00.000Z',
            end_date: '2026-07-01T15:00:00.000Z',
            source: 'dashboard',
            source_module: 'global-assistant',
            source_component: 'OperatingLayer',
            generated_by_ai: true,
            needs_review: true,
        });
        expect(appointments[0].metadata.globalAssistant).toMatchObject({
            actionType: 'create_appointment',
            needsReview: true,
        });
        expect(appointments[0].notes[0].content).toContain('Customer request / Solicitud del cliente:');
        expect(appointments[0].notes[0].content).toContain('Crea una cita para Ana');
        expect(appointments[0].metadata.customerRequestSummary).toContain('Crea una cita para Ana');

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.project_appointments).toHaveLength(0);
    });

    it('updates and rolls back the active appointment with assistant metadata', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['appointments'], []);
        fakeSupabase.rowsByTable.project_appointments = [{
            id: 'appointment-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            title: 'Initial consultation',
            status: 'scheduled',
            start_date: '2026-07-01T14:00:00.000Z',
            end_date: '2026-07-01T15:00:00.000Z',
            metadata: { source: 'dashboard' },
            created_at: '2026-06-26T12:00:00.000Z',
            updated_at: '2026-06-26T12:00:00.000Z',
        }];
        const appointmentContext = {
            ...context,
            activeEntityType: 'appointment',
            activeEntityId: 'appointment-1',
        };
        const planned = await runtime.planRequest({
            context: appointmentContext,
            request: 'Actualiza esta cita a confirmed',
            enabledServices: ['appointments'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_appointment']);
        expect(planned.task.status).toBe('waiting_for_confirmation');
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: appointmentContext });

        expect(applied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.project_appointments[0]).toMatchObject({
            status: 'confirmed',
            updated_by: 'user-1',
            needs_review: true,
            generated_by_ai: true,
        });
        expect(fakeSupabase.rowsByTable.project_appointments[0].metadata.globalAssistant).toMatchObject({
            actionType: 'update_appointment',
            needsReview: true,
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: appointmentContext,
        });

        expect(fakeSupabase.rowsByTable.project_appointments[0]).toMatchObject({
            status: 'scheduled',
            updated_at: '2026-06-26T12:00:00.000Z',
        });
    });

    it('configures appointment availability in BusinessBlueprint and rolls it back', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['appointments'], []);
        const businessBlueprint = buildBusinessBlueprint();
        fakeSupabase.rowsByTable.projects = [{
            id: 'project-1',
            data: { businessBlueprint },
            last_updated: '2026-06-26T12:00:00.000Z',
        }];
        const planned = await runtime.planRequest({
            context,
            request: 'Configura disponibilidad de appointments para revisar horarios',
            enabledServices: ['appointments'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['configure_availability']);
        expect(planned.task.status).toBe('waiting_for_confirmation');
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const appointmentsBlueprint = fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.appointmentsBlueprint;

        expect(applied.task.status).toBe('completed');
        expect(appointmentsBlueprint).toMatchObject({
            availabilityStatus: 'draft',
            needsReview: true,
        });
        expect(appointmentsBlueprint.availability).toMatchObject({
            blockedTimeSource: 'project_appointment_blocks',
            minimumNoticeMinutes: 120,
            maxAdvanceDays: 60,
            intervalMinutes: 30,
            capacityPerSlot: 1,
        });
        expect(appointmentsBlueprint.metadata.globalAssistant).toMatchObject({
            actionType: 'configure_availability',
            needsReview: true,
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.appointmentsBlueprint.availabilityStatus).toBe(
            businessBlueprint.appointmentsBlueprint.availabilityStatus,
        );
    });

    it('creates a Bio Page draft with assistant review metadata', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea una Bio Page para Casa Luna',
            enabledServices: [],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_bio_page']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const pages = fakeSupabase.rowsByTable.bio_pages;

        expect(applied.task.status).toBe('completed');
        expect(pages).toHaveLength(1);
        expect(pages[0]).toMatchObject({
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            user_id: 'user-1',
            status: 'draft',
        });
        expect(pages[0].settings).toMatchObject({
            generatedByAI: true,
            needsReview: true,
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
        });
    });

    it('edits and rolls back a selected Bio Page link with review metadata', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime([], []);
        fakeSupabase.rowsByTable.bio_pages = [{
            id: 'bio-page-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            user_id: 'user-1',
            slug: 'casa-luna',
            title: 'Casa Luna',
            profile: { name: 'Casa Luna' },
            settings: {},
            status: 'draft',
            created_at: '2026-06-01T00:00:00.000Z',
            updated_at: '2026-06-01T00:00:00.000Z',
        }];
        fakeSupabase.rowsByTable.bio_page_links = [{
            id: 'bio-link-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            bio_page_id: 'bio-page-1',
            title: 'Old Booking',
            url: 'https://old.example/booking',
            visible: true,
            link_type: 'external',
            order_index: 0,
            metadata: { clicks: 3 },
            created_at: '2026-06-01T00:00:00.000Z',
            updated_at: '2026-06-01T00:00:00.000Z',
        }];
        const bioPageContext = {
            ...context,
            activeModule: 'bioPage' as const,
            activeEntityType: 'bio_page_link',
            activeEntityId: 'bio-link-1',
        };

        const planned = await runtime.planRequest({
            context: bioPageContext,
            request: 'Actualiza este link de Bio Page a casaluna.test/reservas',
            enabledServices: [],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['edit_bio_link']);
        expect(planned.plan.status).toBe('preview');
        expect(planned.plan.requiresConfirmation).toBe(true);
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                operation: 'update_bio_page_link',
                table: 'bio_page_links',
                id: 'bio-link-1',
                needsReview: true,
            },
            diff: {
                reviewRequired: true,
                rollback: 'restore_previous_bio_page_link_snapshot',
            },
        });

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context: bioPageContext });
        const link = fakeSupabase.rowsByTable.bio_page_links[0];

        expect(applied.task.status).toBe('completed');
        expect(link).toMatchObject({
            url: 'https://casaluna.test/reservas',
            updated_at: '2026-06-26T13:30:00.000Z',
        });
        expect(link.metadata).toMatchObject({
            clicks: 3,
            needsReview: true,
            generatedByAI: true,
            userModified: false,
            globalAssistant: {
                actionType: 'edit_bio_link',
                module: 'bioPage',
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: bioPageContext,
        });

        expect(fakeSupabase.rowsByTable.bio_page_links[0]).toMatchObject({
            title: 'Old Booking',
            url: 'https://old.example/booking',
            metadata: { clicks: 3 },
            updated_at: '2026-06-01T00:00:00.000Z',
        });
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('publishes and rolls back a reviewed Bio Page without bypassing readiness checks', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime([], []);
        fakeSupabase.rowsByTable.bio_pages = [{
            id: 'bio-page-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            user_id: 'user-1',
            slug: 'casa-luna',
            title: 'Casa Luna',
            profile: { name: 'Casa Luna' },
            settings: { showQuimeraFooter: true },
            status: 'draft',
            published_at: null,
            created_at: '2026-06-01T00:00:00.000Z',
            updated_at: '2026-06-01T00:00:00.000Z',
        }];
        fakeSupabase.rowsByTable.bio_page_links = [{
            id: 'bio-link-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            bio_page_id: 'bio-page-1',
            title: 'Booking',
            url: 'https://casaluna.test/reservas',
            visible: true,
            link_type: 'external',
            order_index: 0,
            metadata: { needsReview: false },
        }];
        fakeSupabase.rowsByTable.bio_page_blocks = [{
            id: 'bio-block-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            bio_page_id: 'bio-page-1',
            type: 'links',
            title: 'Links',
            visible: true,
            needs_review: false,
            order_index: 0,
            data: {},
            settings: {},
        }];
        const bioPageContext = {
            ...context,
            activeModule: 'bioPage' as const,
            activeEntityType: 'bio_page',
            activeEntityId: 'bio-page-1',
        };

        const planned = await runtime.planRequest({
            context: bioPageContext,
            request: 'Publica la Bio Page',
            enabledServices: [],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['publish_bio_page']);
        expect(planned.plan.status).toBe('preview');
        expect(planned.plan.requiresConfirmation).toBe(true);
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                operation: 'publish_bio_page',
                table: 'bio_pages',
                id: 'bio-page-1',
                status: 'published',
            },
            diff: {
                critical: true,
                rollback: 'restore_previous_bio_page_snapshot',
            },
        });

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context: bioPageContext });
        const page = fakeSupabase.rowsByTable.bio_pages[0];

        expect(applied.task.status).toBe('completed');
        expect(page).toMatchObject({
            status: 'published',
            published_at: '2026-06-26T13:30:00.000Z',
            updated_at: '2026-06-26T13:30:00.000Z',
        });
        expect(page.settings).toMatchObject({
            showQuimeraFooter: true,
            lastPublishedBy: 'global-assistant',
            globalAssistant: {
                actionType: 'publish_bio_page',
                module: 'bioPage',
                needsReview: false,
                publishedByAssistant: true,
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: bioPageContext,
        });

        expect(fakeSupabase.rowsByTable.bio_pages[0]).toMatchObject({
            status: 'draft',
            published_at: null,
            updated_at: '2026-06-01T00:00:00.000Z',
            settings: { showQuimeraFooter: true },
        });
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('adds review-gated ChatCore knowledge to the project blueprint and rolls it back', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['chatbot'], ['chatbotEnabled']);
        const businessBlueprint = buildBusinessBlueprint();
        const originalKnowledgeCount = businessBlueprint.chatbotBlueprint.knowledgeSources.length;
        fakeSupabase.rowsByTable.projects = [{
            id: 'project-1',
            data: { businessBlueprint },
        }];
        const planned = await runtime.planRequest({
            context,
            request: 'Entrena ChatCore con el blueprint y el contenido del website',
            enabledServices: ['chatbot'],
            enabledFeatures: ['chatbotEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['sync_chatbot_knowledge']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const nextBlueprint = fakeSupabase.rowsByTable.projects[0].data.businessBlueprint;
        const nextSources = nextBlueprint.chatbotBlueprint.knowledgeSources;

        expect(applied.task.status).toBe('completed');
        expect(nextSources).toHaveLength(originalKnowledgeCount + 1);
        expect(nextSources[nextSources.length - 1]).toMatchObject({
            type: 'business_blueprint',
            ownerModule: 'chatbot-engine',
            visibility: 'internal',
            status: 'needs_review',
            generatedByAI: true,
            needsReview: true,
        });
        expect(fakeSupabase.rowsByTable.chatbot_conversations || []).toHaveLength(0);
        expect(fakeSupabase.rowsByTable.chatbot_messages || []).toHaveLength(0);

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        const rolledBackSources = fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.chatbotBlueprint.knowledgeSources;
        expect(rolledBackSources).toHaveLength(originalKnowledgeCount);
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('runs ChatCore Test Lab from the global assistant without creating visitor chat rows', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['chatbot'], ['chatbotEnabled']);
        const businessBlueprint = buildBusinessBlueprint();
        fakeSupabase.rowsByTable.projects = [{
            id: 'project-1',
            data: { businessBlueprint },
        }];
        const originalEvaluationStatus = businessBlueprint.chatbotBlueprint.testing.evaluationStatus;
        const planned = await runtime.planRequest({
            context,
            request: 'Prueba ChatCore con un cliente que pregunta por reservas',
            enabledServices: ['chatbot'],
            enabledFeatures: ['chatbotEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['test_chatbot']);
        expect(planned.plan.actions[0].input).toMatchObject({
            projectId: 'project-1',
            prompt: 'Prueba ChatCore con un cliente que pregunta por reservas',
        });
        expect(planned.plan.requiresConfirmation).toBe(true);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const nextTesting = fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.chatbotBlueprint.testing;
        const chatbotEvents = fakeSupabase.rowsByTable.chatbot_engine_events;

        expect(applied.task.status).toBe('completed');
        expect(nextTesting.evaluationStatus).toBe('failing');
        expect(chatbotEvents.map(event => event.event_type)).toEqual([
            'chatbot_configuration_updated',
            'chatbot_test_lab_run',
        ]);
        expect(chatbotEvents[1]).toMatchObject({
            project_id: 'project-1',
            source_module: 'global-assistant-operating-layer',
            actor_id: 'user-1',
        });
        expect(fakeSupabase.rowsByTable.chatbot_conversations || []).toHaveLength(0);
        expect(fakeSupabase.rowsByTable.chatbot_messages || []).toHaveLength(0);

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.chatbotBlueprint.testing.evaluationStatus).toBe(originalEvaluationStatus);
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('deploys ChatCore to a surface through Deploy Settings and rolls it back', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['chatbot'], ['chatbotEnabled']);
        const businessBlueprint = buildBusinessBlueprint();
        fakeSupabase.rowsByTable.projects = [{
            id: 'project-1',
            data: { businessBlueprint },
        }];
        const previousStatus = businessBlueprint.chatbotBlueprint.channels.bioPage.status;
        const planned = await runtime.planRequest({
            context,
            request: 'Despliega ChatCore en la Bio Page',
            enabledServices: ['chatbot'],
            enabledFeatures: ['chatbotEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['deploy_chatbot_to_surface']);
        expect(planned.plan.actions[0].input).toMatchObject({
            projectId: 'project-1',
            surface: 'bioPage',
            status: 'deployed',
        });
        expect(planned.plan.requiresConfirmation).toBe(true);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const chatbotBlueprint = fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.chatbotBlueprint;

        expect(applied.task.status).toBe('completed');
        expect(chatbotBlueprint.channels.bioPage).toMatchObject({
            enabled: true,
            status: 'deployed',
            needsReview: false,
            readiness: { isReady: true, blockers: [], warnings: [] },
        });
        expect(chatbotBlueprint.deployment.deployedSurfaces).toContain('bio_page');
        expect(fakeSupabase.rowsByTable.chatbot_engine_events[0]).toMatchObject({
            event_type: 'chatbot_configuration_updated',
            source_module: 'chatbot-engine-dashboard',
            actor_id: 'user-1',
            metadata: {
                configurationType: 'deploySettings',
                targetId: 'bioPage',
                operation: 'surface_deployed',
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.chatbotBlueprint.channels.bioPage.status).toBe(previousStatus);
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('creates a finance invoice draft without creating payments or ledger entries', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['finance'], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Crea una factura de finance para Cliente VIP por 500 dolares',
            enabledServices: ['finance'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_finance_record']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const invoices = fakeSupabase.rowsByTable.accounting_invoices;

        expect(applied.task.status).toBe('completed');
        expect(invoices).toHaveLength(1);
        expect(invoices[0]).toMatchObject({
            project_id: 'project-1',
            status: 'draft',
            currency: 'USD',
            ai_optimized: true,
            source_module: 'global-assistant',
            source_component: 'OperatingLayer',
        });
        expect(fakeSupabase.rowsByTable.payment_intents || []).toHaveLength(0);
        expect(fakeSupabase.rowsByTable.accounting_transactions || []).toHaveLength(0);
    });

    it('updates and rolls back a selected finance invoice without creating payments or ledger entries', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['finance'], []);
        fakeSupabase.rowsByTable.accounting_invoices = [{
            id: 'invoice-1',
            project_id: 'project-1',
            invoice_number: 'INV-0001',
            status: 'sent',
            issue_date: '2026-06-01',
            due_date: '2026-06-30',
            paid_date: null,
            customer_name: 'Cliente VIP',
            customer_email: 'vip@example.com',
            items: [{ id: 'item-1', description: 'Consulting', quantity: 1, unitPrice: 500, total: 500 }],
            subtotal: 500,
            tax_total: 0,
            discount_total: 0,
            total: 500,
            currency: 'USD',
            payment_terms: 'Net 30',
            notes: 'Original notes',
            metadata: { source: 'manual' },
            created_at: '2026-06-01T00:00:00.000Z',
            updated_at: '2026-06-01T00:00:00.000Z',
        }];
        const financeContext = {
            ...context,
            activeModule: 'finance' as const,
            activeEntityType: 'finance_invoice',
            activeEntityId: 'invoice-1',
        };

        const planned = await runtime.planRequest({
            context: financeContext,
            request: 'Marca esta factura como pagada',
            enabledServices: ['finance'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_finance_record']);
        expect(planned.plan.status).toBe('preview');
        expect(planned.plan.requiresConfirmation).toBe(true);
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                operation: 'update_finance_invoice',
                table: 'accounting_invoices',
                id: 'invoice-1',
                noAutoCharge: true,
                noLedgerEntry: true,
            },
            diff: {
                critical: true,
                reviewRequired: true,
                rollback: 'restore_previous_finance_invoice_snapshot',
            },
        });

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context: financeContext });
        const invoice = fakeSupabase.rowsByTable.accounting_invoices[0];

        expect(applied.task.status).toBe('completed');
        expect(invoice).toMatchObject({
            status: 'paid',
            paid_date: '2026-06-26',
            updated_at: '2026-06-26T13:30:00.000Z',
        });
        expect(invoice.metadata).toMatchObject({
            source: 'manual',
            assistantDrafts: {
                financeUpdate: {
                    status: 'needs_review',
                    generatedByAI: true,
                    needsReview: true,
                    noAutoCharge: true,
                    noLedgerEntry: true,
                },
            },
            globalAssistant: {
                actionType: 'update_finance_record',
                module: 'finance',
            },
        });
        expect(fakeSupabase.rowsByTable.payment_intents || []).toHaveLength(0);
        expect(fakeSupabase.rowsByTable.accounting_transactions || []).toHaveLength(0);

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: financeContext,
        });

        expect(fakeSupabase.rowsByTable.accounting_invoices[0]).toMatchObject({
            status: 'sent',
            paid_date: null,
            updated_at: '2026-06-01T00:00:00.000Z',
            metadata: { source: 'manual' },
        });
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('runs a read-only project analytics report across module tables', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(
            ['analytics', 'crm', 'emailMarketing', 'ecommerce'],
            ['emailMarketing', 'ecommerceEnabled'],
        );
        fakeSupabase.rowsByTable.leads = [
            { id: 'lead-1', project_id: 'project-1', status: 'new', source: 'website' },
            { id: 'lead-2', project_id: 'project-1', status: 'won', source: 'bio-page' },
            { id: 'lead-other', project_id: 'project-2', status: 'new' },
        ];
        fakeSupabase.rowsByTable.email_campaigns = [
            { id: 'campaign-1', project_id: 'project-1', status: 'draft', type: 'newsletter' },
        ];
        fakeSupabase.rowsByTable.store_products = [
            { id: 'product-1', project_id: 'project-1', data: { name: 'Cafe Premium' } },
        ];

        const planned = await runtime.planRequest({
            context,
            request: 'Crea un reporte de analytics del proyecto',
            enabledServices: ['analytics', 'crm', 'emailMarketing', 'ecommerce'],
            enabledFeatures: ['emailMarketing', 'ecommerceEnabled'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['run_project_report']);
        expect(planned.plan.requiresConfirmation).toBe(false);

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });

        expect(applied.task.status).toBe('completed');
        expect(applied.actions[0].afterSnapshot).toMatchObject({
            kind: 'report',
            summary: {
                projectId: 'project-1',
                totalSignals: 4,
            },
            analytics: {
                blockers: expect.arrayContaining([
                    'email_marketing_has_no_audiences',
                    'ecommerce_has_no_orders',
                ]),
                modules: {
                    leads: {
                        count: 2,
                        byStatus: {
                            new: 1,
                            won: 1,
                        },
                    },
                    emailCampaigns: {
                        count: 1,
                    },
                    products: {
                        count: 1,
                    },
                },
            },
        });
    });

    it('exports a project analytics report as a non-mutating preview-first artifact', async () => {
        const { runtime, context } = buildRuntime(['analytics'], []);
        const planned = await runtime.planRequest({
            context,
            request: 'Exporta el reporte de analytics en csv',
            enabledServices: ['analytics'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['export_report']);
        expect(planned.plan.status).toBe('preview');
        expect(planned.plan.requiresConfirmation).toBe(false);

        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });
        const applied = await runtime.applyTask({ taskId: planned.task.id, context });

        expect(applied.task.status).toBe('completed');
        expect(applied.actions[0].metadata?.mutatesData).toBe(false);
        expect(applied.actions[0].afterSnapshot).toMatchObject({
            kind: 'export',
            format: 'csv',
            export: {
                fileName: 'quimera-project-report-project-1.csv',
                contentType: 'text/csv',
                status: 'ready_for_download_renderer',
            },
        });
    });

    it('creates and rolls back an unavailable restaurant menu item draft', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['restaurants'], []);
        fakeSupabase.rowsByTable.restaurants = [{
            id: 'restaurant-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            currency: 'USD',
        }];
        const planned = await runtime.planRequest({
            context,
            request: 'Crea un plato nuevo para el restaurante llamado Tacos VIP',
            enabledServices: ['restaurants'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_menu_item']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const menuItems = fakeSupabase.rowsByTable.restaurant_menu_items;

        expect(applied.task.status).toBe('completed');
        expect(menuItems).toHaveLength(1);
        expect(menuItems[0]).toMatchObject({
            tenant_id: 'tenant-1',
            restaurant_id: 'restaurant-1',
            category: 'Specials',
            is_available: false,
            ai_generated: true,
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.restaurant_menu_items).toHaveLength(0);
    });

    it('updates and rolls back an active restaurant menu item through the Action Registry', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['restaurants'], []);
        fakeSupabase.rowsByTable.restaurants = [{
            id: 'restaurant-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            currency: 'USD',
        }];
        fakeSupabase.rowsByTable.restaurant_menu_items = [{
            id: 'item-1',
            restaurant_id: 'restaurant-1',
            name: 'Tacos VIP',
            description: 'Original description',
            category: 'Specials',
            price: 14,
            currency: 'USD',
            is_available: true,
            ai_generated: false,
        }];
        const menuContext = {
            ...context,
            activeEntityType: 'restaurant_menu_item',
            activeEntityId: 'item-1',
        };

        const planned = await runtime.planRequest({
            context: menuContext,
            request: 'Actualiza este plato del menu como no disponible',
            enabledServices: ['restaurants'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_menu']);
        expect(planned.plan.actions[0].input).toMatchObject({
            projectId: 'project-1',
            itemId: 'item-1',
            updates: { isAvailable: false },
        });
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: menuContext });
        expect(applied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.restaurant_menu_items[0]).toMatchObject({
            id: 'item-1',
            is_available: false,
            ai_generated: true,
            updated_at: '2026-06-26T13:30:00.000Z',
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: menuContext,
        });

        expect(fakeSupabase.rowsByTable.restaurant_menu_items[0]).toMatchObject({
            id: 'item-1',
            is_available: true,
            ai_generated: false,
        });
    });

    it('configures and rolls back a restaurant reservation flow as a review-gated draft', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['restaurants'], []);
        fakeSupabase.rowsByTable.restaurants = [{
            id: 'restaurant-1',
            tenant_id: 'tenant-1',
            project_id: 'project-1',
            currency: 'USD',
            reservation_enabled: false,
            settings: {},
        }];

        const planned = await runtime.planRequest({
            context,
            request: 'Crea un flujo de reserva VIP para el restaurante',
            enabledServices: ['restaurants'],
            enabledFeatures: [],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_reservation_flow']);
        expect(planned.plan.actions[0].input).toMatchObject({
            projectId: 'project-1',
            flow: {
                enabled: true,
                confirmationMode: 'manual',
                tablePreferences: ['vip'],
            },
        });
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const restaurant = fakeSupabase.rowsByTable.restaurants[0];

        expect(applied.task.status).toBe('completed');
        expect(restaurant).toMatchObject({
            reservation_enabled: true,
            max_party_size: 8,
            reservation_interval: 30,
            average_table_duration: 90,
            updated_at: '2026-06-26T13:30:00.000Z',
        });
        expect(restaurant.settings).toMatchObject({
            reservationFlowDraft: {
                status: 'needs_review',
                generatedByAI: true,
                needsReview: true,
                noAutoConfirm: true,
                confirmationMode: 'manual',
                tablePreferences: ['vip'],
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.restaurants[0]).toMatchObject({
            reservation_enabled: false,
            settings: {},
        });
    });

    it('creates Realty listing and campaign drafts without publishing listings', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime(['realEstate'], ['realEstateModule']);
        const listingPlan = await runtime.planRequest({
            context,
            request: 'Crea un listing de realty para apartamento frente al mar',
            enabledServices: ['realEstate'],
            enabledFeatures: ['realEstateModule'],
        });

        expect(listingPlan.plan.actions.map(action => action.actionType)).toEqual(['create_listing']);
        runtime.confirmPlan({ taskId: listingPlan.task.id, confirmedBy: 'user-1' });

        const listingApplied = await runtime.applyTask({ taskId: listingPlan.task.id, context });
        const properties = fakeSupabase.rowsByTable.properties;

        expect(listingApplied.task.status).toBe('completed');
        expect(properties).toHaveLength(1);
        expect(properties[0]).toMatchObject({
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            status: 'draft',
            public_enabled: false,
            published_at: null,
        });
        expect(properties[0].metadata).toMatchObject({
            sourceModule: 'global-assistant',
            sourceComponent: 'OperatingLayer',
            generatedByAI: true,
            needsReview: true,
            noAutoPublish: true,
        });

        const campaignPlan = await runtime.planRequest({
            context,
            request: 'Crea una campana de realty para este listing',
            enabledServices: ['realEstate'],
            enabledFeatures: ['realEstateModule'],
        });

        expect(campaignPlan.plan.actions.map(action => action.actionType)).toEqual(['generate_realty_campaign']);
        runtime.confirmPlan({ taskId: campaignPlan.task.id, confirmedBy: 'user-1' });

        const campaignApplied = await runtime.applyTask({ taskId: campaignPlan.task.id, context });
        const campaigns = fakeSupabase.rowsByTable.property_campaigns;

        expect(campaignApplied.task.status).toBe('completed');
        expect(campaigns).toHaveLength(1);
        expect(campaigns[0]).toMatchObject({
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            status: 'draft',
        });
        expect(campaigns[0].content).toMatchObject({
            generatedByAI: true,
            needsReview: true,
        });
    });

    it('edits and rolls back a Realty listing without auto-publishing it', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['realEstate'], ['realEstateModule']);
        const realtyContext = {
            ...context,
            activeEntityType: 'realty_property',
            activeEntityId: 'property-1',
        };
        fakeSupabase.rowsByTable.properties = [{
            id: 'property-1',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            title: 'Ocean View Condo',
            description: 'Original description',
            description_long: 'Original description',
            price: 750000,
            currency: 'USD',
            status: 'draft',
            public_enabled: false,
            metadata: { existing: true },
            updated_at: '2026-06-01T00:00:00.000Z',
        }];

        const planned = await runtime.planRequest({
            context: realtyContext,
            request: 'Actualiza este listing de realty con una descripcion nueva',
            enabledServices: ['realEstate'],
            enabledFeatures: ['realEstateModule'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['edit_listing']);
        expect(planned.plan.actions[0].input).toMatchObject({
            listingId: 'property-1',
        });
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context: realtyContext });
        const property = fakeSupabase.rowsByTable.properties[0];

        expect(applied.task.status).toBe('completed');
        expect(property).toMatchObject({
            public_enabled: false,
            updated_at: '2026-06-26T13:30:00.000Z',
        });
        expect(property.metadata).toMatchObject({
            existing: true,
            assistantDrafts: {
                realtyListingUpdate: {
                    status: 'needs_review',
                    generatedByAI: true,
                    needsReview: true,
                    noAutoPublish: true,
                },
            },
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context: realtyContext,
        });

        expect(fakeSupabase.rowsByTable.properties[0]).toMatchObject({
            metadata: { existing: true },
            updated_at: '2026-06-01T00:00:00.000Z',
        });
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('creates a Realty showing request flow in BusinessBlueprint and rolls it back', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime(['realEstate'], ['realEstateModule']);
        const businessBlueprint = buildRealtyBusinessBlueprint();
        fakeSupabase.rowsByTable.projects = [{
            id: 'project-1',
            data: { businessBlueprint },
        }];
        const originalStatus = businessBlueprint.realEstateBlueprint.showingRequests.status;

        const planned = await runtime.planRequest({
            context,
            request: 'Crea un flujo de showing para realty con confirmacion manual',
            enabledServices: ['realEstate'],
            enabledFeatures: ['realEstateModule'],
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['create_showing_request_flow']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });
        const realtyBlueprint = fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.realEstateBlueprint;

        expect(applied.task.status).toBe('completed');
        expect(realtyBlueprint.showingRequests).toMatchObject({
            enabled: true,
            status: 'needs_review',
            confirmationMode: 'manual',
            needsReview: true,
            readiness: {
                isReady: false,
                blockers: [],
            },
        });
        expect(realtyBlueprint.leadFunnels.showingRequestEnabled).toBe(true);
        expect(realtyBlueprint.propertyPages.showingRequestEnabled).toBe(true);
        expect(realtyBlueprint.integrations.crmTags).toEqual(expect.arrayContaining(['realty', 'showing-request']));

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.projects[0].data.businessBlueprint.realEstateBlueprint.showingRequests.status).toBe(originalStatus);
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('updates service availability with audit evidence and rollback', async () => {
        const { fakeSupabase, runtime, context, auditService } = buildRuntime([], []);
        fakeSupabase.rowsByTable.settings = [{
            id: 'serviceAvailability',
            config: {
                services: {
                    emailMarketing: {
                        status: 'public',
                        updatedAt: '2026-06-01T00:00:00.000Z',
                        updatedBy: 'admin-1',
                    },
                },
                lastUpdated: '2026-06-01T00:00:00.000Z',
                updatedBy: 'admin-1',
            },
            updated_at: '2026-06-01T00:00:00.000Z',
            updated_by: 'admin-1',
        }];

        const planned = await runtime.planRequest({
            context,
            request: 'Cambia service availability de emailMarketing a development por mantenimiento',
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_service_availability']);
        expect(planned.plan.previews[0]).toMatchObject({
            after: {
                table: 'settings',
                id: 'serviceAvailability',
                serviceId: 'emailMarketing',
                status: 'development',
            },
        });
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });

        expect(applied.task.status).toBe('completed');
        expect(fakeSupabase.rowsByTable.settings[0].config.services.emailMarketing).toMatchObject({
            status: 'development',
            updatedAt: '2026-06-26T13:30:00.000Z',
            updatedBy: 'user-1',
        });
        expect(fakeSupabase.rowsByTable.service_audit_logs[0]).toMatchObject({
            service_id: 'emailMarketing',
            previous_status: 'public',
            new_status: 'development',
            source: 'global-assistant',
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.settings[0].config.services.emailMarketing.status).toBe('public');
        expect(fakeSupabase.rowsByTable.service_audit_logs).toHaveLength(1);
        expect(auditService.listEvents().map(event => event.type)).toContain('assistant_action_rolled_back');
    });

    it('updates tenant feature flags with confirmation and rollback', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], []);
        fakeSupabase.rowsByTable.tenants = [{
            id: 'tenant-1',
            name: 'Casa Luna Workspace',
            settings: { enabledFeatures: ['emailMarketing'] },
            updated_at: '2026-06-01T00:00:00.000Z',
        }];

        const planned = await runtime.planRequest({
            context,
            request: 'Activa feature flag realEstateModule para tenant tenant-1',
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_feature_flag']);
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });

        expect(fakeSupabase.rowsByTable.tenants[0].settings.enabledFeatures).toEqual(['emailMarketing', 'realEstateModule']);
        expect(fakeSupabase.rowsByTable.tenants[0].settings.globalAssistantLastFeatureFlagUpdate).toMatchObject({
            featureFlag: 'realEstateModule',
            enabled: true,
            updatedBy: 'user-1',
        });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.tenants[0].settings).toEqual({ enabledFeatures: ['emailMarketing'] });
        expect(fakeSupabase.rowsByTable.tenants[0].updated_at).toBe('2026-06-01T00:00:00.000Z');
    });

    it('updates tenant plan metadata without mutating Stripe and rolls back', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], []);
        fakeSupabase.rowsByTable.tenants = [{
            id: 'tenant-1',
            subscription_plan: 'starter',
            limits: { maxProjects: 1 },
            billing_info: { stripeCustomerId: 'cus_123' },
            updated_at: '2026-06-01T00:00:00.000Z',
        }];

        const planned = await runtime.planRequest({
            context,
            request: 'Actualiza plan tenant tenant-1 a pro',
        });

        expect(planned.plan.actions.map(action => action.actionType)).toEqual(['update_plan']);
        expect(planned.plan.previews[0].diff).toMatchObject({ noStripeMutation: true });
        runtime.confirmPlan({ taskId: planned.task.id, confirmedBy: 'user-1' });

        const applied = await runtime.applyTask({ taskId: planned.task.id, context });

        expect(fakeSupabase.rowsByTable.tenants[0]).toMatchObject({
            subscription_plan: 'pro',
            billing_info: {
                stripeCustomerId: 'cus_123',
                lastPlanChangeSource: 'global-assistant',
                noStripeMutation: true,
            },
        });
        expect(applied.actions[0].afterSnapshot).toMatchObject({ noStripeMutation: true });

        await runtime.rollbackAction({
            taskId: planned.task.id,
            actionId: applied.actions[0].id,
            context,
        });

        expect(fakeSupabase.rowsByTable.tenants[0]).toMatchObject({
            subscription_plan: 'starter',
            limits: { maxProjects: 1 },
            billing_info: { stripeCustomerId: 'cus_123' },
        });
    });

    it('reviews AI logs and platform errors without mutating rows', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], []);
        fakeSupabase.rowsByTable.api_logs = [
            { id: 'log-1', user_id: 'user-1', project_id: 'project-1', feature: 'email', model: 'gemini', success: true, total_tokens: 120, created_at: '2026-06-26T13:00:00.000Z' },
            { id: 'log-2', user_id: 'user-1', project_id: 'project-1', feature: 'chatcore', model: 'gemini', success: false, error: 'Timeout', total_tokens: 20, created_at: '2026-06-26T13:10:00.000Z' },
        ];

        const logsPlan = await runtime.planRequest({
            context,
            request: 'Revisa ai logs de gemini',
        });
        expect(logsPlan.plan.actions.map(action => action.actionType)).toEqual(['review_ai_logs']);
        expect(logsPlan.plan.requiresConfirmation).toBe(false);
        const logsApplied = await runtime.applyTask({ taskId: logsPlan.task.id, context });
        expect(logsApplied.actions[0].afterSnapshot).toMatchObject({
            kind: 'ai_log_review',
            summary: {
                total: 2,
                failures: 1,
            },
        });

        const errorsPlan = await runtime.planRequest({
            context,
            request: 'Revisa errores plataforma',
        });
        expect(errorsPlan.plan.actions.map(action => action.actionType)).toEqual(['review_errors']);
        const errorsApplied = await runtime.applyTask({ taskId: errorsPlan.task.id, context });
        expect(errorsApplied.actions[0].afterSnapshot).toMatchObject({
            kind: 'platform_error_review',
            summary: {
                total: 1,
                failures: 1,
                byErrorFeature: { chatcore: 1 },
            },
        });
        expect(fakeSupabase.rowsByTable.api_logs).toHaveLength(2);
    });

    it('updates global assistant and ChatCore prompt settings without touching visitor chat memory', async () => {
        const { fakeSupabase, runtime, context } = buildRuntime([], []);
        fakeSupabase.rowsByTable.settings = [
            {
                id: 'global_assistant',
                config: { model: 'default', customInstructions: 'Original assistant prompt' },
                updated_at: '2026-06-01T00:00:00.000Z',
                updated_by: 'admin-1',
            },
            {
                id: 'chatbotPrompts',
                config: { welcomeMessage: 'Original ChatCore prompt' },
                updated_at: '2026-06-01T00:00:00.000Z',
                updated_by: 'admin-1',
            },
        ];

        const assistantPlan = await runtime.planRequest({
            context,
            request: 'Actualiza prompt global assistant para exigir preview y confirmacion',
        });
        expect(assistantPlan.plan.actions.map(action => action.actionType)).toEqual(['manage_global_prompts']);
        runtime.confirmPlan({ taskId: assistantPlan.task.id, confirmedBy: 'user-1' });
        const assistantApplied = await runtime.applyTask({ taskId: assistantPlan.task.id, context });

        expect(fakeSupabase.rowsByTable.settings[0].config).toMatchObject({
            model: 'default',
            customInstructions: 'Actualiza prompt global assistant para exigir preview y confirmacion',
            globalAssistantLastPromptUpdate: {
                scope: 'global_assistant',
            },
        });
        expect(assistantApplied.actions[0].afterSnapshot).toMatchObject({
            chatCoreVisitorMemoryAffected: false,
        });

        await runtime.rollbackAction({
            taskId: assistantPlan.task.id,
            actionId: assistantApplied.actions[0].id,
            context,
        });
        expect(fakeSupabase.rowsByTable.settings[0].config.customInstructions).toBe('Original assistant prompt');

        const chatCorePlan = await runtime.planRequest({
            context,
            request: 'Actualiza ChatCore prompts globales para recordar separar visitor chat memory',
        });
        runtime.confirmPlan({ taskId: chatCorePlan.task.id, confirmedBy: 'user-1' });
        const chatCoreApplied = await runtime.applyTask({ taskId: chatCorePlan.task.id, context });

        expect(chatCorePlan.plan.actions[0].input.promptId).toBe('chatbotPrompts');
        expect(fakeSupabase.rowsByTable.settings[1].config).toMatchObject({
            welcomeMessage: 'Original ChatCore prompt',
            customInstructions: 'Actualiza ChatCore prompts globales para recordar separar visitor chat memory',
            globalAssistantLastPromptUpdate: {
                scope: 'chatcore_global_prompts',
            },
        });
        expect(chatCoreApplied.actions[0].afterSnapshot).toMatchObject({
            chatCoreVisitorMemoryAffected: false,
        });
    });
});
