/**
 * AddToAudienceModal
 *
 * Reusable modal for adding contacts (from Leads, Appointments, etc.)
 * to an email audience in the Admin Email Hub.
 *
 * This component is self-contained and routes writes through the canonical
 * Email Engine API so it can be used from modules outside the Email Hub.
 */

import React, { useState, useEffect } from 'react';
import {
    X, Users, Plus, Search, CheckCircle2, Mail,
    Loader2, UserPlus, Sparkles,
} from 'lucide-react';
import { supabase } from '@/supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface AudienceContact {
    email: string;
    name?: string;
    source?: string;
}

interface ExistingAudience {
    id: string;
    name: string;
    description?: string;
    memberCount: number;
    members?: { email: string; name?: string }[];
}

interface AddToAudienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: AudienceContact[];
    projectId?: string | null;
    title?: string;
    description?: string;
    onSuccess?: (audienceName: string, addedCount: number) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AddToAudienceModal: React.FC<AddToAudienceModalProps> = ({
    isOpen,
    onClose,
    contacts,
    projectId,
    title = 'Añadir a Audiencia de Email',
    description,
    onSuccess,
}) => {
    // State
    const [audiences, setAudiences] = useState<ExistingAudience[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [showCreateNew, setShowCreateNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Load project-scoped audiences through the canonical Email Engine API.
    useEffect(() => {
        if (!isOpen) return;
        setIsLoading(true);
        setResult(null);
        setSelectedAudienceId(null);
        setShowCreateNew(false);

        const loadAudiences = async () => {
            try {
                if (!projectId) {
                    setAudiences([]);
                    setResult({
                        success: false,
                        message: 'Selecciona un proyecto para usar audiencias del Email Engine.',
                    });
                    return;
                }

                const { data, error } = await supabase.functions.invoke('email-api', {
                    body: {
                        action: 'getAudiences',
                        projectId,
                    },
                });
                if (error) throw error;
                if (data?.success === false) throw new Error(data.error || 'Error al cargar audiencias.');

                const loaded: ExistingAudience[] = (data?.audiences || []).map((audience: any) => {
                    const staticMembers = audience.static_members || audience.staticMembers || {};
                    const members = Array.isArray(staticMembers.members)
                        ? staticMembers.members
                        : Array.isArray(audience.members)
                            ? audience.members
                            : [];
                    return {
                        id: audience.id,
                        name: audience.name || 'Sin nombre',
                        description: audience.description || '',
                        memberCount: audience.static_member_count || audience.staticMemberCount || audience.estimated_count || audience.estimatedCount || members.length,
                        members,
                    };
                });
                setAudiences(loaded.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (err) {
                console.error('[AddToAudienceModal] Error loading audiences:', err);
                setResult({ success: false, message: 'Error al cargar audiencias del Email Engine.' });
            } finally {
                setIsLoading(false);
            }
        };
        loadAudiences();
    }, [isOpen, projectId]);

    // Filter
    const filteredAudiences = audiences.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    // Valid contacts only
    const validContacts = contacts.filter(c => c.email && c.email.includes('@'));

    // Add to existing audience
    const handleAddToAudience = async () => {
        if (!projectId || !selectedAudienceId || validContacts.length === 0) return;
        setIsAdding(true);
        try {
            const audience = audiences.find(a => a.id === selectedAudienceId);
            if (!audience) throw new Error('Audience not found');

            const members = validContacts.map(c => ({
                email: c.email,
                name: c.name || '',
                source: c.source || 'cross-module',
                metadata: { sourceModule: c.source || 'cross-module' },
            }));

            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'addAudienceMembers',
                    projectId,
                    audienceId: selectedAudienceId,
                    members,
                },
            });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Error al añadir contactos.');

            setResult({
                success: true,
                message: `${validContacts.length} contacto${validContacts.length > 1 ? 's' : ''} enviado${validContacts.length > 1 ? 's' : ''} a "${audience.name}".`,
            });
            onSuccess?.(audience.name, validContacts.length);
        } catch (err) {
            console.error('[AddToAudienceModal] Error:', err);
            setResult({ success: false, message: 'Error al añadir contactos.' });
        }
        setIsAdding(false);
    };

    // Create new audience with contacts
    const handleCreateAndAdd = async () => {
        if (!projectId || !newName.trim() || validContacts.length === 0) return;
        setIsAdding(true);
        try {
            const members = validContacts.map(c => ({
                email: c.email,
                name: c.name || '',
                source: c.source || 'cross-module',
                metadata: { sourceModule: c.source || 'cross-module' },
            }));

            const { data, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'createAudience',
                    projectId,
                    audience: {
                        name: newName.trim(),
                        description: newDescription.trim(),
                        members,
                        staticMemberCount: members.length,
                        estimatedCount: members.length,
                        tags: [],
                        acceptsMarketing: true,
                        source: 'cross-module',
                        sourceModule: 'cross-module',
                        needsReview: false,
                    },
                },
            });
            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Error al crear la audiencia.');

            setResult({
                success: true,
                message: `Audiencia "${newName.trim()}" creada con ${members.length} contacto${members.length > 1 ? 's' : ''}.`,
            });
            onSuccess?.(newName.trim(), members.length);
        } catch (err) {
            console.error('[AddToAudienceModal] Error creating audience:', err);
            setResult({ success: false, message: 'Error al crear la audiencia.' });
        }
        setIsAdding(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-q-text/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-q-bg border border-q-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-scale-in"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-q-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Mail size={20} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">{title}</h3>
                                {description && (
                                    <p className="text-xs text-q-text-muted mt-0.5">{description}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-secondary text-q-text-muted hover:text-foreground transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Contact summary */}
                    <div className="px-6 py-3 bg-secondary/30 border-b border-q-border">
                        <div className="flex items-center gap-2 text-sm">
                            <UserPlus size={14} className="text-primary" />
                            <span className="font-medium text-foreground">
                                {validContacts.length} contacto{validContacts.length !== 1 ? 's' : ''} a añadir
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {validContacts.slice(0, 5).map((c, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                                >
                                    <Mail size={10} />
                                    {c.name || c.email}
                                </span>
                            ))}
                            {validContacts.length > 5 && (
                                <span className="text-xs text-q-text-muted">
                                    +{validContacts.length - 5} más
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {/* Result message */}
                        {result && (
                            <div className={`mb-4 p-4 rounded-xl border ${
                                result.success
                                    ? 'bg-q-success/10 border-q-success/20 text-q-success dark:text-q-success'
                                    : 'bg-q-error/10 border-q-error/20 text-q-error dark:text-q-error'
                            }`}>
                                <p className="text-sm font-medium">{result.message}</p>
                                <button
                                    onClick={onClose}
                                    className="mt-3 w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}

                        {!result && (
                            <>
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                    </div>
                                ) : showCreateNew ? (
                                    /* Create new audience form */
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => setShowCreateNew(false)}
                                            className="text-sm text-q-text-muted hover:text-foreground transition-colors"
                                        >
                                            ← Volver a la lista
                                        </button>
                                        <div>
                                            <label className="text-xs font-semibold text-q-text-muted uppercase tracking-wider mb-1.5 block">
                                                Nombre de la audiencia
                                            </label>
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={e => setNewName(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-secondary border border-q-border rounded-xl text-sm text-foreground placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                placeholder="Ej: Leads calificados Q2"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-q-text-muted uppercase tracking-wider mb-1.5 block">
                                                Descripción (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={newDescription}
                                                onChange={e => setNewDescription(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-secondary border border-q-border rounded-xl text-sm text-foreground placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                placeholder="Descripción breve..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* Audience list */
                                    <div className="space-y-3">
                                        {/* Search */}
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-q-text-muted" />
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-q-border rounded-xl text-sm text-foreground placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                placeholder="Buscar audiencia..."
                                            />
                                        </div>

                                        {/* Create new button */}
                                        <button
                                            onClick={() => setShowCreateNew(true)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-q-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                        >
                                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                <Plus size={16} className="text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-foreground">Crear nueva audiencia</p>
                                                <p className="text-xs text-q-text-muted">Con los contactos seleccionados</p>
                                            </div>
                                        </button>

                                        {/* Audience list */}
                                        <div className="space-y-1.5">
                                            {filteredAudiences.map(audience => (
                                                <button
                                                    key={audience.id}
                                                    onClick={() => setSelectedAudienceId(
                                                        selectedAudienceId === audience.id ? null : audience.id
                                                    )}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                        selectedAudienceId === audience.id
                                                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                            : 'border-q-border hover:border-muted-foreground/30 hover:bg-secondary/50'
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                        selectedAudienceId === audience.id
                                                            ? 'border-primary bg-primary'
                                                            : 'border-muted-foreground/30'
                                                    }`}>
                                                        {selectedAudienceId === audience.id && (
                                                            <CheckCircle2 size={12} className="text-primary-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">
                                                            {audience.name}
                                                        </p>
                                                        {audience.description && (
                                                            <p className="text-xs text-q-text-muted truncate">
                                                                {audience.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-q-text-muted bg-secondary px-2 py-0.5 rounded-full flex-shrink-0">
                                                        <Users size={10} className="inline mr-1" />
                                                        {audience.memberCount}
                                                    </span>
                                                </button>
                                            ))}

                                            {filteredAudiences.length === 0 && !isLoading && (
                                                <div className="text-center py-8">
                                                    <Users className="mx-auto h-10 w-10 text-q-text-muted/30 mb-2" />
                                                    <p className="text-sm text-q-text-muted">
                                                        {search ? 'Sin resultados' : 'No hay audiencias. Crea una nueva.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!result && (
                        <div className="px-6 py-4 border-t border-q-border flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={showCreateNew ? handleCreateAndAdd : handleAddToAudience}
                                disabled={
                                    isAdding ||
                                    !projectId ||
                                    validContacts.length === 0 ||
                                    (showCreateNew ? !newName.trim() : !selectedAudienceId)
                                }
                                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isAdding ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Añadiendo...
                                    </>
                                ) : showCreateNew ? (
                                    <>
                                        <Sparkles size={14} />
                                        Crear y Añadir
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={14} />
                                        Añadir a Audiencia
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AddToAudienceModal;
