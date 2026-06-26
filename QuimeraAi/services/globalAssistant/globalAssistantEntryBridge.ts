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
    activeModule: AssistantModuleTarget | null;
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

export interface DashboardAssistantEntryMetadataInput {
    projectCount: number;
    routingReason: string;
    entryPoint: 'dashboard_input' | 'dashboard_quick_action';
    activeModule?: AssistantModuleTarget | null;
    activeProjectId?: string | null;
    activeProjectName?: string | null;
    activeTenantId?: string | null;
    activeTenantName?: string | null;
    quickAction?: Pick<DashboardAssistantQuickAction, 'id' | 'category' | 'module'> | null;
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

const NEW_WEBSITE_CREATION_TERMS = [
    'crea',
    'crear',
    'create',
    'genera',
    'generar',
    'build',
    'construye',
    'nuevo',
    'nueva',
    'new',
];

const WEBSITE_TARGET_TERMS = [
    'website',
    'sitio web',
    'pagina web',
    'web para',
    'landing',
    'landing page',
    'site',
];

const EXISTING_WEBSITE_EDIT_TERMS = [
    'seccion',
    'section',
    'bloque',
    'block',
    'hero',
    'footer',
    'headline',
    'copy',
    'texto',
    'editor',
    'editar',
    'edita',
    'edit',
    'actualiza',
    'modifica',
    'reordena',
    'oculta',
    'visibilidad',
];

const BUSINESS_CREATION_TARGET_TERMS = [
    'para un',
    'para una',
    'para mi',
    'for a',
    'for my',
    'negocio',
    'business',
    'restaurante',
    'clinica',
    'clinic',
    'realty',
    'tienda',
    'servicio',
    'empresa',
    'marca',
];

const DASHBOARD_MODULE_TERMS: Array<{ module: AssistantModuleTarget; terms: string[] }> = [
    {
        module: 'admin',
        terms: ['admin', 'owner mode', 'super admin', 'platform error', 'errores plataforma', 'service availability', 'feature flag', 'ai log', 'api log'],
    },
    {
        module: 'chatbot',
        terms: ['chatcore', 'chatbot', 'knowledge', 'entrena', 'entrenar', 'train bot', 'visitor chat'],
    },
    {
        module: 'businessBlueprint',
        terms: ['business blueprint', 'blueprint', 'business map', 'mapa de negocio'],
    },
    {
        module: 'storefront',
        terms: ['storefront', 'escaparate', 'storefront builder', 'product card', 'catalog section'],
    },
    {
        module: 'ecommerce',
        terms: ['ecommerce', 'producto', 'product', 'products', 'pedido', 'order', 'precio', 'inventario', 'discount', 'cupon', 'categoria'],
    },
    {
        module: 'emailMarketing',
        terms: ['email', 'correo', 'campana', 'campaign', 'audiencia', 'audience', 'automation', 'automatizacion', 'newsletter'],
    },
    {
        module: 'appointments',
        terms: ['cita', 'appointment', 'agenda', 'reserva', 'booking', 'calendar', 'availability', 'disponibilidad'],
    },
    {
        module: 'restaurants',
        terms: ['restaurant', 'restaurante', 'menu', 'dish', 'catering', 'reservation flow'],
    },
    {
        module: 'realEstate',
        terms: ['realty', 'real estate', 'propiedad', 'listing', 'open house', 'inmobiliaria'],
    },
    {
        module: 'bioPage',
        terms: ['bio page', 'biopage', 'bio link', 'biolink', 'link in bio', 'link de bio'],
    },
    {
        module: 'crm',
        terms: ['lead', 'crm', 'prospecto', 'follow up', 'follow-up', 'seguimiento', 'clientes potenciales'],
    },
    {
        module: 'analytics',
        terms: ['analytics', 'metricas', 'analiticas', 'reporte', 'report', 'readiness'],
    },
    {
        module: 'finance',
        terms: ['finance', 'finanzas', 'invoice', 'factura', 'gasto', 'accounting'],
    },
    {
        module: 'media',
        terms: ['imagen', 'image', 'foto', 'video', 'asset', 'media', 'hero image'],
    },
    {
        module: 'website',
        terms: ['website', 'web', 'pagina', 'editor', 'hero', 'seccion', 'section', 'website builder'],
    },
    {
        module: 'project',
        terms: ['proyecto', 'proyectos', 'project', 'projects', 'cambia de proyecto', 'switch project'],
    },
];

const isNewWebsiteCreationRequest = (text: string): boolean =>
    includesAny(text, NEW_WEBSITE_CREATION_TERMS)
    && includesAny(text, WEBSITE_TARGET_TERMS)
    && includesAny(text, BUSINESS_CREATION_TARGET_TERMS)
    && !includesAny(text, EXISTING_WEBSITE_EDIT_TERMS);

export function inferDashboardAssistantModule(request: string): AssistantModuleTarget | null {
    const text = normalize(request);
    if (!text) return null;
    if (includesAny(text, AI_STUDIO_OPEN_TERMS) || includesAny(text, AI_STUDIO_CREATION_TERMS) || isNewWebsiteCreationRequest(text)) {
        return 'aiStudio';
    }

    const match = DASHBOARD_MODULE_TERMS.find(({ terms }) => includesAny(text, terms));
    return match?.module || null;
}

export const inferGlobalAssistantEntryModule = inferDashboardAssistantModule;

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
        id: 'train_chatcore',
        module: 'chatbot',
        labelKey: 'dashboard.assistantQuickActions.trainChatCore',
        labelFallback: 'Train ChatCore',
        promptKey: 'dashboard.assistantQuickActions.trainChatCorePrompt',
        promptFallback: 'Train ChatCore for the active project by syncing reviewed project knowledge, keeping visitor chat memory separate.',
        category: 'analyze',
        requiresProject: true,
    },
    {
        id: 'create_appointment',
        module: 'appointments',
        labelKey: 'dashboard.assistantQuickActions.createAppointment',
        labelFallback: 'Create appointment',
        promptKey: 'dashboard.assistantQuickActions.createAppointmentPrompt',
        promptFallback: 'Create an appointment draft for the active project and ask for any missing service, date, time, contact, and consent details.',
        category: 'create',
        requiresProject: true,
    },
    {
        id: 'improve_bio_page',
        module: 'bioPage',
        labelKey: 'dashboard.assistantQuickActions.improveBioPage',
        labelFallback: 'Improve Bio Page',
        promptKey: 'dashboard.assistantQuickActions.improveBioPagePrompt',
        promptFallback: 'Review the active project Bio Page and propose safe link, block, lead capture, booking, and ChatCore improvements.',
        category: 'analyze',
        requiresProject: true,
    },
    {
        id: 'analyze_project',
        module: 'analytics',
        labelKey: 'dashboard.assistantQuickActions.analyzeProject',
        labelFallback: 'Analyze project',
        promptKey: 'dashboard.assistantQuickActions.analyzeProjectPrompt',
        promptFallback: 'Analyze the active project readiness, analytics, blockers, and next best actions across modules.',
        category: 'analyze',
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
    hasActiveProject?: boolean;
    canUseAdminMode?: boolean;
    limit?: number;
}): DashboardAssistantQuickAction[] {
    const limit = input.limit ?? 10;
    const hasProjectTarget = input.hasProjects || input.hasActiveProject === true;
    return DASHBOARD_ASSISTANT_QUICK_ACTIONS
        .filter(action => !action.requiresProject || hasProjectTarget)
        .filter(action => !action.adminOnly || input.canUseAdminMode === true)
        .slice(0, limit);
}

export function routeDashboardAssistantEntry(request: string): DashboardAssistantEntryRoute {
    const text = normalize(request);
    const activeModule = inferDashboardAssistantModule(request);

    if (!text) {
        return {
            destination: 'none',
            reason: 'empty_dashboard_request_ignored',
            forwardPromptToAiStudio: false,
            activeModule: null,
        };
    }

    if (includesAny(text, AI_STUDIO_CREATION_TERMS)) {
        return {
            destination: 'ai_studio',
            reason: 'explicit_ai_studio_creation_request',
            forwardPromptToAiStudio: true,
            activeModule: 'aiStudio',
        };
    }

    if (includesAny(text, AI_STUDIO_OPEN_TERMS)) {
        return {
            destination: 'ai_studio',
            reason: 'explicit_ai_studio_open_request',
            forwardPromptToAiStudio: false,
            activeModule: 'aiStudio',
        };
    }

    return {
        destination: 'global_assistant',
        reason: 'dashboard_request_routes_to_global_operating_layer',
        forwardPromptToAiStudio: false,
        activeModule,
    };
}

export function buildDashboardAssistantEntryMetadata(input: DashboardAssistantEntryMetadataInput): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
        route: 'dashboard',
        entryPoint: input.entryPoint,
        sourceComponent: 'DashboardWelcome',
        assistantLayer: 'global_operating_layer',
        commandCenter: true,
        memoryScopeHint: 'user_tenant_project_module_session_task',
        projectCount: input.projectCount,
        hasProjects: input.projectCount > 0,
        routingReason: input.routingReason,
        requestedMode: input.activeModule === 'admin' || input.quickAction?.module === 'admin'
            ? 'admin'
            : 'user',
    };

    const activeModule = input.activeModule || input.quickAction?.module || null;
    if (activeModule) metadata.activeModule = activeModule;
    if (input.activeProjectId) metadata.activeProjectId = input.activeProjectId;
    if (input.activeProjectName) metadata.activeProjectName = input.activeProjectName;
    if (input.activeTenantId) metadata.activeTenantId = input.activeTenantId;
    if (input.activeTenantName) metadata.activeTenantName = input.activeTenantName;
    if (input.quickAction) {
        metadata.quickActionId = input.quickAction.id;
        metadata.quickActionCategory = input.quickAction.category;
    }

    return metadata;
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
