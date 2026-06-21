import type { StorefrontSectionKind } from '../../types/storefrontRenderer';

export const CORE_STOREFRONT_SECTION_KEYS: StorefrontSectionKind[] = [
    'announcementBar',
    'productHero',
    'featuredProducts',
    'categoryGrid',
    'trustBadges',
];

interface ResolveVisibilityOptions {
    defaultVisible?: boolean;
    isCoreSection?: boolean;
}

interface NormalizeVisibilityOptions {
    sections: readonly string[];
    previousVisibility?: Record<string, boolean> | Partial<Record<string, boolean>>;
    recommendedSections?: readonly string[];
    forceRecommendedVisible?: boolean;
    defaultVisibleBySection?: Partial<Record<string, boolean>>;
    coreSections?: readonly string[];
    ensureAtLeastOneVisible?: boolean;
    fallbackSection?: string;
}

export function resolveStorefrontSectionVisibility(
    sectionKey: string,
    visibilityMap?: Record<string, boolean> | Partial<Record<string, boolean>>,
    options: ResolveVisibilityOptions = {},
): boolean {
    const explicit = visibilityMap?.[sectionKey];
    if (explicit === false) return false;
    if (explicit === true) return true;
    if (options.isCoreSection) return true;
    return options.defaultVisible ?? true;
}

export function normalizeStorefrontSectionVisibility({
    sections,
    previousVisibility = {},
    recommendedSections = [],
    forceRecommendedVisible = false,
    defaultVisibleBySection = {},
    coreSections = CORE_STOREFRONT_SECTION_KEYS,
    ensureAtLeastOneVisible = false,
    fallbackSection,
}: NormalizeVisibilityOptions): Record<string, boolean> {
    const recommended = new Set(recommendedSections);
    const core = new Set(coreSections);
    const nextVisibility: Record<string, boolean> = { ...previousVisibility };

    sections.forEach(section => {
        if (forceRecommendedVisible && recommended.has(section)) {
            nextVisibility[section] = true;
            return;
        }

        if (nextVisibility[section] === undefined) {
            nextVisibility[section] = resolveStorefrontSectionVisibility(section, nextVisibility, {
                defaultVisible: defaultVisibleBySection[section],
                isCoreSection: core.has(section),
            });
        }
    });

    if (ensureAtLeastOneVisible && sections.length > 0) {
        const hasVisibleSection = sections.some(section => nextVisibility[section] !== false);
        if (!hasVisibleSection) {
            const fallback = (
                fallbackSection && sections.includes(fallbackSection)
                    ? fallbackSection
                    : sections.find(section => core.has(section)) || sections[0]
            );
            nextVisibility[fallback] = true;
        }
    }

    return nextVisibility;
}
