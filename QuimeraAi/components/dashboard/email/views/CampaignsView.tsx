/**
 * CampaignsView
 * Vista para gestionar campañas de email marketing
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
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
    Palette,
    Brain,
    Info,
    ChevronUp,
    ChevronDown,
    Sparkles,
    EyeOff,
    FileText,
    ChevronRight,
} from 'lucide-react';
import { generateContentViaProxy, extractTextFromResponse } from '../../../../utils/geminiProxyClient';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useEmailDashboardContext } from '../EmailDashboard';
import { useEmailCampaigns, useEmailAudiences } from '../../../../hooks/useEmailSettings';
import { CampaignStatus, AudienceType, EmailDocument, DEFAULT_EMAIL_GLOBAL_STYLES } from '../../../../types/email';
import EmailEditor from '../editor/EmailEditor';
import EmailTemplateGallery from '../editor/EmailTemplateGallery';
import { generateEmailHtml } from '../../../../utils/emailHtmlGenerator';

// Helper to convert plain text/markdown draft to HTML
const parseDraftContent = (content: string, subject?: string): string => {
    let cleanContent = content;

    // Remove Subject line if present (it often comes from the AI)
    const subjectRegex = /^(Subject|Asunto):.*$/gim;
    cleanContent = cleanContent.replace(subjectRegex, '');

    // Convert basic Markdown to HTML
    cleanContent = cleanContent
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Lists
        .replace(/^- (.*)$/gm, '<li>$1</li>')
        .replace(/^\d+\. (.*)$/gm, '<li>$1</li>');

    // Wrap lists in ul/ol handled loosely or just rely on br

    // Convert newlines to breaks
    cleanContent = cleanContent.replace(/\n/g, '<br/>');

    // Clean up multiple breaks
    cleanContent = cleanContent.replace(/(<br\/>){3,}/g, '<br/><br/>');

    return cleanContent;
};

interface CampaignsViewProps {
    onCreateTrigger?: number;
}

const CampaignsView: React.FC<CampaignsViewProps> = ({ onCreateTrigger }) => {
    const { t } = useTranslation();
    const { userId, projectId, projectName } = useEmailDashboardContext();
    const { campaigns, isLoading, isSaving, createCampaign, updateCampaign, deleteCampaign } = useEmailCampaigns(userId, projectId);
    const { audiences } = useEmailAudiences(userId, projectId);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [showTestEmailModal, setShowTestEmailModal] = useState(false);
    const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
    const [showEmailEditor, setShowEmailEditor] = useState(false);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [testEmail, setTestEmail] = useState('');
    const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
    const [sendingTest, setSendingTest] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sendSuccess, setSendSuccess] = useState<string | null>(null);
    const [emailDocument, setEmailDocument] = useState<Partial<EmailDocument> | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const [showHelp, setShowHelp] = useState(true);
    const [aiLoadingField, setAiLoadingField] = useState<string | null>(null);

    const handleAiGenerate = async (field: 'name' | 'subject' | 'previewText' | 'content') => {
        if (aiLoadingField) return;
        setAiLoadingField(field);

        try {
            let prompt = '';
            const context = `Tipo de campaña: ${newCampaign.type}. ${newCampaign.name ? `Nombre: ${newCampaign.name}.` : ''} ${newCampaign.subject ? `Asunto: ${newCampaign.subject}.` : ''}`;

            switch (field) {
                case 'name':
                    prompt = `Genera un nombre interno corto y descriptivo para una campaña de email marketing. ${context} Solo devuelve el nombre, sin comillas.`;
                    break;
                case 'subject':
                    prompt = `Genera una línea de asunto atractiva y efectiva para un email de marketing. ${context} Debe ser persuasiva, corta y generar apertura. Solo devuelve el texto del asunto.`;
                    break;
                case 'previewText':
                    prompt = `Genera un texto de vista previa (preheader) complementario para el asunto "${newCampaign.subject}". Debe incentivar la apertura. Máximo 100 caracteres.`;
                    break;
                case 'content':
                    prompt = `Genera el contenido HTML básico para el cuerpo de un email. ${context} Usa etiquetas <p>, <br>, <strong>. No incluyas html/body/head tags, solo el contenido del body. Debe ser profesional y persuasivo.`;
                    break;
            }

            const result = await generateContentViaProxy(
                projectId || 'ai-assistant',
                prompt,
                'gemini-2.5-flash',
                { temperature: 0.7 },
                userId
            );

            const text = extractTextFromResponse(result).trim().replace(/^"|"$/g, '');

            setNewCampaign(prev => ({
                ...prev,
                [field]: text
            }));

            setSendSuccess(t('ai.generated', 'Contenido generado por IA'));
            setTimeout(() => setSendSuccess(null), 3000);
        } catch (error) {
            console.error('Error generating AI content:', error);
            setSendError('Error al generar contenido con IA');
            setTimeout(() => setSendError(null), 3000);
        } finally {
            setAiLoadingField(null);
        }
    };

    // Check for pending draft from Leads
    // Triggered by mount OR by parent passing initialAutoOpen=true
    // Check for pending draft from Leads
    useEffect(() => {
        try {
            const pendingDraft = localStorage.getItem('pendingEmailDraft');

            if (pendingDraft) {
                console.log("CampaignsView: Opening pending draft found in storage");
                const draft = JSON.parse(pendingDraft);

                // Pre-fill campaign details
                setNewCampaign(prev => ({
                    ...prev,
                    name: `Email a ${draft.recipient.name || draft.recipient.email}`,
                    subject: draft.subject,
                }));

                // Create initial document
                const initialDoc: Partial<EmailDocument> = {
                    name: `Email to ${draft.recipient.name || draft.recipient.email}`,
                    subject: draft.subject,
                    previewText: '',
                    blocks: [
                        {
                            id: uuidv4(),
                            type: 'text',
                            visible: true,
                            styles: {
                                padding: 'md',
                                backgroundColor: 'transparent',
                                fontSize: 'md',
                                alignment: 'left',
                                textColor: '#000000',
                            },
                            content: {
                                text: parseDraftContent(draft.content),
                                isHtml: true // Enable HTML rendering
                            }
                        }
                    ],
                    globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES
                };

                setEmailDocument(initialDoc);
                setShowEmailEditor(true);
            }
        } catch (e) {
            console.error("Error loading pending draft", e);
        }
    }, []);

    // Listen for creation trigger from parent
    useEffect(() => {
        if (onCreateTrigger && onCreateTrigger > 0) {
            setShowNewCampaignModal(true);
        }
    }, [onCreateTrigger]);

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

    // Open template gallery for new campaign
    const handleOpenVisualEditor = () => {
        setShowNewCampaignModal(false);
        setShowTemplateGallery(true);
    };

    // Handle template selection
    const handleSelectTemplate = (document: EmailDocument) => {
        // Helper function to replace {{storeName}} placeholder with actual project name
        const replaceStoreName = (text: string | undefined): string | undefined => {
            if (!text) return text;
            return text.replace(/\{\{storeName\}\}/g, projectName || 'Tu Proyecto');
        };

        // Process blocks to replace storeName in all content fields
        const processedBlocks = document.blocks.map(block => {
            const processedBlock = { ...block };
            if (block.content) {
                const processedContent: any = { ...block.content };
                // Replace in text content
                if (typeof processedContent.text === 'string') {
                    processedContent.text = replaceStoreName(processedContent.text);
                }
                // Replace in headline
                if (typeof processedContent.headline === 'string') {
                    processedContent.headline = replaceStoreName(processedContent.headline);
                }
                // Replace in subheadline
                if (typeof processedContent.subheadline === 'string') {
                    processedContent.subheadline = replaceStoreName(processedContent.subheadline);
                }
                // Replace in companyName
                if (typeof processedContent.companyName === 'string') {
                    processedContent.companyName = replaceStoreName(processedContent.companyName);
                }
                processedBlock.content = processedContent;
            }
            return processedBlock;
        });

        setEmailDocument({
            ...document,
            name: newCampaign.name || replaceStoreName(document.name) || document.name,
            subject: newCampaign.subject || replaceStoreName(document.subject) || document.subject,
            previewText: newCampaign.previewText || replaceStoreName(document.previewText) || document.previewText,
            blocks: processedBlocks,
        });
        setEditingCampaignId(null);
        setShowTemplateGallery(false);
        setShowEmailEditor(true);
    };

    // Start with blank template
    const handleStartBlank = () => {
        setEmailDocument({
            name: newCampaign.name || 'Nueva campaña',
            subject: newCampaign.subject || '',
            previewText: newCampaign.previewText || '',
            blocks: [],
            globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
        });
        setEditingCampaignId(null);
        setShowTemplateGallery(false);
        setShowEmailEditor(true);
    };

    // Open visual editor for existing campaign
    const handleEditCampaign = (campaign: any) => {
        // Try to parse existing emailDocument if stored, otherwise create new
        const existingDoc: Partial<EmailDocument> = campaign.emailDocument || {
            name: campaign.name,
            subject: campaign.subject,
            previewText: campaign.previewText || '',
            blocks: [],
            globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
        };
        setEmailDocument(existingDoc);
        setEditingCampaignId(campaign.id);
        setShowEmailEditor(true);
    };

    // Save from visual editor
    const handleSaveFromEditor = async (document: EmailDocument) => {
        try {
            const htmlContent = generateEmailHtml(document);

            if (editingCampaignId) {
                console.log("CampaignsView: Updating existing campaign", editingCampaignId);
                // Update existing campaign
                await updateCampaign(editingCampaignId, {
                    name: document.name,
                    subject: document.subject,
                    previewText: document.previewText,
                    htmlContent,
                    emailDocument: document,
                });
                setSendSuccess(t('email.campaignUpdated', 'Campaña actualizada exitosamente'));
            } else {
                console.log("CampaignsView: Creating new campaign from editor data");
                // Create new campaign
                const created = await createCampaign({
                    name: document.name,
                    subject: document.subject,
                    previewText: document.previewText,
                    type: newCampaign.type || 'regular',
                    htmlContent,
                    audienceType: newCampaign.audienceType || 'all',
                    audienceSegmentId: newCampaign.audienceSegmentId || '',
                    emailDocument: document,
                });
                console.log("CampaignsView: Campaign created successfully", created?.id);
                setSendSuccess(t('email.campaignCreated', 'Campaña creada exitosamente'));
                resetForm();
            }

            // Clear pending draft after successful save
            localStorage.removeItem('pendingEmailDraft');
            console.log("CampaignsView: Pending draft cleared from storage");

            setShowEmailEditor(false);
            setEmailDocument(null);
            setEditingCampaignId(null);
            setTimeout(() => setSendSuccess(null), 3000);
        } catch (err: any) {
            console.error("CampaignsView: Error saving from editor", err);
            setSendError(t('email.errorSaving', 'Error al guardar la campaña'));
            setTimeout(() => setSendError(null), 5000);
            alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
        }
    };

    const handleCloseEditor = () => {
        // Clear pending draft when closing without saving
        localStorage.removeItem('pendingEmailDraft');

        setShowEmailEditor(false);
        setEmailDocument(null);
        setEditingCampaignId(null);
    };

    const handleDeleteCampaign = (campaignId: string) => {
        setDeleteConfirmId(campaignId);
    };

    const confirmDeleteCampaign = async () => {
        if (!deleteConfirmId) return;
        setIsDeleting(true);
        try {
            await deleteCampaign(deleteConfirmId);
            setSendSuccess(t('email.campaignDeleted', 'Campaña eliminada exitosamente'));
            setTimeout(() => setSendSuccess(null), 3000);
        } catch (err) {
            console.error('Error deleting campaign:', err);
            setSendError(t('email.errorDeleting', 'Error al eliminar la campaña'));
            setTimeout(() => setSendError(null), 5000);
        } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const cancelDeleteCampaign = () => {
        if (!isDeleting) {
            setDeleteConfirmId(null);
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

            </div>


            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1 bg-editor-border/40 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('email.searchCampaigns', 'Buscar campañas...')}
                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                            <X size={16} />
                        </button>
                    )}
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
            {
                filteredCampaigns.length === 0 ? (
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
                    <>
                        {/* Mobile Cards View */}
                        <div className="md:hidden space-y-3">
                            {filteredCampaigns.map((campaign) => {
                                const openRate = campaign.stats?.sent && campaign.stats.sent > 0
                                    ? ((campaign.stats.uniqueOpens || 0) / campaign.stats.sent * 100).toFixed(1)
                                    : '0.0';
                                const clickRate = campaign.stats?.uniqueOpens && campaign.stats.uniqueOpens > 0
                                    ? ((campaign.stats.uniqueClicks || 0) / campaign.stats.uniqueOpens * 100).toFixed(1)
                                    : '0.0';
                                const isSending = sendingCampaign === campaign.id;

                                return (
                                    <div key={campaign.id} className="bg-card/50 border border-border rounded-xl p-4">
                                        {/* Header Row: Name + Status */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-foreground font-medium truncate">{campaign.name}</p>
                                                <p className="text-muted-foreground text-sm truncate">{campaign.subject}</p>
                                            </div>
                                            {isSending ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 shrink-0">
                                                    <Loader2 size={12} className="animate-spin" />
                                                    Enviando
                                                </span>
                                            ) : (
                                                getStatusBadge(campaign.status)
                                            )}
                                        </div>

                                        {/* Stats Row */}
                                        <div className="grid grid-cols-3 gap-2 mb-3 text-center bg-muted/30 rounded-lg p-2">
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('email.recipients', 'Dest.')}</p>
                                                <p className="text-sm font-medium text-foreground">{campaign.stats?.totalRecipients?.toLocaleString() || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('email.openRate', 'Apert.')}</p>
                                                <p className="text-sm font-medium text-foreground">{openRate}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t('email.clickRate', 'Clicks')}</p>
                                                <p className="text-sm font-medium text-foreground">{clickRate}%</p>
                                            </div>
                                        </div>

                                        {/* Actions Row - Always visible on mobile */}
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {campaign.status === 'draft' && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenSendConfirm(campaign.id)}
                                                        disabled={isSending}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50 text-green-500 text-xs font-medium"
                                                    >
                                                        <Play size={14} />
                                                        <span>{t('email.send', 'Enviar')}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenTestEmail(campaign.id)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors text-blue-500 text-xs font-medium"
                                                    >
                                                        <TestTube size={14} />
                                                        <span>Test</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditCampaign(campaign)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-primary text-xs font-medium"
                                                    >
                                                        <Edit size={14} />
                                                        <span>{t('email.edit', 'Editar')}</span>
                                                    </button>
                                                </>
                                            )}
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
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-card/50 border border-border rounded-xl overflow-hidden">
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
                                                            {campaign.status === 'draft' && (
                                                                <button
                                                                    onClick={() => handleEditCampaign(campaign)}
                                                                    className="p-2 hover:bg-primary/20 rounded-lg transition-colors"
                                                                    title={t('email.edit', 'Editar')}
                                                                >
                                                                    <Edit size={16} className="text-primary" />
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
                    </>
                )
            }

            {/* New Campaign Modal - Redesigned for clarity and responsiveness */}
            {
                showNewCampaignModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex md:items-center md:justify-center">
                        {/* Mobile: Bottom sheet, Tablet/Desktop: Centered modal */}
                        <div className="bg-card border-t md:border border-border w-full md:w-auto md:max-w-3xl lg:max-w-4xl md:rounded-2xl md:m-4 max-h-[95vh] md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col mt-auto md:mt-0 animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:fade-in duration-300">

                            {/* Header - Sticky */}
                            <div className="p-4 md:p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2.5 rounded-xl">
                                        <Mail size={22} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg md:text-xl font-bold text-foreground">
                                            {t('email.newCampaign', 'Nueva Campaña')}
                                        </h3>
                                        <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                                            {t('email.newCampaignSubtitle', 'Configure los detalles de su campaña de email')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowHelp(!showHelp)}
                                        className={`p-2 md:p-2.5 rounded-xl transition-all ${showHelp ? 'bg-primary/10 text-primary ring-2 ring-primary/20' : 'hover:bg-muted text-muted-foreground'}`}
                                        title={showHelp ? "Ocultar ayuda" : "Mostrar ayuda"}
                                    >
                                        {showHelp ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                    <button
                                        onClick={() => { setShowNewCampaignModal(false); resetForm(); }}
                                        className="p-2 md:p-2.5 hover:bg-muted rounded-xl transition-colors"
                                    >
                                        <X size={20} className="text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            {/* Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-4 md:p-6">
                                    {/* Two-column layout on desktop */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

                                        {/* Left Column: Campaign Details */}
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                                                <FileText size={16} className="text-primary" />
                                                <span>{t('email.campaignDetails', 'Detalles de la Campaña')}</span>
                                            </div>

                                            {/* Campaign Name */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-medium text-foreground">
                                                        {t('email.campaignName', 'Nombre de la campaña')} <span className="text-red-500">*</span>
                                                    </label>
                                                    <button
                                                        onClick={() => handleAiGenerate('name')}
                                                        disabled={!!aiLoadingField}
                                                        className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-all"
                                                        title="Generar nombre con IA"
                                                    >
                                                        {aiLoadingField === 'name' ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                                                        <span className="hidden sm:inline">Generar</span>
                                                    </button>
                                                </div>

                                                {showHelp && (
                                                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-xs text-muted-foreground flex gap-2">
                                                        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                                        <p>Nombre interno para identificar tu campaña. Solo visible para ti.</p>
                                                    </div>
                                                )}

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={newCampaign.name}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                                        placeholder="Ej: Newsletter Diciembre 2024"
                                                        className="w-full pl-4 pr-10 py-3 bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                        <FileText size={16} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Subject */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-medium text-foreground">
                                                        {t('email.subject', 'Asunto del email')} <span className="text-red-500">*</span>
                                                    </label>
                                                    <button
                                                        onClick={() => handleAiGenerate('subject')}
                                                        disabled={!!aiLoadingField}
                                                        className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-all"
                                                    >
                                                        {aiLoadingField === 'subject' ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                                                        <span className="hidden sm:inline">IA Suggest</span>
                                                    </button>
                                                </div>

                                                {showHelp && (
                                                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-xs text-muted-foreground flex gap-2">
                                                        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                                        <p>Lo primero que verán en la bandeja de entrada. Hazlo breve y atractivo.</p>
                                                    </div>
                                                )}

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={newCampaign.subject}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                                                        placeholder="Ej: ¡No te pierdas nuestras ofertas!"
                                                        className="w-full pl-4 pr-10 py-3 bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                        <Mail size={16} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview Text */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-medium text-foreground">
                                                        {t('email.previewText', 'Texto de vista previa')}
                                                    </label>
                                                    <button
                                                        onClick={() => handleAiGenerate('previewText')}
                                                        disabled={!!aiLoadingField || !newCampaign.subject}
                                                        className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-all"
                                                    >
                                                        {aiLoadingField === 'previewText' ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                                                        <span className="hidden sm:inline">IA Generate</span>
                                                    </button>
                                                </div>

                                                {showHelp && (
                                                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-xs text-muted-foreground flex gap-2">
                                                        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                                        <p>Texto que aparece junto al asunto. Úsalo para complementar.</p>
                                                    </div>
                                                )}

                                                <input
                                                    type="text"
                                                    value={newCampaign.previewText}
                                                    onChange={(e) => setNewCampaign({ ...newCampaign, previewText: e.target.value })}
                                                    placeholder="Texto que aparece después del asunto..."
                                                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                                                />
                                            </div>

                                            {/* Type & Audience - Side by side on mobile too */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-foreground">
                                                        {t('email.campaignType', 'Tipo')}
                                                    </label>
                                                    <select
                                                        value={newCampaign.type}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                                                        className="w-full px-3 py-3 bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                                                    >
                                                        <option value="newsletter">Newsletter</option>
                                                        <option value="promotion">Promoción</option>
                                                        <option value="announcement">Anuncio</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-foreground">
                                                        {t('email.audience', 'Audiencia')}
                                                    </label>
                                                    <select
                                                        value={newCampaign.audienceType}
                                                        onChange={(e) => setNewCampaign({ ...newCampaign, audienceType: e.target.value as AudienceType })}
                                                        className="w-full px-3 py-3 bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                                                    >
                                                        <option value="all">{t('email.allSubscribers', 'Todos')}</option>
                                                        <option value="segment">{t('email.segment', 'Segmento')}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Segment selector */}
                                            {newCampaign.audienceType === 'segment' && (
                                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        {t('email.selectSegment', 'Seleccionar segmento')}
                                                    </label>
                                                    {audiences.length > 0 ? (
                                                        <select
                                                            value={newCampaign.audienceSegmentId}
                                                            onChange={(e) => setNewCampaign({ ...newCampaign, audienceSegmentId: e.target.value })}
                                                            className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                                                        >
                                                            <option value="">{t('email.chooseSegment', 'Elige un segmento...')}</option>
                                                            {audiences.map((audience) => (
                                                                <option key={audience.id} value={audience.id}>
                                                                    {audience.name} ({audience.estimatedCount || 0})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                            <p className="text-amber-500 text-sm flex items-center gap-2">
                                                                <Users size={16} />
                                                                <span className="text-xs">{t('email.noSegments', 'No hay segmentos. Crea uno en Audiencias.')}</span>
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Content */}
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                                                <Palette size={16} className="text-primary" />
                                                <span>{t('email.content', 'Contenido del Email')}</span>
                                            </div>

                                            {/* Visual Editor Button - Hero CTA */}
                                            <button
                                                type="button"
                                                onClick={handleOpenVisualEditor}
                                                className="w-full group relative overflow-hidden flex items-center gap-4 p-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-2 border-primary/20 rounded-2xl text-primary hover:border-primary/40 hover:from-primary/20 transition-all shadow-lg shadow-primary/5 hover:shadow-primary/10"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="bg-primary/15 p-3 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                                                    <Palette size={28} />
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <span className="block font-bold text-base md:text-lg">{t('email.openVisualEditor', 'Abrir Editor Visual')}</span>
                                                    <span className="block text-xs md:text-sm text-muted-foreground group-hover:text-primary/70 transition-colors">
                                                        Diseña emails con drag & drop
                                                    </span>
                                                </div>
                                                <ChevronRight size={24} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
                                            </button>

                                            {/* Divider */}
                                            <div className="flex items-center gap-3 py-2">
                                                <div className="flex-1 h-px bg-border"></div>
                                                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                                    {t('email.orCode', 'O código directo')}
                                                </span>
                                                <div className="flex-1 h-px bg-border"></div>
                                            </div>

                                            {/* HTML Code Editor */}
                                            <div className="relative group">
                                                <div className="absolute right-3 top-3 z-10">
                                                    <button
                                                        onClick={() => handleAiGenerate('content')}
                                                        disabled={!!aiLoadingField}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background/90 hover:bg-background border border-border rounded-lg text-primary shadow-sm backdrop-blur-sm transition-all text-xs"
                                                        title="Generar borrador HTML con IA"
                                                    >
                                                        {aiLoadingField === 'content' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                        <span className="hidden sm:inline">IA</span>
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={newCampaign.content}
                                                    onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                                                    placeholder="<html>&#10;  Escribe HTML directamente...&#10;</html>"
                                                    rows={6}
                                                    className="w-full px-4 py-4 pt-12 bg-muted/20 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none font-mono text-sm leading-relaxed"
                                                />
                                            </div>

                                            {/* Variables hint */}
                                            <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                                                <p className="text-xs text-muted-foreground mb-2">{t('email.availableVars', 'Variables disponibles:')}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <code className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">{`{{firstName}}`}</code>
                                                    <code className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">{`{{lastName}}`}</code>
                                                    <code className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">{`{{email}}`}</code>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer - Sticky */}
                            <div className="p-4 md:p-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 bg-gradient-to-r from-muted/20 to-transparent shrink-0">
                                <p className="text-xs text-muted-foreground hidden md:block">
                                    {t('email.requiredFields', '* Campos obligatorios')}
                                </p>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => { setShowNewCampaignModal(false); resetForm(); }}
                                        className="flex-1 sm:flex-none px-5 py-2.5 border border-border rounded-xl text-foreground hover:bg-muted transition-colors font-medium"
                                    >
                                        {t('common.cancel', 'Cancelar')}
                                    </button>
                                    <button
                                        onClick={handleCreateCampaign}
                                        disabled={!newCampaign.name || !newCampaign.subject || isSaving}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none font-semibold"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                        <span>{t('email.createCampaign', 'Crear Campaña')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Send Confirmation Modal */}
            {
                showSendConfirmModal && selectedCampaign && (
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
                )
            }

            {/* Test Email Modal */}
            {
                showTestEmailModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
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
                )
            }

            {/* Template Gallery */}
            {
                showTemplateGallery && (
                    <EmailTemplateGallery
                        onSelect={handleSelectTemplate}
                        onClose={() => setShowTemplateGallery(false)}
                        onStartBlank={handleStartBlank}
                    />
                )
            }

            {/* Visual Email Editor - Full Screen */}
            {
                showEmailEditor && emailDocument && (
                    <div className="fixed inset-0 z-[100]">
                        <EmailEditor
                            initialDocument={emailDocument}
                            onSave={handleSaveFromEditor}
                            onClose={handleCloseEditor}
                            onSendTest={editingCampaignId ? () => handleOpenTestEmail(editingCampaignId) : undefined}
                            campaignId={editingCampaignId || undefined}
                            campaignName={editingCampaignId ? campaigns.find(c => c.id === editingCampaignId)?.name : newCampaign.name}
                        />
                    </div>
                )
            }

            {/* Delete Campaign Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500 mx-auto">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-center text-foreground mb-2">
                                {t('email.deleteConfirmTitle', '¿Eliminar campaña?')}
                            </h3>
                            <p className="text-center text-muted-foreground mb-6">
                                {t('email.deleteConfirmMessage', 'Esta acción no se puede deshacer. La campaña será eliminada permanentemente.')}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={cancelDeleteCampaign}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-medium text-sm"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    onClick={confirmDeleteCampaign}
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
        </div >
    );
};

export default CampaignsView;
