/**
 * useEcommerceStore Hook
 * Hook para inicializar y gestionar la tienda de ecommerce en Supabase
 * En la arquitectura de Supabase, un "store" equivale a un "project".
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';

export interface EcommerceStoreData {
    id: string;
    name: string;
    createdAt: any;
    updatedAt: any;
    isActive: boolean;
    ownerId: string;
}

interface UseEcommerceStoreReturn {
    store: EcommerceStoreData | null;
    storeId: string;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    initializeStore: () => Promise<void>;
}

export const useEcommerceStore = (userId: string, storeId: string = ''): UseEcommerceStoreReturn => {
    const [store, setStore] = useState<EcommerceStoreData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';

    // Función para inicializar o cargar la tienda
    const fetchAndInitializeStore = useCallback(async () => {
        if (!userId || !effectiveStoreId) {
            setError('No user ID or store ID provided');
            setIsLoading(false);
            return;
        }

        try {
            // Un "store" está vinculado a un "project". Validamos si el proyecto existe
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('id, name, created_at, last_updated, user_id')
                .eq('id', effectiveStoreId)
                .single();

            if (projectError) {
                // If no rows, we can't do anything because a project MUST exist in Supabase
                if (projectError.code === 'PGRST116') {
                    throw new Error('Project not found. Cannot initialize store.');
                }
                throw projectError;
            }

            // Mapeamos los datos del proyecto a EcommerceStoreData
            const storeData: EcommerceStoreData = {
                id: projectData.id,
                name: projectData.name,
                createdAt: projectData.created_at,
                updatedAt: projectData.last_updated,
                isActive: true, // Asumimos que si el proyecto existe, la tienda está activa
                ownerId: projectData.user_id,
            };

            setStore(storeData);
            setIsInitialized(true);
            setError(null);
            console.log('✅ Ecommerce store loaded via Project:', effectiveStoreId);
            
            // Validamos que haya un store_settings inicializado, si no, lo inicializamos silenciosamente
            const { count, error: settingsError } = await supabase
                .from('store_settings')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', effectiveStoreId);

            if (!settingsError && count === 0) {
                await supabase
                    .from('store_settings')
                    .insert({
                        project_id: effectiveStoreId,
                        store_name: projectData.name,
                        store_email: '', // Requires manual configuration
                    });
            }

        } catch (err: any) {
            console.error('Error initializing store:', err);
            setError(err.message);
            setIsInitialized(false);
        } finally {
            setIsLoading(false);
        }
    }, [userId, effectiveStoreId]);

    // Escuchar cambios
    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        fetchAndInitializeStore();

    }, [userId, effectiveStoreId, fetchAndInitializeStore]);

    return {
        store,
        storeId: effectiveStoreId,
        isLoading,
        isInitialized,
        error,
        initializeStore: fetchAndInitializeStore,
    };
};

export default useEcommerceStore;



