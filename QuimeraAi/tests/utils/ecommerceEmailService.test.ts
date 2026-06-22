import { describe, expect, it } from 'vitest';
import type { EcommerceEmailProvider } from '../../utils/ecommerce/ecommerceEmailService';
import {
    createMemoryEcommerceEmailRepository,
    queueOrSendEcommerceEmail,
    renderEcommerceEmail,
    sendLowStockAlert,
    sendMerchantNewOrderAlert,
    sendOrderConfirmation,
    sendPaymentFailedEmail,
} from '../../utils/ecommerce/ecommerceEmailService';
import type { EcommerceEmailRenderContext } from '../../types/ecommerceEmail';

const now = '2026-06-22T12:00:00.000Z';

function configuredEmailSettings(overrides: Record<string, unknown> = {}) {
    return {
        project_id: 'project_1',
        store_id: 'project_1',
        provider: 'resend',
        api_key_configured: true,
        from_email: 'orders@example.com',
        from_name: 'Bici Premium',
        reply_to: 'support@example.com',
        transactional: {
            orderConfirmation: true,
            newOrderNotification: true,
            lowStockNotification: true,
        },
        ...overrides,
    };
}

function configuredStoreSettings(overrides: Record<string, unknown> = {}) {
    return {
        project_id: 'project_1',
        store_id: 'project_1',
        store_name: 'Bici Premium',
        send_order_confirmation: true,
        notify_on_new_order: true,
        notify_on_low_stock: true,
        order_notification_email: 'merchant@example.com',
        data: {
            storeEmail: 'merchant@example.com',
        },
        ...overrides,
    };
}

function emailContext(overrides: Partial<EcommerceEmailRenderContext> = {}): EcommerceEmailRenderContext {
    return {
        store: {
            id: 'store_public_1',
            name: 'Bici Premium',
            url: 'https://shop.example.com',
            storeId: 'project_1',
            publicStoreId: 'store_public_1',
        },
        order: {
            id: 'order_1',
            project_id: 'project_1',
            store_id: 'project_1',
            public_store_id: 'store_public_1',
            order_number: 'ORD-1001',
            customer_email: 'customer@example.com',
            customer_name: 'Ada Lovelace',
            payment_status: 'paid',
            status: 'processing',
            total_amount: 120,
            currency: 'USD',
            data: {
                inventory: {
                    committedAt: now,
                },
                items: [
                    {
                        productId: 'prod_1',
                        name: 'Road Bike',
                        quantity: 1,
                        unitPrice: 100,
                        totalPrice: 100,
                    },
                ],
            },
        },
        customer: {
            email: 'customer@example.com',
            name: 'Ada Lovelace',
        },
        items: [
            {
                productId: 'prod_1',
                name: 'Road Bike',
                quantity: 1,
                unitPrice: 100,
                totalPrice: 100,
            },
        ],
        totals: {
            subtotal: 100,
            shippingTotal: 10,
            taxTotal: 10,
            total: 120,
            currency: 'USD',
        },
        payment: {
            status: 'paid',
            paymentIntentId: 'pi_1',
        },
        products: [],
        settings: {
            merchantEmail: 'merchant@example.com',
            ordersUrl: '/ecommerce/orders',
            productsUrl: '/ecommerce/products',
        },
        ...overrides,
    };
}

function createProvider(options: { fail?: boolean } = {}) {
    const sent: Array<Parameters<EcommerceEmailProvider['send']>[0]> = [];
    const provider: EcommerceEmailProvider = {
        async send(input) {
            sent.push(input);
            if (options.fail) {
                throw new Error('Resend unavailable');
            }
            return { providerMessageId: `msg_${sent.length}` };
        },
    };

    return { provider, sent };
}

describe('ecommerce email service', () => {
    it('logs skipped without throwing when email settings are missing', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            storeSettings: configuredStoreSettings(),
        });
        const { provider, sent } = createProvider();

        const result = await sendOrderConfirmation({
            repository: repo,
            provider,
            context: emailContext(),
            eventId: 'evt_missing_settings',
            now,
        });

        expect(result.status).toBe('skipped');
        expect(result.skippedReason).toContain('Email settings');
        expect(sent).toHaveLength(0);
        expect(repo.logs).toHaveLength(1);
        expect(repo.logs[0]).toMatchObject({
            status: 'skipped',
            template_id: 'order_confirmation',
            recipient_email: 'customer@example.com',
        });
    });

    it('renders and logs an order confirmation email', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { provider, sent } = createProvider();
        const rendered = renderEcommerceEmail({
            type: 'order_confirmation',
            context: emailContext(),
        });

        const result = await sendOrderConfirmation({
            repository: repo,
            provider,
            context: emailContext(),
            eventId: 'pi_order_confirmation',
            now,
        });

        expect(rendered.subject).toContain('ORD-1001');
        expect(rendered.text).toContain('Road Bike');
        expect(rendered.text).toContain('$120.00');
        expect(result.status).toBe('sent');
        expect(result.providerMessageId).toBe('msg_1');
        expect(sent[0]).toMatchObject({
            to: ['customer@example.com'],
            subject: expect.stringContaining('ORD-1001'),
        });
        expect(repo.logs[0]).toMatchObject({
            status: 'sent',
            template_id: 'order_confirmation',
            provider_message_id: 'msg_1',
        });
    });

    it('renders merchant order alerts and uses the merchant email from store settings', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings({ order_notification_email: 'ops@example.com' }),
        });
        const { provider, sent } = createProvider();

        const result = await sendMerchantNewOrderAlert({
            repository: repo,
            provider,
            context: emailContext({ settings: {} }),
            eventId: 'pi_merchant_alert',
            now,
        });

        expect(result.status).toBe('sent');
        expect(result.recipientEmail).toBe('ops@example.com');
        expect(sent[0].to).toEqual(['ops@example.com']);
        expect(sent[0].html).toContain('New paid order');
        expect(repo.logs[0]).toMatchObject({
            status: 'sent',
            template_id: 'merchant_new_order',
            recipient_email: 'ops@example.com',
        });
    });

    it('dedupes duplicate webhook events with the same idempotency key', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { provider, sent } = createProvider();
        const input = {
            repository: repo,
            provider,
            context: emailContext(),
            eventId: 'pi_duplicate',
            now,
        };

        const first = await sendOrderConfirmation(input);
        const second = await sendOrderConfirmation(input);

        expect(first.status).toBe('sent');
        expect(second.status).toBe('skipped');
        expect(second.skippedReason).toContain('Duplicate');
        expect(sent).toHaveLength(1);
        expect(repo.logs).toHaveLength(1);
    });

    it('logs provider failures without throwing to webhook callers', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { provider } = createProvider({ fail: true });

        const result = await sendOrderConfirmation({
            repository: repo,
            provider,
            context: emailContext(),
            eventId: 'pi_provider_failure',
            now,
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('Resend unavailable');
        expect(repo.logs[0]).toMatchObject({
            status: 'failed',
            error_message: 'Resend unavailable',
        });
    });

    it('sends payment failed emails idempotently when customer email is valid', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { provider, sent } = createProvider();
        const context = emailContext({
            payment: {
                status: 'failed',
                paymentIntentId: 'pi_failed',
            },
            order: {
                ...emailContext().order,
                payment_status: 'failed',
                status: 'pending',
            },
        });

        const first = await sendPaymentFailedEmail({
            repository: repo,
            provider,
            context,
            eventId: 'pi_failed',
            now,
        });
        const second = await sendPaymentFailedEmail({
            repository: repo,
            provider,
            context,
            eventId: 'pi_failed',
            now,
        });

        expect(first.status).toBe('sent');
        expect(second.status).toBe('skipped');
        expect(sent).toHaveLength(1);
        expect(repo.logs).toHaveLength(1);
        expect(repo.logs[0].template_id).toBe('payment_failed');
    });

    it('logs low stock alerts once for the same product and threshold event', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { provider, sent } = createProvider();
        const product = {
            id: 'prod_low',
            name: 'Spare Tube',
            inventory_quantity: 1,
            low_stock_threshold: 2,
        };
        const context = emailContext({
            products: [product],
        });

        const first = await sendLowStockAlert({
            repository: repo,
            provider,
            context,
            product,
            currentQuantity: 1,
            threshold: 2,
            eventId: 'pi_low_stock',
            now,
        });
        const second = await sendLowStockAlert({
            repository: repo,
            provider,
            context,
            product,
            currentQuantity: 1,
            threshold: 2,
            eventId: 'pi_low_stock',
            now,
        });

        expect(first.status).toBe('sent');
        expect(second.status).toBe('skipped');
        expect(sent).toHaveLength(1);
        expect(repo.logs).toHaveLength(1);
        expect(repo.logs[0]).toMatchObject({
            template_id: 'low_stock_alert',
            recipient_email: 'merchant@example.com',
        });
    });

    it('skips missing customer email while still allowing merchant alerts', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });
        const { provider, sent } = createProvider();
        const context = emailContext({
            customer: {},
            order: {
                ...emailContext().order,
                customer_email: '',
                customer_name: '',
            },
        });

        const customerResult = await sendOrderConfirmation({
            repository: repo,
            provider,
            context,
            eventId: 'pi_no_customer',
            now,
        });
        const merchantResult = await sendMerchantNewOrderAlert({
            repository: repo,
            provider,
            context,
            eventId: 'pi_no_customer',
            now,
        });

        expect(customerResult.status).toBe('skipped');
        expect(merchantResult.status).toBe('sent');
        expect(sent).toHaveLength(1);
        expect(repo.logs).toHaveLength(2);
        expect(repo.logs.map((log) => log.template_id)).toEqual(['order_confirmation', 'merchant_new_order']);
    });

    it('queues instead of sending when settings exist but no provider is available', async () => {
        const repo = createMemoryEcommerceEmailRepository({
            emailSettings: configuredEmailSettings(),
            storeSettings: configuredStoreSettings(),
        });

        const result = await queueOrSendEcommerceEmail({
            repository: repo,
            type: 'order_confirmation',
            context: emailContext(),
            recipientEmail: 'customer@example.com',
            idempotencyKey: 'manual_queue',
            now,
        });

        expect(result.status).toBe('queued');
        expect(repo.logs[0]).toMatchObject({
            status: 'queued',
            template_id: 'order_confirmation',
        });
    });
});
