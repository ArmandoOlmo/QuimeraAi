import { describe, expect, it } from 'vitest';
import {
    filterRenderableStorefrontProducts,
    getSafeDiscountBadge,
    getSafeProductPrice,
    getSafeProductTitle,
    isRenderableStorefrontProduct,
} from '../../utils/ecommerce/productDisplayGuards';

describe('productDisplayGuards', () => {
    it('does not render placeholder product names as public cards', () => {
        expect(isRenderableStorefrontProduct({
            id: 'prod_placeholder',
            name: 'Producto sin nombre',
            price: 25,
        })).toBe(false);
        expect(getSafeProductTitle({ name: 'Unnamed product' })).toBeUndefined();
    });

    it('does not render products with empty names', () => {
        expect(isRenderableStorefrontProduct({
            id: 'prod_empty_name',
            name: '   ',
            price: 25,
        })).toBe(false);
    });

    it('does not display $0.00 unless the product is explicitly free', () => {
        expect(getSafeProductPrice({
            id: 'prod_needs_price',
            name: 'Needs Price',
            price: 0,
        }).displayText).toBe('Consultar precio');

        expect(getSafeProductPrice({
            id: 'prod_free',
            name: 'Free Guide',
            price: 0,
            allowFreePrice: true,
        }).displayText).toBe('$0.00');
    });

    it('does not create -100% discount badges', () => {
        expect(getSafeDiscountBadge({
            id: 'prod_zero_sale',
            name: 'Zero Sale',
            price: 0,
            compareAtPrice: 100,
        })).toBeUndefined();
    });

    it('does not create discount badges for invalid compare-at prices', () => {
        expect(getSafeDiscountBadge({
            id: 'prod_invalid_sale',
            name: 'Invalid Sale',
            price: 50,
            compareAtPrice: 50,
        })).toBeUndefined();

        expect(getSafeDiscountBadge({
            id: 'prod_valid_sale',
            name: 'Valid Sale',
            price: 80,
            compareAtPrice: 100,
        })).toEqual({ label: '-20%', percent: 20 });
    });

    it('keeps valid storefront products renderable', () => {
        expect(isRenderableStorefrontProduct({
            id: 'prod_valid',
            name: 'Cafe Premium',
            price: 18,
            slug: 'cafe-premium',
        })).toBe(true);
    });

    it('filters sections with only invalid products down to an empty list', () => {
        const products = filterRenderableStorefrontProducts([
            { id: 'prod_1', name: 'Producto sin nombre', price: 0 },
            { id: 'prod_2', name: '', price: 20 },
        ]);

        expect(products).toEqual([]);
    });
});
