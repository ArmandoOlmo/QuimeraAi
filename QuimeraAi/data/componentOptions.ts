/**
 * Component Options Reference
 * Documentación completa de todas las opciones válidas para cada componente
 * Usado por el LLM para generar configuraciones válidas
 */

import { ACTIVE_FEATURE_VARIANT_VALUES } from './featureVariants';
import { FAQ_VARIANT_VALUES } from './faqVariants';
import { FOOTER_VARIANT_VALUES } from './footerVariants';
import { HEADER_VARIANT_VALUES } from './headerVariants';
import { PRICING_VARIANT_VALUES } from './pricingVariants';
import { getRegistryColorFields } from './componentRegistry';

const colorFieldsFor = (section: Parameters<typeof getRegistryColorFields>[0], fallback: string[] = []) => {
    const fields = getRegistryColorFields(section);
    return fields.length > 0 ? fields : fallback;
};

// ============================================================================
// TIPOS GLOBALES
// ============================================================================
export const GLOBAL_OPTIONS = {
    paddingSize: ['sm', 'md', 'lg'] as const,
    fontSize: ['sm', 'md', 'lg', 'xl'] as const,
    borderRadiusSize: ['none', 'md', 'xl', 'full'] as const,
    borderSize: ['none', 'sm', 'md', 'lg'] as const,
    animationType: ['none', 'fade-in', 'fade-in-up', 'fade-in-down', 'slide-up', 'slide-down', 'scale-in', 'bounce-in'] as const,
    imagePosition: ['left', 'right'] as const,
    justifyContent: ['start', 'center', 'end'] as const,
    aspectRatio: ['auto', '1:1', '4:3', '3:4', '16:9', '9:16'] as const,
    objectFit: ['cover', 'contain', 'fill', 'none', 'scale-down'] as const,
};

// ============================================================================
// OPCIONES POR COMPONENTE
// ============================================================================
export const COMPONENT_OPTIONS = {
    header: {
        name: 'Header / Navigation',
        category: 'navigation',
        options: {
            style: HEADER_VARIANT_VALUES,
            layout: ['minimal', 'center', 'stack', 'classic'],
            hoverStyle: ['simple', 'underline', 'bracket', 'highlight', 'glow'],
            logoType: ['text', 'image', 'both'],
        },
        colorFields: colorFieldsFor('header'),
    },
    
    hero: {
        name: 'Hero Section',
        category: 'hero',
        options: {
            heroVariant: ['classic', 'modern', 'gradient', 'fitness', 'cinematic-gym'],
            imageStyle: ['default', 'rounded-full', 'glow', 'float', 'hexagon', 'polaroid'],
            imagePosition: ['left', 'right'],
            secondaryButtonStyle: ['solid', 'outline', 'ghost'],
        },
        colorFields: colorFieldsFor('hero'),
        badgeIcons: ['sparkles', 'zap', 'star', 'award', 'trophy', 'rocket', 'lightbulb', 'heart', 'check-circle', 'shield', 'target', 'trending-up'],
    },
    
    heroSplit: {
        name: 'Hero Split (Angled)',
        category: 'hero',
        options: {
            imagePosition: ['left', 'right'],
        },
        colorFields: colorFieldsFor('heroSplit'),
    },

    heroGallery: {
        name: 'Hero Gallery',
        category: 'hero',
        options: {
            dotStyle: ['circle', 'line'],
            textHorizontalAlign: ['left', 'center', 'right'],
            textVerticalAlign: ['top', 'middle', 'bottom'],
        },
        colorFields: colorFieldsFor('heroGallery'),
    },

    heroWave: {
        name: 'Hero Wave',
        category: 'hero',
        options: {
            waveShape: ['smooth', 'bubbly', 'sharp', 'layered'],
            textAlign: ['left', 'center', 'right'],
            dotStyle: ['circle', 'line'],
        },
        colorFields: colorFieldsFor('heroWave'),
    },

    heroNova: {
        name: 'Hero Nova',
        category: 'hero',
        options: {
            dotStyle: ['circle', 'line'],
            showDisplayText: [true, false],
        },
        colorFields: colorFieldsFor('heroNova'),
    },

    heroLead: {
        name: 'Hero Lead Form',
        category: 'hero',
        options: {
            formPosition: ['left', 'right'],
            showCompanyField: [true, false],
            showPhoneField: [true, false],
            showMessageField: [true, false],
        },
        colorFields: colorFieldsFor('heroLead'),
    },
    
    features: {
        name: 'Features Section',
        category: 'content',
        options: {
            featuresVariant: ACTIVE_FEATURE_VARIANT_VALUES,
            gridColumns: [2, 3, 4],
            overlayTextAlignment: ['left', 'center', 'right'],
        },
        colorFields: colorFieldsFor('features'),
    },
    
    testimonials: {
        name: 'Testimonials Section',
        category: 'content',
        options: {
            testimonialsVariant: ['classic', 'minimal-cards', 'glassmorphism', 'gradient-glow', 'neon-border', 'floating-cards', 'gradient-shift', 'neon-glow', 'editorial-mosaic'],
        },
        colorFields: colorFieldsFor('testimonials'),
    },
    
    slideshow: {
        name: 'Slideshow Section',
        category: 'media',
        options: {
            slideshowVariant: ['classic', 'kenburns', 'cards3d', 'thumbnails'],
            transitionEffect: ['slide', 'fade', 'zoom'],
            arrowStyle: ['rounded', 'square', 'minimal', 'floating'],
            dotStyle: ['circle', 'line', 'square', 'pill'],
            kenBurnsIntensity: ['low', 'medium', 'high'],
        },
        colorFields: colorFieldsFor('slideshow'),
    },
    
    pricing: {
        name: 'Pricing Section',
        category: 'cta',
        options: {
            pricingVariant: PRICING_VARIANT_VALUES,
        },
        colorFields: colorFieldsFor('pricing'),
    },
    
    faq: {
        name: 'FAQ Section',
        category: 'content',
        options: {
            faqVariant: FAQ_VARIANT_VALUES,
        },
        colorFields: colorFieldsFor('faq'),
    },
    
    leads: {
        name: 'Leads/Contact Section',
        category: 'form',
        options: {
            leadsVariant: ['classic', 'split-gradient', 'floating-glass', 'minimal-border'],
        },
        colorFields: colorFieldsFor('leads'),
    },
    
    newsletter: {
        name: 'Newsletter Section',
        category: 'form',
        options: {},
        colorFields: colorFieldsFor('newsletter'),
    },
    
    cta: {
        name: 'CTA Section',
        category: 'cta',
        options: {},
        colorFields: colorFieldsFor('cta'),
    },
    
    portfolio: {
        name: 'Portfolio Section',
        category: 'media',
        options: {
            portfolioVariant: ['classic', 'image-overlay'],
            gridColumns: [2, 3, 4],
            overlayTextAlignment: ['left', 'center', 'right'],
        },
        colorFields: colorFieldsFor('portfolio'),
    },

    showcase: {
        name: 'Showcase Section',
        category: 'media',
        options: {
            showcaseVariant: ['featured-device', 'curated-row', 'editorial-stack', 'vertical-strips', 'dark-carousel', 'minimal-index', 'case-grid-dark', 'recent-work'],
            gridColumns: [2, 3, 4, 5],
            imageObjectFit: GLOBAL_OPTIONS.objectFit,
        },
        colorFields: colorFieldsFor('showcase'),
    },
    
    services: {
        name: 'Services Section',
        category: 'content',
        options: {
            servicesVariant: ['cards', 'grid', 'minimal'],
        },
        colorFields: colorFieldsFor('services'),
        icons: [
            // Development & Technology
            'code', 'code2', 'terminal', 'cpu', 'database', 'server', 'cloud', 'wifi', 'globe', 'smartphone', 'monitor',
            // Design & Creative
            'brush', 'paintbrush', 'palette', 'pen-tool', 'layout', 'image', 'camera', 'video', 'film', 'scissors',
            // Business & Marketing
            'megaphone', 'trending-up', 'chart', 'bar-chart', 'pie-chart', 'target', 'briefcase', 'dollar-sign', 'credit-card',
            // Communication
            'mail', 'message-circle', 'phone', 'send', 'mic', 'users', 'user-check', 'at-sign',
            // Social & Media
            'share-2', 'heart', 'star', 'bookmark', 'thumbs-up', 'eye', 'hash', 'instagram', 'twitter', 'facebook',
            // Tools & Services
            'wrench', 'settings', 'tool', 'package', 'box', 'shopping-cart', 'shopping-bag', 'gift', 'truck',
            // Document & Files
            'file', 'file-text', 'folder', 'book', 'clipboard', 'edit', 'feather', 'pen',
            // Location & Map
            'map-pin', 'map', 'navigation', 'compass', 'home', 'building', 'store',
            // Time & Calendar
            'clock', 'calendar', 'timer', 'watch', 'hourglass',
            // Security & Protection
            'shield', 'lock', 'key', 'eye-off', 'check-circle', 'alert-circle',
            // Food & Hospitality
            'utensils', 'coffee', 'wine', 'beer', 'utensils-crossed', 'chef-hat', 'cake-slice', 'pizza', 'soup', 'salad',
            // Other
            'zap', 'award', 'trophy', 'rocket', 'lightbulb', 'sparkles', 'circle-dot', 'hexagon', 'layers'
        ],
    },
    
    team: {
        name: 'Team Section',
        category: 'content',
        options: {
            teamVariant: ['classic', 'cards', 'minimal', 'overlay'],
        },
        colorFields: colorFieldsFor('team'),
    },
    
    video: {
        name: 'Video Section',
        category: 'media',
        options: {
            source: ['youtube', 'vimeo', 'upload'],
        },
        colorFields: colorFieldsFor('video'),
    },
    
    howItWorks: {
        name: 'How It Works Section',
        category: 'content',
        options: {},
        colorFields: colorFieldsFor('howItWorks'),
        icons: ['upload', 'process', 'magic-wand', 'download', 'share', 'search'],
    },
    
    map: {
        name: 'Location Map',
        category: 'other',
        options: {
            mapVariant: ['modern', 'minimal', 'dark-tech', 'retro', 'night', 'card-overlay'],
        },
        colorFields: colorFieldsFor('map'),
    },
    
    menu: {
        name: 'Restaurant Menu',
        category: 'content',
        options: {
            menuVariant: ['classic', 'modern-grid', 'elegant-list', 'full-image', 'text-only', 'editorial-mosaic'],
            textAlignment: ['left', 'center', 'right'],
        },
        colorFields: colorFieldsFor('menu'),
    },
    
    banner: {
        name: 'Banner Section',
        category: 'hero',
        options: {
            bannerVariant: ['classic', 'gradient-overlay', 'side-text', 'centered'],
            textAlignment: ['left', 'center', 'right'],
        },
        colorFields: colorFieldsFor('banner'),
    },
    
    footer: {
        name: 'Footer Section',
        category: 'navigation',
        options: {
            footerVariant: FOOTER_VARIANT_VALUES,
            logoType: ['text', 'image'],
        },
        colorFields: colorFieldsFor('footer'),
        socialPlatforms: ['twitter', 'x', 'github', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'pinterest', 'whatsapp', 'telegram', 'snapchat', 'discord', 'threads'],
    },

    topBar: {
        name: 'Top Bar',
        category: 'navigation',
        options: {
            useGradient: [true, false],
            scrollEnabled: [true, false],
            dismissible: [true, false],
            fontSize: ['sm', 'md', 'lg'],
            separator: ['dot', 'pipe', 'star', 'none'],
        },
        colorFields: colorFieldsFor('topBar'),
    },

    logoBanner: {
        name: 'Logo Banner',
        category: 'media',
        options: {
            useGradient: [true, false],
            scrollEnabled: [true, false],
            grayscale: [true, false],
            showDivider: [true, false],
        },
        colorFields: colorFieldsFor('logoBanner'),
    },
    
    chatbot: {
        name: 'AI Chatbot Widget',
        category: 'other',
        options: {
            position: ['bottom-left', 'bottom-right'],
        },
        colorFields: colorFieldsFor('chatbot'),
    },
    
    products: {
        name: 'Products Grid (Ecommerce)',
        category: 'ecommerce',
        options: {
            style: ['minimal', 'modern', 'elegant', 'dark'],
            cardStyle: ['minimal', 'modern', 'elegant', 'overlay'],
            columns: [2, 3, 4, 5, 6],
        },
        colorFields: colorFieldsFor('products'),
    },

    realEstateListings: {
        name: 'Quimera Realty Listings',
        category: 'industry',
        options: {
            layout: ['grid', 'featured'],
            maxItems: [3, 6, 9, 12],
            featuredOnly: [true, false],
            animationType: ['none', 'fade-in', 'fade-in-up', 'fade-in-down', 'slide-up', 'slide-down', 'scale-in', 'bounce-in'],
        },
        colorFields: colorFieldsFor('realEstateListings'),
    },

    restaurantReservation: {
        name: 'Restaurant Reservation',
        category: 'content',
        options: {
            showPhone: [true, false],
            showNotes: [true, false],
            showTablePreference: [true, false],
        },
        colorFields: colorFieldsFor('restaurantReservation'),
    },

    cmsFeed: {
        name: 'CMS Feed',
        category: 'content',
        options: {
            layout: ['grid', 'list', 'featured'],
            showAuthor: [true, false],
            showDate: [true, false],
            showExcerpt: [true, false],
            showFeaturedImage: [true, false],
            showReadMore: [true, false],
        },
        colorFields: colorFieldsFor('cmsFeed'),
    },

    signupFloat: {
        name: 'Sign Up Float',
        category: 'form',
        options: {
            floatPosition: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
            imagePlacement: ['top', 'bottom', 'left', 'right'],
            showOnLoad: [true, false],
            showSocialLinks: [true, false],
        },
        colorFields: colorFieldsFor('signupFloat'),
    },
    
    // ==========================================================================
    // ECOMMERCE COMPONENTS
    // ==========================================================================
    featuredProducts: {
        name: 'Featured Products',
        category: 'ecommerce',
        options: {
            variant: ['carousel', 'grid', 'showcase'],
            sourceType: ['manual', 'category', 'bestsellers', 'newest', 'on-sale'],
            cardStyle: ['minimal', 'modern', 'elegant', 'overlay'],
            columns: [2, 3, 4, 5],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
            cardAspectRatio: ['1:1', '4:3', '3:4', '4:5', '16:9'],
            imageObjectFit: ['cover', 'contain', 'fill', 'scale-down'],
            cardGap: ['sm', 'md', 'lg', 'xl'],
        },
        colorFields: colorFieldsFor('featuredProducts'),
    },
    
    categoryGrid: {
        name: 'Category Grid',
        category: 'ecommerce',
        options: {
            variant: ['cards', 'overlay', 'minimal', 'banner', 'editorial', 'bento-overlay'],
            columns: [2, 3, 4, 5, 6],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
            imageAspectRatio: ['auto', '1:1', '4:3', '3:4', '4:5', '16:9'],
            imageObjectFit: ['cover', 'contain', 'fill', 'scale-down'],
            cardGap: ['sm', 'md', 'lg', 'xl'],
        },
        colorFields: colorFieldsFor('categoryGrid'),
    },
    
    productHero: {
        name: 'Product Hero Banner',
        category: 'ecommerce',
        options: {
            variant: ['featured', 'collection', 'sale', 'new-arrivals'],
            layout: ['split', 'split-right', 'full', 'centered'],
            imageSize: ['small', 'medium', 'large'],
            overlayStyle: ['gradient', 'solid', 'none'],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
            showPrice: [true, false],
            showDescription: [true, false],
            showFeatures: [true, false],
            showAddToCartButton: [true, false],
        },
        colorFields: colorFieldsFor('productHero'),
    },
    
    saleCountdown: {
        name: 'Sale Countdown',
        category: 'ecommerce',
        options: {
            variant: ['banner', 'floating', 'inline', 'fullwidth'],
            cardStyle: ['minimal', 'modern', 'elegant', 'overlay'],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
            cardAspectRatio: ['1:1', '4:3', '3:4', '4:5', '16:9'],
            imageObjectFit: ['cover', 'contain', 'fill', 'scale-down'],
            cardGap: ['sm', 'md', 'lg', 'xl'],
        },
        colorFields: colorFieldsFor('saleCountdown'),
    },
    
    trustBadges: {
        name: 'Trust Badges',
        category: 'ecommerce',
        options: {
            variant: ['horizontal', 'grid', 'minimal', 'detailed', 'premium-strip', 'icon-cloud'],
            layout: ['horizontal', 'grid', 'vertical'],
            iconSize: ['sm', 'md', 'lg'],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
            cardGap: ['sm', 'md', 'lg', 'xl'],
        },
        colorFields: colorFieldsFor('trustBadges'),
        icons: ['truck', 'shield', 'credit-card', 'refresh-cw', 'clock', 'award', 'lock', 'headphones', 'package', 'check-circle', 'star', 'heart'],
    },
    
    recentlyViewed: {
        name: 'Recently Viewed Products',
        category: 'ecommerce',
        options: {
            variant: ['carousel', 'grid', 'compact'],
            cardStyle: ['minimal', 'modern', 'elegant', 'overlay'],
            columns: [2, 3, 4, 5, 6],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
            cardAspectRatio: ['1:1', '4:3', '3:4', '4:5', '16:9'],
            imageObjectFit: ['cover', 'contain', 'fill', 'scale-down'],
            cardGap: ['sm', 'md', 'lg', 'xl'],
        },
        colorFields: colorFieldsFor('recentlyViewed'),
    },
    
    productReviews: {
        name: 'Product Reviews',
        category: 'ecommerce',
        options: {
            variant: ['list', 'cards', 'masonry', 'featured', 'spotlight'],
            sortBy: ['newest', 'highest', 'lowest', 'helpful'],
            columns: [2, 3, 4, 5, 6],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
            cardGap: ['sm', 'md', 'lg', 'xl'],
        },
        colorFields: colorFieldsFor('productReviews'),
    },
    
    collectionBanner: {
        name: 'Collection Banner',
        category: 'ecommerce',
        options: {
            variant: ['hero', 'split', 'minimal', 'overlay'],
            overlayStyle: ['gradient', 'solid', 'none'],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
        },
        colorFields: colorFieldsFor('collectionBanner'),
    },
    
    productBundle: {
        name: 'Product Bundle',
        category: 'ecommerce',
        options: {
            variant: ['horizontal', 'vertical', 'compact', 'editorial', 'price-stack'],
            textAlignment: ['left', 'center', 'right'],
            contentPosition: ['left', 'center', 'right'],
            cardGap: ['sm', 'md', 'lg', 'xl'],
        },
        colorFields: colorFieldsFor('productBundle'),
    },
    
    announcementBar: {
        name: 'Announcement Bar',
        category: 'ecommerce',
        options: {
            variant: ['static', 'scrolling', 'rotating'],
        },
        colorFields: colorFieldsFor('announcementBar'),
        icons: ['megaphone', 'tag', 'gift', 'truck', 'percent', 'sparkles', 'bell', 'info'],
    },

    storeSettings: {
        name: 'Store Settings',
        category: 'ecommerce',
        options: {
            variant: ['grid', 'list'],
            cardStyle: ['minimal', 'modern', 'elegant', 'overlay'],
            defaultViewMode: ['grid', 'list'],
        },
        colorFields: colorFieldsFor('storeSettings'),
    },
};

// ============================================================================
// FONT FAMILIES DISPONIBLES
// ============================================================================
export const FONT_FAMILIES = {
    modern: ['inter', 'plus-jakarta-sans', 'outfit', 'poppins', 'montserrat'],
    elegant: ['playfair-display', 'merriweather', 'lora', 'crimson-text', 'cormorant-garamond'],
    bold: ['oswald', 'anton', 'bebas-neue', 'archivo-black'],
    neutral: ['lato', 'open-sans', 'roboto', 'source-sans-pro', 'noto-sans'],
    futuristic: ['space-grotesk', 'syne', 'orbitron', 'rajdhani'],
    friendly: ['quicksand', 'nunito', 'comfortaa', 'varela-round'],
};

// ============================================================================
// FUNCIÓN PARA GENERAR DOCUMENTACIÓN PARA EL LLM
// ============================================================================
export function generateComponentDocumentation(): string {
    let doc = `## COMPONENT OPTIONS REFERENCE\n\n`;
    
    doc += `### GLOBAL OPTIONS:\n`;
    doc += `- paddingSize: ${GLOBAL_OPTIONS.paddingSize.join(', ')}\n`;
    doc += `- fontSize: ${GLOBAL_OPTIONS.fontSize.join(', ')}\n`;
    doc += `- borderRadiusSize: ${GLOBAL_OPTIONS.borderRadiusSize.join(', ')}\n`;
    doc += `- animationType: ${GLOBAL_OPTIONS.animationType.join(', ')}\n`;
    doc += `- imagePosition: ${GLOBAL_OPTIONS.imagePosition.join(', ')}\n\n`;
    
    doc += `### FONT FAMILIES BY STYLE:\n`;
    Object.entries(FONT_FAMILIES).forEach(([style, fonts]) => {
        doc += `- ${style}: ${fonts.join(', ')}\n`;
    });
    doc += `\n`;
    
    doc += `### AVAILABLE COMPONENTS AND OPTIONS:\n\n`;
    
    Object.entries(COMPONENT_OPTIONS).forEach(([key, comp]) => {
        doc += `**${key}** (${comp.name}) [${comp.category}]\n`;
        
        if (Object.keys(comp.options).length > 0) {
            doc += `  Variants/Options:\n`;
            Object.entries(comp.options).forEach(([optName, values]) => {
                if (Array.isArray(values)) {
                    doc += `    - ${optName}: ${values.join(' | ')}\n`;
                }
            });
        }
        
        if (comp.colorFields.length > 0) {
            doc += `  Color fields: ${comp.colorFields.join(', ')}\n`;
        }
        
        if ('icons' in comp && comp.icons) {
            doc += `  Available icons: ${(comp.icons as string[]).slice(0, 15).join(', ')}...\n`;
        }
        
        if ('badgeIcons' in comp && comp.badgeIcons) {
            doc += `  Badge icons: ${comp.badgeIcons.join(', ')}\n`;
        }
        
        if ('socialPlatforms' in comp && comp.socialPlatforms) {
            doc += `  Social platforms: ${comp.socialPlatforms.join(', ')}\n`;
        }
        
        doc += `\n`;
    });
    
    return doc;
}

// Lista simple de componentes para el LLM
export const COMPONENT_LIST = Object.keys(COMPONENT_OPTIONS);

// Categorías de componentes
export const COMPONENT_CATEGORIES = {
    hero: ['hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead', 'banner'],
    content: ['features', 'testimonials', 'faq', 'services', 'team', 'howItWorks', 'menu', 'restaurantReservation', 'cmsFeed'],
    media: ['slideshow', 'portfolio', 'showcase', 'video'],
    cta: ['pricing', 'cta'],
    form: ['leads', 'newsletter', 'signupFloat'],
    navigation: ['header', 'footer', 'topBar'],
    ecommerce: ['products', 'storeSettings', 'featuredProducts', 'categoryGrid', 'productHero', 'saleCountdown', 'trustBadges', 'recentlyViewed', 'productReviews', 'collectionBanner', 'productBundle', 'announcementBar'],
    other: ['map', 'chatbot'],
};
