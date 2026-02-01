/**
 * NewsManagement
 * Panel de administración de Noticias y Novedades (Super Admin)
 * Lista con filtros, acciones CRUD y preview
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNews } from '../../../contexts/news';
import { useToast } from '../../../contexts/ToastContext';
import {
    NewsItem,
    NewsStatus,
    NewsCategory,
    NEWS_CATEGORY_LABELS,
    NEWS_CATEGORY_COLORS,
    NEWS_STATUS_LABELS,
    NEWS_STATUS_COLORS,
} from '../../../types/news';
import {
    ArrowLeft,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Eye,
    Edit,
    Copy,
    Trash2,
    Star,
    Newspaper,
    Calendar,
    TrendingUp,
    FileText,
    Archive,
    Send,
    Clock,
    AlertCircle,
    X,
    ChevronDown,
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import NewsEditor from './NewsEditor';

interface NewsManagementProps {
    onBack: () => void;
}

const NewsManagement: React.FC<NewsManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const {
        newsItems,
        isLoading,
        error,
        fetchNews,
        deleteNews,
        duplicateNews,
        updateNews,
        getNewsStats,
    } = useNews();
    const { showToast } = useToast();

    // Local State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<NewsStatus | ''>('');
    const [categoryFilter, setCategoryFilter] = useState<NewsCategory | ''>('');
    const [featuredFilter, setFeaturedFilter] = useState<boolean | ''>('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        fetchNews();
    }, []);

    // Apply filters
    const filteredNews = newsItems.filter(item => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (
                !item.title.toLowerCase().includes(query) &&
                !item.excerpt.toLowerCase().includes(query)
            ) {
                return false;
            }
        }
        if (statusFilter && item.status !== statusFilter) return false;
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (featuredFilter !== '' && item.featured !== featuredFilter) return false;
        return true;
    });

    const stats = getNewsStats();

    // Handlers
    const handleCreate = () => {
        setSelectedNews(null);
        setShowEditor(true);
    };

    const handleEdit = (news: NewsItem) => {
        setSelectedNews(news);
        setShowEditor(true);
        setActionMenuId(null);
    };

    const handleDuplicate = async (id: string) => {
        try {
            await duplicateNews(id);
            showToast(t('admin.news.duplicated', 'Noticia duplicada'), 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setActionMenuId(null);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteNews(id);
            showToast(t('admin.news.deleted', 'Noticia eliminada'), 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setShowDeleteConfirm(null);
        setActionMenuId(null);
    };

    const handleToggleFeatured = async (news: NewsItem) => {
        try {
            await updateNews(news.id, { featured: !news.featured });
            showToast(
                news.featured
                    ? t('admin.news.unfeatured', 'Noticia desmarcada como destacada')
                    : t('admin.news.featured', 'Noticia marcada como destacada'),
                'success'
            );
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setActionMenuId(null);
    };

    const handleArchive = async (news: NewsItem) => {
        try {
            await updateNews(news.id, {
                status: news.status === 'archived' ? 'draft' : 'archived',
            });
            showToast(
                news.status === 'archived'
                    ? t('admin.news.unarchived', 'Noticia restaurada')
                    : t('admin.news.archived', 'Noticia archivada'),
                'success'
            );
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setActionMenuId(null);
    };

    const handlePublish = async (news: NewsItem) => {
        try {
            await updateNews(news.id, { status: 'published' });
            showToast(t('admin.news.published', 'Noticia publicada'), 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setActionMenuId(null);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setCategoryFilter('');
        setFeaturedFilter('');
    };

    const hasFilters = searchQuery || statusFilter || categoryFilter || featuredFilter !== '';

    // Editor close handler
    const handleEditorClose = () => {
        setShowEditor(false);
        setSelectedNews(null);
        fetchNews();
    };

    // Show editor view
    if (showEditor) {
        return <NewsEditor news={selectedNews} onClose={handleEditorClose} />;
    }

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary md:hidden transition-colors"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <Newspaper className="text-editor-accent w-5 h-5" />
                        <h1 className="text-lg font-semibold">
                            {t('admin.news.title', 'Noticias y Novedades')}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-editor-bg rounded-lg font-medium hover:bg-editor-accent/90 transition-colors"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">
                                {t('admin.news.create', 'Nueva Noticia')}
                            </span>
                        </button>
                        <button
                            onClick={onBack}
                            className="hidden md:flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('common.back', 'Volver')}
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-editor-text-secondary uppercase">
                                    {t('admin.news.stats.total', 'Total')}
                                </span>
                                <FileText size={16} className="text-editor-accent" />
                            </div>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-editor-text-secondary uppercase">
                                    {t('admin.news.stats.published', 'Publicadas')}
                                </span>
                                <Send size={16} className="text-green-500" />
                            </div>
                            <p className="text-2xl font-bold text-green-500">{stats.published}</p>
                        </div>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-editor-text-secondary uppercase">
                                    {t('admin.news.stats.draft', 'Borradores')}
                                </span>
                                <Edit size={16} className="text-gray-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-500">{stats.draft}</p>
                        </div>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-editor-text-secondary uppercase">
                                    {t('admin.news.stats.scheduled', 'Programadas')}
                                </span>
                                <Clock size={16} className="text-blue-500" />
                            </div>
                            <p className="text-2xl font-bold text-blue-500">{stats.scheduled}</p>
                        </div>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-editor-text-secondary uppercase">
                                    {t('admin.news.stats.archived', 'Archivadas')}
                                </span>
                                <Archive size={16} className="text-orange-500" />
                            </div>
                            <p className="text-2xl font-bold text-orange-500">{stats.archived}</p>
                        </div>
                        <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-editor-text-secondary uppercase">
                                    {t('admin.news.stats.featured', 'Destacadas')}
                                </span>
                                <Star size={16} className="text-yellow-500" />
                            </div>
                            <p className="text-2xl font-bold text-yellow-500">{stats.featured}</p>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-4 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary"
                                />
                                <input
                                    type="text"
                                    placeholder={t('admin.news.searchPlaceholder', 'Buscar noticias...')}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                />
                            </div>

                            {/* Filter Toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                                    showFilters || hasFilters
                                        ? 'bg-editor-accent/10 border-editor-accent text-editor-accent'
                                        : 'bg-editor-bg border-editor-border text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                            >
                                <Filter size={18} />
                                <span>{t('admin.news.filters', 'Filtros')}</span>
                                {hasFilters && (
                                    <span className="w-5 h-5 bg-editor-accent text-editor-bg rounded-full text-xs flex items-center justify-center">
                                        !
                                    </span>
                                )}
                                <ChevronDown
                                    size={16}
                                    className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
                                />
                            </button>
                        </div>

                        {/* Filter Panel */}
                        {showFilters && (
                            <div className="mt-4 pt-4 border-t border-editor-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Status Filter */}
                                <div>
                                    <label className="block text-xs text-editor-text-secondary mb-1">
                                        {t('admin.news.filterStatus', 'Estado')}
                                    </label>
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value as NewsStatus | '')}
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    >
                                        <option value="">{t('common.all', 'Todos')}</option>
                                        {Object.entries(NEWS_STATUS_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {t(`admin.news.status.${value}`, label)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category Filter */}
                                <div>
                                    <label className="block text-xs text-editor-text-secondary mb-1">
                                        {t('admin.news.filterCategory', 'Categoría')}
                                    </label>
                                    <select
                                        value={categoryFilter}
                                        onChange={e => setCategoryFilter(e.target.value as NewsCategory | '')}
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    >
                                        <option value="">{t('common.all', 'Todas')}</option>
                                        {Object.entries(NEWS_CATEGORY_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {t(`admin.news.category.${value}`, label)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Featured Filter */}
                                <div>
                                    <label className="block text-xs text-editor-text-secondary mb-1">
                                        {t('admin.news.filterFeatured', 'Destacadas')}
                                    </label>
                                    <select
                                        value={featuredFilter === '' ? '' : featuredFilter ? 'true' : 'false'}
                                        onChange={e =>
                                            setFeaturedFilter(
                                                e.target.value === ''
                                                    ? ''
                                                    : e.target.value === 'true'
                                            )
                                        }
                                        className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent"
                                    >
                                        <option value="">{t('common.all', 'Todas')}</option>
                                        <option value="true">{t('admin.news.onlyFeatured', 'Solo destacadas')}</option>
                                        <option value="false">{t('admin.news.notFeatured', 'No destacadas')}</option>
                                    </select>
                                </div>

                                {/* Clear Filters */}
                                {hasFilters && (
                                    <div className="sm:col-span-3">
                                        <button
                                            onClick={clearFilters}
                                            className="text-sm text-editor-accent hover:underline"
                                        >
                                            {t('admin.news.clearFilters', 'Limpiar filtros')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
                            <AlertCircle className="text-red-500" size={20} />
                            <span className="text-red-500">{error}</span>
                            <button
                                onClick={() => fetchNews()}
                                className="ml-auto text-sm text-red-500 hover:underline"
                            >
                                {t('common.retry', 'Reintentar')}
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-editor-accent"></div>
                        </div>
                    ) : filteredNews.length === 0 ? (
                        /* Empty State */
                        <div className="text-center py-16 bg-editor-panel-bg border border-editor-border rounded-lg">
                            <Newspaper size={48} className="mx-auto text-editor-text-secondary mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {hasFilters
                                    ? t('admin.news.noResultsFilters', 'No hay noticias que coincidan con los filtros')
                                    : t('admin.news.noNews', 'No hay noticias')}
                            </h3>
                            <p className="text-editor-text-secondary mb-6">
                                {hasFilters
                                    ? t('admin.news.tryOtherFilters', 'Prueba con otros filtros o limpia la búsqueda')
                                    : t('admin.news.createFirst', 'Crea la primera noticia para mantener a tus usuarios informados')}
                            </p>
                            {hasFilters ? (
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-editor-accent border border-editor-accent rounded-lg hover:bg-editor-accent/10 transition-colors"
                                >
                                    {t('admin.news.clearFilters', 'Limpiar filtros')}
                                </button>
                            ) : (
                                <button
                                    onClick={handleCreate}
                                    className="px-4 py-2 bg-editor-accent text-editor-bg rounded-lg font-medium hover:bg-editor-accent/90 transition-colors"
                                >
                                    <Plus size={18} className="inline mr-2" />
                                    {t('admin.news.create', 'Nueva Noticia')}
                                </button>
                            )}
                        </div>
                    ) : (
                        /* News List */
                        <div className="space-y-3">
                            {filteredNews.map(news => (
                                <div
                                    key={news.id}
                                    className="bg-editor-panel-bg border border-editor-border rounded-lg hover:border-editor-accent/50 transition-colors group"
                                >
                                    <div className="p-4 flex items-start gap-4">
                                        {/* Thumbnail */}
                                        {news.imageUrl ? (
                                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-editor-bg">
                                                <img
                                                    src={news.imageUrl}
                                                    alt={news.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-editor-bg flex items-center justify-center">
                                                <Newspaper size={24} className="text-editor-text-secondary" />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {news.featured && (
                                                        <Star
                                                            size={16}
                                                            className="text-yellow-500 fill-yellow-500"
                                                        />
                                                    )}
                                                    <h3
                                                        className="font-semibold text-editor-text-primary truncate cursor-pointer hover:text-editor-accent"
                                                        onClick={() => handleEdit(news)}
                                                    >
                                                        {news.title}
                                                    </h3>
                                                </div>

                                                {/* Actions Menu */}
                                                <div className="relative flex-shrink-0">
                                                    <button
                                                        onClick={() =>
                                                            setActionMenuId(
                                                                actionMenuId === news.id ? null : news.id
                                                            )
                                                        }
                                                        className="p-1.5 rounded-lg hover:bg-editor-border transition-colors"
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>

                                                    {actionMenuId === news.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl z-20 py-1">
                                                            <button
                                                                onClick={() => handleEdit(news)}
                                                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-editor-border transition-colors"
                                                            >
                                                                <Edit size={16} />
                                                                {t('common.edit', 'Editar')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicate(news.id)}
                                                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-editor-border transition-colors"
                                                            >
                                                                <Copy size={16} />
                                                                {t('common.duplicate', 'Duplicar')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleFeatured(news)}
                                                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-editor-border transition-colors"
                                                            >
                                                                <Star
                                                                    size={16}
                                                                    className={
                                                                        news.featured
                                                                            ? 'text-yellow-500 fill-yellow-500'
                                                                            : ''
                                                                    }
                                                                />
                                                                {news.featured
                                                                    ? t('admin.news.removeFeatured', 'Quitar destacado')
                                                                    : t('admin.news.makeFeatured', 'Destacar')}
                                                            </button>
                                                            {news.status !== 'published' && (
                                                                <button
                                                                    onClick={() => handlePublish(news)}
                                                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-editor-border transition-colors text-green-500"
                                                                >
                                                                    <Send size={16} />
                                                                    {t('admin.news.publish', 'Publicar')}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleArchive(news)}
                                                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-editor-border transition-colors"
                                                            >
                                                                <Archive size={16} />
                                                                {news.status === 'archived'
                                                                    ? t('admin.news.restore', 'Restaurar')
                                                                    : t('admin.news.archive', 'Archivar')}
                                                            </button>
                                                            <hr className="my-1 border-editor-border" />
                                                            <button
                                                                onClick={() => setShowDeleteConfirm(news.id)}
                                                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-500/10 transition-colors text-red-500"
                                                            >
                                                                <Trash2 size={16} />
                                                                {t('common.delete', 'Eliminar')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Excerpt */}
                                            <p className="text-sm text-editor-text-secondary line-clamp-2 mt-1">
                                                {news.excerpt || t('admin.news.noExcerpt', 'Sin resumen')}
                                            </p>

                                            {/* Meta */}
                                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                                {/* Status Badge */}
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${NEWS_STATUS_COLORS[news.status]}`}
                                                >
                                                    {t(`admin.news.status.${news.status}`, NEWS_STATUS_LABELS[news.status])}
                                                </span>

                                                {/* Category Badge */}
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${NEWS_CATEGORY_COLORS[news.category]}`}
                                                >
                                                    {t(`admin.news.category.${news.category}`, NEWS_CATEGORY_LABELS[news.category])}
                                                </span>

                                                {/* Date */}
                                                <span className="text-xs text-editor-text-secondary flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDate(news.createdAt)}
                                                </span>

                                                {/* Stats */}
                                                <span className="text-xs text-editor-text-secondary flex items-center gap-1">
                                                    <Eye size={12} />
                                                    {news.views}
                                                </span>
                                                <span className="text-xs text-editor-text-secondary flex items-center gap-1">
                                                    <TrendingUp size={12} />
                                                    {news.clicks}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-editor-panel-bg border border-editor-border rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <Trash2 className="text-red-500" size={24} />
                            </div>
                            <h3 className="text-lg font-semibold">
                                {t('admin.news.deleteConfirmTitle', 'Eliminar noticia')}
                            </h3>
                        </div>
                        <p className="text-editor-text-secondary mb-6">
                            {t(
                                'admin.news.deleteConfirmMessage',
                                'Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar esta noticia?'
                            )}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 border border-editor-border rounded-lg hover:bg-editor-border transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={() => handleDelete(showDeleteConfirm)}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                {t('common.delete', 'Eliminar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close action menu */}
            {actionMenuId && (
                <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
            )}
        </div>
    );
};

export default NewsManagement;
