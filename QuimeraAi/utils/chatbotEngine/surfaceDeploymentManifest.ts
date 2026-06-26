import type {
    BlueprintReadiness,
    ChatbotBlueprintOwnerModule,
    ChatbotChannelBlueprint,
    ChatbotDeploymentStatus,
    ChatbotSurface,
} from '../../types/businessBlueprint';

export type ChatbotEngineDeploymentReadinessStatus = 'ready' | 'review' | 'blocked';

export type ChatbotEngineDeploymentSurfaceId = keyof Pick<
    ChatbotChannelBlueprint,
    'webWidget' | 'embeddedWidget' | 'bioPage' | 'storefront' | 'checkout' | 'bookingPage' | 'restaurantMenu' | 'realtyPropertyPage' | 'adminPreview' | 'voice'
>;

export interface ChatbotEngineDeploymentSurfaceDefinition {
    id: ChatbotEngineDeploymentSurfaceId;
    sourceSurface: ChatbotSurface;
    sourceModule: ChatbotBlueprintOwnerModule;
    publicSurface: boolean;
    requiredForCanonicalDeployment: boolean;
    defaultRoutePattern: string;
    requiredContextKeys: string[];
    requiredBlueprintPaths: string[];
    runtimeEvidence: string[];
}

export interface ChatbotEngineDeploymentSurfaceStatus extends ChatbotEngineDeploymentSurfaceDefinition {
    channelExists: boolean;
    enabled: boolean;
    deployed: boolean;
    status: ChatbotDeploymentStatus;
    routePattern?: string;
    contextKeys: string[];
    readinessStatus: ChatbotEngineDeploymentReadinessStatus;
    blockers: string[];
    warnings: string[];
}

export interface ChatbotEngineSurfaceDeploymentManifest {
    surfaces: ChatbotEngineDeploymentSurfaceStatus[];
    requiredSurfaceCount: number;
    deployedRequiredSurfaceCount: number;
    publicSurfaceCount: number;
    deployedPublicSurfaceCount: number;
    missingRequiredSurfaceIds: ChatbotEngineDeploymentSurfaceId[];
    blockedSurfaceIds: ChatbotEngineDeploymentSurfaceId[];
    reviewSurfaceIds: ChatbotEngineDeploymentSurfaceId[];
    coverageStatus: ChatbotEngineDeploymentReadinessStatus;
}

export const CHATBOT_ENGINE_DEPLOYMENT_SURFACES: ChatbotEngineDeploymentSurfaceDefinition[] = [
    {
        id: 'webWidget',
        sourceSurface: 'website',
        sourceModule: 'website-builder',
        publicSurface: true,
        requiredForCanonicalDeployment: true,
        defaultRoutePattern: '/site/:projectSlug/*',
        requiredContextKeys: ['projectId', 'pageId', 'route'],
        requiredBlueprintPaths: ['channels.webWidget', 'deployment.deployedSurfaces', 'agentProfile'],
        runtimeEvidence: ['components/ChatbotWidget.tsx', 'components/LandingPage.tsx', 'components/PublicWebsitePreview.tsx'],
    },
    {
        id: 'storefront',
        sourceSurface: 'storefront',
        sourceModule: 'storefront-builder',
        publicSurface: true,
        requiredForCanonicalDeployment: true,
        defaultRoutePattern: '/store/:projectSlug',
        requiredContextKeys: ['projectId', 'storeId', 'catalog'],
        requiredBlueprintPaths: ['channels.storefront', 'ecommerce', 'deployment.deployedSurfaces'],
        runtimeEvidence: ['components/StorefrontApp.tsx', 'components/ChatbotWidget.tsx'],
    },
    {
        id: 'checkout',
        sourceSurface: 'checkout',
        sourceModule: 'ecommerce',
        publicSurface: true,
        requiredForCanonicalDeployment: true,
        defaultRoutePattern: '/checkout/:projectSlug',
        requiredContextKeys: ['projectId', 'cartId', 'checkoutStep'],
        requiredBlueprintPaths: ['channels.checkout', 'ecommerce', 'deployment.safetySettings'],
        runtimeEvidence: ['components/StorefrontApp.tsx', 'components/ChatbotWidget.tsx'],
    },
    {
        id: 'bioPage',
        sourceSurface: 'bio_page',
        sourceModule: 'bio-page',
        publicSurface: true,
        requiredForCanonicalDeployment: true,
        defaultRoutePattern: '/bio/:slug',
        requiredContextKeys: ['projectId', 'bioPageId', 'visibleBlocks'],
        requiredBlueprintPaths: ['channels.bioPage', 'bioPage', 'knowledgeSources'],
        runtimeEvidence: ['components/PublicBioPage.tsx', 'components/chat/ChatCore.tsx', 'services/bioPage/bioPageChatContextService.ts'],
    },
    {
        id: 'bookingPage',
        sourceSurface: 'booking_page',
        sourceModule: 'appointments',
        publicSurface: true,
        requiredForCanonicalDeployment: true,
        defaultRoutePattern: '/booking/:projectSlug',
        requiredContextKeys: ['projectId', 'serviceId', 'availability'],
        requiredBlueprintPaths: ['channels.bookingPage', 'appointments', 'actions.create_appointment'],
        runtimeEvidence: ['components/PublicWebsitePreview.tsx', 'components/AppointmentBooking.tsx', 'components/chat/ChatCore.tsx'],
    },
    {
        id: 'restaurantMenu',
        sourceSurface: 'restaurant_menu',
        sourceModule: 'restaurants',
        publicSurface: true,
        requiredForCanonicalDeployment: true,
        defaultRoutePattern: '/menu/:restaurantSlug',
        requiredContextKeys: ['projectId', 'restaurantId', 'menuId'],
        requiredBlueprintPaths: ['channels.restaurantMenu', 'restaurants', 'actions.request_restaurant_reservation'],
        runtimeEvidence: ['components/PublicRestaurantMenuPage.tsx', 'components/ChatbotWidget.tsx'],
    },
    {
        id: 'realtyPropertyPage',
        sourceSurface: 'realty_property_page',
        sourceModule: 'real-estate',
        publicSurface: true,
        requiredForCanonicalDeployment: true,
        defaultRoutePattern: '/property/:propertySlug',
        requiredContextKeys: ['projectId', 'propertyId', 'listingId'],
        requiredBlueprintPaths: ['channels.realtyPropertyPage', 'realEstate', 'actions.request_realty_showing'],
        runtimeEvidence: ['components/LandingPage.tsx', 'components/PublicWebsitePreview.tsx', 'components/PublicRealtyPropertyDetail.tsx'],
    },
    {
        id: 'embeddedWidget',
        sourceSurface: 'website',
        sourceModule: 'chatbot-engine',
        publicSurface: true,
        requiredForCanonicalDeployment: false,
        defaultRoutePattern: '/embed/chat/:projectId',
        requiredContextKeys: ['projectId', 'embedOrigin'],
        requiredBlueprintPaths: ['channels.embeddedWidget', 'deployment.embedSettings'],
        runtimeEvidence: ['components/chat/EmbedWidget.tsx', 'api/widget/[projectId]'],
    },
    {
        id: 'adminPreview',
        sourceSurface: 'admin_preview',
        sourceModule: 'chatbot-engine',
        publicSurface: false,
        requiredForCanonicalDeployment: false,
        defaultRoutePattern: '/dashboard/chatbot',
        requiredContextKeys: ['projectId', 'adminUserId', 'testScenarioId'],
        requiredBlueprintPaths: ['channels.adminPreview', 'testing.testScenarios'],
        runtimeEvidence: ['components/dashboard/ai/ChatSimulator.tsx', 'components/dashboard/ai/ChatbotEngineDashboard.tsx'],
    },
    {
        id: 'voice',
        sourceSurface: 'voice',
        sourceModule: 'chatbot-engine',
        publicSurface: true,
        requiredForCanonicalDeployment: false,
        defaultRoutePattern: 'voice://project/:projectId',
        requiredContextKeys: ['projectId', 'voiceSessionId', 'consent'],
        requiredBlueprintPaths: ['channels.voice', 'deployment.voiceSettings'],
        runtimeEvidence: ['components/chat/ChatCore.tsx', 'utils/chatbotEngine/voiceSettings.ts'],
    },
];

const DEFAULT_BLOCKER = [
    'ES: Falta el canal de despliegue en ChatbotBlueprint V2.',
    'EN: Deployment channel is missing from ChatbotBlueprint V2.',
].join('\n');

function readinessStatus(
    readiness?: BlueprintReadiness,
    needsReview = false,
): ChatbotEngineDeploymentReadinessStatus {
    if ((readiness?.blockers || []).length > 0) return 'blocked';
    if (needsReview || (readiness?.warnings || []).length > 0 || readiness?.isReady === false) return 'review';
    return 'ready';
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}

export function buildChatbotEngineSurfaceDeploymentManifest(
    channels: ChatbotChannelBlueprint | null | undefined,
): ChatbotEngineSurfaceDeploymentManifest {
    const surfaces = CHATBOT_ENGINE_DEPLOYMENT_SURFACES.map(definition => {
        const channel = channels?.[definition.id];
        const contextKeys = unique([
            ...definition.requiredContextKeys,
            ...(channel?.contextKeys || []),
        ]);
        const blockers = channel ? channel.readiness.blockers : [DEFAULT_BLOCKER];
        const warnings = channel ? channel.readiness.warnings : [];
        const status = channel?.status || 'draft';
        const enabled = Boolean(channel?.enabled);

        return {
            ...definition,
            channelExists: Boolean(channel),
            enabled,
            deployed: enabled && status === 'deployed',
            status,
            routePattern: channel?.routePattern || definition.defaultRoutePattern,
            contextKeys,
            readinessStatus: readinessStatus(channel?.readiness, !channel || channel.needsReview || status !== 'deployed'),
            blockers,
            warnings,
        } satisfies ChatbotEngineDeploymentSurfaceStatus;
    });

    const requiredSurfaces = surfaces.filter(surface => surface.requiredForCanonicalDeployment);
    const publicSurfaces = surfaces.filter(surface => surface.publicSurface);
    const missingRequiredSurfaceIds = requiredSurfaces
        .filter(surface => !surface.deployed)
        .map(surface => surface.id);
    const blockedRequiredSurfaceIds = requiredSurfaces
        .filter(surface => surface.readinessStatus === 'blocked')
        .map(surface => surface.id);
    const reviewRequiredSurfaceIds = requiredSurfaces
        .filter(surface => surface.readinessStatus === 'review')
        .map(surface => surface.id);
    const blockedSurfaceIds = surfaces
        .filter(surface => surface.readinessStatus === 'blocked')
        .map(surface => surface.id);
    const reviewSurfaceIds = surfaces
        .filter(surface => surface.readinessStatus === 'review')
        .map(surface => surface.id);

    return {
        surfaces,
        requiredSurfaceCount: requiredSurfaces.length,
        deployedRequiredSurfaceCount: requiredSurfaces.filter(surface => surface.deployed).length,
        publicSurfaceCount: publicSurfaces.length,
        deployedPublicSurfaceCount: publicSurfaces.filter(surface => surface.deployed).length,
        missingRequiredSurfaceIds,
        blockedSurfaceIds,
        reviewSurfaceIds,
        coverageStatus: blockedRequiredSurfaceIds.length > 0
            ? 'blocked'
            : missingRequiredSurfaceIds.length > 0 || reviewRequiredSurfaceIds.length > 0
                ? 'review'
                : 'ready',
    };
}
