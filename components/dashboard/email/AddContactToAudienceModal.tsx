/**
 * AddContactToAudienceModal
 * Modal para añadir contactos existentes o crear nuevos a una audiencia
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Users,
    Loader2,
    Search,
    UserPlus,
    Check,
    Mail,
    Phone,
    Building2,
    ChevronRight,
} from 'lucide-react';
import { useEmailAudiences } from '../../../hooks/useEmailSettings';
import { useCRM } from '../../../contexts/crm/CRMContext';
import { Lead } from '../../../types';
import { EmailAudience } from '../../../types/email';

interface AddContactToAudienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    projectId: string;
    audience: EmailAudience;
    onSuccess?: () => void;
}

type TabType = 'existing' | 'new';

const AddContactToAudienceModal: React.FC<AddContactToAudienceModalProps> = ({
    isOpen,
    onClose,
    userId,
    projectId,
    audience,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const { updateAudience, isSaving } = useEmailAudiences(userId, projectId);
    const { leads, addLead } = useCRM();

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('existing');

    // Existing contacts selection
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

    // New contact form
    const [newContact, setNewContact] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
    });
    const [isCreating, setIsCreating] = useState(false);

    // Filter leads that are not already in the audience
    const existingLeadIds = audience.staticMembers?.leadIds || [];
    const availableLeads = useMemo(() => {
        return leads
            .filter((lead: Lead) => lead.projectId === projectId)
            .filter((lead: Lead) => !existingLeadIds.includes(lead.id))
            .filter((lead: Lead) => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return (
                    lead.name?.toLowerCase().includes(search) ||
                    lead.email?.toLowerCase().includes(search) ||
                    lead.company?.toLowerCase().includes(search)
                );
            });
    }, [leads, projectId, existingLeadIds, searchTerm]);

    const toggleLeadSelection = (leadId: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(leadId)
                ? prev.filter(id => id !== leadId)
                : [...prev, leadId]
        );
    };

    const handleAddExistingLeads = async () => {
        if (selectedLeadIds.length === 0) return;

        try {
            const currentLeadIds = audience.staticMembers?.leadIds || [];
            const newLeadIds = [...new Set([...currentLeadIds, ...selectedLeadIds])];
            const currentCustomerIds = audience.staticMembers?.customerIds || [];
            const currentEmails = audience.staticMembers?.emails || [];

            const staticMemberCount = newLeadIds.length + currentCustomerIds.length + currentEmails.length;

            await updateAudience(audience.id!, {
                staticMembers: {
                    leadIds: newLeadIds,
                    customerIds: currentCustomerIds,
                    emails: currentEmails,
                },
                staticMemberCount,
            });

            setSelectedLeadIds([]);
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error adding leads to audience:', err);
        }
    };

    const handleCreateAndAddContact = async () => {
        if (!newContact.name || !newContact.email) return;

        setIsCreating(true);
        try {
            // Create the lead in the CRM (uses CRMContext which saves to project path)
            const newLeadId = await addLead({
                name: newContact.name,
                email: newContact.email,
                phone: newContact.phone || '',
                company: newContact.company || '',
                status: 'new',
                source: 'manual',
                value: 0,
                notes: '',
                tags: ['from_audience'],
            });

            if (!newLeadId) {
                console.error('Error: addLead did not return an ID');
                return;
            }

            // Add the new lead to the audience
            const currentLeadIds = audience.staticMembers?.leadIds || [];
            const newLeadIds = [...currentLeadIds, newLeadId];
            const currentCustomerIds = audience.staticMembers?.customerIds || [];
            const currentEmails = audience.staticMembers?.emails || [];

            const staticMemberCount = newLeadIds.length + currentCustomerIds.length + currentEmails.length;

            await updateAudience(audience.id!, {
                staticMembers: {
                    leadIds: newLeadIds,
                    customerIds: currentCustomerIds,
                    emails: currentEmails,
                },
                staticMemberCount,
            });

            setNewContact({ name: '', email: '', phone: '', company: '' });
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error creating and adding contact:', err);
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="text-primary" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">
                                {t('email.addContact', 'Añadir Contacto')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {audience.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X size={20} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('existing')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'existing'
                            ? 'text-primary border-b-2 border-primary bg-primary/5'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Users size={16} className="inline-block mr-2" />
                        {t('email.selectExisting', 'Seleccionar Existente')}
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'new'
                            ? 'text-primary border-b-2 border-primary bg-primary/5'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <UserPlus size={16} className="inline-block mr-2" />
                        {t('email.createNew', 'Crear Nuevo')}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'existing' ? (
                        <div className="space-y-4">
                            {/* Search */}
                            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                                <Search className="w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('email.searchLeads', 'Buscar leads...')}
                                    className="flex-1 bg-transparent outline-none text-sm"
                                />
                            </div>

                            {/* Leads list */}
                            {availableLeads.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="mx-auto mb-2" size={32} />
                                    <p className="text-sm">
                                        {searchTerm
                                            ? t('email.noLeadsMatchSearch', 'No se encontraron leads')
                                            : t('email.noAvailableLeads', 'No hay leads disponibles para añadir')
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {availableLeads.map((lead: Lead) => (
                                        <button
                                            key={lead.id}
                                            onClick={() => toggleLeadSelection(lead.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedLeadIds.includes(lead.id)
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedLeadIds.includes(lead.id)
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-muted-foreground'
                                                }`}>
                                                {selectedLeadIds.includes(lead.id) && <Check size={12} />}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-medium text-foreground">{lead.name || 'Sin nombre'}</p>
                                                <p className="text-sm text-muted-foreground">{lead.email}</p>
                                            </div>
                                            {lead.company && (
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                                    {lead.company}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedLeadIds.length > 0 && (
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
                                    <span className="text-sm text-primary font-medium">
                                        {selectedLeadIds.length} {t('email.contactsSelected', 'contacto(s) seleccionado(s)')}
                                    </span>
                                    <ChevronRight size={16} className="text-primary" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('email.createNewContactDesc', 'El nuevo contacto se creará como Lead en el CRM y se añadirá a esta audiencia.')}
                            </p>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('common.name', 'Nombre')} *
                                </label>
                                <input
                                    type="text"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    <Mail size={14} className="inline-block mr-1" />
                                    {t('common.email', 'Email')} *
                                </label>
                                <input
                                    type="email"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                    placeholder="john@example.com"
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
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                    placeholder="+1 234 567 890"
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
                                    value={newContact.company}
                                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                                    placeholder="Acme Inc."
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                    >
                        {t('common.cancel', 'Cancelar')}
                    </button>
                    {activeTab === 'existing' ? (
                        <button
                            onClick={handleAddExistingLeads}
                            disabled={selectedLeadIds.length === 0 || isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving && <Loader2 size={16} className="animate-spin" />}
                            {t('email.addSelected', 'Añadir Seleccionados')} ({selectedLeadIds.length})
                        </button>
                    ) : (
                        <button
                            onClick={handleCreateAndAddContact}
                            disabled={!newContact.name || !newContact.email || isCreating}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating && <Loader2 size={16} className="animate-spin" />}
                            {t('email.createAndAdd', 'Crear y Añadir')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddContactToAudienceModal;
