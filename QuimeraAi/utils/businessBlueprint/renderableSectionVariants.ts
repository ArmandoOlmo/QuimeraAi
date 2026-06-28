import type { WebsiteSectionBlueprint } from '../../types/businessBlueprint';
import { getFeatureVariantMeta } from '../../data/featureVariants';
import { getFaqVariantMeta } from '../../data/faqVariants';
import { getFooterVariantMeta } from '../../data/footerVariants';
import { normalizePricingVariant } from '../../data/pricingVariants';

type RenderableSectionVariantInput = Pick<WebsiteSectionBlueprint, 'type' | 'componentId' | 'layoutVariant'>;

const EDITORIAL_MOSAIC_SETTINGS: Record<string, Record<string, unknown>> = {
    features: {
        featuresVariant: 'editorial-mosaic',
        gridColumns: 4,
        imageHeight: 420,
        showSectionHeader: true,
        enableCardAnimation: true,
    },
    testimonials: {
        testimonialsVariant: 'editorial-mosaic',
        enableCardAnimation: true,
    },
    menu: {
        menuVariant: 'editorial-mosaic',
        gridColumns: 4,
        showSectionHeader: true,
        enableCardAnimation: true,
    },
};

const FEATURE_LAYOUT_VARIANTS: Record<string, string> = {
    cardsGrid: 'product-highlights',
    modernBento: 'modern',
    bentoGrid: 'bento-premium',
    overlayBento: 'bento-overlay',
    imageOverlay: 'image-overlay',
    neonGlow: 'neon-glow',
    pressRelease: 'press-release',
    editorialMosaic: 'editorial-mosaic',
    galleryStrip: 'gallery-strip',
    visualProofGrid: 'visual-proof-grid',
    strategyCards: 'strategy-cards',
    offerShowcase: 'offer-showcase',
    productHighlights: 'product-highlights',
    iconColumns: 'icon-columns',
    darkShowcase: 'dark-showcase',
    appShowcase: 'app-showcase',
    metricsPanel: 'metrics-panel',
    checklistCards: 'checklist-cards',
    darkCapabilityGrid: 'dark-capability-grid',
    splitWithFeatureList: 'split-list',
    compactRows: 'icon-columns',
};

const FAQ_LAYOUT_VARIANTS: Record<string, string> = {
    accordion: 'classic',
    twoColumn: 'editorial-split',
    supportCTA: 'contact-card',
    editorialSplit: 'editorial-split',
    boxedList: 'boxed-list',
    darkPanel: 'dark-panel',
    imageSplit: 'image-split',
    stackedCards: 'stacked-cards',
    answerPanel: 'answer-panel',
    contactCard: 'contact-card',
};

const FOOTER_LAYOUT_VARIANTS: Record<string, string> = {
    simpleFooter: 'classic',
    multiColumn: 'classic',
    newsletterFooter: 'grid-newsletter',
    megaWordmark: 'mega-wordmark',
    complianceWordmark: 'compliance-wordmark',
    gridNewsletter: 'grid-newsletter',
    gridWordmark: 'grid-wordmark',
    pressLandscape: 'press-landscape',
    socialWaitlist: 'social-waitlist',
    ctaCard: 'cta-card',
    landscapeLinks: 'landscape-links',
    socialDirectory: 'social-directory',
    superWordmark: 'super-wordmark',
    gradientSilhouette: 'gradient-silhouette',
};

const PRICING_LAYOUT_VARIANTS: Record<string, string> = {
    pricingCards: 'featured-plan',
    comparisonTable: 'bi-panels',
    packageRows: 'workflow-rows',
    darkSaasCards: 'dark-saas-cards',
    featuredPlan: 'featured-plan',
    voiceCreditColumns: 'voice-credit-columns',
    darkPlanCards: 'dark-plan-cards',
    financeComparison: 'finance-comparison',
    subscriptionShop: 'subscription-shop',
    biPanels: 'bi-panels',
    groupedPlanGrid: 'grouped-plan-grid',
    workflowRows: 'workflow-rows',
    addonCards: 'addon-cards',
};

const getFeatureLayoutSettings = (layoutVariant: string): Record<string, unknown> | undefined => {
    const featuresVariant = FEATURE_LAYOUT_VARIANTS[layoutVariant];
    if (!featuresVariant) return undefined;
    const meta = getFeatureVariantMeta(featuresVariant);

    return {
        featuresVariant,
        gridColumns: meta.recommendedColumns,
        imageHeight: meta.recommendedImageHeight,
        showSectionHeader: true,
        enableCardAnimation: true,
    };
};

const getFaqLayoutSettings = (layoutVariant: string): Record<string, unknown> | undefined => {
    const faqVariant = FAQ_LAYOUT_VARIANTS[layoutVariant];
    if (!faqVariant) return undefined;
    const meta = getFaqVariantMeta(faqVariant);

    return {
        faqVariant: meta.value,
    };
};

const getFooterLayoutSettings = (layoutVariant: string): Record<string, unknown> | undefined => {
    const footerVariant = FOOTER_LAYOUT_VARIANTS[layoutVariant];
    if (!footerVariant) return undefined;
    const meta = getFooterVariantMeta(footerVariant);

    return {
        footerVariant: meta.value,
    };
};

const getPricingLayoutSettings = (layoutVariant: string): Record<string, unknown> | undefined => {
    const pricingVariant = PRICING_LAYOUT_VARIANTS[layoutVariant] || layoutVariant;

    return {
        pricingVariant: normalizePricingVariant(pricingVariant),
    };
};

export function getRenderableSectionVariantSettings(
    section: RenderableSectionVariantInput,
): Record<string, unknown> | undefined {
    if (section.type === 'features' || section.componentId === 'features') {
        return getFeatureLayoutSettings(section.layoutVariant) || (
            section.layoutVariant === 'editorialMosaic' ? EDITORIAL_MOSAIC_SETTINGS.features : undefined
        );
    }
    if (section.type === 'faq' || section.componentId === 'faq') {
        return getFaqLayoutSettings(section.layoutVariant);
    }
    if (section.type === 'footer' || section.componentId === 'footer') {
        return getFooterLayoutSettings(section.layoutVariant);
    }
    if (section.type === 'pricing' || section.componentId === 'pricing') {
        return getPricingLayoutSettings(section.layoutVariant);
    }
    if (section.layoutVariant !== 'editorialMosaic') return undefined;
    if (section.type === 'testimonials' || section.componentId === 'testimonials') return EDITORIAL_MOSAIC_SETTINGS.testimonials;
    if (section.type === 'menu' || section.componentId === 'restaurantMenu') return EDITORIAL_MOSAIC_SETTINGS.menu;
    return undefined;
}

export function mergeRenderableSectionVariantSettings<TSection extends WebsiteSectionBlueprint>(
    section: TSection,
): TSection {
    const runtimeSettings = getRenderableSectionVariantSettings(section);
    if (!runtimeSettings) return section;

    return {
        ...section,
        settings: {
            ...(section.settings || {}),
            ...runtimeSettings,
        },
        sourceMap: {
            ...(section.sourceMap || {}),
            runtimeVariantSettings: 'businessBlueprint.renderableSectionVariants',
        },
    };
}

export function applyRenderableSectionVariantSettingsToData<TData>(
    data: TData,
    sections?: WebsiteSectionBlueprint[],
): TData {
    if (!data || typeof data !== 'object' || !Array.isArray(sections) || sections.length === 0) return data;

    const nextData: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    sections.forEach(section => {
        const runtimeSettings = getRenderableSectionVariantSettings(section);
        if (!runtimeSettings) return;

        const current = nextData[section.type];
        if (!current || typeof current !== 'object' || Array.isArray(current)) return;

        nextData[section.type] = {
            ...(current as Record<string, unknown>),
            ...runtimeSettings,
        };
    });

    return nextData as TData;
}
