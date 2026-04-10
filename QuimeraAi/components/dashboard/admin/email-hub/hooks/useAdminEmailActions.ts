/**
 * useAdminEmailActions
 *
 * Custom hook that encapsulates all campaign CRUD operations, automation
 * actions, and editor state management for the Admin Email Hub.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../../../../contexts/core/AuthContext';
import {
    db, collection, doc, addDoc, updateDoc, deleteDoc,
} from '../../../../../firebase';
import { serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { generateEmailHtml } from '../../../../../utils/emailHtmlGenerator';
import { DEFAULT_EMAIL_GLOBAL_STYLES } from '../../../../../types/email';
import type { CampaignStatus, EmailDocument, EmailAutomation, AutomationStatus, AutomationWorkflowStep, AutomationCategory } from '../../../../../types/email';
import type {
    CrossTenantCampaign,
    CrossTenantAudience,
    AutomationTemplate,
    ConfirmModalState,
} from '../types';
import type { AdminEmailDataReturn } from './useAdminEmailData';
import { v4 as uuidv4 } from 'uuid';

export interface AdminEmailActionsReturn {
    // Campaign editor state
    showEmailEditor: boolean;
    setShowEmailEditor: (v: boolean) => void;
    showTemplateGallery: boolean;
    setShowTemplateGallery: (v: boolean) => void;
    emailDocument: Partial<EmailDocument> | null;
    setEmailDocument: (v: Partial<EmailDocument> | null) => void;
    editingCampaignId: string | null;
    setEditingCampaignId: (v: string | null) => void;
    selectedCampaign: CrossTenantCampaign | null;
    setSelectedCampaign: (v: CrossTenantCampaign | null) => void;

    // New campaign modal
    showNewCampaignModal: boolean;
    setShowNewCampaignModal: (v: boolean) => void;
    newCampaignForm: {
        name: string; subject: string; previewText: string; type: string;
        audienceType: 'all' | 'segment' | 'custom'; audienceSegmentId: string; customEmails: string;
    };
    setNewCampaignForm: React.Dispatch<React.SetStateAction<{
        name: string; subject: string; previewText: string; type: string;
        audienceType: 'all' | 'segment' | 'custom'; audienceSegmentId: string; customEmails: string;
    }>>;

    // Test email
    showTestEmailModal: boolean;
    setShowTestEmailModal: (v: boolean) => void;
    testEmail: string;
    setTestEmail: (v: string) => void;
    sendingTest: boolean;
    testSendError: string | null;
    testSendSuccess: string | null;

    // Send campaign
    showSendConfirmModal: boolean;
    sendingCampaignId: string | null;
    sendCampaignError: string | null;
    sendCampaignSuccess: string | null;

    // Detail panel
    showDetailPanel: boolean;
    setShowDetailPanel: (v: boolean) => void;
    detailCampaign: CrossTenantCampaign | null;
    setDetailCampaign: (v: CrossTenantCampaign | null) => void;

    // Confirmation modal
    confirmModal: ConfirmModalState;
    setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>;

    // Automation creation / editing
    showCreateAutomation: boolean;
    setShowCreateAutomation: (v: boolean) => void;
    selectedTemplate: AutomationTemplate | null;
    setSelectedTemplate: (v: AutomationTemplate | null) => void;
    newAutomation: {
        name: string; subject: string; description: string; delayMinutes: number;
        status: AutomationStatus; steps: AutomationWorkflowStep[]; category: AutomationCategory;
        audienceId: string;
    };
    setNewAutomation: React.Dispatch<React.SetStateAction<{
        name: string; subject: string; description: string; delayMinutes: number;
        status: AutomationStatus; steps: AutomationWorkflowStep[]; category: AutomationCategory;
        audienceId: string;
    }>>;
    editingAutomationId: string | null;
    setEditingAutomationId: (v: string | null) => void;

    // Campaign handlers
    handleEditCampaignVisual: (campaign: CrossTenantCampaign) => void;
    handleOpenTemplateGallery: () => void;
    handleSelectTemplate: (document: EmailDocument) => void;
    handleStartBlank: () => void;
    handleSaveFromEditor: (document: EmailDocument) => Promise<void>;
    handleCloseEditor: () => void;
    openDetailPanel: (campaign: CrossTenantCampaign) => void;
    handleUpdateCampaignStatus: (campaignId: string, newStatus: CampaignStatus) => Promise<void>;
    handleUpdateCampaignAudience: (
        campaignId: string,
        audienceType: 'all' | 'segment' | 'custom',
        audienceSegmentId?: string,
        customRecipientEmails?: string[]
    ) => Promise<void>;
    handleSendTestEmail: () => Promise<void>;
    handleOpenSendConfirm: (campaignId: string) => void;
    handleSendCampaign: () => Promise<void>;
    handleDeleteCampaign: (campaign: CrossTenantCampaign) => Promise<void>;
    handleDuplicateCampaign: (campaign: CrossTenantCampaign) => Promise<void>;

    // Automation handlers
    createAutomation: () => Promise<void>;
    updateAutomation: () => Promise<void>;
    duplicateAutomation: (automation: EmailAutomation) => Promise<void>;
    toggleAutomationStatus: (automation: EmailAutomation) => Promise<void>;
    deleteAutomation: (automationId: string) => Promise<void>;
    openEditAutomation: (automation: EmailAutomation) => void;
}

export function useAdminEmailActions(data: AdminEmailDataReturn): AdminEmailActionsReturn {
    const { user } = useAuth();
    const { campaigns, setCampaigns, audiences } = data;

    // Campaign editor state
    const [showEmailEditor, setShowEmailEditor] = useState(false);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [emailDocument, setEmailDocument] = useState<Partial<EmailDocument> | null>(null);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<CrossTenantCampaign | null>(null);
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [newCampaignForm, setNewCampaignForm] = useState({
        name: '', subject: '', previewText: '', type: 'newsletter',
        audienceType: 'all' as 'all' | 'segment' | 'custom', audienceSegmentId: '', customEmails: '',
    });

    // Test email
    const [showTestEmailModal, setShowTestEmailModal] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [testSendError, setTestSendError] = useState<string | null>(null);
    const [testSendSuccess, setTestSendSuccess] = useState<string | null>(null);

    // Send campaign
    const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
    const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
    const [sendCampaignError, setSendCampaignError] = useState<string | null>(null);
    const [sendCampaignSuccess, setSendCampaignSuccess] = useState<string | null>(null);

    // Detail panel
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [detailCampaign, setDetailCampaign] = useState<CrossTenantCampaign | null>(null);

    // Confirmation modal
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        show: false, title: '', message: '', onConfirm: () => {},
    });

    // Automation creation / editing
    const [showCreateAutomation, setShowCreateAutomation] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
    const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
    const [newAutomation, setNewAutomation] = useState<{
        name: string; subject: string; description: string; delayMinutes: number;
        status: AutomationStatus; steps: AutomationWorkflowStep[]; category: AutomationCategory;
        audienceId: string;
    }>({
        name: '', subject: '', description: '', delayMinutes: 60, status: 'draft',
        steps: [], category: 'lifecycle', audienceId: '',
    });

    // =============================================================================
    // CAMPAIGN EDITOR HANDLERS
    // =============================================================================

    const handleEditCampaignVisual = (campaign: CrossTenantCampaign) => {
        const existingDoc: Partial<EmailDocument> = (campaign as any).emailDocument || {
            name: campaign.name,
            subject: campaign.subject,
            previewText: campaign.previewText || '',
            blocks: campaign.htmlContent ? [{
                id: uuidv4(),
                type: 'text' as const,
                visible: true,
                styles: { padding: 'md', backgroundColor: 'transparent', fontSize: 'md', alignment: 'left', textColor: '#000000' },
                content: { text: campaign.htmlContent, isHtml: true },
            }] : [],
            globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
        };
        setEmailDocument(existingDoc);
        setEditingCampaignId(campaign.id);
        setSelectedCampaign(campaign);
        setShowEmailEditor(true);
    };

    const handleOpenTemplateGallery = () => {
        setShowNewCampaignModal(false);
        setShowTemplateGallery(true);
    };

    const handleSelectTemplate = (document: EmailDocument) => {
        setEmailDocument({
            ...document,
            name: newCampaignForm.name || document.name,
            subject: newCampaignForm.subject || document.subject,
            previewText: newCampaignForm.previewText || document.previewText,
        });
        setEditingCampaignId(null);
        setShowTemplateGallery(false);
        setShowEmailEditor(true);
    };

    const handleStartBlank = () => {
        setEmailDocument({
            name: newCampaignForm.name || 'Nueva campaña',
            subject: newCampaignForm.subject || '',
            previewText: newCampaignForm.previewText || '',
            blocks: [],
            globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
        });
        setEditingCampaignId(null);
        setShowTemplateGallery(false);
        setShowEmailEditor(true);
    };

    const handleSaveFromEditor = async (document: EmailDocument) => {
        try {
            const htmlContent = generateEmailHtml(document);

            if (editingCampaignId && selectedCampaign) {
                const collectionPath = selectedCampaign.tenantId === 'admin'
                    ? 'adminEmailCampaigns'
                    : `users/${selectedCampaign.userId}/projects/${selectedCampaign.projectId}/emailCampaigns`;
                await updateDoc(doc(db, collectionPath, editingCampaignId), {
                    name: document.name || '',
                    subject: document.subject || '',
                    previewText: document.previewText || '',
                    htmlContent,
                    emailDocument: JSON.parse(JSON.stringify(document)),
                    updatedAt: serverTimestamp(),
                });
                setCampaigns(prev => prev.map(c =>
                    c.id === editingCampaignId
                        ? { ...c, name: document.name, subject: document.subject, previewText: document.previewText, htmlContent, emailDocument: document, updatedAt: new Date() } as any
                        : c
                ));
            } else {
                const newCampaign: Record<string, any> = {
                    name: document.name || 'Sin nombre',
                    subject: document.subject || '',
                    previewText: document.previewText || '',
                    type: newCampaignForm.type || 'newsletter',
                    htmlContent,
                    emailDocument: JSON.parse(JSON.stringify(document)),
                    audienceType: newCampaignForm.audienceType || 'all',
                    ...(newCampaignForm.audienceType === 'segment' && newCampaignForm.audienceSegmentId ? { audienceSegmentId: newCampaignForm.audienceSegmentId } : {}),
                    ...(newCampaignForm.audienceType === 'custom' && newCampaignForm.customEmails ? { customRecipientEmails: newCampaignForm.customEmails.split(',').map(e => e.trim()).filter(Boolean) } : {}),
                    status: 'draft' as CampaignStatus,
                    stats: { totalRecipients: 0, sent: 0, delivered: 0, opened: 0, totalOpens: 0, uniqueOpens: 0, clicked: 0, totalClicks: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0 },
                    tags: ['visual-editor'],
                    createdBy: user?.uid || 'admin',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                const docRef = await addDoc(collection(db, 'adminEmailCampaigns'), newCampaign);
                setCampaigns(prev => [{
                    id: docRef.id, ...newCampaign,
                    tenantId: 'admin', tenantName: 'Super Admin',
                    userId: user?.uid || 'admin', projectId: 'admin',
                    createdAt: new Date(), updatedAt: new Date(),
                } as CrossTenantCampaign, ...prev]);
            }

            setShowEmailEditor(false);
            setEmailDocument(null);
            setEditingCampaignId(null);
            setSelectedCampaign(null);
            setNewCampaignForm({ name: '', subject: '', previewText: '', type: 'newsletter', audienceType: 'all', audienceSegmentId: '', customEmails: '' });
        } catch (err) {
            console.error('Save from visual editor error:', err);
            alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
    };

    const handleCloseEditor = () => {
        setShowEmailEditor(false);
        setEmailDocument(null);
        setEditingCampaignId(null);
    };

    const openDetailPanel = (campaign: CrossTenantCampaign) => {
        setDetailCampaign(campaign);
        setShowDetailPanel(true);
    };

    // =============================================================================
    // CAMPAIGN STATUS / AUDIENCE UPDATES
    // =============================================================================

    const handleUpdateCampaignStatus = async (campaignId: string, newStatus: CampaignStatus) => {
        try {
            const campaign = campaigns.find(c => c.id === campaignId);
            const collectionPath = campaign?.tenantId === 'admin'
                ? 'adminEmailCampaigns'
                : `users/${campaign?.userId}/projects/${campaign?.projectId}/emailCampaigns`;
            
            await updateDoc(doc(db, collectionPath, campaignId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });

            setCampaigns(prev => prev.map(c =>
                c.id === campaignId ? { ...c, status: newStatus, updatedAt: new Date() } as any : c
            ));
            if (detailCampaign?.id === campaignId) {
                setDetailCampaign(prev => prev ? { ...prev, status: newStatus } as any : null);
            }
        } catch (err) {
            console.error('[AdminEmailHub] Error updating campaign status:', err);
        }
    };

    const handleUpdateCampaignAudience = async (
        campaignId: string,
        audienceType: 'all' | 'segment' | 'custom',
        audienceSegmentId?: string,
        customRecipientEmails?: string[]
    ) => {
        try {
            const campaign = campaigns.find(c => c.id === campaignId);
            const collectionPath = campaign?.tenantId === 'admin'
                ? 'adminEmailCampaigns'
                : `users/${campaign?.userId}/projects/${campaign?.projectId}/emailCampaigns`;
            
            const updates: Record<string, any> = {
                audienceType,
                updatedAt: serverTimestamp(),
            };
            if (audienceType === 'segment' && audienceSegmentId) {
                updates.audienceSegmentId = audienceSegmentId;
            }
            if (audienceType === 'custom' && customRecipientEmails) {
                updates.customRecipientEmails = customRecipientEmails;
            }

            await updateDoc(doc(db, collectionPath, campaignId), updates);

            const updatedCampaign = { ...campaign!, audienceType, audienceSegmentId: audienceSegmentId || '', customRecipientEmails: customRecipientEmails || [] };
            setCampaigns(prev => prev.map(c =>
                c.id === campaignId ? { ...c, ...updatedCampaign } as any : c
            ));
            if (detailCampaign?.id === campaignId) {
                setDetailCampaign(prev => prev ? { ...prev, ...updatedCampaign } as any : null);
            }
        } catch (err) {
            console.error('[AdminEmailHub] Error updating campaign audience:', err);
        }
    };

    // =============================================================================
    // SEND TEST EMAIL
    // =============================================================================

    const handleSendTestEmail = async () => {
        if (!testEmail) return;

        const campaignId = editingCampaignId;
        const hasDocument = emailDocument && emailDocument.blocks && emailDocument.blocks.length > 0;

        if (!campaignId && !hasDocument) {
            setTestSendError('No hay campaña seleccionada');
            return;
        }

        setSendingTest(true);
        setTestSendError(null);
        setTestSendSuccess(null);

        try {
            const functions = getFunctions();
            const sendTestFn = httpsCallable(functions, 'sendTestEmail');

            const campaign = campaigns.find(c => c.id === campaignId);
            const realUserId = campaign?.userId || user?.uid || 'admin';
            const realProjectId = campaign?.projectId || 'admin';

            const payload: Record<string, any> = {
                userId: realUserId,
                storeId: realProjectId,
                campaignId: campaignId || 'admin-test',
                testEmail,
            };

            if (hasDocument) {
                console.log('[Test Email] Editor mode — generating from open document, blocks:', emailDocument!.blocks?.length);
                const fullDoc: EmailDocument = {
                    id: emailDocument!.id || 'admin-test',
                    name: emailDocument!.name || 'Test Email',
                    subject: emailDocument!.subject || 'Test Email',
                    previewText: emailDocument!.previewText || '',
                    blocks: emailDocument!.blocks || [],
                    globalStyles: emailDocument!.globalStyles || DEFAULT_EMAIL_GLOBAL_STYLES,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                payload.htmlContent = generateEmailHtml(fullDoc);
                payload.subject = fullDoc.subject;
            } else {
                const storedDoc = (campaign as any)?.emailDocument;
                console.log('[Test Email] Table mode — storedDoc exists:', !!storedDoc, 'blocks:', storedDoc?.blocks?.length);
                
                if (storedDoc && storedDoc.blocks && storedDoc.blocks.length > 0) {
                    const logoBlocks = storedDoc.blocks.filter((b: any) => b.type === 'logo');
                    console.log('[Test Email] Logo blocks found:', logoBlocks.length, logoBlocks.map((b: any) => ({ src: (b.content as any)?.src, visible: b.visible })));
                    
                    const fullDoc: EmailDocument = {
                        id: storedDoc.id || campaign!.id,
                        name: storedDoc.name || campaign!.name || 'Email',
                        subject: storedDoc.subject || campaign!.subject || 'Email',
                        previewText: storedDoc.previewText || '',
                        blocks: storedDoc.blocks || [],
                        globalStyles: storedDoc.globalStyles || DEFAULT_EMAIL_GLOBAL_STYLES,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };
                    payload.htmlContent = generateEmailHtml(fullDoc);
                    payload.subject = fullDoc.subject;
                    console.log('[Test Email] Generated HTML length:', payload.htmlContent.length, 'contains logo img:', payload.htmlContent.includes('logo_quimera'));
                } else {
                    console.log('[Test Email] No stored blocks — CF will use campaign.htmlContent from Firestore');
                }
            }

            const result = await sendTestFn(payload);
            const resData = result.data as any;

            if (resData.success) {
                setTestSendSuccess(`Email de prueba enviado a ${testEmail}`);
                setTimeout(() => {
                    setShowTestEmailModal(false);
                    setTestSendSuccess(null);
                }, 3000);
            } else {
                throw new Error(resData.error || 'Error desconocido');
            }
        } catch (err: any) {
            console.error('Error sending test email:', err);
            setTestSendError(err.message || 'Error al enviar email de prueba');
        } finally {
            setSendingTest(false);
        }
    };

    // =============================================================================
    // SEND CAMPAIGN
    // =============================================================================

    const handleOpenSendConfirm = (campaignId: string) => {
        setSendingCampaignId(campaignId);
        setSendCampaignError(null);
        setShowSendConfirmModal(true);
    };

    const handleSendCampaign = async () => {
        if (!sendingCampaignId) return;

        const campaign = campaigns.find(c => c.id === sendingCampaignId);
        if (!campaign) return;

        setShowSendConfirmModal(false);
        setSendCampaignError(null);

        try {
            const functions = getFunctions();
            const sendCampaignFn = httpsCallable(functions, 'sendCampaign');

            const result = await sendCampaignFn({
                userId: campaign.userId || user?.uid || 'admin',
                storeId: campaign.projectId || 'admin',
                campaignId: sendingCampaignId,
            });

            const resData = result.data as any;

            if (resData.success && resData.sent > 0) {
                setSendCampaignSuccess(`Campaña enviada exitosamente a ${resData.sent} destinatarios`);
                setTimeout(() => setSendCampaignSuccess(null), 5000);
            } else if (!resData.success || resData.sent === 0) {
                const errorMsg = resData.error || `No se encontraron destinatarios. Verifica que la audiencia tenga contactos agregados.`;
                setSendCampaignError(errorMsg);
                setTimeout(() => setSendCampaignError(null), 8000);
            }
        } catch (err: any) {
            console.error('Error sending campaign:', err);
            setSendCampaignError(err.message || 'Error al enviar la campaña');
            setTimeout(() => setSendCampaignError(null), 5000);
        } finally {
            setSendingCampaignId(null);
        }
    };

    // =============================================================================
    // DELETE / DUPLICATE CAMPAIGN
    // =============================================================================

    const handleDeleteCampaign = async (campaign: CrossTenantCampaign) => {
        setConfirmModal({
            show: true,
            title: 'Eliminar Campaña',
            message: `¿Estás seguro de eliminar la campaña "${campaign.name}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                try {
                    const collectionPath = campaign.tenantId === 'admin'
                        ? 'adminEmailCampaigns'
                        : `users/${campaign.userId}/projects/${campaign.projectId}/emailCampaigns`;
                    await deleteDoc(doc(db, collectionPath, campaign.id));
                    setCampaigns(prev => prev.filter(c => !(c.id === campaign.id && c.tenantId === campaign.tenantId)));
                } catch (err) {
                    console.error('Delete error:', err);
                }
                setConfirmModal(prev => ({ ...prev, show: false }));
            },
        });
    };

    const handleDuplicateCampaign = async (campaign: CrossTenantCampaign) => {
        try {
            // Deep-clone emailDocument to strip any undefined values Firestore would reject
            const clonedEmailDoc = (campaign as any).emailDocument
                ? JSON.parse(JSON.stringify((campaign as any).emailDocument))
                : null;
            const dupData = {
                name: `${campaign.name} (Copia)`,
                subject: campaign.subject || '',
                previewText: campaign.previewText || '',
                type: campaign.type || 'newsletter',
                htmlContent: campaign.htmlContent || '',
                emailDocument: clonedEmailDoc,
                audienceType: 'all' as const,
                status: 'draft' as CampaignStatus,
                stats: { totalRecipients: 0, sent: 0, delivered: 0, opened: 0, totalOpens: 0, uniqueOpens: 0, clicked: 0, totalClicks: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0 },
                tags: ['duplicate'],
                createdBy: user?.uid || 'admin',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            const docRef = await addDoc(collection(db, 'adminEmailCampaigns'), dupData);
            setCampaigns(prev => [{
                id: docRef.id, ...dupData,
                tenantId: 'admin', tenantName: 'Super Admin',
                userId: user?.uid || 'admin', projectId: 'admin',
                createdAt: new Date(), updatedAt: new Date(),
            } as CrossTenantCampaign, ...prev]);
        } catch (err) {
            console.error('Duplicate error:', err);
        }
    };

    // =============================================================================
    // AUTOMATION ACTIONS
    // =============================================================================

    const createAutomation = async () => {
        if (!newAutomation.name) return;

        try {
            const triggerEvent = selectedTemplate?.triggerEvent || 'customer.created';
            const automationType = selectedTemplate?.type || 'welcome';
            // Sanitize steps for Firestore (strip undefined values)
            const sanitizedSteps = (newAutomation.steps || []).map(step => JSON.parse(JSON.stringify(step)));

            const automationData = {
                name: newAutomation.name,
                description: newAutomation.description || '',
                type: automationType,
                category: newAutomation.category || selectedTemplate?.category || 'lifecycle',
                status: newAutomation.status,
                triggerConfig: {
                    type: 'event' as const,
                    event: triggerEvent,
                },
                audienceId: newAutomation.audienceId || '',
                steps: sanitizedSteps,
                templateId: '',
                subject: newAutomation.subject || `${selectedTemplate?.name || 'Automatización'} — Auto`,
                delayMinutes: newAutomation.delayMinutes,
                stats: { triggered: 0, sent: 0, opened: 0, clicked: 0, converted: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'adminEmailAutomations'), automationData);
            setShowCreateAutomation(false);
            setSelectedTemplate(null);
            setEditingAutomationId(null);
            setNewAutomation({ name: '', subject: '', description: '', delayMinutes: 60, status: 'draft', steps: [], category: 'lifecycle', audienceId: '' });
        } catch (err) {
            console.error('[AdminEmailHub] Error creating automation:', err);
        }
    };

    const updateAutomation = async () => {
        if (!editingAutomationId || !newAutomation.name) return;

        try {
            const sanitizedSteps = (newAutomation.steps || []).map(step => JSON.parse(JSON.stringify(step)));

            await updateDoc(doc(db, 'adminEmailAutomations', editingAutomationId), {
                name: newAutomation.name,
                description: newAutomation.description || '',
                category: newAutomation.category || 'lifecycle',
                subject: newAutomation.subject || '',
                audienceId: newAutomation.audienceId || '',
                steps: sanitizedSteps,
                delayMinutes: newAutomation.delayMinutes,
                updatedAt: serverTimestamp(),
            });

            setShowCreateAutomation(false);
            setSelectedTemplate(null);
            setEditingAutomationId(null);
            setNewAutomation({ name: '', subject: '', description: '', delayMinutes: 60, status: 'draft', steps: [], category: 'lifecycle', audienceId: '' });
        } catch (err) {
            console.error('[AdminEmailHub] Error updating automation:', err);
        }
    };

    const duplicateAutomation = async (automation: EmailAutomation) => {
        try {
            const sanitizedSteps = (automation.steps || []).map(step => JSON.parse(JSON.stringify(step)));
            const dupData = {
                name: `${automation.name} (Copia)`,
                description: automation.description || '',
                type: automation.type,
                category: automation.category || 'lifecycle',
                status: 'draft' as AutomationStatus,
                triggerConfig: JSON.parse(JSON.stringify(automation.triggerConfig)),
                audienceId: automation.audienceId || '',
                steps: sanitizedSteps,
                templateId: automation.templateId || '',
                subject: automation.subject || '',
                delayMinutes: automation.delayMinutes || 0,
                stats: { triggered: 0, sent: 0, opened: 0, clicked: 0, converted: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            await addDoc(collection(db, 'adminEmailAutomations'), dupData);
        } catch (err) {
            console.error('[AdminEmailHub] Error duplicating automation:', err);
        }
    };

    const openEditAutomation = (automation: EmailAutomation) => {
        setEditingAutomationId(automation.id);
        setNewAutomation({
            name: automation.name,
            subject: automation.subject || '',
            description: automation.description || '',
            delayMinutes: automation.delayMinutes || 0,
            status: automation.status,
            steps: automation.steps || [],
            category: automation.category || 'lifecycle',
            audienceId: automation.audienceId || '',
        });
        // Try to find the matching template
        const matchingTemplate = data.automations.length > 0
            ? null
            : null;
        setSelectedTemplate(matchingTemplate);
        setShowCreateAutomation(true);
    };

    const toggleAutomationStatus = async (automation: EmailAutomation) => {
        const newStatus: AutomationStatus = automation.status === 'active' ? 'paused' : 'active';
        try {
            await updateDoc(doc(db, 'adminEmailAutomations', automation.id), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('[AdminEmailHub] Error toggling automation:', err);
        }
    };

    const deleteAutomation = async (automationId: string) => {
        try {
            await deleteDoc(doc(db, 'adminEmailAutomations', automationId));
        } catch (err) {
            console.error('[AdminEmailHub] Error deleting automation:', err);
        }
    };

    return {
        showEmailEditor, setShowEmailEditor,
        showTemplateGallery, setShowTemplateGallery,
        emailDocument, setEmailDocument,
        editingCampaignId, setEditingCampaignId,
        selectedCampaign, setSelectedCampaign,
        showNewCampaignModal, setShowNewCampaignModal,
        newCampaignForm, setNewCampaignForm,
        showTestEmailModal, setShowTestEmailModal,
        testEmail, setTestEmail,
        sendingTest, testSendError, testSendSuccess,
        showSendConfirmModal, sendingCampaignId,
        sendCampaignError, sendCampaignSuccess,
        showDetailPanel, setShowDetailPanel,
        detailCampaign, setDetailCampaign,
        confirmModal, setConfirmModal,
        showCreateAutomation, setShowCreateAutomation,
        selectedTemplate, setSelectedTemplate,
        newAutomation, setNewAutomation,
        editingAutomationId, setEditingAutomationId,
        handleEditCampaignVisual, handleOpenTemplateGallery,
        handleSelectTemplate, handleStartBlank,
        handleSaveFromEditor, handleCloseEditor,
        openDetailPanel,
        handleUpdateCampaignStatus, handleUpdateCampaignAudience,
        handleSendTestEmail, handleOpenSendConfirm, handleSendCampaign,
        handleDeleteCampaign, handleDuplicateCampaign,
        createAutomation, updateAutomation, duplicateAutomation,
        toggleAutomationStatus, deleteAutomation, openEditAutomation,
    };
}
