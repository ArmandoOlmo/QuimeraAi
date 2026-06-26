import type {
    BusinessBlueprint,
    BlueprintModuleState,
    ChatbotBlueprint,
    EcommerceBlueprint,
    EmailMarketingBlueprint,
    LeadBlueprint,
    BlueprintSource,
    RestaurantBlueprint,
    StorefrontBlueprint,
    WebsiteBlueprint,
    WebsiteEcommerceBlockBlueprint,
    WebsiteSectionBlueprint,
} from '../../types/businessBlueprint';
import {
    BUSINESS_BLUEPRINT_SCHEMA_VERSION,
    BUSINESS_BLUEPRINT_VERSION,
} from '../../types/businessBlueprint';
import type {
    WebsiteEcommerceBlockSource,
} from '../../types/websiteEcommerceBlocks';
import type { PageSection } from '../../types/ui';
import type { WebsitePlan } from '../../types/websitePlan';
import type { ComponentVariantPlan } from '../../types/componentAnatomy';
import type {
    ComponentPlan,
    ComponentPlanValidationResult,
    ComponentSelectionContext,
} from '../../types/componentRegistry';
import {
    getStorefrontCatalogSize,
} from '../storefrontTheme';
import { isRetiredDesignSuiteSection } from '../../data/retiredSuites';
import type {
    AiStudioCrossModuleBlueprints,
    AiStudioEcommerceBlueprint,
    AiStudioStorefrontBlueprint,
    AiStudioWebsiteEcommerceBlockSuggestion,
} from '../aiStudio';
import type { DesignCriticResult } from '../aiStudio/designCritic';
import { getComponentDefinition } from '../../registry/componentRegistry';
import { createBusinessBlueprintFromWebsitePlan, createBlueprintModuleState, normalizeChatbotBlueprint, shouldProtectFromRegeneration } from './adapters';
import { mergeRenderableSectionVariantSettings } from './renderableSectionVariants';

export interface MergeAiStudioBlueprintOptions {
    projectId?: string;
    tenantId?: string;
    workspaceId?: string;
    createdBy?: string;
    source?: BlueprintSource;
    now?: string;
}

export interface MergeAiStudioBlueprintInput {
    existingBusinessBlueprint?: BusinessBlueprint | null;
    websitePlan: WebsitePlan;
    ecommerceBlueprint: AiStudioEcommerceBlueprint;
    storefrontBlueprint: AiStudioStorefrontBlueprint;
    websiteEcommerceBlocks: AiStudioWebsiteEcommerceBlockSuggestion[];
    restaurantBlueprint?: RestaurantBlueprint;
    componentSelectionContext?: ComponentSelectionContext;
    componentPlan?: ComponentPlan;
    componentVariantPlan?: ComponentVariantPlan[];
    designCritic?: DesignCriticResult;
    componentValidation?: ComponentPlanValidationResult;
    chatbotBlueprint: AiStudioCrossModuleBlueprints['chatbotBlueprint'];
    leadBlueprint: AiStudioCrossModuleBlueprints['leadBlueprint'];
    emailMarketingBlueprint: AiStudioCrossModuleBlueprints['emailMarketingBlueprint'];
    options?: MergeAiStudioBlueprintOptions;
}

function protectedOrMerged<TModule extends Pick<BlueprintModuleState, 'metadata'>>(
    existing: TModule | undefined,
    next: TModule,
): TModule {
    return existing && shouldProtectFromRegeneration(existing) ? existing : next;
}

function mapBlockSource(block: AiStudioWebsiteEcommerceBlockSuggestion): WebsiteEcommerceBlockSource {
    switch (block.type) {
        case 'giftCardBlock':
            return 'gift_cards';
        case 'categoryShowcase':
            return 'category';
        case 'bestSellersStrip':
            return 'best_sellers';
        case 'productCarousel':
            return 'new_arrivals';
        case 'promoBanner':
            return 'promotion';
        default:
            return 'featured';
    }
}

function toWebsiteEcommerceBlockBlueprint(
    block: AiStudioWebsiteEcommerceBlockSuggestion,
    index: number,
    now: string,
): WebsiteEcommerceBlockBlueprint {
    const source = mapBlockSource(block);

    return {
        id: block.id || `ai-website-ecommerce-${index + 1}`,
        type: block.type,
        source,
        targetRoute: '/store',
        settings: {
            source: { type: source },
            layout: block.type === 'productCarousel' ? 'carousel' : block.type === 'promoBanner' ? 'banner' : block.type === 'shopCTA' ? 'cta' : 'grid',
            cta: { label: block.ctaLabel, routeType: 'storefront', route: '/store' },
            showPrice: true,
            showBadges: true,
            showRating: false,
        },
        ...createBlueprintModuleState(now, {
            enabled: block.enabled,
            status: 'draft',
            needsReview: true,
            sourceMap: block.sourceMap,
            readiness: {
                isReady: true,
                warnings: ['Website ecommerce block is a suggestion only and is not mounted in Website Editor visual runtime.'],
                blockers: [],
            },
            metadata: {
                ...block.metadata,
                lastSyncedAt: now,
            },
        }),
    };
}

interface WebsiteDesignIntelligenceInput {
    componentPlan?: ComponentPlan;
    componentVariantPlan?: ComponentVariantPlan[];
    designCritic?: DesignCriticResult;
    componentValidation?: ComponentPlanValidationResult;
}

function getDesignByWebsiteSection(
    input: WebsiteDesignIntelligenceInput,
): Map<PageSection, {
    selection: ComponentPlan['selectedComponents'][number];
    variant?: ComponentVariantPlan;
}> {
    const bySection = new Map<PageSection, {
        selection: ComponentPlan['selectedComponents'][number];
        variant?: ComponentVariantPlan;
    }>();

    input.componentPlan?.selectedComponents.forEach(selection => {
        const component = getComponentDefinition(selection.componentId);
        if (component?.implementationStatus !== 'rendered') return;
        const section = component?.renderTargets?.websiteSection;
        if (!section || bySection.has(section)) return;
        bySection.set(section, {
            selection,
            variant: input.componentVariantPlan?.find(variant => variant.componentId === selection.componentId),
        });
    });

    return bySection;
}

function getSelectedWebsiteSections(input: WebsiteDesignIntelligenceInput): PageSection[] {
    const sections: PageSection[] = [];
    input.componentPlan?.selectedComponents.forEach(selection => {
        const component = getComponentDefinition(selection.componentId);
        if (component?.implementationStatus !== 'rendered') return;
        const section = component.renderTargets?.websiteSection;
        if (section && !sections.includes(section)) sections.push(section);
    });
    return sections;
}

function enrichWebsiteSectionBlueprint(
    section: WebsiteSectionBlueprint,
    input: WebsiteDesignIntelligenceInput,
    designBySection: Map<PageSection, { selection: ComponentPlan['selectedComponents'][number]; variant?: ComponentVariantPlan }>,
): WebsiteSectionBlueprint {
    const design = designBySection.get(section.type);
    if (!design || shouldProtectFromRegeneration(section)) return section;

    return mergeRenderableSectionVariantSettings({
        ...section,
        componentId: design.selection.componentId,
        layoutVariant: design.variant?.layoutVariant,
        styleVariant: design.variant?.styleVariant,
        activeSlots: design.variant?.activeSlots,
        backgroundChoice: design.variant?.backgroundChoice,
        mediaTreatment: design.variant?.mediaTreatment,
        density: design.variant?.density,
        mobileBehavior: design.variant?.mobileBehavior,
        designPatternIds: design.variant?.designPatternIds,
        designScore: input.designCritic?.scores.total,
        designRationale: design.variant?.designRationale || design.selection.reason,
        selectionConfidence: design.selection.confidence,
        sourceMap: {
            ...(section.sourceMap || {}),
            componentRegistry: `componentRegistry.${design.selection.componentId}`,
            implementationStatus: design.selection.implementationStatus,
            componentAnatomy: design.variant ? `componentAnatomyRegistry.${design.selection.componentId}.${design.variant.layoutVariant}` : `componentAnatomyRegistry.${design.selection.componentId}`,
            componentSelection: 'aiStudio.componentSelection',
            designCritic: 'aiStudio.designCritic',
            validation: input.componentValidation?.valid ? 'componentPlan.valid' : 'componentPlan.review_required',
        },
    });
}

function mergeWebsiteBlueprint(
    base: WebsiteBlueprint,
    existing: WebsiteBlueprint | undefined,
    blocks: AiStudioWebsiteEcommerceBlockSuggestion[],
    now: string,
    designInput: WebsiteDesignIntelligenceInput = {},
): WebsiteBlueprint {
    const selectedWebsiteSections = getSelectedWebsiteSections(designInput)
        .filter(section => !isRetiredDesignSuiteSection(section));
    const baseSections = [...base.sections].filter(section => !isRetiredDesignSuiteSection(section));
    selectedWebsiteSections.forEach(section => {
        if (!baseSections.includes(section)) baseSections.push(section);
    });
    const designBySection = getDesignByWebsiteSection(designInput);
    const baseSectionBlueprints = [...(base.sectionBlueprints || [])]
        .filter(section => !isRetiredDesignSuiteSection(section.type));
    selectedWebsiteSections.forEach(section => {
        if (baseSectionBlueprints.some(item => item.type === section)) return;
        baseSectionBlueprints.push({
            id: `website-section-${section}-${baseSectionBlueprints.length + 1}`,
            type: section,
            order: baseSectionBlueprints.length,
            visible: true,
            pageIds: ['home'],
            ...createBlueprintModuleState(now, {
                sourceMap: {
                    section: 'aiStudio.componentSelection',
                },
            }),
        });
    });

    const next: WebsiteBlueprint = {
        ...base,
        needsReview: true,
        pages: base.pages.map(page => ({
            ...page,
            sections: baseSections,
        })),
        sections: baseSections,
        componentOrder: baseSections,
        sectionVisibility: baseSections.reduce((acc, section) => {
            acc[section] = base.sectionVisibility?.[section] ?? true;
            return acc;
        }, {} as Record<PageSection, boolean>),
        sectionBlueprints: baseSectionBlueprints.map(section => (
            enrichWebsiteSectionBlueprint(section, designInput, designBySection)
        )),
        ecommerceBlocks: blocks.map((block, index) => toWebsiteEcommerceBlockBlueprint(block, index, now)),
        sourceMap: {
            ...(base.sourceMap || {}),
            ecommerceBlocks: 'aiStudio.deriveWebsiteEcommerceBlocks',
            componentSelection: 'aiStudio.componentSelection',
            componentAnatomy: 'aiStudio.componentAnatomyRegistry',
            designPatternLibrary: 'aiStudio.designPatternLibrary',
            designCritic: 'aiStudio.designCritic',
        },
        metadata: {
            ...base.metadata,
            generatedByAI: true,
            updatedAt: now,
            lastSyncedAt: now,
            generationSource: 'ai-studio-c1',
        },
        readiness: {
            ...base.readiness,
            warnings: [
                ...(base.readiness.warnings || []),
                ...(designInput.designCritic && !designInput.designCritic.passed
                    ? ['Design Intelligence score is below publish threshold and needs review.']
                    : []),
                ...(designInput.componentValidation && !designInput.componentValidation.valid
                    ? ['Component plan validation found blocking issues.']
                    : []),
            ],
        },
    };

    if (!existing) return next;
    if (existing.metadata.lockedFromRegeneration) return existing;

    const protectedSections = (existing.sectionBlueprints || [])
        .filter(section => shouldProtectFromRegeneration(section) && !isRetiredDesignSuiteSection(section.type));
    const protectedBlocks = (existing.ecommerceBlocks || [])
        .filter(block => shouldProtectFromRegeneration(block));

    if (protectedSections.length === 0 && protectedBlocks.length === 0) {
        return next;
    }

    const existingSectionList: PageSection[] = (existing.sections || existing.componentOrder || [])
        .filter(section => !isRetiredDesignSuiteSection(section));
    const existingSections = new Set<PageSection>(existingSectionList);
    let sections = [...next.sections];
    const sectionVisibility = {
        ...(next.sectionVisibility || {}),
        ...(existing.sectionVisibility || {}),
    } as Record<PageSection, boolean>;
    const nextSectionBlueprints = [...(next.sectionBlueprints || [])];

    protectedSections.forEach(section => {
        const index = nextSectionBlueprints.findIndex(item => item.id === section.id || item.type === section.type);
        if (index >= 0) {
            nextSectionBlueprints[index] = section;
        } else {
            nextSectionBlueprints.push(section);
        }

        sectionVisibility[section.type] = section.visible;

        if (section.visible || existingSections.has(section.type)) {
            if (!sections.includes(section.type)) {
                sections.splice(Math.min(section.order, sections.length), 0, section.type);
            }
        } else {
            sections = sections.filter(item => item !== section.type);
        }
    });

    const protectedOrder = new Map<PageSection, number>(
        protectedSections.map(section => [section.type, section.order]),
    );
    sections.sort((a, b) => {
        const aOrder = protectedOrder.get(a);
        const bOrder = protectedOrder.get(b);
        if (aOrder == null && bOrder == null) return 0;
        if (aOrder == null) return 1;
        if (bOrder == null) return -1;
        return aOrder - bOrder;
    });
    sections = sections.filter(section => !isRetiredDesignSuiteSection(section));
    const sanitizedSectionVisibility = Object.fromEntries(
        Object.entries(sectionVisibility).filter(([section]) => !isRetiredDesignSuiteSection(section))
    ) as Record<PageSection, boolean>;

    const nextBlocks = [...next.ecommerceBlocks];
    protectedBlocks.forEach(block => {
        const index = nextBlocks.findIndex(item => item.id === block.id || item.type === block.type);
        if (index >= 0) {
            nextBlocks[index] = block;
        } else {
            nextBlocks.push(block);
        }
    });

    const pages = next.pages.map(page => ({
        ...page,
        sections: page.sections
            .filter(section => sections.includes(section))
            .concat(sections.filter(section => !page.sections.includes(section) && protectedOrder.has(section))),
    }));

    return {
        ...next,
        pages,
        sections,
        componentOrder: sections,
        sectionVisibility: sanitizedSectionVisibility,
        sectionBlueprints: nextSectionBlueprints
            .filter(section => !isRetiredDesignSuiteSection(section.type))
            .sort((a: WebsiteSectionBlueprint, b: WebsiteSectionBlueprint) => a.order - b.order),
        ecommerceBlocks: nextBlocks,
    };
}

function mergeEcommerceBlueprint(
    base: EcommerceBlueprint,
    existing: EcommerceBlueprint | undefined,
    derived: AiStudioEcommerceBlueprint,
    now: string,
): EcommerceBlueprint {
    const next: EcommerceBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.enabled ? 'needs_review' : 'disabled',
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: {
            ...derived.metadata,
            lastSyncedAt: now,
        },
        storeType: derived.storeType,
        catalogStrategy: derived.catalogStrategy,
        categories: derived.productCategories,
        productCategories: derived.productCategories,
        collections: derived.productCategories.map(category => `${category} Draft Collection`),
        starterProducts: derived.starterProducts,
        inventoryMode: derived.inventoryMode,
        fulfillmentMode: derived.fulfillmentMode,
        paymentMode: derived.paymentMode,
        taxMode: derived.taxMode,
        shippingMode: derived.shippingMode,
        discounts: [],
        giftCards: {
            enabled: derived.giftCardsEnabled,
            status: derived.giftCardsEnabled ? 'draft' : 'needs_review',
        },
        giftCardsEnabled: derived.giftCardsEnabled,
        digitalProductsEnabled: derived.digitalProductsEnabled,
        recommendations: derived.recommendations,
    };

    return protectedOrMerged(existing, next);
}

function mergeStorefrontBlueprint(
    base: StorefrontBlueprint,
    existing: StorefrontBlueprint | undefined,
    derived: AiStudioStorefrontBlueprint,
    ecommerceBlueprint: AiStudioEcommerceBlueprint,
    now: string,
): StorefrontBlueprint {
    const next: StorefrontBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.enabled ? 'needs_review' : 'disabled',
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: {
            ...derived.metadata,
            lastSyncedAt: now,
        },
        routeStrategy: 'project-store',
        catalogSize: getStorefrontCatalogSize(ecommerceBlueprint.starterProducts.length),
        templatePreset: derived.templatePreset,
        themePreset: derived.themePreset,
        themeFallbackChain: [
            'DEFAULT_STOREFRONT_THEME',
            `preset:${derived.themePreset}`,
            'brandColors',
            'projectGlobalColors',
            'storefrontTheme',
        ],
        productCardVariant: derived.productCardVariant,
        collectionStrategy: derived.collectionStrategy,
        cartStyle: derived.cartStyle,
        checkoutStyle: derived.checkoutStyle,
        colorSystem: derived.colorSystem,
        templates: {
            home: 'ai-store-home-draft',
            collection: 'ai-collection-draft',
            product: 'ai-product-draft',
            cart: 'draft-cart-drawer',
            checkoutVisual: 'payments-disabled-checkout-draft',
        },
        sections: derived.sections.map(section => ({
            id: section.id,
            type: section.type,
            order: section.order,
            dataSource: section.dataSource,
            settings: section.settings,
            ...createBlueprintModuleState(now, {
                enabled: section.enabled,
                status: section.status,
                needsReview: true,
                readiness: section.readiness,
                sourceMap: section.sourceMap,
                metadata: {
                    ...section.metadata,
                    lastSyncedAt: now,
                },
            }),
        })),
    };

    return protectedOrMerged(existing, next);
}

function mergeChatbotBlueprint(
    base: ChatbotBlueprint,
    existing: ChatbotBlueprint | undefined,
    derived: AiStudioCrossModuleBlueprints['chatbotBlueprint'],
    now: string,
): ChatbotBlueprint {
    if (existing && shouldProtectFromRegeneration(existing)) {
        return normalizeChatbotBlueprint(existing, {
            businessName: base.agentProfile.agentName,
            industry: base.businessKnowledge[1] || '',
            description: base.businessKnowledge[2] || '',
            services: base.businessKnowledge.slice(3).map(name => ({ name })),
            hasEcommerce: base.ecommerce.enabled,
            now,
        });
    }

    const next: ChatbotBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.status,
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: { ...derived.metadata, lastSyncedAt: now },
        businessKnowledge: derived.businessKnowledge,
        productKnowledge: derived.productKnowledge,
        policyKnowledge: [...derived.policyKnowledge, ...derived.contextDrafts],
        eventIntents: derived.eventIntents,
    };

    return normalizeChatbotBlueprint(next, {
        businessName: base.agentProfile.agentName,
        industry: base.businessKnowledge[1] || '',
        description: base.businessKnowledge[2] || '',
        services: base.businessKnowledge.slice(3).map(name => ({ name })),
        hasEcommerce: base.ecommerce.enabled,
        now,
    });
}

function mergeLeadBlueprint(
    base: LeadBlueprint,
    existing: LeadBlueprint | undefined,
    derived: AiStudioCrossModuleBlueprints['leadBlueprint'],
    now: string,
): LeadBlueprint {
    const next: LeadBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.status,
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: { ...derived.metadata, lastSyncedAt: now },
        leadSources: derived.leadSources,
        leadTags: derived.leadTags,
        activityTimelineEvents: derived.activityTimelineEvents,
    };

    return protectedOrMerged(existing, next);
}

function mergeEmailMarketingBlueprint(
    base: EmailMarketingBlueprint,
    existing: EmailMarketingBlueprint | undefined,
    derived: AiStudioCrossModuleBlueprints['emailMarketingBlueprint'],
    now: string,
): EmailMarketingBlueprint {
    const next: EmailMarketingBlueprint = {
        ...base,
        enabled: derived.enabled,
        status: derived.status,
        needsReview: true,
        readiness: derived.readiness,
        sourceMap: derived.sourceMap,
        metadata: { ...derived.metadata, lastSyncedAt: now },
        flows: derived.flows,
        logEvents: derived.logEvents,
    };

    return protectedOrMerged(existing, next);
}

function mergeRestaurantBlueprint(
    base: RestaurantBlueprint,
    existing: RestaurantBlueprint | undefined,
    derived: RestaurantBlueprint | undefined,
    now: string,
): RestaurantBlueprint {
    const next: RestaurantBlueprint = {
        ...(derived || base),
        metadata: {
            ...((derived || base).metadata),
            lastSyncedAt: now,
        },
    };

    return protectedOrMerged(existing, next);
}

export function mergeAiStudioBlueprint(input: MergeAiStudioBlueprintInput): BusinessBlueprint {
    const now = input.options?.now || input.ecommerceBlueprint.metadata.generatedAt || new Date().toISOString();
    const base = createBusinessBlueprintFromWebsitePlan(input.websitePlan, {
        ...input.options,
        now,
        source: input.options?.source || 'ai-studio',
    });
    const existing = input.existingBusinessBlueprint || undefined;
    const ecommerceBlueprint = mergeEcommerceBlueprint(base.ecommerceBlueprint, existing?.ecommerceBlueprint, input.ecommerceBlueprint, now);
    const storefrontBlueprint = mergeStorefrontBlueprint(base.storefrontBlueprint, existing?.storefrontBlueprint, input.storefrontBlueprint, input.ecommerceBlueprint, now);
    const websiteBlueprint = mergeWebsiteBlueprint(
        base.websiteBlueprint,
        existing?.websiteBlueprint,
        input.websiteEcommerceBlocks,
        now,
        {
            componentPlan: input.componentPlan,
            componentVariantPlan: input.componentVariantPlan,
            designCritic: input.designCritic,
            componentValidation: input.componentValidation,
        },
    );

    return {
        ...base,
        blueprintVersion: existing?.blueprintVersion || BUSINESS_BLUEPRINT_VERSION,
        schemaVersion: existing?.schemaVersion || BUSINESS_BLUEPRINT_SCHEMA_VERSION,
        generatedAt: existing?.generatedAt || now,
        updatedAt: now,
        lastSyncedAt: now,
        sourceMap: {
            ...(existing?.sourceMap || {}),
            ...base.sourceMap,
            ecommerceBlueprint: 'aiStudio.deriveEcommerceBlueprintFromBusinessBrief',
            storefrontBlueprint: 'aiStudio.deriveStorefrontBlueprintFromBusinessBrief',
            websiteEcommerceBlocks: 'aiStudio.deriveWebsiteEcommerceBlocks',
            restaurantBlueprint: input.restaurantBlueprint ? 'aiStudio.deriveRestaurantBlueprintFromBusinessBrief' : 'businessBlueprint.adapters.createRestaurantBlueprintFromWebsitePlan',
            componentSelection: 'aiStudio.componentSelection',
            componentAnatomy: 'aiStudio.componentAnatomyRegistry',
            designPatternLibrary: 'aiStudio.designPatternLibrary',
            designCritic: 'aiStudio.designCritic',
            componentValidation: 'aiStudio.validateComponentPlan',
            crossModuleBlueprints: 'aiStudio.deriveCrossModuleBlueprints',
        },
        metadata: {
            ...base.metadata,
            generatedByAI: true,
            updatedAt: now,
            lastSyncedAt: now,
            generationSource: 'ai-studio-c1',
        },
        readiness: input.ecommerceBlueprint.enabled
            ? {
                isReady: false,
                warnings: [
                    'AI Studio generated ecommerce and storefront draft infrastructure.',
                    'All commerce modules need merchant review before publishing.',
                ],
                blockers: [
                    'Payments are not configured.',
                    'Starter products are not reviewed or published.',
                    'Storefront is not published automatically.',
                ],
            }
            : base.readiness,
        businessProfile: protectedOrMerged(existing?.businessProfile, base.businessProfile),
        brandProfile: protectedOrMerged(existing?.brandProfile, base.brandProfile),
        websiteBlueprint,
        ecommerceBlueprint,
        storefrontBlueprint,
        chatbotBlueprint: mergeChatbotBlueprint(base.chatbotBlueprint, existing?.chatbotBlueprint, input.chatbotBlueprint, now),
        leadBlueprint: mergeLeadBlueprint(base.leadBlueprint, existing?.leadBlueprint, input.leadBlueprint, now),
        emailMarketingBlueprint: mergeEmailMarketingBlueprint(base.emailMarketingBlueprint, existing?.emailMarketingBlueprint, input.emailMarketingBlueprint, now),
        mediaBlueprint: protectedOrMerged(existing?.mediaBlueprint, base.mediaBlueprint),
        bioPageBlueprint: protectedOrMerged(existing?.bioPageBlueprint, base.bioPageBlueprint!),
        appointmentsBlueprint: protectedOrMerged(existing?.appointmentsBlueprint, base.appointmentsBlueprint),
        restaurantBlueprint: mergeRestaurantBlueprint(base.restaurantBlueprint, existing?.restaurantBlueprint, input.restaurantBlueprint, now),
        realEstateBlueprint: protectedOrMerged(existing?.realEstateBlueprint, base.realEstateBlueprint),
        financeBlueprint: protectedOrMerged(existing?.financeBlueprint, base.financeBlueprint),
        analyticsBlueprint: protectedOrMerged(existing?.analyticsBlueprint, base.analyticsBlueprint),
        automationBlueprint: protectedOrMerged(existing?.automationBlueprint, base.automationBlueprint),
    };
}
