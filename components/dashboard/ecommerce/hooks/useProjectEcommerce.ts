/**
 * useProjectEcommerce Hook
 * Hook para vincular proyectos con tiendas de ecommerce
 * Cada proyecto tiene su propia tienda usando projectId como storeId
 */

import { useState, useEffect, useCallback } from 'react';
import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { db } from '../../../../firebase';

export interface ProjectEcommerceConfig {
    projectId: string;
    projectName: string;
    ecommerceEnabled: boolean;
    storeId: string; // Será igual a projectId
    storeName: string;
    createdAt: any;
    updatedAt: any;
}

interface UseProjectEcommerceReturn {
    config: ProjectEcommerceConfig | null;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    enableEcommerce: () => Promise<void>;
    disableEcommerce: () => Promise<void>;
    getStoreId: () => string;
}

/**
 * Hook para gestionar la configuración de ecommerce de un proyecto
 * @param userId - ID del usuario
 * @param projectId - ID del proyecto
 * @param projectName - Nombre del proyecto (opcional, para inicialización)
 */
export const useProjectEcommerce = (
    userId: string,
    projectId: string | null,
    projectName?: string
): UseProjectEcommerceReturn => {
    const [config, setConfig] = useState<ProjectEcommerceConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // El storeId será el projectId - relación 1:1
    const getStoreId = useCallback(() => {
        return projectId || 'default';
    }, [projectId]);

    // Path de la configuración de ecommerce del proyecto
    const getConfigPath = useCallback(() => {
        if (!userId || !projectId) return null;
        return `users/${userId}/projects/${projectId}/ecommerce/config`;
    }, [userId, projectId]);

    // Path del store (usando projectId como storeId)
    const getStorePath = useCallback(() => {
        if (!userId || !projectId) return null;
        return `users/${userId}/stores/${projectId}`;
    }, [userId, projectId]);

    // Escuchar cambios en la configuración
    useEffect(() => {
        if (!userId || !projectId) {
            setIsLoading(false);
            setConfig(null);
            return;
        }

        const configPath = getConfigPath();
        if (!configPath) {
            setIsLoading(false);
            return;
        }

        const configRef = doc(db, configPath);

        const unsubscribe = onSnapshot(
            configRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setConfig(snapshot.data() as ProjectEcommerceConfig);
                    setIsInitialized(true);
                } else {
                    setConfig(null);
                    setIsInitialized(false);
                }
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching project ecommerce config:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, projectId, getConfigPath]);

    // Habilitar ecommerce para el proyecto
    const enableEcommerce = useCallback(async () => {
        if (!userId || !projectId) {
            setError('No user ID or project ID provided');
            return;
        }

        try {
            setIsLoading(true);

            const configPath = getConfigPath();
            const storePath = getStorePath();

            if (!configPath || !storePath) {
                throw new Error('Invalid paths');
            }

            // 1. Crear la configuración de ecommerce del proyecto
            const ecommerceConfig: Omit<ProjectEcommerceConfig, 'createdAt' | 'updatedAt'> & { createdAt: any; updatedAt: any } = {
                projectId,
                projectName: projectName || 'Mi Proyecto',
                ecommerceEnabled: true,
                storeId: projectId, // storeId = projectId
                storeName: projectName ? `Tienda - ${projectName}` : 'Mi Tienda',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, configPath), ecommerceConfig);

            // 2. Crear el store asociado (si no existe)
            const storeRef = doc(db, storePath);
            const storeDoc = await getDoc(storeRef);

            if (!storeDoc.exists()) {
                await setDoc(storeRef, {
                    name: projectName ? `Tienda - ${projectName}` : 'Mi Tienda',
                    projectId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    isActive: true,
                    ownerId: userId,
                });
                console.log('✅ Ecommerce store created for project:', projectId);
            }

            setIsInitialized(true);
            setError(null);
        } catch (err: any) {
            console.error('Error enabling ecommerce:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, projectName, getConfigPath, getStorePath]);

    // Deshabilitar ecommerce para el proyecto
    const disableEcommerce = useCallback(async () => {
        if (!userId || !projectId) {
            setError('No user ID or project ID provided');
            return;
        }

        try {
            setIsLoading(true);

            const configPath = getConfigPath();
            if (!configPath) {
                throw new Error('Invalid config path');
            }

            // Solo marcamos como deshabilitado, no eliminamos datos
            await setDoc(
                doc(db, configPath),
                {
                    ecommerceEnabled: false,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            setError(null);
        } catch (err: any) {
            console.error('Error disabling ecommerce:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, getConfigPath]);

    return {
        config,
        isLoading,
        isInitialized,
        error,
        enableEcommerce,
        disableEcommerce,
        getStoreId,
    };
};

/**
 * Hook para obtener todos los proyectos con ecommerce habilitado
 */
export const useProjectsWithEcommerce = (userId: string) => {
    const [projects, setProjects] = useState<ProjectEcommerceConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        const fetchProjects = async () => {
            try {
                // Obtener todos los proyectos del usuario
                const projectsRef = collection(db, `users/${userId}/projects`);
                const projectsSnapshot = await getDocs(projectsRef);

                const projectsWithEcommerce: ProjectEcommerceConfig[] = [];

                // Para cada proyecto, verificar si tiene ecommerce habilitado
                for (const projectDoc of projectsSnapshot.docs) {
                    const configRef = doc(db, `users/${userId}/projects/${projectDoc.id}/ecommerce/config`);
                    const configDoc = await getDoc(configRef);

                    if (configDoc.exists()) {
                        const configData = configDoc.data() as ProjectEcommerceConfig;
                        if (configData.ecommerceEnabled) {
                            projectsWithEcommerce.push({
                                ...configData,
                                projectId: projectDoc.id,
                                projectName: projectDoc.data().name || configData.projectName,
                            });
                        }
                    }
                }

                setProjects(projectsWithEcommerce);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching projects with ecommerce:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, [userId]);

    return {
        projects,
        isLoading,
        error,
    };
};

export default useProjectEcommerce;











