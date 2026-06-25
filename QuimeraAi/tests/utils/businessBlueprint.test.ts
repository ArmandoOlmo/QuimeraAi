import { describe, expect, it } from 'vitest';
import { componentRegistry } from '../../data/componentRegistry';
import {
    BUSINESS_BLUEPRINT_SCHEMA_VERSION,
    BUSINESS_BLUEPRINT_VERSION,
} from '../../types/businessBlueprint';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    attachAiStudioBusinessBlueprint,
    createBusinessBlueprintFromWebsitePlan,
    createCrossModuleSyncPlan,
    createStarterEcommerceContent,
    migrateBusinessBlueprint,
    shouldProtectFromRegeneration,
} from '../../utils/businessBlueprint';
import { mapSupabaseRowToProject } from '../../utils/mapSupabaseProject';
import { createWebsitePlanFromBrief } from '../../utils/websitePlanEngine';

const ecommerceRegistry = componentRegistry.filter(item => {
    if (item.adminOnly) return false;
    if (item.requiredService && item.requiredService !== 'ecommerce') return false;
    if (item.requiredFeature && item.requiredFeature !== 'ecommerceEnabled') return false;
    return true;
});

const ecommerceBrief = {
    businessName: 'Quimera Fit Store',
    industry: 'fitness ecommerce',
    description: 'A fitness brand that sells training gear, digital plans, and recovery products online.',
    tagline: 'Train smarter',
    services: [
        { name: 'Training gear', description: 'Durable gear for home training.' },
        { name: 'Digital programs', description: 'Downloadable fitness plans.' },
    ],
    contactInfo: { city: 'San Juan', country: 'Puerto Rico' },
    hasEcommerce: true,
    colorPalette: {
        primary: '#0f766e',
        secondary: '#111827',
        accent: '#f59e0b',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#111827',
    },
};

function buildEcommercePlan(): WebsitePlan {
    const plan = createWebsitePlanFromBrief(ecommerceBrief, ecommerceRegistry);
    return {
        ...plan,
        contentMap: {
            ...plan.contentMap,
            products: [
                {
                    name: 'Resistance Kit',
                    category: 'Training gear',
                    description: 'Bands and handles for strength training.',
                    price: 49,
                },
                {
                    name: 'Mobility Plan',
                    category: 'Digital programs',
                    description: 'A four-week mobility routine.',
                },
            ],
        },
    };
}

function buildRealEstatePlan(properties: WebsitePlan['contentMap']['properties'] = []): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Isla Realtor',
            industry: 'Real estate realtor in Puerto Rico',
            description: 'Luxury real estate advisor focused on buyer leads, seller leads, open houses, showings, and digital guides.',
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
                accent: '#c084fc',
                background: '#f8fafc',
                surface: '#ffffff',
                text: '#111827',
            },
            visualStyle: 'premium editorial',
        },
        contentMap: {
            pages: [],
            properties,
        },
        componentPlan: [
            { component: 'heroLead', reason: 'Lead capture hero for real estate', confidence: 0.9 },
            { component: 'realEstateListings', reason: 'Show approved listings from Realty Engine', confidence: 0.92 },
            { component: 'leads', reason: 'Capture buyer and seller leads', confidence: 0.88 },
            { component: 'footer', reason: 'Navigation footer', confidence: 0.8 },
        ],
        assetPlan: [],
        qualityGoals: ['draft-safe real estate engine'],
    };
}

describe('businessBlueprint adapters', () => {
    it('creates a versioned business blueprint from a WebsitePlan', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
            projectId: 'project_123',
            tenantId: 'tenant_123',
            createdBy: 'user_123',
        });

        expect(blueprint.blueprintVersion).toBe(BUSINESS_BLUEPRINT_VERSION);
        expect(blueprint.schemaVersion).toBe(BUSINESS_BLUEPRINT_SCHEMA_VERSION);
        expect(blueprint.source).toBe('ai-studio');
        expect(blueprint.projectId).toBe('project_123');
        expect(blueprint.tenantId).toBe('tenant_123');
        expect(blueprint.status).toBe('generated');
        expect(blueprint.sourceMap.businessName).toBe('websitePlan.businessProfile.businessName');
    });

    it('creates a complete RealEstateBlueprint V2 with draft guardrails', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildRealEstatePlan([
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
        ]), {
            now: '2026-06-19T12:00:00.000Z',
        });
        const realty = blueprint.realEstateBlueprint;

        expect(realty.enabled).toBe(true);
        expect(realty.status).toBe('needs_review');
        expect(realty.agentProfile.licenseNumber).toBe('');
        expect(realty.publicDirectory.route).toBe('/listados');
        expect(realty.propertyPages.routePattern).toBe('/listados/:slug');
        expect(realty.showingRequests.status).toBe('needs_review');
        expect(realty.showingRequests.appointmentIntegrationEnabled).toBe(false);
        expect(realty.leadFunnels.showingRequestEnabled).toBe(true);
        expect(realty.chatbot.intents).toContain('showing_request');
        expect(realty.emailMarketing.flows).toContain('new_property_inquiry');
        expect(realty.analytics.events).toContain('property_view');
        expect(realty.ecommerceOffers.buyerGuides).toMatchObject({ status: 'needs_review', priceSource: 'unset' });
        expect(realty.integrations.crmTags).toContain('realty');
        expect(realty.engineArtifacts.map(item => item.key)).toEqual(expect.arrayContaining(['directory', 'showing_requests', 'crm_pipeline', 'analytics']));
        expect(realty.listingDrafts[0]).toMatchObject({
            title: 'Condado Ocean View',
            status: 'needs_review',
            publicEnabled: false,
            needsReview: true,
            generatedByAI: true,
            priceSource: 'user-provided',
        });
    });

    it('does not invent listing drafts when the real estate brief has no property data', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildRealEstatePlan(), {
            now: '2026-06-19T12:00:00.000Z',
        });

        expect(blueprint.realEstateBlueprint.listingDrafts).toEqual([]);
        expect(blueprint.realEstateBlueprint.publicDirectory.needsReview).toBe(true);
        expect(blueprint.realEstateBlueprint.agentProfile.complianceNotes.length).toBeGreaterThan(0);
    });

    it('marks ecommerce starter content as reviewable draft infrastructure', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
        });

        expect(blueprint.ecommerceBlueprint.enabled).toBe(true);
        expect(blueprint.ecommerceBlueprint.needsReview).toBe(true);
        expect(blueprint.ecommerceBlueprint.readiness.warnings.length).toBeGreaterThan(0);
        expect(blueprint.ecommerceBlueprint.starterProducts).toHaveLength(2);
        expect(blueprint.ecommerceBlueprint.starterProducts[0]).toMatchObject({
            name: 'Resistance Kit',
            suggestedPrice: 49,
            priceSource: 'user-provided',
            stockSource: 'unset',
            status: 'needs_review',
        });
        expect(blueprint.ecommerceBlueprint.starterProducts[1]).toMatchObject({
            priceSource: 'unset',
            stockSource: 'unset',
            status: 'needs_review',
        });
        expect(blueprint.ecommerceBlueprint.discounts[0]?.status).toBe('draft');
        expect(blueprint.ecommerceBlueprint.giftCards.status).toBe('draft');
    });

    it('creates storefront presentation state without making the builder canonical for products', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
        });

        expect(blueprint.storefrontBlueprint.enabled).toBe(true);
        expect(blueprint.storefrontBlueprint.needsReview).toBe(true);
        expect(blueprint.storefrontBlueprint.routeStrategy).toBe('project-store');
        expect(blueprint.storefrontBlueprint).not.toHaveProperty('themePreset');
        expect(blueprint.storefrontBlueprint.catalogSize).toBe('small');
        expect(blueprint.storefrontBlueprint.productCardVariant).toBe('imageFirst');
        expect(blueprint.storefrontBlueprint.templates.product).toBe('default-product');
        expect(blueprint.storefrontBlueprint.templateCompatibility).toBeUndefined();
        expect(blueprint.storefrontBlueprint.themeFallbackChain).toEqual([
            'DEFAULT_STOREFRONT_THEME',
            'brandColors',
            'projectGlobalColors',
            'storefrontTheme',
        ]);
    });

    it('recognizes current blueprints and ignores unknown schema shapes', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
        });

        expect(migrateBusinessBlueprint(blueprint)).toBe(blueprint);
        expect(migrateBusinessBlueprint({ schemaVersion: 999, blueprintVersion: '0.1.0' })).toBeNull();
        expect(migrateBusinessBlueprint(null)).toBeNull();
    });

    it('migrates legacy RealEstateBlueprint data to V2 defaults without losing legacy fields', () => {
        const base = createBusinessBlueprintFromWebsitePlan(buildRealEstatePlan(), {
            now: '2026-06-19T12:00:00.000Z',
        });
        const legacyBlueprint: BusinessBlueprint = {
            ...base,
            realEstateBlueprint: {
                enabled: true,
                status: 'generated',
                needsReview: true,
                readiness: { isReady: true, blockers: [], warnings: [] },
                metadata: {
                    generatedBy: 'ai',
                    userModified: true,
                    lockedFromRegeneration: true,
                    generatedAt: '2026-06-19T12:00:00.000Z',
                },
                sourceMap: { legacy: 'test' },
                listingTypes: ['legacy sale listings'],
                leadTypes: ['legacy buyer'],
                digitalProducts: ['legacy buyer guide'],
            } as any,
        };

        const migrated = migrateBusinessBlueprint(legacyBlueprint);

        expect(migrated?.realEstateBlueprint.agentProfile).toBeDefined();
        expect(migrated?.realEstateBlueprint.publicDirectory.route).toBe('/listados');
        expect(migrated?.realEstateBlueprint.listingTypes).toEqual(['legacy sale listings']);
        expect(migrated?.realEstateBlueprint.leadTypes).toEqual(['legacy buyer']);
        expect(migrated?.realEstateBlueprint.digitalProducts).toEqual(['legacy buyer guide']);
        expect(migrated?.realEstateBlueprint.metadata.userModified).toBe(true);
        expect(migrated?.realEstateBlueprint.metadata.lockedFromRegeneration).toBe(true);
    });

    it('protects user-modified or locked modules from regeneration', () => {
        const base = createBusinessBlueprintFromWebsitePlan(buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
        });

        expect(shouldProtectFromRegeneration(base.websiteBlueprint)).toBe(false);

        expect(shouldProtectFromRegeneration({
            ...base.websiteBlueprint,
            metadata: { ...base.websiteBlueprint.metadata, userModified: true },
        })).toBe(true);

        expect(shouldProtectFromRegeneration({
            ...base.websiteBlueprint,
            metadata: { ...base.websiteBlueprint.metadata, lockedFromRegeneration: true },
        })).toBe(true);
    });

    it('preserves projects.data.businessBlueprint when loading a Supabase project row', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
            projectId: 'project_123',
            tenantId: 'tenant_123',
        });

        const project = mapSupabaseRowToProject({
            id: 'project_123',
            name: 'Quimera Fit Store',
            user_id: 'user_123',
            tenant_id: 'tenant_123',
            status: 'Draft',
            data: {
                name: 'Quimera Fit Store',
                data: { hero: { title: 'Quimera Fit Store' } },
                theme: {
                    globalColors: {
                        primary: '#0f766e',
                    },
                },
                componentOrder: ['hero', 'footer'],
                sectionVisibility: { hero: true, footer: true },
                businessBlueprint: blueprint,
            },
        });

        expect(project.businessBlueprint).toBe(blueprint);
        expect(project.tenantId).toBe('tenant_123');
    });

    it('attaches an AI Studio business blueprint to a generated project preview', () => {
        const project = attachAiStudioBusinessBlueprint({
            id: 'project_ai_studio',
            name: 'Quimera Fit Store',
        }, buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
            tenantId: 'tenant_ai',
            createdBy: 'user_ai',
        });

        expect(project.businessBlueprint.projectId).toBe('project_ai_studio');
        expect(project.businessBlueprint.tenantId).toBe('tenant_ai');
        expect(project.businessBlueprint.createdBy).toBe('user_ai');
        expect(project.businessBlueprint.source).toBe('ai-studio');
        expect(project.businessBlueprint.websiteBlueprint.sections).toContain('featuredProducts');
        expect(project.businessBlueprint.storefrontBlueprint.enabled).toBe(true);
        expect(project.businessBlueprint.ecommerceBlueprint.enabled).toBe(true);
    });

    it('creates starter ecommerce content with draft guardrails', () => {
        const plan: WebsitePlan = {
            ...buildEcommercePlan(),
            contentMap: {
                ...buildEcommercePlan().contentMap,
                products: [
                    {
                        name: 'Confirmed Kit',
                        category: 'Training gear',
                        description: 'Merchant-provided product with confirmed price and stock.',
                        price: 79,
                        stock: 12,
                    },
                    {
                        name: 'AI Suggested Hoodie',
                        category: 'Apparel',
                        description: 'Do not treat string prices as production-ready.',
                        price: '$49',
                    },
                ],
            },
        };

        const starter = createStarterEcommerceContent(plan);

        expect(starter.starterProducts[0]).toMatchObject({
            name: 'Confirmed Kit',
            suggestedPrice: 79,
            suggestedStock: 12,
            priceSource: 'user-provided',
            stockSource: 'user-provided',
            status: 'needs_review',
        });
        expect(starter.starterProducts[1]).toMatchObject({
            name: 'AI Suggested Hoodie',
            priceSource: 'unset',
            stockSource: 'unset',
            status: 'needs_review',
        });
        expect(starter.discounts[0]).toMatchObject({ status: 'draft' });
        expect(starter.giftCards).toMatchObject({ enabled: true, status: 'draft' });
    });

    it('creates cross-module sync suggestions without overwriting protected modules', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
        });
        const protectedBlueprint = {
            ...blueprint,
            chatbotBlueprint: {
                ...blueprint.chatbotBlueprint,
                metadata: {
                    ...blueprint.chatbotBlueprint.metadata,
                    userModified: true,
                },
            },
        };

        const plan = createCrossModuleSyncPlan(protectedBlueprint, {
            now: '2026-06-19T12:00:00.000Z',
        });

        expect(plan.actions.some(action => action.targetSystem === 'crm' && action.actionType === 'suggest_update')).toBe(true);
        expect(plan.actions.some(action => action.targetSystem === 'emailMarketing' && action.actionType === 'suggest_update')).toBe(true);
        expect(plan.actions.some(action => action.targetSystem === 'storefront' && action.actionType === 'suggest_update')).toBe(true);
        expect(plan.actions.some(action => action.targetSystem === 'ecommerce' && action.requiresConfirmation)).toBe(true);
        expect(plan.protectedActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    targetSystem: 'chatbot',
                    actionType: 'skip_protected',
                    requiresConfirmation: true,
                }),
            ]),
        );
    });

    it('can explicitly convert protected sync actions into suggestions when confirmation is provided', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildEcommercePlan(), {
            now: '2026-06-19T12:00:00.000Z',
        });
        const protectedBlueprint = {
            ...blueprint,
            chatbotBlueprint: {
                ...blueprint.chatbotBlueprint,
                metadata: {
                    ...blueprint.chatbotBlueprint.metadata,
                    lockedFromRegeneration: true,
                },
            },
        };

        const plan = createCrossModuleSyncPlan(protectedBlueprint, {
            now: '2026-06-19T12:00:00.000Z',
            allowProtectedOverwrite: true,
        });

        expect(plan.protectedActions).toHaveLength(0);
        expect(plan.actions.filter(action => action.targetSystem === 'chatbot')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    actionType: 'suggest_update',
                    requiresConfirmation: true,
                }),
            ]),
        );
    });
});
