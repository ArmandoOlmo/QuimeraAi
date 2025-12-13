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

interface FilesContextType {
    // User Files
    files: FileRecord[];
    isFilesLoading: boolean;
    uploadFile: (file: File) => Promise<string | undefined>;
    deleteFile: (fileId: string, storagePath: string) => Promise<void>;
    updateFileNotes: (fileId: string, notes: string) => Promise<void>;
    generateFileSummary: (fileId: string, downloadURL: string) => Promise<void>;
    uploadImageAndGetURL: (file: File, path: string) => Promise<string>;
    
    // Global Files (Super Admin)
    globalFiles: FileRecord[];
    isGlobalFilesLoading: boolean;
    fetchGlobalFiles: () => Promise<void>;
    uploadGlobalFile: (file: File) => Promise<void>;
    deleteGlobalFile: (fileId: string, storagePath: string) => Promise<void>;
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
    const uploadFile = async (file: File): Promise<string | undefined> => {
        if (!user) return undefined;

        try {
            const timestamp = Date.now();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `users/${user.uid}/files/${timestamp}_${safeFileName}`;
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

    const value: FilesContextType = {
        files,
        isFilesLoading,
        uploadFile,
        deleteFile,
        updateFileNotes,
        generateFileSummary,
        uploadImageAndGetURL,
        globalFiles,
        isGlobalFilesLoading,
        fetchGlobalFiles,
        uploadGlobalFile,
        deleteGlobalFile,
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




