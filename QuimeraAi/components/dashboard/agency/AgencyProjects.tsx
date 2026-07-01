/**
 * AgencyProjects
 * Shows all agency projects with transfer-to-client functionality
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FolderOpen,
    Send,
    Globe,
    Eye,
    Calendar,
    Search,
    FileText,
    CheckCircle2,
} from 'lucide-react';
import { useProject } from '../../../contexts/project';
import { Project } from '../../../types';
import { ProjectTransferModal } from './ProjectTransferModal';
import { SubdomainConfigModal } from './SubdomainConfigModal';
import { AgencySnapshotCenter } from './AgencySnapshotCenter';
import ProjectThumbnailFallback from '../ProjectThumbnailFallback';
import { getDynamicThumbnailUrl } from '../../../utils/thumbnailHelper';
import { CatalogFilterBar, ProjectStatusFilterChips, CatalogToolbarFooter } from '../filters';
import type { ProjectFilterStatus } from '../filters';
import { StatusBadge } from '../../ui/system';
import {
    AgencyCommandCenter,
    AgencyNextAction,
    AgencyPanel,
    AgencyReadinessPanel,
    AgencySectionHeader,
    AgencyStatCard,
} from './AgencyDesignSystem';

// ============================================================================
// COMPONENT
// ============================================================================

export function AgencyProjects() {
    const { t } = useTranslation();
    const { projects, isLoadingProjects, refreshProjects } = useProject();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<ProjectFilterStatus>('all');
    const [transferProject, setTransferProject] = useState<Project | null>(null);
    const [subdomainProject, setSubdomainProject] = useState<Project | null>(null);

    // Filter out templates, show only user projects
    const userProjects = projects.filter(p => p.status !== 'Template');

    const publishedCount = userProjects.filter(p => p.status === 'Published').length;
    const draftCount = userProjects.filter(p => p.status === 'Draft').length;

    // Apply search and status filters
    const filteredProjects = userProjects.filter(p => {
        const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const firstTransferableProject = filteredProjects[0] || userProjects[0] || null;
    const projectReadinessItems = [
        {
            label: t('agency.projectsReadinessCreated', 'Proyectos creados'),
            description: t('agency.projectsReadinessCreatedDesc', '{{count}} proyectos en la agencia', { count: userProjects.length }),
            complete: userProjects.length > 0,
            icon: FolderOpen,
        },
        {
            label: t('agency.projectsReadinessPublished', 'Publicación activa'),
            description: t('agency.projectsReadinessPublishedDesc', '{{count}} proyectos publicados', { count: publishedCount }),
            complete: publishedCount > 0,
            icon: Globe,
        },
        {
            label: t('agency.projectsReadinessDrafts', 'Borradores visibles'),
            description: t('agency.projectsReadinessDraftsDesc', '{{count}} borradores listos para revisión', { count: draftCount }),
            complete: draftCount > 0 || publishedCount > 0,
            icon: FileText,
        },
        {
            label: t('agency.projectsReadinessTransfer', 'Transferencia disponible'),
            description: firstTransferableProject
                ? firstTransferableProject.name
                : t('agency.projectsReadinessTransferDesc', 'Crea un proyecto para transferirlo'),
            complete: Boolean(firstTransferableProject),
            icon: Send,
            onClick: firstTransferableProject ? () => setTransferProject(firstTransferableProject) : undefined,
        },
    ];
    const projectReadinessScore = Math.round(
        (projectReadinessItems.filter((item) => item.complete).length / projectReadinessItems.length) * 100,
    );
    const projectNextAction = firstTransferableProject
        ? {
            label: t('agency.projectsNextTransfer', 'Transferir proyecto'),
            description: firstTransferableProject.name,
            icon: Send,
            tone: 'accent' as const,
            onClick: () => setTransferProject(firstTransferableProject),
        }
        : {
            label: t('agency.projectsNextResetFilters', 'Ver todos los proyectos'),
            description: t('agency.projectsNextResetFiltersDesc', 'Limpia filtros para revisar la operación completa.'),
            icon: Search,
            tone: 'warning' as const,
            onClick: () => {
                setSearchQuery('');
                setFilterStatus('all');
            },
        };

    return (
        <div className="space-y-6">
            {/* Header */}
            <AgencySectionHeader
                icon={FolderOpen}
                title={t('agency.projects', 'Proyectos')}
                subtitle={t('agency.projectsDesc', 'Gestiona y transfiere proyectos a tus clientes')}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <AgencyCommandCenter
                    icon={FolderOpen}
                    eyebrow={t('agency.projectsCommandCenter', 'Project transfer center')}
                    title={t('agency.projectsCommandTitle', 'Proyectos de agencia')}
                    subtitle={t('agency.projectsCommandSubtitle', 'Inventario de websites, publicaciones y transferencias listas para clientes.')}
                    metrics={[
                        {
                            label: t('agency.totalProjects', 'Total Proyectos'),
                            value: userProjects.length,
                            icon: FolderOpen,
                        },
                        {
                            label: t('agency.publishedProjects', 'Publicados'),
                            value: publishedCount,
                            icon: CheckCircle2,
                        },
                        {
                            label: t('agency.draftProjects', 'Borradores'),
                            value: draftCount,
                            icon: FileText,
                        },
                        {
                            label: t('agency.filteredProjects', 'Resultados'),
                            value: filteredProjects.length,
                            icon: Search,
                        },
                    ]}
                    action={
                        <AgencyNextAction
                            label={projectNextAction.label}
                            description={projectNextAction.description}
                            icon={projectNextAction.icon}
                            tone={projectNextAction.tone}
                            onClick={projectNextAction.onClick}
                        />
                    }
                />

                <AgencyReadinessPanel
                    title={t('agency.projectsReadinessTitle', 'Readiness de proyectos')}
                    subtitle={t('agency.projectsReadinessSubtitle', '{{ready}}/{{total}} señales listas', {
                        ready: projectReadinessItems.filter((item) => item.complete).length,
                        total: projectReadinessItems.length,
                    })}
                    score={projectReadinessScore}
                    items={projectReadinessItems}
                    tone={projectReadinessScore >= 80 ? 'success' : projectReadinessScore >= 50 ? 'warning' : 'danger'}
                />
            </div>

            {/* Search */}
            <AgencyPanel contentClassName="p-4">
                <div className="relative w-full sm:max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-q-text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('agency.searchProjects', 'Buscar proyectos...')}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-secondary/30 border border-q-border/50 rounded-xl text-foreground placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                    />
                </div>
            </AgencyPanel>

            <CatalogFilterBar
                filters={
                    <ProjectStatusFilterChips
                        value={filterStatus}
                        onChange={setFilterStatus}
                        totalCount={userProjects.length}
                        publishedCount={publishedCount}
                        draftCount={draftCount}
                    />
                }
                footer={
                    <CatalogToolbarFooter
                        count={filteredProjects.length}
                        total={userProjects.length}
                        countLabelDefault={`${filteredProjects.length} de ${userProjects.length}`}
                    />
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AgencyStatCard
                    icon={FolderOpen}
                    label={t('agency.totalProjects', 'Total Proyectos')}
                    value={userProjects.length}
                />
                <AgencyStatCard
                    icon={CheckCircle2}
                    label={t('agency.publishedProjects', 'Publicados')}
                    value={publishedCount}
                    tone="success"
                />
                <AgencyStatCard
                    icon={FileText}
                    label={t('agency.draftProjects', 'Borradores')}
                    value={draftCount}
                    tone="accent"
                />
            </div>

            <AgencySnapshotCenter
                projects={userProjects}
                onSnapshotApplied={refreshProjects}
            />

            {/* Projects Grid */}
            {isLoadingProjects ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredProjects.length === 0 ? (
                <AgencyPanel contentClassName="text-center py-16">
                    <FileText size={40} className="mx-auto mb-3 text-q-text-muted/50" />
                    <p className="text-q-text-muted font-medium">
                        {searchQuery || filterStatus !== 'all'
                            ? t('agency.noProjectsSearch', 'No hay proyectos que coincidan con tu búsqueda')
                            : t('agency.noProjectsYet', 'No tienes proyectos aún')
                        }
                    </p>
                    <p className="text-sm text-q-text-muted/70 mt-1">
                        {t('agency.createProjectHint', 'Crea un proyecto desde el panel principal para poder transferirlo')}
                    </p>
                </AgencyPanel>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map(project => {
                        const thumbnailUrl = getDynamicThumbnailUrl(project);

                        return (
                            <div
                                key={project.id}
                                className="quimera-dashboard-panel-card !p-0 group overflow-hidden hover:border-q-border hover:shadow-lg transition-all duration-200"
                            >
                            {/* Thumbnail */}
                            <div className="aspect-video w-full bg-secondary/50 relative overflow-hidden">
                                {thumbnailUrl ? (
                                    <img
                                        src={thumbnailUrl}
                                        alt={project.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <ProjectThumbnailFallback />
                                )}

                                {/* Status Badge */}
                                <div className="absolute top-2 right-2">
                                    <StatusBadge size="sm" variant={project.status === 'Published' ? 'success' : 'info'}>
                                        {project.status === 'Published' ? (
                                            <>
                                                <CheckCircle2 size={10} />
                                                Publicado
                                            </>
                                        ) : (
                                            <>
                                                <FileText size={10} />
                                                Borrador
                                            </>
                                        )}
                                    </StatusBadge>
                                </div>

                                {/* Transfer badge if already transferred */}
                                {(project as any).transferredFrom && (
                                    <div className="absolute top-2 left-2">
                                        <StatusBadge size="sm" variant="info">
                                            <Send size={10} />
                                            Transferido
                                        </StatusBadge>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-semibold text-foreground text-sm truncate mb-1">
                                    {project.name}
                                </h3>
                                <div className="flex items-center gap-4 text-xs text-q-text-muted mb-3">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {formatDate(project.lastUpdated)}
                                    </span>
                                    {project.pages && project.pages.length > 0 && (
                                        <span>
                                            {project.pages.length} {project.pages.length === 1 ? 'página' : 'páginas'}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            window.open(`/preview/${project.userId || ''}/${project.id}`, '_blank');
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-q-text-muted hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
                                    >
                                        <Eye size={14} />
                                        {t('common.preview', 'Vista Previa')}
                                    </button>
                                    <button
                                        onClick={() => setSubdomainProject(project)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-q-text-muted hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
                                    >
                                        <Globe size={14} />
                                        {t('agency.subdomain', 'Subdominio')}
                                    </button>
                                    <button
                                        onClick={() => setTransferProject(project)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                                    >
                                        <Send size={14} />
                                        {t('agency.transfer', 'Transferir')}
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Transfer Modal */}
            {transferProject && (
                <ProjectTransferModal
                    project={transferProject}
                    isOpen={!!transferProject}
                    onClose={() => setTransferProject(null)}
                    onTransferComplete={(newProjectId) => {
                        console.log('Transfer completed, new project ID:', newProjectId);
                        setTransferProject(null);
                    }}
                />
            )}
            {/* Subdomain Config Modal */}
            {subdomainProject && (
                <SubdomainConfigModal
                    project={subdomainProject}
                    isOpen={!!subdomainProject}
                    onClose={() => setSubdomainProject(null)}
                    onSubdomainSet={(sub) => {
                        console.log('Subdomain set:', sub, 'for project:', subdomainProject.id);
                        setSubdomainProject(null);
                    }}
                />
            )}
        </div>
    );
}
