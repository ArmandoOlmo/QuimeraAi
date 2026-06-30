function readFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function readUserProvidedPrice(product) {
    return readFiniteNumber(product.price) ?? readFiniteNumber(product.suggestedPrice);
}
function readUserProvidedStock(product) {
    return readFiniteNumber(product.stock)
        ?? readFiniteNumber(product.quantity)
        ?? readFiniteNumber(product.inventoryQuantity)
        ?? readFiniteNumber(product.inventory_quantity);
}
function normalizeProduct(product) {
    const input = product && typeof product === 'object' ? product : {};
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
function uniqueNonEmpty(values, limit) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const normalized = value?.trim();
        if (!normalized || seen.has(normalized.toLowerCase()))
            continue;
        seen.add(normalized.toLowerCase());
        result.push(normalized);
        if (result.length >= limit)
            break;
    }
    return result;
}
export function createStarterEcommerceContent(plan, options = {}) {
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
//# sourceMappingURL=starterEcommerceContent.js.map