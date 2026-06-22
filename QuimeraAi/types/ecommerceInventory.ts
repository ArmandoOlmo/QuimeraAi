import type { StoredTimestamp } from './ecommerce';

export type InventoryMode = 'untracked' | 'tracked';

export type InventoryReservationStatus =
    | 'active'
    | 'committed'
    | 'released'
    | 'expired'
    | 'cancelled';

export type InventoryMovementType =
    | 'reserve'
    | 'release'
    | 'commit'
    | 'restock'
    | 'adjust'
    | 'refund'
    | 'cancel'
    | 'expire';

export interface InventoryVariantSnapshot {
    id: string;
    quantity?: number | string | null;
    trackInventory?: boolean | null;
}

export interface InventoryProductSnapshot {
    id: string;
    projectId?: string | null;
    storeId?: string | null;
    publicStoreId?: string | null;
    status?: string | null;
    quantity?: number | string | null;
    inventoryQuantity?: number | string | null;
    trackInventory?: boolean | null;
    lowStockThreshold?: number | string | null;
    variants?: InventoryVariantSnapshot[] | null;
}

export interface InventoryAvailability {
    productId: string;
    variantId?: string | null;
    mode: InventoryMode;
    status: 'available' | 'insufficient' | 'out_of_stock' | 'unavailable';
    onHand: number;
    activeReserved: number;
    available: number;
    requestedQuantity?: number;
    isAvailable: boolean;
    isLowStock: boolean;
    lowStockThreshold: number;
    reason?: 'untracked' | 'draft' | 'archived' | 'not_found' | 'insufficient_stock' | 'out_of_stock';
}

export interface InventoryReservation {
    id: string;
    projectId?: string | null;
    storeId?: string | null;
    publicStoreId?: string | null;
    orderId?: string | null;
    checkoutIdempotencyKey?: string | null;
    paymentIntentId?: string | null;
    productId: string;
    variantId?: string | null;
    quantity: number;
    status: InventoryReservationStatus;
    expiresAt: StoredTimestamp;
    committedAt?: StoredTimestamp | null;
    releasedAt?: StoredTimestamp | null;
    expiredAt?: StoredTimestamp | null;
    cancelledAt?: StoredTimestamp | null;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
    createdAt?: StoredTimestamp;
    updatedAt?: StoredTimestamp;
}

export interface InventoryMovement {
    id: string;
    projectId?: string | null;
    storeId?: string | null;
    publicStoreId?: string | null;
    reservationId?: string | null;
    orderId?: string | null;
    checkoutIdempotencyKey?: string | null;
    paymentIntentId?: string | null;
    productId: string;
    variantId?: string | null;
    type: InventoryMovementType;
    quantityDelta: number;
    quantityBefore?: number | null;
    quantityAfter?: number | null;
    idempotencyKey: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    createdAt?: StoredTimestamp;
}

export interface InventoryCartItem {
    productId: string;
    variantId?: string | null;
    quantity: number;
}

export interface InventoryValidationIssue {
    productId: string;
    variantId?: string | null;
    requestedQuantity: number;
    availableQuantity: number;
    code: 'not_found' | 'not_purchasable' | 'insufficient_stock' | 'invalid_quantity';
    message: string;
}

export interface InventoryValidationResult {
    valid: boolean;
    availability: InventoryAvailability[];
    issues: InventoryValidationIssue[];
}
