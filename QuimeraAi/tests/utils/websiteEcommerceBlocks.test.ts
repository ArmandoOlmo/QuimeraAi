import { describe, expect, it } from 'vitest';
import {
    createWebsiteEcommerceBlockSeedsFromSections,
    getWebsiteEcommerceBlockDefinition,
    normalizeWebsiteEcommerceResponsiveBehavior,
    resolveWebsiteEcommerceCTARoute,
    validateWebsiteEcommerceBlock,
    websiteEcommerceBlockRegistry,
} from '../../utils/websiteEcommerceBlocks';

describe('websiteEcommerceBlocks registry', () => {
    it('defines the B1 website ecommerce blocks as presentation-only Ecommerce Engine consumers', () => {
        const requiredTypes = [
            'featuredProducts',
            'productCarousel',
            'categoryShowcase',
            'promoBanner',
            'giftCardBlock',
            'shopCTA',
        ] as const;

        requiredTypes.forEach(type => {
            const definition = getWebsiteEcommerceBlockDefinition(type);
            expect(definition).toBeTruthy();
            expect(definition?.canonicalSystem).toBe('ecommerce-engine');
            expect(definition?.presentationOwner).toBe('website-builder');
            expect(definition?.requiredService).toBe('ecommerce');
            expect(definition?.requiredFeature).toBe('ecommerceEnabled');
            expect(definition?.writes).toEqual([]);
            expect(definition?.defaultTargetRoute).toBeTruthy();
        });

        expect(websiteEcommerceBlockRegistry.featuredProducts.consumes).toEqual(
            expect.arrayContaining(['products', 'prices', 'storefront_routes']),
        );
        expect(websiteEcommerceBlockRegistry.giftCardBlock.consumes).toContain('gift_cards');
    });

    it('creates website ecommerce block seeds from existing website sections', () => {
        const seeds = createWebsiteEcommerceBlockSeedsFromSections([
            'hero',
            'featuredProducts',
            'categoryGrid',
            'saleCountdown',
            'productHero',
            'footer',
        ]);

        expect(seeds.map(seed => seed.type)).toEqual([
            'featuredProducts',
            'categoryShowcase',
            'promoBanner',
            'shopCTA',
        ]);
        expect(seeds[0]).toMatchObject({
            id: 'website-featuredProducts-2',
            source: 'featured',
            targetRoute: '/store',
            settings: { source: { type: 'featured' } },
        });
    });

    it('validates source compatibility and reviewable missing manual selections', () => {
        const manualIssues = validateWebsiteEcommerceBlock({
            id: 'block_1',
            type: 'productCarousel',
            source: 'manual',
            settings: { source: { type: 'manual' } },
        });

        const giftCardIssues = validateWebsiteEcommerceBlock({
            id: 'block_2',
            type: 'giftCardBlock',
            source: 'featured',
        });

        expect(manualIssues).toContainEqual(expect.objectContaining({
            code: 'missing_manual_products',
            severity: 'warning',
        }));
        expect(giftCardIssues).toContainEqual(expect.objectContaining({
            code: 'unsupported_source',
            severity: 'error',
        }));
    });

    it('rejects unsupported block types', () => {
        const issues = validateWebsiteEcommerceBlock({
            id: 'block_3',
            type: 'productEditor',
            source: 'featured',
        });

        expect(issues).toContainEqual(expect.objectContaining({
            code: 'unsupported_block_type',
            severity: 'error',
        }));
    });

    it('normalizes B2 CTA routes and responsive behavior', () => {
        expect(resolveWebsiteEcommerceCTARoute({
            routeType: 'product',
            productId: 'prod_123',
        })).toBe('/product/prod_123');

        expect(resolveWebsiteEcommerceCTARoute({
            routeType: 'collection',
            collectionId: 'spring sale',
        })).toBe('/collection/spring%20sale');

        expect(resolveWebsiteEcommerceCTARoute({
            routeType: 'custom',
            customUrl: 'https://example.com/shop',
        })).toBe('https://example.com/shop');

        expect(resolveWebsiteEcommerceCTARoute({
            routeType: 'product',
            fallbackRoute: '/store',
        })).toBe('/store');

        expect(normalizeWebsiteEcommerceResponsiveBehavior('scroll')).toBe('scroll');
        expect(normalizeWebsiteEcommerceResponsiveBehavior('unknown')).toBe('stack');
    });
});
