/**
 * useCategories Hook
 * Hook para gestión de categorías en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { Category } from '../../../../types/ecommerce';
import { mapCategoryFromDB } from '../../../../utils/ecommerceMappers';

const fallbackUuid = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
    (Number(char) ^ Math.random() * 16 >> Number(char) / 4).toString(16)
);

const newId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : fallbackUuid();

export const useCategories = (userId: string, storeId?: string) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';

    const fetchCategories = useCallback(async () => {
        if (!effectiveStoreId) return;

        setIsLoading(true);
        const { data, error: fetchError } = await supabase
            .from('store_categories')
            .select('*')
            .eq('project_id', effectiveStoreId);

        if (fetchError) {
            console.error('Error fetching categories:', fetchError);
            setError(fetchError.message);
        } else {
            const mappedCategories = (data || [])
                .map(mapCategoryFromDB)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            setCategories(mappedCategories);
            setError(null);
        }
        setIsLoading(false);
    }, [effectiveStoreId]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        fetchCategories();

        const channelName = `store_categories_changes:${effectiveStoreId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const channel = supabase.channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_categories',
                    filter: `project_id=eq.${effectiveStoreId}`
                },
                () => {
                    fetchCategories();
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, fetchCategories]);

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
            const position = categories.length;
            const slug = generateSlug(categoryData.name);
            const categoryId = newId();
            const now = new Date().toISOString();
            const publicData = {
                id: categoryId,
                ...categoryData,
                slug,
                position,
                createdAt: now,
                updatedAt: now,
            };

            const dbData = {
                id: categoryId,
                store_id: effectiveStoreId,
                project_id: effectiveStoreId,
                data: publicData,
                created_at: now,
                updated_at: now,
            };

            const { data: insertedDoc, error } = await supabase
                .from('store_categories')
                .insert(dbData)
                .select()
                .single();

            if (error) throw error;
            return insertedDoc.id;
        },
        [categories.length, effectiveStoreId]
    );

    // Update category
    const updateCategory = useCallback(
        async (categoryId: string, updates: Partial<Category>) => {
            const currentCategory = categories.find((category) => category.id === categoryId);
            const now = new Date().toISOString();
            const nextCategory = {
                ...currentCategory,
                ...updates,
                id: categoryId,
                slug: updates.name ? generateSlug(updates.name) : updates.slug || currentCategory?.slug || '',
                position: updates.position ?? currentCategory?.position ?? 0,
                updatedAt: now,
            };

            const { error } = await supabase
                .from('store_categories')
                .update({
                    data: nextCategory,
                    updated_at: now,
                })
                .eq('id', categoryId)
                .eq('project_id', effectiveStoreId);

            if (error) throw error;
        },
        [categories, effectiveStoreId]
    );

    // Delete category
    const deleteCategory = useCallback(
        async (categoryId: string) => {
            const { error } = await supabase
                .from('store_categories')
                .delete()
                .eq('id', categoryId)
                .eq('project_id', effectiveStoreId);

            if (error) throw error;
        },
        [effectiveStoreId]
    );

    // Reorder categories
    const reorderCategories = useCallback(
        async (orderedIds: string[]) => {
            const promises = orderedIds.map((id, index) => {
                const currentCategory = categories.find((category) => category.id === id);
                const now = new Date().toISOString();
                return supabase
                    .from('store_categories')
                    .update({
                        data: {
                            ...currentCategory,
                            id,
                            position: index,
                            updatedAt: now,
                        },
                        updated_at: now,
                    })
                    .eq('id', id)
                    .eq('project_id', effectiveStoreId);
            });

            const results = await Promise.all(promises);
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                throw errors[0].error;
            }
        },
        [categories, effectiveStoreId]
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
