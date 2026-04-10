/**
 * useAudienceActions
 *
 * Custom hook for audience management operations:
 * create, delete, add members (manual/CSV/registered users), remove members.
 */

import { useState } from 'react';
import { useAuth } from '../../../../../contexts/core/AuthContext';
import { useAdmin } from '../../../../../contexts/admin/AdminContext';
import {
    db, doc, addDoc, updateDoc, deleteDoc, collection,
} from '../../../../../firebase';
import { serverTimestamp } from 'firebase/firestore';
import type { CrossTenantAudience, ConfirmModalState } from '../types';
import type { AdminEmailDataReturn } from './useAdminEmailData';

export interface AudienceActionsReturn {
    // State
    showCreateAudience: boolean;
    setShowCreateAudience: (v: boolean) => void;
    newAudienceForm: { name: string; description: string };
    setNewAudienceForm: React.Dispatch<React.SetStateAction<{ name: string; description: string }>>;
    showImportCSV: boolean;
    setShowImportCSV: (v: boolean) => void;
    showAddUsers: boolean;
    setShowAddUsers: (v: boolean) => void;
    selectedAudienceId: string | null;
    setSelectedAudienceId: (v: string | null) => void;
    manualEmail: string;
    setManualEmail: (v: string) => void;
    csvUploading: boolean;
    audienceMembers: Record<string, { email: string; name?: string }[]>;
    setAudienceMembers: React.Dispatch<React.SetStateAction<Record<string, { email: string; name?: string }[]>>>;
    addUserSearch: string;
    setAddUserSearch: (v: string) => void;
    addUserSelectedIds: string[];
    setAddUserSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;

    // Handlers
    handleCreateAudience: () => Promise<void>;
    handleDeleteAudience: (audienceId: string, setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>) => void;
    handleAddRegisteredUsers: (audienceId: string, selectedUserIds: string[]) => Promise<void>;
    handleCSVUpload: (audienceId: string, file: File) => Promise<void>;
    handleAddManualEmail: (audienceId: string) => Promise<void>;
    handleRemoveMember: (audienceId: string, memberEmail: string) => Promise<void>;
}

export function useAudienceActions(data: AdminEmailDataReturn): AudienceActionsReturn {
    const { user } = useAuth();
    const { allUsers, fetchAllUsers } = useAdmin();
    const { audiences, setAudiences } = data;

    const [showCreateAudience, setShowCreateAudience] = useState(false);
    const [newAudienceForm, setNewAudienceForm] = useState({ name: '', description: '' });
    const [showImportCSV, setShowImportCSV] = useState(false);
    const [showAddUsers, setShowAddUsers] = useState(false);
    const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
    const [manualEmail, setManualEmail] = useState('');
    const [csvUploading, setCsvUploading] = useState(false);
    const [audienceMembers, setAudienceMembers] = useState<Record<string, { email: string; name?: string }[]>>({});
    const [addUserSearch, setAddUserSearch] = useState('');
    const [addUserSelectedIds, setAddUserSelectedIds] = useState<string[]>([]);

    const handleCreateAudience = async () => {
        if (!newAudienceForm.name.trim()) return;
        try {
            const docRef = await addDoc(collection(db, 'adminEmailAudiences'), {
                name: newAudienceForm.name.trim(),
                description: newAudienceForm.description.trim(),
                members: [],
                staticMemberCount: 0,
                estimatedCount: 0,
                tags: [],
                acceptsMarketing: true,
                source: 'manual',
                createdBy: user?.uid || 'admin',
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
                source: 'manual',
                createdBy: user?.uid || 'admin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: user?.uid || 'admin',
                projectId: 'admin',
            } as CrossTenantAudience, ...prev]);
            setNewAudienceForm({ name: '', description: '' });
            setShowCreateAudience(false);
        } catch (err) {
            console.error('[AdminEmailHub] Error creating audience:', err);
        }
    };

    const handleAddRegisteredUsers = async (audienceId: string, selectedUserIds: string[]) => {
        try {
            const selectedUsers = allUsers.filter(u => selectedUserIds.includes(u.id));
            const newMembers = selectedUsers.map(u => ({
                email: u.email,
                name: u.displayName || u.name || '',
                userId: u.id,
                source: 'registered' as const,
            }));

            const audienceRef = doc(db, 'adminEmailAudiences', audienceId);
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
            } as CrossTenantAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setShowAddUsers(false);
        } catch (err) {
            console.error('[AdminEmailHub] Error adding users:', err);
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

            const audienceRef = doc(db, 'adminEmailAudiences', audienceId);
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
            } as CrossTenantAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setShowImportCSV(false);
        } catch (err) {
            console.error('[AdminEmailHub] Error importing CSV:', err);
        }
        setCsvUploading(false);
    };

    const handleAddManualEmail = async (audienceId: string) => {
        if (!manualEmail.trim() || !manualEmail.includes('@')) return;
        try {
            const audienceRef = doc(db, 'adminEmailAudiences', audienceId);
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
            } as CrossTenantAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setManualEmail('');
        } catch (err) {
            console.error('[AdminEmailHub] Error adding email:', err);
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
                    await deleteDoc(doc(db, 'adminEmailAudiences', audienceId));
                    setAudiences(prev => prev.filter(a => a.id !== audienceId));
                } catch (err) {
                    console.error('[AdminEmailHub] Error deleting audience:', err);
                }
                setConfirmModal(prev => ({ ...prev, show: false }));
            },
        });
    };

    const handleRemoveMember = async (audienceId: string, memberEmail: string) => {
        try {
            const audienceRef = doc(db, 'adminEmailAudiences', audienceId);
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
            } as CrossTenantAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
        } catch (err) {
            console.error('[AdminEmailHub] Error removing member:', err);
        }
    };

    return {
        showCreateAudience, setShowCreateAudience,
        newAudienceForm, setNewAudienceForm,
        showImportCSV, setShowImportCSV,
        showAddUsers, setShowAddUsers,
        selectedAudienceId, setSelectedAudienceId,
        manualEmail, setManualEmail,
        csvUploading,
        audienceMembers, setAudienceMembers,
        addUserSearch, setAddUserSearch,
        addUserSelectedIds, setAddUserSelectedIds,
        handleCreateAudience,
        handleDeleteAudience,
        handleAddRegisteredUsers,
        handleCSVUpload,
        handleAddManualEmail,
        handleRemoveMember,
    };
}
