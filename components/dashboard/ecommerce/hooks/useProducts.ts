/**
 * useProducts Hook
 * Hook para gestión de productos en Firestore
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    where,
    getDocs,
    writeBatch,
    setDoc,
    getDoc,
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { db, storage } from '../../../../firebase';
import { Product, ProductImage, ProductStatus } from '../../../../types/ecommerce';

interface UseProductsOptions {
    categoryId?: string;
    status?: ProductStatus;
    lowStock?: boolean;
}

export const useProducts = (userId: string, storeId?: string, options?: UseProductsOptions) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use provided storeId (projectId)
    const effectiveStoreId = storeId || '';
    const productsPath = `users/${userId}/stores/${effectiveStoreId}/products`;

    // Helper to sync with public store
    const syncToPublicStore = useCallback(async (productId: string, productData: any, isDelete = false) => {
        if (!effectiveStoreId) return;

        try {
            const publicProductRef = doc(db, 'publicStores', effectiveStoreId, 'products', productId);

            if (isDelete) {
                await deleteDoc(publicProductRef);
                console.log(`[useProducts] 🗑️ Deleted product ${productId} from publicStores`);
                return;
            }

            // Only publish if active
            if (productData.status === 'active') {
                // Ensure we don't save undefined values
                const publicData = { ...productData };

                // Remove serverTimestamp placeholders effectively for client-side usage if needed, 
                // but for sync we want consistent data. 
                // However, we should be careful not to pass function objects if any.

                await setDoc(publicProductRef, {
                    ...publicData,
                    publishedAt: new Date().toISOString(),
                }, { merge: true });
                console.log(`[useProducts] ✅ Synced active product ${productId} to publicStores`);
            } else {
                // If not active, ensure it's removed from public store (e.g. status changed to draft)
                // Check if it exists first or just delete it
                await deleteDoc(publicProductRef);
                console.log(`[useProducts] 🔒 Removed non-active product ${productId} from publicStores`);
            }
        } catch (err) {
            console.error('[useProducts] Error syncing to public store:', err);
        }
    }, [effectiveStoreId]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        const productsRef = collection(db, productsPath);
        let q = query(productsRef, orderBy('createdAt', 'desc'));

        // Apply filters
        if (options?.categoryId) {
            q = query(productsRef, where('categoryId', '==', options.categoryId), orderBy('createdAt', 'desc'));
        }
        if (options?.status) {
            q = query(productsRef, where('status', '==', options.status), orderBy('createdAt', 'desc'));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Product[];

                // Filter low stock in memory (Firestore doesn't support complex queries easily)
                if (options?.lowStock) {
                    data = data.filter(
                        (p) => p.trackInventory && p.quantity <= (p.lowStockThreshold || 5)
                    );
                }

                setProducts(data);
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching products:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, options?.categoryId, options?.status, options?.lowStock, productsPath]);

    // Generate slug from name
    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    // Upload product image
    const uploadImage = useCallback(
        async (file: File, productId: string): Promise<ProductImage> => {
            const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const imagePath = `users/${userId}/stores/${effectiveStoreId}/products/${productId}/${imageId}`;
            const imageRef = ref(storage, imagePath);

            await uploadBytes(imageRef, file);
            const url = await getDownloadURL(imageRef);

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
            const imageRef = ref(storage, imagePath);

            try {
                await deleteObject(imageRef);
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
            const productsRef = collection(db, productsPath);

            // Extract library image URLs from productData
            const { libraryImageUrls, ...cleanProductData } = productData;

            const slug = generateSlug(cleanProductData.name);
            const timestamp = serverTimestamp() as any;

            const newProductData = {
                ...cleanProductData,
                slug,
                images: [],
                createdAt: timestamp,
                updatedAt: timestamp,
            };

            const docRef = await addDoc(productsRef, newProductData);
            let finalProductData = { ...newProductData, id: docRef.id } as Product;

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
                    const image = await uploadImage(file, docRef.id);
                    image.position = position++;
                    allImages.push(image);
                }
            }

            // Update product with all images
            if (allImages.length > 0) {
                await updateDoc(docRef, { images: allImages });
                finalProductData.images = allImages;
            }

            // Sync to public store
            // Convert serverTimestamp to date for public store immediate sync (approximate)
            const publicSyncData = {
                ...finalProductData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await syncToPublicStore(docRef.id, publicSyncData);

            return docRef.id;
        },
        [productsPath, uploadImage, syncToPublicStore]
    );

    // Update product
    const updateProduct = useCallback(
        async (
            productId: string,
            updates: Partial<Product> & { libraryImageUrls?: string[] },
            newImageFiles?: File[]
        ) => {
            const productRef = doc(db, productsPath, productId);

            // Extract library image URLs from updates
            const { libraryImageUrls, ...cleanUpdates } = updates;

            const updateData: any = {
                ...cleanUpdates,
                updatedAt: serverTimestamp(),
            };

            // Update slug if name changed
            if (cleanUpdates.name) {
                updateData.slug = generateSlug(cleanUpdates.name);
            }

            // Fetch current product to merge for sync
            const currentProduct = products.find((p) => p.id === productId);
            if (!currentProduct) return; // Should not happen

            const existingImages = currentProduct.images || [];
            let position = existingImages.length;
            const newImages: ProductImage[] = [];

            // Add library images (URLs from project/global library)
            if (libraryImageUrls && libraryImageUrls.length > 0) {
                for (const url of libraryImageUrls) {
                    // Check if this URL is already in existing images
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
            if (newImages.length > 0) {
                updateData.images = [...existingImages, ...newImages];
            }

            await updateDoc(productRef, updateData);

            // Sync to public store
            const finalDataForSync = {
                ...currentProduct,
                ...updateData,
                updatedAt: new Date().toISOString() // Use ISO string for public sync
            };
            await syncToPublicStore(productId, finalDataForSync);
        },
        [productsPath, products, uploadImage, syncToPublicStore]
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

            const productRef = doc(db, productsPath, productId);
            await deleteDoc(productRef);

            // Sync delete to public store
            await syncToPublicStore(productId, null, true);
        },
        [productsPath, products, deleteImage, syncToPublicStore]
    );

    // Update inventory
    const updateInventory = useCallback(
        async (productId: string, quantity: number) => {
            const productRef = doc(db, productsPath, productId);
            await updateDoc(productRef, {
                quantity,
                updatedAt: serverTimestamp(),
            });

            // Sync inventory to public store
            const currentProduct = products.find(p => p.id === productId);
            if (currentProduct) {
                await syncToPublicStore(productId, {
                    ...currentProduct,
                    quantity,
                    updatedAt: new Date().toISOString()
                });
            }
        },
        [productsPath, products, syncToPublicStore]
    );

    // Bulk update status
    const bulkUpdateStatus = useCallback(
        async (productIds: string[], status: ProductStatus) => {
            const batch = writeBatch(db);

            productIds.forEach((productId) => {
                const productRef = doc(db, productsPath, productId);
                batch.update(productRef, {
                    status,
                    updatedAt: serverTimestamp(),
                });
            });

            await batch.commit();

            // Sync all affected products to public store
            // We need to loop because each might have different data, 
            // but we can optimize by just syncing the status if we trust consistency.
            // Better safely: read current, update status, sync.
            // Since we have `products` in memory:
            for (const productId of productIds) {
                const currentProduct = products.find(p => p.id === productId);
                if (currentProduct) {
                    await syncToPublicStore(productId, {
                        ...currentProduct,
                        status,
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        },
        [productsPath, products, syncToPublicStore]
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

