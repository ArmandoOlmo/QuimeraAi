import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { PageSection, Project } from '../../types';
import type { WebsitePlan } from '../../types/websitePlan';
import { getStudioReadiness, type StudioReadiness, type StudioReadinessCopy } from './getStudioReadiness';

export interface StudioSummaryField {
    label: string;
    value: string;
    status?: 'provided' | 'missing' | 'assumed' | 'needsReview';
}

export interface StudioResultMetric {
    label: string;
    value: string | number;
}

export interface StudioUXSummary {
    title: string;
    subtitle: string;
    outputLabel: string;
    fields: StudioSummaryField[];
    badges: string[];
    assumptions: string[];
    warnings: string[];
    nextAction: string;
    readiness: StudioReadiness;
    result?: {
        title: string;
        subtitle: string;
        metrics: StudioResultMetric[];
        warnings: string[];
    };
}

interface AiStudioBriefLike {
    businessName?: string;
    industry?: string;
    description?: string;
    tagline?: string;
    services?: Array<{ name?: string; description?: string }> | string[];
    contactInfo?: Record<string, unknown>;
    hasEcommerce?: boolean;
    ecommerceType?: string;
    colorPalette?: Record<string, string>;
    fontPairing?: Record<string, string>;
    suggestedComponents?: PageSection[];
    missingFields?: string[];
    readinessScore?: number;
}

export interface AiStudioSummaryInput {
    brief?: AiStudioBriefLike | Record<string, any> | null;
    websitePlan?: Partial<WebsitePlan> | null;
    businessBlueprint?: Partial<BusinessBlueprint> | null;
    selectedComponents?: PageSection[];
    generatedProject?: Partial<Project> | null;
    copy?: Partial<AiStudioSummaryCopy>;
}

const NON_CONTENT_SECTIONS = new Set<string>(['colors', 'typography', 'header', 'footer', 'topBar', 'announcementBar', 'storeSettings']);

export interface AiStudioSummaryCopy {
    title: string;
    subtitle: string;
    outputLabel: string;
    fieldBusiness: string;
    fieldIndustry: string;
    fieldServicesProducts: string;
    fieldAudience: string;
    fieldWebsiteGoal: string;
    fieldStyle: string;
    fieldEcommerceIntent: string;
    fieldLocationContact: string;
    fieldMissingCritical: string;
    businessMissing: string;
    industryAssumed: string;
    servicesProductsAssumed: string;
    audienceAssumed: string;
    websiteGoalAssumed: string;
    styleAssumed: string;
    ecommerceIncluded: string;
    ecommerceNotDetected: string;
    locationContactReview: string;
    missingCriticalNone: string;
    badgeWebsite: string;
    badgeEcommerceIntent: string;
    badgeProjectDraft: string;
    badgeLeadContactSections: string;
    badgeEditableLater: string;
    nextGenerateWebsite: string;
    nextAddDetails: string;
    resultTitle: string;
    resultSubtitle: string;
    metricPagesCreated: string;
    metricSectionsCreated: string;
    metricStyleGenerated: string;
    metricEcommerceBlocks: string;
    metricLeadContactSections: string;
    metricYes: string;
    metricIncluded: string;
    metricNotIncluded: string;
    nonCriticalReviewMessage: (field: string) => string;
    readiness?: Partial<StudioReadinessCopy>;
}

const DEFAULT_AI_STUDIO_SUMMARY_COPY: Omit<AiStudioSummaryCopy, 'readiness'> = {
    title: 'What I understood',
    subtitle: 'Website project brief',
    outputLabel: 'Website / Project',
    fieldBusiness: 'Business',
    fieldIndustry: 'Industry',
    fieldServicesProducts: 'Services/products',
    fieldAudience: 'Audience',
    fieldWebsiteGoal: 'Website goal',
    fieldStyle: 'Style',
    fieldEcommerceIntent: 'Ecommerce intent',
    fieldLocationContact: 'Location/contact',
    fieldMissingCritical: 'Missing critical fields',
    businessMissing: 'Not provided yet',
    industryAssumed: 'AI can infer from the description',
    servicesProductsAssumed: 'Will be drafted from the website goal',
    audienceAssumed: 'Default audience inferred from business context',
    websiteGoalAssumed: 'Create a publish-ready website',
    styleAssumed: 'AI-generated visual direction',
    ecommerceIncluded: 'Ecommerce blocks may be included',
    ecommerceNotDetected: 'No ecommerce intent detected',
    locationContactReview: 'Can be edited later',
    missingCriticalNone: 'None',
    badgeWebsite: 'Website',
    badgeEcommerceIntent: 'Ecommerce intent',
    badgeProjectDraft: 'Project draft',
    badgeLeadContactSections: 'Lead/contact sections',
    badgeEditableLater: 'Editable later',
    nextGenerateWebsite: 'Generate Website',
    nextAddDetails: 'Add Details',
    resultTitle: 'Website created',
    resultSubtitle: 'Final content is ready to review before publishing.',
    metricPagesCreated: 'Pages created',
    metricSectionsCreated: 'Sections created',
    metricStyleGenerated: 'Style generated',
    metricEcommerceBlocks: 'Ecommerce blocks',
    metricLeadContactSections: 'Lead/contact sections',
    metricYes: 'Yes',
    metricIncluded: 'Included',
    metricNotIncluded: 'Not included',
    nonCriticalReviewMessage: field => `${field} can be reviewed later.`,
};

function resolveCopy(copy?: Partial<AiStudioSummaryCopy>): AiStudioSummaryCopy {
    return {
        ...DEFAULT_AI_STUDIO_SUMMARY_COPY,
        ...(copy || {}),
        readiness: copy?.readiness,
    };
}

function firstText(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

function namesFromServices(services: unknown): string {
    if (!Array.isArray(services)) return '';
    return services
        .map(service => {
            if (typeof service === 'string') return service;
            if (service && typeof service === 'object') return firstText((service as any).name, (service as any).title);
            return '';
        })
        .filter(Boolean)
        .slice(0, 5)
        .join(', ');
}

function contactSummary(contactInfo?: Record<string, unknown>): string {
    if (!contactInfo) return '';
    return [
        firstText(contactInfo.city, contactInfo.state, contactInfo.country),
        firstText(contactInfo.address),
        firstText(contactInfo.phone),
        firstText(contactInfo.email),
    ].filter(Boolean).join(' | ');
}

function styleSummary(brief?: AiStudioBriefLike | null, websitePlan?: Partial<WebsitePlan> | null, blueprint?: Partial<BusinessBlueprint> | null): string {
    const visualStyle = firstText(websitePlan?.brandProfile?.visualStyle, blueprint?.brandProfile?.visualStyle);
    if (visualStyle) return visualStyle;

    const colors = brief?.colorPalette ? Object.values(brief.colorPalette).filter(Boolean).slice(0, 3).join(', ') : '';
    const fonts = brief?.fontPairing ? [brief.fontPairing.header, brief.fontPairing.body].filter(Boolean).join(' + ') : '';
    return [colors, fonts].filter(Boolean).join(' | ');
}

function pageCount(project?: Partial<Project> | null, websitePlan?: Partial<WebsitePlan> | null): number {
    if (Array.isArray(project?.pages)) return project.pages.length;
    if (Array.isArray(websitePlan?.contentMap?.pages)) return websitePlan.contentMap.pages.length;
    return 0;
}

function contentSections(project?: Partial<Project> | null, selectedComponents?: PageSection[], plan?: Partial<WebsitePlan> | null): string[] {
    const order = project?.componentOrder || selectedComponents || plan?.componentPlan?.map(item => item.component) || [];
    return order
        .filter(section => !NON_CONTENT_SECTIONS.has(String(section)))
        .map(section => String(section))
        .slice(0, 12);
}

export function getAiStudioSummary(input: AiStudioSummaryInput): StudioUXSummary {
    const copy = resolveCopy(input.copy);
    const brief = (input.brief || {}) as AiStudioBriefLike;
    const plan = input.websitePlan || null;
    const blueprint = input.businessBlueprint || input.generatedProject?.businessBlueprint || null;
    const businessProfile = blueprint?.businessProfile;
    const planBusiness = plan?.businessProfile;
    const components = contentSections(input.generatedProject, input.selectedComponents || brief.suggestedComponents, plan);
    const contact = contactSummary(brief.contactInfo || planBusiness?.contactInfo || businessProfile?.contactInfo as Record<string, unknown> | undefined);
    const style = styleSummary(brief, plan, blueprint);
    const services = namesFromServices(brief.services || planBusiness?.services || businessProfile?.services);
    const businessName = firstText(brief.businessName, planBusiness?.businessName, businessProfile?.businessName);
    const industry = firstText(brief.industry, planBusiness?.industry, businessProfile?.industry);
    const description = firstText(brief.description, planBusiness?.description, businessProfile?.description);

    const readiness = getStudioReadiness({
        kind: 'website',
        businessName,
        industry,
        description,
        services: brief.services || planBusiness?.services || businessProfile?.services,
        websiteGoal: plan?.qualityGoals?.join(', ') || description,
        targetAudience: firstText((businessProfile as any)?.targetAudience),
        designStyle: style,
        contactInfo: brief.contactInfo || planBusiness?.contactInfo || businessProfile?.contactInfo as Record<string, unknown> | undefined,
        suggestedComponents: components,
        missingFields: brief.missingFields,
        readinessScore: brief.readinessScore,
        copy: copy.readiness,
    });

    const ecommerceEnabled = Boolean(
        brief.hasEcommerce ||
        planBusiness?.hasEcommerce ||
        blueprint?.ecommerceBlueprint?.enabled ||
        components.some(section => section.toLowerCase().includes('product') || section === 'featuredProducts')
    );
    const leadSections = components.filter(section => ['leads', 'heroLead', 'newsletter', 'contact', 'map'].includes(section));
    const warnings = [
        ...readiness.nonCriticalMissing.map(field => copy.nonCriticalReviewMessage(field)),
        ...(blueprint?.readiness?.warnings || []),
    ].slice(0, 5);

    return {
        title: copy.title,
        subtitle: copy.subtitle,
        outputLabel: copy.outputLabel,
        fields: [
            { label: copy.fieldBusiness, value: businessName || description || copy.businessMissing, status: businessName || description ? 'provided' : 'missing' },
            { label: copy.fieldIndustry, value: industry || copy.industryAssumed, status: industry ? 'provided' : 'assumed' },
            { label: copy.fieldServicesProducts, value: services || copy.servicesProductsAssumed, status: services ? 'provided' : 'assumed' },
            { label: copy.fieldAudience, value: firstText((businessProfile as any)?.targetAudience) || copy.audienceAssumed, status: (businessProfile as any)?.targetAudience ? 'provided' : 'assumed' },
            { label: copy.fieldWebsiteGoal, value: plan?.qualityGoals?.join(', ') || description || copy.websiteGoalAssumed, status: plan?.qualityGoals?.length || description ? 'provided' : 'assumed' },
            { label: copy.fieldStyle, value: style || copy.styleAssumed, status: style ? 'provided' : 'assumed' },
            { label: copy.fieldEcommerceIntent, value: ecommerceEnabled ? (brief.ecommerceType || copy.ecommerceIncluded) : copy.ecommerceNotDetected, status: ecommerceEnabled ? 'provided' : 'assumed' },
            { label: copy.fieldLocationContact, value: contact || copy.locationContactReview, status: contact ? 'provided' : 'needsReview' },
            { label: copy.fieldMissingCritical, value: readiness.criticalMissing.length ? readiness.criticalMissing.join(', ') : copy.missingCriticalNone, status: readiness.criticalMissing.length ? 'missing' : 'provided' },
        ],
        badges: [
            copy.badgeWebsite,
            ecommerceEnabled ? copy.badgeEcommerceIntent : copy.badgeProjectDraft,
            leadSections.length ? copy.badgeLeadContactSections : copy.badgeEditableLater,
        ],
        assumptions: readiness.assumptions,
        warnings,
        nextAction: readiness.canGenerate ? copy.nextGenerateWebsite : copy.nextAddDetails,
        readiness,
        result: input.generatedProject ? {
            title: copy.resultTitle,
            subtitle: copy.resultSubtitle,
            metrics: [
                { label: copy.metricPagesCreated, value: pageCount(input.generatedProject, plan) || 1 },
                { label: copy.metricSectionsCreated, value: components.length },
                { label: copy.metricStyleGenerated, value: style || copy.metricYes },
                { label: copy.metricEcommerceBlocks, value: ecommerceEnabled ? copy.metricIncluded : copy.metricNotIncluded },
                { label: copy.metricLeadContactSections, value: leadSections.length },
            ],
            warnings,
        } : undefined,
    };
}
