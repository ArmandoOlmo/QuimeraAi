import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
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
    Settings2,
    ShoppingCart,
    Loader2,
    Dumbbell
} from 'lucide-react';
import { Project } from '../../../types';
import ThumbnailEditor from '../../ui/ThumbnailEditor';
import TemplateEditorModal from './TemplateEditorModal';
import { INDUSTRIES, INDUSTRY_CATEGORIES } from '../../../data/industries';
import { db, doc, setDoc } from '../../../firebase';
import { migrateTemplatesWithEcommerce } from '../../../scripts/migrateTemplatesEcommerce';
import { seedGymBrutalistTemplate } from '../../../scripts/seedGymTemplate';

interface TemplateManagementProps {
    onBack: () => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'usage' | 'recent' | 'category';

const TemplateManagement: React.FC<TemplateManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { error: showError, success: showSuccess } = useToast();
    const { userDocument } = useAuth();
    const { projects, loadProject, createNewTemplate, deleteProject, archiveTemplate, duplicateTemplate, updateTemplateInState, refreshProjects } = useProject();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

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
        console.log('🔄 updateTemplate called with:', { templateId, updates });

        const template = templates.find(t => t.id === templateId);
        if (!template) throw new Error('Template not found');

        const updatedData = {
            ...template,
            ...updates,
            lastUpdated: new Date().toISOString()
        };

        const { id, ...dataToSave } = updatedData;

        console.log('📤 Saving to Firestore:', {
            templateId,
            thumbnailUrl: dataToSave.thumbnailUrl?.substring(0, 50),
            industries: dataToSave.industries
        });

        const templateDocRef = doc(db, 'templates', templateId);
        await setDoc(templateDocRef, dataToSave);

        console.log('✅ Firestore save complete');

        // Update local state immediately so changes are visible
        updateTemplateInState(templateId, updatedData);

        setEditingTemplate(null);
    };

    // Migrate templates with ecommerce components
    const handleMigrateEcommerce = async () => {
        if (!window.confirm(t('superadmin.templateManagement.migrateEcommerceConfirm', '¿Migrar todos los templates para agregar componentes de ecommerce con los colores del template?'))) {
            return;
        }

        setIsMigrating(true);
        try {
            const results = await migrateTemplatesWithEcommerce();
            showSuccess(
                t('superadmin.templateManagement.migrateEcommerceSuccess',
                    `Migración completada: ${results.updated} templates actualizados, ${results.skipped} omitidos`)
            );
            // Refresh templates to show updated data
            await refreshProjects();
        } catch (error: any) {
            console.error('Migration error:', error);
            showError(
                t('superadmin.templateManagement.migrateEcommerceError',
                    `Error en la migración: ${error.message}`)
            );
        } finally {
            setIsMigrating(false);
        }
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
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        {/* Botón hamburguesa para abrir sidebar en móvil */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-10 w-10 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary lg:hidden transition-colors flex-shrink-0"
                            title="Open menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <button onClick={onBack} className="h-10 w-10 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary md:hidden transition-colors flex-shrink-0" title="Volver">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <LayoutTemplate className="text-editor-accent w-5 h-5" />
                            <h1 className="text-base sm:text-lg font-semibold text-editor-text-primary truncate">{t('superadmin.templateManagement.title', 'Templates')}</h1>
                        </div>

                        {/* Search Bar - Desktop */}
                        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md bg-editor-border/40 rounded-lg px-3 py-2">
                            <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                placeholder={t('superadmin.templateManagement.searchPlaceholder', 'Search templates...')}
                                className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        {/* Back Button - First */}
                        <button onClick={onBack} className="hidden sm:flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden lg:inline">{t('superadmin.templateManagement.back', 'Back')}</span>
                        </button>

                        {/* View Mode Toggle - Mobile */}
                        <div className="flex sm:hidden items-center gap-0.5 bg-editor-border/40 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 transition-all rounded ${viewMode === 'grid' ? 'text-editor-accent bg-editor-accent/10' : 'text-editor-text-secondary'}`}
                                title="Grid View"
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 transition-all rounded ${viewMode === 'list' ? 'text-editor-accent bg-editor-accent/10' : 'text-editor-text-secondary'}`}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                        </div>

                        {/* View Mode Toggle - Desktop */}
                        <div className="hidden sm:flex items-center gap-0.5 bg-editor-border/40 rounded-lg p-1">
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

                        {/* Migrate Ecommerce Button */}
                        <button
                            onClick={handleMigrateEcommerce}
                            disabled={isMigrating}
                            className="flex items-center justify-center h-10 w-10 sm:h-9 sm:w-auto sm:px-3 rounded-lg text-sm font-medium transition-all text-green-500 hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('superadmin.templateManagement.migrateEcommerce', 'Add ecommerce components to all templates')}
                        >
                            {isMigrating ? (
                                <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                            ) : (
                                <ShoppingCart className="w-5 h-5 sm:w-4 sm:h-4" />
                            )}
                            <span className="hidden lg:inline ml-1.5">
                                {isMigrating
                                    ? t('superadmin.templateManagement.migrating', 'Migrating...')
                                    : t('superadmin.templateManagement.migrateEcommerce', 'Ecommerce')}
                            </span>
                        </button>

                        {/* Seed Gym Template Button */}
                        <button
                            onClick={async () => {
                                if (!window.confirm('Seed the "Dark Brutalist Gym" template? This will add it to the templates list.')) return;
                                try {
                                    const result = await seedGymBrutalistTemplate();
                                    if (result.success) {
                                        showSuccess(result.message);
                                        refreshProjects();
                                    } else {
                                        showError(result.message);
                                    }
                                } catch (err: any) {
                                    showError(`Error: ${err.message}`);
                                }
                            }}
                            className="flex items-center justify-center h-10 w-10 sm:h-9 sm:w-auto sm:px-3 rounded-lg text-sm font-medium transition-all text-orange-500 hover:bg-orange-500/10"
                            title="Seed Dark Brutalist Gym template"
                        >
                            <Dumbbell className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span className="hidden lg:inline ml-1.5">Gym Template</span>
                        </button>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-center h-10 w-10 sm:h-9 sm:w-auto sm:px-3 rounded-lg text-sm font-medium transition-all ${showFilters ? 'text-editor-accent bg-editor-accent/10' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                        >
                            <Filter className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span className="hidden lg:inline ml-1.5">{t('superadmin.templateManagement.filters', 'Filters')}</span>
                        </button>

                        <button onClick={createNewTemplate} className="flex items-center justify-center h-10 w-10 sm:h-9 sm:w-auto sm:px-3 rounded-lg text-sm font-medium transition-all text-editor-accent hover:bg-editor-accent/10">
                            <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline ml-1.5">{t('superadmin.templateManagement.new', 'New')}</span>
                        </button>
                    </div>
                </header>

                {/* Mobile Search */}
                <div className="md:hidden px-3 py-3 border-b border-editor-border bg-editor-bg/50">
                    <div className="flex items-center gap-2 bg-editor-border/40 rounded-xl px-4 py-2.5">
                        <Search className="w-5 h-5 text-editor-text-secondary flex-shrink-0" />
                        <input
                            type="text"
                            placeholder={t('superadmin.templateManagement.searchPlaceholder', 'Search templates...')}
                            className="flex-1 bg-transparent outline-none text-base min-w-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary p-1 flex-shrink-0">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="px-3 sm:px-6 py-4 border-b border-editor-border bg-editor-panel-bg/50">
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-editor-text-secondary">{t('superadmin.sortByCategory')}</label>
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="bg-editor-border/40 px-3 py-2.5 sm:py-1.5 rounded-lg text-sm outline-none border border-transparent focus:border-editor-accent w-full"
                                >
                                    <option value="all">{t('superadmin.allCategories')}</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Industry Filter */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-editor-text-secondary flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {t('industries.title')}
                                </label>
                                <select
                                    value={filterIndustry}
                                    onChange={(e) => setFilterIndustry(e.target.value)}
                                    className="bg-editor-border/40 px-3 py-2.5 sm:py-1.5 rounded-lg text-sm outline-none border border-transparent focus:border-editor-accent w-full sm:min-w-[160px]"
                                >
                                    <option value="all">{t('superadmin.allCategories')}</option>
                                    {usedIndustries.map(ind => (
                                        <option key={ind} value={ind}>{getIndustryLabel(ind)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-editor-text-secondary">{t('leads.status')}</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="bg-editor-border/40 px-3 py-2.5 sm:py-1.5 rounded-lg text-sm outline-none border border-transparent focus:border-editor-accent w-full"
                                >
                                    <option value="all">{t('superadmin.allTemplates')}</option>
                                    <option value="active">{t('superadmin.activeTemplates')}</option>
                                    <option value="archived">{t('superadmin.archivedTemplates')}</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-editor-text-secondary">{t('leads.sort')}</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="bg-editor-border/40 px-3 py-2.5 sm:py-1.5 rounded-lg text-sm outline-none border border-transparent focus:border-editor-accent w-full"
                                >
                                    <option value="recent">{t('superadmin.sortByRecent')}</option>
                                    <option value="name">{t('superadmin.sortByName')}</option>
                                    <option value="usage">{t('superadmin.sortByUsage')}</option>
                                    <option value="category">{t('superadmin.sortByCategory')}</option>
                                </select>
                            </div>

                            {(searchTerm || filterCategory !== 'all' || filterIndustry !== 'all' || filterStatus !== 'all') && (
                                <div className="col-span-2 sm:col-span-1 flex items-end">
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterCategory('all');
                                            setFilterIndustry('all');
                                            setFilterStatus('all');
                                        }}
                                        className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 rounded-lg text-sm text-editor-text-secondary hover:text-editor-text-primary bg-editor-border/30 hover:bg-editor-border/50 transition-colors"
                                    >
                                        {t('superadmin.clearFilters')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto">
                    {/* Statistics Cards - Responsive Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                        {/* Total Templates Card */}
                        <div className="group relative bg-gradient-to-br from-editor-panel-bg to-editor-panel-bg/80 rounded-2xl p-4 sm:p-5 border border-editor-border/50 hover:border-editor-accent/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-editor-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 sm:p-2.5 bg-editor-accent/15 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <LayoutTemplate size={18} className="sm:w-5 sm:h-5 text-editor-accent" />
                                    </div>
                                    <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-editor-accent/10 text-editor-accent rounded-full">
                                        {activeTemplates} {t('superadmin.templateManagement.active', 'active')}
                                    </span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-editor-text-primary mb-0.5 group-hover:text-editor-accent transition-colors">{templates.length}</div>
                                <p className="text-xs sm:text-sm text-editor-text-secondary font-medium">{t('superadmin.templateManagement.totalTemplates', 'Total Templates')}</p>
                            </div>
                        </div>

                        {/* Sites Created Card */}
                        <div className="group relative bg-gradient-to-br from-editor-panel-bg to-editor-panel-bg/80 rounded-2xl p-4 sm:p-5 border border-editor-border/50 hover:border-blue-500/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 sm:p-2.5 bg-blue-500/15 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Globe size={18} className="sm:w-5 sm:h-5 text-blue-500" />
                                    </div>
                                    <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full truncate max-w-[80px] sm:max-w-none">
                                        {t('superadmin.templateManagement.fromTemplates', 'from templates')}
                                    </span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-editor-text-primary mb-0.5 group-hover:text-blue-400 transition-colors">{totalSitesUsingTemplates}</div>
                                <p className="text-xs sm:text-sm text-editor-text-secondary font-medium">{t('superadmin.templateManagement.sitesCreated', 'Sites Created')}</p>
                            </div>
                        </div>

                        {/* Most Popular Card */}
                        <div className="group relative bg-gradient-to-br from-editor-panel-bg to-editor-panel-bg/80 rounded-2xl p-4 sm:p-5 border border-editor-border/50 hover:border-green-500/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 sm:p-2.5 bg-green-500/15 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <TrendingUp size={18} className="sm:w-5 sm:h-5 text-green-500" />
                                    </div>
                                    {mostUsedTemplate && (
                                        <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">
                                            {getTemplateUsage(mostUsedTemplate.id)} {t('superadmin.templateManagement.uses', 'uses')}
                                        </span>
                                    )}
                                </div>
                                <div className="text-base sm:text-xl font-bold text-editor-text-primary mb-0.5 group-hover:text-green-400 transition-colors truncate" title={mostUsedTemplate?.name}>
                                    {mostUsedTemplate?.name || 'N/A'}
                                </div>
                                <p className="text-xs sm:text-sm text-editor-text-secondary font-medium">{t('superadmin.templateManagement.mostPopular', 'Most Popular')}</p>
                            </div>
                        </div>

                        {/* Archived Card */}
                        <div className="group relative bg-gradient-to-br from-editor-panel-bg to-editor-panel-bg/80 rounded-2xl p-4 sm:p-5 border border-editor-border/50 hover:border-orange-500/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 sm:p-2.5 bg-orange-500/15 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Archive size={18} className="sm:w-5 sm:h-5 text-orange-500" />
                                    </div>
                                    <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full">
                                        {t('superadmin.templateManagement.title', 'Templates')}
                                    </span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-editor-text-primary mb-0.5 group-hover:text-orange-400 transition-colors">{archivedTemplates}</div>
                                <p className="text-xs sm:text-sm text-editor-text-secondary font-medium">{t('superadmin.templateManagement.archived', 'Archived')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Results Header */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-editor-text-secondary">
                            {filteredAndSortedTemplates.length} {filteredAndSortedTemplates.length === 1 ? t('superadmin.templateManagement.title', 'template').toLowerCase().slice(0, -1) : t('superadmin.templateManagement.title', 'Templates').toLowerCase()}
                        </p>
                    </div>

                    {/* Templates Grid */}
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {filteredAndSortedTemplates.map(template => (
                                <div
                                    key={template.id}
                                    className={`relative rounded-2xl overflow-hidden group hover:shadow-2xl sm:hover:scale-[1.02] transition-all duration-500 h-[320px] sm:h-[400px] ${template.isArchived ? 'opacity-50' : ''}`}
                                >
                                    {/* Full Background Image */}
                                    <div
                                        className="absolute inset-0 cursor-pointer"
                                        onClick={() => setPreviewTemplate(template)}
                                    >
                                        {template.thumbnailUrl ? (
                                            <img
                                                src={template.thumbnailUrl}
                                                alt={template.name}
                                                className="w-full h-full object-cover sm:group-hover:scale-110 transition-transform duration-700"
                                                onError={(e) => {
                                                    // Hide broken image and show placeholder
                                                    e.currentTarget.style.display = 'none';
                                                    const placeholder = e.currentTarget.nextElementSibling;
                                                    if (placeholder) placeholder.classList.remove('hidden');
                                                }}
                                            />
                                        ) : null}
                                        {/* Placeholder when no thumbnail */}
                                        <div className={`absolute inset-0 bg-gradient-to-br from-editor-accent/20 via-editor-panel-bg to-editor-bg flex flex-col items-center justify-center ${template.thumbnailUrl ? 'hidden' : ''}`}>
                                            <LayoutTemplate className="w-16 h-16 text-editor-accent/40 mb-3" />
                                            <span className="text-editor-text-secondary text-sm font-medium">{t('superadmin.templateManagement.noThumbnail', 'No thumbnail')}</span>
                                        </div>

                                        {/* Dark Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                                        {/* Archived Overlay */}
                                        {template.isArchived && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                                <div className="text-center">
                                                    <Archive className="w-10 h-10 sm:w-12 sm:h-12 text-white mx-auto mb-2" />
                                                    <span className="text-white text-sm font-semibold">{t('superadmin.templateManagement.archivedLabel', 'Archived')}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hover Actions Overlay - Desktop only */}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px] pointer-events-none" />
                                    </div>

                                    {/* Top Section: Color Swatches */}
                                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20">
                                        {/* Color Swatches */}
                                        {getThemeColors(template).length > 0 && (
                                            <div className="flex gap-1">
                                                {getThemeColors(template).map((color, index) => (
                                                    <div
                                                        key={index}
                                                        className="w-4 h-4 sm:w-3 sm:h-3 rounded-[4px] sm:rounded-[3px] shadow-md border border-white/40 transition-transform hover:scale-125"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content at Bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6">
                                        <h3 className="font-bold text-xl sm:text-2xl text-white mb-2 sm:mb-3 line-clamp-2">{template.name}</h3>

                                        {/* Industries Tags */}
                                        {template.industries && template.industries.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {template.industries.slice(0, 2).map(ind => (
                                                    <span
                                                        key={ind}
                                                        className="inline-flex items-center gap-1 px-2 py-1 sm:py-0.5 bg-white/20 text-white text-xs rounded-lg sm:rounded backdrop-blur-sm"
                                                    >
                                                        <Building2 className="w-3 h-3" />
                                                        <span className="hidden xs:inline">{getIndustryLabel(ind)}</span>
                                                    </span>
                                                ))}
                                                {template.industries.length > 2 && (
                                                    <span className="px-2 py-1 sm:py-0.5 bg-white/20 text-white text-xs rounded-lg sm:rounded backdrop-blur-sm">
                                                        +{template.industries.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions - Always visible on mobile, hover on desktop */}
                                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 relative z-40">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    loadProject(template.id, true);
                                                }}
                                                className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-4 py-2.5 sm:py-2 bg-white text-black rounded-full text-sm font-semibold active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl"
                                                title={t('common.edit')}
                                            >
                                                <Edit size={16} />
                                                <span className="hidden xs:inline">{t('common.edit')}</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingTemplate(template);
                                                }}
                                                className="p-3 sm:p-2.5 bg-white/90 text-purple-600 rounded-full active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl"
                                                title={t('industries.title')}
                                            >
                                                <Settings2 size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setThumbnailEditTemplate(template);
                                                }}
                                                className="p-3 sm:p-2.5 bg-white/90 text-blue-600 rounded-full active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl"
                                                title="Change Thumbnail"
                                            >
                                                <ImageIcon size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    duplicateTemplate(template.id);
                                                }}
                                                className="p-3 sm:p-2.5 bg-white/90 text-green-600 rounded-full active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl hidden xs:flex"
                                                title={t('superadmin.duplicateTemplate')}
                                            >
                                                <Copy size={18} />
                                            </button>
                                            {canDeleteTemplates() && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(t('superadmin.templateManagement.deleteConfirmation', { name: template.name }))) {
                                                            deleteProject(template.id).catch(err => {
                                                                showError(err.message || t('superadmin.templateManagement.deleteError', 'You do not have permission to delete templates'));
                                                            });
                                                        }
                                                    }}
                                                    className="p-3 sm:p-2.5 bg-white/90 text-red-500 rounded-full active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl"
                                                    title={t('superadmin.templateManagement.delete', 'Delete')}
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
                                    className={`bg-editor-panel-bg p-3 sm:p-4 rounded-xl border border-editor-border hover:border-editor-accent transition-all ${template.isArchived ? 'opacity-50' : ''}`}
                                >
                                    {/* Mobile: Stacked layout */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                        {/* Thumbnail + Info row on mobile */}
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            {/* Thumbnail */}
                                            <div className="relative flex-shrink-0">
                                                {template.thumbnailUrl ? (
                                                    <img
                                                        src={template.thumbnailUrl}
                                                        alt={template.name}
                                                        className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => setPreviewTemplate(template)}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            const placeholder = e.currentTarget.nextElementSibling;
                                                            if (placeholder) placeholder.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : null}
                                                {/* Placeholder for list view */}
                                                <div
                                                    className={`w-20 h-14 sm:w-24 sm:h-16 rounded-lg bg-gradient-to-br from-editor-accent/20 via-editor-panel-bg to-editor-bg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${template.thumbnailUrl ? 'hidden' : ''}`}
                                                    onClick={() => setPreviewTemplate(template)}
                                                >
                                                    <LayoutTemplate className="w-6 h-6 text-editor-accent/40" />
                                                </div>
                                                {/* Color Swatches */}
                                                {getThemeColors(template).length > 0 && (
                                                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                                                        {getThemeColors(template).map((color, index) => (
                                                            <div
                                                                key={index}
                                                                className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-[3px] sm:rounded-[2px] shadow-sm border border-white/50"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                {template.isArchived && (
                                                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                                                        <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-editor-text-primary truncate text-sm sm:text-base mb-1">{template.name}</h3>
                                                {/* Industry tags in list view */}
                                                {template.industries && template.industries.length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3 text-editor-accent flex-shrink-0" />
                                                        <span className="text-xs text-editor-accent truncate">
                                                            {template.industries.length} {t('industries.title').toLowerCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions - Scrollable on mobile */}
                                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-shrink-0">
                                            <button
                                                onClick={() => setPreviewTemplate(template)}
                                                className="p-2.5 sm:p-2 text-editor-text-secondary rounded-lg sm:rounded-md hover:bg-editor-border hover:text-editor-accent transition-colors flex-shrink-0"
                                                title={t('common.view')}
                                            >
                                                <Eye size={20} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            <button
                                                onClick={() => loadProject(template.id, true)}
                                                className="flex items-center gap-1.5 px-3 sm:px-3 py-2.5 sm:py-2 bg-editor-accent text-white rounded-lg sm:rounded-md text-sm font-medium hover:bg-editor-accent/90 transition-colors flex-shrink-0"
                                                title={t('common.edit')}
                                            >
                                                <Edit size={16} className="sm:w-[14px] sm:h-[14px]" />
                                                <span className="hidden xs:inline">{t('common.edit')}</span>
                                            </button>
                                            <button
                                                onClick={() => setEditingTemplate(template)}
                                                className="p-2.5 sm:p-2 text-editor-text-secondary rounded-lg sm:rounded-md hover:bg-editor-border hover:text-purple-400 transition-colors flex-shrink-0"
                                                title={t('industries.title')}
                                            >
                                                <Settings2 size={20} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            <button
                                                onClick={() => setThumbnailEditTemplate(template)}
                                                className="p-2.5 sm:p-2 text-editor-text-secondary rounded-lg sm:rounded-md hover:bg-editor-border hover:text-blue-400 transition-colors flex-shrink-0"
                                                title="Change Thumbnail"
                                            >
                                                <ImageIcon size={20} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            <button
                                                onClick={() => duplicateTemplate(template.id)}
                                                className="p-2.5 sm:p-2 text-editor-text-secondary rounded-lg sm:rounded-md hover:bg-editor-border hover:text-editor-text-primary transition-colors flex-shrink-0"
                                                title="Duplicate"
                                            >
                                                <Copy size={20} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            {canDeleteTemplates() && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Delete "${template.name}"?`)) {
                                                            deleteProject(template.id).catch(err => {
                                                                showError(err.message || t('superadmin.templateManagement.deleteError', 'You do not have permission to delete templates'));
                                                            });
                                                        }
                                                    }}
                                                    className="p-2.5 sm:p-2 text-editor-text-secondary rounded-lg sm:rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors flex-shrink-0"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={20} className="sm:w-[18px] sm:h-[18px]" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredAndSortedTemplates.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <LayoutTemplate className="w-16 h-16 text-editor-text-secondary/40 mb-4" />
                            <h3 className="text-lg font-semibold text-editor-text-primary mb-2">{t('superadmin.templateManagement.noTemplates', 'No templates found')}</h3>
                            <p className="text-sm text-editor-text-secondary mb-6 max-w-md">
                                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                                    ? t('superadmin.templateManagement.noTemplatesDesc', 'Try adjusting your search or filter criteria')
                                    : t('superadmin.createFirstTemplate', 'Get started by creating your first template')
                                }
                            </p>
                            {!(searchTerm || filterCategory !== 'all' || filterStatus !== 'all') && (
                                <button
                                    onClick={createNewTemplate}
                                    className="flex items-center gap-2 px-4 py-2 bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors"
                                >
                                    <Plus size={18} />
                                    {t('superadmin.templateManagement.createTemplate', 'Create Template')}
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
                    onUpdate={() => {
                        // Refresh projects to get the updated thumbnail from Firestore
                        refreshProjects();
                    }}
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
                <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setPreviewTemplate(null)}>
                    <div
                        className="bg-editor-panel-bg rounded-t-2xl sm:rounded-2xl w-full sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Mobile drag indicator */}
                        <div className="sm:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-editor-border/60 rounded-full" />
                        </div>

                        <div className="sticky top-0 bg-editor-panel-bg border-b border-editor-border p-4 sm:p-6 z-10">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                                        <h2 className="text-xl sm:text-2xl font-bold truncate">{previewTemplate.name}</h2>
                                        {previewTemplate.isFeatured && (
                                            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="p-2.5 sm:p-2 rounded-full hover:bg-editor-border transition-colors flex-shrink-0 -mt-1 -mr-1"
                                >
                                    <X size={22} className="sm:w-6 sm:h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            {/* Large Preview Image with Color Swatches */}
                            <div className="mb-4 sm:mb-6 rounded-xl overflow-hidden relative">
                                {previewTemplate.thumbnailUrl ? (
                                    <img
                                        src={previewTemplate.thumbnailUrl}
                                        alt={previewTemplate.name}
                                        className="w-full h-auto"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const placeholder = e.currentTarget.nextElementSibling;
                                            if (placeholder) placeholder.classList.remove('hidden');
                                        }}
                                    />
                                ) : null}
                                {/* Placeholder for preview modal */}
                                <div className={`w-full aspect-video bg-gradient-to-br from-editor-accent/20 via-editor-panel-bg to-editor-bg flex flex-col items-center justify-center ${previewTemplate.thumbnailUrl ? 'hidden' : ''}`}>
                                    <LayoutTemplate className="w-20 h-20 text-editor-accent/40 mb-4" />
                                    <span className="text-editor-text-secondary text-base font-medium">{t('superadmin.templateManagement.noThumbnail', 'No thumbnail')}</span>
                                </div>
                                {/* Color Swatches */}
                                {getThemeColors(previewTemplate).length > 0 && (
                                    <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex gap-1 sm:gap-1.5">
                                        {getThemeColors(previewTemplate).map((color, index) => (
                                            <div
                                                key={index}
                                                className="w-6 h-6 sm:w-5 sm:h-5 rounded-lg sm:rounded-md shadow-lg border border-white/40"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Template Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                                <div className="bg-editor-bg/50 rounded-xl p-4">
                                    <h3 className="font-semibold mb-3 text-sm sm:text-base">{t('superadmin.templateInformation', 'Template Information')}</h3>
                                    <div className="space-y-2.5 sm:space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-editor-text-secondary">{t('superadmin.templateManagement.metadata.sitesUsing', 'Sites Using')}:</span>
                                            <span className="font-medium">{getTemplateUsage(previewTemplate.id)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-editor-text-secondary">{t('superadmin.templateManagement.metadata.lastUpdated', 'Last Updated')}:</span>
                                            <span className="font-medium text-xs sm:text-sm truncate ml-2">{previewTemplate.lastUpdated}</span>
                                        </div>
                                        {previewTemplate.author && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-editor-text-secondary">{t('superadmin.templateManagement.metadata.author', 'Author')}:</span>
                                                <span className="font-medium">{previewTemplate.author}</span>
                                            </div>
                                        )}
                                        {previewTemplate.version && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-editor-text-secondary">{t('superadmin.templateManagement.metadata.version', 'Version')}:</span>
                                                <span className="font-medium">{previewTemplate.version}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-editor-text-secondary">{t('superadmin.templateManagement.metadata.status', 'Status')}:</span>
                                            <span className={`font-medium ${previewTemplate.isArchived ? 'text-orange-500' : 'text-green-500'}`}>
                                                {previewTemplate.isArchived ? t('superadmin.templateManagement.archivedLabel', 'Archived') : t('superadmin.templateManagement.active', 'Active')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-editor-bg/50 rounded-xl p-4">
                                    <h3 className="font-semibold mb-3 text-sm sm:text-base">{t('superadmin.brandIdentity', 'Brand Identity')}</h3>
                                    <div className="space-y-2.5 sm:space-y-2 text-sm">
                                        <div>
                                            <span className="text-editor-text-secondary text-xs">{t('superadmin.templateManagement.metadata.business', 'Business')}:</span>
                                            <p className="font-medium">{previewTemplate.brandIdentity?.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-editor-text-secondary text-xs">{t('superadmin.templateManagement.metadata.targetAudience', 'Target Audience')}:</span>
                                            <p className="font-medium">{previewTemplate.brandIdentity?.targetAudience || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-editor-text-secondary text-xs">{t('superadmin.templateManagement.metadata.tone', 'Tone')}:</span>
                                            <p className="font-medium">{previewTemplate.brandIdentity?.toneOfVoice || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {previewTemplate.description && (
                                <div className="mb-4 sm:mb-6">
                                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">{t('superadmin.templateManagement.metadata.description', 'Description')}</h3>
                                    <p className="text-sm text-editor-text-secondary leading-relaxed">{previewTemplate.description}</p>
                                </div>
                            )}

                            {/* Industries */}
                            {previewTemplate.industries && previewTemplate.industries.length > 0 && (
                                <div className="mb-4 sm:mb-6">
                                    <h3 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                        <Building2 className="w-4 h-4" />
                                        {t('industries.title')}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {previewTemplate.industries.map(ind => (
                                            <span key={ind} className="bg-editor-accent/20 text-editor-accent px-3 py-1.5 sm:py-1 rounded-full text-xs sm:text-sm flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {getIndustryLabel(ind)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {previewTemplate.tags && previewTemplate.tags.length > 0 && (
                                <div className="mb-4 sm:mb-6">
                                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">{t('cms.tags', 'Tags')}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {previewTemplate.tags.map(tag => (
                                            <span key={tag} className="bg-editor-border px-3 py-1.5 sm:py-1 rounded-full text-xs sm:text-sm">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sections Included */}
                            <div className="mb-4 sm:mb-6">
                                <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">{t('superadmin.templateManagement.metadata.includedSections', 'Included Sections')}</h3>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {previewTemplate.componentOrder.map(section => (
                                        <span key={section} className="bg-editor-accent/10 text-editor-accent px-2.5 sm:px-3 py-1 rounded-lg sm:rounded text-xs sm:text-sm">
                                            {section}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-editor-border">
                                <button
                                    onClick={() => {
                                        loadProject(previewTemplate.id, true);
                                        setPreviewTemplate(null);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-editor-accent text-white rounded-xl sm:rounded-lg hover:bg-editor-accent/90 transition-colors text-sm font-medium"
                                >
                                    <Edit size={18} />
                                    <span className="hidden xs:inline">{t('superadmin.templateManagement.edit', 'Edit')}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setPreviewTemplate(null);
                                        setEditingTemplate(previewTemplate);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-purple-600 text-white rounded-xl sm:rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                >
                                    <Settings2 size={18} />
                                    <span className="hidden xs:inline">{t('industries.title')}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setPreviewTemplate(null);
                                        setThumbnailEditTemplate(previewTemplate);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-xl sm:rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    <ImageIcon size={18} />
                                    <span className="hidden xs:inline">{t('superadmin.templateManagement.thumbnail', 'Thumbnail')}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        duplicateTemplate(previewTemplate.id);
                                        setPreviewTemplate(null);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-editor-border text-editor-text-primary rounded-xl sm:rounded-lg hover:bg-editor-border/80 transition-colors text-sm font-medium"
                                >
                                    <Copy size={18} />
                                    <span className="hidden xs:inline">{t('superadmin.duplicateTemplate')}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        archiveTemplate(previewTemplate.id, !previewTemplate.isArchived);
                                        setPreviewTemplate(null);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-editor-border text-editor-text-primary rounded-xl sm:rounded-lg hover:bg-editor-border/80 transition-colors text-sm font-medium"
                                >
                                    {previewTemplate.isArchived ? <Eye size={18} /> : <EyeOff size={18} />}
                                    {previewTemplate.isArchived ? t('superadmin.templateManagement.activate', 'Activate') : t('superadmin.templateManagement.archive', 'Archive')}
                                </button>
                                {canDeleteTemplates() && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(t('superadmin.templateManagement.deleteConfirmation', { name: previewTemplate.name }))) {
                                                deleteProject(previewTemplate.id)
                                                    .then(() => setPreviewTemplate(null))
                                                    .catch(err => {
                                                        showError(err.message || t('superadmin.templateManagement.deleteError', 'You do not have permission to delete templates'));
                                                    });
                                            }
                                        }}
                                        className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-red-500/10 text-red-500 rounded-xl sm:rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
                                    >
                                        <Trash2 size={18} />
                                        {t('superadmin.templateManagement.delete', 'Delete')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TemplateManagement;
