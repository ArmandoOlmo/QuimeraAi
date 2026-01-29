/**
 * AudienceDetailView
 * Vista de detalle de una audiencia con gestión de miembros estáticos
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Users,
    UserPlus,
    Trash2,
    Filter,
    Mail,
    Phone,
    Building2,
    Calendar,
    AlertCircle,
    Loader2,
    Search,
    MoreVertical,
    Edit,
    X,
    Save,
} from 'lucide-react';
import { useEmailAudiences } from '../../../../hooks/useEmailSettings';
import { useCRM } from '../../../../contexts/crm/CRMContext';
import { Lead } from '../../../../types';
import { EmailAudience } from '../../../../types/email';
import AddContactToAudienceModal from '../AddContactToAudienceModal';

interface AudienceDetailViewProps {
    audience: EmailAudience;
    userId: string;
    projectId: string;
    onBack: () => void;
}

const AudienceDetailView: React.FC<AudienceDetailViewProps> = ({
    audience,
    userId,
    projectId,
    onBack,
}) => {
    const { t } = useTranslation();
    const { updateAudience, isSaving } = useEmailAudiences(userId, projectId);
    const { leads, updateLead } = useCRM();

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Edit lead modal state
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '' });
    const [isSavingLead, setIsSavingLead] = useState(false);

    // Get lead details from IDs
    const staticLeadIds = audience.staticMembers?.leadIds || [];
    const staticCustomerIds = audience.staticMembers?.customerIds || [];
    const staticEmails = audience.staticMembers?.emails || [];

    const memberLeads = useMemo(() => {
        return leads
            .filter((lead: Lead) => staticLeadIds.includes(lead.id))
            .filter((lead: Lead) => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return (
                    lead.name?.toLowerCase().includes(search) ||
                    lead.email?.toLowerCase().includes(search) ||
                    lead.company?.toLowerCase().includes(search)
                );
            });
    }, [leads, staticLeadIds, searchTerm]);

    const handleRemoveLead = async (leadId: string) => {
        setRemovingId(leadId);
        try {
            const newLeadIds = staticLeadIds.filter(id => id !== leadId);
            const staticMemberCount = newLeadIds.length + staticCustomerIds.length + staticEmails.length;

            await updateAudience(audience.id!, {
                staticMembers: {
                    leadIds: newLeadIds,
                    customerIds: staticCustomerIds,
                    emails: staticEmails,
                },
                staticMemberCount,
            });
        } catch (err) {
            console.error('Error removing lead from audience:', err);
        } finally {
            setRemovingId(null);
        }
    };

    const handleRemoveEmail = async (email: string) => {
        try {
            const newEmails = staticEmails.filter(e => e !== email);
            const staticMemberCount = staticLeadIds.length + staticCustomerIds.length + newEmails.length;

            await updateAudience(audience.id!, {
                staticMembers: {
                    leadIds: staticLeadIds,
                    customerIds: staticCustomerIds,
                    emails: newEmails,
                },
                staticMemberCount,
            });
        } catch (err) {
            console.error('Error removing email from audience:', err);
        }
    };

    const handleEditLead = (lead: Lead) => {
        setEditingLead(lead);
        setEditForm({
            name: lead.name || '',
            email: lead.email || '',
            phone: lead.phone || '',
            company: lead.company || '',
        });
    };

    const handleSaveLeadChanges = async () => {
        if (!editingLead) return;

        setIsSavingLead(true);
        try {
            await updateLead(editingLead.id, {
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                company: editForm.company,
            });
            setEditingLead(null);
        } catch (err) {
            console.error('Error updating lead:', err);
        } finally {
            setIsSavingLead(false);
        }
    };

    // Detect orphan lead IDs (IDs in audience that don't exist in leads collection)
    const validLeadIds = useMemo(() => {
        const existingLeadIds = new Set(leads.map((l: Lead) => l.id));
        return staticLeadIds.filter(id => existingLeadIds.has(id));
    }, [leads, staticLeadIds]);

    const orphanLeadIds = useMemo(() => {
        const existingLeadIds = new Set(leads.map((l: Lead) => l.id));
        return staticLeadIds.filter(id => !existingLeadIds.has(id));
    }, [leads, staticLeadIds]);

    // Auto-clean orphan IDs - runs once when orphans are detected
    React.useEffect(() => {
        const cleanOrphanIds = async () => {
            if (orphanLeadIds.length > 0 && !isSaving) {
                console.log('[AudienceDetailView] Cleaning orphan lead IDs:', orphanLeadIds);
                try {
                    const staticMemberCount = validLeadIds.length + staticCustomerIds.length + staticEmails.length;
                    await updateAudience(audience.id!, {
                        staticMembers: {
                            leadIds: validLeadIds,
                            customerIds: staticCustomerIds,
                            emails: staticEmails,
                        },
                        staticMemberCount,
                    });
                    console.log('[AudienceDetailView] Orphan IDs cleaned successfully');
                } catch (err) {
                    console.error('Error cleaning orphan IDs:', err);
                }
            }
        };
        cleanOrphanIds();
    }, [orphanLeadIds.length]); // Only run when orphan count changes

    const totalStaticMembers = validLeadIds.length + staticCustomerIds.length + staticEmails.length;
    const totalMembers = (audience.estimatedCount || 0) + totalStaticMembers;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            {audience.name}
                        </h2>
                        {audience.description && (
                            <p className="text-muted-foreground">{audience.description}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <UserPlus size={18} />
                    {t('email.addContact', 'Añadir Contacto')}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="text-primary" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{totalMembers}</p>
                            <p className="text-sm text-muted-foreground">
                                {t('email.totalMembers', 'Miembros Totales')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Filter className="text-blue-500" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{audience.estimatedCount || 0}</p>
                            <p className="text-sm text-muted-foreground">
                                {t('email.dynamicMembers', 'Miembros Dinámicos')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <UserPlus className="text-green-500" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{totalStaticMembers}</p>
                            <p className="text-sm text-muted-foreground">
                                {t('email.staticMembers', 'Miembros Manuales')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dynamic Filters Summary */}
            {audience.filters && audience.filters.length > 0 && (
                <div className="bg-card p-4 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Filter size={18} className="text-primary" />
                        {t('email.dynamicFilters', 'Filtros Dinámicos')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {audience.filters.map((filter, idx) => (
                            <span
                                key={idx}
                                className="inline-block px-3 py-1 text-sm bg-muted rounded-full text-muted-foreground"
                            >
                                {filter.field}: {filter.value}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Static Members Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Users size={18} className="text-primary" />
                        {t('email.staticMembers', 'Miembros Manuales')} ({totalStaticMembers})
                    </h3>

                    {/* Search */}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 w-64">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('common.search', 'Buscar...')}
                            className="flex-1 bg-transparent outline-none text-sm"
                        />
                    </div>
                </div>

                {totalStaticMembers === 0 ? (
                    <div className="p-8 text-center">
                        <AlertCircle className="mx-auto mb-3 text-muted-foreground" size={40} />
                        <h4 className="font-medium text-foreground mb-1">
                            {t('email.noMembers', 'Sin miembros manuales')}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('email.noMembersDesc', 'Esta audiencia no tiene miembros añadidos manualmente')}
                        </p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <UserPlus size={16} />
                            {t('email.addContact', 'Añadir Contacto')}
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {/* Leads Section */}
                        {memberLeads.length > 0 && (
                            <>
                                <div className="px-4 py-2 bg-muted/30">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Leads ({memberLeads.length})
                                    </span>
                                </div>
                                {memberLeads.map((lead: Lead) => (
                                    <div
                                        key={lead.id}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-sm font-medium text-primary">
                                                    {lead.name?.charAt(0)?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    {lead.name || t('common.noName', 'Sin nombre')}
                                                </p>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    {lead.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail size={12} />
                                                            {lead.email}
                                                        </span>
                                                    )}
                                                    {lead.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone size={12} />
                                                            {lead.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {lead.company && (
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex items-center gap-1">
                                                    <Building2 size={12} />
                                                    {lead.company}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleEditLead(lead)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title={t('common.edit', 'Editar')}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveLead(lead.id)}
                                                disabled={removingId === lead.id || isSaving}
                                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                                                title={t('email.removeFromAudience', 'Quitar de Audiencia')}
                                            >
                                                {removingId === lead.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Direct Emails Section */}
                        {staticEmails.length > 0 && (
                            <>
                                <div className="px-4 py-2 bg-muted/30">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {t('email.directEmails', 'Emails Directos')} ({staticEmails.length})
                                    </span>
                                </div>
                                {staticEmails.map((email) => (
                                    <div
                                        key={email}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                <Mail size={16} className="text-muted-foreground" />
                                            </div>
                                            <p className="text-foreground">{email}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveEmail(email)}
                                            disabled={isSaving}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                                            title={t('email.removeFromAudience', 'Quitar de Audiencia')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Add Contact Modal */}
            <AddContactToAudienceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                userId={userId}
                projectId={projectId}
                audience={audience}
                onSuccess={() => {
                    // Refresh handled by realtime listener
                }}
            />

            {/* Edit Lead Modal */}
            {editingLead && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-md">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Edit className="text-primary" size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">
                                    {t('leads.editLead', 'Editar Contacto')}
                                </h3>
                            </div>
                            <button
                                onClick={() => setEditingLead(null)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('common.name', 'Nombre')}
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    <Mail size={14} className="inline-block mr-1" />
                                    {t('common.email', 'Email')}
                                </label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    <Phone size={14} className="inline-block mr-1" />
                                    {t('common.phone', 'Teléfono')}
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Company */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    <Building2 size={14} className="inline-block mr-1" />
                                    {t('common.company', 'Empresa')}
                                </label>
                                <input
                                    type="text"
                                    value={editForm.company}
                                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setEditingLead(null)}
                                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={handleSaveLeadChanges}
                                disabled={isSavingLead}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isSavingLead ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Save size={16} />
                                )}
                                {t('common.save', 'Guardar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudienceDetailView;
