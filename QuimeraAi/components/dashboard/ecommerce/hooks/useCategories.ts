/**
 * useCategories Hook
 * Hook para gestión de categorías en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { Category } from '../../../../types/ecommerce';
import { mapCategoryFromDB, mapCategoryToDB } from '../../../../utils/ecommerceMappers';
import { createRealtimeChannelName } from './realtimeChannelName';

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
            .eq('project_id', effectiveStoreId)
            .order('position', { ascending: true });

        if (fetchError) {
            console.error('Error fetching categories:', fetchError);
            setError(fetchError.message);
        } else {
            setCategories((data || []).map(mapCategoryFromDB));
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

        const channel = supabase.channel(createRealtimeChannelName('store_categories_changes', effectiveStoreId))
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
            supabase.removeChannel(channel);
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

            const dbData = mapCategoryToDB({
                ...categoryData,
                slug,
                position,
            });

            dbData.project_id = effectiveStoreId;

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
            const updateData = mapCategoryToDB(updates);

            if (updates.name) {
                updateData.slug = generateSlug(updates.name);
            }

            const { error } = await supabase
                .from('store_categories')
                .update(updateData)
                .eq('id', categoryId);

            if (error) throw error;
        },
        []
    );

    // Delete category
    const deleteCategory = useCallback(
        async (categoryId: string) => {
            const { error } = await supabase
                .from('store_categories')
                .delete()
                .eq('id', categoryId);

            if (error) throw error;
        },
        []
    );

    // Reorder categories
    const reorderCategories = useCallback(
        async (orderedIds: string[]) => {
            // Because Supabase doesn't have a direct 'bulk update multiple rows with different values' 
            // easily via the JS client, we can do multiple updates or use a database function.
            // Using Promise.all for updates since it's an admin op and categories count is usually small.
            const promises = orderedIds.map((id, index) => {
                return supabase
                    .from('store_categories')
                    .update({ position: index })
                    .eq('id', id);
            });

            const results = await Promise.all(promises);
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
                throw errors[0].error;
            }
        },
        []
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
