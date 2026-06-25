import { describe, expect, it } from 'vitest';
import type { PropertyCampaign, PropertyOpenHouse, RealtyLead, RealtyProperty } from '../../types/realty';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import { createRealtyEnginePlan } from '../../utils/realtyEngine';

const now = '2026-06-19T12:00:00.000Z';

function buildRealEstatePlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Isla Realtor',
            industry: 'Real estate brokerage in Puerto Rico',
            description: 'Real estate team focused on buyer leads, seller leads, showings, open houses, and digital guides.',
            tagline: 'Premium properties in Puerto Rico',
            services: [
                { name: 'Buyer representation', description: 'Guidance for qualified buyers.' },
                { name: 'Seller valuation', description: 'Property valuation and seller lead intake.' },
            ],
            contactInfo: { city: 'San Juan', country: 'Puerto Rico', email: 'hello@example.com', phone: '787-000-0000' },
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#0f766e',
                secondary: '#111827',
                accent: '#f59e0b',
                background: '#f8fafc',
                surface: '#ffffff',
                text: '#111827',
            },
            visualStyle: 'premium editorial',
        },
        contentMap: {
            pages: [],
            properties: [
                {
                    title: 'Condado Ocean View',
                    description: 'Merchant-provided listing draft with real property data supplied by the user.',
                    price: 1250000,
                    city: 'San Juan',
                    propertyType: 'condo',
                    transactionType: 'sale',
                    bedrooms: 3,
                    bathrooms: 2,
                },
            ],
        },
        componentPlan: [
            { component: 'heroLead', reason: 'Lead capture hero for real estate', confidence: 0.9 },
            { component: 'realEstateListings', reason: 'Show approved listings from Realty Engine', confidence: 0.92 },
            { component: 'leads', reason: 'Capture buyer and seller leads', confidence: 0.88 },
        ],
        assetPlan: [],
        qualityGoals: ['draft-safe real estate engine'],
    };
}

function buildPublicProperty(): RealtyProperty {
    return {
        id: 'property_1',
        projectId: 'project_1',
        title: 'Condado Ocean View',
        slug: 'condado-ocean-view',
        description: 'Luxury condo with ocean views, renovated interiors, flexible showing windows, and direct access to neighborhood amenities for qualified buyers.',
        descriptionLong: 'Luxury condo with ocean views, renovated interiors, flexible showing windows, secured parking, and direct access to neighborhood amenities for qualified buyers. The residence includes a modern kitchen, open living area, private balcony, building security, and a location near restaurants, schools, beaches, and business districts.',
        price: 1250000,
        currency: 'USD',
        transactionType: 'sale',
        address: '100 Ashford Ave',
        city: 'San Juan',
        country: 'Puerto Rico',
        propertyType: 'condo',
        status: 'active',
        bedrooms: 3,
        bathrooms: 2,
        area: 1800,
        areaUnit: 'sqft',
        amenities: ['pool', 'security', 'parking'],
        features: ['ocean view', 'renovated kitchen', 'private balcony'],
        highlights: ['walkable location', 'strong rental demand', 'move-in ready'],
        images: [{ id: 'image_1', url: 'https://example.com/condado.jpg', position: 0, isPrimary: true }],
        mainImageUrl: 'https://example.com/condado.jpg',
        seoTitle: 'Condado Ocean View Condo for Sale in San Juan',
        seoDescription: 'Review a premium Condado condo for sale with ocean views, parking, modern finishes, and strong buyer lead capture details.',
        isFeatured: true,
        publicEnabled: true,
        publishedAt: now,
        metadata: { cta: 'Request a private showing' },
        createdAt: now,
        updatedAt: now,
    };
}

describe('realtyEngine planner', () => {
    it('builds a draft-safe runtime plan and preserves locked artifacts', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildRealEstatePlan(), {
            now,
            projectId: 'project_1',
        });
        const protectedBlueprint = {
            ...blueprint,
            realEstateBlueprint: {
                ...blueprint.realEstateBlueprint,
                engineArtifacts: blueprint.realEstateBlueprint.engineArtifacts.map(artifact =>
                    artifact.key === 'website'
                        ? { ...artifact, userModified: true, lockedFromRegeneration: true }
                        : artifact
                ),
            },
        };
        const lead: RealtyLead = {
            id: 'lead_1',
            projectId: 'project_1',
            propertyId: 'property_1',
            name: 'Buyer Lead',
            email: 'buyer@example.com',
            preferredDate: now,
            status: 'new',
            source: 'website',
            createdAt: now,
            updatedAt: now,
        };
        const campaign: PropertyCampaign = {
            id: 'campaign_1',
            userId: 'user_1',
            projectId: 'project_1',
            propertyId: 'property_1',
            campaignType: 'just_listed',
            title: 'Just listed campaign',
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        };
        const openHouse: PropertyOpenHouse = {
            id: 'open_house_1',
            userId: 'user_1',
            projectId: 'project_1',
            propertyId: 'property_1',
            title: 'Weekend Open House',
            startsAt: now,
            status: 'scheduled',
            registrationEnabled: true,
            createdAt: now,
            updatedAt: now,
        };

        const plan = createRealtyEnginePlan({
            businessBlueprint: protectedBlueprint,
            properties: [buildPublicProperty()],
            leads: [lead],
            campaigns: [campaign],
            openHouses: [openHouse],
            aiGenerations: [],
        });

        expect(plan.enabled).toBe(true);
        expect(plan.status).toBe('needs_review');
        expect(plan.readinessScore).toBeGreaterThan(50);
        expect(plan.protectedArtifactCount).toBe(1);
        expect(plan.guardrails).toEqual(expect.arrayContaining([
            'AI Studio outputs remain draft or needsReview until a user reviews them.',
            'User-modified or locked artifacts are preserved during regeneration.',
        ]));
        expect(plan.opportunities).toEqual(expect.arrayContaining([
            'featured listing promotion',
            'seller and buyer nurture sequences',
            'open house retargeting campaign',
        ]));
        expect(plan.artifacts.find(artifact => artifact.key === 'website')).toMatchObject({
            regenerationMode: 'locked',
            runtimeStatus: 'needs_review',
        });
        expect(plan.artifacts.find(artifact => artifact.key === 'directory')).toMatchObject({
            readinessScore: 85,
            runtimeStatus: 'needs_review',
        });
        expect(plan.modules.find(module => module.id === 'website-builder')?.refs).toEqual(['condado-ocean-view']);
    });

    it('turns artifacts off when real estate is disabled', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildRealEstatePlan(), {
            now,
            projectId: 'project_1',
        });

        const plan = createRealtyEnginePlan({
            businessBlueprint: blueprint,
            flags: { real_estate_enabled: false },
            properties: [buildPublicProperty()],
            leads: [],
            campaigns: [],
            openHouses: [],
            aiGenerations: [],
        });

        expect(plan.enabled).toBe(false);
        expect(plan.status).toBe('disabled');
        expect(plan.readinessScore).toBe(0);
        expect(plan.artifacts.every(artifact => artifact.runtimeStatus === 'disabled')).toBe(true);
        expect(plan.blockers).toEqual(['Realty module is disabled.']);
    });
});
