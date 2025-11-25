
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import DashboardSidebar from '../dashboard/DashboardSidebar';
import ModernCMSEditor from './modern/ModernCMSEditor';
import ContentCreatorAssistant from './ContentCreatorAssistant';
import { Menu, Plus, Search, FileText, Edit3, Trash2, Loader2, Calendar, Globe, PenTool, ArrowDown, ArrowUp, Grid, List, Eye, X as XIcon, Copy, Edit2, Download, Sparkles } from 'lucide-react';
import { CMSPost } from '../../types';

const CMSDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { cmsPosts, loadCMSPosts, deleteCMSPost, saveCMSPost } = useEditor();
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
        if(window.confirm(t('cms.confirmDelete'))) {
            await deleteCMSPost(id);
        }
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

    const handleBulkDelete = async () => {
        if (window.confirm(t('cms.confirmBulkDelete', { count: selectedPosts.length }))) {
            await Promise.all(selectedPosts.map(id => deleteCMSPost(id)));
            setSelectedPosts([]);
            await loadCMSPosts();
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
                {/* Standardized Header */}
                <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <PenTool className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground">Content Manager</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        {/* Búsqueda Desktop - Compacta */}
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-40 focus:w-56 h-9 bg-transparent border border-border/30 focus:border-primary/50 rounded-md pl-9 pr-4 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                            />
                        </div>

                        {/* Búsqueda Móvil */}
                        <div className="md:hidden flex items-center gap-2">
                            {isMobileSearchOpen ? (
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-secondary/50 border border-border rounded-lg py-1.5 pl-9 pr-8 outline-none text-sm"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            setIsMobileSearchOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                                    >
                                        <XIcon size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsMobileSearchOpen(true)}
                                    className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-md transition-colors"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Botón Export */}
                        {cmsPosts.length > 0 && (
                            <button 
                                onClick={handleExport}
                                className="hidden sm:flex items-center justify-center h-9 w-9 rounded-md transition-colors text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                                title="Export posts"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}

                        {/* Botón Crear con IA */}
                        <button 
                            onClick={handleAiCreate}
                            className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-bold transition-all text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Crear con IA</span>
                        </button>

                        <button 
                            onClick={handleCreateNew}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New Post</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto h-full space-y-6">
                        
                        {/* Métricas Cards */}
                        {cmsPosts.length > 0 && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-card border border-border rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Posts</p>
                                            <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
                                        </div>
                                        <FileText className="text-primary opacity-50" size={32} />
                                    </div>
                                </div>
                                
                                <div className="bg-card border border-border rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Published</p>
                                            <p className="text-2xl font-bold text-green-500">{metrics.published}</p>
                                        </div>
                                        <Globe className="text-green-500 opacity-50" size={32} />
                                    </div>
                                </div>
                                
                                <div className="bg-card border border-border rounded-xl p-4 col-span-2 lg:col-span-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Drafts</p>
                                            <p className="text-2xl font-bold text-yellow-500">{metrics.drafts}</p>
                                        </div>
                                        <Edit3 className="text-yellow-500 opacity-50" size={32} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Barra de Filtros */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="px-3 py-1.5 bg-secondary/50 text-xs rounded-full text-muted-foreground font-medium">
                                    {filteredAndSortedPosts.length} of {cmsPosts.length} posts
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
                                        <XIcon size={12} /> Clear filters
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Filtro de estado */}
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    <option value="all">All Status</option>
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                </select>

                                {/* Filtro de fecha */}
                                <select 
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value as any)}
                                    className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">Last 30 Days</option>
                                </select>

                                {/* Ordenamiento */}
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                >
                                    <option value="date">Sort by Date</option>
                                    <option value="title">Sort by Title</option>
                                </select>

                                {/* Orden asc/desc */}
                                <button
                                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="h-9 w-9 flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-border/40"
                                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    {sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                                </button>

                                {/* Vista Grid/List */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`h-9 w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'grid' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                        title="Grid View"
                                    >
                                        <Grid size={14} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`h-9 w-9 flex items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'text-editor-accent bg-editor-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-border/40'}`}
                                        title="List View"
                                    >
                                        <List size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="animate-spin w-10 h-10 text-primary" />
                            </div>
                        ) : filteredAndSortedPosts.length === 0 ? (
                             <div className="text-center py-16 bg-card/30 rounded-3xl border border-dashed border-border/50">
                                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText size={32} className="text-muted-foreground opacity-50" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                    {searchQuery || statusFilter !== 'all' || dateRange !== 'all' 
                                        ? 'No posts match your filters' 
                                        : 'No Content Yet'}
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    {searchQuery || statusFilter !== 'all' || dateRange !== 'all'
                                        ? 'Try adjusting your filters to see more results.'
                                        : 'Start building your blog or pages using our AI-powered editor.'}
                                </p>
                                <button 
                                    onClick={handleCreateNew} 
                                    className="text-yellow-400 font-bold hover:underline hover:text-yellow-300 transition-colors"
                                >
                                    Create your first post
                                </button>
                            </div>
                        ) : viewMode === 'list' ? (
                            /* Vista de Lista */
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
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
                                            <th className="p-4 text-left text-xs font-medium text-muted-foreground">Title</th>
                                            <th className="p-4 text-left text-xs font-medium text-muted-foreground">Status</th>
                                            <th className="p-4 text-left text-xs font-medium text-muted-foreground">Date</th>
                                            <th className="p-4 text-left text-xs font-medium text-muted-foreground w-32">Actions</th>
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
                                                            <p className="text-xs text-muted-foreground line-clamp-1">{post.excerpt || 'No excerpt'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                                        post.status === 'published' 
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
                        ) : (
                            /* Vista de Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredAndSortedPosts.map(post => (
                                    <div key={post.id} className="group relative rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] h-[400px]">
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
                                                    <FileText size={60} className="text-muted-foreground opacity-20" />
                                                </div>
                                            )}
                                            
                                            {/* Dark Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                                            {/* Top Section: Status Badge */}
                                            <div className="absolute top-4 left-4 z-20">
                                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border backdrop-blur-md shadow-lg ${post.status === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                                                    {post.status}
                                                </span>
                                            </div>

                                            {/* Hover Actions Overlay */}
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] gap-3 z-10">
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
                                            <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
                                                <h3 className="font-bold text-2xl text-white line-clamp-2 mb-3 group-hover:text-primary/90 transition-colors" title={post.title}>
                                                    {post.title}
                                                </h3>
                                                <div className="flex items-center justify-between text-white/90">
                                                    <div className="flex items-center">
                                                        <Calendar size={16} className="mr-2"/> 
                                                        <span className="text-sm font-medium">
                                                            Updated {new Date(post.updatedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    {post.status === 'published' && (
                                                        <div title="Published">
                                                            <Globe size={16} className="text-green-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quick Preview Modal */}
                        {previewPost && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewPost(null)}>
                                <div className="bg-card rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                    <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg line-clamp-1">{previewPost.title}</h3>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(previewPost.updatedAt).toLocaleDateString()} • {previewPost.status}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    handleEdit(previewPost);
                                                    setPreviewPost(null);
                                                }}
                                                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => setPreviewPost(null)}
                                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                                            >
                                                <XIcon size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        {previewPost.featuredImage && (
                                            <img 
                                                src={previewPost.featuredImage} 
                                                alt={previewPost.title} 
                                                className="w-full rounded-lg mb-6"
                                            />
                                        )}
                                        {previewPost.excerpt && (
                                            <p className="text-muted-foreground italic mb-4 pb-4 border-b border-border">
                                                {previewPost.excerpt}
                                            </p>
                                        )}
                                        <div 
                                            className="prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: previewPost.content }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bulk Actions Bar */}
                        {selectedPosts.length > 0 && (
                            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-2xl p-4 flex items-center gap-4 z-50 animate-fade-in-up">
                                <span className="text-sm font-medium text-foreground">
                                    {selectedPosts.length} selected
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleBulkDelete}
                                        className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 size={12} /> Delete
                                    </button>
                                    <button 
                                        onClick={() => setSelectedPosts([])}
                                        className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CMSDashboard;
