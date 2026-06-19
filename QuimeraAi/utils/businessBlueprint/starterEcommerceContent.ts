import type {
    EcommerceBlueprint,
    StarterProductBlueprint,
} from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';

export interface StarterEcommerceContent {
    categories: string[];
    starterProducts: StarterProductBlueprint[];
    discounts: EcommerceBlueprint['discounts'];
    giftCards: EcommerceBlueprint['giftCards'];
}

export interface StarterEcommerceContentOptions {
    enabled?: boolean;
    maxProducts?: number;
    maxCategories?: number;
}

function readFiniteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readUserProvidedPrice(product: Record<string, unknown>): number | undefined {
    return readFiniteNumber(product.price) ?? readFiniteNumber(product.suggestedPrice);
}

function readUserProvidedStock(product: Record<string, unknown>): number | undefined {
    return readFiniteNumber(product.stock)
        ?? readFiniteNumber(product.quantity)
        ?? readFiniteNumber(product.inventoryQuantity)
        ?? readFiniteNumber(product.inventory_quantity);
}

function normalizeProduct(product: unknown): StarterProductBlueprint {
    const input = product && typeof product === 'object' ? product as Record<string, unknown> : {};
    const suggestedPrice = readUserProvidedPrice(input);
    const suggestedStock = readUserProvidedStock(input);

    return {
        name: String(input.name || input.title || input.label || 'Draft product'),
        category: typeof input.category === 'string' ? input.category : undefined,
        description: typeof input.description === 'string' ? input.description : undefined,
        suggestedPrice,
        suggestedStock,
        priceSource: suggestedPrice !== undefined ? 'user-provided' : 'unset',
        stockSource: suggestedStock !== undefined ? 'user-provided' : 'unset',
        status: 'needs_review',
    };
}

function uniqueNonEmpty(values: Array<string | undefined>, limit: number): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const normalized = value?.trim();
        if (!normalized || seen.has(normalized.toLowerCase())) continue;
        seen.add(normalized.toLowerCase());
        result.push(normalized);
        if (result.length >= limit) break;
    }

    return result;
}

export function createStarterEcommerceContent(
    plan: WebsitePlan,
    options: StarterEcommerceContentOptions = {},
): StarterEcommerceContent {
    const enabled = options.enabled ?? Boolean(plan.businessProfile.hasEcommerce);
    if (!enabled) {
        return {
            categories: [],
            starterProducts: [],
            discounts: [],
            giftCards: { enabled: false, status: 'needs_review' },
        };
    }

    const maxProducts = options.maxProducts ?? 8;
    const maxCategories = options.maxCategories ?? 8;
    const productCandidates = (plan.contentMap.products || []).slice(0, maxProducts);
    const starterProducts = productCandidates.map(normalizeProduct);
    const categories = uniqueNonEmpty([
        ...starterProducts.map(product => product.category),
        ...plan.businessProfile.services.map(service => service.name),
    ], maxCategories);

    return {
        categories,
        starterProducts,
        discounts: [{
            name: 'Welcome offer',
            status: 'draft',
            reason: 'Suggested by AI Studio; requires merchant approval.',
        }],
        giftCards: { enabled: true, status: 'draft' },
    };
}
