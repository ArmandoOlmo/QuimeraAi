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

    return { fakeSupabase, runtime, context, auditService };
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

describe('Global Assistant default action handlers', () => {
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
});
