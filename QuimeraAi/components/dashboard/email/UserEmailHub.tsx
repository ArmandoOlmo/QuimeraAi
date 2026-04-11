/**
 * UserEmailHub
 *
 * Feature-rich user-facing Email Hub — 6-tab architecture matching the Admin Email Hub.
 * Tabs: Overview, Campaigns, Audiences, Analytics, Automations, AI Studio
 *
 * This component is rendered by EmailDashboard once a project is selected.
 * It composes the modular hooks and views from the email-hub directory.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    Mail, Send, Users, BarChart3, Zap, Sparkles,
    Loader2, Plus, Search, X, ArrowLeft, Menu,
    Eye, Edit2, Copy, Trash2, Upload, Target, AlertTriangle,
    TestTube,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Hooks
import { useUserEmailData } from './email-hub/hooks/useUserEmailData';
import { useUserEmailActions } from './email-hub/hooks/useUserEmailActions';
import { useUserAudienceActions } from './email-hub/hooks/useUserAudienceActions';
import { useUserAIEmailStudio } from './email-hub/hooks/useUserAIEmailStudio';

// Views
import OverviewTab from './email-hub/views/OverviewTab';
import AnalyticsTab from './email-hub/views/AnalyticsTab';
import AutomationsTab from './email-hub/views/AutomationsTab';
import AIStudioTab from './email-hub/views/AIStudioTab';

// Types
import type { UserEmailTab, ConfirmModalState, UserEmailCampaign } from './email-hub/types';
import { formatDate, getStatusColor, getStatusIcon } from './email-hub/helpers';
import type { CampaignStatus } from '../../../types/email';

// Shared components
import DashboardSidebar from '../DashboardSidebar';

// Email editor
import EmailEditor from './editor/EmailEditor';

interface UserEmailHubProps {
    userId: string;
    projectId: string;
    projectName: string;
    onBack: () => void;
}

const UserEmailHub: React.FC<UserEmailHubProps> = ({
    userId, projectId, projectName, onBack,
}) => {
    const { t } = useTranslation();

    // ── Tab & UI state ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<UserEmailTab>('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ show: false, title: '', message: '', onConfirm: () => {} });

    // ── Campaign detail / editor state ──────────────────────────────────────
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [detailCampaign, setDetailCampaign] = useState<UserEmailCampaign | null>(null);
    const [campaignSearch, setCampaignSearch] = useState('');

    // ── Audience UI state ───────────────────────────────────────────────────
    const [audienceSearch, setAudienceSearch] = useState('');

    // ── Modular Hooks ───────────────────────────────────────────────────────
    const data = useUserEmailData(userId, projectId);
    const actions = useUserEmailActions(data, userId, projectId);
    const audienceActions = useUserAudienceActions(data, userId, projectId);
    const aiStudio = useUserAIEmailStudio(data, activeTab, userId, projectId, projectName);

    const {
        isLoading, stats, campaigns, audiences, logs, automations, monthlyData,
    } = data;

    const {
        showEmailEditor, emailDocument,
        handleEditCampaignVisual, handleSaveFromEditor, handleCloseEditor,
        handleOpenSendConfirm, editingCampaignId, setEditingCampaignId,
        showNewCampaignModal, setShowNewCampaignModal, newCampaignForm, setNewCampaignForm,
        handleStartBlank, handleDuplicateCampaign, handleDeleteCampaign,
        handleUpdateCampaignStatus, handleUpdateCampaignAudience,
        showTestEmailModal, setShowTestEmailModal, testEmail, setTestEmail, handleSendTestEmail, sendingTest,
        showCreateAutomation, setShowCreateAutomation, selectedTemplate, setSelectedTemplate,
        newAutomation, setNewAutomation, editingAutomationId, setEditingAutomationId,
        createAutomation, updateAutomation, duplicateAutomation, toggleAutomationStatus,
        deleteAutomation, openEditAutomation,
    } = actions;

    // ── Tab definitions ─────────────────────────────────────────────────────
    const tabs: { id: UserEmailTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'overview', label: 'Vista General', icon: <Mail size={16} /> },
        { id: 'campaigns', label: 'Campañas', icon: <Send size={16} />, count: campaigns.length },
        { id: 'audiences', label: 'Audiencias', icon: <Users size={16} />, count: audiences.length },
        { id: 'analytics', label: 'Analíticas', icon: <BarChart3 size={16} /> },
        { id: 'automations', label: 'Automatizaciones', icon: <Zap size={16} />, count: automations.length },
        { id: 'ai-studio', label: 'AI Studio', icon: <Sparkles size={16} /> },
    ];

    // ── Filtered lists ──────────────────────────────────────────────────────
    const filteredCampaigns = useMemo(() =>
        campaigns.filter(c =>
            !campaignSearch || c.name?.toLowerCase().includes(campaignSearch.toLowerCase()) || c.subject?.toLowerCase().includes(campaignSearch.toLowerCase())
        ),
    [campaigns, campaignSearch]);

    const filteredAudiences = useMemo(() =>
        audiences.filter(a =>
            !audienceSearch || a.name?.toLowerCase().includes(audienceSearch.toLowerCase())
        ),
    [audiences, audienceSearch]);

    // ── Email editor for automation steps ───────────────────────────────────
    const openEmailEditorForStep = useCallback((step: any, automationName: string) => {
        const fakeCampaign = {
            id: step.emailConfig?.campaignId || '',
            name: `[Auto] ${automationName} — ${step.label}`,
            subject: step.emailConfig?.subject || '',
            previewText: step.emailConfig?.previewText || '',
            status: 'draft',
            emailDocument: step.emailConfig?.emailDocumentId ? undefined : null,
        } as any;
        handleEditCampaignVisual(fakeCampaign);
    }, [handleEditCampaignVisual]);

    // ── Handle create campaign from modal ────────────────────────────────────
    const handleCreateCampaign = useCallback(() => {
        if (!newCampaignForm.name || !newCampaignForm.subject) return;
        // Use the blank editor flow — sets up form data then opens visual editor
        handleStartBlank();
        setShowNewCampaignModal(false);
    }, [newCampaignForm, handleStartBlank, setShowNewCampaignModal]);

    // =====================================================================
    // RENDER: EMAIL EDITOR (full overlay)
    // =====================================================================

    if (showEmailEditor && emailDocument) {
        return (
            <EmailEditor
                initialDocument={emailDocument}
                onSave={handleSaveFromEditor}
                onClose={handleCloseEditor}
            />
        );
    }

    // =====================================================================
    // RENDER: CAMPAIGNS TAB
    // =====================================================================

    const renderCampaigns = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-editor-text-primary">Campañas</h2>
                    <p className="text-sm text-editor-text-secondary">{campaigns.length} campañas totales</p>
                </div>
                <button
                    onClick={() => setShowNewCampaignModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                >
                    <Plus size={16} />
                    Nueva Campaña
                </button>
            </div>
            {/* Search */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                <div className="flex items-center gap-2 bg-editor-bg/50 rounded-lg px-3 py-2">
                    <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                    <input type="text" placeholder="Buscar campañas..." value={campaignSearch} onChange={e => setCampaignSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-editor-text-primary placeholder:text-editor-text-secondary" />
                    {campaignSearch && <button onClick={() => setCampaignSearch('')} className="text-editor-text-secondary hover:text-editor-text-primary"><X size={14} /></button>}
                </div>
            </div>
            {/* Campaign List */}
            {filteredCampaigns.length > 0 ? (
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
                    <div className="divide-y divide-editor-border">
                        {filteredCampaigns.map(campaign => (
                            <div key={campaign.id} className="flex items-center gap-4 px-5 py-4 hover:bg-editor-bg/50 transition-colors cursor-pointer group" onClick={() => { setDetailCampaign(campaign); setShowDetailPanel(true); }}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-editor-text-primary truncate">{campaign.name}</p>
                                    <p className="text-xs text-editor-text-secondary mt-0.5">{campaign.subject}</p>
                                    <p className="text-xs text-editor-text-secondary mt-0.5">{formatDate(campaign.createdAt)}</p>
                                </div>
                                <div className="hidden md:flex items-center gap-6 text-xs text-editor-text-secondary">
                                    {campaign.stats && campaign.stats.sent > 0 && (
                                        <>
                                            <div className="text-center">
                                                <p className="font-medium text-editor-text-primary text-sm">{campaign.stats.sent.toLocaleString()}</p>
                                                <p>enviados</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-editor-text-primary text-sm">
                                                    {campaign.stats.sent > 0 ? `${(((campaign.stats.uniqueOpens || 0) / campaign.stats.sent) * 100).toFixed(1)}%` : '—'}
                                                </p>
                                                <p>apertura</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <span className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                                    {getStatusIcon(campaign.status)}
                                    {campaign.status}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {(campaign.status === 'draft' || campaign.status === 'approved') && (
                                        <button onClick={(e) => { e.stopPropagation(); handleEditCampaignVisual(campaign); }} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Editar"><Edit2 size={14} className="text-purple-400" /></button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleDuplicateCampaign(campaign); }} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Duplicar"><Copy size={14} className="text-editor-text-secondary" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(campaign); }} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Eliminar"><Trash2 size={14} className="text-red-400" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-editor-panel-bg border border-editor-border rounded-xl">
                    <Send size={48} className="mx-auto text-editor-text-secondary mb-4 opacity-30" />
                    <h3 className="text-lg font-medium text-editor-text-primary mb-2">
                        {campaignSearch ? 'No se encontraron campañas' : 'No hay campañas'}
                    </h3>
                    <p className="text-editor-text-secondary text-sm mb-6">
                        {campaignSearch ? 'Ajusta la búsqueda' : 'Crea tu primera campaña de email marketing'}
                    </p>
                    {!campaignSearch && (
                        <button onClick={() => setShowNewCampaignModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl">
                            <Plus size={16} /> Crear Campaña
                        </button>
                    )}
                </div>
            )}

            {/* Create Campaign Modal */}
            {showNewCampaignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowNewCampaignModal(false)}>
                    <div className="bg-editor-bg border border-editor-border w-full max-w-md rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-editor-border flex items-center justify-between">
                            <h2 className="text-lg font-bold text-editor-text-primary">Nueva Campaña</h2>
                            <button onClick={() => setShowNewCampaignModal(false)} className="p-1.5 hover:bg-editor-border/40 rounded-lg"><X size={18} className="text-editor-text-secondary" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Nombre *</label>
                                <input type="text" value={newCampaignForm.name} onChange={e => setNewCampaignForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Ej: Newsletter Mensual" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Asunto *</label>
                                <input type="text" value={newCampaignForm.subject} onChange={e => setNewCampaignForm(prev => ({ ...prev, subject: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Línea de asunto del email" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Preview Text</label>
                                <input type="text" value={newCampaignForm.previewText || ''} onChange={e => setNewCampaignForm(prev => ({ ...prev, previewText: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Texto de preview" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Audiencia</label>
                                <select value={newCampaignForm.audienceType || 'all'} onChange={e => setNewCampaignForm(prev => ({ ...prev, audienceType: e.target.value as any }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                    <option value="all">Todos los contactos</option>
                                    <option value="segment">Segmento específico</option>
                                </select>
                                {newCampaignForm.audienceType === 'segment' && audiences.length > 0 && (
                                    <select value={newCampaignForm.audienceSegmentId || ''} onChange={e => setNewCampaignForm(prev => ({ ...prev, audienceSegmentId: e.target.value }))} className="w-full mt-2 bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                        <option value="">Seleccionar segmento</option>
                                        {audiences.map(a => (<option key={a.id} value={a.id}>{a.name} ({a.estimatedCount || a.staticMemberCount || 0} contactos)</option>))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="p-5 border-t border-editor-border flex justify-end gap-3">
                            <button onClick={() => setShowNewCampaignModal(false)} className="px-4 py-2 text-sm text-editor-text-secondary hover:text-editor-text-primary transition-colors">Cancelar</button>
                            <button onClick={handleCreateCampaign} disabled={!newCampaignForm.name || !newCampaignForm.subject} className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">Crear Campaña</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Detail Panel */}
            {showDetailPanel && detailCampaign && (
                <div className="fixed inset-0 z-[180] flex" onClick={() => setShowDetailPanel(false)}>
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" />
                    <div className="w-full max-w-lg bg-editor-bg border-l border-editor-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 bg-editor-bg border-b border-editor-border p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-editor-text-primary truncate">{detailCampaign.name}</h3>
                                    <p className="text-xs text-editor-text-secondary truncate">{detailCampaign.subject}</p>
                                </div>
                                <button onClick={() => setShowDetailPanel(false)} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors"><X size={18} className="text-editor-text-secondary" /></button>
                            </div>
                        </div>
                        <div className="p-5 space-y-6">
                            {/* Status */}
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">Estado</label>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border font-medium ${getStatusColor(detailCampaign.status)}`}>
                                        {getStatusIcon(detailCampaign.status)} {detailCampaign.status}
                                    </span>
                                    {detailCampaign.status !== 'sent' && detailCampaign.status !== 'sending' && (
                                        <select value={detailCampaign.status} onChange={e => handleUpdateCampaignStatus(detailCampaign.id, e.target.value as CampaignStatus)} className="px-3 py-1.5 bg-editor-panel-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none">
                                            <option value="draft">Borrador</option>
                                            <option value="approved">Aprobada</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                            {/* Audience */}
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Target size={14} /> Audiencia</label>
                                {detailCampaign.status !== 'sent' && detailCampaign.status !== 'sending' ? (
                                    <select value={detailCampaign.audienceType || 'all'} onChange={e => handleUpdateCampaignAudience(detailCampaign.id, e.target.value as any)} className="w-full px-3 py-2.5 bg-editor-panel-bg border border-editor-border rounded-xl text-sm text-editor-text-primary focus:outline-none">
                                        <option value="all">Todos los contactos</option>
                                        <option value="segment">Segmento específico</option>
                                    </select>
                                ) : (
                                    <p className="text-sm text-editor-text-primary bg-editor-panel-bg border border-editor-border rounded-lg px-3 py-2">
                                        {detailCampaign.audienceType === 'all' ? 'Todos los contactos' : `🎯 ${audiences.find(a => a.id === detailCampaign.audienceSegmentId)?.name || 'Segmento'}`}
                                    </p>
                                )}
                            </div>
                            {/* Stats */}
                            {detailCampaign.stats && detailCampaign.stats.sent > 0 && (
                                <div className="bg-editor-panel-bg border border-editor-border rounded-xl divide-y divide-editor-border">
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Enviados</span><span className="text-editor-text-primary font-medium">{detailCampaign.stats.sent.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Tasa de apertura</span><span className="text-editor-text-primary font-medium">{detailCampaign.stats.sent > 0 ? `${(((detailCampaign.stats.uniqueOpens || 0) / detailCampaign.stats.sent) * 100).toFixed(1)}%` : '—'}</span></div>
                                </div>
                            )}
                            {/* Email Preview */}
                            {detailCampaign.htmlContent && (
                                <div>
                                    <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Eye size={14} /> Preview</label>
                                    <div className="border border-editor-border rounded-xl overflow-hidden bg-white">
                                        <iframe srcDoc={detailCampaign.htmlContent} title="Email Preview" className="w-full border-0" style={{ height: '400px', pointerEvents: 'none' }} sandbox="allow-same-origin" />
                                    </div>
                                </div>
                            )}
                            {/* Actions */}
                            <div className="space-y-2">
                                {(detailCampaign.status === 'draft' || detailCampaign.status === 'approved') && (
                                    <>
                                        <button onClick={() => { setShowDetailPanel(false); handleEditCampaignVisual(detailCampaign); }} className="w-full flex items-center gap-3 px-4 py-3 bg-editor-panel-bg border border-editor-border rounded-xl hover:border-purple-500/50 transition-all text-left">
                                            <Edit2 size={18} className="text-purple-400" /><div><p className="text-sm font-medium text-editor-text-primary">Editar Email</p><p className="text-xs text-editor-text-secondary">Editor visual de bloques</p></div>
                                        </button>
                                        <button onClick={() => { setEditingCampaignId(detailCampaign.id); setTestEmail(''); setShowTestEmailModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 bg-editor-panel-bg border border-editor-border rounded-xl hover:border-blue-500/50 transition-all text-left">
                                            <TestTube size={18} className="text-blue-400" /><div><p className="text-sm font-medium text-editor-text-primary">Enviar Email de Prueba</p><p className="text-xs text-editor-text-secondary">Verifica antes de enviar</p></div>
                                        </button>
                                        <button onClick={() => { setShowDetailPanel(false); handleOpenSendConfirm(detailCampaign.id); }} className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-xl hover:from-green-600/20 transition-all text-left">
                                            <Send size={18} className="text-green-400" /><div><p className="text-sm font-medium text-editor-text-primary">Enviar Campaña</p><p className="text-xs text-editor-text-secondary">Enviar a todos los destinatarios</p></div>
                                        </button>
                                    </>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => { handleDuplicateCampaign(detailCampaign); setShowDetailPanel(false); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-editor-panel-bg border border-editor-border rounded-xl text-sm text-editor-text-secondary hover:text-editor-text-primary transition-all"><Copy size={14} /> Duplicar</button>
                                    <button onClick={() => { handleDeleteCampaign(detailCampaign); setShowDetailPanel(false); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14} /> Eliminar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Email Modal */}
            {showTestEmailModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowTestEmailModal(false)}>
                    <div className="bg-editor-bg border border-editor-border w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-editor-text-primary mb-4">Enviar Email de Prueba</h3>
                        <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="tu@email.com" className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowTestEmailModal(false)} className="flex-1 px-4 py-2.5 text-sm text-editor-text-secondary border border-editor-border rounded-xl hover:bg-editor-border transition-colors">Cancelar</button>
                            <button onClick={() => handleSendTestEmail()} disabled={!testEmail || sendingTest} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl disabled:opacity-50 transition-all">
                                {sendingTest ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // =====================================================================
    // RENDER: AUDIENCES TAB
    // =====================================================================

    const renderAudiences = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-editor-text-primary">Audiencias</h2>
                    <p className="text-sm text-editor-text-secondary">{audiences.length} audiencias</p>
                </div>
                <button onClick={() => audienceActions.setShowCreateAudience(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all">
                    <Plus size={16} /> Nueva Audiencia
                </button>
            </div>
            {/* Search */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                <div className="flex items-center gap-2 bg-editor-bg/50 rounded-lg px-3 py-2">
                    <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                    <input type="text" placeholder="Buscar audiencias..." value={audienceSearch} onChange={e => setAudienceSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-editor-text-primary placeholder:text-editor-text-secondary" />
                </div>
            </div>
            {/* Audience Cards */}
            {filteredAudiences.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAudiences.map(aud => (
                        <div key={aud.id} className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 hover:border-editor-accent/30 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-editor-text-primary truncate">{aud.name}</h3>
                                    {aud.description && <p className="text-xs text-editor-text-secondary mt-0.5 line-clamp-2">{aud.description}</p>}
                                </div>
                                <button onClick={() => audienceActions.handleDeleteAudience(aud.id, setConfirmModal)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-editor-text-secondary mb-3">
                                <span className="flex items-center gap-1"><Users size={12} /> {aud.estimatedCount || aud.staticMemberCount || 0} contactos</span>
                                <span>{formatDate(aud.createdAt)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { audienceActions.setSelectedAudienceId(aud.id); audienceActions.setManualEmail(''); }} className="flex-1 text-xs px-3 py-2 bg-editor-bg border border-editor-border rounded-lg hover:border-editor-accent/30 transition-colors text-editor-text-primary">
                                    Gestionar
                                </button>
                                <button onClick={() => { audienceActions.setSelectedAudienceId(aud.id); audienceActions.setShowImportCSV(true); }} className="text-xs px-3 py-2 bg-editor-bg border border-editor-border rounded-lg hover:border-editor-accent/30 transition-colors text-editor-text-primary flex items-center gap-1">
                                    <Upload size={12} /> CSV
                                </button>
                            </div>
                            {/* Expanded member management */}
                            {audienceActions.selectedAudienceId === aud.id && !audienceActions.showImportCSV && (
                                <div className="mt-4 border-t border-editor-border pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <input type="email" value={audienceActions.manualEmail} onChange={e => audienceActions.setManualEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') audienceActions.handleAddManualEmail(aud.id); }} placeholder="email@ejemplo.com" className="flex-1 bg-editor-bg border border-editor-border rounded-lg px-3 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                                        <button onClick={() => audienceActions.handleAddManualEmail(aud.id)} className="px-3 py-1.5 text-xs bg-editor-accent/20 text-editor-accent rounded-lg hover:bg-editor-accent/30">Añadir</button>
                                    </div>
                                    {(audienceActions.audienceMembers[aud.id] || (aud as any)?.members || []).length > 0 && (
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {(audienceActions.audienceMembers[aud.id] || (aud as any)?.members || []).map((m: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between px-2 py-1 bg-editor-bg/50 rounded text-xs">
                                                    <span className="text-editor-text-primary truncate">{m.email}</span>
                                                    <button onClick={() => audienceActions.handleRemoveMember(aud.id, m.email)} className="text-red-400 hover:text-red-300 p-0.5"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* CSV import */}
                            {audienceActions.selectedAudienceId === aud.id && audienceActions.showImportCSV && (
                                <div className="mt-4 border-t border-editor-border pt-4">
                                    <label className="block text-xs font-medium text-editor-text-secondary mb-2">Importar CSV</label>
                                    <input type="file" accept=".csv" onChange={e => { if (e.target.files?.[0]) audienceActions.handleCSVUpload(aud.id, e.target.files[0]); }} disabled={audienceActions.csvUploading} className="text-xs text-editor-text-primary" />
                                    {audienceActions.csvUploading && <p className="text-xs text-editor-accent mt-1">Importando...</p>}
                                    <button onClick={() => audienceActions.setShowImportCSV(false)} className="mt-2 text-xs text-editor-text-secondary hover:text-editor-text-primary">Cerrar</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-xl">
                    <Users size={48} className="mx-auto text-editor-text-secondary mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-editor-text-primary mb-2">No hay audiencias</h3>
                    <p className="text-editor-text-secondary text-sm mb-4">Crea tu primera audiencia</p>
                    <button onClick={() => audienceActions.setShowCreateAudience(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl">
                        <Plus size={16} /> Nueva Audiencia
                    </button>
                </div>
            )}

            {/* Create Audience Modal */}
            {audienceActions.showCreateAudience && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => audienceActions.setShowCreateAudience(false)}>
                    <div className="bg-editor-bg border border-editor-border w-full max-w-md rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-editor-border flex items-center justify-between">
                            <h2 className="text-lg font-bold text-editor-text-primary">Nueva Audiencia</h2>
                            <button onClick={() => audienceActions.setShowCreateAudience(false)} className="p-1.5 hover:bg-editor-border/40 rounded-lg"><X size={18} className="text-editor-text-secondary" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Nombre *</label>
                                <input type="text" value={audienceActions.newAudienceForm.name} onChange={e => audienceActions.setNewAudienceForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Ej: Clientes VIP" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Descripción</label>
                                <textarea value={audienceActions.newAudienceForm.description} onChange={e => audienceActions.setNewAudienceForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" placeholder="Describe esta audiencia..." />
                            </div>
                        </div>
                        <div className="p-5 border-t border-editor-border flex justify-end gap-3">
                            <button onClick={() => audienceActions.setShowCreateAudience(false)} className="px-4 py-2 text-sm text-editor-text-secondary">Cancelar</button>
                            <button onClick={audienceActions.handleCreateAudience} disabled={!audienceActions.newAudienceForm.name} className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all">Crear Audiencia</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // =====================================================================
    // MAIN RENDER
    // =====================================================================

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary md:hidden transition-colors"><Menu className="w-5 h-5" /></button>
                        <Mail className="text-editor-accent w-5 h-5" />
                        <h1 className="text-lg font-semibold text-editor-text-primary">Email Hub</h1>
                        <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-400 rounded-full">{projectName}</span>
                    </div>
                    <button onClick={onBack} className="hidden md:flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-editor-text-secondary hover:text-editor-text-primary transition-colors"><ArrowLeft className="w-4 h-4" /> Volver</button>
                </header>

                {/* Tab Navigation */}
                <div className="bg-editor-bg border-b border-editor-border px-4 sm:px-6 overflow-x-auto flex-shrink-0">
                    <div className="flex items-center gap-1 min-w-max">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-editor-accent text-editor-accent' : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'}`}>
                                {tab.icon}
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (<span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${activeTab === tab.id ? 'bg-editor-accent/20 text-editor-accent' : 'bg-editor-border/50 text-editor-text-secondary'}`}>{tab.count}</span>)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-editor-accent animate-spin" />
                                <span className="text-sm text-editor-text-secondary">Cargando datos...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab stats={stats} campaigns={campaigns} setActiveTab={setActiveTab} />}
                            {activeTab === 'campaigns' && renderCampaigns()}
                            {activeTab === 'audiences' && renderAudiences()}
                            {activeTab === 'analytics' && <AnalyticsTab stats={stats} campaigns={campaigns} monthlyData={monthlyData} />}
                            {activeTab === 'automations' && (
                                <AutomationsTab
                                    automations={automations}
                                    audiences={audiences as any}
                                    showCreateAutomation={showCreateAutomation}
                                    setShowCreateAutomation={setShowCreateAutomation}
                                    selectedTemplate={selectedTemplate}
                                    setSelectedTemplate={setSelectedTemplate}
                                    newAutomation={newAutomation}
                                    setNewAutomation={setNewAutomation}
                                    editingAutomationId={editingAutomationId}
                                    setEditingAutomationId={setEditingAutomationId}
                                    createAutomation={createAutomation}
                                    updateAutomation={updateAutomation}
                                    duplicateAutomation={duplicateAutomation}
                                    toggleAutomationStatus={toggleAutomationStatus}
                                    deleteAutomation={deleteAutomation}
                                    openEditAutomation={openEditAutomation}
                                    confirmModal={confirmModal}
                                    setConfirmModal={setConfirmModal}
                                    onDesignEmail={openEmailEditorForStep}
                                />
                            )}
                            {activeTab === 'ai-studio' && (
                                <AIStudioTab
                                    aiMessages={aiStudio.aiMessages}
                                    aiInput={aiStudio.aiInput}
                                    setAiInput={aiStudio.setAiInput}
                                    aiThinking={aiStudio.aiThinking}
                                    aiCreating={aiStudio.aiCreating}
                                    aiCreatedItems={aiStudio.aiCreatedItems}
                                    aiChatRef={aiStudio.aiChatRef}
                                    sendAIMessage={aiStudio.sendAIMessage}
                                    initAIStudio={aiStudio.initAIStudio}
                                    isVoiceActive={aiStudio.isVoiceActive}
                                    isVoiceConnecting={aiStudio.isVoiceConnecting}
                                    liveUserTranscript={aiStudio.liveUserTranscript}
                                    liveModelTranscript={aiStudio.liveModelTranscript}
                                    startVoiceSession={aiStudio.startVoiceSession}
                                    stopVoiceSession={aiStudio.stopVoiceSession}
                                    aiCreateCampaign={aiStudio.aiCreateCampaign}
                                    aiCreateAudience={aiStudio.aiCreateAudience}
                                    aiCreateAutomation={aiStudio.aiCreateAutomation}
                                />
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* Global Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
                    <div className="bg-editor-bg border border-editor-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center mb-4"><div className="p-3 bg-red-500/10 rounded-full"><AlertTriangle size={28} className="text-red-400" /></div></div>
                        <h3 className="text-lg font-bold text-editor-text-primary text-center mb-2">{confirmModal.title}</h3>
                        <p className="text-sm text-editor-text-secondary text-center mb-6 leading-relaxed">{confirmModal.message}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="flex-1 px-4 py-2.5 text-sm font-medium text-editor-text-secondary bg-editor-panel-bg border border-editor-border rounded-xl hover:bg-editor-border transition-colors">Cancelar</button>
                            <button onClick={confirmModal.onConfirm} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"><span className="flex items-center justify-center gap-2"><Trash2 size={14} /> Confirmar</span></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserEmailHub;
