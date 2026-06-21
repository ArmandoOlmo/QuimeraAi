import { describe, expect, it } from 'vitest';
import { componentRegistry } from '../../data/componentRegistry';
import {
    BUSINESS_BLUEPRINT_SCHEMA_VERSION,
    BUSINESS_BLUEPRINT_VERSION,
} from '../../types/businessBlueprint';
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
