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
const DEFAULT_COLLECTION_BANNER_TITLE = 'Colección destacada';

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
            showIcon: true,
            icon: 'megaphone',
            dismissible: false,
            speed: 4000,
            pauseOnHover: true,
            paddingY: 'md',
            paddingX: 'md',
            fontSize: 'sm',
            colors: {
                background: '#111827',
                text: '#ffffff',
                linkColor: '#fbbf24',
                iconColor: '#fbbf24',
                borderColor: 'rgba(255,255,255,0.12)',
            },
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
            headline: 'Producto destacado',
            subheadline: 'Presenta tu producto principal con una experiencia visual lista para comprar.',
            buttonText: 'Ver producto',
            backgroundImageUrl: '',
            overlayStyle: 'gradient',
            overlayOpacity: 55,
            height: 520,
            textAlignment: 'left',
            contentPosition: 'left',
            imageSize: 'medium',
            showBadge: true,
            badgeText: 'Destacado',
            showPrice: true,
            showDescription: true,
            showFeatures: true,
            showAddToCartButton: true,
            addToCartButtonText: 'Agregar al carrito',
            paddingY: 'lg',
            paddingX: 'lg',
            headlineFontSize: 'xl',
            subheadlineFontSize: 'md',
            buttonBorderRadius: 'xl',
            colors: {
                background: '#f8fafc',
                overlayColor: '#111827',
                heading: '#0f172a',
                text: '#475569',
                accent: '#2563eb',
                buttonBackground: '#111827',
                buttonText: '#ffffff',
                badgeBackground: '#ef4444',
                badgeText: '#ffffff',
                addToCartBackground: '#16a34a',
                addToCartText: '#ffffff',
            },
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
            title: 'Productos destacados',
            description: 'Explora productos seleccionados para esta tienda.',
            columns: 4,
            autoScroll: false,
            scrollSpeed: 5000,
            showArrows: true,
            showDots: true,
            showBadge: true,
            showPrice: true,
            showRating: true,
            showAddToCart: true,
            showViewAll: true,
            viewAllUrl: '/tienda',
            cardStyle: 'overlay',
            paddingY: 'lg',
            paddingX: 'md',
            cardGap: 'md',
            titleFontSize: 'lg',
            descriptionFontSize: 'md',
            borderRadius: 'xl',
            colors: {
                background: '#ffffff',
                heading: '#0f172a',
                text: '#475569',
                accent: '#4f46e5',
                cardBackground: '#ffffff',
                cardText: '#0f172a',
                buttonBackground: '#111827',
                buttonText: '#ffffff',
                badgeBackground: '#ef4444',
                badgeText: '#ffffff',
                priceColor: '#111827',
                salePriceColor: '#dc2626',
                borderColor: '#e2e8f0',
                overlayStart: 'transparent',
                overlayEnd: 'rgba(0,0,0,0.76)',
            },
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
            variant: 'overlay',
            categories: [],
            visibleIn: 'both',
            title: 'Compra por categoría',
            description: 'Organiza la tienda con colecciones visuales.',
            sourceType: 'store',
            columns: 4,
            showTitle: true,
            layout: 'grid',
            showProductCount: true,
            imageAspectRatio: '1:1',
            imageObjectFit: 'cover',
            paddingY: 'lg',
            paddingX: 'md',
            titleFontSize: 'lg',
            descriptionFontSize: 'md',
            borderRadius: 'xl',
            colors: {
                background: '#f8fafc',
                heading: '#0f172a',
                text: '#475569',
                accent: '#4f46e5',
                cardBackground: '#e2e8f0',
                cardText: '#0f172a',
                overlayStart: 'transparent',
                overlayEnd: 'rgba(0,0,0,0.78)',
                borderColor: '#e2e8f0',
            },
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
            title: '',
            showLabels: true,
            layout: 'horizontal',
            columns: 4,
            iconSize: 'md',
            paddingY: 'md',
            paddingX: 'md',
            titleFontSize: 'md',
            borderRadius: 'xl',
            colors: {
                background: '#ffffff',
                heading: '#0f172a',
                text: '#475569',
                iconColor: '#4f46e5',
                accent: '#4f46e5',
                borderColor: '#e2e8f0',
            },
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
            title: 'Oferta por tiempo limitado',
            description: 'Activa una campaña visual con cuenta regresiva.',
            endDate: '',
            showDays: true,
            showHours: true,
            showMinutes: true,
            showSeconds: true,
            showProducts: true,
            productsToShow: 4,
            badgeText: 'Oferta',
            discountText: '',
            height: 360,
            paddingY: 'lg',
            paddingX: 'md',
            titleFontSize: 'lg',
            descriptionFontSize: 'md',
            borderRadius: 'xl',
            cardStyle: 'overlay',
            colors: {
                background: '#111827',
                heading: '#ffffff',
                text: '#cbd5e1',
                accent: '#fbbf24',
                countdownBackground: 'rgba(255,255,255,0.12)',
                countdownText: '#ffffff',
                badgeBackground: '#ef4444',
                badgeText: '#ffffff',
                buttonBackground: '#fbbf24',
                buttonText: '#111827',
                cardBackground: '#1f2937',
                cardText: '#ffffff',
            },
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
            title: DEFAULT_COLLECTION_BANNER_TITLE,
            description: 'Presenta una colección o categoría con imagen completa.',
            backgroundImageUrl: '',
            buttonText: 'Explorar colección',
            showButton: true,
            overlayStyle: 'gradient',
            overlayOpacity: 55,
            height: 460,
            textAlignment: 'center',
            contentPosition: 'center',
            paddingY: 'lg',
            paddingX: 'lg',
            headlineFontSize: 'xl',
            descriptionFontSize: 'md',
            buttonBorderRadius: 'xl',
            colors: {
                background: '#111827',
                overlayColor: '#000000',
                heading: '#ffffff',
                text: '#e5e7eb',
                accent: '#fbbf24',
                buttonBackground: '#ffffff',
                buttonText: '#111827',
            },
        },
        isEmpty: settings => (
            (!isNonEmptyString(settings.title) || settings.title === DEFAULT_COLLECTION_BANNER_TITLE) &&
            !isNonEmptyString(settings.backgroundImageUrl)
        ),
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
            title: 'Vistos recientemente',
            description: '',
            columns: 5,
            autoScroll: false,
            scrollSpeed: 5000,
            showArrows: true,
            showPrice: true,
            showRating: true,
            cardStyle: 'overlay',
            paddingY: 'md',
            paddingX: 'md',
            titleFontSize: 'md',
            borderRadius: 'xl',
            colors: {
                background: '#ffffff',
                heading: '#0f172a',
                text: '#475569',
                accent: '#4f46e5',
                cardBackground: '#ffffff',
                cardText: '#0f172a',
                starColor: '#f59e0b',
                borderColor: '#e2e8f0',
                buttonText: '#ffffff',
            },
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
            title: 'Reseñas de clientes',
            description: 'Prueba social para aumentar confianza.',
            showRatingDistribution: true,
            showPhotos: true,
            showVerifiedBadge: true,
            showProductInfo: false,
            sortBy: 'newest',
            maxReviews: 6,
            paddingY: 'lg',
            paddingX: 'md',
            titleFontSize: 'lg',
            descriptionFontSize: 'md',
            borderRadius: 'xl',
            colors: {
                background: '#f8fafc',
                heading: '#0f172a',
                text: '#475569',
                accent: '#4f46e5',
                cardBackground: '#ffffff',
                cardText: '#0f172a',
                starColor: '#f59e0b',
                verifiedBadgeColor: '#16a34a',
                borderColor: '#e2e8f0',
                buttonText: '#ffffff',
            },
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
            title: 'Bundle de productos',
            description: 'Combina productos y muestra ahorro sugerido.',
            discountPercent: 15,
            bundlePrice: 0,
            originalPrice: 0,
            showSavings: true,
            savingsText: 'Ahorra',
            showIndividualPrices: true,
            buttonText: 'Comprar bundle',
            showBadge: true,
            badgeText: 'Bundle',
            paddingY: 'lg',
            paddingX: 'md',
            titleFontSize: 'lg',
            descriptionFontSize: 'md',
            borderRadius: 'xl',
            colors: {
                background: '#ffffff',
                heading: '#0f172a',
                text: '#475569',
                accent: '#4f46e5',
                cardBackground: '#f8fafc',
                cardText: '#0f172a',
                priceColor: '#111827',
                savingsColor: '#16a34a',
                buttonBackground: '#111827',
                buttonText: '#ffffff',
                badgeBackground: '#4f46e5',
                badgeText: '#ffffff',
                borderColor: '#e2e8f0',
            },
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
