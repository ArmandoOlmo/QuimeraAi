/**
 * useCategories Hook
 * Hook para gestión de categorías en Supabase
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../supabase';
import { Category } from '../../../../types/ecommerce';
import { mapCategoryFromDB } from '../../../../utils/ecommerceMappers';
import { createRealtimeChannelName } from './realtimeChannel';

type CategoryUpdate = Partial<Omit<Category, 'parentId'>> & {
    parentId?: string | null;
};

type CategoryWriteInput = Partial<Omit<Category, 'description' | 'imageUrl' | 'parentId'>> & {
    description?: string | null;
    imageUrl?: string | null;
    parentId?: string | null;
};

type CategorySchemaMode = 'unknown' | 'flat' | 'json';

const mapCategoryToFlatDB = (category: CategoryWriteInput): Record<string, unknown> => {
    const data: Record<string, unknown> = {};

    if (category.name !== undefined) data.name = category.name;
    if (category.slug !== undefined) data.slug = category.slug;
    if (category.description !== undefined) data.description = category.description ?? '';
    if (category.imageUrl !== undefined) data.image_url = category.imageUrl ?? '';
    if (category.parentId !== undefined) data.parent_id = category.parentId || null;
    if (category.position !== undefined) data.position = category.position;

    return data;
};

const mapCategoryToJsonOnlyDB = (category: CategoryWriteInput): Record<string, unknown> => {
    const metadata: Record<string, unknown> = {};

    if (category.name !== undefined) metadata.name = category.name;
    if (category.slug !== undefined) metadata.slug = category.slug;
    if (category.description !== undefined) metadata.description = category.description ?? '';
    if (category.imageUrl !== undefined) metadata.imageUrl = category.imageUrl ?? '';
    if (category.parentId !== undefined) metadata.parentId = category.parentId || null;
    if (category.position !== undefined) metadata.position = category.position;

    return { data: metadata };
};

const getErrorMessage = (error: unknown): string => {
    if (!error) return '';
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message ?? '');
    }
    return String(error);
};

const applyOrderedIds = (source: Category[], orderedIds: string[]): Category[] => {
    const orderedSet = new Set(orderedIds);
    const nextPositionById = new Map(orderedIds.map((id, index) => [id, index]));
    const reorderedItems = orderedIds
        .map((id) => source.find((category) => category.id === id))
        .filter((category): category is Category => Boolean(category))
        .map((category) => ({
            ...category,
            position: nextPositionById.get(category.id) ?? category.position,
        }));

    let cursor = 0;

    return source.map((category) => {
        if (!orderedSet.has(category.id)) return category;
        return reorderedItems[cursor++] ?? category;
    });
};

export const useCategories = (userId: string, storeId?: string) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const schemaModeRef = useRef<CategorySchemaMode>('unknown');

    const effectiveStoreId = storeId || '';

    const fetchCategories = useCallback(async () => {
        if (!effectiveStoreId) return;

        setIsLoading(true);
        const { data, error: fetchError } = await supabase
            .from('store_categories')
            .select('*')
            .eq('project_id', effectiveStoreId)
            .order('created_at', { ascending: true });

        if (fetchError) {
            console.error('Error fetching categories:', fetchError);
            setError(fetchError.message);
        } else {
            const firstRow = data?.[0] as Record<string, unknown> | undefined;
            if (firstRow) {
                schemaModeRef.current = firstRow.name !== undefined || firstRow.position !== undefined
                    ? 'flat'
                    : 'json';
            }

            const mappedCategories = (data || [])
                .map(mapCategoryFromDB)
                .sort((a, b) => a.position - b.position);

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

    const insertCategoryRow = useCallback(
        async (category: CategoryWriteInput): Promise<string> => {
            if (schemaModeRef.current === 'json') {
                const jsonData = mapCategoryToJsonOnlyDB(category);
                jsonData.project_id = effectiveStoreId;

                const { data: insertedDoc, error } = await supabase
                    .from('store_categories')
                    .insert(jsonData)
                    .select()
                    .single();

                if (error) throw error;
                return insertedDoc.id;
            }

            const flatData = mapCategoryToFlatDB(category);
            flatData.project_id = effectiveStoreId;

            const flatResult = await supabase
                .from('store_categories')
                .insert(flatData)
                .select()
                .single();

            if (!flatResult.error) return flatResult.data.id;

            schemaModeRef.current = 'json';

            const jsonData = mapCategoryToJsonOnlyDB(category);
            jsonData.project_id = effectiveStoreId;

            const jsonResult = await supabase
                .from('store_categories')
                .insert(jsonData)
                .select()
                .single();

            if (jsonResult.error) {
                console.error('Error inserting category with flat schema:', getErrorMessage(flatResult.error));
                throw jsonResult.error;
            }

            return jsonResult.data.id;
        },
        [effectiveStoreId]
    );

    const updateCategoryRow = useCallback(
        async (categoryId: string, category: CategoryWriteInput) => {
            if (schemaModeRef.current === 'json') {
                const { error } = await supabase
                    .from('store_categories')
                    .update(mapCategoryToJsonOnlyDB(category))
                    .eq('id', categoryId);

                if (error) throw error;
                return;
            }

            const flatData = mapCategoryToFlatDB(category);
            const flatResult = await supabase
                .from('store_categories')
                .update(flatData)
                .eq('id', categoryId);

            if (!flatResult.error) return;

            schemaModeRef.current = 'json';

            const jsonResult = await supabase
                .from('store_categories')
                .update(mapCategoryToJsonOnlyDB(category))
                .eq('id', categoryId);

            if (jsonResult.error) {
                console.error('Error updating category with flat schema:', getErrorMessage(flatResult.error));
                throw jsonResult.error;
            }
        },
        []
    );

    // Add category
    const addCategory = useCallback(
        async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'position'>): Promise<string> => {
            const position = categories.length;
            const slug = generateSlug(categoryData.name);

            return insertCategoryRow({
                ...categoryData,
                slug,
                position,
            });
        },
        [categories.length, insertCategoryRow]
    );

    // Update category
    const updateCategory = useCallback(
        async (categoryId: string, updates: CategoryUpdate) => {
            const existingCategory = categories.find((category) => category.id === categoryId);
            const nextCategory: CategoryWriteInput = {
                ...existingCategory,
                ...updates,
            };

            if (updates.name) {
                nextCategory.slug = generateSlug(updates.name);
            }

            await updateCategoryRow(categoryId, nextCategory);
        },
        [categories, updateCategoryRow]
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
            const previousCategories = categories;
            setCategories((current) => applyOrderedIds(current, orderedIds));

            try {
                // Because Supabase doesn't have a direct 'bulk update multiple rows with different values'
                // easily via the JS client, we can do multiple updates or use a database function.
                // Using Promise.all for updates since it's an admin op and categories count is usually small.
                const promises = orderedIds.map((id, index) => {
                    const category = categories.find((item) => item.id === id);
                    const nextCategory: CategoryWriteInput = {
                        ...category,
                        position: index,
                    };

                    return updateCategoryRow(id, nextCategory)
                        .then(() => ({ error: null }))
                        .catch((error) => ({ error }));
                });

                const results = await Promise.all(promises);
                const errors = results.filter(r => r.error);
                if (errors.length > 0) {
                    throw errors[0].error;
                }
            } catch (error) {
                setCategories(previousCategories);
                throw error;
            }
        },
        [categories, updateCategoryRow]
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
