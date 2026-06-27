import { describe, expect, it } from 'vitest';
import {
    checkChatbotEcommerceOrderStatus,
    createChatbotLead,
    createChatbotFinanceQuoteRequest,
    createChatbotEcommerceBackInStockRequest,
    createChatbotEcommerceProductInquiry,
    explainChatbotEcommerceReturnsPolicy,
    explainChatbotEcommerceShippingPolicy,
    queueChatbotEmailFollowUpDraft,
    requestChatbotHumanHandoff,
    requestChatbotMediaAssetDraft,
    requestChatbotRealtyLead,
    requestChatbotRestaurantReservation,
    searchChatbotEcommerceProducts,
    scoreChatbotLead,
    sendChatbotInternalAlert,
    startChatbotEcommerceCheckoutIntent,
    subscribeChatbotEmailAudience,
    updateChatbotLead,
} from '../../services/chatbotEngine/chatbotEngineRuntimeActionService';

type Tables = Record<string, any[]>;

class FakeQuery {
    private filters: Array<{ field: string; op: 'eq' | 'in' | 'contains'; value: any }> = [];
    private orFilters: Array<{ field: string; value: any }> = [];
    private insertRows: any[] | null = null;
    private updatePayload: Record<string, any> | null = null;
    private limitCount: number | null = null;

    constructor(private table: string, private tables: Tables) { }

    select() {
        return this;
    }

    eq(field: string, value: any) {
        this.filters.push({ field, op: 'eq', value });
        return this;
    }

    in(field: string, value: any[]) {
        this.filters.push({ field, op: 'in', value });
        return this;
    }

    contains(field: string, value: Record<string, unknown>) {
        this.filters.push({ field, op: 'contains', value });
        return this;
    }

    or(expression: string) {
        this.orFilters.push(
            ...expression.split(',').map((part) => {
                const [field, op, ...rest] = part.split('.');
                return op === 'eq' ? { field, value: rest.join('.') } : null;
            }).filter((item): item is { field: string; value: any } => Boolean(item)),
        );
        return this;
    }

    order() {
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    insert(payload: any) {
        const rows = Array.isArray(payload) ? payload : [payload];
        this.insertRows = rows.map((row) => ({
            id: row.id || `${this.table}_${this.tables[this.table].length + 1}`,
            ...row,
        }));
        this.tables[this.table].push(...this.insertRows);
        return this;
    }

    update(payload: Record<string, any>) {
        this.updatePayload = payload;
        return this;
    }

    async maybeSingle() {
        const result = await this.execute();
        return { data: Array.isArray(result.data) ? result.data[0] || null : result.data, error: result.error };
    }

    async single() {
        return this.maybeSingle();
    }

    then(resolve: (value: any) => unknown, reject?: (error: unknown) => unknown) {
        return this.execute().then(resolve, reject);
    }

    private async execute() {
        if (!this.tables[this.table]) this.tables[this.table] = [];

        if (this.insertRows) {
            return { data: this.limitCount === 1 ? this.insertRows.slice(0, 1) : this.insertRows, error: null };
        }

        const matches = this.tables[this.table].filter((row) => this.matches(row));
        if (this.updatePayload) {
            for (const row of matches) Object.assign(row, this.updatePayload);
            return { data: matches, error: null };
        }

        return {
            data: this.limitCount ? matches.slice(0, this.limitCount) : matches,
            error: null,
        };
    }

    private matches(row: Record<string, any>) {
        const filterMatch = this.filters.every((filter) => {
            if (filter.op === 'eq') return row[filter.field] === filter.value;
            if (filter.op === 'in') return filter.value.includes(row[filter.field]);
            if (filter.op === 'contains') {
                const source = row[filter.field] || {};
                return Object.entries(filter.value).every(([key, value]) => source[key] === value);
            }
            return true;
        });
        if (!filterMatch) return false;
        if (this.orFilters.length === 0) return true;
        return this.orFilters.some((filter) => row[filter.field] === filter.value);
    }
}

function createClient(tables: Tables) {
    return {
        tables,
        from(table: string) {
            if (!tables[table]) tables[table] = [];
            return new FakeQuery(table, tables);
        },
    };
}

const scope = {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    projectUserId: 'user-1',
};

describe('chatbotEngineRuntimeActionService', () => {
    it('escalates conversations for human handoff without losing inbox metadata', async () => {
        const client = createClient({
            social_conversations: [{
                id: 'conversation-1',
                project_id: 'project-1',
                status: 'active',
                tags: ['web-chat'],
                metadata: { existing: true },
                notes: 'Initial note',
                lead_id: 'lead-1',
            }],
        });

        const result = await requestChatbotHumanHandoff({
            supabase: client,
            ...scope,
            conversationId: 'conversation-1',
            reason: 'low_confidence',
            summary: 'Needs a human follow-up.',
            idempotencyKey: 'handoff-key-1',
            now: '2026-06-26T10:00:00.000Z',
        });

        expect(result).toMatchObject({ conversationId: 'conversation-1', status: 'escalated', duplicate: false });
        expect(client.tables.social_conversations[0]).toMatchObject({
            status: 'escalated',
            tags: ['web-chat', 'chatbot-handoff', 'handoff:low_confidence'],
        });
        expect(client.tables.social_conversations[0].metadata.chatbotEngineHandoff).toMatchObject({
            reason: 'low_confidence',
            idempotencyKey: 'handoff-key-1',
        });

        const duplicate = await requestChatbotHumanHandoff({
            supabase: client,
            ...scope,
            conversationId: 'conversation-1',
            reason: 'low_confidence',
            idempotencyKey: 'handoff-key-1',
        });
        expect(duplicate.duplicate).toBe(true);
    });

    it('creates restaurant reservations through Restaurant Engine and feeds CRM leads', async () => {
        const client = createClient({
            restaurants: [{
                id: 'restaurant-1',
                tenant_id: 'tenant-1',
                project_id: 'project-1',
                reservation_enabled: true,
                max_party_size: 8,
            }],
            restaurant_reservations: [],
            leads: [],
        });

        const result = await requestChatbotRestaurantReservation({
            supabase: client,
            ...scope,
            restaurantId: 'restaurant-1',
            customerName: 'Ana Rivera',
            customerEmail: 'ANA@EXAMPLE.COM',
            date: '2026-07-10',
            time: '19:00',
            partySize: 4,
            notes: 'Window table',
            now: new Date('2026-06-26T10:00:00.000Z'),
        });

        expect(result).toMatchObject({ duplicate: false, status: 'pending' });
        expect(client.tables.restaurant_reservations[0]).toMatchObject({
            project_id: 'project-1',
            restaurant_id: 'restaurant-1',
            customer_email: 'ana@example.com',
            source: 'aiAssistant',
        });
        expect(client.tables.restaurant_reservations[0].notes).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.restaurant_reservations[0].notes).toContain('ES: El cliente Ana Rivera, ana@example.com quiere: Window table.');
        expect(client.tables.restaurant_reservations[0].notes).not.toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.leads[0]).toMatchObject({
            project_id: 'project-1',
            source: 'restaurant-reservation',
            email: 'ana@example.com',
        });
        expect(client.tables.leads[0].notes).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.leads[0].notes).toContain('EN: The customer Ana Rivera, ana@example.com wants: Window table.');
        expect(client.tables.leads[0].notes).not.toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.leads[0].custom_data.customerRequestSummary).toContain('Customer request summary');
        expect(client.tables.leads[0].custom_data.customerRequestNote).toContain('Follow-up summary');
    });

    it('captures generic ChatCore leads with readable CRM notes and idempotency', async () => {
        const client = createClient({
            leads: [],
        });

        const result = await createChatbotLead({
            supabase: client,
            ...scope,
            name: 'Carla Lead',
            email: 'CARLA@EXAMPLE.COM',
            phone: '+1 787 555 1111',
            message: 'I want pricing for the premium package.',
            conversationId: 'conversation-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyKey: 'lead-key-1',
            now: new Date('2026-06-26T10:00:00.000Z'),
        });

        expect(result).toMatchObject({
            duplicate: false,
            created: true,
            reviewRequired: true,
            email: 'carla@example.com',
        });
        expect(client.tables.leads[0]).toMatchObject({
            project_id: 'project-1',
            email: 'carla@example.com',
            source: 'chatbot-widget',
            status: 'new',
            tags: expect.arrayContaining(['chatbot', 'chatcore', 'chatbot-widget', 'website']),
        });
        expect(client.tables.leads[0].notes).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.leads[0].notes).toContain('I want pricing for the premium package.');
        expect(client.tables.leads[0].custom_data).toMatchObject({
            chatbotEngine: true,
            actionType: 'create_lead',
            sourceConversationId: 'conversation-1',
            customerRequestSummary: expect.stringContaining('I want pricing for the premium package.'),
            customerRequestNote: expect.stringContaining('Follow-up summary'),
            customerRequestSummaryTarget: 'leads.custom_data.customerRequestSummary,leads.notes',
            idempotencyKey: 'lead-key-1',
        });

        const duplicate = await createChatbotLead({
            supabase: client,
            ...scope,
            name: 'Carla Lead',
            email: 'carla@example.com',
            idempotencyKey: 'lead-key-1',
        });

        expect(duplicate.duplicate).toBe(true);
        expect(client.tables.leads).toHaveLength(1);
    });

    it('updates existing CRM leads with readable ChatCore notes and idempotency', async () => {
        const client = createClient({
            leads: [{
                id: 'lead-1',
                tenant_id: 'tenant-1',
                project_id: 'project-1',
                name: 'Carla Lead',
                email: 'carla@example.com',
                phone: null,
                company: null,
                status: 'new',
                value: 0,
                tags: ['chatbot'],
                notes: 'Initial note',
                custom_data: {
                    chatbotEngine: true,
                    existing: true,
                },
            }],
        });

        const result = await updateChatbotLead({
            supabase: client,
            ...scope,
            leadId: 'lead-1',
            status: 'qualified',
            value: 1200,
            message: 'Carla wants the premium package and asked for a call tomorrow.',
            tags: ['premium', 'callback'],
            leadScore: 82,
            conversationId: 'conversation-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyKey: 'update-lead-key-1',
            now: '2026-06-26T10:05:00.000Z',
        });

        expect(result).toMatchObject({
            leadId: 'lead-1',
            status: 'qualified',
            duplicate: false,
            updated: true,
            reviewRequired: true,
        });
        expect(client.tables.leads[0]).toMatchObject({
            status: 'qualified',
            value: 1200,
            tags: expect.arrayContaining(['chatbot', 'chatcore', 'chatbot-updated', 'premium', 'callback', 'website']),
        });
        expect(client.tables.leads[0].notes).toContain('Initial note');
        expect(client.tables.leads[0].notes).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.leads[0].notes).toContain('Carla wants the premium package and asked for a call tomorrow.');
        expect(client.tables.leads[0].custom_data).toMatchObject({
            chatbotEngine: true,
            existing: true,
            actionType: 'update_lead',
            sourceConversationId: 'conversation-1',
            customerRequestNote: expect.stringContaining('Follow-up summary'),
            leadScore: 82,
            lastChatbotLeadUpdateAt: '2026-06-26T10:05:00.000Z',
        });
        expect(client.tables.leads[0].custom_data.chatbotEngineUpdates).toEqual([
            expect.objectContaining({
                idempotencyKey: 'update-lead-key-1',
                actionType: 'update_lead',
                status: 'qualified',
            }),
        ]);

        const duplicate = await updateChatbotLead({
            supabase: client,
            ...scope,
            leadId: 'lead-1',
            message: 'Carla wants the premium package and asked for a call tomorrow.',
            idempotencyKey: 'update-lead-key-1',
        });

        expect(duplicate).toMatchObject({
            leadId: 'lead-1',
            duplicate: true,
            updated: false,
        });
        expect(client.tables.leads[0].custom_data.chatbotEngineUpdates).toHaveLength(1);
    });

    it('scores existing CRM leads from ChatCore intent signals and stores the result idempotently', async () => {
        const client = createClient({
            leads: [{
                id: 'lead-score-1',
                tenant_id: 'tenant-1',
                project_id: 'project-1',
                name: 'Diego Lead',
                email: 'diego@example.com',
                phone: '+1 787 555 0100',
                company: 'Acme',
                status: 'new',
                source: 'chatbot-widget',
                tags: ['chatbot', 'premium'],
                notes: 'Initial request',
                custom_data: {
                    chatbotEngine: true,
                    customerRequestSummary: 'Diego needs price and wants to schedule a demo.',
                },
            }],
        });

        const result = await scoreChatbotLead({
            supabase: client,
            ...scope,
            leadId: 'lead-score-1',
            message: 'Need price for the premium plan and schedule a demo this week.',
            conversationTranscript: 'Visitor: Need price\nBot: I can help\nVisitor: schedule demo',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyKey: 'score-lead-key-1',
            now: '2026-06-26T11:00:00.000Z',
        });

        expect(result).toMatchObject({
            leadId: 'lead-score-1',
            duplicate: false,
            scored: true,
            highIntent: true,
            reviewRequired: true,
        });
        expect(result.score).toBeGreaterThanOrEqual(80);
        expect(result.probability).toBeGreaterThanOrEqual(60);
        expect(client.tables.leads[0].tags).toEqual(expect.arrayContaining(['chatbot', 'premium', 'chatbot-scored', 'website']));
        expect(client.tables.leads[0].custom_data).toMatchObject({
            chatbotEngine: true,
            actionType: 'score_lead',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            leadScore: result.score,
            aiScore: result.score,
            probability: result.probability,
            scoreLeadAt: '2026-06-26T11:00:00.000Z',
            scoreSource: 'chatbot-engine',
            scoreSignals: expect.objectContaining({
                hasEmail: true,
                hasPhone: true,
                hasCompany: true,
                highIntent: true,
                source: 'chatbot-widget',
            }),
        });
        expect(client.tables.leads[0].custom_data.chatbotEngineUpdates).toEqual([
            expect.objectContaining({
                idempotencyKey: 'score-lead-key-1',
                actionType: 'score_lead',
                score: result.score,
                probability: result.probability,
            }),
        ]);

        const duplicate = await scoreChatbotLead({
            supabase: client,
            ...scope,
            leadId: 'lead-score-1',
            idempotencyKey: 'score-lead-key-1',
        });

        expect(duplicate).toMatchObject({
            leadId: 'lead-score-1',
            duplicate: true,
            scored: false,
            score: result.score,
            probability: result.probability,
        });
        expect(client.tables.leads[0].custom_data.chatbotEngineUpdates).toHaveLength(1);
    });

    it('creates property leads for realty showing requests and keeps pipeline idempotency', async () => {
        const client = createClient({
            properties: [{
                id: 'property-1',
                user_id: 'user-1',
                tenant_id: 'tenant-1',
                project_id: 'project-1',
                title: 'Ocean View',
                status: 'active',
                public_enabled: true,
            }],
            property_leads: [],
        });

        const result = await requestChatbotRealtyLead({
            supabase: client,
            ...scope,
            actionType: 'request_realty_showing',
            propertyId: 'property-1',
            name: 'Luis Vega',
            email: 'luis@example.com',
            preferredDate: '2026-07-08T15:00:00.000Z',
            idempotencyKey: 'realty-key-1',
        });

        expect(result).toMatchObject({ duplicate: false, pipelineEventType: 'showing_request' });
        expect(client.tables.property_leads[0]).toMatchObject({
            project_id: 'project-1',
            property_id: 'property-1',
            email: 'luis@example.com',
            pipeline_idempotency_key: 'realty-key-1',
            pipeline_source: 'chatbot-engine',
        });
        expect(client.tables.property_leads[0].message).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.property_leads[0].message).toContain('Realty showing request: Ocean View');
        expect(client.tables.property_leads[0].message).not.toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.property_leads[0].metadata.customerRequestSummary).toContain('Solicita informacion sobre Ocean View');
        expect(client.tables.property_leads[0].metadata.customerRequestNote).toContain('Follow-up summary');

        const duplicate = await requestChatbotRealtyLead({
            supabase: client,
            ...scope,
            actionType: 'request_realty_showing',
            propertyId: 'property-1',
            name: 'Luis Vega',
            email: 'luis@example.com',
            idempotencyKey: 'realty-key-1',
        });
        expect(duplicate.duplicate).toBe(true);
    });

    it('subscribes consented contacts to Email Marketing audiences after suppression checks', async () => {
        const client = createClient({
            email_suppressions: [],
            email_audiences: [{
                id: 'audience-1',
                project_id: 'project-1',
                store_id: 'project-1',
                static_members: { emails: [], members: [] },
                static_member_count: 0,
                estimated_count: 0,
                accepts_marketing: true,
            }],
        });

        const result = await subscribeChatbotEmailAudience({
            supabase: client,
            ...scope,
            audienceId: 'audience-1',
            email: 'lead@example.com',
            name: 'Lead Contact',
            marketingConsent: true,
            consentSource: 'chatbot-widget',
        });

        expect(result).toMatchObject({ audienceId: 'audience-1', email: 'lead@example.com', staticMemberCount: 1 });
        expect(client.tables.email_audiences[0].static_members.members[0]).toMatchObject({
            email: 'lead@example.com',
            name: 'Lead Contact',
            source: 'chatbot-engine',
            acceptsMarketing: true,
        });
    });

    it('queues chatbot email follow-up drafts for Email Marketing review without sending', async () => {
        const client = createClient({
            email_suppressions: [],
            email_logs: [],
        });

        const result = await queueChatbotEmailFollowUpDraft({
            supabase: client,
            ...scope,
            email: 'Lead@Example.com',
            name: 'Lead Contact',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            subject: 'Personal follow-up',
            html: '<p>Reviewed follow-up draft.</p>',
            text: 'Reviewed follow-up draft.',
            customerRequestSummary: 'Customer asked for a premium package quote and wants a callback tomorrow.',
            conversationTranscript: 'Cliente: Necesito precio del paquete premium.',
            marketingConsent: true,
            idempotencyKey: 'email-follow-up-key-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(result).toMatchObject({
            email: 'lead@example.com',
            duplicate: false,
            status: 'skipped',
            reviewRequired: true,
        });
        expect(result.reviewQueueUrl).toContain('sourceModule=chatcore');
        expect(client.tables.email_logs[0]).toMatchObject({
            project_id: 'project-1',
            type: 'chatbot_email_follow_up',
            email_kind: 'marketing',
            recipient_email: 'lead@example.com',
            recipient_name: 'Lead Contact',
            subject: 'Personal follow-up',
            status: 'skipped',
            skipped_reason: 'needs_review:chatbot_engine_email_follow_up',
            idempotency_key: 'email-follow-up-key-1',
            source_module: 'chatcore',
            source_entity_type: 'lead',
            source_entity_id: 'lead-1',
            sent_at: null,
        });
        expect(client.tables.email_logs[0].metadata).toMatchObject({
            canonicalEmailIntent: true,
            needsReview: true,
            sendMode: 'draft_only',
            noEmailSent: true,
            chatbotEngine: true,
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            html: '<p>Reviewed follow-up draft.</p>',
            text: 'Reviewed follow-up draft.',
            customerRequestSummary: expect.stringContaining('Customer asked for a premium package quote and wants a callback tomorrow.'),
            customerRequestNote: expect.stringContaining('Follow-up summary'),
            customerRequestSummaryTarget: 'email_logs.metadata.customerRequestSummary,canonicalEmail.extra.customerRequestSummary',
        });
        expect(client.tables.email_logs[0].metadata.canonicalEmail).toMatchObject({
            customerRequestSummary: expect.stringContaining('Customer asked for a premium package quote and wants a callback tomorrow.'),
            customerRequestNote: expect.stringContaining('Follow-up summary'),
            customerRequestSummaryTarget: 'email_logs.metadata.customerRequestSummary',
        });

        const duplicate = await queueChatbotEmailFollowUpDraft({
            supabase: client,
            ...scope,
            email: 'lead@example.com',
            leadId: 'lead-1',
            marketingConsent: true,
            idempotencyKey: 'email-follow-up-key-1',
        });
        expect(duplicate.duplicate).toBe(true);
        expect(client.tables.email_logs).toHaveLength(1);
    });

    it('records authenticated internal alert drafts without sending email automatically', async () => {
        const client = createClient({
            email_logs: [],
        });

        const result = await sendChatbotInternalAlert({
            supabase: client,
            ...scope,
            recipientEmail: 'TEAM@EXAMPLE.COM',
            recipientName: 'Team Ops',
            subject: 'Lead needs review',
            message: 'Visitor asked for enterprise pricing and wants a call today.',
            priority: 'high',
            alertType: 'lead_attention',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            idempotencyKey: 'internal-alert-key-1',
            sourceSurface: 'admin_preview',
            sourceModule: 'chatbot-engine-dashboard',
        });

        expect(result).toMatchObject({
            recipientEmail: 'team@example.com',
            duplicate: false,
            status: 'skipped',
            reviewRequired: true,
            noEmailSent: true,
        });
        expect(client.tables.email_logs[0]).toMatchObject({
            project_id: 'project-1',
            type: 'chatbot_internal_alert',
            email_kind: 'transactional',
            recipient_email: 'team@example.com',
            recipient_name: 'Team Ops',
            subject: 'Lead needs review',
            status: 'skipped',
            skipped_reason: 'needs_review:chatbot_engine_internal_alert',
            idempotency_key: 'internal-alert-key-1',
            source_module: 'chatcore',
            source_component: 'chatbot-engine-dashboard',
            source_entity_type: 'lead',
            source_entity_id: 'lead-1',
            sent_at: null,
        });
        expect(client.tables.email_logs[0].metadata).toMatchObject({
            canonicalEmailIntent: true,
            needsReview: true,
            sendMode: 'draft_only',
            noEmailSent: true,
            chatbotEngine: true,
            actionType: 'send_internal_alert',
            alertType: 'lead_attention',
            priority: 'high',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            message: 'Visitor asked for enterprise pricing and wants a call today.',
            customerRequestSummary: expect.stringContaining('Visitor asked for enterprise pricing and wants a call today.'),
            customerRequestNote: expect.stringContaining('Follow-up summary'),
        });

        const duplicate = await sendChatbotInternalAlert({
            supabase: client,
            ...scope,
            recipientEmail: 'team@example.com',
            message: 'Different message should not create a second draft with same key.',
            idempotencyKey: 'internal-alert-key-1',
        });
        expect(duplicate.duplicate).toBe(true);
        expect(client.tables.email_logs).toHaveLength(1);
    });

    it('creates Finance quote request drafts without creating Stripe payments', async () => {
        const client = createClient({
            accounting_invoices: [],
        });

        const result = await createChatbotFinanceQuoteRequest({
            supabase: client,
            ...scope,
            customerName: 'Lead Contact',
            customerEmail: 'Lead@Example.com',
            description: 'Formal quote for a consultation package.',
            amount: 250,
            currency: 'usd',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            idempotencyKey: 'finance-quote-key-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            now: new Date('2026-06-26T10:00:00.000Z'),
        });

        expect(result).toMatchObject({
            duplicate: false,
            status: 'draft',
            total: 250,
            currency: 'USD',
            reviewRequired: true,
            paymentCreated: false,
            paymentLinkCreated: false,
        });
        expect(client.tables.accounting_invoices[0]).toMatchObject({
            project_id: 'project-1',
            invoice_number: 'QTE-20260626-UOTEKEY1',
            status: 'draft',
            customer_name: 'Lead Contact',
            customer_email: 'lead@example.com',
            total: 250,
            currency: 'USD',
            source_module: 'chatcore',
            source_event: 'chatbot_finance_quote_request_created',
            source_entity_type: 'lead',
            source_entity_id: 'lead-1',
            idempotency_key: 'finance-quote-key-1',
        });
        expect(client.tables.accounting_invoices[0].notes).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.accounting_invoices[0].notes).toContain('ES: El cliente Lead Contact, lead@example.com quiere: Formal quote for a consultation package.');
        expect(client.tables.accounting_invoices[0].notes).toContain('Próximo paso sugerido: ES: Revisar totales, impuestos y terminos antes de enviar o crear pago en Stripe.');
        expect(client.tables.accounting_invoices[0].notes).not.toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.accounting_invoices[0].metadata).toMatchObject({
            chatbotEngine: true,
            financeQuoteRequest: true,
            needsReview: true,
            paymentProvider: 'stripe',
            stripePaymentCreated: false,
            paymentCreated: false,
            paymentLinkCreated: false,
            ledgerEntryCreated: false,
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            customerRequestSummary: expect.stringContaining('Formal quote for a consultation package.'),
            customerRequestNote: expect.stringContaining('Follow-up summary'),
            customerRequestSummaryTarget: 'accounting_invoices.metadata.customerRequestSummary,accounting_invoices.notes',
        });

        const duplicate = await createChatbotFinanceQuoteRequest({
            supabase: client,
            ...scope,
            customerName: 'Lead Contact',
            customerEmail: 'lead@example.com',
            idempotencyKey: 'finance-quote-key-1',
        });
        expect(duplicate.duplicate).toBe(true);
        expect(client.tables.accounting_invoices).toHaveLength(1);
    });

    it('creates Media AI draft assets without generating or publishing', async () => {
        const client = createClient({
            media_assets: [],
        });

        const result = await requestChatbotMediaAssetDraft({
            supabase: client,
            ...scope,
            prompt: 'Hero visual for a premium launch campaign.',
            title: 'Premium campaign hero',
            category: 'hero',
            aspectRatio: '16:9',
            style: 'Editorial product photography',
            model: 'review-later',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            idempotencyKey: 'media-draft-key-1',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            now: new Date('2026-06-26T10:00:00.000Z'),
        });

        expect(result).toMatchObject({
            duplicate: false,
            reviewRequired: true,
            generationStarted: false,
            noAutoPublish: true,
        });
        expect(client.tables.media_assets[0]).toMatchObject({
            name: 'Premium campaign hero',
            type: 'image/svg+xml',
            category: 'hero',
            is_ai_generated: true,
            ai_prompt: 'Hero visual for a premium launch campaign.',
            is_system_asset: false,
            usage_count: 0,
            created_by: null,
        });
        expect(client.tables.media_assets[0].url).toContain('data:image/svg+xml');
        expect(client.tables.media_assets[0].description).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.media_assets[0].description).toContain('Hero visual for a premium launch campaign.');
        expect(client.tables.media_assets[0].metadata).toMatchObject({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            chatbotEngine: true,
            actionType: 'request_media_asset',
            sourceEvent: 'chatbot_media_asset_requested',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            leadId: 'lead-1',
            conversationId: 'conversation-1',
            generationStatus: 'draft_prompt',
            generationMode: 'draft_prompt',
            aspectRatio: '16:9',
            style: 'Editorial product photography',
            model: 'review-later',
            generatedByAI: true,
            needsReview: true,
            readyForMediaAI: true,
            noAutoPublish: true,
            generationStarted: false,
            providerJobCreated: false,
            attachedToSurface: false,
            published: false,
            customerRequestSummary: expect.stringContaining('Hero visual for a premium launch campaign.'),
            customerRequestNote: expect.stringContaining('Follow-up summary'),
            customerRequestSummaryTarget: 'media_assets.metadata.customerRequestSummary,media_assets.description',
            idempotencyKey: 'media-draft-key-1',
        });

        const duplicate = await requestChatbotMediaAssetDraft({
            supabase: client,
            ...scope,
            prompt: 'Hero visual for a premium launch campaign.',
            idempotencyKey: 'media-draft-key-1',
        });

        expect(duplicate.duplicate).toBe(true);
        expect(client.tables.media_assets).toHaveLength(1);
    });

    it('blocks chatbot email follow-up drafts without marketing consent', async () => {
        const client = createClient({
            email_suppressions: [],
            email_logs: [],
        });

        await expect(queueChatbotEmailFollowUpDraft({
            supabase: client,
            ...scope,
            email: 'lead@example.com',
            marketingConsent: false,
        })).rejects.toThrow('consentimiento');
        expect(client.tables.email_logs).toHaveLength(0);
    });

    it('blocks suppressed email audience subscriptions', async () => {
        const client = createClient({
            email_suppressions: [{
                id: 'suppression-1',
                project_id: 'project-1',
                email: 'blocked@example.com',
                active: true,
                suppression_scope: 'marketing',
            }],
            email_audiences: [{
                id: 'audience-1',
                project_id: 'project-1',
                store_id: 'project-1',
                static_members: { emails: [], members: [] },
            }],
        });

        await expect(subscribeChatbotEmailAudience({
            supabase: client,
            ...scope,
            audienceId: 'audience-1',
            email: 'blocked@example.com',
            marketingConsent: true,
        })).rejects.toThrow('suprimido');
    });

    it('searches only active renderable ecommerce products for the project', async () => {
        const client = createClient({
            store_categories: [{
                id: 'category-1',
                project_id: 'project-1',
                name: 'Skin Care',
            }],
            store_products: [
                {
                    id: 'product-1',
                    project_id: 'project-1',
                    category_id: 'category-1',
                    name: 'Radiant Serum',
                    slug: 'radiant-serum',
                    description: 'Vitamin C serum for daily glow.',
                    price: 48,
                    currency: 'USD',
                    inventory_quantity: 12,
                    status: 'active',
                    is_featured: true,
                    tags: ['serum', 'glow'],
                    images: [{ url: 'https://cdn.example.com/serum.jpg' }],
                },
                {
                    id: 'product-2',
                    project_id: 'project-1',
                    name: 'Sold Out Serum',
                    slug: 'sold-out-serum',
                    description: 'Unavailable serum.',
                    price: 32,
                    inventory_quantity: 0,
                    status: 'active',
                    tags: ['serum'],
                },
                {
                    id: 'product-3',
                    project_id: 'project-1',
                    name: 'Draft Serum',
                    slug: 'draft-serum',
                    price: 30,
                    inventory_quantity: 5,
                    status: 'draft',
                    tags: ['serum'],
                },
                {
                    id: 'product-4',
                    project_id: 'other-project',
                    name: 'Other Store Serum',
                    slug: 'other-store-serum',
                    price: 30,
                    inventory_quantity: 5,
                    status: 'active',
                    tags: ['serum'],
                },
            ],
        });

        const result = await searchChatbotEcommerceProducts({
            supabase: client,
            ...scope,
            query: 'serum',
        });

        expect(result.totalMatched).toBe(1);
        expect(result.products).toHaveLength(1);
        expect(result.products[0]).toMatchObject({
            id: 'product-1',
            name: 'Radiant Serum',
            categoryName: 'Skin Care',
            productUrl: '/tienda/producto/radiant-serum',
            inStock: true,
        });
    });

    it('creates product inquiries as CRM leads with product context', async () => {
        const client = createClient({
            store_categories: [],
            store_products: [{
                id: 'product-1',
                project_id: 'project-1',
                name: 'Radiant Serum',
                slug: 'radiant-serum',
                price: 48,
                inventory_quantity: 12,
                status: 'active',
                tags: ['serum'],
            }],
            leads: [],
        });

        const result = await createChatbotEcommerceProductInquiry({
            supabase: client,
            ...scope,
            productId: 'product-1',
            name: 'Marta Cruz',
            email: 'MARTA@EXAMPLE.COM',
            quantity: 2,
            message: 'Is this safe for sensitive skin?',
            conversationId: 'conversation-1',
        });

        expect(result).toMatchObject({ duplicate: false, leadId: 'leads_1' });
        expect(client.tables.leads[0]).toMatchObject({
            project_id: 'project-1',
            source: 'product-inquiry',
            email: 'marta@example.com',
            value: 96,
        });
        expect(client.tables.leads[0].custom_data).toMatchObject({
            productId: 'product-1',
            productSlug: 'radiant-serum',
            sourceConversationId: 'conversation-1',
            actionType: 'create_product_inquiry',
        });
        expect(client.tables.leads[0].notes).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.leads[0].notes).toContain('ES: El cliente Marta Cruz, marta@example.com quiere: Is this safe for sensitive skin?');
        expect(client.tables.leads[0].notes).not.toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.leads[0].custom_data.customerRequestSummary).toContain('Is this safe for sensitive skin?');
        expect(client.tables.leads[0].custom_data.customerRequestNote).toContain('Follow-up summary');
    });

    it('explains shipping and returns only from configured ecommerce settings', async () => {
        const client = createClient({
            store_settings: [{
                id: 'settings-1',
                project_id: 'project-1',
                store_name: 'Quimera Shop',
                currency: 'USD',
                shipping_zones: [{
                    name: 'Puerto Rico',
                    countries: ['PR'],
                    rates: [{ id: 'standard', name: 'Standard', price: 6, estimatedDays: '3-5' }],
                }],
                free_shipping_threshold: 75,
                terms_and_conditions_url: 'https://example.com/terms',
                data: {
                    returnPolicy: {
                        acceptsReturns: true,
                        returnWindowDays: 14,
                        conditions: ['Unused item'],
                        process: ['Contact support'],
                        refundMethod: 'Original payment method',
                    },
                },
            }],
        });

        const shipping = await explainChatbotEcommerceShippingPolicy({
            supabase: client,
            ...scope,
        });
        expect(shipping).toMatchObject({
            configured: true,
            storeName: 'Quimera Shop',
            freeShippingThreshold: 75,
            currency: 'USD',
            termsUrl: 'https://example.com/terms',
        });
        expect(shipping.methods[0]).toMatchObject({
            id: 'standard',
            zoneName: 'Puerto Rico',
            name: 'Standard',
            price: 6,
            estimatedDays: '3-5',
        });

        const returns = await explainChatbotEcommerceReturnsPolicy({
            supabase: client,
            ...scope,
        });
        expect(returns).toMatchObject({
            configured: true,
            acceptsReturns: true,
            returnWindowDays: 14,
            refundMethod: 'Original payment method',
            termsUrl: 'https://example.com/terms',
        });
        expect(returns.conditions).toEqual(['Unused item']);
        expect(returns.process).toEqual(['Contact support']);
    });

    it('does not fabricate ecommerce policies when settings are missing', async () => {
        const client = createClient({ store_settings: [] });

        const shipping = await explainChatbotEcommerceShippingPolicy({
            supabase: client,
            ...scope,
        });
        const returns = await explainChatbotEcommerceReturnsPolicy({
            supabase: client,
            ...scope,
        });

        expect(shipping).toMatchObject({
            configured: false,
            methods: [],
            freeShippingThreshold: null,
        });
        expect(shipping.message).toContain('ES:');
        expect(shipping.message).toContain('EN:');
        expect(returns).toMatchObject({
            configured: false,
            conditions: [],
            process: [],
            returnWindowDays: null,
        });
        expect(returns.message).toContain('ES:');
        expect(returns.message).toContain('EN:');
    });

    it('records back-in-stock requests without duplicating notifications or leads', async () => {
        const client = createClient({
            store_categories: [],
            store_products: [{
                id: 'product-1',
                project_id: 'project-1',
                name: 'Radiant Serum',
                slug: 'radiant-serum',
                price: 48,
                inventory_quantity: 0,
                status: 'active',
                images: ['https://example.com/serum.jpg'],
            }],
            store_stock_notifications: [],
            leads: [],
        });

        const result = await createChatbotEcommerceBackInStockRequest({
            supabase: client,
            ...scope,
            productSlug: 'radiant-serum',
            email: 'BUYER@EXAMPLE.COM',
            name: 'Buyer',
            conversationId: 'conversation-1',
            sourceSurface: 'storefront',
        });
        const retry = await createChatbotEcommerceBackInStockRequest({
            supabase: client,
            ...scope,
            productId: 'product-1',
            email: 'buyer@example.com',
            name: 'Buyer',
            conversationId: 'conversation-1',
            sourceSurface: 'storefront',
        });

        expect(result).toMatchObject({
            duplicate: false,
            notificationId: 'store_stock_notifications_1',
            leadId: 'leads_1',
        });
        expect(retry).toMatchObject({
            duplicate: true,
            notificationId: 'store_stock_notifications_1',
            leadId: 'leads_1',
        });
        expect(client.tables.store_stock_notifications).toHaveLength(1);
        expect(client.tables.store_stock_notifications[0]).toMatchObject({
            project_id: 'project-1',
            store_id: 'project-1',
            product_id: 'product-1',
            email: 'buyer@example.com',
            notified: false,
        });
        expect(client.tables.leads[0]).toMatchObject({
            source: 'back-in-stock-request',
            email: 'buyer@example.com',
            value: 48,
        });
        expect(client.tables.leads[0].notes).toContain('Resumen de seguimiento / Follow-up summary');
        expect(client.tables.leads[0].notes).toContain('Wants to be notified when Radiant Serum is back in stock');
        expect(client.tables.leads[0].notes).not.toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.leads[0].custom_data).toMatchObject({
            actionType: 'back_in_stock_request',
            productId: 'product-1',
            stockNotificationId: 'store_stock_notifications_1',
        });
        expect(client.tables.leads[0].custom_data.customerRequestSummary).toContain('Radiant Serum');
        expect(client.tables.leads[0].custom_data.customerRequestNote).toContain('Follow-up summary');
    });

    it('returns order status only after customer email verification', async () => {
        const client = createClient({
            store_orders: [{
                id: 'order-1',
                project_id: 'project-1',
                order_number: 'Q-1001',
                customer_email: 'buyer@example.com',
                status: 'processing',
                payment_status: 'paid',
                fulfillment_status: 'partial',
                tracking_number: 'TRACK123',
                total: 84,
                currency: 'USD',
                items: [{ quantity: 1 }, { quantity: 2 }],
            }],
        });

        await expect(checkChatbotEcommerceOrderStatus({
            supabase: client,
            ...scope,
            orderNumber: 'Q-1001',
            email: 'wrong@example.com',
        })).rejects.toThrow('requiere email');

        const result = await checkChatbotEcommerceOrderStatus({
            supabase: client,
            ...scope,
            orderNumber: 'Q-1001',
            email: 'buyer@example.com',
        });

        expect(result).toMatchObject({
            orderId: 'order-1',
            orderNumber: 'Q-1001',
            status: 'processing',
            paymentStatus: 'paid',
            fulfillmentStatus: 'partial',
            itemCount: 3,
            trackingNumber: 'TRACK123',
        });
    });

    it('prepares checkout intent without creating payments from ChatCore', async () => {
        const client = createClient({
            store_categories: [],
            store_products: [
                {
                    id: 'product-1',
                    project_id: 'project-1',
                    name: 'Radiant Serum',
                    slug: 'radiant-serum',
                    price: 48,
                    currency: 'USD',
                    inventory_quantity: 12,
                    status: 'active',
                },
                {
                    id: 'product-2',
                    project_id: 'project-1',
                    name: 'Hydration Mask',
                    slug: 'hydration-mask',
                    price: 18,
                    currency: 'USD',
                    inventory_quantity: 3,
                    status: 'active',
                },
            ],
        });

        const result = await startChatbotEcommerceCheckoutIntent({
            supabase: client,
            ...scope,
            items: [
                { productId: 'product-1', quantity: 2 },
                { productSlug: 'hydration-mask', quantity: 1 },
            ],
            idempotencyKey: 'checkout-key-1',
        });

        expect(result).toMatchObject({
            checkoutUrl: '/checkout',
            storefrontCheckoutUrl: '/store/project-1/checkout',
            idempotencyKey: 'checkout-key-1',
            subtotal: 114,
            currency: 'USD',
            paymentCreated: false,
            requiresCheckoutPage: true,
        });
        expect(result.items.map(item => item.productId)).toEqual(['product-1', 'product-2']);
    });
});
