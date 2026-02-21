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

// ============================================================================
// COMPONENT
// ============================================================================

export function AgencyProjects() {
    const { t } = useTranslation();
    const { projects, isLoadingProjects } = useProject();

    const [searchQuery, setSearchQuery] = useState('');
    const [transferProject, setTransferProject] = useState<Project | null>(null);

    // Filter out templates, show only user projects
    const userProjects = projects.filter(p => p.status !== 'Template');

    // Apply search filter
    const filteredProjects = searchQuery
        ? userProjects.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : userProjects;

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

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <FolderOpen size={24} className="text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('agency.projects', 'Proyectos')}
                    </h2>
                </div>
                <p className="text-muted-foreground">
                    {t('agency.projectsDesc', 'Gestiona y transfiere proyectos a tus clientes')}
                </p>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('agency.searchProjects', 'Buscar proyectos...')}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-secondary/30 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <p className="text-2xl font-bold text-foreground">{userProjects.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('agency.totalProjects', 'Total Proyectos')}
                    </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <p className="text-2xl font-bold text-emerald-400">
                        {userProjects.filter(p => p.status === 'Published').length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('agency.publishedProjects', 'Publicados')}
                    </p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <p className="text-2xl font-bold text-amber-400">
                        {userProjects.filter(p => p.status === 'Draft').length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('agency.draftProjects', 'Borradores')}
                    </p>
                </div>
            </div>

            {/* Projects Grid */}
            {isLoadingProjects ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-16">
                    <FileText size={40} className="mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">
                        {searchQuery
                            ? t('agency.noProjectsSearch', 'No hay proyectos que coincidan con tu búsqueda')
                            : t('agency.noProjectsYet', 'No tienes proyectos aún')
                        }
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                        {t('agency.createProjectHint', 'Crea un proyecto desde el panel principal para poder transferirlo')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map(project => (
                        <div
                            key={project.id}
                            className="group rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-lg transition-all duration-200 overflow-hidden"
                        >
                            {/* Thumbnail */}
                            <div className="aspect-video w-full bg-secondary/50 relative overflow-hidden">
                                {project.thumbnailUrl ? (
                                    <img
                                        src={project.thumbnailUrl}
                                        alt={project.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Globe size={32} className="text-muted-foreground/30" />
                                    </div>
                                )}

                                {/* Status Badge */}
                                <div className="absolute top-2 right-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${project.status === 'Published'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        }`}>
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
                                    </span>
                                </div>

                                {/* Transfer badge if already transferred */}
                                {(project as any).transferredFrom && (
                                    <div className="absolute top-2 left-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                            <Send size={10} />
                                            Transferido
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-semibold text-foreground text-sm truncate mb-1">
                                    {project.name}
                                </h3>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
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
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
                                    >
                                        <Eye size={14} />
                                        {t('common.preview', 'Vista Previa')}
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
                    ))}
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
        </div>
    );
}
