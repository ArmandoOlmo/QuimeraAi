
import React, { useState, useEffect } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import DashboardSidebar from '../dashboard/DashboardSidebar';
import CMSEditor from './CMSEditor';
import { Menu, Plus, Search, FileText, Edit3, Trash2, Loader2, Calendar, Globe, PenTool } from 'lucide-react';
import { CMSPost } from '../../types';

const CMSDashboard: React.FC = () => {
    const { cmsPosts, loadCMSPosts, deleteCMSPost } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<CMSPost | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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
        if(window.confirm("Are you sure you want to delete this post?")) {
            await deleteCMSPost(id);
        }
    };

    const filteredPosts = cmsPosts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        post.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isEditorOpen) {
        return (
            <CMSEditor 
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
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Standardized Header */}
                <header className="h-[65px] px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Menu />
                        </button>
                        <div className="flex items-center gap-2">
                            <PenTool className="text-primary" size={24} />
                            <h1 className="text-xl font-bold text-foreground">Content Manager</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto flex-1 justify-end">
                         <div className="relative group max-w-md w-full hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search posts..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-secondary/50 border-transparent focus:bg-card focus:border-primary/50 rounded-lg py-1.5 pl-9 pr-4 outline-none transition-all placeholder:text-muted-foreground/70 text-sm"
                            />
                        </div>

                        <button 
                            onClick={handleCreateNew}
                            className="bg-yellow-400 text-black font-bold py-1.5 px-4 rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:shadow-[0_0_25px_rgba(250,204,21,0.5)] hover:scale-105 transition-all flex items-center text-sm whitespace-nowrap"
                        >
                            <Plus size={18} className="mr-2" />
                            <span className="hidden sm:inline">New Post</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto h-full space-y-8">
                        
                        <div className="flex items-center justify-between">
                             <span className="px-2 py-1 bg-secondary/50 text-xs rounded-full text-muted-foreground">{filteredPosts.length} Entries Found</span>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="animate-spin w-10 h-10 text-primary" />
                            </div>
                        ) : filteredPosts.length === 0 ? (
                             <div className="text-center py-16 bg-card/30 rounded-3xl border border-dashed border-border/50">
                                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText size={32} className="text-muted-foreground opacity-50" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">No Content Yet</h3>
                                <p className="text-muted-foreground mb-6">Start building your blog or pages using our AI-powered editor.</p>
                                <button 
                                    onClick={handleCreateNew} 
                                    className="text-yellow-400 font-bold hover:underline hover:text-yellow-300 transition-colors"
                                >
                                    Create your first post
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredPosts.map(post => (
                                    <div key={post.id} className="group relative flex flex-col bg-card border border-border hover:border-primary/50 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 h-full">
                                        {/* Image Container */}
                                        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                                            {post.featuredImage ? (
                                                <img 
                                                    src={post.featuredImage} 
                                                    alt={post.title} 
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                                                    <FileText size={40} className="text-muted-foreground opacity-20" />
                                                </div>
                                            )}
                                            
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />

                                            {/* Status Badge */}
                                            <div className="absolute top-3 left-3 z-10">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md ${post.status === 'published' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                                                    {post.status}
                                                </span>
                                            </div>

                                            {/* Hover Actions Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] gap-3">
                                                <button 
                                                    onClick={() => handleEdit(post)} 
                                                    className="bg-white text-black p-2.5 rounded-full hover:scale-110 transition-transform shadow-lg"
                                                    title="Edit"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(post.id)} 
                                                    className="bg-white text-red-500 p-2.5 rounded-full hover:scale-110 transition-transform shadow-lg"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-4 flex flex-col flex-grow bg-card relative z-10">
                                            <h3 className="font-bold text-base text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors" title={post.title}>
                                                {post.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-grow">
                                                {post.excerpt || "No summary available."}
                                            </p>
                                            
                                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50">
                                                <span className="flex items-center text-[10px] text-muted-foreground font-medium">
                                                    <Calendar size={10} className="mr-1.5"/> 
                                                    {new Date(post.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                                {post.status === 'published' && (
                                                    <div title="Published">
                                                        <Globe size={12} className="text-green-500/50" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CMSDashboard;
