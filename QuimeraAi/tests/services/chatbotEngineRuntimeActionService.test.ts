import { describe, expect, it } from 'vitest';
import {
    checkChatbotEcommerceOrderStatus,
    createChatbotFinanceQuoteRequest,
    createChatbotEcommerceBackInStockRequest,
    createChatbotEcommerceProductInquiry,
    explainChatbotEcommerceReturnsPolicy,
    explainChatbotEcommerceShippingPolicy,
    queueChatbotEmailFollowUpDraft,
    requestChatbotHumanHandoff,
    requestChatbotRealtyLead,
    requestChatbotRestaurantReservation,
    searchChatbotEcommerceProducts,
    startChatbotEcommerceCheckoutIntent,
    subscribeChatbotEmailAudience,
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
        expect(client.tables.restaurant_reservations[0].notes).toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.restaurant_reservations[0].notes).toContain('Lo que desea el cliente / What the customer wants: Window table');
        expect(client.tables.restaurant_reservations[0].notes).toContain('Cita / Appointment: Restaurant reservation');
        expect(client.tables.leads[0]).toMatchObject({
            project_id: 'project-1',
            source: 'restaurant-reservation',
            email: 'ana@example.com',
        });
        expect(client.tables.leads[0].notes).toContain('Lo que desea el cliente / What the customer wants: Window table');
        expect(client.tables.leads[0].custom_data.customerRequestSummary).toContain('Customer request summary');
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
        expect(client.tables.property_leads[0].message).toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.property_leads[0].message).toContain('Cita / Appointment: Realty showing request: Ocean View');
        expect(client.tables.property_leads[0].metadata.customerRequestSummary).toContain('What the customer wants');

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
        expect(client.tables.leads[0].notes).toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.leads[0].notes).toContain('Lo que desea el cliente / What the customer wants: Is this safe for sensitive skin?');
        expect(client.tables.leads[0].custom_data.customerRequestSummary).toContain('Ecommerce product inquiry for Radiant Serum');
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
        expect(client.tables.leads[0].notes).toContain('Resumen de solicitud del cliente / Customer request summary');
        expect(client.tables.leads[0].notes).toContain('Wants to be notified when Radiant Serum is back in stock');
        expect(client.tables.leads[0].custom_data).toMatchObject({
            actionType: 'back_in_stock_request',
            productId: 'product-1',
            stockNotificationId: 'store_stock_notifications_1',
        });
        expect(client.tables.leads[0].custom_data.customerRequestSummary).toContain('Back-in-stock request for Radiant Serum');
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
