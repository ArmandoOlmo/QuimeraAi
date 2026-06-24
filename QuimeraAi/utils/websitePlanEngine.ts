import type { PageSection } from '../types/ui';
import type { WebsitePlan, WebsitePlanAssetItem, WebsitePlanComponentItem, WebsitePlanValidationResult } from '../types/websitePlan';
import type { ColorBrief } from '../types/colorSystem';
import type { ComponentRegistryItem } from '../data/componentRegistry';
import { getAccessibleComponentRegistry, getRegistryItem } from '../data/componentRegistry';
import {
    createColorBriefFromWebsitePlan,
    createImportedPaletteCandidates,
    generateColorCandidates,
    selectBestColorSystem,
    toGlobalColors,
} from './colorSystemEngine';

export interface BriefLike {
    businessName: string;
    industry: string;
    subIndustry?: string;
    description: string;
    tagline?: string;
    services: Array<{ name: string; description: string }>;
    contactInfo: Record<string, any>;
    hasEcommerce?: boolean;
    colorPalette: { primary: string; secondary: string; accent: string; background: string; surface: string; text: string };
    fontPairing?: { header: string; body: string; button: string };
    suggestedComponents?: PageSection[];
}

const HEROES: PageSection[] = ['hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead'];
const SHELL_SECTIONS = new Set<PageSection>(['colors', 'typography', 'header', 'footer']);
const PLACEHOLDER_PATTERNS = [/^feature\s*\d+$/i, /^description\s*\d+$/i, /^project\s*\d+$/i, /^great!?$/i, /lorem ipsum/i, /\[GENERATE_/i];
const ECOMMERCE_COMPONENTS = new Set<PageSection>([
    'announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges',
    'saleCountdown', 'collectionBanner', 'recentlyViewed', 'productReviews', 'productBundle',
]);

function normalizeIndustry(value?: string): string {
    const industry = (value || '').toLowerCase();
    if (/\b(restaurant|restaurante|caf[eé]|cafeteria|food|comida|steakhouse|bakery|panader[ií]a|catering|bar|sushi|pizza|brunch|fine dining|casual dining|food truck|menu|reservas?)\b/i.test(industry)) return 'restaurant';
    if (industry.includes('real') || industry.includes('property') || industry.includes('inmobili')) return 'real-estate';
    if (industry.includes('shop') || industry.includes('store') || industry.includes('ecommerce') || industry.includes('retail')) return 'ecommerce';
    if (industry.includes('photo') || industry.includes('portfolio') || industry.includes('creative') || industry.includes('agency') || industry.includes('cultur') || industry.includes('arte') || industry.includes('design')) return 'portfolio';
    if (industry.includes('tech') || industry.includes('software') || industry.includes('saas') || industry.includes('ai') || industry.includes('web3') || industry.includes('cyber')) return 'technology';
    if (industry.includes('legal') || industry.includes('law')) return 'legal';
    if (industry.includes('health') || industry.includes('clinic') || industry.includes('dental')) return 'healthcare';
    return industry || 'other';
}

function briefText(brief: BriefLike): string {
    return [
        brief.businessName,
        brief.industry,
        brief.subIndustry,
        brief.description,
        brief.tagline,
        ...(brief.services || []).flatMap(service => [service.name, service.description]),
    ].filter(Boolean).join(' ').toLowerCase();
}

function hasSignal(text: string, pattern: RegExp): boolean {
    return pattern.test(text);
}

function hasExplicitEcommerceIntent(brief: BriefLike): boolean {
    if (!brief.hasEcommerce) return false;
    const text = briefText(brief);
    return hasSignal(text, /\b(ecommerce|e-commerce|online store|shopify|checkout|cart|catalog|catalogo|catálogo|tienda online|tienda|producto|productos|retail|shop|store)\b/i);
}

function hasVisualProofSignal(industry: string, text: string): boolean {
    return (
        ['restaurant', 'portfolio', 'real-estate'].includes(industry) ||
        hasSignal(text, /\b(gallery|galería|portfolio|portafolio|case study|project|proyecto|before|after|antes|después|photo|foto|visual|creative|creativo|diseño|design|event|evento|travel|tour|hotel|venue|salon|spa|construction|arquitectura|architecture|cultural|cultura|arte)\b/i)
    );
}

function hasExpertSignal(industry: string, text: string): boolean {
    return (
        ['legal', 'healthcare', 'finance'].includes(industry) ||
        hasSignal(text, /\b(team|equipo|expert|experto|doctor|abogado|attorney|consultor|coach|advisor|terapeuta|clinic|clínica|agency|agencia)\b/i)
    );
}

function hasPricingSignal(text: string): boolean {
    return hasSignal(text, /\b(pricing|precios|planes|plans|packages|paquetes|membership|membresía|subscription|suscripción|rates|tarifas)\b/i);
}

function hasBookingSignal(text: string): boolean {
    return hasSignal(text, /\b(booking|book|appointment|cita|consulta|reservation|reserva|estimate|cotización|quote|demo|llamada)\b/i);
}

function chooseAvailable(registry: ComponentRegistryItem[], options: PageSection[], fallback: PageSection = 'hero'): PageSection {
    return options.find(section => sectionIsAccessible(section, registry)) || fallback;
}

function chooseGeneralHero(brief: BriefLike, industry: string, registry: ComponentRegistryItem[]): PageSection {
    const text = briefText(brief);
    const visual = hasVisualProofSignal(industry, text);
    const booking = hasBookingSignal(text);

    if (industry === 'portfolio') return chooseAvailable(registry, ['heroNova', 'heroGallery', 'heroSplit', 'hero']);
    if (industry === 'restaurant') return chooseAvailable(registry, ['heroGallery', 'heroNova', 'hero']);
    if (industry === 'real-estate') return chooseAvailable(registry, ['heroLead', 'heroGallery', 'heroSplit']);
    if (industry === 'technology') return chooseAvailable(registry, ['heroWave', 'heroSplit', 'heroNova', 'hero']);
    if (booking || ['legal', 'healthcare', 'finance'].includes(industry)) return chooseAvailable(registry, ['heroLead', 'heroSplit', 'hero']);
    if (visual) return chooseAvailable(registry, ['heroNova', 'heroGallery', 'heroSplit', 'hero']);

    const weighted: PageSection[] = ['heroSplit', 'heroWave', 'hero', 'heroNova'];
    return chooseAvailable(registry, weighted, 'hero');
}

function pushIfAvailable(target: PageSection[], registry: ComponentRegistryItem[], section: PageSection, condition = true): void {
    if (!condition) return;
    if (!sectionIsAccessible(section, registry)) return;
    if (!target.includes(section)) target.push(section);
}

function finalizeRecommendedSections(sections: PageSection[], registry: ComponentRegistryItem[]): PageSection[] {
    return sanitizeComponentOrder(
        sections.filter(section => !ECOMMERCE_COMPONENTS.has(section) || sectionIsAccessible(section, registry)),
        registry
    );
}

function mergeComponentSelections(
    strategySections: PageSection[],
    secondarySections: PageSection[],
    registry: ComponentRegistryItem[],
): PageSection[] {
    const strategy = sanitizeComponentOrder(strategySections, registry);
    const secondary = sanitizeComponentOrder(secondarySections, registry);
    const strategyHero = strategy.find(section => HEROES.includes(section));
    const secondaryHero = secondary.find(section => HEROES.includes(section));
    const hero = strategyHero || secondaryHero;
    const merged: PageSection[] = [];

    if (hero) merged.push(hero);
    for (const section of [...strategy, ...secondary]) {
        if (HEROES.includes(section)) continue;
        if (ECOMMERCE_COMPONENTS.has(section) && !sectionIsAccessible(section, registry)) continue;
        if (!merged.includes(section)) merged.push(section);
    }

    return sanitizeComponentOrder(merged, registry);
}

function hasLocation(contactInfo: Record<string, any>): boolean {
    return Boolean(contactInfo?.address || contactInfo?.city || contactInfo?.state || contactInfo?.country);
}

function sectionIsAccessible(section: PageSection, registry: ComponentRegistryItem[]): boolean {
    return SHELL_SECTIONS.has(section) || registry.some(item => item.id === section);
}

export function sanitizeComponentOrder(sections: PageSection[], registry: ComponentRegistryItem[]): PageSection[] {
    const seen = new Set<PageSection>();
    const result: PageSection[] = [];
    let heroAdded = false;

    for (const section of sections) {
        if (!sectionIsAccessible(section, registry)) continue;
        if (seen.has(section)) continue;
        if (HEROES.includes(section)) {
            if (heroAdded) continue;
            heroAdded = true;
        }
        seen.add(section);
        result.push(section);
    }

    if (!heroAdded) {
        const fallbackHero = registry.find(item => HEROES.includes(item.id))?.id || 'hero';
        result.unshift(fallbackHero);
    }

    for (const required of ['header', 'footer'] as PageSection[]) {
        if (!seen.has(required)) {
            if (required === 'header') result.unshift(required);
            else result.push(required);
        }
    }

    return result.filter(section => section !== 'colors' && section !== 'typography');
}

export function recommendSectionsForBrief(brief: BriefLike, registry: ComponentRegistryItem[]): PageSection[] {
    const industry = normalizeIndustry(brief.subIndustry || brief.industry);
    const text = briefText(brief);
    const can = (section: PageSection) => registry.some(item => item.id === section);
    const add = (sections: PageSection[]) => sections.filter(can);

    if ((industry === 'ecommerce' || hasExplicitEcommerceIntent(brief)) && can('productHero')) {
        return finalizeRecommendedSections(add(['announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges', 'productReviews', 'footer']), registry);
    }

    if (industry === 'restaurant') {
        const sections: PageSection[] = [chooseGeneralHero(brief, industry, registry)];
        pushIfAvailable(sections, registry, 'menu');
        pushIfAvailable(sections, registry, 'slideshow', hasVisualProofSignal(industry, text));
        pushIfAvailable(sections, registry, 'testimonials');
        pushIfAvailable(sections, registry, 'restaurantReservation', hasBookingSignal(text) || can('restaurantReservation'));
        pushIfAvailable(sections, registry, 'map', hasLocation(brief.contactInfo));
        pushIfAvailable(sections, registry, 'cta');
        pushIfAvailable(sections, registry, 'footer');
        return finalizeRecommendedSections(sections, registry);
    }

    if (industry === 'real-estate') {
        return finalizeRecommendedSections(add(['heroLead', 'realEstateListings', 'features', 'testimonials', 'leads', 'map', 'footer']), registry);
    }

    if (industry === 'portfolio') {
        const sections: PageSection[] = [chooseGeneralHero(brief, industry, registry)];
        pushIfAvailable(sections, registry, 'portfolio');
        pushIfAvailable(sections, registry, 'slideshow', hasVisualProofSignal(industry, text));
        pushIfAvailable(sections, registry, 'services', brief.services?.length > 0);
        pushIfAvailable(sections, registry, 'features');
        pushIfAvailable(sections, registry, 'testimonials');
        pushIfAvailable(sections, registry, 'cta');
        pushIfAvailable(sections, registry, 'footer');
        return finalizeRecommendedSections(sections, registry);
    }

    if (industry === 'technology') {
        const hero = chooseAvailable(registry, ['heroWave', 'heroSplit', 'heroNova', 'hero']);
        const sections: PageSection[] = [hero, 'features'];
        pushIfAvailable(sections, registry, 'pricing', hasPricingSignal(text));
        pushIfAvailable(sections, registry, 'testimonials');
        pushIfAvailable(sections, registry, 'faq');
        pushIfAvailable(sections, registry, 'cta');
        pushIfAvailable(sections, registry, 'footer');
        return finalizeRecommendedSections(sections, registry);
    }

    const sections: PageSection[] = [chooseGeneralHero(brief, industry, registry)];
    pushIfAvailable(sections, registry, 'services', brief.services?.length > 0 || industry !== 'other');
    pushIfAvailable(sections, registry, 'features');
    pushIfAvailable(sections, registry, 'portfolio', hasVisualProofSignal(industry, text));
    pushIfAvailable(sections, registry, 'slideshow', hasVisualProofSignal(industry, text) && !sections.includes('portfolio'));
    pushIfAvailable(sections, registry, 'howItWorks', hasBookingSignal(text) || industry !== 'other');
    pushIfAvailable(sections, registry, 'team', hasExpertSignal(industry, text));
    pushIfAvailable(sections, registry, 'testimonials');
    pushIfAvailable(sections, registry, 'pricing', hasPricingSignal(text));
    pushIfAvailable(sections, registry, 'faq', industry !== 'other' || hasBookingSignal(text));
    pushIfAvailable(sections, registry, hasBookingSignal(text) || hasLocation(brief.contactInfo) ? 'leads' : 'cta');
    pushIfAvailable(sections, registry, 'map', hasLocation(brief.contactInfo));
    pushIfAvailable(sections, registry, 'footer');
    return finalizeRecommendedSections(sections, registry);
}

export function buildComponentPlan(
    sections: PageSection[],
    registry: ComponentRegistryItem[],
    source: WebsitePlanComponentItem['source'] = 'ai',
): WebsitePlanComponentItem[] {
    const sanitized = sanitizeComponentOrder(sections, registry).filter(section => !['header', 'footer'].includes(section));
    return sanitized.map(section => {
        const item = registry.find(entry => entry.id === section);
        return {
            component: section,
            reason: item?.promptHints || 'Selected for the website strategy.',
            confidence: source === 'user' ? 1 : 0.85,
            source,
        };
    });
}

function imageLooksLikeNoise(url: string): boolean {
    return /sprite|favicon|icon-|\/icon|pixel|tracking|spacer|blank|placeholder|loader|badge|payment|paypal|visa|mastercard/i.test(url);
}

function scoreImageForPurpose(
    image: NonNullable<WebsitePlan['contentMap']['extractedImages']>[number],
    purpose: string,
    plan: Pick<WebsitePlan, 'businessProfile'>,
    usedUrls: Set<string>,
): number {
    const url = image.url || '';
    if (!url || imageLooksLikeNoise(url) || /\.(svg)(?:$|\?)/i.test(url)) return -100;

    const lowerPurpose = purpose.toLowerCase();
    const use = (image.recommendedUse || '').toLowerCase();
    const alt = (image.alt || '').toLowerCase();
    const haystack = `${url} ${alt} ${use} ${image.sourcePage || ''}`.toLowerCase();
    let score = image.score ?? 30;

    if (usedUrls.has(url)) score -= 18;
    if (plan.businessProfile.businessName && haystack.includes(plan.businessProfile.businessName.toLowerCase())) score += 6;
    if (plan.businessProfile.industry && haystack.includes(plan.businessProfile.industry.toLowerCase())) score += 4;

    if (lowerPurpose.includes('logo')) {
        if (use.includes('logo') || /logo|brand/.test(haystack)) score += 60;
        if (!use.includes('logo') && !/logo|brand/.test(haystack)) score -= 35;
    } else if (lowerPurpose.includes('hero') || lowerPurpose.includes('background') || lowerPurpose.includes('banner')) {
        if (use.includes('hero') || use.includes('gallery') || use.includes('portfolio')) score += 42;
        if (/hero|banner|cover|header|main|og:image/.test(haystack)) score += 22;
        if (use.includes('logo') || /logo|brandmark|favicon/.test(haystack)) score -= 60;
        if (image.width && image.height && image.width >= image.height) score += 8;
    } else if (lowerPurpose.includes('portrait') || lowerPurpose.includes('team') || lowerPurpose.includes('customer')) {
        if (use.includes('team') || /team|staff|person|portrait|headshot|founder|customer|client/.test(haystack)) score += 45;
        if (use.includes('logo')) score -= 50;
    } else if (lowerPurpose.includes('portfolio') || lowerPurpose.includes('gallery') || lowerPurpose.includes('project')) {
        if (use.includes('portfolio') || use.includes('gallery') || /portfolio|project|gallery|work|case/.test(haystack)) score += 42;
        if (use.includes('logo')) score -= 45;
    } else if (lowerPurpose.includes('menu') || lowerPurpose.includes('food')) {
        if (use.includes('menu') || /menu|food|dish|plate|restaurant|coffee|drink/.test(haystack)) score += 48;
    } else {
        if (use.includes('gallery') || use.includes('portfolio') || use.includes('hero')) score += 20;
        if (use.includes('logo')) score -= 35;
    }

    if (image.width && image.height) {
        const area = image.width * image.height;
        if (area < 60000) score -= 35;
        if (area > 500000) score += 8;
    }

    return score;
}

function pickExistingImage(
    images: WebsitePlan['contentMap']['extractedImages'] = [],
    purpose: string,
    plan: Pick<WebsitePlan, 'businessProfile'>,
    usedUrls: Set<string>,
): string | undefined {
    const lowerPurpose = purpose.toLowerCase();
    const ranked = images
        .map(image => ({ image, score: scoreImageForPurpose(image, lowerPurpose, plan, usedUrls) }))
        .filter(item => item.score >= 42)
        .sort((a, b) => b.score - a.score);
    return ranked[0]?.image.url;
}

function buildImagePromptForSlot(
    plan: Pick<WebsitePlan, 'businessProfile' | 'brandProfile'>,
    slot: { purpose: string; aspectRatio: string },
    component: PageSection,
): string {
    const colors: Partial<WebsitePlan['brandProfile']['colors']> = plan.brandProfile.colors || {};
    const location = [
        plan.businessProfile.contactInfo?.city,
        plan.businessProfile.contactInfo?.state,
        plan.businessProfile.contactInfo?.country,
    ].filter(Boolean).join(', ');
    return [
        `${plan.businessProfile.businessName} - ${slot.purpose}`,
        `Industry: ${plan.businessProfile.industry}.`,
        location ? `Location context: ${location}.` : '',
        `Create one premium editorial website image for the ${component} section, ${slot.aspectRatio} composition.`,
        `Reflect the real business offer: ${plan.businessProfile.description || plan.businessProfile.services?.map(service => service.name).join(', ')}.`,
        `Use brand color cues naturally: primary ${colors.primary || 'brand primary'}, accent ${colors.accent || colors.secondary || 'brand accent'}.`,
        'No text, no logos, no watermarks, no collage, no UI mockup unless the component purpose explicitly requires a digital product.',
    ].filter(Boolean).join(' ');
}

export function buildAssetPlan(plan: Pick<WebsitePlan, 'businessProfile' | 'brandProfile' | 'contentMap' | 'componentPlan'>): WebsitePlanAssetItem[] {
    const assets: WebsitePlanAssetItem[] = [];
    const usedExistingUrls = new Set<string>();

    for (const entry of plan.componentPlan) {
        const item = getRegistryItem(entry.component);
        if (!item?.imageSlots?.length) continue;
        for (const slot of item.imageSlots) {
            const existingUrl = pickExistingImage(plan.contentMap.extractedImages, slot.purpose, plan, usedExistingUrls);
            if (existingUrl) usedExistingUrls.add(existingUrl);
            assets.push({
                targetPath: slot.path,
                source: existingUrl ? 'existing' : 'generate',
                existingUrl,
                aspectRatio: slot.aspectRatio,
                prompt: existingUrl ? undefined : buildImagePromptForSlot(plan, slot, entry.component),
            });
        }
    }

    return assets;
}

function mergeColorBrief(base: ColorBrief, override?: ColorBrief): ColorBrief {
    if (!override) return base;
    return {
        ...base,
        ...override,
        mood: [...new Set([...(base.mood || []), ...(override.mood || [])])],
        importedColors: [...(base.importedColors || []), ...(override.importedColors || [])],
        logoColors: [...(base.logoColors || []), ...(override.logoColors || [])],
        imageColors: [...(base.imageColors || []), ...(override.imageColors || [])],
        lockedColors: { ...(base.lockedColors || {}), ...(override.lockedColors || {}) },
        activeComponents: [...new Set([...(base.activeComponents || []), ...(override.activeComponents || [])])],
    };
}

function buildImportColorSignals(result: any, brandProfile: any): ColorBrief['importedColors'] {
    const signals: ColorBrief['importedColors'] = [];
    const addColor = (color: unknown, source: NonNullable<ColorBrief['importedColors']>[number]['source'], weight: number, roleGuess?: NonNullable<ColorBrief['importedColors']>[number]['roleGuess'], label?: string) => {
        if (!color || typeof color !== 'string') return;
        signals.push({ color, source, weight, roleGuess, label });
    };

    if (Array.isArray(result.colorSignals)) {
        signals.push(...result.colorSignals);
    }
    if (Array.isArray(result.brandProfile?.colorBrief?.importedColors)) {
        signals.push(...result.brandProfile.colorBrief.importedColors);
    }
    if (Array.isArray(result.colorsFound)) {
        result.colorsFound.slice(0, 20).forEach((color: string, index: number) => addColor(color, 'import', Math.max(20, 58 - index * 2), 'unknown', 'colorsFound'));
    }
    if (Array.isArray(result.meta?.colorsFound)) {
        result.meta.colorsFound.slice(0, 20).forEach((color: string, index: number) => addColor(color, 'import', Math.max(20, 52 - index * 2), 'unknown', 'meta.colorsFound'));
    }

    addColor(result.branding?.primaryColor, 'import', 92, 'primary', 'branding.primaryColor');
    addColor(result.branding?.secondaryColor, 'import', 74, 'secondary', 'branding.secondaryColor');
    addColor(result.branding?.accentColor, 'import', 78, 'accent', 'branding.accentColor');
    addColor(result.branding?.backgroundColor, 'background', 58, 'background', 'branding.backgroundColor');

    addColor(brandProfile?.colors?.primary, 'import', 88, 'primary', 'brandProfile.colors.primary');
    addColor(brandProfile?.colors?.secondary, 'import', 68, 'secondary', 'brandProfile.colors.secondary');
    addColor(brandProfile?.colors?.accent, 'import', 72, 'accent', 'brandProfile.colors.accent');
    addColor(brandProfile?.colors?.background, 'background', 54, 'background', 'brandProfile.colors.background');
    addColor(brandProfile?.colors?.surface, 'background', 44, 'surface', 'brandProfile.colors.surface');
    addColor(brandProfile?.colors?.text, 'css', 38, 'text', 'brandProfile.colors.text');

    const seen = new Set<string>();
    return signals.filter(signal => {
        const key = `${signal.color}-${signal.source}-${signal.roleGuess || 'unknown'}-${signal.label || ''}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function applyColorExpertToPlan(plan: WebsitePlan, options: { force?: boolean } = {}): WebsitePlan {
    if (!options.force && plan.brandProfile.selectedColorCandidateId === 'manual') {
        return plan;
    }

    const colorBrief = mergeColorBrief(createColorBriefFromWebsitePlan(plan), plan.brandProfile.colorBrief);
    const importedCandidates = plan.source === 'imported-url'
        ? createImportedPaletteCandidates(colorBrief)
        : [];
    const orderedImportedCandidates = [
        importedCandidates.find(candidate => candidate.id === 'imported-palette-polished'),
        importedCandidates.find(candidate => candidate.id === 'imported-palette-faithful'),
        ...importedCandidates.filter(candidate => !['imported-palette-polished', 'imported-palette-faithful'].includes(candidate.id)),
    ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
    const generatedCandidates = (!options.force && plan.brandProfile.colorCandidates?.length)
        ? plan.brandProfile.colorCandidates
        : generateColorCandidates(colorBrief);
    const candidates = [...orderedImportedCandidates, ...generatedCandidates].filter((candidate, index, all) => (
        all.findIndex(item => item.id === candidate.id) === index
    ));
    const selectedSystem = candidates.find(candidate => candidate.id === plan.brandProfile.selectedColorCandidateId)?.system
        || (plan.source === 'imported-url' ? orderedImportedCandidates[0]?.system : undefined)
        || selectBestColorSystem(candidates);
    const colors = toGlobalColors(selectedSystem);

    return {
        ...plan,
        brandProfile: {
            ...plan.brandProfile,
            colors,
            isDarkTheme: selectedSystem.mode === 'dark',
            colorBrief,
            colorCandidates: candidates,
            selectedColorCandidateId: selectedSystem.id,
        },
    };
}

export function createWebsitePlanFromBrief(
    brief: BriefLike,
    registry: ComponentRegistryItem[] = getAccessibleComponentRegistry(),
): WebsitePlan {
    const strategySections = recommendSectionsForBrief(brief, registry);
    const selectedSections = brief.suggestedComponents?.length
        ? mergeComponentSelections(strategySections, brief.suggestedComponents, registry)
        : strategySections;
    const componentPlan = buildComponentPlan(selectedSections, registry, 'ai');

    const planBase = {
        source: 'chat' as const,
        generationMode: 'from-scratch' as const,
        businessProfile: {
            businessName: brief.businessName,
            industry: brief.industry,
            description: brief.description,
            tagline: brief.tagline,
            services: brief.services || [],
            contactInfo: brief.contactInfo || {},
            hasEcommerce: brief.hasEcommerce,
        },
        brandProfile: {
            colors: { ...brief.colorPalette },
            fonts: [brief.fontPairing?.header, brief.fontPairing?.body, brief.fontPairing?.button].filter(Boolean) as string[],
        },
        contentMap: {
            pages: [],
            extractedImages: [],
            missingOpportunities: [],
        },
        componentPlan,
        qualityGoals: ['No generic placeholder content', 'Valid navigation', 'One hero only', 'Preserve contact information'],
    };

    return applyColorExpertToPlan({ ...planBase, assetPlan: buildAssetPlan(planBase) }, { force: true });
}

export function createWebsitePlanFromImport(
    importResult: any,
    registry: ComponentRegistryItem[] = getAccessibleComponentRegistry(),
): WebsitePlan {
    const result = importResult?.result || importResult || {};
    const businessProfile = result.businessProfile || {
        businessName: result.businessName || '',
        industry: result.industry || '',
        description: result.description || '',
        tagline: result.tagline || '',
        services: result.services || [],
        contactInfo: result.contactInfo || {},
        hasEcommerce: Boolean(result.hasEcommerce || result.industry === 'ecommerce'),
    };
    const brandProfile = result.brandProfile || {
        colors: {
            primary: result.branding?.primaryColor || '#6366f1',
            secondary: result.branding?.secondaryColor || '#8b5cf6',
            accent: result.branding?.accentColor || '#f59e0b',
            background: result.branding?.backgroundColor || '#0f0f14',
            text: '#e4e4e7',
        },
        fonts: result.branding?.fonts || [],
        visualStyle: result.branding?.visualStyle,
        logoUrl: result.branding?.logoUrl,
        isDarkTheme: result.branding?.isDarkTheme,
    };
    const importColorSignals = buildImportColorSignals(result, brandProfile);
    brandProfile.colorBrief = {
        source: 'imported-url',
        industry: businessProfile.industry || result.industry || '',
        mood: ['modernize'],
        personality: brandProfile.visualStyle,
        mode: brandProfile.isDarkTheme ? 'dark' : 'auto',
        generationMode: 'modernize',
        importedColors: importColorSignals,
        logoColors: importColorSignals.filter(signal => signal.source === 'logo'),
        imageColors: importColorSignals.filter(signal => signal.source === 'image'),
        hasEcommerce: businessProfile.hasEcommerce,
    };
    const contentMap = result.contentMap || {
        pages: (result.meta?.subpagesVisited || result.subpagesVisited || []).map((page: any) => ({
            url: page.url,
            title: page.title || page.url,
            purpose: page.purpose || 'content',
            summary: page.summary || '',
        })),
        extractedImages: (result.detectedAssets || result.images || []).map((img: any) => ({
            url: img.url || img.src,
            alt: img.alt,
            sourcePage: img.sourcePage,
            recommendedUse: img.recommendedUse,
            score: img.score,
            width: img.width,
            height: img.height,
        })).filter((img: any) => img.url),
        missingOpportunities: result.missingOpportunities || [],
    };

    const importedSections = Array.isArray(result.recommendedComponents)
        ? result.recommendedComponents.map((item: any) => typeof item === 'string' ? item : item.component).filter(Boolean)
        : [];
    const strategicSections = recommendSectionsForBrief({
        ...businessProfile,
        colorPalette: {
            primary: brandProfile.colors.primary,
            secondary: brandProfile.colors.secondary || '#8b5cf6',
            accent: brandProfile.colors.accent || '#f59e0b',
            background: brandProfile.colors.background || '#0f0f14',
            surface: '#1a1a24',
            text: brandProfile.colors.text || '#e4e4e7',
        },
    } as BriefLike, registry);

    const selectedSections = importedSections.length
        ? mergeComponentSelections(strategicSections, importedSections as PageSection[], registry)
        : strategicSections;
    const componentPlan = buildComponentPlan(selectedSections, registry, 'import');
    const planBase = {
        source: 'imported-url' as const,
        generationMode: 'modernize' as const,
        businessProfile,
        brandProfile,
        contentMap,
        componentPlan,
        qualityGoals: ['Preserve imported business facts', 'Modernize layout', 'Use accessible services only', 'No generic placeholder content'],
    };

    return applyColorExpertToPlan({ ...planBase, assetPlan: buildAssetPlan(planBase) }, { force: true });
}

function scanPlaceholders(value: unknown, path: string, issues: WebsitePlanValidationResult['issues']): void {
    if (typeof value === 'string') {
        if (PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value.trim()))) {
            issues.push({ severity: 'warning', path, message: 'Generic placeholder text detected' });
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => scanPlaceholders(item, `${path}.${index}`, issues));
        return;
    }
    if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([key, child]) => scanPlaceholders(child, path ? `${path}.${key}` : key, issues));
    }
}

export function validateGeneratedWebsite(data: any, componentOrder: PageSection[], plan: WebsitePlan): WebsitePlanValidationResult {
    const issues: WebsitePlanValidationResult['issues'] = [];
    const heroes = componentOrder.filter(section => HEROES.includes(section));
    if (heroes.length !== 1) {
        issues.push({ severity: 'error', path: 'componentOrder', message: 'Generated website must contain exactly one hero section' });
    }
    const quimera = componentOrder.filter(section => section.includes('Quimera'));
    if (quimera.length > 0) {
        issues.push({ severity: 'error', path: 'componentOrder', message: 'Quimera Suite is Admin-only and cannot be generated in public Studio' });
    }
    for (const item of plan.componentPlan) {
        if (!data?.[item.component] && !['header', 'footer'].includes(item.component)) {
            issues.push({ severity: 'warning', path: `data.${item.component}`, message: 'Planned component is missing generated data' });
        }
    }
    scanPlaceholders(data, 'data', issues);
    return { valid: !issues.some(issue => issue.severity === 'error'), issues };
}
