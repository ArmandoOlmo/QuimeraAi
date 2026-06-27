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
import PortalApprovalsPanel from './PortalApprovalsPanel';
import PortalReportsPanel from './PortalReportsPanel';
import { usePortalOperations, type PortalActivity } from '../../hooks/usePortalOperations';

function toDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    if (value && typeof value === 'object' && 'seconds' in value) {
        return new Date(Number((value as { seconds?: number }).seconds || 0) * 1000);
    }
    return new Date(0);
}

function getLeadStatusClass(status?: string) {
    switch (status) {
        case 'qualified':
        case 'won':
            return 'bg-q-success/10 text-q-success';
        case 'lost':
            return 'bg-q-error/10 text-q-error';
        case 'new':
        case 'contacted':
        case 'negotiation':
        default:
            return 'bg-q-accent/10 text-q-accent';
    }
}

function formatActivityDate(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
}

function activityTone(type: PortalActivity['type']) {
    if (type.includes('approval')) return 'text-q-accent bg-q-accent/10';
    if (type.includes('payment') || type.includes('billing')) return 'text-q-success bg-q-success/10';
    if (type.includes('transfer') || type.includes('project')) return 'text-primary bg-primary/10';
    if (type.includes('report')) return 'text-q-warning bg-q-warning/10';
    return 'text-q-text-muted bg-secondary';
}

const PortalDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { portalConfig, theme, tenant, hasFeature } = usePortal();
    const { navigate } = useRouter();

    // Load data from tenant
    const { projects, isLoading: loadingProjects } = useTenantProjects();
    const { leads, isLoading: loadingLeads } = useTenantLeads();
    const { posts, isLoading: loadingPosts } = useTenantPosts();
    const {
        recentActivities,
        summary: portalSummary,
        isLoading: loadingOperations,
        error: operationsError,
    } = usePortalOperations(tenant?.id);

    // Calculate stats
    const activeProjects = projects.filter(p => p.status !== 'Template').length;
    const totalLeads = leads.length;
    const recentLeads = leads.filter(l => {
        const createdAt = toDate(l.createdAt);
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
            value: portalSummary.totalVisits.toLocaleString(),
            subValue: portalSummary.latestReportAt
                ? t('portal.stats.fromLatestReport', 'From latest report')
                : undefined,
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
                <p className="text-q-text-muted">
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
                            className="bg-q-surface border border-q-border rounded-xl p-5 text-left hover:shadow-lg hover:border-primary/30 transition-all group"
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
                                    className="text-q-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                            <p className="text-2xl font-bold text-foreground mb-1">
                                {loadingProjects || loadingLeads || loadingPosts || loadingOperations ? (
                                    <span className="inline-block w-12 h-7 bg-muted rounded animate-pulse" />
                                ) : (
                                    stat.value
                                )}
                            </p>
                            <p className="text-sm text-q-text-muted">{stat.label}</p>
                            {stat.subValue && (
                                <p className="text-xs text-q-success mt-1 flex items-center gap-1">
                                    <TrendingUp size={12} />
                                    {stat.subValue}
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            <PortalApprovalsPanel />
            <PortalReportsPanel />

            {/* Quick actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent projects */}
                {hasFeature('projects') && (
                    <div className="bg-q-surface border border-q-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-q-border">
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
                                    <Globe size={32} className="mx-auto text-q-text-muted mb-2" />
                                    <p className="text-q-text-muted">
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
                                            <p className="text-xs text-q-text-muted">
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
                    <div className="bg-q-surface border border-q-border rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-q-border">
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
                                    <Users size={32} className="mx-auto text-q-text-muted mb-2" />
                                    <p className="text-q-text-muted">
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
                                        <div className="w-10 h-10 rounded-full bg-q-success/10 flex items-center justify-center text-q-success font-medium">
                                            {(lead.name || lead.email)?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate">
                                                {lead.name || lead.email}
                                            </p>
                                            <p className="text-xs text-q-text-muted truncate">
                                                {lead.email}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${getLeadStatusClass(lead.status)}`}>
                                            {lead.status || 'new'}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-q-surface border border-q-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={20} className="text-q-text-muted" />
                    <h2 className="font-semibold text-foreground">
                        {t('portal.recentActivity', 'Actividad Reciente')}
                    </h2>
                </div>
                {operationsError && (
                    <div className="mb-4 rounded-lg bg-q-error/10 px-4 py-3 text-sm text-q-error">
                        {t('portal.activity.error', 'Could not load recent activity.')}
                    </div>
                )}
                {loadingOperations ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                                    <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : recentActivities.length === 0 ? (
                    <div className="text-center py-8 text-q-text-muted">
                        <p>{t('portal.noActivity', 'No hay actividad reciente')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {recentActivities.map((item) => (
                            <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activityTone(item.type)}`}>
                                    <Activity size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="font-medium text-foreground truncate">
                                            {item.title}
                                        </p>
                                        <span className="shrink-0 text-xs text-q-text-muted">
                                            {formatActivityDate(item.createdAt)}
                                        </span>
                                    </div>
                                    {item.description && (
                                        <p className="mt-1 line-clamp-2 text-sm text-q-text-muted">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortalDashboard;


