import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Link2, Loader2, RotateCcw, Save, ShoppingBag, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PageSection, Project, SitePage } from '../../types';
import type { BioPageBlockType, BioPageBlueprint } from '../../types/businessBlueprint';
import PageRenderer from '../PageRenderer';
import { AppButton, AppCard } from '../ui/system';
import { isRetiredDesignSuiteSection } from '../../data/retiredSuites';
import StudioResultSummary from '../studio/StudioResultSummary';
import { getAiStudioSummary, getAiStudioSummaryCopy } from '../../utils/studioUX';

interface GeneratedWebsitePreviewProps {
    project: Project;
    isSaving: boolean;
    saveError: string | null;
    onSaveAndOpen: () => void;
    onRegenerate: () => void;
    onBackToPlan: () => void;
}

const HERO_SECTIONS = ['hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead'] as const;
const NON_CONTENT_SECTIONS = new Set<PageSection>(['colors', 'typography', 'header', 'footer', 'topBar', 'announcementBar', 'storeSettings']);

const SECTION_LABEL_KEYS: Partial<Record<PageSection, string>> = {
    services: 'aiWebsiteStudio.preview.sections.services',
    features: 'aiWebsiteStudio.preview.sections.features',
    testimonials: 'aiWebsiteStudio.preview.sections.testimonials',
    faq: 'aiWebsiteStudio.preview.sections.faq',
    cta: 'aiWebsiteStudio.preview.sections.cta',
    leads: 'aiWebsiteStudio.preview.sections.leads',
    newsletter: 'aiWebsiteStudio.preview.sections.newsletter',
    portfolio: 'aiWebsiteStudio.preview.sections.portfolio',
    pricing: 'aiWebsiteStudio.preview.sections.pricing',
    menu: 'aiWebsiteStudio.preview.sections.menu',
    map: 'aiWebsiteStudio.preview.sections.map',
    howItWorks: 'aiWebsiteStudio.preview.sections.howItWorks',
    team: 'aiWebsiteStudio.preview.sections.team',
};

const BIO_PAGE_BLOCK_LABEL_KEYS: Partial<Record<BioPageBlockType, string>> = {
    profile: 'aiWebsiteStudio.preview.bioPage.blocks.profile',
    link: 'aiWebsiteStudio.preview.bioPage.blocks.link',
    social_links: 'aiWebsiteStudio.preview.bioPage.blocks.socialLinks',
    featured_banner: 'aiWebsiteStudio.preview.bioPage.blocks.featuredBanner',
    featured_media: 'aiWebsiteStudio.preview.bioPage.blocks.featuredMedia',
    media_grid: 'aiWebsiteStudio.preview.bioPage.blocks.mediaGrid',
    product_grid: 'aiWebsiteStudio.preview.bioPage.blocks.productGrid',
    product_collection: 'aiWebsiteStudio.preview.bioPage.blocks.productCollection',
    booking: 'aiWebsiteStudio.preview.bioPage.blocks.booking',
    lead_form: 'aiWebsiteStudio.preview.bioPage.blocks.leadForm',
    email_subscribe: 'aiWebsiteStudio.preview.bioPage.blocks.emailSubscribe',
    portfolio_grid: 'aiWebsiteStudio.preview.bioPage.blocks.portfolioGrid',
    testimonials: 'aiWebsiteStudio.preview.bioPage.blocks.testimonials',
    faq: 'aiWebsiteStudio.preview.bioPage.blocks.faq',
    contact: 'aiWebsiteStudio.preview.bioPage.blocks.contact',
    chatbot_cta: 'aiWebsiteStudio.preview.bioPage.blocks.chatbotCta',
    divider: 'aiWebsiteStudio.preview.bioPage.blocks.divider',
    spacer: 'aiWebsiteStudio.preview.bioPage.blocks.spacer',
    custom_html_placeholder: 'aiWebsiteStudio.preview.bioPage.blocks.customHtmlPlaceholder',
};

const BIO_PAGE_INTEGRATION_LABEL_KEYS: Record<keyof BioPageBlueprint['integrations'], string> = {
    businessBlueprint: 'aiWebsiteStudio.preview.bioPage.integrations.businessBlueprint',
    designSystem: 'aiWebsiteStudio.preview.bioPage.integrations.designSystem',
    ecommerce: 'aiWebsiteStudio.preview.bioPage.integrations.ecommerce',
    appointments: 'aiWebsiteStudio.preview.bioPage.integrations.appointments',
    crm: 'aiWebsiteStudio.preview.bioPage.integrations.crm',
    emailMarketing: 'aiWebsiteStudio.preview.bioPage.integrations.emailMarketing',
    chatbot: 'aiWebsiteStudio.preview.bioPage.integrations.chatbot',
    media: 'aiWebsiteStudio.preview.bioPage.integrations.media',
    analytics: 'aiWebsiteStudio.preview.bioPage.integrations.analytics',
    websiteBuilder: 'aiWebsiteStudio.preview.bioPage.integrations.websiteBuilder',
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

function getSectionLabel(section: PageSection, t: (key: string) => string): string {
    const key = SECTION_LABEL_KEYS[section];
    return key ? t(key) : section.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
}

function getProjectSummary(project: Project, t: (key: string, options?: Record<string, unknown>) => string): string {
    const hero = getHeroData(project);
    const brand = project.brandIdentity;
    const contentSections = project.componentOrder
        .filter(section => !NON_CONTENT_SECTIONS.has(section) && !isRetiredDesignSuiteSection(section))
        .map(section => getSectionLabel(section, t));

    return [
        t('aiWebsiteStudio.preview.copySummary.project', { value: project.name }),
        brand?.industry ? t('aiWebsiteStudio.preview.copySummary.industry', { value: brand.industry }) : '',
        brand?.coreValues ? t('aiWebsiteStudio.preview.copySummary.brief', { value: brand.coreValues }) : '',
        firstText(hero.headline, hero.title, hero.heading) ? t('aiWebsiteStudio.preview.copySummary.hero', { value: firstText(hero.headline, hero.title, hero.heading) }) : '',
        firstText(hero.subheadline, hero.subtitle, hero.description) ? t('aiWebsiteStudio.preview.copySummary.message', { value: firstText(hero.subheadline, hero.subtitle, hero.description) }) : '',
        contentSections.length ? t('aiWebsiteStudio.preview.copySummary.sections', { value: contentSections.join(', ') }) : '',
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

function formatBioPageBlockLabel(type: BioPageBlockType, t: (key: string) => string): string {
    const key = BIO_PAGE_BLOCK_LABEL_KEYS[type];
    return key ? t(key) : type.replace(/_/g, ' ').replace(/^./, char => char.toUpperCase());
}

function getBioPageSummary(project: Project, t: (key: string) => string) {
    const blueprint = project.businessBlueprint?.bioPageBlueprint;
    if (!blueprint?.enabled) return null;

    const blocks = (blueprint.blocks || [])
        .filter(block => block.visible !== false)
        .sort((a, b) => a.order - b.order);
    const links = [...(blueprint.links || []), ...(blueprint.socialLinks || [])]
        .filter(link => link.visible !== false);
    const enabledIntegrations = (Object.keys(BIO_PAGE_INTEGRATION_LABEL_KEYS) as Array<keyof BioPageBlueprint['integrations']>)
        .filter(key => blueprint.integrations?.[key])
        .map(key => t(BIO_PAGE_INTEGRATION_LABEL_KEYS[key]));

    return {
        title: blueprint.profile.displayName || blueprint.title,
        handle: blueprint.profile.handle,
        route: `/bio/${blueprint.publicSlug}`,
        status: blueprint.status,
        layout: blueprint.theme.layoutVariant,
        blocks,
        blockLabels: blocks.map(block => formatBioPageBlockLabel(block.type, t)),
        linkCount: links.length,
        enabledIntegrations,
        needsReview: blueprint.needsReview || blueprint.status === 'needs_review',
        noIndex: blueprint.seo.noIndex,
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
    const { t } = useTranslation();
    const translate = useCallback((key: string, options?: Record<string, unknown>) => String(t(key, options)), [t]);
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
    const homePage = useMemo(() => getHomePage(project), [project]);
    const hero = useMemo(() => getHeroData(project), [project]);
    const summary = useMemo(() => getProjectSummary(project, translate), [project, translate]);
    const ecommerceSummary = useMemo(() => getEcommerceSummary(project), [project]);
    const bioPageSummary = useMemo(() => getBioPageSummary(project, translate), [project, translate]);
    const studioSummary = useMemo(() => getAiStudioSummary({ generatedProject: project, copy: getAiStudioSummaryCopy(translate) }), [project, translate]);
    const sectionLabels = useMemo(() => (
        project.componentOrder
            .filter(section => !NON_CONTENT_SECTIONS.has(section) && !isRetiredDesignSuiteSection(section))
            .slice(0, 8)
            .map(section => getSectionLabel(section, translate))
    ), [project.componentOrder, translate]);

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
                            {t('aiWebsiteStudio.preview.completedBadge')}
                        </div>
                        <h2 className="text-2xl font-bold text-q-text lg:text-3xl">{t('aiWebsiteStudio.preview.title')}</h2>
                        <p className="mt-1 max-w-2xl text-sm text-q-text-secondary">
                            {t('aiWebsiteStudio.preview.description')}
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
                            {t('aiWebsiteStudio.preview.actions.backToPlan')}
                        </AppButton>
                        <AppButton
                            variant="secondary"
                            size="md"
                            leftIcon={<RotateCcw className="h-4 w-4" />}
                            onClick={onRegenerate}
                            disabled={isSaving}
                        >
                            {t('aiWebsiteStudio.preview.actions.regenerate')}
                        </AppButton>
                        <AppButton
                            variant="ghost"
                            size="md"
                            leftIcon={copyState === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            onClick={handleCopySummary}
                            disabled={isSaving}
                        >
                            {copyState === 'copied'
                                ? t('aiWebsiteStudio.preview.actions.copied')
                                : copyState === 'error'
                                    ? t('aiWebsiteStudio.preview.actions.copyFailed')
                                    : t('aiWebsiteStudio.preview.actions.copySummary')}
                        </AppButton>
                        <AppButton
                            variant="primary"
                            size="md"
                            leftIcon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            onClick={onSaveAndOpen}
                            loading={isSaving}
                            disabled={isSaving}
                        >
                            {t('aiWebsiteStudio.preview.actions.saveAndOpen')}
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
                        {studioSummary.result && (
                            <StudioResultSummary
                                title={studioSummary.result.title}
                                subtitle={studioSummary.result.subtitle}
                                badges={studioSummary.badges}
                                metrics={studioSummary.result.metrics}
                                warnings={studioSummary.result.warnings}
                            />
                        )}

                        <AppCard variant="elevated" className="rounded-xl p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-q-text">
                                <Sparkles className="h-4 w-4 text-q-accent" />
                                {t('aiWebsiteStudio.preview.generatedSummary')}
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
                                    {t('aiWebsiteStudio.preview.ecommerce.title')}
                                </div>
                                <div className="space-y-2 text-xs text-q-text-secondary">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.ecommerce.enabled')}</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.enabled ? t('aiWebsiteStudio.preview.values.yes') : t('aiWebsiteStudio.preview.values.no')}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.ecommerce.starterDrafts')}</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.starterProductCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.ecommerce.storefrontPreset')}</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.themePreset}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.ecommerce.productCard')}</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.productCardVariant}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.ecommerce.needsReview')}</span>
                                        <span className="font-semibold text-q-text">{ecommerceSummary.needsReview ? t('aiWebsiteStudio.preview.values.yes') : t('aiWebsiteStudio.preview.values.no')}</span>
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
                                    {t('aiWebsiteStudio.preview.ecommerce.reviewInSuite')}
                                </a>
                            </AppCard>
                        )}

                        {bioPageSummary && (
                            <AppCard variant="elevated" className="rounded-xl p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-q-text">
                                    <Link2 className="h-4 w-4 text-q-accent" />
                                    {t('aiWebsiteStudio.preview.bioPage.title')}
                                </div>
                                <div className="space-y-2 text-xs text-q-text-secondary">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.bioPage.profile')}</span>
                                        <span className="min-w-0 truncate font-semibold text-q-text">{bioPageSummary.title}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.bioPage.handle')}</span>
                                        <span className="font-mono text-[11px] font-semibold text-q-text">@{bioPageSummary.handle}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.bioPage.publicRoute')}</span>
                                        <span className="font-mono text-[11px] font-semibold text-q-text">{bioPageSummary.route}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.bioPage.status')}</span>
                                        <span className="font-semibold text-q-text">{bioPageSummary.status}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.bioPage.links')}</span>
                                        <span className="font-semibold text-q-text">{bioPageSummary.linkCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.bioPage.blocksLabel')}</span>
                                        <span className="font-semibold text-q-text">{bioPageSummary.blocks.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.bioPage.layout')}</span>
                                        <span className="font-semibold text-q-text">{bioPageSummary.layout}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{t('aiWebsiteStudio.preview.bioPage.seo')}</span>
                                        <span className="font-semibold text-q-text">
                                            {bioPageSummary.noIndex ? t('aiWebsiteStudio.preview.bioPage.seoNoIndex') : t('aiWebsiteStudio.preview.bioPage.seoIndexReady')}
                                        </span>
                                    </div>
                                </div>
                                {bioPageSummary.blockLabels.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {bioPageSummary.blockLabels.slice(0, 8).map((label, index) => (
                                            <span key={`${label}-${index}`} className="rounded-full border border-q-border bg-q-surface px-2.5 py-1 text-xs text-q-text-secondary">
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {bioPageSummary.enabledIntegrations.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {bioPageSummary.enabledIntegrations.slice(0, 8).map(label => (
                                            <span key={label} className="rounded-md border border-q-accent/20 bg-q-accent/5 px-2 py-1 text-[10px] font-semibold text-q-accent">
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-3 rounded-lg border border-q-border/70 bg-q-surface/60 px-3 py-2 text-[11px] leading-relaxed text-q-text-secondary">
                                    {bioPageSummary.needsReview && (
                                        <span className="font-semibold text-q-warning">{t('aiWebsiteStudio.preview.bioPage.needsReviewNotice')} </span>
                                    )}
                                    {t('aiWebsiteStudio.preview.bioPage.draftNotice')}
                                </div>
                            </AppCard>
                        )}
                    </div>

                    <div className="min-w-0 rounded-2xl border border-q-border bg-q-surface shadow-2xl shadow-black/10">
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
                            className="h-[68vh] min-h-[560px] overflow-y-auto bg-q-surface custom-scrollbar"
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
