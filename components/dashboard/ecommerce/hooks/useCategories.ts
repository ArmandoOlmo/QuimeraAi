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
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Category } from '../../../../types/ecommerce';

export const useCategories = (userId: string, storeId?: string) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';
    const categoriesPath = `users/${userId}/stores/${effectiveStoreId}/categories`;

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

            const docRef = await addDoc(categoriesRef, {
                ...categoryData,
                slug,
                position,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [categoriesPath, categories.length]
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
        },
        [categoriesPath]
    );

    // Delete category
    const deleteCategory = useCallback(
        async (categoryId: string) => {
            const categoryRef = doc(db, categoriesPath, categoryId);
            await deleteDoc(categoryRef);
        },
        [categoriesPath]
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
        },
        [categoriesPath]
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

