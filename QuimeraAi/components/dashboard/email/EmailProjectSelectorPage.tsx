/**
 * EmailProjectSelectorPage
 * Página completa para seleccionar un proyecto para email marketing
 * Diseño basado en el ProjectSelectorPage de ecommerce
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Mail,
    Search,
    Layers,
    ChevronRight,
    Globe,
    FileEdit,
    Clock,
    Plus,
    LayoutGrid,
    List,
    Sparkles,
    Menu,
    X,
} from 'lucide-react';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { Project } from '../../../types/components';
import DashboardSidebar from '../DashboardSidebar';
import QuimeraLoader from '../../ui/QuimeraLoader';
import MobileSearchModal from '../../ui/MobileSearchModal';
import HeaderBackButton from '../../ui/HeaderBackButton';
import ProjectThumbnailFallback from '../ProjectThumbnailFallback';
import { getDynamicThumbnailUrl } from '../../../utils/thumbnailHelper';
import { WebsiteCatalogToolbar } from '../filters';
import { useProjectCatalogFilters } from '../../../hooks/useProjectCatalogFilters';

interface EmailProjectSelectorPageProps {
    onProjectSelect: (projectId: string) => void;
    onBack?: () => void;
}

const EmailProjectSelectorPage: React.FC<EmailProjectSelectorPageProps> = ({
    onProjectSelect,
    onBack,
}) => {
    const { t } = useTranslation();
    const { setIsOnboardingOpen } = useUI();
    const { projects, isLoadingProjects } = useProject();

    const {
        searchQuery,
        setSearchQuery,
        filterStatus,
        setFilterStatus,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        viewMode,
        setViewMode,
        userProjects,
        filteredProjects,
        publishedCount,
        draftCount,
    } = useProjectCatalogFilters(projects);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="flex h-full min-h-0 overflow-hidden bg-q-bg">
            {/* Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {/* Header */}
 <header className="quimera-dashboard-header-bar h-14 w-full shrink-0 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
                    {/* Left: Menu & Title */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            aria-label={t('common.openMenu', 'Abrir menú')}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Mail className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-lg font-semibold text-foreground">
                                {t('email.dashboard', 'Email Marketing')}
                            </h1>
                        </div>
                    </div>

                    {/* Right: Search */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="text-q-text-muted hover:text-foreground transition-colors"
                            aria-label={t('common.search', 'Buscar')}
                        >
                            <Search size={20} />
                        </button>
                        {onBack && <HeaderBackButton onClick={onBack} />}
                    </div>
                </header>

                {/* Search Modal */}
                <MobileSearchModal
                    isOpen={isSearchOpen}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onClose={() => setIsSearchOpen(false)}
                    placeholder={t('email.searchProjects', 'Buscar proyectos...')}
                />

                {/* Main Content */}
                <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        {/* Hero Section */}
                        <div className="mb-8">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                        {t('email.yourProjects', 'Tus Proyectos')}
                                    </h2>
                                    <p className="text-q-text-muted">
                                        {t('email.selectProjectDescription', 'Cada proyecto puede tener sus propias campañas de email marketing. Selecciona uno para comenzar.')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsOnboardingOpen(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
                                >
                                    <Sparkles size={18} />
                                    {t('dashboard.newProject', 'Nuevo Proyecto')}
                                </button>
                            </div>

                            {/* Stats Bar */}
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                <div className="bg-q-surface/50 rounded-xl p-3 sm:p-4 border border-q-border hover:border-primary/30 transition-colors">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20">
                                            <Layers className="text-primary" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xl sm:text-2xl font-bold text-foreground">{userProjects.length}</p>
                                            <p className="text-[10px] sm:text-xs text-q-text-muted">{t('dashboard.totalProjects', 'Total')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-q-surface/50 rounded-xl p-3 sm:p-4 border border-q-border hover:border-green-500/30 transition-colors">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
                                            <Globe className="text-green-500" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xl sm:text-2xl font-bold text-foreground">{publishedCount}</p>
                                            <p className="text-[10px] sm:text-xs text-q-text-muted">{t('dashboard.published', 'Publicados')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-q-surface/50 rounded-xl p-3 sm:p-4 border border-q-border hover:border-slate-500/30 transition-colors">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-slate-500/20">
                                            <FileEdit className="text-slate-400" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xl sm:text-2xl font-bold text-foreground">{draftCount}</p>
                                            <p className="text-[10px] sm:text-xs text-q-text-muted">{t('dashboard.draft', 'Borradores')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <WebsiteCatalogToolbar
                            filterStatus={filterStatus}
                            onFilterStatusChange={setFilterStatus}
                            totalCount={userProjects.length}
                            publishedCount={publishedCount}
                            draftCount={draftCount}
                            filteredCount={filteredProjects.length}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSortByChange={setSortBy}
                            onSortOrderChange={setSortOrder}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />

                        {/* Projects Grid/List */}
                        {isLoadingProjects ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <QuimeraLoader size="md" />
                                    <p className="text-q-text-muted">{t('common.loading', 'Cargando...')}</p>
                                </div>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-6">
                                    {searchQuery ? (
                                        <Search className="text-q-text-muted" size={48} />
                                    ) : (
                                        <Mail className="text-q-text-muted" size={48} />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    {searchQuery
                                        ? t('email.noProjectsFound', 'No se encontraron proyectos')
                                        : t('email.noProjectsYet', 'No tienes proyectos aún')}
                                </h3>
                                <p className="text-q-text-muted mb-6 max-w-md mx-auto">
                                    {searchQuery
                                        ? t('email.tryDifferentSearch', 'Intenta con otros términos de búsqueda')
                                        : t('email.createFirstProject', 'Crea tu primer proyecto para comenzar con email marketing')}
                                </p>
                                {!searchQuery && (
                                    <button
                                        onClick={() => setIsOnboardingOpen(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-colors"
                                    >
                                        <Plus size={20} />
                                        {t('dashboard.newProject', 'Nuevo Proyecto')}
                                    </button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                {filteredProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onSelect={() => onProjectSelect(project.id)}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredProjects.map((project) => (
                                    <ProjectListItem
                                        key={project.id}
                                        project={project}
                                        onSelect={() => onProjectSelect(project.id)}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

// Project Card Component for Grid View
interface ProjectCardProps {
    project: Project;
    onSelect: () => void;
    formatDate: (date: string) => string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, formatDate }) => {
    const { t } = useTranslation();
    const thumbnailUrl = getDynamicThumbnailUrl(project as any);

    return (
        <button
            onClick={onSelect}
            className="group relative bg-q-surface/50 hover:bg-q-surface border border-q-border hover:border-primary/50 rounded-2xl overflow-hidden transition-all duration-300 text-left hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 w-full"
        >
            {/* Thumbnail */}
            <div className="aspect-video relative overflow-hidden bg-muted">
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
                <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${project.status === 'Published'
                        ? 'bg-green-500/90 text-white'
                        : 'bg-slate-500/90 text-white'
                        }`}>
                        {project.status === 'Published' ? t('dashboard.published', 'Publicado') : t('dashboard.draft', 'Borrador')}
                    </span>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                    <span className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <Mail size={16} />
                        {t('email.openEmail', 'Email Marketing')}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                    {project.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-q-text-muted">
                    <Clock size={12} />
                    <span>{formatDate(project.lastUpdated)}</span>
                </div>
            </div>
        </button>
    );
};

// Project List Item Component for List View
interface ProjectListItemProps {
    project: Project;
    onSelect: () => void;
    formatDate: (date: string) => string;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project, onSelect, formatDate }) => {
    const { t } = useTranslation();
    const thumbnailUrl = getDynamicThumbnailUrl(project as any);

    return (
        <button
            onClick={onSelect}
            className="w-full flex items-center gap-4 p-4 bg-q-surface/50 hover:bg-q-surface border border-q-border hover:border-primary/50 rounded-xl transition-all text-left group"
        >
            {/* Thumbnail */}
            <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={project.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <ProjectThumbnailFallback logoClassName="h-6 w-6" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {project.name}
                </h3>
                <div className="flex items-center gap-3 sm:gap-4 text-xs text-q-text-muted mt-1">
                    <span className={`flex items-center gap-1 ${project.status === 'Published' ? 'text-green-500' : ''
                        }`}>
                        {project.status === 'Published' ? <Globe size={12} /> : <FileEdit size={12} />}
                        <span className="hidden sm:inline">
                            {project.status === 'Published' ? t('dashboard.published', 'Publicado') : t('dashboard.draft', 'Borrador')}
                        </span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        <span className="hidden sm:inline">{formatDate(project.lastUpdated)}</span>
                        <span className="sm:hidden">{new Date(project.lastUpdated).toLocaleDateString()}</span>
                    </span>
                </div>
            </div>

            {/* Action */}
            <div className="flex items-center gap-2 text-q-text-muted group-hover:text-primary transition-colors">
                <span className="text-sm font-medium hidden md:block">
                    {t('email.openEmail', 'Email Marketing')}
                </span>
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
    );
};

export default EmailProjectSelectorPage;
