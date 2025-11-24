import React, { useState, useMemo } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import { 
    ArrowLeft, 
    Menu, 
    LayoutTemplate, 
    Plus, 
    Edit, 
    Trash2, 
    EyeOff, 
    Eye,
    Search,
    Grid,
    List,
    Copy,
    Star,
    Users,
    Clock,
    X,
    TrendingUp,
    Archive,
    Globe,
    Filter,
    SortAsc,
    Download,
    ExternalLink
} from 'lucide-react';
import { Project } from '../../../types';

interface TemplateManagementProps {
    onBack: () => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'usage' | 'recent' | 'category';

const TemplateManagement: React.FC<TemplateManagementProps> = ({ onBack }) => {
    const { projects, loadProject, createNewTemplate, deleteProject, archiveTemplate, duplicateTemplate } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    
    // Preview and Selection States
    const [previewTemplate, setPreviewTemplate] = useState<Project | null>(null);
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    const templates = projects.filter(p => p.status === 'Template');
    const userProjects = projects.filter(p => p.status !== 'Template');

    const getTemplateUsage = (templateId: string) => {
        return userProjects.filter(p => p.sourceTemplateId === templateId).length;
    };

    // Get unique categories from templates
    const categories = useMemo(() => {
        const cats = new Set<string>();
        templates.forEach(t => {
            if (t.category) cats.add(t.category);
            else if (t.brandIdentity?.industry) cats.add(t.brandIdentity.industry);
        });
        return Array.from(cats).sort();
    }, [templates]);

    // Filter and sort templates
    const filteredAndSortedTemplates = useMemo(() => {
        let result = [...templates];

        // Apply search filter
        if (searchTerm) {
            result = result.filter(t => 
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.brandIdentity?.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply category filter
        if (filterCategory !== 'all') {
            result = result.filter(t => 
                t.category === filterCategory || 
                t.brandIdentity?.industry === filterCategory
            );
        }

        // Apply status filter
        if (filterStatus === 'active') {
            result = result.filter(t => !t.isArchived);
        } else if (filterStatus === 'archived') {
            result = result.filter(t => t.isArchived);
        }

        // Apply sorting
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'usage':
                    return getTemplateUsage(b.id) - getTemplateUsage(a.id);
                case 'category':
                    const catA = a.category || a.brandIdentity?.industry || '';
                    const catB = b.category || b.brandIdentity?.industry || '';
                    return catA.localeCompare(catB);
                case 'recent':
                default:
                    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
            }
        });

        return result;
    }, [templates, searchTerm, filterCategory, filterStatus, sortBy]);

    // Get most used template
    const getMostUsedTemplate = () => {
        if (templates.length === 0) return null;
        return templates.reduce((prev, current) => 
            getTemplateUsage(current.id) > getTemplateUsage(prev.id) ? current : prev
        );
    };


    // Bulk actions
    const handleBulkArchive = () => {
        selectedTemplates.forEach(id => archiveTemplate(id, true));
        setSelectedTemplates([]);
    };

    const handleBulkDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedTemplates.length} templates?`)) {
            selectedTemplates.forEach(id => deleteProject(id));
            setSelectedTemplates([]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedTemplates.length === filteredAndSortedTemplates.length) {
            setSelectedTemplates([]);
        } else {
            setSelectedTemplates(filteredAndSortedTemplates.map(t => t.id));
        }
    };

    const totalSitesUsingTemplates = userProjects.filter(p => p.sourceTemplateId).length;
    const activeTemplates = templates.filter(t => !t.isArchived).length;
    const archivedTemplates = templates.filter(t => t.isArchived).length;
    const mostUsedTemplate = getMostUsedTemplate();

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={onBack} className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full md:hidden transition-colors" title="Back to Admin">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <LayoutTemplate className="text-editor-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-editor-text-primary hidden sm:block">Website Templates</h1>
                        </div>
                        
                        {/* Search Bar */}
                        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md bg-editor-border/40 rounded-md px-3 py-1.5">
                            <Search className="w-4 h-4 text-editor-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search templates..."
                                className="flex-1 bg-transparent outline-none text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        {/* View Mode Toggle */}
                        <div className="hidden sm:flex items-center gap-0.5 bg-editor-border/40 rounded-md p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-editor-accent text-white' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                title="Grid View"
                            >
                                <Grid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-editor-accent text-white' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>

                        {/* Filter Toggle */}
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all ${showFilters ? 'bg-editor-accent text-white' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40'}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden lg:inline">Filters</span>
                        </button>

                        <button onClick={createNewTemplate} className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all bg-editor-accent text-white hover:bg-editor-accent/90">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New</span>
                        </button>
                        
                        <button onClick={onBack} className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden lg:inline">Back</span>
                        </button>
                    </div>
                </header>

                {/* Mobile Search */}
                <div className="md:hidden px-4 py-3 border-b border-editor-border">
                    <div className="flex items-center gap-2 bg-editor-border/40 rounded-md px-3 py-2">
                        <Search className="w-4 h-4 text-editor-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            className="flex-1 bg-transparent outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="px-4 sm:px-6 py-4 border-b border-editor-border bg-editor-panel-bg/50">
                        <div className="flex flex-wrap gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-editor-text-secondary">Category</label>
                                <select 
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="bg-editor-border/40 px-3 py-1.5 rounded-md text-sm outline-none border border-transparent focus:border-editor-accent"
                                >
                                    <option value="all">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-editor-text-secondary">Status</label>
                                <select 
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="bg-editor-border/40 px-3 py-1.5 rounded-md text-sm outline-none border border-transparent focus:border-editor-accent"
                                >
                                    <option value="all">All Templates</option>
                                    <option value="active">Active</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-editor-text-secondary">Sort By</label>
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="bg-editor-border/40 px-3 py-1.5 rounded-md text-sm outline-none border border-transparent focus:border-editor-accent"
                                >
                                    <option value="recent">Most Recent</option>
                                    <option value="name">Name (A-Z)</option>
                                    <option value="usage">Most Used</option>
                                    <option value="category">Category</option>
                                </select>
                            </div>

                            {(searchTerm || filterCategory !== 'all' || filterStatus !== 'all') && (
                                <div className="flex items-end">
                                    <button 
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterCategory('all');
                                            setFilterStatus('all');
                                        }}
                                        className="px-3 py-1.5 rounded-md text-sm text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                        <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border">
                            <div className="flex items-center gap-2 mb-2">
                                <LayoutTemplate size={18} className="text-editor-accent" />
                                <span className="text-xs sm:text-sm text-editor-text-secondary">Total Templates</span>
                            </div>
                            <p className="text-2xl font-bold">{templates.length}</p>
                            <p className="text-xs text-editor-text-secondary mt-1">{activeTemplates} active</p>
                        </div>
                        
                        <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe size={18} className="text-blue-500" />
                                <span className="text-xs sm:text-sm text-editor-text-secondary">Sites Created</span>
                            </div>
                            <p className="text-2xl font-bold">{totalSitesUsingTemplates}</p>
                            <p className="text-xs text-editor-text-secondary mt-1">from templates</p>
                        </div>
                        
                        <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={18} className="text-green-500" />
                                <span className="text-xs sm:text-sm text-editor-text-secondary">Most Popular</span>
                            </div>
                            <p className="text-sm font-bold truncate">{mostUsedTemplate?.name || 'N/A'}</p>
                            <p className="text-xs text-editor-text-secondary mt-1">
                                {mostUsedTemplate ? `${getTemplateUsage(mostUsedTemplate.id)} uses` : ''}
                            </p>
                        </div>
                        
                        <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Archive size={18} className="text-orange-500" />
                                <span className="text-xs sm:text-sm text-editor-text-secondary">Archived</span>
                            </div>
                            <p className="text-2xl font-bold">{archivedTemplates}</p>
                            <p className="text-xs text-editor-text-secondary mt-1">templates</p>
                        </div>
                    </div>

                    {/* Results Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-editor-text-secondary">
                                {filteredAndSortedTemplates.length} {filteredAndSortedTemplates.length === 1 ? 'template' : 'templates'}
                            </p>
                            {filteredAndSortedTemplates.length > 0 && (
                                <label className="flex items-center gap-2 text-sm text-editor-text-secondary cursor-pointer hover:text-editor-text-primary">
                                    <input
                                        type="checkbox"
                                        checked={selectedTemplates.length === filteredAndSortedTemplates.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-editor-border"
                                    />
                                    Select All
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Templates Grid */}
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {filteredAndSortedTemplates.map(template => (
                                <div 
                                    key={template.id} 
                                    className={`bg-editor-panel-bg rounded-lg border border-editor-border overflow-hidden group transition-all hover:shadow-xl relative ${template.isArchived ? 'opacity-60' : ''} ${selectedTemplates.includes(template.id) ? 'ring-2 ring-editor-accent' : ''}`}
                                >
                                    {/* Selection Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedTemplates.includes(template.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTemplates([...selectedTemplates, template.id]);
                                            } else {
                                                setSelectedTemplates(selectedTemplates.filter(id => id !== template.id));
                                            }
                                        }}
                                        className="absolute top-3 left-3 w-5 h-5 rounded border-2 border-white shadow-lg z-10 cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                    />

                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-editor-border overflow-hidden relative">
                                        <img 
                                            src={template.thumbnailUrl} 
                                            alt={template.name} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                        />
                                        
                                        {/* Featured Badge */}
                                        {template.isFeatured && (
                                            <div className="absolute top-3 right-3">
                                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
                                            </div>
                                        )}
                                        
                                        {/* Usage Badge */}
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            <Users size={12} />
                                            {getTemplateUsage(template.id)}
                                        </div>
                                        
                                        {/* Archived Overlay */}
                                        {template.isArchived && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <span className="font-bold text-white tracking-widest uppercase text-sm">Archived</span>
                                            </div>
                                        )}

                                        {/* Quick Preview on Hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <button 
                                                onClick={() => setPreviewTemplate(template)}
                                                className="bg-white text-editor-bg px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform"
                                            >
                                                <Eye size={16} />
                                                Quick Preview
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-bold text-editor-text-primary flex-1 line-clamp-1">{template.name}</h3>
                                        </div>
                                        
                                        {/* Category/Industry */}
                                        <p className="text-xs text-editor-text-secondary mb-2">
                                            {template.category || template.brandIdentity?.industry || 'General'}
                                        </p>
                                        
                                        {/* Description */}
                                        {template.description && (
                                            <p className="text-xs text-editor-text-secondary mb-3 line-clamp-2">
                                                {template.description}
                                            </p>
                                        )}
                                        
                                        {/* Tags */}
                                        {template.tags && template.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {template.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="text-xs bg-editor-border px-2 py-0.5 rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {template.tags.length > 3 && (
                                                    <span className="text-xs text-editor-text-secondary">+{template.tags.length - 3}</span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Last Updated */}
                                        <div className="flex items-center gap-1 text-xs text-editor-text-secondary mb-3">
                                            <Clock size={12} />
                                            {template.lastUpdated}
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="flex justify-between items-center pt-3 border-t border-editor-border">
                                            <div className="flex items-center space-x-1">
                                                <button 
                                                    onClick={() => loadProject(template.id, true)} 
                                                    className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-editor-accent transition-colors" 
                                                    title="Edit Template"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => duplicateTemplate(template.id)} 
                                                    className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-blue-500 transition-colors" 
                                                    title="Duplicate Template"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => archiveTemplate(template.id, !template.isArchived)} 
                                                    className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border transition-colors" 
                                                    title={template.isArchived ? 'Activate Template' : 'Archive Template'}
                                                >
                                                    {template.isArchived ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Delete "${template.name}"?`)) {
                                                        deleteProject(template.id);
                                                    }
                                                }} 
                                                className="p-2 text-editor-text-secondary rounded-full hover:bg-red-500/10 hover:text-red-400 transition-colors" 
                                                title="Delete Template"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* List View */
                        <div className="space-y-2">
                            {filteredAndSortedTemplates.map(template => (
                                <div 
                                    key={template.id} 
                                    className={`bg-editor-panel-bg p-4 rounded-lg border border-editor-border flex items-center gap-4 hover:border-editor-accent transition-all ${template.isArchived ? 'opacity-60' : ''} ${selectedTemplates.includes(template.id) ? 'ring-2 ring-editor-accent' : ''}`}
                                >
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedTemplates.includes(template.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTemplates([...selectedTemplates, template.id]);
                                            } else {
                                                setSelectedTemplates(selectedTemplates.filter(id => id !== template.id));
                                            }
                                        }}
                                        className="w-5 h-5 rounded border-editor-border cursor-pointer"
                                    />

                                    {/* Thumbnail */}
                                    <div className="relative flex-shrink-0">
                                        <img 
                                            src={template.thumbnailUrl} 
                                            alt={template.name} 
                                            className="w-32 h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setPreviewTemplate(template)}
                                        />
                                        {template.isFeatured && (
                                            <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-editor-text-primary truncate">{template.name}</h3>
                                            {template.isArchived && (
                                                <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded">Archived</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-editor-text-secondary mb-2">
                                            {template.category || template.brandIdentity?.industry || 'General'}
                                        </p>
                                        {template.description && (
                                            <p className="text-xs text-editor-text-secondary line-clamp-1 mb-2">
                                                {template.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-editor-text-secondary">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {getTemplateUsage(template.id)} sites
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {template.lastUpdated}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {template.tags && template.tags.length > 0 && (
                                        <div className="hidden lg:flex flex-wrap gap-1 max-w-xs">
                                            {template.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-xs bg-editor-border px-2 py-0.5 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => setPreviewTemplate(template)}
                                            className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-editor-accent transition-colors" 
                                            title="Preview"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button 
                                            onClick={() => loadProject(template.id, true)} 
                                            className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-editor-accent transition-colors" 
                                            title="Edit"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button 
                                            onClick={() => duplicateTemplate(template.id)} 
                                            className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-blue-500 transition-colors" 
                                            title="Duplicate"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button 
                                            onClick={() => archiveTemplate(template.id, !template.isArchived)} 
                                            className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border transition-colors" 
                                            title={template.isArchived ? 'Activate' : 'Archive'}
                                        >
                                            {template.isArchived ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (window.confirm(`Delete "${template.name}"?`)) {
                                                    deleteProject(template.id);
                                                }
                                            }} 
                                            className="p-2 text-editor-text-secondary rounded-full hover:bg-red-500/10 hover:text-red-400 transition-colors" 
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredAndSortedTemplates.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <LayoutTemplate className="w-16 h-16 text-editor-text-secondary/40 mb-4" />
                            <h3 className="text-lg font-semibold text-editor-text-primary mb-2">No templates found</h3>
                            <p className="text-sm text-editor-text-secondary mb-6 max-w-md">
                                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' 
                                    ? 'Try adjusting your search or filter criteria'
                                    : 'Get started by creating your first template'
                                }
                            </p>
                            {!(searchTerm || filterCategory !== 'all' || filterStatus !== 'all') && (
                                <button 
                                    onClick={createNewTemplate}
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors"
                                >
                                    <Plus size={18} />
                                    Create Template
                                </button>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewTemplate(null)}>
                    <div 
                        className="bg-editor-panel-bg rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-editor-panel-bg border-b border-editor-border p-6 z-10">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold">{previewTemplate.name}</h2>
                                        {previewTemplate.isFeatured && (
                                            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                        )}
                                    </div>
                                    <p className="text-sm text-editor-text-secondary">
                                        {previewTemplate.category || previewTemplate.brandIdentity?.industry || 'General'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setPreviewTemplate(null)}
                                    className="p-2 rounded-full hover:bg-editor-border transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Large Preview Image */}
                            <div className="mb-6 rounded-lg overflow-hidden">
                                <img 
                                    src={previewTemplate.thumbnailUrl} 
                                    alt={previewTemplate.name}
                                    className="w-full h-auto"
                                />
                            </div>

                            {/* Template Details */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="font-semibold mb-3">Template Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-editor-text-secondary">Category:</span>
                                            <span>{previewTemplate.category || previewTemplate.brandIdentity?.industry || 'General'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-editor-text-secondary">Sites Using:</span>
                                            <span>{getTemplateUsage(previewTemplate.id)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-editor-text-secondary">Last Updated:</span>
                                            <span>{previewTemplate.lastUpdated}</span>
                                        </div>
                                        {previewTemplate.author && (
                                            <div className="flex justify-between">
                                                <span className="text-editor-text-secondary">Author:</span>
                                                <span>{previewTemplate.author}</span>
                                            </div>
                                        )}
                                        {previewTemplate.version && (
                                            <div className="flex justify-between">
                                                <span className="text-editor-text-secondary">Version:</span>
                                                <span>{previewTemplate.version}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-editor-text-secondary">Status:</span>
                                            <span className={previewTemplate.isArchived ? 'text-orange-500' : 'text-green-500'}>
                                                {previewTemplate.isArchived ? 'Archived' : 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-3">Brand Identity</h3>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-editor-text-secondary">Business:</span>
                                            <p>{previewTemplate.brandIdentity?.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-editor-text-secondary">Target Audience:</span>
                                            <p>{previewTemplate.brandIdentity?.targetAudience || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-editor-text-secondary">Tone:</span>
                                            <p>{previewTemplate.brandIdentity?.toneOfVoice || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {previewTemplate.description && (
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-3">Description</h3>
                                    <p className="text-sm text-editor-text-secondary">{previewTemplate.description}</p>
                                </div>
                            )}

                            {/* Tags */}
                            {previewTemplate.tags && previewTemplate.tags.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-3">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {previewTemplate.tags.map(tag => (
                                            <span key={tag} className="bg-editor-border px-3 py-1 rounded-full text-sm">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sections Included */}
                            <div className="mb-6">
                                <h3 className="font-semibold mb-3">Included Sections</h3>
                                <div className="flex flex-wrap gap-2">
                                    {previewTemplate.componentOrder.map(section => (
                                        <span key={section} className="bg-editor-accent/10 text-editor-accent px-3 py-1 rounded text-sm">
                                            {section}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 pt-6 border-t border-editor-border">
                                <button 
                                    onClick={() => {
                                        loadProject(previewTemplate.id, true);
                                        setPreviewTemplate(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors"
                                >
                                    <Edit size={18} />
                                    Edit Template
                                </button>
                                <button 
                                    onClick={() => {
                                        duplicateTemplate(previewTemplate.id);
                                        setPreviewTemplate(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-border text-editor-text-primary rounded-lg hover:bg-editor-border/80 transition-colors"
                                >
                                    <Copy size={18} />
                                    Duplicate
                                </button>
                                <button 
                                    onClick={() => {
                                        archiveTemplate(previewTemplate.id, !previewTemplate.isArchived);
                                        setPreviewTemplate(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-border text-editor-text-primary rounded-lg hover:bg-editor-border/80 transition-colors"
                                >
                                    {previewTemplate.isArchived ? <Eye size={18} /> : <EyeOff size={18} />}
                                    {previewTemplate.isArchived ? 'Activate' : 'Archive'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedTemplates.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-editor-panel-bg border-2 border-editor-accent rounded-lg shadow-2xl p-4 flex items-center gap-4 z-40">
                    <span className="text-sm font-medium">
                        {selectedTemplates.length} template{selectedTemplates.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="h-6 w-px bg-editor-border" />
                    <button 
                        onClick={handleBulkArchive}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-md text-sm font-medium hover:bg-orange-500/20 transition-colors"
                    >
                        <Archive size={16} />
                        Archive
                    </button>
                    <button 
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-md text-sm font-medium hover:bg-red-500/20 transition-colors"
                    >
                        <Trash2 size={16} />
                        Delete
                    </button>
                    <div className="h-6 w-px bg-editor-border" />
                    <button 
                        onClick={() => setSelectedTemplates([])}
                        className="px-3 py-1.5 text-sm font-medium text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
};

export default TemplateManagement;
