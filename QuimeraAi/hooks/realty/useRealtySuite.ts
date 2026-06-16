import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import type {
    RealtyAiGeneration,
    RealtyLead,
    RealtyModuleFlags,
    RealtyProperty,
    RealtyPropertyStatus,
} from '../../types/realty';
import {
    DEFAULT_REALTY_FLAGS,
    mapPropertyLeadRow,
    mapRealtyAiGenerationRow,
    mapRealtyAiGenerationToRow,
    mapRealtyMediaToRow,
    mapRealtyPropertyRow,
    mapRealtyPropertyToRow,
    toRealtySlug,
} from '../../utils/realty';

interface UseRealtySuiteOptions {
    projectId?: string | null;
    tenantId?: string | null;
    userId?: string | null;
}

const isMissingTableError = (error: any) => error?.code === 'PGRST205' || error?.code === '42P01';

const resolveProjectFlags = (projectData: unknown): RealtyModuleFlags => {
    const data = projectData && typeof projectData === 'object' && !Array.isArray(projectData)
        ? projectData as Record<string, any>
        : {};
    const realtyModule = data.realtyModule || {};

    return {
        ...DEFAULT_REALTY_FLAGS,
        ...((realtyModule.flags as Partial<RealtyModuleFlags>) || {}),
        real_estate_enabled: realtyModule.enabled ?? realtyModule.flags?.real_estate_enabled ?? DEFAULT_REALTY_FLAGS.real_estate_enabled,
    };
};

export const useRealtySuite = ({ projectId, tenantId, userId }: UseRealtySuiteOptions) => {
    const [properties, setProperties] = useState<RealtyProperty[]>([]);
    const [leads, setLeads] = useState<RealtyLead[]>([]);
    const [aiGenerations, setAiGenerations] = useState<RealtyAiGeneration[]>([]);
    const [flags, setFlags] = useState<RealtyModuleFlags>(DEFAULT_REALTY_FLAGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeProperties = useMemo(() => properties.filter(property => property.status === 'active'), [properties]);
    const featuredProperties = useMemo(() => properties.filter(property => property.isFeatured), [properties]);
    const newLeads = useMemo(() => leads.filter(lead => lead.status === 'new'), [leads]);

    const resolveTenantId = useCallback(async () => {
        if (tenantId) return tenantId;
        if (!projectId) return null;
        const { data } = await supabase.from('projects').select('tenant_id').eq('id', projectId).maybeSingle();
        return data?.tenant_id || null;
    }, [projectId, tenantId]);

    const loadAll = useCallback(async () => {
        if (!projectId) {
            setProperties([]);
            setLeads([]);
            setAiGenerations([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [propertiesResult, leadsResult, aiResult, projectResult] = await Promise.all([
                supabase
                    .from('properties')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('updated_at', { ascending: false }),
                supabase
                    .from('property_leads')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('property_ai_generations')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabase.from('projects').select('data, tenant_id').eq('id', projectId).maybeSingle(),
            ]);

            const tableError = [propertiesResult.error, leadsResult.error, aiResult.error, projectResult.error].find(Boolean);
            if (tableError) throw tableError;

            const propertyRows = propertiesResult.data || [];
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

            setProperties(propertyRows.map((row: any) => mapRealtyPropertyRow(row, mediaByProperty.get(row.id) || [])));
            setLeads((leadsResult.data || []).map(mapPropertyLeadRow));
            setAiGenerations((aiResult.data || []).map(mapRealtyAiGenerationRow));
            setFlags(resolveProjectFlags((projectResult.data as any)?.data));
        } catch (err: any) {
            if (isMissingTableError(err)) {
                setProperties([]);
                setLeads([]);
                setAiGenerations([]);
            } else {
                console.error('[useRealtySuite] Error loading Realty Suite:', err);
                setError(err.message || 'Error loading Realty Suite');
            }
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const upsertProjectModule = useCallback(async (nextFlags: Partial<RealtyModuleFlags>, enabled?: boolean) => {
        if (!projectId) return;
        const previousFlags = flags;
        const mergedFlags = { ...flags, ...nextFlags };
        const moduleEnabled = enabled ?? mergedFlags.real_estate_enabled;
        const optimisticFlags = { ...mergedFlags, real_estate_enabled: moduleEnabled };
        setIsSaving(true);
        setError(null);
        setFlags(optimisticFlags);
        try {
            const { data: projectRow, error: fetchError } = await supabase.from('projects').select('data').eq('id', projectId).maybeSingle();
            if (fetchError) throw fetchError;
            const existingData = projectRow?.data && typeof projectRow.data === 'object' ? projectRow.data : {};
            const { error: updateError } = await supabase
                .from('projects')
                .update({
                    data: {
                        ...(existingData as Record<string, unknown>),
                        realtyModule: {
                            enabled: moduleEnabled,
                            flags: { ...mergedFlags, real_estate_enabled: moduleEnabled },
                            updatedAt: new Date().toISOString(),
                        },
                    },
                })
                .eq('id', projectId);
            if (updateError) throw updateError;
        } catch (err: any) {
            setFlags(previousFlags);
            setError(err.message || 'Error updating Realty module settings');
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [flags, projectId]);

    const replacePropertyMedia = useCallback(async (property: RealtyProperty, images: RealtyProperty['images']) => {
        if (!userId) throw new Error('User is required to save Realty property media.');
        const { error: deleteError } = await supabase
            .from('property_media')
            .delete()
            .eq('property_id', property.id);
        if (deleteError) throw deleteError;

        const rows = (images || [])
            .filter(image => image.url)
            .map((image, index) => mapRealtyMediaToRow({ ...image, position: index, isPrimary: index === 0 }, property, index, userId));

        if (rows.length === 0) return;

        const { error: insertError } = await supabase.from('property_media').insert(rows);
        if (insertError) throw insertError;
    }, [userId]);

    const saveProperty = useCallback(async (input: Partial<RealtyProperty>) => {
        if (!projectId) return;
        if (!userId) throw new Error('User is required to save Realty properties.');
        setIsSaving(true);
        setError(null);
        try {
            const resolvedTenantId = await resolveTenantId();
            const images = (input.images || []).filter(image => image.url);
            const normalized: Partial<RealtyProperty> = {
                ...input,
                tenantId: resolvedTenantId,
                projectId,
                userId,
                createdBy: userId,
                slug: input.slug || toRealtySlug(input.title || ''),
                images,
            };
            const row = mapRealtyPropertyToRow(normalized, userId, projectId, resolvedTenantId);
            let savedId = input.id || '';

            if (input.id) {
                const { error: updateError } = await supabase
                    .from('properties')
                    .update(row)
                    .eq('id', input.id);
                if (updateError) throw updateError;
            } else {
                const { data, error: insertError } = await supabase
                    .from('properties')
                    .insert({ ...row, created_at: new Date().toISOString() })
                    .select('id')
                    .single();
                if (insertError) throw insertError;
                savedId = data.id;
            }

            await replacePropertyMedia({
                ...(normalized as RealtyProperty),
                id: savedId,
                tenantId: resolvedTenantId,
                projectId,
                userId,
                createdBy: userId,
                title: normalized.title || '',
                images,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, images);
            await loadAll();
        } catch (err: any) {
            setError(err.message || 'Error saving Realty property');
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [loadAll, projectId, replacePropertyMedia, resolveTenantId, userId]);

    const updatePropertyStatus = useCallback((propertyId: string, status: RealtyPropertyStatus) => {
        const property = properties.find(item => item.id === propertyId);
        if (!property) return Promise.resolve();
        return saveProperty({
            ...property,
            status,
            publicEnabled: status === 'active',
        });
    }, [properties, saveProperty]);

    const deleteProperty = useCallback(async (propertyId: string) => {
        setIsSaving(true);
        setError(null);
        try {
            const { error: deleteError } = await supabase.from('properties').delete().eq('id', propertyId);
            if (deleteError) throw deleteError;
            await loadAll();
        } catch (err: any) {
            setError(err.message || 'Error deleting Realty property');
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [loadAll]);

    const updateLeadStatus = useCallback(async (leadId: string, status: RealtyLead['status']) => {
        const { error: updateError } = await supabase
            .from('property_leads')
            .update({ stage: status, updated_at: new Date().toISOString() })
            .eq('id', leadId);
        if (updateError) throw updateError;
        await loadAll();
    }, [loadAll]);

    const saveAiGeneration = useCallback(async (generation: Omit<RealtyAiGeneration, 'id' | 'createdAt'>) => {
        if (!generation.projectId) return;
        if (!userId) throw new Error('User is required to create Realty AI generations.');
        const resolvedTenantId = await resolveTenantId();
        const { error: insertError } = await supabase
            .from('property_ai_generations')
            .insert({
                ...mapRealtyAiGenerationToRow(generation, userId, resolvedTenantId),
                created_at: new Date().toISOString(),
            });
        if (insertError) throw insertError;
        await loadAll();
    }, [loadAll, resolveTenantId, userId]);

    return {
        properties,
        activeProperties,
        featuredProperties,
        leads,
        newLeads,
        aiGenerations,
        flags,
        isLoading,
        isSaving,
        error,
        refetch: loadAll,
        upsertProjectModule,
        saveProperty,
        updatePropertyStatus,
        deleteProperty,
        updateLeadStatus,
        saveAiGeneration,
    };
};
