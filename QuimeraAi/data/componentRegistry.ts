import type { PageSection } from '../types/ui';
import type { PlanFeatures } from '../types/subscription';
import type { PlatformServiceId } from '../types/serviceAvailability';
import { FEATURE_VARIANT_PROMPT_VALUES } from './featureVariants';
import { FOOTER_VARIANT_PROMPT_VALUES } from './footerVariants';
import { PRICING_VARIANT_PROMPT_VALUES } from './pricingVariants';

export type ComponentRole =
    | 'hero'
    | 'offer'
    | 'trust'
    | 'conversion'
    | 'media'
    | 'industry'
    | 'ecommerce'
    | 'structure';

export type ComponentGoal =
    | 'leads'
    | 'bookings'
    | 'sales'
    | 'authority'
    | 'portfolio'
    | 'restaurant'
    | 'real-estate';

export interface ComponentImageSlot {
    path: string;
    aspectRatio: string;
    purpose: string;
}

export interface ComponentRegistryItem {
    id: PageSection;
    label: string;
    role: ComponentRole;
    industries: string[];
    goals: ComponentGoal[];
    incompatibleWith?: PageSection[];
    requiredWith?: PageSection[];
    imageSlots?: ComponentImageSlot[];
    promptHints: string;
    requiredService?: PlatformServiceId;
    requiredFeature?: keyof PlanFeatures;
    adminOnly?: boolean;
}

export interface ComponentAccessContext {
    canAccessService?: (serviceId: PlatformServiceId) => boolean;
    hasPlanFeature?: (feature: keyof PlanFeatures) => boolean;
    includeAdminOnly?: boolean;
}

const HERO_COMPONENTS: PageSection[] = ['hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead'];
const CRM_SERVICE = { requiredService: 'crm' as const, requiredFeature: 'crmEnabled' as const };
const ECOMMERCE_SERVICE = { requiredService: 'ecommerce' as const, requiredFeature: 'ecommerceEnabled' as const };
const CMS_SERVICE = { requiredService: 'cms' as const, requiredFeature: 'cmsEnabled' as const };
const REAL_ESTATE_SERVICE = { requiredService: 'realEstate' as const, requiredFeature: 'realEstateModule' as const };

export const QUIMERA_ADMIN_COMPONENTS: PageSection[] = [
    'heroQuimera', 'featuresQuimera', 'pricingQuimera', 'testimonialsQuimera', 'faqQuimera', 'ctaQuimera',
    'platformShowcaseQuimera', 'aiCapabilitiesQuimera', 'industrySolutionsQuimera', 'agencyWhiteLabelQuimera',
    'metricsQuimera', 'whatIsQuimera', 'templatesPreviewQuimera', 'aiWebStudioQuimera', 'contentManagerQuimera',
    'imageGeneratorQuimera', 'chatbotWorkflowQuimera', 'chatbotBuilderQuimera', 'leadsManagerQuimera',
    'appointmentsQuimera', 'bioPageQuimera', 'emailMarketingQuimera',
];

export const componentRegistry: ComponentRegistryItem[] = [
    {
        id: 'hero',
        label: 'Hero',
        role: 'hero',
        industries: ['all'],
        goals: ['leads', 'authority', 'sales'],
        incompatibleWith: HERO_COMPONENTS.filter(id => id !== 'hero'),
        imageSlots: [{ path: 'hero.imageUrl', aspectRatio: '16:9', purpose: 'main hero visual' }],
        promptHints: 'Flexible landing hero. Use variant classic, modern, gradient, cinematic, minimal, overlap, verticalSplit, or stacked based on brand.',
    },
    {
        id: 'heroSplit',
        label: 'Hero Split',
        role: 'hero',
        industries: ['consulting', 'healthcare', 'legal', 'beauty-spa', 'construction', 'education'],
        goals: ['leads', 'authority'],
        incompatibleWith: HERO_COMPONENTS.filter(id => id !== 'heroSplit'),
        imageSlots: [{ path: 'heroSplit.imageUrl', aspectRatio: '4:3', purpose: 'split hero image' }],
        promptHints: 'Split text/image hero for professional service brands that need clear messaging and visual trust.',
    },
    {
        id: 'heroGallery',
        label: 'Hero Gallery',
        role: 'hero',
        industries: ['restaurant', 'cafe', 'travel', 'real-estate', 'photography', 'fitness-gym'],
        goals: ['restaurant', 'portfolio', 'bookings', 'real-estate'],
        incompatibleWith: HERO_COMPONENTS.filter(id => id !== 'heroGallery'),
        imageSlots: [
            { path: 'heroGallery.slides.0.backgroundImage', aspectRatio: '16:9', purpose: 'first immersive hero slide' },
            { path: 'heroGallery.slides.1.backgroundImage', aspectRatio: '16:9', purpose: 'second immersive hero slide' },
        ],
        promptHints: 'Immersive multi-image hero. Best when the business has strong visual atmosphere, food, spaces, properties, fitness, or work samples.',
    },
    {
        id: 'heroWave',
        label: 'Hero Wave',
        role: 'hero',
        industries: ['technology', 'education', 'healthcare', 'consulting'],
        goals: ['authority', 'leads'],
        incompatibleWith: HERO_COMPONENTS.filter(id => id !== 'heroWave'),
        imageSlots: [
            { path: 'heroWave.slides.0.backgroundImage', aspectRatio: '16:9', purpose: 'abstract or branded wave hero background' },
            { path: 'heroWave.slides.1.backgroundImage', aspectRatio: '16:9', purpose: 'secondary wave hero background' },
        ],
        promptHints: 'Expressive gradient hero with organic waves. Use for modern, friendly, energetic brands.',
    },
    {
        id: 'heroNova',
        label: 'Hero Nova',
        role: 'hero',
        industries: ['portfolio', 'photography', 'fashion', 'travel', 'event-planning', 'technology'],
        goals: ['portfolio', 'authority'],
        incompatibleWith: HERO_COMPONENTS.filter(id => id !== 'heroNova'),
        imageSlots: [
            { path: 'heroNova.slides.0.backgroundImage', aspectRatio: '16:9', purpose: 'editorial hero background' },
            { path: 'heroNova.slides.1.backgroundImage', aspectRatio: '16:9', purpose: 'secondary editorial hero background' },
        ],
        promptHints: 'Editorial, cinematic hero for image-led brands and creative portfolios.',
    },
    {
        id: 'heroLead',
        label: 'Hero Lead',
        role: 'hero',
        industries: ['legal', 'real-estate', 'consulting', 'healthcare', 'finance', 'construction', 'education'],
        goals: ['leads', 'bookings', 'real-estate'],
        incompatibleWith: HERO_COMPONENTS.filter(id => id !== 'heroLead'),
        requiredWith: ['leads'],
        ...CRM_SERVICE,
        imageSlots: [{ path: 'heroLead.imageUrl', aspectRatio: '16:9', purpose: 'conversion hero background' }],
        promptHints: 'Split hero with integrated form. Best for lead-generation businesses, consultations, estimates, and appointments. Requires CRM service and plan access.',
    },
    { id: 'topBar', label: 'Top Bar', role: 'structure', industries: ['all'], goals: ['sales', 'leads'], promptHints: 'Announcement strip for promotions, urgent notices, shipping, booking, or trust messages.' },
    {
        id: 'logoBanner',
        label: 'Logo Banner',
        role: 'trust',
        industries: ['all'],
        goals: ['authority'],
        imageSlots: [
            { path: 'logoBanner.logos.0.imageUrl', aspectRatio: '1:1', purpose: 'partner logo' },
            { path: 'logoBanner.logos.1.imageUrl', aspectRatio: '1:1', purpose: 'partner logo' },
        ],
        promptHints: 'Trust strip for client, partner, press, or certification logos.',
    },
    {
        id: 'banner',
        label: 'Banner',
        role: 'media',
        industries: ['all'],
        goals: ['sales', 'leads', 'authority'],
        imageSlots: [{ path: 'banner.backgroundImageUrl', aspectRatio: '21:9', purpose: 'wide campaign banner background' }],
        promptHints: 'Optional promotional or transition banner. Do not force into every site.',
    },
    {
        id: 'features',
        label: 'Features',
        role: 'offer',
        industries: ['all'],
        goals: ['authority', 'leads', 'sales'],
        imageSlots: [
            { path: 'features.items.0.imageUrl', aspectRatio: '4:3', purpose: 'feature card image' },
            { path: 'features.items.1.imageUrl', aspectRatio: '4:3', purpose: 'feature card image' },
            { path: 'features.items.2.imageUrl', aspectRatio: '4:3', purpose: 'feature card image' },
            { path: 'features.items.3.imageUrl', aspectRatio: '4:3', purpose: 'feature card image' },
        ],
        promptHints: `Benefits and differentiators. Generate at least 4 items with title, description, icon, optional eyebrow/bullets, and imageUrl. Valid featuresVariant values: ${FEATURE_VARIANT_PROMPT_VALUES}. Use image-led variants when visuals matter and icon/list variants for compact proof.`,
    },
    { id: 'services', label: 'Services', role: 'offer', industries: ['all'], goals: ['leads', 'authority'], promptHints: 'Concrete services or offers. Use real service names from the brief or imported site.' },
    {
        id: 'testimonials',
        label: 'Testimonials',
        role: 'trust',
        industries: ['all'],
        goals: ['authority', 'leads', 'sales'],
        imageSlots: [{ path: 'testimonials.items.0.imageUrl', aspectRatio: '1:1', purpose: 'customer portrait' }],
        promptHints: 'Social proof. Use specific customer outcomes when available. Use editorial-mosaic for premium, visual, press-like, or portrait-backed testimonial walls.',
    },
    { id: 'pricing', label: 'Pricing', role: 'conversion', industries: ['technology', 'consulting', 'fitness-gym', 'education', 'beauty-spa', 'finance', 'retail'], goals: ['sales', 'leads'], promptHints: `Pricing tiers or packages. Use only if pricing or package structure makes sense. Valid pricingVariant values: ${PRICING_VARIANT_PROMPT_VALUES}. Prefer finance-comparison for loans/financing, subscription-shop for product subscriptions, workflow-rows for service packages, and SaaS card variants for software plans.` },
    { id: 'faq', label: 'FAQ', role: 'trust', industries: ['all'], goals: ['authority', 'leads', 'sales'], promptHints: 'Objection handling and buyer questions. Use specific industry questions.' },
    { id: 'cta', label: 'CTA', role: 'conversion', industries: ['all'], goals: ['leads', 'bookings', 'sales'], promptHints: 'Strong conversion section with primary and secondary CTA.' },
    {
        id: 'portfolio',
        label: 'Portfolio',
        role: 'media',
        industries: ['photography', 'portfolio', 'agency', 'construction', 'beauty-spa', 'architecture', 'event-planning'],
        goals: ['portfolio', 'authority'],
        imageSlots: [
            { path: 'portfolio.items.0.imageUrl', aspectRatio: '4:3', purpose: 'portfolio project image' },
            { path: 'portfolio.items.1.imageUrl', aspectRatio: '4:3', purpose: 'portfolio project image' },
            { path: 'portfolio.items.2.imageUrl', aspectRatio: '4:3', purpose: 'portfolio project image' },
        ],
        promptHints: 'Project/work showcase. Use when proof of work matters.',
    },
    {
        id: 'showcase',
        label: 'Showcase',
        role: 'media',
        industries: ['all', 'portfolio', 'agency', 'creative-studio', 'ecommerce', 'restaurant', 'fashion', 'architecture', 'technology', 'education', 'media'],
        goals: ['portfolio', 'authority', 'sales'],
        imageSlots: [
            { path: 'showcase.items.0.imageUrl', aspectRatio: '4:3', purpose: 'featured showcase image' },
            { path: 'showcase.items.1.imageUrl', aspectRatio: '4:3', purpose: 'showcase grid image' },
            { path: 'showcase.items.2.imageUrl', aspectRatio: '4:3', purpose: 'showcase grid image' },
            { path: 'showcase.items.3.imageUrl', aspectRatio: '4:3', purpose: 'showcase grid image' },
            { path: 'showcase.items.4.imageUrl', aspectRatio: '4:5', purpose: 'editorial showcase image' },
        ],
        promptHints: 'Curated visual showcase inspired by editorial indexes, product rows, case-study grids, vertical strips, and dark carousels. Use variants featured-device, curated-row, editorial-stack, vertical-strips, dark-carousel, minimal-index, case-grid-dark, or recent-work when the site needs image-led proof beyond a simple portfolio.',
    },
    {
        id: 'team',
        label: 'Team',
        role: 'trust',
        industries: ['consulting', 'healthcare', 'legal', 'education', 'agency', 'finance'],
        goals: ['authority', 'leads'],
        imageSlots: [
            { path: 'team.items.0.imageUrl', aspectRatio: '1:1', purpose: 'team member portrait' },
            { path: 'team.items.1.imageUrl', aspectRatio: '1:1', purpose: 'team member portrait' },
        ],
        promptHints: 'Team and experts section. Use when people are part of the trust story.',
    },
    {
        id: 'slideshow',
        label: 'Slideshow',
        role: 'media',
        industries: ['restaurant', 'travel', 'photography', 'real-estate', 'event-planning', 'fitness-gym'],
        goals: ['portfolio', 'restaurant', 'real-estate'],
        imageSlots: [{ path: 'slideshow.items.0.imageUrl', aspectRatio: '16:9', purpose: 'gallery slideshow image' }],
        promptHints: 'Gallery or ambience showcase. Use only when visual proof improves conversion.',
    },
    { id: 'video', label: 'Video', role: 'media', industries: ['all'], goals: ['authority', 'sales'], promptHints: 'Embedded video or promo section when video content exists or should be highlighted.' },
    { id: 'howItWorks', label: 'How It Works', role: 'offer', industries: ['all'], goals: ['leads', 'authority'], promptHints: 'Process steps. Use to clarify service flow, bookings, onboarding, or delivery.' },
    { id: 'leads', label: 'Leads', role: 'conversion', industries: ['all'], goals: ['leads', 'bookings', 'real-estate'], ...CRM_SERVICE, promptHints: 'Contact/lead form. Use for service, local, real estate, and consultation businesses. Requires CRM service and plan access.' },
    { id: 'newsletter', label: 'Newsletter', role: 'conversion', industries: ['education', 'media', 'retail', 'fashion', 'technology'], goals: ['authority', 'sales'], requiredService: 'emailMarketing', requiredFeature: 'emailMarketing', promptHints: 'Email signup. Only suggest when email marketing service and plan access are available.' },
    { id: 'map', label: 'Map', role: 'conversion', industries: ['restaurant', 'healthcare', 'beauty-spa', 'fitness-gym', 'legal', 'real-estate', 'retail'], goals: ['leads', 'bookings', 'restaurant', 'real-estate'], promptHints: 'Location map and contact details. Use only when the business has a physical/service location.' },
    { id: 'signupFloat', label: 'Signup Float', role: 'conversion', industries: ['technology', 'education', 'retail'], goals: ['leads', 'sales'], ...CRM_SERVICE, promptHints: 'Floating signup widget. Use sparingly for campaigns or launches. Requires CRM service and plan access.' },
    {
        id: 'menu',
        label: 'Menu',
        role: 'industry',
        industries: ['restaurant', 'cafe', 'food-products'],
        goals: ['restaurant', 'bookings', 'sales'],
        requiredService: 'restaurants',
        imageSlots: [
            { path: 'menu.items.0.imageUrl', aspectRatio: '4:3', purpose: 'menu item image' },
            { path: 'menu.items.1.imageUrl', aspectRatio: '4:3', purpose: 'menu item image' },
            { path: 'menu.items.2.imageUrl', aspectRatio: '4:3', purpose: 'menu item image' },
            { path: 'menu.items.3.imageUrl', aspectRatio: '4:3', purpose: 'menu item image' },
            { path: 'menu.items.4.imageUrl', aspectRatio: '4:3', purpose: 'menu item image' },
            { path: 'menu.items.5.imageUrl', aspectRatio: '4:3', purpose: 'menu item image' },
        ],
        promptHints: 'Restaurant or cafe menu section with item photos. Use editorial-mosaic for premium magazine-style dish walls. Only suggest when Restaurants service is available.',
    },
    { id: 'restaurantReservation', label: 'Restaurant Reservation', role: 'industry', industries: ['restaurant', 'cafe'], goals: ['restaurant', 'bookings'], requiredService: 'restaurants', requiredWith: ['menu'], imageSlots: [{ path: 'restaurantReservation.backgroundImageUrl', aspectRatio: '16:9', purpose: 'restaurant reservation background' }], promptHints: 'Reservation form for restaurants/cafes. Requires Restaurants service availability.' },
    { id: 'realEstateListings', label: 'Real Estate Listings', role: 'industry', industries: ['real-estate'], goals: ['real-estate', 'leads'], requiredService: 'realEstate', requiredFeature: 'realEstateModule', requiredWith: ['leads'], promptHints: 'Property listing section connected to Real Estate OS. Requires service and plan access.' },
    { id: 'appointmentBooking', label: 'Appointment Booking', role: 'conversion', industries: ['all'], goals: ['bookings', 'leads'], requiredService: 'appointments', promptHints: 'Appointment booking section. Requires Appointments service availability.' },
    { id: 'separator1', label: 'Separator 1', role: 'structure', industries: ['all'], goals: ['authority'], promptHints: 'Decorative separator for visual rhythm.' },
    { id: 'separator2', label: 'Separator 2', role: 'structure', industries: ['all'], goals: ['authority'], promptHints: 'Decorative separator for visual rhythm.' },
    { id: 'separator3', label: 'Separator 3', role: 'structure', industries: ['all'], goals: ['authority'], promptHints: 'Decorative separator for visual rhythm.' },
    { id: 'separator4', label: 'Separator 4', role: 'structure', industries: ['all'], goals: ['authority'], promptHints: 'Decorative separator for visual rhythm.' },
    { id: 'separator5', label: 'Separator 5', role: 'structure', industries: ['all'], goals: ['authority'], promptHints: 'Decorative separator for visual rhythm.' },
    { id: 'announcementBar', label: 'Announcement Bar', role: 'ecommerce', industries: ['ecommerce', 'retail', 'fashion', 'jewelry', 'electronics'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Ecommerce announcement strip for promotions, shipping, and sales.' },
    { id: 'storeSettings', label: 'Store Settings', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Storefront settings and ecommerce shell controls. Requires ecommerce service and plan access.' },
    { id: 'products', label: 'Products', role: 'ecommerce', industries: ['ecommerce', 'retail', 'fashion', 'jewelry', 'electronics'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Products section connected to the ecommerce catalog. Requires ecommerce service and plan access.' },
    { id: 'productHero', label: 'Product Hero', role: 'ecommerce', industries: ['ecommerce', 'retail', 'fashion', 'jewelry', 'electronics'], goals: ['sales'], ...ECOMMERCE_SERVICE, imageSlots: [{ path: 'productHero.backgroundImageUrl', aspectRatio: '16:9', purpose: 'featured product hero image' }], promptHints: 'Featured product or collection hero. Requires ecommerce service and plan access.' },
    { id: 'featuredProducts', label: 'Featured Products', role: 'ecommerce', industries: ['ecommerce', 'retail', 'fashion', 'jewelry', 'electronics'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Featured products grid/carousel. Requires ecommerce service and plan access.' },
    { id: 'categoryGrid', label: 'Category Grid', role: 'ecommerce', industries: ['ecommerce', 'retail', 'fashion', 'jewelry', 'electronics'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Product category navigation. Requires ecommerce service and plan access.' },
    { id: 'trustBadges', label: 'Trust Badges', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales', 'authority'], ...ECOMMERCE_SERVICE, promptHints: 'Shipping, security, returns, and guarantee badges for ecommerce.' },
    { id: 'saleCountdown', label: 'Sale Countdown', role: 'ecommerce', industries: ['ecommerce', 'retail', 'fashion'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Urgency section for sale events. Requires ecommerce service and plan access.' },
    { id: 'collectionBanner', label: 'Collection Banner', role: 'ecommerce', industries: ['ecommerce', 'retail', 'fashion'], goals: ['sales'], ...ECOMMERCE_SERVICE, imageSlots: [{ path: 'collectionBanner.backgroundImageUrl', aspectRatio: '21:9', purpose: 'product collection campaign image' }], promptHints: 'Collection campaign banner. Requires ecommerce service and plan access.' },
    { id: 'recentlyViewed', label: 'Recently Viewed', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Recently viewed products. Best for stores with product browsing.' },
    { id: 'productReviews', label: 'Product Reviews', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales', 'authority'], ...ECOMMERCE_SERVICE, promptHints: 'Product review/social proof section. Requires ecommerce service and plan access.' },
    { id: 'productBundle', label: 'Product Bundle', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Product bundle/upsell section. Requires ecommerce service and plan access.' },
    { id: 'productDetail', label: 'Product Detail', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Product detail page section. Requires ecommerce service and plan access.' },
    { id: 'categoryProducts', label: 'Category Products', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Category products page section. Requires ecommerce service and plan access.' },
    { id: 'productGrid', label: 'Product Grid', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Catalog product grid section. Requires ecommerce service and plan access.' },
    { id: 'cart', label: 'Cart', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Cart page section. Requires ecommerce service and plan access.' },
    { id: 'checkout', label: 'Checkout', role: 'ecommerce', industries: ['ecommerce', 'retail'], goals: ['sales'], ...ECOMMERCE_SERVICE, promptHints: 'Checkout page section. Requires ecommerce service and plan access.' },
    { id: 'footer', label: 'Footer', role: 'structure', industries: ['all'], goals: ['leads', 'bookings', 'sales', 'authority', 'portfolio', 'restaurant', 'real-estate'], promptHints: `Required global footer. Valid footerVariant values: ${FOOTER_VARIANT_PROMPT_VALUES}. Use brand-rich variants for product/creative sites, compliance-wordmark or press-landscape for legal/finance/regulated brands, cta-card or grid-newsletter for conversion, and social-directory for communities.` },
    { id: 'propertyDirectory', label: 'Property Directory', role: 'industry', industries: ['real-estate'], goals: ['real-estate', 'leads'], ...REAL_ESTATE_SERVICE, promptHints: 'Real estate public directory page. Requires Realty service and plan access.' },
    { id: 'propertyDetail', label: 'Property Detail', role: 'industry', industries: ['real-estate'], goals: ['real-estate', 'leads'], ...REAL_ESTATE_SERVICE, promptHints: 'Real estate property detail page. Requires Realty service and plan access.' },
    { id: 'articleContent', label: 'Article Content', role: 'media', industries: ['education', 'media', 'technology', 'consulting'], goals: ['authority'], ...CMS_SERVICE, promptHints: 'Article content page section. Requires CMS service and plan access.' },
    { id: 'chatbot', label: 'Chatbot', role: 'conversion', industries: ['all'], goals: ['leads', 'bookings', 'sales'], requiredService: 'chatbot', requiredFeature: 'chatbotEnabled', promptHints: 'AI assistant widget configuration. Only use when chatbot service and plan access are available.' },
    { id: 'cmsFeed', label: 'CMS Feed', role: 'media', industries: ['education', 'media', 'technology', 'consulting'], goals: ['authority'], ...CMS_SERVICE, promptHints: 'Dynamic CMS/blog feed. Only use when CMS service and plan access are available.' },
];

export function canAccessRegistryItem(item: ComponentRegistryItem, access: ComponentAccessContext = {}): boolean {
    if (item.adminOnly && !access.includeAdminOnly) return false;
    if (QUIMERA_ADMIN_COMPONENTS.includes(item.id) && !access.includeAdminOnly) return false;
    if (item.requiredService && (!access.canAccessService || !access.canAccessService(item.requiredService))) return false;
    if (item.requiredFeature && (!access.hasPlanFeature || !access.hasPlanFeature(item.requiredFeature))) return false;
    return true;
}

export function getPublicComponentRegistry(): ComponentRegistryItem[] {
    return componentRegistry.filter(item => !item.adminOnly && !QUIMERA_ADMIN_COMPONENTS.includes(item.id));
}

export function getAccessibleComponentRegistry(access: ComponentAccessContext = {}): ComponentRegistryItem[] {
    return getPublicComponentRegistry().filter(item => canAccessRegistryItem(item, access));
}

export function filterAccessibleSections(sections: PageSection[], access: ComponentAccessContext = {}): PageSection[] {
    const accessible = new Set(getAccessibleComponentRegistry(access).map(item => item.id));
    return sections.filter(section => ['colors', 'typography', 'header', 'footer'].includes(section) || accessible.has(section));
}

export function getRegistryItem(section: PageSection): ComponentRegistryItem | undefined {
    return componentRegistry.find(item => item.id === section);
}

export function registryToPromptList(items: ComponentRegistryItem[]): string {
    return items
        .map(item => {
            const gates = [
                item.requiredService ? `service:${item.requiredService}` : '',
                item.requiredFeature ? `plan:${String(item.requiredFeature)}` : '',
            ].filter(Boolean).join(', ');
            return `- ${item.id} (${item.role}${gates ? `; gated by ${gates}` : ''}): ${item.promptHints}`;
        })
        .join('\n');
}
