/**
 * useEcommerceStore Hook
 * Hook para inicializar y gestionar la tienda de ecommerce en Supabase
 * En Ecommerce Engine draft, la tienda canónica está respaldada por project_id.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { resolveProjectBackedStoreIdentity } from '../../../../utils/ecommerce/storeIdentity';

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

    const effectiveStoreId = resolveProjectBackedStoreIdentity({ projectId: storeId }).engineStoreId || '';

    // Función para inicializar o cargar la tienda
    const fetchAndInitializeStore = useCallback(async () => {
        if (!userId || !effectiveStoreId) {
            setError('No user ID or store ID provided');
            setIsLoading(false);
            setIsInitialized(false);
            return;
        }

        try {
            setIsLoading(true);
            // Ecommerce Engine draft store identity resolves to a project row.
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
                updatedAt: projectData.last_updated ?? projectData.created_at,
                isActive: true, // Asumimos que si el proyecto existe, la tienda está activa
                ownerId: projectData.user_id,
            };

            setStore(storeData);
            setIsInitialized(true);
            setError(null);
            console.log('✅ Ecommerce store loaded via Project:', effectiveStoreId);

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
            setIsInitialized(false);
            return;
        }

        const loadingTimeout = window.setTimeout(() => {
            setIsLoading((current) => {
                if (current) {
                    setError('La tienda tardó demasiado en responder. Intenta recargar o cambiar de proyecto.');
                    setIsInitialized(false);
                }
                return false;
            });
        }, 12000);

        void fetchAndInitializeStore().finally(() => window.clearTimeout(loadingTimeout));

        return () => window.clearTimeout(loadingTimeout);
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
