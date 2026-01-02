/**
 * usePublicProducts Hook
 * Hook para obtener productos públicos de una tienda para el storefront
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
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
 * Lee desde publicStores/{storeId}/products
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

        const fetchCategories = async () => {
            try {
                const categoriesRef = collection(db, 'publicStores', storeId, 'categories');
                const snapshot = await getDocs(categoriesRef);
                const cats = snapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    slug: doc.data().slug,
                }));
                setCategories(cats);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };

        fetchCategories();
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
            const productsRef = collection(db, 'publicStores', storeId, 'products');
            
            // Simple query - fetch all and filter/sort client-side to avoid index requirements
            const q = query(productsRef, limit(limitCount * 2)); // Fetch more to account for filtering
            const snapshot = await getDocs(q);

            let fetchedProducts: StorefrontProductItem[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    description: data.shortDescription || data.description,
                    price: data.price,
                    compareAtPrice: data.compareAtPrice,
                    image: data.images?.[0]?.url,
                    category: data.categoryId,
                    inStock: data.inStock ?? true,
                    rating: data.averageRating,
                    reviewCount: data.reviewCount,
                    slug: data.slug,
                    updatedAt: data.updatedAt,
                };
            });

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
                        const dateA = a.updatedAt?.toDate?.() || new Date(0);
                        const dateB = b.updatedAt?.toDate?.() || new Date(0);
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

    // Realtime subscription (optional) - uses simple query to avoid index requirements
    useEffect(() => {
        if (!storeId || !realtime) return;

        const productsRef = collection(db, 'publicStores', storeId, 'products');
        const q = query(productsRef, limit(limitCount * 2));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let fetchedProducts: StorefrontProductItem[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name,
                        description: data.shortDescription || data.description,
                        price: data.price,
                        compareAtPrice: data.compareAtPrice,
                        image: data.images?.[0]?.url,
                        category: data.categoryId,
                        inStock: data.inStock ?? true,
                        rating: data.averageRating,
                        reviewCount: data.reviewCount,
                        slug: data.slug,
                        updatedAt: data.updatedAt,
                    };
                });
                
                // Client-side filtering and sorting
                fetchedProducts = fetchedProducts
                    .filter(p => p.inStock !== false)
                    .sort((a, b) => {
                        const dateA = a.updatedAt?.toDate?.() || new Date(0);
                        const dateB = b.updatedAt?.toDate?.() || new Date(0);
                        return dateB.getTime() - dateA.getTime();
                    })
                    .slice(0, limitCount);
                
                setProducts(fetchedProducts);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error in realtime subscription:', err);
                setError(err.message);
            }
        );

        return () => unsubscribe();
    }, [storeId, realtime, limitCount]);

    return {
        products,
        isLoading,
        error,
        refetch: fetchProducts,
        categories,
    };
};

export default usePublicProducts;











