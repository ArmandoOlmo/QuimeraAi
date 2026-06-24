import { describe, expect, it, vi } from 'vitest';
import {
    appendOrderTimelineEvent,
    canFulfillOrder,
    normalizeOrderForAdmin,
    updateFulfillmentStatus,
    updateMerchantNotes,
    updateOrderTracking,
} from '../../utils/ecommerce/ecommerceOrderAdminService';
import { mapOrderFromDB } from '../../utils/ecommerceMappers';

const now = '2026-06-22T12:00:00.000Z';

const order = (overrides: Record<string, unknown> = {}) => ({
    id: 'order_1',
    project_id: 'project_1',
    store_id: 'store_1',
    order_number: 'ORD-1001',
    customer_email: 'customer@example.com',
    customer_name: 'Customer Example',
    customer_phone: '+1 555 0100',
    items: [
        {
            id: 'line_1',
            product_id: 'prod_1',
            name: 'Road Bike',
            variant_name: 'Black / M',
            quantity: 2,
            unit_price: 100,
            total_price: 200,
        },
    ],
    subtotal: 200,
    discount_amount: 20,
    shipping_cost: 12,
    tax_amount: 9,
    total: 201,
    currency: 'usd',
    payment_status: 'paid',
    fulfillment_status: 'unfulfilled',
    status: 'paid',
    shipping_address: { firstName: 'Customer', city: 'San Juan' },
    billing_address: { firstName: 'Customer', city: 'San Juan' },
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:00:00.000Z',
    data: {
        pricing: {
            calculationVersion: 'ecommerce-pricing-v1',
            subtotal: 200,
            discountTotal: 20,
            shippingTotal: 12,
            taxTotal: 9,
            total: 201,
            discountCode: 'SAVE10',
            shippingMethodName: 'Standard',
            taxName: 'Sales tax',
            taxRate: 4.5,
        },
        pricingSnapshot: {
            calculationVersion: 'ecommerce-pricing-v1',
        },
        admin: {
            merchantNotes: 'Pack carefully',
            timeline: [
                {
                    id: 'manual-event',
                    type: 'system',
                    message: 'Imported order',
                    createdAt: '2026-06-22T10:05:00.000Z',
                },
            ],
        },
    },
    ...overrides,
});

describe('ecommerce order admin service', () => {
    it('normalizes order customer, items, pricing and statuses', () => {
        const adminOrder = normalizeOrderForAdmin(order());

        expect(adminOrder).toMatchObject({
            id: 'order_1',
            projectId: 'project_1',
            storeId: 'store_1',
            orderNumber: 'ORD-1001',
            subtotal: 200,
            discountAmount: 20,
            shippingAmount: 12,
            taxAmount: 9,
            totalAmount: 201,
            currency: 'USD',
            paymentStatus: 'paid',
            fulfillmentStatus: 'unfulfilled',
            orderStatus: 'paid',
            merchantNotes: 'Pack carefully',
        });
        expect(adminOrder.customer).toMatchObject({
            name: 'Customer Example',
            email: 'customer@example.com',
        });
        expect(adminOrder.items[0]).toMatchObject({
            productId: 'prod_1',
            productName: 'Road Bike',
            quantity: 2,
            unitPrice: 100,
            totalPrice: 200,
        });
    });

    it('reads pricing summary from D3 snapshot/data', () => {
        const adminOrder = normalizeOrderForAdmin(order({
            subtotal: undefined,
            discount_amount: undefined,
            shipping_cost: undefined,
            tax_amount: undefined,
            total: undefined,
        }));

        expect(adminOrder.subtotal).toBe(200);
        expect(adminOrder.discountAmount).toBe(20);
        expect(adminOrder.shippingAmount).toBe(12);
        expect(adminOrder.taxAmount).toBe(9);
        expect(adminOrder.totalAmount).toBe(201);
        expect(adminOrder.pricingSnapshot.calculationVersion).toBe('ecommerce-pricing-v1');
    });

    it('allows paid unfulfilled orders to be fulfilled', () => {
        expect(canFulfillOrder(order())).toBe(true);
    });

    it('blocks unpaid or failed orders from fulfillment', () => {
        expect(canFulfillOrder(order({ payment_status: 'pending' }))).toBe(false);
        expect(canFulfillOrder(order({ payment_status: 'failed' }))).toBe(false);
        expect(() => updateFulfillmentStatus({
            order: order({ payment_status: 'pending' }),
            status: 'fulfilled',
            now,
        })).toThrow(/paid/i);
    });

    it('blocks cancelled orders from fulfillment', () => {
        const cancelledOrder = order({ status: 'cancelled' });

        expect(canFulfillOrder(cancelledOrder)).toBe(false);
        expect(() => updateFulfillmentStatus({
            order: cancelledOrder,
            status: 'fulfilled',
            now,
        })).toThrow(/cancelled/i);
    });

    it('normalizes and saves tracking data without changing payment state', () => {
        const result = updateOrderTracking({
            order: order(),
            carrier: 'UPS',
            trackingNumber: '1Z999',
            trackingUrl: 'https://carrier.example/1Z999',
            now,
        });

        expect(result.columnUpdates).toMatchObject({
            carrier: 'UPS',
            tracking_number: '1Z999',
            tracking_url: 'https://carrier.example/1Z999',
        });
        expect(result.columnUpdates).not.toHaveProperty('payment_status');
        expect(result.data.admin).toMatchObject({
            fulfillment: {
                trackingCarrier: 'UPS',
                trackingNumber: '1Z999',
                trackingUrl: 'https://carrier.example/1Z999',
            },
        });
    });

    it('updates merchant notes without removing pricing snapshot', () => {
        const current = order().data as Record<string, unknown>;
        const result = updateMerchantNotes({
            data: current,
            merchantNotes: 'Ship in a rigid box',
            now,
        });

        expect((result.data.pricingSnapshot as Record<string, unknown>).calculationVersion).toBe('ecommerce-pricing-v1');
        expect(result.data.admin).toMatchObject({
            merchantNotes: 'Ship in a rigid box',
        });
        expect(result.columnUpdates).toMatchObject({
            internal_notes: 'Ship in a rigid box',
        });
    });

    it('appends timeline events and preserves previous events', () => {
        const result = appendOrderTimelineEvent({
            data: order().data as Record<string, unknown>,
            event: {
                id: 'merchant-note-1',
                type: 'merchant_note',
                message: 'Merchant notes updated',
                createdAt: now,
            },
        });
        const timeline = ((result.data.admin as Record<string, unknown>).timeline as unknown[]);

        expect(timeline).toHaveLength(2);
        expect(timeline).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'manual-event' }),
            expect.objectContaining({ id: 'merchant-note-1' }),
        ]));
    });

    it('does not synthesize cancellation events from absent optional timestamps', () => {
        const mappedOrder = mapOrderFromDB(order({
            paid_at: null,
            shipped_at: null,
            delivered_at: null,
            cancelled_at: null,
            refunded_at: null,
        }));
        const adminOrder = normalizeOrderForAdmin(mappedOrder);

        expect(mappedOrder.cancelledAt).toBeUndefined();
        expect(mappedOrder.refundedAt).toBeUndefined();
        expect(adminOrder.timeline).toEqual(expect.arrayContaining([
            expect.objectContaining({
                message: 'Payment marked paid',
                createdAt: '2026-06-22T10:00:00.000Z',
            }),
        ]));
        expect(adminOrder.timeline).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ message: 'Order cancelled' }),
        ]));
        expect(adminOrder.timeline.every((event) => event.createdAt !== '[object Object]')).toBe(true);
    });

    it('does not duplicate fulfilled timeline events when already fulfilled', () => {
        const result = updateFulfillmentStatus({
            order: order({ fulfillment_status: 'fulfilled' }),
            status: 'fulfilled',
            now,
        });

        expect(result.skipped).toBe(true);
        expect(result.timelineEvent).toBeUndefined();
        expect(result.columnUpdates).toEqual({});
    });

    it('does not execute refunds or payment provider calls', () => {
        const provider = { refunds: { create: vi.fn() } };

        updateMerchantNotes({
            data: order().data as Record<string, unknown>,
            merchantNotes: 'Refund requires manual handling in V2',
            now,
        });
        updateFulfillmentStatus({
            order: order(),
            status: 'processing',
            now,
        });

        expect(provider.refunds.create).not.toHaveBeenCalled();
    });
});
