import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { RealtyModuleFlags, RealtyProperty } from '../types/realty';
import { DEFAULT_REALTY_FLAGS, mapRealtyPropertyRow } from '../utils/realty';

export interface UsePublicRealtyListingsOptions {
    limitCount?: number;
    featuredOnly?: boolean;
    realtime?: boolean;
}

export interface UsePublicRealtyListingsReturn {
    properties: RealtyProperty[];
    flags: RealtyModuleFlags;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const sortListings = (properties: RealtyProperty[]) =>
    [...properties].sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return new Date(String(b.updatedAt || 0)).getTime() - new Date(String(a.updatedAt || 0)).getTime();
    });

const isMissingTableError = (error: any) => error?.code === 'PGRST205' || error?.code === '42P01';

export const usePublicRealtyListings = (
    projectId: string | null,
    options: UsePublicRealtyListingsOptions = {}
): UsePublicRealtyListingsReturn => {
    const [properties, setProperties] = useState<RealtyProperty[]>([]);
    const [flags, setFlags] = useState<RealtyModuleFlags>(DEFAULT_REALTY_FLAGS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { limitCount = 6, featuredOnly = false, realtime = false } = options;

    const applyFilters = useCallback((items: RealtyProperty[]) => {
        let filtered = items.filter(property => property.status === 'active');
        if (featuredOnly) filtered = filtered.filter(property => property.isFeatured);
        return sortListings(filtered).slice(0, limitCount);
    }, [featuredOnly, limitCount]);

    const refetch = useCallback(async () => {
        if (!projectId) {
            setProperties([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data: projectRow, error: moduleError } = await supabase
                .from('projects')
                .select('data')
                .eq('id', projectId)
                .maybeSingle();

            if (moduleError && moduleError.code !== 'PGRST205' && moduleError.code !== '42P01') {
                throw moduleError;
            }

            const realtyModule = (projectRow?.data as any)?.realtyModule || {};
            const resolvedFlags = {
                ...DEFAULT_REALTY_FLAGS,
                ...((realtyModule.flags as Partial<RealtyModuleFlags>) || {}),
                real_estate_enabled: realtyModule.enabled ?? realtyModule.flags?.real_estate_enabled ?? DEFAULT_REALTY_FLAGS.real_estate_enabled,
            };
            setFlags(resolvedFlags);

            if (!resolvedFlags.real_estate_enabled || !resolvedFlags.real_estate_public_directory_enabled) {
                setProperties([]);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('properties')
                .select('*')
                .eq('project_id', projectId)
                .eq('status', 'active')
                .eq('public_enabled', true)
                .order('is_featured', { ascending: false })
                .order('updated_at', { ascending: false })
                .limit(limitCount * 2);

            if (fetchError) throw fetchError;
            const propertyRows = data || [];
            const propertyIds = propertyRows.map((property: any) => property.id).filter(Boolean);
            let mediaRows: any[] = [];

            if (propertyIds.length > 0) {
                const mediaResult = await supabase
                    .from('property_media')
                    .select('*')
                    .in('property_id', propertyIds)
                    .order('position', { ascending: true });
                if (mediaResult.error) throw mediaResult.error;
                mediaRows = mediaResult.data || [];
            }

            const mediaByProperty = new Map<string, any[]>();
            mediaRows.forEach(row => {
                const current = mediaByProperty.get(row.property_id) || [];
                current.push(row);
                mediaByProperty.set(row.property_id, current);
            });

            setProperties(applyFilters(propertyRows.map((row: any) => mapRealtyPropertyRow(row, mediaByProperty.get(row.id) || []))));
        } catch (err: any) {
            if (isMissingTableError(err)) {
                setProperties([]);
            } else {
                console.error('[usePublicRealtyListings] Error loading listings:', err);
                setError(err.message || 'Error loading realty listings');
                setProperties([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [applyFilters, limitCount, projectId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    useEffect(() => {
        if (!projectId || !realtime) return;

        const channel = supabase
            .channel(`public_realty_listings_${projectId}_${Math.random().toString(36).slice(2)}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'properties', filter: `project_id=eq.${projectId}` },
                () => { refetch(); }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'property_media' },
                () => { refetch(); }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId, realtime, refetch]);

    return { properties, flags, isLoading, error, refetch };
};
