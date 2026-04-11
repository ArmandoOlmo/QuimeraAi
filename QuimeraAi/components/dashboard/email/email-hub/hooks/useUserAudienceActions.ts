/**
 * useUserAudienceActions
 *
 * User-scoped version of useAudienceActions.
 * No dependency on useAdmin() — all operations target user/project collections.
 */

import { useState } from 'react';
import { useAuth } from '../../../../../contexts/core/AuthContext';
import {
    db, doc, addDoc, updateDoc, deleteDoc, collection,
} from '../../../../../firebase';
import { serverTimestamp } from 'firebase/firestore';
import type { UserEmailAudience, ConfirmModalState } from '../types';
import type { UserEmailDataReturn } from './useUserEmailData';

export interface UserAudienceActionsReturn {
    // State
    showCreateAudience: boolean;
    setShowCreateAudience: (v: boolean) => void;
    newAudienceForm: { name: string; description: string };
    setNewAudienceForm: React.Dispatch<React.SetStateAction<{ name: string; description: string }>>;
    showImportCSV: boolean;
    setShowImportCSV: (v: boolean) => void;
    selectedAudienceId: string | null;
    setSelectedAudienceId: (v: string | null) => void;
    manualEmail: string;
    setManualEmail: (v: string) => void;
    csvUploading: boolean;
    audienceMembers: Record<string, { email: string; name?: string }[]>;
    setAudienceMembers: React.Dispatch<React.SetStateAction<Record<string, { email: string; name?: string }[]>>>;

    // Handlers
    handleCreateAudience: () => Promise<void>;
    handleDeleteAudience: (audienceId: string, setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>) => void;
    handleCSVUpload: (audienceId: string, file: File) => Promise<void>;
    handleAddManualEmail: (audienceId: string) => Promise<void>;
    handleRemoveMember: (audienceId: string, memberEmail: string) => Promise<void>;
}

export function useUserAudienceActions(
    data: UserEmailDataReturn,
    userId: string,
    projectId: string,
): UserAudienceActionsReturn {
    const { user } = useAuth();
    const { audiences, setAudiences } = data;

    const audiencesPath = `users/${userId}/projects/${projectId}/emailAudiences`;

    const [showCreateAudience, setShowCreateAudience] = useState(false);
    const [newAudienceForm, setNewAudienceForm] = useState({ name: '', description: '' });
    const [showImportCSV, setShowImportCSV] = useState(false);
    const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
    const [manualEmail, setManualEmail] = useState('');
    const [csvUploading, setCsvUploading] = useState(false);
    const [audienceMembers, setAudienceMembers] = useState<Record<string, { email: string; name?: string }[]>>({});

    const handleCreateAudience = async () => {
        if (!newAudienceForm.name.trim()) return;
        try {
            const docRef = await addDoc(collection(db, audiencesPath), {
                name: newAudienceForm.name.trim(),
                description: newAudienceForm.description.trim(),
                members: [],
                staticMemberCount: 0,
                estimatedCount: 0,
                tags: [],
                acceptsMarketing: true,
                source: 'manual',
                createdBy: user?.uid || userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setAudiences(prev => [{
                id: docRef.id,
                name: newAudienceForm.name.trim(),
                description: newAudienceForm.description.trim(),
                members: [],
                staticMemberCount: 0,
                estimatedCount: 0,
                tags: [],
                acceptsMarketing: true,
                userId,
                projectId,
                createdAt: new Date().toISOString(),
            } as UserEmailAudience, ...prev]);
            setNewAudienceForm({ name: '', description: '' });
            setShowCreateAudience(false);
        } catch (err) {
            console.error('[UserEmailHub] Error creating audience:', err);
        }
    };

    const handleCSVUpload = async (audienceId: string, file: File) => {
        setCsvUploading(true);
        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            const newMembers: { email: string; name?: string; source: string }[] = [];
            const headerLine = lines[0]?.toLowerCase() || '';
            const hasHeader = headerLine.includes('email') || headerLine.includes('nombre') || headerLine.includes('name');
            const startIdx = hasHeader ? 1 : 0;

            for (let i = startIdx; i < lines.length; i++) {
                const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
                const email = parts[0];
                const name = parts[1] || '';
                if (email && email.includes('@')) {
                    newMembers.push({ email, name, source: 'csv-import' });
                }
            }

            if (newMembers.length === 0) {
                setCsvUploading(false);
                return;
            }

            const audienceRef = doc(db, audiencesPath, audienceId);
            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = (audience as any)?.members || [];
            const existingEmails = new Set(existingMembers.map((m: any) => m.email?.toLowerCase()));
            const uniqueNewMembers = newMembers.filter(m => !existingEmails.has(m.email.toLowerCase()));
            const updatedMembers = [...existingMembers, ...uniqueNewMembers];

            await updateDoc(audienceRef, {
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
                updatedAt: serverTimestamp(),
            });

            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
            } as UserEmailAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setShowImportCSV(false);
        } catch (err) {
            console.error('[UserEmailHub] Error importing CSV:', err);
        }
        setCsvUploading(false);
    };

    const handleAddManualEmail = async (audienceId: string) => {
        if (!manualEmail.trim() || !manualEmail.includes('@')) return;
        try {
            const audienceRef = doc(db, audiencesPath, audienceId);
            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = (audience as any)?.members || [];
            const exists = existingMembers.some((m: any) => m.email?.toLowerCase() === manualEmail.trim().toLowerCase());
            if (exists) { setManualEmail(''); return; }

            const updatedMembers = [...existingMembers, { email: manualEmail.trim(), source: 'manual' }];
            await updateDoc(audienceRef, {
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
                updatedAt: serverTimestamp(),
            });

            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
            } as UserEmailAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setManualEmail('');
        } catch (err) {
            console.error('[UserEmailHub] Error adding email:', err);
        }
    };

    const handleDeleteAudience = (audienceId: string, setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>) => {
        const audience = audiences.find(a => a.id === audienceId);
        setConfirmModal({
            show: true,
            title: 'Eliminar Audiencia',
            message: `¿Estás seguro de eliminar la audiencia "${audience?.name || ''}"? Se perderán todos los contactos asociados.`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, audiencesPath, audienceId));
                    setAudiences(prev => prev.filter(a => a.id !== audienceId));
                } catch (err) {
                    console.error('[UserEmailHub] Error deleting audience:', err);
                }
                setConfirmModal(prev => ({ ...prev, show: false }));
            },
        });
    };

    const handleRemoveMember = async (audienceId: string, memberEmail: string) => {
        try {
            const audienceRef = doc(db, audiencesPath, audienceId);
            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = (audience as any)?.members || [];
            const updatedMembers = existingMembers.filter((m: any) => m.email?.toLowerCase() !== memberEmail.toLowerCase());

            await updateDoc(audienceRef, {
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
                updatedAt: serverTimestamp(),
            });

            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                members: updatedMembers,
                staticMemberCount: updatedMembers.length,
                estimatedCount: updatedMembers.length,
            } as UserEmailAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
        } catch (err) {
            console.error('[UserEmailHub] Error removing member:', err);
        }
    };

    return {
        showCreateAudience, setShowCreateAudience,
        newAudienceForm, setNewAudienceForm,
        showImportCSV, setShowImportCSV,
        selectedAudienceId, setSelectedAudienceId,
        manualEmail, setManualEmail,
        csvUploading,
        audienceMembers, setAudienceMembers,
        handleCreateAudience,
        handleDeleteAudience,
        handleCSVUpload,
        handleAddManualEmail,
        handleRemoveMember,
    };
}
