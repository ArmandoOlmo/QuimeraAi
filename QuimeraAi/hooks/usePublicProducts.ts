/**
 * usePublicProducts Hook
 * Hook para obtener productos públicos de una tienda para el storefront
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { StorefrontProductItem } from '../types/components';
import {
    buildStoreIdentityOrFilter,
    getStoreIdentityQueryIds,
    resolveProjectBackedStoreIdentity,
} from '../utils/ecommerce/storeIdentity';

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
    const [queryIds, setQueryIds] = useState<string[]>([]);

    const {
        categoryId,
        productIds: rawProductIds = [],
        searchTerm,
        sortBy = 'newest',
        limitCount = 50,
        realtime = false,
    } = options;
    const productIdsKey = rawProductIds.filter(Boolean).join('|');
    const queryIdsKey = queryIds.join('|');

    useEffect(() => {
        if (!storeId) {
            setQueryIds([]);
            return;
        }

        let isMounted = true;

        const resolveQueryIds = async () => {
            let ids = getStoreIdentityQueryIds(storeId);

            try {
                const { data: publicStore } = await supabase
                    .from('public_stores')
                    .select('id, data')
                    .eq('id', storeId)
                    .maybeSingle();

                if (publicStore) {
                    ids = getStoreIdentityQueryIds(resolveProjectBackedStoreIdentity({
                        storeId,
                        publicStoreId: publicStore.id,
                        publicStore,
                    }));
                }
            } catch (err) {
                console.warn('[usePublicProducts] Public store identity resolution skipped:', err);
            }

            if (isMounted) setQueryIds(ids);
        };

        resolveQueryIds();

        return () => {
            isMounted = false;
        };
    }, [storeId]);

    // Fetch categories
    useEffect(() => {
        if (!storeId || queryIds.length === 0) return;

        let isMounted = true;

        const fetchCategories = async () => {
            try {
                const filter = buildStoreIdentityOrFilter(queryIds);
                const { data, error } = await supabase
                    .from('store_categories')
                    .select('*')
                    .or(filter);

                if (!isMounted) return;

                if (error) throw error;

                if (data) {
                    setCategories(data.map((cat: any) => ({
                        id: cat.id,
                        name: cat.name || cat.data?.name || '',
                        slug: cat.slug || cat.data?.slug || '',
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
    }, [storeId, queryIdsKey]);

    const fetchProducts = useCallback(async () => {
        if (!storeId || queryIds.length === 0) {
            setProducts([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const productIds = productIdsKey ? productIdsKey.split('|').filter(Boolean) : [];
            const filter = buildStoreIdentityOrFilter(queryIds);

            // Query from store_products. Website ecommerce blocks are read-only
            // Ecommerce Engine consumers; products/categories remain owned by
            // the Ecommerce Engine admin and checkout flows.
            let query = supabase
                .from('store_products')
                .select('*')
                .or(filter);

            if (productIds.length > 0) {
                query = query.in('id', productIds);
            } else {
                query = query.limit(limitCount * 2); // Fetch more to account for filtering
            }

            const { data, error } = await query;

            if (error) throw error;

            let fetchedProducts: StorefrontProductItem[] = [];

            if (data) {
                fetchedProducts = data.map((doc: any) => {
                    const d = doc.data || {};
                    const images = doc.images || d.images || [];
                    const firstImage = Array.isArray(images) ? images[0] : null;
                    const quantity = doc.inventory_quantity ?? doc.quantity ?? d.inventoryQuantity ?? d.quantity;
                    return {
                        id: doc.id,
                        name: doc.name || d.name || '',
                        description: doc.short_description || doc.description || d.shortDescription || d.description || '',
                        price: Number(doc.price ?? d.price ?? 0),
                        compareAtPrice: doc.compare_at_price ?? d.compareAtPrice,
                        image: firstImage?.url || firstImage || d.imageUrl || null,
                        category: doc.category_id || d.categoryId || d.category,
                        inStock: quantity == null ? true : Number(quantity) > 0,
                        rating: doc.average_rating ?? d.averageRating,
                        reviewCount: doc.review_count ?? d.reviewCount,
                        slug: doc.slug || d.slug,
                        updatedAt: doc.updated_at || d.updatedAt,
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
    }, [storeId, queryIdsKey, categoryId, searchTerm, sortBy, limitCount, productIdsKey]);

    // Initial fetch
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Realtime subscription (optional)
    useEffect(() => {
        if (!storeId || !realtime || queryIds.length === 0) return;

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
    }, [storeId, queryIdsKey, realtime, fetchProducts]);

    return {
        products,
        isLoading,
        error,
        refetch: fetchProducts,
        categories,
    };
};

export default usePublicProducts;









