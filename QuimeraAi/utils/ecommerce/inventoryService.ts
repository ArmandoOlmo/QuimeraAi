import type {
    InventoryAvailability,
    InventoryCartItem,
    InventoryMovement,
    InventoryMovementType,
    InventoryProductSnapshot,
    InventoryReservation,
    InventoryReservationStatus,
    InventoryValidationIssue,
    InventoryValidationResult,
} from '../../types/ecommerceInventory';

type TimestampInput = string | number | Date | { seconds?: number; _seconds?: number } | null | undefined;

export interface InventoryRepository {
    getProduct(productId: string, projectId?: string | null): Promise<InventoryProductSnapshot | null>;
    listReservationsForItems(items: InventoryCartItem[], projectId?: string | null): Promise<InventoryReservation[]>;
    listReservationsByCheckout(checkoutIdempotencyKey: string): Promise<InventoryReservation[]>;
    listReservationsByOrder(input: { orderId?: string | null; paymentIntentId?: string | null; checkoutIdempotencyKey?: string | null }): Promise<InventoryReservation[]>;
    listExpiredActiveReservations(now: Date): Promise<InventoryReservation[]>;
    findReservationByIdempotencyKey(idempotencyKey: string): Promise<InventoryReservation | null>;
    upsertReservation(reservation: InventoryReservation): Promise<InventoryReservation>;
    updateReservation(reservationId: string, updates: Partial<InventoryReservation>): Promise<InventoryReservation>;
    updateProductOnHand(input: {
        productId: string;
        variantId?: string | null;
        projectId?: string | null;
        delta: number;
        now: Date;
    }): Promise<{ previousOnHand: number; nextOnHand: number }>;
    recordMovement(movement: InventoryMovement): Promise<InventoryMovement>;
}

export interface InventoryAvailabilityInput {
    product: InventoryProductSnapshot | null | undefined;
    variantId?: string | null;
    reservations?: InventoryReservation[];
    requestedQuantity?: number;
    now?: Date | string | number;
}

export interface InventoryCartValidationInput {
    items: InventoryCartItem[];
    products: InventoryProductSnapshot[] | Map<string, InventoryProductSnapshot>;
    reservations?: InventoryReservation[];
    now?: Date | string | number;
}

export interface ReserveInventoryInput {
    repository: InventoryRepository;
    items: InventoryCartItem[];
    projectId?: string | null;
    storeId?: string | null;
    publicStoreId?: string | null;
    orderId?: string | null;
    checkoutIdempotencyKey: string;
    paymentIntentId?: string | null;
    ttlMinutes?: number;
    now?: Date | string | number;
    metadata?: Record<string, unknown>;
}

export interface InventoryReservationResult {
    success: boolean;
    reservations: InventoryReservation[];
    skippedItems: InventoryCartItem[];
    validation: InventoryValidationResult;
}

export interface CommitInventoryInput {
    repository: InventoryRepository;
    reservations?: InventoryReservation[];
    reservationIds?: string[];
    orderId?: string | null;
    paymentIntentId?: string | null;
    checkoutIdempotencyKey?: string | null;
    now?: Date | string | number;
}

export interface ReleaseInventoryInput {
    repository: InventoryRepository;
    reservations?: InventoryReservation[];
    reservationIds?: string[];
    orderId?: string | null;
    paymentIntentId?: string | null;
    checkoutIdempotencyKey?: string | null;
    status?: Extract<InventoryReservationStatus, 'released' | 'expired' | 'cancelled'>;
    movementType?: Extract<InventoryMovementType, 'release' | 'expire' | 'cancel'>;
    reason?: string;
    now?: Date | string | number;
}

const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const DEFAULT_RESERVATION_TTL_MINUTES = 15;

const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

const asDate = (value?: Date | string | number): Date => {
    if (value instanceof Date) return value;
    if (typeof value === 'number' || typeof value === 'string') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date;
    }
    return new Date();
};

const timestampMs = (value: TimestampInput): number => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value > 9_999_999_999 ? value : value * 1000;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (typeof value._seconds === 'number') return value._seconds * 1000;
    return 0;
};

const normalizeVariantId = (variantId?: string | null): string | null => {
    const normalized = String(variantId || '').trim();
    return normalized || null;
};

const itemKey = (productId: string, variantId?: string | null): string =>
    `${productId}:${normalizeVariantId(variantId) || 'default'}`;

const makeId = (prefix: string): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const isTracked = (product: InventoryProductSnapshot): boolean => product.trackInventory !== false;

const isPurchasable = (product: InventoryProductSnapshot): boolean => {
    const status = String(product.status || 'active').toLowerCase();
    return status === 'active';
};

const getVariant = (product: InventoryProductSnapshot, variantId?: string | null) => {
    const normalizedVariantId = normalizeVariantId(variantId);
    if (!normalizedVariantId) return undefined;
    return (product.variants || []).find((variant) => String(variant?.id) === normalizedVariantId);
};

const getOnHand = (product: InventoryProductSnapshot, variantId?: string | null): number => {
    const variant = getVariant(product, variantId);
    if (variant) return Math.max(0, toNumber(variant.quantity));
    return Math.max(0, toNumber(product.quantity ?? product.inventoryQuantity));
};

const getLowStockThreshold = (product: InventoryProductSnapshot): number =>
    Math.max(0, toNumber(product.lowStockThreshold, DEFAULT_LOW_STOCK_THRESHOLD));

const isActiveReservation = (reservation: InventoryReservation, now: Date): boolean =>
    reservation.status === 'active' && timestampMs(reservation.expiresAt) > now.getTime();

const aggregateCartItems = (items: InventoryCartItem[]): InventoryCartItem[] => {
    const grouped = new Map<string, InventoryCartItem>();
    for (const item of items) {
        const productId = String(item.productId || '').trim();
        const quantity = toNumber(item.quantity);
        if (!productId) continue;
        const key = itemKey(productId, item.variantId);
        const current = grouped.get(key);
        if (current) {
            current.quantity += quantity;
        } else {
            grouped.set(key, {
                productId,
                variantId: normalizeVariantId(item.variantId),
                quantity,
            });
        }
    }
    return Array.from(grouped.values());
};

const getProductFromCollection = (
    products: InventoryCartValidationInput['products'],
    productId: string,
): InventoryProductSnapshot | null => {
    if (products instanceof Map) return products.get(productId) || null;
    return products.find((product) => product.id === productId) || null;
};

const toReservationStatusUpdate = (
    status: Extract<InventoryReservationStatus, 'released' | 'expired' | 'cancelled'>,
    now: Date,
): Partial<InventoryReservation> => {
    if (status === 'expired') return { status, expiredAt: now.toISOString(), updatedAt: now.toISOString() };
    if (status === 'cancelled') return { status, cancelledAt: now.toISOString(), updatedAt: now.toISOString() };
    return { status, releasedAt: now.toISOString(), updatedAt: now.toISOString() };
};

export const getInventoryAvailability = ({
    product,
    variantId,
    reservations = [],
    requestedQuantity,
    now: nowInput,
}: InventoryAvailabilityInput): InventoryAvailability => {
    const normalizedVariantId = normalizeVariantId(variantId);
    const now = asDate(nowInput);
    const requested = requestedQuantity === undefined ? undefined : Math.max(0, toNumber(requestedQuantity));

    if (!product) {
        return {
            productId: '',
            variantId: normalizedVariantId,
            mode: 'tracked',
            status: 'unavailable',
            onHand: 0,
            activeReserved: 0,
            available: 0,
            requestedQuantity: requested,
            isAvailable: false,
            isLowStock: false,
            lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
            reason: 'not_found',
        };
    }

    const mode = isTracked(product) ? 'tracked' : 'untracked';
    const lowStockThreshold = getLowStockThreshold(product);

    if (!isPurchasable(product)) {
        const status = String(product.status || '').toLowerCase();
        return {
            productId: product.id,
            variantId: normalizedVariantId,
            mode,
            status: 'unavailable',
            onHand: getOnHand(product, normalizedVariantId),
            activeReserved: 0,
            available: 0,
            requestedQuantity: requested,
            isAvailable: false,
            isLowStock: false,
            lowStockThreshold,
            reason: status === 'draft' ? 'draft' : 'archived',
        };
    }

    if (mode === 'untracked') {
        return {
            productId: product.id,
            variantId: normalizedVariantId,
            mode,
            status: 'available',
            onHand: getOnHand(product, normalizedVariantId),
            activeReserved: 0,
            available: Number.POSITIVE_INFINITY,
            requestedQuantity: requested,
            isAvailable: true,
            isLowStock: false,
            lowStockThreshold,
            reason: 'untracked',
        };
    }

    const onHand = getOnHand(product, normalizedVariantId);
    const activeReserved = reservations
        .filter((reservation) => (
            reservation.productId === product.id &&
            normalizeVariantId(reservation.variantId) === normalizedVariantId &&
            isActiveReservation(reservation, now)
        ))
        .reduce((sum, reservation) => sum + Math.max(0, toNumber(reservation.quantity)), 0);
    const available = Math.max(0, onHand - activeReserved);
    const isAvailable = requested === undefined ? available > 0 : available >= requested;
    const status = !isAvailable
        ? available <= 0 ? 'out_of_stock' : 'insufficient'
        : 'available';

    return {
        productId: product.id,
        variantId: normalizedVariantId,
        mode,
        status,
        onHand,
        activeReserved,
        available,
        requestedQuantity: requested,
        isAvailable,
        isLowStock: available > 0 && available <= lowStockThreshold,
        lowStockThreshold,
        reason: !isAvailable ? available <= 0 ? 'out_of_stock' : 'insufficient_stock' : undefined,
    };
};

export const validateCartInventory = ({
    items,
    products,
    reservations = [],
    now,
}: InventoryCartValidationInput): InventoryValidationResult => {
    const availability: InventoryAvailability[] = [];
    const issues: InventoryValidationIssue[] = [];

    for (const item of aggregateCartItems(items)) {
        const product = getProductFromCollection(products, item.productId);
        const requestedQuantity = toNumber(item.quantity);

        if (requestedQuantity <= 0) {
            issues.push({
                productId: item.productId,
                variantId: item.variantId,
                requestedQuantity,
                availableQuantity: 0,
                code: 'invalid_quantity',
                message: 'Cart item quantity must be greater than zero.',
            });
            continue;
        }

        const itemAvailability = getInventoryAvailability({
            product,
            variantId: item.variantId,
            reservations,
            requestedQuantity,
            now,
        });
        availability.push(itemAvailability);

        if (!product) {
            issues.push({
                productId: item.productId,
                variantId: item.variantId,
                requestedQuantity,
                availableQuantity: 0,
                code: 'not_found',
                message: `Product ${item.productId} was not found.`,
            });
        } else if (!isPurchasable(product)) {
            issues.push({
                productId: item.productId,
                variantId: item.variantId,
                requestedQuantity,
                availableQuantity: 0,
                code: 'not_purchasable',
                message: `Product ${product.id} is not available for purchase.`,
            });
        } else if (!itemAvailability.isAvailable) {
            issues.push({
                productId: item.productId,
                variantId: item.variantId,
                requestedQuantity,
                availableQuantity: itemAvailability.available,
                code: 'insufficient_stock',
                message: `Only ${itemAvailability.available} units are available for product ${product.id}.`,
            });
        }
    }

    return {
        valid: issues.length === 0,
        availability,
        issues,
    };
};

export const recordInventoryMovement = async (
    repository: InventoryRepository,
    movement: Omit<InventoryMovement, 'id' | 'createdAt'> & { id?: string; createdAt?: TimestampInput },
): Promise<InventoryMovement> => {
    const createdAt = movement.createdAt ? new Date(timestampMs(movement.createdAt)).toISOString() : new Date().toISOString();
    return repository.recordMovement({
        ...movement,
        id: movement.id || makeId('mov'),
        createdAt,
    });
};

export const reserveInventoryForCheckout = async ({
    repository,
    items,
    projectId,
    storeId,
    publicStoreId,
    orderId,
    checkoutIdempotencyKey,
    paymentIntentId,
    ttlMinutes = DEFAULT_RESERVATION_TTL_MINUTES,
    now: nowInput,
    metadata = {},
}: ReserveInventoryInput): Promise<InventoryReservationResult> => {
    const now = asDate(nowInput);
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString();
    const aggregatedItems = aggregateCartItems(items);
    const products = new Map<string, InventoryProductSnapshot>();

    for (const item of aggregatedItems) {
        const product = await repository.getProduct(item.productId, projectId);
        if (product) products.set(item.productId, product);
    }

    const allReservations = await repository.listReservationsForItems(aggregatedItems, projectId);
    const checkoutReservations = checkoutIdempotencyKey
        ? await repository.listReservationsByCheckout(checkoutIdempotencyKey)
        : [];
    const checkoutReservationKeys = new Set(checkoutReservations.map((reservation) => reservation.idempotencyKey));
    const validationReservations = allReservations.filter(
        (reservation) => !checkoutReservationKeys.has(reservation.idempotencyKey),
    );
    const validation = validateCartInventory({
        items: aggregatedItems,
        products,
        reservations: validationReservations,
        now,
    });

    if (!validation.valid) {
        return {
            success: false,
            reservations: [],
            skippedItems: [],
            validation,
        };
    }

    const reservations: InventoryReservation[] = [];
    const skippedItems: InventoryCartItem[] = [];

    for (const item of aggregatedItems) {
        const product = products.get(item.productId);
        if (!product || !isTracked(product)) {
            skippedItems.push(item);
            continue;
        }

        const variantId = normalizeVariantId(item.variantId);
        const idempotencyKey = `inventory:reserve:${checkoutIdempotencyKey}:${itemKey(item.productId, variantId)}`;
        const existing = await repository.findReservationByIdempotencyKey(idempotencyKey);
        const reservation = await repository.upsertReservation({
            id: existing?.id || makeId('res'),
            projectId: projectId ?? product.projectId ?? null,
            storeId: storeId ?? product.storeId ?? null,
            publicStoreId: publicStoreId ?? product.publicStoreId ?? null,
            orderId: orderId ?? existing?.orderId ?? null,
            checkoutIdempotencyKey,
            paymentIntentId: paymentIntentId ?? existing?.paymentIntentId ?? null,
            productId: item.productId,
            variantId,
            quantity: item.quantity,
            status: 'active',
            expiresAt,
            committedAt: null,
            releasedAt: null,
            expiredAt: null,
            cancelledAt: null,
            idempotencyKey,
            metadata: {
                ...(existing?.metadata || {}),
                ...metadata,
            },
            createdAt: existing?.createdAt || now.toISOString(),
            updatedAt: now.toISOString(),
        });
        reservations.push(reservation);

        await recordInventoryMovement(repository, {
            projectId: reservation.projectId,
            storeId: reservation.storeId,
            publicStoreId: reservation.publicStoreId,
            reservationId: reservation.id,
            orderId: reservation.orderId,
            checkoutIdempotencyKey,
            paymentIntentId: reservation.paymentIntentId,
            productId: reservation.productId,
            variantId: reservation.variantId,
            type: 'reserve',
            quantityDelta: -reservation.quantity,
            idempotencyKey: `inventory:movement:reserve:${reservation.idempotencyKey}`,
            reason: 'checkout_reservation',
            metadata,
            createdAt: now.toISOString(),
        });
    }

    return {
        success: true,
        reservations,
        skippedItems,
        validation,
    };
};

const loadTargetReservations = async (
    repository: InventoryRepository,
    input: Pick<CommitInventoryInput, 'reservations' | 'reservationIds' | 'orderId' | 'paymentIntentId' | 'checkoutIdempotencyKey'>,
): Promise<InventoryReservation[]> => {
    if (input.reservations) return input.reservations;
    if (input.orderId || input.paymentIntentId || input.checkoutIdempotencyKey) {
        const byOrder = await repository.listReservationsByOrder({
            orderId: input.orderId,
            paymentIntentId: input.paymentIntentId,
            checkoutIdempotencyKey: input.checkoutIdempotencyKey,
        });
        if (input.reservationIds?.length) {
            const ids = new Set(input.reservationIds);
            return byOrder.filter((reservation) => ids.has(reservation.id));
        }
        return byOrder;
    }
    return [];
};

export const commitInventoryReservation = async ({
    repository,
    reservations,
    reservationIds,
    orderId,
    paymentIntentId,
    checkoutIdempotencyKey,
    now: nowInput,
}: CommitInventoryInput): Promise<InventoryReservation[]> => {
    const now = asDate(nowInput);
    const targets = await loadTargetReservations(repository, {
        reservations,
        reservationIds,
        orderId,
        paymentIntentId,
        checkoutIdempotencyKey,
    });
    const committed: InventoryReservation[] = [];

    for (const reservation of targets) {
        if (reservation.status === 'committed') {
            committed.push(reservation);
            continue;
        }
        if (reservation.status !== 'active') continue;

        const quantityUpdate = await repository.updateProductOnHand({
            productId: reservation.productId,
            variantId: reservation.variantId,
            projectId: reservation.projectId,
            delta: -reservation.quantity,
            now,
        });
        const updated = await repository.updateReservation(reservation.id, {
            status: 'committed',
            orderId: orderId ?? reservation.orderId ?? null,
            paymentIntentId: paymentIntentId ?? reservation.paymentIntentId ?? null,
            committedAt: now.toISOString(),
            updatedAt: now.toISOString(),
        });
        committed.push(updated);

        await recordInventoryMovement(repository, {
            projectId: updated.projectId,
            storeId: updated.storeId,
            publicStoreId: updated.publicStoreId,
            reservationId: updated.id,
            orderId: updated.orderId,
            checkoutIdempotencyKey: updated.checkoutIdempotencyKey,
            paymentIntentId: updated.paymentIntentId,
            productId: updated.productId,
            variantId: updated.variantId,
            type: 'commit',
            quantityDelta: -updated.quantity,
            quantityBefore: quantityUpdate.previousOnHand,
            quantityAfter: quantityUpdate.nextOnHand,
            idempotencyKey: `inventory:movement:commit:${updated.id}:${paymentIntentId || orderId || 'checkout'}`,
            reason: 'payment_success',
            createdAt: now.toISOString(),
        });
    }

    return committed;
};

export const releaseInventoryReservation = async ({
    repository,
    reservations,
    reservationIds,
    orderId,
    paymentIntentId,
    checkoutIdempotencyKey,
    status = 'released',
    movementType = 'release',
    reason = 'checkout_released',
    now: nowInput,
}: ReleaseInventoryInput): Promise<InventoryReservation[]> => {
    const now = asDate(nowInput);
    const targets = await loadTargetReservations(repository, {
        reservations,
        reservationIds,
        orderId,
        paymentIntentId,
        checkoutIdempotencyKey,
    });
    const released: InventoryReservation[] = [];

    for (const reservation of targets) {
        if (reservation.status === 'committed') {
            released.push(reservation);
            continue;
        }
        if (reservation.status !== 'active') {
            released.push(reservation);
            continue;
        }

        const updated = await repository.updateReservation(reservation.id, toReservationStatusUpdate(status, now));
        released.push(updated);
        await recordInventoryMovement(repository, {
            projectId: updated.projectId,
            storeId: updated.storeId,
            publicStoreId: updated.publicStoreId,
            reservationId: updated.id,
            orderId: updated.orderId,
            checkoutIdempotencyKey: updated.checkoutIdempotencyKey,
            paymentIntentId: updated.paymentIntentId,
            productId: updated.productId,
            variantId: updated.variantId,
            type: movementType,
            quantityDelta: updated.quantity,
            idempotencyKey: `inventory:movement:${movementType}:${updated.id}`,
            reason,
            createdAt: now.toISOString(),
        });
    }

    return released;
};

export const expireInventoryReservations = async (
    repository: InventoryRepository,
    nowInput?: Date | string | number,
): Promise<InventoryReservation[]> => {
    const now = asDate(nowInput);
    const expiredReservations = await repository.listExpiredActiveReservations(now);
    return releaseInventoryReservation({
        repository,
        reservations: expiredReservations,
        status: 'expired',
        movementType: 'expire',
        reason: 'reservation_ttl_expired',
        now,
    });
};

export const createMemoryInventoryRepository = (initial?: {
    products?: InventoryProductSnapshot[];
    reservations?: InventoryReservation[];
    movements?: InventoryMovement[];
}): InventoryRepository & {
    products: InventoryProductSnapshot[];
    reservations: InventoryReservation[];
    movements: InventoryMovement[];
} => {
    const products = [...(initial?.products || [])];
    const reservations = [...(initial?.reservations || [])];
    const movements = [...(initial?.movements || [])];

    const findProduct = (productId: string, projectId?: string | null) =>
        products.find((product) => (
            product.id === productId &&
            (!projectId || !product.projectId || product.projectId === projectId)
        )) || null;

    return {
        products,
        reservations,
        movements,
        async getProduct(productId, projectId) {
            return findProduct(productId, projectId);
        },
        async listReservationsForItems(items, projectId) {
            const keys = new Set(aggregateCartItems(items).map((item) => itemKey(item.productId, item.variantId)));
            return reservations.filter((reservation) => (
                keys.has(itemKey(reservation.productId, reservation.variantId)) &&
                (!projectId || !reservation.projectId || reservation.projectId === projectId)
            ));
        },
        async listReservationsByCheckout(checkoutIdempotencyKey) {
            return reservations.filter((reservation) => reservation.checkoutIdempotencyKey === checkoutIdempotencyKey);
        },
        async listReservationsByOrder(input) {
            return reservations.filter((reservation) => (
                Boolean(input.orderId && reservation.orderId === input.orderId) ||
                Boolean(input.paymentIntentId && reservation.paymentIntentId === input.paymentIntentId) ||
                Boolean(input.checkoutIdempotencyKey && reservation.checkoutIdempotencyKey === input.checkoutIdempotencyKey)
            ));
        },
        async listExpiredActiveReservations(now) {
            return reservations.filter((reservation) => reservation.status === 'active' && timestampMs(reservation.expiresAt) <= now.getTime());
        },
        async findReservationByIdempotencyKey(idempotencyKey) {
            return reservations.find((reservation) => reservation.idempotencyKey === idempotencyKey) || null;
        },
        async upsertReservation(reservation) {
            const index = reservations.findIndex((current) => current.idempotencyKey === reservation.idempotencyKey);
            if (index >= 0) {
                reservations[index] = {
                    ...reservations[index],
                    ...reservation,
                    id: reservations[index].id,
                    createdAt: reservations[index].createdAt || reservation.createdAt,
                };
                return reservations[index];
            }
            reservations.push(reservation);
            return reservation;
        },
        async updateReservation(reservationId, updates) {
            const index = reservations.findIndex((reservation) => reservation.id === reservationId);
            if (index < 0) throw new Error(`Reservation ${reservationId} not found.`);
            reservations[index] = {
                ...reservations[index],
                ...updates,
            };
            return reservations[index];
        },
        async updateProductOnHand(input) {
            const product = findProduct(input.productId, input.projectId);
            if (!product) throw new Error(`Product ${input.productId} not found.`);

            const variantId = normalizeVariantId(input.variantId);
            const previousOnHand = getOnHand(product, variantId);
            const nextOnHand = Math.max(0, previousOnHand + input.delta);

            if (variantId) {
                product.variants = (product.variants || []).map((variant) => (
                    String(variant.id) === variantId ? { ...variant, quantity: nextOnHand } : variant
                ));
            } else {
                product.quantity = nextOnHand;
                product.inventoryQuantity = nextOnHand;
            }

            return { previousOnHand, nextOnHand };
        },
        async recordMovement(movement) {
            const existing = movements.find((current) => current.idempotencyKey === movement.idempotencyKey);
            if (existing) return existing;
            movements.push(movement);
            return movement;
        },
    };
};
