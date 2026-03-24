
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
import { Menu, Plus, Search, FileText, Edit3, Trash2, Loader2, Calendar, Globe, PenTool, ArrowDown, ArrowUp, Grid, List, Eye, X as XIcon, Copy, Edit2, Download, Sparkles, ArrowLeft, ChevronDown, Check, Tag, FolderOpen, GripVertical, ArrowUpDown } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { CMSPost, CMSCategory } from '../../types';
import { sanitizeHtml } from '../../utils/sanitize';

// === Drag & Drop Sortable Profile Item ===
const SortableProfileItem: React.FC<{ post: CMSPost; index: number }> = ({ post, index }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 bg-secondary/20 border rounded-xl transition-colors mb-2 ${isDragging ? 'border-primary shadow-lg' : 'border-border hover:border-primary/30'}`}
        >
            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                className="p-1 rounded-lg cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary touch-none flex-shrink-0"
            >
                <GripVertical size={16} />
            </button>

            {/* Position number */}
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                {index + 1}
            </span>

            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                {post.featuredImage ? (
                    <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <FileText size={16} className="text-muted-foreground opacity-30" />
                    </div>
                )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{post.title}</p>
                <p className="text-[10px] text-muted-foreground">
                    {post.status === 'published' ? '● Publicado' : '○ Borrador'}
                </p>
            </div>
        </div>
    );
};

const ProfileDragList: React.FC<{ posts: CMSPost[]; onDragEnd: (event: DragEndEvent) => void }> = ({ posts, onDragEnd }) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={posts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {posts.map((post, index) => (
                    <SortableProfileItem key={post.id} post={post} index={index} />
                ))}
            </SortableContext>
        </DndContext>
    );
};

const CMSDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useRouter();
    const { cmsPosts, loadCMSPosts, deleteCMSPost, saveCMSPost, hasActiveProject, activeProjectName, categories, saveCategory, deleteCategory } = useCMS();
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

    // Category filter & management
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CMSCategory | null>(null);
    const [categoryForm, setCategoryForm] = useState<{ name: string; slug: string; description: string; layoutType: 'blog' | 'gallery' | 'profile' }>({ name: '', slug: '', description: '', layoutType: 'blog' });
    const [isSavingCategory, setIsSavingCategory] = useState(false);
    const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<string | null>(null);

    // Profile ordering modal
    const [showProfileOrderModal, setShowProfileOrderModal] = useState(false);

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
        console.log("📋 Dashboard: Saving AI-generated post", post);

        try {
            // 1. Save the post — this is the ONLY save (no double-save).
            //    saveCMSPost returns the Firebase-generated ID for new posts.
            const savedId = await saveCMSPost(post);
            console.log("✅ Post saved to Firestore with ID:", savedId);

            // 2. Set the real Firebase ID on the post so the editor does
            //    updateDoc (not addDoc) on subsequent saves.
            const postWithId: CMSPost = { ...post, id: savedId };

            // 3. Open the editor with the real ID
            setEditingPost(postWithId);
            setIsEditorOpen(true);
        } catch (error) {
            console.error("❌ Error saving AI post:", error);
            // Still open the editor so the user doesn't lose their content
            setEditingPost(post);
            setIsEditorOpen(true);
        }
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

            // Filtro de categoría
            if (categoryFilter !== 'all') {
                if (categoryFilter === 'uncategorized') {
                    if (post.categoryId) return false;
                } else if (post.categoryId !== categoryFilter) {
                    return false;
                }
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
    }, [cmsPosts, searchQuery, statusFilter, sortBy, sortOrder, dateRange, categoryFilter]);

    // Detect if we're filtering by a profile-type category (for reorder UI)
    const activeProfileCategory = useMemo(() => {
        if (categoryFilter === 'all' || categoryFilter === 'uncategorized') return null;
        const cat = categories.find(c => c.id === categoryFilter);
        return cat?.layoutType === 'profile' ? cat : null;
    }, [categoryFilter, categories]);

    // Reorder handler for profile categories (drag-and-drop)
    const handleProfileDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !activeProfileCategory) return;

        const categoryPosts = cmsPosts
            .filter(p => p.categoryId === activeProfileCategory.id)
            .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

        const oldIndex = categoryPosts.findIndex(p => p.id === active.id);
        const newIndex = categoryPosts.findIndex(p => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(categoryPosts, oldIndex, newIndex);

        // Batch-save all new sortOrder values
        try {
            await Promise.all(
                reordered.map((post, i) => saveCMSPost({ ...post, sortOrder: i }))
            );
            // Refresh posts to reflect new order
            loadCMSPosts();
        } catch (e) {
            console.error('[CMSDashboard] Error reordering profiles:', e);
        }
    };

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

                        {/* Barra de Filtros - Icons only, no boxes */}
                        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide">
                            {/* Select All Checkbox */}
                            {filteredAndSortedPosts.length > 0 && (
                                <label
                                    className="flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                                    title={t('cms.selectAll', 'Seleccionar todos')}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPosts.length === filteredAndSortedPosts.length && filteredAndSortedPosts.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-border w-3.5 h-3.5 accent-primary"
                                    />
                                    {selectedPosts.length > 0 && (
                                        <span className="text-[10px] font-semibold text-primary">
                                            {selectedPosts.length}
                                        </span>
                                    )}
                                </label>
                            )}

                            <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">
                                {filteredAndSortedPosts.length}/{cmsPosts.length}
                            </span>

                            {/* Icon-only filter selects — no boxes */}
                            <div className="relative flex-shrink-0 cursor-pointer" title={t('cms.filters.allStatus', 'Estado')}>
                                <Globe size={15} className={`pointer-events-none transition-colors ${statusFilter !== 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                    <option value="all">{t('cms.filters.allStatus', 'Todos')}</option>
                                    <option value="published">{t('cms.filters.published', 'Publicados')}</option>
                                    <option value="draft">{t('cms.filters.draft', 'Borradores')}</option>
                                </select>
                            </div>

                            <div className="relative flex-shrink-0 cursor-pointer" title={t('cms.filters.allTime', 'Fecha')}>
                                <Calendar size={15} className={`pointer-events-none transition-colors ${dateRange !== 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value as any)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                    <option value="all">{t('cms.filters.allTime', 'Todo')}</option>
                                    <option value="today">{t('cms.filters.today', 'Hoy')}</option>
                                    <option value="week">{t('cms.filters.last7Days', '7 días')}</option>
                                    <option value="month">{t('cms.filters.last30Days', '30 días')}</option>
                                </select>
                            </div>

                            {/* Category filter */}
                            {categories.length > 0 && (
                                <div className="relative flex-shrink-0 cursor-pointer" title={t('cms.filters.category', 'Categoría')}>
                                    <Tag size={15} className={`pointer-events-none transition-colors ${categoryFilter !== 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    >
                                        <option value="all">{t('cms.filters.allCategories', 'Todas')}</option>
                                        <option value="uncategorized">{t('cms.filters.uncategorized', t('cms.uncategorized'))}</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Order Profiles button — only when profile category is active */}
                            {activeProfileCategory && (
                                <button
                                    onClick={() => setShowProfileOrderModal(true)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary text-xs font-bold transition-all flex-shrink-0"
                                    title={t('cms.orderProfiles', 'Ordenar Perfiles')}
                                >
                                    <ArrowUpDown size={13} />
                                    <span className="hidden sm:inline">{t('cms.orderProfiles', 'Ordenar Perfiles')}</span>
                                </button>
                            )}

                            {/* Manage Categories button */}
                            <button
                                onClick={() => { setShowCategoryManager(true); setEditingCategory(null); setCategoryForm({ name: '', slug: '', description: '', layoutType: 'blog' }); }}
                                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                title={t('cms.manageCategories', 'Gestionar Categorías')}
                            >
                                <FolderOpen size={15} />
                            </button>

                            <div className="relative flex-shrink-0 cursor-pointer" title={t('cms.filters.sortByDate', 'Ordenar')}>
                                <ChevronDown size={15} className="pointer-events-none text-muted-foreground hover:text-foreground transition-colors" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                    <option value="date">{t('cms.filters.sortByDate', 'Fecha')}</option>
                                    <option value="title">{t('cms.filters.sortByTitle', 'Título')}</option>
                                </select>
                            </div>

                            {/* Clear filters */}
                            {(statusFilter !== 'all' || dateRange !== 'all' || categoryFilter !== 'all') && (
                                <button
                                    onClick={() => { setStatusFilter('all'); setDateRange('all'); setCategoryFilter('all'); }}
                                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                    title={t('common.clear', 'Limpiar filtros')}
                                >
                                    <XIcon size={13} />
                                </button>
                            )}

                            {/* Spacer */}
                            <div className="flex-1 min-w-0" />

                            {/* Orden asc/desc */}
                            <button
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                            >
                                {sortOrder === 'desc' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                            </button>

                            {/* Vista Grid/List */}
                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`transition-colors ${viewMode === 'grid' ? 'text-editor-accent' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Grid View"
                                >
                                    <Grid size={15} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`transition-colors ${viewMode === 'list' ? 'text-editor-accent' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="List View"
                                >
                                    <List size={15} />
                                </button>
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
                                            className={`bg-card border rounded-xl p-3 active:bg-secondary/30 transition-colors ${selectedPosts.includes(post.id) ? 'border-primary bg-primary/5' : 'border-border'
                                                }`}
                                            onClick={() => handleEdit(post)}
                                        >
                                            <div className="flex gap-3">
                                                {/* Selection Checkbox - Mobile */}
                                                <div className="flex items-center flex-shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPosts.includes(post.id)}
                                                        onChange={(e) => { e.stopPropagation(); handleSelectPost(post.id); }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="rounded border-border w-4 h-4 accent-primary"
                                                    />
                                                </div>
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
                                        className={`group relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl sm:hover:scale-[1.02] h-[280px] sm:h-[400px] ${selectedPosts.includes(post.id) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                                            }`}
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

                                            {/* Selection Checkbox - Grid View */}
                                            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30">
                                                <label
                                                    className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 cursor-pointer transition-all backdrop-blur-md shadow-lg ${selectedPosts.includes(post.id)
                                                        ? 'bg-primary border-primary text-primary-foreground'
                                                        : 'bg-black/30 border-white/50 text-transparent hover:border-white hover:bg-black/50 sm:opacity-0 sm:group-hover:opacity-100'
                                                        }`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPosts.includes(post.id)}
                                                        onChange={() => handleSelectPost(post.id)}
                                                        className="sr-only"
                                                    />
                                                    {selectedPosts.includes(post.id) && (
                                                        <Check size={14} className="text-primary-foreground" />
                                                    )}
                                                </label>
                                            </div>

                                            {/* Top Section: Status Badge */}
                                            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
                                                <span className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md sm:rounded-lg border backdrop-blur-md shadow-lg ${post.status === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                                                    {post.status}
                                                </span>
                                            </div>

                                            {/* Mobile: Always visible quick actions at top right, below checkbox */}
                                            <div className="sm:hidden absolute top-12 right-3 z-20 flex flex-col gap-1">
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

                                            {/* Bottom Section: Title, Category Badge, and Date */}
                                            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-6">
                                                {post.categoryId && categories.find(c => c.id === post.categoryId) && (
                                                    <span className="inline-block px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-primary/20 text-primary border border-primary/30 rounded-md mb-2 backdrop-blur-sm">
                                                        {categories.find(c => c.id === post.categoryId)?.name}
                                                    </span>
                                                )}
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

                    </div>
                </main>
            </div>

            {/* Floating Bulk Actions Bar - above global assistant */}
            {selectedPosts.length > 0 && (
                <div className="fixed bottom-[106px] left-1/2 -translate-x-1/2 z-[99998]" style={{ animation: 'slideUp 0.3s ease-out' }}>
                    <div className="bg-card border border-border rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 backdrop-blur-xl">
                        <span className="text-sm font-bold text-foreground whitespace-nowrap">
                            {selectedPosts.length} {t('common.selected', 'seleccionados')}
                        </span>
                        <div className="w-px h-6 bg-border" />
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 text-sm font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
                        >
                            <Trash2 size={14} /> {t('common.delete', 'Eliminar')}
                        </button>
                        <button
                            onClick={() => setSelectedPosts([])}
                            className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-all"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                    </div>
                </div>
            )}

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

            {/* Profile Ordering Modal — Drag and Drop */}
            {showProfileOrderModal && activeProfileCategory && (() => {
                const profilePosts = cmsPosts
                    .filter(p => p.categoryId === activeProfileCategory.id)
                    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowProfileOrderModal(false)}>
                        <div
                            className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col animate-slide-up sm:animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10 shrink-0">
                                <div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full" />
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <ArrowUpDown size={20} className="text-primary" />
                                    {t('cms.orderProfiles', 'Ordenar Perfiles')}
                                </h3>
                                <button onClick={() => setShowProfileOrderModal(false)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                    <XIcon size={18} />
                                </button>
                            </div>

                            {/* Subtitle */}
                            <div className="px-5 py-3 bg-secondary/30 border-b border-border">
                                <p className="text-xs text-muted-foreground">
                                    {t('cms.orderProfilesDragDesc', 'Arrastra y suelta los perfiles para reorganizar el orden en que aparecen en tu sitio.')}
                                </p>
                            </div>

                            {/* Drag & Drop Sortable List */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {profilePosts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">{t('cms.noProfilePosts', 'No hay perfiles en esta categoría.')}</p>
                                ) : (
                                    <ProfileDragList posts={profilePosts} onDragEnd={handleProfileDragEnd} />
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Category Manager Modal */}
            {showCategoryManager && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowCategoryManager(false)}>
                    <div
                        className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up sm:animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10 shrink-0">
                            <div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full" />
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FolderOpen size={20} className="text-primary" />
                                {t('cms.categoriesTitle', 'Categorías')}
                            </h3>
                            <button onClick={() => setShowCategoryManager(false)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                <XIcon size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* Category Form */}
                            <div className="space-y-3 p-4 bg-secondary/30 border border-border rounded-xl">
                                <h4 className="text-sm font-bold text-foreground">
                                    {editingCategory ? t('cms.editCategory', 'Editar Categoría') : t('cms.newCategory', 'Nueva Categoría')}
                                </h4>
                                <input
                                    value={categoryForm.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setCategoryForm(prev => ({
                                            ...prev,
                                            name,
                                            slug: editingCategory ? prev.slug : name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                                        }));
                                    }}
                                    placeholder={t('cms.categoryName', 'Nombre de la categoría')}
                                    className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                />
                                <input
                                    value={categoryForm.slug}
                                    onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="slug"
                                    className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground font-mono"
                                />
                                <textarea
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder={t('cms.categoryDescription', 'Descripción (opcional)')}
                                    rows={2}
                                    className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground"
                                />
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">
                                        {t('cms.categoryLayout', 'Estilo de Diseño (Layout)')}
                                    </label>
                                    <select
                                        value={categoryForm.layoutType}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, layoutType: e.target.value as 'blog' | 'gallery' | 'profile' }))}
                                        className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none text-foreground"
                                    >
                                        <option value="blog">{t('cms.layouts.blog', 'Blog Estándar')}</option>
                                        <option value="gallery">{t('cms.layouts.gallery', 'Galería (Masonry)')}</option>
                                        <option value="profile">{t('cms.layouts.profile', 'Directorio de Perfiles')}</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            if (!categoryForm.name.trim()) return;
                                            setIsSavingCategory(true);
                                            try {
                                                const now = new Date().toISOString();
                                                const cat: CMSCategory = {
                                                    id: editingCategory?.id || `cat_${Date.now()}`,
                                                    name: categoryForm.name.trim(),
                                                    slug: categoryForm.slug.trim() || categoryForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                                                    description: categoryForm.description.trim() || undefined,
                                                    layoutType: categoryForm.layoutType,
                                                    createdAt: editingCategory?.createdAt || now,
                                                    updatedAt: now,
                                                };
                                                await saveCategory(cat);
                                                setCategoryForm({ name: '', slug: '', description: '', layoutType: 'blog' });
                                                setEditingCategory(null);
                                            } catch (e) {
                                                console.error('Error saving category:', e);
                                            } finally {
                                                setIsSavingCategory(false);
                                            }
                                        }}
                                        disabled={!categoryForm.name.trim() || isSavingCategory}
                                        className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {isSavingCategory ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                        {editingCategory ? t('common.save', 'Guardar') : t('common.create', 'Crear')}
                                    </button>
                                    {editingCategory && (
                                        <button
                                            onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', slug: '', description: '', layoutType: 'blog' }); }}
                                            className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
                                        >
                                            {t('common.cancel', 'Cancelar')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Category List */}
                            {categories.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">{t('cms.noCategories', 'No hay categorías creadas.')}</p>
                            ) : (
                                <div className="space-y-2">
                                    {categories.map(cat => {
                                        const postCount = cmsPosts.filter(p => p.categoryId === cat.id).length;
                                        return (
                                            <div key={cat.id} className="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-xl hover:border-primary/30 transition-colors group">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Tag size={14} className="text-primary flex-shrink-0" />
                                                        <span className="font-semibold text-sm text-foreground truncate">{cat.name}</span>
                                                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md flex-shrink-0">
                                                            {postCount} {postCount === 1 ? 'post' : 'posts'}
                                                        </span>
                                                    </div>
                                                    {cat.description && (
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 pl-[22px]">{cat.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            setEditingCategory(cat);
                                                            setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description || '', layoutType: cat.layoutType || 'blog' });
                                                        }}
                                                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteCategoryConfirmId(cat.id)}
                                                        className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Category Delete Confirmation Modal — rendered AFTER category manager so it appears on top */}
            <ConfirmationModal
                isOpen={!!deleteCategoryConfirmId}
                onConfirm={async () => {
                    if (deleteCategoryConfirmId) {
                        await deleteCategory(deleteCategoryConfirmId);
                        setDeleteCategoryConfirmId(null);
                    }
                }}
                onCancel={() => setDeleteCategoryConfirmId(null)}
                title={t('cms.confirmDeleteCategoryTitle', '¿Eliminar categoría?')}
                message={t('cms.confirmDeleteCategoryMessage', 'Esta acción no se puede deshacer. La categoría será eliminada permanentemente.')}
                variant="danger"
            />
        </div>
    );
};

export default CMSDashboard;
