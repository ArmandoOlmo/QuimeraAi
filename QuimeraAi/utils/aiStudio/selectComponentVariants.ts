import type {
    ComponentBackgroundOption,
    ComponentMediaOption,
    ComponentMobileBehavior,
    ComponentVariantPlan,
    ComponentVariantSelectionResult,
} from '../../types/componentAnatomy';
import type { ComponentId, ComponentPlan, ComponentSelectionContext, PageIntent } from '../../types/componentRegistry';
import { componentAnatomyRegistry, getComponentAnatomy, isComponentLayoutVariant } from '../../registry/componentAnatomyRegistry';
import { getRelevantDesignPatterns } from '../../registry/designPatternLibrary';

const fallbackStyle = 'clean';

function preferredHeroVariant(context: ComponentSelectionContext): string {
    const text = context.inputText.toLowerCase();
    if (context.pageIntent === 'ecommerce_home' && (context.industry === 'premium_retail' || context.industry === 'electric_bikes' || /\b(product|bike|e-bike|premium|retail)\b/i.test(text))) {
        return 'productSpotlight';
    }
    if (context.pageIntent === 'ai_saas_landing') return 'gradientOrb';
    if (context.pageIntent === 'restaurant_home' || context.pageIntent === 'portfolio_home' || context.pageIntent === 'gallery_home') return 'editorialOverlay';
    if (context.pageIntent === 'real_estate_home') return 'imageBackground';
    if (context.pageIntent === 'local_business_home') return 'splitMediaLeft';
    return 'splitMediaRight';
}

function fallbackVariantFor(componentId: ComponentId, pageIntent?: PageIntent): string | undefined {
    if (componentId === 'hero') return preferredHeroVariant({ inputText: '', industry: '', builder: 'website', pageIntent });
    const anatomy = getComponentAnatomy(componentId);
    if (!anatomy) return undefined;
    const matching = anatomy.layoutVariants.find(variant => pageIntent && variant.bestForPageIntents.includes(pageIntent));
    return matching?.id || anatomy.defaultVariant || anatomy.fallbackVariant;
}

function chooseLayoutVariant(
    componentId: ComponentId,
    context: ComponentSelectionContext,
    lastVariants: string[],
): { layoutVariant: string; patternIds: string[] } {
    const anatomy = getComponentAnatomy(componentId);
    if (!anatomy) return { layoutVariant: 'unknown', patternIds: [] };

    const patterns = getRelevantDesignPatterns({
        industry: context.industry,
        pageIntent: context.pageIntent,
        limit: 4,
    });
    const patternRecommendation = patterns
        .flatMap(pattern => pattern.recommendedComponents.map(recommendation => ({
            patternId: pattern.patternId,
            ...recommendation,
        })))
        .find(recommendation => (
            recommendation.componentId === componentId &&
            isComponentLayoutVariant(componentId, recommendation.layoutVariant)
        ));

    let layoutVariant = patternRecommendation?.layoutVariant;
    if (componentId === 'hero') layoutVariant = preferredHeroVariant(context);
    if (!layoutVariant || !isComponentLayoutVariant(componentId, layoutVariant)) {
        layoutVariant = fallbackVariantFor(componentId, context.pageIntent) || anatomy.fallbackVariant;
    }

    if (
        lastVariants.length >= 2 &&
        lastVariants[lastVariants.length - 1] === layoutVariant &&
        lastVariants[lastVariants.length - 2] === layoutVariant
    ) {
        const alternate = anatomy.layoutVariants.find(variant => variant.id !== layoutVariant);
        layoutVariant = alternate?.id || layoutVariant;
    }

    const patternIds = patterns
        .filter(pattern => pattern.recommendedComponents.some(recommendation => recommendation.componentId === componentId))
        .map(pattern => pattern.patternId);

    return {
        layoutVariant,
        patternIds: patternRecommendation ? [patternRecommendation.patternId, ...patternIds.filter(id => id !== patternRecommendation.patternId)] : patternIds,
    };
}

function chooseStyleVariant(componentId: ComponentId, context: ComponentSelectionContext): string {
    const anatomy = getComponentAnatomy(componentId);
    if (!anatomy) return fallbackStyle;
    if (context.industry === 'ai_saas' && anatomy.styleVariants.some(variant => variant.id === 'aiSaas')) return 'aiSaas';
    if (['premium_retail', 'electric_bikes'].includes(context.industry) && anatomy.styleVariants.some(variant => variant.id === 'premiumRetail')) return 'premiumRetail';
    if (['restaurant', 'portfolio'].includes(context.industry) && anatomy.styleVariants.some(variant => variant.id === 'editorial')) return 'editorial';
    if (['services', 'local_business'].includes(context.industry) && anatomy.styleVariants.some(variant => variant.id === 'localTrust')) return 'localTrust';
    return anatomy.styleVariants[0]?.id || fallbackStyle;
}

function chooseBackground(componentId: ComponentId, layoutVariant: string): ComponentBackgroundOption {
    const anatomy = getComponentAnatomy(componentId);
    if (!anatomy) return 'plain';
    if (['editorialOverlay', 'imageBackground', 'productSpotlight', 'mapRight'].includes(layoutVariant) && anatomy.backgroundOptions.includes('imageOverlay')) return 'imageOverlay';
    if (layoutVariant === 'gradientOrb' && anatomy.backgroundOptions.includes('gradient')) return 'gradient';
    if (['premiumCards', 'editorialTiles', 'bentoGrid'].includes(layoutVariant) && anatomy.backgroundOptions.includes('surface')) return 'surface';
    return anatomy.backgroundOptions[0] || 'plain';
}

function chooseMedia(componentId: ComponentId, layoutVariant: string): ComponentMediaOption {
    const anatomy = getComponentAnatomy(componentId);
    if (!anatomy) return 'none';
    if (['featuredProducts', 'productCarousel', 'productHero'].includes(componentId) && anatomy.mediaOptions.includes('productMedia')) return 'productMedia';
    if (['gallery', 'imageWithText'].includes(componentId) && anatomy.mediaOptions.includes('gallery')) return 'gallery';
    if (['realEstateListings', 'propertySearch'].includes(componentId) && anatomy.mediaOptions.includes('listingCards')) return 'listingCards';
    if (['contact', 'restaurantLocation'].includes(componentId) && anatomy.mediaOptions.includes('map')) return 'map';
    if (layoutVariant.includes('Grid') && anatomy.mediaOptions.includes('imageGrid')) return 'imageGrid';
    if (anatomy.mediaOptions.includes('singleImage') && /(image|media|spotlight|overlay|banner)/i.test(layoutVariant)) return 'singleImage';
    return anatomy.mediaOptions[0] || 'none';
}

function chooseDensity(componentId: ComponentId, layoutVariant: string): ComponentVariantPlan['density'] {
    if (/(compact|strip|marketplace|table|grid)/i.test(layoutVariant) && !['hero', 'gallery'].includes(componentId)) return 'dense';
    if (/(editorial|spotlight|imageBackground|productSpotlight)/i.test(layoutVariant)) return 'rich';
    return 'balanced';
}

function chooseMobileBehavior(componentId: ComponentId, layoutVariant: string): ComponentMobileBehavior {
    const anatomy = getComponentAnatomy(componentId);
    const variant = anatomy?.layoutVariants.find(item => item.id === layoutVariant);
    if (variant?.mobileBehavior) return variant.mobileBehavior;
    if (/(carousel)/i.test(layoutVariant)) return 'carouselMobile';
    if (/(accordion)/i.test(layoutVariant)) return 'accordionMobile';
    if (/(compact|strip)/i.test(layoutVariant)) return 'compactStrip';
    return 'stackedMobile';
}

function activeSlotsFor(componentId: ComponentId, layoutVariant: string): string[] {
    const anatomy = getComponentAnatomy(componentId);
    if (!anatomy) return [];
    const variant = anatomy.layoutVariants.find(item => item.id === layoutVariant);
    return Array.from(new Set([
        ...anatomy.requiredSlots,
        ...(variant?.recommendedSlots || []),
    ])).filter(slotId => anatomy.availableSlots.some(slot => slot.id === slotId));
}

export function selectComponentVariants(
    componentPlan: ComponentPlan,
    context: ComponentSelectionContext,
): ComponentVariantSelectionResult {
    const warnings: string[] = [];
    const lastVariants: string[] = [];
    const variants = componentPlan.selectedComponents
        .reduce<ComponentVariantPlan[]>((acc, component) => {
            const anatomy = componentAnatomyRegistry[component.componentId];
            if (!anatomy) {
                warnings.push(`${component.componentId} has no component anatomy entry.`);
                return acc;
            }

            const { layoutVariant, patternIds } = chooseLayoutVariant(component.componentId, context, lastVariants);
            lastVariants.push(layoutVariant);
            const activeSlots = activeSlotsFor(component.componentId, layoutVariant);
            if (activeSlots.length === 0) {
                warnings.push(`${component.componentId} selected without active slots.`);
            }

            acc.push({
                componentId: component.componentId,
                implementationStatus: component.implementationStatus,
                layoutVariant,
                styleVariant: chooseStyleVariant(component.componentId, context),
                activeSlots,
                backgroundChoice: chooseBackground(component.componentId, layoutVariant),
                mediaTreatment: chooseMedia(component.componentId, layoutVariant),
                density: chooseDensity(component.componentId, layoutVariant),
                mobileBehavior: chooseMobileBehavior(component.componentId, layoutVariant),
                designPatternIds: patternIds,
                designRationale: `${component.componentId} uses ${layoutVariant} for ${componentPlan.pageIntent} because it matches ${context.industry} and the selected design pattern rhythm.`,
                confidence: component.confidence,
                sourceMap: {
                    anatomy: `componentAnatomyRegistry.${component.componentId}`,
                    variantSelector: 'utils.aiStudio.selectComponentVariants',
                    designPatterns: patternIds,
                },
            });
            return acc;
        }, []);

    const centeredCount = variants.filter(variant => /centered/i.test(variant.layoutVariant)).length;
    const gridCount = variants.filter(variant => /(grid|cards)/i.test(variant.layoutVariant)).length;
    if (variants.length >= 4 && centeredCount === variants.length) warnings.push('All selected sections are centered; visual rhythm should vary.');
    if (variants.length >= 4 && gridCount / variants.length > 0.65) warnings.push('Too many selected sections use grids/cards.');

    return {
        variants,
        warnings,
        sourceMap: {
            componentPlan: 'componentSelection.selectedComponents',
            anatomy: 'registry.componentAnatomyRegistry',
            designPatterns: 'registry.designPatternLibrary',
        },
    };
}
