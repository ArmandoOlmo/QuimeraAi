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

export type ComponentEditorSupport = 'full' | 'style-only' | 'global' | 'runtime-only' | 'none';

export interface ComponentColorMapping {
    fields: string[];
    paths: string[];
    variantScopedFields?: Record<string, string[]>;
}

export interface ComponentEditorCatalog {
    support: ComponentEditorSupport;
    renderer?: string;
    controlGroups: string[];
    colorMapping?: ComponentColorMapping;
    notes?: string;
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
    editor?: ComponentEditorCatalog;
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

const colors = (
    section: PageSection,
    fields: string[],
    pathOverrides: Record<string, string> = {},
    variantScopedFields?: Record<string, string[]>,
): ComponentColorMapping => ({
    fields,
    paths: fields.map(field => pathOverrides[field] || `${section}.colors.${field}`),
    ...(variantScopedFields ? { variantScopedFields } : {}),
});

const fullEditor = (
    renderer: string,
    controlGroups: string[],
    colorMapping?: ComponentColorMapping,
    notes?: string,
): ComponentEditorCatalog => ({
    support: 'full',
    renderer,
    controlGroups,
    ...(colorMapping ? { colorMapping } : {}),
    ...(notes ? { notes } : {}),
});

const runtimeOnly = (
    colorMapping?: ComponentColorMapping,
    notes = 'Runtime-rendered section. It is cataloged for rendering/generation but does not expose website inspector controls.',
): ComponentEditorCatalog => ({
    support: 'runtime-only',
    controlGroups: [],
    ...(colorMapping ? { colorMapping } : {}),
    notes,
});

export const COMPONENT_EDITOR_CATALOG: Partial<Record<PageSection, ComponentEditorCatalog>> = {
    header: fullEditor(
        'renderHeaderControlsWithTabs',
        ['content', 'style'],
        colors('header', [
            'background', 'text', 'accent', 'border', 'surface', 'surfaceAlt', 'panelBackground', 'panelText',
            'mutedText', 'linkHover', 'separator', 'cartBadge', 'gradientFadeColor', 'gradientDarkColor',
            'buttonBackground', 'buttonText', 'tabBorderColor', 'tabActiveColor',
        ], {}, {
            tabbed: ['tabActiveColor', 'tabBorderColor'],
            'transparent-gradient': ['gradientFadeColor'],
            'transparent-gradient-dark': ['gradientDarkColor'],
        }),
    ),
    hero: fullEditor(
        'renderHeroControlsWithTabs',
        ['content', 'style'],
        colors('hero', [
            'primary', 'secondary', 'background', 'text', 'heading', 'buttonBackground', 'buttonText',
            'secondaryButtonBackground', 'secondaryButtonText', 'badgeColor', 'badgeBackgroundColor',
            'imageBorderColor', 'sectionBorderColor',
        ], {
            badgeColor: 'hero.badgeColor',
            badgeBackgroundColor: 'hero.badgeBackgroundColor',
            imageBorderColor: 'hero.imageBorderColor',
            sectionBorderColor: 'hero.sectionBorderColor',
        }),
    ),
    heroModern: fullEditor(
        'renderHeroControlsWithTabs',
        ['content', 'style'],
        colors('heroModern', [
            'primary', 'secondary', 'background', 'text', 'heading', 'buttonBackground', 'buttonText',
            'secondaryButtonBackground', 'secondaryButtonText', 'badgeColor', 'badgeBackgroundColor',
            'imageBorderColor', 'sectionBorderColor',
        ], {
            badgeColor: 'heroModern.badgeColor',
            badgeBackgroundColor: 'heroModern.badgeBackgroundColor',
            imageBorderColor: 'heroModern.imageBorderColor',
            sectionBorderColor: 'heroModern.sectionBorderColor',
        }),
    ),
    heroGradient: fullEditor(
        'renderHeroControlsWithTabs',
        ['content', 'style'],
        colors('heroGradient', [
            'primary', 'secondary', 'background', 'text', 'heading', 'buttonBackground', 'buttonText',
            'secondaryButtonBackground', 'secondaryButtonText', 'badgeColor', 'badgeBackgroundColor',
            'imageBorderColor', 'sectionBorderColor',
        ], {
            badgeColor: 'heroGradient.badgeColor',
            badgeBackgroundColor: 'heroGradient.badgeBackgroundColor',
            imageBorderColor: 'heroGradient.imageBorderColor',
            sectionBorderColor: 'heroGradient.sectionBorderColor',
        }),
    ),
    heroSplit: fullEditor('renderHeroSplitControls', ['content', 'style'], colors('heroSplit', ['textBackground', 'imageBackground', 'heading', 'text', 'buttonBackground', 'buttonText'])),
    heroGallery: fullEditor('renderHeroGalleryControls', ['content', 'style'], colors('heroGallery', ['background', 'text', 'heading', 'ctaText', 'dotActive', 'dotInactive', 'arrowColor'])),
    heroWave: fullEditor('renderHeroWaveControls', ['content', 'style'], colors('heroWave', ['text', 'heading', 'ctaText', 'ctaBackground', 'dotActive', 'dotInactive', 'arrowColor'])),
    heroNova: fullEditor('renderHeroNovaControls', ['content', 'style'], colors('heroNova', ['background', 'text', 'heading', 'displayText', 'ctaText', 'ctaBackground', 'dotActive', 'dotInactive', 'arrowColor'])),
    heroLead: fullEditor('renderHeroLeadControls', ['content', 'style'], colors('heroLead', [
        'background', 'infoBackground', 'formBackground', 'heading', 'text', 'accent', 'buttonBackground',
        'buttonText', 'inputBackground', 'inputText', 'inputBorder', 'inputPlaceholder', 'badgeBackground',
        'badgeText', 'formHeading', 'formText', 'borderColor',
    ])),
    topBar: fullEditor(
        'renderTopBarControls',
        ['content', 'style'],
        colors('topBar', ['backgroundColor', 'textColor', 'linkColor', 'iconColor', 'gradientFrom', 'gradientTo'], {
            backgroundColor: 'topBar.backgroundColor',
            textColor: 'topBar.textColor',
            linkColor: 'topBar.linkColor',
            iconColor: 'topBar.iconColor',
            gradientFrom: 'topBar.gradientFrom',
            gradientTo: 'topBar.gradientTo',
        }, { gradient: ['gradientFrom', 'gradientTo'] }),
    ),
    logoBanner: fullEditor(
        'renderLogoBannerControls',
        ['content', 'style'],
        colors('logoBanner', ['backgroundColor', 'titleColor', 'subtitleColor', 'dividerColor', 'gradientFrom', 'gradientTo'], {
            backgroundColor: 'logoBanner.backgroundColor',
            titleColor: 'logoBanner.titleColor',
            subtitleColor: 'logoBanner.subtitleColor',
            dividerColor: 'logoBanner.dividerColor',
            gradientFrom: 'logoBanner.gradientFrom',
            gradientTo: 'logoBanner.gradientTo',
        }, { gradient: ['gradientFrom', 'gradientTo'] }),
    ),
    banner: fullEditor('renderBannerControlsWithTabs', ['content', 'style'], colors('banner', ['background', 'overlayColor', 'heading', 'text', 'buttonBackground', 'buttonText'])),
    footer: fullEditor('renderFooterControlsWithTabs', ['content', 'style'], colors('footer', [
        'background', 'border', 'text', 'linkHover', 'heading', 'description', 'accent', 'mutedText',
        'panelBackground', 'panelText', 'buttonBackground', 'buttonText', 'wordmark', 'iconBackground',
        'inputBackground', 'inputText', 'inputBorder', 'legalBackground', 'imageOverlay',
    ])),
    features: fullEditor('renderFeaturesControlsWithTabs', ['content', 'style'], colors('features', [
        'background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground',
        'cardHeading', 'cardText', 'glowColor', 'cardGradientStart', 'cardGradientEnd', 'overlayText', 'overlayMuted',
    ])),
    services: fullEditor('renderServicesControlsWithTabs', ['content', 'style'], colors('services', ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'cardHeading', 'cardText'])),
    testimonials: fullEditor('renderTestimonialsControlsWithTabs', ['content', 'style'], colors('testimonials', ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'subtitleColor', 'cardBackground'])),
    pricing: fullEditor('renderPricingControlsWithTabs', ['content', 'style'], colors('pricing', [
        'background', 'accent', 'borderColor', 'text', 'mutedText', 'heading', 'description',
        'buttonBackground', 'buttonText', 'checkmarkColor', 'cardBackground', 'cardHeading', 'cardText',
        'priceColor', 'gradientStart', 'gradientEnd', 'panelBackground', 'panelText', 'surfaceAlt',
        'featuredBackground', 'featuredText', 'badgeBackground', 'badgeText', 'dividerColor', 'imageOverlay',
    ])),
    faq: fullEditor('renderFAQControlsWithTabs', ['content', 'style'], colors('faq', [
        'background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground',
        'cardHeading', 'cardText', 'panelBackground', 'activeBackground', 'activeText', 'iconBackground',
        'gradientStart', 'gradientEnd',
    ])),
    cta: fullEditor('renderCTAControlsWithTabs', ['content', 'style'], colors('cta', ['background', 'gradientStart', 'gradientEnd', 'text', 'heading', 'description', 'buttonBackground', 'buttonText', 'borderColor', 'secondaryText'])),
    portfolio: fullEditor('renderPortfolioControlsWithTabs', ['content', 'style'], colors('portfolio', ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'cardTitleColor', 'cardTextColor', 'cardOverlayStart', 'cardOverlayEnd'])),
    showcase: fullEditor('renderShowcaseControlsWithTabs', ['content', 'style'], colors('showcase', ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'cardHeading', 'cardText', 'mutedText', 'pillBackground', 'pillText', 'overlayStart', 'overlayEnd', 'buttonBackground', 'buttonText'])),
    team: fullEditor('renderTeamControlsWithTabs', ['content', 'style'], colors('team', ['background', 'text', 'heading', 'description', 'accent', 'cardBackground', 'cardHeading', 'cardText', 'photoBorderColor'])),
    slideshow: fullEditor('renderSlideshowControlsWithTabs', ['content', 'style'], colors('slideshow', ['background', 'heading', 'arrowBackground', 'arrowText', 'dotActive', 'dotInactive', 'captionBackground', 'captionText'])),
    screenshotCarousel: fullEditor('renderSlideshowControlsWithTabs', ['content', 'style'], colors('screenshotCarousel', ['background', 'heading', 'arrowBackground', 'arrowText', 'dotActive', 'dotInactive', 'captionBackground', 'captionText'])),
    video: fullEditor('renderVideoControlsWithTabs', ['content', 'style'], colors('video', ['background', 'text', 'heading', 'description'])),
    howItWorks: fullEditor('renderHowItWorksControlsWithTabs', ['content', 'style'], colors('howItWorks', ['background', 'accent', 'text', 'heading', 'description', 'stepTitle', 'iconColor'])),
    leads: fullEditor('renderLeadsControlsWithTabs', ['content', 'style'], colors('leads', ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'buttonBackground', 'buttonText', 'cardBackground', 'inputBackground', 'inputText', 'inputBorder', 'inputPlaceholder', 'gradientStart', 'gradientEnd'])),
    newsletter: fullEditor('renderNewsletterControlsWithTabs', ['content', 'style'], colors('newsletter', ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'buttonBackground', 'buttonText', 'cardBackground', 'cardHeading', 'cardText', 'inputBackground', 'inputText', 'inputBorder', 'inputPlaceholder'])),
    map: fullEditor('renderMapControls', ['content', 'style'], colors('map', ['background', 'text', 'heading', 'description', 'accent', 'cardBackground', 'buttonBackground', 'buttonText'])),
    menu: fullEditor('renderMenuControlsWithTabs', ['content', 'style'], colors('menu', ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'cardBackground', 'priceColor', 'cardTitleColor', 'cardText'])),
    restaurantReservation: fullEditor('renderRestaurantReservationControlsWithTabs', ['content', 'style'], colors('restaurantReservation', ['background', 'heading', 'text', 'accent', 'cardBackground', 'inputBackground', 'inputBorder', 'inputText', 'buttonBackground', 'buttonText', 'description'])),
    realEstateListings: fullEditor('renderRealEstateListingsControlsWithTabs', ['content', 'style'], colors('realEstateListings', ['background', 'surface', 'heading', 'text', 'textMuted', 'primary', 'secondary', 'accent', 'cardBackground', 'cardHeading', 'cardText', 'border', 'buttonBackground', 'buttonText', 'badgeBackground', 'badgeText', 'priceColor', 'success', 'error'])),
    appointmentBooking: runtimeOnly(colors('appointmentBooking', ['background', 'accent', 'borderColor', 'text', 'heading', 'description', 'buttonBackground', 'buttonText', 'cardBackground', 'inputBackground', 'inputText', 'inputBorder', 'inputPlaceholder'])),
    products: fullEditor('renderProductsControlsWithTabs', ['content', 'style'], colors('products', ['background', 'text', 'heading', 'accent', 'cardBackground', 'cardText', 'buttonBackground', 'buttonText'])),
    storeSettings: fullEditor('useStoreSettingsControls', ['content', 'style'], colors('storeSettings', [
        'background', 'heading', 'text', 'accent', 'cardBackground', 'cardText',
        'buttonBackground', 'buttonText', 'badgeBackground', 'badgeText', 'priceColor',
        'salePriceColor', 'borderColor', 'starColor', 'cartDrawerBackground',
        'cartDrawerHeading', 'cartDrawerText', 'cartDrawerAccent', 'cartDrawerCardBackground',
        'cartDrawerCardText', 'cartDrawerButtonBackground', 'cartDrawerButtonText',
        'cartDrawerPriceColor', 'cartDrawerBorderColor',
    ], {
        cartDrawerBackground: 'storeSettings.cartDrawerColors.background',
        cartDrawerHeading: 'storeSettings.cartDrawerColors.heading',
        cartDrawerText: 'storeSettings.cartDrawerColors.text',
        cartDrawerAccent: 'storeSettings.cartDrawerColors.accent',
        cartDrawerCardBackground: 'storeSettings.cartDrawerColors.cardBackground',
        cartDrawerCardText: 'storeSettings.cartDrawerColors.cardText',
        cartDrawerButtonBackground: 'storeSettings.cartDrawerColors.buttonBackground',
        cartDrawerButtonText: 'storeSettings.cartDrawerColors.buttonText',
        cartDrawerPriceColor: 'storeSettings.cartDrawerColors.priceColor',
        cartDrawerBorderColor: 'storeSettings.cartDrawerColors.borderColor',
    })),
    featuredProducts: fullEditor('useFeaturedProductsControls', ['content', 'style'], colors('featuredProducts', ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'buttonBackground', 'buttonText', 'badgeBackground', 'badgeText', 'priceColor', 'salePriceColor', 'borderColor', 'overlayStart', 'overlayEnd'])),
    categoryGrid: fullEditor('useCategoryGridControls', ['content', 'style'], colors('categoryGrid', ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'buttonText', 'overlayStart', 'overlayEnd', 'borderColor'])),
    productHero: fullEditor('useProductHeroControls', ['content', 'style'], colors('productHero', ['background', 'overlayColor', 'heading', 'text', 'accent', 'buttonBackground', 'buttonText', 'badgeBackground', 'badgeText', 'addToCartBackground', 'addToCartText'])),
    saleCountdown: fullEditor('useSaleCountdownControls', ['content', 'style'], colors('saleCountdown', ['background', 'heading', 'text', 'accent', 'countdownBackground', 'countdownText', 'badgeBackground', 'badgeText', 'buttonBackground', 'buttonText', 'cardBackground', 'cardText', 'overlayStart', 'overlayEnd'])),
    trustBadges: fullEditor('useTrustBadgesControls', ['content', 'style'], colors('trustBadges', ['background', 'heading', 'text', 'accent', 'iconColor', 'cardBackground', 'cardText', 'borderColor'])),
    collectionBanner: fullEditor('useCollectionBannerControls', ['content', 'style'], colors('collectionBanner', ['background', 'overlayColor', 'heading', 'text', 'accent', 'buttonBackground', 'buttonText'])),
    recentlyViewed: fullEditor('useRecentlyViewedControls', ['content', 'style'], colors('recentlyViewed', ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'starColor', 'borderColor', 'buttonText', 'overlayStart', 'overlayEnd'])),
    productReviews: fullEditor('useProductReviewsControls', ['content', 'style'], colors('productReviews', ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'starColor', 'verifiedBadgeColor', 'borderColor', 'buttonText'])),
    productBundle: fullEditor('useProductBundleControls', ['content', 'style'], colors('productBundle', ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'borderColor', 'priceColor', 'savingsColor', 'buttonBackground', 'buttonText', 'badgeBackground', 'badgeText'])),
    announcementBar: fullEditor('useAnnouncementBarControls', ['content', 'style'], colors('announcementBar', ['background', 'text', 'linkColor', 'iconColor', 'borderColor'])),
    cmsFeed: fullEditor('renderCMSFeedControlsWithTabs', ['content', 'style'], colors('cmsFeed', ['background', 'buttonBackground', 'buttonText', 'cardBackground', 'cardBorder', 'cardExcerpt', 'cardHeading', 'cardText', 'categoryBadgeBackground', 'categoryBadgeText', 'heading', 'text'])),
    signupFloat: fullEditor('renderSignupFloatControlsWithTabs', ['content', 'style'], colors('signupFloat', ['background', 'heading', 'text', 'accent', 'buttonBackground', 'buttonText', 'inputBackground', 'inputText', 'inputBorder', 'inputPlaceholder', 'socialIconColor', 'overlayBackground'])),
    heroQuimera: fullEditor('renderHeroQuimeraControls', ['content', 'style'], colors('heroQuimera', ['background', 'text', 'secondaryText', 'accent'])),
    featuresQuimera: fullEditor('renderFeaturesQuimeraControls', ['content', 'style'], colors('featuresQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    pricingQuimera: fullEditor('renderPricingQuimeraControls', ['content', 'style'], colors('pricingQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText'])),
    testimonialsQuimera: fullEditor('renderTestimonialsQuimeraControls', ['content', 'style'], colors('testimonialsQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    faqQuimera: fullEditor('renderFaqQuimeraControls', ['content', 'style'], colors('faqQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    ctaQuimera: fullEditor('renderCtaQuimeraControls', ['content', 'style'], colors('ctaQuimera', ['background', 'text', 'secondaryText', 'accent'])),
    platformShowcaseQuimera: fullEditor('renderPlatformShowcaseQuimeraControls', ['content', 'style'], colors('platformShowcaseQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    bentoShowcaseQuimera: fullEditor('renderFeaturesQuimeraControls', ['content', 'style'], colors('bentoShowcaseQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    agentDemonstrationQuimera: fullEditor('renderAiCapabilitiesQuimeraControls', ['content', 'style'], colors('agentDemonstrationQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    aiCapabilitiesQuimera: fullEditor('renderAiCapabilitiesQuimeraControls', ['content', 'style'], colors('aiCapabilitiesQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    industrySolutionsQuimera: fullEditor('renderIndustrySolutionsQuimeraControls', ['content', 'style'], colors('industrySolutionsQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    agencyWhiteLabelQuimera: fullEditor('renderAgencyWhiteLabelQuimeraControls', ['content', 'style'], colors('agencyWhiteLabelQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    metricsQuimera: fullEditor('renderMetricsQuimeraControls', ['content', 'style'], colors('metricsQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText'])),
    finalCtaQuimera: fullEditor('renderCtaQuimeraControls', ['content', 'style'], colors('finalCtaQuimera', ['background', 'text', 'secondaryText', 'accent'])),
    whatIsQuimera: fullEditor('renderGenericQuimeraControls', ['content', 'style'], colors('whatIsQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    templatesPreviewQuimera: fullEditor('renderGenericQuimeraControls', ['content', 'style'], colors('templatesPreviewQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    aiWebStudioQuimera: fullEditor('renderGenericQuimeraControls', ['content', 'style'], colors('aiWebStudioQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    contentManagerQuimera: fullEditor('renderContentManagerQuimeraControls', ['content', 'style'], colors('contentManagerQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    imageGeneratorQuimera: fullEditor('renderImageGeneratorQuimeraControls', ['content', 'style'], colors('imageGeneratorQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    chatbotWorkflowQuimera: fullEditor('renderChatbotWorkflowQuimeraControls', ['content', 'style'], colors('chatbotWorkflowQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    chatbotBuilderQuimera: fullEditor('renderChatbotBuilderQuimeraControls', ['content', 'style'], colors('chatbotBuilderQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    leadsManagerQuimera: fullEditor('renderLeadsManagerQuimeraControls', ['content', 'style'], colors('leadsManagerQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    appointmentsQuimera: fullEditor('renderAppointmentsQuimeraControls', ['content', 'style'], colors('appointmentsQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    bioPageQuimera: fullEditor('renderBioPageQuimeraControls', ['content', 'style'], colors('bioPageQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    emailMarketingQuimera: fullEditor('renderEmailMarketingQuimeraControls', ['content', 'style'], colors('emailMarketingQuimera', ['background', 'text', 'secondaryText', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor'])),
    separator1: fullEditor('renderSeparatorControlsWithTabs', ['content', 'style'], colors('separator1', ['color'], { color: 'separator1.color' })),
    separator2: fullEditor('renderSeparatorControlsWithTabs', ['content', 'style'], colors('separator2', ['color'], { color: 'separator2.color' })),
    separator3: fullEditor('renderSeparatorControlsWithTabs', ['content', 'style'], colors('separator3', ['color'], { color: 'separator3.color' })),
    separator4: fullEditor('renderSeparatorControlsWithTabs', ['content', 'style'], colors('separator4', ['color'], { color: 'separator4.color' })),
    separator5: fullEditor('renderSeparatorControlsWithTabs', ['content', 'style'], colors('separator5', ['color'], { color: 'separator5.color' })),
    chatbot: fullEditor('renderChatbotControlsWithTabs', ['content', 'style'], colors('chatbot', ['primary', 'text', 'background'])),
    productDetail: runtimeOnly(colors('productDetail', ['background', 'heading', 'text', 'accent', 'priceColor', 'salePriceColor', 'buttonBackground', 'buttonText'])),
    categoryProducts: runtimeOnly(colors('categoryProducts', ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText'])),
    articleContent: runtimeOnly(colors('articleContent', ['background', 'heading', 'text', 'accent', 'linkColor'])),
    productGrid: runtimeOnly(colors('productGrid', ['background', 'heading', 'text', 'accent', 'cardBackground', 'cardText', 'buttonBackground', 'buttonText'])),
    cart: runtimeOnly(colors('cart', ['background', 'heading', 'text', 'accent', 'cardBackground', 'buttonBackground', 'buttonText'])),
    checkout: runtimeOnly(colors('checkout', ['background', 'heading', 'text', 'accent', 'cardBackground', 'buttonBackground', 'buttonText', 'inputBackground', 'inputBorder'])),
    propertyDirectory: runtimeOnly(colors('propertyDirectory', ['background', 'surface', 'heading', 'text', 'textMuted', 'primary', 'secondary', 'accent', 'cardBackground', 'border', 'buttonBackground', 'buttonText', 'priceColor', 'success', 'error'])),
    propertyDetail: runtimeOnly(colors('propertyDetail', ['background', 'surface', 'heading', 'text', 'textMuted', 'primary', 'secondary', 'accent', 'cardBackground', 'border', 'buttonBackground', 'buttonText', 'priceColor', 'success', 'error'])),
};

export const QUIMERA_ADMIN_COMPONENTS: PageSection[] = [
    'heroQuimera', 'featuresQuimera', 'pricingQuimera', 'testimonialsQuimera', 'faqQuimera', 'ctaQuimera',
    'platformShowcaseQuimera', 'bentoShowcaseQuimera', 'agentDemonstrationQuimera', 'aiCapabilitiesQuimera',
    'industrySolutionsQuimera', 'agencyWhiteLabelQuimera', 'metricsQuimera', 'finalCtaQuimera',
    'whatIsQuimera', 'templatesPreviewQuimera', 'aiWebStudioQuimera', 'contentManagerQuimera',
    'imageGeneratorQuimera', 'chatbotWorkflowQuimera', 'chatbotBuilderQuimera', 'leadsManagerQuimera',
    'appointmentsQuimera', 'bioPageQuimera', 'emailMarketingQuimera',
];

const baseComponentRegistry: Omit<ComponentRegistryItem, 'editor'>[] = [
    {
        id: 'header',
        label: 'Header',
        role: 'structure',
        industries: ['all'],
        goals: ['leads', 'bookings', 'sales', 'authority', 'portfolio', 'restaurant', 'real-estate'],
        promptHints: 'Required global navigation/header. Use only active headerVariant values and expose only variant-specific controls for tabs, gradient fades, panels, search, login, language selector, cart badge, logo, and CTA.',
    },
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

export const componentRegistry: ComponentRegistryItem[] = baseComponentRegistry.map(item => ({
    ...item,
    editor: COMPONENT_EDITOR_CATALOG[item.id] || runtimeOnly(undefined, 'Registered section without an active website inspector catalog.'),
}));

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

export function getRegistryEditorCatalog(section: PageSection): ComponentEditorCatalog | undefined {
    return getRegistryItem(section)?.editor || COMPONENT_EDITOR_CATALOG[section];
}

export function getRegistryColorFields(section: PageSection): string[] {
    return getRegistryEditorCatalog(section)?.colorMapping?.fields || [];
}

export function getRegistryColorPaths(section: PageSection): string[] {
    return getRegistryEditorCatalog(section)?.colorMapping?.paths || [];
}

export function componentHasEditableControls(section: PageSection): boolean {
    const support = getRegistryEditorCatalog(section)?.support;
    return support === 'full' || support === 'style-only' || support === 'global';
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
