/**
 * EmailDashboard
 * Dashboard principal para email marketing
 */

import React, { useState, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Mail,
    Send,
    Users,
    BarChart3,
    Settings,
    PlusCircle,
    Loader2,
    TrendingUp,
    Eye,
    MousePointer,
    AlertCircle,
    Menu,
} from 'lucide-react';
import { useEditor } from '../../../contexts/EditorContext';
import { useEmailSettings, useEmailLogs } from '../../../hooks/useEmailSettings';
import DashboardSidebar from '../DashboardSidebar';
import CampaignsView from './views/CampaignsView';
import AudiencesView from './views/AudiencesView';
import AnalyticsView from './views/AnalyticsView';

// Email Dashboard Context
interface EmailDashboardContextData {
    userId: string;
    projectId: string;
}

const EmailDashboardContext = createContext<EmailDashboardContextData>({
    userId: '',
    projectId: '',
});

export const useEmailDashboardContext = () => useContext(EmailDashboardContext);

type EmailView = 'overview' | 'campaigns' | 'audiences' | 'analytics';

interface EmailDashboardProps {
    projectId?: string;
}

const EmailDashboard: React.FC<EmailDashboardProps> = ({ projectId: propProjectId }) => {
    const { t } = useTranslation();
    const { user, activeProjectId } = useEditor();
    const userId = user?.uid || '';
    // Use prop projectId if provided, otherwise use activeProjectId from context, or fallback to 'default'
    const projectId = propProjectId || activeProjectId || 'default';

    const [activeView, setActiveView] = useState<EmailView>('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { settings, isLoading: settingsLoading } = useEmailSettings(userId, projectId);
    const { logs, stats, isLoading: logsLoading } = useEmailLogs(userId, projectId, { limit: 100 });

    const isLoading = settingsLoading || logsLoading;

    const navItems: { id: EmailView; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: t('email.overview', 'Vista General'), icon: Mail },
        { id: 'campaigns', label: t('email.campaigns', 'Campañas'), icon: Send },
        { id: 'audiences', label: t('email.audiences', 'Audiencias'), icon: Users },
        { id: 'analytics', label: t('email.analytics', 'Analíticas'), icon: BarChart3 },
    ];

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
                return <CampaignsView />;
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
        <EmailDashboardContext.Provider value={{ userId, projectId }}>
            <div className="flex h-screen bg-background text-foreground">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                    {/* Header */}
                    <header className="h-auto min-h-[56px] px-3 sm:px-6 py-2 sm:py-0 border-b border-border bg-background z-20 shrink-0">
                        <div className="flex items-center justify-between h-[52px] sm:h-14">
                            <div className="flex items-center gap-2 sm:gap-4">
                                <button 
                                    onClick={() => setIsMobileMenuOpen(true)} 
                                    className="lg:hidden h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-xl transition-colors touch-manipulation"
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <Mail className="text-primary w-4 h-4 sm:w-5 sm:h-5" />
                                        <h1 className="text-sm sm:text-lg font-semibold text-foreground">
                                            {t('email.dashboard', 'Email Marketing')}
                                        </h1>
                                    </div>
                                    {/* Navigation Tabs */}
                                    <div className="hidden sm:flex items-center bg-muted/50 p-0.5 sm:p-1 rounded-lg border border-border/50">
                                        {navItems.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = activeView === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActiveView(item.id)}
                                                    className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                                                        isActive 
                                                            ? 'bg-background text-foreground shadow-sm' 
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    <Icon size={12} />
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Stats - Hidden on mobile */}
                                <div className="hidden lg:flex items-center gap-6 mr-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('email.totalSent', 'Enviados')}</p>
                                        <p className="text-lg font-bold text-foreground">{stats.totalSent.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('email.openRate', 'Apertura')}</p>
                                        <p className="text-lg font-bold text-green-500">
                                            {stats.totalSent > 0 ? `${((stats.opened / stats.totalSent) * 100).toFixed(1)}%` : '0%'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveView('campaigns')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs sm:text-sm font-medium"
                                >
                                    <PlusCircle size={16} />
                                    <span className="hidden sm:inline">{t('email.newCampaign', 'Nueva Campaña')}</span>
                                    <span className="sm:hidden">Nueva</span>
                                </button>
                            </div>
                        </div>

                        {/* Mobile Navigation */}
                        <nav className="flex sm:hidden gap-1 pb-2 overflow-x-auto">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeView === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveView(item.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors text-xs ${
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground bg-muted/50'
                                        }`}
                                    >
                                        <Icon size={14} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </header>

                    {/* Content */}
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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
