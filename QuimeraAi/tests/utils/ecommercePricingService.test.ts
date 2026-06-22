import { describe, expect, it } from 'vitest';
import type {
    PricingDiscountRule,
    PricingProductSnapshot,
    PricingStoreSettings,
} from '../../types/ecommercePricing.ts';
import {
    calculateCartSubtotal,
    calculateCheckoutTotals,
} from '../../utils/ecommerce/ecommercePricingService.ts';

const now = '2026-06-22T12:00:00.000Z';

const product = (overrides: Partial<PricingProductSnapshot> = {}): PricingProductSnapshot => ({
    id: 'prod_1',
    name: 'Road Bike',
    status: 'active',
    price: 100,
    quantity: 10,
    trackInventory: true,
    categoryId: 'cat_1',
    images: [{ url: 'https://example.com/bike.jpg' }],
    ...overrides,
});

const discount = (overrides: Partial<PricingDiscountRule> = {}): PricingDiscountRule => ({
    id: 'disc_1',
    code: 'SAVE10',
    type: 'percentage',
    value: 10,
    appliesTo: 'all',
    usedCount: 0,
    isActive: true,
    isAutomatic: false,
    canCombine: false,
    startsAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
});

const settings = (overrides: Partial<PricingStoreSettings> = {}): PricingStoreSettings => ({
    currency: 'USD',
    taxEnabled: false,
    taxRate: 0,
    taxIncluded: false,
    shippingZones: [
        {
            id: 'zone_us',
            name: 'US',
            countries: ['US'],
            rates: [
                {
                    id: 'standard',
                    name: 'Standard',
                    price: 12,
                    estimatedDays: '3-5 days',
                },
            ],
        },
    ],
    freeShippingThreshold: 0,
    ...overrides,
});

const cartItems = [{ productId: 'prod_1', quantity: 2 }];

describe('ecommerce pricing service', () => {
    it('calculates subtotal from valid server products', () => {
        const subtotal = calculateCartSubtotal({
            items: cartItems,
            products: [product()],
            currency: 'USD',
        });

        expect(subtotal.errors).toHaveLength(0);
        expect(subtotal.subtotal).toBe(200);
        expect(subtotal.items[0]).toMatchObject({
            productId: 'prod_1',
            unitPrice: 100,
            totalPrice: 200,
        });
    });

    it('fails pricing for draft products', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 1 }],
            products: [product({ status: 'draft' })],
            settings: settings({ shippingDisabled: true }),
            now,
        });

        expect(result.errors[0]).toContain('not available');
        expect(result.total).toBe(0);
    });

    it('applies percentage discounts without exceeding subtotal', () => {
        const result = calculateCheckoutTotals({
            cartItems,
            products: [product()],
            discounts: [discount({ value: 15 })],
            discountCode: 'SAVE10',
            settings: settings({ shippingDisabled: true }),
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.subtotal).toBe(200);
        expect(result.discountAmount).toBe(30);
        expect(result.total).toBe(170);
    });

    it('applies fixed discounts and keeps total non-negative', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 1 }],
            products: [product({ price: 40 })],
            discounts: [discount({ type: 'fixed_amount', value: 500 })],
            discountCode: 'SAVE10',
            settings: settings({ shippingDisabled: true }),
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.discountAmount).toBe(40);
        expect(result.total).toBe(0);
    });

    it('rejects inactive and expired requested discounts', () => {
        const inactive = calculateCheckoutTotals({
            cartItems,
            products: [product()],
            discounts: [discount({ isActive: false })],
            discountCode: 'SAVE10',
            settings: settings({ shippingDisabled: true }),
            now,
        });
        const expired = calculateCheckoutTotals({
            cartItems,
            products: [product()],
            discounts: [discount({ endsAt: '2026-01-01T00:00:00.000Z' })],
            discountCode: 'SAVE10',
            settings: settings({ shippingDisabled: true }),
            now,
        });

        expect(inactive.errors[0]).toContain('inactive');
        expect(expired.errors[0]).toContain('expired');
    });

    it('does not combine discounts unless both allow combining', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 1 }],
            products: [product({ price: 100 })],
            discounts: [
                discount({ id: 'disc_auto_1', code: 'AUTO10', isAutomatic: true, value: 10, canCombine: false }),
                discount({ id: 'disc_auto_2', code: 'AUTO20', isAutomatic: true, value: 20, canCombine: true }),
            ],
            settings: settings({ shippingDisabled: true }),
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.appliedDiscounts).toHaveLength(1);
        expect(result.discountAmount).toBe(10);
        expect(result.warnings).toContain('discount_not_combined');
    });

    it('applies free shipping discounts server-side', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 1 }],
            products: [product({ price: 100 })],
            discounts: [discount({ type: 'free_shipping', value: 0, code: 'FREESHIP' })],
            discountCode: 'FREESHIP',
            settings: settings(),
            shippingAddress: { country: 'US' },
            shippingMethodId: 'standard',
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.shippingAmount).toBe(0);
        expect(result.appliedDiscounts[0]).toMatchObject({ freeShipping: true });
    });

    it('applies free shipping threshold after discounts', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 1 }],
            products: [product({ price: 60 })],
            settings: settings({ freeShippingThreshold: 50 }),
            shippingAddress: { country: 'US' },
            shippingMethodId: 'standard',
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.shippingAmount).toBe(0);
        expect(result.shippingMethod?.name).toBe('Free Shipping');
    });

    it('supports local pickup as a zero-cost server-side shipping method', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 1 }],
            products: [product({ price: 60 })],
            settings: settings({ pickupEnabled: true }),
            shippingMethodId: 'pickup',
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.shippingAmount).toBe(0);
        expect(result.shippingMethod?.source).toBe('pickup');
    });

    it('calculates flat taxes', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 1 }],
            products: [product({ price: 100 })],
            settings: settings({
                shippingDisabled: true,
                taxEnabled: true,
                taxRate: 8.5,
                taxName: 'Sales tax',
            }),
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.taxAmount).toBe(8.5);
        expect(result.taxBreakdown[0]).toMatchObject({
            name: 'Sales tax',
            rate: 8.5,
            taxableAmount: 100,
        });
    });

    it('returns zero tax and a warning when taxes are not configured', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 1 }],
            products: [product({ price: 100 })],
            settings: settings({ shippingDisabled: true, taxEnabled: false }),
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.taxAmount).toBe(0);
        expect(result.warnings).toContain('tax_not_configured');
    });

    it('creates a checkout pricing snapshot', () => {
        const result = calculateCheckoutTotals({
            cartItems,
            products: [product()],
            discounts: [discount()],
            discountCode: 'SAVE10',
            settings: settings({
                taxEnabled: true,
                taxRate: 10,
            }),
            shippingAddress: { country: 'US' },
            shippingMethodId: 'standard',
            now,
        });

        expect(result.snapshot).toMatchObject({
            calculationVersion: 'ecommerce-pricing-v1',
            currency: 'USD',
            subtotal: 200,
            discountTotal: 20,
            shippingTotal: 12,
            taxTotal: 18,
            total: 210,
        });
        expect(result.snapshot.appliedDiscounts[0].code).toBe('SAVE10');
    });

    it('ignores client-sent lower totals and recalculates from server products', () => {
        const result = calculateCheckoutTotals({
            cartItems: [{ productId: 'prod_1', quantity: 2 }],
            products: [product({ price: 50 })],
            settings: settings({ shippingDisabled: true }),
            clientTotals: { total: 1 },
            now,
        });

        expect(result.errors).toHaveLength(0);
        expect(result.total).toBe(100);
        expect(result.warnings).toContain('client_total_ignored');
    });
});
