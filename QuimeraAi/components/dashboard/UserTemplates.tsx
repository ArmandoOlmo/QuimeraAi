import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    CheckCircle,
    ChevronRight,
    Eye,
    FilterX,
    Grid,
    Info,
    Layers,
    LayoutTemplate,
    List,
    Menu,
    Palette,
    Play,
    Search,
    Sparkles,
    X,
} from 'lucide-react';

import { useProject } from '../../contexts/project';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { Project } from '../../types';
import { INDUSTRIES } from '../../data/industries';
import { getDynamicThumbnailUrl } from '../../utils/thumbnailHelper';
import DashboardSidebar from './DashboardSidebar';
import ProjectThumbnailFallback from './ProjectThumbnailFallback';
import PreviewOverlayCard from './PreviewOverlayCard';
import HeaderBackButton from '../ui/HeaderBackButton';
import AppSelect from '../ui/AppSelect';
import MobileSearchModal from '../ui/MobileSearchModal';
import { AppShell, AppShellContent, AppShellMain, AppShellTopbar } from '@/src/design-system/components/AppShell';

const UserTemplates: React.FC = () => {
    const { t } = useTranslation();
    const { projects, createProjectFromTemplate } = useProject();
    const { navigate } = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [filterIndustry, setFilterIndustry] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [previewTemplate, setPreviewTemplate] = useState<Project | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const templates = useMemo(
        () => projects.filter((project) => project.status === 'Template' && !project.isArchived),
        [projects],
    );

    const usedIndustries = useMemo(() => {
        const industries = new Set<string>();
        templates.forEach((template) => {
            if (Array.isArray(template.industries)) {
                template.industries.forEach((industry) => industries.add(industry));
            }
        });
        return Array.from(industries).sort();
    }, [templates]);

    const getIndustryLabel = (industryId: string): string => {
        const industry = INDUSTRIES.find((item) => item.id === industryId);
        if (industry) {
            const key = industry.labelKey.replace('industries.', '');
            return t(`industries.${key}`, { defaultValue: industryId });
        }
        return industryId;
    };

    const getThemeColors = (template: Project): string[] => {
        const globalColors = template.theme?.globalColors;
        if (globalColors?.primary || globalColors?.secondary || globalColors?.accent) {
            return [
                globalColors.primary,
                globalColors.secondary,
                globalColors.accent,
                globalColors.background,
                globalColors.text,
            ].filter(Boolean) as string[];
        }

        const heroColors = template.data?.hero?.colors;
        if (heroColors) {
            return [
                heroColors.primary,
                heroColors.secondary,
                heroColors.background,
                heroColors.text,
                heroColors.heading,
            ].filter(Boolean) as string[];
        }

        return [];
    };

    const getTemplateThumbnail = (template: Project): string | null => template.thumbnailUrl || getDynamicThumbnailUrl(template);

    const getTemplateSectionCount = (template: Project): number => template.componentOrder?.length ?? 0;

    const filteredTemplates = useMemo(() => {
        let result = [...templates];
        const search = searchTerm.trim().toLowerCase();

        if (search) {
            result = result.filter((template) => (
                template.name.toLowerCase().includes(search)
                || template.description?.toLowerCase().includes(search)
                || template.industries?.some((industry) => getIndustryLabel(industry).toLowerCase().includes(search))
            ));
        }

        if (filterIndustry !== 'all') {
            result = result.filter((template) => template.industries?.includes(filterIndustry));
        }

        return result;
    }, [templates, searchTerm, filterIndustry]);

    const averageSections = templates.length > 0
        ? Math.round(templates.reduce((total, template) => total + getTemplateSectionCount(template), 0) / templates.length)
        : 0;

    const activeIndustryLabel = filterIndustry === 'all'
        ? t('userTemplates.allIndustries', 'Todas las industrias')
        : getIndustryLabel(filterIndustry);

    const hasActiveFilters = searchTerm.trim().length > 0 || filterIndustry !== 'all';

    const resetFilters = () => {
        setSearchTerm('');
        setFilterIndustry('all');
    };

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

    const renderThemeSwatches = (template: Project, sizeClass = 'h-4 w-4') => {
        const colors = getThemeColors(template);
        if (colors.length === 0) return null;

        return (
            <div className="flex items-center gap-1" aria-label={t('userTemplates.palette', 'Paleta')}>
                {colors.slice(0, 5).map((color, index) => (
                    <span
                        key={`${color}-${index}`}
                        className={`${sizeClass} rounded-full border border-white/50 shadow-sm ring-1 ring-q-border/60`}
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
        );
    };

    return (
        <AppShell>
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <AppShellMain>
                <AppShellTopbar>
                    <div className="flex min-w-0 items-center gap-1 sm:gap-4">
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-q-text-muted transition-colors hover:bg-q-surface-overlay hover:text-q-text lg:hidden"
                            aria-label={t('dashboard.openNavigation', 'Abrir navegación')}
                        >
                            <Menu className="h-4 w-4" />
                        </button>
                        <div className="flex min-w-0 items-center gap-2">
                            <LayoutTemplate className="h-5 w-5 shrink-0 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="hidden truncate text-xl font-bold text-q-text sm:block">
                                {t('userTemplates.title', 'Plantillas')}
                            </h1>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsMobileSearchOpen(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-[var(--q-radius-md)] text-q-text-muted transition-colors hover:bg-q-surface-overlay hover:text-q-text"
                            aria-label={t('common.search', 'Buscar')}
                        >
                            <Search className="h-4 w-4" />
                        </button>
                        <HeaderBackButton onClick={() => navigate(ROUTES.DASHBOARD)} />
                        <MobileSearchModal
                            isOpen={isMobileSearchOpen}
                            searchQuery={searchTerm}
                            onSearchChange={setSearchTerm}
                            onClose={() => setIsMobileSearchOpen(false)}
                            placeholder={t('userTemplates.searchPlaceholder', 'Buscar plantillas...')}
                        />
                    </div>
                </AppShellTopbar>

                <AppShellContent className="p-3 sm:p-6 lg:p-8">
                    <div className="relative z-[1] mx-auto max-w-7xl space-y-6 lg:space-y-8">
                        <section className="quimera-dashboard-panel-card">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                <div className="min-w-0 max-w-2xl">
                                    <div className="mb-3 inline-flex items-center gap-2 rounded-[var(--q-radius-md)] border border-q-border/60 bg-q-surface-overlay/45 px-2.5 py-1 text-xs font-semibold text-q-text-muted">
                                        <Sparkles className="h-3.5 w-3.5 quimera-dashboard-header-icon" />
                                        {t('userTemplates.availableTemplates', 'Plantillas disponibles')}
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-normal text-q-text sm:text-3xl">
                                        {t('userTemplates.catalogTitle', 'Biblioteca de plantillas')}
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-q-text-secondary">
                                        {t('userTemplates.subtitle', 'Elige una base visual para tu próximo sitio y revísala antes de crear una copia editable.')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[28rem]">
                                    {[
                                        {
                                            label: t('userTemplates.stats.available', 'Disponibles'),
                                            value: templates.length,
                                            icon: LayoutTemplate,
                                        },
                                        {
                                            label: t('userTemplates.stats.industries', 'Industrias'),
                                            value: usedIndustries.length,
                                            icon: Building2,
                                        },
                                        {
                                            label: t('userTemplates.stats.results', 'Resultados'),
                                            value: filteredTemplates.length,
                                            icon: Search,
                                        },
                                        {
                                            label: t('userTemplates.stats.avgSections', 'Secciones prom.'),
                                            value: averageSections,
                                            icon: Layers,
                                        },
                                    ].map((stat) => {
                                        const Icon = stat.icon;
                                        return (
                                            <div
                                                key={stat.label}
                                                className="rounded-[var(--q-radius-lg)] border border-q-border/60 bg-q-surface/60 p-3"
                                            >
                                                <Icon className="mb-2 h-4 w-4 quimera-dashboard-header-icon" />
                                                <div className="text-2xl font-extrabold leading-none text-q-text">{stat.value}</div>
                                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-q-text-muted">
                                                    {stat.label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[var(--q-radius-xl)] border border-border-subtle bg-q-surface/80 p-3 shadow-[var(--q-shadow-card)] backdrop-blur-xl sm:p-4">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q-text-muted" />
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder={t('userTemplates.searchPlaceholder', 'Buscar plantillas...')}
                                        className="h-10 w-full rounded-[var(--q-radius-md)] border border-border-subtle bg-q-surface pl-9 pr-3 text-sm text-q-text outline-none transition-colors placeholder:text-q-text-muted focus:border-q-accent/50 focus:ring-2 focus:ring-q-accent/20"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <div className="flex min-w-0 items-center gap-2 rounded-[var(--q-radius-md)] border border-border-subtle bg-q-surface px-3 py-2">
                                        <Building2 className="h-4 w-4 shrink-0 text-q-text-muted" />
                                        <span className="hidden text-xs font-semibold uppercase tracking-wide text-q-text-muted sm:inline">
                                            {t('userTemplates.filterByIndustry', 'Industria')}
                                        </span>
                                        <AppSelect
                                            value={filterIndustry}
                                            onChange={(event) => setFilterIndustry(event.target.value)}
                                            className="h-7 min-w-[11rem] border-0 bg-transparent px-0 shadow-none focus:ring-0"
                                            aria-label={t('userTemplates.filterByIndustry', 'Industria')}
                                        >
                                            <option value="all">{t('userTemplates.allIndustries', 'Todas las industrias')}</option>
                                            {usedIndustries.map((industry) => (
                                                <option key={industry} value={industry}>
                                                    {getIndustryLabel(industry)}
                                                </option>
                                            ))}
                                        </AppSelect>
                                    </div>

                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--q-radius-md)] border border-border-subtle bg-q-surface px-3 text-sm font-semibold text-q-text-muted transition-colors hover:bg-q-surface-overlay hover:text-q-text"
                                        >
                                            <FilterX className="h-4 w-4" />
                                            {t('userTemplates.resetFilters', 'Limpiar')}
                                        </button>
                                    )}

                                    <div
                                        className="hidden items-center gap-1 rounded-[var(--q-radius-md)] bg-q-surface-overlay p-1 sm:flex"
                                        role="group"
                                        aria-label={t('dashboard.gridView', 'Vista')}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('grid')}
                                            className={`flex h-8 w-8 items-center justify-center rounded-[var(--q-radius-sm)] transition-colors ${
                                                viewMode === 'grid'
                                                    ? 'bg-q-surface text-q-accent shadow-[var(--q-shadow-card)]'
                                                    : 'text-q-text-muted hover:text-q-text'
                                            }`}
                                            aria-label={t('dashboard.gridView', 'Vista cuadrícula')}
                                            aria-pressed={viewMode === 'grid'}
                                        >
                                            <Grid className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            className={`flex h-8 w-8 items-center justify-center rounded-[var(--q-radius-sm)] transition-colors ${
                                                viewMode === 'list'
                                                    ? 'bg-q-surface text-q-accent shadow-[var(--q-shadow-card)]'
                                                    : 'text-q-text-muted hover:text-q-text'
                                            }`}
                                            aria-label={t('dashboard.listView', 'Vista lista')}
                                            aria-pressed={viewMode === 'list'}
                                        >
                                            <List className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-q-border/60 pt-3">
                                <div className="min-w-0 text-xs text-q-text-muted sm:text-sm">
                                    {t('userTemplates.matchingCount', 'Mostrando {{count}} de {{total}}', {
                                        count: filteredTemplates.length,
                                        total: templates.length,
                                    })}
                                    {filterIndustry !== 'all' && (
                                        <span className="ml-2 inline-flex max-w-full items-center rounded-full bg-q-accent/10 px-2 py-0.5 text-xs font-semibold text-q-accent">
                                            <span className="truncate">
                                                {t('userTemplates.activeFilter', 'Industria: {{industry}}', { industry: activeIndustryLabel })}
                                            </span>
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--q-radius-md)] bg-q-surface-overlay text-q-text-muted transition-colors hover:text-q-text sm:hidden"
                                    aria-label={t('dashboard.gridView', 'Cambiar vista')}
                                >
                                    {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                                </button>
                            </div>
                        </section>

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredTemplates.map((template) => {
                                    const thumbnailUrl = getTemplateThumbnail(template);
                                    const sectionCount = getTemplateSectionCount(template);

                                    return (
                                        <PreviewOverlayCard
                                            key={template.id}
                                            thumbnailUrl={thumbnailUrl}
                                            title={template.name}
                                            titleText={template.name}
                                            imageAlt={template.name}
                                            description={template.description}
                                            onClick={() => setPreviewTemplate(template)}
                                            ariaLabel={template.name}
                                            className="shadow-[var(--q-shadow-card)]"
                                            fallbackLogoClassName="h-9 w-9"
                                            topRight={renderThemeSwatches(template)}
                                            footer={(
                                                <div className="flex items-center justify-between gap-3 text-xs text-white/80">
                                                    <div className="min-w-0">
                                                        {template.industries && template.industries.length > 0 ? (
                                                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                                                <Building2 className="h-3.5 w-3.5 shrink-0 text-q-accent" />
                                                                <span className="truncate">
                                                                    {template.industries.slice(0, 2).map((industry) => getIndustryLabel(industry)).join(', ')}
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span>{t('userTemplates.allIndustries', 'Todas las industrias')}</span>
                                                        )}
                                                    </div>
                                                    <span className="shrink-0 rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                                                        {t('userTemplates.sectionsCount', '{{count}} secciones', { count: sectionCount })}
                                                    </span>
                                                </div>
                                            )}
                                            action={(
                                                <span className="inline-flex items-center gap-1.5 rounded-[var(--q-radius-md)] bg-white/90 px-2 py-1 text-xs font-semibold text-slate-950 shadow-sm">
                                                    <Eye className="h-3.5 w-3.5" />
                                                    {t('userTemplates.preview', 'Vista previa')}
                                                </span>
                                            )}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredTemplates.map((template) => {
                                    const thumbnailUrl = getTemplateThumbnail(template);
                                    const sectionCount = getTemplateSectionCount(template);

                                    return (
                                        <button
                                            key={template.id}
                                            type="button"
                                            onClick={() => setPreviewTemplate(template)}
                                            className="group flex w-full flex-col gap-4 rounded-[var(--q-radius-xl)] border border-border-subtle bg-q-surface p-3 text-left shadow-[var(--q-shadow-card)] transition-all duration-200 hover:border-q-border hover:shadow-[var(--shadow-card-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-q-accent/35 sm:flex-row sm:items-center"
                                        >
                                            <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-[var(--q-radius-lg)] bg-q-surface-overlay sm:h-24 sm:w-40">
                                                {thumbnailUrl ? (
                                                    <img
                                                        src={thumbnailUrl}
                                                        alt={template.name}
                                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                                    />
                                                ) : (
                                                    <ProjectThumbnailFallback logoClassName="h-8 w-8" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate text-base font-bold text-q-text">{template.name}</h3>
                                                    <span className="rounded-full border border-q-border/70 bg-q-surface-overlay px-2 py-1 text-[11px] font-semibold text-q-text-muted">
                                                        {t('userTemplates.sectionsCount', '{{count}} secciones', { count: sectionCount })}
                                                    </span>
                                                </div>
                                                {template.description && (
                                                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-q-text-secondary">
                                                        {template.description}
                                                    </p>
                                                )}
                                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-q-text-muted">
                                                    {template.industries && template.industries.length > 0 && (
                                                        <span className="inline-flex min-w-0 items-center gap-1.5">
                                                            <Building2 className="h-3.5 w-3.5 shrink-0 text-q-accent" />
                                                            <span className="truncate">
                                                                {template.industries.map((industry) => getIndustryLabel(industry)).join(', ')}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {renderThemeSwatches(template, 'h-3.5 w-3.5')}
                                                </div>
                                            </div>

                                            <span className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[var(--q-radius-md)] bg-q-accent px-3 text-sm font-semibold text-q-text-on-accent transition-opacity group-hover:opacity-90">
                                                <Eye className="h-4 w-4" />
                                                {t('userTemplates.preview', 'Vista previa')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {filteredTemplates.length === 0 && (
                            <div className="rounded-[var(--q-radius-xl)] border border-dashed border-border-subtle bg-q-surface px-6 py-14 text-center shadow-[var(--q-shadow-card)]">
                                <LayoutTemplate className="mx-auto mb-4 h-12 w-12 text-q-text-muted/50" />
                                <h3 className="text-lg font-semibold text-q-text">
                                    {t('userTemplates.noTemplatesFound', 'No se encontraron plantillas')}
                                </h3>
                                <p className="mx-auto mt-2 max-w-md text-sm text-q-text-muted">
                                    {t('userTemplates.tryAdjustingFilters', 'Intenta ajustar los filtros de búsqueda')}
                                </p>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-[var(--q-radius-md)] bg-q-accent px-4 text-sm font-semibold text-q-text-on-accent transition-opacity hover:opacity-90"
                                    >
                                        <FilterX className="h-4 w-4" />
                                        {t('userTemplates.resetFilters', 'Limpiar')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </AppShellContent>
            </AppShellMain>

            {previewTemplate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(9,4,17,0.72)] p-3 backdrop-blur-sm sm:p-4"
                    onClick={() => setPreviewTemplate(null)}
                    role="presentation"
                >
                    <div
                        className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--q-radius-xl)] border border-border-subtle bg-q-surface text-q-text shadow-[var(--q-shadow-modal)]"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="template-preview-title"
                    >
                        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle px-4 py-4 sm:px-6">
                            <div className="min-w-0">
                                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                    <LayoutTemplate className="h-3.5 w-3.5 quimera-dashboard-header-icon" />
                                    {t('userTemplates.templatePreview', 'Vista previa de plantilla')}
                                </div>
                                <h2 id="template-preview-title" className="truncate text-xl font-bold text-q-text sm:text-2xl">
                                    {previewTemplate.name}
                                </h2>
                                {previewTemplate.description && (
                                    <p className="mt-1 line-clamp-2 text-sm text-q-text-secondary">
                                        {previewTemplate.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleUseTemplate(previewTemplate.id)}
                                    disabled={isCreating}
                                    className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-[var(--q-radius-md)] bg-q-accent px-0 text-sm font-bold text-q-text-on-accent shadow-sm shadow-q-accent/15 transition-all hover:opacity-90 disabled:pointer-events-none disabled:opacity-55 sm:w-auto sm:px-4"
                                    aria-label={t('userTemplates.useThisTemplate', 'Usar esta plantilla')}
                                >
                                    {isCreating ? (
                                        <>
                                            <Sparkles className="h-4 w-4 animate-spin" />
                                            <span className="hidden sm:inline">{t('userTemplates.creating', 'Creando tu sitio...')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4" />
                                            <span className="hidden sm:inline">{t('userTemplates.useThisTemplate', 'Usar esta plantilla')}</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewTemplate(null)}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--q-radius-md)] text-q-text-muted transition-colors hover:bg-q-surface-overlay hover:text-q-text"
                                    aria-label={t('common.close', 'Cerrar')}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
                                <div className="overflow-hidden rounded-[var(--q-radius-xl)] border border-border-subtle bg-q-surface-overlay">
                                    {getTemplateThumbnail(previewTemplate) ? (
                                        <img
                                            src={getTemplateThumbnail(previewTemplate)}
                                            alt={previewTemplate.name}
                                            className="max-h-[58vh] w-full object-cover object-top"
                                        />
                                    ) : (
                                        <div className="flex aspect-[4/3] items-center justify-center">
                                            <ProjectThumbnailFallback logoClassName="h-12 w-12" />
                                        </div>
                                    )}
                                </div>

                                <aside className="space-y-4">
                                    <section className="rounded-[var(--q-radius-lg)] border border-border-subtle bg-q-surface p-4">
                                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-q-text">
                                            <Info className="h-4 w-4 quimera-dashboard-header-icon" />
                                            {t('userTemplates.detailsTitle', 'Detalles')}
                                        </h3>
                                        <div className="space-y-3">
                                            {previewTemplate.industries && previewTemplate.industries.length > 0 && (
                                                <div>
                                                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                                        {t('industries.title', 'Industrias')}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {previewTemplate.industries.map((industry) => (
                                                            <span
                                                                key={industry}
                                                                className="rounded-full border border-q-accent/25 bg-q-accent/10 px-2.5 py-1 text-xs font-semibold text-q-accent"
                                                            >
                                                                {getIndustryLabel(industry)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {getThemeColors(previewTemplate).length > 0 && (
                                                <div>
                                                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                                        <Palette className="h-3.5 w-3.5" />
                                                        {t('userTemplates.palette', 'Paleta')}
                                                    </div>
                                                    {renderThemeSwatches(previewTemplate, 'h-5 w-5')}
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="rounded-[var(--q-radius-lg)] border border-border-subtle bg-q-surface p-4">
                                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-q-text">
                                            <Layers className="h-4 w-4 quimera-dashboard-header-icon" />
                                            {t('userTemplates.includedSections', 'Secciones incluidas')}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(previewTemplate.componentOrder ?? []).slice(0, 10).map((section) => (
                                                <span
                                                    key={section}
                                                    className="rounded-[var(--q-radius-sm)] border border-q-border bg-q-surface-overlay px-2 py-1 text-xs font-medium text-q-text-secondary"
                                                >
                                                    {section}
                                                </span>
                                            ))}
                                            {(previewTemplate.componentOrder?.length ?? 0) > 10 && (
                                                <span className="px-1 py-1 text-xs text-q-text-muted">
                                                    +{(previewTemplate.componentOrder?.length ?? 0) - 10}
                                                </span>
                                            )}
                                        </div>
                                    </section>

                                    <section className="rounded-[var(--q-radius-lg)] border border-q-success/25 bg-q-success/10 p-4">
                                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-q-text">
                                            <CheckCircle className="h-4 w-4 text-q-success" />
                                            {t('userTemplates.whatHappensNext', '¿Qué pasa después?')}
                                        </h3>
                                        <ul className="space-y-2 text-sm text-q-text-secondary">
                                            {[
                                                t('userTemplates.nextStep1', 'Se creará una copia de esta plantilla como tu nuevo proyecto'),
                                                t('userTemplates.nextStep2', 'Serás redirigido al editor para personalizar tu sitio'),
                                                t('userTemplates.nextStep3', 'Podrás modificar textos, colores, imágenes y más'),
                                            ].map((step) => (
                                                <li key={step} className="flex items-start gap-2">
                                                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-q-success" />
                                                    <span>{step}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                </aside>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
};

export default UserTemplates;
