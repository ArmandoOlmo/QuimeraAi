/**
 * AddToAudienceModal
 * Modal reutilizable para añadir leads o clientes a una audiencia de email
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, Loader2, CheckCircle, AlertTriangle, ChevronDown, Search } from 'lucide-react';
import { useEmailAudiences } from '../../../hooks/useEmailSettings';

interface AddToAudienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    projectId: string;
    // Contacts to add
    leadIds?: string[];
    customerIds?: string[];
    // For display
    contactCount: number;
    contactType: 'leads' | 'customers';
}

const AddToAudienceModal: React.FC<AddToAudienceModalProps> = ({
    isOpen,
    onClose,
    userId,
    projectId,
    leadIds = [],
    customerIds = [],
    contactCount,
    contactType,
}) => {
    const { t } = useTranslation();
    const { audiences, updateAudience, isLoading: loadingAudiences } = useEmailAudiences(userId, projectId);

    const [selectedAudienceId, setSelectedAudienceId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAudiences = audiences.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddToAudience = async () => {
        if (!selectedAudienceId) return;

        setIsSaving(true);
        setError(null);

        try {
            const targetAudience = audiences.find(a => a.id === selectedAudienceId);
            if (!targetAudience) throw new Error('Audiencia no encontrada');

            // Merge existing static members with new ones
            const existingLeadIds = targetAudience.staticMembers?.leadIds || [];
            const existingCustomerIds = targetAudience.staticMembers?.customerIds || [];
            const existingEmails = targetAudience.staticMembers?.emails || [];

            const newLeadIds = [...new Set([...existingLeadIds, ...leadIds])];
            const newCustomerIds = [...new Set([...existingCustomerIds, ...customerIds])];

            const updatedStaticMembers = {
                leadIds: newLeadIds,
                customerIds: newCustomerIds,
                emails: existingEmails,
            };

            const staticMemberCount = newLeadIds.length + newCustomerIds.length + existingEmails.length;

            await updateAudience(selectedAudienceId, {
                staticMembers: updatedStaticMembers,
                staticMemberCount,
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setSelectedAudienceId('');
            }, 1500);
        } catch (err: any) {
            console.error('Error adding to audience:', err);
            setError(err.message || 'Error al agregar a la audiencia');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2.5 rounded-xl">
                                <Users size={22} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">
                                    {t('email.addToAudience', 'Añadir a Audiencia')}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {contactCount} {contactType === 'leads' ? t('leads.leads', 'leads') : t('ecommerce.customers', 'clientes')} {t('email.selected', 'seleccionados')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-xl transition-colors"
                        >
                            <X size={20} className="text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-green-500" />
                            </div>
                            <p className="text-lg font-medium text-foreground">
                                {t('email.addedSuccessfully', '¡Añadido exitosamente!')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('email.searchAudiences', 'Buscar audiencias...')}
                                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                                />
                            </div>

                            {/* Audiences List */}
                            {loadingAudiences ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin text-primary" size={24} />
                                </div>
                            ) : filteredAudiences.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users size={40} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">{t('email.noAudiences', 'No hay audiencias disponibles')}</p>
                                    <p className="text-xs mt-1">{t('email.createAudienceFirst', 'Crea una audiencia primero en la sección de Email')}</p>
                                </div>
                            ) : (
                                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                    {filteredAudiences.map((audience) => (
                                        <button
                                            key={audience.id}
                                            onClick={() => setSelectedAudienceId(audience.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedAudienceId === audience.id
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                                    : 'border-border hover:border-primary/30 hover:bg-muted/30'
                                                }`}
                                        >
                                            <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${selectedAudienceId === audience.id
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground'
                                                }`}>
                                                {selectedAudienceId === audience.id && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground truncate">{audience.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(audience.estimatedCount || 0) + (audience.staticMemberCount || 0)} {t('email.members', 'miembros')}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                                    <p className="text-sm text-red-500">{error}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!success && (
                    <div className="p-5 border-t border-border flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-foreground hover:bg-muted transition-colors font-medium"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            onClick={handleAddToAudience}
                            disabled={!selectedAudienceId || isSaving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            {isSaving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Users size={18} />
                            )}
                            <span>{t('email.addToAudience', 'Añadir')}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddToAudienceModal;
