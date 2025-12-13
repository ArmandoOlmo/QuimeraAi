import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCMS } from '../../../contexts/cms';
import { useProject } from '../../../contexts/project';
import DashboardSidebar from '../DashboardSidebar';
import ModernCMSEditor from '../../cms/modern/ModernCMSEditor';
import { Menu as MenuIcon, Plus, Search, FileText, Edit3, Trash2, Loader2, Calendar, Globe, ArrowLeft, Grid, List, Eye, Copy, Filter, Download, Users, X } from 'lucide-react';
import { CMSPost } from '../../../types';

interface ContentManagementDashboardProps {
    onBack: () => void;
}

const ContentManagementDashboard: React.FC<ContentManagementDashboardProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { cmsPosts, loadCMSPosts, deleteCMSPost, saveCMSPost } = useCMS();
    const { projects } = useProject();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<CMSPost | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await loadCMSPosts();
            setIsLoading(false);
        }
        init();
    }, []);

    // Filtered and sorted posts
    const filteredPosts = useMemo(() => {
        let filtered = [...cmsPosts];

        // Search
        if (searchQuery) {
            filtered = filtered.filter(post =>
                post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.slug.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(post => post.status === statusFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                return sortOrder === 'asc'
                    ? a.title.localeCompare(b.title)
                    : b.title.localeCompare(a.title);
            }
        });

        return filtered;
    }, [cmsPosts, searchQuery, statusFilter, sortBy, sortOrder]);

    const handleCreateNew = () => {
        setEditingPost(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (post: CMSPost) => {
        setEditingPost(post);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t('contentManagement.deleteConfirm'))) {
            await deleteCMSPost(id);
        }
    };

    const handleDuplicate = async (post: CMSPost) => {
        const duplicatedPost: CMSPost = {
            ...post,
            id: '',
            title: `${post.title} (Copy)`,
            slug: `${post.slug}-copy`,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await saveCMSPost(duplicatedPost);
    };

    const handleBulkDelete = async () => {
        if (selectedPosts.length === 0) return;
        if (window.confirm(t('contentManagement.bulkDeleteConfirm', { count: selectedPosts.length }))) {
            for (const id of selectedPosts) {
                await deleteCMSPost(id);
            }
            setSelectedPosts([]);
        }
    };

    const toggleSelectPost = (id: string) => {
        setSelectedPosts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedPosts.length === filteredPosts.length) {
            setSelectedPosts([]);
        } else {
            setSelectedPosts(filteredPosts.map(p => p.id));
        }
    };

    if (isEditorOpen) {
        return (
            <ModernCMSEditor
                post={editingPost}
                onClose={() => {
                    setIsEditorOpen(false);
                    setEditingPost(null);
                    loadCMSPosts();
                }}
            />
        );
    }

    const publishedCount = cmsPosts.filter(p => p.status === 'published').length;
    const draftCount = cmsPosts.filter(p => p.status === 'draft').length;

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
                            <h1 className="text-lg font-semibold text-editor-text-primary">{t('contentManagement.title')}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center text-sm font-medium h-9 px-3 text-editor-text-secondary hover:text-editor-accent transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            {t('contentManagement.back')}
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto bg-[#f6f6f7] dark:bg-background black:bg-background">
                    <div className="max-w-7xl mx-auto">

                        {/* Stats - Simple inline */}
                        <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-primary" />
                                <span className="text-muted-foreground">{t('contentManagement.totalArticles')}:</span>
                                <span className="font-bold">{cmsPosts.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe size={16} className="text-green-600" />
                                <span className="text-muted-foreground">{t('contentManagement.published')}:</span>
                                <span className="font-bold text-green-600">{publishedCount}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Edit3 size={16} className="text-orange-600" />
                                <span className="text-muted-foreground">{t('contentManagement.drafts')}:</span>
                                <span className="font-bold text-orange-600">{draftCount}</span>
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
                                            placeholder={t('contentManagement.searchPlaceholder')}
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
                                        <option value="all">{t('contentManagement.allStatus')}</option>
                                        <option value="published">{t('contentManagement.statusPublished')}</option>
                                        <option value="draft">{t('contentManagement.statusDraft')}</option>
                                    </select>

                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="px-3 py-2 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                    >
                                        <option value="date">{t('contentManagement.sortByDate')}</option>
                                        <option value="title">{t('contentManagement.sortByTitle')}</option>
                                    </select>

                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="p-2 bg-secondary/30 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                                        title={sortOrder === 'asc' ? t('contentManagement.ascending') : t('contentManagement.descending')}
                                    >
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </button>

                                    <div className="flex border border-border rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2 ${viewMode === 'list' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            <List size={16} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2 ${viewMode === 'grid' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            <Grid size={16} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleCreateNew}
                                        className="flex items-center gap-2 px-3 py-2 text-primary font-medium text-sm transition-colors hover:text-primary/80"
                                    >
                                        <Plus size={16} />
                                        {t('contentManagement.newArticle')}
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Actions */}
                            {selectedPosts.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        {t('contentManagement.articlesSelected', { count: selectedPosts.length })}
                                    </span>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        {t('contentManagement.deleteSelected')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="bg-card border border-border rounded-lg p-12 text-center">
                                <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">{t('contentManagement.noArticlesFound')}</h3>
                                <p className="text-muted-foreground mb-6">
                                    {searchQuery || statusFilter !== 'all'
                                        ? t('contentManagement.adjustFilters')
                                        : t('contentManagement.createFirst')}
                                </p>
                                {!searchQuery && statusFilter === 'all' && (
                                    <button
                                        onClick={handleCreateNew}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        <Plus size={16} />
                                        Create Article
                                    </button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPosts.map(post => (
                                    <div
                                        key={post.id}
                                        className="relative rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 h-[400px] group"
                                    >
                                        {/* Full Background Image */}
                                        <div className="absolute inset-0">
                                            {post.featuredImage ? (
                                                <img
                                                    src={post.featuredImage}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-secondary">
                                                    <FileText className="w-20 h-20 text-muted-foreground opacity-20" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Dark Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />

                                        {/* Status Badge and Checkbox */}
                                        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
                                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border backdrop-blur-md shadow-lg ${post.status === 'published'
                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                                }`}>
                                                {post.status === 'published' ? 'Published' : 'Draft'}
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={selectedPosts.includes(post.id)}
                                                onChange={() => toggleSelectPost(post.id)}
                                                className="w-5 h-5 rounded border-2 border-white/50 bg-black/30 backdrop-blur-md checked:bg-primary checked:border-primary cursor-pointer transition-all"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>

                                        {/* Content at Bottom */}
                                        <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
                                            <h3 className="font-bold text-2xl text-white mb-2 line-clamp-2">
                                                {post.title}
                                            </h3>

                                            {post.excerpt && (
                                                <p className="text-sm text-white/80 line-clamp-2 mb-3">
                                                    {post.excerpt}
                                                </p>
                                            )}

                                            <div className="flex items-center text-white/90 mb-4">
                                                <Calendar size={16} className="mr-2" />
                                                <span className="text-sm font-medium">
                                                    {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(post);
                                                    }}
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-semibold hover:scale-110 transition-transform shadow-2xl"
                                                >
                                                    <Edit3 size={16} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDuplicate(post);
                                                    }}
                                                    className="p-2.5 bg-white/90 text-green-600 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                    title="Duplicate"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(post.id);
                                                    }}
                                                    className="p-2.5 bg-white/90 text-red-500 rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-card border border-border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-secondary/20 border-b border-border">
                                        <tr>
                                            <th className="w-12 p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="w-5 h-5"
                                                />
                                            </th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title</th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                                            <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredPosts.map(post => (
                                            <tr
                                                key={post.id}
                                                className="hover:bg-secondary/20 transition-colors group"
                                            >
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPosts.includes(post.id)}
                                                        onChange={() => toggleSelectPost(post.id)}
                                                        className="w-5 h-5"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div>
                                                        <div className="font-medium text-foreground">{post.title}</div>
                                                        {post.excerpt && (
                                                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                                                {post.excerpt}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-muted-foreground mt-1">/{post.slug}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${post.status === 'published'
                                                        ? 'bg-green-500/10 text-green-600'
                                                        : 'bg-orange-500/10 text-orange-600'
                                                        }`}>
                                                        {post.status === 'published' ? (
                                                            <>
                                                                <Globe size={12} />
                                                                Published
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Edit3 size={12} />
                                                                Draft
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    <div>{new Date(post.createdAt).toLocaleDateString()}</div>
                                                    <div className="text-xs">{new Date(post.createdAt).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(post)}
                                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDuplicate(post)}
                                                            className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                                                            title="Duplicate"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(post.id)}
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

