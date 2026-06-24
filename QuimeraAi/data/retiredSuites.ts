import type { PageSection } from '../types/ui';

export const RETIRED_DESIGN_SUITE_SECTIONS: readonly PageSection[] = [
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

const retiredDesignSuiteSectionSet = new Set<PageSection>(RETIRED_DESIGN_SUITE_SECTIONS);

export function isRetiredDesignSuiteSection(section: PageSection | string): boolean {
    return retiredDesignSuiteSectionSet.has(section as PageSection);
}
