const VALID_SURFACES = new Set([
    'website',
    'storefront',
    'checkout',
    'bio_page',
    'booking_page',
    'restaurant_menu',
    'realty_property_page',
    'admin_preview',
    'voice',
]);
function cleanString(value, maxLength = 240) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}
function cleanSurface(value) {
    const normalized = cleanString(value, 80);
    return normalized && VALID_SURFACES.has(normalized)
        ? normalized
        : 'website';
}
function compactValue(value, depth = 0) {
    if (value == null)
        return value;
    if (typeof value === 'string')
        return value.slice(0, 2000);
    if (typeof value === 'number' || typeof value === 'boolean')
        return value;
    if (Array.isArray(value)) {
        return value.slice(0, 20).map(item => compactValue(item, depth + 1));
    }
    if (typeof value === 'object') {
        if (depth >= 2)
            return '[object]';
        return compactMetadata(value);
    }
    return String(value).slice(0, 500);
}
export function compactMetadata(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return Object.fromEntries(Object.entries(value)
        .filter(([key]) => key.length <= 80)
        .slice(0, 50)
        .map(([key, entryValue]) => [key, compactValue(entryValue)])
        .filter(([, entryValue]) => entryValue !== undefined));
}
export function normalizeContextKeys(value) {
    const raw = Array.isArray(value) ? value : [];
    return Array.from(new Set(raw
        .map(item => cleanString(item, 80))
        .filter((item) => Boolean(item)))).slice(0, 20);
}
export function buildChatbotEngineSurfaceContext(input = {}) {
    const context = {
        sourceSurface: cleanSurface(input.sourceSurface),
        sourceModule: cleanString(input.sourceModule, 120) || 'chatcore',
        contextKeys: normalizeContextKeys(input.contextKeys),
        metadata: compactMetadata(input.metadata),
    };
    const route = cleanString(input.route, 500);
    const entityType = cleanString(input.entityType, 80);
    const entityId = cleanString(input.entityId, 160);
    const entitySlug = cleanString(input.entitySlug, 160);
    if (route)
        context.route = route;
    if (entityType)
        context.entityType = entityType;
    if (entityId)
        context.entityId = entityId;
    if (entitySlug)
        context.entitySlug = entitySlug;
    return context;
}
export function mergeChatbotEngineSurfaceContext(base, overlay = {}) {
    const normalizedBase = buildChatbotEngineSurfaceContext(base);
    return buildChatbotEngineSurfaceContext({
        ...normalizedBase,
        ...overlay,
        contextKeys: [
            ...normalizedBase.contextKeys,
            ...normalizeContextKeys(overlay.contextKeys),
        ],
        metadata: {
            ...normalizedBase.metadata,
            ...compactMetadata(overlay.metadata),
        },
    });
}
export function buildChatbotEngineSurfacePrompt(context) {
    if (!context)
        return '';
    const lines = [
        `Surface: ${context.sourceSurface}`,
        `Module: ${context.sourceModule}`,
        context.route ? `Route: ${context.route}` : '',
        context.entityType ? `Entity type: ${context.entityType}` : '',
        context.entityId ? `Entity ID: ${context.entityId}` : '',
        context.entitySlug ? `Entity slug: ${context.entitySlug}` : '',
        context.contextKeys.length > 0 ? `Context keys: ${context.contextKeys.join(', ')}` : '',
    ].filter(Boolean);
    const metadata = Object.keys(context.metadata).length > 0
        ? `\nMetadata: ${JSON.stringify(context.metadata).slice(0, 1500)}`
        : '';
    return [
        '=== CHATBOT ENGINE SURFACE CONTEXT ===',
        'Use this context implicitly to answer as the business agent for the current Quimera surface.',
        ...lines,
        metadata,
    ].join('\n');
}
//# sourceMappingURL=surfaceContext.js.map