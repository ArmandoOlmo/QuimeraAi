/**
 * useProductSearch Hook
 * Hook para búsqueda avanzada y filtros de productos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebase';
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
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
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
            console.log('[useProductSearch] Loading products for store:', storeId);
            const productsRef = collection(db, 'publicStores', storeId, 'products');
            // First try without filter to see all products
            const snapshot = await getDocs(productsRef);
            console.log('[useProductSearch] Total docs found:', snapshot.size);

            const productsData = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as PublicProduct[];

            setAllProducts(productsData);

            // Extract categories
            const categoryMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
            const allTags = new Set<string>();
            let minPrice = Infinity;
            let maxPrice = 0;

            productsData.forEach((product) => {
                // Category
                if (product.categoryId && product.categoryName) {
                    const existing = categoryMap.get(product.categoryId);
                    if (existing) {
                        existing.count++;
                    } else {
                        // Generate slug from category name if not available
                        const categorySlug = (product as any).categorySlug || 
                            product.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        categoryMap.set(product.categoryId, {
                            id: product.categoryId,
                            name: product.categoryName,
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
                result.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                break;
            case 'oldest':
                result.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
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
