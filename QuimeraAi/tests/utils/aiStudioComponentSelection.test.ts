import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { ComponentPlan, ComponentSelectionContext } from '../../types/componentRegistry';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    componentAnatomyRegistry,
    componentRegistry,
    designPatternLibrary,
    getComponentAnatomy,
    getComponentDefinition,
} from '../../registry';
import {
    critiqueComponentDesign,
    deriveEcommerceBlueprintFromBusinessBrief,
    deriveStorefrontBlueprintFromBusinessBrief,
    deriveWebsiteEcommerceBlocks,
    selectAiStudioComponents,
    selectComponentsForPage,
    selectComponentVariants,
    validateComponentPlan,
    type AiStudioBusinessBriefInput,
} from '../../utils/aiStudio';
import { mergeAiStudioBlueprint, syncWebsiteBlueprintFromEditor } from '../../utils/businessBlueprint';
import { deriveCrossModuleBlueprints } from '../../utils/aiStudio/deriveCrossModuleBlueprints';

const now = '2026-06-24T12:00:00.000Z';

function plan(input: Partial<AiStudioBusinessBriefInput> = {}, hasEcommerce = false): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: input.businessName || 'AI Design Test',
            industry: input.industry || 'services',
            description: input.businessDescription || input.description || 'Generated business.',
            services: input.services?.map(service => ({
                name: service.name || '',
                description: service.description || '',
            })) || [{ name: 'Consultation', description: 'Service consultation.' }],
            contactInfo: { city: 'San Juan', country: 'Puerto Rico' },
            hasEcommerce,
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
            fonts: ['inter', 'inter'],
        },
        contentMap: {
            pages: [{ title: 'Home', purpose: 'landing', summary: 'Generated page' }],
            products: hasEcommerce ? [{ name: 'Starter Product', category: 'Featured', description: 'Draft product.' }] : [],
            extractedImages: [],
            testimonials: [],
        },
        componentPlan: [
            { component: 'hero', reason: 'First viewport', confidence: 0.9, source: 'ai' },
            { component: hasEcommerce ? 'featuredProducts' : 'services', reason: 'Offer', confidence: 0.8, source: 'ai' },
            { component: 'footer', reason: 'Footer', confidence: 0.8, source: 'ai' },
        ],
        assetPlan: [],
        qualityGoals: ['typed component selection'],
    };
}

function derive(input: AiStudioBusinessBriefInput) {
    const ecommerceBlueprint = deriveEcommerceBlueprintFromBusinessBrief(input);
    const storefrontBlueprint = deriveStorefrontBlueprintFromBusinessBrief(input, ecommerceBlueprint, input.existingWebsitePlan?.brandProfile);
    const websiteEcommerceBlocks = deriveWebsiteEcommerceBlocks(input, ecommerceBlueprint, storefrontBlueprint);
    const crossModule = deriveCrossModuleBlueprints(input, ecommerceBlueprint, storefrontBlueprint);
    const selection = selectAiStudioComponents(input, { ecommerceBlueprint, storefrontBlueprint });
    const variants = selectComponentVariants(selection.componentPlan, selection.context);
    const critic = critiqueComponentDesign({
        componentPlan: selection.componentPlan,
        variantPlan: variants.variants,
        context: selection.context,
    });
    const validation = validateComponentPlan({
        componentPlan: selection.componentPlan,
        variantPlan: variants.variants,
        context: selection.context,
    });

    return {
        ecommerceBlueprint,
        storefrontBlueprint,
        websiteEcommerceBlocks,
        crossModule,
        selection,
        variants,
        critic,
        validation,
    };
}

function selectedIds(result: ReturnType<typeof derive>) {
    return result.selection.componentPlan.selectedComponents.map(component => component.componentId);
}

function variantFor(result: ReturnType<typeof derive>, componentId: string) {
    return result.variants.variants.find(variant => variant.componentId === componentId);
}

describe('AI Component Selection + Design Intelligence Layer', () => {
    it('defines typed component registry contracts and keeps ecommerce blocks presentation-only', () => {
        expect(getComponentDefinition('hero')).toBeTruthy();
        expect(getComponentDefinition('notAComponent')).toBeUndefined();

        const featuredProducts = getComponentDefinition('featuredProducts');
        expect(featuredProducts).toMatchObject({
            family: 'website_ecommerce_block',
            compatibleBuilders: ['website'],
            implementationStatus: 'rendered',
            requiredFeature: 'ecommerceEnabled',
        });
        expect(featuredProducts?.dataAccess.canonicalSystem).toBe('ecommerce-engine');
        expect(featuredProducts?.dataAccess.presentationOwner).toBe('website-builder');
        expect(featuredProducts?.dataAccess.writes).toEqual([]);

        expect(componentRegistry.some(component => component.family === 'storefront_section')).toBe(true);
        expect(componentRegistry.some(component => component.family === 'restaurant_block')).toBe(true);
        expect(componentRegistry.some(component => component.family === 'real_estate_block')).toBe(true);
        expect(getComponentDefinition('propertySearch')?.implementationStatus).toBe('planned');
        expect(getComponentDefinition('about')?.implementationStatus).toBe('metadata_only');
    });

    it('maps required anatomy variants, slots, and mobile behavior for initial components', () => {
        const initialComponents = [
            'hero',
            'about',
            'services',
            'features',
            'testimonials',
            'faq',
            'footer',
            'featuredProducts',
            'categoryShowcase',
            'productCarousel',
            'shopCTA',
            'leadForm',
            'appointmentCTA',
            'gallery',
            'imageWithText',
            'pricing',
            'process',
            'stats',
            'contact',
            'collectionBanner',
            'productHero',
            'saleCountdown',
            'trustBadges',
            'newsletter',
            'header',
        ] as const;

        initialComponents.forEach(componentId => {
            const anatomy = getComponentAnatomy(componentId);
            expect(anatomy?.layoutVariants.length).toBeGreaterThan(0);
            expect(anatomy?.styleVariants.length).toBeGreaterThan(0);
            expect(anatomy?.availableSlots.length).toBeGreaterThan(0);
            expect(anatomy?.fallbackVariant).toBeTruthy();
            expect(anatomy?.antiPatterns.length).toBeGreaterThan(0);
            expect(anatomy?.mobileBehaviorOptions.length).toBeGreaterThan(0);
            expect(anatomy?.layoutVariants.every(variant => Boolean(variant.mobileBehavior))).toBe(true);
        });
        expect(componentAnatomyRegistry.hero.layoutVariants.map(variant => variant.id)).toEqual(expect.arrayContaining([
            'centeredMinimal',
            'splitMediaRight',
            'editorialOverlay',
            'productSpotlight',
            'gradientOrb',
            'imageBackground',
            'stackedMobile',
        ]));
    });

    it('keeps design pattern recommendations abstract and mapped to registered variants', () => {
        designPatternLibrary.forEach(pattern => {
            expect(pattern.doNotCopyNotes.join(' ')).toMatch(/Do not copy/i);
            expect(pattern.designPrinciples.length).toBeGreaterThan(0);
            expect(pattern.recommendedComponents.length).toBeGreaterThan(0);

            pattern.recommendedComponents.forEach(recommendation => {
                const anatomy = getComponentAnatomy(recommendation.componentId);
                expect(anatomy, `${pattern.patternId}.${recommendation.componentId}`).toBeTruthy();
                expect(
                    anatomy?.layoutVariants.some(variant => variant.id === recommendation.layoutVariant),
                    `${pattern.patternId}.${recommendation.componentId}.${recommendation.layoutVariant}`,
                ).toBe(true);
            });
        });
    });

    it('rejects storefront-only sections mounted into Website Builder and invalid variants', () => {
        const context: ComponentSelectionContext = {
            builder: 'website',
            inputText: 'storefront catalog',
            industry: 'ecommerce',
            pageIntent: 'storefront_home',
            capabilities: ['ecommerce'],
            availableData: { productsCount: 4, categoriesCount: 2, hasDraftProducts: true },
        };
        const componentPlan: ComponentPlan = {
            pageIntent: 'storefront_home',
            industry: 'ecommerce',
            capabilities: ['ecommerce'],
            selectedComponents: [{
                componentId: 'storefrontFeaturedProducts',
                implementationStatus: 'rendered',
                confidence: 0.9,
                reason: 'bad mount',
                score: 0.9,
                recommendedPosition: 'middle',
                scoreBreakdown: {
                    industryMatch: 1,
                    pageIntentMatch: 1,
                    dataAvailability: 1,
                    conversionGoalMatch: 1,
                    visualFit: 1,
                    mobileFit: 1,
                    penalties: 0,
                    total: 0.9,
                },
                sourceMap: {},
            }],
            optionalComponents: [],
            rejectedComponents: [],
            reasons: [],
            confidence: 0.9,
            sourceMap: {},
            warnings: [],
        };

        const validation = validateComponentPlan({
            componentPlan,
            context,
            variantPlan: [{
                componentId: 'storefrontFeaturedProducts',
                layoutVariant: 'inventedVariant',
                styleVariant: 'inventedStyle',
                activeSlots: ['headline'],
                backgroundChoice: 'plain',
                mediaTreatment: 'productMedia',
                density: 'balanced',
                mobileBehavior: 'stackedMobile',
                designPatternIds: [],
                designRationale: 'invalid',
                confidence: 0.9,
                sourceMap: {},
            }],
        });

        expect(validation.valid).toBe(false);
        expect(validation.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
            'forbidden_storefront_in_website',
            'incompatible_builder',
            'unknown_variant',
            'unknown_style_variant',
        ]));
    });

    it('warns when testimonials would imply proof without real testimonial or review data', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Caribe Repair',
            industry: 'Local service business',
            businessDescription: 'Local repair company offering inspections, estimates, and appointments.',
            productsServicesText: 'repair services estimates appointments local business',
            services: [{ name: 'Inspection', description: 'Home repair inspection.' }],
            existingWebsitePlan: plan({ industry: 'Local service business' }, false),
            now,
        };
        const result = derive(input);

        expect(selectedIds(result)).toContain('testimonials');
        expect(result.validation.issues).toContainEqual(expect.objectContaining({
            componentId: 'testimonials',
            code: 'fake_data_risk',
            severity: 'warning',
            fallbackComponentId: 'trustBadges',
        }));
    });

    it('does not mount planned or metadata-only selections as rendered website sections', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Isla Homes',
            industry: 'Real estate realtor',
            businessDescription: 'Realtor for buyers, sellers, listings, neighborhoods, and consultations.',
            productsServicesText: 'real estate listings property search buyer seller leads neighborhoods',
            existingWebsitePlan: plan({ industry: 'Real estate realtor' }, false),
            now,
        };
        const result = derive(input);
        const merged = mergeAiStudioBlueprint({
            websitePlan: input.existingWebsitePlan!,
            ecommerceBlueprint: result.ecommerceBlueprint,
            storefrontBlueprint: result.storefrontBlueprint,
            websiteEcommerceBlocks: result.websiteEcommerceBlocks,
            componentSelectionContext: result.selection.context,
            componentPlan: result.selection.componentPlan,
            componentVariantPlan: result.variants.variants,
            designCritic: result.critic,
            componentValidation: result.validation,
            chatbotBlueprint: result.crossModule.chatbotBlueprint,
            leadBlueprint: result.crossModule.leadBlueprint,
            emailMarketingBlueprint: result.crossModule.emailMarketingBlueprint,
            options: { now },
        });

        expect(selectedIds(result)).toContain('propertySearch');
        expect(result.validation.issues.map(issue => issue.code)).toContain('planned_component');
        expect(merged.websiteBlueprint.sections).not.toContain('propertyDirectory');
    });

    it('selects premium product-led variants for electric bikes with ecommerce and service CTAs', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Volt Bikes PR',
            industry: 'Premium electric bikes and cycling retail',
            businessDescription: 'Sells premium electric bikes, accessories, repairs, test rides, and gift cards.',
            productsServicesText: 'electric bikes accessories repairs test rides gift cards',
            hasEcommerce: true,
            existingWebsitePlan: plan({
                industry: 'Premium electric bikes and cycling retail',
                businessDescription: 'Sells premium electric bikes and repairs.',
            }, true),
            now,
        };
        const result = derive(input);

        expect(result.selection.componentPlan.pageIntent).toBe('ecommerce_home');
        expect(selectedIds(result)).toEqual(expect.arrayContaining(['hero', 'featuredProducts', 'appointmentCTA']));
        expect(['productSpotlight', 'splitMediaRight']).toContain(variantFor(result, 'hero')?.layoutVariant);
        expect(['premiumCards', 'editorialProductSpotlight', 'grid']).toContain(variantFor(result, 'featuredProducts')?.layoutVariant);
        expect(result.validation.valid).toBe(true);
    });

    it('uses editorial gallery patterns and avoids ecommerce blocks for modern art galleries', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Galeria Norte',
            industry: 'Modern art gallery and portfolio',
            businessDescription: 'Editorial gallery for artists, exhibitions, portfolios, and events.',
            productsServicesText: 'gallery exhibitions artist portfolio',
            existingWebsitePlan: {
                ...plan({ industry: 'Modern art gallery' }, false),
                contentMap: {
                    ...plan({ industry: 'Modern art gallery' }, false).contentMap,
                    extractedImages: [{ url: '/art.jpg', recommendedUse: 'gallery' }],
                },
            },
            now,
        };
        const result = derive(input);

        expect(['portfolio_home', 'gallery_home']).toContain(result.selection.componentPlan.pageIntent);
        expect(selectedIds(result)).toContain('gallery');
        expect(selectedIds(result)).not.toContain('featuredProducts');
        expect(['editorialOverlay', 'imageBackground']).toContain(variantFor(result, 'hero')?.layoutVariant);
    });

    it('selects warm restaurant menu, reservation, and location rhythm without generic product grids', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Mesa Clara',
            industry: 'Warm editorial restaurant',
            businessDescription: 'Restaurant with seasonal menu, reservations, catering, private events, and gift cards.',
            productsServicesText: 'restaurant menu reservations catering private events gift cards location hours',
            now,
        };
        const result = derive(input);

        expect(result.selection.componentPlan.pageIntent).toBe('restaurant_home');
        expect(selectedIds(result)).toEqual(expect.arrayContaining(['restaurantMenu', 'restaurantReservation', 'restaurantLocation']));
        expect(selectedIds(result)).not.toContain('productCarousel');
        expect(variantFor(result, 'restaurantMenu')?.layoutVariant).toBe('editorialMenu');
    });

    it('selects SaaS, local service, and real-estate patterns with valid mobile variants', () => {
        const saas = derive({
            businessName: 'PromptOps',
            industry: 'AI SaaS app',
            businessDescription: 'AI automation software platform with workflows, pricing, and FAQ.',
            productsServicesText: 'AI SaaS software automation workflow subscription pricing',
            now,
        });
        expect(saas.selection.componentPlan.pageIntent).toBe('ai_saas_landing');
        expect(selectedIds(saas)).toEqual(expect.arrayContaining(['hero', 'features', 'process', 'pricing', 'faq']));
        expect(['gradientOrb', 'splitMediaRight']).toContain(variantFor(saas, 'hero')?.layoutVariant);

        const localService = derive({
            businessName: 'Caribe Repair',
            industry: 'Local service business',
            businessDescription: 'Local repair company offering inspections, services, estimates, and appointments.',
            productsServicesText: 'repair services estimates appointments local business',
            services: [{ name: 'Inspection', description: 'Home repair inspection.' }],
            now,
        });
        expect(selectedIds(localService)).toEqual(expect.arrayContaining(['services', 'trustBadges', 'process', 'leadForm']));

        const realEstate = derive({
            businessName: 'Isla Homes',
            industry: 'Real estate realtor',
            businessDescription: 'Realtor for buyers, sellers, listings, neighborhoods, and consultations.',
            productsServicesText: 'real estate listings property search buyer seller leads neighborhoods',
            now,
        });
        expect(realEstate.selection.componentPlan.pageIntent).toBe('real_estate_home');
        expect(selectedIds(realEstate)).toEqual(expect.arrayContaining(['propertySearch', 'realEstateListings', 'leadForm']));

        [...saas.variants.variants, ...localService.variants.variants, ...realEstate.variants.variants].forEach(variant => {
            const anatomy = getComponentAnatomy(variant.componentId);
            expect(variant.mobileBehavior).toBeTruthy();
            expect(variant.activeSlots.every(slotId => anatomy?.availableSlots.some(slot => slot.id === slotId))).toBe(true);
        });
    });

    it('falls back to shopCTA when ecommerce lacks product and category data', () => {
        const context: ComponentSelectionContext = {
            builder: 'website',
            inputText: 'ecommerce store coming soon',
            industry: 'ecommerce',
            pageIntent: 'ecommerce_home',
            capabilities: ['ecommerce', 'leadGeneration'],
            availableData: { productsCount: 0, categoriesCount: 0, hasDraftProducts: false },
        };
        const componentPlan = selectComponentsForPage(context);

        expect(componentPlan.selectedComponents.map(component => component.componentId)).toContain('shopCTA');
        expect(componentPlan.selectedComponents.map(component => component.componentId)).not.toContain('featuredProducts');
        expect(componentPlan.selectedComponents.map(component => component.componentId)).not.toContain('productCarousel');
    });

    it('Design Critic flags repetitive centered/grid plans and passes varied plans', () => {
        const context = derive({
            businessName: 'Varied Co',
            industry: 'AI SaaS app',
            businessDescription: 'AI SaaS software with pricing and workflows.',
            productsServicesText: 'AI SaaS workflow pricing',
            now,
        });
        expect(context.critic.scores.total).toBeGreaterThanOrEqual(80);

        const badCritic = critiqueComponentDesign({
            componentPlan: {
                ...context.selection.componentPlan,
                pageIntent: 'ecommerce_home',
            },
            context: context.selection.context,
            variantPlan: ['hero', 'features', 'services', 'testimonials'].map(componentId => ({
                componentId: componentId as any,
                layoutVariant: componentId === 'hero' ? 'centeredMinimal' : 'cardsGrid',
                styleVariant: 'clean',
                activeSlots: ['headline'],
                backgroundChoice: 'plain',
                mediaTreatment: 'none',
                density: 'balanced',
                mobileBehavior: 'stackedMobile',
                designPatternIds: [],
                designRationale: 'bad test',
                confidence: 0.8,
                sourceMap: {},
            })),
        });

        expect(badCritic.passed).toBe(false);
        expect(badCritic.scores.total).toBeLessThan(80);
        expect(badCritic.designIssues.map(issue => issue.code)).toEqual(expect.arrayContaining([
            'excessive_grids',
            'generic_hero',
        ]));
    });

    it('merges design metadata into BusinessBlueprint without overwriting protected user sections', () => {
        const input: AiStudioBusinessBriefInput = {
            businessName: 'Locked Bikes',
            industry: 'Premium electric bikes',
            businessDescription: 'Sells electric bikes, repairs, accessories, and test rides.',
            productsServicesText: 'electric bikes repairs accessories test rides',
            hasEcommerce: true,
            existingWebsitePlan: plan({ industry: 'Premium electric bikes' }, true),
            now,
        };
        const result = derive(input);
        const basePlan = input.existingWebsitePlan!;
        const existing = syncWebsiteBlueprintFromEditor({
            projectId: 'project_locked_design',
            projectName: 'Locked Bikes',
            userId: 'user_locked',
            data: { hero: { headline: 'Manual headline' } } as any,
            theme: {
                cardBorderRadius: 'md',
                buttonBorderRadius: 'md',
                fontFamilyHeader: 'inter',
                fontFamilyBody: 'inter',
                fontFamilyButton: 'inter',
                pageBackground: '#ffffff',
                globalColors: {
                    primary: '#0f766e',
                    secondary: '#111827',
                    accent: '#f59e0b',
                    background: '#ffffff',
                    surface: '#f8fafc',
                    text: '#111827',
                    textMuted: '#64748b',
                    heading: '#111827',
                    border: '#e5e7eb',
                    success: '#16a34a',
                    error: '#dc2626',
                },
            } as any,
            componentOrder: ['hero', 'featuredProducts', 'footer'],
            sectionVisibility: { hero: true, featuredProducts: true, footer: true } as any,
            action: 'section_settings',
            touchedSection: 'hero',
            now,
        }) as BusinessBlueprint;

        const merged = mergeAiStudioBlueprint({
            existingBusinessBlueprint: existing,
            websitePlan: basePlan,
            ecommerceBlueprint: result.ecommerceBlueprint,
            storefrontBlueprint: result.storefrontBlueprint,
            websiteEcommerceBlocks: result.websiteEcommerceBlocks,
            componentSelectionContext: result.selection.context,
            componentPlan: result.selection.componentPlan,
            componentVariantPlan: result.variants.variants,
            designCritic: result.critic,
            componentValidation: result.validation,
            chatbotBlueprint: result.crossModule.chatbotBlueprint,
            leadBlueprint: result.crossModule.leadBlueprint,
            emailMarketingBlueprint: result.crossModule.emailMarketingBlueprint,
            options: { now },
        });

        const hero = merged.websiteBlueprint.sectionBlueprints?.find(section => section.type === 'hero');
        const products = merged.websiteBlueprint.sectionBlueprints?.find(section => section.type === 'featuredProducts');

        expect(hero?.settings).toMatchObject({ headline: 'Manual headline' });
        expect(hero?.metadata.lockedFromRegeneration).toBe(true);
        expect(products?.componentId).toBe('featuredProducts');
        expect(products?.layoutVariant).toBeTruthy();
        expect(products?.designScore).toBeGreaterThan(0);
        expect(merged.sourceMap.componentSelection).toBe('aiStudio.componentSelection');
    });
});
