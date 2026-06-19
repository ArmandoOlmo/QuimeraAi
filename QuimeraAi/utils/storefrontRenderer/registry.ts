import type { StorefrontSectionBlueprint } from '../../types/businessBlueprint';
import type {
    StorefrontSectionKind,
    StorefrontSectionRegistryItem,
    StorefrontSectionRenderDecision,
    StorefrontSectionResolverInput,
    StorefrontSectionValidationResult,
} from '../../types/storefrontRenderer';
import {
    CORE_STOREFRONT_SECTION_KEYS,
    resolveStorefrontSectionVisibility,
} from './visibility';

export const STOREFRONT_SECTION_KINDS: StorefrontSectionKind[] = [
    'announcementBar',
    'productHero',
    'featuredProducts',
    'categoryGrid',
    'trustBadges',
    'saleCountdown',
    'collectionBanner',
    'recentlyViewed',
    'productReviews',
    'productBundle',
];

const isNonEmptyString = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;
const isNonEmptyArray = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

export const storefrontSectionRegistry: Record<StorefrontSectionKind, StorefrontSectionRegistryItem> = {
    announcementBar: {
        kind: 'announcementBar',
        label: 'Announcement Bar',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['static', 'scrolling', 'rotating'],
        defaultSettings: {
            variant: 'static',
            messages: [],
            visibleIn: 'both',
        },
    },
    productHero: {
        kind: 'productHero',
        label: 'Product Hero',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['featured', 'collection', 'sale', 'new-arrivals'],
        defaultSettings: {
            variant: 'featured',
            layout: 'split',
            visibleIn: 'store',
        },
    },
    featuredProducts: {
        kind: 'featuredProducts',
        label: 'Featured Products',
        moduleRegistryId: 'website-featured-products-block',
        emptyBehavior: 'render',
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['carousel', 'grid', 'showcase'],
        defaultSettings: {
            variant: 'grid',
            sourceType: 'newest',
            productsToShow: 8,
            visibleIn: 'both',
        },
    },
    categoryGrid: {
        kind: 'categoryGrid',
        label: 'Category Grid',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['cards', 'overlay', 'minimal', 'banner'],
        defaultSettings: {
            variant: 'cards',
            categories: [],
            visibleIn: 'both',
        },
    },
    trustBadges: {
        kind: 'trustBadges',
        label: 'Trust Badges',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['horizontal', 'grid', 'minimal', 'detailed'],
        defaultSettings: {
            variant: 'horizontal',
            badges: [],
            visibleIn: 'both',
        },
    },
    saleCountdown: {
        kind: 'saleCountdown',
        label: 'Sale Countdown',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        defaultVisible: true,
        validVariants: ['banner', 'floating', 'inline', 'fullwidth'],
        defaultSettings: {
            variant: 'banner',
            visibleIn: 'both',
        },
        isEmpty: settings => !isNonEmptyString(settings.endDate) && !isNonEmptyString(settings.title),
    },
    collectionBanner: {
        kind: 'collectionBanner',
        label: 'Collection Banner',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'hide',
        defaultVisible: true,
        validVariants: ['hero', 'split', 'minimal', 'overlay'],
        defaultSettings: {
            variant: 'hero',
            visibleIn: 'store',
        },
        isEmpty: settings => !isNonEmptyString(settings.title) && !isNonEmptyString(settings.backgroundImageUrl),
    },
    recentlyViewed: {
        kind: 'recentlyViewed',
        label: 'Recently Viewed',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        defaultVisible: true,
        validVariants: ['carousel', 'grid', 'compact'],
        defaultSettings: {
            variant: 'carousel',
            enabled: true,
            maxProducts: 10,
            visibleIn: 'store',
        },
    },
    productReviews: {
        kind: 'productReviews',
        label: 'Product Reviews',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        defaultVisible: true,
        validVariants: ['list', 'cards', 'masonry', 'featured'],
        defaultSettings: {
            variant: 'cards',
            enabled: true,
            reviews: [],
            visibleIn: 'both',
        },
    },
    productBundle: {
        kind: 'productBundle',
        label: 'Product Bundle',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'hide',
        defaultVisible: true,
        validVariants: ['horizontal', 'vertical', 'compact'],
        defaultSettings: {
            variant: 'horizontal',
            enabled: true,
            productIds: [],
            visibleIn: 'store',
        },
        isEmpty: settings => !isNonEmptyArray(settings.productIds),
    },
};

export function isStorefrontSectionKind(value: unknown): value is StorefrontSectionKind {
    return typeof value === 'string' && STOREFRONT_SECTION_KINDS.includes(value as StorefrontSectionKind);
}

export function getStorefrontSectionRegistryItem(kind: StorefrontSectionKind): StorefrontSectionRegistryItem {
    return storefrontSectionRegistry[kind];
}

export function validateStorefrontSectionSettings(
    kind: StorefrontSectionKind,
    settings: Record<string, unknown> = {},
): StorefrontSectionValidationResult {
    const registryItem = storefrontSectionRegistry[kind];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (registryItem.validVariants && settings.variant && !registryItem.validVariants.includes(String(settings.variant))) {
        errors.push(`Unsupported ${kind} variant: ${String(settings.variant)}`);
    }

    if (settings.visibleIn && !['landing', 'store', 'both'].includes(String(settings.visibleIn))) {
        errors.push(`Unsupported ${kind} visibleIn value: ${String(settings.visibleIn)}`);
    }

    if (kind === 'featuredProducts' && settings.sourceType === 'manual' && !isNonEmptyArray(settings.productIds)) {
        warnings.push('Manual featured products should include productIds.');
    }

    if (kind === 'saleCountdown' && settings.endDate) {
        const timestamp = Date.parse(String(settings.endDate));
        if (Number.isNaN(timestamp)) errors.push('saleCountdown.endDate must be a valid date string.');
    }

    if (kind === 'productBundle' && !isNonEmptyArray(settings.productIds)) {
        warnings.push('Product bundle has no productIds and will be hidden in storefront rendering.');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

function mergeSectionData(
    kind: StorefrontSectionKind,
    pageData: Record<string, unknown>,
    blueprintSection?: StorefrontSectionBlueprint,
): Record<string, unknown> {
    const registryItem = storefrontSectionRegistry[kind];
    const storedData = pageData[kind] && typeof pageData[kind] === 'object' && !Array.isArray(pageData[kind])
        ? pageData[kind] as Record<string, unknown>
        : {};

    return {
        ...registryItem.defaultSettings,
        ...storedData,
        ...(blueprintSection?.settings || {}),
    };
}

function resolveVisibility(
    kind: StorefrontSectionKind,
    sectionVisibility?: StorefrontSectionResolverInput['sectionVisibility'],
): boolean {
    const registryItem = storefrontSectionRegistry[kind];
    return resolveStorefrontSectionVisibility(kind, sectionVisibility, {
        defaultVisible: registryItem.defaultVisible ?? true,
        isCoreSection: registryItem.isCoreSection || CORE_STOREFRONT_SECTION_KEYS.includes(kind),
    });
}

function hasDisabledBlueprintState(blueprintSection?: StorefrontSectionBlueprint): boolean {
    if (!blueprintSection) return false;
    return blueprintSection.enabled === false || blueprintSection.status === 'disabled';
}

function isHiddenBySettings(data: Record<string, unknown>): boolean {
    if (data.enabled === false) return true;
    if (data.visibleIn === 'landing') return true;
    return false;
}

function buildDecision(
    kind: string,
    index: number,
    source: StorefrontSectionRenderDecision['source'],
    pageData: Record<string, unknown>,
    sectionVisibility?: StorefrontSectionResolverInput['sectionVisibility'],
    blueprintSection?: StorefrontSectionBlueprint,
): StorefrontSectionRenderDecision {
    if (!isStorefrontSectionKind(kind)) {
        return {
            id: blueprintSection?.id || `${source}-${kind}-${index}`,
            kind,
            index,
            source,
            status: 'unsupported',
            data: {},
            reasons: [`Unsupported storefront section: ${kind}`],
            warnings: [],
        };
    }

    const registryItem = storefrontSectionRegistry[kind];
    const data = mergeSectionData(kind, pageData, blueprintSection);
    const validation = validateStorefrontSectionSettings(kind, data);
    const empty = registryItem.isEmpty?.(data) || false;

    if (!resolveVisibility(kind, sectionVisibility)) {
        return {
            id: blueprintSection?.id || `${source}-${kind}-${index}`,
            kind,
            index,
            source,
            status: 'hidden',
            data,
            reasons: [`${kind} is hidden by sectionVisibility.`],
            warnings: validation.warnings,
        };
    }

    if (hasDisabledBlueprintState(blueprintSection) || isHiddenBySettings(data)) {
        return {
            id: blueprintSection?.id || `${source}-${kind}-${index}`,
            kind,
            index,
            source,
            status: 'hidden',
            data,
            reasons: [`${kind} is disabled for storefront rendering.`],
            warnings: validation.warnings,
        };
    }

    if (!validation.valid) {
        return {
            id: blueprintSection?.id || `${source}-${kind}-${index}`,
            kind,
            index,
            source,
            status: 'invalid',
            data,
            reasons: validation.errors,
            warnings: validation.warnings,
        };
    }

    if (empty && registryItem.emptyBehavior === 'hide') {
        return {
            id: blueprintSection?.id || `${source}-${kind}-${index}`,
            kind,
            index,
            source,
            status: 'empty',
            data,
            reasons: [`${kind} is empty and configured to hide when empty.`],
            warnings: validation.warnings,
        };
    }

    return {
        id: blueprintSection?.id || `${source}-${kind}-${index}`,
        kind,
        index,
        source,
        status: 'render',
        data,
        reasons: [],
        warnings: validation.warnings,
    };
}

function orderedBlueprintSections(sections?: StorefrontSectionBlueprint[]): StorefrontSectionBlueprint[] {
    return (sections || [])
        .filter(section => section && typeof section.type === 'string')
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function resolveStorefrontSectionDecisions(input: StorefrontSectionResolverInput): StorefrontSectionRenderDecision[] {
    const pageData = (input.pageData || {}) as Record<string, unknown>;
    const blueprintSections = orderedBlueprintSections(input.blueprintSections);
    const supportedBlueprintSections = blueprintSections.filter(section => isStorefrontSectionKind(section.type));

    if (supportedBlueprintSections.length > 0) {
        return supportedBlueprintSections.map((section, index) => (
            buildDecision(section.type, index, 'blueprint', pageData, input.sectionVisibility, section)
        ));
    }

    return (input.componentOrder || [])
        .filter(isStorefrontSectionKind)
        .map((kind, index) => buildDecision(kind, index, 'componentOrder', pageData, input.sectionVisibility));
}

export function getRenderableStorefrontSectionDecisions(input: StorefrontSectionResolverInput): StorefrontSectionRenderDecision[] {
    return resolveStorefrontSectionDecisions(input).filter(decision => decision.status === 'render');
}
