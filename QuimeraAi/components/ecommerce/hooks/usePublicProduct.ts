/**
 * usePublicProduct Hook
 * Hook para obtener un producto desde la colección pública del storefront
 */

import { useState, useEffect, useCallback } from 'react';
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    limit, 
    getDocs,
    orderBy 
} from 'firebase/firestore';
import { db } from '../../../firebase';

// Types
export interface PublicProductImage {
    id: string;
    url: string;
    altText?: string;
    position: number;
}

export interface PublicProductVariant {
    id: string;
    name: string;
    sku?: string;
    price: number;
    options?: Array<{ name: string; value: string }>;
    inStock: boolean;
}

export interface ReviewStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution?: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export interface PublicProduct {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    price: number;
    compareAtPrice?: number;
    images: PublicProductImage[];
    categoryId?: string;
    categoryName?: string;          // Populated category name
    tags?: string[];
    variants?: PublicProductVariant[];
    trackInventory: boolean;
    inStock: boolean;
    lowStock: boolean;
    isFeatured?: boolean;           // Is this a featured product
    seoTitle?: string;
    seoDescription?: string;
    storeId: string;
    userId: string;
    reviewStats?: ReviewStats;      // Review statistics
    averageRating?: number;
    reviewCount?: number;
    createdAt?: any;
    updatedAt: any;
}

export interface UsePublicProductReturn {
    product: PublicProduct | null;
    relatedProducts: PublicProduct[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Hook para obtener un producto público por slug o ID
 */
export const usePublicProduct = (
    storeId: string,
    slugOrId: string
): UsePublicProductReturn => {
    const [product, setProduct] = useState<PublicProduct | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<PublicProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProduct = useCallback(async () => {
        if (!storeId || !slugOrId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const productsRef = collection(db, 'publicStores', storeId, 'products');
            
            // First try to find by slug
            const slugQuery = query(
                productsRef,
                where('slug', '==', slugOrId),
                limit(1)
            );
            
            let productDoc = await getDocs(slugQuery);
            
            // If not found by slug, try by ID
            if (productDoc.empty) {
                const idDoc = await getDoc(doc(productsRef, slugOrId));
                if (idDoc.exists()) {
                    const data = idDoc.data() as PublicProduct;
                    setProduct({ ...data, id: idDoc.id });
                    await fetchRelatedProducts(data.categoryId, idDoc.id);
                } else {
                    setError('Producto no encontrado');
                    setProduct(null);
                }
            } else {
                const data = productDoc.docs[0].data() as PublicProduct;
                setProduct({ ...data, id: productDoc.docs[0].id });
                await fetchRelatedProducts(data.categoryId, productDoc.docs[0].id);
            }
        } catch (err: any) {
            console.error('Error fetching product:', err);
            setError(err.message || 'Error al cargar el producto');
            setProduct(null);
        } finally {
            setIsLoading(false);
        }
    }, [storeId, slugOrId]);

    const fetchRelatedProducts = async (categoryId: string | undefined, currentProductId: string) => {
        if (!categoryId) {
            setRelatedProducts([]);
            return;
        }

        try {
            const productsRef = collection(db, 'publicStores', storeId, 'products');
            const relatedQuery = query(
                productsRef,
                where('categoryId', '==', categoryId),
                where('inStock', '==', true),
                orderBy('updatedAt', 'desc'),
                limit(5) // Get 5 to filter out current product
            );

            const relatedDocs = await getDocs(relatedQuery);
            const related = relatedDocs.docs
                .map(doc => ({ ...doc.data(), id: doc.id } as PublicProduct))
                .filter(p => p.id !== currentProductId)
                .slice(0, 4); // Limit to 4 related products

            setRelatedProducts(related);
        } catch (err) {
            console.error('Error fetching related products:', err);
            setRelatedProducts([]);
        }
    };

    useEffect(() => {
        fetchProduct();
    }, [fetchProduct]);

    return {
        product,
        relatedProducts,
        isLoading,
        error,
        refetch: fetchProduct,
    };
};

/**
 * Hook para obtener la categoría de un producto
 */
export const usePublicCategory = (storeId: string, categoryId: string | undefined) => {
    const [category, setCategory] = useState<{ id: string; name: string; slug: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!storeId || !categoryId) {
            setCategory(null);
            setIsLoading(false);
            return;
        }

        const fetchCategory = async () => {
            try {
                const categoryDoc = await getDoc(
                    doc(db, 'publicStores', storeId, 'categories', categoryId)
                );
                
                if (categoryDoc.exists()) {
                    const data = categoryDoc.data();
                    setCategory({
                        id: categoryDoc.id,
                        name: data.name,
                        slug: data.slug,
                    });
                }
            } catch (err) {
                console.error('Error fetching category:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategory();
    }, [storeId, categoryId]);

    return { category, isLoading };
};

export default usePublicProduct;
