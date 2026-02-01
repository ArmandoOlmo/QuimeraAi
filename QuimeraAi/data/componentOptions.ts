/**
 * Component Options Reference
 * Documentación completa de todas las opciones válidas para cada componente
 * Usado por el LLM para generar configuraciones válidas
 */

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
            style: ['sticky-solid', 'sticky-transparent', 'floating'],
            layout: ['minimal'],
            hoverStyle: ['simple', 'underline', 'bracket', 'highlight', 'glow'],
            logoType: ['text', 'image', 'both'],
        },
        colorFields: ['background', 'text', 'accent', 'border'],
    },
    
    hero: {
        name: 'Hero Section',
        category: 'hero',
        options: {
            heroVariant: ['classic', 'modern', 'gradient', 'fitness'],
            imageStyle: ['default', 'rounded-full', 'glow', 'float', 'hexagon', 'polaroid'],
            imagePosition: ['left', 'right'],
            secondaryButtonStyle: ['solid', 'outline', 'ghost'],
        },
        colorFields: ['primary', 'secondary', 'background', 'text', 'heading', 'buttonBackground', 'buttonText', 'secondaryButtonBackground', 'secondaryButtonText', 'badgeColor', 'badgeBackgroundColor', 'imageBorderColor', 'sectionBorderColor'],
        badgeIcons: ['sparkles', 'zap', 'star', 'award', 'trophy', 'rocket', 'lightbulb', 'heart', 'check-circle', 'shield', 'target', 'trending-up'],
    },
    
    heroSplit: {
        name: 'Hero Split (Angled)',
        category: 'hero',
        options: {
            imagePosition: ['left', 'right'],
        },
        colorFields: ['textBackground', 'imageBackground', 'heading', 'text', 'buttonBackground', 'buttonText'],
    },
    
    features: {
        name: 'Features Section',
        category: 'content',
        options: {
            featuresVariant: ['classic', 'modern', 'bento-premium', 'image-overlay'],
            gridColumns: [2, 3, 4],
            overlayTextAlignment: ['left', 'center', 'right'],
        },
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'cardHeading', 'cardText'],
    },
    
    testimonials: {
        name: 'Testimonials Section',
        category: 'content',
        options: {
            testimonialsVariant: ['classic', 'minimal-cards', 'glassmorphism', 'gradient-glow', 'neon-border', 'floating-cards', 'gradient-shift'],
        },
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground'],
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
        colorFields: ['background', 'heading', 'arrowBackground', 'arrowText', 'dotActive', 'dotInactive', 'captionBackground', 'captionText'],
    },
    
    pricing: {
        name: 'Pricing Section',
        category: 'cta',
        options: {
            pricingVariant: ['classic', 'gradient', 'glassmorphism', 'minimalist'],
        },
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'buttonBackground', 'buttonText', 'checkmarkColor', 'cardBackground', 'cardHeading', 'cardText', 'priceColor', 'gradientStart', 'gradientEnd'],
    },
    
    faq: {
        name: 'FAQ Section',
        category: 'content',
        options: {
            faqVariant: ['classic', 'cards', 'gradient', 'minimal'],
        },
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'gradientStart', 'gradientEnd'],
    },
    
    leads: {
        name: 'Leads/Contact Section',
        category: 'form',
        options: {
            leadsVariant: ['classic', 'split-gradient', 'floating-glass', 'minimal-border'],
        },
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'buttonBackground', 'buttonText', 'cardBackground', 'inputBackground', 'inputText', 'inputBorder', 'inputPlaceholder', 'gradientStart', 'gradientEnd'],
    },
    
    newsletter: {
        name: 'Newsletter Section',
        category: 'form',
        options: {},
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'buttonBackground', 'buttonText', 'cardBackground', 'cardHeading', 'cardText', 'inputBackground', 'inputText', 'inputBorder', 'inputPlaceholder'],
    },
    
    cta: {
        name: 'CTA Section',
        category: 'cta',
        options: {},
        colorFields: ['background', 'gradientStart', 'gradientEnd', 'text', 'heading', 'description', 'buttonBackground', 'buttonText'],
    },
    
    portfolio: {
        name: 'Portfolio Section',
        category: 'media',
        options: {
            portfolioVariant: ['classic', 'image-overlay'],
            gridColumns: [2, 3, 4],
            overlayTextAlignment: ['left', 'center', 'right'],
        },
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'cardTitleColor', 'cardTextColor', 'cardOverlayStart', 'cardOverlayEnd'],
    },
    
    services: {
        name: 'Services Section',
        category: 'content',
        options: {
            servicesVariant: ['cards', 'grid', 'minimal'],
        },
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'cardHeading', 'cardText'],
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
        colorFields: ['background', 'text', 'heading', 'description', 'accent', 'cardBackground', 'cardHeading', 'cardText', 'photoBorderColor'],
    },
    
    video: {
        name: 'Video Section',
        category: 'media',
        options: {
            source: ['youtube', 'vimeo', 'upload'],
        },
        colorFields: ['background', 'text', 'heading', 'description'],
    },
    
    howItWorks: {
        name: 'How It Works Section',
        category: 'content',
        options: {},
        colorFields: ['background', 'accent', 'text', 'heading', 'description', 'stepTitle', 'iconColor'],
        icons: ['upload', 'process', 'magic-wand', 'download', 'share', 'search'],
    },
    
    map: {
        name: 'Location Map',
        category: 'other',
        options: {
            mapVariant: ['modern', 'minimal', 'dark-tech', 'retro', 'night', 'card-overlay'],
        },
        colorFields: ['background', 'text', 'heading', 'description', 'accent', 'cardBackground'],
    },
    
    menu: {
        name: 'Restaurant Menu',
        category: 'content',
        options: {
            menuVariant: ['classic', 'modern-grid', 'elegant-list', 'full-image'],
            textAlignment: ['left', 'center', 'right'],
        },
        colorFields: ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'priceColor', 'cardTitleColor', 'cardText'],
    },
    
    banner: {
        name: 'Banner Section',
        category: 'hero',
        options: {
            bannerVariant: ['classic', 'gradient-overlay', 'side-text', 'centered'],
            textAlignment: ['left', 'center', 'right'],
        },
        colorFields: ['background', 'overlayColor', 'heading', 'text', 'buttonBackground', 'buttonText'],
    },
    
    footer: {
        name: 'Footer Section',
        category: 'navigation',
        options: {
            logoType: ['text', 'image'],
        },
        colorFields: ['background', 'border', 'text', 'linkHover', 'heading', 'description'],
        socialPlatforms: ['twitter', 'github', 'facebook', 'instagram', 'linkedin'],
    },
    
    chatbot: {
        name: 'AI Chatbot Widget',
        category: 'other',
        options: {
            position: ['bottom-left', 'bottom-right'],
        },
        colorFields: ['primary', 'text', 'background'],
    },
    
    products: {
        name: 'Products Grid (Ecommerce)',
        category: 'ecommerce',
        options: {
            style: ['minimal', 'modern', 'elegant', 'dark'],
            layout: ['grid', 'list'],
            cardStyle: ['minimal', 'modern', 'elegant'],
            columns: [2, 3, 4, 5, 6],
        },
        colorFields: ['background', 'text', 'heading', 'accent', 'cardBackground', 'cardText', 'buttonBackground', 'buttonText'],
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
        },
        colorFields: ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'buttonBackground', 'buttonText', 'badgeBackground', 'badgeText'],
    },
    
    categoryGrid: {
        name: 'Category Grid',
        category: 'ecommerce',
        options: {
            variant: ['cards', 'overlay', 'minimal', 'banner'],
            columns: [2, 3, 4, 5, 6],
            imageAspectRatio: ['auto', '1:1', '4:3', '3:4', '16:9'],
        },
        colorFields: ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'overlayStart', 'overlayEnd'],
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
        colorFields: ['background', 'overlayColor', 'heading', 'text', 'accent', 'buttonBackground', 'buttonText', 'badgeBackground', 'badgeText', 'addToCartBackground', 'addToCartText'],
    },
    
    saleCountdown: {
        name: 'Sale Countdown',
        category: 'ecommerce',
        options: {
            variant: ['banner', 'floating', 'inline', 'fullwidth'],
        },
        colorFields: ['background', 'heading', 'text', 'accent', 'countdownBackground', 'countdownText', 'badgeBackground', 'badgeText', 'buttonBackground', 'buttonText'],
    },
    
    trustBadges: {
        name: 'Trust Badges',
        category: 'ecommerce',
        options: {
            variant: ['horizontal', 'grid', 'minimal', 'detailed'],
            iconSize: ['sm', 'md', 'lg'],
        },
        colorFields: ['background', 'heading', 'text', 'iconColor', 'borderColor'],
        icons: ['truck', 'shield', 'credit-card', 'refresh-cw', 'clock', 'award', 'lock', 'headphones', 'package', 'check-circle', 'star', 'heart'],
    },
    
    recentlyViewed: {
        name: 'Recently Viewed Products',
        category: 'ecommerce',
        options: {
            variant: ['carousel', 'grid', 'compact'],
            cardStyle: ['minimal', 'modern', 'elegant'],
            columns: [2, 3, 4, 5, 6],
        },
        colorFields: ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText'],
    },
    
    productReviews: {
        name: 'Product Reviews',
        category: 'ecommerce',
        options: {
            variant: ['list', 'cards', 'masonry', 'featured'],
            sortBy: ['newest', 'highest', 'lowest', 'helpful'],
        },
        colorFields: ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'starColor', 'verifiedBadgeColor'],
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
        colorFields: ['background', 'overlayColor', 'heading', 'text', 'buttonBackground', 'buttonText'],
    },
    
    productBundle: {
        name: 'Product Bundle',
        category: 'ecommerce',
        options: {
            variant: ['horizontal', 'vertical', 'compact'],
        },
        colorFields: ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'priceColor', 'savingsColor', 'buttonBackground', 'buttonText', 'badgeBackground', 'badgeText'],
    },
    
    announcementBar: {
        name: 'Announcement Bar',
        category: 'ecommerce',
        options: {
            variant: ['static', 'scrolling', 'rotating'],
        },
        colorFields: ['background', 'text', 'linkColor', 'iconColor', 'borderColor'],
        icons: ['megaphone', 'tag', 'gift', 'truck', 'percent', 'sparkles', 'bell', 'info'],
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
    hero: ['hero', 'heroSplit', 'banner'],
    content: ['features', 'testimonials', 'faq', 'services', 'team', 'howItWorks', 'menu'],
    media: ['slideshow', 'portfolio', 'video'],
    cta: ['pricing', 'cta'],
    form: ['leads', 'newsletter'],
    navigation: ['header', 'footer'],
    ecommerce: ['products', 'featuredProducts', 'categoryGrid', 'productHero', 'saleCountdown', 'trustBadges', 'recentlyViewed', 'productReviews', 'collectionBanner', 'productBundle', 'announcementBar'],
    other: ['map', 'chatbot'],
};

