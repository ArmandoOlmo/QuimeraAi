import type {
    BusinessBlueprint,
    RealEstateBlueprint,
    RealEstateBlueprintDraftStatus,
    RealEstateEcommerceOfferItemBlueprint,
    RealEstatePriceSource,
} from '../types/businessBlueprint';
import { normalizeCrossModuleSyncName } from './businessBlueprint/crossModuleSyncIdempotency';

export type RealtyMonetizationOfferType =
    | 'buyer_guides'
    | 'seller_guides'
    | 'market_reports'
    | 'consultation_packages'
    | 'valuation_packages'
    | 'premium_listing_packages'
    | 'courses'
    | 'digital_downloads'
    | 'open_house_tickets'
    | 'digital_products';

export type RealtyMonetizationReadinessBlocker =
    | 'payment_not_configured'
    | 'tax_not_configured'
    | 'needs_merchant_review'
    | 'missing_product_description'
    | 'missing_price'
    | 'offer_disabled'
    | 'checkout_disabled';

export interface RealtyMonetizationProductDraft {
    name: string;
    slug: string;
    category: string;
    description: string;
    status: 'draft';
    needsReview: true;
    isPublished: false;
    publishStatus: 'not_published';
    priceSource: RealEstatePriceSource;
    stockSource: 'unset';
    discountStatus: 'none';
    isDigital: boolean;
    fulfillmentType: 'digital' | 'service' | 'ticket';
    checkoutEnabled: false;
    stripeProductCreated: false;
    stripePriceCreated: false;
    stripeCheckoutSessionCreated: false;
    stripePaymentLinkCreated: false;
    tags: string[];
}

export interface RealtyMonetizationOfferDraft {
    type: RealtyMonetizationOfferType;
    sourcePath: string;
    name: string;
    title: string;
    category: string;
    description: string;
    enabled: boolean;
    status: RealEstateBlueprintDraftStatus;
    needsReview: boolean;
    priceSource: RealEstatePriceSource;
    ecommerceProductDraftId?: string;
    productDraft: RealtyMonetizationProductDraft;
    readinessBlockers: RealtyMonetizationReadinessBlocker[];
    metadata: Record<string, unknown>;
}

interface OfferConfig {
    type: RealtyMonetizationOfferType;
    sourcePath: string;
    getOffer?: (blueprint: RealEstateBlueprint) => RealEstateEcommerceOfferItemBlueprint | undefined;
    name: string;
    title: string;
    category: string;
    description: string;
    fulfillmentType: RealtyMonetizationProductDraft['fulfillmentType'];
    defaultEnabled?: boolean;
}

export const REALTY_MONETIZATION_BLOCKER_MESSAGES: Record<RealtyMonetizationReadinessBlocker, string> = {
    payment_not_configured: 'Payment provider is not configured for checkout.',
    tax_not_configured: 'Tax handling is not configured for this offer.',
    needs_merchant_review: 'Merchant review is required before publishing.',
    missing_product_description: 'Product description needs review before publishing.',
    missing_price: 'Price is missing or still only AI-suggested.',
    offer_disabled: 'Offer is disabled in the RealEstateBlueprint.',
    checkout_disabled: 'Checkout remains disabled by design until Ecommerce approves the product.',
};

const OFFER_CONFIGS: OfferConfig[] = [
    {
        type: 'buyer_guides',
        sourcePath: 'realEstateBlueprint.ecommerceOffers.buyerGuides',
        getOffer: blueprint => blueprint.ecommerceOffers?.buyerGuides,
        name: 'Buyer guide digital product draft',
        title: 'Buyer guide',
        category: 'Real estate guides',
        description: 'Reviewable buyer guide digital product generated from Realty AI Studio context.',
        fulfillmentType: 'digital',
    },
    {
        type: 'seller_guides',
        sourcePath: 'realEstateBlueprint.ecommerceOffers.sellerGuides',
        getOffer: blueprint => blueprint.ecommerceOffers?.sellerGuides,
        name: 'Seller guide digital product draft',
        title: 'Seller guide',
        category: 'Real estate guides',
        description: 'Reviewable seller guide digital product for seller education and lead capture.',
        fulfillmentType: 'digital',
    },
    {
        type: 'market_reports',
        sourcePath: 'realEstateBlueprint.ecommerceOffers.marketReports',
        getOffer: blueprint => blueprint.ecommerceOffers?.marketReports,
        name: 'Market report digital product draft',
        title: 'Market report',
        category: 'Market intelligence',
        description: 'Draft market report offer for reviewed neighborhood, pricing, and inventory insights.',
        fulfillmentType: 'digital',
    },
    {
        type: 'consultation_packages',
        sourcePath: 'realEstateBlueprint.ecommerceOffers.consultationPackages',
        getOffer: blueprint => blueprint.ecommerceOffers?.consultationPackages,
        name: 'Paid buyer consultation offer draft',
        title: 'Buyer consultation package',
        category: 'Consultations',
        description: 'Draft paid consultation package that requires availability, scope, and payment review.',
        fulfillmentType: 'service',
    },
    {
        type: 'valuation_packages',
        sourcePath: 'realEstateBlueprint.ecommerceOffers.valuationPackages',
        getOffer: blueprint => blueprint.ecommerceOffers?.valuationPackages,
        name: 'Seller valuation package draft',
        title: 'Seller valuation package',
        category: 'Consultations',
        description: 'Draft seller valuation package with reviewed disclaimers, intake fields, and pricing required.',
        fulfillmentType: 'service',
    },
    {
        type: 'premium_listing_packages',
        sourcePath: 'realEstateBlueprint.ecommerceOffers.premiumListingPackages',
        getOffer: blueprint => blueprint.ecommerceOffers?.premiumListingPackages,
        name: 'Premium listing promotion package draft',
        title: 'Premium listing promotion',
        category: 'Listing promotions',
        description: 'Draft premium listing package for reviewed featured placement, campaign scope, and reporting.',
        fulfillmentType: 'service',
        defaultEnabled: false,
    },
    {
        type: 'courses',
        sourcePath: 'realEstateBlueprint.ecommerceOffers.courses',
        getOffer: blueprint => blueprint.ecommerceOffers?.courses,
        name: 'Real estate course offer draft',
        title: 'Real estate course',
        category: 'Education',
        description: 'Draft real estate education product that needs curriculum, access, refunds, and compliance review.',
        fulfillmentType: 'digital',
        defaultEnabled: false,
    },
    {
        type: 'digital_downloads',
        sourcePath: 'realEstateBlueprint.ecommerceOffers.digitalDownloads',
        getOffer: blueprint => blueprint.ecommerceOffers?.digitalDownloads,
        name: 'Real estate digital download draft',
        title: 'Downloadable checklist',
        category: 'Digital downloads',
        description: 'Draft downloadable checklist or template that must be reviewed before storefront display.',
        fulfillmentType: 'digital',
    },
    {
        type: 'open_house_tickets',
        sourcePath: 'realEstateBlueprint.openHouses',
        name: 'Open house ticket draft',
        title: 'Open house ticket',
        category: 'Open houses',
        description: 'Draft open house ticket or registration product for capacity-controlled events when applicable.',
        fulfillmentType: 'ticket',
        defaultEnabled: false,
    },
];

const DEFAULT_OFFER: RealEstateEcommerceOfferItemBlueprint = {
    enabled: true,
    status: 'draft',
    priceSource: 'unset',
    needsReview: true,
};

const normalizeStatus = (status?: string): RealEstateBlueprintDraftStatus => {
    if (status === 'needs_review' || status === 'configured' || status === 'disabled') return status;
    return 'draft';
};

const normalizePriceSource = (priceSource?: string): RealEstatePriceSource => {
    if (priceSource === 'user-provided' || priceSource === 'ai-suggested' || priceSource === 'imported') return priceSource;
    return 'unset';
};

const createDefaultOffer = (config: OfferConfig, blueprint?: RealEstateBlueprint): RealEstateEcommerceOfferItemBlueprint => {
    if (config.type === 'open_house_tickets') {
        const openHousesEnabled = blueprint?.openHouses?.enabled === true && blueprint.openHouses.registrationEnabled === true;
        return {
            ...DEFAULT_OFFER,
            enabled: openHousesEnabled,
            status: normalizeStatus(blueprint?.openHouses?.status),
            needsReview: blueprint?.openHouses?.needsReview !== false,
        };
    }

    return {
        ...DEFAULT_OFFER,
        enabled: config.defaultEnabled ?? true,
    };
};

const isPaymentConfigured = (blueprint: BusinessBlueprint): boolean =>
    blueprint.ecommerceBlueprint?.paymentMode === 'test' || blueprint.ecommerceBlueprint?.paymentMode === 'live';

const isTaxConfigured = (blueprint: BusinessBlueprint): boolean =>
    blueprint.ecommerceBlueprint?.taxMode === 'manual' || blueprint.ecommerceBlueprint?.taxMode === 'automatic';

const buildReadinessBlockers = (
    blueprint: BusinessBlueprint,
    offer: RealEstateEcommerceOfferItemBlueprint,
    description: string,
): RealtyMonetizationReadinessBlocker[] => {
    const blockers: RealtyMonetizationReadinessBlocker[] = [];

    if (!isPaymentConfigured(blueprint)) blockers.push('payment_not_configured');
    if (!isTaxConfigured(blueprint)) blockers.push('tax_not_configured');
    if (offer.needsReview !== false || offer.status !== 'configured') blockers.push('needs_merchant_review');
    if (!description.trim()) blockers.push('missing_product_description');
    if (normalizePriceSource(offer.priceSource) === 'unset') blockers.push('missing_price');
    if (offer.enabled === false || offer.status === 'disabled') blockers.push('offer_disabled');
    blockers.push('checkout_disabled');

    return blockers;
};

const buildProductDraft = (
    config: OfferConfig,
    offer: RealEstateEcommerceOfferItemBlueprint,
): RealtyMonetizationProductDraft => {
    const slug = normalizeCrossModuleSyncName(config.title);
    return {
        name: config.title,
        slug,
        category: config.category,
        description: config.description,
        status: 'draft',
        needsReview: true,
        isPublished: false,
        publishStatus: 'not_published',
        priceSource: normalizePriceSource(offer.priceSource),
        stockSource: 'unset',
        discountStatus: 'none',
        isDigital: config.fulfillmentType !== 'service',
        fulfillmentType: config.fulfillmentType,
        checkoutEnabled: false,
        stripeProductCreated: false,
        stripePriceCreated: false,
        stripeCheckoutSessionCreated: false,
        stripePaymentLinkCreated: false,
        tags: ['realty', 'ai-studio', 'draft', config.type],
    };
};

export function buildRealtyMonetizationOfferDrafts(
    blueprint?: BusinessBlueprint | null,
): RealtyMonetizationOfferDraft[] {
    if (!blueprint) return [];
    const realty = blueprint.realEstateBlueprint;
    if (!realty) return [];

    return OFFER_CONFIGS.map(config => {
        const sourceOffer = config.getOffer?.(realty);
        const offer = sourceOffer || createDefaultOffer(config, realty);
        const normalizedOffer: RealEstateEcommerceOfferItemBlueprint = {
            ...DEFAULT_OFFER,
            ...offer,
            status: normalizeStatus(offer.status),
            priceSource: normalizePriceSource(offer.priceSource),
            needsReview: offer.needsReview !== false,
        };
        const productDraft = buildProductDraft(config, normalizedOffer);
        const readinessBlockers = buildReadinessBlockers(blueprint, normalizedOffer, config.description);

        return {
            type: config.type,
            sourcePath: config.sourcePath,
            name: config.name,
            title: config.title,
            category: config.category,
            description: config.description,
            enabled: normalizedOffer.enabled,
            status: normalizedOffer.status,
            needsReview: normalizedOffer.needsReview,
            priceSource: normalizedOffer.priceSource,
            ecommerceProductDraftId: normalizedOffer.ecommerceProductDraftId,
            productDraft,
            readinessBlockers,
            metadata: {
                sourcePath: config.sourcePath,
                realEstateEngine: true,
                offerType: config.type,
                offerBlueprintEnabled: normalizedOffer.enabled,
                offerStatus: normalizedOffer.status,
                ecommerceProductDraftId: normalizedOffer.ecommerceProductDraftId || null,
                priceSource: normalizedOffer.priceSource,
                productDraft,
                readinessBlockerCodes: readinessBlockers,
                readinessBlockers: readinessBlockers.map(blocker => REALTY_MONETIZATION_BLOCKER_MESSAGES[blocker]),
                recommendedStripeSurface: 'checkout_sessions',
                checkoutSessionMode: 'payment',
                stripeProductCreated: false,
                stripePriceCreated: false,
                stripeCheckoutSessionCreated: false,
                stripePaymentLinkCreated: false,
                checkoutEnabled: false,
                paymentCollectionActive: false,
                fulfillmentReviewed: false,
                taxReviewed: false,
                refundPolicyReviewed: false,
                noRuntimeActivated: true,
            },
        };
    });
}
