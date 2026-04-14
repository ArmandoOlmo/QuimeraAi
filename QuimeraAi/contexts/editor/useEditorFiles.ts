/**
 * useEditorFiles.ts
 * Extracted from EditorContext.tsx — File management (user files + global files)
 */
import { useState, useEffect } from 'react';
import { FileRecord, LLMPrompt } from '../../types';
import {
    db, doc, storage, collection, addDoc, updateDoc, deleteDoc, getDocs,
    query, orderBy, serverTimestamp,
    ref, uploadBytes, getDownloadURL, deleteObject
} from '../../firebase';
import { generateContentViaProxy, extractTextFromResponse } from '../../utils/geminiProxyClient';
import { logApiCall } from '../../services/apiLoggingService';
import type { User } from '../../firebase';

interface UseEditorFilesParams {
    user: User | null;
    activeProjectId: string | null;
    activeProjectName?: string;
    hasApiKey: boolean | null;
    promptForKeySelection: () => Promise<void>;
    handleApiError: (error: any) => void;
    getPrompt: (name: string) => LLMPrompt | undefined;
}

export const useEditorFiles = ({
    user, activeProjectId, activeProjectName,
    hasApiKey, promptForKeySelection, handleApiError, getPrompt,
}: UseEditorFilesParams) => {
    // User Files
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [isFilesLoading, setIsFilesLoading] = useState(true);

    // Global Files
    const [globalFiles, setGlobalFiles] = useState<FileRecord[]>([]);
    const [isGlobalFilesLoading, setIsGlobalFilesLoading] = useState(false);

    const fetchAllFiles = async (userId: string, projectId?: string) => {
        setIsFilesLoading(true);
        try {
            const filesPath = projectId
                ? `users/${userId}/projects/${projectId}/files`
                : `users/${userId}/files`;
            const filesCol = collection(db, filesPath);
            const q = query(filesCol, orderBy('createdAt', 'desc'));
            const filesSnapshot = await getDocs(q);
            const userFiles = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileRecord));
            setFiles(userFiles);
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
            fetchAllFiles(user.uid, activeProjectId);
        }
    }, [user, activeProjectId]);

    const uploadFile = async (file: File): Promise<string | undefined> => {
        if (!user) throw new Error("Authentication required to upload files.");
        if (!activeProjectId) throw new Error("No active project to upload file to.");
        setIsFilesLoading(true);
        try {
            const storageRef = ref(storage, `users/${user.uid}/projects/${activeProjectId}/files/${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const newFileRecord: Omit<FileRecord, 'id'> = {
                name: file.name,
                storagePath: snapshot.ref.fullPath,
                downloadURL,
                size: file.size,
                type: file.type,
                createdAt: serverTimestamp() as any,
                notes: '',
                aiSummary: '',
                projectId: activeProjectId,
                projectName: activeProjectName
            };

            const filesCol = collection(db, `users/${user.uid}/projects/${activeProjectId}/files`);
            const docRef = await addDoc(filesCol, newFileRecord);

            setFiles(prev => [{ id: docRef.id, ...newFileRecord, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } } as FileRecord, ...prev]);
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
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef);
            const fileDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/files/${fileId}`);
            await deleteDoc(fileDocRef);
            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (error) {
            console.error("[useEditorFiles] Error deleting file:", error);
        }
    };

    const updateFileNotes = async (fileId: string, notes: string) => {
        if (!user || !activeProjectId) return;
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, notes } : f));
        try {
            const fileDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/files/${fileId}`);
            await updateDoc(fileDocRef, { notes });
        } catch (error) {
            console.error("[useEditorFiles] Error updating file notes:", error);
        }
    };

    // ─── Global Files ───

    const fetchGlobalFiles = async () => {
        setIsGlobalFilesLoading(true);
        try {
            const filesCol = collection(db, 'global_files');
            const q = query(filesCol, orderBy('createdAt', 'desc'));
            const filesSnapshot = await getDocs(q);
            const files = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileRecord));
            setGlobalFiles(files);
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
            const storageRef = ref(storage, `global_assets/${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const newFileRecord: Omit<FileRecord, 'id'> = {
                name: file.name,
                storagePath: snapshot.ref.fullPath,
                downloadURL,
                size: file.size,
                type: file.type,
                createdAt: serverTimestamp() as any,
                notes: 'Global Asset',
                aiSummary: ''
            };

            const filesCol = collection(db, 'global_files');
            const docRef = await addDoc(filesCol, newFileRecord);
            setGlobalFiles(prev => [{ id: docRef.id, ...newFileRecord, createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } } as FileRecord, ...prev]);
        } catch (error) {
            console.error("Error uploading global file:", error);
        } finally {
            setIsGlobalFilesLoading(false);
        }
    };

    const deleteGlobalFile = async (fileId: string, storagePath: string) => {
        try {
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef);
            const fileDocRef = doc(db, 'global_files', fileId);
            await deleteDoc(fileDocRef);
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

        try {
            const fileResponse = await fetch(downloadURL);
            if (!fileResponse.ok) throw new Error('Failed to fetch file for summary.');
            const fileContent = await fileResponse.text();

            const populatedPrompt = summaryPrompt.template.replace('{{fileContent}}', fileContent);
            const projectIdForApi = activeProjectId || 'file-summary';
            const response = await generateContentViaProxy(projectIdForApi, populatedPrompt, summaryPrompt.model, {}, user.uid);

            if (user) {
                logApiCall({ userId: user.uid, model: summaryPrompt.model, feature: 'file-summary', success: true });
            }

            const summary = extractTextFromResponse(response).trim();
            const fileDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/files/${fileId}`);
            await updateDoc(fileDocRef, { aiSummary: summary });
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: summary } : f));
        } catch (error: any) {
            if (user) {
                logApiCall({ userId: user.uid, model: summaryPrompt.model, feature: 'file-summary', success: false, errorMessage: error.message || 'Unknown error' });
            }
            handleApiError(error);
            console.error("[useEditorFiles] Error generating file summary:", error);
            const errorMessage = 'Error generating summary.';
            const fileDocRef = doc(db, `users/${user.uid}/projects/${activeProjectId}/files/${fileId}`);
            await updateDoc(fileDocRef, { aiSummary: errorMessage });
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, aiSummary: errorMessage } : f));
        }
    };

    const uploadImageAndGetURL = async (file: File, path: string): Promise<string> => {
        if (!user) throw new Error("User not authenticated for image upload.");
        try {
            const storageRef = ref(storage, `user_uploads/${user.uid}/${path}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
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
