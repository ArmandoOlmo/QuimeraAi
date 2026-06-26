export const GLOBAL_ASSISTANT_ENTRY_EVENT = 'quimera:global-assistant-entry';
export const GLOBAL_ASSISTANT_ENTRY_STORAGE_KEY = 'quimera_global_assistant_entry_request';

export type GlobalAssistantEntrySource =
    | 'dashboard_welcome'
    | 'command_palette'
    | 'global_assistant'
    | 'system';

export interface GlobalAssistantEntryPayload {
    request: string;
    source: GlobalAssistantEntrySource;
    surface: 'dashboard' | 'app' | 'admin' | 'system';
    createdAt: string;
    autoSubmit: boolean;
    metadata?: Record<string, unknown>;
}

export interface DashboardAssistantEntryRoute {
    destination: 'global_assistant' | 'ai_studio';
    reason: string;
    forwardPromptToAiStudio: boolean;
}

const normalize = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const includesAny = (text: string, terms: string[]) => terms.some(term => text.includes(term));

const AI_STUDIO_OPEN_TERMS = [
    'abre ai studio',
    'abrir ai studio',
    'open ai studio',
    'abre el ai studio',
    'abre web design studio',
    'abrir web design studio',
    'open web design studio',
    'abre el estudio',
    'abrir el estudio',
    'estudio de ia',
    'studio de ia',
];

const AI_STUDIO_CREATION_TERMS = [
    'ai studio crea',
    'ai studio genera',
    'web design studio crea',
    'web design studio genera',
    'usar ai studio',
    'usa ai studio',
    'use ai studio',
];

export function routeDashboardAssistantEntry(request: string): DashboardAssistantEntryRoute {
    const text = normalize(request);

    if (!text) {
        return {
            destination: 'ai_studio',
            reason: 'empty_dashboard_request_opens_creation_studio',
            forwardPromptToAiStudio: false,
        };
    }

    if (includesAny(text, AI_STUDIO_CREATION_TERMS)) {
        return {
            destination: 'ai_studio',
            reason: 'explicit_ai_studio_creation_request',
            forwardPromptToAiStudio: true,
        };
    }

    if (includesAny(text, AI_STUDIO_OPEN_TERMS)) {
        return {
            destination: 'ai_studio',
            reason: 'explicit_ai_studio_open_request',
            forwardPromptToAiStudio: false,
        };
    }

    return {
        destination: 'global_assistant',
        reason: 'dashboard_request_routes_to_global_operating_layer',
        forwardPromptToAiStudio: false,
    };
}

export function createGlobalAssistantEntryPayload(
    request: string,
    options: Partial<Omit<GlobalAssistantEntryPayload, 'request' | 'createdAt'>> = {},
): GlobalAssistantEntryPayload {
    return {
        request: request.trim(),
        source: options.source || 'dashboard_welcome',
        surface: options.surface || 'dashboard',
        createdAt: new Date().toISOString(),
        autoSubmit: options.autoSubmit ?? true,
        metadata: options.metadata,
    };
}

export function dispatchGlobalAssistantEntryRequest(payload: GlobalAssistantEntryPayload): boolean {
    if (typeof window === 'undefined') return false;

    try {
        window.localStorage?.setItem(GLOBAL_ASSISTANT_ENTRY_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn('[GlobalAssistantEntryBridge] Could not persist entry request:', error);
    }

    window.dispatchEvent(new CustomEvent<GlobalAssistantEntryPayload>(GLOBAL_ASSISTANT_ENTRY_EVENT, {
        detail: payload,
    }));
    return true;
}

export function readStoredGlobalAssistantEntryRequest(): GlobalAssistantEntryPayload | null {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage?.getItem(GLOBAL_ASSISTANT_ENTRY_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as GlobalAssistantEntryPayload;
        return parsed?.request?.trim() ? parsed : null;
    } catch (error) {
        console.warn('[GlobalAssistantEntryBridge] Could not read entry request:', error);
        return null;
    }
}

export function clearStoredGlobalAssistantEntryRequest(): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage?.removeItem(GLOBAL_ASSISTANT_ENTRY_STORAGE_KEY);
    } catch (error) {
        console.warn('[GlobalAssistantEntryBridge] Could not clear entry request:', error);
    }
}
