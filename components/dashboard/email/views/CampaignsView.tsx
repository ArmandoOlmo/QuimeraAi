/**
 * CampaignsView
 * Vista para gestionar campañas de email marketing
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Send,
    PlusCircle,
    Search,
    Edit,
    Trash2,
    Copy,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    Mail,
    Pause,
    Loader2,
    X,
} from 'lucide-react';
import { useEmailDashboardContext } from '../EmailDashboard';
import { useEmailCampaigns } from '../../../../hooks/useEmailSettings';
import { CampaignStatus } from '../../../../types/email';

const CampaignsView: React.FC = () => {
    const { t } = useTranslation();
    const { userId, projectId } = useEmailDashboardContext();
    const { campaigns, isLoading, isSaving, createCampaign, deleteCampaign } = useEmailCampaigns(userId, projectId);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        subject: '',
        type: 'newsletter',
        content: '',
    });

    const filteredCampaigns = campaigns.filter((campaign) => {
        const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            campaign.subject?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: CampaignStatus | undefined) => {
        const statusConfig: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
            draft: { label: 'Borrador', color: 'bg-gray-500/20 text-gray-400', icon: Edit },
            scheduled: { label: 'Programada', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
            sending: { label: 'Enviando', color: 'bg-amber-500/20 text-amber-400', icon: Send },
            sent: { label: 'Enviada', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
            cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400', icon: XCircle },
            paused: { label: 'Pausada', color: 'bg-orange-500/20 text-orange-400', icon: Pause },
        };

        const config = statusConfig[status || 'draft'];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };

    const handleCreateCampaign = async () => {
        if (!newCampaign.name || !newCampaign.subject) return;

        try {
            await createCampaign(newCampaign);
            setShowNewCampaignModal(false);
            setNewCampaign({ name: '', subject: '', type: 'newsletter', content: '' });
        } catch (err) {
            console.error('Error creating campaign:', err);
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        if (confirm(t('email.confirmDelete', '¿Estás seguro de eliminar esta campaña?'))) {
            await deleteCampaign(campaignId);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        {t('email.campaigns', 'Campañas')}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {t('email.campaignsSubtitle', 'Crea y gestiona tus campañas de email')}
                    </p>
                </div>

                <button
                    onClick={() => setShowNewCampaignModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <PlusCircle size={18} />
                    {t('email.newCampaign', 'Nueva Campaña')}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('email.searchCampaigns', 'Buscar campañas...')}
                        className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
                    className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="all">{t('email.allStatuses', 'Todos los estados')}</option>
                    <option value="draft">{t('email.draft', 'Borrador')}</option>
                    <option value="scheduled">{t('email.scheduled', 'Programada')}</option>
                    <option value="sending">{t('email.sending', 'Enviando')}</option>
                    <option value="sent">{t('email.sent', 'Enviada')}</option>
                    <option value="paused">{t('email.paused', 'Pausada')}</option>
                </select>
            </div>

            {/* Campaigns List */}
            {filteredCampaigns.length === 0 ? (
                <div className="text-center py-12 bg-card/50 border border-border rounded-xl">
                    <Mail className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('email.noCampaigns', 'No hay campañas')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {t('email.noCampaignsDesc', 'Crea tu primera campaña para empezar a enviar emails')}
                    </p>
                    <button
                        onClick={() => setShowNewCampaignModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <PlusCircle size={18} />
                        {t('email.createFirst', 'Crear Primera Campaña')}
                    </button>
                </div>
            ) : (
                <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                        {t('email.campaignName', 'Campaña')}
                                    </th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                                        {t('email.status', 'Estado')}
                                    </th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                                        {t('email.recipients', 'Destinatarios')}
                                    </th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                                        {t('email.openRate', 'Apertura')}
                                    </th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                                        {t('email.clickRate', 'Clicks')}
                                    </th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                                        {t('email.actions', 'Acciones')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCampaigns.map((campaign) => {
                                    const openRate = campaign.stats?.sent && campaign.stats.sent > 0
                                        ? ((campaign.stats.uniqueOpens || 0) / campaign.stats.sent * 100).toFixed(1)
                                        : '0.0';
                                    const clickRate = campaign.stats?.uniqueOpens && campaign.stats.uniqueOpens > 0
                                        ? ((campaign.stats.uniqueClicks || 0) / campaign.stats.uniqueOpens * 100).toFixed(1)
                                        : '0.0';

                                    return (
                                        <tr key={campaign.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="text-foreground font-medium">{campaign.name}</p>
                                                    <p className="text-muted-foreground text-sm truncate max-w-xs">
                                                        {campaign.subject}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {getStatusBadge(campaign.status)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-foreground">
                                                {campaign.stats?.totalRecipients?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-4 py-4 text-right text-foreground">
                                                {openRate}%
                                            </td>
                                            <td className="px-4 py-4 text-right text-foreground">
                                                {clickRate}%
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                        title={t('email.view', 'Ver')}
                                                    >
                                                        <Eye size={16} className="text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                        title={t('email.edit', 'Editar')}
                                                    >
                                                        <Edit size={16} className="text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                        title={t('email.duplicate', 'Duplicar')}
                                                    >
                                                        <Copy size={16} className="text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCampaign(campaign.id)}
                                                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                                        title={t('email.delete', 'Eliminar')}
                                                    >
                                                        <Trash2 size={16} className="text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Campaign Modal */}
            {showNewCampaignModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-lg">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground">
                                {t('email.newCampaign', 'Nueva Campaña')}
                            </h3>
                            <button
                                onClick={() => setShowNewCampaignModal(false)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('email.campaignName', 'Nombre de la campaña')} *
                                </label>
                                <input
                                    type="text"
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                    placeholder="Ej: Newsletter Diciembre 2024"
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('email.subject', 'Asunto del email')} *
                                </label>
                                <input
                                    type="text"
                                    value={newCampaign.subject}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                                    placeholder="Ej: ¡No te pierdas nuestras ofertas!"
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('email.campaignType', 'Tipo de campaña')}
                                </label>
                                <select
                                    value={newCampaign.type}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="newsletter">Newsletter</option>
                                    <option value="promotion">Promoción</option>
                                    <option value="announcement">Anuncio</option>
                                    <option value="automated">Automatizada</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('email.content', 'Contenido (opcional)')}
                                </label>
                                <textarea
                                    value={newCampaign.content}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                                    placeholder="Escribe el contenido de tu email..."
                                    rows={4}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewCampaignModal(false)}
                                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={handleCreateCampaign}
                                disabled={!newCampaign.name || !newCampaign.subject || isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                {t('email.createCampaign', 'Crear Campaña')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignsView;

