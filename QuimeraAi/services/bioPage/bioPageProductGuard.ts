import type { PublicStorefrontCatalog, PublicStorefrontProduct } from '../../utils/ecommerce/publicStorefrontCatalog';
import { filterRenderableStorefrontProducts } from '../../utils/ecommerce/productDisplayGuards';
import type { BioPageBlock, BioPageProduct } from './bioPageTypes';

const PUBLIC_BIO_PRODUCT_STATUSES = new Set(['active', 'published', 'live']);

export function getBioPageEligibleStorefrontProducts(
    catalog: Pick<PublicStorefrontCatalog, 'products' | 'source'>,
): PublicStorefrontProduct[] {
    if (catalog.source !== 'store-products') return [];

    return filterRenderableStorefrontProducts(catalog.products).filter(product => {
        const status = String(product.status || 'active').trim().toLocaleLowerCase();
        return !status || PUBLIC_BIO_PRODUCT_STATUSES.has(status);
    });
}

export function mapStorefrontProductToBioPageProduct(
    product: PublicStorefrontProduct,
    projectId: string,
): BioPageProduct {
    return {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || product.images?.[0]?.url || '',
        url: `/store/${projectId}/product/${product.slug}`,
        slug: product.slug,
        status: product.status,
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        categorySlug: product.categorySlug,
    };
}

const readStringArray = (value: unknown): string[] => (
    Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        : []
);

const normalizeCollectionKey = (value: unknown): string => (
    String(value || '')
        .trim()
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
);

function productMatchesCollection(product: BioPageProduct, collectionId: string): boolean {
    const target = normalizeCollectionKey(collectionId);
    if (!target) return false;
    return [
        product.categoryId,
        product.categorySlug,
        product.categoryName,
    ].some(value => normalizeCollectionKey(value) === target);
}

export function filterBioPageProductsForBlock(
    products: BioPageProduct[],
    block: Pick<BioPageBlock, 'type' | 'data'>,
): BioPageProduct[] {
    const productIds = readStringArray(block.data?.productIds);
    const collectionIds = readStringArray(block.data?.collectionIds);

    return products.filter(product => {
        const productMatches = productIds.length === 0 || productIds.includes(product.id);
        const collectionMatches = block.type !== 'product_collection'
            || collectionIds.length === 0
            || collectionIds.some(collectionId => productMatchesCollection(product, collectionId));

        return productMatches && collectionMatches;
    });
}

export function filterBioPageProductsForQuery(
    products: BioPageProduct[],
    query: string,
): BioPageProduct[] {
    const normalizedQuery = normalizeCollectionKey(query);
    if (!normalizedQuery) return products;

    return products.filter(product => [
        product.name,
        product.slug,
        product.categoryName,
        product.categorySlug,
        product.categoryId,
    ].some(value => normalizeCollectionKey(value).includes(normalizedQuery)));
}
