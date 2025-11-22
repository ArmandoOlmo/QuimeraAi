
// Basic Types
export type PaddingSize = 'sm' | 'md' | 'lg';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type ImageStyle = 'default' | 'rounded-full' | 'glow' | 'float' | 'hexagon' | 'polaroid';
export type BorderRadiusSize = 'none' | 'md' | 'xl' | 'full';
export type BorderSize = 'none' | 'sm' | 'md' | 'lg';
export type JustifyContent = 'start' | 'center' | 'end';
export type ImagePosition = 'left' | 'right';
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
export type View = 'editor' | 'dashboard' | 'websites' | 'superadmin' | 'assets' | 'cms' | 'navigation' | 'ai-assistant' | 'leads' | 'domains' | 'seo';
export type AspectRatio = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export type ThemeMode = 'light' | 'dark' | 'black';
export type AdminView = 'main' | 'admins' | 'tenants' | 'languages' | 'prompts' | 'stats' | 'billing' | 'templates' | 'components' | 'marketplace' | 'images' | 'global-assistant' | 'design-tokens' | 'analytics' | 'conditional-rules' | 'ab-testing' | 'accessibility' | 'global-seo';

export type PageSection = 'hero' | 'features' | 'testimonials' | 'pricing' | 'faq' | 'cta' | 'services' | 'team' | 'video' | 'slideshow' | 'portfolio' | 'leads' | 'newsletter' | 'howItWorks' | 'chatbot' | 'footer' | 'header' | 'typography';

export type FontFamily = 
  'roboto' | 'open-sans' | 'lato' | 'slabo-27px' | 'oswald' | 'source-sans-pro' |
  'montserrat' | 'raleway' | 'pt-sans' | 'merriweather' | 'lora' | 'ubuntu' |
  'playfair-display' | 'crimson-text' | 'poppins' | 'arvo' | 'mulish' |
  'noto-sans' | 'noto-serif' | 'inconsolata' | 'indie-flower' | 'cabin' |
  'fira-sans' | 'pacifico' | 'josefin-sans' | 'anton' | 'yanone-kaffeesatz' |
  'arimo' | 'lobster' | 'bree-serif' | 'vollkorn' | 'abel' | 'archivo-narrow' |
  'francois-one' | 'signika' | 'oxygen' | 'quicksand' | 'pt-serif' | 'bitter' |
  'exo-2' | 'varela-round' | 'dosis' | 'noticia-text' | 'titillium-web' |
  'nobile' | 'cardo' | 'asap' | 'questrial' | 'dancing-script' | 'amatic-sc';

// Header Types
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
    isPreviewMode?: boolean; // Used in Component Studio to fix floating positioning
}

// Hero Types
export interface HeroData {
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
}

// Feature Types
export interface FeatureItem {
    title: string;
    description: string;
    imageUrl: string;
}

export interface FeaturesData {
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
}

// Testimonial Types
export interface TestimonialItem {
    quote: string;
    name: string;
    title: string;
    avatar: string;
}

export interface TestimonialsData {
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
}

// Slideshow Types
export interface SlideItem {
    imageUrl: string;
    altText: string;
}

export interface SlideshowData {
    title: string;
    items: SlideItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; heading: string; };
    titleFontSize?: FontSize;
}

// Pricing Types
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
    };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
}

// FAQ Types
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
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
}

// Leads/Contact Types
export interface LeadsData {
    title: string;
    description: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    companyPlaceholder: string;
    messagePlaceholder: string;
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

// Newsletter Types
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

// CTA Types
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

// Portfolio Types
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
}

// Services Types
export type ServiceIcon = 'code' | 'brush' | 'megaphone' | 'chart' | 'scissors' | 'camera';

export interface ServiceItem {
    title: string;
    description: string;
    icon: ServiceIcon;
}

export interface ServicesData {
    title: string;
    description: string;
    items: ServiceItem[];
    paddingY: PaddingSize;
    paddingX: PaddingSize;
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
}

// Team Types
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
    colors: { background: string; text: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
}

// Video Types
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

// How It Works Types
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

// Chatbot Types
export interface ChatbotData {
    welcomeMessage: string;
    placeholderText: string;
    knowledgeBase: string;
    position: 'bottom-left' | 'bottom-right';
    colors: { primary: string; text: string; background: string; };
    isActive?: boolean;
}

// Footer Types
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

// Theme Data
export interface ThemeData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
    fontFamilyHeader: FontFamily;
    fontFamilyBody: FontFamily;
    fontFamilyButton: FontFamily;
}

// Page Data (Aggregated)
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
}

// Component Studio Types
export type EditableComponentID = 'hero' | 'features' | 'services' | 'testimonials' | 'team' | 'cta' | 'slideshow' | 'pricing' | 'faq' | 'portfolio' | 'leads' | 'newsletter' | 'video' | 'howItWorks' | 'footer' | 'header';
export type ComponentStyles = Record<EditableComponentID, any>;

export type ComponentCategory = 'hero' | 'cta' | 'form' | 'content' | 'navigation' | 'media' | 'other';

export interface ComponentVersion {
    version: number;
    timestamp: { seconds: number; nanoseconds: number; };
    author: string;
    changes: string;
    snapshot: any;
}

export interface ComponentVariant {
    id: string;
    name: string;
    description: string;
    styles: any;
    thumbnail?: string;
    isDefault?: boolean;
}

export interface ComponentPermissions {
    canEdit: string[];
    canView: string[];
    isPublic: boolean;
}

export interface ComponentRating {
    id: string;
    componentId: string;
    userId: string;
    userName?: string;
    rating: number; // 1-5
    comment?: string;
    createdAt: { seconds: number; nanoseconds: number; } | string;
    helpful?: number; // count of users who found this review helpful
}

export interface PropDocumentation {
    name: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue?: any;
}

export interface ComponentDocumentation {
    description: string;
    usageExamples: string[];
    properties: PropDocumentation[];
    changelog: string;
}

export interface CustomComponent {
    id: string;
    name: string;
    description?: string;
    baseComponent: EditableComponentID;
    styles: any;
    
    // Versionado
    version: number;
    versionHistory?: ComponentVersion[];
    lastModified?: { seconds: number; nanoseconds: number; };
    modifiedBy?: string;
    
    // Organización
    category?: ComponentCategory;
    tags?: string[];
    thumbnail?: string;
    
    // Variantes
    variants?: ComponentVariant[];
    
    // Permisos y uso
    permissions?: ComponentPermissions;
    isPublic?: boolean;
    createdBy?: string;
    
    // Metadata
    createdAt: { seconds: number; nanoseconds: number; };
    usageCount?: number;
    projectsUsing?: string[];
    
    // Documentación
    documentation?: ComponentDocumentation;
    
    // Ratings
    ratings?: ComponentRating[];
    averageRating?: number;
}

// Design Tokens Types
export interface ColorScale {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
}

export interface SpacingScale {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
}

export interface TypographyTokens {
    fontFamilies: {
        heading: string;
        body: string;
        mono: string;
    };
    fontSizes: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
        '5xl': string;
        '6xl': string;
    };
    fontWeights: {
        light: number;
        normal: number;
        medium: number;
        semibold: number;
        bold: number;
    };
    lineHeights: {
        tight: number;
        normal: number;
        relaxed: number;
    };
}

export interface ShadowTokens {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
}

export interface AnimationTokens {
    durations: {
        fast: string;
        normal: string;
        slow: string;
    };
    easings: {
        linear: string;
        easeIn: string;
        easeOut: string;
        easeInOut: string;
    };
}

export interface BreakpointTokens {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
}

export interface DesignTokens {
    colors: {
        primary: ColorScale;
        secondary: ColorScale;
        accent: ColorScale;
        neutral: ColorScale;
        success: ColorScale;
        warning: ColorScale;
        error: ColorScale;
    };
    spacing: SpacingScale;
    typography: TypographyTokens;
    shadows: ShadowTokens;
    animations: AnimationTokens;
    breakpoints: BreakpointTokens;
}

// Responsive Configuration Types
export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveValue<T> {
    base?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    '2xl'?: T;
}

export interface ResponsiveStyles {
    spacing?: ResponsiveValue<string>;
    fontSize?: ResponsiveValue<string>;
    display?: ResponsiveValue<'block' | 'flex' | 'grid' | 'none'>;
    width?: ResponsiveValue<string>;
    height?: ResponsiveValue<string>;
    padding?: ResponsiveValue<string>;
    margin?: ResponsiveValue<string>;
}

// Animation Configuration Types
export type AnimationTrigger = 'onLoad' | 'onScroll' | 'onClick' | 'onHover';
export type AnimationType = 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce' | 'custom';
export type AnimationEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';

export interface AnimationConfig {
    type: AnimationType;
    duration: number;
    delay: number;
    easing: AnimationEasing;
    trigger: AnimationTrigger;
    repeat?: number;
    direction?: 'normal' | 'reverse' | 'alternate';
    customKeyframes?: string;
}

export interface ComponentAnimations {
    entrance?: AnimationConfig;
    exit?: AnimationConfig;
    interaction?: AnimationConfig;
}

// Conditional Rules Types
export type ConditionOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
export type ConditionTarget = 'userRole' | 'deviceType' | 'screenSize' | 'timeOfDay' | 'location' | 'customField';

export interface Condition {
    id: string;
    target: ConditionTarget;
    operator: ConditionOperator;
    value: any;
}

export interface ConditionalRule {
    id: string;
    name: string;
    conditions: Condition[];
    matchType: 'all' | 'any';
    actions: {
        show?: boolean;
        applyStyles?: any;
        redirect?: string;
    };
}

export interface ConditionalRules {
    rules: ConditionalRule[];
    enabled: boolean;
}

// A/B Testing Types
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';
export type ExperimentGoal = 'clicks' | 'conversions' | 'engagement' | 'custom';

export interface ExperimentVariant {
    id: string;
    name: string;
    description: string;
    weight: number;
    componentConfig: any;
}

export interface ExperimentMetrics {
    impressions: number;
    interactions: number;
    conversions: number;
    conversionRate: number;
}

export interface ABTestExperiment {
    id: string;
    name: string;
    description: string;
    componentId: string;
    status: ExperimentStatus;
    goal: ExperimentGoal;
    variants: ExperimentVariant[];
    metrics: Record<string, ExperimentMetrics>;
    startDate?: { seconds: number; nanoseconds: number; };
    endDate?: { seconds: number; nanoseconds: number; };
    createdBy: string;
    winningVariant?: string;
}

// Marketplace Types
export interface MarketplaceComponent extends CustomComponent {
    downloads: number;
    rating: number;
    reviews: ComponentReview[];
    price?: number;
    isPremium: boolean;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    screenshots?: string[];
}

export interface ComponentReview {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    createdAt: { seconds: number; nanoseconds: number; };
}

// Nested Components / Slots Types
export interface ComponentSlot {
    id: string;
    name: string;
    allowedComponents?: EditableComponentID[];
    maxComponents?: number;
    defaultComponent?: EditableComponentID;
}

export interface NestedComponent {
    slotId: string;
    componentId: string;
    order: number;
    config: any;
}

// Usage & Admin Types
export interface MonthlyData {
    month: string;
    count: number;
}

export interface ApiCallStat {
    model: string;
    count: number;
    color: string;
}

export interface UserActivity {
    id: string;
    name: string;
    email: string;
    photoURL: string;
    projectCount: number;
}

export interface TemplateUsage {
    id: string;
    name: string;
    count: number;
}

export interface UsageData {
    totalUsers: number;
    newUsersThisMonth: number;
    totalProjects: number;
    projectsThisMonth: number;
    totalApiCalls: number;
    userGrowth: MonthlyData[];
    apiCallsByModel: ApiCallStat[];
    topUsers: UserActivity[];
    popularTemplates: TemplateUsage[];
}

export interface ServiceModule {
    id: string;
    name: string;
    description: string;
}

export interface Plan {
    id: string;
    name: string;
    description: string;
    price: { monthly: number; annually: number; };
    features: string[];
    serviceModuleIds: string[];
    isFeatured: boolean;
    isArchived: boolean;
}

export interface BillingData {
    mrr: number;
    activeSubscriptions: number;
    arpu: number;
    churnRate: number;
    revenueTrend: { month: string; revenue: number; }[];
    planDistribution: { planId: string; planName: string; subscribers: number; color: string; }[];
    serviceModules: ServiceModule[];
    plans: Plan[];
}

// CRM / Leads Types
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost';

export interface Lead {
    // Basic Info
    id: string;
    name: string;
    email: string;
    phone?: string;
    
    // Address
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    
    // Additional Contact
    website?: string;
    linkedIn?: string;
    
    // Professional Info
    company?: string;
    jobTitle?: string;
    industry?: string;
    
    // CRM Fields
    status: LeadStatus;
    source: 'chatbot' | 'chatbot-widget' | 'contact-form' | 'form' | 'manual' | 'referral' | 'linkedin' | 'cold_call' | 'voice-call';
    value?: number;
    probability?: number; // 0-100% chance to close
    expectedCloseDate?: { seconds: number; nanoseconds: number };
    leadScore?: number; // 0-100 automated scoring
    conversationTranscript?: string; // Full chat conversation if from chatbot
    
    // Notes & Tags
    notes?: string;
    tags?: string[];
    message?: string; // Message from contact form or chatbot
    
    // Metadata
    color?: string;
    emojiMarker?: string;
    createdAt: { seconds: number; nanoseconds: number; };
    lastContacted?: { seconds: number; nanoseconds: number; };
    
    // AI Features
    aiScore?: number;
    aiAnalysis?: string;
    recommendedAction?: string;
    
    // Custom Fields
    customFields?: LeadCustomField[];
}

// Lead Custom Fields
export interface LeadCustomField {
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
    options?: string[]; // for select type
    value: string | number | boolean | Date;
}

// Lead Activities
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'task_completed';

export interface LeadActivity {
    id: string;
    leadId: string;
    type: ActivityType;
    title: string;
    description?: string;
    createdAt: { seconds: number; nanoseconds: number };
    createdBy: string;
    metadata?: {
        oldStatus?: LeadStatus;
        newStatus?: LeadStatus;
        duration?: number; // for calls/meetings in minutes
        emailSubject?: string;
    };
}

// Lead Tasks
export interface LeadTask {
    id: string;
    leadId: string;
    title: string;
    description?: string;
    dueDate: { seconds: number; nanoseconds: number };
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    completedAt?: { seconds: number; nanoseconds: number };
    assignedTo?: string;
    createdAt: { seconds: number; nanoseconds: number };
}

// Onboarding Types
export type OnboardingStep = 'basics' | 'strategy' | 'aesthetic' | 'details' | 'products' | 'contact' | 'visuals' | 'review' | 'generating' | 'success';
export type AestheticType = 'Minimalist' | 'Bold' | 'Elegant' | 'Playful' | 'Tech' | 'Organic';

export interface ProductInfo {
    id: string;
    name: string;
    description: string;
    price?: string;
    features?: string[];
}

export interface TestimonialInfo {
    id: string;
    quote: string;
    author: string;
    role: string;
    company?: string;
    avatar?: string;
}

export interface ContactInfo {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
    };
}

export interface BrandGuidelines {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    existingImages?: string[];
}

export interface OnboardingState {
    step: OnboardingStep;
    
    // Basics
    businessName: string;
    industry: string;
    summary: string;
    
    // Strategy
    audience: string;
    offerings: string;
    goal: string;
    
    // Aesthetic
    tone?: string;
    aesthetic: AestheticType;
    colorVibe: string;
    
    // Details (NEW)
    companyHistory?: string;
    uniqueValueProposition?: string;
    coreValues?: string[];
    yearsInBusiness?: string;
    
    // Products/Services (NEW)
    products?: ProductInfo[];
    
    // Contact (NEW)
    contactInfo?: ContactInfo;
    
    // Visuals (NEW)
    brandGuidelines?: BrandGuidelines;
    testimonials?: TestimonialInfo[];
    
    // Generated
    designPlan?: any;
}

// Auth & User Types
export type UserRole = 'user' | 'manager' | 'admin' | 'superadmin' | 'owner';
export type TenantType = 'individual' | 'agency';
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'expired';
export type IndividualRole = 'owner';
export type AgencyRole = 'agency_owner' | 'agency_admin' | 'agency_member' | 'client';

// Sistema de permisos
export interface RolePermissions {
    // Gestión de usuarios
    canViewUsers: boolean;
    canEditUsers: boolean;
    canDeleteUsers: boolean;
    canManageRoles: boolean;
    canCreateSuperAdmin: boolean; // Solo owner
    
    // Gestión de tenants
    canViewTenants: boolean;
    canEditTenants: boolean;
    canDeleteTenants: boolean;
    canManageTenantLimits: boolean;
    
    // Configuración global
    canEditGlobalSettings: boolean;
    canEditPrompts: boolean;
    canEditDesignTokens: boolean;
    canViewBilling: boolean;
    canEditBilling: boolean;
    
    // Contenido y proyectos
    canViewAllProjects: boolean;
    canEditAllProjects: boolean;
    canDeleteAllProjects: boolean;
    
    // Estadísticas
    canViewUsageStats: boolean;
    canExportData: boolean;
}

export interface TenantLimits {
    maxProjects: number;
    maxUsers: number; // Solo para agencias
    maxStorageGB: number;
    maxAiCredits: number;
}

export interface TenantUsage {
    projectCount: number;
    userCount: number;
    storageUsedGB: number;
    aiCreditsUsed: number;
}

export interface Tenant {
    id: string;
    type: TenantType;
    name: string; // Nombre del tenant (persona o agencia)
    email: string; // Email principal
    logoUrl?: string;
    
    // Información de negocio (principalmente para agencias)
    companyName?: string;
    taxId?: string;
    industry?: string;
    website?: string;
    
    // Status y fechas
    status: TenantStatus;
    createdAt: { seconds: number; nanoseconds: number } | string;
    lastActiveAt?: { seconds: number; nanoseconds: number } | string;
    trialEndsAt?: { seconds: number; nanoseconds: number } | string;
    
    // Suscripción y límites
    subscriptionPlan: string; // 'free', 'pro', 'enterprise'
    limits: TenantLimits;
    usage: TenantUsage;
    
    // Usuarios asociados
    ownerUserId: string;
    memberUserIds: string[]; // Solo para agencias
    
    // Proyectos
    projectIds: string[];
    
    // Configuración
    settings?: {
        allowMemberInvites?: boolean;
        requireTwoFactor?: boolean;
        brandingEnabled?: boolean;
    };
    
    // Facturación
    billingInfo?: {
        mrr: number;
        nextBillingDate?: string;
        paymentMethod?: string;
    };
}

export interface UserDocument {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  role?: UserRole;
  
  // Relación con tenants
  tenantId?: string; // Tenant principal
  tenantRole?: IndividualRole | AgencyRole;
  additionalTenants?: Array<{ // Para usuarios que pertenecen a múltiples agencias
      tenantId: string;
      role: AgencyRole;
  }>;
  
  // Metadata de administrador
  createdBy?: string; // Email del admin que lo creó
  createdAt?: { seconds: number; nanoseconds: number } | string;
  lastLogin?: { seconds: number; nanoseconds: number } | string;
}

// File System Types
export interface FileRecord {
  id: string;
  name: string;
  storagePath: string;
  downloadURL: string;
  size: number;
  type: string;
  createdAt: { seconds: number; nanoseconds: number; };
  notes: string;
  aiSummary: string;
}

// CMS Types
export interface CMSPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    featuredImage: string;
    status: 'draft' | 'published';
    authorId: string;
    seoTitle: string;
    seoDescription: string;
    createdAt: string;
    updatedAt: string;
}

// LLM Prompt Types
export interface LLMPrompt {
  id: string;
  name: string;
  area: 'Onboarding' | 'Content Generation' | 'Image Generation' | 'File Management' | 'Other';
  description: string;
  template: string;
  model: string;
  version: number;
  createdAt: { seconds: number; nanoseconds: number; };
  updatedAt: { seconds: number; nanoseconds: number; };
}

// Brand Brain
export interface BrandIdentity {
    name: string;
    industry: string;
    targetAudience: string;
    toneOfVoice: 'Professional' | 'Playful' | 'Urgent' | 'Luxury' | 'Friendly' | 'Minimalist';
    coreValues: string;
    language: string;
}

// Navigation Menu Types
export interface MenuItem {
  id: string;
  text: string;
  href: string;
  type: 'custom' | 'section' | 'page';
}

export interface Menu {
  id: string;
  title: string;
  handle: string;
  items: MenuItem[];
}

// AI Assistant Configuration
export interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

export interface KnowledgeDocument {
    id: string;
    name: string;
    content: string;
    extractedAt: { seconds: number; nanoseconds: number };
    fileType: string;
    size: number;
}

export interface LeadCaptureConfig {
    enabled: boolean;
    preChatForm: boolean; // Show form before chat starts
    triggerAfterMessages: number; // Ask for info after X messages
    requireEmailForAdvancedInfo: boolean;
    exitIntentEnabled: boolean;
    exitIntentOffer?: string;
    intentKeywords: string[]; // Keywords that trigger lead capture
    progressiveProfilingEnabled: boolean;
}

// Chat Customization Types
export interface ChatBrandingConfig {
    logoType: 'none' | 'image' | 'emoji';
    logoUrl?: string;
    logoEmoji?: string;
    logoSize: 'sm' | 'md' | 'lg';
    botAvatarUrl?: string;
    botAvatarEmoji?: string;
    showBotAvatar: boolean;
    showUserAvatar: boolean;
    userAvatarStyle: 'initials' | 'icon' | 'none';
}

export interface ChatColorScheme {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    userBubbleColor: string;
    userTextColor: string;
    botBubbleColor: string;
    botTextColor: string;
    backgroundColor: string;
    inputBackground: string;
    inputBorder: string;
    inputText: string;
    headerBackground: string;
    headerText: string;
}

export interface ChatBehaviorConfig {
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    offsetX: number;
    offsetY: number;
    width: 'sm' | 'md' | 'lg' | 'xl';
    height: 'sm' | 'md' | 'lg' | 'full';
    autoOpen: boolean;
    autoOpenDelay: number;
    openOnScroll: number;
    openOnTime: number;
    fullScreenOnMobile: boolean;
}

export interface ChatMessagesConfig {
    welcomeMessage: string;
    welcomeMessageEnabled: boolean;
    welcomeDelay: number;
    inputPlaceholder: string;
    quickReplies: Array<{
        id: string;
        text: string;
        emoji?: string;
    }>;
    showTypingIndicator: boolean;
}

export interface ChatButtonConfig {
    buttonStyle: 'circle' | 'rounded' | 'square';
    buttonSize: 'sm' | 'md' | 'lg' | 'xl';
    buttonIcon: 'chat' | 'help' | 'custom-emoji' | 'custom-image';
    customEmoji?: string;
    customIconUrl?: string;
    showButtonText: boolean;
    buttonText?: string;
    pulseEffect: boolean;
    shadowSize: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    showTooltip: boolean;
    tooltipText: string;
}

export interface ChatAppearanceConfig {
    branding: ChatBrandingConfig;
    colors: ChatColorScheme;
    behavior: ChatBehaviorConfig;
    messages: ChatMessagesConfig;
    button: ChatButtonConfig;
    theme: 'light' | 'dark' | 'auto';
}

export interface AiAssistantConfig {
    agentName: string;
    tone: string;
    languages: string;
    businessProfile: string;
    productsServices: string;
    policiesContact: string;
    specialInstructions: string;
    faqs: FAQItem[];
    knowledgeDocuments: KnowledgeDocument[];
    widgetColor: string;
    isActive: boolean;
    leadCaptureEnabled: boolean;
    leadCaptureConfig?: LeadCaptureConfig;
    appearance?: ChatAppearanceConfig;
    enableLiveVoice: boolean;
    voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export interface ScopePermission {
    chat: boolean;
    voice: boolean;
}

export interface GlobalAssistantConfig {
    isEnabled: boolean;
    systemInstruction: string;
    enabledTemplates?: string[]; // NEW: Array of enabled template IDs
    customInstructions?: string; // NEW: User's custom additional instructions
    enableLiveVoice: boolean;
    voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
    greeting: string;
    permissions: Record<string, ScopePermission>;
    temperature: number;
    maxTokens: number;
    autoDetectLanguage?: boolean;
    supportedLanguages?: string;
}

// Domain Management Types
export type DomainStatus = 'active' | 'pending' | 'error' | 'deploying' | 'deployed';

export type DeploymentProvider = 'vercel' | 'cloudflare' | 'netlify' | 'custom' | null;

export interface DeploymentInfo {
    provider: DeploymentProvider;
    deploymentUrl?: string;
    deploymentId?: string;
    lastDeployedAt?: string;
    status: 'idle' | 'deploying' | 'success' | 'failed';
    error?: string;
}

export interface DeploymentLog {
    id: string;
    timestamp: string;
    status: 'started' | 'success' | 'failed';
    message: string;
    details?: string;
}

export interface Domain {
    id: string;
    name: string;
    status: DomainStatus;
    provider: 'Quimera' | 'External';
    projectId?: string; // ID of the connected project
    expiryDate?: string;
    dnsRecords?: {
        type: 'A' | 'CNAME' | 'TXT';
        host: string;
        value: string;
        verified?: boolean;
    }[];
    createdAt: string;
    deployment?: DeploymentInfo;
    deploymentLogs?: DeploymentLog[];
}

// SEO Configuration Types
export interface SEOConfig {
  // Basic SEO
  title: string;
  description: string;
  keywords: string[];
  author?: string;
  language: string;
  
  // Open Graph (Facebook, LinkedIn, etc.)
  ogType: 'website' | 'article' | 'product' | 'profile';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogUrl?: string;
  ogSiteName?: string;
  
  // Twitter Card
  twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  
  // Structured Data (Schema.org)
  schemaType: 'Organization' | 'LocalBusiness' | 'WebSite' | 'Article' | 'Product' | 'Service';
  schemaData?: Record<string, any>;
  
  // Technical SEO
  canonical?: string;
  robots: string; // "index, follow" | "noindex, nofollow" etc.
  googleSiteVerification?: string;
  bingVerification?: string;
  
  // AI Bot Optimization
  aiCrawlable: boolean;
  aiDescription?: string; // Optimized description for AI bots
  aiKeyTopics?: string[]; // Key topics for AI understanding
}

export interface ProjectSEO extends SEOConfig {
  projectId: string;
  lastUpdated: string;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  thumbnailUrl: string;
  status: 'Published' | 'Draft' | 'Template';
  lastUpdated: string;
  data: PageData;
  theme: ThemeData;
  brandIdentity: BrandIdentity;
  componentOrder: PageSection[];
  sectionVisibility: Record<PageSection, boolean>;
  isArchived?: boolean;
  sourceTemplateId?: string;
  imagePrompts?: Record<string, string>;
  menus?: Menu[];
  aiAssistantConfig?: AiAssistantConfig;
  responsiveStyles?: Record<string, ResponsiveStyles>;
  conditionalRules?: ConditionalRule[];
  seoConfig?: SEOConfig;
}
