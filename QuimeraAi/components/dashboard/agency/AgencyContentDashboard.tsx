/**
 * AgencyContentDashboard
 * Panel de gestión de contenido para la Landing de Agency (tenant-scoped)
 * Adaptado del ContentManagementDashboard del Admin
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyContent } from '../../../contexts/agency/AgencyContentContext';
import AgencyArticleEditor from './AgencyArticleEditor';
import AgencyLegalPageEditor from './AgencyLegalPageEditor';
import AgencyContentCreatorAssistant from './AgencyContentCreatorAssistant';
import {
    Plus,
    Search,
    FileText,
    Edit3,
    Trash2,
    Loader2,
    Calendar,
    Globe,
    PenTool,
    ArrowDown,
    ArrowUp,
    Grid,
    List,
    Eye,
    X as XIcon,
    Copy,
    Edit2,
    Download,
    Sparkles,
    ArrowLeft,
    Star,
    Shield,
    Lock,
    Tag,
    Clock,
    Menu
} from 'lucide-react';
import { AgencyArticle, AgencyArticleCategory, AgencyLegalPageType, AGENCY_LEGAL_PAGE_LABELS } from '../../../types/agencyContent';
import { sanitizeHtml } from '../../../utils/sanitize';

interface AgencyContentDashboardProps {
    onBack: () => void;
}

const CATEGORY_LABELS: Record<AgencyArticleCategory, string> = {
    'blog': 'Blog',
    'news': 'Noticias',
    'services': 'Servicios',
    'case-study': 'Caso de Éxito',
    'announcement': 'Anuncio',
    'portfolio': 'Portfolio',
    'testimonial': 'Testimonial',
    'about': 'Sobre Nosotros'
};

const AgencyContentDashboard: React.FC<AgencyContentDashboardProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { articles, isLoadingArticles, loadArticles, deleteArticle, saveArticle, legalPages } = useAgencyContent();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<AgencyArticle | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Tab state: 'articles' or 'legal'
    const [activeTab, setActiveTab] = useState<'articles' | 'legal'>('articles');

    // Legal page editor
    const [editingLegalPageType, setEditingLegalPageType] = useState<AgencyLegalPageType | null>(null);

    // Filter and view states (same as user CMS)
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [categoryFilter, setCategoryFilter] = useState<'all' | AgencyArticleCategory>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'views'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // Quick preview
    const [previewArticle, setPreviewArticle] = useState<AgencyArticle | null>(null);

    // Bulk actions
    const [selectedArticles, setSelectedArticles] = useState<string[]>([]);

    // AI Assistant
    const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

    // Delete confirmation modal
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await loadArticles();
            setIsLoading(false);
        };
        init();
    }, []);

    const handleCreateNew = () => {
        setEditingArticle(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (article: AgencyArticle) => {
        setEditingArticle(article);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id: string) => {
        console.log('[AgencyContentDashboard] Opening delete confirmation for id:', id);
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;

        console.log('[AgencyContentDashboard] User confirmed deletion via modal, calling deleteArticle...');
        setIsDeleting(true);

        try {
            await deleteArticle(deleteConfirmId);
            console.log('[AgencyContentDashboard] ✅ Article deleted successfully');
            await loadArticles();
        } catch (error) {
            console.error('[AgencyContentDashboard] ❌ Error deleting article:', error);
            alert('Error al eliminar el artículo. Revisa la consola para más detalles.');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const cancelDelete = () => {
        console.log('[AgencyContentDashboard] User cancelled deletion via modal');
        setDeleteConfirmId(null);
    };

    const handleDuplicate = async (article: AgencyArticle) => {
        const duplicatedArticle: AgencyArticle = {
            ...article,
            id: '',
            title: `${article.title} (Copia)`,
            slug: `${article.slug}-copy-${Date.now()}`,
            status: 'draft',
            featured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: undefined,
            views: 0,
        };
        await saveArticle(duplicatedArticle);
        await loadArticles();
    };

    const handleQuickPreview = (article: AgencyArticle) => {
        setPreviewArticle(article);
    };

    // AI Assistant handlers
    const handleAiCreate = () => {
        setIsAiAssistantOpen(true);
    };

    const handleArticleCreatedFromAi = async (article: AgencyArticle) => {
        setIsAiAssistantOpen(false);
        console.log("📋 Dashboard: Article created from AI, searching by slug:", article.slug);

        // Wait for the onSnapshot to update the articles list with the new article
        // We poll for the article to appear in the list (max 3 seconds)
        let foundArticle: AgencyArticle | undefined;
        const maxAttempts = 6;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            // The articles state is updated by onSnapshot, so we need to check the current state
            foundArticle = articles.find(a => a.slug === article.slug);
            if (foundArticle && foundArticle.id) {
                console.log("✅ Found created article with ID:", foundArticle.id);
                break;
            }
        }

        if (foundArticle && foundArticle.id) {
            setEditingArticle(foundArticle);
        } else {
            console.warn("⚠️ Could not find created article after waiting, article may have been created. Reloading list.");
            // Force reload and try once more
            await loadArticles();
            await new Promise(resolve => setTimeout(resolve, 300));
            const reloadedArticle = articles.find(a => a.slug === article.slug);
            if (reloadedArticle && reloadedArticle.id) {
                setEditingArticle(reloadedArticle);
            } else {
                // Article was created but not found - don't open editor to avoid duplication
                console.error("❌ Article created but not found in list. Not opening editor to avoid duplication.");
                return;
            }
        }

        setIsEditorOpen(true);
    };

    // Bulk actions handlers
    const handleSelectAll = () => {
        if (selectedArticles.length === filteredAndSortedArticles.length) {
            setSelectedArticles([]);
        } else {
            setSelectedArticles(filteredAndSortedArticles.map(a => a.id));
        }
    };

    const handleSelectArticle = (id: string) => {
        setSelectedArticles(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        setBulkDeleteConfirm(true);
    };

    const confirmBulkDelete = async () => {
        setIsDeleting(true);
        try {
            await Promise.all(selectedArticles.map(id => deleteArticle(id)));
            setSelectedArticles([]);
            await loadArticles();
        } catch (error) {
            console.error('Error deleting articles:', error);
        } finally {
            setIsDeleting(false);
            setBulkDeleteConfirm(false);
        }
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(articles, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `app-articles-export-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Advanced filtering and sorting with useMemo
    const filteredAndSortedArticles = useMemo(() => {
        let result = articles.filter(article => {
            // Search
            const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            // Status filter
            if (statusFilter !== 'all' && article.status !== statusFilter) return false;

            // Category filter
            if (categoryFilter !== 'all' && article.category !== categoryFilter) return false;

            // Date range filter
            if (dateRange !== 'all') {
                const articleDate = new Date(article.updatedAt);
                const now = new Date();
                const daysDiff = Math.floor((now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24));

                if (dateRange === 'today' && daysDiff > 0) return false;
                if (dateRange === 'week' && daysDiff > 7) return false;
                if (dateRange === 'month' && daysDiff > 30) return false;
            }

            return true;
        });

        // Sorting
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'date':
                    comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'views':
                    comparison = (b.views || 0) - (a.views || 0);
                    break;
            }

            return sortOrder === 'desc' ? comparison : -comparison;
        });

        return result;
    }, [articles, searchQuery, statusFilter, categoryFilter, sortBy, sortOrder, dateRange]);

    // Metrics
    const metrics = useMemo(() => ({
        total: articles.length,
        published: articles.filter(a => a.status === 'published').length,
        drafts: articles.filter(a => a.status === 'draft').length,
        featured: articles.filter(a => a.featured).length,
    }), [articles]);

    // Article Editor view - Using Modern Editor (same as user CMS)
    if (isEditorOpen) {
        return (
            <AgencyArticleEditor
                article={editingArticle}
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditingArticle(null);
                    loadArticles();
                }}
            />
        );
    }

    // Legal Page Editor view
    if (editingLegalPageType) {
        return (
            <AgencyLegalPageEditor
                pageType={editingLegalPageType}
                onClose={() => setEditingLegalPageType(null)}
            />
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* AI Assistant Modal */}
            {isAiAssistantOpen && (
                <AgencyContentCreatorAssistant
                    onClose={() => setIsAiAssistantOpen(false)}
                    onArticleCreated={handleArticleCreatedFromAi}
                />
            )}


            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Standardized Header - Same as user CMS */}
                <header className="h-14 border-b border-border flex items-center bg-background z-20 sticky top-0">
                    {/* Left Section */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-xl transition-colors touch-manipulation">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <PenTool className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground hidden sm:block">{t('contentManagement.title', 'Gestor de Contenido')}</h1>
                        </div>

                        {/* Badge */}
                        <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-full">
                            Landing Pública
                        </span>
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
                        {/* Mobile Search - Expandable */}
                        <div className="md:hidden">
                            {isMobileSearchOpen ? (
                                <div className="absolute left-0 right-0 top-full bg-background border-b border-border p-3 flex items-center gap-2 animate-slide-down z-30">
                                    <div className="flex items-center gap-2 flex-1 bg-muted/50 rounded-lg px-3 py-2">
                                        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder={t('contentManagement.searchArticles', 'Buscar artículos...')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="flex-1 bg-transparent outline-none text-sm min-w-0 text-foreground"
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsMobileSearchOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
                                    >
                                        <XIcon size={18} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsMobileSearchOpen(true)}
                                    className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Export Button - Desktop only */}
                        {articles.length > 0 && (
                            <button
                                onClick={handleExport}
                                className="hidden sm:flex items-center justify-center h-9 w-9 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Exportar artículos"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}

                        {/* AI Create Button - Mobile compact */}
                        <button
                            onClick={handleAiCreate}
                            className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-bold transition-all text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30"
                        >
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{t('contentManagement.createWithAI', 'Crear con IA')}</span>
                            <span className="sm:hidden">IA</span>
                        </button>

                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all bg-primary text-primary-foreground hover:opacity-90"
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">{t('contentManagement.newArticle', 'Nuevo Artículo')}</span>
                        </button>

                        {/* Back Button */}
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto scroll-smooth">
                    <div className="h-full space-y-4 sm:space-y-6">

                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-border">
                            <button
                                onClick={() => setActiveTab('articles')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'articles'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <FileText size={14} className="inline mr-2" />
                                Artículos ({articles.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('legal')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'legal'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Shield size={14} className="inline mr-2" />
                                Páginas Legales
                            </button>
                        </div>

                        {/* Legal Pages Tab Content */}
                        {activeTab === 'legal' && (
                            <div className="space-y-6">
                                {/* Legal Pages Info */}
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Shield className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground mb-1">
                                                Páginas Legales para Meta OAuth
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                Estas páginas son requeridas para la integración con Facebook, Instagram y WhatsApp.
                                                Asegúrate de publicarlas antes de enviar tu app para revisión en Meta.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Legal Pages Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(['privacy-policy', 'data-deletion', 'terms-of-service', 'cookie-policy'] as AgencyLegalPageType[]).map(pageType => {
                                        const page = legalPages.find(p => p.type === pageType);
                                        const isPublished = page?.status === 'published';

                                        return (
                                            <div
                                                key={pageType}
                                                className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isPublished ? 'bg-green-500/10' : 'bg-secondary'}`}>
                                                            {pageType === 'privacy-policy' ? <Lock size={20} className={isPublished ? 'text-green-500' : 'text-muted-foreground'} /> :
                                                                pageType === 'data-deletion' ? <Trash2 size={20} className={isPublished ? 'text-green-500' : 'text-muted-foreground'} /> :
                                                                    <FileText size={20} className={isPublished ? 'text-green-500' : 'text-muted-foreground'} />}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold">{AGENCY_LEGAL_PAGE_LABELS[pageType]}</h3>
                                                            <p className="text-xs text-muted-foreground">/{pageType}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${isPublished
                                                        ? 'bg-green-500/10 text-green-600'
                                                        : 'bg-orange-500/10 text-orange-600'
                                                        }`}>
                                                        {isPublished ? 'Publicado' : 'Borrador'}
                                                    </span>
                                                </div>

                                                {page && (
                                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                        {page.subtitle || `${page.sections.length} secciones`}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingLegalPageType(pageType)}
                                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                                    >
                                                        <Edit3 size={14} />
                                                        Editar
                                                    </button>
                                                    <a
                                                        href={`/${pageType}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 text-foreground text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
                                                    >
                                                        <Eye size={14} />
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Meta URLs Info */}
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <Globe size={18} className="text-primary" />
                                        URLs para Meta Developer Console
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                                            <div>
                                                <span className="text-sm font-medium">Privacy Policy URL</span>
                                                <p className="text-xs text-muted-foreground">Para Facebook, Instagram, WhatsApp</p>
                                            </div>
                                            <code className="px-2 py-1 bg-secondary/50 rounded text-xs">
                                                https://quimera.ai/privacy-policy
                                            </code>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                                            <div>
                                                <span className="text-sm font-medium">Data Deletion URL</span>
                                                <p className="text-xs text-muted-foreground">Requerido por Meta</p>
                                            </div>
                                            <code className="px-2 py-1 bg-secondary/50 rounded text-xs">
                                                https://quimera.ai/data-deletion
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Articles Tab Content */}
                        {activeTab === 'articles' && (
                            <>
                                {/* Metrics - Unified responsive design (same as user CMS) */}
                                {articles.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        {/* Total Articles */}
                                        <div className="group relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                                            <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                                            <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/15 flex items-center justify-center mx-auto sm:mx-0">
                                                    <FileText className="text-primary" size={16} />
                                                </div>
                                                <div className="text-center sm:text-left">
                                                    <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{metrics.total}</p>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('contentManagement.totalArticles', 'Total Artículos')}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Published */}
                                        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5">
                                            <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
                                            <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/15 flex items-center justify-center mx-auto sm:mx-0">
                                                    <Globe className="text-emerald-500" size={16} />
                                                </div>
                                                <div className="text-center sm:text-left">
                                                    <p className="text-xl sm:text-2xl font-bold text-emerald-500 tracking-tight">{metrics.published}</p>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('contentManagement.published', 'Publicados')}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Drafts */}
                                        <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5">
                                            <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
                                            <div className="relative flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/15 flex items-center justify-center mx-auto sm:mx-0">
                                                    <Edit3 className="text-amber-500" size={16} />
                                                </div>
                                                <div className="text-center sm:text-left">
                                                    <p className="text-xl sm:text-2xl font-bold text-amber-500 tracking-tight">{metrics.drafts}</p>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('contentManagement.drafts', 'Borradores')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Filter Bar */}
                                <div className="space-y-3">
                                    {/* Top row - Count and view toggles */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-3 py-1.5 bg-secondary/50 text-xs rounded-full text-muted-foreground font-medium">
                                                {filteredAndSortedArticles.length} de {articles.length}
                                            </span>

                                            {/* Active filters indicator */}
                                            {(statusFilter !== 'all' || categoryFilter !== 'all' || dateRange !== 'all') && (
                                                <button
                                                    onClick={() => {
                                                        setStatusFilter('all');
                                                        setCategoryFilter('all');
                                                        setDateRange('all');
                                                    }}
                                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                                >
                                                    <XIcon size={12} /> {t('common.clear', 'Limpiar')}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* Sort order asc/desc */}
                                            <button
                                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-border/40"
                                                title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                                            >
                                                {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                                            </button>

                                            {/* View Grid/List */}
                                            <div className="flex gap-0.5 sm:gap-1">
                                                <button
                                                    onClick={() => setViewMode('grid')}
                                                    className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                                    title="Vista en cuadrícula"
                                                >
                                                    <Grid size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('list')}
                                                    className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                                    title="Vista en lista"
                                                >
                                                    <List size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filters row - Horizontal scroll on mobile */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide">
                                        {/* Status filter */}
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as any)}
                                            className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none flex-shrink-0"
                                        >
                                            <option value="all">{t('contentManagement.filters.allStatus', 'Todos los estados')}</option>
                                            <option value="published">{t('contentManagement.filters.published', 'Publicados')}</option>
                                            <option value="draft">{t('contentManagement.filters.draft', 'Borradores')}</option>
                                        </select>

                                        {/* Category filter */}
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value as any)}
                                            className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none flex-shrink-0"
                                        >
                                            <option value="all">{t('contentManagement.filters.allCategories', 'Todas las categorías')}</option>
                                            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>

                                        {/* Date range filter */}
                                        <select
                                            value={dateRange}
                                            onChange={(e) => setDateRange(e.target.value as any)}
                                            className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none flex-shrink-0"
                                        >
                                            <option value="all">{t('contentManagement.filters.allTime', 'Todo el tiempo')}</option>
                                            <option value="today">{t('contentManagement.filters.today', 'Hoy')}</option>
                                            <option value="week">{t('contentManagement.filters.last7Days', 'Últimos 7 días')}</option>
                                            <option value="month">{t('contentManagement.filters.last30Days', 'Últimos 30 días')}</option>
                                        </select>

                                        {/* Sort by */}
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none flex-shrink-0"
                                        >
                                            <option value="date">{t('contentManagement.filters.sortByDate', 'Ordenar por fecha')}</option>
                                            <option value="title">{t('contentManagement.filters.sortByTitle', 'Ordenar por título')}</option>
                                            <option value="views">{t('contentManagement.filters.sortByViews', 'Ordenar por vistas')}</option>
                                        </select>
                                    </div>
                                </div>

                                {isLoading ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="animate-spin w-10 h-10 text-primary" />
                                    </div>
                                ) : filteredAndSortedArticles.length === 0 ? (
                                    <div className="text-center py-16 bg-card/30 rounded-3xl border border-dashed border-border/50">
                                        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText size={32} className="text-muted-foreground opacity-50" />
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground mb-2">
                                            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || dateRange !== 'all'
                                                ? t('contentManagement.noArticlesMatchFilters', 'No hay artículos que coincidan con los filtros')
                                                : t('contentManagement.noContentYet', 'Aún no hay contenido')}
                                        </h3>
                                        <p className="text-muted-foreground mb-6">
                                            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || dateRange !== 'all'
                                                ? t('contentManagement.tryAdjustingFilters', 'Intenta ajustar los filtros para ver más resultados.')
                                                : t('contentManagement.startBuildingContent', 'Comienza a crear contenido para la landing de Quimera.')}
                                        </p>
                                        <button
                                            onClick={handleCreateNew}
                                            className="text-primary font-bold hover:underline hover:opacity-80 transition-colors"
                                        >
                                            {t('contentManagement.createFirstArticle', 'Crear tu primer artículo')}
                                        </button>
                                    </div>
                                ) : viewMode === 'list' ? (
                                    /* List View - Mobile optimized */
                                    <>
                                        {/* Desktop Table View */}
                                        <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-secondary/20 border-b border-border">
                                                    <tr>
                                                        <th className="p-4 text-left w-12">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedArticles.length === filteredAndSortedArticles.length && filteredAndSortedArticles.length > 0}
                                                                onChange={handleSelectAll}
                                                                className="rounded border-border"
                                                            />
                                                        </th>
                                                        <th className="p-4 text-left text-xs font-medium text-muted-foreground">{t('contentManagement.table.title', 'Título')}</th>
                                                        <th className="p-4 text-left text-xs font-medium text-muted-foreground">{t('contentManagement.table.category', 'Categoría')}</th>
                                                        <th className="p-4 text-left text-xs font-medium text-muted-foreground">{t('contentManagement.table.status', 'Estado')}</th>
                                                        <th className="p-4 text-left text-xs font-medium text-muted-foreground">{t('contentManagement.table.date', 'Fecha')}</th>
                                                        <th className="p-4 text-left text-xs font-medium text-muted-foreground w-32">{t('contentManagement.table.actions', 'Acciones')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {filteredAndSortedArticles.map(article => (
                                                        <tr key={article.id} className="hover:bg-secondary/30 transition-colors group">
                                                            <td className="p-4">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedArticles.includes(article.id)}
                                                                    onChange={() => handleSelectArticle(article.id)}
                                                                    className="rounded border-border"
                                                                />
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 rounded overflow-hidden bg-secondary flex-shrink-0">
                                                                        {article.featuredImage ? (
                                                                            <img src={article.featuredImage} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center">
                                                                                <FileText size={20} className="text-muted-foreground opacity-30" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="overflow-hidden">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-semibold text-sm text-foreground line-clamp-1">{article.title}</p>
                                                                            {article.featured && (
                                                                                <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground line-clamp-1">{article.excerpt || t('contentManagement.noExcerpt', 'Sin extracto')}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-secondary/50 rounded-full">
                                                                    <Tag size={10} />
                                                                    {CATEGORY_LABELS[article.category]}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${article.status === 'published'
                                                                    ? 'bg-green-500/10 text-green-500'
                                                                    : 'bg-yellow-500/10 text-yellow-500'
                                                                    }`}>
                                                                    {article.status === 'published' ? 'Publicado' : 'Borrador'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-sm text-muted-foreground">
                                                                <div>{new Date(article.updatedAt).toLocaleDateString()}</div>
                                                                {article.readTime && (
                                                                    <div className="text-xs flex items-center gap-1 mt-0.5">
                                                                        <Clock size={10} />
                                                                        {article.readTime} min
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleQuickPreview(article)}
                                                                        className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-all"
                                                                        title="Vista rápida"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleEdit(article)}
                                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                                                        title="Editar"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDuplicate(article)}
                                                                        className="p-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-md transition-all"
                                                                        title="Duplicar"
                                                                    >
                                                                        <Copy size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(article.id)}
                                                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                                                        title="Eliminar"
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
                                            {filteredAndSortedArticles.map(article => (
                                                <div
                                                    key={article.id}
                                                    className="bg-card border border-border rounded-xl p-3 active:bg-secondary/30 transition-colors"
                                                    onClick={() => handleEdit(article)}
                                                >
                                                    <div className="flex gap-3">
                                                        {/* Thumbnail */}
                                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                                                            {article.featuredImage ? (
                                                                <img src={article.featuredImage} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <FileText size={24} className="text-muted-foreground opacity-30" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                                <h4 className="font-semibold text-sm text-foreground line-clamp-1">{article.title}</h4>
                                                                <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full ${article.status === 'published'
                                                                    ? 'bg-green-500/10 text-green-500'
                                                                    : 'bg-yellow-500/10 text-yellow-500'
                                                                    }`}>
                                                                    {article.status === 'published' ? 'Publicado' : 'Borrador'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{article.excerpt || t('contentManagement.noExcerpt', 'Sin extracto')}</p>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                    <Calendar size={10} />
                                                                    {new Date(article.updatedAt).toLocaleDateString()}
                                                                </span>

                                                                {/* Quick actions */}
                                                                <div className="flex items-center gap-0.5">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleQuickPreview(article); }}
                                                                        className="p-1.5 text-muted-foreground hover:text-blue-500 rounded transition-colors"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDuplicate(article); }}
                                                                        className="p-1.5 text-muted-foreground hover:text-green-500 rounded transition-colors"
                                                                    >
                                                                        <Copy size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete(article.id); }}
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
                                    /* Grid View - Mobile optimized */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                        {filteredAndSortedArticles.map(article => (
                                            <div
                                                key={article.id}
                                                className="group relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl sm:hover:scale-[1.02] h-[280px] sm:h-[400px]"
                                                onClick={() => handleEdit(article)}
                                            >
                                                {/* Full Background Image */}
                                                <div className="relative w-full h-full overflow-hidden">
                                                    {article.featuredImage ? (
                                                        <img
                                                            src={article.featuredImage}
                                                            alt={article.title}
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

                                                    {/* Top Section: Status Badge & Category */}
                                                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md sm:rounded-lg border backdrop-blur-md shadow-lg ${article.status === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                                                            {article.status === 'published' ? 'Publicado' : 'Borrador'}
                                                        </span>
                                                        {article.featured && (
                                                            <span className="px-2 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md sm:rounded-lg backdrop-blur-md">
                                                                <Star size={10} className="inline mr-0.5" />
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Mobile: Always visible quick actions at top right */}
                                                    <div className="sm:hidden absolute top-3 right-3 z-20 flex gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleQuickPreview(article); }}
                                                            className="bg-white/90 text-blue-500 p-2 rounded-full shadow-lg active:scale-95 transition-transform"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(article.id); }}
                                                            className="bg-white/90 text-red-500 p-2 rounded-full shadow-lg active:scale-95 transition-transform"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Desktop: Hover Actions Overlay */}
                                                    <div className="hidden sm:flex absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-center justify-center backdrop-blur-[2px] gap-3 z-10">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleQuickPreview(article); }}
                                                            className="bg-white text-blue-500 p-3 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                            title="Vista rápida"
                                                        >
                                                            <Eye size={20} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(article); }}
                                                            className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                            title="Editar"
                                                        >
                                                            <Edit3 size={20} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDuplicate(article); }}
                                                            className="bg-white text-green-600 p-3 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                            title="Duplicar"
                                                        >
                                                            <Copy size={20} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(article.id); }}
                                                            className="bg-white text-red-500 p-3 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>

                                                    {/* Bottom Section: Title, Category and Date */}
                                                    <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-6">
                                                        <span className="inline-block px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-white/20 text-white rounded mb-2 sm:mb-3">
                                                            {CATEGORY_LABELS[article.category]}
                                                        </span>
                                                        <h3 className="font-bold text-lg sm:text-2xl text-white line-clamp-2 mb-2 sm:mb-3 group-hover:text-primary/90 transition-colors" title={article.title}>
                                                            {article.title}
                                                        </h3>
                                                        <div className="flex items-center justify-between text-white/90">
                                                            <div className="flex items-center">
                                                                <Calendar size={12} className="sm:hidden mr-1.5" />
                                                                <Calendar size={16} className="hidden sm:block mr-2" />
                                                                <span className="text-xs sm:text-sm font-medium">
                                                                    {new Date(article.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            {article.status === 'published' && (
                                                                <div title="Publicado">
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
                                {previewArticle && (
                                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setPreviewArticle(null)}>
                                        <div
                                            className="bg-card w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up sm:animate-fade-in"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Header */}
                                            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 sm:p-4 flex items-center justify-between z-10 shrink-0">
                                                {/* Mobile drag indicator */}
                                                <div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full" />

                                                <div className="flex-1 min-w-0 pr-2">
                                                    <h3 className="font-bold text-base sm:text-lg line-clamp-1">{previewArticle.title}</h3>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                                        {new Date(previewArticle.updatedAt).toLocaleDateString()} • {previewArticle.status === 'published' ? 'Publicado' : 'Borrador'} • {CATEGORY_LABELS[previewArticle.category]}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            handleEdit(previewArticle);
                                                            setPreviewArticle(null);
                                                        }}
                                                        className="px-2.5 py-1.5 sm:px-3 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => setPreviewArticle(null)}
                                                        className="p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-colors"
                                                    >
                                                        <XIcon size={18} className="sm:hidden" />
                                                        <XIcon size={20} className="hidden sm:block" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Content - scrollable */}
                                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                                {previewArticle.featuredImage && (
                                                    <img
                                                        src={previewArticle.featuredImage}
                                                        alt={previewArticle.title}
                                                        className="w-full rounded-lg mb-4 sm:mb-6"
                                                    />
                                                )}
                                                {previewArticle.excerpt && (
                                                    <p className="text-sm sm:text-base text-muted-foreground italic mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border">
                                                        {previewArticle.excerpt}
                                                    </p>
                                                )}
                                                {previewArticle.tags && previewArticle.tags.length > 0 && (
                                                    <div className="flex gap-2 flex-wrap mb-4">
                                                        {previewArticle.tags.map((tag, i) => (
                                                            <span key={i} className="px-2 py-0.5 text-xs bg-secondary rounded-full">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div
                                                    className="prose prose-sm dark:prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewArticle.content) }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bulk Actions Bar - Mobile optimized */}
                                {selectedArticles.length > 0 && (
                                    <div className="fixed bottom-4 sm:bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto bg-card border border-border rounded-xl shadow-2xl p-3 sm:p-4 flex items-center justify-between sm:justify-start gap-3 sm:gap-4 z-50 animate-fade-in-up">
                                        <span className="text-xs sm:text-sm font-medium text-foreground">
                                            {selectedArticles.length} {t('common.selected', 'seleccionados')}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleBulkDelete}
                                                className="px-2.5 sm:px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                                            >
                                                <Trash2 size={12} /> <span className="hidden sm:inline">{t('common.delete', 'Eliminar')}</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedArticles([])}
                                                className="px-2.5 sm:px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                                            >
                                                {t('common.cancel', 'Cancelar')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500 mx-auto">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-center text-foreground mb-2">
                                {t('contentManagement.confirmDeleteTitle', '¿Estás seguro?')}
                            </h3>
                            <p className="text-center text-muted-foreground mb-6">
                                {t('contentManagement.confirmDeleteMessage', 'Esta acción no se puede deshacer. El artículo será eliminado permanentemente.')}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={cancelDelete}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-medium text-sm"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium text-sm flex items-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {t('common.deleting', 'Eliminando...')}
                                        </>
                                    ) : (
                                        <>
                                            {t('common.delete', 'Eliminar')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {bulkDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500 mx-auto">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-center text-foreground mb-2">
                                {t('contentManagement.confirmBulkDeleteTitle', '¿Eliminar artículos?')}
                            </h3>
                            <p className="text-center text-muted-foreground mb-6">
                                {t('contentManagement.confirmBulkDeleteMessage', { count: selectedArticles.length, defaultValue: `Se eliminarán ${selectedArticles.length} artículo(s) permanentemente.` })}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setBulkDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-medium text-sm"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    onClick={confirmBulkDelete}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium text-sm flex items-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {t('common.deleting', 'Eliminando...')}
                                        </>
                                    ) : (
                                        <>
                                            {t('common.delete', 'Eliminar')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgencyContentDashboard;
