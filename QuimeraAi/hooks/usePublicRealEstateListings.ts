import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Property } from '../types/realEstate';

export interface UsePublicRealEstateListingsOptions {
    limitCount?: number;
    featuredOnly?: boolean;
    realtime?: boolean;
}

export interface UsePublicRealEstateListingsReturn {
    properties: Property[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const sortListings = (properties: Property[]) => {
    return [...properties].sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
        const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
};

const mapPropertyDoc = (data: any): Property => {
    return {
        id: data.id,
        ...data,
        projectId: data.project_id || data.projectId || '',
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        images: Array.isArray(data.images) ? data.images : [],
        status: data.status || 'active',
        isFeatured: Boolean(data.is_featured || data.isFeatured),
        updatedAt: data.updated_at || data.updatedAt,
    } as Property;
};

export const usePublicRealEstateListings = (
    projectId: string | null,
    options: UsePublicRealEstateListingsOptions = {}
): UsePublicRealEstateListingsReturn => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { limitCount = 6, featuredOnly = false, realtime = false } = options;

    const applyFilters = useCallback((items: Property[]) => {
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
            const { data, error: fetchError } = await supabase
                .from('properties')
                .select('*')
                .eq('project_id', projectId)
                .limit(limitCount * 2);

            if (fetchError) throw fetchError;

            if (data) {
                setProperties(applyFilters(data.map(mapPropertyDoc)));
            }
        } catch (err: any) {
            // PGRST205 = table not found — silently ignore, this project doesn't use real estate
            if (err?.code === 'PGRST205') {
                setProperties([]);
            } else {
                console.error('Error fetching real estate listings:', err);
                setError(err.message || 'Error loading real estate listings');
                setProperties([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [applyFilters, limitCount, projectId]);

    useEffect(() => {
        let isMounted = true;
        if (isMounted) {
            refetch();
        }
        return () => { isMounted = false; };
    }, [refetch]);

    useEffect(() => {
        if (!projectId || !realtime) return;

        let isMounted = true;

        const channelId = `public_properties_${projectId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'properties', filter: `project_id=eq.${projectId}` },
                () => {
                    if (isMounted) refetch();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [projectId, realtime, refetch]);

    return { properties, isLoading, error, refetch };
};
