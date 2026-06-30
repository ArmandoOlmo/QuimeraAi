export const RETIRED_DESIGN_SUITE_SECTIONS = [
    'heroLumina',
    'featuresLumina',
    'ctaLumina',
    'portfolioLumina',
    'pricingLumina',
    'testimonialsLumina',
    'faqLumina',
    'heroNeon',
    'testimonialsNeon',
    'featuresNeon',
    'ctaNeon',
    'portfolioNeon',
    'pricingNeon',
    'faqNeon',
];
const retiredDesignSuiteSectionSet = new Set(RETIRED_DESIGN_SUITE_SECTIONS);
export function isRetiredDesignSuiteSection(section) {
    return retiredDesignSuiteSectionSet.has(section);
}
//# sourceMappingURL=retiredSuites.js.map