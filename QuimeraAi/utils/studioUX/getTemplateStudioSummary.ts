import type { PageSection, Project } from '../../types';
import { getStudioReadiness, type StudioReadiness, type StudioReadinessCopy } from './getStudioReadiness';
import type { StudioSummaryField, StudioResultMetric, StudioUXSummary } from './getAiStudioSummary';

interface TemplateBriefLike {
    businessName?: string;
    industry?: string;
    description?: string;
    tagline?: string;
    services?: Array<{ name?: string; description?: string }> | string[];
    colorPalette?: Record<string, string>;
    fontPairing?: Record<string, string>;
    suggestedComponents?: PageSection[];
    missingFields?: string[];
    readinessScore?: number;
}

export interface TemplateStudioSummaryInput {
    brief?: TemplateBriefLike | null;
    generatedTemplate?: Partial<Project> | null;
    componentPlan?: Array<{ component?: PageSection; componentId?: string; reason?: string }>;
    variantPlan?: Array<{ componentId?: string; designPatternIds?: string[] }>;
    designPatternIds?: string[];
    copy?: Partial<TemplateStudioSummaryCopy>;
}

export interface TemplateStudioSummaryCopy {
    title: string;
    subtitle: string;
    outputLabel: string;
    fieldTemplateName: string;
    fieldTemplateType: string;
    fieldIndustry: string;
    fieldCompatibleIndustries: string;
    fieldTargetAudience: string;
    fieldRequiredModules: string;
    fieldOptionalModules: string;
    fieldDesignStyle: string;
    fieldSampleContentStatus: string;
    fieldDesignPatterns: string;
    fieldComponentPlan: string;
    notNamedYet: string;
    needsTemplateType: string;
    needsIndustry: string;
    toBeReviewedByAdmin: string;
    adjacentServiceVariants: string;
    targetAudienceValue: string;
    requiredModulesAssumed: string;
    optionalModulesAssumed: string;
    designStyleAssumed: string;
    sampleContentStatusValue: string;
    designPatternsAssumed: string;
    componentPlanPending: string;
    componentPlanSelectedMessage: (count: number) => string;
    metricTemplateDraft: string;
    metricSampleContent: string;
    metricComponentsIncluded: string;
    metricCompatibleIndustries: string;
    metricRequiredModules: string;
    metricOptionalModules: string;
    valueCreated: string;
    valuePending: string;
    valueGeneratedForReview: string;
    valueNeedsReview: string;
    warningSampleContentReview: string;
    adminReviewMessage: (field: string) => string;
    badgeTemplateDraft: string;
    badgeSampleContent: string;
    badgeNeedsReview: string;
    nextGenerateTemplate: string;
    nextAddModules: string;
    resultTitle: string;
    resultSubtitle: string;
    targetAudienceForReadiness: string;
    sampleContentStatusForReadiness: string;
    readiness?: Partial<StudioReadinessCopy>;
}

const DEFAULT_TEMPLATE_STUDIO_SUMMARY_COPY: Omit<TemplateStudioSummaryCopy, 'readiness'> = {
    title: 'Template summary',
    subtitle: 'Reusable structure brief',
    outputLabel: 'Template draft',
    fieldTemplateName: 'Template name',
    fieldTemplateType: 'Template type',
    fieldIndustry: 'Industry',
    fieldCompatibleIndustries: 'Compatible industries',
    fieldTargetAudience: 'Target audience',
    fieldRequiredModules: 'Required modules',
    fieldOptionalModules: 'Optional modules',
    fieldDesignStyle: 'Design style',
    fieldSampleContentStatus: 'Sample content status',
    fieldDesignPatterns: 'Design patterns',
    fieldComponentPlan: 'Component plan',
    notNamedYet: 'Not named yet',
    needsTemplateType: 'Needs template type',
    needsIndustry: 'Needs industry',
    toBeReviewedByAdmin: 'To be reviewed by admin',
    adjacentServiceVariants: 'adjacent service variants',
    targetAudienceValue: 'Future users creating from this reusable template',
    requiredModulesAssumed: 'AI can select reusable modules',
    optionalModulesAssumed: 'FAQ, testimonials, newsletter can be added later',
    designStyleAssumed: 'AI-generated visual direction',
    sampleContentStatusValue: 'Sample content | Template draft | Needs review',
    designPatternsAssumed: 'Generated during component planning',
    componentPlanPending: 'Pending reusable structure',
    componentPlanSelectedMessage: count => `${count} modules selected`,
    metricTemplateDraft: 'Template draft',
    metricSampleContent: 'Sample content',
    metricComponentsIncluded: 'Components included',
    metricCompatibleIndustries: 'Compatible industries',
    metricRequiredModules: 'Required modules',
    metricOptionalModules: 'Optional modules',
    valueCreated: 'Created',
    valuePending: 'Pending',
    valueGeneratedForReview: 'Generated for review',
    valueNeedsReview: 'Needs review',
    warningSampleContentReview: 'Sample content must be reviewed before publishing.',
    adminReviewMessage: field => `${field} needs admin review.`,
    badgeTemplateDraft: 'Template draft',
    badgeSampleContent: 'Sample content',
    badgeNeedsReview: 'Needs review',
    nextGenerateTemplate: 'Generate Template',
    nextAddModules: 'Add Modules',
    resultTitle: 'Template draft created',
    resultSubtitle: 'Reusable sample content is saved as a template draft and needs admin review.',
    targetAudienceForReadiness: 'Future users who start from this template',
    sampleContentStatusForReadiness: 'Sample content, template draft, needs review',
};

function resolveCopy(copy?: Partial<TemplateStudioSummaryCopy>): TemplateStudioSummaryCopy {
    return {
        ...DEFAULT_TEMPLATE_STUDIO_SUMMARY_COPY,
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

function listNames(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value
        .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') return firstText((item as any).name, (item as any).component, (item as any).componentId);
            return '';
        })
        .filter(Boolean)
        .slice(0, 8)
        .join(', ');
}

function inferTemplateType(brief?: TemplateBriefLike | null): string {
    const text = `${brief?.businessName || ''} ${brief?.industry || ''} ${brief?.description || ''}`.toLowerCase();
    if (/restaurant|restaurante|menu|reserv/.test(text)) return 'Restaurant template';
    if (/ecommerce|store|shop|tienda|product|catalog|cat[aá]logo/.test(text)) return 'Ecommerce template';
    if (/real estate|property|realtor|inmobiliaria|propiedades/.test(text)) return 'Real estate template';
    if (/portfolio|portafolio|gallery|galer[ií]a|artist|photographer/.test(text)) return 'Portfolio template';
    if (/landing|lead|campaign|campa[ñn]a/.test(text)) return 'Landing page template';
    if (/service|servicio|agency|agencia|consult/.test(text)) return 'Service business template';
    return '';
}

function styleSummary(brief?: TemplateBriefLike | null): string {
    const colors = brief?.colorPalette ? Object.values(brief.colorPalette).filter(Boolean).slice(0, 3).join(', ') : '';
    const fonts = brief?.fontPairing ? [brief.fontPairing.header, brief.fontPairing.body].filter(Boolean).join(' + ') : '';
    return [colors, fonts].filter(Boolean).join(' | ');
}

function contentSections(input: TemplateStudioSummaryInput): string[] {
    const fromTemplate = input.generatedTemplate?.componentOrder || [];
    const fromBrief = input.brief?.suggestedComponents || [];
    const fromPlan = input.componentPlan?.map(item => item.component || item.componentId).filter(Boolean) || [];
    return [...fromTemplate, ...fromBrief, ...fromPlan]
        .map(section => String(section))
        .filter((section, index, all) => section && all.indexOf(section) === index)
        .slice(0, 12);
}

function collectDesignPatternIds(input: TemplateStudioSummaryInput): string[] {
    return [
        ...(input.designPatternIds || []),
        ...(input.variantPlan || []).flatMap(variant => variant.designPatternIds || []),
    ].filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);
}

export function getTemplateStudioSummary(input: TemplateStudioSummaryInput): StudioUXSummary {
    const copy = resolveCopy(input.copy);
    const brief = input.brief || {};
    const templateType = inferTemplateType(brief);
    const templateName = firstText(brief.businessName, input.generatedTemplate?.name, templateType);
    const industry = firstText(brief.industry, templateType.replace(' template', ''));
    const requiredModules = contentSections(input);
    const optionalModules = requiredModules.filter(module => ['faq', 'testimonials', 'newsletter', 'pricing', 'map', 'team'].includes(module));
    const patternIds = collectDesignPatternIds(input);
    const style = styleSummary(brief);

    const readiness: StudioReadiness = getStudioReadiness({
        kind: 'template',
        templateName,
        templateType,
        industry,
        description: brief.description,
        requiredModules,
        optionalModules,
        targetAudience: copy.targetAudienceForReadiness,
        designStyle: style,
        sampleContentStatus: copy.sampleContentStatusForReadiness,
        suggestedComponents: requiredModules,
        missingFields: brief.missingFields,
        readinessScore: brief.readinessScore,
        copy: copy.readiness,
    });

    const fields: StudioSummaryField[] = [
        { label: copy.fieldTemplateName, value: templateName || copy.notNamedYet, status: templateName ? 'provided' : 'missing' },
        { label: copy.fieldTemplateType, value: templateType || copy.needsTemplateType, status: templateType ? 'provided' : 'missing' },
        { label: copy.fieldIndustry, value: industry || copy.needsIndustry, status: industry ? 'provided' : 'missing' },
        { label: copy.fieldCompatibleIndustries, value: industry ? `${industry}, ${copy.adjacentServiceVariants}` : copy.toBeReviewedByAdmin, status: industry ? 'assumed' : 'needsReview' },
        { label: copy.fieldTargetAudience, value: copy.targetAudienceValue, status: 'assumed' },
        { label: copy.fieldRequiredModules, value: requiredModules.length ? requiredModules.join(', ') : copy.requiredModulesAssumed, status: requiredModules.length ? 'provided' : 'assumed' },
        { label: copy.fieldOptionalModules, value: optionalModules.length ? optionalModules.join(', ') : copy.optionalModulesAssumed, status: optionalModules.length ? 'provided' : 'assumed' },
        { label: copy.fieldDesignStyle, value: style || copy.designStyleAssumed, status: style ? 'provided' : 'assumed' },
        { label: copy.fieldSampleContentStatus, value: copy.sampleContentStatusValue, status: 'needsReview' },
        { label: copy.fieldDesignPatterns, value: patternIds.length ? patternIds.join(', ') : copy.designPatternsAssumed, status: patternIds.length ? 'provided' : 'assumed' },
        { label: copy.fieldComponentPlan, value: requiredModules.length ? copy.componentPlanSelectedMessage(requiredModules.length) : copy.componentPlanPending, status: requiredModules.length ? 'provided' : 'missing' },
    ];

    const metrics: StudioResultMetric[] = [
        { label: copy.metricTemplateDraft, value: input.generatedTemplate ? copy.valueCreated : copy.valuePending },
        { label: copy.metricSampleContent, value: copy.valueGeneratedForReview },
        { label: copy.metricComponentsIncluded, value: requiredModules.length },
        { label: copy.metricCompatibleIndustries, value: industry || copy.valueNeedsReview },
        { label: copy.metricRequiredModules, value: requiredModules.length },
        { label: copy.metricOptionalModules, value: optionalModules.length },
    ];

    const warnings = [
        copy.warningSampleContentReview,
        ...readiness.nonCriticalMissing.map(field => copy.adminReviewMessage(field)),
    ].slice(0, 5);

    return {
        title: copy.title,
        subtitle: copy.subtitle,
        outputLabel: copy.outputLabel,
        fields,
        badges: [copy.badgeTemplateDraft, copy.badgeSampleContent, copy.badgeNeedsReview],
        assumptions: readiness.assumptions,
        warnings,
        nextAction: readiness.canGenerate ? copy.nextGenerateTemplate : copy.nextAddModules,
        readiness,
        result: input.generatedTemplate ? {
            title: copy.resultTitle,
            subtitle: copy.resultSubtitle,
            metrics,
            warnings,
        } : undefined,
    };
}
