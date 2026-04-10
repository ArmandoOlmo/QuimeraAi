/**
 * AdminEmailHub — Shell Orchestrator
 *
 * Super Admin Email Marketing Hub — Lightweight shell component that composes
 * the modularised hooks and passes the relevant props to each tab view.
 *
 * Architecture:
 *   - useAdminEmailData:  real-time Firestore data + computed stats
 *   - useAdminEmailActions: campaign CRUD, editor state, send/test
 *   - useAudienceActions: audience CRUD, CSV import, member management
 *   - useAIEmailStudio: AI text/voice chat, AI-driven creation
 *   - Views: OverviewTab, CampaignsTab, AudiencesTab, AnalyticsTab,
 *            AutomationsTab, AIStudioTab (render functions, inline for now)
 */

import React, { useState, useMemo } from 'react';
import {
    ArrowLeft, Mail, Send, Eye, MousePointer, AlertCircle, TrendingUp,
    BarChart3, Users, UserPlus, Search, Filter, Plus, MoreVertical,
    Zap, Clock, Calendar, Target, ShoppingCart, Heart, Gift, Star,
    Play, Pause, Trash2, Copy, Edit2, ChevronDown, ChevronRight,
    Sparkles, Bot, Mic, MicOff, Volume2, VolumeX, X, Loader2,
    RefreshCcw, CheckCircle, XCircle, ArrowRight, Settings2,
    Building2, Globe, Tag, Layers, PhoneOff, FileText, Upload, Download,
    TrendingDown, Activity, AlertTriangle, TestTube,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import DashboardSidebar from '../DashboardSidebar';
import { useAdmin } from '../../../contexts/admin/AdminContext';
import AdminEmailEditorWrapper from './AdminEmailEditorWrapper';
import EmailTemplateGallery from '../email/editor/EmailTemplateGallery';
import type { CampaignStatus } from '../../../types/email';
import type { EmailDocument } from '../../../types/email';

// Modular hooks
import { useAdminEmailData } from './email-hub/hooks/useAdminEmailData';
import { useAdminEmailActions } from './email-hub/hooks/useAdminEmailActions';
import { useAudienceActions } from './email-hub/hooks/useAudienceActions';
import { useAIEmailStudio } from './email-hub/hooks/useAIEmailStudio';

// Types, constants, helpers
import type { AdminEmailTab, AdminEmailHubProps } from './email-hub/types';
import { MODEL_TEXT, MODEL_VOICE, AUTOMATION_TEMPLATES } from './email-hub/types';
import { formatDate, getStatusColor, getStatusIcon, formatDelay } from './email-hub/helpers';

// View components
import OverviewTab from './email-hub/views/OverviewTab';
import AnalyticsTab from './email-hub/views/AnalyticsTab';

// =============================================================================
// COMPONENT
// =============================================================================

const AdminEmailHub: React.FC<AdminEmailHubProps> = ({ onBack }) => {
    const { tenants, allUsers } = useAdmin();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminEmailTab>('overview');

    // ------ Hook composition ------
    const data = useAdminEmailData();
    const actions = useAdminEmailActions(data);
    const audience = useAudienceActions(data);
    const ai = useAIEmailStudio(data, activeTab);

    // Destructure for convenience
    const {
        campaigns, audiences, emailLogs, automations, isLoading,
        stats, filteredCampaigns, filteredAudiences, adminAudiences,
        monthlyData, tenantPerformance, filters,
        setCampaignSearch, setCampaignStatusFilter, setCampaignTenantFilter,
        setAudienceSearch, setAnalyticsTimeRange,
    } = data;

    const {
        showEmailEditor, setShowEmailEditor, showTemplateGallery, setShowTemplateGallery,
        emailDocument, setEmailDocument, editingCampaignId, setEditingCampaignId,
        selectedCampaign, setSelectedCampaign,
        showNewCampaignModal, setShowNewCampaignModal,
        newCampaignForm, setNewCampaignForm,
        showTestEmailModal, setShowTestEmailModal, testEmail, setTestEmail,
        sendingTest, testSendError, testSendSuccess,
        showSendConfirmModal, sendingCampaignId,
        sendCampaignError, sendCampaignSuccess,
        showDetailPanel, setShowDetailPanel, detailCampaign, setDetailCampaign,
        confirmModal, setConfirmModal,
        showCreateAutomation, setShowCreateAutomation,
        selectedTemplate, setSelectedTemplate,
        newAutomation, setNewAutomation,
        handleEditCampaignVisual, handleOpenTemplateGallery,
        handleSelectTemplate, handleStartBlank,
        handleSaveFromEditor, handleCloseEditor,
        openDetailPanel,
        handleUpdateCampaignStatus, handleUpdateCampaignAudience,
        handleSendTestEmail, handleOpenSendConfirm, handleSendCampaign,
        handleDeleteCampaign, handleDuplicateCampaign,
        createAutomation, toggleAutomationStatus, deleteAutomation,
    } = actions;

    const {
        showCreateAudience, setShowCreateAudience,
        newAudienceForm, setNewAudienceForm,
        showImportCSV, setShowImportCSV,
        showAddUsers, setShowAddUsers,
        selectedAudienceId, setSelectedAudienceId,
        manualEmail, setManualEmail,
        csvUploading,
        audienceMembers, setAudienceMembers,
        addUserSearch, setAddUserSearch,
        addUserSelectedIds, setAddUserSelectedIds,
        handleCreateAudience, handleDeleteAudience,
        handleAddRegisteredUsers, handleCSVUpload,
        handleAddManualEmail, handleRemoveMember,
    } = audience;

    const {
        aiMessages, aiInput, setAiInput, aiThinking, aiCreating, aiCreatedItems,
        aiChatRef, sendAIMessage,
        isVoiceActive, isVoiceConnecting, liveUserTranscript, liveModelTranscript,
        startVoiceSession, stopVoiceSession,
        aiCreateCampaign, aiCreateAudience, aiCreateAutomation,
        initAIStudio,
    } = ai;

    // Shim: the overview still calls setShowAIStudio — route to AI tab instead
    const setShowAIStudio = (_v: boolean) => setActiveTab('ai-studio');

    // =============================================================================
    // TAB DEFINITIONS
    // =============================================================================

    const tabs: { id: AdminEmailTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
        { id: 'campaigns', label: 'Campañas', icon: <Send size={18} />, count: campaigns.length },
        { id: 'audiences', label: 'Audiencias', icon: <Users size={18} />, count: audiences.length },
        { id: 'analytics', label: 'Analíticas', icon: <TrendingUp size={18} /> },
        { id: 'automations', label: 'Automatizaciones', icon: <Zap size={18} />, count: automations.length },
        { id: 'ai-studio', label: 'AI Studio', icon: <Sparkles size={18} /> },
    ];

    // =============================================================================
    // RENDER: CAMPAIGNS (inline — large JSX, to be extracted to CampaignsTab later)
    // =============================================================================

    const renderCampaigns = () => (
        <div className="space-y-6">
            {/* Header + New Campaign Button */}
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
            {/* Send feedback banners */}
            {sendCampaignSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-medium animate-in fade-in duration-200">
                    <CheckCircle size={16} />
                    {sendCampaignSuccess}
                </div>
            )}
            {sendCampaignError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium animate-in fade-in duration-200">
                    <AlertCircle size={16} />
                    {sendCampaignError}
                </div>
            )}
            {/* Filters */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 flex items-center gap-2 bg-editor-bg/50 rounded-lg px-3 py-2">
                        <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar campañas..."
                            value={filters.campaignSearch}
                            onChange={e => setCampaignSearch(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm text-editor-text-primary placeholder:text-editor-text-secondary"
                        />
                        {filters.campaignSearch && (
                            <button onClick={() => setCampaignSearch('')} className="text-editor-text-secondary hover:text-editor-text-primary">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <select
                        value={filters.campaignStatusFilter}
                        onChange={e => setCampaignStatusFilter(e.target.value as CampaignStatus | 'all')}
                        className="px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="scheduled">Programada</option>
                        <option value="sending">Enviando</option>
                        <option value="sent">Enviada</option>
                        <option value="paused">Pausada</option>
                        <option value="cancelled">Cancelada</option>
                    </select>
                    <select
                        value={filters.campaignTenantFilter}
                        onChange={e => setCampaignTenantFilter(e.target.value)}
                        className="px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent"
                    >
                        <option value="all">Todos los tenants</option>
                        {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Campaigns Table */}
            {filteredCampaigns.length > 0 ? (
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-editor-border">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Campaña</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Audiencia</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Tenant</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Estado</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Enviados</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Apertura</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Clicks</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-editor-text-secondary uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-editor-border">
                                {filteredCampaigns.map(campaign => (
                                    <tr
                                        key={`${campaign.userId}-${campaign.projectId}-${campaign.id}`}
                                        className="hover:bg-editor-bg/50 transition-colors group cursor-pointer"
                                        onClick={() => openDetailPanel(campaign)}
                                    >
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-editor-text-primary truncate max-w-[200px]">{campaign.name}</p>
                                            <p className="text-xs text-editor-text-secondary truncate max-w-[200px]">{campaign.subject}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-editor-text-secondary flex items-center gap-1">
                                                <Target size={12} />
                                                {campaign.audienceType === 'all' ? 'Todos' : campaign.audienceType === 'segment' ? (() => { const aud = audiences.find(a => a.id === campaign.audienceSegmentId); return aud ? aud.name : 'Segmento'; })() : 'Custom'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-editor-text-secondary flex items-center gap-1">
                                                <Building2 size={12} />
                                                {campaign.tenantName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${getStatusColor(campaign.status)}`}>
                                                {getStatusIcon(campaign.status)}
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-editor-text-primary">
                                            {(campaign.stats?.sent || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-editor-text-primary">
                                            {campaign.stats?.sent > 0
                                                ? `${((campaign.stats.uniqueOpens || 0) / campaign.stats.sent * 100).toFixed(1)}%`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-editor-text-primary">
                                            {campaign.stats?.uniqueOpens > 0
                                                ? `${((campaign.stats.uniqueClicks || 0) / campaign.stats.uniqueOpens * 100).toFixed(1)}%`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {campaign.status === 'draft' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateCampaignStatus(campaign.id, 'approved' as CampaignStatus); }}
                                                        className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Aprobar campaña"
                                                    >
                                                        <CheckCircle size={15} className="text-emerald-400" />
                                                    </button>
                                                )}
                                                {campaign.status === 'approved' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateCampaignStatus(campaign.id, 'draft' as CampaignStatus); }}
                                                        className="p-2 hover:bg-gray-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Volver a borrador"
                                                    >
                                                        <Edit2 size={15} className="text-gray-400" />
                                                    </button>
                                                )}
                                                {(campaign.status === 'draft' || campaign.status === 'approved') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenSendConfirm(campaign.id); }}
                                                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Enviar campaña"
                                                    >
                                                        <Play size={15} className="text-green-400" />
                                                    </button>
                                                )}
                                                {(campaign.status === 'draft' || campaign.status === 'approved') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingCampaignId(campaign.id);
                                                            setTestEmail('');
                                                            setShowTestEmailModal(true);
                                                        }}
                                                        className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Enviar prueba"
                                                    >
                                                        <TestTube size={15} className="text-blue-400" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEditCampaignVisual(campaign)}
                                                    className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Editar en editor visual"
                                                >
                                                    <Edit2 size={15} className="text-purple-400" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDuplicateCampaign(campaign); }}
                                                    className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={15} className="text-editor-text-secondary" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(campaign); }}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={15} className="text-red-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-xl">
                    <Send size={48} className="mx-auto text-editor-text-secondary mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-editor-text-primary mb-2">No hay campañas</h3>
                    <p className="text-editor-text-secondary text-sm mb-4">
                        {filters.campaignSearch || filters.campaignStatusFilter !== 'all' || filters.campaignTenantFilter !== 'all'
                            ? 'Ajusta los filtros para ver más resultados'
                            : 'Crea tu primera campaña para empezar'}
                    </p>
                    <button
                        onClick={() => setShowNewCampaignModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
                    >
                        <Plus size={16} />
                        Nueva Campaña
                    </button>
                </div>
            )}

            {/* ===== NEW CAMPAIGN MODAL ===== */}
            {showNewCampaignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowNewCampaignModal(false)}>
                    <div className="bg-editor-bg border border-editor-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-editor-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
                                    <Mail className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-editor-text-primary">Nueva Campaña</h2>
                                    <p className="text-xs text-editor-text-secondary">Configura los detalles básicos</p>
                                </div>
                            </div>
                            <button onClick={() => setShowNewCampaignModal(false)} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors">
                                <X size={18} className="text-editor-text-secondary" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Nombre</label>
                                <input type="text" value={newCampaignForm.name} onChange={e => setNewCampaignForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Ej: Newsletter Mayo 2025" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Asunto</label>
                                <input type="text" value={newCampaignForm.subject} onChange={e => setNewCampaignForm(prev => ({ ...prev, subject: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Línea de asunto del email" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Preview Text</label>
                                <input type="text" value={newCampaignForm.previewText} onChange={e => setNewCampaignForm(prev => ({ ...prev, previewText: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Texto de preview que se ve en la bandeja" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Tipo</label>
                                <select value={newCampaignForm.type} onChange={e => setNewCampaignForm(prev => ({ ...prev, type: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                    <option value="newsletter">Newsletter</option>
                                    <option value="promotion">Promoción</option>
                                    <option value="announcement">Anuncio</option>
                                    <option value="welcome">Bienvenida</option>
                                    <option value="transactional">Transaccional</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Audiencia</label>
                                <select value={newCampaignForm.audienceType} onChange={e => setNewCampaignForm(prev => ({ ...prev, audienceType: e.target.value as 'all' | 'segment' | 'custom' }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                    <option value="all">📋 Todos los contactos</option>
                                    <option value="segment">🎯 Segmento específico</option>
                                    <option value="custom">✉️ Emails personalizados</option>
                                </select>
                            </div>
                            {newCampaignForm.audienceType === 'segment' && (
                                <div>
                                    <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Segmento</label>
                                    {audiences.length > 0 ? (
                                        <select value={newCampaignForm.audienceSegmentId} onChange={e => setNewCampaignForm(prev => ({ ...prev, audienceSegmentId: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                            <option value="">Selecciona un segmento...</option>
                                            {audiences.map(a => (<option key={a.id} value={a.id}>{a.name} — {a.tenantName} ({a.estimatedCount || a.staticMemberCount || 0} contactos)</option>))}
                                        </select>
                                    ) : (
                                        <p className="text-xs text-editor-text-secondary bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-3">No hay segmentos creados. Crea uno desde la pestaña Audiencias.</p>
                                    )}
                                </div>
                            )}
                            {newCampaignForm.audienceType === 'custom' && (
                                <div>
                                    <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Emails (separados por coma)</label>
                                    <textarea value={newCampaignForm.customEmails} onChange={e => setNewCampaignForm(prev => ({ ...prev, customEmails: e.target.value }))} rows={3} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" placeholder="email1@ejemplo.com, email2@ejemplo.com" />
                                    {newCampaignForm.customEmails && (<p className="text-[10px] text-editor-text-secondary mt-1">{newCampaignForm.customEmails.split(',').filter(e => e.trim()).length} destinatarios</p>)}
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-editor-border bg-editor-panel-bg/50">
                            <p className="text-xs text-editor-text-secondary mb-3 text-center">¿Cómo quieres diseñar tu email?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleOpenTemplateGallery} className="flex flex-col items-center gap-2 p-4 bg-editor-bg border border-editor-border rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group">
                                    <Sparkles size={24} className="text-purple-400 group-hover:text-purple-300" />
                                    <span className="text-sm font-medium text-editor-text-primary">Usar Template</span>
                                    <span className="text-[10px] text-editor-text-secondary">Templates prediseñados</span>
                                </button>
                                <button onClick={handleStartBlank} className="flex flex-col items-center gap-2 p-4 bg-editor-bg border border-editor-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                                    <FileText size={24} className="text-blue-400 group-hover:text-blue-300" />
                                    <span className="text-sm font-medium text-editor-text-primary">En Blanco</span>
                                    <span className="text-[10px] text-editor-text-secondary">Diseña desde cero</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Gallery */}
            {showTemplateGallery && (
                <EmailTemplateGallery onSelect={handleSelectTemplate} onClose={() => setShowTemplateGallery(false)} onStartBlank={handleStartBlank} />
            )}

            {/* Visual Email Editor */}
            {showEmailEditor && emailDocument && (
                <div className="absolute inset-0 z-40 bg-editor-bg">
                    <AdminEmailEditorWrapper
                        initialDocument={emailDocument}
                        onSave={handleSaveFromEditor}
                        onClose={handleCloseEditor}
                        onSendTest={() => { setTestEmail(''); setShowTestEmailModal(true); }}
                        campaignId={editingCampaignId || undefined}
                        campaignName={editingCampaignId ? campaigns.find(c => c.id === editingCampaignId)?.name : newCampaignForm.name || undefined}
                    />
                </div>
            )}

            {/* Test Email Modal */}
            {showTestEmailModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><TestTube size={20} className="text-blue-500" /> Enviar Email de Prueba</h3>
                            <button onClick={() => { setShowTestEmailModal(false); }} className="p-2 hover:bg-muted rounded-lg transition-colors"><X size={20} className="text-muted-foreground" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-muted-foreground text-sm">Envía una versión de prueba de esta campaña a tu correo para revisarla antes de enviar.</p>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Email de prueba *</label>
                                <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="tu@email.com" className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring" onKeyDown={(e) => { if (e.key === 'Enter' && testEmail) handleSendTestEmail(); }} />
                            </div>
                            {testSendError && (<p className="text-red-500 text-sm flex items-center gap-1.5"><AlertCircle size={14} />{testSendError}</p>)}
                            {testSendSuccess && (<p className="text-green-500 text-sm flex items-center gap-1.5"><CheckCircle size={14} />{testSendSuccess}</p>)}
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button onClick={() => { setShowTestEmailModal(false); }} className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">Cancelar</button>
                            <button onClick={handleSendTestEmail} disabled={!testEmail || sendingTest} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {sendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Enviar prueba
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Campaign Confirmation Modal */}
            {showSendConfirmModal && sendingCampaignId && (() => {
                const campaign = campaigns.find(c => c.id === sendingCampaignId);
                if (!campaign) return null;
                return (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <div className="bg-card rounded-xl border border-border w-full max-w-md shadow-2xl">
                            <div className="p-6 border-b border-border">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Send size={20} className="text-green-500" /> Enviar Campaña</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-foreground">¿Estás seguro de enviar esta campaña?</p>
                                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                    <p className="text-sm"><strong>Campaña:</strong> {campaign.name}</p>
                                    <p className="text-sm"><strong>Asunto:</strong> {campaign.subject}</p>
                                    <p className="text-sm"><strong>Tenant:</strong> {campaign.tenantName || 'Admin'}</p>
                                    <p className="text-sm"><strong>Audiencia:</strong> {campaign.audienceType === 'all' ? 'Todos los suscriptores' : 'Segmento seleccionado'}</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                    <p className="text-amber-500 text-sm flex items-center gap-2"><AlertTriangle size={16} /> Esta acción enviará el email a todos los destinatarios. No se puede deshacer.</p>
                                </div>
                            </div>
                            <div className="p-6 border-t border-border flex justify-end gap-3">
                                <button onClick={() => { actions.setShowEmailEditor(false); /* close send confirm — reset in hook */ }} className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">Cancelar</button>
                                <button onClick={handleSendCampaign} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><Send size={16} /> Enviar ahora</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Campaign Detail Side Panel */}
            {showDetailPanel && detailCampaign && (
                <div className="fixed inset-0 z-[180] flex" onClick={() => { setShowDetailPanel(false); setDetailCampaign(null); }}>
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" />
                    <div className="w-full max-w-lg bg-editor-bg border-l border-editor-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 bg-editor-bg border-b border-editor-border p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-editor-text-primary truncate pr-4">{detailCampaign.name}</h3>
                                <button onClick={() => { setShowDetailPanel(false); setDetailCampaign(null); }} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors shrink-0"><X size={18} className="text-editor-text-secondary" /></button>
                            </div>
                            <p className="text-sm text-editor-text-secondary truncate">{detailCampaign.subject}</p>
                        </div>
                        <div className="p-5 space-y-6">
                            {/* Status */}
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">Estado</label>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border font-medium ${getStatusColor(detailCampaign.status)}`}>
                                        {getStatusIcon(detailCampaign.status)}
                                        {detailCampaign.status === 'draft' ? 'Borrador' : detailCampaign.status === 'approved' ? 'Aprobada' : detailCampaign.status === 'sent' ? 'Enviada' : detailCampaign.status === 'sending' ? 'Enviando...' : detailCampaign.status}
                                    </span>
                                    {detailCampaign.status !== 'sent' && detailCampaign.status !== 'sending' && (
                                        <select value={detailCampaign.status} onChange={(e) => handleUpdateCampaignStatus(detailCampaign.id, e.target.value as CampaignStatus)} className="px-3 py-1.5 bg-editor-panel-bg border border-editor-border rounded-lg text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent">
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
                                    <div className="space-y-3">
                                        <select value={detailCampaign.audienceType || 'all'} onChange={(e) => handleUpdateCampaignAudience(detailCampaign.id, e.target.value as 'all'|'segment'|'custom')} className="w-full px-3 py-2.5 bg-editor-panel-bg border border-editor-border rounded-xl text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent">
                                            <option value="all">📋 Todos los contactos</option>
                                            <option value="segment">🎯 Segmento específico</option>
                                            <option value="custom">✉️ Emails personalizados</option>
                                        </select>
                                        {detailCampaign.audienceType === 'segment' && audiences.length > 0 && (
                                            <select value={detailCampaign.audienceSegmentId || ''} onChange={(e) => handleUpdateCampaignAudience(detailCampaign.id, 'segment', e.target.value)} className="w-full px-3 py-2.5 bg-editor-panel-bg border border-editor-border rounded-xl text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent">
                                                <option value="">Selecciona un segmento...</option>
                                                {audiences.map(a => (<option key={a.id} value={a.id}>{a.name} ({a.estimatedCount || a.staticMemberCount || 0} contactos)</option>))}
                                            </select>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-editor-text-primary bg-editor-panel-bg border border-editor-border rounded-lg px-3 py-2">
                                        {detailCampaign.audienceType === 'all' ? '📋 Todos los contactos' : detailCampaign.audienceType === 'segment' ? `🎯 ${audiences.find(a => a.id === detailCampaign.audienceSegmentId)?.name || 'Segmento'}` : '✉️ Emails personalizados'}
                                    </p>
                                )}
                            </div>
                            {/* Details */}
                            <div>
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">Detalles</label>
                                <div className="bg-editor-panel-bg border border-editor-border rounded-xl divide-y divide-editor-border">
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Tipo</span><span className="text-editor-text-primary capitalize">{detailCampaign.type || 'newsletter'}</span></div>
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Tenant</span><span className="text-editor-text-primary flex items-center gap-1"><Building2 size={12} /> {detailCampaign.tenantName}</span></div>
                                    {detailCampaign.previewText && (<div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Preview</span><span className="text-editor-text-primary truncate max-w-[200px]">{detailCampaign.previewText}</span></div>)}
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Creada</span><span className="text-editor-text-primary">{formatDate(detailCampaign.createdAt)}</span></div>
                                    {detailCampaign.stats && detailCampaign.stats.sent > 0 && (
                                        <>
                                            <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Enviados</span><span className="text-editor-text-primary font-medium">{detailCampaign.stats.sent.toLocaleString()}</span></div>
                                            <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Apertura</span><span className="text-editor-text-primary font-medium">{detailCampaign.stats.sent > 0 ? `${((detailCampaign.stats.uniqueOpens || 0) / detailCampaign.stats.sent * 100).toFixed(1)}%` : '—'}</span></div>
                                            <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-editor-text-secondary">Clicks</span><span className="text-editor-text-primary font-medium">{(detailCampaign.stats.uniqueOpens || 0) > 0 ? `${((detailCampaign.stats.uniqueClicks || 0) / detailCampaign.stats.uniqueOpens * 100).toFixed(1)}%` : '—'}</span></div>
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* Email Preview */}
                            {detailCampaign.htmlContent && (
                                <div>
                                    <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block flex items-center gap-1.5"><Eye size={14} /> Vista Previa</label>
                                    <div className="border border-editor-border rounded-xl overflow-hidden bg-white">
                                        <iframe srcDoc={detailCampaign.htmlContent} title="Vista previa del email" className="w-full border-0" style={{ height: '500px', pointerEvents: 'none' }} sandbox="allow-same-origin" />
                                    </div>
                                </div>
                            )}
                            {/* Actions */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">Acciones</label>
                                {(detailCampaign.status === 'draft' || detailCampaign.status === 'approved') && (
                                    <button onClick={() => { setShowDetailPanel(false); handleEditCampaignVisual(detailCampaign); }} className="w-full flex items-center gap-3 px-4 py-3 bg-editor-panel-bg border border-editor-border rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left">
                                        <Edit2 size={18} className="text-purple-400" />
                                        <div><p className="text-sm font-medium text-editor-text-primary">Editar en Editor Visual</p><p className="text-xs text-editor-text-secondary">Modifica el diseño y contenido del email</p></div>
                                    </button>
                                )}
                                {(detailCampaign.status === 'draft' || detailCampaign.status === 'approved') && (
                                    <button onClick={() => { setEditingCampaignId(detailCampaign.id); setTestEmail(''); setShowTestEmailModal(true); }} className="w-full flex items-center gap-3 px-4 py-3 bg-editor-panel-bg border border-editor-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left">
                                        <TestTube size={18} className="text-blue-400" />
                                        <div><p className="text-sm font-medium text-editor-text-primary">Enviar Prueba</p><p className="text-xs text-editor-text-secondary">Envía un test email a tu correo</p></div>
                                    </button>
                                )}
                                {(detailCampaign.status === 'draft' || detailCampaign.status === 'approved') && (
                                    <button onClick={() => { setShowDetailPanel(false); handleOpenSendConfirm(detailCampaign.id); }} className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/30 rounded-xl hover:from-green-600/20 hover:to-emerald-600/20 transition-all text-left">
                                        <Send size={18} className="text-green-400" />
                                        <div><p className="text-sm font-medium text-editor-text-primary">Enviar Campaña</p><p className="text-xs text-editor-text-secondary">Envía a toda la audiencia seleccionada</p></div>
                                    </button>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => { handleDuplicateCampaign(detailCampaign); setShowDetailPanel(false); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-editor-panel-bg border border-editor-border rounded-xl text-sm text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent/30 transition-all"><Copy size={14} /> Duplicar</button>
                                    <button onClick={() => { handleDeleteCampaign(detailCampaign); setShowDetailPanel(false); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"><Trash2 size={14} /> Eliminar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // =============================================================================
    // RENDER: AUDIENCES (inline for now)
    // =============================================================================

    const renderAudiences = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-editor-text-primary">Audiencias</h2>
                    <p className="text-sm text-editor-text-secondary">{adminAudiences.length} audiencias admin</p>
                </div>
                <button onClick={() => setShowCreateAudience(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all">
                    <Plus size={16} /> Nueva Audiencia
                </button>
            </div>
            {/* Search */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-4">
                <div className="flex items-center gap-2 bg-editor-bg/50 rounded-lg px-3 py-2">
                    <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                    <input type="text" placeholder="Buscar audiencias..." value={filters.audienceSearch} onChange={e => setAudienceSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-editor-text-primary placeholder:text-editor-text-secondary" />
                </div>
            </div>
            {/* Audience Cards */}
            {adminAudiences.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminAudiences.map(aud => (
                        <div key={aud.id} className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 hover:border-editor-accent/30 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-editor-text-primary truncate">{aud.name}</h3>
                                    {aud.description && (<p className="text-xs text-editor-text-secondary mt-0.5 line-clamp-2">{aud.description}</p>)}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteAudience(aud.id, setConfirmModal); }} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar"><Trash2 size={14} className="text-red-400" /></button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-editor-text-secondary mb-3">
                                <span className="flex items-center gap-1"><Users size={12} /> {aud.estimatedCount || aud.staticMemberCount || 0} contactos</span>
                                <span>{formatDate(aud.createdAt)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedAudienceId(aud.id); setManualEmail(''); setShowImportCSV(false); setShowAddUsers(false); setAudienceMembers(prev => ({ ...prev, [aud.id]: (aud as any)?.members || [] })); }} className="flex-1 text-xs px-3 py-2 bg-editor-bg border border-editor-border rounded-lg hover:border-editor-accent/30 transition-colors text-editor-text-primary">
                                    Gestionar
                                </button>
                                <button onClick={() => { setSelectedAudienceId(aud.id); setShowImportCSV(true); }} className="text-xs px-3 py-2 bg-editor-bg border border-editor-border rounded-lg hover:border-editor-accent/30 transition-colors text-editor-text-primary flex items-center gap-1">
                                    <Upload size={12} /> CSV
                                </button>
                                <button onClick={() => { setSelectedAudienceId(aud.id); setShowAddUsers(true); setAddUserSearch(''); setAddUserSelectedIds([]); }} className="text-xs px-3 py-2 bg-editor-bg border border-editor-border rounded-lg hover:border-editor-accent/30 transition-colors text-editor-text-primary flex items-center gap-1">
                                    <UserPlus size={12} />
                                </button>
                            </div>
                            {/* Expanded member management */}
                            {selectedAudienceId === aud.id && !showImportCSV && !showAddUsers && (
                                <div className="mt-4 border-t border-editor-border pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddManualEmail(aud.id); }} placeholder="email@ejemplo.com" className="flex-1 bg-editor-bg border border-editor-border rounded-lg px-3 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                                        <button onClick={() => handleAddManualEmail(aud.id)} className="px-3 py-1.5 text-xs bg-editor-accent/20 text-editor-accent rounded-lg hover:bg-editor-accent/30">Añadir</button>
                                    </div>
                                    {(audienceMembers[aud.id] || (aud as any)?.members || []).length > 0 && (
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {(audienceMembers[aud.id] || (aud as any)?.members || []).map((m: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between px-2 py-1 bg-editor-bg/50 rounded text-xs">
                                                    <span className="text-editor-text-primary truncate">{m.email}</span>
                                                    <button onClick={() => handleRemoveMember(aud.id, m.email)} className="text-red-400 hover:text-red-300 p-0.5"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* CSV import */}
                            {selectedAudienceId === aud.id && showImportCSV && (
                                <div className="mt-4 border-t border-editor-border pt-4">
                                    <label className="block text-xs font-medium text-editor-text-secondary mb-2">Importar CSV (email, nombre)</label>
                                    <input type="file" accept=".csv" onChange={e => { if (e.target.files?.[0]) handleCSVUpload(aud.id, e.target.files[0]); }} disabled={csvUploading} className="text-xs text-editor-text-primary" />
                                    {csvUploading && <p className="text-xs text-editor-accent mt-1">Importando...</p>}
                                    <button onClick={() => setShowImportCSV(false)} className="mt-2 text-xs text-editor-text-secondary hover:text-editor-text-primary">Cerrar</button>
                                </div>
                            )}
                            {/* Add registered users */}
                            {selectedAudienceId === aud.id && showAddUsers && (
                                <div className="mt-4 border-t border-editor-border pt-4">
                                    <label className="block text-xs font-medium text-editor-text-secondary mb-2">Agregar usuarios registrados</label>
                                    <input type="text" value={addUserSearch} onChange={e => setAddUserSearch(e.target.value)} placeholder="Buscar por email o nombre..." className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-1.5 text-xs text-editor-text-primary mb-2 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                                    <div className="space-y-1 max-h-32 overflow-y-auto mb-2">
                                        {allUsers.filter(u => addUserSearch === '' || u.email?.toLowerCase().includes(addUserSearch.toLowerCase()) || u.displayName?.toLowerCase().includes(addUserSearch.toLowerCase())).slice(0, 20).map(u => (
                                            <label key={u.id} className="flex items-center gap-2 px-2 py-1 bg-editor-bg/50 rounded text-xs cursor-pointer hover:bg-editor-bg">
                                                <input type="checkbox" checked={addUserSelectedIds.includes(u.id)} onChange={e => { if (e.target.checked) setAddUserSelectedIds(prev => [...prev, u.id]); else setAddUserSelectedIds(prev => prev.filter(id => id !== u.id)); }} className="rounded" />
                                                <span className="text-editor-text-primary truncate">{u.email}</span>
                                                {u.displayName && <span className="text-editor-text-secondary">({u.displayName})</span>}
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { handleAddRegisteredUsers(aud.id, addUserSelectedIds); }} disabled={addUserSelectedIds.length === 0} className="px-3 py-1.5 text-xs bg-editor-accent/20 text-editor-accent rounded-lg hover:bg-editor-accent/30 disabled:opacity-50">Agregar {addUserSelectedIds.length} seleccionados</button>
                                        <button onClick={() => setShowAddUsers(false)} className="text-xs text-editor-text-secondary hover:text-editor-text-primary">Cerrar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-xl">
                    <Users size={48} className="mx-auto text-editor-text-secondary mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-editor-text-primary mb-2">No hay audiencias</h3>
                    <p className="text-editor-text-secondary text-sm mb-4">Crea tu primera audiencia para empezar</p>
                    <button onClick={() => setShowCreateAudience(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl">
                        <Plus size={16} /> Nueva Audiencia
                    </button>
                </div>
            )}

            {/* Create Audience Modal */}
            {showCreateAudience && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCreateAudience(false)}>
                    <div className="bg-editor-bg border border-editor-border w-full max-w-md rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-editor-border flex items-center justify-between">
                            <h2 className="text-lg font-bold text-editor-text-primary">Nueva Audiencia</h2>
                            <button onClick={() => setShowCreateAudience(false)} className="p-2 hover:bg-editor-border/40 rounded-lg"><X size={18} className="text-editor-text-secondary" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div><label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Nombre</label><input type="text" value={newAudienceForm.name} onChange={e => setNewAudienceForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Ej: Clientes VIP" /></div>
                            <div><label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Descripción</label><textarea value={newAudienceForm.description} onChange={e => setNewAudienceForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" placeholder="Describe esta audiencia..." /></div>
                        </div>
                        <div className="p-5 border-t border-editor-border flex justify-end gap-3">
                            <button onClick={() => setShowCreateAudience(false)} className="px-4 py-2 text-sm text-editor-text-secondary hover:text-editor-text-primary transition-colors">Cancelar</button>
                            <button onClick={handleCreateAudience} disabled={!newAudienceForm.name.trim()} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl disabled:opacity-50">Crear Audiencia</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // =============================================================================
    // RENDER: AUTOMATIONS
    // =============================================================================

    const renderAutomations = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-editor-text-primary">Automatizaciones</h2>
                <p className="text-sm text-editor-text-secondary">Flujos automáticos y templates</p>
            </div>
            {/* Active automations */}
            {automations.length > 0 && (
                <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                    <h3 className="text-sm font-bold text-editor-text-secondary uppercase tracking-wider mb-4">Automatizaciones Activas</h3>
                    <div className="space-y-3">
                        {automations.map(auto => (
                            <div key={auto.id} className="flex items-center justify-between p-4 bg-editor-bg/50 border border-editor-border rounded-xl">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-editor-text-primary">{auto.name}</p>
                                    <p className="text-xs text-editor-text-secondary mt-0.5">Tipo: {auto.type} • Delay: {formatDelay(auto.delayMinutes || 0)} • Trigger: {auto.triggerConfig?.event || auto.triggerConfig?.type || '—'}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(auto.status)}`}>{auto.status}</span>
                                    <button onClick={() => toggleAutomationStatus(auto)} className="p-2 hover:bg-editor-border/40 rounded-lg transition-colors" title={auto.status === 'active' ? 'Pausar' : 'Activar'}>
                                        {auto.status === 'active' ? <Pause size={14} className="text-amber-400" /> : <Play size={14} className="text-green-400" />}
                                    </button>
                                    <button onClick={() => { setConfirmModal({ show: true, title: 'Eliminar Automatización', message: `¿Eliminar "${auto.name}"?`, onConfirm: async () => { await deleteAutomation(auto.id); setConfirmModal(prev => ({ ...prev, show: false })); } }); }} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Template Gallery */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <h3 className="text-sm font-bold text-editor-text-secondary uppercase tracking-wider mb-4">Templates de Automatización</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AUTOMATION_TEMPLATES.map(template => (
                        <button key={template.id} onClick={() => { setSelectedTemplate(template); setNewAutomation({ name: template.name, subject: '', delayMinutes: template.defaultDelay, status: 'draft' }); setShowCreateAutomation(true); }} className="flex flex-col items-start gap-3 p-4 bg-editor-bg border border-editor-border rounded-xl hover:border-editor-accent/30 transition-all text-left">
                            <div className={`p-2.5 rounded-xl ${template.color}`}>{template.icon}</div>
                            <div>
                                <p className="text-sm font-semibold text-editor-text-primary">{template.name}</p>
                                <p className="text-xs text-editor-text-secondary mt-1 line-clamp-2">{template.description}</p>
                            </div>
                            <span className="text-[10px] text-editor-text-secondary uppercase tracking-wider">{template.category}</span>
                        </button>
                    ))}
                </div>
            </div>
            {/* Create Automation Modal */}
            {showCreateAutomation && selectedTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCreateAutomation(false)}>
                    <div className="bg-editor-bg border border-editor-border w-full max-w-md rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-editor-border flex items-center justify-between">
                            <h2 className="text-lg font-bold text-editor-text-primary">Crear Automatización</h2>
                            <button onClick={() => setShowCreateAutomation(false)} className="p-2 hover:bg-editor-border/40 rounded-lg"><X size={18} className="text-editor-text-secondary" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className={`flex items-center gap-3 p-3 rounded-xl ${selectedTemplate.color}`}>
                                {selectedTemplate.icon}
                                <div>
                                    <p className="text-sm font-semibold">{selectedTemplate.name}</p>
                                    <p className="text-xs opacity-70">{selectedTemplate.category}</p>
                                </div>
                            </div>
                            <div><label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Nombre</label><input type="text" value={newAutomation.name} onChange={e => setNewAutomation(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div>
                            <div><label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Asunto del Email</label><input type="text" value={newAutomation.subject} onChange={e => setNewAutomation(prev => ({ ...prev, subject: e.target.value }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder={`${selectedTemplate.name} — Automático`} /></div>
                            <div><label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">Delay (minutos)</label><input type="number" value={newAutomation.delayMinutes} onChange={e => setNewAutomation(prev => ({ ...prev, delayMinutes: parseInt(e.target.value) || 0 }))} className="w-full bg-editor-panel-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50" /><p className="text-[10px] text-editor-text-secondary mt-1">= {formatDelay(newAutomation.delayMinutes)}</p></div>
                        </div>
                        <div className="p-5 border-t border-editor-border flex justify-end gap-3">
                            <button onClick={() => setShowCreateAutomation(false)} className="px-4 py-2 text-sm text-editor-text-secondary">Cancelar</button>
                            <button onClick={createAutomation} disabled={!newAutomation.name} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-xl disabled:opacity-50">Crear</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // =============================================================================
    // RENDER: AI STUDIO
    // =============================================================================

    const renderAIStudio = () => (
        <div className="bg-editor-panel-bg border border-editor-border rounded-2xl shadow-xl flex flex-col" style={{ height: 'calc(100vh - 170px)' }}>
            {/* Header */}
            <div className="p-4 border-b border-editor-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20"><Sparkles className="text-white w-5 h-5" /></div>
                        {isVoiceActive && (<span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-editor-bg animate-pulse" />)}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                            AI Email Studio
                            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{isVoiceActive ? MODEL_VOICE.split('-').slice(-2).join('-') : MODEL_TEXT.split('-').slice(-2).join('-')}</span>
                        </h2>
                        <p className="text-xs text-editor-text-secondary">{isVoiceActive ? '🎤 Sesión de voz activa — habla naturalmente' : 'Planifica y crea campañas de email con IA'}</p>
                    </div>
                </div>
                <button onClick={() => { stopVoiceSession(); initAIStudio(); }} className="h-8 w-8 flex items-center justify-center rounded-lg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 transition-colors" title="Reiniciar conversación"><RefreshCcw className="w-4 h-4" /></button>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Conversation */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div ref={aiChatRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {aiMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-md' : 'bg-[#1e1b2e] border border-purple-500/15 text-gray-100 rounded-bl-md'}`}>
                                    {msg.isVoice && (<span className="inline-flex items-center gap-1 text-[10px] opacity-60 mb-1"><Volume2 className="w-3 h-3" /> Voz</span>)}
                                    <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-100">{children}</p>, strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>, ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-200">{children}</ul>, ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-200">{children}</ol>, li: ({ children }) => <li className="leading-relaxed text-gray-200">{children}</li> }}>{msg.text}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {aiThinking && (<div className="flex justify-start"><div className="bg-editor-panel-bg border border-editor-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-editor-text-secondary"><Loader2 className="w-4 h-4 animate-spin text-purple-400" /> Pensando...</div></div>)}
                        {aiCreating && (<div className="flex justify-start"><div className="bg-editor-panel-bg border border-green-500/30 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-green-400"><Loader2 className="w-4 h-4 animate-spin" /> Creando {aiCreating === 'campaign' ? 'campaña' : aiCreating === 'audience' ? 'audiencia' : 'automatización'}...</div></div>)}
                        {isVoiceActive && liveUserTranscript && (<div className="flex justify-end animate-pulse"><div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-purple-500/20 border border-purple-500/30 text-purple-200"><span className="inline-flex items-center gap-1.5 text-[10px] text-purple-400 mb-1"><Mic className="w-3 h-3" /> Hablando...</span><p className="text-gray-100">{liveUserTranscript}</p></div></div>)}
                        {isVoiceActive && liveModelTranscript && (<div className="flex justify-start"><div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-[#1e1b2e] border border-blue-500/20 text-gray-100"><span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400 mb-1"><Volume2 className="w-3 h-3" /> Respondiendo...</span><p className="text-gray-100">{liveModelTranscript}</p></div></div>)}
                        {aiCreatedItems.length > 0 && (
                            <div className="border-t border-editor-border pt-4 mt-4">
                                <p className="text-xs text-editor-text-secondary font-medium mb-2">Recursos creados en esta sesión:</p>
                                <div className="space-y-1.5">{aiCreatedItems.map((item, i) => (<div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/20 rounded-lg"><CheckCircle size={12} className="text-green-400 flex-shrink-0" /><span className="text-xs text-editor-text-primary">{item.type === 'campaign' ? '📧' : item.type === 'audience' ? '👥' : '⚡'} {item.name}</span><span className="text-[10px] text-editor-text-secondary ml-auto">{item.type}</span></div>))}</div>
                            </div>
                        )}
                    </div>
                    {/* Input Bar */}
                    <div className="p-3 border-t border-editor-border bg-editor-panel-bg/50">
                        <div className="flex items-end gap-2">
                            {isVoiceActive ? (
                                <button onClick={stopVoiceSession} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all" title="Detener voz"><PhoneOff className="w-4 h-4" /></button>
                            ) : (
                                <button onClick={startVoiceSession} disabled={isVoiceConnecting} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-editor-border/40 text-editor-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-50" title="Iniciar voz (Gemini Live)">
                                    {isVoiceConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                                </button>
                            )}
                            <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(aiInput); } }} placeholder={isVoiceActive ? 'Sesión de voz activa — habla o escribe...' : 'Describe la campaña, audiencia o automatización que necesitas...'} className="flex-1 bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none min-h-[40px] max-h-[120px] text-editor-text-primary placeholder:text-editor-text-secondary/50" rows={1} disabled={!!aiCreating} />
                            <button onClick={() => sendAIMessage(aiInput)} disabled={!aiInput.trim() || aiThinking || !!aiCreating} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"><Send className="w-4 h-4" /></button>
                        </div>
                        {isVoiceActive && (<div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-400"><span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Escuchando...</span><span className="text-editor-text-secondary">•</span><span className="text-editor-text-secondary font-mono">{MODEL_VOICE.split('-').slice(1).join('-')}</span></div>)}
                    </div>
                </div>

                {/* Right Action Panel */}
                <div className="w-72 border-l border-editor-border bg-editor-panel-bg/30 p-4 overflow-y-auto hidden lg:flex flex-col gap-4 custom-scrollbar">
                    <div>
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3">Acciones Rápidas</h4>
                        <div className="space-y-2">
                            <button onClick={aiCreateCampaign} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                {aiCreating === 'campaign' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                <div className="text-left"><div className="font-medium">Crear Campaña</div><div className="text-[10px] text-blue-400/60">Genera desde la conversación</div></div>
                            </button>
                            <button onClick={aiCreateAudience} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                {aiCreating === 'audience' ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                                <div className="text-left"><div className="font-medium">Crear Audiencia</div><div className="text-[10px] text-purple-400/60">Segmento de contactos</div></div>
                            </button>
                            <button onClick={aiCreateAutomation} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                {aiCreating === 'automation' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                <div className="text-left"><div className="font-medium">Crear Automatización</div><div className="text-[10px] text-amber-400/60">Flujo de email automático</div></div>
                            </button>
                        </div>
                        {aiMessages.length < 3 && (<p className="text-[10px] text-editor-text-secondary mt-2 text-center">💬 Conversa primero para habilitar acciones</p>)}
                    </div>
                    {aiCreatedItems.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Sesión</h4>
                            <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3">
                                <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1"><CheckCircle size={14} /> {aiCreatedItems.length} recurso{aiCreatedItems.length > 1 ? 's' : ''} creado{aiCreatedItems.length > 1 ? 's' : ''}</div>
                                <div className="space-y-1 mt-2">{aiCreatedItems.map((item, i) => (<div key={i} className="text-[10px] text-editor-text-secondary flex items-center gap-1.5"><span>{item.type === 'campaign' ? '📧' : item.type === 'audience' ? '👥' : '⚡'}</span><span className="truncate">{item.name}</span></div>))}</div>
                            </div>
                        </div>
                    )}
                    <div className="mt-auto">
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Sugerencias</h4>
                        <div className="space-y-1.5 text-[10px] text-editor-text-secondary">
                            <p>💡 "Crea una campaña de Black Friday con 20% de descuento"</p>
                            <p>💡 "Necesito una audiencia de clientes VIP"</p>
                            <p>💡 "Configura un flujo de bienvenida automático"</p>
                            <p>💡 Usa el 🎤 para hablar directamente con la IA</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // =============================================================================
    // MAIN RENDER
    // =============================================================================

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary md:hidden transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <Mail className="text-editor-accent w-5 h-5" />
                        <h1 className="text-lg font-semibold text-editor-text-primary">Email Marketing Hub</h1>
                        <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full">{tenants.length} tenants</span>
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
                                <span className="text-sm text-editor-text-secondary">Cargando datos de email de todos los tenants...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab stats={stats} campaigns={campaigns} tenantPerformance={tenantPerformance} setActiveTab={setActiveTab} setShowAIStudio={setShowAIStudio} />}
                            {activeTab === 'campaigns' && renderCampaigns()}
                            {activeTab === 'audiences' && renderAudiences()}
                            {activeTab === 'analytics' && <AnalyticsTab stats={stats} campaigns={campaigns} monthlyData={monthlyData} tenantPerformance={tenantPerformance} tenants={tenants} />}
                            {activeTab === 'automations' && renderAutomations()}
                            {activeTab === 'ai-studio' && renderAIStudio()}
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
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="flex-1 px-4 py-2.5 text-sm font-medium text-editor-text-secondary bg-editor-panel-bg border border-editor-border rounded-xl hover:bg-editor-border hover:text-editor-text-primary transition-colors">Cancelar</button>
                            <button onClick={confirmModal.onConfirm} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"><span className="flex items-center justify-center gap-2"><Trash2 size={14} /> Eliminar</span></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminEmailHub;
