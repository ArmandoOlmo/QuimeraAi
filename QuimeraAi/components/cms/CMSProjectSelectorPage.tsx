/**
 * CMSProjectSelectorPage
 * Página completa para seleccionar un proyecto para gestionar contenido CMS
 * El contenido está organizado por proyecto - cada cliente tiene su propio blog/posts
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Layers,
    ChevronRight,
    ChevronDown,
    Globe,
    FileEdit,
    Clock,
    Plus,
    LayoutGrid,
    List,
    Sparkles,
    Menu as MenuIcon,
    X,
    PenTool,
    FileText,
    ArrowLeft,
    Trash2,
} from 'lucide-react';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project/ProjectContext';
import { Project } from '../../types/components';
import DashboardSidebar from '../dashboard/DashboardSidebar';
import { useRouter } from '../../hooks/useRouter';
import QuimeraLoader from '../ui/QuimeraLoader';
import ConfirmationModal from '../ui/ConfirmationModal';
import MobileSearchModal from '../ui/MobileSearchModal';
import { ROUTES } from '../../routes/config';

interface CMSProjectSelectorPageProps {
    onProjectSelect: (projectId: string) => void;
}

const CMSProjectSelectorPage: React.FC<CMSProjectSelectorPageProps> = ({
    onProjectSelect,
}) => {
    const { t } = useTranslation();
    const { navigate } = useRouter();
    const { setIsOnboardingOpen } = useUI();
    const { projects, isLoadingProjects } = useProject();

    // Local state
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterStatus, setFilterStatus] = useState<'all' | 'Published' | 'Draft'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { deleteProject } = useProject();

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

    const handleSelectAll = () => {
        if (selectedProjects.length === filteredProjects.length) {
            setSelectedProjects([]);
        } else {
            setSelectedProjects(filteredProjects.map(p => p.id));
        }
    };

    const toggleProjectSelection = (projectId: string) => {
        setSelectedProjects(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        );
    };

    const handleBulkDelete = () => {
        setBulkDeleteConfirm(true);
    };

    const confirmBulkDelete = async () => {
        setIsDeletingBulk(true);
        try {
            for (const projectId of selectedProjects) {
                await deleteProject(projectId);
            }
            setSelectedProjects([]);
        } catch (error) {
            console.error('Error deleting projects:', error);
        } finally {
            setIsDeletingBulk(false);
            setBulkDeleteConfirm(false);
        }
    };

    return (
        <div className="h-screen bg-background flex overflow-hidden">
            {/* Sidebar */}
            <div className="flex-shrink-0 h-screen overflow-visible z-50">
                <DashboardSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-card/50 backdrop-blur-md border-b border-border flex-shrink-0 flex items-center px-4 sm:px-6 lg:px-8 z-40">
                    {/* Left: Menu & Title */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            aria-label={t('common.openMenu', 'Abrir menú')}
                        >
                            <MenuIcon size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <PenTool className="text-primary" size={20} />
                            <h1 className="text-lg font-bold text-foreground">
                                {t('cms.content', 'Contenido')}
                            </h1>
                        </div>
                    </div>

                    {/* Right: Search icon + Back icon */}
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={t('common.search', 'Buscar')}
                        >
                            <Search size={20} />
                        </button>
                        <button
                            onClick={() => navigate(ROUTES.DASHBOARD)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                </header>

                {/* Search Modal */}
                <MobileSearchModal
                    isOpen={isSearchOpen}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onClose={() => setIsSearchOpen(false)}
                    placeholder={t('cms.searchProjects', 'Buscar proyectos...')}
                />

                {/* Main Content - Scrollable Area */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto pb-8">
                        {/* Hero Section */}
                        <div className="mb-8">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                                        {t('cms.yourProjects', 'Tus Proyectos')}
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {t('cms.selectProjectDescription', 'Cada proyecto tiene su propio contenido (blog, artículos, páginas). Selecciona uno para gestionar su contenido.')}
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
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('dashboard.totalProjects', 'Total')}</p>
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
                                            <p className="text-[10px] sm:text-xs text-muted-foreground">{t('dashboard.draft', 'Borradores')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filter toolbar - Icons only, no boxes */}
                        <div className="flex items-center gap-3 sm:gap-4 mb-6">
                            {/* Select All Checkbox */}
                            {filteredProjects.length > 0 && (
                                <label
                                    className="flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                                    title={t('cms.selectAll', 'Seleccionar todos')}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-border w-3.5 h-3.5 accent-primary"
                                    />
                                    {selectedProjects.length > 0 && (
                                        <span className="text-[10px] font-semibold text-primary">
                                            {selectedProjects.length}
                                        </span>
                                    )}
                                </label>
                            )}

                            <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">
                                {filteredProjects.length}/{userProjects.length}
                            </span>

                            {/* Status filter - icon only */}
                            <div className="relative flex-shrink-0 cursor-pointer" title={t('cms.filters.allStatus', 'Estado')}>
                                <Globe size={15} className={`pointer-events-none transition-colors ${filterStatus !== 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                    <option value="all">{t('common.all', 'Todos')} ({userProjects.length})</option>
                                    <option value="Published">{t('dashboard.published', 'Publicados')} ({publishedCount})</option>
                                    <option value="Draft">{t('dashboard.draft', 'Borradores')} ({draftCount})</option>
                                </select>
                            </div>

                            {/* Sort - icon only */}
                            <div className="relative flex-shrink-0 cursor-pointer" title={t('common.mostRecent', 'Ordenar')}>
                                <ChevronDown size={15} className="pointer-events-none text-muted-foreground hover:text-foreground transition-colors" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                    <option value="recent">{t('common.mostRecent', 'Más recientes')}</option>
                                    <option value="name">{t('common.alphabetical', 'Alfabético')}</option>
                                </select>
                            </div>

                            {/* Clear filter */}
                            {filterStatus !== 'all' && (
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                    title={t('common.clear', 'Limpiar filtros')}
                                >
                                    <X size={13} />
                                </button>
                            )}

                            {/* Spacer */}
                            <div className="flex-1 min-w-0" />

                            {/* View Grid/List */}
                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`transition-colors ${viewMode === 'grid' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={15} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`transition-colors ${viewMode === 'list' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="List View"
                                >
                                    <List size={15} />
                                </button>
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
                                    <QuimeraLoader size="md" />
                                    <p className="text-muted-foreground">{t('common.loading', 'Cargando...')}</p>
                                </div>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-6">
                                    {searchQuery ? (
                                        <Search className="text-muted-foreground" size={48} />
                                    ) : (
                                        <FileText className="text-muted-foreground" size={48} />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    {searchQuery
                                        ? t('cms.noProjectsFound', 'No se encontraron proyectos')
                                        : t('cms.noProjectsYet', 'No tienes proyectos aún')}
                                </h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    {searchQuery
                                        ? t('cms.tryDifferentSearch', 'Intenta con otros términos de búsqueda')
                                        : t('cms.createFirstProject', 'Crea tu primer proyecto para gestionar su contenido')}
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
                                        isSelected={selectedProjects.includes(project.id)}
                                        onToggleSelect={() => toggleProjectSelection(project.id)}
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
                                        isSelected={selectedProjects.includes(project.id)}
                                        onToggleSelect={() => toggleProjectSelection(project.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Floating Bulk Actions Bar */}
            {selectedProjects.length > 0 && (
                <div className="fixed bottom-[106px] left-1/2 -translate-x-1/2 z-[99998]" style={{ animation: 'slideUp 0.3s ease-out' }}>
                    <div className="bg-card border border-border rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 backdrop-blur-xl">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">
                            {selectedProjects.length} {t('common.selected', 'seleccionados')}
                        </span>
                        <div className="w-px h-6 bg-border" />
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 text-sm font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
                        >
                            <Trash2 size={14} /> {t('common.delete', 'Eliminar')}
                        </button>
                        <button
                            onClick={() => setSelectedProjects([])}
                            className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-all"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={bulkDeleteConfirm}
                onConfirm={confirmBulkDelete}
                onCancel={() => setBulkDeleteConfirm(false)}
                title={t('cms.confirmBulkDeleteTitle', `¿Eliminar ${selectedProjects.length} proyecto(s)?`)}
                message={t('cms.confirmBulkDeleteProjectsMessage', 'Esta acción no se puede deshacer. Los proyectos seleccionados serán eliminados permanentemente.')}
                variant="danger"
                isLoading={isDeletingBulk}
            />
        </div>
    );
};

// Project Card Component for Grid View
interface ProjectCardProps {
    project: Project;
    onSelect: () => void;
    formatDate: (date: string) => string;
    isSelected: boolean;
    onToggleSelect: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, formatDate, isSelected, onToggleSelect }) => {
    const { t } = useTranslation();

    return (
        <div className={`group relative bg-card/50 hover:bg-card border rounded-2xl overflow-hidden transition-all duration-300 text-left hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 w-full ${isSelected ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            {/* Selection Checkbox */}
            <div
                className="absolute top-3 left-3 z-10"
                onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-primary text-white shadow-lg' : 'bg-black/40 text-white/70 hover:bg-black/60 backdrop-blur-sm'}`}>
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                </div>
            </div>

            {/* Clickable area */}
            <button onClick={onSelect} className="w-full text-left">
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
                            <PenTool size={16} />
                            {t('cms.manageContent', 'Gestionar Contenido')}
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
        </div>
    );
};

// Project List Item Component for List View
interface ProjectListItemProps {
    project: Project;
    onSelect: () => void;
    formatDate: (date: string) => string;
    isSelected: boolean;
    onToggleSelect: () => void;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project, onSelect, formatDate, isSelected, onToggleSelect }) => {
    const { t } = useTranslation();

    return (
        <div className={`w-full flex items-center gap-4 p-4 bg-card/50 hover:bg-card border rounded-xl transition-all text-left group ${isSelected ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/50'}`}>
            {/* Selection Checkbox */}
            <div
                className="flex-shrink-0 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-white shadow-lg' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                </div>
            </div>

            {/* Clickable area */}
            <button onClick={onSelect} className="flex-1 flex items-center gap-4 text-left min-w-0">
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
                        <span className={`flex items-center gap-1 ${project.status === 'Published' ? 'text-green-500' : ''}`}>
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
                        {t('cms.manageContent', 'Gestionar Contenido')}
                    </span>
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </button>
        </div>
    );
};

export default CMSProjectSelectorPage;

