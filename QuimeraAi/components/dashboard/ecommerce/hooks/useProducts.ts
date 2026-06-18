/**
 * useProducts Hook
 * Hook para gestión de productos en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { Product, ProductImage, ProductStatus } from '../../../../types/ecommerce';
import { mapProductFromDB, mapProductToDB } from '../../../../utils/ecommerceMappers';

interface UseProductsOptions {
    categoryId?: string;
    status?: ProductStatus;
    lowStock?: boolean;
}

const fallbackUuid = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
    (Number(char) ^ Math.random() * 16 >> Number(char) / 4).toString(16)
);

const newId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : fallbackUuid();

export const useProducts = (userId: string, storeId?: string, options?: UseProductsOptions) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';

    // Fetch products
    const fetchProducts = useCallback(async () => {
        if (!effectiveStoreId) return;
        
        setIsLoading(true);
        let query = supabase
            .from('store_products')
            .select('*')
            .eq('project_id', effectiveStoreId)
            .order('created_at', { ascending: false });

        if (options?.categoryId) {
            query = query.eq('category_id', options.categoryId);
        }
        if (options?.status) {
            query = query.eq('status', options.status);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching products:', fetchError);
            setError(fetchError.message);
        } else {
            let mappedData = (data || []).map(mapProductFromDB);

            // Filter low stock in memory
            if (options?.lowStock) {
                mappedData = mappedData.filter(
                    (p) => p.trackInventory && p.quantity <= (p.lowStockThreshold || 5)
                );
            }

            setProducts(mappedData);
            setError(null);
        }
        setIsLoading(false);
    }, [effectiveStoreId, options?.categoryId, options?.status, options?.lowStock]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        fetchProducts();

        const channelName = `store_products_changes:${effectiveStoreId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const channel = supabase.channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_products',
                    filter: `project_id=eq.${effectiveStoreId}`
                },
                () => {
                    fetchProducts();
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, fetchProducts]);

    // Generate slug from name
    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const toPublicProductData = (
        productId: string,
        product: Partial<Product>,
        slug: string,
        images: ProductImage[],
        now: string
    ) => ({
        id: productId,
        name: product.name || '',
        slug,
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        price: product.price || 0,
        compareAtPrice: product.compareAtPrice || null,
        costPrice: product.costPrice || null,
        currency: product.currency || 'USD',
        sku: product.sku || null,
        barcode: product.barcode || null,
        quantity: product.quantity ?? 0,
        trackInventory: product.trackInventory ?? true,
        lowStockThreshold: product.lowStockThreshold ?? 5,
        images,
        categoryId: product.categoryId || null,
        tags: product.tags || [],
        hasVariants: product.hasVariants || false,
        variants: product.variants || [],
        options: product.options || [],
        status: product.status || 'draft',
        isDigital: product.isDigital || false,
        isFeatured: product.isFeatured || false,
        inStock: (product.quantity ?? 0) > 0,
        lowStock: (product.quantity ?? 0) <= (product.lowStockThreshold || 5),
        weight: product.weight || null,
        weightUnit: product.weightUnit || 'kg',
        storeId: effectiveStoreId,
        userId,
        createdAt: product.createdAt || now,
        updatedAt: now,
        publishedAt: product.status === 'active' ? now : undefined,
    });

    // Upload product image
    const uploadImage = useCallback(
        async (file: File, productId: string): Promise<ProductImage> => {
            const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const imagePath = `users/${userId}/stores/${effectiveStoreId}/products/${productId}/${imageId}`;

            const { error: uploadError } = await supabase.storage
                .from('platform-assets')
                .upload(imagePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl: url } } = supabase.storage
                .from('platform-assets')
                .getPublicUrl(imagePath);

            return {
                id: imageId,
                url,
                altText: file.name,
                position: 0,
            };
        },
        [userId, effectiveStoreId]
    );

    // Delete product image
    const deleteImage = useCallback(
        async (productId: string, imageId: string) => {
            const imagePath = `users/${userId}/stores/${effectiveStoreId}/products/${productId}/${imageId}`;

            try {
                await supabase.storage
                    .from('platform-assets')
                    .remove([imagePath]);
            } catch (err) {
                console.warn('Image may not exist:', err);
            }
        },
        [userId, effectiveStoreId]
    );

    // Add product
    const addProduct = useCallback(
        async (
            productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'slug'> & { libraryImageUrls?: string[] },
            imageFiles?: File[]
        ): Promise<string> => {
            // Extract library image URLs from productData
            const { libraryImageUrls, ...cleanProductData } = productData;

            const slug = generateSlug(cleanProductData.name);
            const productId = newId();
            const now = new Date().toISOString();

            const dbData = mapProductToDB({
                ...cleanProductData,
                slug,
                images: [],
            });

            dbData.id = productId;
            dbData.project_id = effectiveStoreId;
            dbData.store_id = effectiveStoreId;
            dbData.created_at = now;
            dbData.updated_at = now;
            dbData.data = toPublicProductData(productId, cleanProductData, slug, [], now);

            const { error: insertError } = await supabase
                .from('store_products')
                .insert(dbData)
                .select()
                .single();

            if (insertError) throw insertError;

            const allImages: ProductImage[] = [];
            let position = 0;

            // Add library images (URLs from project/global library)
            if (libraryImageUrls && libraryImageUrls.length > 0) {
                for (const url of libraryImageUrls) {
                    allImages.push({
                        id: `library-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        url,
                        altText: cleanProductData.name,
                        position: position++,
                    });
                }
            }

            // Upload new image files
            if (imageFiles && imageFiles.length > 0) {
                for (const file of imageFiles) {
                    const image = await uploadImage(file, productId);
                    image.position = position++;
                    allImages.push(image);
                }
            }

            // Update product with all images
            if (allImages.length > 0) {
                const publicData = toPublicProductData(productId, cleanProductData, slug, allImages, new Date().toISOString());
                await supabase
                    .from('store_products')
                    .update({ images: allImages, data: publicData })
                    .eq('id', productId);
            }

            return productId;
        },
        [effectiveStoreId, uploadImage, userId]
    );

    // Update product
    const updateProduct = useCallback(
        async (
            productId: string,
            updates: Partial<Product> & { libraryImageUrls?: string[] },
            newImageFiles?: File[]
        ) => {
            // Extract library image URLs from updates
            const { libraryImageUrls, ...cleanUpdates } = updates;

            // Fetch current product to merge images
            const currentProduct = products.find((p) => p.id === productId);
            if (!currentProduct) return;

            const updateData = mapProductToDB(cleanUpdates);

            // Update slug if name changed
            let nextSlug = currentProduct.slug;
            if (cleanUpdates.name) {
                nextSlug = generateSlug(cleanUpdates.name);
                updateData.slug = nextSlug;
            }

            const existingImages = currentProduct.images || [];
            let position = existingImages.length;
            const newImages: ProductImage[] = [];

            // Add library images
            if (libraryImageUrls && libraryImageUrls.length > 0) {
                for (const url of libraryImageUrls) {
                    const alreadyExists = existingImages.some(img => img.url === url);
                    if (!alreadyExists) {
                        newImages.push({
                            id: `library-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            url,
                            altText: cleanUpdates.name || currentProduct.name || '',
                            position: position++,
                        });
                    }
                }
            }

            // Upload new image files
            if (newImageFiles && newImageFiles.length > 0) {
                for (const file of newImageFiles) {
                    const image = await uploadImage(file, productId);
                    image.position = position++;
                    newImages.push(image);
                }
            }

            // Combine existing and new images
            let nextImages = existingImages;
            if (newImages.length > 0) {
                nextImages = [...existingImages, ...newImages];
                updateData.images = nextImages;
            }
            const now = new Date().toISOString();
            const nextProduct = {
                ...currentProduct,
                ...cleanUpdates,
                slug: nextSlug || currentProduct.slug,
                images: nextImages,
                updatedAt: now,
            };
            updateData.data = toPublicProductData(productId, nextProduct, nextProduct.slug, nextImages, now);

            const { error: updateError } = await supabase
                .from('store_products')
                .update(updateData)
                .eq('id', productId);

            if (updateError) throw updateError;
        },
        [products, uploadImage, effectiveStoreId, userId]
    );

    // Delete product
    const deleteProduct = useCallback(
        async (productId: string) => {
            const product = products.find((p) => p.id === productId);

            // Delete all product images from storage
            if (product?.images) {
                for (const image of product.images) {
                    await deleteImage(productId, image.id);
                }
            }

            const { error } = await supabase
                .from('store_products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
        },
        [products, deleteImage]
    );

    // Update inventory
    const updateInventory = useCallback(
        async (productId: string, quantity: number) => {
            const { error } = await supabase
                .from('store_products')
                .update({ quantity })
                .eq('id', productId);

            if (error) throw error;
        },
        []
    );

    // Bulk update status
    const bulkUpdateStatus = useCallback(
        async (productIds: string[], status: ProductStatus) => {
            // Supabase allows bulk updates with in()
            const { error } = await supabase
                .from('store_products')
                .update({ status })
                .in('id', productIds);

            if (error) throw error;
        },
        []
    );

    // Get product by ID
    const getProductById = useCallback(
        (productId: string): Product | undefined => {
            return products.find((p) => p.id === productId);
        },
        [products]
    );

    // Search products
    const searchProducts = useCallback(
        (searchTerm: string): Product[] => {
            const term = searchTerm.toLowerCase();
            return products.filter(
                (p) =>
                    p.name.toLowerCase().includes(term) ||
                    p.description?.toLowerCase().includes(term) ||
                    p.sku?.toLowerCase().includes(term)
            );
        },
        [products]
    );

    // Get low stock products
    const getLowStockProducts = useCallback((): Product[] => {
        return products.filter(
            (p) => p.trackInventory && p.quantity <= (p.lowStockThreshold || 5)
        );
    }, [products]);

    return {
        products,
        isLoading,
        error,
        addProduct,
        updateProduct,
        deleteProduct,
        updateInventory,
        bulkUpdateStatus,
        uploadImage,
        deleteImage,
        getProductById,
        searchProducts,
        getLowStockProducts,
    };
};
