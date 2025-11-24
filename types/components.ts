/**
 * Component Types
 * Tipos para todos los componentes de la página
 */

import { PaddingSize, FontSize, ImageStyle, BorderRadiusSize, BorderSize, JustifyContent, ImagePosition, AspectRatio, ObjectFit, AnimationType } from './ui';

// =============================================================================
// HEADER
// =============================================================================
export type NavbarLayout = 'classic' | 'minimal' | 'center' | 'stack';
export type NavLinkHoverStyle = 'simple' | 'underline' | 'bracket' | 'highlight' | 'glow';

export interface NavLink {
    text: string;
    href: string;
}

export interface HeaderData {
    style: 'sticky-solid' | 'sticky-transparent' | 'floating';
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
    headlineFontSize?: FontSize;
    subheadlineFontSize?: FontSize;
    showBadge?: boolean;
    badgeText?: string;
    badgeIcon?: string;
    badgeColor?: string;
    badgeBackgroundColor?: string;
    showStats?: boolean;
    stats?: Array<{ value: string; label: string }>;
    statsValueColor?: string;
    statsLabelColor?: string;
    buttonBorderRadius?: BorderRadiusSize;
    animationType?: AnimationType;
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
    featuresVariant?: 'classic' | 'modern';
    title: string;
    description: string;
    items: FeatureItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; };
    gridColumns: number;
    imageHeight: number;
    imageObjectFit: ObjectFit;
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
}

// =============================================================================
// TESTIMONIALS
// =============================================================================
export type TestimonialsVariant = 'classic' | 'minimal-cards' | 'glassmorphism' | 'gradient-glow' | 'neon-border' | 'floating-cards' | 'gradient-shift';

export interface TestimonialItem {
    quote: string;
    name: string;
    title: string;
    avatar: string;
}

export interface TestimonialsData {
    testimonialsVariant?: TestimonialsVariant;
    title: string;
    description: string;
    items: TestimonialItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; cardBackground?: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    cardShadow?: string;
    borderStyle?: string;
    cardPadding?: number;
    avatarBorderWidth?: number;
    avatarBorderColor?: string;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
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
        buttonBackground?: string; 
        buttonText?: string;
        checkmarkColor?: string;
        cardBackground?: string;
        gradientStart?: string;
        gradientEnd?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
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
    buttonBorderRadius?: BorderRadiusSize;
    colors: { 
        background: string; 
        accent: string; 
        borderColor: string; 
        text: string; 
        heading: string; 
        buttonBackground?: string; 
        buttonText?: string;
        cardBackground?: string;
        inputBackground?: string;
        inputText?: string;
        inputBorder?: string;
        gradientStart?: string;
        gradientEnd?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
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
        buttonBackground?: string; 
        buttonText?: string; 
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
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { 
        background?: string;
        gradientStart: string; 
        gradientEnd: string; 
        text: string; 
        heading: string; 
        buttonBackground?: string; 
        buttonText?: string; 
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
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
    title: string;
    description: string;
    items: PortfolioItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
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
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
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
    colors: { background: string; text: string; heading: string; accent?: string; cardBackground?: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    teamVariant?: TeamVariant;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
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
    colors: { background: string; text: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
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
    colors: { background: string; accent: string; text: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
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

export interface FooterData {
    title: string;
    description: string;
    copyrightText: string;
    linkColumns: FooterColumn[];
    socialLinks: SocialLink[];
    colors: { background: string; border: string; text: string; linkHover: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
}

// =============================================================================
// MAP
// =============================================================================
export type MapVariant = 'modern' | 'minimal' | 'dark-tech' | 'retro' | 'night';

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
        accent: string;
        cardBackground?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    height: number;
    borderRadius?: BorderRadiusSize;
}

// =============================================================================
// MENU (RESTAURANT)
// =============================================================================
export type MenuVariant = 'classic' | 'modern-grid' | 'elegant-list';

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
        cardBackground?: string;
        priceColor?: string;
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
    borderRadius?: BorderRadiusSize;
    showCategories?: boolean;
    showIcon?: boolean;
    icon?: ServiceIcon;
    animationType?: AnimationType;
    enableCardAnimation?: boolean;
}

// =============================================================================
// PAGE DATA (AGGREGATED)
// =============================================================================
export interface PageData {
    header: HeaderData;
    hero: HeroData;
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
}

