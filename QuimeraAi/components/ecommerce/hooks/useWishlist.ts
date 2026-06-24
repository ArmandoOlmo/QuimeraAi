/**
 * useWishlist Hook
 * Hook para gestionar la lista de deseos/favoritos
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabase';
import { PublicProduct } from './usePublicProduct';

// Types
export interface WishlistItem {
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    productImage?: string;
    productPrice: number;
    productCompareAtPrice?: number;
    addedAt: { seconds: number; nanoseconds: number };
}

export interface UseWishlistReturn {
    items: WishlistItem[];
    count: number;
    isLoading: boolean;
    error: string | null;
    isInWishlist: (productId: string) => boolean;
    addToWishlist: (product: PublicProduct) => Promise<void>;
    removeFromWishlist: (productId: string) => Promise<void>;
    toggleWishlist: (product: PublicProduct) => Promise<void>;
    clearWishlist: () => Promise<void>;
}

// Local storage key for anonymous users
const WISHLIST_STORAGE_KEY = 'quimera_wishlist';

const timestampFromDate = (value?: string | null) => ({
    seconds: value ? Math.floor(new Date(value).getTime() / 1000) : Math.floor(Date.now() / 1000),
    nanoseconds: 0,
});

const mapWishlistRow = (row: any): WishlistItem => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    productImage: row.product_image || undefined,
    productPrice: Number(row.product_price || 0),
    productCompareAtPrice: row.product_compare_at_price != null ? Number(row.product_compare_at_price) : undefined,
    addedAt: timestampFromDate(row.added_at),
});

/**
 * Hook para gestionar wishlist
 * Soporta usuarios autenticados (Supabase) y anónimos (localStorage)
 */
export const useWishlist = (
    storeId: string,
    userId?: string | null
): UseWishlistReturn => {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load wishlist from localStorage (for anonymous users)
    const loadLocalWishlist = useCallback(() => {
        try {
            const stored = localStorage.getItem(`${WISHLIST_STORAGE_KEY}_${storeId}`);
            if (stored) {
                return JSON.parse(stored) as WishlistItem[];
            }
        } catch (e) {
            console.error('Error loading local wishlist:', e);
        }
        return [];
    }, [storeId]);

    // Save wishlist to localStorage
    const saveLocalWishlist = useCallback((wishlistItems: WishlistItem[]) => {
        try {
            localStorage.setItem(
                `${WISHLIST_STORAGE_KEY}_${storeId}`,
                JSON.stringify(wishlistItems)
            );
        } catch (e) {
            console.error('Error saving local wishlist:', e);
        }
    }, [storeId]);

    // Load wishlist
    useEffect(() => {
        if (!storeId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        if (userId) {
            let active = true;

            const fetchWishlist = async () => {
                const { data, error } = await supabase
                    .from('store_wishlists')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('store_id', storeId)
                    .order('added_at', { ascending: false });

                if (!active) return;

                if (error) {
                    console.error('Error loading wishlist:', error);
                    setError(error.message);
                } else {
                    setItems((data || []).map(mapWishlistRow));
                    setError(null);
                }
                setIsLoading(false);
            };

            void fetchWishlist();

            const channelName = `store_wishlists:${storeId}:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'store_wishlists',
                        filter: `store_id=eq.${storeId}`,
                    },
                    () => {
                        void fetchWishlist();
                    }
                )
                .subscribe();

            return () => {
                active = false;
                void supabase.removeChannel(channel);
            };
        } else {
            // Anonymous user - use localStorage
            const localItems = loadLocalWishlist();
            setItems(localItems);
            setIsLoading(false);
        }
    }, [storeId, userId, loadLocalWishlist]);

    // Check if product is in wishlist
    const isInWishlist = useCallback(
        (productId: string) => {
            return items.some((item) => item.productId === productId);
        },
        [items]
    );

    // Add to wishlist
    const addToWishlist = useCallback(
        async (product: PublicProduct) => {
            if (isInWishlist(product.id)) return;

            const wishlistItem: Omit<WishlistItem, 'id'> = {
                productId: product.id,
                productName: product.name,
                productSlug: product.slug,
                productImage: product.images?.[0]?.url,
                productPrice: product.price,
                productCompareAtPrice: product.compareAtPrice,
                addedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
            };

            if (userId) {
                try {
                    const id = `${storeId}:${userId}:${product.id}`;
                    const { error } = await supabase
                        .from('store_wishlists')
                        .upsert({
                            id,
                            user_id: userId,
                            store_id: storeId,
                            product_id: product.id,
                            product_name: product.name,
                            product_slug: product.slug,
                            product_image: product.images?.[0]?.url || null,
                            product_price: product.price,
                            product_compare_at_price: product.compareAtPrice || null,
                            added_at: new Date().toISOString(),
                        }, { onConflict: 'id' });

                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error adding to wishlist:', err);
                    setError(err.message);
                }
            } else {
                // localStorage
                const newItems = [
                    { ...wishlistItem, id: product.id },
                    ...items,
                ];
                setItems(newItems);
                saveLocalWishlist(newItems);
            }
        },
        [storeId, userId, items, isInWishlist, saveLocalWishlist]
    );

    // Remove from wishlist
    const removeFromWishlist = useCallback(
        async (productId: string) => {
            if (userId) {
                try {
                    const { error } = await supabase
                        .from('store_wishlists')
                        .delete()
                        .eq('user_id', userId)
                        .eq('store_id', storeId)
                        .eq('product_id', productId);

                    if (error) throw error;
                } catch (err: any) {
                    console.error('Error removing from wishlist:', err);
                    setError(err.message);
                }
            } else {
                // localStorage
                const newItems = items.filter((item) => item.productId !== productId);
                setItems(newItems);
                saveLocalWishlist(newItems);
            }
        },
        [storeId, userId, items, saveLocalWishlist]
    );

    // Toggle wishlist
    const toggleWishlist = useCallback(
        async (product: PublicProduct) => {
            if (isInWishlist(product.id)) {
                await removeFromWishlist(product.id);
            } else {
                await addToWishlist(product);
            }
        },
        [isInWishlist, addToWishlist, removeFromWishlist]
    );

    // Clear wishlist
    const clearWishlist = useCallback(async () => {
        if (userId) {
            try {
                const { error } = await supabase
                    .from('store_wishlists')
                    .delete()
                    .eq('user_id', userId)
                    .eq('store_id', storeId);

                if (error) throw error;
            } catch (err: any) {
                console.error('Error clearing wishlist:', err);
                setError(err.message);
            }
        } else {
            // localStorage
            setItems([]);
            saveLocalWishlist([]);
        }
    }, [storeId, userId, saveLocalWishlist]);

    return {
        items,
        count: items.length,
        isLoading,
        error,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
    };
};

export default useWishlist;










