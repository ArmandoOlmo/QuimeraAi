import { describe, expect, it } from 'vitest';
import {
    buildStorefrontCatalogUrl,
    isGenericStorefrontCatalogLink,
    parseStorefrontUrl,
} from '../../utils/storefrontRouter';

describe('storefrontRouter', () => {
    it('keeps storefront home and /tienda as landing pages', () => {
        expect(parseStorefrontUrl('/store/store_123')).toMatchObject({ view: 'home' });
        expect(parseStorefrontUrl('/store/store_123/')).toMatchObject({ view: 'home' });
        expect(parseStorefrontUrl('/store/store_123/tienda')).toMatchObject({ view: 'home' });
        expect(parseStorefrontUrl('/tienda')).toMatchObject({ view: 'home' });
    });

    it('routes explicit catalog paths to the all-products page', () => {
        expect(parseStorefrontUrl('/store/store_123/products')).toMatchObject({ view: 'products' });
        expect(parseStorefrontUrl('/store/store_123/catalog')).toMatchObject({ view: 'products' });
        expect(parseStorefrontUrl('/store/store_123/shop')).toMatchObject({ view: 'products' });
        expect(parseStorefrontUrl('/store/store_123/tienda/productos')).toMatchObject({ view: 'products' });
        expect(parseStorefrontUrl('/store/store_123/tienda/catalogo')).toMatchObject({ view: 'products' });
    });

    it('builds canonical storefront catalog links while accepting legacy generic links', () => {
        expect(buildStorefrontCatalogUrl('store_123')).toBe('/store/store_123/tienda/productos');
        expect(buildStorefrontCatalogUrl()).toBe('/tienda/productos');
        expect(isGenericStorefrontCatalogLink('/store/store_123/products')).toBe(true);
        expect(isGenericStorefrontCatalogLink('/store/store_123/tienda/productos')).toBe(true);
        expect(isGenericStorefrontCatalogLink('/tienda')).toBe(true);
        expect(isGenericStorefrontCatalogLink('/custom-sale')).toBe(false);
    });

    it('parses product, category, checkout, account, and order routes', () => {
        expect(parseStorefrontUrl('/store/store_123/product/sku-1?preview=1')).toEqual({
            view: 'product',
            params: { productSlug: 'sku-1' },
        });
        expect(parseStorefrontUrl('/store/store_123/category/art')).toEqual({
            view: 'category',
            params: { categorySlug: 'art' },
        });
        expect(parseStorefrontUrl('/store/store_123/checkout')).toMatchObject({ view: 'checkout' });
        expect(parseStorefrontUrl('/store/store_123/account')).toMatchObject({ view: 'account' });
        expect(parseStorefrontUrl('/store/store_123/order/order_123')).toEqual({
            view: 'order-confirmation',
            params: { orderId: 'order_123' },
        });
    });
});
