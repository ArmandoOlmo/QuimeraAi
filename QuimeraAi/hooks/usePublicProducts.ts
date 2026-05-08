/**
 * usePublicProducts Hook
 * Hook para obtener productos públicos de una tienda para el storefront
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { StorefrontProductItem } from '../types/components';

export interface UsePublicProductsOptions {
    categoryId?: string;
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
        searchTerm,
        sortBy = 'newest',
        limitCount = 50,
        realtime = false,
    } = options;

    // Fetch categories
    useEffect(() => {
        if (!storeId) return;

        let isMounted = true;

        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from('store_categories')
                    .select('id, data')
                    .eq('store_id', storeId);

                if (!isMounted) return;

                if (error) throw error;

                if (data) {
                    setCategories(data.map((cat: any) => ({
                        id: cat.id,
                        name: cat.data?.name || '',
                        slug: cat.data?.slug || '',
                    })));
                }
            } catch (err) {
                if (isMounted) console.error('Error fetching categories:', err);
            }
        };

        fetchCategories();

        return () => {
            isMounted = false;
        };
    }, [storeId]);

    const fetchProducts = useCallback(async () => {
        if (!storeId) {
            setProducts([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Query from store_products (hybrid schema: flat id/store_id + JSONB data)
            const { data, error } = await supabase
                .from('store_products')
                .select('id, store_id, data')
                .eq('store_id', storeId)
                .limit(limitCount * 2); // Fetch more to account for filtering

            if (error) throw error;

            let fetchedProducts: StorefrontProductItem[] = [];

            if (data) {
                fetchedProducts = data.map((doc: any) => {
                    const d = doc.data || {};
                    return {
                        id: doc.id,
                        name: d.name || '',
                        description: d.shortDescription || d.description || '',
                        price: d.price || 0,
                        compareAtPrice: d.compareAtPrice,
                        image: d.images?.[0]?.url || d.images?.[0] || null,
                        category: d.categoryId,
                        inStock: d.quantity == null ? true : d.quantity > 0,
                        rating: d.averageRating,
                        reviewCount: d.reviewCount,
                        slug: d.slug,
                        updatedAt: d.updatedAt,
                    };
                });
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

            // Apply limit after filtering and sorting
            fetchedProducts = fetchedProducts.slice(0, limitCount);

            setProducts(fetchedProducts);
        } catch (err: any) {
            console.error('Error fetching products:', err);
            setError(err.message || 'Error al cargar productos');
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [storeId, categoryId, searchTerm, sortBy, limitCount]);

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
                { event: '*', schema: 'public', table: 'store_products', filter: `store_id=eq.${storeId}` },
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











