/**
 * MediaContext
 * Unified media asset management replacing admin_assets + global_files.
 * All media assets are stored in the media_assets table and platform-assets bucket.
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../core/AuthContext';
import type { MediaAssetRecord, MediaCategory } from '../../types/media';

interface MediaContextType {
    mediaAssets: MediaAssetRecord[];
    isMediaLoading: boolean;
    categories: string[];
    fetchMediaAssets: (categoryFilter?: MediaCategory | 'all') => Promise<void>;
    uploadMediaAsset: (
        file: File,
        category: MediaCategory,
        options?: {
            description?: string;
            tags?: string[];
            isAiGenerated?: boolean;
            aiPrompt?: string;
            legacyScope?: 'admin' | 'global' | 'both' | 'none';
        }
    ) => Promise<string>;
    uploadMediaAssetFromURL: (
        url: string,
        name: string,
        category: MediaCategory,
        options?: { description?: string; tags?: string[]; legacyScope?: 'admin' | 'global' | 'both' | 'none' }
    ) => Promise<string>;
    updateMediaAsset: (assetId: string, updates: Partial<MediaAssetRecord>) => Promise<void>;
    deleteMediaAsset: (assetId: string, storagePath: string) => Promise<void>;
    linkAssetToContent: (assetId: string, contentId: string, contentType: string) => Promise<void>;
    unlinkAssetFromContent: (assetId: string, contentId: string) => Promise<void>;
    getContentUsingAsset: (assetId: string) => string[];
    getAssetsUsedByContent: (contentId: string) => MediaAssetRecord[];
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

const toLegacyAdminCategory = (category: MediaCategory): string => {
    if (category === 'brand') return 'logo';
    if (category === 'people') return 'team';
    return category;
};

export const MediaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [mediaAssets, setMediaAssets] = useState<MediaAssetRecord[]>([]);
    const [isMediaLoading, setIsMediaLoading] = useState(false);

    const fetchMediaAssets = useCallback(async (categoryFilter?: MediaCategory | 'all') => {
        setIsMediaLoading(true);
        try {
            let query = supabase
                .from('media_assets')
                .select('*')
                .order('created_at', { ascending: false });

            if (categoryFilter && categoryFilter !== 'all') {
                query = query.eq('category', categoryFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            const assets = (data || []).map(row => ({
                id: row.id,
                name: row.name,
                url: row.url,
                downloadURL: row.url,
                size: row.size || 0,
                type: row.type || 'image/png',
                category: row.category as MediaCategory,
                folderPath: row.folder_path,
                tags: row.tags || [],
                description: row.description || '',
                isAiGenerated: row.is_ai_generated || false,
                aiPrompt: row.ai_prompt || '',
                isSystemAsset: row.is_system_asset || false,
                usedIn: (row.used_in && Array.isArray(row.used_in)) ? row.used_in as string[] : [],
                usageCount: row.usage_count || 0,
                storagePath: row.folder_path,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                uploadedBy: row.created_by,
                metadata: row.metadata || {},
            } as MediaAssetRecord));

            setMediaAssets(assets);
        } catch (error) {
            console.error('[MediaContext] Error fetching media assets:', error);
        } finally {
            setIsMediaLoading(false);
        }
    }, []);

    // Initial fetch + realtime subscription
    useEffect(() => {
        fetchMediaAssets();

        const channel = supabase.channel('public:media_assets')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'media_assets',
            }, () => {
                fetchMediaAssets();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchMediaAssets]);

    // Listen for cross-context notifications
    useEffect(() => {
        const handleLibraryUpdated = () => {
            fetchMediaAssets();
        };
        window.addEventListener('quimera:media-updated', handleLibraryUpdated);
        return () => window.removeEventListener('quimera:media-updated', handleLibraryUpdated);
    }, [fetchMediaAssets]);

    const syncLegacyLibraries = async (asset: {
        id: string;
        name: string;
        url: string;
        size?: number | null;
        type?: string | null;
        category: MediaCategory;
        storagePath?: string;
        createdAt?: string;
        description?: string;
        tags?: string[];
        isAiGenerated?: boolean;
        aiPrompt?: string;
        scope?: 'admin' | 'global' | 'both' | 'none';
    }) => {
        const scope = asset.scope || 'admin';
        if (scope === 'none') return;

        const metadata = {
            storagePath: asset.storagePath || '',
            uploadedBy: user?.id,
            description: asset.description || '',
            tags: asset.tags || [],
            isAiGenerated: asset.isAiGenerated || false,
            aiPrompt: asset.aiPrompt || '',
            syncedFrom: 'media_assets',
            legacyScope: scope,
        };

        if (scope === 'admin' || scope === 'both') {
            const { error } = await supabase
                .from('admin_assets')
                .upsert({
                    id: asset.id,
                    name: asset.name,
                    url: asset.url,
                    size: asset.size || 0,
                    type: asset.type || 'image/png',
                    category: toLegacyAdminCategory(asset.category),
                    metadata: {
                        ...metadata,
                        usedIn: [],
                    },
                    created_at: asset.createdAt || new Date().toISOString(),
                }, { onConflict: 'id' });
            if (error) throw error;
        }

        if (scope === 'global' || scope === 'both') {
            const { error } = await supabase
                .from('global_files')
                .upsert({
                    id: asset.id,
                    name: asset.name,
                    url: asset.url,
                    size: asset.size || 0,
                    type: asset.type || 'image/png',
                    metadata,
                    created_at: asset.createdAt || new Date().toISOString(),
                }, { onConflict: 'id' });
            if (error) throw error;
        }
    };

    const uploadMediaAsset = async (
        file: File,
        category: MediaCategory,
        options?: {
            description?: string;
            tags?: string[];
            isAiGenerated?: boolean;
            aiPrompt?: string;
            legacyScope?: 'admin' | 'global' | 'both' | 'none';
        }
    ): Promise<string> => {
        if (!user) throw new Error('User not authenticated');

        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `media/${category}/${timestamp}_${safeFileName}`;

        const { error: uploadError } = await supabase.storage
            .from('platform-assets')
            .upload(storagePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl: downloadURL } } = supabase.storage
            .from('platform-assets')
            .getPublicUrl(storagePath);

        const assetRecord = {
            name: file.name,
            url: downloadURL,
            size: file.size,
            type: file.type,
            category,
            folder_path: storagePath,
            tags: options?.tags || [],
            description: options?.description || '',
            is_ai_generated: options?.isAiGenerated || false,
            ai_prompt: options?.aiPrompt || '',
            is_system_asset: false,
            used_in: '[]' as any,
            usage_count: 0,
            metadata: {
                storagePath,
                uploadedBy: user.id,
                legacyScope: options?.legacyScope || 'admin',
            },
            created_by: user.id,
            created_at: new Date().toISOString(),
        };

        const { data: inserted, error } = await supabase
            .from('media_assets')
            .insert([assetRecord])
            .select('*')
            .single();

        if (error) throw error;

        if (inserted) {
            await syncLegacyLibraries({
                id: inserted.id,
                name: inserted.name,
                url: inserted.url,
                size: inserted.size,
                type: inserted.type,
                category,
                storagePath,
                createdAt: inserted.created_at,
                description: options?.description,
                tags: options?.tags,
                isAiGenerated: options?.isAiGenerated,
                aiPrompt: options?.aiPrompt,
                scope: options?.legacyScope || 'admin',
            });
        }

        await fetchMediaAssets();
        return downloadURL;
    };

    const uploadMediaAssetFromURL = async (
        url: string,
        name: string,
        category: MediaCategory,
        options?: { description?: string; tags?: string[]; legacyScope?: 'admin' | 'global' | 'both' | 'none' }
    ): Promise<string> => {
        if (!user) throw new Error('User not authenticated');

        const assetRecord = {
            name: name || 'External Image',
            url,
            size: 0,
            type: 'image/external',
            category,
            folder_path: `media/${category}/external_${Date.now()}`,
            tags: options?.tags || [],
            description: options?.description || '',
            is_ai_generated: false,
            is_system_asset: false,
            used_in: '[]' as any,
            usage_count: 0,
            metadata: {
                legacyScope: options?.legacyScope || 'admin',
            },
            created_by: user.id,
            created_at: new Date().toISOString(),
        };

        const { data: inserted, error } = await supabase
            .from('media_assets')
            .insert([assetRecord])
            .select('*')
            .single();

        if (error) throw error;

        if (inserted) {
            await syncLegacyLibraries({
                id: inserted.id,
                name: inserted.name,
                url: inserted.url,
                size: inserted.size,
                type: inserted.type,
                category,
                storagePath: inserted.folder_path || '',
                createdAt: inserted.created_at,
                description: options?.description,
                tags: options?.tags,
                scope: options?.legacyScope || 'admin',
            });
        }

        await fetchMediaAssets();
        return url;
    };

    const updateMediaAsset = async (assetId: string, updates: Partial<MediaAssetRecord>) => {
        const dbUpdates: Record<string, any> = {};
        const currentAsset = mediaAssets.find(a => a.id === assetId);

        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.isAiGenerated !== undefined) dbUpdates.is_ai_generated = updates.isAiGenerated;
        if (updates.aiPrompt !== undefined) dbUpdates.ai_prompt = updates.aiPrompt;
        if (updates.folderPath !== undefined) dbUpdates.folder_path = updates.folderPath;
        if (updates.usedIn !== undefined) {
            dbUpdates.used_in = JSON.stringify(updates.usedIn);
            dbUpdates.usage_count = updates.usedIn.length;
        }

        if (Object.keys(dbUpdates).length === 0) return;

        const { error } = await supabase
            .from('media_assets')
            .update(dbUpdates)
            .eq('id', assetId);

        if (error) throw error;

        if (currentAsset) {
            const legacyMetadata = {
                ...(currentAsset.metadata || {}),
                description: updates.description ?? currentAsset.description ?? '',
                tags: updates.tags ?? currentAsset.tags ?? [],
                isAiGenerated: updates.isAiGenerated ?? currentAsset.isAiGenerated ?? false,
                aiPrompt: updates.aiPrompt ?? currentAsset.aiPrompt ?? '',
                storagePath: updates.storagePath ?? currentAsset.storagePath ?? currentAsset.folderPath ?? '',
                syncedFrom: 'media_assets',
            };
            const [adminResult, globalResult] = await Promise.all([
                supabase
                    .from('admin_assets')
                    .update({
                        category: toLegacyAdminCategory(updates.category ?? currentAsset.category),
                        metadata: {
                            ...legacyMetadata,
                            usedIn: updates.usedIn ?? currentAsset.usedIn ?? [],
                        },
                    })
                    .eq('id', assetId),
                supabase
                    .from('global_files')
                    .update({ metadata: legacyMetadata })
                    .eq('id', assetId),
            ]);
            if (adminResult.error) throw adminResult.error;
            if (globalResult.error) throw globalResult.error;
        }

        setMediaAssets(prev => prev.map(a =>
            a.id === assetId ? { ...a, ...updates } : a
        ));
    };

    const deleteMediaAsset = async (assetId: string, storagePath: string) => {
        const asset = mediaAssets.find(a => a.id === assetId);
        if (asset?.isSystemAsset) {
            throw new Error('System assets cannot be deleted');
        }

        if (storagePath) {
            await supabase.storage
                .from('platform-assets')
                .remove([storagePath]);
        }

        const { error } = await supabase
            .from('media_assets')
            .delete()
            .eq('id', assetId);

        if (error) throw error;

        const [adminDeleteResult, globalDeleteResult] = await Promise.all([
            supabase.from('admin_assets').delete().eq('id', assetId),
            supabase.from('global_files').delete().eq('id', assetId),
        ]);
        if (adminDeleteResult.error) throw adminDeleteResult.error;
        if (globalDeleteResult.error) throw globalDeleteResult.error;

        setMediaAssets(prev => prev.filter(a => a.id !== assetId));
    };

    const linkAssetToContent = async (assetId: string, contentId: string, contentType: string) => {
        const asset = mediaAssets.find(a => a.id === assetId);
        if (!asset) return;

        const updatedUsedIn = [...(asset.usedIn || [])];
        const usageEntry = `${contentType}:${contentId}`;
        if (!updatedUsedIn.includes(usageEntry)) {
            updatedUsedIn.push(usageEntry);
            await updateMediaAsset(assetId, { usedIn: updatedUsedIn });
        }
    };

    const unlinkAssetFromContent = async (assetId: string, contentId: string) => {
        const asset = mediaAssets.find(a => a.id === assetId);
        if (!asset) return;

        const updatedUsedIn = (asset.usedIn || []).filter(entry => entry !== contentId);
        await updateMediaAsset(assetId, { usedIn: updatedUsedIn });
    };

    const getContentUsingAsset = (assetId: string): string[] => {
        const asset = mediaAssets.find(a => a.id === assetId);
        return asset?.usedIn || [];
    };

    const getAssetsUsedByContent = (contentId: string): MediaAssetRecord[] => {
        return mediaAssets.filter(a => a.usedIn?.includes(contentId));
    };

    const value: MediaContextType = {
        mediaAssets,
        isMediaLoading,
        categories: mediaAssets.length > 0
            ? [...new Set(mediaAssets.map(a => a.category))]
            : [],
        fetchMediaAssets,
        uploadMediaAsset,
        uploadMediaAssetFromURL,
        updateMediaAsset,
        deleteMediaAsset,
        linkAssetToContent,
        unlinkAssetFromContent,
        getContentUsingAsset,
        getAssetsUsedByContent,
    };

    return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
};

export const useMedia = (): MediaContextType => {
    const context = useContext(MediaContext);
    if (!context) {
        throw new Error('useMedia must be used within a MediaProvider');
    }
    return context;
};

export const useSafeMedia = (): MediaContextType | null => {
    return useContext(MediaContext) || null;
};
