import type { AssistantModuleTarget } from '../../types/globalAssistant';

export const GLOBAL_ASSISTANT_ENTRY_EVENT = 'quimera:global-assistant-entry';
export const GLOBAL_ASSISTANT_ENTRY_STORAGE_KEY = 'quimera_global_assistant_entry_request';

export type GlobalAssistantEntrySource =
    | 'dashboard_welcome'
    | 'dashboard_quick_action'
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
    destination: 'global_assistant' | 'ai_studio' | 'none';
    reason: string;
    forwardPromptToAiStudio: boolean;
}

export interface DashboardAssistantQuickAction {
    id: string;
    module: AssistantModuleTarget;
    labelKey: string;
    labelFallback: string;
    promptKey: string;
    promptFallback: string;
    category: 'create' | 'open' | 'analyze' | 'admin';
    requiresProject: boolean;
    adminOnly?: boolean;
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

const DASHBOARD_ASSISTANT_QUICK_ACTIONS: DashboardAssistantQuickAction[] = [
    {
        id: 'create_website',
        module: 'aiStudio',
        labelKey: 'dashboard.assistantQuickActions.createWebsite',
        labelFallback: 'Create website',
        promptKey: 'dashboard.assistantQuickActions.createWebsitePrompt',
        promptFallback: 'Use AI Studio to create a new website project with business context, sections, copy, images, and next steps.',
        category: 'create',
        requiresProject: false,
    },
    {
        id: 'generate_hero_image',
        module: 'media',
        labelKey: 'dashboard.assistantQuickActions.generateHeroImage',
        labelFallback: 'Generate image',
        promptKey: 'dashboard.assistantQuickActions.generateHeroImagePrompt',
        promptFallback: 'Generate a hero image draft for the active project and keep it in review before applying it.',
        category: 'create',
        requiresProject: true,
    },
    {
        id: 'review_leads',
        module: 'crm',
        labelKey: 'dashboard.assistantQuickActions.reviewLeads',
        labelFallback: 'Review leads',
        promptKey: 'dashboard.assistantQuickActions.reviewLeadsPrompt',
        promptFallback: 'Review recent leads and propose prioritized follow-ups.',
        category: 'analyze',
        requiresProject: true,
    },
    {
        id: 'create_email',
        module: 'emailMarketing',
        labelKey: 'dashboard.assistantQuickActions.createEmail',
        labelFallback: 'Create email',
        promptKey: 'dashboard.assistantQuickActions.createEmailPrompt',
        promptFallback: 'Create an email campaign draft for the active project using its brand context.',
        category: 'create',
        requiresProject: true,
    },
    {
        id: 'open_ecommerce',
        module: 'ecommerce',
        labelKey: 'dashboard.assistantQuickActions.openEcommerce',
        labelFallback: 'Open ecommerce',
        promptKey: 'dashboard.assistantQuickActions.openEcommercePrompt',
        promptFallback: 'Open the ecommerce area and summarize what needs attention.',
        category: 'open',
        requiresProject: true,
    },
    {
        id: 'review_platform_errors',
        module: 'admin',
        labelKey: 'dashboard.assistantQuickActions.reviewPlatformErrors',
        labelFallback: 'Review platform errors',
        promptKey: 'dashboard.assistantQuickActions.reviewPlatformErrorsPrompt',
        promptFallback: 'Review platform errors in Owner Mode and summarize the highest-priority issues.',
        category: 'admin',
        requiresProject: false,
        adminOnly: true,
    },
];

export function getDashboardAssistantQuickActions(input: {
    hasProjects: boolean;
    canUseAdminMode?: boolean;
    limit?: number;
}): DashboardAssistantQuickAction[] {
    const limit = input.limit ?? 6;
    return DASHBOARD_ASSISTANT_QUICK_ACTIONS
        .filter(action => !action.requiresProject || input.hasProjects)
        .filter(action => !action.adminOnly || input.canUseAdminMode === true)
        .slice(0, limit);
}

export function routeDashboardAssistantEntry(request: string): DashboardAssistantEntryRoute {
    const text = normalize(request);

    if (!text) {
        return {
            destination: 'none',
            reason: 'empty_dashboard_request_ignored',
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
