import type {
    BusinessCapability,
    ComponentAvailableData,
    ComponentId,
    ComponentPlan,
    ComponentScoreBreakdown,
    ComponentSelectionContext,
    PageIntent,
    RejectedComponentPlanItem,
    SelectedComponentPlanItem,
} from '../../types/componentRegistry';
import type { AiStudioBusinessBriefInput, AiStudioEcommerceBlueprint, AiStudioStorefrontBlueprint } from './types';
import { componentRegistry, getComponentsForBuilder } from '../../registry/componentRegistry';
import { getBriefText } from './types';

const capabilityPatterns: Array<[BusinessCapability, RegExp]> = [
    ['restaurant', /\b(restaurant|restaurante|caf[eé]|cafeteria|menu|food|comida|catering|steakhouse|bakery|panader[ií]a|bar|sushi|pizza|brunch|fine dining|casual dining|food truck)\b/i],
    ['restaurantReservations', /\b(reservation|reservas?|reservar|table|mesa)\b/i],
    ['realEstate', /\b(real estate|realtor|broker|property|listing|listings|propiedad|inmobili|bienes raices|buyer|seller)\b/i],
    ['appointments', /\b(appointment|booking|book|cita|reserva|schedule|agendar|consultation|repair|test ride)\b/i],
    ['booking', /\b(appointment|booking|book|cita|reserva|schedule|agendar|consultation|repair|test ride)\b/i],
    ['digitalProducts', /\b(digital|download|course|curso|ebook|guide|guia|template|membership|software)\b/i],
    ['marketplace', /\b(marketplace|multi-category|many categories|catalog|catalogo|department)\b/i],
    ['premiumRetail', /\b(premium|luxury|high-end|boutique|curated|signature|electric bike|e-bike|ebike)\b/i],
    ['subscription', /\b(subscription|membership|plan|monthly|recurring|suscripcion)\b/i],
    ['portfolio', /\b(portfolio|gallery|galeria|work|case study|creative|agency|photography|artist|art)\b/i],
    ['contentMarketing', /\b(blog|newsletter|content|articles|resources|stories)\b/i],
    ['localBusiness', /\b(local|near me|san juan|puerto rico|hours|location|address|ubicacion)\b/i],
    ['leadGeneration', /\b(lead|quote|estimate|inquiry|consulta|contact|capture|buyer|seller)\b/i],
    ['physicalProducts', /\b(product|products|producto|gear|merch|inventory|shipping|delivery|shop|store|tienda)\b/i],
    ['services', /\b(service|services|servicio|consulting|repair|package|paquete|estimate|quote)\b/i],
    ['ecommerce', /\b(ecommerce|e-commerce|shop|store|tienda|sell|vende|vender|checkout|cart|carrito|gift card|product|products)\b/i],
];

const intentOrder: Record<PageIntent, ComponentId[]> = {
    website_home: ['hero', 'about', 'services', 'features', 'testimonials', 'leadForm', 'faq', 'footer'],
    service_landing: ['hero', 'services', 'trustBadges', 'process', 'testimonials', 'appointmentCTA', 'leadForm', 'faq', 'footer'],
    ecommerce_home: ['hero', 'trustBadges', 'featuredProducts', 'categoryShowcase', 'productCarousel', 'appointmentCTA', 'shopCTA', 'faq', 'footer'],
    storefront_home: ['hero', 'storefrontFeaturedProducts', 'storefrontCategoryGrid', 'trustBadges', 'newsletter', 'footer'],
    product_collection: ['collectionBanner', 'categoryShowcase', 'productCarousel', 'shopCTA', 'faq', 'footer'],
    product_detail: ['productHero', 'trustBadges', 'featuredProducts', 'faq', 'shopCTA', 'footer'],
    restaurant_home: ['hero', 'restaurantMenu', 'restaurantReservation', 'restaurantLocation', 'trustBadges', 'newsletter', 'faq', 'footer'],
    appointment_landing: ['hero', 'services', 'process', 'appointmentCTA', 'trustBadges', 'leadForm', 'faq', 'footer'],
    real_estate_home: ['hero', 'propertySearch', 'realEstateListings', 'neighborhoods', 'leadForm', 'testimonials', 'faq', 'footer'],
    portfolio_home: ['hero', 'gallery', 'imageWithText', 'about', 'testimonials', 'leadForm', 'footer'],
    blog_home: ['hero', 'newsletter', 'features', 'faq', 'footer'],
    lead_capture: ['hero', 'services', 'trustBadges', 'leadForm', 'faq', 'footer'],
    local_business_home: ['hero', 'services', 'trustBadges', 'process', 'testimonials', 'contact', 'leadForm', 'footer'],
    gallery_home: ['hero', 'gallery', 'imageWithText', 'testimonials', 'leadForm', 'footer'],
    bio_page: ['bioProfile', 'bioLinks', 'bioSocialLinks', 'bioShop', 'bioBooking', 'bioLeadCapture', 'bioEmailSubscribe', 'bioChatCTA'],
    ai_saas_landing: ['hero', 'features', 'process', 'pricing', 'testimonials', 'faq', 'leadForm', 'footer'],
};

const positionRank: Record<SelectedComponentPlanItem['recommendedPosition'], number> = {
    top: 0,
    early: 1,
    middle: 2,
    late: 3,
    footer: 4,
};

const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

const normalizeIndustry = (value: string): string => {
    const text = value.toLowerCase();
    if (/\b(electric bike|e-bike|ebike|bicycle|bike|cycling|bicicleta)\b/i.test(text)) return 'electric_bikes';
    if (/\b(ai|artificial intelligence|software|saas|app|platform)\b/i.test(text)) return 'ai_saas';
    if (/\b(real estate|realtor|broker|property|inmobili|bienes raices)\b/i.test(text)) return 'real_estate';
    if (/\b(restaurant|restaurante|caf[eé]|food|comida|catering|steakhouse|bakery|panader[ií]a|bar|sushi|pizza|brunch|fine dining|casual dining|food truck)\b/i.test(text)) return 'restaurant';
    if (/\b(gallery|portfolio|photography|artist|art|creative)\b/i.test(text)) return 'portfolio';
    if (/\b(luxury|premium|boutique|high-end)\b/i.test(text)) return 'premium_retail';
    if (/\b(ecommerce|shop|store|retail|tienda)\b/i.test(text)) return 'ecommerce';
    if (/\b(local|service|consulting|repair|appointment)\b/i.test(text)) return 'services';
    return text.trim() || 'general';
};

export function classifyBusinessCapabilities(
    input: AiStudioBusinessBriefInput,
    availableData: ComponentAvailableData = {},
    ecommerceBlueprint?: AiStudioEcommerceBlueprint,
): BusinessCapability[] {
    const text = getBriefText(input);
    const capabilities: BusinessCapability[] = [];
    const add = (capability: BusinessCapability) => {
        if (!capabilities.includes(capability)) capabilities.push(capability);
    };

    capabilityPatterns.forEach(([capability, pattern]) => {
        if (pattern.test(text)) add(capability);
    });

    if (input.hasEcommerce || input.existingWebsitePlan?.businessProfile.hasEcommerce || ecommerceBlueprint?.enabled) add('ecommerce');
    if ((availableData.productsCount || 0) > 0 || ecommerceBlueprint?.starterProducts.length) add('physicalProducts');
    if ((availableData.servicesCount || 0) > 0 || input.services?.length || input.existingWebsitePlan?.businessProfile.services.length) add('services');
    if (ecommerceBlueprint?.digitalProductsEnabled) add('digitalProducts');
    if (ecommerceBlueprint?.giftCardsEnabled) add('ecommerce');
    if (!capabilities.includes('leadGeneration')) add('leadGeneration');
    if (capabilities.includes('restaurant')) add('localBusiness');
    if (capabilities.includes('appointments')) add('booking');

    return capabilities.length ? capabilities : ['services', 'leadGeneration'];
}

export function classifyPageIntent(input: {
    text: string;
    builder: ComponentSelectionContext['builder'];
    industry: string;
    capabilities: BusinessCapability[];
    availableData?: ComponentAvailableData;
}): PageIntent {
    const text = input.text.toLowerCase();
    const has = (capability: BusinessCapability) => input.capabilities.includes(capability);

    if (input.builder === 'storefront') return 'storefront_home';
    if (/\b(product detail|product page|detalle de producto)\b/i.test(text)) return 'product_detail';
    if (/\b(collection|category page|categoria|coleccion)\b/i.test(text)) return 'product_collection';
    if (has('realEstate')) return 'real_estate_home';
    if (has('restaurant')) return 'restaurant_home';
    if (has('portfolio') && /\b(gallery|galeria)\b/i.test(text)) return 'gallery_home';
    if (has('portfolio')) return 'portfolio_home';
    if (/\b(ai|saas|software|platform|app|automation|agent)\b/i.test(text) && (!has('physicalProducts') || has('subscription') || has('digitalProducts'))) return 'ai_saas_landing';
    if (has('ecommerce')) return 'ecommerce_home';
    if (has('appointments') || has('booking')) return 'appointment_landing';
    if (has('localBusiness')) return 'local_business_home';
    if (has('services')) return 'service_landing';
    if (has('contentMarketing')) return 'blog_home';
    if (has('leadGeneration')) return 'lead_capture';

    return 'website_home';
}

function availableDataFromInput(
    input: AiStudioBusinessBriefInput,
    ecommerceBlueprint?: AiStudioEcommerceBlueprint,
): ComponentAvailableData {
    const plan = input.existingWebsitePlan;
    const productsCount = ecommerceBlueprint?.starterProducts.length || plan?.contentMap.products?.length || 0;
    const categoriesCount = ecommerceBlueprint?.productCategories.length || 0;
    const servicesCount = input.services?.length || plan?.businessProfile.services.length || 0;
    const menuSignalCount = (plan as unknown as { businessBlueprint?: { restaurantBlueprint?: { menuDraft?: { items?: unknown[] } } } } | undefined)
        ?.businessBlueprint?.restaurantBlueprint?.menuDraft?.items?.length || 0;

    return {
        productsCount,
        categoriesCount,
        servicesCount,
        menuItemsCount: plan?.contentMap.menuItems?.length || menuSignalCount || (/\b(menu|dish|catering|steakhouse|bakery|sushi|pizza|brunch)\b/i.test(getBriefText(input)) ? Math.max(servicesCount, 1) : 0),
        listingsCount: plan?.contentMap.properties?.length || 0,
        portfolioItemsCount: plan?.contentMap.extractedImages?.length || 0,
        testimonialsCount: plan?.contentMap.testimonials?.length || 0,
        reviewsCount: 0,
        salesCount: 0,
        hasDraftProducts: Boolean(ecommerceBlueprint?.starterProducts.length),
        hasMerchantApprovedPromotion: false,
        giftCardsEnabled: ecommerceBlueprint?.giftCardsEnabled,
        paymentsConfigured: false,
        shippingConfigured: false,
        taxConfigured: false,
    };
}

export function createComponentSelectionContext(
    input: AiStudioBusinessBriefInput,
    options: {
        builder?: ComponentSelectionContext['builder'];
        ecommerceBlueprint?: AiStudioEcommerceBlueprint;
        storefrontBlueprint?: AiStudioStorefrontBlueprint;
    } = {},
): ComponentSelectionContext {
    const inputText = getBriefText(input);
    const availableData = availableDataFromInput(input, options.ecommerceBlueprint);
    const industry = normalizeIndustry([
        input.industry,
        input.subIndustry,
        input.businessDescription,
        input.description,
        input.productsServicesText,
        input.brandStyle,
    ].filter(Boolean).join(' '));
    const capabilities = classifyBusinessCapabilities(input, availableData, options.ecommerceBlueprint);
    const builder = options.builder || 'website';
    const pageIntent = classifyPageIntent({ text: inputText, builder, industry, capabilities, availableData });

    return {
        builder,
        inputText,
        businessName: input.businessName || input.existingWebsitePlan?.businessProfile.businessName,
        industry,
        pageIntent,
        capabilities,
        enabledModules: capabilities,
        availableData,
        existingComponentIds: input.existingWebsitePlan?.componentPlan.map(item => item.component as ComponentId),
    };
}

function industryScore(componentIndustries: string[], industry: string): number {
    if (componentIndustries.includes('all')) return 0.85;
    if (componentIndustries.includes(industry)) return 1;
    if (componentIndustries.some(item => industry.includes(item) || item.includes(industry))) return 0.85;
    if (industry === 'electric_bikes' && componentIndustries.some(item => ['premium_retail', 'fitness', 'ecommerce'].includes(item))) return 0.9;
    if (industry === 'premium_retail' && componentIndustries.includes('ecommerce')) return 0.75;
    if (industry === 'services' && componentIndustries.includes('local_business')) return 0.75;
    return 0.3;
}

function dataAvailabilityScore(componentId: ComponentId, context: ComponentSelectionContext): number {
    const data = context.availableData || {};
    const hasEcommerce = context.capabilities?.includes('ecommerce');

    switch (componentId) {
        case 'featuredProducts':
            return hasEcommerce && ((data.productsCount || 0) > 0 || data.hasDraftProducts) ? 1 : 0.15;
        case 'productCarousel':
            return hasEcommerce && (data.productsCount || 0) >= 4 ? 1 : 0.25;
        case 'categoryShowcase':
            return hasEcommerce && (data.categoriesCount || 0) > 0 ? 1 : 0.3;
        case 'saleCountdown':
            return data.hasMerchantApprovedPromotion ? 1 : 0.05;
        case 'shopCTA':
            return hasEcommerce ? 0.85 : 0.35;
        case 'restaurantMenu':
            return context.capabilities?.includes('restaurant') ? ((data.menuItemsCount || 0) > 0 ? 1 : 0.65) : 0.15;
        case 'restaurantReservation':
            return context.capabilities?.includes('restaurant') ? 0.8 : 0.15;
        case 'realEstateListings':
            return context.capabilities?.includes('realEstate') ? ((data.listingsCount || 0) > 0 ? 1 : 0.65) : 0.15;
        case 'propertySearch':
            return context.capabilities?.includes('realEstate') ? 0.8 : 0.15;
        case 'gallery':
            return (data.portfolioItemsCount || 0) > 0 || context.capabilities?.includes('portfolio') ? 0.9 : 0.45;
        case 'testimonials':
            return (data.testimonialsCount || 0) > 0 || (data.reviewsCount || 0) > 0 ? 1 : 0.6;
        case 'appointmentCTA':
            return context.capabilities?.some(item => ['appointments', 'booking', 'services'].includes(item)) ? 0.9 : 0.25;
        case 'leadForm':
            return context.capabilities?.includes('leadGeneration') ? 1 : 0.65;
        default:
            return 0.8;
    }
}

function conversionScore(componentRoles: string[], capabilities: BusinessCapability[]): number {
    const roleSignals = new Set<string>();
    if (capabilities.includes('ecommerce')) roleSignals.add('sales');
    if (capabilities.includes('leadGeneration')) roleSignals.add('lead_capture');
    if (capabilities.includes('appointments') || capabilities.includes('booking') || capabilities.includes('restaurantReservations')) roleSignals.add('booking');
    if (capabilities.includes('portfolio') || capabilities.includes('realEstate')) roleSignals.add('trust');
    if (capabilities.includes('marketplace')) roleSignals.add('catalog_discovery');

    if (componentRoles.some(role => roleSignals.has(role))) return 1;
    if (componentRoles.includes('education') || componentRoles.includes('navigation')) return 0.65;
    return 0.45;
}

function scoreComponent(componentId: ComponentId, context: ComponentSelectionContext): ComponentScoreBreakdown {
    const component = componentRegistry.find(item => item.id === componentId);
    if (!component) {
        return {
            industryMatch: 0,
            pageIntentMatch: 0,
            dataAvailability: 0,
            conversionGoalMatch: 0,
            visualFit: 0,
            mobileFit: 0,
            penalties: 1,
            total: 0,
        };
    }

    const pageIntent = context.pageIntent || 'website_home';
    const industryMatch = industryScore(component.compatibleIndustries, context.industry);
    const pageIntentMatch = component.pageIntents.includes(pageIntent) ? 1 : intentOrder[pageIntent]?.includes(componentId) ? 0.85 : 0.25;
    const dataAvailability = dataAvailabilityScore(componentId, context);
    const conversionGoalMatch = conversionScore(component.conversionRoles, context.capabilities || []);
    const visualFit = intentOrder[pageIntent]?.includes(componentId) ? 1 : 0.55;
    const mobileFit = component.mobilePriority === 'critical' ? 1 : component.mobilePriority === 'high' ? 0.9 : 0.75;
    let penalties = 0;

    if (!component.compatibleBuilders.includes(context.builder)) penalties += 0.35;
    if (component.incompatibleIndustries.some(item => context.industry.includes(item))) penalties += 0.25;
    if (component.requiredModules.some(module => !(context.capabilities || []).includes(module))) penalties += 0.25;
    if (componentId === 'productCarousel' && (context.availableData?.productsCount || 0) < 4) penalties += 0.15;
    if (componentId === 'featuredProducts' && !((context.availableData?.productsCount || 0) > 0 || context.availableData?.hasDraftProducts)) penalties += 0.4;
    if (componentId === 'categoryShowcase' && (context.availableData?.categoriesCount || 0) === 0) penalties += 0.3;
    if (componentId === 'saleCountdown' && !context.availableData?.hasMerchantApprovedPromotion) penalties += 0.45;

    const total = Math.max(0, Math.min(1, (
        industryMatch * 0.25 +
        pageIntentMatch * 0.2 +
        dataAvailability * 0.2 +
        conversionGoalMatch * 0.15 +
        visualFit * 0.1 +
        mobileFit * 0.1
    ) - penalties));

    return {
        industryMatch,
        pageIntentMatch,
        dataAvailability,
        conversionGoalMatch,
        visualFit,
        mobileFit,
        penalties,
        total,
    };
}

function reasonFor(componentId: ComponentId, context: ComponentSelectionContext): string {
    const pageIntent = context.pageIntent || 'website_home';
    if (componentId === 'hero') return `Primary ${pageIntent} section selected from registry for ${context.industry}.`;
    if (componentId === 'featuredProducts') return 'Ecommerce is enabled and product data or reviewable starter drafts exist.';
    if (componentId === 'categoryShowcase') return 'Ecommerce categories are available for catalog discovery.';
    if (componentId === 'productCarousel') return 'Enough products exist to justify a product carousel.';
    if (componentId === 'shopCTA') return 'Routes visitors to storefront without creating ecommerce data.';
    if (componentId === 'appointmentCTA') return 'Business signals support appointment, repair, consultation, reservation, or booking capture.';
    if (componentId === 'restaurantMenu') return 'Restaurant intent benefits from menu or offer highlights.';
    if (componentId === 'realEstateListings') return 'Real estate intent benefits from listing visibility and lead capture.';
    if (componentId === 'leadForm') return 'Lead generation is a core capability for this page.';
    return `Selected because it matches ${pageIntent}, ${context.industry}, and available business capabilities.`;
}

export function selectComponentsForPage(context: ComponentSelectionContext): ComponentPlan {
    const pageIntent = context.pageIntent || 'website_home';
    const preferredOrder = intentOrder[pageIntent] || intentOrder.website_home;
    const builderComponents = getComponentsForBuilder(context.builder)
        .sort((a, b) => {
            const aIndex = preferredOrder.indexOf(a.id);
            const bIndex = preferredOrder.indexOf(b.id);
            if (aIndex === -1 && bIndex === -1) return a.id.localeCompare(b.id);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
    const candidates = builderComponents.filter(component => component.aiSelection.canSelect);
    const selected: SelectedComponentPlanItem[] = [];
    const optional: ComponentPlan['optionalComponents'] = [];
    const rejected: RejectedComponentPlanItem[] = [];
    const warnings: string[] = [];

    candidates.forEach(component => {
        const scoreBreakdown = scoreComponent(component.id, context);
        const score = scoreBreakdown.total;
        const item: SelectedComponentPlanItem = {
            componentId: component.id,
            implementationStatus: component.implementationStatus,
            confidence: Number(score.toFixed(2)),
            reason: reasonFor(component.id, context),
            score,
            scoreBreakdown,
            recommendedPosition: component.recommendedPosition,
            sourceMap: {
                registry: `componentRegistry.${component.id}`,
                scoring: 'utils.aiStudio.componentSelection.scoreComponent',
            },
        };

        if (score >= component.aiSelection.confidenceThreshold && preferredOrder.includes(component.id)) {
            selected.push(item);
        } else if (score >= 0.5 && preferredOrder.includes(component.id)) {
            optional.push({
                ...item,
                optionalReason: 'Score is reviewable but below the automatic selection threshold.',
            });
        } else {
            rejected.push({
                componentId: component.id,
                reason: score < 0.5 ? 'Score below optional threshold.' : 'Not part of the page-intent component rhythm.',
                score,
                scoreBreakdown,
            });
        }
    });

    builderComponents
        .filter(component => !component.aiSelection.canSelect && preferredOrder.includes(component.id))
        .forEach(component => {
            const scoreBreakdown = scoreComponent(component.id, context);
            rejected.push({
                componentId: component.id,
                reason: `${component.id} is blocked by registry readiness and must not be selected automatically.`,
                score: scoreBreakdown.total,
                scoreBreakdown,
            });
            warnings.push(`${component.id} is ${component.implementationStatus} and was kept out of the rendered component plan.`);
        });

    if (!selected.some(item => item.componentId === 'hero') && context.builder === 'website') {
        const scoreBreakdown = scoreComponent('hero', context);
        selected.unshift({
            componentId: 'hero',
            implementationStatus: 'rendered',
            confidence: 0.8,
            reason: 'Fallback hero inserted because every website generation needs a first-viewport section.',
            score: scoreBreakdown.total,
            scoreBreakdown,
            recommendedPosition: 'top',
            sourceMap: { fallback: 'componentSelection.heroRequired' },
        });
    }

    if (!selected.some(item => ['leadForm', 'shopCTA', 'appointmentCTA', 'restaurantReservation'].includes(item.componentId))) {
        warnings.push('No explicit conversion component met the automatic selection threshold.');
    }

    const sortedSelected = unique(selected.map(item => item.componentId))
        .map(componentId => selected.find(item => item.componentId === componentId)!)
        .sort((a, b) => {
            const aPreferred = preferredOrder.indexOf(a.componentId);
            const bPreferred = preferredOrder.indexOf(b.componentId);
            if (aPreferred !== -1 || bPreferred !== -1) {
                if (aPreferred === -1) return 1;
                if (bPreferred === -1) return -1;
                return aPreferred - bPreferred;
            }
            return positionRank[a.recommendedPosition] - positionRank[b.recommendedPosition];
        })
        .slice(0, pageIntent === 'ecommerce_home' ? 8 : 7);

    const confidence = sortedSelected.length
        ? sortedSelected.reduce((sum, item) => sum + item.confidence, 0) / sortedSelected.length
        : 0;

    return {
        pageIntent,
        industry: context.industry,
        capabilities: context.capabilities || [],
        selectedComponents: sortedSelected,
        optionalComponents: optional,
        rejectedComponents: rejected,
        reasons: [
            `Classified page intent as ${pageIntent}.`,
            `Detected capabilities: ${(context.capabilities || []).join(', ') || 'none'}.`,
            'Component IDs came from typed componentRegistry only.',
        ],
        confidence: Number(confidence.toFixed(2)),
        sourceMap: {
            pageIntent: 'utils.aiStudio.componentSelection.classifyPageIntent',
            capabilities: 'utils.aiStudio.componentSelection.classifyBusinessCapabilities',
            registry: 'registry.componentRegistry',
        },
        warnings,
    };
}

export function selectAiStudioComponents(
    input: AiStudioBusinessBriefInput,
    options: {
        builder?: ComponentSelectionContext['builder'];
        ecommerceBlueprint?: AiStudioEcommerceBlueprint;
        storefrontBlueprint?: AiStudioStorefrontBlueprint;
    } = {},
): { context: ComponentSelectionContext; componentPlan: ComponentPlan } {
    const context = createComponentSelectionContext(input, options);
    return {
        context,
        componentPlan: selectComponentsForPage(context),
    };
}
