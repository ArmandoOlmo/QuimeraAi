
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
    Mic, Radio, BookOpen, ArrowLeft, Package, Shield, Phone, Facebook, Instagram, Inbox,
    TrendingUp, TrendingDown, Users, Zap, BarChart3, MessageCircle, RefreshCw, Search,
    ArrowUpRight, Loader2, Newspaper, CheckSquare, Square, Link2 as Link2Icon
} from 'lucide-react';
import ChatSimulator from './ChatSimulator';
import { AiAssistantConfig } from '../../../types';
import FAQManager from './FAQManager';
import KnowledgeDocumentUploader from './KnowledgeDocumentUploader';
import KnowledgeLinksManager from './KnowledgeLinksManager';
import LeadCaptureSettings from './LeadCaptureSettings';
import ChatCustomizationSettings from './ChatCustomizationSettings';
import SocialChannelsSettings from './SocialChannelsSettings';
import SocialChatInbox from './SocialChatInbox';
import { useProjectChatStats, ProjectChatStats } from '../../chat/hooks/useProjectChatStats';

type Tab = 'overview' | 'knowledge' | 'personality' | 'voice' | 'leadCapture' | 'customization' | 'socialChannels' | 'socialInbox' | 'settings';

const voices: { name: AiAssistantConfig['voiceName']; description: string; gender: string }[] = [
    { name: 'Zephyr', description: 'Calm, balanced, professional.', gender: 'Female' },
    { name: 'Puck', description: 'Energetic, friendly, youthful.', gender: 'Male' },
    { name: 'Charon', description: 'Deep, authoritative, trustworthy.', gender: 'Male' },
    { name: 'Kore', description: 'Warm, nurturing, soft.', gender: 'Female' },
    { name: 'Fenrir', description: 'Strong, clear, direct.', gender: 'Male' },
];

const AiAssistantDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { aiAssistantConfig, setAiAssistantConfig, saveAiAssistantConfig } = useAI();
    const editorContext = useSafeEditor();
    const { activeProject, projects, loadProject } = useProject();
    const { setView } = useUI();
    const { user } = useAuth();
    const { cmsPosts, loadCMSPosts } = useCMS();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [formData, setFormData] = useState<AiAssistantConfig>(aiAssistantConfig);
    const [isSaving, setIsSaving] = useState(false);
    const [voiceGenderFilter, setVoiceGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
    const isSavingRef = useRef(false);

    const tabs = useMemo(() => [
        { id: 'overview', label: t('aiAssistant.dashboard.tabs.overview'), icon: <Activity size={18} />, description: 'Resumen de rendimiento y estado' },
        { id: 'knowledge', label: t('aiAssistant.dashboard.tabs.knowledge'), icon: <Book size={18} />, description: 'Gestiona la base de conocimiento' },
        { id: 'personality', label: t('aiAssistant.dashboard.tabs.personality'), icon: <User size={18} />, description: 'Define la identidad del asistente' },
        { id: 'voice', label: t('aiAssistant.dashboard.tabs.voice'), icon: <Mic size={18} />, description: 'Configura la voz y respuestas' },
        { id: 'leadCapture', label: t('aiAssistant.dashboard.tabs.leadCapture'), icon: <Sparkles size={18} />, description: 'Estrategias de captación' },
        { id: 'customization', label: t('aiAssistant.dashboard.tabs.customization'), icon: <Sliders size={18} />, description: 'Apariencia del chat' },
        { id: 'socialChannels', label: 'Canales', icon: <Phone size={18} />, description: 'Conexiones externas' },
        { id: 'socialInbox', label: 'Bandeja', icon: <Inbox size={18} />, description: 'Mensajes y conversaciones' },
        { id: 'settings', label: t('aiAssistant.dashboard.tabs.settings'), icon: <Settings size={18} />, description: 'Configuración general' },
    ], [t]);

    // Load AI config from active project when it changes
    useEffect(() => {
        // Skip if we just saved — avoid overwriting formData with stale Firestore snapshot
        if (isSavingRef.current) return;

        if (activeProject?.aiAssistantConfig) {
            // Load config from project (from Firestore)
            setFormData(activeProject.aiAssistantConfig);
            setAiAssistantConfig(activeProject.aiAssistantConfig);
        } else if (aiAssistantConfig) {
            // Fallback to context config
            setFormData(aiAssistantConfig);
        }
    }, [activeProject?.id, activeProject?.aiAssistantConfig]);

    // Sync formData with context changes (for live preview from Customization tab)
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            appearance: aiAssistantConfig.appearance
        }));
    }, [aiAssistantConfig.appearance]);

    const handleSave = async () => {
        if (!activeProject?.id) return;
        setIsSaving(true);
        isSavingRef.current = true;
        try {
            await saveAiAssistantConfig(formData, activeProject.id);
            // Also sync to EditorContext so ChatbotWidget picks up changes immediately
            if (editorContext?.saveAiAssistantConfig) {
                await editorContext.saveAiAssistantConfig(formData);
            }
        } catch (error) {
            console.error('Error saving config:', error);
        }
        setIsSaving(false);
        // Keep the guard for a short time to let Firestore listener settle
        setTimeout(() => { isSavingRef.current = false; }, 2000);
    };

    const updateForm = (key: keyof AiAssistantConfig, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSelectProject = (projectId: string) => {
        loadProject(projectId, false, false);
    };

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
            case 'whatsapp': return <Phone size={12} className="text-green-400" />;
            case 'facebook': return <Facebook size={12} className="text-blue-500" />;
            case 'instagram': return <Instagram size={12} className="text-pink-500" />;
            default: return <Globe size={12} className="text-primary" />;
        }
    };

    if (!activeProject) {
        return (
            <div className="flex h-screen bg-background text-foreground">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                        <div className="flex items-center gap-1 sm:gap-4">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                                <Menu className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1 sm:gap-2">
                                <Bot className="text-primary w-5 h-5" />
                                <h1 className="text-lg font-semibold text-foreground hidden sm:block">{t('aiAssistant.dashboard.title')}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={refreshStats}
                                disabled={isLoadingStats}
                                className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                title="Actualizar estadísticas"
                            >
                                <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={() => setView('dashboard')}
                                className="flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3 rounded-lg sm:bg-secondary/50 sm:hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                                aria-label={t('common.back', 'Volver')}
                            >
                                <ArrowLeft size={16} />
                                <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/20">
                        <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">

                            {/* Global Stats Banner */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                                <BarChart3 className="text-primary" size={28} />
                                                Quimera Chat Analytics
                                            </h2>
                                            <p className="text-muted-foreground mt-1">
                                                Estadísticas en tiempo real de todos tus proyectos
                                            </p>
                                        </div>
                                        {isLoadingStats && (
                                            <Loader2 size={20} className="animate-spin text-primary" />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                                <MessageCircle size={14} />
                                                Chats Activos
                                            </div>
                                            <div className="text-3xl font-bold text-primary">
                                                {globalStats.totalActiveChats}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                En todos los proyectos
                                            </div>
                                        </div>

                                        <div className="bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                                <Zap size={14} />
                                                Mensajes (24h)
                                            </div>
                                            <div className="text-3xl font-bold text-amber-500">
                                                {globalStats.totalMessages24h}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Últimas 24 horas
                                            </div>
                                        </div>

                                        <div className="bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                                <Users size={14} />
                                                Leads Totales
                                            </div>
                                            <div className="text-3xl font-bold text-green-500">
                                                {globalStats.totalLeads}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Generados por chat
                                            </div>
                                        </div>

                                        <div className="bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                                <Clock size={14} />
                                                Tiempo Respuesta
                                            </div>
                                            <div className="text-3xl font-bold text-blue-500">
                                                {formatResponseTime(globalStats.avgResponseTime)}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Promedio global
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Search and Filter Bar */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Buscar proyecto..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {filteredProjects.length} proyecto{filteredProjects.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* Header */}
                            <div>
                                <h3 className="text-xl font-bold">{t('aiAssistant.dashboard.selectProject')}</h3>
                                <p className="text-muted-foreground mt-1">
                                    {t('aiAssistant.dashboard.selectProjectDesc')}
                                </p>
                            </div>

                            {/* Project Cards Grid */}
                            {sortedProjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {sortedProjects.map(project => {
                                        const projectStats = getStatsForProject(project.id);
                                        const hasActivity = projectStats && projectStats.activeConversations > 0;

                                        return (
                                            <button
                                                key={project.id}
                                                onClick={() => handleSelectProject(project.id)}
                                                className="group relative rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col text-left bg-card border border-border hover:border-primary/50"
                                            >
                                                {/* Activity Indicator */}
                                                {hasActivity && (
                                                    <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-500/30">
                                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                        <span className="text-xs font-semibold text-green-400">
                                                            {projectStats.activeConversations} activo{projectStats.activeConversations !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Thumbnail Section */}
                                                <div className="relative h-40 overflow-hidden">
                                                    <img
                                                        src={project.thumbnailUrl || 'https://placehold.co/600x400/1e293b/ffffff?text=Project'}
                                                        alt={project.name}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                                                </div>

                                                {/* Content Section */}
                                                <div className="p-5 space-y-4">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                                            {project.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                            <Clock size={14} />
                                                            <span>
                                                                {formatLastActivity(projectStats?.lastActivity || null)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Stats Row */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="text-center p-2 rounded-lg bg-secondary/50">
                                                            <div className="text-lg font-bold text-foreground">
                                                                {projectStats?.totalMessages || 0}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                                                Mensajes
                                                            </div>
                                                        </div>
                                                        <div className="text-center p-2 rounded-lg bg-secondary/50">
                                                            <div className="text-lg font-bold text-green-500">
                                                                {projectStats?.totalLeads || 0}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                                                Leads
                                                            </div>
                                                        </div>
                                                        <div className="text-center p-2 rounded-lg bg-secondary/50">
                                                            <div className="text-lg font-bold text-blue-500">
                                                                {formatResponseTime(projectStats?.avgResponseTime || 0)}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                                                Resp.
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Channels & Trend */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
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
                                                                <span className="text-xs text-muted-foreground">Sin canales</span>
                                                            )}
                                                        </div>

                                                        {/* Trend Indicator */}
                                                        {projectStats?.trend && projectStats.trend !== 'stable' && (
                                                            <div className={`flex items-center gap-1 text-xs font-medium ${projectStats.trend === 'up'
                                                                ? 'text-green-500'
                                                                : 'text-red-500'
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
                                                            className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : searchQuery ? (
                                <div className="text-center py-16 bg-card rounded-2xl border border-border">
                                    <Search className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                                    <h3 className="text-lg font-bold mb-2">Sin resultados</h3>
                                    <p className="text-sm text-muted-foreground">
                                        No se encontraron proyectos para "{searchQuery}"
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                                    <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                                    <h3 className="text-lg font-bold mb-2">{t('aiAssistant.dashboard.noProjects')}</h3>
                                    <p className="text-sm text-muted-foreground mb-6">{t('aiAssistant.dashboard.noProjectsDesc')}</p>
                                </div>
                            )}

                            {/* Quick Tips / Ideas Section */}
                            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-primary/5 to-transparent border border-border">
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Sparkles className="text-primary" size={20} />
                                    Ideas para mejorar tu Dashboard
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                                        <div className="text-primary mb-2">🎯</div>
                                        <h5 className="font-semibold text-sm mb-1">Objetivos Semanales</h5>
                                        <p className="text-xs text-muted-foreground">Define metas de leads y conversaciones por proyecto</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                                        <div className="text-primary mb-2">📊</div>
                                        <h5 className="font-semibold text-sm mb-1">Comparativas</h5>
                                        <p className="text-xs text-muted-foreground">Compara rendimiento entre proyectos lado a lado</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                                        <div className="text-primary mb-2">🔔</div>
                                        <h5 className="font-semibold text-sm mb-1">Alertas Inteligentes</h5>
                                        <p className="text-xs text-muted-foreground">Notificaciones cuando hay alta actividad</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                                        <div className="text-primary mb-2">🤖</div>
                                        <h5 className="font-semibold text-sm mb-1">AI Insights</h5>
                                        <p className="text-xs text-muted-foreground">Resumen semanal generado por IA de tendencias</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                                        <div className="text-primary mb-2">📈</div>
                                        <h5 className="font-semibold text-sm mb-1">Gráficas Avanzadas</h5>
                                        <p className="text-xs text-muted-foreground">Visualiza tendencias por hora del día</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                                        <div className="text-primary mb-2">🏆</div>
                                        <h5 className="font-semibold text-sm mb-1">Leaderboard</h5>
                                        <p className="text-xs text-muted-foreground">Ranking de proyectos con mejor engagement</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                const currentProjectStats = activeProject ? getStatsForProject(activeProject.id) : null;
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">{t('aiAssistant.dashboard.performanceOverview')}</h3>
                                <button
                                    onClick={refreshStats}
                                    disabled={isLoadingStats}
                                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                    title="Actualizar estadísticas"
                                >
                                    <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-primary">
                                        {currentProjectStats?.totalMessages || 0}
                                    </span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('aiAssistant.dashboard.chats')}</span>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-green-500">
                                        {currentProjectStats?.totalLeads || 0}
                                    </span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('aiAssistant.dashboard.leads')}</span>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-lg text-center">
                                    <span className="block text-2xl font-bold text-blue-500">
                                        {formatResponseTime(currentProjectStats?.avgResponseTime || 0)}
                                    </span>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('aiAssistant.dashboard.latency')}</span>
                                </div>
                            </div>
                        </div>


                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="font-bold text-lg mb-4">{t('aiAssistant.dashboard.configStatus')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Business Profile */}
                                <button
                                    onClick={() => setActiveTab('knowledge')}
                                    className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${formData.businessProfile ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm block group-hover:text-primary transition-colors">{t('aiAssistant.dashboard.businessProfile')}</span>
                                            <span className="text-xs text-muted-foreground">Información del negocio</span>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${formData.businessProfile ? 'bg-green-500' : 'bg-amber-500'}`} />
                                </button>

                                {/* Knowledge Base */}
                                <button
                                    onClick={() => setActiveTab('knowledge')}
                                    className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${(formData.faqs?.length > 0 || formData.knowledgeDocuments?.length > 0 || formData.knowledgeLinks?.length > 0 || (formData.cmsArticleIds?.length || 0) > 0) ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                            <BookOpen size={20} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm block group-hover:text-primary transition-colors">Base de Conocimiento</span>
                                            <span className="text-xs text-muted-foreground">{formData.faqs?.length || 0} FAQs, {formData.knowledgeDocuments?.length || 0} docs, {formData.knowledgeLinks?.length || 0} links, {formData.cmsArticleIds?.length || 0} artículos CMS</span>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${(formData.faqs?.length > 0 || formData.knowledgeDocuments?.length > 0 || formData.knowledgeLinks?.length > 0 || (formData.cmsArticleIds?.length || 0) > 0) ? 'bg-green-500' : 'bg-amber-500'}`} />
                                </button>

                                {/* Lead Capture */}
                                <button
                                    onClick={() => setActiveTab('leadCapture')}
                                    className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${formData.leadCaptureEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm block group-hover:text-primary transition-colors">Captura de Leads</span>
                                            <span className="text-xs text-muted-foreground">{formData.leadCaptureEnabled ? 'Activado' : 'Desactivado'}</span>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${formData.leadCaptureEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                                </button>

                                {/* Live Voice */}
                                <button
                                    onClick={() => setActiveTab('voice')}
                                    className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${formData.enableLiveVoice ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            <Mic size={20} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm block group-hover:text-primary transition-colors">{t('aiAssistant.dashboard.liveVoice')}</span>
                                            <span className="text-xs text-muted-foreground">{formData.enableLiveVoice ? 'Activado' : 'Desactivado'}</span>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${formData.enableLiveVoice ? 'bg-green-500' : 'bg-red-500'}`} />
                                </button>

                                {/* Chat Active */}
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${formData.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            <MessageSquare size={20} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm block group-hover:text-primary transition-colors">Estado del Chat</span>
                                            <span className="text-xs text-muted-foreground">{formData.isActive ? 'Online' : 'Offline'}</span>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${formData.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
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
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
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
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
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
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder={t('aiAssistant.dashboard.placeholders.policiesContact')}
                                value={formData.policiesContact}
                                onChange={(e) => updateForm('policiesContact', e.target.value)}
                            />
                        </div>

                        {/* FAQs Section */}
                        <div className="pt-6 border-t border-border">
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
                        <div className="pt-6 border-t border-border">
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
                        <div className="pt-6 border-t border-border">
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
                        <div className="pt-6 border-t border-border">
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
                                        Seleccionar todos los publicados
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Selecciona los artículos del blog que el chatbot podrá consultar para responder preguntas.
                            </p>
                            {cmsPosts.length === 0 ? (
                                <div className="text-center py-8 bg-secondary/10 rounded-xl border border-dashed border-border">
                                    <Newspaper className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                                    <p className="text-sm text-muted-foreground">No hay artículos en el CMS de este proyecto.</p>
                                    <p className="text-xs text-muted-foreground mt-1">Crea artículos en el CMS y aparecerán aquí automáticamente.</p>
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
                                                    : 'bg-card border-border/50 hover:border-primary/20 hover:bg-secondary/20'
                                                    }`}
                                            >
                                                {isSelected ? (
                                                    <CheckSquare size={18} className="text-primary mt-0.5 shrink-0" />
                                                ) : (
                                                    <Square size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm text-foreground truncate">{post.title}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${post.status === 'published'
                                                            ? 'bg-green-500/10 text-green-500'
                                                            : 'bg-amber-500/10 text-amber-500'
                                                            }`}>
                                                            {post.status === 'published' ? 'Publicado' : 'Borrador'}
                                                        </span>
                                                    </div>
                                                    {post.excerpt && (
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.excerpt}</p>
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
                                    className="w-full bg-card border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                    <Globe size={18} className="text-primary" />
                                    {t('aiAssistant.dashboard.languages')}
                                </label>
                                <div className="flex items-center bg-card border border-border rounded-xl px-3">
                                    <Globe size={18} className="text-muted-foreground mr-2" />
                                    <input
                                        type="text"
                                        value={formData.languages}
                                        onChange={(e) => updateForm('languages', e.target.value)}
                                        className="w-full bg-transparent py-3 focus:outline-none"
                                        placeholder={t('aiAssistant.dashboard.languagesPlaceholder')}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">{t('aiAssistant.dashboard.autoDetect')}</p>
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
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${formData.tone === tone ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
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
                                className="w-full bg-card border border-border rounded-xl p-4 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono text-xs"
                                value={formData.specialInstructions}
                                onChange={(e) => updateForm('specialInstructions', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'voice':
                const filteredVoices = voiceGenderFilter === 'all'
                    ? voices
                    : voices.filter(v => v.gender === voiceGenderFilter);

                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg flex items-center"><Mic className="mr-2 text-primary" /> {t('aiAssistant.dashboard.enableLiveVoice')}</h3>
                                <p className="text-sm text-muted-foreground">{t('aiAssistant.dashboard.enableLiveVoiceDesc')}</p>
                            </div>
                            <button
                                onClick={() => updateForm('enableLiveVoice', !formData.enableLiveVoice)}
                                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.enableLiveVoice ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.enableLiveVoice ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="bg-card border border-border p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-sm font-bold text-foreground flex items-center"><Radio className="mr-2 text-primary" /> {t('aiAssistant.dashboard.selectVoice')}</label>

                                {/* Gender Filter */}
                                <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg">
                                    {(['all', 'Male', 'Female'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setVoiceGenderFilter(filter)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${voiceGenderFilter === filter
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                                }`}
                                        >
                                            {filter === 'all' ? 'Todos' : filter === 'Male' ? '♂ Masculino' : '♀ Femenino'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredVoices.map(v => (
                                    <button
                                        key={v.name}
                                        onClick={() => updateForm('voiceName', v.name)}
                                        className={`p-4 rounded-xl border text-left transition-all hover:shadow-md flex items-center ${formData.voiceName === v.name ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-secondary/10 hover:border-primary/50'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${formData.voiceName === v.name ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                            {v.gender === 'Male' ? '♂' : '♀'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">{v.name}</h4>
                                            <p className="text-xs text-muted-foreground">{v.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {filteredVoices.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">No hay voces disponibles con este filtro</p>
                                </div>
                            )}
                        </div>
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
                            userId={user?.uid}
                        />
                    </div>
                );

            case 'settings':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">{t('aiAssistant.dashboard.activateAssistant')}</h3>
                                <p className="text-sm text-muted-foreground">{t('aiAssistant.dashboard.activateAssistantDesc')}</p>
                            </div>
                            <button
                                onClick={() => updateForm('isActive', !formData.isActive)}
                                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 px-2 sm:px-8 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <h1 className="text-lg font-semibold text-foreground hidden sm:block">{t('aiAssistant.dashboard.title')}</h1>
                            <span className="text-xs text-muted-foreground flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span> <span className="truncate max-w-[100px] sm:max-w-[200px]">{activeProject.name}</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 h-9 px-2 sm:px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 disabled:text-green-500 disabled:hover:bg-transparent"
                        >
                            {isSaving ? (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('aiAssistant.dashboard.saving')}</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('aiAssistant.dashboard.save')}</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setView('dashboard')}
                            className="flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3 rounded-lg sm:bg-secondary/50 sm:hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

                    {/* LEFT: Configuration Area (Scrollable) - Full width when Inbox is active */}
                    <div className={`${activeTab === 'socialInbox' ? 'lg:col-span-12' : 'lg:col-span-8 xl:col-span-6'} flex flex-col border-r border-border bg-background overflow-hidden relative z-10 shadow-lg`}>
                        <div className="flex h-full overflow-hidden">
                            {/* Desktop Sidebar (New) */}
                            <div className="hidden md:flex flex-col w-[240px] border-r border-border/50 bg-secondary/5 py-6 overflow-y-auto shrink-0">
                                <div className="px-4 mb-2">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">Menú Principal</h3>
                                    <div className="space-y-1">
                                        {tabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as Tab)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${activeTab === tab.id
                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                                    }`}
                                            >
                                                <div className={`${activeTab === tab.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'} transition-colors`}>
                                                    {tab.icon}
                                                </div>
                                                <span>{tab.label}</span>
                                                {activeTab === tab.id && (
                                                    <ChevronRight size={14} className="ml-auto opacity-50" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Horizontal Nav (Visible < md) */}
                            <div className="md:hidden w-full absolute top-0 left-0 bg-background z-20 border-b border-border overflow-x-auto whitespace-nowrap px-4 py-3 flex gap-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as Tab)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${activeTab === tab.id
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-card text-muted-foreground border-border'
                                            }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                                <div className={`min-h-full ${activeTab === 'socialInbox' ? '' : 'p-6 md:p-8 pt-16 md:pt-8 pb-24'}`}>
                                    {renderTabContent()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Widget Preview Area (Fixed/Sticky Feel) - Hidden when Inbox is active */}
                    {activeTab !== 'socialInbox' && (
                        <div className="hidden lg:flex lg:col-span-4 xl:col-span-6 flex-col bg-muted/30 relative items-center justify-center p-10 overflow-hidden">
                            {/* Dot pattern - visible in both themes */}
                            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#d5d5d5_1px,transparent_1px)] dark:bg-[radial-gradient(#404040_1px,transparent_1px)] [background-size:16px_16px]"></div>

                            <div className="relative z-10 flex flex-col items-center">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">{t('aiAssistant.dashboard.liveSimulator')}</h3>

                                {/* iPhone-style Phone Mockup */}
                                <div className="relative">
                                    {/* Phone Frame */}
                                    <div className="w-[320px] h-[650px] bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[50px] p-[10px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_30px_60px_-30px_rgba(0,0,0,0.6)] relative">
                                        {/* Inner bezel highlight */}
                                        <div className="absolute inset-[2px] rounded-[48px] bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 pointer-events-none"></div>

                                        {/* Screen */}
                                        <div className="relative w-full h-full bg-card rounded-[40px] overflow-hidden flex flex-col">
                                            {/* Dynamic Island */}
                                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-30 flex items-center justify-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                                                <div className="w-3 h-3 rounded-full bg-zinc-800 ring-1 ring-zinc-700"></div>
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
                                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                    <span className="text-[10px] text-muted-foreground truncate">{activeProject.name.toLowerCase().replace(/\s+/g, '')}.com</span>
                                                </div>
                                            </div>

                                            {/* Website Content */}
                                            <div className="flex-1 overflow-hidden bg-background">
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
                                    <div className="absolute left-[-2px] top-28 w-[3px] h-8 bg-zinc-700 rounded-l-sm"></div>
                                    <div className="absolute left-[-2px] top-44 w-[3px] h-14 bg-zinc-700 rounded-l-sm"></div>
                                    <div className="absolute left-[-2px] top-60 w-[3px] h-14 bg-zinc-700 rounded-l-sm"></div>
                                    <div className="absolute right-[-2px] top-36 w-[3px] h-20 bg-zinc-700 rounded-r-sm"></div>
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
