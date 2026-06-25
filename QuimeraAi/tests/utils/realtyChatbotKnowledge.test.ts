import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import { buildRealtyChatbotKnowledgeDrafts } from '../../utils/realtyChatbotKnowledge';

const now = '2026-06-24T12:00:00.000Z';

function buildRealEstatePlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Isla Realty Knowledge',
            industry: 'Real estate brokerage in Puerto Rico',
            description: 'Brokerage focused on buyer leads, seller valuations, showings, open houses, and neighborhood guidance.',
            tagline: 'Reviewed property guidance',
            services: [
                { name: 'Buyer representation', description: 'Buyer qualification and showing coordination.' },
                { name: 'Seller valuation', description: 'Seller intake and market report handoff.' },
            ],
            contactInfo: {
                city: 'San Juan',
                state: 'PR',
                country: 'Puerto Rico',
                email: 'hello@example.com',
                phone: '787-000-0000',
            },
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
            properties: [
                {
                    title: 'Condado Ocean View',
                    description: 'Reviewed condo draft with ocean views, parking, and walkable access.',
                    price: 1250000,
                    currency: 'USD',
                    city: 'San Juan',
                    state: 'PR',
                    country: 'Puerto Rico',
                    transactionType: 'sale',
                    propertyType: 'condo',
                    bedrooms: 3,
                    bathrooms: 2,
                    area: 1800,
                    areaUnit: 'sqft',
                    amenities: ['pool', 'security', 'parking'],
                    highlights: ['ocean view', 'walkable location'],
                },
            ],
        },
        componentPlan: [
            { component: 'heroLead', reason: 'Realty lead capture', confidence: 0.9 },
            { component: 'realEstateListings', reason: 'Listings from Realty Engine', confidence: 0.9 },
        ],
        assetPlan: [],
        qualityGoals: ['draft-safe chatbot knowledge'],
    };
}

function buildBlueprint(): BusinessBlueprint {
    return createBusinessBlueprintFromWebsitePlan(buildRealEstatePlan(), {
        now,
        projectId: 'project_realty_knowledge_test',
    });
}

describe('realty chatbot knowledge drafts', () => {
    it('derives reviewable chatbot knowledge without enabling chatbot runtime', () => {
        const drafts = buildRealtyChatbotKnowledgeDrafts(buildBlueprint());

        expect(drafts.map(draft => draft.type)).toEqual([
            'profile',
            'listing_summary',
            'showing_and_open_house',
            'lead_qualification',
            'compliance_guardrails',
        ]);
        expect(drafts.every(draft => draft.metadata.noRuntimeActivated === true)).toBe(true);
        expect(drafts.every(draft => draft.metadata.chatbotPublished === false)).toBe(true);
        expect(drafts.every(draft => draft.metadata.noAutoPublish === true)).toBe(true);
        expect(drafts.every(draft => draft.metadata.needsReview === true)).toBe(true);
        expect(drafts.every(draft => draft.readinessBlockers.length > 0)).toBe(true);
        expect(drafts.find(draft => draft.type === 'listing_summary')?.metadata).toMatchObject({
            listingCount: 1,
            reviewedPublicListingCount: 0,
            draftListingCount: 1,
            containsUnreviewedListings: true,
        });
        expect(drafts.find(draft => draft.type === 'compliance_guardrails')?.content).toContain('Do not provide legal, financial, tax, mortgage');
    });

    it('separates reviewed public listings from unreviewed listing drafts', () => {
        const blueprint = buildBlueprint();
        const reviewedBlueprint: BusinessBlueprint = {
            ...blueprint,
            realEstateBlueprint: {
                ...blueprint.realEstateBlueprint,
                listingDrafts: blueprint.realEstateBlueprint.listingDrafts.map(listing => ({
                    ...listing,
                    status: 'active',
                    publicEnabled: true,
                    needsReview: false,
                })),
            },
        };

        const listingDraft = buildRealtyChatbotKnowledgeDrafts(reviewedBlueprint)
            .find(draft => draft.type === 'listing_summary');

        expect(listingDraft?.metadata.reviewedPublicListingCount).toBe(1);
        expect(listingDraft?.metadata.draftListingCount).toBe(0);
        expect(listingDraft?.content).toContain('Condado Ocean View');
        expect(listingDraft?.content).toContain('Reviewed public listings: 1');
    });

    it('does not create chatbot knowledge when Realty is disabled', () => {
        const blueprint = buildBlueprint();
        const disabledBlueprint: BusinessBlueprint = {
            ...blueprint,
            realEstateBlueprint: {
                ...blueprint.realEstateBlueprint,
                enabled: false,
            },
        };

        expect(buildRealtyChatbotKnowledgeDrafts(disabledBlueprint)).toEqual([]);
    });
});
