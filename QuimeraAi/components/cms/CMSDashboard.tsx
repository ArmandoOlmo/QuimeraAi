
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCMS } from '../../contexts/cms';
import { useProject } from '../../contexts/project';
import DashboardSidebar from '../dashboard/DashboardSidebar';
import DashboardWaveRibbons from '../dashboard/DashboardWaveRibbons';
import ConfirmationModal from '../ui/ConfirmationModal';
import MobileSearchModal from '../ui/MobileSearchModal';
import QuimeraLoader from '../ui/QuimeraLoader';
import ModernCMSEditor from './modern/ModernCMSEditor';
import ContentCreatorAssistant from './ContentCreatorAssistant';
import CMSProjectSelectorPage from './CMSProjectSelectorPage';
import { Menu, Plus, Search, FileText, Edit3, Trash2, Loader2, Calendar, Globe, PenTool, ArrowDown, ArrowUp, Grid, List, Eye, X as XIcon, Copy, Edit2, Download, Sparkles, ArrowLeft, ChevronDown } from 'lucide-react';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { CMSPost } from '../../types';
import { sanitizeHtml } from '../../utils/sanitize';

const CMSDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useRouter();
    const { cmsPosts, loadCMSPosts, deleteCMSPost, saveCMSPost, hasActiveProject, activeProjectName } = useCMS();
    const { loadProject } = useProject();

    // Project selector state
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<CMSPost | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Nuevos estados de filtrado y vista
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // Quick preview
    const [previewPost, setPreviewPost] = useState<CMSPost | null>(null);

    // Bulk actions
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

    // AI Assistant
    const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

    // Delete confirmation modal
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await loadCMSPosts();
            setIsLoading(false);
        }
        init();
    }, []);

    const handleCreateNew = () => {
        setEditingPost(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (post: CMSPost) => {
        setEditingPost(post);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id: string) => {
        console.log('[CMSDashboard] Opening delete confirmation for id:', id);
        // We just set the state to open the custom modal
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;

        console.log('[CMSDashboard] User confirmed deletion via modal, calling deleteCMSPost...');
        setIsDeleting(true);

        try {
            await deleteCMSPost(deleteConfirmId);
            console.log('[CMSDashboard] ✅ Post deleted successfully');
            await loadCMSPosts();
        } catch (error) {
            console.error('[CMSDashboard] ❌ Error deleting post:', error);
            alert('Error al eliminar el post. Revisa la consola para más detalles.');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const cancelDelete = () => {
        console.log('[CMSDashboard] User cancelled deletion via modal');
        setDeleteConfirmId(null);
    };

    const handleDuplicate = async (post: CMSPost) => {
        const duplicatedPost: CMSPost = {
            ...post,
            id: `post_${Date.now()}`,
            title: `${post.title} ${t('cms.copyLabel')}`,
            slug: `${post.slug}-copy-${Date.now()}`,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await saveCMSPost(duplicatedPost);
        await loadCMSPosts();
    };

    const handleQuickPreview = (post: CMSPost) => {
        setPreviewPost(post);
    };

    // AI Assistant handlers
    const handleAiCreate = () => {
        setIsAiAssistantOpen(true);
    };

    const handlePostCreatedFromAi = async (post: CMSPost) => {
        setIsAiAssistantOpen(false);
        console.log("📋 Dashboard: Post created from AI", post);

        // 1. Recargamos la lista para obtener el post con su ID real de Firebase
        await loadCMSPosts();

        // 2. Esperamos un momento para que la lista se actualice
        await new Promise(resolve => setTimeout(resolve, 300));

        // 3. Buscamos el post recién creado por slug (más confiable que por ID vacío)
        const createdPost = cmsPosts.find(p => p.slug === post.slug);

        if (createdPost) {
            console.log("✅ Found created post:", createdPost);
            setEditingPost(createdPost);
        } else {
            // Si no lo encontramos, usamos el post tal cual (probablemente funcionará de todos modos)
            console.warn("⚠️ Could not find created post, using original");
            setEditingPost(post);
        }

        // 4. Abrimos el editor inmediatamente
        setIsEditorOpen(true);
    };

    // Bulk actions handlers
    const handleSelectAll = () => {
        if (selectedPosts.length === filteredAndSortedPosts.length) {
            setSelectedPosts([]);
        } else {
            setSelectedPosts(filteredAndSortedPosts.map(p => p.id));
        }
    };

    const handleSelectPost = (id: string) => {
        setSelectedPosts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        setBulkDeleteConfirm(true);
    };

    const confirmBulkDelete = async () => {
        setIsDeleting(true);
        try {
            await Promise.all(selectedPosts.map(id => deleteCMSPost(id)));
            setSelectedPosts([]);
            await loadCMSPosts();
        } catch (error) {
            console.error('Error deleting posts:', error);
        } finally {
            setIsDeleting(false);
            setBulkDeleteConfirm(false);
        }
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(cmsPosts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `posts-export-${Date.now()}.json`;
        link.click();
    };

    // Filtrado y ordenamiento avanzado con useMemo
    const filteredAndSortedPosts = useMemo(() => {
        let result = cmsPosts.filter(post => {
            // Búsqueda
            const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.status.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // Filtro de estado
            if (statusFilter !== 'all' && post.status !== statusFilter) return false;

            // Filtro de fecha
            if (dateRange !== 'all') {
                const postDate = new Date(post.updatedAt);
                const now = new Date();
                const daysDiff = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));

                if (dateRange === 'today' && daysDiff > 0) return false;
                if (dateRange === 'week' && daysDiff > 7) return false;
                if (dateRange === 'month' && daysDiff > 30) return false;
            }

            return true;
        });

        // Ordenamiento
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'date':
                    comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
            }

            return sortOrder === 'desc' ? comparison : -comparison;
        });

        return result;
    }, [cmsPosts, searchQuery, statusFilter, sortBy, sortOrder, dateRange]);

    // Métricas
    const metrics = useMemo(() => ({
        total: cmsPosts.length,
        published: cmsPosts.filter(p => p.status === 'published').length,
        drafts: cmsPosts.filter(p => p.status === 'draft').length,
    }), [cmsPosts]);

    if (isEditorOpen) {
        return (
            <ModernCMSEditor
                post={editingPost}
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditingPost(null);
                    loadCMSPosts(); // Refresh list on close
                }}
            />
        );
    }

    // Handle project selection - Stay in CMS Content Creator (don't navigate to editor)
    const handleProjectSelect = async (projectId: string) => {
        await loadProject(projectId, false, false); // fromAdmin=false, navigateToEditor=false
        setShowProjectSelector(false);
    };

    // Show project selector when no project is selected or user wants to change
    if (!hasActiveProject || showProjectSelector) {
        return (
            <CMSProjectSelectorPage
                onProjectSelect={handleProjectSelect}
            />
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* AI Assistant Modal */}
            {isAiAssistantOpen && (
                <ContentCreatorAssistant
                    onClose={() => setIsAiAssistantOpen(false)}
                    onPostCreated={handlePostCreatedFromAi}
                />
            )}

            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons />
                {/* Standardized Header */}
                <header className="h-14 px-4 sm:px-6 border-b border-border flex items-center bg-background z-20 sticky top-0">
                    {/* Left Section */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-xl transition-colors touch-manipulation">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <PenTool className="text-primary w-5 h-5" />
                            <h1 className="text-sm sm:text-lg font-semibold text-foreground">{t('cms.contentManager', 'Gestor de Contenido')}</h1>
                        </div>

                        {/* Project Selector Button */}
                        {activeProjectName && (
                            <button
                                onClick={() => setShowProjectSelector(true)}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-colors group"
                                title={t('cms.changeProject', 'Cambiar proyecto')}
                            >
                                <span className="text-sm font-medium text-foreground max-w-[120px] sm:max-w-[200px] truncate">
                                    {activeProjectName}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </button>
                        )}
                    </div>

                    {/* Center Section - Search */}
                    <div className="hidden md:flex flex-1 justify-center mx-4">
                        <div className="flex items-center gap-2 w-full max-w-md bg-muted/50 rounded-lg px-3 py-2">
                            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <input
                                type="text"
                                placeholder={t('common.search', 'Buscar...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm min-w-0 text-foreground placeholder:text-muted-foreground"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                                    <XIcon size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                        {/* Mobile Search Button */}
                        <button
                            onClick={() => setIsMobileSearchOpen(true)}
                            className="md:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <MobileSearchModal
                            isOpen={isMobileSearchOpen}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            onClose={() => setIsMobileSearchOpen(false)}
                            placeholder={t('cms.searchPosts', 'Buscar posts...')}
                        />

                        {/* Botón Export - Desktop only */}
                        {cmsPosts.length > 0 && (
                            <button
                                onClick={handleExport}
                                className="hidden sm:flex items-center justify-center h-9 w-9 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Export posts"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}

                        {/* Botón Crear con IA - Icon only on mobile, full button on desktop */}
                        <button
                            onClick={handleAiCreate}
                            className="flex items-center gap-1.5 h-8 w-8 sm:w-auto sm:h-9 sm:px-3 justify-center rounded-md text-sm font-bold transition-all text-primary sm:bg-primary/10 sm:hover:bg-primary/20 sm:border sm:border-primary/30 hover:text-primary/80"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('cms.createWithAI', 'Crear con IA')}</span>
                        </button>

                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-1.5 h-8 w-8 sm:w-auto sm:h-9 sm:px-3 justify-center rounded-md text-sm font-medium transition-all sm:bg-primary sm:text-primary-foreground sm:hover:opacity-90 text-foreground hover:text-foreground/80"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('cms.newPost', 'Nuevo Post')}</span>
                        </button>

                        {/* Botón Volver - Icon only on mobile, full button on desktop */}
                        <button
                            onClick={() => navigate(ROUTES.DASHBOARD)}
                            className="flex items-center justify-center gap-2 h-8 w-8 sm:w-auto sm:h-9 sm:px-3 rounded-md sm:rounded-lg sm:bg-secondary/50 sm:hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth relative z-10">
                    <div className="max-w-7xl mx-auto h-full space-y-4 sm:space-y-6">

                        {/* Métricas - Unified responsive design */}
                        {cmsPosts.length > 0 && (
                            <div className="relative z-[1] grid grid-cols-3 gap-2 sm:gap-3">
                                {/* Total Posts */}
                                <div className="group relative overflow-hidden bg-card border border-primary/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                                    <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                                    <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/15 flex items-center justify-center mx-auto sm:mx-0">
                                            <FileText className="text-primary" size={16} />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{metrics.total}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('cms.totalPosts', 'Total Posts')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Published */}
                                <div className="group relative overflow-hidden bg-card border border-emerald-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5">
                                    <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
                                    <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/15 flex items-center justify-center mx-auto sm:mx-0">
                                            <Globe className="text-emerald-500" size={16} />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <p className="text-xl sm:text-2xl font-bold text-emerald-500 tracking-tight">{metrics.published}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('cms.published', 'Publicados')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Drafts */}
                                <div className="group relative overflow-hidden bg-card border border-amber-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5">
                                    <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
                                    <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/15 flex items-center justify-center mx-auto sm:mx-0">
                                            <Edit3 className="text-amber-500" size={16} />
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <p className="text-xl sm:text-2xl font-bold text-amber-500 tracking-tight">{metrics.drafts}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('cms.drafts', 'Borradores')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Barra de Filtros */}
                        <div className="space-y-3">
                            {/* Top row - Count and view toggles */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-3 py-1.5 bg-secondary/50 text-xs rounded-full text-muted-foreground font-medium">
                                        {filteredAndSortedPosts.length} of {cmsPosts.length}
                                    </span>

                                    {/* Filtros activos */}
                                    {(statusFilter !== 'all' || dateRange !== 'all') && (
                                        <button
                                            onClick={() => {
                                                setStatusFilter('all');
                                                setDateRange('all');
                                            }}
                                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                        >
                                            <XIcon size={12} /> {t('common.clear', 'Limpiar')}
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* Orden asc/desc */}
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-border/40"
                                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                    >
                                        {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                                    </button>

                                    {/* Vista Grid/List */}
                                    <div className="flex gap-0.5 sm:gap-1">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                            title="Grid View"
                                        >
                                            <Grid size={14} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                            title="List View"
                                        >
                                            <List size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Filters row - Horizontal scroll on mobile */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide">
                                {/* Filtro de estado */}
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none flex-shrink-0"
                                >
                                    <option value="all">{t('cms.filters.allStatus', 'Todos los estados')}</option>
                                    <option value="published">{t('cms.filters.published', 'Publicados')}</option>
                                    <option value="draft">{t('cms.filters.draft', 'Borradores')}</option>
                                </select>

                                {/* Filtro de fecha */}
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value as any)}
                                    className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none flex-shrink-0"
                                >
                                    <option value="all">{t('cms.filters.allTime', 'Todo el tiempo')}</option>
                                    <option value="today">{t('cms.filters.today', 'Hoy')}</option>
                                    <option value="week">{t('cms.filters.last7Days', 'Últimos 7 días')}</option>
                                    <option value="month">{t('cms.filters.last30Days', 'Últimos 30 días')}</option>
                                </select>

                                {/* Ordenamiento */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none flex-shrink-0"
                                >
                                    <option value="date">{t('cms.filters.sortByDate', 'Ordenar por fecha')}</option>
                                    <option value="title">{t('cms.filters.sortByTitle', 'Ordenar por título')}</option>
                                </select>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <QuimeraLoader size="md" />
                            </div>
                        ) : filteredAndSortedPosts.length === 0 ? (
                            <div className="text-center py-16 bg-card/30 rounded-3xl border border-dashed border-border/50">
                                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText size={32} className="text-muted-foreground opacity-50" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    {searchQuery || statusFilter !== 'all' || dateRange !== 'all'
                                        ? t('cms.noPostsMatchFilters', 'No hay posts que coincidan con los filtros')
                                        : t('cms.noContentYet', 'Aún no hay contenido')}
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    {searchQuery || statusFilter !== 'all' || dateRange !== 'all'
                                        ? t('cms.tryAdjustingFilters', 'Intenta ajustar los filtros para ver más resultados.')
                                        : t('cms.startBuildingContent', 'Comienza a crear tu blog o páginas usando nuestro editor con IA.')}
                                </p>
                                <button
                                    onClick={handleCreateNew}
                                    className="text-primary font-bold hover:underline hover:opacity-80 transition-colors"
                                >
                                    {t('cms.createFirstPost', 'Crear tu primer post')}
                                </button>
                            </div>
                        ) : viewMode === 'list' ? (
                            /* Vista de Lista - Mobile optimized */
                            <>
                                {/* Desktop Table View */}
                                <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-secondary/20 border-b border-border">
                                            <tr>
                                                <th className="p-4 text-left w-12">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPosts.length === filteredAndSortedPosts.length && filteredAndSortedPosts.length > 0}
                                                        onChange={handleSelectAll}
                                                        className="rounded border-border"
                                                    />
                                                </th>
                                                <th className="p-4 text-left text-xs font-medium text-muted-foreground">{t('cms.table.title', 'Título')}</th>
                                                <th className="p-4 text-left text-xs font-medium text-muted-foreground">{t('cms.table.status', 'Estado')}</th>
                                                <th className="p-4 text-left text-xs font-medium text-muted-foreground">{t('cms.table.date', 'Fecha')}</th>
                                                <th className="p-4 text-left text-xs font-medium text-muted-foreground w-32">{t('cms.table.actions', 'Acciones')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredAndSortedPosts.map(post => (
                                                <tr key={post.id} className="hover:bg-secondary/30 transition-colors group">
                                                    <td className="p-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPosts.includes(post.id)}
                                                            onChange={() => handleSelectPost(post.id)}
                                                            className="rounded border-border"
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded overflow-hidden bg-secondary flex-shrink-0">
                                                                {post.featuredImage ? (
                                                                    <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <FileText size={20} className="text-muted-foreground opacity-30" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="font-semibold text-sm text-foreground line-clamp-1">{post.title}</p>
                                                                <p className="text-xs text-muted-foreground line-clamp-1">{post.excerpt || t('cms.noExcerpt', 'Sin extracto')}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${post.status === 'published'
                                                            ? 'bg-green-500/10 text-green-500'
                                                            : 'bg-yellow-500/10 text-yellow-500'
                                                            }`}>
                                                            {post.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-muted-foreground">
                                                        {new Date(post.updatedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleQuickPreview(post)}
                                                                className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-all"
                                                                title="Quick Preview"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEdit(post)}
                                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicate(post)}
                                                                className="p-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-md transition-all"
                                                                title="Duplicate"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(post.id)}
                                                                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile List View - Card-based */}
                                <div className="sm:hidden space-y-3">
                                    {filteredAndSortedPosts.map(post => (
                                        <div
                                            key={post.id}
                                            className="bg-card border border-border rounded-xl p-3 active:bg-secondary/30 transition-colors"
                                            onClick={() => handleEdit(post)}
                                        >
                                            <div className="flex gap-3">
                                                {/* Thumbnail */}
                                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                                                    {post.featuredImage ? (
                                                        <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FileText size={24} className="text-muted-foreground opacity-30" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className="font-semibold text-sm text-foreground line-clamp-1">{post.title}</h4>
                                                        <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full ${post.status === 'published'
                                                            ? 'bg-green-500/10 text-green-500'
                                                            : 'bg-yellow-500/10 text-yellow-500'
                                                            }`}>
                                                            {post.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{post.excerpt || t('cms.noExcerpt', 'Sin extracto')}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            {new Date(post.updatedAt).toLocaleDateString()}
                                                        </span>

                                                        {/* Quick actions */}
                                                        <div className="flex items-center gap-0.5">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleQuickPreview(post); }}
                                                                className="p-1.5 text-muted-foreground hover:text-blue-500 rounded transition-colors"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDuplicate(post); }}
                                                                className="p-1.5 text-muted-foreground hover:text-green-500 rounded transition-colors"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                                                                className="p-1.5 text-muted-foreground hover:text-red-500 rounded transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* Vista de Grid - Mobile optimized */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                {filteredAndSortedPosts.map(post => (
                                    <div
                                        key={post.id}
                                        className="group relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl sm:hover:scale-[1.02] h-[280px] sm:h-[400px]"
                                        onClick={() => handleEdit(post)}
                                    >
                                        {/* Full Background Image */}
                                        <div className="relative w-full h-full overflow-hidden">
                                            {post.featuredImage ? (
                                                <img
                                                    src={post.featuredImage}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-secondary">
                                                    <FileText size={40} className="sm:hidden text-muted-foreground opacity-20" />
                                                    <FileText size={60} className="hidden sm:block text-muted-foreground opacity-20" />
                                                </div>
                                            )}

                                            {/* Dark Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                                            {/* Top Section: Status Badge */}
                                            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
                                                <span className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md sm:rounded-lg border backdrop-blur-md shadow-lg ${post.status === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                                                    {post.status}
                                                </span>
                                            </div>

                                            {/* Mobile: Always visible quick actions at top right */}
                                            <div className="sm:hidden absolute top-3 right-3 z-20 flex gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleQuickPreview(post); }}
                                                    className="bg-white/90 text-blue-500 p-2 rounded-full shadow-lg active:scale-95 transition-transform"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                                                    className="bg-white/90 text-red-500 p-2 rounded-full shadow-lg active:scale-95 transition-transform"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Desktop: Hover Actions Overlay */}
                                            <div className="hidden sm:flex absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center backdrop-blur-[2px] gap-3 z-10">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleQuickPreview(post); }}
                                                    className="bg-white text-blue-500 p-3 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                    title="Quick Preview"
                                                >
                                                    <Eye size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(post); }}
                                                    className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                    title="Edit"
                                                >
                                                    <Edit3 size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDuplicate(post); }}
                                                    className="bg-white text-green-600 p-3 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                    title="Duplicate"
                                                >
                                                    <Copy size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                                                    className="bg-white text-red-500 p-3 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>

                                            {/* Bottom Section: Title and Date */}
                                            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-6">
                                                <h3 className="font-bold text-lg sm:text-2xl text-white line-clamp-2 mb-2 sm:mb-3 group-hover:text-primary/90 transition-colors" title={post.title}>
                                                    {post.title}
                                                </h3>
                                                <div className="flex items-center justify-between text-white/90">
                                                    <div className="flex items-center">
                                                        <Calendar size={12} className="sm:hidden mr-1.5" />
                                                        <Calendar size={16} className="hidden sm:block mr-2" />
                                                        <span className="text-xs sm:text-sm font-medium">
                                                            {new Date(post.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    {post.status === 'published' && (
                                                        <div title="Published">
                                                            <Globe size={14} className="sm:hidden text-green-400" />
                                                            <Globe size={16} className="hidden sm:block text-green-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quick Preview Modal - Mobile optimized */}
                        {previewPost && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setPreviewPost(null)}>
                                <div
                                    className="bg-card w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up sm:animate-fade-in"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div className="sticky top-0 bg-card border-b border-border px-4 py-3 sm:p-4 flex items-center justify-between z-10 shrink-0">
                                        {/* Mobile drag indicator */}
                                        <div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full" />

                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="font-bold text-base sm:text-lg line-clamp-1">{previewPost.title}</h3>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                                {new Date(previewPost.updatedAt).toLocaleDateString()} • {previewPost.status}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                            <button
                                                onClick={() => {
                                                    handleEdit(previewPost);
                                                    setPreviewPost(null);
                                                }}
                                                className="px-2.5 py-1.5 sm:px-3 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setPreviewPost(null)}
                                                className="p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors"
                                            >
                                                <XIcon size={18} className="sm:hidden" />
                                                <XIcon size={20} className="hidden sm:block" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content - scrollable */}
                                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                        {previewPost.featuredImage && (
                                            <img
                                                src={previewPost.featuredImage}
                                                alt={previewPost.title}
                                                className="w-full rounded-lg mb-4 sm:mb-6"
                                            />
                                        )}
                                        {previewPost.excerpt && (
                                            <p className="text-sm sm:text-base text-muted-foreground italic mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border">
                                                {previewPost.excerpt}
                                            </p>
                                        )}
                                        <div
                                            className="prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewPost.content) }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bulk Actions Bar - Mobile optimized */}
                        {selectedPosts.length > 0 && (
                            <div className="fixed bottom-4 sm:bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto bg-card border border-border rounded-xl shadow-2xl p-3 sm:p-4 flex items-center justify-between sm:justify-start gap-3 sm:gap-4 z-50 animate-fade-in-up">
                                <span className="text-xs sm:text-sm font-medium text-foreground">
                                    {selectedPosts.length} {t('common.selected', 'seleccionados')}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-2.5 sm:px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 size={12} /> <span className="hidden sm:inline">{t('common.delete', 'Eliminar')}</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedPosts([])}
                                        className="px-2.5 sm:px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                                    >
                                        {t('common.cancel', 'Cancelar')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {/* Single Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirmId}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                title={t('cms.confirmDeleteTitle', '¿Eliminar artículo?')}
                message={t('cms.confirmDeleteMessage', 'Esta acción no se puede deshacer. El artículo será eliminado permanentemente.')}
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={bulkDeleteConfirm}
                onConfirm={confirmBulkDelete}
                onCancel={() => setBulkDeleteConfirm(false)}
                title={t('cms.confirmBulkDeleteTitle', '¿Eliminar artículos?')}
                message={t('cms.confirmBulkDeleteMessage', { count: selectedPosts.length, defaultValue: `Se eliminarán ${selectedPosts.length} artículo(s) permanentemente.` })}
                variant="danger"
                isLoading={isDeleting}
                count={selectedPosts.length}
            />
        </div>
    );
};

export default CMSDashboard;
