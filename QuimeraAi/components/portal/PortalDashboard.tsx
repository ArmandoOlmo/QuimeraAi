/**
 * PortalDashboard
 * Main dashboard view for white-label client portals
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePortal } from './PortalContext';
import { useTenantProjects, useTenantLeads, useTenantPosts } from '../../hooks/useTenantData';
import {
    Globe,
    Users,
    FileText,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Plus,
    Activity,
    Eye,
} from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';

const PortalDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { portalConfig, theme, hasFeature } = usePortal();
    const { navigate } = useRouter();
    
    // Load data from tenant
    const { projects, isLoading: loadingProjects } = useTenantProjects();
    const { leads, isLoading: loadingLeads } = useTenantLeads();
    const { posts, isLoading: loadingPosts } = useTenantPosts();

    // Calculate stats
    const activeProjects = projects.filter(p => p.status === 'active' || !p.status).length;
    const totalLeads = leads.length;
    const recentLeads = leads.filter(l => {
        const createdAt = l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : new Date(l.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt > weekAgo;
    }).length;
    const publishedPosts = posts.filter(p => p.status === 'published').length;

    const stats = [
        {
            id: 'projects',
            label: t('portal.stats.projects', 'Proyectos Activos'),
            value: activeProjects,
            icon: Globe,
            color: theme.primaryColor,
            change: null,
            feature: 'projects' as const,
            path: '/portal/projects',
        },
        {
            id: 'leads',
            label: t('portal.stats.leads', 'Total Leads'),
            value: totalLeads,
            subValue: `+${recentLeads} esta semana`,
            icon: Users,
            color: '#10b981',
            change: recentLeads > 0 ? 'up' : null,
            feature: 'leads' as const,
            path: '/portal/leads',
        },
        {
            id: 'posts',
            label: t('portal.stats.posts', 'Posts Publicados'),
            value: publishedPosts,
            icon: FileText,
            color: '#8b5cf6',
            change: null,
            feature: 'cms' as const,
            path: '/portal/cms',
        },
        {
            id: 'views',
            label: t('portal.stats.views', 'Visitas'),
            value: '-', // TODO: Implement analytics
            icon: Eye,
            color: '#f59e0b',
            change: null,
            feature: 'analytics' as const,
            path: '/portal/analytics',
        },
    ];

    const visibleStats = stats.filter(s => !s.feature || hasFeature(s.feature));

    return (
        <div className="space-y-6">
            {/* Welcome header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 lg:p-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                    {t('portal.welcome', 'Bienvenido a')} {portalConfig?.branding.companyName || portalConfig?.tenant.name}
                </h1>
                <p className="text-muted-foreground">
                    {t('portal.welcomeSubtitle', 'Aquí tienes un resumen de tu workspace')}
                </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {visibleStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <button
                            key={stat.id}
                            onClick={() => navigate(stat.path)}
                            className="bg-card border border-border rounded-xl p-5 text-left hover:shadow-lg hover:border-primary/30 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${stat.color}20` }}
                                >
                                    <Icon size={20} style={{ color: stat.color }} />
                                </div>
                                <ArrowUpRight 
                                    size={16} 
                                    className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" 
                                />
                            </div>
                            <p className="text-2xl font-bold text-foreground mb-1">
                                {loadingProjects || loadingLeads || loadingPosts ? (
                                    <span className="inline-block w-12 h-7 bg-muted rounded animate-pulse" />
                                ) : (
                                    stat.value
                                )}
                            </p>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                            {stat.subValue && (
                                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                    <TrendingUp size={12} />
                                    {stat.subValue}
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent projects */}
                {hasFeature('projects') && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="font-semibold text-foreground">
                                {t('portal.recentProjects', 'Proyectos Recientes')}
                            </h2>
                            <button
                                onClick={() => navigate('/portal/projects/new')}
                                className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
                                style={{ color: theme.primaryColor }}
                            >
                                <Plus size={16} />
                                {t('common.new', 'Nuevo')}
                            </button>
                        </div>
                        <div className="divide-y divide-border">
                            {loadingProjects ? (
                                <div className="p-4 space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                                                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Globe size={32} className="mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">
                                        {t('portal.noProjects', 'No hay proyectos aún')}
                                    </p>
                                    <button
                                        onClick={() => navigate('/portal/projects/new')}
                                        className="mt-3 text-sm font-medium"
                                        style={{ color: theme.primaryColor }}
                                    >
                                        {t('portal.createFirst', 'Crear tu primer proyecto')}
                                    </button>
                                </div>
                            ) : (
                                projects.slice(0, 5).map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => navigate(`/portal/projects/${project.id}`)}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Globe size={18} style={{ color: theme.primaryColor }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate">
                                                {project.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {project.pages?.length || 0} páginas
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Recent leads */}
                {hasFeature('leads') && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="font-semibold text-foreground">
                                {t('portal.recentLeads', 'Leads Recientes')}
                            </h2>
                            <button
                                onClick={() => navigate('/portal/leads')}
                                className="text-sm font-medium hover:underline"
                                style={{ color: theme.primaryColor }}
                            >
                                {t('common.viewAll', 'Ver todos')}
                            </button>
                        </div>
                        <div className="divide-y divide-border">
                            {loadingLeads ? (
                                <div className="p-4 space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                                                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : leads.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Users size={32} className="mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">
                                        {t('portal.noLeads', 'No hay leads aún')}
                                    </p>
                                </div>
                            ) : (
                                leads.slice(0, 5).map(lead => (
                                    <button
                                        key={lead.id}
                                        onClick={() => navigate(`/portal/leads/${lead.id}`)}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-medium">
                                            {(lead.name || lead.email)?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate">
                                                {lead.name || lead.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {lead.email}
                                            </p>
                                        </div>
                                        <span className={`
                                            px-2 py-0.5 text-xs rounded-full
                                            ${lead.status === 'new' ? 'bg-blue-500/10 text-blue-500' : ''}
                                            ${lead.status === 'contacted' ? 'bg-yellow-500/10 text-yellow-500' : ''}
                                            ${lead.status === 'qualified' ? 'bg-green-500/10 text-green-500' : ''}
                                            ${lead.status === 'converted' ? 'bg-purple-500/10 text-purple-500' : ''}
                                        `}>
                                            {lead.status || 'new'}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Activity feed placeholder */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={20} className="text-muted-foreground" />
                    <h2 className="font-semibold text-foreground">
                        {t('portal.recentActivity', 'Actividad Reciente')}
                    </h2>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                    <p>{t('portal.noActivity', 'No hay actividad reciente')}</p>
                </div>
            </div>
        </div>
    );
};

export default PortalDashboard;






