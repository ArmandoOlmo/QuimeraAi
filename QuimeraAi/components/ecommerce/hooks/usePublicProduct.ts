/**
 * usePublicProduct Hook
 * Hook para obtener un producto desde el storefront público.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabase';

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
    categoryName?: string;
    tags?: string[];
    variants?: PublicProductVariant[];
    trackInventory: boolean;
    inStock: boolean;
    lowStock: boolean;
    isFeatured?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    storeId: string;
    userId: string;
    reviewStats?: ReviewStats;
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

const mapPublicProduct = (row: any, storeId: string): PublicProduct => {
    const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {};
    const quantity = Number(row.quantity ?? data.quantity ?? 0);
    const lowStockThreshold = Number(row.low_stock_threshold ?? data.lowStockThreshold ?? 5);
    const images = row.images ?? data.images ?? [];
    const variants = row.variants ?? data.variants ?? [];

    return {
        id: row.id ?? data.id,
        name: row.name ?? data.name ?? '',
        slug: row.slug ?? data.slug ?? '',
        description: row.description ?? data.description ?? '',
        shortDescription: row.short_description ?? data.shortDescription,
        price: Number(row.price ?? data.price ?? 0),
        compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : data.compareAtPrice,
        images,
        categoryId: row.category_id ?? data.categoryId,
        categoryName: data.categoryName,
        tags: row.tags ?? data.tags ?? [],
        variants,
        trackInventory: row.track_inventory ?? data.trackInventory ?? true,
        inStock: row.quantity != null ? quantity > 0 : data.inStock ?? (quantity > 0),
        lowStock: data.lowStock ?? (quantity <= lowStockThreshold),
        isFeatured: row.is_featured ?? data.isFeatured,
        seoTitle: data.metaTitle ?? data.seoTitle,
        seoDescription: data.metaDescription ?? data.seoDescription,
        storeId,
        userId: data.userId ?? '',
        reviewStats: data.reviewStats,
        averageRating: data.averageRating,
        reviewCount: data.reviewCount,
        createdAt: row.created_at ?? data.createdAt,
        updatedAt: row.updated_at ?? data.updatedAt ?? row.created_at,
    };
};

export const usePublicProduct = (
    storeId: string,
    slugOrId: string
): UsePublicProductReturn => {
    const [product, setProduct] = useState<PublicProduct | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<PublicProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRelatedProducts = useCallback(async (categoryId: string | undefined, currentProductId: string) => {
        if (!categoryId || !storeId) {
            setRelatedProducts([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('store_products')
                .select('*')
                .eq('store_id', storeId)
                .eq('status', 'active')
                .limit(20);

            if (error) throw error;

            const related = (data || [])
                .map((row) => mapPublicProduct(row, storeId))
                .filter((item) => item.id !== currentProductId && item.categoryId === categoryId && item.inStock)
                .slice(0, 4);

            setRelatedProducts(related);
        } catch (err) {
            console.error('Error fetching related products:', err);
            setRelatedProducts([]);
        }
    }, [storeId]);

    const fetchProduct = useCallback(async () => {
        if (!storeId || !slugOrId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let { data, error } = await supabase
                .from('store_products')
                .select('*')
                .eq('store_id', storeId)
                .eq('slug', slugOrId)
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                const byId = await supabase
                    .from('store_products')
                    .select('*')
                    .eq('store_id', storeId)
                    .eq('id', slugOrId)
                    .limit(1)
                    .maybeSingle();

                if (byId.error) throw byId.error;
                data = byId.data;
            }

            if (!data) {
                setError('Producto no encontrado');
                setProduct(null);
                setRelatedProducts([]);
                return;
            }

            const mapped = mapPublicProduct(data, storeId);
            setProduct(mapped);
            await fetchRelatedProducts(mapped.categoryId, mapped.id);
        } catch (err: any) {
            console.error('Error fetching product:', err);
            setError(err.message || 'Error al cargar el producto');
            setProduct(null);
            setRelatedProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [storeId, slugOrId, fetchRelatedProducts]);

    useEffect(() => {
        void fetchProduct();
    }, [fetchProduct]);

    return {
        product,
        relatedProducts,
        isLoading,
        error,
        refetch: fetchProduct,
    };
};

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
                const { data, error } = await supabase
                    .from('store_categories')
                    .select('id, data')
                    .eq('store_id', storeId)
                    .eq('id', categoryId)
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    setCategory({
                        id: data.id,
                        name: data.data?.name || '',
                        slug: data.data?.slug || '',
                    });
                } else {
                    setCategory(null);
                }
            } catch (err) {
                console.error('Error fetching category:', err);
                setCategory(null);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchCategory();
    }, [storeId, categoryId]);

    return { category, isLoading };
};

export default usePublicProduct;
