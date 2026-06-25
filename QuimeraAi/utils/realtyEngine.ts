import type {
    BusinessBlueprint,
    RealEstateEngineArtifactBlueprint,
    RealEstateEngineArtifactKey,
} from '../types/businessBlueprint';
import type {
    PropertyCampaign,
    PropertyOpenHouse,
    RealtyAiGeneration,
    RealtyLead,
    RealtyModuleFlags,
    RealtyProperty,
} from '../types/realty';
import { calculateRealtyListingScore, DEFAULT_REALTY_FLAGS } from './realty';

export type RealtyEngineRuntimeStatus = 'disabled' | 'draft' | 'needs_review' | 'configured';
export type RealtyEngineRegenerationMode = 'locked' | 'preserve_user_edits' | 'safe_draft';

export interface RealtyEngineArtifactRuntime extends RealEstateEngineArtifactBlueprint {
    readinessScore: number;
    runtimeStatus: RealtyEngineRuntimeStatus;
    regenerationMode: RealtyEngineRegenerationMode;
    metrics: Array<{ label: string; value: string | number }>;
    warnings: string[];
    blockers: string[];
}

export interface RealtyEngineModuleSummary {
    id: string;
    title: string;
    status: RealtyEngineRuntimeStatus;
    description: string;
    refs: string[];
    needsReview: boolean;
}

export interface RealtyEnginePlan {
    enabled: boolean;
    status: RealtyEngineRuntimeStatus;
    readinessScore: number;
    needsReviewCount: number;
    protectedArtifactCount: number;
    artifacts: RealtyEngineArtifactRuntime[];
    modules: RealtyEngineModuleSummary[];
    guardrails: string[];
    opportunities: string[];
    blockers: string[];
    warnings: string[];
}

export interface RealtyEnginePlanInput {
    businessBlueprint?: BusinessBlueprint | null;
    flags?: Partial<RealtyModuleFlags> | null;
    properties: RealtyProperty[];
    leads: RealtyLead[];
    campaigns: PropertyCampaign[];
    openHouses: PropertyOpenHouse[];
    aiGenerations: RealtyAiGeneration[];
}

const DEFAULT_ROUTES = {
    profile: '/agente',
    directory: '/listados',
    propertyDetail: '/listados/:slug',
    openHouses: '/open-houses',
};

const DEFAULT_ARTIFACTS: Array<Pick<RealEstateEngineArtifactBlueprint, 'key' | 'module' | 'title' | 'description' | 'dependencies' | 'analyticsEvents'>> = [
    { key: 'business_blueprint', module: 'ai-studio', title: 'BusinessBlueprint', description: 'Real estate source of truth for AI Studio generation.' },
    { key: 'website', module: 'website-builder', title: 'Website Builder', description: 'Website, profile, listing, and lead pages generated as drafts.', dependencies: ['business_blueprint'] },
    { key: 'profile', module: 'website-builder', title: 'Agent/Brokerage profile', description: 'Public identity, license, contact, CTA, and trust content.', dependencies: ['business_blueprint'] },
    { key: 'listings', module: 'real-estate', title: 'Listings', description: 'Inventory, draft states, quality scoring, and public flags.' },
    { key: 'property_pages', module: 'website-builder', title: 'Property pages', description: 'Public detail pages with SEO, media, FAQ, and lead capture.', dependencies: ['listings'] },
    { key: 'directory', module: 'website-builder', title: 'Public directory', description: 'Searchable listing directory for active public properties.', dependencies: ['listings'] },
    { key: 'open_houses', module: 'real-estate', title: 'Open houses', description: 'Open house scheduling and public registrations.', dependencies: ['listings'] },
    { key: 'showing_requests', module: 'appointments', title: 'Showing requests', description: 'Appointment-ready showing requests from listing CTAs.', dependencies: ['property_pages'] },
    { key: 'lead_funnels', module: 'crm', title: 'Lead funnels', description: 'Buyer, seller, renter, investor, and lead magnet funnels.', dependencies: ['property_pages', 'directory'] },
    { key: 'campaigns', module: 'email-marketing', title: 'Campaigns', description: 'Just listed, open house, price drop, and nurture campaigns.', dependencies: ['listings'] },
    { key: 'chatbot_knowledge', module: 'chatbot', title: 'Chatbot knowledge', description: 'Reviewed knowledge for listings, FAQs, qualification, and showing flow.', dependencies: ['listings', 'profile'] },
    { key: 'email_automations', module: 'email-marketing', title: 'Email automations', description: 'Follow-up, confirmation, guide delivery, and nurture flows.', dependencies: ['lead_funnels'] },
    { key: 'crm_pipeline', module: 'crm', title: 'CRM pipeline', description: 'Pipeline stages and tags connected to Quimera Leads.', dependencies: ['lead_funnels'] },
    { key: 'appointments', module: 'appointments', title: 'Appointments', description: 'Private showings, consultations, and open house booking types.', dependencies: ['showing_requests'] },
    { key: 'ecommerce_products', module: 'ecommerce', title: 'Digital products', description: 'Buyer guides, reports, consultations, deposits, and paid products.', dependencies: ['business_blueprint'] },
    { key: 'finance', module: 'finance', title: 'Finance', description: 'Revenue sources for consultations, products, promotions, and referrals.', dependencies: ['ecommerce_products'] },
    { key: 'analytics', module: 'analytics', title: 'Analytics', description: 'Events and dashboards for listings, leads, campaigns, bookings, and revenue.', dependencies: ['directory', 'lead_funnels'] },
    { key: 'monetization', module: 'ecommerce', title: 'Monetization', description: 'Reviewable revenue opportunities for agents and brokerages.', dependencies: ['ecommerce_products', 'finance'] },
];

const keyLabel = (key: RealEstateEngineArtifactKey) => key.replace(/_/g, ' ');

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const unique = (values: Array<string | undefined | null>, limit = 8) => {
    const seen = new Set<string>();
    const result: string[] = [];
    values.forEach(value => {
        const normalized = value?.trim();
        if (!normalized) return;
        const key = normalized.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        result.push(normalized);
    });
    return result.slice(0, limit);
};

const isConfiguredStatus = (status?: string) => ['configured', 'active', 'published', 'completed'].includes(String(status || ''));
const isDraftStatus = (status?: string) => ['draft', 'needs_review', 'scheduled'].includes(String(status || ''));

const resolveBlueprintArtifacts = (blueprint?: BusinessBlueprint | null): RealEstateEngineArtifactBlueprint[] => {
    const source = blueprint?.realEstateBlueprint;
    if (source?.engineArtifacts?.length) return source.engineArtifacts;
    const now = blueprint?.updatedAt || new Date().toISOString();

    return DEFAULT_ARTIFACTS.map(item => ({
        id: `real-estate-${item.key}`,
        key: item.key,
        module: item.module,
        title: item.title,
        description: item.description,
        status: blueprint?.realEstateBlueprint?.enabled ? 'needs_review' : 'draft',
        needsReview: true,
        generatedByAI: true,
        userModified: false,
        sourceMap: {
            fallback: 'utils.realtyEngine.DEFAULT_ARTIFACTS',
            generatedAt: now,
        },
        dependencies: item.dependencies || [],
        analyticsEvents: item.analyticsEvents || [],
    }));
};

const artifactStats = (key: RealEstateEngineArtifactKey, input: RealtyEnginePlanInput) => {
    const properties = input.properties || [];
    const publicProperties = properties.filter(property => property.status === 'active' && property.publicEnabled !== false);
    const highQualityProperties = properties.filter(property => calculateRealtyListingScore(property).score >= 70);
    const leads = input.leads || [];
    const campaigns = input.campaigns || [];
    const openHouses = input.openHouses || [];
    const aiGenerations = input.aiGenerations || [];
    const blueprint = input.businessBlueprint?.realEstateBlueprint;

    switch (key) {
        case 'business_blueprint':
            return {
                score: blueprint?.enabled ? 80 : 20,
                metrics: [{ label: 'status', value: blueprint?.status || 'draft' }],
                configured: Boolean(blueprint?.enabled),
                warnings: blueprint?.needsReview ? ['BusinessBlueprint still needs review.'] : [],
                blockers: blueprint?.enabled ? [] : ['Real estate blueprint is not enabled.'],
            };
        case 'website':
            return {
                score: publicProperties.length > 0 ? 75 : 45,
                metrics: [{ label: 'routes', value: Object.keys(blueprint?.websiteRoutes || DEFAULT_ROUTES).length }],
                configured: publicProperties.length > 0,
                warnings: ['Website drafts should be reviewed in Website Builder before publishing.'],
                blockers: [],
            };
        case 'profile':
            return {
                score: blueprint?.profileType ? 70 : 35,
                metrics: [{ label: 'profile', value: blueprint?.profileType || 'agent' }],
                configured: Boolean(blueprint?.profileType),
                warnings: ['Agent or brokerage profile needs license/contact review.'],
                blockers: [],
            };
        case 'listings':
            return {
                score: properties.length ? Math.max(50, Math.round(highQualityProperties.length / properties.length * 100)) : 20,
                metrics: [{ label: 'properties', value: properties.length }, { label: 'quality', value: highQualityProperties.length }],
                configured: highQualityProperties.length > 0,
                warnings: properties.length ? [] : ['Create at least one listing draft.'],
                blockers: [],
            };
        case 'property_pages':
            return {
                score: publicProperties.length ? 80 : 35,
                metrics: [{ label: 'public', value: publicProperties.length }],
                configured: publicProperties.length > 0,
                warnings: publicProperties.length ? [] : ['Publish at least one reviewed listing to generate public detail pages.'],
                blockers: [],
            };
        case 'directory':
            return {
                score: input.flags?.real_estate_public_directory_enabled === false ? 10 : publicProperties.length ? 85 : 40,
                metrics: [{ label: 'directory', value: input.flags?.real_estate_public_directory_enabled === false ? 'off' : 'on' }],
                configured: input.flags?.real_estate_public_directory_enabled !== false && publicProperties.length > 0,
                warnings: publicProperties.length ? [] : ['Directory needs reviewed public listings.'],
                blockers: input.flags?.real_estate_public_directory_enabled === false ? ['Public directory is disabled.'] : [],
            };
        case 'open_houses':
            return {
                score: openHouses.length ? 75 : 35,
                metrics: [{ label: 'open houses', value: openHouses.length }],
                configured: openHouses.some(item => isConfiguredStatus(item.status)),
                warnings: openHouses.length ? [] : ['No open house draft exists yet.'],
                blockers: [],
            };
        case 'showing_requests':
        case 'appointments':
            return {
                score: leads.some(lead => lead.preferredDate) || openHouses.length ? 70 : 35,
                metrics: [{ label: 'requests', value: leads.filter(lead => lead.preferredDate).length }],
                configured: leads.some(lead => lead.preferredDate),
                warnings: ['Confirm appointment availability before enabling automated showing confirmations.'],
                blockers: [],
            };
        case 'lead_funnels':
        case 'crm_pipeline':
            return {
                score: leads.length ? 75 : 45,
                metrics: [{ label: 'leads', value: leads.length }, { label: 'sources', value: unique(leads.map(lead => lead.source)).length }],
                configured: leads.length > 0,
                warnings: leads.length ? [] : ['No real estate leads have been captured yet.'],
                blockers: [],
            };
        case 'campaigns':
            return {
                score: campaigns.length ? 70 : 35,
                metrics: [{ label: 'campaigns', value: campaigns.length }, { label: 'drafts', value: campaigns.filter(campaign => isDraftStatus(campaign.status)).length }],
                configured: campaigns.some(campaign => isConfiguredStatus(campaign.status)),
                warnings: campaigns.length ? [] : ['Generate at least one campaign draft for a listing.'],
                blockers: [],
            };
        case 'chatbot_knowledge':
            return {
                score: aiGenerations.length || properties.some(property => property.metadata?.faq) ? 65 : 35,
                metrics: [{ label: 'knowledge drafts', value: aiGenerations.length }],
                configured: false,
                warnings: ['Chatbot knowledge stays draft-only until reviewed in Quimera Chat.'],
                blockers: [],
            };
        case 'email_automations':
            return {
                score: blueprint?.emailAutomations?.length ? 65 : 35,
                metrics: [{ label: 'flows', value: blueprint?.emailAutomations?.length || 0 }],
                configured: false,
                warnings: ['Email automations are not sent until reviewed and activated in Email Marketing.'],
                blockers: [],
            };
        case 'ecommerce_products':
        case 'monetization':
            return {
                score: blueprint?.digitalProducts?.length ? 65 : 30,
                metrics: [{ label: 'offers', value: blueprint?.digitalProducts?.length || 0 }],
                configured: false,
                warnings: ['Digital products and offers need pricing, payments, and fulfillment review.'],
                blockers: [],
            };
        case 'finance':
            return {
                score: blueprint?.financeRevenueSources?.length ? 60 : 25,
                metrics: [{ label: 'revenue sources', value: blueprint?.financeRevenueSources?.length || 0 }],
                configured: false,
                warnings: ['Finance tracking is a draft until payment sources are connected.'],
                blockers: [],
            };
        case 'analytics':
            return {
                score: blueprint?.analyticsEvents?.length ? 70 : 40,
                metrics: [{ label: 'events', value: blueprint?.analyticsEvents?.length || 0 }],
                configured: false,
                warnings: ['Analytics event definitions are drafted; runtime tracking still needs implementation review.'],
                blockers: [],
            };
        default:
            return {
                score: 40,
                metrics: [],
                configured: false,
                warnings: [],
                blockers: [],
            };
    }
};

const resolveRuntimeStatus = (
    enabled: boolean,
    artifact: RealEstateEngineArtifactBlueprint,
    configured: boolean,
    score: number,
): RealtyEngineRuntimeStatus => {
    if (!enabled || artifact.status === 'disabled') return 'disabled';
    if (configured && score >= 75 && !artifact.needsReview) return 'configured';
    if (score >= 50 || artifact.needsReview || artifact.status === 'needs_review') return 'needs_review';
    return 'draft';
};

const resolveRegenerationMode = (artifact: RealEstateEngineArtifactBlueprint): RealtyEngineRegenerationMode => {
    if (artifact.lockedFromRegeneration) return 'locked';
    if (artifact.userModified) return 'preserve_user_edits';
    return 'safe_draft';
};

export function createRealtyEnginePlan(input: RealtyEnginePlanInput): RealtyEnginePlan {
    const flags = { ...DEFAULT_REALTY_FLAGS, ...(input.flags || {}) };
    const blueprint = input.businessBlueprint?.realEstateBlueprint;
    const enabled = flags.real_estate_enabled !== false && blueprint?.enabled !== false;
    const artifacts = resolveBlueprintArtifacts(input.businessBlueprint).map(artifact => {
        const stats = artifactStats(artifact.key, { ...input, flags });
        const readinessScore = enabled ? clampScore(stats.score) : 0;
        const runtimeStatus = resolveRuntimeStatus(enabled, artifact, stats.configured, readinessScore);

        return {
            ...artifact,
            readinessScore,
            runtimeStatus,
            regenerationMode: resolveRegenerationMode(artifact),
            metrics: stats.metrics,
            warnings: stats.warnings,
            blockers: enabled ? stats.blockers : ['Realty module is disabled.'],
        };
    });
    const readinessScore = artifacts.length
        ? clampScore(artifacts.reduce((total, artifact) => total + artifact.readinessScore, 0) / artifacts.length)
        : 0;
    const status: RealtyEngineRuntimeStatus = !enabled
        ? 'disabled'
        : artifacts.some(artifact => artifact.runtimeStatus === 'configured')
            ? 'needs_review'
            : readinessScore >= 50
                ? 'needs_review'
                : 'draft';
    const protectedArtifactCount = artifacts.filter(artifact => artifact.regenerationMode !== 'safe_draft').length;
    const needsReviewCount = artifacts.filter(artifact => artifact.needsReview || artifact.runtimeStatus === 'needs_review').length;
    const blockers = unique(artifacts.flatMap(artifact => artifact.blockers), 8);
    const warnings = unique(artifacts.flatMap(artifact => artifact.warnings), 8);

    return {
        enabled,
        status,
        readinessScore,
        needsReviewCount,
        protectedArtifactCount,
        artifacts,
        modules: [
            {
                id: 'business-blueprint',
                title: 'BusinessBlueprint',
                status: blueprint?.enabled ? 'needs_review' : 'draft',
                description: 'Real estate generation contract used by AI Studio.',
                refs: [input.businessBlueprint?.projectId || 'businessBlueprint'].filter(Boolean),
                needsReview: Boolean(blueprint?.needsReview),
            },
            {
                id: 'website-builder',
                title: 'Website Builder',
                status: input.properties.some(property => property.status === 'active') ? 'needs_review' : 'draft',
                description: `Routes: ${Object.values(blueprint?.websiteRoutes || DEFAULT_ROUTES).join(', ')}`,
                refs: unique(input.properties.map(property => property.slug), 6),
                needsReview: true,
            },
            {
                id: 'crm-leads',
                title: 'CRM / Leads',
                status: input.leads.length ? 'needs_review' : 'draft',
                description: 'Realty leads sync into CRM with draft-safe funnel metadata.',
                refs: unique(input.leads.map(lead => lead.email), 6),
                needsReview: true,
            },
            {
                id: 'campaign-automation',
                title: 'Campaigns + Email',
                status: input.campaigns.length ? 'needs_review' : 'draft',
                description: 'Campaign and email automation drafts for listing and lead follow-up.',
                refs: unique(input.campaigns.map(campaign => campaign.title), 6),
                needsReview: true,
            },
            {
                id: 'appointments-open-houses',
                title: 'Appointments + Open Houses',
                status: input.openHouses.length ? 'needs_review' : 'draft',
                description: 'Showing requests and open house registrations routed to Appointments.',
                refs: unique(input.openHouses.map(openHouse => openHouse.title || openHouse.propertyId), 6),
                needsReview: true,
            },
            {
                id: 'commerce-finance',
                title: 'Ecommerce + Finance',
                status: blueprint?.digitalProducts?.length ? 'needs_review' : 'draft',
                description: 'Digital products, consultations, valuation packages, and revenue tracking.',
                refs: unique([...(blueprint?.digitalProducts || []), ...(blueprint?.financeRevenueSources || [])], 6),
                needsReview: true,
            },
        ],
        guardrails: [
            'AI Studio outputs remain draft or needsReview until a user reviews them.',
            'User-modified or locked artifacts are preserved during regeneration.',
            'No email send, chatbot publishing, payment product, appointment automation, or analytics tracking is activated automatically.',
            'Realty leads are routed through existing Supabase/RLS-backed lead sync instead of frontend service credentials.',
        ],
        opportunities: unique([
            input.properties.length > 0 ? 'featured listing promotion' : undefined,
            input.leads.length > 0 ? 'seller and buyer nurture sequences' : undefined,
            input.openHouses.length > 0 ? 'open house retargeting campaign' : undefined,
            ...(blueprint?.monetizationOffers || []),
            ...(blueprint?.digitalProducts || []),
        ], 8),
        blockers,
        warnings,
    };
}
