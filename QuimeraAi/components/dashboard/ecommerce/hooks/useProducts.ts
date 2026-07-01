/**
 * useProducts Hook
 * Hook para gestión de productos en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { Product, ProductImage, ProductStatus } from '../../../../types/ecommerce';
import { mapProductFromDB, mapProductToDB } from '../../../../utils/ecommerceMappers';
import { createRealtimeChannelName } from './realtimeChannel';
import { uploadPlatformAsset } from '../../../../utils/platformAssetUpload';

interface UseProductsOptions {
    categoryId?: string;
    status?: ProductStatus;
    lowStock?: boolean;
}

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

        // Realtime subscription
        const channel = supabase.channel(createRealtimeChannelName('store_products_changes', effectiveStoreId))
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
            supabase.removeChannel(channel);
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

    const resolveLibraryTenantId = useCallback(async (): Promise<string> => {
        const { data: projectRow, error: projectError } = await supabase
            .from('projects')
            .select('tenant_id')
            .eq('id', effectiveStoreId)
            .maybeSingle();

        if (projectError) throw projectError;
        if (projectRow?.tenant_id) return projectRow.tenant_id;

        const { data: memberRow, error: memberError } = await supabase
            .from('tenant_members')
            .select('tenant_id')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();

        if (memberError) throw memberError;
        if (memberRow?.tenant_id) return memberRow.tenant_id;

        throw new Error('No tenant membership found for product image library registration');
    }, [effectiveStoreId, userId]);

    // Upload product image
    const uploadImage = useCallback(
        async (file: File, productId: string): Promise<ProductImage> => {
            const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const imagePath = `users/${userId}/stores/${effectiveStoreId}/products/${productId}/${imageId}`;

            const { publicUrl: url } = await uploadPlatformAsset(imagePath, file, {
                upsert: true,
                contentType: file.type || 'application/octet-stream',
            });

            const tenantId = await resolveLibraryTenantId();
            const { error: fileInsertError } = await supabase
                .from('files')
                .insert([{
                    tenant_id: tenantId,
                    project_id: effectiveStoreId,
                    name: file.name,
                    url,
                    size: file.size,
                    type: file.type,
                    metadata: {
                        storagePath: imagePath,
                        source: 'ecommerce_product',
                        productId,
                        imageId,
                    },
                    created_at: new Date().toISOString(),
                }]);

            if (fileInsertError) {
                await supabase.storage.from('platform-assets').remove([imagePath]).catch(() => undefined);
                throw fileInsertError;
            }

            return {
                id: imageId,
                url,
                altText: file.name,
                position: 0,
            };
        },
        [effectiveStoreId, resolveLibraryTenantId, userId]
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

            const { error: libraryDeleteError } = await supabase
                .from('files')
                .delete()
                .eq('project_id', effectiveStoreId)
                .contains('metadata', { storagePath: imagePath });

            if (libraryDeleteError) {
                console.warn('Product image was removed from storage but not from project library:', libraryDeleteError);
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

            const dbData = mapProductToDB({
                ...cleanProductData,
                slug,
                images: [],
            });

            dbData.project_id = effectiveStoreId;

            const { data: insertedProduct, error: insertError } = await supabase
                .from('store_products')
                .insert(dbData)
                .select()
                .single();

            if (insertError) throw insertError;

            const productId = insertedProduct.id;
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
                await supabase
                    .from('store_products')
                    .update({ images: allImages })
                    .eq('id', productId);
            }

            return productId;
        },
        [effectiveStoreId, uploadImage]
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

            const updateData = mapProductToDB(cleanUpdates);

            // Update slug if name changed
            if (cleanUpdates.name) {
                updateData.slug = generateSlug(cleanUpdates.name);
            }

            // Fetch current product to merge images
            let currentProduct = products.find((p) => p.id === productId) ?? null;
            if (!currentProduct) {
                const { data: productRow, error: productFetchError } = await supabase
                    .from('store_products')
                    .select('*')
                    .eq('id', productId)
                    .maybeSingle();

                if (productFetchError) throw productFetchError;
                currentProduct = productRow ? mapProductFromDB(productRow) : null;
            }

            const existingImages = currentProduct?.images || [];
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
                            altText: cleanUpdates.name || currentProduct?.name || '',
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
            if (newImages.length > 0) {
                updateData.images = [...existingImages, ...newImages];
            }

            const { error: updateError } = await supabase
                .from('store_products')
                .update(updateData)
                .eq('id', productId);

            if (updateError) throw updateError;

            await fetchProducts();
        },
        [fetchProducts, products, uploadImage]
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
                .update({ quantity, inventory_quantity: quantity })
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
        refreshProducts: fetchProducts,
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
