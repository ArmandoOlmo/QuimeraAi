/**
 * usePublicProducts Hook
 * Hook para obtener productos públicos de una tienda para el storefront
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { StorefrontProductItem } from '../types/components';
import { loadPublicStorefrontCatalog } from '../utils/ecommerce/publicStorefrontCatalog';

export interface UsePublicProductsOptions {
    categoryId?: string;
    productIds?: string[];
    searchTerm?: string;
    sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'name';
    limitCount?: number;
    realtime?: boolean;
}

export interface UsePublicProductsReturn {
    products: StorefrontProductItem[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    categories: { id: string; name: string; slug: string }[];
}

/**
 * Hook para obtener productos públicos de una tienda
 */
export const usePublicProducts = (
    storeId: string | null,
    options: UsePublicProductsOptions = {}
): UsePublicProductsReturn => {
    const [products, setProducts] = useState<StorefrontProductItem[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const {
        categoryId,
        productIds: rawProductIds = [],
        searchTerm,
        sortBy = 'newest',
        limitCount = 50,
        realtime = false,
    } = options;
    const productIdsKey = rawProductIds.filter(Boolean).join('|');

    const fetchProducts = useCallback(async () => {
        if (!storeId) {
            setProducts([]);
            setCategories([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const productIds = productIdsKey ? productIdsKey.split('|').filter(Boolean) : [];
            const catalog = await loadPublicStorefrontCatalog(storeId, {
                maxProducts: productIds.length > 0 ? 250 : limitCount * 2,
            });

            setCategories(catalog.categories.map(category => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
            })));

            let fetchedProducts: StorefrontProductItem[] = catalog.products.map((product) => {
                const firstImage = product.images?.[0];
                return {
                    id: product.id,
                    name: product.name,
                    description: product.shortDescription || product.description || '',
                    price: Number(product.price ?? 0),
                    compareAtPrice: product.compareAtPrice,
                    image: firstImage?.url || product.imageUrl || null,
                    category: product.categoryId || product.categorySlug || product.categoryName,
                    inStock: product.inStock !== false,
                    rating: product.averageRating,
                    reviewCount: product.reviewCount,
                    slug: product.slug,
                    updatedAt: product.updatedAt,
                };
            });

            if (productIds.length > 0) {
                const selected = new Set(productIds);
                fetchedProducts = fetchedProducts.filter(product => (
                    selected.has(product.id) ||
                    (product.slug ? selected.has(product.slug) : false)
                ));
            }

            // Client-side filtering for inStock
            fetchedProducts = fetchedProducts.filter(p => p.inStock !== false);

            // Filter by category (client-side)
            if (categoryId) {
                fetchedProducts = fetchedProducts.filter(p => p.category === categoryId);
            }

            // Filter by search term
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                fetchedProducts = fetchedProducts.filter(
                    p =>
                        p.name.toLowerCase().includes(term) ||
                        p.description?.toLowerCase().includes(term)
                );
            }

            // Client-side sorting
            if (productIds.length > 0) {
                const order = new Map(productIds.map((id, index) => [id, index]));
                fetchedProducts.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
            } else {
                switch (sortBy) {
                    case 'price-asc':
                        fetchedProducts.sort((a, b) => a.price - b.price);
                        break;
                    case 'price-desc':
                        fetchedProducts.sort((a, b) => b.price - a.price);
                        break;
                    case 'name':
                        fetchedProducts.sort((a, b) => a.name.localeCompare(b.name));
                        break;
                    case 'newest':
                    default:
                        fetchedProducts.sort((a, b) => {
                            const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
                            const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
                            return dateB.getTime() - dateA.getTime();
                        });
                        break;
                }
            }

            // Apply limit after filtering and sorting
            if (productIds.length === 0) {
                fetchedProducts = fetchedProducts.slice(0, limitCount);
            }

            setProducts(fetchedProducts);
        } catch (err: any) {
            console.error('Error fetching products:', err);
            setError(err.message || 'Error al cargar productos');
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [storeId, categoryId, searchTerm, sortBy, limitCount, productIdsKey]);

    // Initial fetch
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Realtime subscription (optional)
    useEffect(() => {
        if (!storeId || !realtime) return;

        let isMounted = true;

        const channelId = `public_products_${storeId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'store_products' },
                () => {
                    if (isMounted) {
                        fetchProducts();
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [storeId, realtime, fetchProducts]);

    return {
        products,
        isLoading,
        error,
        refetch: fetchProducts,
        categories,
    };
};

export default usePublicProducts;








