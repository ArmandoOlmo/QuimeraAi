/**
 * EmailDashboard
 * Dashboard principal para email marketing
 * Con selector de proyecto igual al EcommerceDashboard
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Mail,
    Send,
    Users,
    BarChart3,
    PlusCircle,
    Loader2,
    Eye,
    MousePointer,
    AlertCircle,
    Menu,
    Layers,
    ChevronDown,
    Check,
    ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { useEmailSettings, useEmailLogs } from '../../../hooks/useEmailSettings';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import QuimeraLoader from '../../ui/QuimeraLoader';
import CampaignsView from './views/CampaignsView';
import AudiencesView from './views/AudiencesView';
import AnalyticsView from './views/AnalyticsView';
import EmailProjectSelectorPage from './EmailProjectSelectorPage';

// Email Dashboard Context
interface EmailDashboardContextData {
    userId: string;
    projectId: string;
    projectName: string;
}

const EmailDashboardContext = createContext<EmailDashboardContextData>({
    userId: '',
    projectId: '',
    projectName: '',
});

export const useEmailDashboardContext = () => useContext(EmailDashboardContext);

type EmailView = 'overview' | 'campaigns' | 'audiences' | 'analytics';

interface EmailDashboardProps {
    projectId?: string;
}

const EmailDashboard: React.FC<EmailDashboardProps> = ({ projectId: propProjectId }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { setView } = useUI();
    const { projects, activeProject, activeProjectId } = useProject();
    const userId = user?.uid || '';

    // State for selected project (similar to ecommerce)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [showAllProjects, setShowAllProjects] = useState(false);
    const [createCampaignTrigger, setCreateCampaignTrigger] = useState(0);
    // Removed complex state: const [autoOpenDraft, setAutoOpenDraft] = useState(false);

    // Determine effective project
    const effectiveProjectId = propProjectId || selectedProjectId || activeProjectId || '';
    const effectiveProject = projects.find(p => p.id === effectiveProjectId) || activeProject;
    const projectId = effectiveProjectId;

    const [activeView, setActiveView] = useState<EmailView>(() => {
        // Sync check for pending draft to set initial view
        if (typeof window !== 'undefined' && localStorage.getItem('pendingEmailDraft')) {
            console.log("EmailDashboard: Initializing with 'campaigns' view due to pending draft");
            return 'campaigns';
        }
        return 'overview';
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { settings, isLoading: settingsLoading } = useEmailSettings(userId, projectId);
    const { logs, stats, isLoading: logsLoading } = useEmailLogs(userId, projectId, { limit: 100 });

    // Sync selected project with active project (always sync when activeProjectId changes)
    useEffect(() => {
        if (activeProjectId) {
            setSelectedProjectId(activeProjectId);
        }
    }, [activeProjectId]);

    // Removed useEffect for view switching as it is handled in state initialization

    const isLoading = settingsLoading || logsLoading;
    const hasValidProject = Boolean(userId && projectId && projectId !== 'default');

    const navItems: { id: EmailView; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: t('email.overview', 'Vista General'), icon: Mail },
        { id: 'campaigns', label: t('email.campaigns', 'Campañas'), icon: Send },
        { id: 'audiences', label: t('email.audiences', 'Audiencias'), icon: Users },
        { id: 'analytics', label: t('email.analytics', 'Analíticas'), icon: BarChart3 },
    ];

    const handleProjectSelect = (projectId: string) => {
        setSelectedProjectId(projectId);
        setIsProjectSelectorOpen(false);
        localStorage.setItem('emailSelectedProjectId', projectId);
    };

    // Loading state
    if (!userId) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <QuimeraLoader size="md" />
                    <p className="text-muted-foreground">{t('common.loading', 'Cargando...')}</p>
                </div>
            </div>
        );
    }

    // No project selected or user wants to see all projects - show full project selector page
    if (!effectiveProjectId || projects.length === 0 || showAllProjects) {
        return (
            <EmailProjectSelectorPage
                onProjectSelect={(projectId) => {
                    handleProjectSelect(projectId);
                    setShowAllProjects(false);
                }}
                onBack={() => {
                    if (showAllProjects && effectiveProjectId) {
                        // If we were showing all projects but have a selected project, go back to it
                        setShowAllProjects(false);
                    } else {
                        setView('dashboard');
                    }
                }}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-screen bg-background text-foreground">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeView) {
            case 'campaigns':
                return <CampaignsView onCreateTrigger={createCampaignTrigger} />;
            case 'audiences':
                return <AudiencesView />;
            case 'analytics':
                return <AnalyticsView />;
            case 'overview':
            default:
                return <OverviewContent stats={stats} onNavigate={setActiveView} />;
        }
    };

    return (
        <EmailDashboardContext.Provider value={{ userId, projectId, projectName: effectiveProject?.name || '' }}>
            <div className="min-h-screen bg-background flex">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                <div className="flex-1 flex flex-col min-h-screen relative">
                    <DashboardWaveRibbons />
                    {/* Header - Simplified */}
                    <header className="h-14 px-4 sm:px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Mail className="text-primary w-5 h-5" />
                                <h1 className="text-lg font-semibold text-foreground">
                                    {t('email.dashboard', 'Email Marketing')}
                                </h1>
                            </div>

                            {/* Project Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Layers size={14} />
                                    <span className="max-w-[100px] sm:max-w-[200px] truncate">
                                        {effectiveProject?.name || t('email.selectProject', 'Seleccionar proyecto')}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown */}
                                {isProjectSelectorOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsProjectSelectorOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 py-2 max-h-96 overflow-auto">
                                            <div className="px-4 py-2 border-b border-border/50 mb-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    {t('email.quickSwitch', 'Cambio rápido')}
                                                </p>
                                            </div>

                                            {projects.filter(p => p.status !== 'Template').slice(0, 5).map((project) => (
                                                <button
                                                    key={project.id}
                                                    onClick={() => handleProjectSelect(project.id)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors ${project.id === effectiveProjectId ? 'bg-primary/10' : ''
                                                        }`}
                                                >
                                                    {project.thumbnailUrl ? (
                                                        <img
                                                            src={project.thumbnailUrl}
                                                            alt={project.name}
                                                            className="w-10 h-10 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                            <Layers size={16} className="text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 text-left min-w-0">
                                                        <span className="text-sm font-medium text-foreground truncate block">
                                                            {project.name}
                                                        </span>
                                                        <span className={`text-xs ${project.status === 'Published' ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                            {project.status === 'Published' ? t('dashboard.published', 'Publicado') : t('dashboard.draft', 'Borrador')}
                                                        </span>
                                                    </div>
                                                    {project.id === effectiveProjectId && (
                                                        <Check size={16} className="text-primary flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}

                                            <div className="border-t border-border/50 mt-2 pt-2 px-2">
                                                <button
                                                    onClick={() => {
                                                        setShowAllProjects(true);
                                                        setIsProjectSelectorOpen(false);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                >
                                                    <Layers size={16} />
                                                    {t('email.viewAllProjects', 'Ver todos los proyectos')}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Back Button Only */}
                        <button
                            onClick={() => setView('dashboard')}
                            className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </header>

                    {/* Sub-navigation */}
                    <div className="px-4 sm:px-6 border-b border-border bg-card/30">
                        <nav className="flex items-center justify-between py-2">
                            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeView === item.id;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveView(item.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                                }`}
                                        >
                                            <Icon size={18} />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Nueva Campaña button moved here */}
                            <button
                                onClick={() => {
                                    setActiveView('campaigns');
                                    setCreateCampaignTrigger(prev => prev + 1);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs sm:text-sm font-medium ml-4 flex-shrink-0"
                            >
                                <PlusCircle size={16} />
                                <span className="hidden sm:inline">{t('email.newCampaign', 'Nueva Campaña')}</span>
                                <span className="sm:hidden">{t('email.new', 'Nueva')}</span>
                            </button>
                        </nav>
                    </div>

                    {/* Content */}
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </EmailDashboardContext.Provider>
    );
};

// Overview Content Component
interface OverviewContentProps {
    stats: {
        totalSent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
    };
    onNavigate: (view: EmailView) => void;
}

const OverviewContent: React.FC<OverviewContentProps> = ({ stats, onNavigate }) => {
    const { t } = useTranslation();

    const statCards = [
        {
            label: t('email.totalSent', 'Emails Enviados'),
            value: stats.totalSent.toLocaleString(),
            icon: Send,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            label: t('email.delivered', 'Entregados'),
            value: stats.delivered.toLocaleString(),
            icon: Mail,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
        },
        {
            label: t('email.openRate', 'Tasa de Apertura'),
            value: stats.totalSent > 0 ? `${((stats.opened / stats.totalSent) * 100).toFixed(1)}%` : '0%',
            icon: Eye,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
        },
        {
            label: t('email.clickRate', 'Tasa de Clicks'),
            value: stats.opened > 0 ? `${((stats.clicked / stats.opened) * 100).toFixed(1)}%` : '0%',
            icon: MousePointer,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className="bg-card/50 border border-border rounded-xl p-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                    <Icon className={stat.color} size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Create Campaign Card */}
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        {t('email.createCampaign', 'Crear Nueva Campaña')}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        {t('email.createCampaignDesc', 'Envía newsletters, promociones o anuncios a tus suscriptores.')}
                    </p>
                    <button
                        onClick={() => onNavigate('campaigns')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <PlusCircle size={18} />
                        {t('email.startCampaign', 'Comenzar')}
                    </button>
                </div>

                {/* Audiences Card */}
                <div className="bg-card/50 border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        {t('email.manageAudiences', 'Gestionar Audiencias')}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        {t('email.manageAudiencesDesc', 'Crea segmentos para enviar emails más personalizados.')}
                    </p>
                    <button
                        onClick={() => onNavigate('audiences')}
                        className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                    >
                        <Users size={18} />
                        {t('email.viewAudiences', 'Ver Audiencias')}
                    </button>
                </div>
            </div>

            {/* Tips Section */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                        <AlertCircle className="text-amber-500" size={24} />
                    </div>
                    <div>
                        <h3 className="text-foreground font-semibold mb-1">
                            {t('email.tips', 'Consejos para mejores resultados')}
                        </h3>
                        <ul className="text-muted-foreground text-sm space-y-1">
                            <li>• {t('email.tip1', 'Personaliza el asunto con el nombre del destinatario')}</li>
                            <li>• {t('email.tip2', 'Envía en horarios óptimos (martes y jueves por la mañana)')}</li>
                            <li>• {t('email.tip3', 'Mantén un diseño limpio y un CTA claro')}</li>
                            <li>• {t('email.tip4', 'Segmenta tu audiencia para mayor relevancia')}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailDashboard;
