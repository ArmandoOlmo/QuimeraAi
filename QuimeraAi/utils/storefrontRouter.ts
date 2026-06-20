export type StorefrontView =
    | 'home'
    | 'products'
    | 'product'
    | 'category'
    | 'checkout'
    | 'order-confirmation'
    | 'account';

export interface StorefrontRouteState {
    view: StorefrontView;
    params: {
        productSlug?: string;
        categorySlug?: string;
        orderId?: string;
    };
}

export function parseStorefrontUrl(url: string): StorefrontRouteState {
    const normalizedUrl = url.split(/[?#]/)[0] || '/';
    const path = normalizedUrl.replace(/^\/store\/[^/]+/, '').replace(/^\//, '') || '/';

    if (/^(products|catalog|shop|tienda\/productos|tienda\/catalogo)\/?$/.test(path)) {
        return { view: 'products', params: {} };
    }

    const productMatch = path.match(/^product\/([^/]+)/);
    if (productMatch) {
        return { view: 'product', params: { productSlug: productMatch[1] } };
    }

    const categoryMatch = path.match(/^category\/([^/]+)/);
    if (categoryMatch) {
        return { view: 'category', params: { categorySlug: categoryMatch[1] } };
    }

    if (path.startsWith('checkout')) {
        return { view: 'checkout', params: {} };
    }

    if (path.startsWith('account')) {
        return { view: 'account', params: {} };
    }

    const orderMatch = path.match(/^order\/([^/]+)/);
    if (orderMatch) {
        return { view: 'order-confirmation', params: { orderId: orderMatch[1].split('?')[0] } };
    }

    return { view: 'home', params: {} };
}
