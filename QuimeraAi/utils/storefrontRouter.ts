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

export const STOREFRONT_CATALOG_PATH = 'tienda/productos';

const GENERIC_STOREFRONT_CATALOG_LINKS = new Set([
    '',
    '#products',
    '#store',
    '#tienda',
    '/tienda',
    '/shop',
    '/catalog',
    '/products',
    '/tienda/productos',
    '/tienda/catalogo',
]);

function getCurrentOrigin(): string | null {
    if (typeof window === 'undefined' || !window.location?.origin) return null;
    return window.location.origin;
}

function isLocalDevelopmentHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function getInternalPathFromHref(href: string): string | null {
    const trimmed = href.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('#')) return trimmed.split(/[?]/)[0];

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed);
            const currentOrigin = getCurrentOrigin();
            const isSameOrigin = currentOrigin ? url.origin === currentOrigin : false;
            if (!isSameOrigin && !isLocalDevelopmentHost(url.hostname)) return null;
            return `${url.pathname}${url.hash || ''}`.split(/[?]/)[0] || '/';
        } catch {
            return null;
        }
    }

    if (!trimmed.startsWith('/')) return null;

    return trimmed.split(/[?#]/)[0] || '/';
}

export function buildStorefrontCatalogUrl(storeId?: string | null): string {
    const normalizedStoreId = String(storeId || '').trim().replace(/^\/+|\/+$/g, '');
    return normalizedStoreId
        ? `/store/${normalizedStoreId}/${STOREFRONT_CATALOG_PATH}`
        : `/${STOREFRONT_CATALOG_PATH}`;
}

export function isGenericStorefrontCatalogLink(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const normalized = value.trim().toLowerCase();
    if (GENERIC_STOREFRONT_CATALOG_LINKS.has(normalized)) return true;

    return /^\/store\/[^/]+\/(products|catalog|shop|tienda\/productos|tienda\/catalogo)\/?$/.test(normalized);
}

export function normalizeStorefrontHrefForWebsiteContext(href: string, storeId?: string | null): string | null {
    const normalizedPath = getInternalPathFromHref(href);
    if (!normalizedPath) return null;

    const normalizedStoreId = String(storeId || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
    const path = normalizedPath.replace(/\/+$/, '') || '/';
    const lowerPath = path.toLowerCase();

    if (lowerPath === '#store' || lowerPath === '#tienda') return '/tienda';
    if (lowerPath === '#store/products' || lowerPath === '#store/catalog') return '/tienda/productos';
    if (lowerPath.startsWith('#store/category/')) {
        const slug = path.slice('#store/category/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/categoria/${slug}` : null;
    }
    if (lowerPath.startsWith('#store/product/')) {
        const slug = path.slice('#store/product/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/producto/${slug}` : null;
    }

    if (lowerPath === '/tienda') return '/tienda';
    if (lowerPath === '/products' || lowerPath === '/catalog' || lowerPath === '/shop') return '/tienda/productos';
    if (lowerPath === '/tienda/productos' || lowerPath === '/tienda/catalogo') return '/tienda/productos';
    if (lowerPath.startsWith('/product/')) {
        const slug = path.slice('/product/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/producto/${slug}` : null;
    }
    if (lowerPath.startsWith('/category/')) {
        const slug = path.slice('/category/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/categoria/${slug}` : null;
    }
    if (lowerPath.startsWith('/collection/')) {
        const slug = path.slice('/collection/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/categoria/${slug}` : null;
    }
    if (lowerPath.startsWith('/tienda/producto/')) {
        const slug = path.slice('/tienda/producto/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/producto/${slug}` : null;
    }
    if (lowerPath.startsWith('/tienda/categoria/')) {
        const slug = path.slice('/tienda/categoria/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/categoria/${slug}` : null;
    }
    if (lowerPath === '/checkout') return '/checkout';

    const storeMatch = path.match(/^\/store\/([^/]+)(?:\/(.*))?$/i);
    if (!storeMatch) return null;

    const hrefStoreId = decodeURIComponent(storeMatch[1] || '').toLowerCase();
    if (normalizedStoreId && hrefStoreId !== normalizedStoreId) return null;

    const subPath = (storeMatch[2] || '').replace(/^\/+|\/+$/g, '');
    const lowerSubPath = subPath.toLowerCase();

    if (!lowerSubPath) return '/tienda';
    if (lowerSubPath === 'products' || lowerSubPath === 'catalog' || lowerSubPath === 'shop') return '/tienda/productos';
    if (lowerSubPath === 'tienda' || lowerSubPath === 'tienda/') return '/tienda';
    if (lowerSubPath === 'tienda/productos' || lowerSubPath === 'tienda/catalogo') return '/tienda/productos';
    if (lowerSubPath === 'checkout') return '/checkout';

    if (lowerSubPath.startsWith('tienda/producto/')) {
        const slug = subPath.slice('tienda/producto/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/producto/${slug}` : null;
    }

    if (lowerSubPath.startsWith('tienda/categoria/')) {
        const slug = subPath.slice('tienda/categoria/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/categoria/${slug}` : null;
    }

    if (lowerSubPath.startsWith('product/')) {
        const slug = subPath.slice('product/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/producto/${slug}` : null;
    }

    if (lowerSubPath.startsWith('category/')) {
        const slug = subPath.slice('category/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/categoria/${slug}` : null;
    }

    if (lowerSubPath.startsWith('collection/')) {
        const slug = subPath.slice('collection/'.length).replace(/^\/+|\/+$/g, '');
        return slug ? `/tienda/categoria/${slug}` : null;
    }

    return null;
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
