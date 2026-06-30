const clamp = (value, max) => Math.max(0, Math.min(max, value));
const isGridLike = (variant) => /(grid|cards|categoryGrid|listingCards|pricingCards|bento)/i.test(variant.layoutVariant);
const isCentered = (variant) => /(centered|textOnly)/i.test(variant.layoutVariant);
const isCtaComponent = (componentId) => ['leadForm', 'shopCTA', 'appointmentCTA', 'restaurantReservation', 'newsletter'].includes(componentId);
const isTrustComponent = (componentId) => ['trustBadges', 'testimonials', 'stats'].includes(componentId);
function issue(designIssues, input) {
    if (!designIssues.some(existing => existing.code === input.code && existing.componentId === input.componentId)) {
        designIssues.push(input);
    }
}
export function critiqueComponentDesign(input) {
    const { componentPlan, variantPlan, context } = input;
    const designIssues = [];
    const totalSections = Math.max(variantPlan.length, 1);
    const centeredCount = variantPlan.filter(isCentered).length;
    const gridCount = variantPlan.filter(isGridLike).length;
    const hero = variantPlan.find(variant => variant.componentId === 'hero');
    const ctaCount = variantPlan.filter(variant => isCtaComponent(variant.componentId)).length;
    const trustCount = variantPlan.filter(variant => isTrustComponent(variant.componentId)).length;
    const mobileReadyCount = variantPlan.filter(variant => Boolean(variant.mobileBehavior) && variant.mobileBehavior !== 'hiddenMobile').length;
    const uniqueLayouts = new Set(variantPlan.map(variant => variant.layoutVariant)).size;
    const uniqueBackgrounds = new Set(variantPlan.map(variant => variant.backgroundChoice)).size;
    const uniqueDensities = new Set(variantPlan.map(variant => variant.density)).size;
    if (totalSections >= 4 && centeredCount === totalSections) {
        issue(designIssues, {
            code: 'repetitive_centered_sections',
            severity: 'error',
            message: 'All selected sections use centered/text-only structures.',
            suggestion: 'Introduce split, editorial, trust, CTA, or product-led variants.',
        });
    }
    if (totalSections >= 4 && gridCount / totalSections > 0.65) {
        issue(designIssues, {
            code: 'excessive_grids',
            severity: 'error',
            message: 'Too many sections use grids or card layouts.',
            suggestion: 'Alternate grids with split, editorial, strip, CTA, process, or proof variants.',
        });
    }
    if (hero &&
        hero.layoutVariant === 'centeredMinimal' &&
        ['ecommerce_home', 'restaurant_home', 'real_estate_home', 'portfolio_home', 'gallery_home'].includes(componentPlan.pageIntent)) {
        issue(designIssues, {
            code: 'generic_hero',
            severity: 'error',
            componentId: 'hero',
            message: 'Hero is generic for a page intent that needs a stronger visual lead.',
            suggestion: 'Use productSpotlight, editorialOverlay, imageBackground, or splitMediaRight depending on context.',
        });
    }
    if (ctaCount === 0) {
        issue(designIssues, {
            code: 'weak_cta',
            severity: 'error',
            message: 'No clear conversion component was selected.',
            suggestion: 'Add leadForm, shopCTA, appointmentCTA, newsletter, or restaurantReservation as appropriate.',
        });
    }
    if (trustCount === 0 && ['ecommerce_home', 'service_landing', 'local_business_home', 'real_estate_home'].includes(componentPlan.pageIntent)) {
        issue(designIssues, {
            code: 'missing_trust_cues',
            severity: 'warning',
            message: 'The plan lacks explicit trust cues.',
            suggestion: 'Add trustBadges, testimonials with real proof, or sourced stats.',
        });
    }
    if (mobileReadyCount < totalSections) {
        issue(designIssues, {
            code: 'weak_mobile_hierarchy',
            severity: 'error',
            message: 'Some selected variants are missing mobile behavior.',
            suggestion: 'Every variant must specify stackedMobile, carouselMobile, accordionMobile, compactStrip, or priorityContent.',
        });
    }
    if (hero && hero.activeSlots.includes('subheadline') && context.inputText.length > 1400) {
        issue(designIssues, {
            code: 'long_hero_copy_risk',
            severity: 'warning',
            componentId: 'hero',
            message: 'The source brief is long and could produce oversized hero copy.',
            suggestion: 'Keep hero copy concise and move detail into about, services, process, or FAQ sections.',
        });
    }
    if (uniqueLayouts <= 2 && totalSections >= 5) {
        issue(designIssues, {
            code: 'flat_spacing_rhythm',
            severity: 'warning',
            message: 'Layout rhythm is too flat.',
            suggestion: 'Vary layouts and density across hero, trust/value, split/content, grid, CTA, proof, and FAQ sections.',
        });
    }
    if (hero?.backgroundChoice === 'plain' && ['restaurant_home', 'portfolio_home', 'gallery_home', 'real_estate_home'].includes(componentPlan.pageIntent)) {
        issue(designIssues, {
            code: 'low_contrast_risk',
            severity: 'warning',
            componentId: 'hero',
            message: 'Image-led page intent may need stronger contrast or media treatment.',
            suggestion: 'Use imageOverlay, product media, or a split-media variant with clear text contrast.',
        });
    }
    const visualHierarchy = clamp(20 - (designIssues.some(item => item.code === 'generic_hero') ? 8 : 0) - (centeredCount === totalSections ? 6 : 0), 20);
    const componentVariety = clamp(15 * Math.min(1, uniqueLayouts / Math.min(totalSections, 5)) - (gridCount / totalSections > 0.65 ? 5 : 0), 15);
    const brandFit = clamp(15 - (hero?.layoutVariant === 'centeredMinimal' && context.industry !== 'general' ? 4 : 0), 15);
    const conversionClarity = clamp(15 - (ctaCount === 0 ? 9 : 0), 15);
    const mobileFirst = clamp(15 * (mobileReadyCount / totalSections), 15);
    const spacingRhythm = clamp(10 * Math.min(1, (uniqueBackgrounds + uniqueDensities) / 4), 10);
    const originalityWithoutChaos = clamp(10 - (uniqueLayouts === totalSections && totalSections > 6 ? 2 : 0) - (uniqueLayouts <= 2 && totalSections >= 5 ? 3 : 0), 10);
    const total = Math.round(visualHierarchy +
        componentVariety +
        brandFit +
        conversionClarity +
        mobileFirst +
        spacingRhythm +
        originalityWithoutChaos);
    const suggestions = designIssues.map(item => item.suggestion);
    if (total < 80 && suggestions.length === 0) {
        suggestions.push('Increase visual variety and make CTA/trust rhythm more explicit before rendering.');
    }
    return {
        passed: total >= 80 && designIssues.every(item => item.severity !== 'error'),
        scores: {
            visualHierarchy,
            componentVariety,
            brandFit,
            conversionClarity,
            mobileFirst,
            spacingRhythm,
            originalityWithoutChaos,
            total,
        },
        designIssues,
        suggestions,
        sourceMap: {
            critic: 'utils.aiStudio.designCritic',
            componentPlan: 'componentSelection.componentPlan',
            variantPlan: 'selectComponentVariants.variants',
        },
    };
}
//# sourceMappingURL=designCritic.js.map