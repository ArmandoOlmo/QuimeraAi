import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { RealtyModuleFlags, RealtyProperty, RealtyPropertyType, TransactionType } from '../types/realty';
import { DEFAULT_REALTY_FLAGS, mapRealtyPropertyRow } from '../utils/realty';

export type PublicRealtySort = 'newest' | 'price_asc' | 'price_desc' | 'featured' | 'beds_desc' | 'area_desc';

export interface UsePublicRealtyListingsOptions {
    search?: string;
    city?: string;
    propertyType?: RealtyPropertyType | 'all' | '';
    transactionType?: TransactionType | 'all' | '';
    minPrice?: number | string | null;
    maxPrice?: number | string | null;
    bedrooms?: number | string | null;
    bathrooms?: number | string | null;
    limitCount?: number;
    offset?: number;
    page?: number;
    featuredOnly?: boolean;
    sort?: PublicRealtySort;
    realtime?: boolean;
}

export interface UsePublicRealtyListingsReturn {
    properties: RealtyProperty[];
    flags: RealtyModuleFlags;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    totalCount: number;
    filtersApplied: boolean;
}

const toFiniteNumber = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value: string | null | undefined) => (value || '').trim().toLowerCase();

const isAll = (value: string | null | undefined) => !value || value === 'all';

const sortListings = (properties: RealtyProperty[], sort: PublicRealtySort) =>
    [...properties].sort((a, b) => {
        if (sort === 'price_asc') return (a.price || 0) - (b.price || 0);
        if (sort === 'price_desc') return (b.price || 0) - (a.price || 0);
        if (sort === 'beds_desc') return (b.bedrooms || 0) - (a.bedrooms || 0);
        if (sort === 'area_desc') return (b.area || 0) - (a.area || 0);

        const aDate = new Date(String(a.publishedAt || a.updatedAt || a.createdAt || 0)).getTime();
        const bDate = new Date(String(b.publishedAt || b.updatedAt || b.createdAt || 0)).getTime();

        if (sort === 'featured' && a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return bDate - aDate;
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
    const [totalCount, setTotalCount] = useState(0);
    const {
        search = '',
        city = '',
        propertyType = 'all',
        transactionType = 'all',
        minPrice,
        maxPrice,
        bedrooms,
        bathrooms,
        limitCount = 6,
        offset = 0,
        page,
        featuredOnly = false,
        sort = 'featured',
        realtime = false,
    } = options;

    const normalizedSearch = normalizeText(search);
    const normalizedCity = normalizeText(city);
    const normalizedMinPrice = toFiniteNumber(minPrice);
    const normalizedMaxPrice = toFiniteNumber(maxPrice);
    const normalizedBedrooms = toFiniteNumber(bedrooms);
    const normalizedBathrooms = toFiniteNumber(bathrooms);
    const resolvedOffset = Math.max(0, page && page > 0 ? (page - 1) * limitCount : offset || 0);
    const filtersApplied = Boolean(
        normalizedSearch ||
        normalizedCity ||
        !isAll(propertyType) ||
        !isAll(transactionType) ||
        normalizedMinPrice !== null ||
        normalizedMaxPrice !== null ||
        normalizedBedrooms !== null ||
        normalizedBathrooms !== null ||
        featuredOnly
    );

    const applyFilters = useCallback((items: RealtyProperty[]) => {
        let filtered = items.filter(property => property.status === 'active' && property.publicEnabled !== false);

        if (normalizedSearch) {
            filtered = filtered.filter(property => {
                const searchable = [
                    property.title,
                    property.slug,
                    property.description,
                    property.descriptionShort,
                    property.address,
                    property.addressLine1,
                    property.addressLine2,
                    property.city,
                    property.state,
                    property.country,
                    property.propertyType,
                    property.transactionType,
                ].filter(Boolean).join(' ').toLowerCase();
                return searchable.includes(normalizedSearch);
            });
        }

        if (normalizedCity) filtered = filtered.filter(property => normalizeText(property.city).includes(normalizedCity));
        if (!isAll(propertyType)) filtered = filtered.filter(property => property.propertyType === propertyType);
        if (!isAll(transactionType)) filtered = filtered.filter(property => property.transactionType === transactionType);
        if (normalizedMinPrice !== null) filtered = filtered.filter(property => (property.price || 0) >= normalizedMinPrice);
        if (normalizedMaxPrice !== null) filtered = filtered.filter(property => (property.price || 0) <= normalizedMaxPrice);
        if (normalizedBedrooms !== null) filtered = filtered.filter(property => (property.bedrooms || 0) >= normalizedBedrooms);
        if (normalizedBathrooms !== null) filtered = filtered.filter(property => (property.bathrooms || 0) >= normalizedBathrooms);
        if (featuredOnly) filtered = filtered.filter(property => property.isFeatured);

        return sortListings(filtered, sort);
    }, [
        featuredOnly,
        normalizedBathrooms,
        normalizedBedrooms,
        normalizedCity,
        normalizedMaxPrice,
        normalizedMinPrice,
        normalizedSearch,
        propertyType,
        sort,
        transactionType,
    ]);

    const refetch = useCallback(async () => {
        if (!projectId) {
            setProperties([]);
            setTotalCount(0);
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
                setTotalCount(0);
                return;
            }

            let query = supabase
                .from('properties')
                .select('*', { count: 'exact' })
                .eq('project_id', projectId)
                .eq('status', 'active')
                .eq('public_enabled', true);

            if (normalizedCity) query = query.ilike('city', `%${normalizedCity}%`);
            if (!isAll(propertyType)) query = query.eq('property_type', propertyType);
            if (!isAll(transactionType)) query = query.eq('transaction_type', transactionType);
            if (normalizedMinPrice !== null) query = query.gte('price', normalizedMinPrice);
            if (normalizedMaxPrice !== null) query = query.lte('price', normalizedMaxPrice);
            if (normalizedBedrooms !== null) query = query.gte('bedrooms', normalizedBedrooms);
            if (normalizedBathrooms !== null) query = query.gte('bathrooms', normalizedBathrooms);
            if (featuredOnly) query = query.eq('is_featured', true);

            if (sort === 'price_asc') query = query.order('price', { ascending: true, nullsFirst: false });
            else if (sort === 'price_desc') query = query.order('price', { ascending: false, nullsFirst: false });
            else if (sort === 'beds_desc') query = query.order('bedrooms', { ascending: false, nullsFirst: false });
            else if (sort === 'area_desc') query = query.order('area_sqft', { ascending: false, nullsFirst: false });
            else if (sort === 'newest') query = query.order('published_at', { ascending: false, nullsFirst: false }).order('updated_at', { ascending: false });
            else query = query.order('is_featured', { ascending: false }).order('updated_at', { ascending: false });

            const fetchFromStart = normalizedSearch.length > 0;
            const fetchOffset = fetchFromStart ? 0 : resolvedOffset;
            const fetchLimit = fetchFromStart
                ? Math.max(limitCount + resolvedOffset, 240)
                : limitCount;
            const { data, error: fetchError, count } = await query.range(fetchOffset, fetchOffset + fetchLimit - 1);

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

            const filtered = applyFilters(propertyRows.map((row: any) => mapRealtyPropertyRow(row, mediaByProperty.get(row.id) || [])));
            const paged = fetchFromStart ? filtered.slice(resolvedOffset, resolvedOffset + limitCount) : filtered;
            setTotalCount(fetchFromStart ? filtered.length : count ?? filtered.length);
            setProperties(paged);
        } catch (err: any) {
            if (isMissingTableError(err)) {
                setProperties([]);
                setTotalCount(0);
            } else {
                console.error('[usePublicRealtyListings] Error loading listings:', err);
                setError(err.message || 'Error loading realty listings');
                setProperties([]);
                setTotalCount(0);
            }
        } finally {
            setIsLoading(false);
        }
    }, [
        applyFilters,
        featuredOnly,
        limitCount,
        normalizedBathrooms,
        normalizedBedrooms,
        normalizedCity,
        normalizedMaxPrice,
        normalizedMinPrice,
        normalizedSearch.length,
        projectId,
        propertyType,
        resolvedOffset,
        sort,
        transactionType,
    ]);

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

    return { properties, flags, isLoading, error, refetch, totalCount, filtersApplied };
};
