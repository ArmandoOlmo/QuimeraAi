/**
 * useProjectEcommerce Hook
 * Hook para vincular proyectos con tiendas de ecommerce en Supabase
 * Cada proyecto tiene su propia tienda usando projectId como storeId
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { createRealtimeChannelName } from './realtimeChannel';

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
    enableEcommerce: () => Promise<boolean>;
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

    const fetchConfig = useCallback(async () => {
        if (!userId || !projectId) {
            setIsLoading(false);
            setConfig(null);
            setIsInitialized(false);
            return;
        }

        try {
            setIsLoading(true);
            // Check project details first
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('name')
                .eq('id', projectId)
                .single();

            if (projectError) {
                if (projectError.code !== 'PGRST116') {
                    throw projectError;
                }
            }

            // In Supabase, ecommerce enabled is determined by store_settings existence and is_active flag
            const { data: settings, error: settingsError } = await supabase
                .from('store_settings')
                .select('store_name, created_at, updated_at, is_active')
                .eq('project_id', projectId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (settingsError && settingsError.code !== 'PGRST116') {
                throw settingsError;
            }

            if (settings) {
                setConfig({
                    projectId,
                    projectName: project?.name || projectName || 'Mi Proyecto',
                    ecommerceEnabled: settings.is_active ?? true,
                    storeId: projectId,
                    storeName: settings.store_name,
                    createdAt: settings.created_at,
                    updatedAt: settings.updated_at,
                });
                setIsInitialized(true);
            } else {
                setConfig(null);
                setIsInitialized(false);
            }
            setError(null);
        } catch (err: any) {
            console.error('Error fetching project ecommerce config:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, projectName]);

    // Escuchar cambios en la configuración (store_settings changes)
    useEffect(() => {
        if (!userId || !projectId) {
            setIsLoading(false);
            setConfig(null);
            setIsInitialized(false);
            return;
        }

        const loadingTimeout = window.setTimeout(() => {
            setIsLoading((current) => {
                if (current) {
                    setError('La inicialización de ecommerce tardó demasiado. Intenta recargar o cambiar de proyecto.');
                }
                return false;
            });
        }, 12000);

        void fetchConfig().finally(() => window.clearTimeout(loadingTimeout));

        const channel = supabase.channel(createRealtimeChannelName('project_ecommerce_changes', projectId))
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_settings',
                    filter: `project_id=eq.${projectId}`
                },
                () => {
                    fetchConfig();
                }
            )
            .subscribe();

        return () => {
            window.clearTimeout(loadingTimeout);
            supabase.removeChannel(channel);
        };
    }, [userId, projectId, fetchConfig]);

    // Habilitar ecommerce para el proyecto
    const enableEcommerce = useCallback(async () => {
        if (!userId || !projectId) {
            setError('No user ID or project ID provided');
            return false;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Fetch current settings to see if they exist
            const { data: existing, error: existingError } = await supabase
                .from('store_settings')
                .select('store_name')
                .eq('project_id', projectId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingError && existingError.code !== 'PGRST116') throw existingError;

            let finalProjectName = projectName;
            if (!finalProjectName) {
                const { data: pData, error: projectError } = await supabase
                    .from('projects')
                    .select('name')
                    .eq('id', projectId)
                    .single();

                if (projectError) throw projectError;
                finalProjectName = pData?.name || 'Mi Proyecto';
            }

            const storeName = existing?.store_name || `Tienda - ${finalProjectName}`;
            const activePayload = {
                store_name: storeName,
                is_active: true,
            };
            let savedSettings: any;

            if (existing) {
                // If exists, just set active
                const { data: updatedSettings, error: updateError } = await supabase
                    .from('store_settings')
                    .update(activePayload)
                    .eq('project_id', projectId)
                    .select('store_name, created_at, updated_at, is_active');

                if (updateError) throw updateError;
                const updatedRow = Array.isArray(updatedSettings) ? updatedSettings[0] : null;
                if (!updatedRow) {
                    throw new Error('No se pudo activar ecommerce para este proyecto. Verifica permisos de proyecto o RLS.');
                }

                savedSettings = updatedRow;
            } else {
                const { data: insertedSettings, error: insertError } = await supabase
                    .from('store_settings')
                    .insert({
                        project_id: projectId,
                        ...activePayload,
                        store_email: '', // Requires configuration later
                    })
                    .select('store_name, created_at, updated_at, is_active')
                    .single();

                if (insertError) throw insertError;
                savedSettings = insertedSettings;
            }

            console.log('✅ Ecommerce enabled for project:', projectId);
            setConfig({
                projectId,
                projectName: finalProjectName || 'Mi Proyecto',
                ecommerceEnabled: savedSettings.is_active ?? true,
                storeId: projectId,
                storeName: savedSettings.store_name || storeName,
                createdAt: savedSettings.created_at,
                updatedAt: savedSettings.updated_at,
            });
            setIsInitialized(true);
            setError(null);
            
            // Re-fetch to update state immediately
            await fetchConfig();
            return true;
        } catch (err: any) {
            console.error('Error enabling ecommerce:', err);
            setError(err.message);
            setIsInitialized(false);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, projectName, fetchConfig]);

    // Deshabilitar ecommerce para el proyecto
    const disableEcommerce = useCallback(async () => {
        if (!userId || !projectId) {
            setError('No user ID or project ID provided');
            return;
        }

        try {
            setIsLoading(true);

            // Solo marcamos como deshabilitado (is_active = false), no eliminamos datos
            const { error } = await supabase
                .from('store_settings')
                .update({ is_active: false })
                .eq('project_id', projectId);

            if (error) throw error;

            setError(null);
            // Re-fetch to update state immediately
            await fetchConfig();
        } catch (err: any) {
            console.error('Error disabling ecommerce:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, fetchConfig]);

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
                // In Supabase, we can fetch all projects for user and then their store_settings
                // But it's easier to fetch from store_settings and join with projects
                
                const { data, error } = await supabase
                    .from('store_settings')
                    .select('store_name, created_at, updated_at, is_active, project_id, projects!inner(name, user_id)')
                    .eq('projects.user_id', userId)
                    .eq('is_active', true);

                if (error) throw error;

                const projectsWithEcommerce: ProjectEcommerceConfig[] = data.map((row: any) => ({
                    projectId: row.project_id,
                    projectName: row.projects.name,
                    ecommerceEnabled: row.is_active,
                    storeId: row.project_id,
                    storeName: row.store_name,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));

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






