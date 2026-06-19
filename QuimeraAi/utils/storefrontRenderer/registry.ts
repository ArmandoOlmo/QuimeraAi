import type { StorefrontSectionBlueprint } from '../../types/businessBlueprint';
import type {
    StorefrontSectionKind,
    StorefrontSectionRegistryItem,
    StorefrontSectionRenderDecision,
    StorefrontSectionResolverInput,
    StorefrontSectionValidationResult,
} from '../../types/storefrontRenderer';
import type { StorefrontEditorSection } from '../../types/storefrontEditor';
import {
    ANNOUNCEMENT_INSPECTOR_SCHEMA,
    BASIC_CONTENT_INSPECTOR_SCHEMA,
    CATEGORY_TILES_INSPECTOR_SCHEMA,
    FEATURED_COLLECTION_INSPECTOR_SCHEMA,
    FOOTER_INSPECTOR_SCHEMA,
    HEADER_INSPECTOR_SCHEMA,
    HERO_INSPECTOR_SCHEMA,
} from './inspectorSchemas';
import {
    CORE_STOREFRONT_SECTION_KEYS,
    resolveStorefrontSectionVisibility,
} from './visibility';

export const STOREFRONT_SECTION_KINDS: StorefrontSectionKind[] = [
    'announcementBar',
    'header',
    'hero',
    'productHero',
    'categoryTiles',
    'featuredCollection',
    'productGrid',
    'featuredProducts',
    'promoBanner',
    'imageWithText',
    'categoryGrid',
    'trustBadges',
    'testimonials',
    'newsletter',
    'faq',
    'storeFooter',
    'policiesAndLinks',
    'newsletterPopup',
    'cartDrawer',
    'saleCountdown',
    'collectionBanner',
    'recentlyViewed',
    'productReviews',
    'productBundle',
];

export const LEGACY_STOREFRONT_SECTION_KINDS: StorefrontSectionKind[] = [
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
        group: 'header',
        category: 'marketing',
        previewLabel: 'Announcement bar',
        supportsBlocks: true,
        allowedBlocks: ['text', 'button', 'badge'],
        defaultBlocks: [
            { kind: 'text', label: 'Mensaje', settings: { text: 'Envio gratis en ordenes seleccionadas' } },
        ],
        inspectorSchema: ANNOUNCEMENT_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['static', 'scrolling', 'rotating'],
        defaultSettings: {
            variant: 'static',
            messages: [],
            visibleIn: 'both',
        },
    },
    header: {
        kind: 'header',
        label: 'Header',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'header',
        category: 'commerce',
        previewLabel: 'Header',
        supportsBlocks: true,
        allowedBlocks: ['menuLink', 'button', 'socialLink'],
        defaultBlocks: [
            { kind: 'menuLink', label: 'Inicio', settings: { text: 'Inicio', linkUrl: '/' } },
            { kind: 'menuLink', label: 'Productos', settings: { text: 'Productos', linkUrl: '#products' } },
        ],
        inspectorSchema: HEADER_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['left', 'center', 'compact'],
        defaultSettings: {
            variant: 'left',
            layout: 'left',
            logoText: 'Tienda',
            sticky: true,
            showCart: true,
            visibleIn: 'store',
        },
    },
    hero: {
        kind: 'hero',
        label: 'Hero',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'content',
        previewLabel: 'Hero',
        supportsBlocks: true,
        allowedBlocks: ['text', 'button', 'image', 'badge'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Nueva colección' } },
            { kind: 'button', label: 'CTA', settings: { text: 'Comprar ahora', linkUrl: '#products' } },
        ],
        inspectorSchema: HERO_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['featured', 'collection', 'sale', 'new-arrivals', 'split', 'centered', 'full'],
        defaultSettings: {
            variant: 'featured',
            layout: 'split',
            headline: 'Tienda online',
            subheadline: 'Explora productos seleccionados para tu negocio.',
            mediaType: 'image',
            overlayOpacity: 35,
            textPosition: 'left',
            height: 520,
            buttonText: 'Comprar ahora',
            buttonUrl: '#products',
            contentWidth: 680,
            colorScheme: 'scheme1',
            visibleIn: 'store',
        },
    },
    productHero: {
        kind: 'productHero',
        label: 'Product Hero',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'content',
        previewLabel: 'Product hero',
        supportsBlocks: true,
        allowedBlocks: ['text', 'button', 'image', 'badge'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Producto destacado' } },
            { kind: 'button', label: 'CTA', settings: { text: 'Ver producto', linkUrl: '#products' } },
        ],
        inspectorSchema: HERO_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['featured', 'collection', 'sale', 'new-arrivals'],
        defaultSettings: {
            variant: 'featured',
            layout: 'split',
            visibleIn: 'store',
        },
    },
    categoryTiles: {
        kind: 'categoryTiles',
        label: 'Category Tiles',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'commerce',
        previewLabel: 'Category tiles',
        supportsBlocks: true,
        allowedBlocks: ['text', 'collectionCard', 'image'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Compra por categoría' } },
            { kind: 'collectionCard', label: 'Colección' },
        ],
        inspectorSchema: CATEGORY_TILES_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['cards', 'overlay', 'minimal', 'banner', 'carousel'],
        defaultSettings: {
            variant: 'cards',
            title: 'Compra por categoría',
            description: 'Encuentra productos por colección.',
            categories: [],
            columns: 4,
            mobileColumns: 1,
            carouselOnMobile: true,
            horizontalGap: 20,
            verticalGap: 20,
            carouselNavigationIcon: 'arrows',
            width: 'page',
            colorScheme: 'scheme1',
            visibleIn: 'both',
        },
    },
    featuredCollection: {
        kind: 'featuredCollection',
        label: 'Featured Collection',
        moduleRegistryId: 'website-featured-products-block',
        emptyBehavior: 'render',
        group: 'template',
        category: 'commerce',
        previewLabel: 'Featured collection',
        supportsBlocks: true,
        allowedBlocks: ['text', 'productCard', 'button'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Colección destacada' } },
            { kind: 'productCard', label: 'Producto' },
        ],
        inspectorSchema: FEATURED_COLLECTION_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['carousel', 'grid', 'showcase'],
        defaultSettings: {
            variant: 'grid',
            title: 'Colección destacada',
            sourceType: 'newest',
            productsToShow: 8,
            columns: 4,
            mobileColumns: 1,
            showViewAll: true,
            cardStyle: 'modern',
            width: 'page',
            colorScheme: 'scheme1',
            visibleIn: 'both',
        },
    },
    productGrid: {
        kind: 'productGrid',
        label: 'Product Grid',
        moduleRegistryId: 'website-featured-products-block',
        emptyBehavior: 'render',
        group: 'template',
        category: 'commerce',
        previewLabel: 'Product grid',
        supportsBlocks: true,
        allowedBlocks: ['productCard', 'badge'],
        defaultBlocks: [
            { kind: 'productCard', label: 'Producto' },
        ],
        inspectorSchema: FEATURED_COLLECTION_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['grid', 'carousel', 'showcase'],
        defaultSettings: {
            variant: 'grid',
            title: 'Productos',
            sourceType: 'newest',
            productsToShow: 12,
            columns: 4,
            cardStyle: 'modern',
            visibleIn: 'store',
        },
    },
    featuredProducts: {
        kind: 'featuredProducts',
        label: 'Featured Products',
        moduleRegistryId: 'website-featured-products-block',
        emptyBehavior: 'render',
        group: 'template',
        category: 'commerce',
        previewLabel: 'Featured products',
        supportsBlocks: true,
        allowedBlocks: ['text', 'productCard', 'button'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Productos destacados' } },
            { kind: 'productCard', label: 'Producto' },
        ],
        inspectorSchema: FEATURED_COLLECTION_INSPECTOR_SCHEMA,
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
    promoBanner: {
        kind: 'promoBanner',
        label: 'Promo Banner',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'marketing',
        previewLabel: 'Promo banner',
        supportsBlocks: true,
        allowedBlocks: ['text', 'button', 'badge', 'image'],
        defaultBlocks: [
            { kind: 'badge', label: 'Badge', settings: { text: 'Oferta' } },
            { kind: 'text', label: 'Mensaje', settings: { text: 'Promoción especial' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
        defaultVisible: true,
        validVariants: ['banner', 'split', 'minimal'],
        defaultSettings: {
            variant: 'banner',
            title: 'Promoción especial',
            description: 'Destaca una campaña o colección de temporada.',
            buttonText: 'Ver oferta',
            buttonUrl: '#products',
            colorScheme: 'scheme2',
            visibleIn: 'both',
        },
    },
    imageWithText: {
        kind: 'imageWithText',
        label: 'Image With Text',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'content',
        previewLabel: 'Image with text',
        supportsBlocks: true,
        allowedBlocks: ['text', 'image', 'button', 'richText'],
        defaultBlocks: [
            { kind: 'image', label: 'Imagen' },
            { kind: 'text', label: 'Texto', settings: { text: 'Historia de la colección' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
        defaultVisible: true,
        validVariants: ['split', 'stacked', 'editorial'],
        defaultSettings: {
            variant: 'split',
            title: 'Hecho para tu tienda',
            description: 'Combina contenido editorial con productos o colecciones.',
            buttonText: 'Conocer más',
            buttonUrl: '#products',
            colorScheme: 'scheme1',
            visibleIn: 'both',
        },
    },
    categoryGrid: {
        kind: 'categoryGrid',
        label: 'Category Grid',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'commerce',
        previewLabel: 'Category grid',
        supportsBlocks: true,
        allowedBlocks: ['text', 'collectionCard', 'image'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Categorías' } },
            { kind: 'collectionCard', label: 'Colección' },
        ],
        inspectorSchema: CATEGORY_TILES_INSPECTOR_SCHEMA,
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
        group: 'template',
        category: 'trust',
        previewLabel: 'Trust badges',
        supportsBlocks: true,
        allowedBlocks: ['trustItem', 'iconText'],
        defaultBlocks: [
            { kind: 'trustItem', label: 'Compra protegida', settings: { text: 'Compra protegida' } },
            { kind: 'trustItem', label: 'Envío disponible', settings: { text: 'Envio disponible' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['horizontal', 'grid', 'minimal', 'detailed'],
        defaultSettings: {
            variant: 'horizontal',
            badges: [],
            visibleIn: 'both',
        },
    },
    testimonials: {
        kind: 'testimonials',
        label: 'Testimonials',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'trust',
        previewLabel: 'Testimonials',
        supportsBlocks: true,
        allowedBlocks: ['richText', 'text', 'image'],
        defaultBlocks: [
            { kind: 'richText', label: 'Testimonio', settings: { body: 'Excelente experiencia de compra.' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
        defaultVisible: true,
        validVariants: ['cards', 'carousel', 'minimal'],
        defaultSettings: {
            variant: 'cards',
            title: 'Clientes felices',
            description: 'Historias reales de compradores.',
            colorScheme: 'scheme1',
            visibleIn: 'both',
        },
    },
    newsletter: {
        kind: 'newsletter',
        label: 'Newsletter',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'marketing',
        previewLabel: 'Newsletter',
        supportsBlocks: true,
        allowedBlocks: ['text', 'newsletterField', 'button'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Recibe novedades' } },
            { kind: 'newsletterField', label: 'Email' },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
        defaultVisible: true,
        validVariants: ['inline', 'banner', 'card'],
        defaultSettings: {
            variant: 'banner',
            title: 'Recibe novedades',
            description: 'Promociones, lanzamientos y recomendaciones.',
            buttonText: 'Suscribirme',
            colorScheme: 'scheme2',
            visibleIn: 'both',
        },
    },
    faq: {
        kind: 'faq',
        label: 'FAQ',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'content',
        previewLabel: 'FAQ',
        supportsBlocks: true,
        allowedBlocks: ['richText', 'text'],
        defaultBlocks: [
            { kind: 'richText', label: 'Pregunta', settings: { text: '¿Cómo compro?', body: 'Agrega productos al carrito y completa tu orden.' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
        defaultVisible: true,
        validVariants: ['accordion', 'list', 'compact'],
        defaultSettings: {
            variant: 'accordion',
            title: 'Preguntas frecuentes',
            description: 'Respuestas rápidas para compradores.',
            colorScheme: 'scheme1',
            visibleIn: 'both',
        },
    },
    storeFooter: {
        kind: 'storeFooter',
        label: 'Footer',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'footer',
        category: 'footer',
        previewLabel: 'Footer',
        supportsBlocks: true,
        allowedBlocks: ['menuLink', 'socialLink', 'richText', 'newsletterField'],
        defaultBlocks: [
            { kind: 'menuLink', label: 'Políticas', settings: { text: 'Políticas', linkUrl: '/policies' } },
            { kind: 'socialLink', label: 'Instagram' },
        ],
        inspectorSchema: FOOTER_INSPECTOR_SCHEMA,
        defaultVisible: true,
        isCoreSection: true,
        validVariants: ['simple', 'columns', 'newsletter'],
        defaultSettings: {
            variant: 'columns',
            title: 'Tienda',
            description: 'Productos, soporte y enlaces importantes.',
            showSocialLinks: true,
            showNewsletter: false,
            colorScheme: 'scheme3',
            visibleIn: 'store',
        },
    },
    policiesAndLinks: {
        kind: 'policiesAndLinks',
        label: 'Policies and Links',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'footer',
        category: 'footer',
        previewLabel: 'Policies and links',
        supportsBlocks: true,
        allowedBlocks: ['menuLink', 'richText'],
        defaultBlocks: [
            { kind: 'menuLink', label: 'Privacidad', settings: { text: 'Privacidad', linkUrl: '/privacy' } },
            { kind: 'menuLink', label: 'Términos', settings: { text: 'Terminos', linkUrl: '/terms' } },
        ],
        inspectorSchema: FOOTER_INSPECTOR_SCHEMA,
        defaultVisible: true,
        validVariants: ['inline', 'columns'],
        defaultSettings: {
            variant: 'inline',
            title: 'Políticas',
            colorScheme: 'scheme3',
            visibleIn: 'store',
        },
    },
    newsletterPopup: {
        kind: 'newsletterPopup',
        label: 'Newsletter Popup',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'overlay',
        category: 'overlay',
        previewLabel: 'Newsletter popup',
        supportsBlocks: true,
        allowedBlocks: ['text', 'newsletterField', 'button'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'No te pierdas novedades' } },
            { kind: 'newsletterField', label: 'Email' },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
        defaultVisible: false,
        validVariants: ['modal', 'slide-in'],
        defaultSettings: {
            variant: 'modal',
            title: 'No te pierdas novedades',
            description: 'Recibe ofertas y lanzamientos.',
            enabled: false,
            visibleIn: 'store',
        },
    },
    cartDrawer: {
        kind: 'cartDrawer',
        label: 'Cart Drawer',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'overlay',
        category: 'overlay',
        previewLabel: 'Cart drawer',
        supportsBlocks: true,
        allowedBlocks: ['text', 'productCard', 'button'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Tu carrito' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
        defaultVisible: false,
        validVariants: ['drawer', 'modal'],
        defaultSettings: {
            variant: 'drawer',
            title: 'Tu carrito',
            enabled: false,
            visibleIn: 'store',
        },
    },
    saleCountdown: {
        kind: 'saleCountdown',
        label: 'Sale Countdown',
        moduleRegistryId: 'storefront-home-sections',
        emptyBehavior: 'render',
        group: 'template',
        category: 'marketing',
        previewLabel: 'Sale countdown',
        supportsBlocks: true,
        allowedBlocks: ['text', 'button', 'badge'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Oferta por tiempo limitado' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
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
        group: 'template',
        category: 'commerce',
        previewLabel: 'Collection banner',
        supportsBlocks: true,
        allowedBlocks: ['text', 'image', 'button'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Colección' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
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
        group: 'template',
        category: 'commerce',
        previewLabel: 'Recently viewed',
        supportsBlocks: true,
        allowedBlocks: ['productCard', 'text'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Vistos recientemente' } },
        ],
        inspectorSchema: FEATURED_COLLECTION_INSPECTOR_SCHEMA,
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
        group: 'template',
        category: 'trust',
        previewLabel: 'Product reviews',
        supportsBlocks: true,
        allowedBlocks: ['richText', 'text', 'badge'],
        defaultBlocks: [
            { kind: 'richText', label: 'Review', settings: { body: 'Reseña destacada' } },
        ],
        inspectorSchema: BASIC_CONTENT_INSPECTOR_SCHEMA,
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
        group: 'template',
        category: 'commerce',
        previewLabel: 'Product bundle',
        supportsBlocks: true,
        allowedBlocks: ['productCard', 'text', 'button'],
        defaultBlocks: [
            { kind: 'text', label: 'Título', settings: { text: 'Bundle de productos' } },
        ],
        inspectorSchema: FEATURED_COLLECTION_INSPECTOR_SCHEMA,
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

export function isLegacyStorefrontSectionKind(value: unknown): value is StorefrontSectionKind {
    return typeof value === 'string' && LEGACY_STOREFRONT_SECTION_KINDS.includes(value as StorefrontSectionKind);
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

function orderedEditorSections(sections?: StorefrontEditorSection[]): StorefrontEditorSection[] {
    return (sections || [])
        .filter(section => section && isStorefrontSectionKind(section.kind))
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function editorSectionToBlueprint(section: StorefrontEditorSection): StorefrontSectionBlueprint {
    return {
        id: section.id,
        type: section.kind,
        order: section.order,
        enabled: section.enabled,
        status: section.enabled ? 'configured' : 'disabled',
        needsReview: false,
        readiness: { isReady: true, blockers: [], warnings: [] },
        metadata: {
            generatedBy: section.metadata?.generatedBy || 'user',
            userModified: section.metadata?.userModified ?? true,
            lockedFromRegeneration: section.metadata?.lockedFromRegeneration,
            lastEditedAt: section.metadata?.lastEditedAt,
            lastEditedBy: section.metadata?.lastEditedBy,
        },
        settings: {
            ...section.settings,
            blocks: section.blocks,
        },
    };
}

export function resolveStorefrontSectionDecisions(input: StorefrontSectionResolverInput): StorefrontSectionRenderDecision[] {
    const pageData = (input.pageData || {}) as Record<string, unknown>;
    const editorSections = orderedEditorSections(input.editorSections);
    if (editorSections.length > 0) {
        return editorSections.map((section, index) => (
            buildDecision(section.kind, index, 'editor', pageData, input.sectionVisibility, editorSectionToBlueprint(section))
        ));
    }

    const blueprintSections = orderedBlueprintSections(input.blueprintSections);
    const supportedBlueprintSections = blueprintSections.filter(section => isStorefrontSectionKind(section.type));

    if (supportedBlueprintSections.length > 0) {
        return supportedBlueprintSections.map((section, index) => (
            buildDecision(section.type, index, 'blueprint', pageData, input.sectionVisibility, section)
        ));
    }

    return (input.componentOrder || [])
        .filter(isLegacyStorefrontSectionKind)
        .map((kind, index) => buildDecision(kind, index, 'componentOrder', pageData, input.sectionVisibility));
}

export function getRenderableStorefrontSectionDecisions(input: StorefrontSectionResolverInput): StorefrontSectionRenderDecision[] {
    return resolveStorefrontSectionDecisions(input).filter(decision => decision.status === 'render');
}
