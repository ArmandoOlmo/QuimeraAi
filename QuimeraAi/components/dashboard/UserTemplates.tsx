import React, { useState, useMemo } from 'react';
import MobileSearchModal from '../ui/MobileSearchModal';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../contexts/project';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import DashboardSidebar from './DashboardSidebar';
import DashboardWaveRibbons from './DashboardWaveRibbons';
import {
    LayoutTemplate,
    Menu,
    Search,
    Grid,
    List,
    X,
    Eye,
    Play,
    Building2,
    Sparkles,
    Info,
    ChevronRight,
    Palette,
    Layers,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    BookOpen
} from 'lucide-react';
import { Project } from '../../types';
import { INDUSTRIES } from '../../data/industries';

const UserTemplates: React.FC = () => {
    const { t } = useTranslation();
    const { projects, createProjectFromTemplate } = useProject();
    const { navigate } = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Search and Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [filterIndustry, setFilterIndustry] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Preview Modal
    const [previewTemplate, setPreviewTemplate] = useState<Project | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Instructions banner visibility (persisted in localStorage)
    const [showInstructions, setShowInstructions] = useState(() => {
        const saved = localStorage.getItem('quimera_show_templates_instructions');
        return saved !== 'false'; // Show by default
    });

    const dismissInstructions = () => {
        setShowInstructions(false);
        localStorage.setItem('quimera_show_templates_instructions', 'false');
    };

    // Get only active templates
    const templates = useMemo(() =>
        projects.filter(p => p.status === 'Template' && !p.isArchived),
        [projects]
    );

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

    // Helper to extract theme colors
    const getThemeColors = (template: Project): string[] => {
        const gc = template.theme?.globalColors;
        if (gc?.primary || gc?.secondary || gc?.accent) {
            return [gc.primary, gc.secondary, gc.accent, gc.background, gc.text].filter(Boolean) as string[];
        }
        const hc = template.data?.hero?.colors;
        if (hc) {
            return [hc.primary, hc.secondary, hc.background, hc.text, hc.heading].filter(Boolean) as string[];
        }
        return [];
    };

    // Filter templates
    const filteredTemplates = useMemo(() => {
        let result = [...templates];

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(search) ||
                t.description?.toLowerCase().includes(search) ||
                t.industries?.some(ind => getIndustryLabel(ind).toLowerCase().includes(search))
            );
        }

        if (filterIndustry !== 'all') {
            result = result.filter(t => t.industries?.includes(filterIndustry));
        }

        return result;
    }, [templates, searchTerm, filterIndustry]);

    // Handle using a template
    const handleUseTemplate = async (templateId: string) => {
        setIsCreating(true);
        try {
            await createProjectFromTemplate(templateId);
            setPreviewTemplate(null);
        } catch (error) {
            console.error('Error creating project from template:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons />
                {/* Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors"
                            aria-label="Open navigation menu"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <LayoutTemplate className="text-primary" size={24} />
                            <h1 className="text-xl font-bold text-foreground hidden sm:block">
                                {t('userTemplates.title', 'Plantillas')}
                            </h1>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 flex justify-center px-2 sm:px-4">
                        <div className="hidden md:flex items-center gap-2 w-full max-w-xl bg-editor-border/40 rounded-lg px-3 py-2">
                            <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="search"
                                placeholder={t('userTemplates.searchPlaceholder', 'Buscar plantillas...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm min-w-0"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Mobile Search Button */}
                        <button
                            onClick={() => setIsMobileSearchOpen(true)}
                            className="md:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <MobileSearchModal
                            isOpen={isMobileSearchOpen}
                            searchQuery={searchTerm}
                            onSearchChange={setSearchTerm}
                            onClose={() => setIsMobileSearchOpen(false)}
                            placeholder={t('userTemplates.searchPlaceholder', 'Buscar plantillas...')}
                        />
                        {/* Back Button */}
                        <button
                            onClick={() => navigate(ROUTES.DASHBOARD)}
                            className="flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3 rounded-lg sm:bg-secondary/50 sm:hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                            aria-label={t('common.goBack', 'Volver')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>



                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">

                        {/* Instructions Banner - Dismissible */}
                        {showInstructions && (
                            <div className="mb-8 relative flex flex-col lg:flex-row items-stretch gap-6 lg:gap-0">
                                {/* Floating Image - Outside the box, full height */}
                                <div className="hidden lg:flex relative z-10 flex-shrink-0 -mr-6 items-end">
                                    <img
                                        src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2FEP2SSUCSsy2EeQtokqlp3.jpg?alt=media&token=193cba94-d249-4bcb-b521-7c2639eb091c"
                                        alt="Templates Guide"
                                        className="w-auto h-full max-h-[280px] object-contain"
                                    />
                                </div>

                                {/* Content Box */}
                                <div className="relative flex-1 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl overflow-hidden lg:pl-10">
                                    {/* Background decoration */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                                    {/* Close button */}
                                    <button
                                        onClick={dismissInstructions}
                                        className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors z-20"
                                        aria-label={t('common.close')}
                                    >
                                        <X size={18} />
                                    </button>

                                    {/* Content Section */}
                                    <div className="relative z-10 p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-3 bg-primary/20 rounded-xl">
                                                <BookOpen className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-foreground">
                                                    {t('userTemplates.howToUseTitle', '¿Cómo usar las plantillas?')}
                                                </h2>
                                            </div>
                                        </div>

                                        <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <span>{t('userTemplates.step1', 'Explora las plantillas disponibles y encuentra una que se ajuste a tu industria')}</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <span>{t('userTemplates.step2', 'Haz clic en una plantilla para ver la vista previa con todos los detalles')}</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <span>{t('userTemplates.step3', 'Presiona "Usar esta plantilla" para crear tu sitio web basado en ella')}</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <span>{t('userTemplates.step4', 'Personaliza colores, textos e imágenes en el editor para hacerla tuya')}</span>
                                            </li>
                                        </ul>

                                        <div className="flex items-center justify-end pt-2 border-t border-border/50">
                                            <button
                                                onClick={dismissInstructions}
                                                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                            >
                                                {t('dashboard.gotIt', 'Entendido, ocultar')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stats & Controls Row */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            {/* Stats Badges */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 rounded-xl">
                                    <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-lg">
                                        <LayoutTemplate size={16} className="text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-lg font-bold text-foreground leading-tight">{templates.length}</span>
                                        <span className="text-xs text-muted-foreground leading-tight">{t('userTemplates.availableTemplates', 'Plantillas disponibles')}</span>
                                    </div>
                                </div>
                                {filteredTemplates.length !== templates.length && (
                                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-secondary/50 border border-border/50 rounded-xl">
                                        <div className="flex items-center justify-center w-8 h-8 bg-secondary rounded-lg">
                                            <Search size={14} className="text-muted-foreground" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-lg font-bold text-foreground leading-tight">{filteredTemplates.length}</span>
                                            <span className="text-xs text-muted-foreground leading-tight">{t('userTemplates.showing', 'Mostrando')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2">
                                {/* Industry Filter */}
                                <select
                                    value={filterIndustry}
                                    onChange={(e) => setFilterIndustry(e.target.value)}
                                    className="bg-secondary/50 border border-border/40 px-3 py-2 rounded-lg text-sm outline-none focus:border-primary/60"
                                >
                                    <option value="all">{t('superadmin.allCategories', 'Todas las categorías')}</option>
                                    {usedIndustries.map(ind => (
                                        <option key={ind} value={ind}>{getIndustryLabel(ind)}</option>
                                    ))}
                                </select>

                                {/* View Mode Toggle */}
                                <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'grid' ? 'text-primary bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        <Grid size={15} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'list' ? 'text-primary bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        <List size={15} />
                                    </button>
                                </div>

                                {/* Help Button - Show when instructions are hidden */}
                                {!showInstructions && (
                                    <button
                                        onClick={() => {
                                            setShowInstructions(true);
                                            localStorage.setItem('quimera_show_templates_instructions', 'true');
                                        }}
                                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all bg-secondary/50 border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/10"
                                        title={t('dashboard.showHelp', 'Mostrar guía')}
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        <span className="hidden lg:inline">{t('dashboard.help', 'Ayuda')}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Templates Grid */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredTemplates.map(template => (
                                    <div
                                        key={template.id}
                                        className="group relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer"
                                        onClick={() => setPreviewTemplate(template)}
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative aspect-[4/3] overflow-hidden">
                                            <img
                                                src={template.thumbnailUrl}
                                                alt={template.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                                            {/* Color Swatches */}
                                            {getThemeColors(template).length > 0 && (
                                                <div className="absolute top-3 right-3 flex gap-1">
                                                    {getThemeColors(template).slice(0, 4).map((color, index) => (
                                                        <div
                                                            key={index}
                                                            className="w-4 h-4 rounded-full shadow-md border-2 border-white/40"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                                <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-semibold shadow-lg hover:scale-105 transition-transform">
                                                    <Eye size={18} />
                                                    {t('userTemplates.preview', 'Vista previa')}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-4">
                                            <h3 className="font-bold text-foreground mb-2 line-clamp-1">{template.name}</h3>

                                            {/* Industries */}
                                            {template.industries && template.industries.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {template.industries.slice(0, 2).map(ind => (
                                                        <span
                                                            key={ind}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-xs rounded-full"
                                                        >
                                                            <Building2 className="w-3 h-3" />
                                                            {getIndustryLabel(ind)}
                                                        </span>
                                                    ))}
                                                    {template.industries.length > 2 && (
                                                        <span className="px-2 py-0.5 bg-secondary text-xs rounded-full">
                                                            +{template.industries.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {template.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {template.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* List View */
                            <div className="space-y-3">
                                {filteredTemplates.map(template => (
                                    <div
                                        key={template.id}
                                        className="group bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
                                        onClick={() => setPreviewTemplate(template)}
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden">
                                            <img
                                                src={template.thumbnailUrl}
                                                alt={template.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                            {getThemeColors(template).length > 0 && (
                                                <div className="absolute bottom-1 right-1 flex gap-0.5">
                                                    {getThemeColors(template).slice(0, 3).map((color, index) => (
                                                        <div
                                                            key={index}
                                                            className="w-2.5 h-2.5 rounded-full shadow border border-white/50"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-foreground truncate">{template.name}</h3>
                                            {template.industries && template.industries.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Building2 className="w-3 h-3 text-primary" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {template.industries.slice(0, 2).map(ind => getIndustryLabel(ind)).join(', ')}
                                                        {template.industries.length > 2 && ` +${template.industries.length - 2}`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action */}
                                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/90">
                                            <Eye size={16} />
                                            {t('userTemplates.preview', 'Vista previa')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {filteredTemplates.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <LayoutTemplate className="w-16 h-16 text-muted-foreground/40 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {t('userTemplates.noTemplatesFound', 'No se encontraron plantillas')}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                                    {t('userTemplates.tryAdjustingFilters', 'Intenta ajustar los filtros de búsqueda')}
                                </p>
                                <button
                                    onClick={() => { setSearchTerm(''); setFilterIndustry('all'); }}
                                    className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                                >
                                    {t('superadmin.clearFilters', 'Limpiar filtros')}
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPreviewTemplate(null)}
                >
                    <div
                        className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-card border-b border-border p-6 z-10">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-foreground">{previewTemplate.name}</h2>
                                    {previewTemplate.description && (
                                        <p className="text-muted-foreground mt-1">{previewTemplate.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setPreviewTemplate(null)}
                                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Large Preview Image */}
                            <div className="mb-6 rounded-xl overflow-hidden relative">
                                <img
                                    src={previewTemplate.thumbnailUrl}
                                    alt={previewTemplate.name}
                                    className="w-full h-auto"
                                />
                                {getThemeColors(previewTemplate).length > 0 && (
                                    <div className="absolute bottom-4 right-4 flex gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
                                        <Palette className="w-4 h-4 text-white" />
                                        {getThemeColors(previewTemplate).map((color, index) => (
                                            <div
                                                key={index}
                                                className="w-5 h-5 rounded-full shadow-lg border-2 border-white/40"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Template Details */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                {/* Industries */}
                                {previewTemplate.industries && previewTemplate.industries.length > 0 && (
                                    <div className="bg-secondary/30 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-primary" />
                                            {t('industries.title', 'Industrias')}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {previewTemplate.industries.map(ind => (
                                                <span key={ind} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                                                    {getIndustryLabel(ind)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sections */}
                                <div className="bg-secondary/30 rounded-xl p-4">
                                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-primary" />
                                        {t('userTemplates.includedSections', 'Secciones incluidas')}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {previewTemplate.componentOrder.slice(0, 8).map(section => (
                                            <span key={section} className="bg-card text-muted-foreground px-2 py-1 rounded text-xs border border-border">
                                                {section}
                                            </span>
                                        ))}
                                        {previewTemplate.componentOrder.length > 8 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{previewTemplate.componentOrder.length - 8} más
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-green-500" />
                                    {t('userTemplates.whatHappensNext', '¿Qué pasa después?')}
                                </h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                        {t('userTemplates.nextStep1', 'Se creará una copia de esta plantilla como tu nuevo proyecto')}
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                        {t('userTemplates.nextStep2', 'Serás redirigido al editor para personalizar tu sitio')}
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                        {t('userTemplates.nextStep3', 'Podrás modificar textos, colores, imágenes y más')}
                                    </li>
                                </ul>
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={() => handleUseTemplate(previewTemplate.id)}
                                    disabled={isCreating}
                                    className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? (
                                        <>
                                            <Sparkles className="w-5 h-5 animate-spin" />
                                            {t('userTemplates.creating', 'Creando tu sitio...')}
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5" />
                                            {t('userTemplates.useThisTemplate', 'Usar esta plantilla')}
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserTemplates;

