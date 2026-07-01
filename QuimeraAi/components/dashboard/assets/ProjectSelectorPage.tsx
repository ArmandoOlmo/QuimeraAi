/**
 * ProjectSelectorPage - Assets/Image Generator
 * Página completa para seleccionar un proyecto para generar imágenes
 * Diseño igual que el de SEO y Ecommerce
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
    Zap,
    Image as ImageIcon,
} from 'lucide-react';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { Project } from '../../../types/components';
import DashboardSidebar from '../DashboardSidebar';
import QuimeraLoader from '../../ui/QuimeraLoader';
import MobileSearchModal from '../../ui/MobileSearchModal';
import HeaderBackButton from '../../ui/HeaderBackButton';
import ProjectThumbnailFallback from '../ProjectThumbnailFallback';
import PreviewOverlayCard from '../PreviewOverlayCard';
import { getDynamicThumbnailUrl } from '../../../utils/thumbnailHelper';
import { WebsiteCatalogToolbar } from '../filters';
import { useProjectCatalogFilters } from '../../../hooks/useProjectCatalogFilters';

type ProjectSelectorVariant = 'assets' | 'contentStudio';

const VARIANT_COPY = {
    assets: {
        headerIcon: Zap,
        emptyIcon: ImageIcon,
        cardActionIcon: Zap,
        titleKey: 'editor.imageGenerator',
        titleDefault: 'Generador de Imágenes',
        selectProjectKey: 'assets.selectProject',
        selectProjectDefault: 'Selecciona un Proyecto',
        selectProjectDescriptionKey: 'assets.selectProjectDescription',
        selectProjectDescriptionDefault: 'Las imágenes generadas se guardarán en la biblioteca del proyecto seleccionado.',
        searchProjectsKey: 'assets.searchProjects',
        searchProjectsDefault: 'Buscar proyectos...',
        noProjectsFoundKey: 'assets.noProjectsFound',
        noProjectsFoundDefault: 'No se encontraron proyectos',
        noProjectsYetKey: 'assets.noProjectsYet',
        noProjectsYetDefault: 'No tienes proyectos aún',
        tryDifferentSearchKey: 'assets.tryDifferentSearch',
        tryDifferentSearchDefault: 'Intenta con otros términos de búsqueda',
        createFirstProjectKey: 'assets.createFirstProject',
        createFirstProjectDefault: 'Crea tu primer proyecto para generar imágenes',
        cardActionKey: 'assets.generateImages',
        cardActionDefault: 'Generar Imágenes',
    },
    contentStudio: {
        headerIcon: Sparkles,
        emptyIcon: Sparkles,
        cardActionIcon: Sparkles,
        titleKey: 'contentStudio.title',
        titleDefault: 'Content Studio',
        selectProjectKey: 'contentStudio.selectProject',
        selectProjectDefault: 'Select a Project',
        selectProjectDescriptionKey: 'contentStudio.selectProjectDescription',
        selectProjectDescriptionDefault: 'Choose a project to create AI content campaigns for your business.',
        searchProjectsKey: 'contentStudio.searchProjects',
        searchProjectsDefault: 'Search projects...',
        noProjectsFoundKey: 'contentStudio.noProjectsFound',
        noProjectsFoundDefault: 'No projects found',
        noProjectsYetKey: 'contentStudio.noProjectsYet',
        noProjectsYetDefault: "You don't have any projects yet",
        tryDifferentSearchKey: 'contentStudio.tryDifferentSearch',
        tryDifferentSearchDefault: 'Try different search terms',
        createFirstProjectKey: 'contentStudio.createFirstProject',
        createFirstProjectDefault: 'Create your first project to start producing content',
        cardActionKey: 'contentStudio.openProject',
        cardActionDefault: 'Open Content Studio',
    },
} as const;

interface ProjectSelectorPageProps {
    onProjectSelect: (projectId: string) => void;
    onBack?: () => void;
    variant?: ProjectSelectorVariant;
}

const ProjectSelectorPage: React.FC<ProjectSelectorPageProps> = ({
    onProjectSelect,
    onBack,
    variant = 'assets',
}) => {
    const { t } = useTranslation();
    const copy = VARIANT_COPY[variant];
    const HeaderIcon = copy.headerIcon;
    const EmptyIcon = copy.emptyIcon;
    const { setIsOnboardingOpen, setView } = useUI();
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

    const handleBack = onBack ?? (() => setView('dashboard'));

    return (
        <div className="min-h-screen bg-q-bg flex">
            {/* Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Header */}
 <header className="quimera-dashboard-header-bar h-14 w-full px-4 sm:px-6 flex items-center sticky top-0 z-40">
                    {/* Left: Menu & Title */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            aria-label={t('common.openMenu', 'Abrir menú')}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <HeaderIcon className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-lg font-semibold text-foreground">
                                {t(copy.titleKey, copy.titleDefault)}
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
                        <HeaderBackButton onClick={handleBack} />
                    </div>
                </header>

                {/* Search Modal */}
                <MobileSearchModal
                    isOpen={isSearchOpen}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onClose={() => setIsSearchOpen(false)}
                    placeholder={t(copy.searchProjectsKey, copy.searchProjectsDefault)}
                />

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Hero Section */}
                        <div className="mb-8">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                        {t(copy.selectProjectKey, copy.selectProjectDefault)}
                                    </h2>
                                    <p className="text-q-text-muted">
                                        {t(copy.selectProjectDescriptionKey, copy.selectProjectDescriptionDefault)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsOnboardingOpen(true)}
                                    className="quimera-guide-cta flex items-center gap-2 px-5 py-3 rounded-xl font-medium"
                                >
                                    <Sparkles size={18} />
                                    {t('dashboard.newProject', 'Nuevo Proyecto')}
                                </button>
                            </div>

                            {/* Stats Bar */}
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                {[
                                    {
                                        id: 'total',
                                        icon: Layers,
                                        value: userProjects.length,
                                        labelKey: 'seo.totalProjects',
                                        defaultLabel: 'Total de Proyectos',
                                    },
                                    {
                                        id: 'published',
                                        icon: Globe,
                                        value: publishedCount,
                                        labelKey: 'dashboard.published',
                                        defaultLabel: 'Publicados',
                                    },
                                    {
                                        id: 'draft',
                                        icon: FileEdit,
                                        value: draftCount,
                                        labelKey: 'dashboard.draft',
                                        defaultLabel: 'Borradores',
                                    },
                                ].map((card) => {
                                    const Icon = card.icon;

                                    return (
                                        <div
                                            key={card.id}
                                            className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-q-border/60
                                                bg-q-surface/80 backdrop-blur-xl p-3 sm:p-4 hover:border-q-border
                                                transition-all duration-300 ease-out"
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
                                                <div className="text-xl md:text-3xl font-extrabold text-foreground">{card.value}</div>
                                                <div className="text-[10px] md:text-xs font-semibold text-q-text-muted uppercase tracking-wider mt-0.5 md:mt-1 leading-tight">
                                                    {t(card.labelKey, card.defaultLabel)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                <QuimeraLoader size="md" />
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="text-center py-16 quimera-dashboard-panel-card">
                                {searchQuery ? (
                                    <Search className="mx-auto mb-6 text-q-text-muted" size={48} strokeWidth={1.5} />
                                ) : (
                                    <EmptyIcon className="mx-auto mb-6 text-q-text-muted" size={48} strokeWidth={1.5} />
                                )}
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    {searchQuery
                                        ? t(copy.noProjectsFoundKey, copy.noProjectsFoundDefault)
                                        : t(copy.noProjectsYetKey, copy.noProjectsYetDefault)}
                                </h3>
                                <p className="text-q-text-muted mb-6 max-w-md mx-auto">
                                    {searchQuery
                                        ? t(copy.tryDifferentSearchKey, copy.tryDifferentSearchDefault)
                                        : t(copy.createFirstProjectKey, copy.createFirstProjectDefault)}
                                </p>
                                {!searchQuery && (
                                    <button
                                        onClick={() => setIsOnboardingOpen(true)}
                                        className="quimera-guide-cta inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium"
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
                                        copy={copy}
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
                                        copy={copy}
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
    copy: (typeof VARIANT_COPY)[ProjectSelectorVariant];
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, formatDate, copy }) => {
    const { t } = useTranslation();
    const CardActionIcon = copy.cardActionIcon;
    const thumbnailUrl = getDynamicThumbnailUrl(project as any);
    const isPublished = project.status === 'Published';

    return (
        <PreviewOverlayCard
            thumbnailUrl={thumbnailUrl}
            title={project.name}
            titleText={project.name}
            imageAlt={project.name}
            onClick={onSelect}
            ariaLabel={project.name}
            className="w-full"
            badge={(
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm ${isPublished ? 'bg-q-success/90' : 'bg-q-surface-overlay/90'}`}>
                    {isPublished ? t('dashboard.published', 'Publicado') : t('dashboard.draft', 'Borrador')}
                </span>
            )}
            metadata={(
                <span className="inline-flex items-center gap-2">
                    <Clock size={12} />
                    {formatDate(project.lastUpdated)}
                </span>
            )}
            cornerAction={<CardActionIcon size={18} aria-hidden="true" />}
        />
    );
};

// Project List Item Component for List View
interface ProjectListItemProps {
    project: Project;
    onSelect: () => void;
    formatDate: (date: string) => string;
    copy: (typeof VARIANT_COPY)[ProjectSelectorVariant];
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project, onSelect, formatDate, copy }) => {
    const { t } = useTranslation();
    const thumbnailUrl = getDynamicThumbnailUrl(project as any);

    return (
        <button
            onClick={onSelect}
            className="w-full flex items-center gap-4 p-4 bg-q-surface/80 backdrop-blur-xl hover:bg-q-surface border border-q-border/60 hover:border-q-border rounded-2xl transition-all duration-300 text-left group relative overflow-hidden"
        >
            <div
                className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl
                    group-hover:scale-110 transition-all duration-500 pointer-events-none"
                aria-hidden="true"
            />
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
                <h3 className="font-semibold text-foreground truncate group-hover:text-[var(--quimera-status-accent-from)] transition-colors">
                    {project.name}
                </h3>
                <div className="flex items-center gap-3 sm:gap-4 text-xs text-q-text-muted mt-1">
                    <span className={`flex items-center gap-1 ${project.status === 'Published' ? 'quimera-status-card-accent-text' : ''
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
            <div className="flex items-center gap-2 quimera-status-card-link transition-colors">
                <span className="text-sm font-medium hidden md:block">
                    {t(copy.cardActionKey, copy.cardActionDefault)}
                </span>
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
    );
};

export default ProjectSelectorPage;
