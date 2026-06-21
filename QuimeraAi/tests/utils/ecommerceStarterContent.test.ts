import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    createStarterContentFromBlueprint,
    type StarterCategoryInsertRow,
    type StarterContentRepository,
    type StarterProductInsertRow,
} from '../../utils/ecommerce/createStarterContentFromBlueprint';
import {
    deriveCrossModuleBlueprints,
    deriveEcommerceBlueprintFromBusinessBrief,
    deriveStorefrontBlueprintFromBusinessBrief,
    deriveWebsiteEcommerceBlocks,
    type AiStudioBusinessBriefInput,
} from '../../utils/aiStudio';
import { mergeAiStudioBlueprint } from '../../utils/businessBlueprint';

function makePlan(input: AiStudioBusinessBriefInput, hasEcommerce = true): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: input.businessName || 'AI Studio Business',
            industry: input.industry || 'general',
            description: input.businessDescription || input.description || '',
            tagline: '',
            services: input.services?.map(service => ({
                name: service.name || '',
                description: service.description || '',
            })) || [],
            contactInfo: {},
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
            visualStyle: input.brandStyle,
        },
        contentMap: {
            pages: [{ title: 'Home', purpose: 'landing', summary: 'Generated home page' }],
            products: [],
        },
        componentPlan: [
            { component: 'hero', reason: 'Primary landing section', confidence: 0.9, source: 'ai' },
            { component: 'services', reason: 'Business offer summary', confidence: 0.8, source: 'ai' },
            { component: 'footer', reason: 'Site footer', confidence: 0.8, source: 'ai' },
        ],
        assetPlan: [],
        qualityGoals: ['draft-only commerce infrastructure'],
    };
}

function deriveBusinessBlueprint(input: AiStudioBusinessBriefInput): BusinessBlueprint {
    const ecommerceBlueprint = deriveEcommerceBlueprintFromBusinessBrief(input);
    const storefrontBlueprint = deriveStorefrontBlueprintFromBusinessBrief(input, ecommerceBlueprint, input.existingWebsitePlan?.brandProfile);
    const websiteEcommerceBlocks = deriveWebsiteEcommerceBlocks(input, ecommerceBlueprint, storefrontBlueprint);
    const crossModule = deriveCrossModuleBlueprints(input, ecommerceBlueprint, storefrontBlueprint);

    return mergeAiStudioBlueprint({
        websitePlan: input.existingWebsitePlan || makePlan(input, ecommerceBlueprint.enabled),
        ecommerceBlueprint,
        storefrontBlueprint,
        websiteEcommerceBlocks,
        chatbotBlueprint: crossModule.chatbotBlueprint,
        leadBlueprint: crossModule.leadBlueprint,
        emailMarketingBlueprint: crossModule.emailMarketingBlueprint,
        options: {
            now: input.now,
            projectId: 'project_c2_test',
            tenantId: 'tenant_c2_test',
            createdBy: 'user_c2_test',
        },
    });
}

interface FakeRepositoryOptions {
    existingCategories?: Array<{ id: string; name?: string; slug?: string; data?: Record<string, unknown> }>;
    existingProducts?: Array<{ id: string; name?: string; slug?: string; data?: Record<string, unknown> }>;
}

function createFakeRepository(options: FakeRepositoryOptions = {}) {
    const insertedCategories: StarterCategoryInsertRow[] = [];
    const insertedProducts: StarterProductInsertRow[] = [];
    const repository: StarterContentRepository = {
        async listCategories() {
            return options.existingCategories || [];
        },
        async listProducts() {
            return options.existingProducts || [];
        },
        async insertCategories(rows) {
            insertedCategories.push(...rows);

            return rows.map((row, index) => ({
                id: `category_${row.slug}_${index}`,
                name: row.name,
                slug: row.slug,
                data: row.data,
            }));
        },
        async insertProducts(rows) {
            insertedProducts.push(...rows);

            return rows.map((row, index) => ({
                id: `product_${row.slug}_${index}`,
                name: row.name,
                slug: row.slug,
                data: row.data,
            }));
        },
    };

    return {
        repository,
        insertedCategories,
        insertedProducts,
    };
}

async function runStarterContent(
    businessBlueprint: BusinessBlueprint,
    repository: StarterContentRepository,
    dryRun: boolean,
) {
    return createStarterContentFromBlueprint({
        projectId: 'project_c2_test',
        storeId: 'project_c2_test',
        userId: 'user_c2_test',
        businessBlueprint,
        ecommerceBlueprint: businessBlueprint.ecommerceBlueprint,
        storefrontBlueprint: businessBlueprint.storefrontBlueprint,
        repository,
        now: '2026-06-21T12:00:00.000Z',
        options: {
            dryRun,
            overwriteExisting: false,
        },
    });
}

describe('ecommerce starter content draft creation', () => {
    it('previews bicycle shop draft categories and products without writes', async () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Bici Premium PR',
            industry: 'Premium bicycle shop in Puerto Rico',
            businessDescription: 'Sells premium bicycles, accessories, repairs, and gift cards.',
            productsServicesText: 'Bikes, accessories, repairs, cycling gear, and gift cards.',
            now: '2026-06-21T12:00:00.000Z',
        });
        const fakeRepo = createFakeRepository();

        const result = await runStarterContent(businessBlueprint, fakeRepo.repository, true);

        expect(result.errors).toEqual([]);
        expect(result.summary.dryRun).toBe(true);
        expect(result.dryRunPreview.categories.map(category => category.name)).toEqual(expect.arrayContaining([
            'Bikes',
            'Accessories',
            'Repairs',
            'Gift Cards',
        ]));
        expect(result.dryRunPreview.products.every(product => product.status === 'draft')).toBe(true);
        expect(fakeRepo.insertedCategories).toEqual([]);
        expect(fakeRepo.insertedProducts).toEqual([]);
    });

    it('creates restaurant gift cards and catering/event drafts without fake inventory', async () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Mesa Moderna',
            industry: 'Modern restaurant in Puerto Rico',
            businessDescription: 'Restaurant with reservations, menu, catering, events, and gift cards.',
            productsServicesText: 'reservations, menu, gift cards, catering packages, event tickets',
            now: '2026-06-21T12:00:00.000Z',
        });
        const fakeRepo = createFakeRepository();

        const result = await runStarterContent(businessBlueprint, fakeRepo.repository, false);
        const productNames = fakeRepo.insertedProducts.map(product => product.name);
        const giftCard = fakeRepo.insertedProducts.find(product => product.data.isGiftCardDraft === true);

        expect(result.errors).toEqual([]);
        expect(giftCard).toBeDefined();
        expect(productNames).toEqual(expect.arrayContaining(['Gift Cards Draft', 'Catering Packages Draft', 'Event Tickets Draft']));
        expect(fakeRepo.insertedProducts.every(product => product.status === 'draft')).toBe(true);
        expect(fakeRepo.insertedProducts.every(product => product.track_inventory === false)).toBe(true);
        expect(fakeRepo.insertedProducts.every(product => product.quantity === 0 && product.inventory_quantity === 0)).toBe(true);
    });

    it('creates realtor digital guide and consultation drafts without a false gift card', async () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Isla Realtor',
            industry: 'Real estate realtor in Puerto Rico',
            businessDescription: 'Realtor focused on buyer leads, seller leads, digital guides, and consultations.',
            productsServicesText: 'buyer guide, seller guide, consultation packages, property resources',
            now: '2026-06-21T12:00:00.000Z',
        });
        const fakeRepo = createFakeRepository();

        const result = await runStarterContent(businessBlueprint, fakeRepo.repository, false);
        const productNames = fakeRepo.insertedProducts.map(product => product.name);

        expect(result.errors).toEqual([]);
        expect(productNames).toEqual(expect.arrayContaining(['Digital Guides Draft', 'Consultation Packages Draft']));
        expect(fakeRepo.insertedProducts.some(product => product.data.isGiftCardDraft === true)).toBe(false);
        expect(fakeRepo.insertedProducts.filter(product => product.is_digital).length).toBeGreaterThan(0);
    });

    it('skips existing content by slug/name and never overwrites userModified rows', async () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Bici Premium PR',
            industry: 'Premium bicycle shop in Puerto Rico',
            businessDescription: 'Sells premium bicycles, accessories, repairs, and gift cards.',
            productsServicesText: 'Bikes, accessories, repairs, cycling gear, and gift cards.',
            now: '2026-06-21T12:00:00.000Z',
        });
        const fakeRepo = createFakeRepository({
            existingCategories: [
                { id: 'existing_bikes', name: 'Bikes', slug: 'bikes', data: { userModified: true } },
            ],
            existingProducts: [
                { id: 'existing_bikes_draft', name: 'Bikes Draft', slug: 'bikes-draft', data: { generatedByAI: true, source: 'ai-studio' } },
                { id: 'existing_accessories_draft', name: 'Accessories Draft', slug: 'accessories-draft', data: { userModified: true } },
            ],
        });

        const result = await runStarterContent(businessBlueprint, fakeRepo.repository, false);

        expect(result.skippedItems).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'category', slug: 'bikes', reason: 'user_modified', existingId: 'existing_bikes' }),
            expect.objectContaining({ type: 'product', slug: 'bikes-draft', reason: 'already_generated', existingId: 'existing_bikes_draft' }),
            expect.objectContaining({ type: 'product', slug: 'accessories-draft', reason: 'user_modified', existingId: 'existing_accessories_draft' }),
        ]));
        expect(fakeRepo.insertedCategories.some(category => category.slug === 'bikes')).toBe(false);
        expect(fakeRepo.insertedProducts.some(product => product.slug === 'bikes-draft')).toBe(false);
        expect(fakeRepo.insertedProducts.some(product => product.slug === 'accessories-draft')).toBe(false);
    });

    it('enforces product guardrails for draft status, review metadata, price, discounts, and inventory', async () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Bici Premium PR',
            industry: 'Premium bicycle shop in Puerto Rico',
            businessDescription: 'Sells premium bicycles, accessories, repairs, and gift cards.',
            productsServicesText: 'Bikes, accessories, repairs, cycling gear, and gift cards.',
            now: '2026-06-21T12:00:00.000Z',
        });
        const fakeRepo = createFakeRepository();

        await runStarterContent(businessBlueprint, fakeRepo.repository, false);

        expect(fakeRepo.insertedProducts.length).toBeGreaterThan(0);
        for (const product of fakeRepo.insertedProducts) {
            expect(product.status).toBe('draft');
            expect(product.data.generatedByAI).toBe(true);
            expect(product.data.needsReview).toBe(true);
            expect(product.data.source).toBe('ai-studio');
            expect(product.data.notPublished).toBe(true);
            expect(product.track_inventory).toBe(false);
            expect(product.quantity).toBe(0);
            expect(product.inventory_quantity).toBe(0);
            expect(product.images).toEqual([]);
            expect(product).not.toHaveProperty('compare_at_price');
            expect(product.data.discountStatus).toBe('none');

            if (product.data.priceSource === 'unset') {
                expect(product).not.toHaveProperty('price');
                expect(product.data.priceDisplay).toBe('Consultar precio');
            }
        }
    });

    it('returns dry-run summary, warnings, missing settings, and readiness blockers', async () => {
        const businessBlueprint = deriveBusinessBlueprint({
            businessName: 'Mesa Moderna',
            industry: 'Modern restaurant in Puerto Rico',
            businessDescription: 'Restaurant with reservations, menu, catering, events, and gift cards.',
            productsServicesText: 'reservations, menu, gift cards, catering packages, event tickets',
            now: '2026-06-21T12:00:00.000Z',
        });
        const fakeRepo = createFakeRepository();

        const result = await runStarterContent(businessBlueprint, fakeRepo.repository, true);

        expect(result.summary).toMatchObject({
            dryRun: true,
            needsReview: true,
            notPublished: true,
        });
        expect(result.summary.categoriesPlanned).toBeGreaterThan(0);
        expect(result.summary.productsPlanned).toBeGreaterThan(0);
        expect(result.warnings.some(warning => /Dry run only/i.test(warning))).toBe(true);
        expect(result.dryRunPreview.missingSettings).toEqual(expect.arrayContaining(['payments', 'inventory']));
        expect(result.dryRunPreview.readinessBlockers.some(blocker => /merchant review/i.test(blocker))).toBe(true);
    });
});
