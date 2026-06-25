import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import { buildRealtyMonetizationOfferDrafts } from '../../utils/realtyMonetization';

const now = '2026-06-24T12:00:00.000Z';

function buildRealEstatePlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Isla Realty Offers',
            industry: 'Real estate brokerage in Puerto Rico',
            description: 'Realty team with buyer guides, seller valuations, paid consultations, and open houses.',
            tagline: 'Real estate monetization engine',
            services: [
                { name: 'Buyer representation', description: 'Guides and consultation packages for buyers.' },
                { name: 'Seller valuation', description: 'Seller valuation and market report offers.' },
            ],
            contactInfo: { email: 'hello@example.com', phone: '787-000-0000' },
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#0f766e',
                secondary: '#111827',
                accent: '#f59e0b',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#111827',
            },
            visualStyle: 'premium editorial',
        },
        contentMap: {
            pages: [],
            products: [],
        },
        componentPlan: [
            { component: 'heroLead', reason: 'Realty lead capture', confidence: 0.9 },
            { component: 'realEstateListings', reason: 'Listings from Realty Engine', confidence: 0.9 },
        ],
        assetPlan: [],
        qualityGoals: ['draft-safe real estate monetization'],
    };
}

function buildBlueprint(): BusinessBlueprint {
    return createBusinessBlueprintFromWebsitePlan(buildRealEstatePlan(), {
        now,
        projectId: 'project_realty_offers_test',
    });
}

describe('realty monetization offer drafts', () => {
    it('derives draft-safe Ecommerce product payloads without Stripe or checkout runtime', () => {
        const blueprint = buildBlueprint();
        const drafts = buildRealtyMonetizationOfferDrafts(blueprint);

        expect(drafts.map(draft => draft.type)).toEqual(expect.arrayContaining([
            'buyer_guides',
            'seller_guides',
            'market_reports',
            'consultation_packages',
            'valuation_packages',
            'premium_listing_packages',
            'courses',
            'digital_downloads',
            'open_house_tickets',
        ]));
        expect(drafts.every(draft => draft.productDraft.status === 'draft')).toBe(true);
        expect(drafts.every(draft => draft.productDraft.needsReview === true)).toBe(true);
        expect(drafts.every(draft => draft.productDraft.isPublished === false)).toBe(true);
        expect(drafts.every(draft => draft.productDraft.checkoutEnabled === false)).toBe(true);
        expect(drafts.every(draft => draft.productDraft.stripeProductCreated === false)).toBe(true);
        expect(drafts.every(draft => draft.productDraft.stripePriceCreated === false)).toBe(true);
        expect(drafts.every(draft => draft.productDraft.stripeCheckoutSessionCreated === false)).toBe(true);
        expect(drafts.every(draft => draft.productDraft.stripePaymentLinkCreated === false)).toBe(true);
        expect(drafts.every(draft => draft.metadata.noRuntimeActivated === true)).toBe(true);
        expect(drafts.every(draft => draft.metadata.recommendedStripeSurface === 'checkout_sessions')).toBe(true);
    });

    it('surfaces readiness blockers for payment, tax, price, and disabled offers', () => {
        const blueprint = buildBlueprint();
        const drafts = buildRealtyMonetizationOfferDrafts(blueprint);
        const buyerGuide = drafts.find(draft => draft.type === 'buyer_guides');
        const premiumListing = drafts.find(draft => draft.type === 'premium_listing_packages');

        expect(buyerGuide?.readinessBlockers).toEqual(expect.arrayContaining([
            'payment_not_configured',
            'tax_not_configured',
            'missing_price',
            'checkout_disabled',
        ]));
        expect(premiumListing?.enabled).toBe(false);
        expect(premiumListing?.readinessBlockers).toContain('offer_disabled');
    });

    it('removes payment, tax, and missing-price blockers when blueprint readiness is explicit', () => {
        const blueprint = buildBlueprint();
        const readyBlueprint: BusinessBlueprint = {
            ...blueprint,
            ecommerceBlueprint: {
                ...blueprint.ecommerceBlueprint,
                paymentMode: 'test',
                taxMode: 'automatic',
            },
            realEstateBlueprint: {
                ...blueprint.realEstateBlueprint,
                ecommerceOffers: {
                    ...blueprint.realEstateBlueprint.ecommerceOffers,
                    buyerGuides: {
                        ...blueprint.realEstateBlueprint.ecommerceOffers.buyerGuides,
                        status: 'configured',
                        priceSource: 'user-provided',
                        needsReview: false,
                    },
                },
            },
        };

        const buyerGuide = buildRealtyMonetizationOfferDrafts(readyBlueprint)
            .find(draft => draft.type === 'buyer_guides');

        expect(buyerGuide?.readinessBlockers).not.toContain('payment_not_configured');
        expect(buyerGuide?.readinessBlockers).not.toContain('tax_not_configured');
        expect(buyerGuide?.readinessBlockers).not.toContain('missing_price');
        expect(buyerGuide?.readinessBlockers).toEqual(['checkout_disabled']);
    });
});
