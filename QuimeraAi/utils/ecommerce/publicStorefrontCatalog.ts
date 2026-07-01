import { supabase } from '../../supabase';
import type { EcommerceBlueprint, StarterProductBlueprint } from '../../types/businessBlueprint';
import {
    buildStoreIdentityOrFilter,
    getStoreIdentityQueryIds,
    isSupabaseUuid,
    resolveProjectBackedStoreIdentity,
} from './storeIdentity';

export interface PublicStorefrontProductImage {
    id: string;
    url: string;
    altText?: string;
    position: number;
}

export interface PublicStorefrontProductVariant {
    id: string;
    name: string;
    sku?: string;
    price: number;
    quantity?: number;
    options?: Array<{ name: string; value: string }>;
    inStock: boolean;
}

export interface PublicStorefrontCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    count?: number;
}

export interface PublicStorefrontProduct {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    price: number;
    compareAtPrice?: number;
    images: PublicStorefrontProductImage[];
    imageUrl?: string;
    categoryId?: string;
    categoryName?: string;
    categorySlug?: string;
    tags?: string[];
    variants?: PublicStorefrontProductVariant[];
    trackInventory: boolean;
    quantity?: number;
    lowStockThreshold?: number;
    inStock: boolean;
    lowStock: boolean;
    isFeatured?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    status?: string;
    storeId: string;
    userId: string;
    reviewStats?: {
        averageRating: number;
        totalReviews: number;
    };
    averageRating?: number;
    reviewCount?: number;
    createdAt?: any;
    updatedAt: any;
}

export interface PublicStorefrontCatalog {
    products: PublicStorefrontProduct[];
    categories: PublicStorefrontCategory[];
    projectData?: Record<string, any> | null;
    source: 'store-products' | 'blueprint' | 'empty';
}

interface StorefrontIdentityContext {
    queryIds: string[];
    projectData?: Record<string, any> | null;
    publicStore?: Record<string, any> | null;
}

const DEFAULT_MAX_PRODUCTS = 250;

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const asString = (value: unknown): string | undefined => (
    typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const asNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string' || !value.trim()) return undefined;

    const parsed = Number(value.replace(/[$,\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
};

const unique = (values: Array<string | undefined | null>): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];

    values.forEach(value => {
        const normalized = value?.trim();
        if (!normalized) return;
        const key = normalized.toLocaleLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        result.push(normalized);
    });

    return result;
};

export const slugifyStorefrontCatalogValue = (value: unknown, fallback = 'item'): string => {
    const raw = asString(value) || fallback;
    const slug = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    return slug || fallback;
};

const getNested = (value: unknown, path: string[]): unknown => (
    path.reduce<unknown>((current, key) => (
        isRecord(current) ? current[key] : undefined
    ), value)
);

const getEcommerceBlueprint = (projectData?: Record<string, any> | null): EcommerceBlueprint | undefined => {
    const candidates = [
        getNested(projectData, ['businessBlueprint', 'ecommerceBlueprint']),
        getNested(projectData, ['data', 'businessBlueprint', 'ecommerceBlueprint']),
        getNested(projectData, ['published_data', 'businessBlueprint', 'ecommerceBlueprint']),
        getNested(projectData, ['published_data', 'data', 'businessBlueprint', 'ecommerceBlueprint']),
    ];

    return candidates.find(isRecord) as EcommerceBlueprint | undefined;
};

const getProjectUpdatedAt = (projectData?: Record<string, any> | null): any => (
    projectData?.last_updated ||
    projectData?.lastUpdated ||
    projectData?.data?.lastUpdated ||
    projectData?.published_at ||
    projectData?.created_at ||
    null
);

const normalizeImages = (images: unknown): PublicStorefrontProductImage[] => {
    if (!Array.isArray(images)) return [];

    return images
        .map((image, index): PublicStorefrontProductImage | null => {
            if (typeof image === 'string') {
                const url = image.trim();
                return url ? { id: `image-${index}`, url, position: index } : null;
            }

            if (!isRecord(image)) return null;

            const url = asString(image.url) || asString(image.src) || asString(image.imageUrl);
            if (!url) return null;

            return {
                id: asString(image.id) || `image-${index}`,
                url,
                altText: asString(image.altText) || asString(image.alt) || undefined,
                position: asNumber(image.position) ?? index,
            };
        })
        .filter(Boolean) as PublicStorefrontProductImage[];
};

const normalizeVariants = (variants: unknown): PublicStorefrontProductVariant[] => {
    if (!Array.isArray(variants)) return [];

    return variants
        .map((variant, index): PublicStorefrontProductVariant | null => {
            if (!isRecord(variant)) return null;

            const name = asString(variant.name) || asString(variant.title) || `Variant ${index + 1}`;
            const price = asNumber(variant.price) ?? 0;
            const quantity = asNumber(variant.quantity) ?? asNumber(variant.inventoryQuantity);

            return {
                id: asString(variant.id) || `variant-${index}`,
                name,
                sku: asString(variant.sku),
                price,
                quantity,
                options: Array.isArray(variant.options) ? variant.options : undefined,
                inStock: variant.inStock === false ? false : quantity === undefined || quantity > 0,
            };
        })
        .filter(Boolean) as PublicStorefrontProductVariant[];
};

const mapCategoryRow = (row: Record<string, any>): PublicStorefrontCategory => {
    const data = isRecord(row.data) ? row.data : {};
    const name = asString(row.name) || asString(data.name) || asString(row.slug) || 'Category';
    const slug = asString(row.slug) || asString(data.slug) || slugifyStorefrontCatalogValue(name, row.id || 'category');

    return {
        id: String(row.id || slug),
        name,
        slug,
        description: asString(row.description) || asString(data.description),
        image: asString(row.image) || asString(row.image_url) || asString(data.image) || asString(data.imageUrl),
    };
};

const mapProductRow = (
    row: Record<string, any>,
    storeId: string,
    categoriesById: Map<string, PublicStorefrontCategory>,
): PublicStorefrontProduct => {
    const data = isRecord(row.data) ? row.data : {};
    const name = asString(row.name) || asString(data.name) || asString(data.title) || 'Draft product';
    const slug = asString(row.slug) || asString(data.slug) || slugifyStorefrontCatalogValue(name, row.id || 'product');
    const images = normalizeImages(row.images || data.images || data.media);
    const quantity = asNumber(row.inventory_quantity) ?? asNumber(row.quantity) ?? asNumber(data.inventoryQuantity) ?? asNumber(data.quantity);
    const lowStockThreshold = asNumber(row.low_stock_threshold) ?? asNumber(data.lowStockThreshold);
    const categoryId = asString(row.category_id) || asString(data.categoryId) || asString(data.category);
    const category = categoryId ? categoriesById.get(categoryId) : undefined;
    const categoryName = category?.name || asString(data.categoryName);

    return {
        id: String(row.id || slug),
        name,
        slug,
        description: asString(row.description) || asString(data.description) || '',
        shortDescription: asString(row.short_description) || asString(data.shortDescription),
        price: asNumber(row.price) ?? asNumber(data.price) ?? 0,
        compareAtPrice: asNumber(row.compare_at_price) ?? asNumber(data.compareAtPrice),
        images,
        imageUrl: images[0]?.url || asString(data.imageUrl),
        categoryId,
        categoryName,
        categorySlug: category?.slug || asString(data.categorySlug),
        tags: Array.isArray(row.tags) ? row.tags : Array.isArray(data.tags) ? data.tags : [],
        variants: normalizeVariants(row.variants || data.variants),
        trackInventory: row.track_inventory ?? data.trackInventory ?? true,
        quantity,
        lowStockThreshold,
        inStock: quantity === undefined ? true : quantity > 0,
        lowStock: quantity !== undefined && lowStockThreshold !== undefined ? quantity <= lowStockThreshold : false,
        isFeatured: row.is_featured ?? data.isFeatured,
        seoTitle: asString(data.seoTitle),
        seoDescription: asString(data.seoDescription),
        status: asString(row.status) || asString(data.status),
        storeId: asString(row.store_id) || asString(row.project_id) || asString(row.public_store_id) || storeId,
        userId: asString(row.user_id) || asString(data.userId) || '',
        averageRating: asNumber(row.average_rating) ?? asNumber(data.averageRating),
        reviewCount: asNumber(row.review_count) ?? asNumber(data.reviewCount),
        createdAt: row.created_at || data.createdAt,
        updatedAt: row.updated_at || data.updatedAt || null,
    };
};

const buildBlueprintCategories = (
    projectData: Record<string, any> | null | undefined,
): PublicStorefrontCategory[] => {
    const blueprint = getEcommerceBlueprint(projectData);
    if (!blueprint?.enabled) return [];

    return unique([
        ...(blueprint.productCategories || blueprint.categories || []),
        ...(blueprint.starterProducts || []).map(product => product.category),
    ]).map((name, index) => {
        const slug = slugifyStorefrontCatalogValue(name, `category-${index + 1}`);
        return {
            id: slug,
            name,
            slug,
            description: `Draft category suggested for ${name}.`,
            count: (blueprint.starterProducts || []).filter(product => (
                slugifyStorefrontCatalogValue(product.category, 'category') === slug
            )).length,
        };
    });
};

const mapBlueprintProduct = (
    product: StarterProductBlueprint,
    index: number,
    storeId: string,
    projectData: Record<string, any> | null | undefined,
): PublicStorefrontProduct => {
    const name = product.name?.trim() || `Draft product ${index + 1}`;
    const slug = slugifyStorefrontCatalogValue(name, `draft-product-${index + 1}`);
    const categoryName = asString(product.category);
    const categorySlug = categoryName ? slugifyStorefrontCatalogValue(categoryName, 'category') : undefined;
    const quantity = asNumber(product.suggestedStock);

    return {
        id: slug,
        name,
        slug,
        description: product.description || 'AI Studio draft. Review before publishing.',
        shortDescription: product.description || 'AI Studio draft. Review before publishing.',
        price: asNumber(product.suggestedPrice) ?? 0,
        images: [],
        categoryId: categorySlug,
        categoryName,
        categorySlug,
        tags: ['ai-studio', 'draft', ...(categorySlug ? [categorySlug] : [])],
        variants: [],
        trackInventory: false,
        quantity,
        inStock: true,
        lowStock: false,
        isFeatured: index < 4,
        status: product.status || 'draft',
        storeId,
        userId: asString(projectData?.user_id) || asString(projectData?.userId) || '',
        createdAt: projectData?.created_at || projectData?.createdAt,
        updatedAt: getProjectUpdatedAt(projectData),
    };
};

const buildBlueprintProducts = (
    projectData: Record<string, any> | null | undefined,
    storeId: string,
): PublicStorefrontProduct[] => {
    const blueprint = getEcommerceBlueprint(projectData);
    if (!blueprint?.enabled || !Array.isArray(blueprint.starterProducts)) return [];

    return blueprint.starterProducts
        .filter(product => product?.name?.trim())
        .map((product, index) => mapBlueprintProduct(product, index, storeId, projectData));
};

const resolveStorefrontIdentityContext = async (storeId: string): Promise<StorefrontIdentityContext> => {
    let queryIds = getStoreIdentityQueryIds(storeId);
    let publicStore: Record<string, any> | null = null;
    let projectData: Record<string, any> | null = null;
    let projectRow: Record<string, any> | null = null;

    if (isSupabaseUuid(storeId)) {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', storeId)
            .maybeSingle();

        if (error) throw error;
        projectRow = data || null;
    }

    if (projectRow) {
        projectData = projectRow;
    } else {
        const { data: publicStoreRow, error: publicStoreError } = await supabase
            .from('public_stores')
            .select('*')
            .eq('id', storeId)
            .maybeSingle();

        if (publicStoreError) throw publicStoreError;

        if (publicStoreRow) {
            publicStore = publicStoreRow;
            const identity = resolveProjectBackedStoreIdentity({
                storeId,
                publicStoreId: publicStoreRow.id,
                publicStore: publicStoreRow,
            });
            queryIds = getStoreIdentityQueryIds(identity);

            if (identity.projectId && isSupabaseUuid(identity.projectId)) {
                const { data: linkedProjectRow, error: linkedProjectError } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', identity.projectId)
                    .maybeSingle();

                if (linkedProjectError) throw linkedProjectError;
                projectData = linkedProjectRow || null;
            }

            if (!projectData && isRecord(publicStoreRow.data)) {
                projectData = publicStoreRow.data;
            }
        }
    }

    if (projectData?.id) {
        queryIds = Array.from(new Set([...queryIds, String(projectData.id)]));
    }

    return {
        queryIds,
        projectData,
        publicStore,
    };
};

const dedupeProducts = (products: PublicStorefrontProduct[]): PublicStorefrontProduct[] => {
    const seen = new Set<string>();

    return products.filter(product => {
        const key = product.slug || product.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const countCategories = (
    categories: PublicStorefrontCategory[],
    products: PublicStorefrontProduct[],
): PublicStorefrontCategory[] => categories.map(category => ({
    ...category,
    count: products.filter(product => (
        product.categoryId === category.id ||
        product.categorySlug === category.slug ||
        slugifyStorefrontCatalogValue(product.categoryName, '') === category.slug
    )).length,
}));

export const loadPublicStorefrontCatalog = async (
    storeId: string,
    options: { maxProducts?: number } = {},
): Promise<PublicStorefrontCatalog> => {
    if (!storeId) {
        return { products: [], categories: [], source: 'empty' };
    }

    const maxProducts = options.maxProducts ?? DEFAULT_MAX_PRODUCTS;
    const identity = await resolveStorefrontIdentityContext(storeId);
    const filter = buildStoreIdentityOrFilter(identity.queryIds);
    let categories: PublicStorefrontCategory[] = [];
    let products: PublicStorefrontProduct[] = [];

    if (filter) {
        const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] = await Promise.all([
            supabase
                .from('store_categories')
                .select('*')
                .or(filter)
                .limit(200),
            supabase
                .from('store_products')
                .select('*')
                .or(filter)
                .limit(maxProducts),
        ]);

        if (categoryError) throw categoryError;
        if (productError) throw productError;

        categories = (categoryRows || []).map(mapCategoryRow);
        const categoriesById = new Map(categories.map(category => [category.id, category]));
        products = (productRows || []).map(row => mapProductRow(row, storeId, categoriesById));
    }

    if (products.length === 0) {
        products = buildBlueprintProducts(identity.projectData, storeId);
        categories = buildBlueprintCategories(identity.projectData);
        return {
            products: dedupeProducts(products),
            categories: countCategories(categories, products),
            projectData: identity.projectData || identity.publicStore || null,
            source: products.length > 0 ? 'blueprint' : 'empty',
        };
    }

    return {
        products: dedupeProducts(products),
        categories: countCategories(categories, products),
        projectData: identity.projectData || identity.publicStore || null,
        source: 'store-products',
    };
};

export const findPublicStorefrontProduct = async (
    storeId: string,
    slugOrId: string,
): Promise<{ product: PublicStorefrontProduct | null; relatedProducts: PublicStorefrontProduct[]; category: PublicStorefrontCategory | null }> => {
    const catalog = await loadPublicStorefrontCatalog(storeId);
    const normalized = slugifyStorefrontCatalogValue(slugOrId, slugOrId);
    const product = catalog.products.find(item => (
        item.id === slugOrId ||
        item.slug === slugOrId ||
        slugifyStorefrontCatalogValue(item.slug || item.name, item.id) === normalized
    )) || null;

    if (!product) {
        return { product: null, relatedProducts: [], category: null };
    }

    const category = catalog.categories.find(item => (
        item.id === product.categoryId ||
        item.slug === product.categorySlug ||
        item.name === product.categoryName
    )) || null;
    const relatedProducts = catalog.products
        .filter(item => item.id !== product.id)
        .filter(item => {
            if (!product.categoryId && !product.categorySlug && !product.categoryName) return true;
            return item.categoryId === product.categoryId ||
                item.categorySlug === product.categorySlug ||
                item.categoryName === product.categoryName;
        })
        .slice(0, 4);

    return { product, relatedProducts, category };
};

export const findPublicStorefrontCategory = async (
    storeId: string,
    slugOrId: string,
): Promise<{ category: PublicStorefrontCategory | null; products: PublicStorefrontProduct[] }> => {
    const catalog = await loadPublicStorefrontCatalog(storeId);
    const normalized = slugifyStorefrontCatalogValue(slugOrId, slugOrId);
    const category = catalog.categories.find(item => (
        item.id === slugOrId ||
        item.slug === slugOrId ||
        slugifyStorefrontCatalogValue(item.name, item.id) === normalized
    )) || null;

    if (!category) {
        return { category: null, products: [] };
    }

    return {
        category,
        products: catalog.products.filter(product => (
            product.categoryId === category.id ||
            product.categorySlug === category.slug ||
            slugifyStorefrontCatalogValue(product.categoryName, '') === category.slug
        )),
    };
};
