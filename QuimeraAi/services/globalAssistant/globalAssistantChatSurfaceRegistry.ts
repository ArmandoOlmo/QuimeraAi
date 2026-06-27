import type { AssistantModuleTarget } from '../../types/globalAssistant';

export type GlobalAssistantChatSurfaceId =
    | 'global-operating-layer'
    | 'project-chatcore'
    | 'ai-website-studio'
    | 'email-ai-studio'
    | 'landing-chatbot'
    | 'social-chat-inbox'
    | 'module-content-assistants';

export type GlobalAssistantChatSurfaceKind =
    | 'platform_operator'
    | 'project_customer'
    | 'generation_studio'
    | 'module_assistant'
    | 'public_marketing'
    | 'social_channel';

export interface GlobalAssistantChatSurfaceDefinition {
    id: GlobalAssistantChatSurfaceId;
    label: string;
    kind: GlobalAssistantChatSurfaceKind;
    module: AssistantModuleTarget;
    owner: string;
    primaryComponents: string[];
    routes: string[];
    dataContract: string;
    memoryScope: 'global_assistant_memory' | 'project_chat_config' | 'studio_session' | 'module_runtime' | 'public_marketing_config' | 'social_conversation';
    canGuideGlobalActions: boolean;
    canExecuteGlobalActions: boolean;
    canMutateProjectData: boolean;
    executionBoundary: 'guide_and_navigate' | 'module_local' | 'public_readonly' | 'social_channel';
    aliases: string[];
    guardrail: string;
}

export interface GlobalAssistantChatSurfaceMap {
    generatedAt: string;
    currentSurfaceId: GlobalAssistantChatSurfaceId | null;
    surfaceCount: number;
    globalActionSurfaceId: GlobalAssistantChatSurfaceId;
    surfaces: GlobalAssistantChatSurfaceDefinition[];
    guardrails: string[];
}

export interface BuildGlobalAssistantChatSurfaceMapInput {
    currentSurface?: string | null;
    activeRoute?: string | null;
    generatedAt?: string;
}

const normalizeSurfaceToken = (value: unknown): string =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '');

const GLOBAL_OPERATING_LAYER_SURFACE_TOKENS = new Set([
    'app',
    'admin',
    'dashboard',
    'system',
    'authenticatedapp',
    'globalassistant',
    'globalassistantdrawer',
    'globalassistantinput',
    'commandpalette',
    'commandcenter',
]);

export const GLOBAL_ASSISTANT_CHAT_SURFACES: GlobalAssistantChatSurfaceDefinition[] = [
    {
        id: 'global-operating-layer',
        label: 'Global Assistant Operating Layer',
        kind: 'platform_operator',
        module: 'project',
        owner: 'services/globalAssistant',
        primaryComponents: ['GlobalCommandPalette', 'GlobalAiAssistant'],
        routes: ['/dashboard', '/admin/global-assistant'],
        dataContract: 'AssistantContextSnapshot + GlobalAssistantRuntime',
        memoryScope: 'global_assistant_memory',
        canGuideGlobalActions: true,
        canExecuteGlobalActions: false,
        canMutateProjectData: false,
        executionBoundary: 'guide_and_navigate',
        aliases: [
            'global assistant',
            'global assistant drawer',
            'global assistant input',
            'operating layer',
            'command center',
            'command palette',
            'dashboard input',
            'authenticated app',
        ],
        guardrail: 'Global Assistant guides and navigates to the right module; project or tenant changes must be reviewed and applied inside the destination module.',
    },
    {
        id: 'project-chatcore',
        label: 'ChatCore project chatbot',
        kind: 'project_customer',
        module: 'chatbot',
        owner: 'components/chat/ChatCore',
        primaryComponents: ['ChatCore', 'ChatbotWidget', 'EmbedWidget', 'ChatSimulator'],
        routes: ['/ai-assistant', '/website-preview', '/widget-embed'],
        dataContract: 'AiAssistantConfig + Project + ChatbotEngine blueprint',
        memoryScope: 'project_chat_config',
        canGuideGlobalActions: false,
        canExecuteGlobalActions: false,
        canMutateProjectData: true,
        executionBoundary: 'module_local',
        aliases: ['chatcore', 'chatbot', 'project assistant', 'website widget'],
        guardrail: 'Customer-facing ChatCore can create leads or appointments, but it must not execute Global Assistant admin actions.',
    },
    {
        id: 'ai-website-studio',
        label: 'AI Website Studio',
        kind: 'generation_studio',
        module: 'aiStudio',
        owner: 'components/studio',
        primaryComponents: ['AIWebsiteStudio', 'StudioChatPanel', 'StudioShell'],
        routes: ['/ai-studio', '/onboarding'],
        dataContract: 'WebsitePlan + BusinessBlueprint generation state',
        memoryScope: 'studio_session',
        canGuideGlobalActions: false,
        canExecuteGlobalActions: false,
        canMutateProjectData: true,
        executionBoundary: 'module_local',
        aliases: ['ai studio', 'website studio', 'generation studio', 'onboarding chat'],
        guardrail: 'AI Studio creates or revises generation plans; Operating Layer actions must wrap platform-wide execution.',
    },
    {
        id: 'email-ai-studio',
        label: 'Email Marketing AI Studio',
        kind: 'module_assistant',
        module: 'emailMarketing',
        owner: 'components/dashboard/email/email-hub',
        primaryComponents: ['AIStudioTab', 'useUserAIEmailStudio', 'useAIEmailStudio'],
        routes: ['/email', '/admin/email-hub'],
        dataContract: 'Email campaign, automation, audience, and review queue drafts',
        memoryScope: 'module_runtime',
        canGuideGlobalActions: false,
        canExecuteGlobalActions: false,
        canMutateProjectData: true,
        executionBoundary: 'module_local',
        aliases: ['email ai studio', 'email studio', 'email hub chat'],
        guardrail: 'Email Studio drafts and reviews marketing assets inside Email Hub, not cross-module admin plans.',
    },
    {
        id: 'landing-chatbot',
        label: 'Quimera public landing chatbot',
        kind: 'public_marketing',
        module: 'admin',
        owner: 'components/LandingChatbotWidget',
        primaryComponents: ['LandingChatbotWidget', 'LandingChatbotAdmin', 'LandingChatSimulator'],
        routes: ['/', '/admin/landing-chatbot'],
        dataContract: 'LandingChatbotConfig + public marketing FAQ',
        memoryScope: 'public_marketing_config',
        canGuideGlobalActions: false,
        canExecuteGlobalActions: false,
        canMutateProjectData: false,
        executionBoundary: 'public_readonly',
        aliases: ['landing chatbot', 'public chatbot', 'marketing chatbot'],
        guardrail: 'The public landing chatbot answers Quimera marketing questions and must stay outside tenant project memory.',
    },
    {
        id: 'social-chat-inbox',
        label: 'Social channel inbox',
        kind: 'social_channel',
        module: 'crm',
        owner: 'components/dashboard/ai/SocialChatInbox',
        primaryComponents: ['SocialChatInbox', 'useSocialChat', 'useSocialChatAnalytics'],
        routes: ['/ai-assistant'],
        dataContract: 'Social conversation threads + CRM lead handoff',
        memoryScope: 'social_conversation',
        canGuideGlobalActions: false,
        canExecuteGlobalActions: false,
        canMutateProjectData: true,
        executionBoundary: 'social_channel',
        aliases: ['social chat', 'whatsapp', 'facebook messenger', 'instagram dm', 'inbox'],
        guardrail: 'Social channels manage external conversations and lead handoff, not global command execution.',
    },
    {
        id: 'module-content-assistants',
        label: 'Module content assistants',
        kind: 'module_assistant',
        module: 'website',
        owner: 'module-specific dashboards',
        primaryComponents: ['SEOAiAssistant', 'ContentCreatorAssistant', 'AIContentAssistant', 'AINewsStudio'],
        routes: ['/cms', '/seo', '/admin/content', '/admin/news'],
        dataContract: 'Module-local content drafts and settings',
        memoryScope: 'module_runtime',
        canGuideGlobalActions: false,
        canExecuteGlobalActions: false,
        canMutateProjectData: true,
        executionBoundary: 'module_local',
        aliases: ['seo assistant', 'cms assistant', 'content assistant', 'news studio'],
        guardrail: 'Module assistants should stay scoped to their local content contract unless routed through the Operating Layer.',
    },
];

const surfaceMatchesInput = (
    surface: GlobalAssistantChatSurfaceDefinition,
    input: BuildGlobalAssistantChatSurfaceMapInput,
): boolean => {
    const currentSurface = normalizeSurfaceToken(input.currentSurface);
    const activeRoute = String(input.activeRoute || '').toLowerCase();
    const tokens = [
        surface.id,
        surface.label,
        surface.kind,
        surface.module,
        ...surface.aliases,
    ].map(normalizeSurfaceToken);

    return Boolean(
        (currentSurface && tokens.some(token => token === currentSurface || token.includes(currentSurface) || currentSurface.includes(token)))
        || (activeRoute && surface.routes.some(route => activeRoute === route || activeRoute.startsWith(`${route}/`))),
    );
};

export function buildGlobalAssistantChatSurfaceMap(
    input: BuildGlobalAssistantChatSurfaceMapInput = {},
): GlobalAssistantChatSurfaceMap {
    const requestedSurface = normalizeSurfaceToken(input.currentSurface);
    const forcedGlobalSurface = requestedSurface && GLOBAL_OPERATING_LAYER_SURFACE_TOKENS.has(requestedSurface)
        ? GLOBAL_ASSISTANT_CHAT_SURFACES.find(surface => surface.id === 'global-operating-layer')
        : null;
    const currentSurface = forcedGlobalSurface || GLOBAL_ASSISTANT_CHAT_SURFACES.find(surface => surfaceMatchesInput(surface, input));

    return {
        generatedAt: input.generatedAt || new Date().toISOString(),
        currentSurfaceId: currentSurface?.id || null,
        surfaceCount: GLOBAL_ASSISTANT_CHAT_SURFACES.length,
        globalActionSurfaceId: 'global-operating-layer',
        surfaces: GLOBAL_ASSISTANT_CHAT_SURFACES,
        guardrails: [
            'Global Assistant is the global guide and navigation surface; it does not apply project or tenant changes from the drawer.',
            'Project ChatCore remains customer-facing and uses AiAssistantConfig, not GlobalAssistantMemory.',
            'Studio and module assistants keep their local draft contracts unless the dashboard input routes them through GlobalAssistantRuntime.',
            'Public landing chatbot memory is not tenant or project memory.',
        ],
    };
}
