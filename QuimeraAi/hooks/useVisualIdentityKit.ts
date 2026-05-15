/**
 * useVisualIdentityKit
 * Hook to load, filter and manage project-specific visual identity references.
 * Used by ImageGeneratorPanel to auto-load brand references across all generation areas.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import type { VisualReference, VisualIdentityKit, ImageReferenceCategory } from '../types/visualIdentity';

interface UseVisualIdentityKitReturn {
  /** Full kit with all references */
  kit: VisualIdentityKit | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if load failed */
  error: string | null;
  /** References that should be auto-loaded into the generator (isDefault or usage='always') */
  defaultReferences: VisualReference[];
  /** Only the image URLs of default references (for sending to the pipeline) */
  defaultReferenceUrls: string[];
  /** Get contextual references triggered by a prompt */
  getContextualReferences: (prompt: string) => VisualReference[];
  /** Get contextual reference URLs triggered by a prompt */
  getContextualReferenceUrls: (prompt: string) => string[];
  /** Add a new reference */
  addReference: (ref: Omit<VisualReference, 'id' | 'createdAt' | 'updatedAt'>) => Promise<VisualReference | null>;
  /** Update an existing reference */
  updateReference: (id: string, partial: Partial<VisualReference>) => Promise<VisualReference | null>;
  /** Delete a reference */
  deleteReference: (id: string) => Promise<boolean>;
  /** Reload kit from database */
  reload: () => Promise<void>;
  /** Get all reference image URLs for pipeline */
  getAllReferenceUrls: () => string[];
}

export function useVisualIdentityKit(projectId?: string): UseVisualIdentityKitReturn {
  const [kit, setKit] = useState<VisualIdentityKit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKit = useCallback(async () => {
    if (!projectId) {
      setKit(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('visual_identity_references')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const references: VisualReference[] = (data || []).map(mapRowToReference);
      setKit({
        projectId,
        references,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[useVisualIdentityKit] Failed to load kit:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visual identity kit');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadKit();
  }, [loadKit]);

  /** References that should be auto-loaded (isDefault or usage='always') */
  const defaultReferences = useMemo(() => {
    if (!kit) return [];
    return kit.references.filter(r => r.isDefault || r.usage === 'always');
  }, [kit]);

  /** Image URLs of default references */
  const defaultReferenceUrls = useMemo(() => {
    return defaultReferences.map(r => r.imageUrl);
  }, [defaultReferences]);

  /** Get contextual references based on prompt keywords */
  const getContextualReferences = useCallback((prompt: string): VisualReference[] => {
    if (!kit || !prompt) return [];
    const lower = prompt.toLowerCase();
    return kit.references.filter(r =>
      r.usage === 'contextual' &&
      r.contextualTriggers?.some(trigger => lower.includes(trigger.toLowerCase()))
    );
  }, [kit]);

  /** Get contextual reference URLs */
  const getContextualReferenceUrls = useCallback((prompt: string): string[] => {
    return getContextualReferences(prompt).map(r => r.imageUrl);
  }, [getContextualReferences]);

  /** Get all reference image URLs */
  const getAllReferenceUrls = useCallback((): string[] => {
    if (!kit) return [];
    return kit.references.map(r => r.imageUrl);
  }, [kit]);

  /** Add a new reference */
  const addReference = useCallback(async (
    ref: Omit<VisualReference, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<VisualReference | null> => {
    if (!projectId) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('visual_identity_references')
        .insert({
          project_id: ref.projectId || projectId,
          category: ref.category,
          label: ref.label,
          description: ref.description,
          image_url: ref.imageUrl,
          thumbnail_url: ref.thumbnailUrl,
          ai_prompt_hint: ref.aiPromptHint,
          usage: ref.usage,
          contextual_triggers: ref.contextualTriggers,
          position: ref.position,
          is_default: ref.isDefault,
          sort_order: ref.sortOrder,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newRef = mapRowToReference(data);
      setKit(prev => prev ? {
        ...prev,
        references: [...prev.references, newRef],
        updatedAt: new Date().toISOString(),
      } : null);
      return newRef;
    } catch (err) {
      console.error('[useVisualIdentityKit] Failed to add reference:', err);
      return null;
    }
  }, [projectId]);

  /** Update an existing reference */
  const updateReference = useCallback(async (
    id: string,
    partial: Partial<VisualReference>
  ): Promise<VisualReference | null> => {
    try {
      const updateData: Record<string, any> = {};
      if (partial.category !== undefined) updateData.category = partial.category;
      if (partial.label !== undefined) updateData.label = partial.label;
      if (partial.description !== undefined) updateData.description = partial.description;
      if (partial.imageUrl !== undefined) updateData.image_url = partial.imageUrl;
      if (partial.thumbnailUrl !== undefined) updateData.thumbnail_url = partial.thumbnailUrl;
      if (partial.aiPromptHint !== undefined) updateData.ai_prompt_hint = partial.aiPromptHint;
      if (partial.usage !== undefined) updateData.usage = partial.usage;
      if (partial.contextualTriggers !== undefined) updateData.contextual_triggers = partial.contextualTriggers;
      if (partial.position !== undefined) updateData.position = partial.position;
      if (partial.isDefault !== undefined) updateData.is_default = partial.isDefault;
      if (partial.sortOrder !== undefined) updateData.sort_order = partial.sortOrder;
      updateData.updated_at = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from('visual_identity_references')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedRef = mapRowToReference(data);
      setKit(prev => prev ? {
        ...prev,
        references: prev.references.map(r => r.id === id ? updatedRef : r),
        updatedAt: new Date().toISOString(),
      } : null);
      return updatedRef;
    } catch (err) {
      console.error('[useVisualIdentityKit] Failed to update reference:', err);
      return null;
    }
  }, []);

  /** Delete a reference */
  const deleteReference = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('visual_identity_references')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setKit(prev => prev ? {
        ...prev,
        references: prev.references.filter(r => r.id !== id),
        updatedAt: new Date().toISOString(),
      } : null);
      return true;
    } catch (err) {
      console.error('[useVisualIdentityKit] Failed to delete reference:', err);
      return false;
    }
  }, []);

  return {
    kit,
    isLoading,
    error,
    defaultReferences,
    defaultReferenceUrls,
    getContextualReferences,
    getContextualReferenceUrls,
    addReference,
    updateReference,
    deleteReference,
    reload: loadKit,
    getAllReferenceUrls,
  };
}

/** Map a database row to a VisualReference */
function mapRowToReference(row: any): VisualReference {
  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category as ImageReferenceCategory,
    label: row.label,
    description: row.description,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    aiPromptHint: row.ai_prompt_hint,
    usage: row.usage || 'optional',
    contextualTriggers: row.contextual_triggers,
    position: row.position,
    isDefault: row.is_default || false,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
