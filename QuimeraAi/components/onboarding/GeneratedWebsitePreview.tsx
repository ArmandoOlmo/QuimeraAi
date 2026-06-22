import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Loader2, RotateCcw, Save, ShoppingBag, Sparkles } from 'lucide-react';
import type { PageSection, Project, SitePage } from '../../types';
import PageRenderer from '../PageRenderer';
import { AppButton, AppCard } from '../ui/system';

interface GeneratedWebsitePreviewProps {
    project: Project;
    isSaving: boolean;
    saveError: string | null;
    onSaveAndOpen: () => void;
    onRegenerate: () => void;
    onBackToPlan: () => void;
}

const HERO_SECTIONS = ['hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead', 'heroLumina', 'heroNeon'] as const;
const NON_CONTENT_SECTIONS = new Set<PageSection>(['colors', 'typography', 'header', 'footer', 'topBar', 'announcementBar', 'storeSettings']);

const SECTION_LABELS: Partial<Record<PageSection, string>> = {
    services: 'Servicios',
    features: 'Beneficios',
    testimonials: 'Testimonios',
    faq: 'FAQ',
    cta: 'CTA',
    leads: 'Contacto',
    newsletter: 'Newsletter',
    portfolio: 'Portafolio',
    pricing: 'Precios',
    menu: 'Menu',
    map: 'Ubicacion',
    howItWorks: 'Proceso',
    team: 'Equipo',
    heroLumina: 'Hero',
    featuresLumina: 'Beneficios',
    testimonialsLumina: 'Testimonios',
    faqLumina: 'FAQ',
    ctaLumina: 'CTA',
    heroNeon: 'Hero',
    featuresNeon: 'Beneficios',
    testimonialsNeon: 'Testimonios',
    faqNeon: 'FAQ',
    ctaNeon: 'CTA',
};

function getHomePage(project: Project): SitePage {
    const existingHome = project.pages?.find(page => page.isHomePage) || project.pages?.find(page => page.slug === '/');
    if (existingHome) return existingHome;

    return {
        id: `${project.id}-preview-home`,
        title: project.name || 'Home',
        slug: '/',
        type: 'static',
        sections: project.componentOrder,
        sectionData: project.data,
        isHomePage: true,
        showInNavigation: true,
        navigationOrder: 0,
    };
}

function firstText(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

function getHeroData(project: Project): Record<string, any> {
    const heroSection = project.componentOrder.find(section => HERO_SECTIONS.includes(section as typeof HERO_SECTIONS[number]));
    const data = heroSection ? (project.data as any)[heroSection] : undefined;
    return data && typeof data === 'object' ? data : {};
}

function getSectionLabel(section: PageSection): string {
    return SECTION_LABELS[section] || section.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
}

function getProjectSummary(project: Project): string {
    const hero = getHeroData(project);
    const brand = project.brandIdentity;
    const contentSections = project.componentOrder
        .filter(section => !NON_CONTENT_SECTIONS.has(section))
        .map(getSectionLabel);

    return [
        `Proyecto: ${project.name}`,
        brand?.industry ? `Industria: ${brand.industry}` : '',
        brand?.coreValues ? `Brief: ${brand.coreValues}` : '',
        firstText(hero.headline, hero.title, hero.heading) ? `Hero: ${firstText(hero.headline, hero.title, hero.heading)}` : '',
        firstText(hero.subheadline, hero.subtitle, hero.description) ? `Mensaje: ${firstText(hero.subheadline, hero.subtitle, hero.description)}` : '',
        contentSections.length ? `Secciones: ${contentSections.join(', ')}` : '',
    ].filter(Boolean).join('\n');
}

function getEcommerceSummary(project: Project) {
    const blueprint = project.businessBlueprint;
    if (!blueprint) return null;

    const ecommerce = blueprint.ecommerceBlueprint;
    const storefront = blueprint.storefrontBlueprint;

    return {
        enabled: ecommerce.enabled,
        categories: ecommerce.productCategories || ecommerce.categories || [],
        starterProductCount: ecommerce.starterProducts?.length || 0,
        themePreset: storefront.themePreset || storefront.templatePreset || 'draft',
        productCardVariant: storefront.productCardVariant || 'draft',
        needsReview: ecommerce.needsReview || storefront.needsReview,
    };
}

export function GeneratedWebsitePreview({
    project,
    isSaving,
    saveError,
    onSaveAndOpen,
    onRegenerate,
    onBackToPlan,
}: GeneratedWebsitePreviewProps) {
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
    const homePage = useMemo(() => getHomePage(project), [project]);
    const hero = useMemo(() => getHeroData(project), [project]);
    const summary = useMemo(() => getProjectSummary(project), [project]);
    const ecommerceSummary = useMemo(() => getEcommerceSummary(project), [project]);
    const sectionLabels = useMemo(() => (
        project.componentOrder
            .filter(section => !NON_CONTENT_SECTIONS.has(section))
            .slice(0, 8)
            .map(getSectionLabel)
    ), [project.componentOrder]);

    const headline = firstText(hero.headline, hero.title, hero.heading, project.name);
    const subheadline = firstText(hero.subheadline, hero.subtitle, hero.description, project.brandIdentity?.coreValues);

    const handleCopySummary = async () => {
        try {
            if (!navigator.clipboard) throw new Error('Clipboard is not available');
            await navigator.clipboard.writeText(summary);
            setCopyState('copied');
            window.setTimeout(() => setCopyState('idle'), 1800);
        } catch (error) {
            setCopyState('error');
            window.setTimeout(() => setCopyState('idle'), 1800);
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-q-bg">
            <div className="border-b border-q-border/70 bg-q-bg/95 px-4 py-4 backdrop-blur-xl lg:px-6">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-q-success/25 bg-q-success/10 px-3 py-1 text-xs font-semibold text-q-success">
                            <Check className="h-3.5 w-3.5" />
                            Generacion completada
                        </div>
                        <h2 className="text-2xl font-bold text-q-text lg:text-3xl">Tu website esta listo</h2>
                        <p className="mt-1 max-w-2xl text-sm text-q-text-secondary">
                            Revisa el resultado generado antes de guardarlo como proyecto y abrirlo en el editor.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
                        <AppButton
                            variant="outline"
                            size="md"
                            leftIcon={<ArrowLeft className="h-4 w-4" />}
                            onClick={onBackToPlan}
                            disabled={isSaving}
                        >
                            Volver al plan
                        </AppButton>
                        <AppButton
                            variant="secondary"
                            size="md"
                            leftIcon={<RotateCcw className="h-4 w-4" />}
                            onClick={onRegenerate}
                            disabled={isSaving}
                        >
                            Regenerar
                        </AppButton>
                        <AppButton
                            variant="ghost"
                            size="md"
                            leftIcon={copyState === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            onClick={handleCopySummary}
                            disabled={isSaving}
                        >
                            {copyState === 'copied' ? 'Copiado' : copyState === 'error' ? 'No copiado' : 'Copiar resumen'}
                        </AppButton>
                        <AppButton
                            variant="primary"
                            size="md"
                            leftIcon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            onClick={onSaveAndOpen}
                            loading={isSaving}
                            disabled={isSaving}
                        >
                            Guardar y abrir editor
                        </AppButton>
                    </div>
                </div>
                {saveError && (
                    <div className="mx-auto mt-3 max-w-7xl rounded-lg border border-q-error/25 bg-q-error/10 px-3 py-2 text-sm text-q-error">
                        {saveError}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar lg:px-6 lg:py-6">
                <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <AppCard variant="elevated" className="rounded-xl p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-q-text">
                                <Sparkles className="h-4 w-4 text-q-accent" />
                                Resumen generado
                            </div>
                            <h3 className="text-xl font-bold leading-tight text-q-text">{headline}</h3>
                            {subheadline && <p className="mt-2 text-sm leading-relaxed text-q-text-secondary">{subheadline}</p>}
                            {sectionLabels.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {sectionLabels.map((label, index) => (
                                        <span key={`${label}-${index}`} className="rounded-full border border-q-border bg-q-surface px-2.5 py-1 text-xs text-q-text-secondary">
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </AppCard>

                        {ecommerceSummary && (
                            <AppCard variant="elevated" className="rounded-xl p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-q-text">
                                    <ShoppingBag className="h-4 w-4 text-q-accent" />
                                    Ecommerce sugerido
                                </div>
                                <div className="space-y-2 text-xs text-q-text-secondary">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Enabled</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.enabled ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Starter drafts</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.starterProductCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Storefront preset</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.themePreset}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Product card</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.productCardVariant}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Needs review</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.needsReview ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                                {ecommerceSummary.categories.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {ecommerceSummary.categories.slice(0, 6).map((category, index) => (
                                            <span key={`${category}-${index}`} className="rounded-full border border-q-border bg-q-surface px-2.5 py-1 text-xs text-q-text-secondary">
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <a
                                    href="/ecommerce"
                                    className="mt-4 inline-flex items-center text-xs font-semibold text-q-accent hover:text-q-accent/80"
                                >
                                    Revisar en Ecommerce Suite
                                </a>
                            </AppCard>
                        )}
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-2xl border border-q-border bg-q-surface shadow-2xl shadow-black/10">
                        <div className="flex h-11 items-center gap-2 border-b border-q-border bg-q-bg/80 px-4">
                            <div className="flex gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-q-error/80" />
                                <span className="h-2.5 w-2.5 rounded-full bg-q-accent/80" />
                                <span className="h-2.5 w-2.5 rounded-full bg-q-success/80" />
                            </div>
                            <div className="mx-auto max-w-[70%] truncate rounded-full border border-q-border bg-q-surface px-3 py-1 text-center text-[11px] text-q-text-secondary">
                                quimera.ai/{project.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}
                            </div>
                            <div className="w-12" />
                        </div>
                        <div
                            className="relative h-[68vh] min-h-[560px] overflow-y-auto overflow-x-hidden bg-q-surface custom-scrollbar"
                            style={{ backgroundColor: project.theme?.pageBackground || project.theme?.globalColors?.background || '#ffffff' }}
                        >
                            <PageRenderer
                                page={homePage}
                                project={project}
                                isPreview
                                onNavigate={() => undefined}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
