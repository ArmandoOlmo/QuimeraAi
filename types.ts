
// Basic Types
export type PaddingSize = 'sm' | 'md' | 'lg';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type ImageStyle = 'default' | 'rounded-full' | 'glow' | 'float' | 'hexagon' | 'polaroid';
export type BorderRadiusSize = 'none' | 'md' | 'xl' | 'full';
export type BorderSize = 'none' | 'sm' | 'md' | 'lg';
export type JustifyContent = 'start' | 'center' | 'end';
export type ImagePosition = 'left' | 'right';
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
export type View = 'editor' | 'dashboard' | 'websites' | 'superadmin' | 'assets' | 'cms' | 'navigation' | 'ai-assistant' | 'leads' | 'domains';
export type AspectRatio = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export type ThemeMode = 'light' | 'dark' | 'black';
export type AdminView = 'main' | 'tenants' | 'prompts' | 'stats' | 'billing' | 'templates' | 'components' | 'images' | 'global-assistant';

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
    colors: { background: string; accent: string; borderColor: string; text: string; heading: string; };
    titleFontSize?: FontSize;
    descriptionFontSize?: FontSize;
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
    featured: boolean;
}

export interface PricingData {
    title: string;
    description: string;
    tiers: PricingTier[];
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
export type EditableComponentID = 'hero' | 'features' | 'services' | 'testimonials' | 'team' | 'cta' | 'slideshow' | 'pricing' | 'faq' | 'portfolio' | 'leads' | 'newsletter' | 'video' | 'howItWorks' | 'footer';
export type ComponentStyles = Record<EditableComponentID, any>;

export interface CustomComponent {
    id: string;
    name: string;
    baseComponent: EditableComponentID;
    styles: any;
    createdAt: { seconds: number; nanoseconds: number; };
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
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    status: LeadStatus;
    source: 'chatbot' | 'form' | 'manual';
    value?: number;
    notes?: string;
    color?: string;
    emojiMarker?: string;
    createdAt: { seconds: number; nanoseconds: number; };
    lastContacted?: { seconds: number; nanoseconds: number; };
    tags?: string[];
    aiScore?: number;
    aiAnalysis?: string;
    recommendedAction?: string;
}

// Onboarding Types
export type OnboardingStep = 'basics' | 'strategy' | 'aesthetic' | 'review' | 'generating';
export type AestheticType = 'Minimalist' | 'Bold' | 'Elegant' | 'Playful' | 'Tech' | 'Organic';

export interface OnboardingState {
    step: OnboardingStep;
    businessName: string;
    industry: string;
    summary: string;
    audience: string;
    offerings: string;
    goal: string;
    tone?: string;
    aesthetic: AestheticType;
    colorVibe: string; // e.g., "Trustworthy Blue", "Energetic Orange"
    designPlan?: any;
}

// Auth & User Types
export interface UserDocument {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  role?: 'user' | 'superadmin';
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

export interface AiAssistantConfig {
    agentName: string;
    tone: string;
    languages: string;
    businessProfile: string;
    productsServices: string;
    policiesContact: string;
    specialInstructions: string;
    faqs: FAQItem[];
    widgetColor: string;
    isActive: boolean;
    leadCaptureEnabled: boolean;
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
export type DomainStatus = 'active' | 'pending' | 'error';

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
    }[];
    createdAt: string;
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
}
