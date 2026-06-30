import { DEFAULT_STOREFRONT_THEME } from '../../types/ecommerce.js';
export const STOREFRONT_CATALOG_SIZE_RULES = [
    {
        size: 'empty',
        minProducts: 0,
        maxProducts: 0,
        recommendedCollectionLayout: 'empty',
        recommendedProductCardVariant: 'minimal',
        warnings: ['Catalog has no products; storefront sections should stay draft or hidden.'],
    },
    {
        size: 'single',
        minProducts: 1,
        maxProducts: 1,
        recommendedCollectionLayout: 'single-product',
        recommendedProductCardVariant: 'imageFirst',
        warnings: ['Single-product catalogs should prioritize product detail and trust sections.'],
    },
    {
        size: 'small',
        minProducts: 2,
        maxProducts: 12,
        recommendedCollectionLayout: 'grid',
        recommendedProductCardVariant: 'imageFirst',
        warnings: [],
    },
    {
        size: 'medium',
        minProducts: 13,
        maxProducts: 100,
        recommendedCollectionLayout: 'filtered-grid',
        recommendedProductCardVariant: 'quickBuy',
        warnings: ['Medium catalogs need category navigation and filtering before publishing.'],
    },
    {
        size: 'large',
        minProducts: 101,
        maxProducts: 1000,
        recommendedCollectionLayout: 'search-first',
        recommendedProductCardVariant: 'marketplace',
        warnings: ['Large catalogs require search, filters, pagination, and collection rules.'],
    },
    {
        size: 'enterprise',
        minProducts: 1001,
        recommendedCollectionLayout: 'search-first',
        recommendedProductCardVariant: 'marketplace',
        warnings: ['Enterprise catalogs require indexed search, strong filtering, and merchandising rules.'],
    },
];
const commonSections = ['announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges', 'footer'];
export const STOREFRONT_THEME_PRESETS = {
    minimal: {
        id: 'minimal',
        label: 'Minimal',
        description: 'Quiet storefront for small catalogs and service-led shops.',
        compatibility: {
            compatibleIndustries: ['all'],
            catalogSizes: ['empty', 'single', 'small', 'medium'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['email-marketing', 'chatbot-engine'],
            unsupportedModules: [],
        },
        productCardVariant: 'minimal',
        recommendedSections: commonSections,
        theme: {
            primaryColor: '#111827',
            secondaryColor: '#4b5563',
            accentColor: '#2563eb',
            backgroundColor: '#ffffff',
            cardBackground: '#ffffff',
            borderColor: '#e5e7eb',
            headingColor: '#111827',
            textColor: '#374151',
            mutedTextColor: '#6b7280',
            buttonBackground: '#111827',
            buttonHoverBackground: '#374151',
            priceColor: '#111827',
        },
    },
    luxury: {
        id: 'luxury',
        label: 'Luxury',
        description: 'Premium presentation for high-margin products and curated collections.',
        compatibility: {
            compatibleIndustries: ['luxury', 'jewelry', 'fashion', 'beauty', 'interior-design', 'hospitality'],
            catalogSizes: ['single', 'small', 'medium'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['email-marketing', 'media'],
            unsupportedModules: ['marketplace-vendor-management'],
        },
        productCardVariant: 'luxury',
        recommendedSections: ['announcementBar', 'productHero', 'collectionBanner', 'featuredProducts', 'productReviews', 'footer'],
        theme: {
            primaryColor: '#111111',
            secondaryColor: '#a16207',
            accentColor: '#d6a84f',
            backgroundColor: '#fdfcf9',
            cardBackground: '#ffffff',
            footerBackground: '#111111',
            headingColor: '#171717',
            textColor: '#3f3f46',
            mutedTextColor: '#71717a',
            buttonBackground: '#111111',
            buttonHoverBackground: '#3f3f46',
            badgeBackground: '#d6a84f',
            badgeText: '#111111',
            priceColor: '#111111',
        },
    },
    fitness: {
        id: 'fitness',
        label: 'Fitness',
        description: 'Energetic storefront for gear, programs, classes, and wellness products.',
        compatibility: {
            compatibleIndustries: ['fitness', 'wellness', 'sports', 'gym', 'health'],
            catalogSizes: ['single', 'small', 'medium', 'large'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['appointments-engine', 'email-marketing', 'chatbot-engine'],
            unsupportedModules: [],
        },
        productCardVariant: 'fitness',
        recommendedSections: ['announcementBar', 'productHero', 'featuredProducts', 'productBundle', 'trustBadges', 'productReviews', 'footer'],
        theme: {
            primaryColor: '#16a34a',
            secondaryColor: '#111827',
            accentColor: '#f97316',
            backgroundColor: '#f8fafc',
            cardBackground: '#ffffff',
            headingColor: '#0f172a',
            textColor: '#334155',
            mutedTextColor: '#64748b',
            buttonBackground: '#16a34a',
            buttonHoverBackground: '#15803d',
            badgeBackground: '#f97316',
            badgeText: '#111827',
            priceColor: '#0f172a',
        },
    },
    marketplace: {
        id: 'marketplace',
        label: 'Marketplace',
        description: 'Dense catalog browsing for large product sets with search and filters.',
        compatibility: {
            compatibleIndustries: ['ecommerce', 'retail', 'marketplace', 'electronics', 'hardware', 'auto'],
            catalogSizes: ['medium', 'large', 'enterprise'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['email-marketing', 'analytics', 'chatbot-engine'],
            unsupportedModules: [],
        },
        productCardVariant: 'marketplace',
        recommendedSections: ['announcementBar', 'categoryGrid', 'featuredProducts', 'recentlyViewed', 'trustBadges', 'footer'],
        theme: {
            primaryColor: '#2563eb',
            secondaryColor: '#0f766e',
            accentColor: '#f59e0b',
            backgroundColor: '#f8fafc',
            cardBackground: '#ffffff',
            headerBackground: '#ffffff',
            footerBackground: '#0f172a',
            headingColor: '#0f172a',
            textColor: '#334155',
            mutedTextColor: '#64748b',
            buttonBackground: '#2563eb',
            buttonHoverBackground: '#1d4ed8',
            badgeBackground: '#0f766e',
            priceColor: '#0f172a',
        },
    },
    editorial: {
        id: 'editorial',
        label: 'Editorial',
        description: 'Content-led storefront for storytelling, drops, lookbooks, and curated products.',
        compatibility: {
            compatibleIndustries: ['fashion', 'media', 'publishing', 'lifestyle', 'creative'],
            catalogSizes: ['single', 'small', 'medium'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['cms', 'email-marketing', 'media'],
            unsupportedModules: [],
        },
        productCardVariant: 'editorial',
        recommendedSections: ['announcementBar', 'collectionBanner', 'productHero', 'featuredProducts', 'newsletter', 'footer'],
        theme: {
            primaryColor: '#1f2937',
            secondaryColor: '#be123c',
            accentColor: '#f59e0b',
            backgroundColor: '#fff7ed',
            cardBackground: '#ffffff',
            headingColor: '#111827',
            textColor: '#374151',
            buttonBackground: '#1f2937',
            buttonHoverBackground: '#374151',
            badgeBackground: '#be123c',
            priceColor: '#111827',
        },
    },
    beauty: {
        id: 'beauty',
        label: 'Beauty',
        description: 'Warm polished storefront for beauty, wellness, cosmetics, and spa products.',
        compatibility: {
            compatibleIndustries: ['beauty', 'spa', 'wellness', 'cosmetics', 'skincare'],
            catalogSizes: ['single', 'small', 'medium'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['appointments-engine', 'email-marketing', 'chatbot-engine'],
            unsupportedModules: [],
        },
        productCardVariant: 'imageFirst',
        recommendedSections: ['announcementBar', 'productHero', 'featuredProducts', 'productReviews', 'trustBadges', 'footer'],
        theme: {
            primaryColor: '#be185d',
            secondaryColor: '#7c2d12',
            accentColor: '#f0abfc',
            backgroundColor: '#fff1f2',
            cardBackground: '#ffffff',
            headingColor: '#831843',
            textColor: '#4a044e',
            mutedTextColor: '#7e22ce',
            buttonBackground: '#be185d',
            buttonHoverBackground: '#9d174d',
            badgeBackground: '#f0abfc',
            badgeText: '#4a044e',
            priceColor: '#831843',
        },
    },
    food: {
        id: 'food',
        label: 'Food',
        description: 'Menu and product-forward storefront for restaurants and food brands.',
        compatibility: {
            compatibleIndustries: ['food', 'restaurant', 'cafe', 'bakery', 'catering'],
            catalogSizes: ['single', 'small', 'medium'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['restaurant-engine', 'appointments-engine', 'email-marketing'],
            unsupportedModules: [],
        },
        productCardVariant: 'food',
        recommendedSections: ['announcementBar', 'productHero', 'categoryGrid', 'featuredProducts', 'trustBadges', 'footer'],
        theme: {
            primaryColor: '#dc2626',
            secondaryColor: '#166534',
            accentColor: '#f59e0b',
            backgroundColor: '#fffaf0',
            cardBackground: '#ffffff',
            headingColor: '#431407',
            textColor: '#57534e',
            buttonBackground: '#dc2626',
            buttonHoverBackground: '#b91c1c',
            badgeBackground: '#f59e0b',
            badgeText: '#431407',
            priceColor: '#431407',
        },
    },
    fashion: {
        id: 'fashion',
        label: 'Fashion',
        description: 'Visual merchandising system for apparel, accessories, and seasonal drops.',
        compatibility: {
            compatibleIndustries: ['fashion', 'apparel', 'accessories', 'retail'],
            catalogSizes: ['single', 'small', 'medium', 'large'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['email-marketing', 'media', 'analytics'],
            unsupportedModules: [],
        },
        productCardVariant: 'fashion',
        recommendedSections: ['announcementBar', 'collectionBanner', 'featuredProducts', 'categoryGrid', 'recentlyViewed', 'footer'],
        theme: {
            primaryColor: '#111827',
            secondaryColor: '#db2777',
            accentColor: '#f97316',
            backgroundColor: '#ffffff',
            cardBackground: '#f9fafb',
            headingColor: '#111827',
            textColor: '#374151',
            buttonBackground: '#111827',
            buttonHoverBackground: '#db2777',
            badgeBackground: '#db2777',
            priceColor: '#111827',
        },
    },
    digital: {
        id: 'digital',
        label: 'Digital',
        description: 'High-clarity storefront for software, downloads, courses, and digital products.',
        compatibility: {
            compatibleIndustries: ['digital', 'software', 'saas', 'education', 'course', 'technology'],
            catalogSizes: ['single', 'small', 'medium'],
            requiredModules: ['ecommerce-engine'],
            optionalModules: ['email-marketing', 'chatbot-engine', 'analytics'],
            unsupportedModules: ['physical-shipping-only'],
        },
        productCardVariant: 'digital',
        recommendedSections: ['productHero', 'featuredProducts', 'trustBadges', 'productReviews', 'newsletter', 'footer'],
        theme: {
            primaryColor: '#4f46e5',
            secondaryColor: '#0891b2',
            accentColor: '#22c55e',
            backgroundColor: '#f8fafc',
            cardBackground: '#ffffff',
            headingColor: '#0f172a',
            textColor: '#334155',
            buttonBackground: '#4f46e5',
            buttonHoverBackground: '#4338ca',
            badgeBackground: '#22c55e',
            priceColor: '#0f172a',
        },
    },
    restaurant: {
        id: 'restaurant',
        label: 'Restaurant',
        description: 'Storefront preset for restaurant commerce, reservations, gift cards, and catering.',
        compatibility: {
            compatibleIndustries: ['restaurant', 'cafe', 'food', 'catering'],
            catalogSizes: ['empty', 'single', 'small', 'medium'],
            requiredModules: ['restaurant-engine'],
            optionalModules: ['ecommerce-engine', 'appointments-engine', 'email-marketing'],
            unsupportedModules: [],
        },
        productCardVariant: 'food',
        recommendedSections: ['announcementBar', 'productHero', 'categoryGrid', 'featuredProducts', 'trustBadges', 'footer'],
        theme: {
            primaryColor: '#b91c1c',
            secondaryColor: '#365314',
            accentColor: '#facc15',
            backgroundColor: '#fff7ed',
            cardBackground: '#ffffff',
            headingColor: '#431407',
            textColor: '#57534e',
            buttonBackground: '#b91c1c',
            buttonHoverBackground: '#991b1b',
            badgeBackground: '#facc15',
            badgeText: '#431407',
        },
    },
    realEstate: {
        id: 'realEstate',
        label: 'Real Estate',
        description: 'Presentation preset for listing-led commerce, guides, consultations, and property products.',
        compatibility: {
            compatibleIndustries: ['real-estate', 'property', 'realtor', 'realty'],
            catalogSizes: ['empty', 'single', 'small', 'medium'],
            requiredModules: ['real-estate-engine'],
            optionalModules: ['ecommerce-engine', 'crm-leads', 'email-marketing'],
            unsupportedModules: [],
        },
        productCardVariant: 'editorial',
        recommendedSections: ['productHero', 'featuredProducts', 'trustBadges', 'productReviews', 'footer'],
        theme: {
            primaryColor: '#0f766e',
            secondaryColor: '#1e3a8a',
            accentColor: '#d97706',
            backgroundColor: '#f8fafc',
            cardBackground: '#ffffff',
            headingColor: '#0f172a',
            textColor: '#334155',
            buttonBackground: '#0f766e',
            buttonHoverBackground: '#115e59',
            badgeBackground: '#d97706',
            priceColor: '#0f172a',
        },
    },
    services: {
        id: 'services',
        label: 'Services',
        description: 'Service-led storefront for consultations, packages, deposits, and appointments.',
        compatibility: {
            compatibleIndustries: ['services', 'consulting', 'agency', 'education', 'healthcare', 'legal', 'wellness'],
            catalogSizes: ['empty', 'single', 'small'],
            requiredModules: [],
            optionalModules: ['ecommerce-engine', 'appointments-engine', 'crm-leads', 'email-marketing'],
            unsupportedModules: ['large-marketplace-catalog'],
        },
        productCardVariant: 'compact',
        recommendedSections: ['productHero', 'featuredProducts', 'trustBadges', 'productReviews', 'footer'],
        theme: {
            primaryColor: '#2563eb',
            secondaryColor: '#0f766e',
            accentColor: '#f59e0b',
            backgroundColor: '#ffffff',
            cardBackground: '#f8fafc',
            headingColor: '#111827',
            textColor: '#374151',
            buttonBackground: '#2563eb',
            buttonHoverBackground: '#1d4ed8',
            priceColor: '#111827',
        },
    },
};
const PRESET_PRIORITY = [
    'fitness',
    'food',
    'restaurant',
    'realEstate',
    'fashion',
    'beauty',
    'digital',
    'marketplace',
    'editorial',
    'luxury',
    'services',
    'minimal',
];
function normalizeIndustry(value) {
    const industry = (value || '').toLowerCase();
    if (industry.includes('restaurant') || industry.includes('cafe') || industry.includes('bakery') || industry.includes('food'))
        return 'restaurant';
    if (industry.includes('real') || industry.includes('property') || industry.includes('realt') || industry.includes('inmobili'))
        return 'real-estate';
    if (industry.includes('fitness') || industry.includes('gym') || industry.includes('wellness') || industry.includes('sport'))
        return 'fitness';
    if (industry.includes('fashion') || industry.includes('apparel') || industry.includes('clothing'))
        return 'fashion';
    if (industry.includes('beauty') || industry.includes('spa') || industry.includes('cosmetic'))
        return 'beauty';
    if (industry.includes('digital') || industry.includes('software') || industry.includes('course') || industry.includes('saas'))
        return 'digital';
    if (industry.includes('luxury') || industry.includes('jewelry'))
        return 'luxury';
    if (industry.includes('shop') || industry.includes('store') || industry.includes('ecommerce') || industry.includes('retail') || industry.includes('marketplace'))
        return 'ecommerce';
    return industry || 'services';
}
function isIndustryCompatible(preset, industry) {
    const normalized = normalizeIndustry(industry);
    const industries = preset.compatibility.compatibleIndustries;
    return industries.includes('all') || industries.some(item => normalized.includes(item) || item.includes(normalized));
}
function hasRequiredModules(preset, modules) {
    return preset.compatibility.requiredModules.every(module => modules.includes(module));
}
function hasUnsupportedModules(preset, modules) {
    return preset.compatibility.unsupportedModules.some(module => modules.includes(module));
}
function definedTheme(values) {
    return Object.entries(values).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});
}
function themeFromGlobalColors(colors) {
    if (!colors)
        return {};
    const palette = colors;
    const primary = palette.primary;
    const secondary = palette.secondary;
    const accent = palette.accent;
    const background = palette.background;
    const surface = palette.surface;
    const text = palette.text;
    const heading = palette.heading || text;
    const border = palette.border;
    const success = palette.success;
    const error = palette.error;
    return definedTheme({
        primaryColor: primary,
        secondaryColor: secondary,
        accentColor: accent,
        backgroundColor: background,
        cardBackground: surface,
        headerBackground: surface || background,
        textColor: text,
        headingColor: heading,
        mutedTextColor: palette.textMuted,
        linkColor: primary,
        buttonBackground: primary,
        buttonHoverBackground: secondary || primary,
        badgeBackground: accent || primary,
        priceColor: heading,
        salePriceColor: error,
        borderColor: border,
        dividerColor: border,
        successColor: success,
        errorColor: error,
        checkoutAccent: primary,
    });
}
export function getStorefrontCatalogSize(productCount = 0) {
    const count = Math.max(0, Math.floor(productCount));
    const rule = STOREFRONT_CATALOG_SIZE_RULES.find(item => (count >= item.minProducts && (item.maxProducts === undefined || count <= item.maxProducts)));
    return rule?.size || 'enterprise';
}
export function getStorefrontCatalogSizeRule(size) {
    return STOREFRONT_CATALOG_SIZE_RULES.find(rule => rule.size === size) || STOREFRONT_CATALOG_SIZE_RULES[0];
}
export function getCompatibleStorefrontThemePresets(input = {}) {
    const catalogSize = input.catalogSize || getStorefrontCatalogSize(input.productCount);
    const modules = input.enabledModules || ['ecommerce-engine'];
    return PRESET_PRIORITY
        .map(id => STOREFRONT_THEME_PRESETS[id])
        .filter(preset => preset.compatibility.catalogSizes.includes(catalogSize))
        .filter(preset => isIndustryCompatible(preset, input.industry))
        .filter(preset => hasRequiredModules(preset, modules))
        .filter(preset => !hasUnsupportedModules(preset, modules));
}
export function selectStorefrontThemePreset(input = {}) {
    const catalogSize = input.catalogSize || getStorefrontCatalogSize(input.productCount);
    const modules = input.enabledModules || ['ecommerce-engine'];
    const preferred = input.preferredPresetId ? STOREFRONT_THEME_PRESETS[input.preferredPresetId] : undefined;
    if (preferred) {
        return preferred;
    }
    const compatible = getCompatibleStorefrontThemePresets({ ...input, catalogSize, enabledModules: modules });
    if (compatible.length > 0)
        return compatible[0];
    if (catalogSize === 'large' || catalogSize === 'enterprise')
        return STOREFRONT_THEME_PRESETS.marketplace;
    if (normalizeIndustry(input.industry) === 'restaurant')
        return STOREFRONT_THEME_PRESETS.food;
    if (normalizeIndustry(input.industry) === 'real-estate')
        return STOREFRONT_THEME_PRESETS.realEstate;
    return STOREFRONT_THEME_PRESETS.minimal;
}
export function buildStorefrontThemeFallbackChain(input = {}) {
    const preset = selectStorefrontThemePreset(input);
    return [
        'DEFAULT_STOREFRONT_THEME',
        `preset:${preset.id}`,
        'brandColors',
        'projectGlobalColors',
        'storefrontTheme',
    ];
}
export function resolveStorefrontTheme(input = {}) {
    const catalogSize = input.catalogSize || getStorefrontCatalogSize(input.productCount);
    const preset = selectStorefrontThemePreset({ ...input, catalogSize });
    const fallbackChain = buildStorefrontThemeFallbackChain({ ...input, catalogSize, preferredPresetId: preset.id });
    const theme = {
        ...DEFAULT_STOREFRONT_THEME,
        ...definedTheme(preset.theme),
        ...themeFromGlobalColors(input.brandColors),
        ...themeFromGlobalColors(input.projectGlobalColors),
        ...definedTheme(input.storefrontTheme || {}),
    };
    return {
        preset,
        catalogSize,
        fallbackChain,
        theme,
    };
}
export function resolveStorefrontThemeSettings(input = {}) {
    return resolveStorefrontTheme(input).theme;
}
//# sourceMappingURL=presets.js.map