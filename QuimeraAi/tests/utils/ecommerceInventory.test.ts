import { describe, expect, it } from 'vitest';
import type { InventoryProductSnapshot, InventoryReservation } from '../../types/ecommerceInventory';
import {
    commitInventoryReservation,
    createMemoryInventoryRepository,
    expireInventoryReservations,
    getInventoryAvailability,
    recordInventoryMovement,
    releaseInventoryReservation,
    reserveInventoryForCheckout,
    validateCartInventory,
} from '../../utils/ecommerce/inventoryService';

const now = new Date('2026-06-22T00:00:00.000Z');

const product = (overrides: Partial<InventoryProductSnapshot> = {}): InventoryProductSnapshot => ({
    id: 'prod_1',
    projectId: 'project_1',
    status: 'active',
    quantity: 5,
    inventoryQuantity: 5,
    trackInventory: true,
    lowStockThreshold: 2,
    ...overrides,
});

const reservation = (overrides: Partial<InventoryReservation> = {}): InventoryReservation => ({
    id: 'res_1',
    projectId: 'project_1',
    productId: 'prod_1',
    quantity: 2,
    status: 'active',
    expiresAt: '2026-06-22T00:15:00.000Z',
    idempotencyKey: 'reserve_1',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
});

describe('ecommerce inventory service', () => {
    it('keeps untracked products purchasable and skips reservations', async () => {
        const repo = createMemoryInventoryRepository({
            products: [product({ trackInventory: false, quantity: 0 })],
        });

        const availability = getInventoryAvailability({
            product: repo.products[0],
            requestedQuantity: 100,
            now,
        });
        const result = await reserveInventoryForCheckout({
            repository: repo,
            projectId: 'project_1',
            checkoutIdempotencyKey: 'checkout_untracked',
            items: [{ productId: 'prod_1', quantity: 100 }],
            now,
        });

        expect(availability.mode).toBe('untracked');
        expect(availability.isAvailable).toBe(true);
        expect(result.success).toBe(true);
        expect(result.reservations).toHaveLength(0);
        expect(result.skippedItems).toHaveLength(1);
    });

    it('calculates tracked availability from on-hand minus active reservations', () => {
        const availability = getInventoryAvailability({
            product: product({ quantity: 5 }),
            reservations: [reservation({ quantity: 2 })],
            now,
        });

        expect(availability.onHand).toBe(5);
        expect(availability.activeReserved).toBe(2);
        expect(availability.available).toBe(3);
        expect(availability.isAvailable).toBe(true);
    });

    it('fails cart validation when requested quantity exceeds availability', () => {
        const validation = validateCartInventory({
            items: [{ productId: 'prod_1', quantity: 4 }],
            products: [product({ quantity: 5 })],
            reservations: [reservation({ quantity: 2 })],
            now,
        });

        expect(validation.valid).toBe(false);
        expect(validation.issues[0]).toMatchObject({
            code: 'insufficient_stock',
            requestedQuantity: 4,
            availableQuantity: 3,
        });
    });

    it('reserves inventory idempotently for duplicate checkout attempts', async () => {
        const repo = createMemoryInventoryRepository({
            products: [product({ quantity: 5 })],
        });
        const input = {
            repository: repo,
            projectId: 'project_1',
            checkoutIdempotencyKey: 'checkout_1',
            items: [{ productId: 'prod_1', quantity: 2 }],
            now,
        };

        const first = await reserveInventoryForCheckout(input);
        const second = await reserveInventoryForCheckout(input);

        expect(first.success).toBe(true);
        expect(second.success).toBe(true);
        expect(repo.reservations).toHaveLength(1);
        expect(repo.reservations[0].quantity).toBe(2);
        expect(repo.movements.filter((movement) => movement.type === 'reserve')).toHaveLength(1);
    });

    it('commits a reservation idempotently without double decrementing stock', async () => {
        const repo = createMemoryInventoryRepository({
            products: [product({ quantity: 5 })],
        });
        const reserve = await reserveInventoryForCheckout({
            repository: repo,
            projectId: 'project_1',
            checkoutIdempotencyKey: 'checkout_commit',
            orderId: 'order_1',
            paymentIntentId: 'pi_1',
            items: [{ productId: 'prod_1', quantity: 2 }],
            now,
        });

        await commitInventoryReservation({
            repository: repo,
            checkoutIdempotencyKey: 'checkout_commit',
            paymentIntentId: 'pi_1',
            now,
        });
        await commitInventoryReservation({
            repository: repo,
            checkoutIdempotencyKey: 'checkout_commit',
            paymentIntentId: 'pi_1',
            now,
        });

        expect(reserve.reservations[0].status).toBe('active');
        expect(repo.products[0].quantity).toBe(3);
        expect(repo.reservations[0].status).toBe('committed');
        expect(repo.movements.filter((movement) => movement.type === 'commit')).toHaveLength(1);
    });

    it('releases active reservations without decrementing stock', async () => {
        const repo = createMemoryInventoryRepository({
            products: [product({ quantity: 5 })],
        });
        await reserveInventoryForCheckout({
            repository: repo,
            projectId: 'project_1',
            checkoutIdempotencyKey: 'checkout_release',
            items: [{ productId: 'prod_1', quantity: 2 }],
            now,
        });

        await releaseInventoryReservation({
            repository: repo,
            checkoutIdempotencyKey: 'checkout_release',
            reason: 'payment_failed',
            now,
        });

        expect(repo.products[0].quantity).toBe(5);
        expect(repo.reservations[0].status).toBe('released');
        expect(repo.movements.filter((movement) => movement.type === 'release')).toHaveLength(1);
    });

    it('does not count expired active reservations in availability', () => {
        const availability = getInventoryAvailability({
            product: product({ quantity: 5 }),
            reservations: [reservation({ expiresAt: '2026-06-21T23:59:00.000Z', quantity: 4 })],
            now,
        });

        expect(availability.activeReserved).toBe(0);
        expect(availability.available).toBe(5);
    });

    it('expires active reservations through the service', async () => {
        const repo = createMemoryInventoryRepository({
            products: [product({ quantity: 5 })],
            reservations: [reservation({ expiresAt: '2026-06-21T23:59:00.000Z' })],
        });

        const expired = await expireInventoryReservations(repo, now);

        expect(expired).toHaveLength(1);
        expect(repo.reservations[0].status).toBe('expired');
        expect(repo.movements[0].type).toBe('expire');
    });

    it('blocks draft products from reservation and purchase', async () => {
        const repo = createMemoryInventoryRepository({
            products: [product({ status: 'draft', quantity: 5 })],
        });

        const result = await reserveInventoryForCheckout({
            repository: repo,
            projectId: 'project_1',
            checkoutIdempotencyKey: 'checkout_draft',
            items: [{ productId: 'prod_1', quantity: 1 }],
            now,
        });

        expect(result.success).toBe(false);
        expect(result.validation.issues[0].code).toBe('not_purchasable');
        expect(repo.reservations).toHaveLength(0);
    });

    it('marks low stock at or below threshold', () => {
        const availability = getInventoryAvailability({
            product: product({ quantity: 2, lowStockThreshold: 2 }),
            requestedQuantity: 1,
            now,
        });

        expect(availability.isAvailable).toBe(true);
        expect(availability.isLowStock).toBe(true);
    });

    it('records each movement once per idempotency key', async () => {
        const repo = createMemoryInventoryRepository({
            products: [product()],
        });
        const movement = {
            productId: 'prod_1',
            type: 'adjust' as const,
            quantityDelta: 1,
            idempotencyKey: 'movement_once',
            reason: 'test',
        };

        await recordInventoryMovement(repo, movement);
        await recordInventoryMovement(repo, movement);

        expect(repo.movements).toHaveLength(1);
        expect(repo.movements[0]).toMatchObject(movement);
    });
});
