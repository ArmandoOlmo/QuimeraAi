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
    REALTY_AI_CONTENT_PREFIX,
    REALTY_AI_POST_TAG,
    REALTY_PROPERTY_POST_TAG,
    mapRealtyLeadRow,
    mapRealtyPostRow,
    mapRealtyPropertyToPostRow,
    serializeRealtyAiContent,
    toRealtySlug,
} from '../../utils/realty';

interface UseRealtySuiteOptions {
    projectId?: string | null;
    tenantId?: string | null;
    userId?: string | null;
}

const projectTag = (projectId: string) => `project:${projectId}`;

const parseAiPostRow = (row: any): RealtyAiGeneration => {
    let payload: any = {};
    if (typeof row.content === 'string' && row.content.startsWith(REALTY_AI_CONTENT_PREFIX)) {
        try {
            payload = JSON.parse(row.content.slice(REALTY_AI_CONTENT_PREFIX.length).trim());
        } catch {
            payload = {};
        }
    }

    return {
        id: row.id,
        tenantId: row.tenant_id ?? null,
        projectId: row.tags?.find((tag: string) => tag.startsWith('project:'))?.replace('project:', '') || '',
        propertyId: payload.propertyId ?? null,
        userId: row.user_id ?? null,
        kind: payload.kind || 'listing_description',
        prompt: payload.prompt || '',
        output: payload.output || row.excerpt || '',
        metadata: payload.metadata || {},
        createdAt: row.created_at,
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
        return data?.tenant_id || userId || null;
    }, [projectId, tenantId, userId]);

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
            const [postsResult, leadsResult, aiResult, projectResult] = await Promise.all([
                supabase
                    .from('posts')
                    .select('*')
                    .contains('tags', [projectTag(projectId), REALTY_PROPERTY_POST_TAG])
                    .order('updated_at', { ascending: false }),
                supabase
                    .from('leads')
                    .select('*')
                    .eq('project_id', projectId)
                    .contains('tags', ['realty'])
                    .order('created_at', { ascending: false })
                    .limit(100),
                supabase
                    .from('posts')
                    .select('*')
                    .contains('tags', [projectTag(projectId), REALTY_AI_POST_TAG])
                    .order('created_at', { ascending: false })
                    .limit(20),
                supabase.from('projects').select('data').eq('id', projectId).maybeSingle(),
            ]);

            const tableError = [postsResult.error, leadsResult.error, aiResult.error, projectResult.error].find(Boolean);
            if (tableError) throw tableError;

            const realtyModule = ((projectResult.data as any)?.data || {})?.realtyModule || {};
            setProperties((postsResult.data || []).map(mapRealtyPostRow));
            setLeads((leadsResult.data || []).map(mapRealtyLeadRow));
            setAiGenerations((aiResult.data || []).map(parseAiPostRow));
            setFlags({
                ...DEFAULT_REALTY_FLAGS,
                ...((realtyModule.flags as Partial<RealtyModuleFlags>) || {}),
                real_estate_enabled: realtyModule.enabled ?? realtyModule.flags?.real_estate_enabled ?? DEFAULT_REALTY_FLAGS.real_estate_enabled,
            });
        } catch (err: any) {
            console.error('[useRealtySuite] Error loading Realty Suite posts:', err);
            setError(err.message || 'Error loading Realty Suite');
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

    const saveProperty = useCallback(async (input: Partial<RealtyProperty>) => {
        if (!projectId) return;
        setIsSaving(true);
        try {
            const resolvedTenantId = await resolveTenantId();
            if (!resolvedTenantId) throw new Error('Tenant is required to create Realty posts.');
            const normalized: Partial<RealtyProperty> = {
                ...input,
                tenantId: resolvedTenantId,
                projectId,
                createdBy: userId || input.createdBy,
                slug: input.slug || toRealtySlug(input.title || ''),
            };
            const row = mapRealtyPropertyToPostRow(normalized);
            if (input.id) {
                const { error: updateError } = await supabase
                    .from('posts')
                    .update(row)
                    .eq('id', input.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('posts')
                    .insert({ ...row, created_at: new Date().toISOString() });
                if (insertError) throw insertError;
            }
            await loadAll();
        } finally {
            setIsSaving(false);
        }
    }, [loadAll, projectId, resolveTenantId, userId]);

    const updatePropertyStatus = useCallback((propertyId: string, status: RealtyPropertyStatus) => {
        const property = properties.find(item => item.id === propertyId);
        if (!property) return Promise.resolve();
        return saveProperty({ ...property, status });
    }, [properties, saveProperty]);

    const deleteProperty = useCallback(async (propertyId: string) => {
        setIsSaving(true);
        try {
            const { error: deleteError } = await supabase.from('posts').delete().eq('id', propertyId);
            if (deleteError) throw deleteError;
            await loadAll();
        } finally {
            setIsSaving(false);
        }
    }, [loadAll]);

    const updateLeadStatus = useCallback(async (leadId: string, status: RealtyLead['status']) => {
        const { error: updateError } = await supabase
            .from('leads')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', leadId);
        if (updateError) throw updateError;
        await loadAll();
    }, [loadAll]);

    const saveAiGeneration = useCallback(async (generation: Omit<RealtyAiGeneration, 'id' | 'createdAt'>) => {
        if (!generation.projectId) return;
        const resolvedTenantId = await resolveTenantId();
        if (!resolvedTenantId) throw new Error('Tenant is required to create Realty AI posts.');
        const { error: insertError } = await supabase.from('posts').insert({
            tenant_id: resolvedTenantId,
            user_id: generation.userId ?? userId ?? null,
            title: `Realty AI - ${generation.kind}`,
            slug: toRealtySlug(`realty-ai-${generation.kind}-${Date.now()}`),
            content: serializeRealtyAiContent(generation),
            excerpt: generation.output.slice(0, 240),
            category: 'realty-ai',
            status: 'draft',
            tags: [
                projectTag(generation.projectId),
                REALTY_AI_POST_TAG,
                generation.propertyId ? `realty-property:${generation.propertyId}` : 'realty-property:none',
            ],
            is_featured: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
