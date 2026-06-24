import type {
    ComponentAnatomyEntry,
    ComponentBackgroundOption,
    ComponentContentDensity,
    ComponentLayoutVariantDefinition,
    ComponentMediaOption,
    ComponentMobileBehavior,
    ComponentSlotDefinition,
    ComponentStyleVariantDefinition,
} from '../types/componentAnatomy';
import type { ComponentId, ComponentRegistryFamily, PageIntent } from '../types/componentRegistry';

const slot = (id: string, label: string, kind: ComponentSlotDefinition['kind'], required = false, dataPath?: string): ComponentSlotDefinition => ({
    id,
    label,
    kind,
    required,
    dataPath,
});

const variant = (
    id: string,
    label: string,
    description: string,
    recommendedSlots: string[],
    bestForPageIntents: PageIntent[],
    bestForIndustries: string[] = ['all'],
    mobileBehavior: ComponentMobileBehavior = 'stackedMobile',
    avoidWhen: string[] = [],
): ComponentLayoutVariantDefinition => ({
    id,
    label,
    description,
    recommendedSlots,
    bestForIndustries,
    bestForPageIntents,
    avoidWhen,
    mobileBehavior,
});

const style = (id: string, label: string, description: string, bestForIndustries: string[] = ['all']): ComponentStyleVariantDefinition => ({
    id,
    label,
    description,
    bestForIndustries,
});

const commonStyles = [
    style('clean', 'Clean', 'Restrained, neutral, high-readability treatment.'),
    style('editorial', 'Editorial', 'Image-led layout with more whitespace and narrative rhythm.', ['restaurant', 'portfolio', 'premium_retail']),
    style('premiumRetail', 'Premium Retail', 'Product-led polish with restrained copy and strong imagery.', ['premium_retail', 'electric_bikes', 'fashion', 'beauty']),
    style('localTrust', 'Local Trust', 'Clear service proof, location cues, and practical CTAs.', ['local_business', 'services', 'restaurant']),
    style('aiSaas', 'AI SaaS', 'Crisp software presentation with structured features and technical trust.', ['ai_saas']),
];

const controls = (slots: string[]) => slots.map(slotId => ({
    slotId,
    controls: ['visibility', 'copy', 'spacing', 'alignment', 'themeTone'],
}));

const anatomy = (input: {
    componentId: ComponentId;
    family: ComponentRegistryFamily;
    description: string;
    availableSlots: ComponentSlotDefinition[];
    layoutVariants: ComponentLayoutVariantDefinition[];
    styleVariants?: ComponentStyleVariantDefinition[];
    backgroundOptions?: ComponentBackgroundOption[];
    mediaOptions?: ComponentMediaOption[];
    contentDensityOptions?: ComponentContentDensity[];
    mobileBehaviorOptions?: ComponentMobileBehavior[];
    bestForIndustries?: string[];
    bestForPageIntents?: PageIntent[];
    avoidWhen?: string[];
    compatibleThemePresets?: string[];
    compatibleDesignPatterns?: string[];
    defaultVariant?: string;
    fallbackVariant?: string;
    aiGuidance?: string[];
    antiPatterns?: string[];
}): ComponentAnatomyEntry => {
    const requiredSlots = input.availableSlots.filter(item => item.required).map(item => item.id);
    const optionalSlots = input.availableSlots.filter(item => !item.required).map(item => item.id);

    return {
        styleVariants: commonStyles,
        backgroundOptions: ['plain', 'surface', 'brandTint'],
        mediaOptions: ['none'],
        contentDensityOptions: ['minimal', 'balanced', 'rich'],
        mobileBehaviorOptions: ['stackedMobile', 'priorityContent'],
        bestForIndustries: ['all'],
        bestForPageIntents: ['website_home'],
        avoidWhen: [],
        compatibleThemePresets: ['minimal', 'editorial', 'luxury', 'fitness', 'food', 'services', 'realEstate', 'digital'],
        compatibleDesignPatterns: [],
        defaultVariant: input.layoutVariants[0]?.id || 'default',
        fallbackVariant: input.layoutVariants[0]?.id || 'default',
        aiGuidance: ['Use only registered layout variants, style variants, slots, and mobile behaviors for this component.'],
        antiPatterns: ['Do not invent unsupported slots, variants, fake business data, or renderer behavior.'],
        ...input,
        requiredSlots,
        optionalSlots,
        editorControlsMap: controls(input.availableSlots.map(item => item.id)),
    };
};

export const componentAnatomyRegistry: Record<ComponentId, ComponentAnatomyEntry> = {
    header: anatomy({
        componentId: 'header',
        family: 'global_layout',
        description: 'Global navigation anatomy for website/storefront entry points.',
        availableSlots: [
            slot('brand', 'Brand mark/name', 'navigation', true),
            slot('navLinks', 'Navigation links', 'navigation'),
            slot('primaryAction', 'Primary nav CTA', 'cta'),
            slot('utilityLinks', 'Utility links', 'navigation'),
        ],
        layoutVariants: [
            variant('simpleNav', 'Simple Nav', 'Logo, links, and one CTA.', ['brand', 'navLinks', 'primaryAction'], ['website_home', 'service_landing', 'ai_saas_landing']),
            variant('commerceNav', 'Commerce Nav', 'Store navigation with route and cart affordances.', ['brand', 'navLinks', 'primaryAction', 'utilityLinks'], ['ecommerce_home', 'storefront_home']),
            variant('centeredLogo', 'Centered Logo', 'Balanced brand-forward navigation.', ['brand', 'navLinks'], ['portfolio_home', 'restaurant_home']),
        ],
        mobileBehaviorOptions: ['priorityContent', 'compactStrip'],
    }),
    hero: anatomy({
        componentId: 'hero',
        family: 'website_content',
        description: 'First-screen statement with flexible media, proof, and CTA slots.',
        availableSlots: [
            slot('eyebrow', 'Eyebrow', 'content'),
            slot('headline', 'Headline', 'content', true, 'businessProfile.tagline'),
            slot('subheadline', 'Subheadline', 'content', true, 'businessProfile.description'),
            slot('primaryCta', 'Primary CTA', 'cta', true),
            slot('secondaryCta', 'Secondary CTA', 'cta'),
            slot('media', 'Hero media', 'media'),
            slot('proof', 'Proof cues', 'trust'),
            slot('form', 'Embedded form', 'form'),
        ],
        layoutVariants: [
            variant('centeredMinimal', 'Centered Minimal', 'Centered text-first hero for simple informational pages.', ['headline', 'subheadline', 'primaryCta'], ['website_home', 'blog_home'], ['all'], 'stackedMobile', ['premium retail', 'restaurant', 'gallery', 'product-led ecommerce']),
            variant('splitMediaRight', 'Split Media Right', 'Copy left, media right for services, SaaS, and products.', ['headline', 'subheadline', 'primaryCta', 'media', 'proof'], ['service_landing', 'ai_saas_landing', 'ecommerce_home'], ['services', 'ai_saas', 'premium_retail']),
            variant('splitMediaLeft', 'Split Media Left', 'Media left, copy right for editorial or local business rhythm.', ['headline', 'subheadline', 'primaryCta', 'media'], ['restaurant_home', 'local_business_home', 'portfolio_home'], ['restaurant', 'local_business', 'portfolio']),
            variant('editorialOverlay', 'Editorial Overlay', 'Text over strong imagery with restrained copy and contrast.', ['headline', 'subheadline', 'primaryCta', 'media'], ['restaurant_home', 'portfolio_home', 'gallery_home'], ['restaurant', 'portfolio', 'gallery'], 'priorityContent'),
            variant('productSpotlight', 'Product Spotlight', 'Product-led hero with media, trust, and purchase route.', ['headline', 'subheadline', 'primaryCta', 'media', 'proof'], ['ecommerce_home', 'storefront_home', 'product_detail'], ['premium_retail', 'electric_bikes', 'ecommerce'], 'priorityContent'),
            variant('gradientOrb', 'AI SaaS Gradient', 'Software hero with abstract lighting, concise value prop, and feature proof.', ['headline', 'subheadline', 'primaryCta', 'secondaryCta', 'proof'], ['ai_saas_landing'], ['ai_saas'], 'stackedMobile', ['non-technology local service pages']),
            variant('imageBackground', 'Image Background', 'Full-width image-backed hero with overlay and clear CTA.', ['headline', 'subheadline', 'primaryCta', 'media'], ['restaurant_home', 'gallery_home', 'real_estate_home'], ['restaurant', 'gallery', 'real_estate'], 'priorityContent'),
            variant('stackedMobile', 'Stacked Mobile', 'Mobile-first stacked hero when media must follow copy.', ['headline', 'subheadline', 'primaryCta', 'media'], ['website_home', 'service_landing'], ['all'], 'stackedMobile'),
        ],
        backgroundOptions: ['plain', 'surface', 'brandTint', 'image', 'imageOverlay', 'gradient'],
        mediaOptions: ['none', 'singleImage', 'productMedia', 'gallery', 'video'],
        compatibleDesignPatterns: ['premium_retail_product', 'editorial_split_landing', 'restaurant_warm_editorial', 'ai_saas_gradient', 'real_estate_lead_generation'],
        aiGuidance: ['Hero variants must reflect page intent. Avoid centeredMinimal for premium, restaurant, real estate, gallery, or ecommerce pages.'],
        antiPatterns: ['Do not use fake review stats or fake customer counts in proof slot.'],
    }),
    about: anatomy({
        componentId: 'about',
        family: 'website_content',
        description: 'Story and positioning section.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('body', 'Body copy', 'content', true),
            slot('media', 'Image/media', 'media'),
            slot('stats', 'Stats', 'trust'),
            slot('timeline', 'Timeline', 'data'),
        ],
        layoutVariants: [
            variant('textOnly', 'Text Only', 'Concise story without media.', ['headline', 'body'], ['website_home', 'service_landing']),
            variant('imageLeft', 'Image Left', 'Image-led story with copy to the right.', ['headline', 'body', 'media'], ['restaurant_home', 'portfolio_home']),
            variant('imageRight', 'Image Right', 'Copy-led story with supporting image.', ['headline', 'body', 'media'], ['service_landing', 'local_business_home']),
            variant('founderStory', 'Founder Story', 'Personal founder or expert narrative.', ['headline', 'body', 'media'], ['local_business_home', 'service_landing']),
            variant('timeline', 'Timeline', 'Chronological origin or process story.', ['headline', 'body', 'timeline'], ['website_home', 'service_landing']),
            variant('statsGrid', 'Stats Grid', 'Story plus sourced stats.', ['headline', 'body', 'stats'], ['ai_saas_landing', 'real_estate_home']),
            variant('editorialStatement', 'Editorial Statement', 'Large editorial statement with restrained detail.', ['headline', 'body'], ['portfolio_home', 'restaurant_home']),
        ],
        mediaOptions: ['none', 'singleImage', 'gallery'],
        compatibleDesignPatterns: ['editorial_split_landing', 'modern_local_business', 'creative_agency_editorial'],
    }),
    services: anatomy({
        componentId: 'services',
        family: 'website_content',
        description: 'Offer, service, or package selection section.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('description', 'Description', 'content'),
            slot('items', 'Service items', 'data', true, 'businessProfile.services'),
            slot('cta', 'CTA', 'cta'),
            slot('media', 'Media', 'media'),
        ],
        layoutVariants: [
            variant('cardsGrid', 'Cards Grid', 'Grid of service cards.', ['headline', 'description', 'items'], ['service_landing', 'website_home']),
            variant('iconFeatureList', 'Icon Feature List', 'Compact service/value list.', ['headline', 'items'], ['local_business_home', 'ai_saas_landing']),
            variant('horizontalRows', 'Horizontal Rows', 'Detailed rows for service comparison.', ['headline', 'items', 'cta'], ['service_landing', 'restaurant_home']),
            variant('processSteps', 'Process Steps', 'Services expressed as steps.', ['headline', 'items', 'cta'], ['appointment_landing', 'service_landing']),
            variant('pricingLike', 'Pricing-Like', 'Packages or tiers without implying live checkout.', ['headline', 'items', 'cta'], ['service_landing']),
            variant('splitWithCTA', 'Split With CTA', 'Offer explanation paired with CTA/media.', ['headline', 'description', 'items', 'cta', 'media'], ['service_landing', 'ecommerce_home']),
        ],
        mediaOptions: ['none', 'singleImage', 'iconSet'],
        compatibleDesignPatterns: ['local_service_trust', 'appointment_service_landing', 'modern_local_business'],
    }),
    features: anatomy({
        componentId: 'features',
        family: 'website_content',
        description: 'Feature and value proposition section.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('items', 'Feature items', 'data', true),
            slot('media', 'Media', 'media'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('cardsGrid', 'Cards Grid', 'Feature cards with concise proof.', ['headline', 'items'], ['website_home', 'ai_saas_landing']),
            variant('bentoGrid', 'Bento Grid', 'Varied feature grid with hierarchy.', ['headline', 'items', 'media'], ['ai_saas_landing', 'ecommerce_home']),
            variant('editorialMosaic', 'Editorial Mosaic', 'Magazine-style masonry with photo cards and text proof tiles.', ['headline', 'items', 'media'], ['website_home', 'portfolio_home', 'restaurant_home'], ['premium_retail', 'restaurant', 'portfolio']),
            variant('splitWithFeatureList', 'Split Feature List', 'Media and prioritized feature list.', ['headline', 'items', 'media'], ['service_landing', 'ai_saas_landing']),
            variant('compactRows', 'Compact Rows', 'Dense but scannable rows.', ['headline', 'items'], ['local_business_home']),
        ],
        mediaOptions: ['none', 'singleImage', 'iconSet', 'video'],
        compatibleDesignPatterns: ['clean_saas_editor', 'ai_saas_gradient'],
    }),
    testimonials: anatomy({
        componentId: 'testimonials',
        family: 'website_content',
        description: 'Social proof section that must avoid fake reviews.',
        availableSlots: [
            slot('headline', 'Headline', 'content'),
            slot('quotes', 'Quotes', 'data', true),
            slot('logos', 'Logos', 'trust'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('quoteGrid', 'Quote Grid', 'Grid of short quote cards.', ['headline', 'quotes'], ['service_landing', 'local_business_home']),
            variant('singleFeatureQuote', 'Single Feature Quote', 'One strong quote with attribution.', ['headline', 'quotes'], ['website_home', 'portfolio_home']),
            variant('carousel', 'Carousel', 'Scrollable proof for many quotes.', ['headline', 'quotes'], ['ecommerce_home', 'service_landing'], ['all'], 'carouselMobile'),
            variant('logoWallWithQuotes', 'Logo Wall With Quotes', 'Logos plus selected quote proof.', ['headline', 'logos', 'quotes'], ['ai_saas_landing']),
            variant('editorialMosaic', 'Editorial Mosaic', 'Masonry proof wall with portrait quote cards and text tiles.', ['headline', 'quotes', 'logos'], ['website_home', 'portfolio_home', 'restaurant_home'], ['premium_retail', 'restaurant', 'portfolio']),
            variant('editorialProof', 'Editorial Proof', 'Long-form proof note for premium/editorial pages.', ['headline', 'quotes'], ['restaurant_home', 'portfolio_home']),
        ],
        backgroundOptions: ['plain', 'surface', 'brandTint'],
        mediaOptions: ['none'],
        compatibleDesignPatterns: ['local_service_trust', 'clean_saas_editor', 'premium_retail_product'],
        antiPatterns: ['Do not create fake reviewer names, fake ratings, or fake logos.'],
    }),
    faq: anatomy({
        componentId: 'faq',
        family: 'website_content',
        description: 'Objection handling and operational clarity.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('items', 'FAQ items', 'data', true),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('accordion', 'Accordion', 'Mobile-friendly expandable FAQ.', ['headline', 'items'], ['service_landing', 'ecommerce_home'], ['all'], 'accordionMobile'),
            variant('twoColumn', 'Two Column', 'Split list for scannable questions.', ['headline', 'items'], ['ai_saas_landing', 'website_home']),
            variant('supportCTA', 'Support CTA', 'FAQ with final contact CTA.', ['headline', 'items', 'cta'], ['lead_capture', 'local_business_home']),
        ],
        mobileBehaviorOptions: ['accordionMobile', 'stackedMobile'],
    }),
    footer: anatomy({
        componentId: 'footer',
        family: 'global_layout',
        description: 'Final global navigation and compliance surface.',
        availableSlots: [
            slot('brand', 'Brand', 'navigation', true),
            slot('links', 'Footer links', 'navigation'),
            slot('contact', 'Contact info', 'content'),
            slot('newsletter', 'Newsletter', 'form'),
            slot('legal', 'Legal', 'content'),
        ],
        layoutVariants: [
            variant('simpleFooter', 'Simple Footer', 'Compact footer for lean pages.', ['brand', 'links', 'legal'], ['website_home', 'service_landing']),
            variant('multiColumn', 'Multi Column', 'Navigation-rich footer.', ['brand', 'links', 'contact', 'legal'], ['ecommerce_home', 'ai_saas_landing']),
            variant('newsletterFooter', 'Newsletter Footer', 'Footer with email capture.', ['brand', 'links', 'newsletter', 'legal'], ['blog_home', 'ecommerce_home']),
        ],
        mobileBehaviorOptions: ['stackedMobile', 'accordionMobile'],
    }),
    featuredProducts: anatomy({
        componentId: 'featuredProducts',
        family: 'website_ecommerce_block',
        description: 'Product discovery block that reads from Ecommerce Engine only.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('description', 'Description', 'content'),
            slot('products', 'Products', 'data', true, 'ecommerceBlueprint.starterProducts'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('carousel', 'Carousel', 'Scrollable product row.', ['headline', 'products', 'cta'], ['ecommerce_home'], ['ecommerce', 'marketplace'], 'carouselMobile'),
            variant('grid', 'Grid', 'Standard product grid.', ['headline', 'description', 'products', 'cta'], ['ecommerce_home', 'storefront_home']),
            variant('editorialProductSpotlight', 'Editorial Product Spotlight', 'One lead product plus support products.', ['headline', 'description', 'products', 'cta'], ['ecommerce_home'], ['premium_retail']),
            variant('compactStrip', 'Compact Strip', 'Compact product strip.', ['headline', 'products'], ['ecommerce_home'], ['marketplace'], 'compactStrip'),
            variant('categoryPreview', 'Category Preview', 'Products grouped by category.', ['headline', 'products', 'cta'], ['ecommerce_home', 'product_collection']),
            variant('premiumCards', 'Premium Cards', 'Large image-first cards for high-value products.', ['headline', 'description', 'products', 'cta'], ['ecommerce_home'], ['premium_retail', 'electric_bikes']),
        ],
        styleVariants: commonStyles,
        backgroundOptions: ['plain', 'surface', 'brandTint'],
        mediaOptions: ['productMedia'],
        compatibleDesignPatterns: ['premium_retail_product', 'ecommerce_conversion_home', 'marketplace_catalog'],
        antiPatterns: ['Do not show products if there are no real products or reviewable product drafts.'],
    }),
    categoryShowcase: anatomy({
        componentId: 'categoryShowcase',
        family: 'website_ecommerce_block',
        description: 'Category/collection discovery section.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('categories', 'Categories', 'data', true, 'ecommerceBlueprint.productCategories'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('cardsGrid', 'Cards Grid', 'Category cards grid.', ['headline', 'categories'], ['ecommerce_home']),
            variant('editorialTiles', 'Editorial Tiles', 'Image-led category tiles.', ['headline', 'categories', 'cta'], ['ecommerce_home'], ['premium_retail']),
            variant('compactList', 'Compact List', 'Compact category list for dense catalogs.', ['headline', 'categories'], ['product_collection'], ['marketplace']),
        ],
        mediaOptions: ['imageGrid', 'productMedia'],
        compatibleDesignPatterns: ['marketplace_catalog', 'ecommerce_conversion_home'],
    }),
    productCarousel: anatomy({
        componentId: 'productCarousel',
        family: 'website_ecommerce_block',
        description: 'Carousel for sufficient product depth.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('products', 'Products', 'data', true, 'ecommerceBlueprint.starterProducts'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('carousel', 'Carousel', 'Horizontal product carousel.', ['headline', 'products', 'cta'], ['ecommerce_home'], ['ecommerce'], 'carouselMobile'),
            variant('compactStrip', 'Compact Strip', 'Small product strip.', ['headline', 'products'], ['ecommerce_home'], ['marketplace'], 'compactStrip'),
            variant('premiumCards', 'Premium Cards', 'Premium image-first product carousel/cards.', ['headline', 'products', 'cta'], ['ecommerce_home'], ['premium_retail'], 'carouselMobile'),
        ],
        mediaOptions: ['productMedia'],
    }),
    shopCTA: anatomy({
        componentId: 'shopCTA',
        family: 'website_ecommerce_block',
        description: 'CTA fallback into storefront.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('description', 'Description', 'content'),
            slot('cta', 'CTA', 'cta', true),
        ],
        layoutVariants: [
            variant('splitWithCTA', 'Split With CTA', 'CTA with explanatory copy.', ['headline', 'description', 'cta'], ['ecommerce_home', 'service_landing']),
            variant('compactBanner', 'Compact Banner', 'Short storefront CTA banner.', ['headline', 'cta'], ['ecommerce_home'], ['all'], 'compactStrip'),
            variant('editorialCTA', 'Editorial CTA', 'Image-led CTA for premium pages.', ['headline', 'description', 'cta'], ['ecommerce_home'], ['premium_retail']),
        ],
    }),
    leadForm: anatomy({
        componentId: 'leadForm',
        family: 'lead_block',
        description: 'Lead capture form anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('description', 'Description', 'content'),
            slot('fields', 'Form fields', 'form', true),
            slot('trust', 'Trust note', 'trust'),
        ],
        layoutVariants: [
            variant('inlineForm', 'Inline Form', 'Form embedded within page flow.', ['headline', 'description', 'fields'], ['lead_capture', 'service_landing']),
            variant('splitWithForm', 'Split With Form', 'Copy and proof next to form.', ['headline', 'description', 'fields', 'trust'], ['real_estate_home', 'appointment_landing']),
            variant('compactCapture', 'Compact Capture', 'Small email or inquiry capture.', ['headline', 'fields'], ['ai_saas_landing', 'blog_home']),
        ],
        mediaOptions: ['none'],
    }),
    appointmentCTA: anatomy({
        componentId: 'appointmentCTA',
        family: 'appointment_block',
        description: 'Appointment CTA with booking fallback.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('description', 'Description', 'content'),
            slot('cta', 'CTA', 'cta', true),
            slot('availabilityNote', 'Availability note', 'content'),
        ],
        layoutVariants: [
            variant('splitWithCTA', 'Split With CTA', 'Booking CTA with context.', ['headline', 'description', 'cta', 'availabilityNote'], ['appointment_landing', 'service_landing', 'ecommerce_home']),
            variant('compactBookingStrip', 'Compact Booking Strip', 'Compact appointment strip.', ['headline', 'cta'], ['local_business_home'], ['services'], 'compactStrip'),
            variant('serviceInquiry', 'Service Inquiry', 'Lead-form fallback for unavailable booking.', ['headline', 'description', 'cta'], ['service_landing']),
        ],
    }),
    gallery: anatomy({
        componentId: 'gallery',
        family: 'website_content',
        description: 'Image-led gallery/portfolio anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('mediaItems', 'Media items', 'media', true),
            slot('caption', 'Caption copy', 'content'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('masonry', 'Masonry', 'Mixed-height editorial gallery.', ['headline', 'mediaItems'], ['gallery_home', 'portfolio_home']),
            variant('editorialGrid', 'Editorial Grid', 'Curated grid with strong hierarchy.', ['headline', 'mediaItems', 'caption'], ['portfolio_home', 'restaurant_home']),
            variant('carousel', 'Carousel', 'Swipeable gallery.', ['headline', 'mediaItems'], ['gallery_home'], ['all'], 'carouselMobile'),
            variant('beforeAfter', 'Before/After', 'Comparison gallery for services.', ['headline', 'mediaItems', 'cta'], ['service_landing']),
        ],
        mediaOptions: ['gallery', 'imageGrid', 'singleImage'],
        compatibleDesignPatterns: ['gallery_portfolio_editorial', 'restaurant_warm_editorial'],
    }),
    imageWithText: anatomy({
        componentId: 'imageWithText',
        family: 'website_content',
        description: 'Editorial split block.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('body', 'Body', 'content', true),
            slot('media', 'Media', 'media'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('imageLeft', 'Image Left', 'Image left, text right.', ['headline', 'body', 'media', 'cta'], ['restaurant_home', 'portfolio_home']),
            variant('imageRight', 'Image Right', 'Text left, image right.', ['headline', 'body', 'media', 'cta'], ['service_landing', 'ecommerce_home']),
            variant('editorialStatement', 'Editorial Statement', 'Large statement with restrained support.', ['headline', 'body'], ['portfolio_home', 'gallery_home']),
        ],
        mediaOptions: ['singleImage', 'gallery', 'none'],
    }),
    pricing: anatomy({
        componentId: 'pricing',
        family: 'website_content',
        description: 'Plans/packages anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('plans', 'Plans', 'data', true),
            slot('cta', 'CTA', 'cta'),
            slot('disclaimer', 'Disclaimer', 'content'),
        ],
        layoutVariants: [
            variant('pricingCards', 'Pricing Cards', 'Plan cards with CTA.', ['headline', 'plans', 'cta', 'disclaimer'], ['ai_saas_landing', 'service_landing']),
            variant('comparisonTable', 'Comparison Table', 'Feature comparison table.', ['headline', 'plans', 'disclaimer'], ['ai_saas_landing']),
            variant('packageRows', 'Package Rows', 'Service packages as rows.', ['headline', 'plans', 'cta'], ['service_landing']),
        ],
        mediaOptions: ['none'],
    }),
    process: anatomy({
        componentId: 'process',
        family: 'website_content',
        description: 'Process/steps anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('steps', 'Steps', 'data', true),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('numberedSteps', 'Numbered Steps', 'Linear numbered process.', ['headline', 'steps', 'cta'], ['service_landing', 'appointment_landing']),
            variant('timeline', 'Timeline', 'Timeline process.', ['headline', 'steps'], ['website_home', 'real_estate_home']),
            variant('cardsGrid', 'Cards Grid', 'Process cards.', ['headline', 'steps'], ['ai_saas_landing']),
        ],
    }),
    stats: anatomy({
        componentId: 'stats',
        family: 'website_content',
        description: 'Metric proof anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content'),
            slot('metrics', 'Metrics', 'data', true),
            slot('caption', 'Caption', 'content'),
        ],
        layoutVariants: [
            variant('statsGrid', 'Stats Grid', 'Grid of sourced metrics.', ['headline', 'metrics', 'caption'], ['website_home', 'ai_saas_landing']),
            variant('compactStrip', 'Compact Strip', 'Compact metrics strip.', ['metrics'], ['service_landing'], ['all'], 'compactStrip'),
        ],
        antiPatterns: ['Do not fabricate metrics.'],
    }),
    contact: anatomy({
        componentId: 'contact',
        family: 'lead_block',
        description: 'Contact/location anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('contactDetails', 'Contact details', 'data', true),
            slot('map', 'Map', 'media'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('mapRight', 'Map Right', 'Contact details with map.', ['headline', 'contactDetails', 'map', 'cta'], ['local_business_home', 'restaurant_home']),
            variant('detailsGrid', 'Details Grid', 'Contact details as grid.', ['headline', 'contactDetails', 'cta'], ['service_landing']),
            variant('compactStrip', 'Compact Strip', 'Compact contact bar.', ['contactDetails', 'cta'], ['website_home'], ['all'], 'compactStrip'),
        ],
        mediaOptions: ['map', 'none'],
    }),
    collectionBanner: anatomy({
        componentId: 'collectionBanner',
        family: 'collection_section',
        description: 'Storefront collection header anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('description', 'Description', 'content'),
            slot('media', 'Media', 'media'),
        ],
        layoutVariants: [
            variant('editorialBanner', 'Editorial Banner', 'Image-led collection banner.', ['headline', 'description', 'media'], ['product_collection']),
            variant('compactHeader', 'Compact Header', 'Simple collection header.', ['headline', 'description'], ['product_collection']),
        ],
        mediaOptions: ['singleImage', 'productMedia'],
    }),
    productHero: anatomy({
        componentId: 'productHero',
        family: 'product_page_section',
        description: 'Storefront/product page hero anatomy.',
        availableSlots: [
            slot('productMedia', 'Product media', 'media', true),
            slot('productTitle', 'Product title', 'content', true),
            slot('price', 'Price', 'data'),
            slot('description', 'Description', 'content'),
            slot('commerceCta', 'Commerce CTA', 'cta'),
        ],
        layoutVariants: [
            variant('splitProduct', 'Split Product', 'Media/gallery plus product details.', ['productMedia', 'productTitle', 'price', 'description', 'commerceCta'], ['product_detail']),
            variant('productSpotlight', 'Product Spotlight', 'Premium product detail treatment.', ['productMedia', 'productTitle', 'description', 'commerceCta'], ['product_detail'], ['premium_retail']),
        ],
        mediaOptions: ['productMedia', 'gallery'],
    }),
    saleCountdown: anatomy({
        componentId: 'saleCountdown',
        family: 'website_ecommerce_block',
        description: 'Promotion/countdown anatomy for approved promotions only.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('promotion', 'Promotion data', 'data', true),
            slot('timer', 'Timer', 'data'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('promoBanner', 'Promo Banner', 'Promotion banner.', ['headline', 'promotion', 'cta'], ['ecommerce_home']),
            variant('countdownStrip', 'Countdown Strip', 'Compact approved countdown.', ['headline', 'timer', 'cta'], ['ecommerce_home'], ['ecommerce'], 'compactStrip'),
        ],
        antiPatterns: ['Do not create fake urgency or active discounts.'],
    }),
    trustBadges: anatomy({
        componentId: 'trustBadges',
        family: 'website_content',
        description: 'Trust cue strip/cloud.',
        availableSlots: [
            slot('headline', 'Headline', 'content'),
            slot('badges', 'Badges', 'trust', true),
            slot('caption', 'Caption', 'content'),
        ],
        layoutVariants: [
            variant('compactStrip', 'Compact Strip', 'Horizontal trust strip.', ['badges'], ['ecommerce_home', 'local_business_home'], ['all'], 'compactStrip'),
            variant('iconCloud', 'Icon Cloud', 'Grid/cloud of trust badges.', ['headline', 'badges', 'caption'], ['service_landing', 'real_estate_home']),
            variant('detailedRows', 'Detailed Rows', 'Explanatory trust rows.', ['headline', 'badges'], ['local_business_home', 'service_landing']),
        ],
        mediaOptions: ['iconSet', 'none'],
    }),
    newsletter: anatomy({
        componentId: 'newsletter',
        family: 'lead_block',
        description: 'Newsletter/email capture anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('description', 'Description', 'content'),
            slot('form', 'Email form', 'form', true),
        ],
        layoutVariants: [
            variant('centeredSignup', 'Centered Signup', 'Centered email capture.', ['headline', 'description', 'form'], ['blog_home', 'website_home']),
            variant('inlineSignup', 'Inline Signup', 'Inline signup strip.', ['headline', 'form'], ['ecommerce_home'], ['all'], 'compactStrip'),
            variant('editorialSignup', 'Editorial Signup', 'Newsletter with editorial copy.', ['headline', 'description', 'form'], ['portfolio_home']),
        ],
    }),
    restaurantMenu: anatomy({
        componentId: 'restaurantMenu',
        family: 'restaurant_block',
        description: 'Restaurant menu/offers anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('menuItems', 'Menu items', 'data', true, 'restaurantBlueprint.menuDraft.items'),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('menuHighlights', 'Menu Highlights', 'Featured menu items.', ['headline', 'menuItems', 'cta'], ['restaurant_home']),
            variant('editorialMenu', 'Editorial Menu', 'Warm editorial menu block.', ['headline', 'menuItems'], ['restaurant_home'], ['restaurant']),
            variant('editorialMosaic', 'Editorial Mosaic', 'Magazine-style menu masonry with photo-backed dishes and text tiles.', ['headline', 'menuItems'], ['restaurant_home'], ['restaurant']),
            variant('categoryMenu', 'Category Menu', 'Menu grouped by category.', ['headline', 'menuItems'], ['restaurant_home']),
        ],
        mediaOptions: ['imageGrid', 'singleImage'],
    }),
    restaurantReservation: anatomy({
        componentId: 'restaurantReservation',
        family: 'restaurant_block',
        description: 'Restaurant reservation/catering CTA anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('description', 'Description', 'content'),
            slot('cta', 'CTA', 'cta', true),
            slot('details', 'Reservation details', 'data', false, 'restaurantBlueprint.reservations'),
        ],
        layoutVariants: [
            variant('reservationCTA', 'Reservation CTA', 'Reservation-focused CTA.', ['headline', 'description', 'cta', 'details'], ['restaurant_home', 'appointment_landing']),
            variant('cateringInquiry', 'Catering Inquiry', 'Catering or event inquiry CTA.', ['headline', 'description', 'cta'], ['restaurant_home']),
        ],
    }),
    restaurantLocation: anatomy({
        componentId: 'restaurantLocation',
        family: 'restaurant_block',
        description: 'Restaurant location and hours anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('location', 'Location/hours', 'data', true, 'restaurantBlueprint.profile'),
            slot('map', 'Map', 'media'),
        ],
        layoutVariants: [
            variant('mapWithHours', 'Map With Hours', 'Location and hours with map.', ['headline', 'location', 'map'], ['restaurant_home']),
            variant('compactHours', 'Compact Hours', 'Compact hours strip.', ['location'], ['restaurant_home'], ['restaurant'], 'compactStrip'),
        ],
        mediaOptions: ['map', 'none'],
    }),
    realEstateListings: anatomy({
        componentId: 'realEstateListings',
        family: 'real_estate_block',
        description: 'Listings teaser/directory anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('listings', 'Listings', 'data', true),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('listingCards', 'Listing Cards', 'Property cards.', ['headline', 'listings', 'cta'], ['real_estate_home']),
            variant('featuredListing', 'Featured Listing', 'One featured listing plus CTA.', ['headline', 'listings', 'cta'], ['real_estate_home']),
        ],
        mediaOptions: ['listingCards', 'singleImage'],
    }),
    propertySearch: anatomy({
        componentId: 'propertySearch',
        family: 'real_estate_block',
        description: 'Property search/filter entry anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('filters', 'Search filters', 'form', true),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('searchHero', 'Search Hero', 'Search entry with filters.', ['headline', 'filters', 'cta'], ['real_estate_home']),
            variant('compactSearchBar', 'Compact Search Bar', 'Compact property search strip.', ['filters', 'cta'], ['real_estate_home'], ['real_estate'], 'compactStrip'),
        ],
    }),
    neighborhoods: anatomy({
        componentId: 'neighborhoods',
        family: 'real_estate_block',
        description: 'Neighborhood/market education anatomy.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('items', 'Neighborhoods', 'data', true),
            slot('cta', 'CTA', 'cta'),
        ],
        layoutVariants: [
            variant('neighborhoodGrid', 'Neighborhood Grid', 'Market/neighborhood cards.', ['headline', 'items', 'cta'], ['real_estate_home']),
            variant('editorialAreas', 'Editorial Areas', 'Editorial area guide.', ['headline', 'items'], ['real_estate_home']),
        ],
    }),
    storefrontFeaturedProducts: anatomy({
        componentId: 'storefrontFeaturedProducts',
        family: 'storefront_section',
        description: 'Storefront-only featured products.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('products', 'Products', 'data', true),
        ],
        layoutVariants: [
            variant('storefrontGrid', 'Storefront Grid', 'Storefront product grid.', ['headline', 'products'], ['storefront_home']),
            variant('storefrontCarousel', 'Storefront Carousel', 'Storefront product carousel.', ['headline', 'products'], ['storefront_home'], ['all'], 'carouselMobile'),
        ],
        mediaOptions: ['productMedia'],
    }),
    storefrontCategoryGrid: anatomy({
        componentId: 'storefrontCategoryGrid',
        family: 'storefront_section',
        description: 'Storefront-only category grid.',
        availableSlots: [
            slot('headline', 'Headline', 'content', true),
            slot('categories', 'Categories', 'data', true),
        ],
        layoutVariants: [
            variant('storefrontCategoryGrid', 'Storefront Category Grid', 'Storefront category grid.', ['headline', 'categories'], ['storefront_home']),
            variant('storefrontEditorialTiles', 'Storefront Editorial Tiles', 'Storefront editorial category tiles.', ['headline', 'categories'], ['storefront_home']),
        ],
        mediaOptions: ['imageGrid'],
    }),
};

export const getComponentAnatomy = (componentId: ComponentId | string): ComponentAnatomyEntry | undefined => (
    componentAnatomyRegistry[componentId as ComponentId]
);

export const isComponentLayoutVariant = (componentId: ComponentId | string, layoutVariant: string): boolean => (
    Boolean(getComponentAnatomy(componentId)?.layoutVariants.some(variant => variant.id === layoutVariant))
);

export const getDefaultComponentLayoutVariant = (componentId: ComponentId | string): string | undefined => (
    getComponentAnatomy(componentId)?.defaultVariant
);
