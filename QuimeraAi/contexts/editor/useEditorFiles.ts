/**
 * useEditorFiles.ts
 * Extracted from EditorContext.tsx — File management (user files + global files)
 */
import { useState, useEffect } from 'react';
import { FileRecord, LLMPrompt } from '../../types';
import { supabase } from '../../supabase';
import { generateContentViaProxy, extractTextFromResponse } from '../../utils/geminiProxyClient';
import { logApiCall } from '../../services/apiLoggingService';
import { uploadPlatformAsset } from '../../utils/platformAssetUpload';
import type { User } from '@supabase/supabase-js';

interface UseEditorFilesParams {
    user: User | null;
    activeProjectId: string | null;
    activeProjectName?: string;
    prompts: LLMPrompt[];
    hasApiKey: boolean | null;
    promptForKeySelection: () => Promise<void>;
    handleApiError: (error: any) => void;
}

export const useEditorFiles = ({
    user, activeProjectId, activeProjectName,
    prompts, hasApiKey, promptForKeySelection, handleApiError,
}: UseEditorFilesParams) => {
    // Internal helper — derive getPrompt from prompts array
    const getPrompt = (name: string): LLMPrompt | undefined => {
        return prompts.find(p => p.name === name);
    };

    // User Files
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isFilesLoading, setIsFilesLoading] = useState(true);

    // Global Files
    const [globalFiles, setGlobalFiles] = useState<FileRecord[]>([]);
    const [isGlobalFilesLoading, setIsGlobalFilesLoading] = useState(false);

    const fetchAllFiles = async (userId: string, projectId?: string) => {
        setIsFilesLoading(true);
        try {
            if (projectId) {
                const { data, error } = await supabase
                    .from('files')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                const userFiles = (data || []).map(f => ({
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
                    aiSummary: f.metadata?.aiSummary
                })) as FileRecord[];
                setFiles(userFiles);
            } else {
                // If no projectId, fetch all tenant files... 
                // But in the editor we always have projectId.
                setFiles([]);
            }
        } catch (error) {
            console.error("[useEditorFiles] Error loading user files:", error);
            setFiles([]);
        } finally {
            setIsFilesLoading(false);
        }
    };

    // Reload files when activeProjectId changes
    useEffect(() => {
        if (user && activeProjectId) {
            fetchAllFiles(user.id || (user as any).uid, activeProjectId);
        }
    }, [user, activeProjectId]);

    const uploadFile = async (file: File): Promise<string | undefined> => {
        if (!user) throw new Error("Authentication required to upload files.");
        if (!activeProjectId) throw new Error("No active project to upload file to.");
        
        setIsFilesLoading(true);
        try {
            const userId = user.id || (user as any).uid;
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const timestamp = Date.now();
            const storagePath = `users/${userId}/projects/${activeProjectId}/files/${timestamp}_${safeFileName}`;
            
            const { publicUrl: downloadURL } = await uploadPlatformAsset(storagePath, file, {
                upsert: true,
                contentType: file.type || 'application/octet-stream',
            });

            const { data: project } = await supabase.from('projects').select('tenant_id').eq('id', activeProjectId).single();

            const fileRecord = {
                tenant_id: project?.tenant_id || userId,
                project_id: activeProjectId,
                name: file.name,
                url: downloadURL,
                size: file.size,
                type: file.type,
                metadata: {
                    storagePath,
                    notes: '',
                    aiSummary: '',
                    projectName: activeProjectName
                },
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('files')
                .insert([fileRecord])
                .select('id')
                .single();

            if (error) throw error;

            const newFileRecord = {
                id: data.id,
                name: fileRecord.name,
                url: fileRecord.url,
                size: fileRecord.size,
                type: fileRecord.type,
                downloadURL,
                storagePath,
                projectId: activeProjectId,
                createdAt: fileRecord.created_at,
                notes: '',
                aiSummary: ''
            } as FileRecord;

            setFiles(prev => [newFileRecord, ...prev]);
            return downloadURL;
        } catch (error) {
            console.error("[useEditorFiles] Error uploading file:", error);
            throw error;
        } finally {
            setIsFilesLoading(false);
        }
    };

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
            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("[useEditorFiles] Error deleting file:", error);
        }
    };

    const updateFileNotes = async (fileId: string, notes: string) => {
        if (!user || !activeProjectId) return;
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, notes } : f));
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
            console.error("[useEditorFiles] Error updating file notes:", error);
        }
    };

    // ─── Global Files ───

    const fetchGlobalFiles = async () => {
        setIsGlobalFilesLoading(true);
        try {
            const { data, error } = await supabase
                .from('global_files')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const filesList = (data || []).map(f => ({
                id: f.id,
                name: f.name,
                url: f.url,
                size: f.size,
                type: f.type,
                downloadURL: f.url,
                storagePath: f.metadata?.storagePath || '',
                createdAt: f.created_at,
                notes: 'Global Asset',
                aiSummary: ''
            } as FileRecord));
            setGlobalFiles(filesList);
        } catch (error) {
            console.error("Error loading global files:", error);
            setGlobalFiles([]);
        } finally {
            setIsGlobalFilesLoading(false);
        }
    };

    const uploadGlobalFile = async (file: File) => {
        setIsGlobalFilesLoading(true);
        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `global/files/${timestamp}_${safeFileName}`;
            
            const { publicUrl: downloadURL } = await uploadPlatformAsset(storagePath, file, {
                upsert: true,
                contentType: file.type || 'application/octet-stream',
            });

            const userId = user?.id || (user as any)?.uid;
            
            const fileRecord = {
                name: file.name,
                url: downloadURL,
                size: file.size,
                type: file.type,
                metadata: {
                    storagePath,
                    uploadedBy: userId,
                },
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('global_files')
                .insert([fileRecord])
                .select('id')
                .single();
                
            if (error) throw error;

            const newFile = {
                ...fileRecord,
                id: data.id,
                downloadURL,
                storagePath,
                createdAt: fileRecord.created_at,
                notes: 'Global Asset',
                aiSummary: ''
            } as FileRecord;

            setGlobalFiles(prev => [newFile, ...prev]);
        } catch (error) {
            console.error("Error uploading global file:", error);
        } finally {
            setIsGlobalFilesLoading(false);
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
            console.error("Error deleting global file:", error);
        }
    };

    // ─── AI-Powered ───

    const generateFileSummary = async (fileId: string, downloadURL: string) => {
        if (!user || !activeProjectId) return;
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }
        const summaryPrompt = getPrompt('file-summary');
        if (!summaryPrompt) {
            console.error("File summary prompt not found.");
            return;
        }

        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: 'Generating...' } : f));

        const userId = user.id || (user as any).uid;

        try {
            const fileResponse = await fetch(downloadURL);
            if (!fileResponse.ok) throw new Error('Failed to fetch file for summary.');
            const fileContent = await fileResponse.text();

            const populatedPrompt = summaryPrompt.template.replace('{{fileContent}}', fileContent);
            const projectIdForApi = activeProjectId || 'file-summary';
            const response = await generateContentViaProxy(projectIdForApi, populatedPrompt, summaryPrompt.model, {}, userId);

            if (user) {
                logApiCall({ userId: userId, model: summaryPrompt.model, feature: 'file-summary', success: true });
            }

            const summary = extractTextFromResponse(response).trim();
            
            const file = files.find(f => f.id === fileId);
            if (file) {
                const metadata = { ...file, aiSummary: summary };
                await supabase.from('files').update({ metadata }).eq('id', fileId);
            }
            
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: summary } : f));
        } catch (error: any) {
            if (user) {
                logApiCall({ userId: userId, model: summaryPrompt.model, feature: 'file-summary', success: false, errorMessage: error.message || 'Unknown error' });
            }
            handleApiError(error);
            console.error("[useEditorFiles] Error generating file summary:", error);
            const errorMessage = 'Error generating summary.';
            
            const file = files.find(f => f.id === fileId);
            if (file) {
                const metadata = { ...file, aiSummary: errorMessage };
                await supabase.from('files').update({ metadata }).eq('id', fileId);
            }
            
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: errorMessage } : f));
        }
    };

    const uploadImageAndGetURL = async (file: File, path: string): Promise<string> => {
        if (!user) throw new Error("User not authenticated for image upload.");
        try {
            const userId = user.id || (user as any).uid;
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `user_uploads/${userId}/${path}/${Date.now()}-${safeFileName}`;
            
            const { publicUrl } = await uploadPlatformAsset(storagePath, file, {
                upsert: true,
                contentType: file.type || 'application/octet-stream',
            });
                
            return publicUrl;
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    };

    return {
        files, setFiles, isFilesLoading,
        fetchAllFiles,
        uploadFile, deleteFile, updateFileNotes,
        globalFiles, isGlobalFilesLoading,
        fetchGlobalFiles, uploadGlobalFile, deleteGlobalFile,
        generateFileSummary, uploadImageAndGetURL,
    };
};
