export type StudioKind = 'website' | 'template';

export type StudioReadinessStatus = 'ready' | 'needs_detail' | 'blocked';

export interface StudioReadinessInput {
    kind: StudioKind;
    businessName?: unknown;
    templateName?: unknown;
    templateType?: unknown;
    industry?: unknown;
    description?: unknown;
    services?: unknown;
    products?: unknown;
    websiteGoal?: unknown;
    targetAudience?: unknown;
    designStyle?: unknown;
    contactInfo?: Record<string, unknown> | null;
    suggestedComponents?: unknown;
    requiredModules?: unknown;
    optionalModules?: unknown;
    sampleContentStatus?: unknown;
    missingFields?: unknown;
    readinessScore?: unknown;
    copy?: Partial<StudioReadinessCopy>;
}

export interface StudioReadiness {
    kind: StudioKind;
    status: StudioReadinessStatus;
    canGenerate: boolean;
    score: number;
    label: string;
    helperText: string;
    criticalMissing: string[];
    nonCriticalMissing: string[];
    assumptions: string[];
}

export interface StudioReadinessCopy {
    missingBusinessContext: string;
    missingIndustry: string;
    missingOfferOrGoal: string;
    missingTemplateType: string;
    missingRequiredModules: string;
    missingTargetAudience: string;
    missingDesignStyle: string;
    missingSampleContentReviewNotes: string;
    missingLocationContact: string;
    missingAudience: string;
    missingStyle: string;
    websiteReadyLabel: string;
    websiteNeedsDetailLabel: string;
    websiteBlockedLabel: string;
    websiteReadyHelper: string;
    websiteBlockedHelper: string;
    templateReadyLabel: string;
    templateNeedsTemplateTypeLabel: string;
    templateNeedsIndustryLabel: string;
    templateNeedsReviewLabel: string;
    templateReadyHelper: string;
    templateBlockedHelper: string;
    contactLaterAssumption: string;
    visualStyleAssumption: string;
    audienceAssumption: string;
    componentPlanAssumption: string;
    templateVisualDirectionAssumption: string;
    sampleContentAssumption: string;
}

const DEFAULT_STUDIO_READINESS_COPY: StudioReadinessCopy = {
    missingBusinessContext: 'business name or description',
    missingIndustry: 'industry',
    missingOfferOrGoal: 'services/products or website goal',
    missingTemplateType: 'template type',
    missingRequiredModules: 'required modules',
    missingTargetAudience: 'target audience',
    missingDesignStyle: 'design style',
    missingSampleContentReviewNotes: 'sample content review notes',
    missingLocationContact: 'location/contact',
    missingAudience: 'audience',
    missingStyle: 'style',
    websiteReadyLabel: 'Ready to generate',
    websiteNeedsDetailLabel: 'Needs one more detail',
    websiteBlockedLabel: 'Missing critical info',
    websiteReadyHelper: 'I can generate now and mark missing details for review.',
    websiteBlockedHelper: 'Add the missing critical context before generating.',
    templateReadyLabel: 'Ready to generate template',
    templateNeedsTemplateTypeLabel: 'Needs template type',
    templateNeedsIndustryLabel: 'Needs industry',
    templateNeedsReviewLabel: 'Needs admin review',
    templateReadyHelper: 'Sample content will be marked as template content and kept for admin review.',
    templateBlockedHelper: 'Add the missing template detail, then generate the reusable draft.',
    contactLaterAssumption: 'Contact and location can be added later.',
    visualStyleAssumption: 'AI can draft a visual style and mark it for review.',
    audienceAssumption: 'AI can infer a default audience from the business context.',
    componentPlanAssumption: 'AI can choose a reusable component plan for review.',
    templateVisualDirectionAssumption: 'AI can draft the visual direction and mark it for review.',
    sampleContentAssumption: 'Sample content remains labeled as template content.',
};

const INDUSTRY_HINTS: Array<{ label: string; pattern: RegExp }> = [
    { label: 'restaurant', pattern: /\b(restaurant|restaurante|menu|reservations?|reservas?|chef|food|comida)\b/i },
    { label: 'ecommerce', pattern: /\b(ecommerce|e-commerce|store|shop|tienda|productos?|catalog|catalogo|cat[aá]logo)\b/i },
    { label: 'real estate', pattern: /\b(real estate|realtor|property|properties|inmobiliaria|bienes ra[ií]ces|propiedades)\b/i },
    { label: 'portfolio', pattern: /\b(portfolio|portafolio|artist|art gallery|galer[ií]a|photographer|designer)\b/i },
    { label: 'local service', pattern: /\b(service|servicio|clinic|salon|agency|agencia|repair|consulting|consultor[ií]a)\b/i },
    { label: 'saas', pattern: /\b(saas|software|app|platform|plataforma|ai app|startup)\b/i },
];

const TEMPLATE_TYPE_HINTS: Array<{ label: string; pattern: RegExp }> = [
    { label: 'restaurant template', pattern: /\b(restaurant|restaurante|menu|reservations?|reservas?)\b/i },
    { label: 'ecommerce template', pattern: /\b(ecommerce|e-commerce|store|shop|tienda|productos?|catalog|catalogo|cat[aá]logo)\b/i },
    { label: 'real estate template', pattern: /\b(real estate|realtor|property|inmobiliaria|bienes ra[ií]ces|propiedades)\b/i },
    { label: 'portfolio template', pattern: /\b(portfolio|portafolio|artist|gallery|galer[ií]a|photographer|designer)\b/i },
    { label: 'landing page template', pattern: /\b(landing|lead|campaign|campa[ñn]a)\b/i },
    { label: 'service business template', pattern: /\b(service|servicio|agency|agencia|consulting|consultor[ií]a)\b/i },
];

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function hasText(value: unknown): boolean {
    return cleanText(value).length > 0;
}

function hasArrayValue(value: unknown): boolean {
    return Array.isArray(value) && value.length > 0;
}

function hasListValue(value: unknown): boolean {
    if (hasArrayValue(value)) return true;
    return hasText(value);
}

function hasContactValue(contactInfo?: Record<string, unknown> | null): boolean {
    if (!contactInfo || typeof contactInfo !== 'object') return false;
    return ['email', 'phone', 'address', 'city', 'state', 'country', 'businessHours', 'instagram', 'facebook']
        .some(key => hasText(contactInfo[key]));
}

function inferFromText(text: string, hints: Array<{ label: string; pattern: RegExp }>): string {
    const match = hints.find(hint => hint.pattern.test(text));
    return match?.label || '';
}

function normalizeMissingFields(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map(item => cleanText(item))
        .filter(Boolean);
}

function resolveCopy(copy?: Partial<StudioReadinessCopy>): StudioReadinessCopy {
    return { ...DEFAULT_STUDIO_READINESS_COPY, ...(copy || {}) };
}

function mapMissingFieldLabel(field: string, copy: StudioReadinessCopy): string {
    const normalized = field.trim().toLowerCase();
    const compact = normalized.replace(/[_\s.]+/g, '');
    if (normalized === 'business name or description' || compact === 'businessnameordescription') return copy.missingBusinessContext;
    if (normalized === 'industry') return copy.missingIndustry;
    if (normalized === 'services/products or website goal' || compact === 'servicesproductsorwebsitegoal') return copy.missingOfferOrGoal;
    if (normalized === 'template type' || compact === 'templatetype') return copy.missingTemplateType;
    if (normalized === 'required modules' || compact === 'requiredmodules') return copy.missingRequiredModules;
    if (normalized === 'target audience' || compact === 'targetaudience') return copy.missingTargetAudience;
    if (normalized === 'design style' || compact === 'designstyle') return copy.missingDesignStyle;
    if (normalized === 'sample content review notes' || compact === 'samplecontentreviewnotes') return copy.missingSampleContentReviewNotes;
    if (normalized === 'location/contact' || compact === 'locationcontact' || compact === 'contactinfophone' || compact === 'contactinfoemail') return copy.missingLocationContact;
    if (normalized === 'audience') return copy.missingAudience;
    if (normalized === 'style') return copy.missingStyle;
    return field;
}

function scoreFromSignals(totalSignals: number, satisfiedSignals: number, providedScore: unknown): number {
    const calculated = totalSignals === 0 ? 0 : Math.round((satisfiedSignals / totalSignals) * 100);
    const existing = typeof providedScore === 'number' && Number.isFinite(providedScore) ? providedScore : 0;
    return Math.max(0, Math.min(100, Math.max(calculated, existing)));
}

export function getStudioReadiness(input: StudioReadinessInput): StudioReadiness {
    const copy = resolveCopy(input.copy);
    const description = cleanText(input.description);
    const goal = cleanText(input.websiteGoal);
    const inferredIndustry = inferFromText(`${input.businessName || ''} ${description} ${goal}`, INDUSTRY_HINTS);
    const inferredTemplateType = inferFromText(`${input.templateName || ''} ${input.templateType || ''} ${description}`, TEMPLATE_TYPE_HINTS);

    if (input.kind === 'template') {
        const hasTemplateType = hasText(input.templateType) || hasText(input.templateName) || Boolean(inferredTemplateType);
        const hasIndustry = hasText(input.industry) || Boolean(inferredIndustry);
        const hasModules = hasListValue(input.requiredModules) || hasListValue(input.suggestedComponents);

        const criticalMissing = [
            hasTemplateType ? '' : copy.missingTemplateType,
            hasIndustry ? '' : copy.missingIndustry,
        ].filter(Boolean);

        const nonCriticalMissing = [
            hasModules ? '' : copy.missingRequiredModules,
            hasText(input.targetAudience) ? '' : copy.missingTargetAudience,
            hasText(input.designStyle) ? '' : copy.missingDesignStyle,
            hasText(input.sampleContentStatus) ? '' : copy.missingSampleContentReviewNotes,
        ].filter(Boolean);

        const canGenerate = criticalMissing.length === 0;
        const status: StudioReadinessStatus = canGenerate ? 'ready' : criticalMissing.length === 1 ? 'needs_detail' : 'blocked';
        const score = scoreFromSignals(5, [hasTemplateType, hasIndustry, hasModules, hasText(input.designStyle), hasText(input.targetAudience)].filter(Boolean).length, input.readinessScore);

        return {
            kind: 'template',
            status,
            canGenerate,
            score: canGenerate ? Math.max(score, 80) : score,
            label: canGenerate
                ? copy.templateReadyLabel
                : !hasTemplateType
                    ? copy.templateNeedsTemplateTypeLabel
                    : !hasIndustry
                        ? copy.templateNeedsIndustryLabel
                        : copy.templateNeedsReviewLabel,
            helperText: canGenerate
                ? copy.templateReadyHelper
                : copy.templateBlockedHelper,
            criticalMissing,
            nonCriticalMissing,
            assumptions: [
                ...(!hasModules ? [copy.componentPlanAssumption] : []),
                ...(!hasText(input.designStyle) ? [copy.templateVisualDirectionAssumption] : []),
                copy.sampleContentAssumption,
            ],
        };
    }

    const hasBusinessContext = hasText(input.businessName) || hasText(input.description);
    const hasIndustry = hasText(input.industry) || Boolean(inferredIndustry);
    const hasOfferOrGoal = hasListValue(input.services) || hasListValue(input.products) || hasText(input.websiteGoal) || hasText(input.description);

    const criticalMissing = [
        hasBusinessContext ? '' : copy.missingBusinessContext,
        hasIndustry ? '' : copy.missingIndustry,
        hasOfferOrGoal ? '' : copy.missingOfferOrGoal,
    ].filter(Boolean);

    const explicitMissing = normalizeMissingFields(input.missingFields).map(field => mapMissingFieldLabel(field, copy));
    const nonCriticalMissing = [
        hasContactValue(input.contactInfo) ? '' : copy.missingLocationContact,
        hasText(input.targetAudience) ? '' : copy.missingAudience,
        hasText(input.designStyle) ? '' : copy.missingStyle,
        ...explicitMissing.filter(field => !criticalMissing.includes(field)),
    ].filter(Boolean);

    const canGenerate = criticalMissing.length === 0;
    const status: StudioReadinessStatus = canGenerate ? 'ready' : criticalMissing.length === 1 ? 'needs_detail' : 'blocked';
    const score = scoreFromSignals(6, [
        hasBusinessContext,
        hasIndustry,
        hasOfferOrGoal,
        hasContactValue(input.contactInfo),
        hasText(input.designStyle),
        hasText(input.targetAudience),
    ].filter(Boolean).length, input.readinessScore);

    return {
        kind: 'website',
        status,
        canGenerate,
        score: canGenerate ? Math.max(score, 80) : score,
        label: canGenerate
            ? copy.websiteReadyLabel
            : criticalMissing.length === 1
                ? copy.websiteNeedsDetailLabel
                : copy.websiteBlockedLabel,
        helperText: canGenerate
            ? copy.websiteReadyHelper
            : copy.websiteBlockedHelper,
        criticalMissing,
        nonCriticalMissing,
        assumptions: [
            ...(!hasContactValue(input.contactInfo) ? [copy.contactLaterAssumption] : []),
            ...(!hasText(input.designStyle) ? [copy.visualStyleAssumption] : []),
            ...(!hasText(input.targetAudience) ? [copy.audienceAssumption] : []),
        ],
    };
}
