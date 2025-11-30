import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import { 
    ArrowLeft, 
    Menu, 
    LayoutTemplate, 
    Plus, 
    Edit, 
    Trash2,
    Eye,
    EyeOff,
    Search,
    Grid,
    List,
    Copy,
    X,
    TrendingUp,
    Archive,
    Globe,
    Filter,
    Star,
    Image as ImageIcon,
    Building2,
    Settings2
} from 'lucide-react';
import { Project } from '../../../types';
import ThumbnailEditor from '../../ui/ThumbnailEditor';
import TemplateEditorModal from './TemplateEditorModal';
import { INDUSTRIES, INDUSTRY_CATEGORIES } from '../../../data/industries';
import { db, doc, setDoc } from '../../../firebase';

interface TemplateManagementProps {
    onBack: () => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'usage' | 'recent' | 'category';

const TemplateManagement: React.FC<TemplateManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { projects, loadProject, createNewTemplate, deleteProject, archiveTemplate, duplicateTemplate, updateTemplateInState, userDocument } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterIndustry, setFilterIndustry] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    
    // Preview and Filters States
    const [previewTemplate, setPreviewTemplate] = useState<Project | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [thumbnailEditTemplate, setThumbnailEditTemplate] = useState<Project | null>(null);
    
    // Template Editor Modal
    const [editingTemplate, setEditingTemplate] = useState<Project | null>(null);

    // Helper to extract actual colors from template (check theme.globalColors first, then section colors)
    const getThemeColors = (template: Project): string[] => {
        // Try globalColors first
        const gc = template.theme?.globalColors;
        if (gc?.primary || gc?.secondary || gc?.accent) {
            return [gc.primary, gc.secondary, gc.accent, gc.background, gc.text].filter(Boolean) as string[];
        }
        
        // Fallback to hero colors
        const hc = template.data?.hero?.colors;
        if (hc) {
            return [hc.primary, hc.secondary, hc.background, hc.text, hc.heading].filter(Boolean) as string[];
        }
        
        // Fallback to header colors
        const headerC = template.data?.header?.colors;
        if (headerC) {
            return [headerC.background, headerC.text, headerC.accent].filter(Boolean) as string[];
        }
        
        return [];
    };

    const templates = projects.filter(p => p.status === 'Template');
    const userProjects = projects.filter(p => p.status !== 'Template');

    const getTemplateUsage = (templateId: string) => {
        return userProjects.filter(p => p.sourceTemplateId === templateId).length;
    };

    // Check if user can delete templates (only owner and superadmin)
    const canDeleteTemplates = () => {
        const userRole = userDocument?.role || '';
        return ['owner', 'superadmin'].includes(userRole);
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

    // Get unique industries used in templates
    const usedIndustries = useMemo(() => {
        const industries = new Set<string>();
        templates.forEach(t => {
            if (t.industries && Array.isArray(t.industries)) {
                t.industries.forEach(ind => industries.add(ind));
            }
        });
        return Array.from(industries).sort();
    }, [templates]);

    // Get industry label for display
    const getIndustryLabel = (industryId: string): string => {
        const industry = INDUSTRIES.find(i => i.id === industryId);
        if (industry) {
            const key = industry.labelKey.replace('industries.', '');
            return t(`industries.${key}`, { defaultValue: industryId });
        }
        return industryId;
    };

    // Update template in Firestore
    const updateTemplate = async (templateId: string, updates: Partial<Project>) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) throw new Error('Template not found');
        
        const updatedData = {
            ...template,
            ...updates,
            lastUpdated: new Date().toISOString()
        };
        
        const { id, ...dataToSave } = updatedData;
        
        const templateDocRef = doc(db, 'templates', templateId);
        await setDoc(templateDocRef, dataToSave);
        
        // Update local state immediately so changes are visible
        updateTemplateInState(templateId, updatedData);
        
        setEditingTemplate(null);
    };

    // Filter and sort templates
    const filteredAndSortedTemplates = useMemo(() => {
        let result = [...templates];

        // Apply search filter (also search in industries)
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(t => 
                t.name.toLowerCase().includes(search) ||
                t.description?.toLowerCase().includes(search) ||
                t.brandIdentity?.industry?.toLowerCase().includes(search) ||
                t.tags?.some(tag => tag.toLowerCase().includes(search)) ||
                t.industries?.some(ind => getIndustryLabel(ind).toLowerCase().includes(search))
            );
        }

        // Apply category filter
        if (filterCategory !== 'all') {
            result = result.filter(t => 
                t.category === filterCategory || 
                t.brandIdentity?.industry === filterCategory
            );
        }

        // Apply industry filter
        if (filterIndustry !== 'all') {
            result = result.filter(t => 
                t.industries?.includes(filterIndustry)
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
    }, [templates, searchTerm, filterCategory, filterIndustry, filterStatus, sortBy]);

    // Get most used template
    const getMostUsedTemplate = () => {
        if (templates.length === 0) return null;
        return templates.reduce((prev, current) => 
            getTemplateUsage(current.id) > getTemplateUsage(prev.id) ? current : prev
        );
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
                                className={`p-1.5 transition-all ${viewMode === 'grid' ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                title="Grid View"
                            >
                                <Grid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 transition-all ${viewMode === 'list' ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                title="List View"
                            >
                                <List size={16} />
                            </button>
                        </div>

                        {/* Filter Toggle */}
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all ${showFilters ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden lg:inline">Filters</span>
                        </button>

                        <button onClick={createNewTemplate} className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-accent hover:text-editor-accent/80">
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
                                <label className="text-xs text-editor-text-secondary">{t('superadmin.sortByCategory')}</label>
                                <select 
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="bg-editor-border/40 px-3 py-1.5 rounded-md text-sm outline-none border border-transparent focus:border-editor-accent"
                                >
                                    <option value="all">{t('superadmin.allCategories')}</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Industry Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-editor-text-secondary flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {t('industries.title')}
                                </label>
                                <select 
                                    value={filterIndustry}
                                    onChange={(e) => setFilterIndustry(e.target.value)}
                                    className="bg-editor-border/40 px-3 py-1.5 rounded-md text-sm outline-none border border-transparent focus:border-editor-accent min-w-[160px]"
                                >
                                    <option value="all">{t('superadmin.allCategories')}</option>
                                    {usedIndustries.map(ind => (
                                        <option key={ind} value={ind}>{getIndustryLabel(ind)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-editor-text-secondary">{t('leads.status')}</label>
                                <select 
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="bg-editor-border/40 px-3 py-1.5 rounded-md text-sm outline-none border border-transparent focus:border-editor-accent"
                                >
                                    <option value="all">{t('superadmin.allTemplates')}</option>
                                    <option value="active">{t('superadmin.activeTemplates')}</option>
                                    <option value="archived">{t('superadmin.archivedTemplates')}</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-editor-text-secondary">{t('leads.sort')}</label>
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="bg-editor-border/40 px-3 py-1.5 rounded-md text-sm outline-none border border-transparent focus:border-editor-accent"
                                >
                                    <option value="recent">{t('superadmin.sortByRecent')}</option>
                                    <option value="name">{t('superadmin.sortByName')}</option>
                                    <option value="usage">{t('superadmin.sortByUsage')}</option>
                                    <option value="category">{t('superadmin.sortByCategory')}</option>
                                </select>
                            </div>

                            {(searchTerm || filterCategory !== 'all' || filterIndustry !== 'all' || filterStatus !== 'all') && (
                                <div className="flex items-end">
                                    <button 
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterCategory('all');
                                            setFilterIndustry('all');
                                            setFilterStatus('all');
                                        }}
                                        className="px-3 py-1.5 rounded-md text-sm text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                                    >
                                        {t('superadmin.clearFilters')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {/* Statistics - Simple inline */}
                    <div className="flex flex-wrap items-center gap-6 mb-6 text-sm">
                        <div className="flex items-center gap-2">
                            <LayoutTemplate size={16} className="text-editor-accent" />
                            <span className="text-editor-text-secondary">Total Templates:</span>
                            <span className="font-bold">{templates.length}</span>
                            <span className="text-editor-text-secondary text-xs">({activeTemplates} active)</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Globe size={16} className="text-blue-500" />
                            <span className="text-editor-text-secondary">Sites Created:</span>
                            <span className="font-bold">{totalSitesUsingTemplates}</span>
                            <span className="text-editor-text-secondary text-xs">from templates</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-500" />
                            <span className="text-editor-text-secondary">Most Popular:</span>
                            <span className="font-bold">{mostUsedTemplate?.name || 'N/A'}</span>
                            <span className="text-editor-text-secondary text-xs">
                                {mostUsedTemplate ? `(${getTemplateUsage(mostUsedTemplate.id)} uses)` : ''}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Archive size={16} className="text-orange-500" />
                            <span className="text-editor-text-secondary">Archived:</span>
                            <span className="font-bold">{archivedTemplates}</span>
                            <span className="text-editor-text-secondary text-xs">templates</span>
                        </div>
                    </div>

                    {/* Results Header */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-editor-text-secondary">
                            {filteredAndSortedTemplates.length} {filteredAndSortedTemplates.length === 1 ? 'template' : 'templates'}
                        </p>
                    </div>

                    {/* Templates Grid */}
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAndSortedTemplates.map(template => (
                                <div 
                                    key={template.id} 
                                    className={`relative rounded-2xl overflow-hidden group hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 h-[400px] ${template.isArchived ? 'opacity-50' : ''}`}
                                >
                                    {/* Full Background Image */}
                                    <div 
                                        className="absolute inset-0 cursor-pointer"
                                        onClick={() => setPreviewTemplate(template)}
                                    >
                                        <img 
                                            src={template.thumbnailUrl} 
                                            alt={template.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                        />
                                        
                                        {/* Dark Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                                        
                                        {/* Archived Overlay */}
                                        {template.isArchived && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                                <div className="text-center">
                                                    <Archive className="w-12 h-12 text-white mx-auto mb-2" />
                                                    <span className="text-white text-sm font-semibold">Archived</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Hover Actions Overlay */}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px] pointer-events-none" />
                                    </div>

                                    {/* Top Section: Color Swatches */}
                                    <div className="absolute top-4 right-4 z-20">
                                        {/* Color Swatches */}
                                        {getThemeColors(template).length > 0 && (
                                            <div className="flex gap-1">
                                                {getThemeColors(template).map((color, index) => (
                                                    <div
                                                        key={index}
                                                        className="w-3 h-3 rounded-[3px] shadow-md border border-white/40 transition-transform hover:scale-125"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content at Bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 z-30 p-6">
                                        <h3 className="font-bold text-2xl text-white mb-3 line-clamp-2">{template.name}</h3>
                                        
                                        {/* Industries Tags */}
                                        {template.industries && template.industries.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {template.industries.slice(0, 3).map(ind => (
                                                    <span 
                                                        key={ind}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white text-xs rounded backdrop-blur-sm"
                                                    >
                                                        <Building2 className="w-3 h-3" />
                                                        {getIndustryLabel(ind)}
                                                    </span>
                                                ))}
                                                {template.industries.length > 3 && (
                                                    <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded backdrop-blur-sm">
                                                        +{template.industries.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Actions */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 relative z-40">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    loadProject(template.id, true);
                                                }} 
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-semibold hover:scale-110 transition-transform shadow-2xl" 
                                                title={t('common.edit')}
                                            >
                                                <Edit size={16} />
                                                {t('common.edit')}
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingTemplate(template);
                                                }} 
                                                className="p-2.5 bg-white/90 text-purple-600 rounded-full hover:scale-110 transition-transform shadow-2xl" 
                                                title={t('industries.title')}
                                            >
                                                <Settings2 size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setThumbnailEditTemplate(template);
                                                }} 
                                                className="p-2.5 bg-white/90 text-blue-600 rounded-full hover:scale-110 transition-transform shadow-2xl" 
                                                title="Change Thumbnail"
                                            >
                                                <ImageIcon size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    duplicateTemplate(template.id);
                                                }} 
                                                className="p-2.5 bg-white/90 text-green-600 rounded-full hover:scale-110 transition-transform shadow-2xl" 
                                                title={t('superadmin.duplicateTemplate')}
                                            >
                                                <Copy size={18} />
                                            </button>
                                            {canDeleteTemplates() && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`Delete "${template.name}"?`)) {
                                                            deleteProject(template.id).catch(err => {
                                                                alert(err.message || 'No tienes permisos para borrar templates');
                                                            });
                                                        }
                                                    }} 
                                                    className="p-2.5 bg-white/90 text-red-500 rounded-full hover:scale-110 transition-transform shadow-2xl" 
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* List View */
                        <div className="space-y-3">
                            {filteredAndSortedTemplates.map(template => (
                                <div 
                                    key={template.id} 
                                    className={`bg-editor-panel-bg p-4 rounded-lg border border-editor-border flex items-center gap-4 hover:border-editor-accent transition-all ${template.isArchived ? 'opacity-50' : ''}`}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative flex-shrink-0">
                                        <img 
                                            src={template.thumbnailUrl} 
                                            alt={template.name} 
                                            className="w-24 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setPreviewTemplate(template)}
                                        />
                                        {/* Color Swatches */}
                                        {getThemeColors(template).length > 0 && (
                                            <div className="absolute bottom-1 right-1 flex gap-0.5">
                                                {getThemeColors(template).map((color, index) => (
                                                    <div
                                                        key={index}
                                                        className="w-2 h-2 rounded-[2px] shadow-sm border border-white/50"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        {template.isArchived && (
                                            <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                                                <Archive className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-editor-text-primary truncate mb-1">{template.name}</h3>
                                        {/* Industry tags in list view */}
                                        {template.industries && template.industries.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Building2 className="w-3 h-3 text-editor-accent" />
                                                <span className="text-xs text-editor-accent">
                                                    {template.industries.length} {t('industries.title').toLowerCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setPreviewTemplate(template)}
                                            className="p-2 text-editor-text-secondary rounded-md hover:bg-editor-border hover:text-editor-accent transition-colors" 
                                            title={t('common.view')}
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button 
                                            onClick={() => loadProject(template.id, true)} 
                                            className="flex items-center gap-1.5 px-3 py-2 bg-editor-accent text-white rounded-md text-sm hover:bg-editor-accent/90 transition-colors" 
                                            title={t('common.edit')}
                                        >
                                            <Edit size={14} />
                                            {t('common.edit')}
                                        </button>
                                        <button 
                                            onClick={() => setEditingTemplate(template)}
                                            className="p-2 text-editor-text-secondary rounded-md hover:bg-editor-border hover:text-purple-400 transition-colors" 
                                            title={t('industries.title')}
                                        >
                                            <Settings2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => setThumbnailEditTemplate(template)} 
                                            className="p-2 text-editor-text-secondary rounded-md hover:bg-editor-border hover:text-blue-400 transition-colors" 
                                            title="Change Thumbnail"
                                        >
                                            <ImageIcon size={18} />
                                        </button>
                                        <button 
                                            onClick={() => duplicateTemplate(template.id)} 
                                            className="p-2 text-editor-text-secondary rounded-md hover:bg-editor-border hover:text-editor-text-primary transition-colors" 
                                            title="Duplicate"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        {canDeleteTemplates() && (
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Delete "${template.name}"?`)) {
                                                        deleteProject(template.id).catch(err => {
                                                            alert(err.message || 'No tienes permisos para borrar templates');
                                                        });
                                                    }
                                                }} 
                                                className="p-2 text-editor-text-secondary rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors" 
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
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

            {/* Thumbnail Editor Modal */}
            {thumbnailEditTemplate && (
                <ThumbnailEditor 
                    key={`thumbnail-${thumbnailEditTemplate.id}`}
                    project={thumbnailEditTemplate} 
                    onClose={() => setThumbnailEditTemplate(null)} 
                />
            )}

            {/* Template Editor Modal (Industries & Metadata) */}
            <TemplateEditorModal
                isOpen={!!editingTemplate}
                onClose={() => setEditingTemplate(null)}
                template={editingTemplate}
                onSave={updateTemplate}
            />

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
                            {/* Large Preview Image with Color Swatches */}
                            <div className="mb-6 rounded-lg overflow-hidden relative">
                                <img 
                                    src={previewTemplate.thumbnailUrl} 
                                    alt={previewTemplate.name}
                                    className="w-full h-auto"
                                />
                                {/* Color Swatches */}
                                {getThemeColors(previewTemplate).length > 0 && (
                                    <div className="absolute bottom-4 right-4 flex gap-1.5">
                                        {getThemeColors(previewTemplate).map((color, index) => (
                                            <div
                                                key={index}
                                                className="w-5 h-5 rounded-md shadow-lg border border-white/40"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Template Details */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="font-semibold mb-3">Template Information</h3>
                                    <div className="space-y-2 text-sm">
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

                            {/* Industries */}
                            {previewTemplate.industries && previewTemplate.industries.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        {t('industries.title')}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {previewTemplate.industries.map(ind => (
                                            <span key={ind} className="bg-editor-accent/20 text-editor-accent px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {getIndustryLabel(ind)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {previewTemplate.tags && previewTemplate.tags.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-3">{t('cms.tags')}</h3>
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
                                        setPreviewTemplate(null);
                                        setEditingTemplate(previewTemplate);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    <Settings2 size={18} />
                                    {t('industries.title')}
                                </button>
                                <button 
                                    onClick={() => {
                                        setPreviewTemplate(null);
                                        setThumbnailEditTemplate(previewTemplate);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <ImageIcon size={18} />
                                    Change Thumbnail
                                </button>
                                <button 
                                    onClick={() => {
                                        duplicateTemplate(previewTemplate.id);
                                        setPreviewTemplate(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-border text-editor-text-primary rounded-lg hover:bg-editor-border/80 transition-colors"
                                >
                                    <Copy size={18} />
                                    {t('superadmin.duplicateTemplate')}
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

        </div>
    );
};

export default TemplateManagement;
