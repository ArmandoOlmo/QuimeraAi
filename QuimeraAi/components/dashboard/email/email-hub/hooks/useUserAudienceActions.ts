/**
 * useUserAudienceActions
 *
 * User-scoped version of useAudienceActions.
 * No dependency on useAdmin() — all operations target user/project collections.
 */

import { useState } from 'react';
import { supabase } from '../../../../../supabase';
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
    const { audiences, setAudiences } = data;

    const [showCreateAudience, setShowCreateAudience] = useState(false);
    const [newAudienceForm, setNewAudienceForm] = useState({ name: '', description: '' });
    const [showImportCSV, setShowImportCSV] = useState(false);
    const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
    const [manualEmail, setManualEmail] = useState('');
    const [csvUploading, setCsvUploading] = useState(false);
    const [audienceMembers, setAudienceMembers] = useState<Record<string, { email: string; name?: string }[]>>({});

    const handleCreateAudience = async () => {
        if (!userId || !projectId || projectId === 'default' || !newAudienceForm.name.trim()) return;
        try {
            const { data: result, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'createAudience',
                    projectId,
                    audience: {
                        name: newAudienceForm.name.trim(),
                        description: newAudienceForm.description.trim(),
                        members: [],
                        staticMembers: { emails: [], members: [] },
                        staticMemberCount: 0,
                        estimatedCount: 0,
                        tags: [],
                        acceptsMarketing: true,
                        source: 'manual',
                        sourceModule: 'email-marketing',
                    },
                },
            });
            if (error) throw error;
            if (result?.success === false) throw new Error(result.error || 'Unable to create audience');

            const audience = mapUserAudienceFromCanonical(result.audience || {}, userId, projectId);
            setAudiences(prev => [audience, ...prev.filter(item => item.id !== audience.id)]);
            setNewAudienceForm({ name: '', description: '' });
            setShowCreateAudience(false);
        } catch (err) {
            console.error('[UserEmailHub] Error creating audience:', err);
        }
    };

    const handleCSVUpload = async (audienceId: string, file: File) => {
        if (!projectId || projectId === 'default') return;
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

            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = readAudienceMembers(audience);
            const existingEmails = new Set(existingMembers.map((m: any) => m.email?.toLowerCase()));
            const uniqueNewMembers = newMembers.filter(m => !existingEmails.has(m.email.toLowerCase()));
            if (uniqueNewMembers.length === 0) {
                setCsvUploading(false);
                setShowImportCSV(false);
                return;
            }

            const { data: result, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'addAudienceMembers',
                    projectId,
                    audienceId,
                    members: uniqueNewMembers,
                },
            });
            if (error) throw error;
            if (result?.success === false) throw new Error(result.error || 'Unable to import audience members');

            const updatedAudience = mapUserAudienceFromCanonical(result.audience || {}, userId, projectId);
            const updatedMembers = readAudienceMembers(updatedAudience);
            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                ...updatedAudience,
            } as UserEmailAudience : a));

            setAudienceMembers(prev => ({ ...prev, [audienceId]: updatedMembers }));
            setShowImportCSV(false);
        } catch (err) {
            console.error('[UserEmailHub] Error importing CSV:', err);
        }
        setCsvUploading(false);
    };

    const handleAddManualEmail = async (audienceId: string) => {
        if (!projectId || projectId === 'default' || !manualEmail.trim() || !manualEmail.includes('@')) return;
        try {
            const audience = audiences.find(a => a.id === audienceId);
            const existingMembers: any[] = readAudienceMembers(audience);
            const exists = existingMembers.some((m: any) => m.email?.toLowerCase() === manualEmail.trim().toLowerCase());
            if (exists) { setManualEmail(''); return; }

            const { data: result, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'addAudienceMembers',
                    projectId,
                    audienceId,
                    members: [{ email: manualEmail.trim(), source: 'manual' }],
                },
            });
            if (error) throw error;
            if (result?.success === false) throw new Error(result.error || 'Unable to add audience member');

            const updatedAudience = mapUserAudienceFromCanonical(result.audience || {}, userId, projectId);
            const updatedMembers = readAudienceMembers(updatedAudience);
            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                ...updatedAudience,
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
                    const { data: result, error } = await supabase.functions.invoke('email-api', {
                        body: {
                            action: 'deleteAudience',
                            projectId,
                            audienceId,
                        },
                    });
                    if (error) throw error;
                    if (result?.success === false) throw new Error(result.error || 'Unable to delete audience');
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
            const audience = audiences.find(a => a.id === audienceId);
            if (!audience || !projectId || projectId === 'default') return;

            const { data: result, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'removeAudienceMembers',
                    projectId,
                    audienceId,
                    emails: [memberEmail],
                },
            });
            if (error) throw error;
            if (result?.success === false) throw new Error(result.error || 'Unable to remove audience member');

            const updatedAudience = mapUserAudienceFromCanonical(result.audience || {}, userId, projectId);
            const updatedMembers = readAudienceMembers(updatedAudience);
            setAudiences(prev => prev.map(a => a.id === audienceId ? {
                ...a,
                ...updatedAudience,
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

function readAudienceMembers(audience: UserEmailAudience | undefined) {
    const anyAudience = audience as any;
    if (Array.isArray(anyAudience?.members)) return anyAudience.members;
    if (Array.isArray(anyAudience?.staticMembers?.members)) return anyAudience.staticMembers.members;
    if (Array.isArray(anyAudience?.static_members?.members)) return anyAudience.static_members.members;
    if (Array.isArray(anyAudience?.staticMembers?.emails)) {
        return anyAudience.staticMembers.emails.map((email: string) => ({ email, source: 'audience-static' }));
    }
    if (Array.isArray(anyAudience?.static_members?.emails)) {
        return anyAudience.static_members.emails.map((email: string) => ({ email, source: 'audience-static' }));
    }
    return [];
}

function mapUserAudienceFromCanonical(
    audience: Record<string, any>,
    userId: string,
    projectId: string,
): UserEmailAudience {
    const staticMembers = audience.staticMembers || audience.static_members || {};
    const members = Array.isArray(staticMembers.members)
        ? staticMembers.members
        : Array.isArray(audience.members)
            ? audience.members
            : [];

    return {
        id: String(audience.id || ''),
        name: String(audience.name || ''),
        description: audience.description || '',
        estimatedCount: Number(audience.estimatedCount ?? audience.estimated_count ?? members.length ?? 0),
        userId,
        projectId,
        createdAt: audience.createdAt || audience.created_at || new Date().toISOString(),
        filters: Array.isArray(audience.filters) ? audience.filters : [],
        tags: Array.isArray(audience.tags) ? audience.tags : [],
        acceptsMarketing: audience.acceptsMarketing ?? audience.accepts_marketing,
        hasOrdered: audience.hasOrdered ?? audience.has_ordered,
        staticMemberCount: Number(audience.staticMemberCount ?? audience.static_member_count ?? members.length ?? 0),
        members,
        ...(staticMembers ? { staticMembers } : {}),
    } as UserEmailAudience;
}
