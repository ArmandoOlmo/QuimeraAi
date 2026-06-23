/**
 * usePublicProduct Hook
 * Hook para obtener un producto desde la colección pública del storefront
 */

import { useState, useEffect, useCallback } from 'react';
import {
    findPublicStorefrontCategory,
    findPublicStorefrontProduct,
} from '../../../utils/ecommerce/publicStorefrontCatalog';

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
    quantity?: number;
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
    quantity?: number;
    lowStockThreshold?: number;
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
            const result = await findPublicStorefrontProduct(storeId, slugOrId);

            if (!result.product) {
                setError('Producto no encontrado');
                setProduct(null);
                setRelatedProducts([]);
                return;
            }

            setProduct(result.product as PublicProduct);
            setRelatedProducts(result.relatedProducts as PublicProduct[]);
        } catch (err: any) {
            console.error('Error fetching product:', err);
            setError(err.message || 'Error al cargar el producto');
            setProduct(null);
        } finally {
            setIsLoading(false);
        }
    }, [storeId, slugOrId]);

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
                const result = await findPublicStorefrontCategory(storeId, categoryId);

                if (result.category) {
                    setCategory({
                        id: result.category.id,
                        name: result.category.name,
                        slug: result.category.slug,
                    });
                } else {
                    setCategory(null);
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
