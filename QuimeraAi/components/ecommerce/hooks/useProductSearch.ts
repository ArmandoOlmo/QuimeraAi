/**
 * useProductSearch Hook
 * Hook para búsqueda avanzada y filtros de productos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../supabase';
import {
    buildStoreIdentityOrFilter,
    getStoreIdentityQueryIds,
    resolveProjectBackedStoreIdentity,
} from '../../../utils/ecommerce/storeIdentity';
import { PublicProduct } from './usePublicProduct';

// Types
export type SortOption = 
    | 'newest'
    | 'oldest'
    | 'price_asc'
    | 'price_desc'
    | 'name_asc'
    | 'name_desc'
    | 'popular';

export interface PriceRange {
    min: number;
    max: number;
}

export interface ProductFilters {
    categoryId?: string;
    categorySlug?: string; // Can filter by slug instead of ID
    tags?: string[];
    priceRange?: PriceRange;
    inStock?: boolean;
    onSale?: boolean;
    featured?: boolean;
}

export interface UseProductSearchOptions {
    pageSize?: number;
    sortBy?: SortOption;
    filters?: ProductFilters;
}

export interface UseProductSearchReturn {
    products: PublicProduct[];
    totalCount: number;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    // Actions
    search: (term: string) => void;
    applyFilters: (filters: ProductFilters) => void;
    setSortBy: (sort: SortOption) => void;
    loadMore: () => Promise<void>;
    reset: () => void;
    // Filter helpers
    availableCategories: Array<{ id: string; name: string; slug: string; count: number }>;
    availableTags: string[];
    priceStats: { min: number; max: number };
}

export const useProductSearch = (
    storeId: string,
    options: UseProductSearchOptions = {}
): UseProductSearchReturn => {
    const { pageSize = 12, sortBy: initialSort = 'newest', filters: initialFilters = {} } = options;

    // State
    const [products, setProducts] = useState<PublicProduct[]>([]);
    const [allProducts, setAllProducts] = useState<PublicProduct[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortByState] = useState<SortOption>(initialSort);
    const [filters, setFilters] = useState<ProductFilters>(initialFilters);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Categories and tags from products
    const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string; count: number }>>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [priceStats, setPriceStats] = useState({ min: 0, max: 1000 });

    // Load all products for client-side filtering
    const loadAllProducts = useCallback(async () => {
        if (!storeId) return;

        setIsLoading(true);
        setError(null);

        try {
            let queryIds = getStoreIdentityQueryIds(storeId);

            try {
                const { data: publicStore } = await supabase
                    .from('public_stores')
                    .select('id, data')
                    .eq('id', storeId)
                    .maybeSingle();

                if (publicStore) {
                    queryIds = getStoreIdentityQueryIds(resolveProjectBackedStoreIdentity({
                        storeId,
                        publicStoreId: publicStore.id,
                        publicStore,
                    }));
                }
            } catch (identityError) {
                console.warn('[useProductSearch] Public store identity resolution skipped:', identityError);
            }

            const identityFilter = buildStoreIdentityOrFilter(queryIds);
            if (!identityFilter) {
                setAllProducts([]);
                setCategories([]);
                setTags([]);
                setPriceStats({ min: 0, max: 1000 });
                setTotalCount(0);
                return;
            }

            const [{ data: categoryRows, error: categoriesError }, { data: productRows, error: productsError }] = await Promise.all([
                supabase
                    .from('store_categories')
                    .select('*')
                    .or(identityFilter),
                supabase
                    .from('store_products')
                    .select('*')
                    .or(identityFilter),
            ]);

            if (categoriesError) throw categoriesError;
            if (productsError) throw productsError;

            const categoryLookup = new Map<string, { id: string; name: string; slug: string; count: number }>();
            (categoryRows || []).forEach((category: any) => {
                const data = category.data || {};
                const id = String(category.id || '').trim();
                if (!id) return;

                categoryLookup.set(id, {
                    id,
                    name: category.name || data.name || 'Categoria',
                    slug: category.slug || data.slug || id,
                    count: 0,
                });
            });

            const productsData = (productRows || []).map((row: any): PublicProduct => {
                const data = row.data || {};
                const rawImages = row.images || data.images || [];
                const images = (Array.isArray(rawImages) ? rawImages : [])
                    .map((image: any, index: number) => {
                        const url = typeof image === 'string'
                            ? image
                            : image?.url || image?.src || image?.imageUrl || '';

                        return {
                            id: String(image?.id || `${row.id}-image-${index}`),
                            url,
                            altText: image?.altText || image?.alt || row.name || data.name || '',
                            position: Number(image?.position ?? index),
                        };
                    })
                    .filter(image => image.url);
                const quantity = row.inventory_quantity ?? row.quantity ?? data.inventoryQuantity ?? data.quantity;
                const trackInventory = Boolean(row.track_inventory ?? data.trackInventory ?? quantity != null);
                const allowBackorder = Boolean(row.allow_backorder ?? data.allowBackorder);
                const availableQuantity = quantity == null ? null : Number(quantity);
                const categoryId = row.category_id || data.categoryId || data.category || undefined;
                const category = categoryId ? categoryLookup.get(categoryId) : undefined;
                const price = Number(row.price ?? data.price ?? 0);
                const compareAtPrice = row.compare_at_price ?? data.compareAtPrice;
                const averageRating = row.average_rating ?? data.averageRating;
                const reviewCount = row.review_count ?? data.reviewCount;
                const productTags = Array.isArray(row.tags)
                    ? row.tags
                    : Array.isArray(data.tags)
                        ? data.tags
                        : [];

                return {
                    id: row.id,
                    name: row.name || data.name || '',
                    slug: row.slug || data.slug || row.id,
                    description: row.description || data.description || row.short_description || data.shortDescription || '',
                    shortDescription: row.short_description || data.shortDescription,
                    price,
                    compareAtPrice: compareAtPrice == null ? undefined : Number(compareAtPrice),
                    images,
                    categoryId,
                    categoryName: row.category_name || data.categoryName || category?.name,
                    tags: productTags.filter((tag: unknown): tag is string => typeof tag === 'string' && Boolean(tag.trim())),
                    variants: Array.isArray(row.variants) ? row.variants : Array.isArray(data.variants) ? data.variants : [],
                    trackInventory,
                    quantity: availableQuantity ?? undefined,
                    lowStockThreshold: row.low_stock_threshold ?? data.lowStockThreshold,
                    inStock: trackInventory ? allowBackorder || (availableQuantity ?? 0) > 0 : true,
                    lowStock: trackInventory && availableQuantity != null && availableQuantity <= Number(row.low_stock_threshold ?? data.lowStockThreshold ?? 0),
                    isFeatured: Boolean(row.is_featured ?? data.isFeatured),
                    seoTitle: row.seo_title || data.seoTitle,
                    seoDescription: row.seo_description || data.seoDescription,
                    storeId: row.store_id || row.public_store_id || storeId,
                    userId: row.user_id || data.userId || '',
                    reviewStats: averageRating || reviewCount ? {
                        averageRating: Number(averageRating || 0),
                        totalReviews: Number(reviewCount || 0),
                    } : undefined,
                    averageRating: averageRating == null ? undefined : Number(averageRating),
                    reviewCount: reviewCount == null ? undefined : Number(reviewCount),
                    createdAt: row.created_at || data.createdAt,
                    updatedAt: row.updated_at || data.updatedAt || row.created_at,
                };
            });

            setAllProducts(productsData);

            // Extract categories
            const categoryMap = new Map(categoryLookup);
            const allTags = new Set<string>();
            let minPrice = Infinity;
            let maxPrice = 0;

            productsData.forEach((product) => {
                // Category
                if (product.categoryId) {
                    const existing = categoryMap.get(product.categoryId);
                    if (existing) {
                        existing.count++;
                    } else {
                        // Generate slug from category name if not available
                        const categoryName = product.categoryName || product.categoryId;
                        const categorySlug = (product as any).categorySlug ||
                            categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        categoryMap.set(product.categoryId, {
                            id: product.categoryId,
                            name: categoryName,
                            slug: categorySlug,
                            count: 1,
                        });
                    }
                }

                // Tags
                product.tags?.forEach((tag) => allTags.add(tag));

                // Price
                if (product.price < minPrice) minPrice = product.price;
                if (product.price > maxPrice) maxPrice = product.price;
            });

            setCategories(Array.from(categoryMap.values()));
            setTags(Array.from(allTags).sort());
            setPriceStats({
                min: minPrice === Infinity ? 0 : minPrice,
                max: maxPrice === 0 ? 1000 : maxPrice,
            });

            setTotalCount(productsData.length);
        } catch (err: any) {
            console.error('Error loading products:', err);
            setError(err.message || 'Error al cargar productos');
        } finally {
            setIsLoading(false);
        }
    }, [storeId]);

    // Initial load
    useEffect(() => {
        loadAllProducts();
    }, [loadAllProducts]);

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let result = [...allProducts];
        const getProductTime = (value: unknown): number => {
            if (!value) return 0;
            if (typeof value === 'object' && value !== null && 'seconds' in value) {
                return Number((value as { seconds?: unknown }).seconds || 0) * 1000;
            }
            const timestamp = Date.parse(String(value));
            return Number.isFinite(timestamp) ? timestamp : 0;
        };

        // Search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(term) ||
                    p.description?.toLowerCase().includes(term) ||
                    p.tags?.some((t) => t.toLowerCase().includes(term))
            );
        }

        // Category filter - can filter by ID or slug
        if (filters.categoryId) {
            result = result.filter((p) => p.categoryId === filters.categoryId);
        } else if (filters.categorySlug) {
            // Find category ID from slug
            const category = categories.find(c => c.slug === filters.categorySlug);
            if (category) {
                result = result.filter((p) => p.categoryId === category.id);
            } else {
                // If category not found by exact slug, try matching by name-derived slug
                result = result.filter((p) => {
                    if (!p.categoryName) return false;
                    const productCategorySlug = p.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    return productCategorySlug === filters.categorySlug;
                });
            }
        }

        // Tags filter
        if (filters.tags && filters.tags.length > 0) {
            result = result.filter((p) =>
                filters.tags!.some((tag) => p.tags?.includes(tag))
            );
        }

        // Price range
        if (filters.priceRange) {
            result = result.filter(
                (p) =>
                    p.price >= filters.priceRange!.min &&
                    p.price <= filters.priceRange!.max
            );
        }

        // In stock
        if (filters.inStock) {
            result = result.filter((p) => p.inStock !== false);
        }

        // On sale
        if (filters.onSale) {
            result = result.filter(
                (p) => p.compareAtPrice && p.compareAtPrice > p.price
            );
        }

        // Featured
        if (filters.featured) {
            result = result.filter((p) => p.isFeatured);
        }

        // Sort
        switch (sortBy) {
            case 'newest':
                result.sort((a, b) => getProductTime(b.createdAt || b.updatedAt) - getProductTime(a.createdAt || a.updatedAt));
                break;
            case 'oldest':
                result.sort((a, b) => getProductTime(a.createdAt || a.updatedAt) - getProductTime(b.createdAt || b.updatedAt));
                break;
            case 'price_asc':
                result.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                result.sort((a, b) => b.price - a.price);
                break;
            case 'name_asc':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                result.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'popular':
                // Sort by review count/rating if available
                result.sort((a, b) => {
                    const aScore = (a.reviewStats?.totalReviews || 0) * (a.reviewStats?.averageRating || 0);
                    const bScore = (b.reviewStats?.totalReviews || 0) * (b.reviewStats?.averageRating || 0);
                    return bScore - aScore;
                });
                break;
        }

        return result;
    }, [allProducts, searchTerm, filters, sortBy]);

    // Paginate
    const paginatedProducts = useMemo(() => {
        return filteredProducts.slice(0, products.length || pageSize);
    }, [filteredProducts, products.length, pageSize]);

    // Update products state when filtered changes
    useEffect(() => {
        setProducts(filteredProducts.slice(0, pageSize));
        setTotalCount(filteredProducts.length);
        setHasMore(filteredProducts.length > pageSize);
    }, [filteredProducts, pageSize]);

    // Search
    const search = useCallback((term: string) => {
        setSearchTerm(term);
    }, []);

    // Apply filters
    const applyFilters = useCallback((newFilters: ProductFilters) => {
        setFilters(newFilters);
    }, []);

    // Set sort
    const setSortBy = useCallback((sort: SortOption) => {
        setSortByState(sort);
    }, []);

    // Load more
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);

        const currentLength = products.length;
        const newProducts = filteredProducts.slice(0, currentLength + pageSize);

        setProducts(newProducts);
        setHasMore(newProducts.length < filteredProducts.length);
        setIsLoadingMore(false);
    }, [isLoadingMore, hasMore, products.length, filteredProducts, pageSize]);

    // Reset
    const reset = useCallback(() => {
        setSearchTerm('');
        setFilters({});
        setSortByState('newest');
        setProducts(allProducts.slice(0, pageSize));
    }, [allProducts, pageSize]);

    return {
        products: paginatedProducts,
        totalCount,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        search,
        applyFilters,
        setSortBy,
        loadMore,
        reset,
        availableCategories: categories,
        availableTags: tags,
        priceStats,
    };
};

export default useProductSearch;
