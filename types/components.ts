/**
 * Component Types
 * Tipos para todos los componentes de la página
 */

import { PaddingSize, FontSize, ImageStyle, BorderRadiusSize, BorderSize, JustifyContent, ImagePosition, AspectRatio, ObjectFit, AnimationType } from './ui';

// =============================================================================
// CORNER GRADIENT (Diagonal gradient overlay)
// =============================================================================
export type CornerGradientPosition = 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface CornerGradientConfig {
    enabled: boolean;
    position: CornerGradientPosition;
    color: string;
    opacity: number; // 0-100
    size: number; // percentage of section width/height (0-100)
}

// =============================================================================
// HEADER
// =============================================================================
export type NavbarLayout = 'classic' | 'minimal' | 'center' | 'stack';
export type NavLinkHoverStyle = 'simple' | 'underline' | 'bracket' | 'highlight' | 'glow';

// Estilos de navegación con las 9 nuevas variantes
export type NavbarStyle = 
  // Originales
  | 'sticky-solid' 
  | 'sticky-transparent' 
  | 'floating'
  // NUEVOS: Edge-to-edge (lisos de lado a lado, sin curvas)
  | 'edge-solid'           // Sólido completo de borde a borde
  | 'edge-minimal'         // Minimalista de borde a borde  
  | 'edge-bordered'        // Con línea inferior de borde a borde
  // NUEVOS: Flotantes
  | 'floating-pill'        // Flotante con bordes redondeados tipo píldora
  | 'floating-glass'       // Flotante con efecto cristal/blur
  | 'floating-shadow'      // Flotante con sombra pronunciada
  // NUEVOS: Transparentes
  | 'transparent-blur'     // Transparente con blur backdrop
  | 'transparent-bordered' // Transparente con borde sutil
  | 'transparent-gradient'; // Transparente con gradiente inferior

export interface NavLink {
    text: string;
    href: string;
}

export interface HeaderData {
    style: NavbarStyle;
    layout: NavbarLayout;
    isSticky: boolean;
    glassEffect: boolean;
    height: number;
    logoType: 'text' | 'image' | 'both';
    logoText: string;
    logoImageUrl: string;
    logoWidth: number;
    links: NavLink[];
    hoverStyle: NavLinkHoverStyle;
    ctaText: string;
    showCta: boolean;
    menuId?: string;
    showLogin: boolean;
    loginText: string;
    loginUrl?: string;
    colors: { background: string; text: string; accent: string; border?: string };
    buttonBorderRadius: BorderRadiusSize;
    isPreviewMode?: boolean;
    linkFontSize?: number;
}

// =============================================================================
// HERO
// =============================================================================
export type HeroVariant = 'classic' | 'modern' | 'gradient' | 'fitness';

export interface HeroData {
    heroVariant?: HeroVariant;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    imageUrl: string;
    backgroundImage?: string;
    imageStyle: ImageStyle;
    imageDropShadow: boolean;
    imageBorderRadius: BorderRadiusSize;
    imageBorderSize: BorderSize;
    imageBorderColor: string;
    imageJustification: JustifyContent;
    imagePosition: ImagePosition;
    imageWidth: number;
    imageHeight: number;
    imageHeightEnabled: boolean;
    imageAspectRatio: AspectRatio;
    imageObjectFit: ObjectFit;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    sectionBorderSize: BorderSize;
    sectionBorderColor: string;
    colors: { 
        primary: string; 
        secondary: string; 
        background: string; 
        text: string; 
        heading: string; 
        buttonBackground?: string; 
        buttonText?: string; 
        secondaryButtonBackground?: string; 
        secondaryButtonText?: string; 
    };
    // Secondary button style options
    secondaryButtonStyle?: 'solid' | 'outline' | 'ghost';
    secondaryButtonOpacity?: number; // 0-100
    headlineFontSize?: FontSize;
    subheadlineFontSize?: FontSize;
    showBadge?: boolean;
    badgeText?: string;
    badgeIcon?: ServiceIcon | string;
    badgeColor?: string;
    badgeBackgroundColor?: string;
    buttonBorderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    // Gradient overlay opacity for Modern variant (0-100)
    gradientOpacity?: number;
}

// =============================================================================
// HERO SPLIT (Angled Image/Text Split)
// =============================================================================
export type ImageSide = 'left' | 'right';

export interface HeroSplitData {
    headline: string;
    subheadline: string;
    buttonText: string;
    buttonUrl?: string;
    imageUrl: string;
    imagePosition: ImageSide; // Which side the image is on
    maxHeight: number; // Max height in pixels (default 500)
    angleIntensity: number; // 0-30, controls the diagonal cut angle
    colors: {
        textBackground: string; // Background color for text side
        imageBackground: string; // Background color for image side (visible if image doesn't cover)
        heading: string;
        text: string;
        buttonBackground: string;
        buttonText: string;
    };
    headlineFontSize?: FontSize;
    subheadlineFontSize?: FontSize;
    buttonBorderRadius?: BorderRadiusSize;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// FEATURES
// =============================================================================
export interface FeatureItem {
    title: string;
    description: string;
    imageUrl: string;
}

export interface FeaturesData {
    featuresVariant?: 'classic' | 'modern' | 'bento-premium' | 'image-overlay';
    title: string;
    description: string;
    items: FeatureItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; description?: string; cardBackground?: string; cardHeading?: string; cardText?: string; };
    gridColumns: number;
    imageHeight: number;
    imageObjectFit: ObjectFit;
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    borderRadius?: BorderRadiusSize;
    // Properties for image-overlay variant
    overlayTextAlignment?: TextAlignment;
    showSectionHeader?: boolean;
}

// =============================================================================
// TESTIMONIALS
// =============================================================================
export type TestimonialsVariant = 'classic' | 'minimal-cards' | 'glassmorphism' | 'gradient-glow' | 'neon-border' | 'floating-cards' | 'gradient-shift';

export interface TestimonialItem {
    quote: string;
    name: string;
    title: string;
}

export interface TestimonialsData {
    testimonialsVariant?: TestimonialsVariant;
    title: string;
    description: string;
    items: TestimonialItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; description?: string; cardBackground?: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    cardShadow?: string;
    borderStyle?: string;
    cardPadding?: number;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// SLIDESHOW
// =============================================================================
export type SlideshowVariant = 'classic' | 'kenburns' | 'cards3d' | 'thumbnails';
export type SlideshowTransition = 'slide' | 'fade' | 'zoom';
export type ArrowStyle = 'rounded' | 'square' | 'minimal' | 'floating';
export type DotStyle = 'circle' | 'line' | 'square' | 'pill';

export interface SlideItem {
    imageUrl: string;
    altText: string;
    caption?: string;
}

export interface SlideshowData {
    slideshowVariant?: SlideshowVariant;
    title: string;
    showTitle?: boolean;
    fullWidth?: boolean;
    items: SlideItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { 
        background: string; 
        heading: string; 
        arrowBackground?: string;
        arrowText?: string;
        dotActive?: string;
        dotInactive?: string;
        captionBackground?: string;
        captionText?: string;
    };
    titleFontSize?: FontSize;
    autoPlaySpeed?: number;
    transitionEffect?: SlideshowTransition;
    transitionDuration?: number;
    showArrows?: boolean;
    showDots?: boolean;
    arrowStyle?: ArrowStyle;
    dotStyle?: DotStyle;
    kenBurnsIntensity?: 'low' | 'medium' | 'high';
    thumbnailSize?: number;
    showCaptions?: boolean;
    borderRadius?: BorderRadiusSize;
    slideHeight?: number;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// PRICING
// =============================================================================
export type PricingVariant = 'classic' | 'gradient' | 'glassmorphism' | 'minimalist';

export interface PricingTier {
    name: string;
    price: string;
    frequency: string;
    description: string;
    features: string[];
    buttonText: string;
    buttonLink: string;
    featured: boolean;
}

export interface PricingData {
    pricingVariant?: PricingVariant;
    title: string;
    description: string;
    tiers: PricingTier[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    cardBorderRadius?: BorderRadiusSize;
    colors: { 
        background: string; 
        accent: string; 
        borderColor: string; 
        text: string; 
        heading: string; 
        description?: string;
        buttonBackground?: string; 
        buttonText?: string;
        checkmarkColor?: string;
        cardBackground?: string;
        cardHeading?: string;
        cardText?: string;
        priceColor?: string;
        gradientStart?: string;
        gradientEnd?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// FAQ
// =============================================================================
export interface FaqItem {
    question: string;
    answer: string;
}

export interface FaqData {
    title: string;
    description: string;
    items: FaqItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    faqVariant?: 'classic' | 'cards' | 'gradient' | 'minimal';
    colors: { 
        background: string; 
        accent: string; 
        borderColor: string; 
        text: string; 
        heading: string;
        description?: string;
        cardBackground?: string;
        gradientStart?: string;
        gradientEnd?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
}

// =============================================================================
// LEADS / CONTACT FORM
// =============================================================================
export type LeadsVariant = 'classic' | 'split-gradient' | 'floating-glass' | 'minimal-border';

export interface LeadsData {
    leadsVariant?: LeadsVariant;
    title: string;
    description: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    companyPlaceholder: string;
    messagePlaceholder: string;
    buttonText: string;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    cardBorderRadius?: BorderRadiusSize;
    inputBorderRadius?: BorderRadiusSize;
    buttonBorderRadius?: BorderRadiusSize;
    colors: { 
        background: string; 
        accent: string; 
        borderColor: string; 
        text: string; 
        heading: string; 
        description?: string;
        buttonBackground?: string; 
        buttonText?: string;
        cardBackground?: string;
        inputBackground?: string;
        inputText?: string;
        inputBorder?: string;
        inputPlaceholder?: string;
        gradientStart?: string;
        gradientEnd?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// NEWSLETTER
// =============================================================================
export interface NewsletterData {
    title: string;
    description: string;
    placeholderText: string;
    buttonText: string;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { 
        background: string; 
        accent: string; 
        borderColor: string; 
        text: string; 
        heading: string; 
        description?: string;
        buttonBackground?: string; 
        buttonText?: string;
        cardBackground?: string;
        cardHeading?: string;
        cardText?: string;
        inputBackground?: string;
        inputText?: string;
        inputBorder?: string;
        inputPlaceholder?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
}

// =============================================================================
// CTA
// =============================================================================
export interface CtaData {
    title: string;
    description: string;
    buttonText: string;
    buttonUrl?: string;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { 
        background?: string;
        gradientStart: string; 
        gradientEnd: string; 
        text: string; 
        heading: string; 
        description?: string;
        buttonBackground?: string; 
        buttonText?: string; 
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// PORTFOLIO
// =============================================================================
export interface PortfolioItem {
    title: string;
    description: string;
    imageUrl: string;
}

export interface PortfolioData {
    portfolioVariant?: 'classic' | 'image-overlay';
    title: string;
    description: string;
    items: PortfolioItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { 
        background: string; 
        accent: string; 
        borderColor: string; 
        text: string; 
        heading: string; 
        description?: string;
        // Card colors
        cardBackground?: string;
        cardTitleColor?: string;
        cardTextColor?: string;
        cardOverlayStart?: string;
        cardOverlayEnd?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    // Properties for image-overlay variant
    gridColumns?: number;
    imageHeight?: number;
    overlayTextAlignment?: TextAlignment;
    showSectionHeader?: boolean;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// SERVICES
// =============================================================================
export type ServiceIcon = 
    // Development & Technology
    | 'code' | 'code2' | 'terminal' | 'cpu' | 'database' | 'server' | 'cloud' | 'wifi' | 'globe' | 'smartphone' | 'monitor'
    // Design & Creative
    | 'brush' | 'paintbrush' | 'palette' | 'pen-tool' | 'layout' | 'image' | 'camera' | 'video' | 'film' | 'scissors'
    // Business & Marketing
    | 'megaphone' | 'trending-up' | 'chart' | 'bar-chart' | 'pie-chart' | 'target' | 'briefcase' | 'dollar-sign' | 'credit-card'
    // Communication
    | 'mail' | 'message-circle' | 'phone' | 'send' | 'mic' | 'users' | 'user-check' | 'at-sign'
    // Social & Media
    | 'share-2' | 'heart' | 'star' | 'bookmark' | 'thumbs-up' | 'eye' | 'hash' | 'instagram' | 'twitter' | 'facebook'
    // Tools & Services
    | 'wrench' | 'settings' | 'tool' | 'package' | 'box' | 'shopping-cart' | 'shopping-bag' | 'gift' | 'truck'
    // Document & Files
    | 'file' | 'file-text' | 'folder' | 'book' | 'clipboard' | 'edit' | 'feather' | 'pen'
    // Location & Map
    | 'map-pin' | 'map' | 'navigation' | 'compass' | 'home' | 'building' | 'store'
    // Time & Calendar
    | 'clock' | 'calendar' | 'timer' | 'watch' | 'hourglass'
    // Security & Protection
    | 'shield' | 'lock' | 'key' | 'eye-off' | 'check-circle' | 'alert-circle'
    // Food & Hospitality
    | 'utensils' | 'coffee' | 'wine' | 'beer' | 'utensils-crossed' | 'chef-hat' | 'cake-slice' | 'pizza' | 'soup' | 'salad'
    // Other
    | 'zap' | 'award' | 'trophy' | 'rocket' | 'lightbulb' | 'sparkles' | 'circle-dot' | 'hexagon' | 'layers';

export interface ServiceItem {
    title: string;
    description: string;
    icon: ServiceIcon;
}

export interface ServicesData {
    servicesVariant?: 'cards' | 'grid' | 'minimal';
    title: string;
    description: string;
    items: ServiceItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; description?: string; cardBackground?: string; cardHeading?: string; cardText?: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// TEAM
// =============================================================================
export type TeamVariant = 'classic' | 'cards' | 'minimal' | 'overlay';

export interface TeamMember {
    name: string;
    role: string;
    imageUrl: string;
}

export interface TeamData {
    title: string;
    description: string;
    items: TeamMember[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; text: string; heading: string; description?: string; accent?: string; cardBackground?: string; cardHeading?: string; cardText?: string; photoBorderColor?: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    teamVariant?: TeamVariant;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// VIDEO
// =============================================================================
export interface VideoData {
    title: string;
    description: string;
    source: 'youtube' | 'vimeo' | 'upload';
    videoId?: string;
    videoUrl?: string;
    autoplay: boolean;
    loop: boolean;
    showControls: boolean;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; text: string; heading: string; description?: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// HOW IT WORKS
// =============================================================================
export type HowItWorksIcon = 'upload' | 'process' | 'magic-wand' | 'download' | 'share' | 'search';

export interface HowItWorksItem {
    title: string;
    description: string;
    icon: HowItWorksIcon;
}

export interface HowItWorksData {
    title: string;
    description: string;
    steps: number;
    items: HowItWorksItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; accent: string; text: string; heading: string; description?: string; stepTitle?: string; iconColor?: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// CHATBOT (DEPRECATED)
// =============================================================================
/**
 * @deprecated This interface is deprecated. Use AiAssistantConfig from types/ai-assistant.ts instead.
 * The chatbot is now configured through the AI Assistant Dashboard.
 * This interface is kept for backwards compatibility with existing projects.
 */
export interface ChatbotData {
    welcomeMessage: string;
    placeholderText: string;
    knowledgeBase: string;
    position: 'bottom-left' | 'bottom-right';
    colors: { primary: string; text: string; background: string; };
    isActive?: boolean;
}

// =============================================================================
// FOOTER
// =============================================================================
export type SocialPlatform = 'twitter' | 'github' | 'facebook' | 'instagram' | 'linkedin';

export interface FooterLink {
    text: string;
    href: string;
}

export interface FooterColumn {
    title: string;
    links: FooterLink[];
    menuId?: string;
}

export interface SocialLink {
    platform: SocialPlatform;
    href: string;
}

// Business Hours for Footer
export interface FooterDayHours {
    isOpen: boolean;
    openTime?: string;  // "09:00"
    closeTime?: string; // "18:00"
}

export interface FooterBusinessHours {
    monday?: FooterDayHours;
    tuesday?: FooterDayHours;
    wednesday?: FooterDayHours;
    thursday?: FooterDayHours;
    friday?: FooterDayHours;
    saturday?: FooterDayHours;
    sunday?: FooterDayHours;
}

export interface FooterContactInfo {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    businessHours?: FooterBusinessHours;
}

export interface FooterData {
    title: string;
    description: string;
    copyrightText: string;
    linkColumns: FooterColumn[];
    socialLinks: SocialLink[];
    colors: { background: string; border: string; text: string; linkHover: string; heading: string; description?: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    // Logo settings
    logoType?: 'text' | 'image';
    logoImageUrl?: string;
    // Contact Information
    contactInfo?: FooterContactInfo;
}

// =============================================================================
// MAP
// =============================================================================
export type MapVariant = 'modern' | 'minimal' | 'dark-tech' | 'retro' | 'night' | 'card-overlay';

export interface MapData {
    title: string;
    description: string;
    address: string;
    lat: number;
    lng: number;
    zoom: number;
    mapVariant: MapVariant;
    apiKey: string; // In a real app, this might be global, but allowing per-component override or placeholder
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: {
        background: string;
        text: string;
        heading: string;
        description?: string;
        accent: string;
        cardBackground?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    height: number;
    borderRadius?: BorderRadiusSize;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// MENU (RESTAURANT)
// =============================================================================
export type MenuVariant = 'classic' | 'modern-grid' | 'elegant-list' | 'full-image';

export interface MenuItem {
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    category?: string;
    isSpecial?: boolean;
}

export interface MenuData {
    menuVariant?: MenuVariant;
    title: string;
    description: string;
    items: MenuItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { 
        background: string; 
        accent: string; 
        borderColor: string; 
        text: string; 
        heading: string;
        description?: string;
        cardBackground?: string;
        priceColor?: string;
        cardTitleColor?: string;
        cardText?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    showCategories?: boolean;
    showIcon?: boolean;
    icon?: ServiceIcon;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    // For full-image variant
    textAlignment?: TextAlignment;
    // Corner gradient overlay
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// BANNER
// =============================================================================
export type BannerVariant = 'classic' | 'gradient-overlay' | 'side-text' | 'centered';
export type TextAlignment = 'left' | 'center' | 'right';

export interface BannerData {
    bannerVariant?: BannerVariant;
    headline: string;
    subheadline: string;
    buttonText?: string;
    buttonUrl?: string;
    showButton?: boolean;
    backgroundImageUrl: string;
    backgroundOverlayOpacity: number; // 0-100
    height: number; // en px
    textAlignment: TextAlignment;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: {
        background: string;
        overlayColor: string;
        heading: string;
        text: string;
        buttonBackground?: string;
        buttonText?: string;
    };
    headlineFontSize?: FontSize;
    subheadlineFontSize?: FontSize;
    buttonBorderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
}

// =============================================================================
// PRODUCTS (ECOMMERCE STOREFRONT)
// =============================================================================
export type StyleType = 'minimal' | 'modern' | 'elegant' | 'dark';

export interface StorefrontProductItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    image?: string;
    category?: string;
    inStock?: boolean;
    rating?: number;
    reviewCount?: number;
    slug?: string;
    updatedAt?: any; // Firestore Timestamp
}

export interface ProductsProps {
    title?: string;
    subtitle?: string;
    products: StorefrontProductItem[];
    columns?: 2 | 3 | 4 | 5 | 6;
    showFilters?: boolean;
    showSearch?: boolean;
    showPagination?: boolean;
    productsPerPage?: number;
    layout?: 'grid' | 'list';
    cardStyle?: 'minimal' | 'modern' | 'elegant';
    showAddToCart?: boolean;
    showQuickView?: boolean;
    showWishlist?: boolean;
    onAddToCart?: (productId: string) => void;
    onQuickView?: (productId: string) => void;
    onWishlist?: (productId: string) => void;
    style?: StyleType;
    primaryColor?: string;
    storeUrl?: string; // URL to view all products in the store
}

export interface ProductsData {
    title: string;
    subtitle: string;
    products: StorefrontProductItem[];
    columns: 2 | 3 | 4 | 5 | 6;
    showFilters: boolean;
    showSearch: boolean;
    showPagination: boolean;
    productsPerPage: number;
    layout: 'grid' | 'list';
    cardStyle: 'minimal' | 'modern' | 'elegant';
    showAddToCart: boolean;
    showQuickView: boolean;
    showWishlist: boolean;
    style: StyleType;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: {
        background: string;
        text: string;
        heading: string;
        accent: string;
        cardBackground?: string;
        cardText?: string;
        buttonBackground?: string;
        buttonText?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
}

// =============================================================================
// ECOMMERCE - FEATURED PRODUCTS
// =============================================================================
export type FeaturedProductsVariant = 'carousel' | 'grid' | 'showcase';
export type ProductSourceType = 'manual' | 'category' | 'bestsellers' | 'newest' | 'on-sale';

export interface FeaturedProductsData {
    variant: FeaturedProductsVariant;
    title: string;
    description: string;
    sourceType: ProductSourceType;
    categoryId?: string;
    productIds?: string[];
    columns: 2 | 3 | 4 | 5;
    productsToShow: number;
    // Carousel settings
    autoScroll?: boolean;
    scrollSpeed?: number;
    showArrows?: boolean;
    showDots?: boolean;
    // Display options
    showBadge?: boolean;
    showPrice?: boolean;
    showRating?: boolean;
    showAddToCart?: boolean;
    showViewAll?: boolean;
    viewAllUrl?: string;
    // Card style
    cardStyle: 'minimal' | 'modern' | 'elegant' | 'overlay';
    // Styling
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    // Colors
    colors: {
        background: string;
        heading: string;
        text: string;
        accent: string;
        cardBackground?: string;
        cardText?: string;
        buttonBackground?: string;
        buttonText?: string;
        badgeBackground?: string;
        badgeText?: string;
    };
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// ECOMMERCE - CATEGORY GRID
// =============================================================================
export type CategoryGridVariant = 'cards' | 'overlay' | 'minimal' | 'banner';

export interface CategoryItem {
    id: string;
    name: string;
    description?: string;
    imageUrl: string;
    productCount?: number;
    slug?: string;
}

export interface CategoryGridData {
    variant: CategoryGridVariant;
    title: string;
    description: string;
    categories: CategoryItem[];
    columns: 2 | 3 | 4 | 5 | 6;
    showProductCount?: boolean;
    imageAspectRatio: AspectRatio;
    imageObjectFit: ObjectFit;
    // Styling
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
    // Colors
    colors: {
        background: string;
        heading: string;
        text: string;
        accent: string;
        cardBackground?: string;
        cardText?: string;
        overlayStart?: string;
        overlayEnd?: string;
    };
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// ECOMMERCE - PRODUCT HERO
// =============================================================================
export type ProductHeroVariant = 'featured' | 'collection' | 'sale' | 'new-arrivals';
export type ProductHeroLayout = 'single' | 'split' | 'carousel';

export interface ProductHeroData {
    variant: ProductHeroVariant;
    layout: ProductHeroLayout;
    headline: string;
    subheadline: string;
    buttonText: string;
    buttonUrl?: string;
    backgroundImageUrl: string;
    // Product/Collection reference
    productId?: string;
    collectionId?: string;
    // Badge
    showBadge?: boolean;
    badgeText?: string;
    // Overlay
    overlayStyle: 'gradient' | 'solid' | 'none';
    overlayOpacity: number;
    // Layout
    height: number;
    textAlignment: TextAlignment;
    contentPosition: 'left' | 'center' | 'right';
    // Styling
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    headlineFontSize?: FontSize;
    subheadlineFontSize?: FontSize;
    buttonBorderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    // Colors
    colors: {
        background: string;
        overlayColor: string;
        heading: string;
        text: string;
        buttonBackground?: string;
        buttonText?: string;
        badgeBackground?: string;
        badgeText?: string;
    };
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// ECOMMERCE - SALE COUNTDOWN
// =============================================================================
export type SaleCountdownVariant = 'banner' | 'floating' | 'inline' | 'fullwidth';

export interface SaleCountdownData {
    variant: SaleCountdownVariant;
    title: string;
    description: string;
    // Countdown settings
    endDate: string; // ISO date string
    showDays?: boolean;
    showHours?: boolean;
    showMinutes?: boolean;
    showSeconds?: boolean;
    // Display options
    showProducts?: boolean;
    productIds?: string[];
    productsToShow?: number;
    // Badge/Label
    badgeText?: string;
    discountText?: string;
    // Styling
    height?: number;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    // Colors
    colors: {
        background: string;
        heading: string;
        text: string;
        accent: string;
        countdownBackground?: string;
        countdownText?: string;
        badgeBackground?: string;
        badgeText?: string;
        buttonBackground?: string;
        buttonText?: string;
    };
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// ECOMMERCE - TRUST BADGES
// =============================================================================
export type TrustBadgesVariant = 'horizontal' | 'grid' | 'minimal' | 'detailed';
export type TrustBadgeIcon = 'truck' | 'shield' | 'credit-card' | 'refresh-cw' | 'clock' | 'award' | 'lock' | 'headphones' | 'package' | 'check-circle' | 'star' | 'heart';

export interface TrustBadgeItem {
    icon: TrustBadgeIcon;
    title: string;
    description?: string;
}

export interface TrustBadgesData {
    variant: TrustBadgesVariant;
    title?: string;
    badges: TrustBadgeItem[];
    showLabels: boolean;
    iconSize: 'sm' | 'md' | 'lg';
    // Styling
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    titleFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    // Colors
    colors: {
        background: string;
        heading?: string;
        text: string;
        iconColor: string;
        borderColor?: string;
    };
}

// =============================================================================
// ECOMMERCE - RECENTLY VIEWED
// =============================================================================
export type RecentlyViewedVariant = 'carousel' | 'grid' | 'compact';

export interface RecentlyViewedData {
    variant: RecentlyViewedVariant;
    title: string;
    description?: string;
    maxProducts: number;
    columns: 2 | 3 | 4 | 5 | 6;
    // Carousel settings
    autoScroll?: boolean;
    scrollSpeed?: number;
    showArrows?: boolean;
    // Display options
    showPrice?: boolean;
    showRating?: boolean;
    cardStyle: 'minimal' | 'modern' | 'elegant';
    // Styling
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    titleFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    // Colors
    colors: {
        background: string;
        heading: string;
        text: string;
        accent: string;
        cardBackground?: string;
        cardText?: string;
    };
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// ECOMMERCE - PRODUCT REVIEWS
// =============================================================================
export type ProductReviewsVariant = 'list' | 'cards' | 'masonry' | 'featured';

export interface ProductReviewItem {
    id: string;
    authorName: string;
    authorImage?: string;
    rating: number;
    title?: string;
    content: string;
    date: string;
    productName?: string;
    productImage?: string;
    verified?: boolean;
    helpful?: number;
}

export interface ProductReviewsData {
    variant: ProductReviewsVariant;
    title: string;
    description?: string;
    reviews: ProductReviewItem[];
    // Display options
    showRatingDistribution?: boolean;
    showPhotos?: boolean;
    showVerifiedBadge?: boolean;
    showProductInfo?: boolean;
    sortBy?: 'newest' | 'highest' | 'lowest' | 'helpful';
    maxReviews?: number;
    // Summary
    averageRating?: number;
    totalReviews?: number;
    // Styling
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    // Colors
    colors: {
        background: string;
        heading: string;
        text: string;
        accent: string;
        cardBackground?: string;
        cardText?: string;
        starColor?: string;
        verifiedBadgeColor?: string;
    };
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// ECOMMERCE - COLLECTION BANNER
// =============================================================================
export type CollectionBannerVariant = 'hero' | 'split' | 'minimal' | 'overlay';

export interface CollectionBannerData {
    variant: CollectionBannerVariant;
    title: string;
    description: string;
    backgroundImageUrl: string;
    // Collection reference
    collectionId?: string;
    // Button
    buttonText?: string;
    buttonUrl?: string;
    showButton?: boolean;
    // Overlay
    overlayStyle: 'gradient' | 'solid' | 'none';
    overlayOpacity: number;
    // Layout
    height: number;
    textAlignment: TextAlignment;
    contentPosition: 'left' | 'center' | 'right';
    // Styling
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    headlineFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    buttonBorderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    // Colors
    colors: {
        background: string;
        overlayColor: string;
        heading: string;
        text: string;
        buttonBackground?: string;
        buttonText?: string;
    };
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// ECOMMERCE - PRODUCT BUNDLE
// =============================================================================
export type ProductBundleVariant = 'horizontal' | 'vertical' | 'compact';

export interface ProductBundleData {
    variant: ProductBundleVariant;
    title: string;
    description: string;
    // Bundle products (IDs to fetch from store)
    productIds: string[];
    // Pricing
    bundlePrice: number;
    originalPrice: number;
    showSavings: boolean;
    savingsText?: string;
    // Display
    showIndividualPrices: boolean;
    buttonText: string;
    buttonUrl?: string;
    // Badge
    showBadge?: boolean;
    badgeText?: string;
    // Styling
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
    // Colors
    colors: {
        background: string;
        heading: string;
        text: string;
        accent: string;
        cardBackground?: string;
        cardText?: string;
        priceColor?: string;
        savingsColor?: string;
        buttonBackground?: string;
        buttonText?: string;
        badgeBackground?: string;
        badgeText?: string;
    };
    cornerGradient?: CornerGradientConfig;
}

// =============================================================================
// ECOMMERCE - ANNOUNCEMENT BAR
// =============================================================================
export type AnnouncementBarVariant = 'static' | 'scrolling' | 'rotating';

export interface AnnouncementMessage {
    text: string;
    link?: string;
    linkText?: string;
}

export interface AnnouncementBarData {
    variant: AnnouncementBarVariant;
    messages: AnnouncementMessage[];
    // Display
    showIcon?: boolean;
    icon?: ServiceIcon;
    dismissible?: boolean;
    // Scrolling/Rotating settings
    speed?: number;
    pauseOnHover?: boolean;
    // Styling
    height?: number;
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    fontSize?: FontSize;
    // Colors
    colors: {
        background: string;
        text: string;
        linkColor?: string;
        iconColor?: string;
        borderColor?: string;
    };
}

// =============================================================================
// PAGE DATA (AGGREGATED)
// =============================================================================
export interface PageData {
    header: HeaderData;
    hero: HeroData;
    heroSplit: HeroSplitData;
    features: FeaturesData;
    testimonials: TestimonialsData;
    slideshow: SlideshowData;
    pricing: PricingData;
    faq: FaqData;
    leads: LeadsData;
    newsletter: NewsletterData;
    cta: CtaData;
    portfolio: PortfolioData;
    services: ServicesData;
    team: TeamData;
    video: VideoData;
    howItWorks: HowItWorksData;
    chatbot: ChatbotData;
    footer: FooterData;
    map: MapData;
    menu: MenuData;
    banner: BannerData;
    products?: ProductsData;
    // Ecommerce components
    featuredProducts?: FeaturedProductsData;
    categoryGrid?: CategoryGridData;
    productHero?: ProductHeroData;
    saleCountdown?: SaleCountdownData;
    trustBadges?: TrustBadgesData;
    recentlyViewed?: RecentlyViewedData;
    productReviews?: ProductReviewsData;
    collectionBanner?: CollectionBannerData;
    productBundle?: ProductBundleData;
    announcementBar?: AnnouncementBarData;
}

