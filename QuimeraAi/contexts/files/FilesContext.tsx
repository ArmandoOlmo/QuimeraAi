/**
 * FilesContext
 * Maneja archivos, storage y uploads
 * Los archivos de usuario están organizados por proyecto
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { FileRecord } from '../../types';
import { supabase } from '../../supabase';
import { useAuth } from '../core/AuthContext';
import { useSafeProject } from '../project';
import { useSafeTenant } from '../tenant';

// Admin Asset Categories
export type AdminAssetCategory = 
    | 'article' 
    | 'component' 
    | 'template' 
    | 'hero' 
    | 'icon' 
    | 'background' 
    | 'logo' 
    | 'testimonial'
    | 'team'
    | 'product'
    | 'ai_generated'
    | 'other';

export interface AdminAssetRecord extends FileRecord {
    category: AdminAssetCategory;
    tags?: string[];
    usedIn?: string[]; // IDs de artículos/componentes que usan este asset
    description?: string;
    isAiGenerated?: boolean;
    aiPrompt?: string;
}

interface FilesContextType {
    // User Files (project-scoped)
    files: FileRecord[];
    isFilesLoading: boolean;
    uploadFile: (file: File) => Promise<string | undefined>;
    deleteFile: (fileId: string, storagePath: string) => Promise<void>;
    updateFileNotes: (fileId: string, notes: string) => Promise<void>;
    generateFileSummary: (fileId: string, downloadURL: string) => Promise<void>;
    uploadImageAndGetURL: (file: File, path: string) => Promise<string>;
    /** Manually refetch project files (useful after async writes like AI image generation) */
    refreshFiles: () => Promise<void>;
    /** Optimistically insert a file in local state before the network confirms it */
    addFileLocally: (file: FileRecord) => void;
    
    // Project info
    hasActiveProject: boolean;
    activeProjectId: string | null;
    
    // Global Files (Super Admin - General reuse)
    globalFiles: FileRecord[];
    isGlobalFilesLoading: boolean;
    fetchGlobalFiles: () => Promise<void>;
    uploadGlobalFile: (file: File) => Promise<string>;
    deleteGlobalFile: (fileId: string, storagePath: string) => Promise<void>;

    // Admin Assets (Super Admin - App Content Assets)
    adminAssets: AdminAssetRecord[];
    isAdminAssetsLoading: boolean;
    fetchAdminAssets: () => Promise<void>;
    uploadAdminAsset: (file: File, category: AdminAssetCategory, options?: { description?: string; tags?: string[]; isAiGenerated?: boolean; aiPrompt?: string }) => Promise<string>;
    uploadAdminAssetFromURL: (url: string, name: string, category: AdminAssetCategory, options?: { description?: string; tags?: string[] }) => Promise<string>;
    updateAdminAsset: (assetId: string, updates: Partial<AdminAssetRecord>) => Promise<void>;
    deleteAdminAsset: (assetId: string, storagePath: string) => Promise<void>;
    linkAssetToArticle: (assetId: string, articleId: string) => Promise<void>;
    unlinkAssetFromArticle: (assetId: string, articleId: string) => Promise<void>;
}

export const FilesContext = createContext<FilesContextType | undefined>(undefined);

export const FilesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const projectContext = useSafeProject();
    const activeProjectId = projectContext?.activeProjectId || null;
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;
    
    // User Files State (project-scoped)
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isFilesLoading, setIsFilesLoading] = useState(true);
    
    // Global Files State
    const [globalFiles, setGlobalFiles] = useState<FileRecord[]>([]);
    const [isGlobalFilesLoading, setIsGlobalFilesLoading] = useState(false);

    // Admin Assets State
    const [adminAssets, setAdminAssets] = useState<AdminAssetRecord[]>([]);
    const [isAdminAssetsLoading, setIsAdminAssetsLoading] = useState(false);

    // Reusable fetch for project files. Exposed via context so consumers can
    // trigger an explicit refresh after async writes (AI generation, uploads, …).
    const refreshFiles = useCallback(async () => {
        if (!user || !activeProjectId) {
            setFiles([]);
            setIsFilesLoading(false);
            return;
        }

        setIsFilesLoading(true);
        try {
            let tenantId = currentTenantId;
            if (!tenantId) {
                const { data: memberRow } = await supabase
                    .from('tenant_members')
                    .select('tenant_id')
                    .eq('user_id', user.id)
                    .limit(1)
                    .maybeSingle();
                tenantId = memberRow?.tenant_id || null;
            }

            let query = supabase
                .from('files')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('created_at', { ascending: false });
            if (tenantId) {
                query = query.eq('tenant_id', tenantId);
            }
            const { data, error } = await query;
            if (error) throw error;

            const filesData = (data || []).map(f => ({
                id: f.id,
                name: f.name,
                url: f.url,
                size: f.size,
                type: f.type,
                downloadURL: f.url,
                storagePath: f.metadata?.storagePath || '',
                projectId: f.project_id,
                createdAt: f.created_at,
                notes: f.metadata?.notes,
                summary: f.metadata?.summary
            })) as FileRecord[];
            setFiles(filesData);
        } catch (error) {
            console.error("[FilesContext] Error fetching files:", error);
        } finally {
            setIsFilesLoading(false);
        }
    }, [user, activeProjectId, currentTenantId]);

    // Optimistically prepend a freshly created file so the UI updates instantly
    // (the realtime subscription / next refreshFiles will reconcile if needed).
    const addFileLocally = useCallback((file: FileRecord) => {
        setFiles(prev => {
            if (prev.some(f => f.id === file.id || (file.downloadURL && f.downloadURL === file.downloadURL))) {
                return prev;
            }
            return [file, ...prev];
        });
    }, []);

    // Load files with real-time updates (scoped to active project)
    // We rely on RLS to filter by tenant, so we don't strictly need currentTenantId here.
    // If currentTenantId isn't loaded yet, we fall back to a tenant_members lookup.
    useEffect(() => {
        if (!user || !activeProjectId) {
            setFiles([]);
            setIsFilesLoading(false);
            return;
        }

        refreshFiles();

        const channel = supabase.channel(`public:files:project_id=eq.${activeProjectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'files',
                filter: `project_id=eq.${activeProjectId}`
            }, () => {
                refreshFiles();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId, refreshFiles]);

    // Listen for cross-context notifications (e.g. AIContext just persisted a
    // generated image) so the relevant library refreshes without a page reload.
    useEffect(() => {
        const handleLibraryUpdated = (e: Event) => {
            const detail = (e as CustomEvent<{ destination?: 'user' | 'admin' | 'global'; projectId?: string }>).detail || {};
            const dest = detail.destination || 'user';
            if (dest === 'user') {
                if (!detail.projectId || detail.projectId === activeProjectId) {
                    refreshFiles();
                }
            } else if (dest === 'admin') {
                fetchAdminAssets();
            } else if (dest === 'global') {
                fetchGlobalFiles();
            }
        };

        window.addEventListener('quimera:library-updated', handleLibraryUpdated);
        return () => window.removeEventListener('quimera:library-updated', handleLibraryUpdated);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProjectId, refreshFiles]);

    // Upload file (to active project)
    const uploadFile = async (file: File): Promise<string | undefined> => {
        if (!user || !activeProjectId) {
            console.error("[FilesContext] Cannot upload file: No user or active project");
            return undefined;
        }

        // Resolve tenant_id - either from context or by looking it up
        let tenantId = currentTenantId;
        if (!tenantId) {
            const { data: memberRow } = await supabase
                .from('tenant_members')
                .select('tenant_id')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();
            tenantId = memberRow?.tenant_id || null;
        }
        if (!tenantId) {
            console.error("[FilesContext] Cannot upload file: User has no tenant membership");
            return undefined;
        }

        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `users/${user.id}/projects/${activeProjectId}/files/${timestamp}_${safeFileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('platform-assets')
                .upload(storagePath, file, { upsert: true });
                
            if (uploadError) throw uploadError;

            const { data: { publicUrl: downloadURL } } = supabase.storage
                .from('platform-assets')
                .getPublicUrl(storagePath);

            const createdAt = new Date().toISOString();
            const fileRecord = {
                tenant_id: tenantId,
                project_id: activeProjectId,
                name: file.name,
                url: downloadURL,
                size: file.size,
                type: file.type,
                metadata: {
                    storagePath
                },
                created_at: createdAt
            };

            const { data: inserted, error } = await supabase
                .from('files')
                .insert([fileRecord])
                .select('*')
                .single();

            if (error) throw error;

            if (inserted) {
                addFileLocally({
                    id: inserted.id,
                    name: inserted.name,
                    url: inserted.url,
                    size: inserted.size,
                    type: inserted.type,
                    downloadURL: inserted.url,
                    storagePath: inserted.metadata?.storagePath || storagePath,
                    projectId: inserted.project_id,
                    createdAt: inserted.created_at,
                } as FileRecord);
            }

            return downloadURL;
        } catch (error) {
            console.error("[FilesContext] Error uploading file:", error);
            throw error;
        }
    };

    // Delete file (from active project)
    const deleteFile = async (fileId: string, storagePath: string) => {
        if (!user || !activeProjectId) return;

        try {
            if (storagePath) {
                await supabase.storage
                    .from('platform-assets')
                    .remove([storagePath]);
            }

            const { error } = await supabase
                .from('files')
                .delete()
                .eq('id', fileId);

            if (error) throw error;
        } catch (error) {
            console.error("[FilesContext] Error deleting file:", error);
            throw error;
        }
    };

    // Update file notes
    const updateFileNotes = async (fileId: string, notes: string) => {
        if (!user || !activeProjectId) return;

        try {
            const file = files.find(f => f.id === fileId);
            if (!file) return;

            const metadata = { ...file, notes };

            const { error } = await supabase
                .from('files')
                .update({ metadata })
                .eq('id', fileId);

            if (error) throw error;
        } catch (error) {
            console.error("[FilesContext] Error updating file notes:", error);
            throw error;
        }
    };

    // Generate file summary
    const generateFileSummary = async (fileId: string, downloadURL: string) => {
        if (!user || !activeProjectId) return;

        try {
            const summary = "AI-generated summary placeholder";
            const file = files.find(f => f.id === fileId);
            if (!file) return;

            const metadata = { ...file, summary };

            const { error } = await supabase
                .from('files')
                .update({ metadata })
                .eq('id', fileId);

            if (error) throw error;
        } catch (error) {
            console.error("[FilesContext] Error generating file summary:", error);
            throw error;
        }
    };

    const uploadImageAndGetURL = async (file: File, path: string): Promise<string> => {
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fullPath = `${path}/${timestamp}_${safeFileName}`;
        
        const { error } = await supabase.storage
            .from('platform-assets')
            .upload(fullPath, file, { upsert: true });
            
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
            .from('platform-assets')
            .getPublicUrl(fullPath);
            
        return publicUrl;
    };

    // Global Files Functions
    const fetchGlobalFiles = async () => {
        setIsGlobalFilesLoading(true);
        try {
            const { data, error } = await supabase
                .from('global_files')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const globalFilesList = (data || []).map(f => ({
                id: f.id,
                name: f.name,
                url: f.url,
                size: f.size,
                type: f.type,
                downloadURL: f.url,
                storagePath: f.metadata?.storagePath || '',
                createdAt: f.created_at,
                uploadedBy: f.metadata?.uploadedBy
            } as FileRecord));
            setGlobalFiles(globalFilesList);
        } catch (error) {
            console.error("[FilesContext] Error fetching global files:", error);
        } finally {
            setIsGlobalFilesLoading(false);
        }
    };

    const uploadGlobalFile = async (file: File): Promise<string> => {
        if (!user) throw new Error('User not authenticated');

        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `global/files/${timestamp}_${safeFileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('platform-assets')
                .upload(storagePath, file, { upsert: true });
                
            if (uploadError) throw uploadError;

            const { data: { publicUrl: downloadURL } } = supabase.storage
                .from('platform-assets')
                .getPublicUrl(storagePath);

            const fileRecord = {
                name: file.name,
                url: downloadURL,
                size: file.size,
                type: file.type,
                metadata: {
                    storagePath,
                    uploadedBy: user.id
                },
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('global_files')
                .insert([fileRecord])
                .select('id')
                .single();

            if (error) throw error;
            
            await fetchGlobalFiles(); // refresh
            
            return downloadURL;
        } catch (error) {
            console.error("[FilesContext] Error uploading global file:", error);
            throw error;
        }
    };

    const deleteGlobalFile = async (fileId: string, storagePath: string) => {
        try {
            if (storagePath) {
                await supabase.storage
                    .from('platform-assets')
                    .remove([storagePath]);
            }

            const { error } = await supabase
                .from('global_files')
                .delete()
                .eq('id', fileId);

            if (error) throw error;
            setGlobalFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("[FilesContext] Error deleting global file:", error);
            throw error;
        }
    };

    // =============================================================================
    // ADMIN ASSETS FUNCTIONS
    // =============================================================================

    const fetchAdminAssets = async () => {
        setIsAdminAssetsLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_assets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const assetsList = (data || []).map(f => ({
                id: f.id,
                name: f.name,
                url: f.url,
                size: f.size,
                type: f.type,
                category: f.category,
                downloadURL: f.url,
                storagePath: f.metadata?.storagePath || '',
                createdAt: f.created_at,
                uploadedBy: f.metadata?.uploadedBy,
                description: f.metadata?.description,
                tags: f.metadata?.tags || [],
                isAiGenerated: f.metadata?.isAiGenerated || false,
                aiPrompt: f.metadata?.aiPrompt,
                usedIn: f.metadata?.usedIn || [],
            } as AdminAssetRecord));
            setAdminAssets(assetsList);
        } catch (error) {
            console.error("[FilesContext] Error fetching admin assets:", error);
        } finally {
            setIsAdminAssetsLoading(false);
        }
    };

    const uploadAdminAsset = async (
        file: File, 
        category: AdminAssetCategory, 
        options?: { description?: string; tags?: string[]; isAiGenerated?: boolean; aiPrompt?: string }
    ): Promise<string> => {
        if (!user) throw new Error('User not authenticated');

        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `admin/assets/${category}/${timestamp}_${safeFileName}`;
            
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
                metadata: {
                    storagePath,
                    uploadedBy: user.id,
                    description: options?.description || '',
                    tags: options?.tags || [],
                    isAiGenerated: options?.isAiGenerated || false,
                    aiPrompt: options?.aiPrompt || '',
                    usedIn: [],
                },
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('admin_assets')
                .insert([assetRecord]);

            if (error) throw error;

            await fetchAdminAssets();
            return downloadURL;
        } catch (error) {
            console.error("[FilesContext] Error uploading admin asset:", error);
            throw error;
        }
    };

    const uploadAdminAssetFromURL = async (
        url: string,
        name: string,
        category: AdminAssetCategory,
        options?: { description?: string; tags?: string[] }
    ): Promise<string> => {
        if (!user) throw new Error('User not authenticated');

        try {
            const assetRecord = {
                name: name || 'External Image',
                url: url,
                size: 0,
                type: 'image/external',
                category,
                metadata: {
                    storagePath: '',
                    uploadedBy: user.id,
                    description: options?.description || '',
                    tags: options?.tags || [],
                    isAiGenerated: false,
                    usedIn: [],
                },
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('admin_assets')
                .insert([assetRecord]);

            if (error) throw error;
            
            await fetchAdminAssets();
            return url;
        } catch (error) {
            console.error("[FilesContext] Error uploading admin asset from URL:", error);
            throw error;
        }
    };

    const updateAdminAsset = async (assetId: string, updates: Partial<AdminAssetRecord>) => {
        try {
            const asset = adminAssets.find(a => a.id === assetId);
            if (!asset) return;

            // We only support updating metadata fields to match SQL structure simply
            const metadata = {
                ...asset, // previous state representation
                ...updates,
                storagePath: asset.storagePath,
                uploadedBy: asset.uploadedBy
            };

            const { error } = await supabase
                .from('admin_assets')
                .update({ metadata })
                .eq('id', assetId);

            if (error) throw error;
            
            setAdminAssets(prev => prev.map(a => 
                a.id === assetId ? { ...a, ...updates } : a
            ));
        } catch (error) {
            console.error("[FilesContext] Error updating admin asset:", error);
            throw error;
        }
    };

    const deleteAdminAsset = async (assetId: string, storagePath: string) => {
        try {
            if (storagePath) {
                await supabase.storage
                    .from('platform-assets')
                    .remove([storagePath]);
            }

            const { error } = await supabase
                .from('admin_assets')
                .delete()
                .eq('id', assetId);

            if (error) throw error;
            setAdminAssets(prev => prev.filter(asset => asset.id !== assetId));
        } catch (error) {
            console.error("[FilesContext] Error deleting admin asset:", error);
            throw error;
        }
    };

    const linkAssetToArticle = async (assetId: string, articleId: string) => {
        try {
            const asset = adminAssets.find(a => a.id === assetId);
            if (!asset) return;

            const updatedUsedIn = [...(asset.usedIn || [])];
            if (!updatedUsedIn.includes(articleId)) {
                updatedUsedIn.push(articleId);
                await updateAdminAsset(assetId, { usedIn: updatedUsedIn });
            }
        } catch (error) {
            console.error("[FilesContext] Error linking asset to article:", error);
            throw error;
        }
    };

    const unlinkAssetFromArticle = async (assetId: string, articleId: string) => {
        try {
            const asset = adminAssets.find(a => a.id === assetId);
            if (!asset) return;

            const updatedUsedIn = (asset.usedIn || []).filter(id => id !== articleId);
            await updateAdminAsset(assetId, { usedIn: updatedUsedIn });
        } catch (error) {
            console.error("[FilesContext] Error unlinking asset from article:", error);
            throw error;
        }
    };

    const value: FilesContextType = {
        files,
        isFilesLoading,
        uploadFile,
        deleteFile,
        updateFileNotes,
        generateFileSummary,
        uploadImageAndGetURL,
        refreshFiles,
        addFileLocally,
        hasActiveProject: !!activeProjectId,
        activeProjectId,
        globalFiles,
        isGlobalFilesLoading,
        fetchGlobalFiles,
        uploadGlobalFile,
        deleteGlobalFile,
        adminAssets,
        isAdminAssetsLoading,
        fetchAdminAssets,
        uploadAdminAsset,
        uploadAdminAssetFromURL,
        updateAdminAsset,
        deleteAdminAsset,
        linkAssetToArticle,
        unlinkAssetFromArticle,
    };

    return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>;
};

export const useFiles = (): FilesContextType => {
    const context = useContext(FilesContext);
    if (!context) {
        throw new Error('useFiles must be used within a FilesProvider');
    }
    return context;
};

export const useSafeFiles = (): FilesContextType | null => {
    return useContext(FilesContext) || null;
};
