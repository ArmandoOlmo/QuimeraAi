/**
 * AdminLeadsDashboard.tsx
 * Dashboard de Leads para Super Admin — opera sobre platformLeads (sin proyecto)
 * 
 * Estrategia: Re-usa LeadsDashboard inyectando datos de plataforma via CRMProvider override.
 * Se modifica el CRMContext para proporcionar leads de plataforma en lugar de proyecto.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Lead, LeadStatus, LeadActivity, LeadTask, LibraryLead } from '../../../types';
import { useAdminLeads } from './hooks/useAdminLeads';
import { useAI } from '../../../contexts/ai';
import { useTranslation } from 'react-i18next';

// Re-create the CRM context type to override
interface AdminCRMContextType {
    leads: Lead[];
    isLoadingLeads: boolean;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'projectId'>) => Promise<string | undefined>;
    addLeadsBulk: (leads: Omit<Lead, 'id' | 'createdAt' | 'projectId'>[]) => Promise<string[]>;
    updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
    updateLead: (leadId: string, data: Partial<Lead>) => Promise<void>;
    deleteLead: (leadId: string) => Promise<void>;
    leadActivities: LeadActivity[];
    addLeadActivity: (leadId: string, activity: Omit<LeadActivity, 'id' | 'createdAt' | 'leadId' | 'projectId'>) => Promise<void>;
    getLeadActivities: (leadId: string) => LeadActivity[];
    leadTasks: LeadTask[];
    addLeadTask: (leadId: string, task: Omit<LeadTask, 'id' | 'createdAt' | 'leadId' | 'projectId'>) => Promise<void>;
    updateLeadTask: (taskId: string, data: Partial<LeadTask>) => Promise<void>;
    deleteLeadTask: (taskId: string) => Promise<void>;
    getLeadTasks: (leadId: string) => LeadTask[];
    libraryLeads: LibraryLead[];
    isLoadingLibraryLeads: boolean;
    addLibraryLead: (lead: Omit<LibraryLead, 'id' | 'createdAt' | 'isImported' | 'projectId'>) => Promise<void>;
    deleteLibraryLead: (leadId: string) => Promise<void>;
    importLibraryLead: (leadId: string) => Promise<void>;
    hasActiveProject: boolean;
    activeProjectId: string | null;
}

// Override context to inject admin data
const AdminCRMContext = createContext<AdminCRMContextType | undefined>(undefined);

// Provider that wraps LeadsDashboard with admin data
const AdminCRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const adminLeads = useAdminLeads();
    
    const value: AdminCRMContextType = {
        leads: adminLeads.leads,
        isLoadingLeads: adminLeads.isLoadingLeads,
        addLead: adminLeads.addLead,
        addLeadsBulk: adminLeads.addLeadsBulk,
        updateLeadStatus: adminLeads.updateLeadStatus,
        updateLead: adminLeads.updateLead,
        deleteLead: adminLeads.deleteLead,
        leadActivities: adminLeads.leadActivities,
        addLeadActivity: adminLeads.addLeadActivity,
        getLeadActivities: adminLeads.getLeadActivities,
        leadTasks: adminLeads.leadTasks,
        addLeadTask: adminLeads.addLeadTask,
        updateLeadTask: adminLeads.updateLeadTask,
        deleteLeadTask: adminLeads.deleteLeadTask,
        getLeadTasks: adminLeads.getLeadTasks,
        // Library leads not applicable at platform level — provide empty stubs
        libraryLeads: [],
        isLoadingLibraryLeads: false,
        addLibraryLead: async () => {},
        deleteLibraryLead: async () => {},
        importLibraryLead: async () => {},
        // Always active for admin
        hasActiveProject: true,
        activeProjectId: '__platform__',
    };

    return <AdminCRMContext.Provider value={value}>{children}</AdminCRMContext.Provider>;
};

// Hook for admin CRM context
export const useAdminCRM = (): AdminCRMContextType => {
    const context = useContext(AdminCRMContext);
    if (!context) {
        throw new Error('useAdminCRM must be used within AdminCRMProvider');
    }
    return context;
};

// =============================================================================
// Inline Leads Dashboard — Adapted from LeadsDashboard.tsx
// Only imports useCRM are replaced with useAdminCRM
// =============================================================================

import { useState, useMemo, useEffect } from 'react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useUI } from '../../../contexts/core/UIContext';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import {
    Menu, Plus, Search, Filter, MoreVertical,
    Mail, Phone, MessageSquare, Bot, LayoutGrid,
    DollarSign, CheckCircle2, XCircle, Clock,
    ArrowUpRight, Calendar, Trash2, MoveRight,
    Building2, Palette, Sparkles, Loader2, ThumbsUp,
    Smile, Table, List, Columns, Download, Upload, Edit, MapPin,
    Globe, Briefcase, Linkedin, BookOpen, X, Save, Send, Users,
    Megaphone,
} from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { generateContentViaProxy, extractTextFromResponse } from '../../../utils/geminiProxyClient';
import LeadsFilters, { LeadsFiltersState } from '../leads/LeadsFilters';
import LeadsTableView from '../leads/LeadsTableView';
import LeadsListView from '../leads/LeadsListView';
import { CustomFieldDefinition } from '../leads/CustomFieldsManager';
import AddLeadModal from '../leads/AddLeadModal';
import ImportLeadsModal from '../leads/ImportLeadsModal';
import MobileSearchModal from '../../ui/MobileSearchModal';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { AddToAudienceModal } from './email-hub/components/AddToAudienceModal';

// ============================================================================
// Main Export
// ============================================================================

interface AdminLeadsDashboardProps {
    onBack: () => void;
}

const AdminLeadsDashboard: React.FC<AdminLeadsDashboardProps> = ({ onBack }) => {
    const { t } = useTranslation();

    return (
        <AdminCRMProvider>
            <AdminLeadsDashboardInner onBack={onBack} />
        </AdminCRMProvider>
    );
};

/**
 * AdminLeadsDashboardInner
 * This component mirrors LeadsDashboard but uses useAdminCRM() instead of useCRM()
 * and removes project-specific logic (project selector, hasActiveProject guard, etc.)
 */
const AdminLeadsDashboardInner: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { setView } = useUI();
    const { navigate } = useRouter();
    const { hasApiKey, promptForKeySelection, handleApiError } = useAI();
    
    // Use Admin CRM instead of project-scoped CRM
    const {
        leads, updateLeadStatus, deleteLead, addLead, updateLead,
        addLeadActivity, getLeadActivities, addLeadTask, updateLeadTask,
        deleteLeadTask, getLeadTasks, isLoadingLeads
    } = useAdminCRM();

    // Helper to clean JSON from markdown code blocks
    const cleanJsonResponse = (text: string): string => {
        if (!text) return '{}';
        let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '');
        cleaned = cleaned.trim();
        const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
        if (jsonMatch) cleaned = jsonMatch[0];
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        cleaned = cleaned.replace(/\\([^"\\/bfnrtu])/g, '$1');
        cleaned = cleaned.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
        return cleaned;
    };

    const getLeadStages = (t: any): { id: LeadStatus; label: string; color: string }[] => [
        { id: 'new', label: t('leads.stages.new'), color: 'bg-blue-500' },
        { id: 'contacted', label: t('leads.stages.contacted'), color: 'bg-yellow-500' },
        { id: 'qualified', label: t('leads.stages.qualified'), color: 'bg-purple-500' },
        { id: 'negotiation', label: t('leads.stages.negotiation'), color: 'bg-orange-500' },
        { id: 'won', label: t('leads.stages.won'), color: 'bg-green-500' },
        { id: 'lost', label: t('leads.stages.lost'), color: 'bg-red-500' },
    ];

    const LEAD_STAGES = React.useMemo(() => getLeadStages(t), [t]);
    const CARD_COLORS = [
        { id: 'default', bg: 'bg-gradient-to-r from-background via-background/60 to-transparent', border: 'border-q-border', indicator: 'bg-slate-500' },
        { id: 'blue', bg: 'bg-gradient-to-r from-blue-500/40 via-blue-500/20 to-transparent', border: 'border-blue-500/30', indicator: 'bg-blue-500' },
        { id: 'green', bg: 'bg-gradient-to-r from-emerald-500/40 via-emerald-500/20 to-transparent', border: 'border-emerald-500/30', indicator: 'bg-emerald-500' },
        { id: 'purple', bg: 'bg-gradient-to-r from-purple-500/40 via-purple-500/20 to-transparent', border: 'border-purple-500/30', indicator: 'bg-purple-500' },
        { id: 'orange', bg: 'bg-gradient-to-r from-orange-500/40 via-orange-500/20 to-transparent', border: 'border-orange-500/30', indicator: 'bg-orange-500' },
        { id: 'pink', bg: 'bg-gradient-to-r from-pink-500/40 via-pink-500/20 to-transparent', border: 'border-pink-500/30', indicator: 'bg-pink-500' },
        { id: 'red', bg: 'bg-gradient-to-r from-red-500/40 via-red-500/20 to-transparent', border: 'border-red-500/30', indicator: 'bg-red-500' },
    ];

    // State
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'list'>('kanban');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [showAddLead, setShowAddLead] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [showCustomFields, setShowCustomFields] = useState(false);
    const [showAddToAudience, setShowAddToAudience] = useState(false);
    const [audienceContacts, setAudienceContacts] = useState<{ email: string; name?: string; source?: string }[]>([]);
    const [audienceModalTitle, setAudienceModalTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [draftingEmail, setDraftingEmail] = useState(false);
    const [emailDraft, setEmailDraft] = useState('');
    const [showTimeline, setShowTimeline] = useState(false);
    const [showTasks, setShowTasks] = useState(false);
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeFilters, setActiveFilters] = useState<LeadsFiltersState>({
        search: '', statuses: [], sources: [], tags: [],
        dateRange: { start: '', end: '' },
        scoreRange: { min: 0, max: 100 },
        valueRange: { min: 0, max: 1000000 },
    });

    // Filtered leads
    const filteredLeads = useMemo(() => {
        let result = [...leads];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(l =>
                l.name?.toLowerCase().includes(q) ||
                l.email?.toLowerCase().includes(q) ||
                l.company?.toLowerCase().includes(q) ||
                l.notes?.toLowerCase().includes(q)
            );
        }
        if (activeFilters.statuses.length > 0) {
            result = result.filter(l => activeFilters.statuses.includes(l.status));
        }
        if (activeFilters.sources.length > 0) {
            result = result.filter(l => activeFilters.sources.includes(l.source || ''));
        }
        if (activeFilters.tags.length > 0) {
            result = result.filter(l => l.tags?.some(tag => activeFilters.tags.includes(tag)));
        }
        return result;
    }, [leads, searchQuery, activeFilters]);

    // Kanban grouped leads
    const leadsByStage = useMemo(() => {
        const grouped: Record<string, Lead[]> = {};
        LEAD_STAGES.forEach(stage => { grouped[stage.id] = []; });
        filteredLeads.forEach(lead => {
            if (grouped[lead.status]) {
                grouped[lead.status].push(lead);
            } else {
                grouped['new']?.push(lead);
            }
        });
        return grouped;
    }, [filteredLeads, LEAD_STAGES]);

    // Stats
    const stats = useMemo(() => ({
        total: leads.length,
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        qualified: leads.filter(l => l.status === 'qualified').length,
        won: leads.filter(l => l.status === 'won').length,
        totalValue: leads.reduce((sum, l) => sum + (l.value || 0), 0),
    }), [leads]);

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('text/plain', leadId);
        setDraggedLeadId(leadId);
    };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
    const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('text/plain');
        if (leadId) {
            await updateLeadStatus(leadId, newStatus);
            setDraggedLeadId(null);
        }
    };

    // Delete handler
    const handleDeleteLead = (leadId: string) => {
        setPendingDeleteId(leadId);
        setShowDeleteConfirm(true);
    };
    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        setIsDeleting(true);
        try {
            await deleteLead(pendingDeleteId);
            if (selectedLead?.id === pendingDeleteId) setSelectedLead(null);
        } catch (e) { console.error(e); }
        setIsDeleting(false);
        setShowDeleteConfirm(false);
        setPendingDeleteId(null);
    };

    // CSV Export
    const handleExportCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Value', 'Score', 'Notes', 'Created'];
        const rows = filteredLeads.map(l => [
            l.name || '', l.email || '', l.phone || '', l.company || '',
            l.status || '', l.source || '', String(l.value || 0), String(l.aiScore || l.leadScore || ''),
            (l.notes || '').replace(/,/g, ';'), l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000).toLocaleDateString() : '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-leads-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // AI Analysis
    const handleAiAnalysis = async () => {
        if (!hasApiKey) { promptForKeySelection(); return; }
        setIsAnalyzing(true);
        try {
            const prompt = `Analiza estos leads de la plataforma y proporciona insights estratégicos:\n\n${JSON.stringify(leads.slice(0, 20).map(l => ({
                name: l.name, email: l.email, company: l.company, status: l.status,
                source: l.source, value: l.value, score: l.aiScore || l.leadScore, tags: l.tags,
            })), null, 2)}\n\nProporciona:\n1. Resumen general\n2. Top 3 leads prioritarios\n3. Patrones detectados\n4. Recomendaciones de acción\n\nResponde en español.`;
            const result = await generateContentViaProxy('lead-analysis', prompt, 'gemini-2.5-flash');
            setAiAnalysis(extractTextFromResponse(result) || 'No se pudo generar el análisis.');
        } catch (error) {
            console.error('[AdminLeads] AI analysis error:', error);
            setAiAnalysis('Error al analizar los leads.');
        }
        setIsAnalyzing(false);
    };

    // Lead Card component
    const LeadCard: React.FC<{lead: Lead}> = ({ lead }) => {
        const currentTheme = CARD_COLORS.find(c => c.id === lead.color) || CARD_COLORS[0];
        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onClick={() => setSelectedLead(lead)}
                className={`${currentTheme.bg} ${currentTheme.border} group relative p-3 sm:p-4 rounded-lg sm:rounded-xl border hover:shadow-lg transition-all cursor-grab active:cursor-grabbing mb-2 sm:mb-3 shadow-sm`}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                    className="absolute top-2 right-2 z-10 p-1 rounded-full bg-q-surface/80 text-q-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={14} />
                </button>
                {lead.emojiMarker && (
                    <span className="absolute top-2 left-2 text-lg">{lead.emojiMarker}</span>
                )}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">{lead.name || 'Sin nombre'}</h4>
                        {lead.company && <p className="text-xs text-q-text-muted truncate">{lead.company}</p>}
                    </div>
                </div>
                {lead.email && (
                    <p className="text-xs text-q-text-muted flex items-center gap-1 mb-1">
                        <Mail size={10} />{lead.email}
                    </p>
                )}
                {lead.source && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-q-text-muted">
                        {lead.source}
                    </span>
                )}
                {(lead.aiScore || lead.leadScore) && (
                    <div className="mt-2 flex items-center gap-1">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${(lead.aiScore || 0) > 75 ? 'bg-green-500' : (lead.aiScore || 0) > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${lead.aiScore || lead.leadScore || 0}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-q-text-muted">{lead.aiScore || lead.leadScore}</span>
                    </div>
                )}
                {lead.value && lead.value > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-green-500">
                        <DollarSign size={10} />${lead.value.toLocaleString()}
                    </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-q-border/50">
                    <span className="text-[10px] text-q-text-muted flex items-center">
                        <Clock size={10} className="mr-1" />
                        {lead.createdAt?.seconds ? new Date(lead.createdAt.seconds * 1000).toLocaleDateString() : 'Reciente'}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons className="absolute inset-x-0 top-14 h-64 z-0 pointer-events-none overflow-hidden" />
                {/* Header */}
                <header className="h-14 bg-q-bg/95 border-b border-q-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-primary" />
                        <h1 className="text-lg font-bold">{t('superadmin.platformLeads', 'Leads de Plataforma')}</h1>
                        <span className="text-xs text-q-text-muted bg-secondary px-2 py-0.5 rounded-full">{leads.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <HeaderBackButton onClick={onBack} />
                        {/* View Mode */}
                        <div className="hidden sm:flex items-center gap-1 bg-secondary rounded-lg p-0.5">
                            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-q-text-muted hover:text-foreground'}`}><Columns size={16} /></button>
                            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-q-text-muted hover:text-foreground'}`}><Table size={16} /></button>
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-q-text-muted hover:text-foreground'}`}><List size={16} /></button>
                        </div>
                        <button onClick={() => setIsMobileSearchOpen(true)} className="p-1.5 rounded-md text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors"><Search size={18} /></button>
                        <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className="p-1.5 rounded-md text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors"><Filter size={18} /></button>
                        <button onClick={handleExportCSV} className="p-1.5 rounded-md text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors" title="Exportar CSV"><Download size={18} /></button>
                        <button onClick={() => setShowImport(true)} className="p-1.5 rounded-md text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors" title="Importar"><Upload size={18} /></button>
                        {/* Bulk add to audience */}
                        {selectedLeadIds.size > 0 && (
                            <button
                                onClick={() => {
                                    const selected = leads.filter(l => selectedLeadIds.has(l.id) && l.email);
                                    setAudienceContacts(selected.map(l => ({ email: l.email!, name: l.name, source: 'leads' })));
                                    setAudienceModalTitle(`Añadir ${selected.length} lead${selected.length > 1 ? 's' : ''} a Audiencia`);
                                    setShowAddToAudience(true);
                                }}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-all text-sm font-medium"
                            >
                                <Megaphone size={14} />
                                Audiencia ({selectedLeadIds.size})
                            </button>
                        )}
                        <button
                            onClick={handleAiAnalysis}
                            disabled={isAnalyzing}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-medium disabled:opacity-50"
                        >
                            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            AI
                        </button>
                        <button onClick={() => setShowAddLead(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium">
                            <Plus size={16} /><span className="hidden sm:inline">{t('leads.addLead')}</span>
                        </button>
                    </div>
                </header>

                {/* Stats Bar */}
                <div className="px-4 sm:px-6 py-3 border-b border-q-border/50 bg-q-surface/80 backdrop-blur-sm flex items-center gap-4 flex-wrap text-xs relative z-[1]">
                    <span className="text-q-text-muted">{t('leads.total')}: <b className="text-foreground">{stats.total}</b></span>
                    <span className="text-blue-500">{t('leads.stages.new')}: <b>{stats.new}</b></span>
                    <span className="text-yellow-500">{t('leads.stages.contacted')}: <b>{stats.contacted}</b></span>
                    <span className="text-purple-500">{t('leads.stages.qualified')}: <b>{stats.qualified}</b></span>
                    <span className="text-green-500">{t('leads.stages.won')}: <b>{stats.won}</b></span>
                    {stats.totalValue > 0 && (
                        <span className="text-emerald-500 ml-auto font-semibold">${stats.totalValue.toLocaleString()}</span>
                    )}
                </div>

                {/* AI Analysis Panel */}
                {aiAnalysis && (
                    <div className="mx-4 sm:mx-6 mt-3 p-4 rounded-xl bg-primary/5 border border-primary/20 relative">
                        <button onClick={() => setAiAnalysis(null)} className="absolute top-2 right-2 p-1 hover:bg-secondary rounded-md"><X size={14} /></button>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={16} className="text-primary" />
                            <h3 className="text-sm font-bold text-primary">{t('leads.aiAnalysis', 'Análisis AI')}</h3>
                        </div>
                        <div className="text-sm text-q-text-muted whitespace-pre-wrap max-h-60 overflow-y-auto">{aiAnalysis}</div>
                    </div>
                )}

                {/* Filters Panel */}
                {isFiltersOpen && (
                    <div className="px-4 sm:px-6 py-3 border-b border-q-border bg-q-surface/50">
                        <LeadsFilters
                            filters={activeFilters}
                            onFiltersChange={setActiveFilters}
                            availableTags={[...new Set(leads.flatMap(l => l.tags || []))]}
                        />
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto relative z-10 p-4 sm:p-6">
                    {isLoadingLeads ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Users className="w-16 h-16 text-q-text-muted/30 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">{t('leads.emptyState.title', 'Sin leads de plataforma')}</h3>
                            <p className="text-sm text-q-text-muted mb-4 max-w-md">
                                {t('leads.emptyState.adminDesc', 'Los leads de la landing page, formulario de contacto y chatbot aparecerán aquí.')}
                            </p>
                            <button onClick={() => setShowAddLead(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                                <Plus size={16} />{t('leads.addLead')}
                            </button>
                        </div>
                    ) : viewMode === 'kanban' ? (
                        /* Kanban View */
                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2" style={{ minHeight: '60vh' }}>
                            {LEAD_STAGES.map(stage => (
                                <div
                                    key={stage.id}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage.id)}
                                    className="flex-shrink-0 w-72 sm:w-80"
                                >
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                                        <h3 className="text-sm font-bold text-foreground">{stage.label}</h3>
                                        <span className="text-xs text-q-text-muted bg-secondary px-1.5 py-0.5 rounded-full">
                                            {leadsByStage[stage.id]?.length || 0}
                                        </span>
                                    </div>
                                    <div className="min-h-[200px] p-1 rounded-lg border border-dashed border-q-border/50">
                                        {leadsByStage[stage.id]?.map(lead => (
                                            <LeadCard key={lead.id} lead={lead} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : viewMode === 'table' ? (
                        <LeadsTableView
                            leads={filteredLeads}
                            onLeadClick={(lead) => setSelectedLead(lead)}
                            onDelete={handleDeleteLead}
                            selectedLeadIds={[...selectedLeadIds]}
                            onToggleSelect={(id: string) => setSelectedLeadIds(prev => {
                                const next = new Set(prev);
                                if (next.has(id)) next.delete(id); else next.add(id);
                                return next;
                            })}
                            onToggleSelectAll={() => {
                                if (selectedLeadIds.size === filteredLeads.length) {
                                    setSelectedLeadIds(new Set());
                                } else {
                                    setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
                                }
                            }}
                            totalFilteredCount={filteredLeads.length}
                            allFilteredSelected={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                            onSelectAllFiltered={() => setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)))}
                            onClearSelection={() => setSelectedLeadIds(new Set())}
                        />
                    ) : (
                        <LeadsListView
                            leads={filteredLeads}
                            selectedLeadId={selectedLead?.id || null}
                            onLeadClick={(lead) => setSelectedLead(lead)}
                            selectedLeadIds={[...selectedLeadIds]}
                            onToggleSelect={(id: string) => setSelectedLeadIds(prev => {
                                const next = new Set(prev);
                                if (next.has(id)) next.delete(id); else next.add(id);
                                return next;
                            })}
                        />
                    )}
                </main>
            </div>

            {/* Lead Detail Panel */}
            {selectedLead && (
                <div className="w-full sm:w-96 lg:w-[420px] border-l border-q-border bg-q-surface overflow-y-auto flex-shrink-0">
                    <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold truncate">{selectedLead.name}</h2>
                            <button onClick={() => setSelectedLead(null)} className="p-1 hover:bg-secondary rounded-md"><X size={18} /></button>
                        </div>
                        <div className="space-y-4">
                            {selectedLead.email && (
                                <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-q-text-muted" /><span>{selectedLead.email}</span></div>
                            )}
                            {selectedLead.phone && (
                                <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-q-text-muted" /><span>{selectedLead.phone}</span></div>
                            )}
                            {selectedLead.company && (
                                <div className="flex items-center gap-2 text-sm"><Building2 size={14} className="text-q-text-muted" /><span>{selectedLead.company}</span></div>
                            )}
                            <div className="border-t border-q-border pt-4">
                                <h3 className="text-sm font-semibold mb-2">{t('leads.status')}</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {LEAD_STAGES.map(stage => (
                                        <button
                                            key={stage.id}
                                            onClick={() => updateLeadStatus(selectedLead.id, stage.id)}
                                            className={`text-xs px-2 py-1 rounded-full border transition-all ${selectedLead.status === stage.id ? `${stage.color} text-white border-transparent` : 'border-q-border text-q-text-muted hover:text-foreground'}`}
                                        >
                                            {stage.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {selectedLead.notes && (
                                <div className="border-t border-q-border pt-4">
                                    <h3 className="text-sm font-semibold mb-2">{t('leads.notes')}</h3>
                                    <p className="text-sm text-q-text-muted whitespace-pre-wrap">{selectedLead.notes}</p>
                                </div>
                            )}
                            {selectedLead.tags && selectedLead.tags.length > 0 && (
                                <div className="border-t border-q-border pt-4">
                                    <h3 className="text-sm font-semibold mb-2">Tags</h3>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedLead.tags.map(tag => (
                                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedLead.conversationTranscript && (
                                <div className="border-t border-q-border pt-4">
                                    <h3 className="text-sm font-semibold mb-2">{t('leads.conversation', 'Conversación')}</h3>
                                    <div className="text-xs text-q-text-muted whitespace-pre-wrap max-h-40 overflow-y-auto bg-secondary/50 p-3 rounded-lg">{selectedLead.conversationTranscript}</div>
                                </div>
                            )}
                            {/* Email Marketing Integration */}
                            <div className="border-t border-q-border pt-4">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Megaphone size={14} className="text-purple-500" />
                                    Email Marketing
                                </h3>
                                <div className="space-y-2">
                                    {selectedLead.email && (
                                        <button
                                            onClick={() => {
                                                setAudienceContacts([{ email: selectedLead.email!, name: selectedLead.name, source: 'leads' }]);
                                                setAudienceModalTitle(`Añadir ${selectedLead.name || 'lead'} a Audiencia`);
                                                setShowAddToAudience(true);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-all text-sm font-medium"
                                        >
                                            <Mail size={14} />
                                            Añadir a Audiencia Email
                                        </button>
                                    )}
                                    {selectedLead.email && (
                                        <button
                                            onClick={() => {
                                                navigate(`${ROUTES.ADMIN_EMAIL}?action=new-campaign&email=${encodeURIComponent(selectedLead.email!)}&name=${encodeURIComponent(selectedLead.name || '')}`);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-all text-sm font-medium"
                                        >
                                            <Send size={14} />
                                            Crear Campaña de Email
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <MobileSearchModal
                isOpen={isMobileSearchOpen}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClose={() => setIsMobileSearchOpen(false)}
                placeholder={t('leads.searchPlaceholder')}
            />
            {showAddLead && (
                <AddLeadModal
                    isOpen={showAddLead}
                    onClose={() => setShowAddLead(false)}
                    onSubmit={async (leadData) => {
                        await addLead(leadData as any);
                        setShowAddLead(false);
                    }}
                />
            )}
            {showImport && (
                <ImportLeadsModal
                    isOpen={showImport}
                    onClose={() => setShowImport(false)}
                />
            )}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onCancel={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); }}
                onConfirm={confirmDelete}
                title={t('leads.deleteConfirmTitle', 'Eliminar Lead')}
                message={t('leads.deleteConfirmMessage', '¿Estás seguro de que quieres eliminar este lead? Esta acción no se puede deshacer.')}
                confirmText={t('common.delete', 'Eliminar')}
                isLoading={isDeleting}
                variant="danger"
            />
            {/* Add to Audience Modal */}
            <AddToAudienceModal
                isOpen={showAddToAudience}
                onClose={() => setShowAddToAudience(false)}
                contacts={audienceContacts}
                title={audienceModalTitle}
                description="Los contactos se añadirán a la audiencia seleccionada del Email Hub."
            />
        </>
    );
};

export default AdminLeadsDashboard;
