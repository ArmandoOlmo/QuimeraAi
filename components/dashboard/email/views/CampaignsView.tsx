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
    Play,
    TestTube,
    Users,
    Calendar,
    AlertTriangle,
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useEmailDashboardContext } from '../EmailDashboard';
import { useEmailCampaigns, useEmailAudiences } from '../../../../hooks/useEmailSettings';
import { CampaignStatus, AudienceType } from '../../../../types/email';

const CampaignsView: React.FC = () => {
    const { t } = useTranslation();
    const { userId, projectId } = useEmailDashboardContext();
    const { campaigns, isLoading, isSaving, createCampaign, updateCampaign, deleteCampaign } = useEmailCampaigns(userId, projectId);
    const { audiences } = useEmailAudiences(userId, projectId);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [showTestEmailModal, setShowTestEmailModal] = useState(false);
    const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [testEmail, setTestEmail] = useState('');
    const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
    const [sendingTest, setSendingTest] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sendSuccess, setSendSuccess] = useState<string | null>(null);
    
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        subject: '',
        previewText: '',
        type: 'newsletter',
        content: '',
        audienceType: 'all' as AudienceType,
        audienceSegmentId: '',
        scheduledAt: '',
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
            sending: { label: 'Enviando', color: 'bg-amber-500/20 text-amber-400', icon: Loader2 },
            sent: { label: 'Enviada', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
            cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400', icon: XCircle },
            paused: { label: 'Pausada', color: 'bg-orange-500/20 text-orange-400', icon: Pause },
        };

        const config = statusConfig[status || 'draft'];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <Icon size={12} className={status === 'sending' ? 'animate-spin' : ''} />
                {config.label}
            </span>
        );
    };

    const resetForm = () => {
        setNewCampaign({
            name: '',
            subject: '',
            previewText: '',
            type: 'newsletter',
            content: '',
            audienceType: 'all',
            audienceSegmentId: '',
            scheduledAt: '',
        });
    };

    const handleCreateCampaign = async () => {
        if (!newCampaign.name || !newCampaign.subject) return;

        try {
            const campaignData: any = {
                name: newCampaign.name,
                subject: newCampaign.subject,
                previewText: newCampaign.previewText,
                type: newCampaign.type,
                htmlContent: newCampaign.content || `<p>${newCampaign.subject}</p>`,
                audienceType: newCampaign.audienceType,
            };

            if (newCampaign.audienceType === 'segment' && newCampaign.audienceSegmentId) {
                campaignData.audienceSegmentId = newCampaign.audienceSegmentId;
            }

            await createCampaign(campaignData);
            setShowNewCampaignModal(false);
            resetForm();
            setSendSuccess(t('email.campaignCreated', 'Campaña creada exitosamente'));
            setTimeout(() => setSendSuccess(null), 3000);
        } catch (err) {
            console.error('Error creating campaign:', err);
            setSendError(t('email.errorCreating', 'Error al crear la campaña'));
            setTimeout(() => setSendError(null), 5000);
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        if (confirm(t('email.confirmDelete', '¿Estás seguro de eliminar esta campaña?'))) {
            await deleteCampaign(campaignId);
        }
    };

    const handleDuplicateCampaign = async (campaign: any) => {
        try {
            await createCampaign({
                name: `${campaign.name} (copia)`,
                subject: campaign.subject,
                type: campaign.type,
                content: campaign.htmlContent || campaign.content,
                audienceType: campaign.audienceType || 'all',
            });
            setSendSuccess(t('email.campaignDuplicated', 'Campaña duplicada'));
            setTimeout(() => setSendSuccess(null), 3000);
        } catch (err) {
            console.error('Error duplicating campaign:', err);
        }
    };

    const handleOpenSendConfirm = (campaignId: string) => {
        setSelectedCampaignId(campaignId);
        setShowSendConfirmModal(true);
    };

    const handleSendCampaign = async () => {
        if (!selectedCampaignId) return;

        setSendingCampaign(selectedCampaignId);
        setSendError(null);
        setShowSendConfirmModal(false);

        try {
            const functions = getFunctions();
            const sendCampaignFn = httpsCallable(functions, 'sendCampaign');
            
            const result = await sendCampaignFn({
                userId,
                storeId: projectId,
                campaignId: selectedCampaignId,
            });

            const data = result.data as any;
            
            if (data.success) {
                setSendSuccess(t('email.campaignSent', `Campaña enviada a ${data.sent} destinatarios`));
                setTimeout(() => setSendSuccess(null), 5000);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err: any) {
            console.error('Error sending campaign:', err);
            setSendError(err.message || t('email.errorSending', 'Error al enviar la campaña'));
            setTimeout(() => setSendError(null), 5000);
        } finally {
            setSendingCampaign(null);
            setSelectedCampaignId(null);
        }
    };

    const handleOpenTestEmail = (campaignId: string) => {
        setSelectedCampaignId(campaignId);
        setTestEmail('');
        setShowTestEmailModal(true);
    };

    const handleSendTestEmail = async () => {
        if (!selectedCampaignId || !testEmail) return;

        setSendingTest(true);
        setSendError(null);

        try {
            const functions = getFunctions();
            const sendTestFn = httpsCallable(functions, 'sendTestEmail');
            
            const result = await sendTestFn({
                userId,
                storeId: projectId,
                campaignId: selectedCampaignId,
                testEmail,
            });

            const data = result.data as any;
            
            if (data.success) {
                setSendSuccess(t('email.testEmailSent', `Email de prueba enviado a ${testEmail}`));
                setShowTestEmailModal(false);
                setTimeout(() => setSendSuccess(null), 5000);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err: any) {
            console.error('Error sending test email:', err);
            setSendError(err.message || t('email.errorSendingTest', 'Error al enviar email de prueba'));
        } finally {
            setSendingTest(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

    return (
        <div className="space-y-6">
            {/* Notifications */}
            {sendError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                    <p className="text-red-500 text-sm">{sendError}</p>
                    <button onClick={() => setSendError(null)} className="ml-auto">
                        <X size={16} className="text-red-500" />
                    </button>
                </div>
            )}
            {sendSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                    <p className="text-green-500 text-sm">{sendSuccess}</p>
                    <button onClick={() => setSendSuccess(null)} className="ml-auto">
                        <X size={16} className="text-green-500" />
                    </button>
                </div>
            )}

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
                                    const isSending = sendingCampaign === campaign.id;

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
                                                {isSending ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                                        <Loader2 size={12} className="animate-spin" />
                                                        Enviando...
                                                    </span>
                                                ) : (
                                                    getStatusBadge(campaign.status)
                                                )}
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
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Send button - only for drafts */}
                                                    {campaign.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleOpenSendConfirm(campaign.id)}
                                                            disabled={isSending}
                                                            className="p-2 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
                                                            title={t('email.send', 'Enviar')}
                                                        >
                                                            <Play size={16} className="text-green-500" />
                                                        </button>
                                                    )}
                                                    {/* Test email button */}
                                                    {campaign.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleOpenTestEmail(campaign.id)}
                                                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                                                            title={t('email.sendTest', 'Enviar prueba')}
                                                        >
                                                            <TestTube size={16} className="text-blue-500" />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                        title={t('email.view', 'Ver')}
                                                    >
                                                        <Eye size={16} className="text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicateCampaign(campaign)}
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
                    <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground">
                                {t('email.newCampaign', 'Nueva Campaña')}
                            </h3>
                            <button
                                onClick={() => { setShowNewCampaignModal(false); resetForm(); }}
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
                                    {t('email.previewText', 'Texto de vista previa')}
                                </label>
                                <input
                                    type="text"
                                    value={newCampaign.previewText}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, previewText: e.target.value })}
                                    placeholder="Texto que aparece después del asunto..."
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        {t('email.campaignType', 'Tipo')}
                                    </label>
                                    <select
                                        value={newCampaign.type}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="newsletter">Newsletter</option>
                                        <option value="promotion">Promoción</option>
                                        <option value="announcement">Anuncio</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        {t('email.audience', 'Audiencia')}
                                    </label>
                                    <select
                                        value={newCampaign.audienceType}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, audienceType: e.target.value as AudienceType })}
                                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="all">{t('email.allSubscribers', 'Todos los suscriptores')}</option>
                                        <option value="segment">{t('email.selectSegment', 'Seleccionar segmento')}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Segment selector */}
                            {newCampaign.audienceType === 'segment' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        {t('email.selectSegment', 'Seleccionar segmento')}
                                    </label>
                                    {audiences.length > 0 ? (
                                        <select
                                            value={newCampaign.audienceSegmentId}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, audienceSegmentId: e.target.value })}
                                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option value="">{t('email.chooseSegment', 'Elige un segmento...')}</option>
                                            {audiences.map((audience) => (
                                                <option key={audience.id} value={audience.id}>
                                                    {audience.name} ({audience.estimatedCount || 0} contactos)
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                            <p className="text-amber-500 text-sm flex items-center gap-2">
                                                <Users size={16} />
                                                {t('email.noSegments', 'No hay segmentos creados. Crea uno primero en la sección de Audiencias.')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('email.content', 'Contenido del email')}
                                </label>
                                <textarea
                                    value={newCampaign.content}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                                    placeholder="Escribe el contenido de tu email (HTML permitido)..."
                                    rows={6}
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('email.htmlHint', 'Puedes usar HTML. Variables: {{firstName}}, {{lastName}}, {{email}}')}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => { setShowNewCampaignModal(false); resetForm(); }}
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

            {/* Send Confirmation Modal */}
            {showSendConfirmModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-md">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Send size={20} className="text-primary" />
                                {t('email.confirmSendTitle', 'Enviar Campaña')}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-foreground">
                                {t('email.confirmSendMessage', '¿Estás seguro de enviar esta campaña?')}
                            </p>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                <p className="text-sm"><strong>{t('email.campaign', 'Campaña')}:</strong> {selectedCampaign.name}</p>
                                <p className="text-sm"><strong>{t('email.subject', 'Asunto')}:</strong> {selectedCampaign.subject}</p>
                                <p className="text-sm"><strong>{t('email.audience', 'Audiencia')}:</strong> {
                                    selectedCampaign.audienceType === 'all' 
                                        ? t('email.allSubscribers', 'Todos los suscriptores')
                                        : t('email.selectedSegment', 'Segmento seleccionado')
                                }</p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                <p className="text-amber-500 text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {t('email.sendWarning', 'Esta acción no se puede deshacer.')}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => { setShowSendConfirmModal(false); setSelectedCampaignId(null); }}
                                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={handleSendCampaign}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Send size={16} />
                                {t('email.sendNow', 'Enviar ahora')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Email Modal */}
            {showTestEmailModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-md">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <TestTube size={20} className="text-blue-500" />
                                {t('email.sendTestEmail', 'Enviar Email de Prueba')}
                            </h3>
                            <button
                                onClick={() => { setShowTestEmailModal(false); setSelectedCampaignId(null); }}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-muted-foreground text-sm">
                                {t('email.testEmailDesc', 'Envía una versión de prueba de esta campaña a tu correo para revisarla antes de enviar.')}
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t('email.testEmailAddress', 'Email de prueba')} *
                                </label>
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            {sendError && (
                                <p className="text-red-500 text-sm">{sendError}</p>
                            )}
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => { setShowTestEmailModal(false); setSelectedCampaignId(null); setSendError(null); }}
                                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={handleSendTestEmail}
                                disabled={!testEmail || sendingTest}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                {t('email.sendTest', 'Enviar prueba')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignsView;
