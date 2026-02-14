/**
 * ProjectSelectorPage - SEO
 * Página completa para seleccionar un proyecto para configurar SEO
 * Diseño igual que el de Ecommerce
 */

import React, { useState, useMemo } from 'react';
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
    ArrowLeft,
} from 'lucide-react';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { Project } from '../../../types/components';
import DashboardSidebar from '../DashboardSidebar';

interface ProjectSelectorPageProps {
    onProjectSelect: (projectId: string) => void;
    onBack?: () => void;
}

const ProjectSelectorPage: React.FC<ProjectSelectorPageProps> = ({
    onProjectSelect,
    onBack,
}) => {
    const { t } = useTranslation();
    const { setIsOnboardingOpen, setView } = useUI();
    const { projects, isLoadingProjects } = useProject();
    
    // Local state
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterStatus, setFilterStatus] = useState<'all' | 'Published' | 'Draft'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Filter and sort projects
    const filteredProjects = useMemo(() => {
        let filtered = projects.filter(p => 
            p.status !== 'Template' &&
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filterStatus !== 'all') {
            filtered = filtered.filter(p => p.status === filterStatus);
        }

        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        });

        return filtered;
    }, [projects, searchQuery, filterStatus, sortBy]);

    const userProjects = projects.filter(p => p.status !== 'Template');
    const publishedCount = userProjects.filter(p => p.status === 'Published').length;
    const draftCount = userProjects.filter(p => p.status === 'Draft').length;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-14 w-full px-4 sm:px-6 border-b border-border flex items-center bg-card/50 backdrop-blur-md sticky top-0 z-40">
                    {/* Left: Menu & Title */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            aria-label={t('common.openMenu', 'Abrir menú')}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Search className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground">
                                {t('seo.title', 'SEO y Metadatos')}
                            </h1>
                        </div>
                    </div>

                    {/* Center: Search */}
                    <div className="hidden md:flex flex-1 justify-center px-4">
                        <div className="flex items-center gap-2 w-full max-w-xl bg-editor-border/40 rounded-lg px-3 py-2">
                            <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="search"
                                placeholder={t('seo.searchProjects', 'Buscar proyectos...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                aria-label={t('seo.searchProjects', 'Buscar proyectos')}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Back Button - solo icono */}
                    <div className="flex items-center justify-end flex-shrink-0 ml-auto">
                        <button
                            onClick={() => onBack ? onBack() : setView('dashboard')}
                            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={t('common.back', 'Volver')}
                            title={t('common.back', 'Volver')}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                </header>

                {/* Mobile Search */}
                <div className="md:hidden px-4 py-3 border-b border-border bg-background">
                    <div className="flex items-center gap-2 w-full bg-editor-border/40 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="search"
                            placeholder={t('seo.searchProjects', 'Buscar proyectos...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm min-w-0"
                            aria-label={t('seo.searchProjects', 'Buscar proyectos')}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Hero Section */}
                        <div className="mb-8">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                        {t('seo.yourProjects', 'Tus Proyectos')}
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {t('seo.selectProjectDescription', 'Cada proyecto tiene su propia configuración SEO. Selecciona uno para optimizarlo.')}
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
                                <div className="bg-card/50 rounded-xl p-3 sm:p-4 border border-border hover:border-primary/30 transition-colors">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20">
                                            <Layers className="text-primary" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xl sm:text-2xl font-bold text-foreground">{userProjects.length}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('seo.totalProjects', 'Total de Proyectos')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-card/50 rounded-xl p-3 sm:p-4 border border-border hover:border-green-500/30 transition-colors">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
                                            <Globe className="text-green-500" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xl sm:text-2xl font-bold text-foreground">{publishedCount}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('dashboard.published', 'Publicados')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-card/50 rounded-xl p-3 sm:p-4 border border-border hover:border-slate-500/30 transition-colors">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-slate-500/20">
                                            <FileEdit className="text-slate-400" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xl sm:text-2xl font-bold text-foreground">{draftCount}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('dashboard.draft', 'Borrador')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filter + Sort - compacto, móvil en 2 filas */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-2 mb-4">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`text-xs font-medium transition-colors py-0.5 ${filterStatus === 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {t('common.all', 'Todos')} ({userProjects.length})
                                </button>
                                <span className="text-muted-foreground/60 text-xs">·</span>
                                <button
                                    onClick={() => setFilterStatus('Published')}
                                    className={`text-xs font-medium transition-colors py-0.5 ${filterStatus === 'Published' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {t('dashboard.published', 'Publicados')} ({publishedCount})
                                </button>
                                <span className="text-muted-foreground/60 text-xs">·</span>
                                <button
                                    onClick={() => setFilterStatus('Draft')}
                                    className={`text-xs font-medium transition-colors py-0.5 ${filterStatus === 'Draft' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {t('dashboard.draft', 'Borrador')} ({draftCount})
                                </button>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-auto shrink-0">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
                                    className="text-xs text-foreground bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground focus:ring-0 py-0.5 w-auto max-w-[7.5rem] sm:max-w-[8rem] min-w-0"
                                    aria-label={t('common.sortBy', 'Ordenar por')}
                                >
                                    <option value="recent">{t('common.mostRecent', 'Más recientes')}</option>
                                    <option value="name">{t('common.alphabetical', 'Alfabético')}</option>
                                </select>
                                <div className="hidden sm:flex items-center gap-0.5 border-l border-border/50 pl-2">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 sm:p-2 transition-colors ${viewMode === 'grid' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        aria-label={t('common.gridView', 'Vista cuadrícula')}
                                    >
                                        <LayoutGrid size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 sm:p-2 transition-colors ${viewMode === 'list' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        aria-label={t('common.listView', 'Vista lista')}
                                    >
                                        <List size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results Count */}
                        {searchQuery && (
                            <p className="text-sm text-muted-foreground mb-4">
                                {filteredProjects.length} {t('common.resultsFound', 'resultados encontrados')}
                            </p>
                        )}

                        {/* Projects Grid/List */}
                        {isLoadingProjects ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                                    <p className="text-muted-foreground">{t('common.loading', 'Cargando...')}</p>
                                </div>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-6">
                                    {searchQuery ? (
                                        <Search className="text-muted-foreground" size={48} />
                                    ) : (
                                        <Search className="text-muted-foreground" size={48} />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    {searchQuery
                                        ? t('seo.noProjectsFound', 'No se encontraron proyectos')
                                        : t('seo.noProjectsYet', 'No tienes proyectos aún')}
                                </h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    {searchQuery
                                        ? t('seo.tryDifferentSearch', 'Intenta con otros términos de búsqueda')
                                        : t('seo.createFirstProject', 'Crea tu primer proyecto para configurar SEO')}
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
    
    return (
        <button
            onClick={onSelect}
            className="group relative bg-card/50 hover:bg-card border border-border hover:border-primary/50 rounded-2xl overflow-hidden transition-all duration-300 text-left hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 w-full"
        >
            {/* Thumbnail */}
            <div className="aspect-video relative overflow-hidden bg-muted">
                {project.thumbnailUrl ? (
                    <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <Layers size={40} className="text-muted-foreground/30" />
                    </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        project.status === 'Published'
                            ? 'bg-green-500/90 text-white'
                            : 'bg-slate-500/90 text-white'
                    }`}>
                        {project.status === 'Published' ? t('dashboard.published', 'Publicado') : t('dashboard.draft', 'Borrador')}
                    </span>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                    <span className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <Search size={16} />
                        {t('seo.configureSEO', 'Configurar SEO')}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                    {project.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
    
    return (
        <button
            onClick={onSelect}
            className="w-full flex items-center gap-4 p-4 bg-card/50 hover:bg-card border border-border hover:border-primary/50 rounded-xl transition-all text-left group"
        >
            {/* Thumbnail */}
            <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {project.thumbnailUrl ? (
                    <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <Layers size={18} className="text-muted-foreground/30" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {project.name}
                </h3>
                <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground mt-1">
                    <span className={`flex items-center gap-1 ${
                        project.status === 'Published' ? 'text-green-500' : ''
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
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                <span className="text-sm font-medium hidden md:block">
                    {t('seo.configureSEO', 'Configurar SEO')}
                </span>
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
    );
};

export default ProjectSelectorPage;
