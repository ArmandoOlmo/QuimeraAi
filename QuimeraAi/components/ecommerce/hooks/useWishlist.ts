/**
 * useWishlist Hook
 * Hook para gestionar la lista de deseos/favoritos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    getDocs,
    where,
} from 'firebase/firestore';
import { db } from '../../../firebase';
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

/**
 * Hook para gestionar wishlist
 * Soporta usuarios autenticados (Firestore) y anónimos (localStorage)
 */
export const useWishlist = (
    storeId: string,
    userId?: string | null
): UseWishlistReturn => {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get session ID for anonymous users
    const getSessionId = useCallback(() => {
        let sessionId = localStorage.getItem('quimera_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('quimera_session_id', sessionId);
        }
        return sessionId;
    }, []);

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
            // Authenticated user - use Firestore
            const wishlistRef = collection(
                db,
                'users',
                userId,
                'stores',
                storeId,
                'wishlist'
            );
            const q = query(wishlistRef, orderBy('addedAt', 'desc'));

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const wishlistItems = snapshot.docs.map((doc) => ({
                        ...doc.data(),
                        id: doc.id,
                    })) as WishlistItem[];
                    setItems(wishlistItems);
                    setIsLoading(false);
                },
                (err) => {
                    console.error('Error loading wishlist:', err);
                    setError(err.message);
                    setIsLoading(false);
                }
            );

            return () => unsubscribe();
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
                // Firestore
                try {
                    const wishlistRef = doc(
                        db,
                        'users',
                        userId,
                        'stores',
                        storeId,
                        'wishlist',
                        product.id
                    );
                    await setDoc(wishlistRef, {
                        ...wishlistItem,
                        addedAt: serverTimestamp(),
                    });
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
                // Firestore
                try {
                    const wishlistRef = doc(
                        db,
                        'users',
                        userId,
                        'stores',
                        storeId,
                        'wishlist',
                        productId
                    );
                    await deleteDoc(wishlistRef);
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
            // Firestore - delete all docs
            try {
                const wishlistRef = collection(
                    db,
                    'users',
                    userId,
                    'stores',
                    storeId,
                    'wishlist'
                );
                const snapshot = await getDocs(wishlistRef);
                const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
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











