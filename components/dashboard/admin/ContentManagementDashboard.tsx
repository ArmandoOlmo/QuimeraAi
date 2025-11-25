import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import ModernCMSEditor from '../../cms/modern/ModernCMSEditor';
import { Menu as MenuIcon, Plus, Search, FileText, Edit3, Trash2, Loader2, Calendar, Globe, ArrowLeft, Grid, List, Eye, Copy, Filter, Download, Users } from 'lucide-react';
import { CMSPost } from '../../../types';

interface ContentManagementDashboardProps {
    onBack: () => void;
}

const ContentManagementDashboard: React.FC<ContentManagementDashboardProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { cmsPosts, loadCMSPosts, deleteCMSPost, saveCMSPost, projects } = useEditor();
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
        if(window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
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
        if (window.confirm(`Delete ${selectedPosts.length} article(s)? This action cannot be undone.`)) {
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
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden transition-colors"
                        >
                            <MenuIcon className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <FileText className="text-editor-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-editor-text-primary">Content Management</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onBack}
                            className="flex items-center text-sm font-medium h-9 px-4 rounded-md bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            Back
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto bg-[#f6f6f7] dark:bg-background black:bg-background">
                    <div className="max-w-7xl mx-auto">
                        
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-card border border-border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Articles</p>
                                        <p className="text-2xl font-bold text-foreground">{cmsPosts.length}</p>
                                    </div>
                                    <FileText className="w-8 h-8 text-primary opacity-20" />
                                </div>
                            </div>
                            <div className="bg-card border border-border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Published</p>
                                        <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
                                    </div>
                                    <Globe className="w-8 h-8 text-green-600 opacity-20" />
                                </div>
                            </div>
                            <div className="bg-card border border-border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Drafts</p>
                                        <p className="text-2xl font-bold text-orange-600">{draftCount}</p>
                                    </div>
                                    <Edit3 className="w-8 h-8 text-orange-600 opacity-20" />
                                </div>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="bg-card border border-border rounded-lg p-4 mb-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                {/* Search */}
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input 
                                            type="text"
                                            placeholder="Search articles..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                        />
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
                                        <option value="draft">Draft</option>
                                    </select>

                                    <select 
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="px-3 py-2 bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                                    >
                                        <option value="date">Sort by Date</option>
                                        <option value="title">Sort by Title</option>
                                    </select>

                                    <button 
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="p-2 bg-secondary/30 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                    >
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </button>

                                    <div className="flex border border-border rounded-lg overflow-hidden">
                                        <button 
                                            onClick={() => setViewMode('list')}
                                            className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-secondary/30 hover:bg-secondary/50'}`}
                                        >
                                            <List size={16} />
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-secondary/30 hover:bg-secondary/50'}`}
                                        >
                                            <Grid size={16} />
                                        </button>
                                    </div>

                                    <button 
                                        onClick={handleCreateNew}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                                    >
                                        <Plus size={16} />
                                        New Article
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Actions */}
                            {selectedPosts.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedPosts.length} article(s) selected
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
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="bg-card border border-border rounded-lg p-12 text-center">
                                <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                                <p className="text-muted-foreground mb-6">
                                    {searchQuery || statusFilter !== 'all' 
                                        ? 'Try adjusting your filters' 
                                        : 'Create your first article to get started'}
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
                                        className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                                    >
                                        {/* Thumbnail */}
                                        <div className="aspect-video bg-secondary/20 relative overflow-hidden">
                                            {post.featuredImage ? (
                                                <img 
                                                    src={post.featuredImage} 
                                                    alt={post.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <FileText className="w-12 h-12 text-muted-foreground opacity-20" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedPosts.includes(post.id)}
                                                    onChange={() => toggleSelectPost(post.id)}
                                                    className="w-5 h-5"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                    post.status === 'published' 
                                                        ? 'bg-green-500/10 text-green-600' 
                                                        : 'bg-orange-500/10 text-orange-600'
                                                }`}>
                                                    {post.status === 'published' ? 'Published' : 'Draft'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(post.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            
                                            <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                                                {post.title}
                                            </h3>
                                            
                                            {post.excerpt && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                                    {post.excerpt}
                                                </p>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 pt-4 border-t border-border">
                                                <button 
                                                    onClick={() => handleEdit(post)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                                                >
                                                    <Edit3 size={14} />
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDuplicate(post)}
                                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-colors"
                                                    title="Duplicate"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(post.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
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
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                                        post.status === 'published' 
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

