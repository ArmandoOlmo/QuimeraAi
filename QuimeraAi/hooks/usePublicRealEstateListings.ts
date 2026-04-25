import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
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
        const dateA = (a.updatedAt as any)?.toDate?.() || new Date(0);
        const dateB = (b.updatedAt as any)?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
};

const mapPropertyDoc = (doc: any): Property => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        projectId: data.projectId || '',
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        images: Array.isArray(data.images) ? data.images : [],
        status: data.status || 'active',
        isFeatured: Boolean(data.isFeatured),
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
            const listingsRef = collection(db, 'publicPropertyListings', projectId, 'properties');
            const snapshot = await getDocs(query(listingsRef, limit(limitCount * 2)));
            setProperties(applyFilters(snapshot.docs.map(mapPropertyDoc)));
        } catch (err: any) {
            console.error('Error fetching real estate listings:', err);
            setError(err.message || 'Error loading real estate listings');
            setProperties([]);
        } finally {
            setIsLoading(false);
        }
    }, [applyFilters, limitCount, projectId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    useEffect(() => {
        if (!projectId || !realtime) return;

        const listingsRef = collection(db, 'publicPropertyListings', projectId, 'properties');
        const unsubscribe = onSnapshot(
            query(listingsRef, limit(limitCount * 2)),
            snapshot => {
                setProperties(applyFilters(snapshot.docs.map(mapPropertyDoc)));
                setIsLoading(false);
                setError(null);
            },
            err => {
                console.error('Error in real estate listings subscription:', err);
                setError(err.message || 'Error loading real estate listings');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [applyFilters, limitCount, projectId, realtime]);

    return { properties, isLoading, error, refetch };
};
