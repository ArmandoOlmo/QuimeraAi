/**
 * useCategories Hook
 * Hook para gestión de categorías en Firestore
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
    setDoc,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Category } from '../../../../types/ecommerce';

export const useCategories = (userId: string, storeId?: string) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';
    const categoriesPath = `users/${userId}/stores/${effectiveStoreId}/categories`;

    // Helper to sync with public store
    const syncToPublicStore = useCallback(async (categoryId: string, categoryData: any, isDelete = false) => {
        if (!effectiveStoreId) return;

        try {
            const publicCategoryRef = doc(db, 'publicStores', effectiveStoreId, 'categories', categoryId);

            if (isDelete) {
                await deleteDoc(publicCategoryRef);
                console.log(`[useCategories] 🗑️ Deleted category ${categoryId} from publicStores`);
                return;
            }

            // Ensure we don't save undefined values
            const publicData = { ...categoryData };

            await setDoc(publicCategoryRef, {
                ...publicData,
                publishedAt: new Date().toISOString(),
            }, { merge: true });
            console.log(`[useCategories] ✅ Synced category ${categoryId} to publicStores`);

        } catch (err) {
            console.error('[useCategories] Error syncing to public store:', err);
        }
    }, [effectiveStoreId]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        const categoriesRef = collection(db, categoriesPath);
        const q = query(categoriesRef, orderBy('position', 'asc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Category[];
                setCategories(data);
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching categories:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, categoriesPath]);

    // Generate slug from name
    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    // Add category
    const addCategory = useCallback(
        async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'position'>): Promise<string> => {
            const categoriesRef = collection(db, categoriesPath);

            // Get next position
            const position = categories.length;
            const slug = generateSlug(categoryData.name);
            const timestamp = serverTimestamp();

            const newCategoryData = {
                ...categoryData,
                slug,
                position,
                createdAt: timestamp,
                updatedAt: timestamp,
            };

            const docRef = await addDoc(categoriesRef, newCategoryData);

            // Sync to public store
            const publicSyncData = {
                ...newCategoryData,
                id: docRef.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await syncToPublicStore(docRef.id, publicSyncData);

            return docRef.id;
        },
        [categoriesPath, categories.length, syncToPublicStore]
    );

    // Update category
    const updateCategory = useCallback(
        async (categoryId: string, updates: Partial<Category>) => {
            const categoryRef = doc(db, categoriesPath, categoryId);

            const updateData: any = {
                ...updates,
                updatedAt: serverTimestamp(),
            };

            if (updates.name) {
                updateData.slug = generateSlug(updates.name);
            }

            await updateDoc(categoryRef, updateData);

            // Sync to public store
            // We need to merge with existing data to ensure completeness if needed,
            // or just merge what we have if the public store already has the rest.
            // Using merge: true in syncToPublicStore handles partial updates safely.
            // But to be safe, let's grab the current category from state to ensure we have a full picture if needed,
            // though for updates just sending changed fields + updatedAt is usually enough with merge: true.
            const currentCategory = categories.find(c => c.id === categoryId);

            if (currentCategory) {
                const finalDataForSync = {
                    ...currentCategory,
                    ...updateData,
                    updatedAt: new Date().toISOString()
                };
                await syncToPublicStore(categoryId, finalDataForSync);
            }
        },
        [categoriesPath, categories, syncToPublicStore]
    );

    // Delete category
    const deleteCategory = useCallback(
        async (categoryId: string) => {
            const categoryRef = doc(db, categoriesPath, categoryId);
            await deleteDoc(categoryRef);

            // Sync delete to public store
            await syncToPublicStore(categoryId, null, true);
        },
        [categoriesPath, syncToPublicStore]
    );

    // Reorder categories
    const reorderCategories = useCallback(
        async (orderedIds: string[]) => {
            const promises = orderedIds.map((id, index) => {
                const categoryRef = doc(db, categoriesPath, id);
                return updateDoc(categoryRef, {
                    position: index,
                    updatedAt: serverTimestamp(),
                });
            });

            await Promise.all(promises);

            // Sync reorder to public store (updates positions)
            for (let index = 0; index < orderedIds.length; index++) {
                const id = orderedIds[index];
                await syncToPublicStore(id, {
                    position: index,
                    updatedAt: new Date().toISOString()
                });
            }
        },
        [categoriesPath, syncToPublicStore]
    );

    // Get category by ID
    const getCategoryById = useCallback(
        (categoryId: string): Category | undefined => {
            return categories.find((c) => c.id === categoryId);
        },
        [categories]
    );

    // Get subcategories
    const getSubcategories = useCallback(
        (parentId: string): Category[] => {
            return categories.filter((c) => c.parentId === parentId);
        },
        [categories]
    );

    // Get root categories (no parent)
    const getRootCategories = useCallback((): Category[] => {
        return categories.filter((c) => !c.parentId);
    }, [categories]);

    // Build category tree
    const getCategoryTree = useCallback((): Array<Category & { children: Category[] }> => {
        const rootCategories = getRootCategories();
        return rootCategories.map((cat) => ({
            ...cat,
            children: getSubcategories(cat.id),
        }));
    }, [getRootCategories, getSubcategories]);

    return {
        categories,
        isLoading,
        error,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        getCategoryById,
        getSubcategories,
        getRootCategories,
        getCategoryTree,
    };
};

