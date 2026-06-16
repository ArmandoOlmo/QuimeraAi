import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import type {
    PropertyCampaign,
    PropertyOpenHouse,
    RealtyAiGeneration,
    RealtyCampaignStatus,
    RealtyLead,
    RealtyMediaUploadResult,
    RealtyModuleFlags,
    RealtyOpenHouseStatus,
    RealtyProperty,
    RealtyPropertyStatus,
} from '../../types/realty';
import {
    DEFAULT_REALTY_FLAGS,
    mapPropertyCampaignRow,
    mapPropertyCampaignToRow,
    mapPropertyOpenHouseRow,
    mapPropertyOpenHouseToRow,
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
const PROPERTY_MEDIA_BUCKET = 'property-media';

const isPermissionError = (error: any) => {
    const message = String(error?.message || '');
    return error?.code === '42501'
        || error?.statusCode === '403'
        || /row-level security|permission denied|not authorized|unauthorized/i.test(message);
};

const formatRealtySupabaseError = (error: any, fallback: string) => {
    if (isPermissionError(error)) {
        return 'No tienes permisos para esta accion de Realty. Verifica que el modulo este activo y que las policies RLS/storage esten aplicadas.';
    }
    return error?.message || fallback;
};

const sanitizeStorageFileName = (fileName: string) => {
    const safeName = fileName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);
    return safeName || 'property-media';
};

const createPropertyMediaStoragePath = (userId: string, propertyId: string, file: File) => {
    const timestamp = Date.now();
    const safeName = sanitizeStorageFileName(file.name);
    return `${userId}/${propertyId}/${timestamp}-${safeName}`;
};

const isManagedPropertyMediaPath = (path: string, ownerId: string, propertyId: string) =>
    path.startsWith(`${ownerId}/${propertyId}/`);

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
    const [campaigns, setCampaigns] = useState<PropertyCampaign[]>([]);
    const [openHouses, setOpenHouses] = useState<PropertyOpenHouse[]>([]);
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
            setCampaigns([]);
            setOpenHouses([]);
            setAiGenerations([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [propertiesResult, leadsResult, campaignsResult, openHousesResult, aiResult, projectResult] = await Promise.all([
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
                    .from('property_campaigns')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('updated_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('property_open_houses')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('starts_at', { ascending: false })
                    .limit(200),
                supabase
                    .from('property_ai_generations')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabase.from('projects').select('data, tenant_id').eq('id', projectId).maybeSingle(),
            ]);

            const tableError = [propertiesResult.error, leadsResult.error, campaignsResult.error, openHousesResult.error, aiResult.error, projectResult.error].find(Boolean);
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
            setCampaigns((campaignsResult.data || []).map(mapPropertyCampaignRow));
            setOpenHouses((openHousesResult.data || []).map(mapPropertyOpenHouseRow));
            setAiGenerations((aiResult.data || []).map(mapRealtyAiGenerationRow));
            setFlags(resolveProjectFlags((projectResult.data as any)?.data));
        } catch (err: any) {
            if (isMissingTableError(err)) {
                setProperties([]);
                setLeads([]);
                setCampaigns([]);
                setOpenHouses([]);
                setAiGenerations([]);
            } else {
                console.error('[useRealtySuite] Error loading Realty Suite:', err);
                setError(formatRealtySupabaseError(err, 'Error loading Realty Suite'));
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
            setError(formatRealtySupabaseError(err, 'Error updating Realty module settings'));
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [flags, projectId]);

    const removePropertyMediaStorage = useCallback(async (paths: string[]) => {
        const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
        if (uniquePaths.length === 0) return;

        const { error: removeError } = await supabase.storage
            .from(PROPERTY_MEDIA_BUCKET)
            .remove(uniquePaths);

        if (removeError) {
            console.warn('[useRealtySuite] Could not remove Realty media storage objects:', removeError);
        }
    }, []);

    const uploadPropertyMedia = useCallback(async (file: File, propertyId: string): Promise<RealtyMediaUploadResult> => {
        if (!userId) throw new Error('User is required to upload Realty property media.');
        if (!propertyId) throw new Error('Property is required to upload Realty property media.');

        const storagePath = createPropertyMediaStoragePath(userId, propertyId, file);
        const { error: uploadError } = await supabase.storage
            .from(PROPERTY_MEDIA_BUCKET)
            .upload(storagePath, file, {
                contentType: file.type || undefined,
                upsert: false,
            });

        if (uploadError) {
            throw new Error(formatRealtySupabaseError(uploadError, 'Error uploading Realty property media'));
        }

        const { data } = supabase.storage.from(PROPERTY_MEDIA_BUCKET).getPublicUrl(storagePath);

        return {
            id: `property-media-${Date.now()}`,
            url: data.publicUrl,
            bucket: PROPERTY_MEDIA_BUCKET,
            storagePath,
            mediaType: file.type?.startsWith('video/') ? 'video' : 'image',
            altText: file.name,
            position: 0,
            isPrimary: false,
            metadata: {
                fileName: file.name,
                size: file.size,
                type: file.type,
            },
        };
    }, [userId]);

    const replacePropertyMedia = useCallback(async (property: RealtyProperty, images: RealtyProperty['images']) => {
        if (!userId) throw new Error('User is required to save Realty property media.');
        const existingResult = await supabase
            .from('property_media')
            .select('storage_path')
            .eq('property_id', property.id);
        if (existingResult.error) throw existingResult.error;

        const nextStoragePaths = new Set((images || []).map(image => image.storagePath).filter(Boolean) as string[]);
        const obsoleteStoragePaths = (existingResult.data || [])
            .map((row: any) => row.storage_path)
            .filter((path: string | null): path is string =>
                Boolean(path)
                && !nextStoragePaths.has(path)
                && isManagedPropertyMediaPath(path, userId, property.id)
            );

        const { error: deleteError } = await supabase
            .from('property_media')
            .delete()
            .eq('property_id', property.id);
        if (deleteError) throw deleteError;

        const rows = (images || [])
            .filter(image => image.url)
            .map((image, index) => mapRealtyMediaToRow({ ...image, position: index, isPrimary: index === 0 }, property, index, userId));

        if (rows.length === 0) {
            await removePropertyMediaStorage(obsoleteStoragePaths);
            return;
        }

        const { error: insertError } = await supabase.from('property_media').insert(rows);
        if (insertError) throw insertError;

        await removePropertyMediaStorage(obsoleteStoragePaths);
    }, [removePropertyMediaStorage, userId]);

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
            setError(formatRealtySupabaseError(err, 'Error saving Realty property'));
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
            const mediaResult = await supabase
                .from('property_media')
                .select('storage_path')
                .eq('property_id', propertyId);
            if (mediaResult.error) throw mediaResult.error;

            const storagePaths = (mediaResult.data || [])
                .map((row: any) => row.storage_path)
                .filter((path: string | null): path is string =>
                    Boolean(path)
                    && Boolean(userId)
                    && isManagedPropertyMediaPath(path, userId || '', propertyId)
                );

            const { error: deleteError } = await supabase.from('properties').delete().eq('id', propertyId);
            if (deleteError) throw deleteError;
            await removePropertyMediaStorage(storagePaths);
            await loadAll();
        } catch (err: any) {
            setError(formatRealtySupabaseError(err, 'Error deleting Realty property'));
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [loadAll, removePropertyMediaStorage]);

    const updateLeadStatus = useCallback(async (leadId: string, status: RealtyLead['status']) => {
        const { error: updateError } = await supabase
            .from('property_leads')
            .update({ stage: status, updated_at: new Date().toISOString() })
            .eq('id', leadId);
        if (updateError) throw new Error(formatRealtySupabaseError(updateError, 'Error updating Realty lead status'));
        await loadAll();
    }, [loadAll]);

    const saveCampaign = useCallback(async (campaign: Partial<PropertyCampaign>) => {
        if (!projectId) return undefined;
        if (!userId) throw new Error('User is required to save Realty campaigns.');
        if (!campaign.propertyId) throw new Error('Property is required to save Realty campaigns.');

        setIsSaving(true);
        setError(null);
        try {
            const resolvedTenantId = await resolveTenantId();
            const row = mapPropertyCampaignToRow(campaign, userId, projectId, resolvedTenantId);
            let savedId = campaign.id || '';

            if (campaign.id) {
                const { data, error: updateError } = await supabase
                    .from('property_campaigns')
                    .update(row)
                    .eq('id', campaign.id)
                    .select('id')
                    .single();
                if (updateError) throw updateError;
                savedId = data?.id || campaign.id;
            } else {
                const { data, error: insertError } = await supabase
                    .from('property_campaigns')
                    .insert({ ...row, created_at: new Date().toISOString() })
                    .select('id')
                    .single();
                if (insertError) throw insertError;
                savedId = data?.id || '';
            }

            await loadAll();
            return savedId;
        } catch (err: any) {
            setError(formatRealtySupabaseError(err, 'Error saving Realty campaign'));
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [loadAll, projectId, resolveTenantId, userId]);

    const deleteCampaign = useCallback(async (campaignId: string) => {
        setIsSaving(true);
        setError(null);
        try {
            const { error: deleteError } = await supabase.from('property_campaigns').delete().eq('id', campaignId);
            if (deleteError) throw deleteError;
            await loadAll();
        } catch (err: any) {
            setError(formatRealtySupabaseError(err, 'Error deleting Realty campaign'));
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [loadAll]);

    const updateCampaignStatus = useCallback(async (campaignId: string, status: RealtyCampaignStatus) => {
        const { error: updateError } = await supabase
            .from('property_campaigns')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', campaignId);
        if (updateError) throw new Error(formatRealtySupabaseError(updateError, 'Error updating Realty campaign status'));
        await loadAll();
    }, [loadAll]);

    const saveOpenHouse = useCallback(async (openHouse: Partial<PropertyOpenHouse>) => {
        if (!projectId) return undefined;
        if (!userId) throw new Error('User is required to save Realty open houses.');
        if (!openHouse.propertyId) throw new Error('Property is required to save Realty open houses.');

        setIsSaving(true);
        setError(null);
        try {
            const resolvedTenantId = await resolveTenantId();
            const row = mapPropertyOpenHouseToRow(openHouse, userId, projectId, resolvedTenantId);
            let savedId = openHouse.id || '';

            if (openHouse.id) {
                const { data, error: updateError } = await supabase
                    .from('property_open_houses')
                    .update(row)
                    .eq('id', openHouse.id)
                    .select('id')
                    .single();
                if (updateError) throw updateError;
                savedId = data?.id || openHouse.id;
            } else {
                const { data, error: insertError } = await supabase
                    .from('property_open_houses')
                    .insert({ ...row, created_at: new Date().toISOString() })
                    .select('id')
                    .single();
                if (insertError) throw insertError;
                savedId = data?.id || '';
            }

            await loadAll();
            return savedId;
        } catch (err: any) {
            setError(formatRealtySupabaseError(err, 'Error saving Realty open house'));
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [loadAll, projectId, resolveTenantId, userId]);

    const deleteOpenHouse = useCallback(async (openHouseId: string) => {
        setIsSaving(true);
        setError(null);
        try {
            const { error: deleteError } = await supabase.from('property_open_houses').delete().eq('id', openHouseId);
            if (deleteError) throw deleteError;
            await loadAll();
        } catch (err: any) {
            setError(formatRealtySupabaseError(err, 'Error deleting Realty open house'));
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [loadAll]);

    const updateOpenHouseStatus = useCallback(async (openHouseId: string, status: RealtyOpenHouseStatus) => {
        const { error: updateError } = await supabase
            .from('property_open_houses')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', openHouseId);
        if (updateError) throw new Error(formatRealtySupabaseError(updateError, 'Error updating Realty open house status'));
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
        if (insertError) throw new Error(formatRealtySupabaseError(insertError, 'Error saving Realty AI generation'));
        await loadAll();
    }, [loadAll, resolveTenantId, userId]);

    return {
        properties,
        activeProperties,
        featuredProperties,
        leads,
        newLeads,
        campaigns,
        openHouses,
        aiGenerations,
        flags,
        isLoading,
        isSaving,
        error,
        refetch: loadAll,
        upsertProjectModule,
        saveProperty,
        uploadPropertyMedia,
        updatePropertyStatus,
        deleteProperty,
        updateLeadStatus,
        saveCampaign,
        deleteCampaign,
        updateCampaignStatus,
        saveOpenHouse,
        deleteOpenHouse,
        updateOpenHouseStatus,
        saveAiGeneration,
    };
};
