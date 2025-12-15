/**
 * ContentManagementDashboard
 * Panel de gestión de contenido para la App Quimera
 * Gestiona artículos del blog, noticias, tutoriales que se muestran en la landing page pública
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContent } from '../../../contexts/appContent';
import DashboardSidebar from '../DashboardSidebar';
import AppArticleEditor from './AppArticleEditor';
import { 
    Menu as MenuIcon, 
    Plus, 
    Search, 
    FileText, 
    Edit3, 
    Trash2, 
    Loader2, 
    Calendar, 
    Globe, 
    ArrowLeft, 
    Grid, 
    List, 
    Copy, 
    X,
    Star,
    Eye,
    Tag,
    Clock,
    TrendingUp
} from 'lucide-react';
import { AppArticle, AppArticleCategory } from '../../../types/appContent';

interface ContentManagementDashboardProps {
    onBack: () => void;
}

const CATEGORY_LABELS: Record<AppArticleCategory, string> = {
    'blog': 'Blog',
    'news': 'News',
    'tutorial': 'Tutorial',
    'case-study': 'Case Study',
    'announcement': 'Announcement',
    'guide': 'Guide',
    'update': 'Product Update',
};

const ContentManagementDashboard: React.FC<ContentManagementDashboardProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { articles, isLoadingArticles, loadArticles, deleteArticle, saveArticle } = useAppContent();
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<AppArticle | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [categoryFilter, setCategoryFilter] = useState<'all' | AppArticleCategory>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'views'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedArticles, setSelectedArticles] = useState<string[]>([]);

    // Filtered and sorted articles
    const filteredArticles = useMemo(() => {
        let filtered = [...articles];

        // Search
        if (searchQuery) {
            filtered = filtered.filter(article =>
                article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(article => article.status === statusFilter);
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(article => article.category === categoryFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else if (sortBy === 'title') {
                return sortOrder === 'asc'
                    ? a.title.localeCompare(b.title)
                    : b.title.localeCompare(a.title);
            } else {
                // views
                return sortOrder === 'asc' 
                    ? (a.views || 0) - (b.views || 0) 
                    : (b.views || 0) - (a.views || 0);
            }
        });

        return filtered;
    }, [articles, searchQuery, statusFilter, categoryFilter, sortBy, sortOrder]);

    const handleCreateNew = () => {
        setEditingArticle(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (article: AppArticle) => {
        setEditingArticle(article);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t('contentManagement.deleteConfirm', 'Are you sure you want to delete this article?'))) {
            await deleteArticle(id);
        }
    };

    const handleDuplicate = async (article: AppArticle) => {
        const duplicatedArticle: AppArticle = {
            ...article,
            id: '',
            title: `${article.title} (Copy)`,
            slug: `${article.slug}-copy-${Date.now()}`,
            status: 'draft',
            featured: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: undefined,
            views: 0,
        };
        await saveArticle(duplicatedArticle);
    };

    const handleBulkDelete = async () => {
        if (selectedArticles.length === 0) return;
        if (window.confirm(t('contentManagement.bulkDeleteConfirm', { count: selectedArticles.length }))) {
            for (const id of selectedArticles) {
                await deleteArticle(id);
            }
            setSelectedArticles([]);
        }
    };

    const toggleSelectArticle = (id: string) => {
        setSelectedArticles(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedArticles.length === filteredArticles.length) {
            setSelectedArticles([]);
        } else {
            setSelectedArticles(filteredArticles.map(a => a.id));
        }
    };

    // Editor view
    if (isEditorOpen) {
        return (
            <AppArticleEditor
                article={editingArticle}
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditingArticle(null);
                }}
            />
        );
    }

    // Stats
    const publishedCount = articles.filter(a => a.status === 'published').length;
    const draftCount = articles.filter(a => a.status === 'draft').length;
    const featuredCount = articles.filter(a => a.featured).length;
    const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary lg:hidden transition-colors"
                        >
                            <MenuIcon className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <FileText className="text-editor-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-editor-text-primary">
                                App Content Management
                            </h1>
                        </div>
                        <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            Public Landing
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center text-sm font-medium h-9 px-3 text-editor-text-secondary hover:text-editor-accent transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            {t('contentManagement.back', 'Back')}
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto bg-[#f6f6f7] dark:bg-background black:bg-background">
                    <div className="max-w-7xl mx-auto">
                        
                        {/* Info Banner */}
                        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Globe className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground mb-1">
                                        Public Website Content
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Articles created here will appear on the Quimera.ai public landing page and blog section. 
                                        Featured articles will be highlighted on the homepage.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FileText size={18} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{articles.length}</p>
                                        <p className="text-xs text-muted-foreground">Total Articles</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <Globe size={18} className="text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-500">{publishedCount}</p>
                                        <p className="text-xs text-muted-foreground">Published</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                                        <Star size={18} className="text-yellow-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-yellow-500">{featuredCount}</p>
                                        <p className="text-xs text-muted-foreground">Featured</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <Eye size={18} className="text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-purple-500">{totalViews.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Total Views</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="bg-card border border-border rounded-lg p-4 mb-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                {/* Search */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2">
                                        <Search size={16} className="text-editor-text-secondary flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Search articles..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                        className="px-3 py-2 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="published">Published</option>
                                        <option value="draft">Drafts</option>
                                    </select>

                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value as any)}
                                        className="px-3 py-2 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                    >
                                        <option value="all">All Categories</option>
                                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="px-3 py-2 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                    >
                                        <option value="date">Sort by Date</option>
                                        <option value="title">Sort by Title</option>
                                        <option value="views">Sort by Views</option>
                                    </select>

                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="p-2 bg-secondary/30 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                                    >
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </button>

                                    <div className="flex border border-border rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2 ${viewMode === 'list' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            <List size={16} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2 ${viewMode === 'grid' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            <Grid size={16} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleCreateNew}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        <Plus size={16} />
                                        New Article
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Actions */}
                            {selectedArticles.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''} selected
                                    </span>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        Delete Selected
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        {isLoadingArticles ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : filteredArticles.length === 0 ? (
                            <div className="bg-card border border-border rounded-lg p-12 text-center">
                                <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">
                                    {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                                        ? 'No articles found'
                                        : 'No articles yet'}
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                                        ? 'Try adjusting your filters'
                                        : 'Create your first article to start building your blog'}
                                </p>
                                {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
                                    <button
                                        onClick={handleCreateNew}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        <Plus size={16} />
                                        Create First Article
                                    </button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* Grid View */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredArticles.map(article => (
                                    <div
                                        key={article.id}
                                        className="relative rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 h-[400px] group bg-card border border-border"
                                    >
                                        {/* Background Image */}
                                        <div className="absolute inset-0">
                                            {article.featuredImage ? (
                                                <img
                                                    src={article.featuredImage}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-secondary">
                                                    <FileText className="w-20 h-20 text-muted-foreground opacity-20" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                                        {/* Badges */}
                                        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border backdrop-blur-md shadow-lg ${
                                                    article.status === 'published'
                                                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                        : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                                }`}>
                                                    {article.status}
                                                </span>
                                                {article.featured && (
                                                    <span className="px-2 py-1 text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg backdrop-blur-md">
                                                        <Star size={12} className="inline mr-1" />
                                                        Featured
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedArticles.includes(article.id)}
                                                onChange={() => toggleSelectArticle(article.id)}
                                                className="w-5 h-5 rounded border-2 border-white/50 bg-black/30 backdrop-blur-md checked:bg-primary checked:border-primary cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
                                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-white/20 text-white rounded mb-3">
                                                {CATEGORY_LABELS[article.category]}
                                            </span>
                                            <h3 className="font-bold text-2xl text-white mb-2 line-clamp-2">
                                                {article.title}
                                            </h3>
                                            {article.excerpt && (
                                                <p className="text-sm text-white/80 line-clamp-2 mb-3">
                                                    {article.excerpt}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-white/70 text-sm mb-4">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {new Date(article.createdAt).toLocaleDateString()}
                                                </span>
                                                {article.views !== undefined && (
                                                    <span className="flex items-center gap-1">
                                                        <Eye size={14} />
                                                        {article.views.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <button
                                                    onClick={() => handleEdit(article)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-semibold hover:scale-110 transition-transform shadow-2xl"
                                                >
                                                    <Edit3 size={16} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicate(article)}
                                                    className="p-2.5 bg-white/90 text-green-600 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(article.id)}
                                                    className="p-2.5 bg-white/90 text-red-500 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* List View */
                            <div className="bg-card border border-border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-secondary/20 border-b border-border">
                                        <tr>
                                            <th className="w-12 p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedArticles.length === filteredArticles.length && filteredArticles.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="w-5 h-5"
                                                />
                                            </th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Article</th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Views</th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                                            <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredArticles.map(article => (
                                            <tr
                                                key={article.id}
                                                className="hover:bg-secondary/20 transition-colors group"
                                            >
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedArticles.includes(article.id)}
                                                        onChange={() => toggleSelectArticle(article.id)}
                                                        className="w-5 h-5"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                                                            {article.featuredImage ? (
                                                                <img src={article.featuredImage} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <FileText size={20} className="text-muted-foreground opacity-30" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-foreground">{article.title}</span>
                                                                {article.featured && (
                                                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                                )}
                                                            </div>
                                                            {article.excerpt && (
                                                                <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                                                    {article.excerpt}
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-muted-foreground mt-0.5">/blog/{article.slug}</div>
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
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                                        article.status === 'published'
                                                            ? 'bg-green-500/10 text-green-600'
                                                            : 'bg-orange-500/10 text-orange-600'
                                                    }`}>
                                                        {article.status === 'published' ? (
                                                            <><Globe size={12} /> Published</>
                                                        ) : (
                                                            <><Edit3 size={12} /> Draft</>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Eye size={14} />
                                                        {(article.views || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    <div>{new Date(article.createdAt).toLocaleDateString()}</div>
                                                    {article.readTime && (
                                                        <div className="text-xs flex items-center gap-1 mt-0.5">
                                                            <Clock size={10} />
                                                            {article.readTime} min read
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(article)}
                                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDuplicate(article)}
                                                            className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                                                            title="Duplicate"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(article.id)}
                                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
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
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ContentManagementDashboard;
