import type {
    BlueprintReadiness,
    BlueprintSourceMap,
    StarterProductBlueprint,
} from '../../types/businessBlueprint';
import type { IntegrationEventType } from '../../types/integrationEvents';
import type { ProductCardVariant } from '../../types/productCard';
import type { StorefrontThemePresetId } from '../../types/storefrontTheme';
import type { WebsitePlan } from '../../types/websitePlan';
import type {
    WebsiteEcommerceBlockType,
} from '../../types/websiteEcommerceBlocks';

export type AiStudioCommerceIndustry =
    | 'commerce'
    | 'restaurant'
    | 'real-estate'
    | 'services'
    | 'fitness'
    | 'luxury'
    | 'fashion'
    | 'food'
    | 'beauty'
    | 'marketplace'
    | 'digital'
    | 'non-commerce';

export interface AiStudioBusinessBriefInput {
    businessName?: string;
    businessDescription?: string;
    description?: string;
    industry?: string;
    subIndustry?: string;
    productsServicesText?: string;
    productsText?: string;
    servicesText?: string;
    audience?: string;
    goals?: string | string[];
    brandStyle?: string;
    services?: Array<{ name?: string; description?: string }>;
    hasEcommerce?: boolean;
    existingWebsitePlan?: WebsitePlan | null;
    now?: string;
}

export interface AiStudioBlueprintMetadata {
    generatedBy: 'ai';
    generatedByAI: true;
    userModified: false;
    generatedAt: string;
    updatedAt: string;
    generationSource: 'ai-studio-c1';
}

export interface AiStudioStarterProduct extends StarterProductBlueprint {
    needsReview: true;
    isPublished: false;
    publishStatus: 'not_published';
    discountStatus: 'none';
}

export interface AiStudioEcommerceBlueprint {
    enabled: boolean;
    status: 'draft' | 'generated' | 'needs_review';
    needsReview: boolean;
    storeType: string;
    catalogStrategy: string;
    productCategories: string[];
    categories: string[];
    starterProducts: AiStudioStarterProduct[];
    giftCardsEnabled: boolean;
    digitalProductsEnabled: boolean;
    inventoryMode: 'not_configured';
    fulfillmentMode: 'not_configured';
    paymentMode: 'not_configured';
    taxMode: 'not_configured';
    shippingMode: 'not_configured';
    discounts: [];
    readiness: BlueprintReadiness;
    sourceMap: BlueprintSourceMap;
    metadata: AiStudioBlueprintMetadata;
    recommendations: string[];
    industrySignals: AiStudioCommerceIndustry[];
}

export interface AiStudioStorefrontSection {
    id: string;
    type: string;
    order: number;
    enabled: boolean;
    status: 'draft' | 'needs_review';
    needsReview: true;
    dataSource?: string;
    settings?: Record<string, unknown>;
    readiness: BlueprintReadiness;
    sourceMap: BlueprintSourceMap;
    metadata: AiStudioBlueprintMetadata;
}

export interface AiStudioStorefrontBlueprint {
    enabled: boolean;
    status: 'draft' | 'generated' | 'needs_review';
    needsReview: boolean;
    templatePreset: string;
    themePreset: StorefrontThemePresetId;
    productCardVariant: ProductCardVariant;
    sections: AiStudioStorefrontSection[];
    collectionStrategy: string;
    cartStyle: string;
    checkoutStyle: string;
    colorSystem: Record<string, string>;
    readiness: BlueprintReadiness;
    sourceMap: BlueprintSourceMap;
    metadata: AiStudioBlueprintMetadata;
}

export interface AiStudioWebsiteEcommerceBlockSuggestion {
    id: string;
    type: WebsiteEcommerceBlockType;
    enabled: boolean;
    status: 'draft';
    needsReview: true;
    source: string;
    title: string;
    description: string;
    ctaLabel: string;
    routeTarget: 'storefront';
    sourceMap: BlueprintSourceMap;
    metadata: AiStudioBlueprintMetadata;
}

export interface AiStudioCrossModuleBlueprints {
    chatbotBlueprint: {
        enabled: boolean;
        status: 'draft' | 'needs_review';
        needsReview: true;
        businessKnowledge: string[];
        productKnowledge: string[];
        policyKnowledge: string[];
        eventIntents: IntegrationEventType[];
        contextDrafts: string[];
        readiness: BlueprintReadiness;
        sourceMap: BlueprintSourceMap;
        metadata: AiStudioBlueprintMetadata;
    };
    leadBlueprint: {
        enabled: boolean;
        status: 'draft' | 'needs_review';
        needsReview: true;
        leadSources: string[];
        leadTags: string[];
        activityTimelineEvents: string[];
        readiness: BlueprintReadiness;
        sourceMap: BlueprintSourceMap;
        metadata: AiStudioBlueprintMetadata;
    };
    emailMarketingBlueprint: {
        enabled: boolean;
        status: 'draft' | 'needs_review';
        needsReview: true;
        flows: Array<{ type: string; status: 'draft' | 'needs_review'; triggerEvent?: IntegrationEventType }>;
        logEvents: IntegrationEventType[];
        readiness: BlueprintReadiness;
        sourceMap: BlueprintSourceMap;
        metadata: AiStudioBlueprintMetadata;
    };
}

export function createAiStudioMetadata(now = new Date().toISOString()): AiStudioBlueprintMetadata {
    return {
        generatedBy: 'ai',
        generatedByAI: true,
        userModified: false,
        generatedAt: now,
        updatedAt: now,
        generationSource: 'ai-studio-c1',
    };
}

export function createAiStudioReadiness(warnings: string[] = [], blockers: string[] = []): BlueprintReadiness {
    return {
        isReady: blockers.length === 0,
        warnings,
        blockers,
    };
}

export function getBriefText(input: AiStudioBusinessBriefInput): string {
    const plan = input.existingWebsitePlan;
    const services = [
        ...(input.services || []),
        ...(plan?.businessProfile.services || []),
    ].flatMap(service => [service.name, service.description]);
    const goals = Array.isArray(input.goals) ? input.goals.join(' ') : input.goals;

    return [
        input.businessName,
        input.businessDescription,
        input.description,
        input.industry,
        input.subIndustry,
        input.productsServicesText,
        input.productsText,
        input.servicesText,
        input.audience,
        goals,
        input.brandStyle,
        plan?.businessProfile.businessName,
        plan?.businessProfile.industry,
        plan?.businessProfile.description,
        plan?.businessProfile.tagline,
        ...services,
        ...(plan?.contentMap.products || []).flatMap(product => {
            if (!product || typeof product !== 'object') return [];
            const record = product as Record<string, unknown>;
            return [record.name, record.title, record.category, record.description].filter(Boolean).map(String);
        }),
        ...(plan?.contentMap.menuItems || []).flatMap(item => {
            if (!item || typeof item !== 'object') return [];
            const record = item as Record<string, unknown>;
            return [record.name, record.title, record.category, record.description].filter(Boolean).map(String);
        }),
    ].filter(Boolean).join(' ').toLowerCase();
}

export function uniqueValues(values: Array<string | undefined | null>, limit = 12): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const normalized = value?.trim();
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(normalized);
        if (result.length >= limit) break;
    }

    return result;
}

export function classifyCommerceSignals(input: AiStudioBusinessBriefInput): AiStudioCommerceIndustry[] {
    const text = getBriefText(input);
    const signals: AiStudioCommerceIndustry[] = [];
    const add = (signal: AiStudioCommerceIndustry, pattern: RegExp) => {
        if (pattern.test(text) && !signals.includes(signal)) signals.push(signal);
    };

    add('restaurant', /\b(restaurant|restaurante|caf[eé]|cafeteria|food|menu|reservas?|comida|meal|catering|steakhouse|bakery|panader[ií]a|bar|sushi|pizza|brunch|fine dining|casual dining|food truck)\b/i);
    add('real-estate', /\b(real estate|realtor|broker|inmobili|propiedad|buyer|seller|listings?|bienes raices|bienes raices)\b/i);
    add('fitness', /\b(fitness|gym|gimnasio|sport|sports|crossfit|bike|bikes|bicycle|bicicleta|cycling|yoga|training)\b/i);
    add('luxury', /\b(luxury|premium|jewelry|joyeria|high-end|boutique|curated|curado)\b/i);
    add('fashion', /\b(fashion|moda|clothing|ropa|apparel|shoes|zapatos)\b/i);
    add('beauty', /\b(beauty|belleza|spa|skincare|cosmetic|cosmetica|salon)\b/i);
    add('digital', /\b(digital product|download|course|curso|ebook|guide|guia|template|software|membership)\b/i);
    add('marketplace', /\b(marketplace|many categories|multi-category|catalog|catalogo|retail|department|inventory)\b/i);
    add('commerce', /\b(ecommerce|e-commerce|online store|tienda online|shop|store|tienda|sell|vende|vender|productos?|merch|gift card|tarjeta de regalo|checkout|cart|carrito)\b/i);
    add('services', /\b(service|servicio|appointment|cita|consultation|consulta|booking|reserva|package|paquete|deposit|add-on|addon)\b/i);

    if (input.hasEcommerce || input.existingWebsitePlan?.businessProfile.hasEcommerce) {
        if (!signals.includes('commerce')) signals.unshift('commerce');
    }

    return signals.length ? signals : ['non-commerce'];
}

export function hasCommerceIntent(input: AiStudioBusinessBriefInput): boolean {
    const signals = classifyCommerceSignals(input);
    if (signals.some(signal => signal !== 'services' && signal !== 'non-commerce')) return true;

    const text = getBriefText(input);
    return /\b(paid consultation|consulta pagada|packages?|paquetes?|deposit|add-on|booking|appointment|cita)\b/i.test(text);
}
