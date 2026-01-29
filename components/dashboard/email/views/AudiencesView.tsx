/**
 * AudiencesView
 * Vista para gestionar audiencias/segmentos de email
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    PlusCircle,
    Search,
    Edit,
    Trash2,
    Copy,
    ShoppingCart,
    Mail,
    Tag,
    Calendar,
    X,
    Loader2,
    DollarSign,
    Clock,
    Eye,
    ChevronRight,
} from 'lucide-react';
import { useEmailDashboardContext } from '../EmailDashboard';
import { useEmailAudiences } from '../../../../hooks/useEmailSettings';
import { EmailAudience } from '../../../../types/email';
import AudienceDetailView from './AudienceDetailView';

type FilterType = 'all' | 'marketing' | 'orders' | 'spending' | 'inactive';

const AudiencesView: React.FC = () => {
    const { t } = useTranslation();
    const { userId, projectId } = useEmailDashboardContext();
    const {
        audiences,
        isLoading,
        isSaving,
        createAudience,
        updateAudience,
        deleteAudience,
        duplicateAudience
    } = useEmailAudiences(userId, projectId);

    const [searchTerm, setSearchTerm] = useState('');
    const [showNewAudienceModal, setShowNewAudienceModal] = useState(false);
    const [editingAudience, setEditingAudience] = useState<Partial<EmailAudience> | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedAudience, setSelectedAudience] = useState<EmailAudience | null>(null);
    const [newAudience, setNewAudience] = useState({
        name: '',
        description: '',
        filterType: 'all' as FilterType,
        acceptsMarketing: true,
        minOrders: '',
        minTotalSpent: '',
        lastOrderDaysAgo: '',
    });

    const filteredAudiences = audiences.filter((audience) =>
        audience.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audience.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getAudienceIcon = (audience: Partial<EmailAudience>) => {
        if (audience.minOrders) return ShoppingCart;
        if (audience.minTotalSpent) return DollarSign;
        if (audience.lastOrderDaysAgo) return Clock;
        if (audience.acceptsMarketing) return Mail;
        return Users;
    };

    const resetForm = () => {
        setNewAudience({
            name: '',
            description: '',
            filterType: 'all',
            acceptsMarketing: true,
            minOrders: '',
            minTotalSpent: '',
            lastOrderDaysAgo: '',
        });
        setEditingAudience(null);
    };

    const handleOpenModal = (audience?: Partial<EmailAudience>) => {
        if (audience) {
            setEditingAudience(audience);
            let filterType: FilterType = 'all';
            if (audience.minOrders) filterType = 'orders';
            else if (audience.minTotalSpent) filterType = 'spending';
            else if (audience.lastOrderDaysAgo) filterType = 'inactive';
            else if (audience.acceptsMarketing) filterType = 'marketing';

            setNewAudience({
                name: audience.name || '',
                description: audience.description || '',
                filterType,
                acceptsMarketing: audience.acceptsMarketing ?? true,
                minOrders: audience.minOrders?.toString() || '',
                minTotalSpent: audience.minTotalSpent?.toString() || '',
                lastOrderDaysAgo: audience.lastOrderDaysAgo?.toString() || '',
            });
        } else {
            resetForm();
        }
        setShowNewAudienceModal(true);
    };

    const handleCloseModal = () => {
        setShowNewAudienceModal(false);
        resetForm();
    };

    const handleSaveAudience = async () => {
        if (!newAudience.name) return;

        const audienceData: any = {
            name: newAudience.name,
            description: newAudience.description,
        };

        // Apply filters based on type
        switch (newAudience.filterType) {
            case 'marketing':
                audienceData.acceptsMarketing = true;
                break;
            case 'orders':
                if (newAudience.minOrders) {
                    audienceData.minOrders = parseInt(newAudience.minOrders);
                }
                break;
            case 'spending':
                if (newAudience.minTotalSpent) {
                    audienceData.minTotalSpent = parseFloat(newAudience.minTotalSpent);
                }
                break;
            case 'inactive':
                if (newAudience.lastOrderDaysAgo) {
                    audienceData.lastOrderDaysAgo = parseInt(newAudience.lastOrderDaysAgo);
                }
                break;
        }

        try {
            if (editingAudience?.id) {
                await updateAudience(editingAudience.id, audienceData);
            } else {
                await createAudience(audienceData);
            }
            handleCloseModal();
        } catch (err) {
            console.error('Error saving audience:', err);
        }
    };

    const handleDeleteAudience = (audienceId: string, isDefault?: boolean) => {
        if (isDefault) return;
        setDeleteConfirmId(audienceId);
    };

    const confirmDeleteAudience = async () => {
        if (!deleteConfirmId) return;
        setIsDeleting(true);
        try {
            await deleteAudience(deleteConfirmId);
        } catch (err) {
            console.error('Error deleting audience:', err);
        } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const cancelDeleteAudience = () => {
        if (!isDeleting) {
            setDeleteConfirmId(null);
        }
    };

    const handleDuplicateAudience = async (audienceId: string) => {
        await duplicateAudience(audienceId);
    };

    // Keep selectedAudience in sync with updated audiences from Firestore
    React.useEffect(() => {
        if (selectedAudience && audiences) {
            const updatedAudience = audiences.find(a => a.id === selectedAudience.id);
            if (updatedAudience && JSON.stringify(updatedAudience) !== JSON.stringify(selectedAudience)) {
                setSelectedAudience(updatedAudience as EmailAudience);
            }
        }
    }, [audiences, selectedAudience]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    // Show Audience Detail View if an audience is selected
    if (selectedAudience) {
        return (
            <AudienceDetailView
                audience={selectedAudience}
                userId={userId}
                projectId={projectId}
                onBack={() => setSelectedAudience(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        {t('email.audiences', 'Audiencias')}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {t('email.audiencesSubtitle', 'Segmenta tus contactos para envíos personalizados')}
                    </p>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <PlusCircle size={18} />
                    {t('email.newAudience', 'Nuevo Segmento')}
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 max-w-md bg-editor-border/40 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('email.searchAudiences', 'Buscar audiencias...')}
                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Audiences Grid */}
            {filteredAudiences.length === 0 ? (
                <div className="text-center py-12 bg-card/50 border border-border rounded-xl">
                    <Users className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('email.noAudiences', 'No hay audiencias')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t('email.noAudiencesDesc', 'Crea segmentos para enviar emails más relevantes')}
                    </p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <PlusCircle size={18} />
                        {t('email.createFirstAudience', 'Crear Primer Segmento')}
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAudiences.map((audience) => {
                        const Icon = getAudienceIcon(audience);
                        return (
                            <div
                                key={audience.id}
                                onClick={() => setSelectedAudience(audience as EmailAudience)}
                                className="bg-card/50 border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Icon className="text-primary" size={20} />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(audience)}
                                            className="p-1.5 hover:bg-muted rounded-lg"
                                            title={t('email.edit', 'Editar')}
                                        >
                                            <Edit size={14} className="text-muted-foreground" />
                                        </button>
                                        <button
                                            onClick={() => handleDuplicateAudience(audience.id!)}
                                            className="p-1.5 hover:bg-muted rounded-lg"
                                            title={t('email.duplicate', 'Duplicar')}
                                        >
                                            <Copy size={14} className="text-muted-foreground" />
                                        </button>
                                        {!audience.isDefault && (
                                            <button
                                                onClick={() => handleDeleteAudience(audience.id!, audience.isDefault)}
                                                className="p-1.5 hover:bg-red-500/20 rounded-lg"
                                                title={t('email.delete', 'Eliminar')}
                                            >
                                                <Trash2 size={14} className="text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-foreground font-semibold mb-1">
                                    {audience.name}
                                    {audience.isDefault && (
                                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                            Default
                                        </span>
                                    )}
                                </h3>
                                <p className="text-muted-foreground text-sm mb-3">
                                    {audience.description}
                                </p>

                                {/* Filter info */}
                                <div className="text-xs text-muted-foreground mb-3 space-y-1">
                                    {audience.minOrders && (
                                        <div className="flex items-center gap-1">
                                            <ShoppingCart size={12} />
                                            <span>Min. {audience.minOrders} pedidos</span>
                                        </div>
                                    )}
                                    {audience.minTotalSpent && (
                                        <div className="flex items-center gap-1">
                                            <DollarSign size={12} />
                                            <span>Min. ${audience.minTotalSpent} gastado</span>
                                        </div>
                                    )}
                                    {audience.lastOrderDaysAgo && (
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            <span>Sin compras en {audience.lastOrderDaysAgo} días</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Users size={14} className="text-muted-foreground" />
                                        <span className="text-foreground font-medium">
                                            {((audience.estimatedCount || 0) + (audience.staticMemberCount || 0)).toLocaleString()}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {t('email.contacts', 'contactos')}
                                        </span>
                                        {(audience.staticMemberCount || 0) > 0 && (
                                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                                                +{audience.staticMemberCount} {t('email.manual', 'manual')}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAudience(audience as EmailAudience);
                                        }}
                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        <Eye size={12} />
                                        {t('email.viewDetail', 'Ver Detalle')}
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* New/Edit Audience Modal */}
            {showNewAudienceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground">
                                {editingAudience
                                    ? t('email.editAudience', 'Editar Segmento')
                                    : t('email.newAudience', 'Nuevo Segmento')
                                }
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('email.audienceName', 'Nombre del segmento')} *
                                </label>
                                <input
                                    type="text"
                                    value={newAudience.name}
                                    onChange={(e) => setNewAudience({ ...newAudience, name: e.target.value })}
                                    placeholder="Ej: Clientes VIP"
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('email.description', 'Descripción')}
                                </label>
                                <textarea
                                    value={newAudience.description}
                                    onChange={(e) => setNewAudience({ ...newAudience, description: e.target.value })}
                                    placeholder="Describe este segmento..."
                                    rows={2}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </div>

                            {/* Filter Type */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    {t('email.filterType', 'Tipo de filtro')}
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { value: 'all', label: 'Todos', icon: Users },
                                        { value: 'marketing', label: 'Acepta Marketing', icon: Mail },
                                        { value: 'orders', label: 'Por Pedidos', icon: ShoppingCart },
                                        { value: 'spending', label: 'Por Gasto', icon: DollarSign },
                                        { value: 'inactive', label: 'Inactivos', icon: Clock },
                                    ].map((type) => {
                                        const TypeIcon = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                onClick={() => setNewAudience({ ...newAudience, filterType: type.value as FilterType })}
                                                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${newAudience.filterType === type.value
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-border hover:bg-muted text-foreground'
                                                    }`}
                                            >
                                                <TypeIcon size={16} />
                                                <span className="text-sm">{type.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Conditional fields based on filter type */}
                            {newAudience.filterType === 'orders' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        {t('email.minOrders', 'Mínimo de pedidos')}
                                    </label>
                                    <input
                                        type="number"
                                        value={newAudience.minOrders}
                                        onChange={(e) => setNewAudience({ ...newAudience, minOrders: e.target.value })}
                                        placeholder="Ej: 3"
                                        min="1"
                                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            )}

                            {newAudience.filterType === 'spending' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        {t('email.minSpent', 'Mínimo gastado ($)')}
                                    </label>
                                    <input
                                        type="number"
                                        value={newAudience.minTotalSpent}
                                        onChange={(e) => setNewAudience({ ...newAudience, minTotalSpent: e.target.value })}
                                        placeholder="Ej: 500"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            )}

                            {newAudience.filterType === 'inactive' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        {t('email.inactiveDays', 'Días sin compras')}
                                    </label>
                                    <input
                                        type="number"
                                        value={newAudience.lastOrderDaysAgo}
                                        onChange={(e) => setNewAudience({ ...newAudience, lastOrderDaysAgo: e.target.value })}
                                        placeholder="Ej: 60"
                                        min="1"
                                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={handleSaveAudience}
                                disabled={!newAudience.name || isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                {editingAudience
                                    ? t('common.save', 'Guardar')
                                    : t('email.createAudience', 'Crear Segmento')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Audience Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500 mx-auto">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-center text-foreground mb-2">
                                {t('email.deleteAudienceTitle', '¿Eliminar audiencia?')}
                            </h3>
                            <p className="text-center text-muted-foreground mb-6">
                                {t('email.deleteAudienceMessage', 'Esta acción no se puede deshacer. La audiencia será eliminada permanentemente.')}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={cancelDeleteAudience}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-medium text-sm"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    onClick={confirmDeleteAudience}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium text-sm flex items-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {t('common.deleting', 'Eliminando...')}
                                        </>
                                    ) : (
                                        <>
                                            {t('common.delete', 'Eliminar')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudiencesView;
