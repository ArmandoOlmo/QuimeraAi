import { describe, expect, it } from 'vitest';
import {
    buildStorefrontCatalogUrl,
    isGenericStorefrontCatalogLink,
    normalizeStorefrontHrefForWebsiteContext,
    parseStorefrontUrl,
} from '../../utils/storefrontRouter';

describe('storefrontRouter', () => {
    it('builds canonical storefront catalog URLs', () => {
        expect(buildStorefrontCatalogUrl('abc')).toBe('/store/abc/tienda/productos');
        expect(buildStorefrontCatalogUrl()).toBe('/tienda/productos');
        expect(buildStorefrontCatalogUrl(null)).toBe('/tienda/productos');
    });

    it('keeps storefront home and /tienda as landing pages', () => {
        expect(parseStorefrontUrl('/store/store_123')).toMatchObject({ view: 'home' });
        expect(parseStorefrontUrl('/store/store_123/')).toMatchObject({ view: 'home' });
        expect(parseStorefrontUrl('/store/store_123/tienda')).toMatchObject({ view: 'home' });
        expect(parseStorefrontUrl('/tienda')).toMatchObject({ view: 'home' });
    });

    it('recognizes generic storefront catalog links', () => {
        expect(isGenericStorefrontCatalogLink('/products')).toBe(true);
        expect(isGenericStorefrontCatalogLink('/catalog')).toBe(true);
        expect(isGenericStorefrontCatalogLink('/shop')).toBe(true);
        expect(isGenericStorefrontCatalogLink('/tienda/productos')).toBe(true);
        expect(isGenericStorefrontCatalogLink('/store/abc/tienda/productos')).toBe(true);
        expect(isGenericStorefrontCatalogLink('/custom-sale')).toBe(false);
    });

    it('routes explicit catalog paths to the all-products page', () => {
        expect(parseStorefrontUrl('/store/abc/tienda/productos')).toMatchObject({ view: 'products' });
        expect(parseStorefrontUrl('/store/abc/products')).toMatchObject({ view: 'products' });
        expect(parseStorefrontUrl('/store/abc/catalog')).toMatchObject({ view: 'products' });
        expect(parseStorefrontUrl('/store/abc/shop')).toMatchObject({ view: 'products' });
        expect(parseStorefrontUrl('/store/abc/tienda/catalogo')).toMatchObject({ view: 'products' });
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

    it('normalizes storefront links for generated website/editor contexts', () => {
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc', 'abc')).toBe('/tienda');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/', 'abc')).toBe('/tienda');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/products', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/catalog', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/shop', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/tienda/productos', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/tienda/catalogo', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/product/red-bike', 'abc')).toBe('/tienda/producto/red-bike');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/category/bikes', 'abc')).toBe('/tienda/categoria/bikes');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/collection/bikes', 'abc')).toBe('/tienda/categoria/bikes');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/tienda/producto/red-bike', 'abc')).toBe('/tienda/producto/red-bike');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/tienda/categoria/bikes', 'abc')).toBe('/tienda/categoria/bikes');
        expect(normalizeStorefrontHrefForWebsiteContext('/store/abc/checkout', 'abc')).toBe('/checkout');
        expect(normalizeStorefrontHrefForWebsiteContext('#store', 'abc')).toBe('/tienda');
        expect(normalizeStorefrontHrefForWebsiteContext('#store/products', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/products', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/catalog', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/shop', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/product/red-bike', 'abc')).toBe('/tienda/producto/red-bike');
        expect(normalizeStorefrontHrefForWebsiteContext('/category/bikes', 'abc')).toBe('/tienda/categoria/bikes');
        expect(normalizeStorefrontHrefForWebsiteContext('/collection/bikes', 'abc')).toBe('/tienda/categoria/bikes');
        expect(normalizeStorefrontHrefForWebsiteContext('/tienda', 'abc')).toBe('/tienda');
        expect(normalizeStorefrontHrefForWebsiteContext('/tienda/productos', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/tienda/catalogo', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('/tienda/producto/red-bike', 'abc')).toBe('/tienda/producto/red-bike');
        expect(normalizeStorefrontHrefForWebsiteContext('/tienda/categoria/bikes', 'abc')).toBe('/tienda/categoria/bikes');
    });

    it('normalizes same-origin and local absolute storefront links without intercepting external URLs', () => {
        expect(normalizeStorefrontHrefForWebsiteContext(`${window.location.origin}/store/abc/products`, 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('http://127.0.0.1:3000/store/abc/products', 'abc')).toBe('/tienda/productos');
        expect(normalizeStorefrontHrefForWebsiteContext('https://example.com/store/abc', 'abc')).toBeNull();
    });
});
