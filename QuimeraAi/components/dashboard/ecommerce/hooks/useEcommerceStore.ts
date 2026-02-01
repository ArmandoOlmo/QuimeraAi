/**
 * useEcommerceStore Hook
 * Hook para inicializar y gestionar la tienda de ecommerce
 * Crea automáticamente el store 'default' si no existe
 */

import { useState, useEffect, useCallback } from 'react';
import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebase';

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
    const storePath = `users/${userId}/stores/${effectiveStoreId}`;

    // Función para inicializar la tienda
    const initializeStore = useCallback(async () => {
        if (!userId || !effectiveStoreId) {
            setError('No user ID or store ID provided');
            return;
        }

        try {
            const storeRef = doc(db, storePath);
            const storeDoc = await getDoc(storeRef);

            if (!storeDoc.exists()) {
                // Crear la tienda si no existe
                const newStore: Omit<EcommerceStoreData, 'id'> = {
                    name: 'Mi Tienda',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    isActive: true,
                    ownerId: userId,
                };

                await setDoc(storeRef, newStore);
                console.log('✅ Ecommerce store initialized:', storeId);
            }

            setIsInitialized(true);
            setError(null);
        } catch (err: any) {
            console.error('Error initializing store:', err);
            setError(err.message);
            setIsInitialized(false);
        }
    }, [userId, storePath, effectiveStoreId]);

    // Escuchar cambios en la tienda y auto-inicializar si no existe
    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        const storeRef = doc(db, storePath);

        const checkAndInitialize = async () => {
            try {
                const storeDoc = await getDoc(storeRef);
                
                if (!storeDoc.exists() && isMounted) {
                    // Auto-inicializar la tienda
                    await initializeStore();
                }
            } catch (err: any) {
                console.error('Error checking store:', err);
                if (isMounted) {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        };

        // Verificar e inicializar primero
        checkAndInitialize();

        // Luego suscribirse a cambios
        const unsubscribe = onSnapshot(
            storeRef,
            (snapshot) => {
                if (isMounted) {
                    if (snapshot.exists()) {
                        setStore({
                            id: snapshot.id,
                            ...snapshot.data(),
                        } as EcommerceStoreData);
                        setIsInitialized(true);
                    } else {
                        setStore(null);
                    }
                    setIsLoading(false);
                    setError(null);
                }
            },
            (err) => {
                console.error('Error listening to store:', err);
                if (isMounted) {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [userId, storePath, initializeStore]);

    return {
        store,
        storeId: effectiveStoreId,
        isLoading,
        isInitialized,
        error,
        initializeStore,
    };
};

export default useEcommerceStore;



