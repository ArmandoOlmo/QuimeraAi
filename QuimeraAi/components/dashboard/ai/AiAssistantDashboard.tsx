
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeEditor } from '../../../contexts/EditorContext';
import { useAI } from '../../../contexts/ai/AIContext';
import { useProject } from '../../../contexts/project/ProjectContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useCMS } from '../../../contexts/cms/CMSContext';
import DashboardSidebar from '../DashboardSidebar';
import {
    Menu, Bot, MessageSquare, Settings, Sliders, FileText,
    Save, Sparkles, User, Building2, Globe, Book, Activity, LayoutGrid, ChevronRight, Clock,
    Mic, Radio, BookOpen, Package, Shield, Phone, Facebook, Instagram, Inbox,
    TrendingUp, TrendingDown, Users, Zap, BarChart3, MessageCircle, RefreshCw, Search,
    ArrowUpRight, Loader2, Newspaper, CheckSquare, Square, Link2 as Link2Icon, PanelTopClose, PanelTopOpen,
    Target, Bell, Trophy,
} from 'lucide-react';
import ChatSimulator from './ChatSimulator';
import { AiAssistantConfig } from '../../../types';
import FAQManager from './FAQManager';
import KnowledgeDocumentUploader from './KnowledgeDocumentUploader';
import KnowledgeLinksManager from './KnowledgeLinksManager';
import LeadCaptureSettings from './LeadCaptureSettings';
import ChatCustomizationSettings from './ChatCustomizationSettings';
import SocialChannelsSettings from './SocialChannelsSettings';
import VoiceSettings from './VoiceSettings';
import SocialChatInbox from './SocialChatInbox';
import ChatbotEngineDashboard from './ChatbotEngineDashboard';
import { useProjectChatStats, ProjectChatStats } from '../../chat/hooks/useProjectChatStats';
import MobileSearchModal from '../../ui/MobileSearchModal';
import HeaderBackButton from '../../ui/HeaderBackButton';
import ProjectThumbnailFallback from '../ProjectThumbnailFallback';
import { getDynamicThumbnailUrl } from '../../../utils/thumbnailHelper';
import { normalizeChatAppearanceConfig } from '../../../utils/chatThemes';

type Tab = 'overview' | 'engine' | 'knowledge' | 'personality' | 'voice' | 'leadCapture' | 'customization' | 'socialChannels' | 'socialInbox' | 'settings';

const OPERATOR_CHATBOT_TABS: Tab[] = ['overview', 'socialInbox'];
const OPERATOR_CHATBOT_TAB_SET = new Set<Tab>(OPERATOR_CHATBOT_TABS);
const CHATBOT_ENGINE_MANAGER_ROLES = new Set(['owner', 'superadmin', 'admin', 'manager']);
const CHATBOT_ENGINE_MANAGER_TENANT_ROLES = new Set(['agency_owner', 'agency_admin']);

const voices: { name: AiAssistantConfig['voiceName']; description: string; gender: string }[] = [
    { name: 'Zephyr', description: 'Calm, balanced, professional.', gender: 'Female' },
    { name: 'Puck', description: 'Energetic, friendly, youthful.', gender: 'Male' },
    { name: 'Charon', description: 'Deep, authoritative, trustworthy.', gender: 'Male' },
    { name: 'Kore', description: 'Warm, nurturing, soft.', gender: 'Female' },
    { name: 'Fenrir', description: 'Strong, clear, direct.', gender: 'Male' },
];

const normalizeAiAssistantDashboardConfig = (config: AiAssistantConfig): AiAssistantConfig => ({
    ...config,
    appearance: normalizeChatAppearanceConfig(config.appearance),
});

const AiAssistantDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { aiAssistantConfig, setAiAssistantConfig, saveAiAssistantConfig } = useAI();
    const editorContext = useSafeEditor();
    const { activeProject, projects, loadProject, updateProjectAiConfig } = useProject();
    const { setView } = useUI();
    const { user, userDocument, isUserOwner, currentTenantRole, canAccessSuperAdmin } = useAuth();
    const { cmsPosts, loadCMSPosts } = useCMS();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [formData, setFormData] = useState<AiAssistantConfig>(() => normalizeAiAssistantDashboardConfig(aiAssistantConfig));
    const [isSaving, setIsSaving] = useState(false);
    const [voiceGenderFilter, setVoiceGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
    const isSavingRef = useRef(false);

    const canManageChatbotEngine = useMemo(() => {
        const userRole = String(userDocument?.role || '').toLowerCase();
        const tenantRole = String(currentTenantRole || '').toLowerCase();

        return Boolean(
            isUserOwner ||
            canAccessSuperAdmin ||
            CHATBOT_ENGINE_MANAGER_ROLES.has(userRole) ||
            CHATBOT_ENGINE_MANAGER_TENANT_ROLES.has(tenantRole)
        );
    }, [canAccessSuperAdmin, currentTenantRole, isUserOwner, userDocument?.role]);

    const tabs = useMemo(() => [
        { id: 'overview', label: t('aiAssistant.dashboard.tabs.overview'), icon: <Activity size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.overview') },
        { id: 'engine', label: t('aiAssistant.dashboard.tabs.engine'), icon: <LayoutGrid size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.engine') },
        { id: 'knowledge', label: t('aiAssistant.dashboard.tabs.knowledge'), icon: <Book size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.knowledge') },
        { id: 'personality', label: t('aiAssistant.dashboard.tabs.personality'), icon: <User size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.personality') },
        { id: 'voice', label: t('aiAssistant.dashboard.tabs.voice'), icon: <Mic size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.voice') },
        { id: 'leadCapture', label: t('aiAssistant.dashboard.tabs.leadCapture'), icon: <Sparkles size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.leadCapture') },
        { id: 'customization', label: t('aiAssistant.dashboard.tabs.customization'), icon: <Sliders size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.customization') },
        { id: 'socialChannels', label: t('aiAssistant.dashboard.tabs.socialChannels'), icon: <Phone size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.socialChannels') },
        { id: 'socialInbox', label: t('aiAssistant.dashboard.tabs.socialInbox'), icon: <Inbox size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.socialInbox') },
        { id: 'settings', label: t('aiAssistant.dashboard.tabs.settings'), icon: <Settings size={18} />, description: t('aiAssistant.dashboard.tabDescriptions.settings') },
    ], [t]);

    const visibleTabs = useMemo(() => (
        canManageChatbotEngine
            ? tabs
            : tabs.filter(tab => OPERATOR_CHATBOT_TAB_SET.has(tab.id as Tab))
    ), [canManageChatbotEngine, tabs]);

    useEffect(() => {
        if (!visibleTabs.some(tab => tab.id === activeTab)) {
            setActiveTab('overview');
        }
    }, [activeTab, visibleTabs]);

    // Load AI config from active project when it changes
    useEffect(() => {
        // Skip if we just saved — avoid overwriting formData with stale Supabase snapshot
        if (isSavingRef.current) return;

        if (activeProject?.aiAssistantConfig) {
            // Load config from project (from Supabase)
            const normalizedConfig = normalizeAiAssistantDashboardConfig(activeProject.aiAssistantConfig);
            setFormData(normalizedConfig);
            setAiAssistantConfig(normalizedConfig);
        } else if (aiAssistantConfig) {
            // Fallback to context config
            setFormData(normalizeAiAssistantDashboardConfig(aiAssistantConfig));
        }
    }, [activeProject?.id, activeProject?.aiAssistantConfig]);

    // Sync formData with context changes (for live preview from Customization tab)
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            appearance: normalizeChatAppearanceConfig(aiAssistantConfig.appearance)
        }));
    }, [aiAssistantConfig.appearance]);

    const handleSave = async () => {
        if (!activeProject?.id) return;
        setIsSaving(true);
        isSavingRef.current = true;
        try {
            await saveAiAssistantConfig(formData, activeProject.id);
            // CRITICAL: Also update the in-memory projects array so the auto-save
            // in ProjectContext doesn't overwrite fresh config with stale data
            updateProjectAiConfig(activeProject.id, formData);
            // Also sync to EditorContext so ChatbotWidget picks up changes immediately
            if (editorContext?.saveAiAssistantConfig) {
                await editorContext.saveAiAssistantConfig(formData);
            }
        } catch (error) {
            console.error('Error saving config:', error);
        }
        setIsSaving(false);
        // Keep the guard for a short time to let Supabase listener settle
        setTimeout(() => { isSavingRef.current = false; }, 2000);
    };

    const updateForm = (key: keyof AiAssistantConfig, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSelectProject = (projectId: string) => {
        loadProject(projectId, false, false);
    };

    const renderOperatorAccessPanel = () => (
        <div className="quimera-dashboard-panel-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-q-border/60 bg-q-surface/70 text-q-text-muted">
                        <Shield size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{t('aiAssistant.dashboard.operatorAccessTitle')}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-q-text-muted">{t('aiAssistant.dashboard.operatorAccessDesc')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setActiveTab('socialInbox')}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-q-border/60 px-4 text-sm font-semibold text-foreground transition-colors hover:border-q-accent/40 hover:bg-q-surface"
                >
                    <Inbox size={16} />
                    {t('aiAssistant.dashboard.operatorInboxCta')}
                </button>
            </div>
            <div className="mt-5 rounded-lg border border-q-border/60 bg-q-surface/40 p-4 text-sm text-q-text-muted">
                {t('aiAssistant.dashboard.operatorAccessScope')}
            </div>
        </div>
    );

    const userProjects = projects.filter(p => p.status !== 'Template');
    const projectIds = useMemo(() => userProjects.map(p => p.id), [userProjects]);

    // Chat stats hook
    const {
        stats: chatStats,
        globalStats,
        isLoading: isLoadingStats,
        getStatsForProject,
        refresh: refreshStats
    } = useProjectChatStats(projectIds);

    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // Filter projects by search
    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return userProjects;
        const query = searchQuery.toLowerCase();
        return userProjects.filter(p =>
            p.name.toLowerCase().includes(query)
        );
    }, [userProjects, searchQuery]);

    // Sort projects by activity
    const sortedProjects = useMemo(() => {
        return [...filteredProjects].sort((a, b) => {
            const statsA = getStatsForProject(a.id);
            const statsB = getStatsForProject(b.id);
            // Sort by active conversations first, then by last activity
            if (statsA?.activeConversations !== statsB?.activeConversations) {
                return (statsB?.activeConversations || 0) - (statsA?.activeConversations || 0);
            }
            const lastA = statsA?.lastActivity?.getTime() || 0;
            const lastB = statsB?.lastActivity?.getTime() || 0;
            return lastB - lastA;
        });
    }, [filteredProjects, getStatsForProject]);

    // Format response time
    const formatResponseTime = (seconds: number): string => {
        if (seconds === 0) return '--';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    // Format last activity
    const formatLastActivity = (date: Date | null): string => {
        if (!date) return 'Sin actividad';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora mismo';
        if (minutes < 60) return `Hace ${minutes}m`;
        if (hours < 24) return `Hace ${hours}h`;
        if (days < 7) return `Hace ${days}d`;
        return date.toLocaleDateString();
    };

    // Get channel icon
    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'whatsapp': return <Phone size={12} className="text-q-success" />;
            case 'facebook': return <Facebook size={12} className="text-q-accent" />;
            case 'instagram': return <Instagram size={12} className="text-q-accent" />;
            default: return <Globe size={12} className="text-primary" />;
        }
    };

    if (!activeProject) {
        return (
            <div className="flex h-screen bg-q-bg text-foreground">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden relative">
 <header className="quimera-dashboard-header-bar h-14 px-2 sm:px-6 flex items-center justify-between z-20 shrink-0">
                        <div className="flex items-center gap-1 sm:gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-border/40 rounded-lg transition-colors">
                                <Menu className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1 sm:gap-2">
                                <Bot className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                                <h1 className="text-sm sm:text-lg font-semibold text-foreground">Chatbot</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMobileSearchOpen(true)}
                                className="text-q-text-muted hover:text-foreground transition-colors"
                                aria-label="Search"
                            >
                                <Search size={20} />
                            </button>
                            <button
                                onClick={refreshStats}
                                disabled={isLoadingStats}
                                className="text-q-text-muted hover:text-foreground transition-colors"
                                title={t('aiAssistant.dashboard.refreshStats')}
                            >
                                <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                            </button>
                            <HeaderBackButton onClick={() => setView('dashboard')} />
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/20">
                        <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">

                            {/* Global Stats */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <BarChart3 className="w-7 h-7 quimera-status-card-accent-text flex-shrink-0" strokeWidth={2} />
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                                                {t('aiAssistant.dashboard.analyticsTitle')}
                                            </h2>
                                            <p className="text-q-text-muted text-sm mt-0.5">
                                                {t('aiAssistant.dashboard.analyticsSubtitle')}
                                            </p>
                                        </div>
                                    </div>
                                    {isLoadingStats && (
                                        <Loader2 size={20} className="animate-spin quimera-status-card-accent-text flex-shrink-0" />
                                    )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                    {[
                                        { icon: MessageCircle, value: globalStats.totalActiveChats, label: t('aiAssistant.dashboard.globalStats.activeChats'), hint: t('aiAssistant.dashboard.globalStats.activeChatsHint') },
                                        { icon: Zap, value: globalStats.totalMessages24h, label: t('aiAssistant.dashboard.globalStats.messages24h'), hint: t('aiAssistant.dashboard.globalStats.messages24hHint') },
                                        { icon: Users, value: globalStats.totalLeads, label: t('aiAssistant.dashboard.globalStats.totalLeads'), hint: t('aiAssistant.dashboard.globalStats.totalLeadsHint') },
                                        { icon: Clock, value: formatResponseTime(globalStats.avgResponseTime), label: t('aiAssistant.dashboard.globalStats.responseTime'), hint: t('aiAssistant.dashboard.globalStats.responseTimeHint') },
                                    ].map((stat) => {
                                        const Icon = stat.icon;

                                        return (
                                            <div
                                                key={stat.label}
                                                className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-q-border/60
                                                    bg-q-surface/80 backdrop-blur-xl p-3 sm:p-4 hover:border-q-border transition-all duration-300"
                                            >
                                                <div
                                                    className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-2xl
                                                        group-hover:scale-110 transition-all duration-500"
                                                    aria-hidden="true"
                                                />
                                                <div className="relative z-10">
                                                    <div className="mb-1 md:mb-2">
                                                        <Icon className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                                    </div>
                                                    <div className="text-xl md:text-3xl font-extrabold text-foreground">{stat.value}</div>
                                                    <p className="text-[10px] md:text-xs font-semibold text-q-text-muted uppercase tracking-wider mt-0.5 md:mt-1 leading-tight truncate">{stat.label}</p>
                                                    <p className="text-[10px] text-q-text-muted/80 hidden sm:block">{stat.hint}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Search Modal */}
                            <MobileSearchModal
                                isOpen={isMobileSearchOpen}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                onClose={() => setIsMobileSearchOpen(false)}
                                placeholder={t('aiAssistant.dashboard.searchProjectPlaceholder')}
                            />

                            {/* Header */}
                            <div>
                                <h3 className="text-xl font-bold">{t('aiAssistant.dashboard.selectProject')}</h3>
                                <p className="text-q-text-muted mt-1">
                                    {t('aiAssistant.dashboard.selectProjectDesc')}
                                </p>
                            </div>

                            {/* Project Cards Grid */}
                            {sortedProjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {sortedProjects.map(project => {
                                        const projectStats = getStatsForProject(project.id);
                                        const hasActivity = projectStats && projectStats.activeConversations > 0;
                                        const thumbnailUrl = getDynamicThumbnailUrl(project);

                                        return (
                                            <button
                                                key={project.id}
                                                onClick={() => handleSelectProject(project.id)}
                                                className="group relative rounded-2xl overflow-hidden transition-all duration-300 flex flex-col text-left bg-q-surface/80 backdrop-blur-xl border border-q-border/60 hover:border-q-border hover:-translate-y-0.5"
                                            >
                                                <div
                                                    className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl group-hover:scale-110 transition-all duration-500 z-0 pointer-events-none"
                                                    aria-hidden="true"
                                                />
                                                {/* Activity Indicator */}
                                                {hasActivity && (
                                                    <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-q-success/20 backdrop-blur-sm border border-q-success/30">
                                                        <span className="w-2 h-2 bg-q-success rounded-full animate-pulse" />
                                                        <span className="text-xs font-semibold text-q-success">
                                                            {t('aiAssistant.dashboard.activeConversationsBadge', { count: projectStats.activeConversations })}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Thumbnail Section */}
                                                <div className="relative h-40 overflow-hidden">
                                                    {thumbnailUrl ? (
                                                        <img
                                                            src={thumbnailUrl}
                                                            alt={project.name}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <ProjectThumbnailFallback />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                                                </div>

                                                {/* Content Section */}
                                                <div className="relative z-10 p-5 space-y-4">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-[var(--quimera-status-accent-from)] transition-colors">
                                                            {project.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1 text-sm text-q-text-muted">
                                                            <Clock size={14} />
                                                            <span>
                                                                {formatLastActivity(projectStats?.lastActivity || null)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Stats Row */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[
                                                            { value: projectStats?.totalMessages || 0, label: t('aiAssistant.dashboard.projectStats.messages') },
                                                            { value: projectStats?.totalLeads || 0, label: t('aiAssistant.dashboard.projectStats.leads') },
                                                            { value: formatResponseTime(projectStats?.avgResponseTime || 0), label: t('aiAssistant.dashboard.projectStats.response') },
                                                        ].map((stat) => (
                                                            <div
                                                                key={stat.label}
                                                                className="text-center p-2 rounded-lg border border-q-border/50 bg-q-surface/50"
                                                            >
                                                                <div className="text-lg font-bold text-foreground">{stat.value}</div>
                                                                <div className="text-[10px] text-q-text-muted uppercase tracking-wide">{stat.label}</div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Channels & Trend */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-q-border/50">
                                                        {/* Active Channels */}
                                                        <div className="flex items-center gap-1">
                                                            {projectStats?.channelBreakdown.slice(0, 3).map(({ channel }) => (
                                                                <div
                                                                    key={channel}
                                                                    className="w-6 h-6 rounded-full bg-secondary/80 flex items-center justify-center"
                                                                    title={channel}
                                                                >
                                                                    {getChannelIcon(channel)}
                                                                </div>
                                                            ))}
                                                            {(!projectStats?.channelBreakdown.length) && (
                                                                <span className="text-xs text-q-text-muted">{t('aiAssistant.dashboard.noChannels')}</span>
                                                            )}
                                                        </div>

                                                        {/* Trend Indicator */}
                                                        {projectStats?.trend && projectStats.trend !== 'stable' && (
                                                            <div className={`flex items-center gap-1 text-xs font-medium ${projectStats.trend === 'up'
                                                                ? 'text-q-success'
                                                                : 'text-q-error'
                                                                }`}>
                                                                {projectStats.trend === 'up' ? (
                                                                    <TrendingUp size={14} />
                                                                ) : (
                                                                    <TrendingDown size={14} />
                                                                )}
                                                                <span>{projectStats.trendPercentage.toFixed(0)}%</span>
                                                            </div>
                                                        )}

                                                        {/* Arrow */}
                                                        <ArrowUpRight
                                                            size={18}
                                                            className="quimera-status-card-link group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : searchQuery ? (
                                <div className="text-center py-16 quimera-dashboard-panel-card">
                                    <Search className="w-12 h-12 text-q-text-muted mx-auto mb-4" strokeWidth={1.5} />
                                    <h3 className="text-lg font-bold mb-2">{t('aiAssistant.dashboard.noSearchResults')}</h3>
                                    <p className="text-sm text-q-text-muted">
                                        {t('aiAssistant.dashboard.noSearchResultsDesc', { query: searchQuery })}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-20 quimera-dashboard-panel-card border-dashed">
                                    <LayoutGrid className="w-14 h-14 text-q-text-muted mx-auto mb-4" strokeWidth={1.5} />
                                    <h3 className="text-lg font-bold mb-2">{t('aiAssistant.dashboard.noProjects')}</h3>
                                    <p className="text-sm text-q-text-muted mb-6">{t('aiAssistant.dashboard.noProjectsDesc')}</p>
                                </div>
                            )}

                            {/* Quick Tips / Ideas Section */}
                            <div className="quimera-dashboard-panel-card group mt-8 p-6">
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 quimera-status-card-accent-text" strokeWidth={2} />
                                    {t('aiAssistant.dashboard.improvementIdeas')}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { icon: Target, title: t('aiAssistant.dashboard.ideas.weeklyGoals.title'), desc: t('aiAssistant.dashboard.ideas.weeklyGoals.desc') },
                                        { icon: BarChart3, title: t('aiAssistant.dashboard.ideas.comparisons.title'), desc: t('aiAssistant.dashboard.ideas.comparisons.desc') },
                                        { icon: Bell, title: t('aiAssistant.dashboard.ideas.smartAlerts.title'), desc: t('aiAssistant.dashboard.ideas.smartAlerts.desc') },
                                        { icon: Bot, title: t('aiAssistant.dashboard.ideas.aiInsights.title'), desc: t('aiAssistant.dashboard.ideas.aiInsights.desc') },
                                        { icon: TrendingUp, title: t('aiAssistant.dashboard.ideas.advancedCharts.title'), desc: t('aiAssistant.dashboard.ideas.advancedCharts.desc') },
                                        { icon: Trophy, title: t('aiAssistant.dashboard.ideas.leaderboard.title'), desc: t('aiAssistant.dashboard.ideas.leaderboard.desc') },
                                    ].map((idea) => {
                                        const Icon = idea.icon;

                                        return (
                                            <div
                                                key={idea.title}
                                                className="quimera-guide-panel-accent p-4 flex gap-3"
                                            >
                                                <Icon className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                                                <div>
                                                    <h5 className="font-semibold text-sm mb-1 text-foreground">{idea.title}</h5>
                                                    <p className="text-xs text-q-text-muted">{idea.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        if (!canManageChatbotEngine && !OPERATOR_CHATBOT_TAB_SET.has(activeTab)) {
            return renderOperatorAccessPanel();
        }

        switch (activeTab) {
            case 'overview':
                const currentProjectStats = activeProject ? getStatsForProject(activeProject.id) : null;
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="quimera-dashboard-panel-card group p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">{t('aiAssistant.dashboard.performanceOverview')}</h3>
                                <button
                                    onClick={refreshStats}
                                    disabled={isLoadingStats}
                                    className="p-2 rounded-lg hover:bg-secondary text-q-text-muted hover:text-foreground transition-colors"
                                    title={t('aiAssistant.dashboard.refreshStats')}
                                >
                                    <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                {[
                                    { icon: MessageCircle, value: currentProjectStats?.totalMessages || 0, label: t('aiAssistant.dashboard.chats') },
                                    { icon: Users, value: currentProjectStats?.totalLeads || 0, label: t('aiAssistant.dashboard.leads') },
                                    { icon: Clock, value: formatResponseTime(currentProjectStats?.avgResponseTime || 0), label: t('aiAssistant.dashboard.latency') },
                                ].map((stat) => (
                                        <div
                                            key={stat.label}
                                            className="p-3 sm:p-4 rounded-lg border border-q-border/60 bg-secondary/20 text-center"
                                        >
                                            <span className="block text-xl sm:text-2xl font-bold quimera-status-card-accent-text">{stat.value}</span>
                                            <span className="text-[10px] sm:text-xs text-q-text-muted uppercase tracking-wider">{stat.label}</span>
                                        </div>
                                ))}
                            </div>
                        </div>

                        {canManageChatbotEngine ? (
                            <div className="quimera-dashboard-panel-card group p-6">
                                <h3 className="font-bold text-lg mb-4">{t('aiAssistant.dashboard.configStatus')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Business Profile */}
                                    <button
                                        onClick={() => setActiveTab('knowledge')}
                                        className="flex items-center justify-between p-4 rounded-xl border border-q-border/60 bg-q-surface/50 hover:bg-q-surface hover:border-q-border transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${formData.businessProfile ? 'bg-q-success/10 text-q-success' : 'bg-q-accent/10 text-q-accent'}`}>
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-sm block group-hover:text-[var(--quimera-status-accent-from)] transition-colors">{t('aiAssistant.dashboard.businessProfile')}</span>
                                                <span className="text-xs text-q-text-muted">{t('aiAssistant.dashboard.businessInfo')}</span>
                                            </div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${formData.businessProfile ? 'bg-q-success' : 'bg-q-accent'}`} />
                                    </button>

                                    {/* Knowledge Base */}
                                    <button
                                        onClick={() => setActiveTab('knowledge')}
                                        className="flex items-center justify-between p-4 rounded-xl border border-q-border/60 bg-q-surface/50 hover:bg-q-surface hover:border-q-border transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${(formData.faqs?.length > 0 || formData.knowledgeDocuments?.length > 0 || formData.knowledgeLinks?.length > 0 || (formData.cmsArticleIds?.length || 0) > 0) ? 'bg-q-success/10 text-q-success' : 'bg-q-accent/10 text-q-accent'}`}>
                                                <BookOpen size={20} />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-sm block group-hover:text-[var(--quimera-status-accent-from)] transition-colors">{t('aiAssistant.dashboard.knowledgeBase')}</span>
                                                <span className="text-xs text-q-text-muted">
                                                    {t('aiAssistant.dashboard.knowledgeBaseStats', {
                                                        faqs: formData.faqs?.length || 0,
                                                        docs: formData.knowledgeDocuments?.length || 0,
                                                        links: formData.knowledgeLinks?.length || 0,
                                                        articles: formData.cmsArticleIds?.length || 0,
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${(formData.faqs?.length > 0 || formData.knowledgeDocuments?.length > 0 || formData.knowledgeLinks?.length > 0 || (formData.cmsArticleIds?.length || 0) > 0) ? 'bg-q-success' : 'bg-q-accent'}`} />
                                    </button>

                                    {/* Lead Capture */}
                                    <button
                                        onClick={() => setActiveTab('leadCapture')}
                                        className="flex items-center justify-between p-4 rounded-xl border border-q-border/60 bg-q-surface/50 hover:bg-q-surface hover:border-q-border transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${formData.leadCaptureEnabled ? 'bg-q-success/10 text-q-success' : 'bg-q-error/10 text-q-error'}`}>
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-sm block group-hover:text-[var(--quimera-status-accent-from)] transition-colors">{t('aiAssistant.dashboard.leadCaptureStatus')}</span>
                                                <span className="text-xs text-q-text-muted">{formData.leadCaptureEnabled ? t('aiAssistant.dashboard.statusActive') : t('aiAssistant.dashboard.statusInactive')}</span>
                                            </div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${formData.leadCaptureEnabled ? 'bg-q-success' : 'bg-q-error'}`} />
                                    </button>

                                    {/* Live Voice */}
                                    <button
                                        onClick={() => setActiveTab('voice')}
                                        className="flex items-center justify-between p-4 rounded-xl border border-q-border/60 bg-q-surface/50 hover:bg-q-surface hover:border-q-border transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${formData.enableLiveVoice ? 'bg-q-success/10 text-q-success' : 'bg-q-error/10 text-q-error'}`}>
                                                <Mic size={20} />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-sm block group-hover:text-[var(--quimera-status-accent-from)] transition-colors">{t('aiAssistant.dashboard.liveVoice')}</span>
                                                <span className="text-xs text-q-text-muted">{formData.enableLiveVoice ? t('aiAssistant.dashboard.statusActive') : t('aiAssistant.dashboard.statusInactive')}</span>
                                            </div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${formData.enableLiveVoice ? 'bg-q-success' : 'bg-q-error'}`} />
                                    </button>

                                    {/* Chat Active */}
                                    <button
                                        onClick={() => setActiveTab('settings')}
                                        className="flex items-center justify-between p-4 rounded-xl border border-q-border/60 bg-q-surface/50 hover:bg-q-surface hover:border-q-border transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${formData.isActive ? 'bg-q-success/10 text-q-success' : 'bg-q-error/10 text-q-error'}`}>
                                                <MessageSquare size={20} />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-sm block group-hover:text-[var(--quimera-status-accent-from)] transition-colors">{t('aiAssistant.dashboard.chatStatus')}</span>
                                                <span className="text-xs text-q-text-muted">{formData.isActive ? t('aiAssistant.dashboard.statusOnline') : t('aiAssistant.dashboard.statusOffline')}</span>
                                            </div>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${formData.isActive ? 'bg-q-success' : 'bg-q-error'}`} />
                                    </button>
                                </div>
                            </div>
                        ) : renderOperatorAccessPanel()}
                    </div>
                );

            case 'engine':
                return (
                    <ChatbotEngineDashboard
                        project={activeProject}
                        actorId={user?.id}
                        onOpenAppearance={() => setActiveTab('customization')}
                        onOpenInbox={() => setActiveTab('socialInbox')}
                        onOpenKnowledge={() => setActiveTab('knowledge')}
                        onOpenVoice={() => setActiveTab('voice')}
                        onProjectRefresh={(projectOverride) => loadProject(activeProject.id, false, false, projectOverride)}
                    />
                );

            case 'knowledge':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                                <Building2 size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.businessProfile')}
                            </label>
                            <textarea
                                className="w-full bg-q-surface border border-q-border rounded-xl p-4 min-h-[300px] sm:min-h-[200px] md:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder={t('aiAssistant.dashboard.placeholders.businessProfile')}
                                value={formData.businessProfile}
                                onChange={(e) => updateForm('businessProfile', e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                                <Package size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.productsServices')}
                            </label>
                            <textarea
                                className="w-full bg-q-surface border border-q-border rounded-xl p-4 min-h-[300px] sm:min-h-[200px] md:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder={t('aiAssistant.dashboard.placeholders.productsServices')}
                                value={formData.productsServices}
                                onChange={(e) => updateForm('productsServices', e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                                <Shield size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.policiesContact')}
                            </label>
                            <textarea
                                className="w-full bg-q-surface border border-q-border rounded-xl p-4 min-h-[250px] sm:min-h-[180px] md:min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder={t('aiAssistant.dashboard.placeholders.policiesContact')}
                                value={formData.policiesContact}
                                onChange={(e) => updateForm('policiesContact', e.target.value)}
                            />
                        </div>

                        {/* FAQs Section */}
                        <div className="pt-6 border-t border-q-border">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    {t('aiAssistant.dashboard.faqSection')}
                                </h3>
                            </div>
                            <FAQManager
                                faqs={formData.faqs}
                                onFAQsChange={(faqs) => updateForm('faqs', faqs)}
                            />
                        </div>

                        {/* Knowledge Documents Section */}
                        <div className="pt-6 border-t border-q-border">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    {t('aiAssistant.dashboard.knowledgeDocs')}
                                </h3>
                            </div>
                            <KnowledgeDocumentUploader
                                documents={formData.knowledgeDocuments || []}
                                onDocumentsChange={(docs) => updateForm('knowledgeDocuments', docs)}
                            />
                        </div>

                        {/* Knowledge Links Section */}
                        <div className="pt-6 border-t border-q-border">
                            <div className="flex items-center gap-2 mb-4">
                                <Link2Icon size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    {t('aiAssistant.knowledgeLinks.title')}
                                </h3>
                                {(formData.knowledgeLinks?.length || 0) > 0 && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                        {formData.knowledgeLinks?.filter(l => l.status === 'ready').length || 0} {t('aiAssistant.knowledgeLinks.ready')}
                                    </span>
                                )}
                            </div>
                            <KnowledgeLinksManager
                                links={formData.knowledgeLinks || []}
                                onLinksChange={(links) => updateForm('knowledgeLinks', links)}
                                projectId={activeProject?.id}
                            />
                        </div>

                        {/* CMS Articles Section */}
                        <div className="pt-6 border-t border-q-border">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Newspaper size={20} className="text-primary" />
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                        Artículos del CMS
                                    </h3>
                                    {formData.cmsArticleIds && formData.cmsArticleIds.length > 0 && (
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                            {formData.cmsArticleIds.length} seleccionado{formData.cmsArticleIds.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                {cmsPosts.length > 0 && (
                                    <button
                                        onClick={() => {
                                            const publishedIds = cmsPosts.filter(p => p.status === 'published').map(p => p.id);
                                            updateForm('cmsArticleIds', publishedIds);
                                        }}
                                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                                    >
                                        {t('aiAssistant.dashboard.selectPublishedArticles')}
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-q-text-muted mb-4">
                                {t('aiAssistant.dashboard.cmsArticlesDesc')}
                            </p>
                            {cmsPosts.length === 0 ? (
                                <div className="text-center py-8 bg-secondary/10 rounded-xl border border-dashed border-q-border">
                                    <Newspaper className="w-10 h-10 mx-auto text-q-text-muted/40 mb-3" />
                                    <p className="text-sm text-q-text-muted">{t('aiAssistant.dashboard.noCmsArticles')}</p>
                                    <p className="text-xs text-q-text-muted mt-1">{t('aiAssistant.dashboard.noCmsArticlesDesc')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                                    {cmsPosts.map(post => {
                                        const isSelected = formData.cmsArticleIds?.includes(post.id) ?? false;
                                        return (
                                            <button
                                                key={post.id}
                                                onClick={() => {
                                                    const current = formData.cmsArticleIds || [];
                                                    const updated = isSelected
                                                        ? current.filter(id => id !== post.id)
                                                        : [...current, post.id];
                                                    updateForm('cmsArticleIds', updated);
                                                }}
                                                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                                    ? 'bg-primary/5 border-primary/30 hover:bg-primary/10'
                                                    : 'bg-q-surface border-q-border/50 hover:border-primary/20 hover:bg-secondary/20'
                                                    }`}
                                            >
                                                {isSelected ? (
                                                    <CheckSquare size={18} className="text-primary mt-0.5 shrink-0" />
                                                ) : (
                                                    <Square size={18} className="text-q-text-muted mt-0.5 shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm text-foreground truncate">{post.title}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${post.status === 'published'
                                                            ? 'bg-q-success/10 text-q-success'
                                                            : 'bg-q-accent/10 text-q-accent'
                                                            }`}>
                                                            {post.status === 'published' ? t('aiAssistant.dashboard.published') : t('aiAssistant.dashboard.draft')}
                                                        </span>
                                                    </div>
                                                    {post.excerpt && (
                                                        <p className="text-xs text-q-text-muted mt-1 line-clamp-1">{post.excerpt}</p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'personality':
                return (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                    <Bot size={18} className="text-primary" />
                                    {t('aiAssistant.dashboard.assistantName')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.agentName}
                                    onChange={(e) => updateForm('agentName', e.target.value)}
                                    className="w-full bg-q-surface border border-q-border rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                    <Globe size={18} className="text-primary" />
                                    {t('aiAssistant.dashboard.languages')}
                                </label>
                                <div className="flex items-center bg-q-surface border border-q-border rounded-xl px-3">
                                    <Globe size={18} className="text-q-text-muted mr-2" />
                                    <input
                                        type="text"
                                        value={formData.languages}
                                        onChange={(e) => updateForm('languages', e.target.value)}
                                        className="w-full bg-transparent py-3 focus:outline-none"
                                        placeholder={t('aiAssistant.dashboard.languagesPlaceholder')}
                                    />
                                </div>
                                <p className="text-xs text-q-text-muted mt-2">{t('aiAssistant.dashboard.autoDetect')}</p>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
                                <MessageSquare size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.toneOfVoice')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Professional', 'Playful', 'Urgent', 'Luxury', 'Friendly', 'Minimalist'].map(tone => (
                                    <button
                                        key={tone}
                                        onClick={() => updateForm('tone', tone)}
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${formData.tone === tone
                                            ? 'border-[var(--quimera-status-accent-from)] bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text'
                                            : 'bg-q-surface border-q-border hover:border-q-border/80'
                                            }`}
                                    >
                                        {tone}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                <Sliders size={18} className="text-primary" />
                                {t('aiAssistant.dashboard.systemPrompt')}
                            </label>
                            <textarea
                                className="w-full bg-q-surface border border-q-border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono text-sm sm:text-xs"
                                style={{ minHeight: '400px' }}
                                rows={15}
                                value={formData.specialInstructions}
                                onChange={(e) => updateForm('specialInstructions', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'voice':
                return (
                    <div className="animate-fade-in-up">
                        <VoiceSettings formData={formData} updateForm={updateForm} />
                    </div>
                );

            case 'leadCapture':
                return (
                    <div className="animate-fade-in-up">
                        <LeadCaptureSettings />
                    </div>
                );

            case 'customization':
                return (
                    <div className="animate-fade-in-up">
                        <ChatCustomizationSettings />
                    </div>
                );

            case 'socialChannels':
                return (
                    <div className="animate-fade-in-up">
                        <SocialChannelsSettings
                            config={formData.socialChannels || {}}
                            projectId={activeProject?.id || ''}
                            onSave={async (socialConfig) => {
                                const newFormData = { ...formData, socialChannels: socialConfig };
                                setFormData(newFormData);
                                if (activeProject?.id) {
                                    await saveAiAssistantConfig(newFormData, activeProject.id);
                                }
                            }}
                        />
                    </div>
                );

            case 'socialInbox':
                return (
                    <div className="animate-fade-in-up h-full">
                        <SocialChatInbox
                            projectId={activeProject?.id || ''}
                            userId={user?.id}
                        />
                    </div>
                );

            case 'settings':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="quimera-dashboard-panel-card group p-5 sm:p-6">
                            <button
                                type="button"
                                onClick={() => updateForm('isActive', !formData.isActive)}
                                aria-pressed={Boolean(formData.isActive)}
                                className="w-full max-w-3xl flex flex-col gap-4 rounded-xl text-left transition-colors sm:flex-row sm:items-center sm:justify-between"
                            >
                                <span className="min-w-0">
                                    <span className="block font-bold text-lg text-foreground">{t('aiAssistant.dashboard.activateAssistant')}</span>
                                    <span className="block text-sm text-q-text-muted">{t('aiAssistant.dashboard.activateAssistantDesc')}</span>
                                </span>
                                <span className="inline-flex items-center gap-3 shrink-0">
                                    <span className={`text-xs font-semibold uppercase tracking-wide ${formData.isActive ? 'text-q-success' : 'text-q-text-muted'}`}>
                                        {formData.isActive ? t('aiAssistant.dashboard.enabled') : t('aiAssistant.dashboard.disabled')}
                                    </span>
                                    <span
                                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${formData.isActive
                                            ? 'border-[var(--quimera-status-accent-from)] bg-[var(--quimera-status-accent-from)]'
                                            : 'border-q-border bg-secondary'
                                            }`}
                                    >
                                        <span
                                            className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                                        />
                                    </span>
                                </span>
                            </button>
                        </div>
                    </div>
                );

            default: return null;
        }
    };
    const isFullWidthTab = activeTab === 'socialInbox' || activeTab === 'engine';

    return (
        <div className="flex h-screen bg-q-bg text-foreground overflow-hidden">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
 <header className="quimera-dashboard-header-bar h-14 px-2 sm:px-8 flex items-center justify-between z-20 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-border/40 rounded-lg transition-colors">
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <Bot className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-sm sm:text-lg font-semibold text-foreground">Chatbot</h1>
                            <span className="text-xs text-q-text-muted flex items-center min-w-0"><span className="w-1.5 h-1.5 bg-q-success rounded-full mr-1 flex-shrink-0"></span> <span className="truncate max-w-[100px] sm:max-w-[200px]">{activeProject.name}</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Toggle mobile nav - solo visible en móvil */}
                        <button
                            onClick={() => setIsMobileNavOpen(prev => !prev)}
                            className="md:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground transition-colors"
                            aria-label={isMobileNavOpen ? t('aiAssistant.dashboard.hideMenu') : t('aiAssistant.dashboard.showMenu')}
                            title={isMobileNavOpen ? t('aiAssistant.dashboard.hideMenu') : t('aiAssistant.dashboard.showMenu')}
                        >
                            {isMobileNavOpen ? <PanelTopClose size={18} /> : <PanelTopOpen size={18} />}
                        </button>
                        {canManageChatbotEngine && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 h-9 px-2 sm:px-3 rounded-lg text-sm font-medium transition-all text-q-text-muted hover:text-foreground hover:bg-secondary/50 disabled:text-q-success disabled:hover:bg-transparent"
                            >
                                <Save className="w-4 h-4" />
                                <span className="hidden sm:inline">{isSaving ? t('aiAssistant.dashboard.saving') : t('aiAssistant.dashboard.save')}</span>
                            </button>
                        )}
                        <HeaderBackButton onClick={() => setView('dashboard')} />
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

                    {/* LEFT: Configuration Area (Scrollable) - Full width when Inbox is active */}
                    <div className={`${isFullWidthTab ? 'lg:col-span-12' : 'lg:col-span-8 xl:col-span-6'} flex flex-col border-r border-q-border bg-q-bg overflow-hidden relative z-10`}>
                        <div className="flex flex-col md:flex-row h-full overflow-hidden">
                            {/* Desktop Sidebar (New) */}
                            <div className="hidden md:flex flex-col w-[240px] border-r border-q-border/50 bg-secondary/5 py-6 overflow-y-auto shrink-0">
                                <div className="px-4 mb-2">
                                    <h3 className="text-xs font-bold text-q-text-muted uppercase tracking-wider px-2 mb-2">{t('aiAssistant.dashboard.mainMenu')}</h3>
                                    <div className="space-y-1">
                                        {visibleTabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as Tab)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${activeTab === tab.id
                                                    ? 'bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text'
                                                    : 'text-q-text-muted hover:bg-secondary/50 hover:text-foreground'
                                                    }`}
                                            >
                                                <div className={`${activeTab === tab.id ? 'quimera-status-card-accent-text' : 'text-q-text-muted group-hover:text-[var(--quimera-status-accent-from)]'} transition-colors`}>
                                                    {tab.icon}
                                                </div>
                                                <span>{tab.label}</span>
                                                {activeTab === tab.id && (
                                                    <ChevronRight size={14} className="ml-auto opacity-50" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {!canManageChatbotEngine && (
                                        <div className="mt-4 rounded-lg border border-q-border/60 bg-q-surface/35 p-3">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                                <Shield size={14} className="text-q-text-muted" />
                                                {t('aiAssistant.dashboard.advancedControls')}
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-q-text-muted">
                                                {t('aiAssistant.dashboard.advancedControlsDesc')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Grid Nav (Visible < md) - colapsable desde header */}
                            {isMobileNavOpen && (
                                <div className="md:hidden w-full bg-q-bg z-20 border-b border-q-border px-2 py-2 shrink-0">
                                    <div className="grid grid-cols-3 gap-1">
                                        {visibleTabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    setActiveTab(tab.id as Tab);
                                                    setIsMobileNavOpen(false);
                                                }}
                                                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[10px] font-medium leading-tight transition-colors ${activeTab === tab.id
                                                    ? 'bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text'
                                                    : 'text-q-text-muted hover:text-foreground hover:bg-secondary/50'
                                                    }`}
                                            >
                                                {tab.icon}
                                                <span className="truncate w-full text-center px-0.5">{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Content Area */}
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative">
	                                <div className={`min-h-full ${activeTab === 'socialInbox' ? '' : 'p-4 sm:p-6 md:p-8 pb-24'}`}>
	                                    {renderTabContent()}
	                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Widget Preview Area (Fixed/Sticky Feel) - Hidden when Inbox is active */}
                    {!isFullWidthTab && (
                        <div className="hidden lg:flex lg:col-span-4 xl:col-span-6 flex-col bg-muted/30 relative items-center justify-center p-10 overflow-hidden">
                            {/* Dot pattern - visible in both themes */}
                            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#d5d5d5_1px,transparent_1px)] dark:bg-[radial-gradient(#404040_1px,transparent_1px)] [background-size:16px_16px]"></div>

                            <div className="relative z-10 flex flex-col items-center">
                                <h3 className="text-sm font-bold text-q-text-muted uppercase tracking-widest mb-8">{t('aiAssistant.dashboard.liveSimulator')}</h3>

                                {/* iPhone-style Phone Mockup */}
                                <div className="relative">
                                    {/* Phone Frame */}
                                    <div className="w-[320px] h-[650px] bg-gradient-to-b from-q-surface-overlay to-q-surface-overlay rounded-[50px] p-[10px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_30px_60px_-30px_rgba(0,0,0,0.6)] relative">
                                        {/* Inner bezel highlight */}
                                        <div className="absolute inset-[2px] rounded-[48px] bg-gradient-to-b from-q-surface-overlay via-q-surface-overlay to-q-surface-overlay pointer-events-none"></div>

                                        {/* Screen */}
                                        <div className="relative w-full h-full bg-q-surface rounded-[40px] overflow-hidden flex flex-col">
                                            {/* Dynamic Island */}
                                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-q-text rounded-full z-30 flex items-center justify-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-q-surface-overlay"></div>
                                                <div className="w-3 h-3 rounded-full bg-q-surface-overlay ring-1 ring-q-accent/25"></div>
                                            </div>

                                            {/* Status Bar */}
                                            <div className="h-12 px-6 flex items-end justify-between pb-1 text-[11px] font-semibold text-foreground z-20">
                                                <span>9:41</span>
                                                <div className="flex items-center gap-1">
                                                    {/* Signal */}
                                                    <div className="flex items-end gap-[2px] h-3">
                                                        <div className="w-[3px] h-[4px] bg-foreground rounded-sm"></div>
                                                        <div className="w-[3px] h-[6px] bg-foreground rounded-sm"></div>
                                                        <div className="w-[3px] h-[8px] bg-foreground rounded-sm"></div>
                                                        <div className="w-[3px] h-[10px] bg-foreground rounded-sm"></div>
                                                    </div>
                                                    {/* WiFi */}
                                                    <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4.9-2.1l1.4 1.4C9.4 18.1 10.6 18.5 12 18.5s2.6-.4 3.5-1.2l1.4-1.4c-1.3-1.2-3-1.9-4.9-1.9s-3.6.7-4.9 1.9zm-2.8-2.8l1.4 1.4c1.8-1.8 4.3-2.8 6.9-2.8s5.1 1 6.9 2.8l1.4-1.4C18.7 11 15.5 9.7 12 9.7s-6.7 1.3-8.7 3.4zm-2.8-2.8l1.4 1.4C5.3 9.3 8.5 7.7 12 7.7s6.7 1.6 9.1 4l1.4-1.4C19.8 7.5 16.1 5.7 12 5.7S4.2 7.5 1.5 10.3z" />
                                                    </svg>
                                                    {/* Battery */}
                                                    <div className="flex items-center gap-[2px]">
                                                        <div className="w-6 h-3 border border-foreground rounded-sm flex items-center p-[2px]">
                                                            <div className="w-full h-full bg-foreground rounded-[1px]"></div>
                                                        </div>
                                                        <div className="w-[2px] h-[5px] bg-foreground rounded-r-sm"></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Browser URL Bar */}
                                            <div className="px-3 pb-2">
                                                <div className="h-8 bg-muted/60 rounded-full flex items-center justify-center gap-2 px-3">
                                                    <div className="w-3 h-3 rounded-full bg-q-success"></div>
                                                    <span className="text-[10px] text-q-text-muted truncate">{activeProject.name.toLowerCase().replace(/\s+/g, '')}.com</span>
                                                </div>
                                            </div>

                                            {/* Website Content */}
                                            <div className="flex-1 overflow-hidden bg-q-bg">
                                                {/* Hero Section */}
                                                <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative overflow-hidden">
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center">
                                                                <span className="text-lg">🏪</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-foreground">{activeProject.name}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Content Skeleton */}
                                                <div className="p-4 space-y-4">
                                                    {/* Product Cards */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="bg-muted/50 rounded-xl p-2 space-y-2">
                                                            <div className="h-16 bg-secondary/60 rounded-lg"></div>
                                                            <div className="h-2 bg-secondary/60 rounded w-3/4"></div>
                                                            <div className="h-2 bg-secondary/60 rounded w-1/2"></div>
                                                        </div>
                                                        <div className="bg-muted/50 rounded-xl p-2 space-y-2">
                                                            <div className="h-16 bg-secondary/60 rounded-lg"></div>
                                                            <div className="h-2 bg-secondary/60 rounded w-3/4"></div>
                                                            <div className="h-2 bg-secondary/60 rounded w-1/2"></div>
                                                        </div>
                                                    </div>

                                                    {/* Text Skeleton */}
                                                    <div className="space-y-2">
                                                        <div className="h-2 bg-secondary/40 rounded w-full"></div>
                                                        <div className="h-2 bg-secondary/40 rounded w-5/6"></div>
                                                        <div className="h-2 bg-secondary/40 rounded w-4/6"></div>
                                                    </div>

                                                    {/* CTA Button Skeleton */}
                                                    <div className="h-10 bg-primary/20 rounded-full w-3/4 mx-auto"></div>
                                                </div>

                                                {/* The Real Chat Widget Simulator - Inside content area to respect bars */}
                                                <ChatSimulator config={formData} project={activeProject} />
                                            </div>

                                            {/* Home Indicator */}
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/30 rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Side buttons */}
                                    <div className="absolute left-[-2px] top-28 w-[3px] h-8 bg-q-surface-overlay rounded-l-sm"></div>
                                    <div className="absolute left-[-2px] top-44 w-[3px] h-14 bg-q-surface-overlay rounded-l-sm"></div>
                                    <div className="absolute left-[-2px] top-60 w-[3px] h-14 bg-q-surface-overlay rounded-l-sm"></div>
                                    <div className="absolute right-[-2px] top-36 w-[3px] h-20 bg-q-surface-overlay rounded-r-sm"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiAssistantDashboard;
