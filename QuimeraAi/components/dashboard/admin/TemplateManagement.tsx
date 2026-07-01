import React, { useState, useMemo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useProject } from '../../../contexts/project';
import DashboardSidebar from '../DashboardSidebar';
import {
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
    Megaphone,
    Sparkles
} from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { Project } from '../../../types';
import ThumbnailEditor from '../../ui/ThumbnailEditor';
import { isPlatformOwnerRole } from '../../../constants/roles';
import ConfirmationModal from '../../ui/ConfirmationModal';
import TemplateEditorModal from './TemplateEditorModal';
import { INDUSTRIES, INDUSTRY_CATEGORIES } from '../../../data/industries';
import { isRetiredDesignSuiteSection } from '../../../data/retiredSuites';
import { supabase } from '../../../supabase';
import { FilterChipRow } from '../filters';
import AppSelect from '../../ui/AppSelect';
import MobileSearchModal from '../../ui/MobileSearchModal';
import { AppButton, AppIcon } from '../../ui/system';
import { AppShellTopbar } from '@/src/design-system/components/AppShell';

/**
 * Safely resolves a value that might be a bilingual {en, es} object
 * into a plain string suitable for React rendering.
 */
const resolveText = (value: any, lang: string = 'es'): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && (value.en || value.es)) {
        return (lang === 'es' ? value.es : value.en) || value.en || value.es || '';
    }
    return String(value);
};

const isPlainRecord = (value: unknown): value is Record<string, any> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Lazy-load the AI Template Generator to avoid bloating this module
const AdminTemplateStudio = React.lazy(() => import('./AdminTemplateStudio'));

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
    const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterIndustry, setFilterIndustry] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // AI Generator
    const [showAIGenerator, setShowAIGenerator] = useState(false);

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

    const templateStatusCounts = useMemo(() => ({
        all: templates.length,
        active: templates.filter((t) => !t.isArchived).length,
        archived: templates.filter((t) => t.isArchived).length,
    }), [templates]);

    const getTemplateUsage = (templateId: string) => {
        return userProjects.filter(p => p.sourceTemplateId === templateId).length;
    };

    // Check if user can delete templates (only owner and superadmin)
    const canDeleteTemplates = () => {
        const userRole = userDocument?.role || '';
        return isPlatformOwnerRole(userRole);
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

    // Update template in Supabase
    const updateTemplate = async (templateId: string, updates: Partial<Project>) => {
        console.log('🔄 updateTemplate called with:', { templateId, updates });

        const template = templates.find(t => t.id === templateId);
        if (!template) throw new Error('Template not found');

        // Build the updated template in local state
        const updatedTemplate = { ...template, ...updates, lastUpdated: new Date().toISOString() };

        // Build Supabase column updates. Keep the dashboard list lightweight,
        // but load the full JSONB payload only for explicit template saves.
        const { data: existingRow, error: existingError } = await supabase
            .from('projects')
            .select('data')
            .eq('id', templateId)
            .single();

        if (existingError) throw existingError;

        const existingData = isPlainRecord(existingRow?.data) ? existingRow.data : {};
        const supabaseUpdates: Record<string, any> = {
            last_updated: updatedTemplate.lastUpdated,
            name: updatedTemplate.name,
            thumbnail_url: updatedTemplate.thumbnailUrl || null,
        };

        // Direct column mappings for fields that have their own columns
        if (updates.theme !== undefined) supabaseUpdates.theme = updates.theme;
        if (updates.brandIdentity !== undefined) supabaseUpdates.brand_identity = updates.brandIdentity;
        if (updatedTemplate.menus !== undefined) supabaseUpdates.menus = updatedTemplate.menus;
        if ((updates as any).isArchived !== undefined) supabaseUpdates.is_archived = (updates as any).isArchived;

        const { id: _id, ...dataPayload } = updatedTemplate as Project & Record<string, any>;
        delete dataPayload.__quimeraSummaryProject;

        const mergedDataPayload: Record<string, any> = {
            ...existingData,
            ...dataPayload,
        };

        const preserveFullKeys = ['data', 'theme', 'brandIdentity', 'componentOrder', 'sectionVisibility', 'pages', 'menus'];
        preserveFullKeys.forEach((key) => {
            if ((updates as Record<string, any>)[key] === undefined && existingData[key] !== undefined) {
                mergedDataPayload[key] = existingData[key];
            }
        });

        supabaseUpdates.data = mergedDataPayload;

        console.log('📤 Saving to Supabase:', {
            templateId,
            thumbnailUrl: supabaseUpdates.thumbnail_url?.substring(0, 50),
            industries: updatedTemplate.industries,
        });

        const { error } = await supabase
            .from('projects')
            .update(supabaseUpdates)
            .eq('id', templateId);

        if (error) {
            console.error('❌ Supabase save failed:', error);
            throw new Error(`Failed to save template: ${error.message}`);
        }

        console.log('✅ Supabase save complete');

        // Update local state immediately so changes are visible
        updateTemplateInState(templateId, updatedTemplate);

        setEditingTemplate(null);
    };

    // Migrate templates with ecommerce components
    // Handle delete template via internal modal
    const handleDeleteTemplate = async () => {
        if (!deleteConfirmTemplate) return;
        setIsDeleting(true);
        try {
            await deleteProject(deleteConfirmTemplate.id);
            // If deleting from preview, close preview
            if (previewTemplate?.id === deleteConfirmTemplate.id) {
                setPreviewTemplate(null);
            }
        } catch (err: any) {
            showError(err.message || t('superadmin.templateManagement.deleteError', 'You do not have permission to delete templates'));
        } finally {
            setIsDeleting(false);
            setDeleteConfirmTemplate(null);
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
    const hasActiveFilters = Boolean(searchTerm || filterCategory !== 'all' || filterIndustry !== 'all' || filterStatus !== 'all');

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AppShellTopbar role="banner" className="admin-dashboard-topbar">
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        <AppButton
                            variant="icon"
                            size="icon-md"
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay active:bg-q-surface-overlay touch-manipulation"
                            aria-label={t('common.openMenu', 'Open menu')}
                            aria-expanded={isMobileMenuOpen}
                        >
                            <Menu className="icon-lg" />
                        </AppButton>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <AppIcon icon={LayoutTemplate} size="lg" className="quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-sm sm:text-xl font-semibold sm:font-bold text-q-text">
                                {t('superadmin.templateManagement.title', 'Templates')}
                            </h1>
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 mr-2.5">
                        <AppButton
                            variant="icon"
                            size="icon-md"
                            onClick={() => setIsSearchOpen(true)}
                            className="text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay"
                            aria-label={t('common.search', 'Search')}
                        >
                            <Search className="icon-lg" />
                        </AppButton>

                        <HeaderBackButton onClick={onBack} />
                    </div>
                </AppShellTopbar>

                <MobileSearchModal
                    isOpen={isSearchOpen}
                    searchQuery={searchTerm}
                    onSearchChange={setSearchTerm}
                    onClose={() => setIsSearchOpen(false)}
                    placeholder={t('superadmin.templateManagement.searchPlaceholder', 'Search templates...')}
                />

                <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto">
                    {/* Statistics Cards - Responsive Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                        {/* Total Templates Card */}
                        <div className="group relative bg-gradient-to-br from-editor-panel-bg to-editor-panel-bg/80 rounded-2xl p-4 sm:p-5 border border-q-border/50 hover:border-q-accent/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-editor-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 sm:p-2.5 bg-q-accent/15 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <LayoutTemplate size={18} className="sm:w-5 sm:h-5 text-q-accent" />
                                    </div>
                                    <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-q-accent/10 text-q-accent rounded-full">
                                        {activeTemplates} {t('superadmin.templateManagement.active', 'active')}
                                    </span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-q-text mb-0.5 group-hover:text-q-accent transition-colors">{templates.length}</div>
                                <p className="text-xs sm:text-sm text-q-text-secondary font-medium">{t('superadmin.templateManagement.totalTemplates', 'Total Templates')}</p>
                            </div>
                        </div>

                        {/* Sites Created Card */}
                        <div className="group relative bg-gradient-to-br from-editor-panel-bg to-editor-panel-bg/80 rounded-2xl p-4 sm:p-5 border border-q-border/50 hover:border-q-accent/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-q-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 sm:p-2.5 bg-q-accent/15 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Globe size={18} className="sm:w-5 sm:h-5 text-q-accent" />
                                    </div>
                                    <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-q-accent/10 text-q-accent rounded-full truncate max-w-[80px] sm:max-w-none">
                                        {t('superadmin.templateManagement.fromTemplates', 'from templates')}
                                    </span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-q-text mb-0.5 group-hover:text-q-accent transition-colors">{totalSitesUsingTemplates}</div>
                                <p className="text-xs sm:text-sm text-q-text-secondary font-medium">{t('superadmin.templateManagement.sitesCreated', 'Sites Created')}</p>
                            </div>
                        </div>

                        {/* Most Popular Card */}
                        <div className="group relative bg-gradient-to-br from-editor-panel-bg to-editor-panel-bg/80 rounded-2xl p-4 sm:p-5 border border-q-border/50 hover:border-q-success/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-q-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 sm:p-2.5 bg-q-success/15 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <TrendingUp size={18} className="sm:w-5 sm:h-5 text-q-success" />
                                    </div>
                                    {mostUsedTemplate && (
                                        <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-q-success/10 text-q-success rounded-full">
                                            {getTemplateUsage(mostUsedTemplate.id)} {t('superadmin.templateManagement.uses', 'uses')}
                                        </span>
                                    )}
                                </div>
                                <div className="text-base sm:text-xl font-bold text-q-text mb-0.5 group-hover:text-q-success transition-colors truncate" title={mostUsedTemplate?.name}>
                                    {resolveText(mostUsedTemplate?.name) || 'N/A'}
                                </div>
                                <p className="text-xs sm:text-sm text-q-text-secondary font-medium">{t('superadmin.templateManagement.mostPopular', 'Most Popular')}</p>
                            </div>
                        </div>

                        {/* Archived Card */}
                        <div className="group relative bg-gradient-to-br from-editor-panel-bg to-editor-panel-bg/80 rounded-2xl p-4 sm:p-5 border border-q-border/50 hover:border-q-warning/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-q-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 sm:p-2.5 bg-q-warning/15 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Archive size={18} className="sm:w-5 sm:h-5 text-q-warning" />
                                    </div>
                                    <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-q-warning/10 text-q-warning rounded-full">
                                        {t('superadmin.templateManagement.title', 'Templates')}
                                    </span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-q-text mb-0.5 group-hover:text-q-warning transition-colors">{archivedTemplates}</div>
                                <p className="text-xs sm:text-sm text-q-text-secondary font-medium">{t('superadmin.templateManagement.archived', 'Archived')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <span className="text-xs md:text-sm text-q-text-muted">
                                {filteredAndSortedTemplates.length}/{templates.length}
                            </span>

                            <div className="flex-1 min-w-[1rem]" />

                            <div
                                className="flex items-center gap-1 bg-secondary/40 rounded-lg p-1"
                                role="group"
                                aria-label="View mode"
                            >
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                                        viewMode === 'grid'
                                            ? 'text-primary bg-q-bg'
                                            : 'text-q-text-muted hover:text-foreground'
                                    }`}
                                    aria-label={t('superadmin.gridView', 'Grid View')}
                                    aria-pressed={viewMode === 'grid'}
                                >
                                    <Grid size={15} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                                        viewMode === 'list'
                                            ? 'text-primary bg-q-bg'
                                            : 'text-q-text-muted hover:text-foreground'
                                    }`}
                                    aria-label={t('superadmin.listView', 'List View')}
                                    aria-pressed={viewMode === 'list'}
                                >
                                    <List size={15} aria-hidden="true" />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                                    showFilters || hasActiveFilters
                                        ? 'bg-q-accent/10 text-q-accent'
                                        : 'bg-secondary/50 text-q-text-muted hover:text-foreground hover:bg-secondary'
                                }`}
                                aria-label={t('superadmin.templateManagement.filters', 'Filters')}
                                title={t('superadmin.templateManagement.filters', 'Filters')}
                            >
                                <Filter size={14} aria-hidden="true" />
                                <span className="hidden sm:inline">{t('superadmin.templateManagement.filters', 'Filters')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowAIGenerator(true)}
                                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all bg-secondary/50 text-q-text-muted hover:text-foreground hover:bg-secondary"
                                title={t('superadmin.templateManagement.generateWithAi', 'Generate with AI')}
                                aria-label={t('superadmin.templateManagement.generateWithAi', 'Generate with AI')}
                            >
                                <Sparkles size={14} aria-hidden="true" />
                                <span className="hidden md:inline">{t('superadmin.templateManagement.generateWithAi', 'Generate with AI')}</span>
                                <span className="md:hidden">{t('common.assistant.ai', 'AI')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={createNewTemplate}
                                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all bg-q-accent text-q-text-on-accent hover:bg-q-accent/90"
                                aria-label={t('superadmin.templateManagement.new', 'New')}
                                title={t('superadmin.templateManagement.new', 'New')}
                            >
                                <Plus size={14} aria-hidden="true" />
                                <span className="hidden sm:inline">{t('superadmin.templateManagement.new', 'New')}</span>
                            </button>
                        </div>

                        {showFilters && (
                            <div className="rounded-xl border border-q-border bg-q-surface/50 p-4">
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-q-text-secondary">{t('superadmin.sortByCategory')}</label>
                                        <AppSelect
                                            value={filterCategory}
                                            onChange={(e) => setFilterCategory(e.target.value)}
                                            className="bg-q-surface-overlay/40 px-3 py-2.5 sm:py-1.5 rounded-lg text-sm outline-none border border-transparent focus:border-q-accent w-full"
                                        >
                                            <option value="all">{t('superadmin.allCategories')}</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </AppSelect>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-q-text-secondary flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {t('industries.title')}
                                        </label>
                                        <AppSelect
                                            value={filterIndustry}
                                            onChange={(e) => setFilterIndustry(e.target.value)}
                                            className="bg-q-surface-overlay/40 px-3 py-2.5 sm:py-1.5 rounded-lg text-sm outline-none border border-transparent focus:border-q-accent w-full sm:min-w-[160px]"
                                        >
                                            <option value="all">{t('superadmin.allCategories')}</option>
                                            {usedIndustries.map(ind => (
                                                <option key={ind} value={ind}>{getIndustryLabel(ind)}</option>
                                            ))}
                                        </AppSelect>
                                    </div>

                                    <div className="col-span-2 sm:col-span-full flex flex-col gap-1.5">
                                        <label className="text-xs text-q-text-secondary">{t('leads.status')}</label>
                                        <FilterChipRow
                                            options={[
                                                { id: 'all', label: t('superadmin.allTemplates'), count: templateStatusCounts.all },
                                                { id: 'active', label: t('superadmin.activeTemplates'), count: templateStatusCounts.active, color: 'green' },
                                                { id: 'archived', label: t('superadmin.archivedTemplates'), count: templateStatusCounts.archived, color: 'gray' },
                                            ]}
                                            value={filterStatus}
                                            onChange={(value) => setFilterStatus(value as typeof filterStatus)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-q-text-secondary">{t('leads.sort')}</label>
                                        <AppSelect
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                                            className="bg-q-surface-overlay/40 px-3 py-2.5 sm:py-1.5 rounded-lg text-sm outline-none border border-transparent focus:border-q-accent w-full"
                                        >
                                            <option value="recent">{t('superadmin.sortByRecent')}</option>
                                            <option value="name">{t('superadmin.sortByName')}</option>
                                            <option value="usage">{t('superadmin.sortByUsage')}</option>
                                            <option value="category">{t('superadmin.sortByCategory')}</option>
                                        </AppSelect>
                                    </div>

                                    {hasActiveFilters && (
                                        <div className="col-span-2 sm:col-span-1 flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setFilterCategory('all');
                                                    setFilterIndustry('all');
                                                    setFilterStatus('all');
                                                }}
                                                className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 rounded-lg text-sm text-q-text-secondary hover:text-q-text bg-q-surface-overlay/30 hover:bg-q-surface-overlay/50 transition-colors"
                                            >
                                                {t('superadmin.clearFilters')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
                                            <LayoutTemplate className="w-16 h-16 text-q-accent/40 mb-3" />
                                            <span className="text-q-text-secondary text-sm font-medium">{t('superadmin.templateManagement.noThumbnail', 'No thumbnail')}</span>
                                        </div>

                                        {/* Dark Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                                        {/* Archived Overlay */}
                                        {template.isArchived && (
                                            <div className="absolute inset-0 bg-q-text/60 flex items-center justify-center z-10">
                                                <div className="text-center">
                                                    <Archive className="w-10 h-10 sm:w-12 sm:h-12 text-white mx-auto mb-2" />
                                                    <span className="text-white text-sm font-semibold">{t('superadmin.templateManagement.archivedLabel', 'Archived')}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hover Actions Overlay - Desktop only */}
                                        <div className="absolute inset-0 bg-q-text/30 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px] pointer-events-none" />
                                    </div>

                                    {/* Top Section: Color Swatches */}
                                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20">
                                        {/* Color Swatches */}
                                        {getThemeColors(template).length > 0 && (
                                            <div className="flex gap-1">
                                                {getThemeColors(template).map((color, index) => (
                                                    <div
                                                        key={index}
                                                        className="w-4 h-4 sm:w-3 sm:h-3 rounded-[4px] sm:rounded-[3px] shadow-md border border-q-border/40 transition-transform hover:scale-125"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content at Bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6">
                                        <h3 className="font-bold text-xl sm:text-2xl text-white mb-2 sm:mb-3 line-clamp-2">{resolveText(template.name)}</h3>

                                        {/* Industries Tags */}
                                        {template.industries && template.industries.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {template.industries.slice(0, 2).map(ind => (
                                                    <span
                                                        key={ind}
                                                        className="inline-flex items-center gap-1 px-2 py-1 sm:py-0.5 bg-q-surface/20 text-white text-xs rounded-lg sm:rounded backdrop-blur-sm"
                                                    >
                                                        <Building2 className="w-3 h-3" />
                                                        <span className="hidden xs:inline">{getIndustryLabel(ind)}</span>
                                                    </span>
                                                ))}
                                                {template.industries.length > 2 && (
                                                    <span className="px-2 py-1 sm:py-0.5 bg-q-surface/20 text-white text-xs rounded-lg sm:rounded backdrop-blur-sm">
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
                                                className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-4 py-2.5 sm:py-2 bg-q-accent text-q-text-on-accent rounded-full text-sm font-semibold active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl"
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
                                                className="p-3 sm:p-2.5 bg-q-surface/90 text-q-accent rounded-full active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl"
                                                title={t('industries.title')}
                                            >
                                                <Settings2 size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setThumbnailEditTemplate(template);
                                                }}
                                                className="p-3 sm:p-2.5 bg-q-surface/90 text-q-accent rounded-full active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl"
                                                title="Change Thumbnail"
                                            >
                                                <ImageIcon size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    duplicateTemplate(template.id);
                                                }}
                                                className="p-3 sm:p-2.5 bg-q-surface/90 text-q-success rounded-full active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl hidden xs:flex"
                                                title={t('superadmin.duplicateTemplate')}
                                            >
                                                <Copy size={18} />
                                            </button>
                                            {canDeleteTemplates() && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirmTemplate({ id: template.id, name: template.name });
                                                    }}
                                                    className="p-3 sm:p-2.5 bg-q-surface/90 text-q-error rounded-full active:scale-95 sm:hover:scale-110 transition-transform shadow-2xl"
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
                                    className={`bg-q-surface p-3 sm:p-4 rounded-xl border border-q-border hover:border-q-accent transition-all ${template.isArchived ? 'opacity-50' : ''}`}
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
                                                    <LayoutTemplate className="w-6 h-6 text-q-accent/40" />
                                                </div>
                                                {/* Color Swatches */}
                                                {getThemeColors(template).length > 0 && (
                                                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                                                        {getThemeColors(template).map((color, index) => (
                                                            <div
                                                                key={index}
                                                                className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-[3px] sm:rounded-[2px] shadow-sm border border-q-border/50"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                {template.isArchived && (
                                                    <div className="absolute inset-0 bg-q-text/60 rounded-lg flex items-center justify-center">
                                                        <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-q-text truncate text-sm sm:text-base mb-1">{resolveText(template.name)}</h3>
                                                {/* Industry tags in list view */}
                                                {template.industries && template.industries.length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3 text-q-accent flex-shrink-0" />
                                                        <span className="text-xs text-q-accent truncate">
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
                                                className="p-2.5 sm:p-2 text-q-text-secondary rounded-lg sm:rounded-md hover:bg-q-surface-overlay hover:text-q-accent transition-colors flex-shrink-0"
                                                title={t('common.view')}
                                            >
                                                <Eye size={20} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            <button
                                                onClick={() => loadProject(template.id, true)}
                                                className="flex items-center gap-1.5 px-3 sm:px-3 py-2.5 sm:py-2 bg-q-accent text-q-text-on-accent rounded-lg sm:rounded-md text-sm font-medium hover:bg-q-accent/90 transition-colors flex-shrink-0"
                                                title={t('common.edit')}
                                            >
                                                <Edit size={16} className="sm:w-[14px] sm:h-[14px]" />
                                                <span className="hidden xs:inline">{t('common.edit')}</span>
                                            </button>
                                            <button
                                                onClick={() => setEditingTemplate(template)}
                                                className="p-2.5 sm:p-2 text-q-text-secondary rounded-lg sm:rounded-md hover:bg-q-surface-overlay hover:text-q-accent transition-colors flex-shrink-0"
                                                title={t('industries.title')}
                                            >
                                                <Settings2 size={20} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            <button
                                                onClick={() => setThumbnailEditTemplate(template)}
                                                className="p-2.5 sm:p-2 text-q-text-secondary rounded-lg sm:rounded-md hover:bg-q-surface-overlay hover:text-q-accent transition-colors flex-shrink-0"
                                                title="Change Thumbnail"
                                            >
                                                <ImageIcon size={20} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            <button
                                                onClick={() => duplicateTemplate(template.id)}
                                                className="p-2.5 sm:p-2 text-q-text-secondary rounded-lg sm:rounded-md hover:bg-q-surface-overlay hover:text-q-text transition-colors flex-shrink-0"
                                                title="Duplicate"
                                            >
                                                <Copy size={20} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            {canDeleteTemplates() && (
                                                <button
                                                    onClick={() => {
                                                        setDeleteConfirmTemplate({ id: template.id, name: template.name });
                                                    }}
                                                    className="p-2.5 sm:p-2 text-q-text-secondary rounded-lg sm:rounded-md hover:bg-q-error/10 hover:text-q-error transition-colors flex-shrink-0"
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
                            <LayoutTemplate className="w-16 h-16 text-q-text-secondary/40 mb-4" />
                            <h3 className="text-lg font-semibold text-q-text mb-2">{t('superadmin.templateManagement.noTemplates', 'No templates found')}</h3>
                            <p className="text-sm text-q-text-secondary mb-6 max-w-md">
                                {hasActiveFilters
                                    ? t('superadmin.templateManagement.noTemplatesDesc', 'Try adjusting your search or filter criteria')
                                    : t('superadmin.createFirstTemplate', 'Get started by creating your first template')
                                }
                            </p>
                            {!hasActiveFilters && (
                                <button
                                    onClick={createNewTemplate}
                                    className="flex items-center gap-2 px-4 py-2 bg-q-accent text-q-text-on-accent rounded-lg hover:bg-q-accent/90 transition-colors"
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
                        // Refresh projects to get the updated thumbnail from Supabase
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
                <div className="fixed inset-0 z-50 bg-q-text/80 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setPreviewTemplate(null)}>
                    <div
                        className="flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-q-surface sm:max-h-[90vh] sm:max-w-6xl sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Mobile drag indicator */}
                        <div className="sm:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-q-surface-overlay/60 rounded-full" />
                        </div>

                        <div className="flex-shrink-0 border-b border-q-border bg-q-surface p-4 sm:p-6">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                                        <h2 className="text-xl sm:text-2xl font-bold truncate">{resolveText(previewTemplate.name)}</h2>
                                        {previewTemplate.isFeatured && (
                                            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-q-accent fill-yellow-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex min-w-0 items-center gap-2">
                                    <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                                        <button
                                            onClick={() => {
                                                loadProject(previewTemplate.id, true);
                                                setPreviewTemplate(null);
                                            }}
                                            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-q-accent text-q-text-on-accent transition-colors hover:bg-q-accent/90"
                                            title={t('superadmin.templateManagement.edit', 'Edit')}
                                            aria-label={t('superadmin.templateManagement.edit', 'Edit')}
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPreviewTemplate(null);
                                                setEditingTemplate(previewTemplate);
                                            }}
                                            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-q-accent text-q-text-on-accent transition-colors hover:bg-q-accent/90"
                                            title={t('industries.title')}
                                            aria-label={t('industries.title')}
                                        >
                                            <Settings2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPreviewTemplate(null);
                                                setThumbnailEditTemplate(previewTemplate);
                                            }}
                                            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-q-accent text-q-text-on-accent transition-colors hover:bg-q-accent/90"
                                            title={t('superadmin.templateManagement.thumbnail', 'Thumbnail')}
                                            aria-label={t('superadmin.templateManagement.thumbnail', 'Thumbnail')}
                                        >
                                            <ImageIcon size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                duplicateTemplate(previewTemplate.id);
                                                setPreviewTemplate(null);
                                            }}
                                            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-q-surface-overlay text-q-text transition-colors hover:bg-q-surface-overlay/80"
                                            title={t('superadmin.duplicateTemplate')}
                                            aria-label={t('superadmin.duplicateTemplate')}
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                archiveTemplate(previewTemplate.id, !previewTemplate.isArchived);
                                                setPreviewTemplate(null);
                                            }}
                                            className="inline-flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-q-surface-overlay px-3 text-sm font-medium text-q-text transition-colors hover:bg-q-surface-overlay/80"
                                            title={previewTemplate.isArchived ? t('superadmin.templateManagement.activate', 'Activate') : t('superadmin.templateManagement.archive', 'Archive')}
                                            aria-label={previewTemplate.isArchived ? t('superadmin.templateManagement.activate', 'Activate') : t('superadmin.templateManagement.archive', 'Archive')}
                                        >
                                            {previewTemplate.isArchived ? <Eye size={18} /> : <EyeOff size={18} />}
                                            <span className="hidden sm:inline">
                                                {previewTemplate.isArchived ? t('superadmin.templateManagement.activate', 'Activate') : t('superadmin.templateManagement.archive', 'Archive')}
                                            </span>
                                        </button>
                                        {canDeleteTemplates() && (
                                            <button
                                                onClick={() => {
                                                    setDeleteConfirmTemplate({ id: previewTemplate.id, name: previewTemplate.name });
                                                }}
                                                className="inline-flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-q-error/10 px-3 text-sm font-medium text-q-error transition-colors hover:bg-q-error/20"
                                                title={t('superadmin.templateManagement.delete', 'Delete')}
                                                aria-label={t('superadmin.templateManagement.delete', 'Delete')}
                                            >
                                                <Trash2 size={18} />
                                                <span className="hidden sm:inline">{t('superadmin.templateManagement.delete', 'Delete')}</span>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setPreviewTemplate(null)}
                                        className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-q-text transition-colors hover:bg-q-surface-overlay"
                                        title={t('common.close')}
                                        aria-label={t('common.close')}
                                    >
                                        <X size={22} className="sm:w-6 sm:h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
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
                                    <LayoutTemplate className="w-20 h-20 text-q-accent/40 mb-4" />
                                    <span className="text-q-text-secondary text-base font-medium">{t('superadmin.templateManagement.noThumbnail', 'No thumbnail')}</span>
                                </div>
                                {/* Color Swatches */}
                                {getThemeColors(previewTemplate).length > 0 && (
                                    <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex gap-1 sm:gap-1.5">
                                        {getThemeColors(previewTemplate).map((color, index) => (
                                            <div
                                                key={index}
                                                className="w-6 h-6 sm:w-5 sm:h-5 rounded-lg sm:rounded-md shadow-lg border border-q-border/40"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Template Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                                <div className="bg-q-bg/50 rounded-xl p-4">
                                    <h3 className="font-semibold mb-3 text-sm sm:text-base">{t('superadmin.templateInformation', 'Template Information')}</h3>
                                    <div className="space-y-2.5 sm:space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-q-text-secondary">{t('superadmin.templateManagement.metadata.sitesUsing', 'Sites Using')}:</span>
                                            <span className="font-medium">{getTemplateUsage(previewTemplate.id)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-q-text-secondary">{t('superadmin.templateManagement.metadata.lastUpdated', 'Last Updated')}:</span>
                                            <span className="font-medium text-xs sm:text-sm truncate ml-2">{previewTemplate.lastUpdated}</span>
                                        </div>
                                        {previewTemplate.author && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-q-text-secondary">{t('superadmin.templateManagement.metadata.author', 'Author')}:</span>
                                                <span className="font-medium">{previewTemplate.author}</span>
                                            </div>
                                        )}
                                        {previewTemplate.version && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-q-text-secondary">{t('superadmin.templateManagement.metadata.version', 'Version')}:</span>
                                                <span className="font-medium">{previewTemplate.version}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-q-text-secondary">{t('superadmin.templateManagement.metadata.status', 'Status')}:</span>
                                            <span className={`font-medium ${previewTemplate.isArchived ? 'text-q-warning' : 'text-q-success'}`}>
                                                {previewTemplate.isArchived ? t('superadmin.templateManagement.archivedLabel', 'Archived') : t('superadmin.templateManagement.active', 'Active')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-q-bg/50 rounded-xl p-4">
                                    <h3 className="font-semibold mb-3 text-sm sm:text-base">{t('superadmin.brandIdentity', 'Brand Identity')}</h3>
                                    <div className="space-y-2.5 sm:space-y-2 text-sm">
                                        <div>
                                            <span className="text-q-text-secondary text-xs">{t('superadmin.templateManagement.metadata.business', 'Business')}:</span>
                                            <p className="font-medium">{resolveText(previewTemplate.brandIdentity?.name) || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-q-text-secondary text-xs">{t('superadmin.templateManagement.metadata.targetAudience', 'Target Audience')}:</span>
                                            <p className="font-medium">{resolveText(previewTemplate.brandIdentity?.targetAudience) || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-q-text-secondary text-xs">{t('superadmin.templateManagement.metadata.tone', 'Tone')}:</span>
                                            <p className="font-medium">{resolveText(previewTemplate.brandIdentity?.toneOfVoice) || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {previewTemplate.description && (
                                <div className="mb-4 sm:mb-6">
                                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">{t('superadmin.templateManagement.metadata.description', 'Description')}</h3>
                                    <p className="text-sm text-q-text-secondary leading-relaxed">{resolveText(previewTemplate.description)}</p>
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
                                            <span key={ind} className="bg-q-accent/20 text-q-accent px-3 py-1.5 sm:py-1 rounded-full text-xs sm:text-sm flex items-center gap-1">
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
                                            <span key={tag} className="bg-q-surface-overlay px-3 py-1.5 sm:py-1 rounded-full text-xs sm:text-sm">
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
                                    {previewTemplate.componentOrder.filter(section => !isRetiredDesignSuiteSection(section)).map(section => (
                                        <span key={section} className="bg-q-accent/10 text-q-accent px-2.5 sm:px-3 py-1 rounded-lg sm:rounded text-xs sm:text-sm">
                                            {section}
                                        </span>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirmTemplate}
                onConfirm={handleDeleteTemplate}
                onCancel={() => setDeleteConfirmTemplate(null)}
                title={t('superadmin.templateManagement.deleteConfirmTitle', '¿Eliminar template?')}
                message={t('superadmin.templateManagement.deleteConfirmMessage', { name: deleteConfirmTemplate?.name, defaultValue: `¿Estás seguro de eliminar "${deleteConfirmTemplate?.name}"? Esta acción no se puede deshacer.` })}
                variant="danger"
                isLoading={isDeleting}
                confirmText={t('common.delete', 'Eliminar')}
                cancelText={t('common.cancel', 'Cancelar')}
            />

            {/* Admin Template Studio Modal */}
            <Suspense fallback={null}>
                <AdminTemplateStudio
                    isOpen={showAIGenerator}
                    onClose={() => setShowAIGenerator(false)}
                />
            </Suspense>
        </div>
    );
};

export default TemplateManagement;
