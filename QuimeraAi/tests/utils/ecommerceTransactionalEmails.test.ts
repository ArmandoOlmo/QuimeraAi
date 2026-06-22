import { describe, expect, it } from 'vitest';
import type { WebsitePlan } from '../../types/websitePlan';
import type { EcommerceEmailProvider } from '../../utils/ecommerce/ecommerceEmailService';
import {
    createEcommerceEmailDeliveryIdempotencyKey,
    createEcommerceEmailEventIdempotencyKey,
    createMemoryEcommerceEmailRepository,
    getEcommerceTransactionalEmailTemplate,
    normalizeEcommerceEmailEvent,
    queueAbandonedCartEmail,
    queueOrSendEcommerceEmail,
    sendOrderConfirmation,
    sendPaymentFailedEmail,
    validateEcommerceEmailTemplateVariables,
} from '../../utils/ecommerce/ecommerceEmailService';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';

const now = '2026-06-22T12:00:00.000Z';

function configuredEmailSettings(overrides: Record<string, unknown> = {}) {
    return {
        project_id: 'project_1',
        store_id: 'store_1',
        provider: 'resend',
        api_key_configured: true,
        from_email: 'orders@example.com',
        transactional: {
            orderConfirmation: true,
            paymentFailed: true,
        },
        ...overrides,
    };
}

function configuredStoreSettings(overrides: Record<string, unknown> = {}) {
    return {
        project_id: 'project_1',
        store_id: 'store_1',
        store_name: 'Bici Premium',
        send_order_confirmation: true,
        notify_on_new_order: true,
        notify_on_low_stock: true,
        order_notification_email: 'merchant@example.com',
        ...overrides,
    };
}

function emailContext(overrides: Record<string, unknown> = {}) {
    return {
        store: {
            name: 'Bici Premium',
            storeId: 'store_1',
            publicStoreId: 'public_store_1',
        },
        order: {
            id: 'order_1',
            project_id: 'project_1',
            store_id: 'store_1',
            public_store_id: 'public_store_1',
            order_number: 'ORD-1001',
            customer_id: 'customer_1',
            customer_email: 'customer@example.com',
            customer_name: 'Ada Lovelace',
            payment_status: 'paid',
            status: 'processing',
            total_amount: 120,
            currency: 'USD',
            data: {
                checkoutUrl: 'https://shop.example.com/checkout/cs_1',
                items: [{ productId: 'prod_1', name: 'Road Bike', quantity: 1, totalPrice: 120 }],
            },
        },
        customer: {
            id: 'customer_1',
            email: 'customer@example.com',
            name: 'Ada Lovelace',
        },
        items: [{ productId: 'prod_1', name: 'Road Bike', quantity: 1, totalPrice: 120 }],
        totals: {
            total: 120,
            currency: 'USD',
        },
        payment: {
            status: 'paid',
            paymentIntentId: 'pi_1',
        },
        settings: {
            merchantEmail: 'merchant@example.com',
        },
        ...overrides,
    };
}

function provider() {
    const sent: Array<Parameters<EcommerceEmailProvider['send']>[0]> = [];
    const sender: EcommerceEmailProvider = {
        async send(input) {
            sent.push(input);
            return { providerMessageId: `msg_${sent.length}` };
        },
    };

    return { sender, sent };
}

function ecommercePlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Bici Premium',
            industry: 'ecommerce',
            description: 'A bike store with ecommerce checkout.',
            services: [{ name: 'Bikes', description: 'Premium bikes' }],
            contactInfo: {},
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#0f766e',
                secondary: '#111827',
                accent: '#f59e0b',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#111827',
            },
        },
        contentMap: {
            pages: [{ title: 'Home', purpose: 'landing', summary: 'Home' }],
            products: [],
        },
        componentPlan: [
            { component: 'hero', reason: 'Intro', confidence: 0.9, source: 'ai' },
            { component: 'featuredProducts', reason: 'Commerce intent', confidence: 0.9, source: 'ai' },
            { component: 'footer', reason: 'Footer', confidence: 0.8, source: 'ai' },
        ],
        assetPlan: [],
        qualityGoals: [],
    };
}

describe('ecommerce transactional emails', () => {
    it('normalizes ecommerce email events with required ownership and idempotency fields', () => {
        const event = normalizeEcommerceEmailEvent({
            eventType: 'payment_succeeded',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            storeId: 'store_1',
            engineStoreId: 'engine_store_1',
            orderId: 'order_1',
            checkoutSessionId: 'cs_1',
            customerId: 'customer_1',
            recipientEmail: 'CUSTOMER@example.com',
            providerEventId: 'evt_1',
            payload: { card: 'blocked', total: 120 },
            createdAt: now,
        });

        expect(event).toMatchObject({
            eventId: 'evt_1',
            eventType: 'payment_succeeded',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            storeId: 'store_1',
            engineStoreId: 'engine_store_1',
            orderId: 'order_1',
            checkoutSessionId: 'cs_1',
            customerId: 'customer_1',
            recipientEmail: 'customer@example.com',
            sourceModule: 'ecommerce',
            createdAt: now,
        });
        expect(event.payload.card).toBeUndefined();
        expect(event.idempotencyKey).toBe('tenant_1:project_1:engine_store_1:payment_succeeded:order_1:evt_1');
    });

    it('generates separate delivery idempotency keys per template and recipient', () => {
        const event = normalizeEcommerceEmailEvent({
            eventType: 'payment_succeeded',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            storeId: 'store_1',
            orderId: 'order_1',
            providerEventId: 'evt_1',
            createdAt: now,
        });

        expect(createEcommerceEmailEventIdempotencyKey({
            tenantId: 'tenant_1',
            projectId: 'project_1',
            storeId: 'store_1',
            eventType: 'payment_succeeded',
            orderId: 'order_1',
            providerEventId: 'evt_1',
        })).toBe(event.idempotencyKey);
        expect(createEcommerceEmailDeliveryIdempotencyKey({
            event,
            templateType: 'order_confirmation',
            recipientEmail: 'customer@example.com',
        })).toBe(`${event.idempotencyKey}:order_confirmation:customer@example.com`);
    });

    it('validates required template variables and blocks unconfirmed order confirmations', () => {
        const template = getEcommerceTransactionalEmailTemplate('order_confirmation');
        expect(template.requiredVariables).toContain('paymentConfirmed');

        const result = validateEcommerceEmailTemplateVariables('order_confirmation', emailContext({
            payment: { status: 'pending' },
            order: {
                ...(emailContext().order as Record<string, unknown>),
                payment_status: 'pending',
                paid_at: null,
            },
        }));

        expect(result.valid).toBe(false);
        expect(result.blockers).toContain('Missing required variable: paymentConfirmed');
        expect(result.blockers).toContain('Payment is not confirmed');
    });

    it('skips missing recipients and records an email log payload', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { sender, sent } = provider();

        const result = await sendOrderConfirmation({
            repository: repo,
            provider: sender,
            context: emailContext({
                customer: {},
                order: {
                    ...(emailContext().order as Record<string, unknown>),
                    customer_email: '',
                },
            }),
            eventId: 'evt_missing_email',
            now,
        });

        expect(result.status).toBe('skipped');
        expect(result.skippedReason).toContain('customerEmail');
        expect(sent).toHaveLength(0);
        expect(repo.logs[0]).toMatchObject({
            status: 'skipped',
            template_id: 'order_confirmation',
            template_type: 'order_confirmation',
            idempotency_key: expect.stringContaining('order_confirmation'),
        });
    });

    it('skips order confirmation when payment is not confirmed', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { sender, sent } = provider();

        const result = await sendOrderConfirmation({
            repository: repo,
            provider: sender,
            context: emailContext({
                payment: { status: 'pending', paymentIntentId: 'pi_pending' },
                order: {
                    ...(emailContext().order as Record<string, unknown>),
                    payment_status: 'pending',
                    paid_at: null,
                },
            }),
            eventId: 'pi_pending',
            now,
        });

        expect(result.status).toBe('skipped');
        expect(result.skippedReason).toContain('Payment is not confirmed');
        expect(sent).toHaveLength(0);
    });

    it('records event and provider result fields for sent emails', async () => {
        const event = normalizeEcommerceEmailEvent({
            eventType: 'payment_failed',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            storeId: 'store_1',
            orderId: 'order_1',
            recipientEmail: 'customer@example.com',
            providerEventId: 'evt_failed_1',
            createdAt: now,
        });
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { sender } = provider();

        const result = await sendPaymentFailedEmail({
            repository: repo,
            provider: sender,
            context: emailContext({
                event,
                payment: { status: 'failed', paymentIntentId: 'pi_failed' },
                order: {
                    ...(emailContext().order as Record<string, unknown>),
                    payment_status: 'failed',
                },
            }),
            now,
        });

        expect(result.status).toBe('sent');
        expect(repo.logs[0]).toMatchObject({
            status: 'sent',
            event_type: 'payment_failed',
            template_type: 'payment_failed',
            idempotency_key: `${event.idempotencyKey}:payment_failed:customer@example.com`,
            provider_message_id: 'msg_1',
        });
        expect(repo.logs[0].metadata).toMatchObject({
            sourceModule: 'ecommerce',
            eventId: 'evt_failed_1',
            eventType: 'payment_failed',
        });
    });

    it('keeps abandoned cart recovery in draft/needs-review by default', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { sender, sent } = provider();

        const result = await queueAbandonedCartEmail({
            repository: repo,
            provider: sender,
            context: emailContext(),
            eventId: 'cart_1',
            now,
        });

        expect(result.status).toBe('skipped');
        expect(result.skippedReason).toContain('needs_review');
        expect(sent).toHaveLength(0);
    });

    it('queues instead of sending when provider runtime is missing', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });

        const result = await queueOrSendEcommerceEmail({
            repository: repo,
            type: 'payment_failed',
            context: emailContext({
                payment: { status: 'failed' },
                order: {
                    ...(emailContext().order as Record<string, unknown>),
                    payment_status: 'failed',
                },
            }),
            recipientEmail: 'customer@example.com',
            idempotencyKey: 'manual_provider_missing',
            now,
        });

        expect(result.status).toBe('queued');
        expect(repo.logs[0]).toMatchObject({
            status: 'queued',
            idempotency_key: 'manual_provider_missing',
        });
    });

    it('generates BusinessBlueprint ecommerce email flows as inactive drafts', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(ecommercePlan(), {
            projectId: 'project_1',
            tenantId: 'tenant_1',
            createdBy: 'user_1',
            now,
        });
        const flows = blueprint.emailMarketingBlueprint.flows;

        expect(flows.map(flow => flow.type)).toEqual(expect.arrayContaining([
            'welcome',
            'abandoned_cart',
            'order_confirmation',
            'post_purchase',
            'refund',
            'shipping_confirmation',
            'low_stock_merchant_alert',
        ]));
        expect(flows.every(flow => flow.enabled === false)).toBe(true);
        expect(flows.every(flow => flow.needsReview === true)).toBe(true);
        expect(flows.every(flow => flow.status === 'draft')).toBe(true);
        expect(flows.find(flow => flow.type === 'order_confirmation')?.readiness?.isReady).toBe(false);
    });
});
