import type { ChatbotSurface } from '../../types/businessBlueprint';

export interface ChatbotEngineSurfaceContext {
    sourceSurface: ChatbotSurface;
    sourceModule: string;
    route?: string;
    entityType?: string;
    entityId?: string;
    entitySlug?: string;
    contextKeys: string[];
    metadata: Record<string, unknown>;
}

export interface ChatbotEngineSurfaceContextInput {
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    route?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    entitySlug?: string | null;
    contextKeys?: unknown;
    metadata?: unknown;
}

const VALID_SURFACES = new Set<ChatbotSurface>([
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

function cleanString(value: unknown, maxLength = 240): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function cleanSurface(value: unknown): ChatbotSurface {
    const normalized = cleanString(value, 80);
    return normalized && VALID_SURFACES.has(normalized as ChatbotSurface)
        ? normalized as ChatbotSurface
        : 'website';
}

function compactValue(value: unknown, depth = 0): unknown {
    if (value == null) return value;
    if (typeof value === 'string') return value.slice(0, 2000);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
        return value.slice(0, 20).map(item => compactValue(item, depth + 1));
    }
    if (typeof value === 'object') {
        if (depth >= 2) return '[object]';
        return compactMetadata(value);
    }
    return String(value).slice(0, 500);
}

export function compactMetadata(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .filter(([key]) => key.length <= 80)
            .slice(0, 50)
            .map(([key, entryValue]) => [key, compactValue(entryValue)] as const)
            .filter(([, entryValue]) => entryValue !== undefined),
    );
}

export function normalizeContextKeys(value: unknown): string[] {
    const raw = Array.isArray(value) ? value : [];
    return Array.from(new Set(
        raw
            .map(item => cleanString(item, 80))
            .filter((item): item is string => Boolean(item)),
    )).slice(0, 20);
}

export function buildChatbotEngineSurfaceContext(
    input: ChatbotEngineSurfaceContextInput = {},
): ChatbotEngineSurfaceContext {
    const context: ChatbotEngineSurfaceContext = {
        sourceSurface: cleanSurface(input.sourceSurface),
        sourceModule: cleanString(input.sourceModule, 120) || 'chatcore',
        contextKeys: normalizeContextKeys(input.contextKeys),
        metadata: compactMetadata(input.metadata),
    };
    const route = cleanString(input.route, 500);
    const entityType = cleanString(input.entityType, 80);
    const entityId = cleanString(input.entityId, 160);
    const entitySlug = cleanString(input.entitySlug, 160);

    if (route) context.route = route;
    if (entityType) context.entityType = entityType;
    if (entityId) context.entityId = entityId;
    if (entitySlug) context.entitySlug = entitySlug;

    return context;
}

export function mergeChatbotEngineSurfaceContext(
    base: ChatbotEngineSurfaceContextInput | ChatbotEngineSurfaceContext | undefined,
    overlay: ChatbotEngineSurfaceContextInput = {},
): ChatbotEngineSurfaceContext {
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

export function buildChatbotEngineSurfacePrompt(context?: ChatbotEngineSurfaceContext | null): string {
    if (!context) return '';
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
