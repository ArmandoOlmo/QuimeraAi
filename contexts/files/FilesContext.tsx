/**
 * FilesContext
 * Maneja archivos, storage y uploads
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { FileRecord } from '../../types';
import {
    db,
    storage,
    doc,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';

interface UploadFileOptions {
    projectId?: string;
    projectName?: string;
}

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
    // User Files
    files: FileRecord[];
    isFilesLoading: boolean;
    uploadFile: (file: File, options?: UploadFileOptions) => Promise<string | undefined>;
    deleteFile: (fileId: string, storagePath: string) => Promise<void>;
    updateFileNotes: (fileId: string, notes: string) => Promise<void>;
    updateFileProject: (fileId: string, projectId: string | null, projectName: string | null) => Promise<void>;
    generateFileSummary: (fileId: string, downloadURL: string) => Promise<void>;
    uploadImageAndGetURL: (file: File, path: string) => Promise<string>;
    
    // Global Files (Super Admin - General reuse)
    globalFiles: FileRecord[];
    isGlobalFilesLoading: boolean;
    fetchGlobalFiles: () => Promise<void>;
    uploadGlobalFile: (file: File) => Promise<void>;
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

const FilesContext = createContext<FilesContextType | undefined>(undefined);

export const FilesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, userDocument } = useAuth();
    
    // User Files State
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isFilesLoading, setIsFilesLoading] = useState(true);
    
    // Global Files State
    const [globalFiles, setGlobalFiles] = useState<FileRecord[]>([]);
    const [isGlobalFilesLoading, setIsGlobalFilesLoading] = useState(false);

    // Admin Assets State
    const [adminAssets, setAdminAssets] = useState<AdminAssetRecord[]>([]);
    const [isAdminAssetsLoading, setIsAdminAssetsLoading] = useState(false);

    // Fetch all user files
    const fetchAllFiles = useCallback(async (userId: string) => {
        setIsFilesLoading(true);
        try {
            const filesCol = collection(db, 'users', userId, 'files');
            const q = query(filesCol, orderBy('createdAt', 'desc'));
            const filesSnapshot = await getDocs(q);
            const userFiles = filesSnapshot.docs.map(docSnapshot => ({ 
                id: docSnapshot.id, 
                ...docSnapshot.data() 
            } as FileRecord));
            setFiles(userFiles);
        } catch (error) {
            console.error("Error loading user files:", error);
            setFiles([]);
        } finally {
            setIsFilesLoading(false);
        }
    }, []);

    // Load files when user changes
    useEffect(() => {
        if (user) {
            fetchAllFiles(user.uid);
        } else {
            setFiles([]);
            setIsFilesLoading(false);
        }
    }, [user, fetchAllFiles]);

    // Upload file
    const uploadFile = async (file: File, options?: UploadFileOptions): Promise<string | undefined> => {
        if (!user) return undefined;

        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            
            // Organize files by project if projectId is provided
            const storagePath = options?.projectId 
                ? `users/${user.uid}/projects/${options.projectId}/files/${timestamp}_${safeFileName}`
                : `users/${user.uid}/files/${timestamp}_${safeFileName}`;
            
            const storageRef = ref(storage, storagePath);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const fileRecord: Omit<FileRecord, 'id'> = {
                name: file.name,
                type: file.type,
                size: file.size,
                downloadURL,
                storagePath,
                createdAt: new Date().toISOString(),
                ...(options?.projectId && { projectId: options.projectId }),
                ...(options?.projectName && { projectName: options.projectName }),
            };

            const filesCol = collection(db, 'users', user.uid, 'files');
            const docRef = await addDoc(filesCol, fileRecord);

            const newFile = { ...fileRecord, id: docRef.id } as FileRecord;
            setFiles(prev => [newFile, ...prev]);

            return downloadURL;
        } catch (error) {
            console.error("Error uploading file:", error);
            throw error;
        }
    };

    // Delete file
    const deleteFile = async (fileId: string, storagePath: string) => {
        if (!user) return;

        try {
            // Delete from Storage
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef).catch(() => {
                console.warn("File not found in storage, continuing with Firestore deletion");
            });

            // Delete from Firestore
            await deleteDoc(doc(db, 'users', user.uid, 'files', fileId));

            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("Error deleting file:", error);
            throw error;
        }
    };

    // Update file notes
    const updateFileNotes = async (fileId: string, notes: string) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'files', fileId), { notes });
            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, notes } : f
            ));
        } catch (error) {
            console.error("Error updating file notes:", error);
            throw error;
        }
    };

    // Update file project assignment
    const updateFileProject = async (fileId: string, projectId: string | null, projectName: string | null) => {
        if (!user) return;

        try {
            const updates: Record<string, any> = {};
            
            if (projectId === null) {
                // Remove project association
                updates.projectId = null;
                updates.projectName = null;
            } else {
                updates.projectId = projectId;
                updates.projectName = projectName;
            }

            await updateDoc(doc(db, 'users', user.uid, 'files', fileId), updates);
            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, projectId: projectId || undefined, projectName: projectName || undefined } : f
            ));
        } catch (error) {
            console.error("Error updating file project:", error);
            throw error;
        }
    };

    // Generate file summary (placeholder - would use AI)
    const generateFileSummary = async (fileId: string, downloadURL: string) => {
        if (!user) return;

        try {
            // This would call an AI service to generate a summary
            const summary = "AI-generated summary placeholder";
            await updateDoc(doc(db, 'users', user.uid, 'files', fileId), { summary });
            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, summary } : f
            ));
        } catch (error) {
            console.error("Error generating file summary:", error);
            throw error;
        }
    };

    // Upload image and get URL (helper)
    const uploadImageAndGetURL = async (file: File, path: string): Promise<string> => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    // Global Files Functions
    const fetchGlobalFiles = async () => {
        setIsGlobalFilesLoading(true);
        try {
            const filesCol = collection(db, 'globalFiles');
            const q = query(filesCol, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const globalFilesList = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            } as FileRecord));
            setGlobalFiles(globalFilesList);
        } catch (error) {
            console.error("Error fetching global files:", error);
        } finally {
            setIsGlobalFilesLoading(false);
        }
    };

    const uploadGlobalFile = async (file: File) => {
        if (!user) return;

        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `global/files/${timestamp}_${safeFileName}`;
            const storageRef = ref(storage, storagePath);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const fileRecord: Omit<FileRecord, 'id'> = {
                name: file.name,
                type: file.type,
                size: file.size,
                downloadURL,
                storagePath,
                createdAt: new Date().toISOString(),
                uploadedBy: user.uid,
            };

            const filesCol = collection(db, 'globalFiles');
            const docRef = await addDoc(filesCol, fileRecord);

            const newFile = { ...fileRecord, id: docRef.id } as FileRecord;
            setGlobalFiles(prev => [newFile, ...prev]);
        } catch (error) {
            console.error("Error uploading global file:", error);
            throw error;
        }
    };

    const deleteGlobalFile = async (fileId: string, storagePath: string) => {
        try {
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef).catch(() => {
                console.warn("Global file not found in storage");
            });

            await deleteDoc(doc(db, 'globalFiles', fileId));
            setGlobalFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("Error deleting global file:", error);
            throw error;
        }
    };

    // =============================================================================
    // ADMIN ASSETS FUNCTIONS
    // =============================================================================

    const fetchAdminAssets = async () => {
        setIsAdminAssetsLoading(true);
        try {
            const assetsCol = collection(db, 'adminAssets');
            const q = query(assetsCol, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const assetsList = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            } as AdminAssetRecord));
            setAdminAssets(assetsList);
        } catch (error) {
            console.error("Error fetching admin assets:", error);
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
            const storageRef = ref(storage, storagePath);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const assetRecord: Omit<AdminAssetRecord, 'id'> = {
                name: file.name,
                type: file.type,
                size: file.size,
                downloadURL,
                storagePath,
                category,
                createdAt: new Date().toISOString(),
                uploadedBy: user.uid,
                description: options?.description || '',
                tags: options?.tags || [],
                isAiGenerated: options?.isAiGenerated || false,
                aiPrompt: options?.aiPrompt || '',
                usedIn: [],
            };

            const assetsCol = collection(db, 'adminAssets');
            const docRef = await addDoc(assetsCol, assetRecord);

            const newAsset = { ...assetRecord, id: docRef.id } as AdminAssetRecord;
            setAdminAssets(prev => [newAsset, ...prev]);

            return downloadURL;
        } catch (error) {
            console.error("Error uploading admin asset:", error);
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
            // For external URLs, we just save the reference without re-uploading
            const assetRecord: Omit<AdminAssetRecord, 'id'> = {
                name: name || 'External Image',
                type: 'image/external',
                size: 0,
                downloadURL: url,
                storagePath: '', // No storage path for external URLs
                category,
                createdAt: new Date().toISOString(),
                uploadedBy: user.uid,
                description: options?.description || '',
                tags: options?.tags || [],
                isAiGenerated: false,
                usedIn: [],
            };

            const assetsCol = collection(db, 'adminAssets');
            const docRef = await addDoc(assetsCol, assetRecord);

            const newAsset = { ...assetRecord, id: docRef.id } as AdminAssetRecord;
            setAdminAssets(prev => [newAsset, ...prev]);

            return url;
        } catch (error) {
            console.error("Error uploading admin asset from URL:", error);
            throw error;
        }
    };

    const updateAdminAsset = async (assetId: string, updates: Partial<AdminAssetRecord>) => {
        try {
            const assetRef = doc(db, 'adminAssets', assetId);
            await updateDoc(assetRef, {
                ...updates,
                updatedAt: new Date().toISOString(),
            });
            setAdminAssets(prev => prev.map(asset => 
                asset.id === assetId ? { ...asset, ...updates } : asset
            ));
        } catch (error) {
            console.error("Error updating admin asset:", error);
            throw error;
        }
    };

    const deleteAdminAsset = async (assetId: string, storagePath: string) => {
        try {
            // Delete from Storage if it has a storage path (not external URL)
            if (storagePath) {
                const storageRef = ref(storage, storagePath);
                await deleteObject(storageRef).catch(() => {
                    console.warn("Admin asset not found in storage");
                });
            }

            await deleteDoc(doc(db, 'adminAssets', assetId));
            setAdminAssets(prev => prev.filter(asset => asset.id !== assetId));
        } catch (error) {
            console.error("Error deleting admin asset:", error);
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
            console.error("Error linking asset to article:", error);
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
            console.error("Error unlinking asset from article:", error);
            throw error;
        }
    };

    const value: FilesContextType = {
        files,
        isFilesLoading,
        uploadFile,
        deleteFile,
        updateFileNotes,
        updateFileProject,
        generateFileSummary,
        uploadImageAndGetURL,
        globalFiles,
        isGlobalFilesLoading,
        fetchGlobalFiles,
        uploadGlobalFile,
        deleteGlobalFile,
        // Admin Assets
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







