import type { AssistantModuleTarget } from '../../types/globalAssistant';
import type { PlatformServiceId } from '../../types/serviceAvailability';

export const GLOBAL_ASSISTANT_ENTRY_EVENT = 'quimera:global-assistant-entry';
export const GLOBAL_ASSISTANT_ENTRY_STORAGE_KEY = 'quimera_global_assistant_entry_request';

export type GlobalAssistantEntrySource =
    | 'dashboard_welcome'
    | 'dashboard_quick_action'
    | 'agency_client_360'
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
    serviceId?: PlatformServiceId;
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
    blockedModule?: AssistantModuleTarget | null;
    blockedServiceId?: PlatformServiceId | null;
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
    'por un',
    'por una',
    'for a',
    'for my',
    'negocio',
    'business',
    'firma',
    'arquitecto',
    'arquitectura',
    'architect',
    'architecture',
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
        module: 'aiStudio',
        terms: ['ai studio', 'web design studio', 'estudio de ia', 'studio de ia'],
    },
    {
        module: 'admin',
        terms: ['admin', 'owner mode', 'modo owner', 'modo admin', 'super admin', 'superadmin', 'platform error', 'errores plataforma', 'service availability', 'feature flag', 'ai log', 'api log'],
    },
    {
        module: 'chatbot',
        terms: ['chatcore', 'chat core', 'chatbot', 'knowledge', 'conocimiento del chat', 'entrena', 'entrenar', 'train bot', 'visitor chat'],
    },
    {
        module: 'businessBlueprint',
        terms: ['businessblueprint', 'business blueprint', 'blueprint', 'business map', 'mapa de negocio', 'plan del negocio', 'plan de negocio'],
    },
    {
        module: 'storefront',
        terms: ['storefront', 'storefrontbuilder', 'escaparate', 'storefront builder', 'store builder', 'public store', 'tienda publica', 'product card', 'catalog section'],
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
        terms: ['realty', 'real estate', 'bienes raices', 'propiedad', 'listing', 'open house', 'inmobiliaria'],
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
        module: 'agency',
        terms: ['agency', 'agencia', 'white label', 'clientes agencia', 'agency clients', 'planes agencia', 'facturacion agencia', 'facturación agencia'],
    },
    {
        module: 'media',
        terms: ['imagen', 'image', 'foto', 'video', 'asset', 'media', 'hero image'],
    },
    {
        module: 'website',
        terms: ['website', 'websitebuilder', 'web', 'pagina', 'editor', 'hero', 'seccion', 'section', 'website builder'],
    },
    {
        module: 'settings',
        terms: ['settings', 'ajustes', 'configuracion', 'workspace', 'team', 'equipo', 'cuenta', 'account', 'tenant'],
    },
    {
        module: 'designSystem',
        terms: ['design system', 'design tokens', 'tokens de diseno', 'tokens de diseño', 'colores globales', 'tipografias globales', 'tipografías globales'],
    },
    {
        module: 'project',
        terms: ['proyecto', 'proyectos', 'project', 'projects', 'websites', 'cambia de proyecto', 'switch project'],
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
    if (
        includesAny(text, ['video', 'reel', 'short', 'media ai'])
        || (includesAny(text, ['imagen', 'image', 'foto', 'hero image']) && includesAny(text, ['crea', 'crear', 'create', 'genera', 'generar', 'generate']))
    ) {
        return 'media';
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
        labelFallback: 'AI Studio',
        promptKey: 'dashboard.assistantQuickActions.createWebsitePrompt',
        promptFallback: 'Use AI Studio for website questions, planning, content, images, and project guidance.',
        category: 'create',
        requiresProject: false,
        serviceId: 'aiFeatures',
    },
    {
        id: 'open_website_builder',
        module: 'website',
        labelKey: 'dashboard.assistantQuickActions.openWebsiteBuilder',
        labelFallback: 'Website Builder',
        promptKey: 'dashboard.assistantQuickActions.openWebsiteBuilderPrompt',
        promptFallback: 'Use Website Builder for website sections, copy, images, layout, and styles.',
        category: 'open',
        requiresProject: true,
    },
    {
        id: 'open_storefront_builder',
        module: 'storefront',
        labelKey: 'dashboard.assistantQuickActions.openStorefrontBuilder',
        labelFallback: 'Storefront',
        promptKey: 'dashboard.assistantQuickActions.openStorefrontBuilderPrompt',
        promptFallback: 'Use Storefront for public store sections, product cards, catalog layout, and selling settings.',
        category: 'open',
        requiresProject: true,
        serviceId: 'ecommerce',
    },
    {
        id: 'generate_hero_image',
        module: 'media',
        labelKey: 'dashboard.assistantQuickActions.generateHeroImage',
        labelFallback: 'Images',
        promptKey: 'dashboard.assistantQuickActions.generateHeroImagePrompt',
        promptFallback: 'Use the image generator for image questions, prompts, sizes, styles, and drafts.',
        category: 'create',
        requiresProject: true,
        serviceId: 'aiFeatures',
    },
    {
        id: 'create_video',
        module: 'media',
        labelKey: 'dashboard.assistantQuickActions.createVideo',
        labelFallback: 'Videos',
        promptKey: 'dashboard.assistantQuickActions.createVideoPrompt',
        promptFallback: 'Use the video area for video questions, prompts, scenes, formats, and drafts.',
        category: 'create',
        requiresProject: true,
        serviceId: 'aiFeatures',
    },
    {
        id: 'review_leads',
        module: 'crm',
        labelKey: 'dashboard.assistantQuickActions.reviewLeads',
        labelFallback: 'Leads',
        promptKey: 'dashboard.assistantQuickActions.reviewLeadsPrompt',
        promptFallback: 'Use Leads for questions, review, follow-ups, and lead management.',
        category: 'analyze',
        requiresProject: true,
        serviceId: 'crm',
    },
    {
        id: 'create_email',
        module: 'emailMarketing',
        labelKey: 'dashboard.assistantQuickActions.createEmail',
        labelFallback: 'Email',
        promptKey: 'dashboard.assistantQuickActions.createEmailPrompt',
        promptFallback: 'Use Email Marketing for email questions, drafts, audiences, campaigns, and review.',
        category: 'create',
        requiresProject: true,
        serviceId: 'emailMarketing',
    },
    {
        id: 'open_ecommerce',
        module: 'ecommerce',
        labelKey: 'dashboard.assistantQuickActions.openEcommerce',
        labelFallback: 'Ecommerce',
        promptKey: 'dashboard.assistantQuickActions.openEcommercePrompt',
        promptFallback: 'Use Ecommerce for store questions, products, orders, inventory, and setup.',
        category: 'open',
        requiresProject: true,
        serviceId: 'ecommerce',
    },
    {
        id: 'open_finance',
        module: 'finance',
        labelKey: 'dashboard.assistantQuickActions.openFinance',
        labelFallback: 'Finance',
        promptKey: 'dashboard.assistantQuickActions.openFinancePrompt',
        promptFallback: 'Use Finance for invoices, revenue, expenses, and project financial status.',
        category: 'analyze',
        requiresProject: true,
        serviceId: 'finance',
    },
    {
        id: 'open_restaurants',
        module: 'restaurants',
        labelKey: 'dashboard.assistantQuickActions.openRestaurants',
        labelFallback: 'Restaurants',
        promptKey: 'dashboard.assistantQuickActions.openRestaurantsPrompt',
        promptFallback: 'Use Restaurants for menus, reservations, services, and restaurant settings.',
        category: 'open',
        requiresProject: true,
        serviceId: 'restaurants',
    },
    {
        id: 'open_realty',
        module: 'realEstate',
        labelKey: 'dashboard.assistantQuickActions.openRealty',
        labelFallback: 'Realty',
        promptKey: 'dashboard.assistantQuickActions.openRealtyPrompt',
        promptFallback: 'Use Realty for properties, listings, showings, leads, and real estate campaigns.',
        category: 'open',
        requiresProject: true,
        serviceId: 'realEstate',
    },
    {
        id: 'train_chatcore',
        module: 'chatbot',
        labelKey: 'dashboard.assistantQuickActions.trainChatCore',
        labelFallback: 'ChatCore',
        promptKey: 'dashboard.assistantQuickActions.trainChatCorePrompt',
        promptFallback: 'Use ChatCore for assistant questions, knowledge, training, tests, and visitor chat setup.',
        category: 'analyze',
        requiresProject: true,
        serviceId: 'chatbot',
    },
    {
        id: 'create_appointment',
        module: 'appointments',
        labelKey: 'dashboard.assistantQuickActions.createAppointment',
        labelFallback: 'Appointments',
        promptKey: 'dashboard.assistantQuickActions.createAppointmentPrompt',
        promptFallback: 'Use Appointments for schedule questions, bookings, services, availability, and contacts.',
        category: 'create',
        requiresProject: true,
        serviceId: 'appointments',
    },
    {
        id: 'improve_bio_page',
        module: 'bioPage',
        labelKey: 'dashboard.assistantQuickActions.improveBioPage',
        labelFallback: 'Bio Page',
        promptKey: 'dashboard.assistantQuickActions.improveBioPagePrompt',
        promptFallback: 'Use Bio Page for links, blocks, lead capture, booking, and ChatCore questions.',
        category: 'analyze',
        requiresProject: true,
        serviceId: 'bioPage',
    },
];

export function getDashboardAssistantQuickActions(input: {
    hasProjects: boolean;
    hasActiveProject?: boolean;
    canUseAdminMode?: boolean;
    canAccessService?: (serviceId: PlatformServiceId) => boolean;
    limit?: number;
}): DashboardAssistantQuickAction[] {
    const limit = input.limit ?? 18;
    const hasProjectTarget = input.hasProjects || input.hasActiveProject === true;
    return DASHBOARD_ASSISTANT_QUICK_ACTIONS
        .filter(action => !action.requiresProject || hasProjectTarget)
        .filter(action => !action.adminOnly || input.canUseAdminMode === true)
        .filter(action => !action.serviceId || input.canAccessService?.(action.serviceId) !== false)
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
    if (input.blockedModule) metadata.blockedModule = input.blockedModule;
    if (input.blockedServiceId) metadata.blockedServiceId = input.blockedServiceId;
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
