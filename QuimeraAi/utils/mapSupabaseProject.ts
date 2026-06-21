import { PageSection, Project, SitePage, ThemeData } from '../types';
import { initialData } from '../data/initialData';
import { generatePagesFromLegacyProject } from './legacyMigration';
import { resolveProjectName } from './resolveProjectName';

type SupabaseProjectRow = Record<string, any>;

const SECTION_ALIASES: Record<string, PageSection> = {
    ProductGridSection: 'productGrid',
    ProductDetailSection: 'productDetail',
    CategoryProductsSection: 'categoryProducts',
    CartSection: 'cart',
    CheckoutSection: 'checkout',
};

function nonEmptyArray<T = any>(value: unknown): T[] | undefined {
    return Array.isArray(value) && value.length > 0 ? value as T[] : undefined;
}

function nonEmptyObject<T extends Record<string, any>>(value: unknown): T | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return Object.keys(value as Record<string, any>).length > 0 ? value as T : undefined;
}

function normalizeSections(sections: unknown): PageSection[] | undefined {
    if (!Array.isArray(sections)) return undefined;
    return sections.map(section => (SECTION_ALIASES[String(section)] ?? section) as PageSection);
}

const GLOBAL_CONTROL_SECTIONS = new Set<PageSection>(['colors', 'typography']);
const SHELL_SECTIONS = new Set<PageSection>(['header', 'footer']);

const dedupeSections = (sections: PageSection[]): PageSection[] => {
    const seen = new Set<PageSection>();
    return sections.filter(section => {
        if (seen.has(section)) return false;
        seen.add(section);
        return true;
    });
};

export function normalizeProjectComponentOrder(sections: PageSection[] | undefined | null): PageSection[] | undefined {
    if (!sections || sections.length === 0) return undefined;
    const contentSections = dedupeSections(sections).filter(
        section => !GLOBAL_CONTROL_SECTIONS.has(section) && !SHELL_SECTIONS.has(section)
    );
    return ['colors', 'typography', 'header', ...contentSections, 'footer'];
}

function normalizePageComponentOrder(sections: PageSection[] | undefined): PageSection[] | undefined {
    if (!sections || sections.length === 0) return sections;
    const contentSections = dedupeSections(sections).filter(
        section => !GLOBAL_CONTROL_SECTIONS.has(section) && !SHELL_SECTIONS.has(section)
    );
    return ['header', ...contentSections, 'footer'];
}

function normalizePages(pages: unknown): SitePage[] | undefined {
    if (!Array.isArray(pages)) return undefined;
    return pages.map(page => {
        if (!page || typeof page !== 'object' || Array.isArray(page)) return page as SitePage;
        const rawPage = page as Record<string, any>;
        return {
            ...page,
            title: resolveProjectName(rawPage.title),
            sections: normalizePageComponentOrder(normalizeSections(rawPage.sections)),
            seo: rawPage.seo
                ? {
                    ...rawPage.seo,
                    title: rawPage.seo.title ? resolveProjectName(rawPage.seo.title) : rawPage.seo.title,
                    description: rawPage.seo.description ? resolveProjectName(rawPage.seo.description) : rawPage.seo.description,
                }
                : rawPage.seo,
        } as SitePage;
    });
}

const ORDER_HINTS: PageSection[] = [
    'colors', 'typography', 'header',
    'hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova', 'heroLead', 'heroLumina', 'heroNeon',
    'topBar', 'logoBanner', 'banner',
    'features', 'featuresLumina', 'featuresNeon',
    'testimonials', 'testimonialsLumina', 'testimonialsNeon',
    'slideshow',
    'separator1', 'separator2', 'separator3', 'separator4', 'separator5',
    'pricing', 'pricingLumina', 'pricingNeon',
    'faq', 'faqLumina', 'faqNeon',
    'portfolio', 'portfolioLumina', 'portfolioNeon',
    'cta', 'ctaLumina', 'ctaNeon',
    'services', 'team', 'video', 'howItWorks', 'menu',
    'storeSettings', 'products', 'announcementBar', 'productHero', 'featuredProducts', 'categoryGrid',
    'trustBadges', 'saleCountdown', 'collectionBanner', 'recentlyViewed', 'productReviews', 'productBundle',
    'productDetail', 'categoryProducts', 'articleContent', 'productGrid', 'realEstateListings', 'cart', 'checkout',
    'leads', 'newsletter', 'map', 'chatbot', 'cmsFeed', 'signupFloat',
    'footer',
];

const STRUCTURE_SECTIONS = new Set<PageSection>(['colors', 'typography', 'header', 'footer']);

function inferComponentOrderFromData(pageData: Record<string, any>): PageSection[] {
    const dataKeys = new Set(Object.keys(pageData || {}));
    const inferred = ORDER_HINTS.filter(section => STRUCTURE_SECTIONS.has(section) || dataKeys.has(section));
    if (!inferred.includes('footer')) inferred.push('footer');
    return inferred;
}

function looksLikeGlobalFallbackOrder(order: PageSection[] | undefined, pageData: Record<string, any>): boolean {
    if (!order || order.length < 50) return false;
    const dataSectionCount = ORDER_HINTS.filter(section => pageData?.[section]).length;
    return dataSectionCount > 0 && dataSectionCount < order.length / 2;
}

function looksLikeSparseFallbackPages(pages: SitePage[] | undefined, pageData: Record<string, any>): boolean {
    if (!pages || pages.length !== 1) return false;
    const sections = pages[0]?.sections || [];
    const dataSectionCount = ORDER_HINTS.filter(section => pageData?.[section]).length;
    return dataSectionCount > sections.length && sections.every(section => section === 'header' || section === 'footer');
}

const COLOR_SOURCE_SECTIONS: PageSection[] = [
    'productHero',
    'featuredProducts',
    'categoryGrid',
    'trustBadges',
    'productReviews',
    'saleCountdown',
    'announcementBar',
    'hero',
    'header',
    'footer',
];

function isUsableColor(value: unknown): value is string {
    return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

function inferGlobalColorsFromPageData(pageData: Record<string, any>): Partial<ThemeData['globalColors']> | undefined {
    const sources = COLOR_SOURCE_SECTIONS
        .map(section => pageData?.[section]?.colors)
        .filter(source => source && typeof source === 'object' && !Array.isArray(source)) as Record<string, unknown>[];

    if (!sources.length) return undefined;

    const first = (...keys: string[]) => {
        for (const source of sources) {
            for (const key of keys) {
                const value = source[key];
                if (isUsableColor(value)) return value;
            }
        }
        return undefined;
    };

    const primary = first('buttonBackground', 'badgeBackground', 'iconColor', 'primary');
    const accent = first('accent', 'starColor', 'iconColor') || primary;
    const background = first('background');
    const surface = first('cardBackground', 'surface');
    const text = first('text', 'cardText');
    const heading = first('heading', 'cardText', 'text');
    const border = first('borderColor', 'border');
    const success = first('verifiedBadgeColor', 'success');
    const error = first('salePriceColor', 'badgeBackground', 'error');

    return {
        ...(primary ? { primary } : {}),
        secondary: first('secondary') || primary || initialData.theme.globalColors.secondary,
        ...(accent ? { accent } : {}),
        ...(background ? { background } : {}),
        ...(surface ? { surface } : {}),
        ...(text ? { text, textMuted: `${text}99` } : {}),
        ...(heading ? { heading } : {}),
        ...(border ? { border } : {}),
        ...(success ? { success } : {}),
        ...(error ? { error } : {}),
    };
}

function resolveProjectTheme(rowTheme: unknown, dataTheme: unknown, pageData: Record<string, any>): ThemeData {
    const rowThemeObject = nonEmptyObject<Partial<ThemeData>>(rowTheme) ?? {};
    const dataThemeObject = nonEmptyObject<Partial<ThemeData>>(dataTheme) ?? {};
    const selectedTheme = {
        ...dataThemeObject,
        ...rowThemeObject,
        globalColors: {
            ...(dataThemeObject.globalColors || {}),
            ...(rowThemeObject.globalColors || {}),
        },
    } as Partial<ThemeData>;
    const selectedGlobalColors =
        nonEmptyObject<Partial<ThemeData['globalColors']>>(selectedTheme.globalColors) ??
        inferGlobalColorsFromPageData(pageData) ??
        {};
    const globalColors = {
        ...initialData.theme.globalColors,
        ...selectedGlobalColors,
    };

    return {
        ...initialData.theme,
        ...selectedTheme,
        pageBackground: selectedTheme.pageBackground || globalColors.background || initialData.theme.pageBackground,
        globalColors,
    } as ThemeData;
}

/** Derive dashboard status from the row; published_at is the source of truth for live sites. */
function resolveProjectStatus(row: SupabaseProjectRow): Project['status'] {
    const rawStatus = row.status ?? row.data?.status;
    if (rawStatus === 'Template') return 'Template';
    if (row.published_at) return 'Published';
    if (rawStatus === 'Published') return 'Published';
    return 'Draft';
}

/** Resolve menus from the dedicated column or the legacy data JSONB field. */
export function resolveProjectMenus(row: SupabaseProjectRow): any[] {
    if (Array.isArray(row.menus) && row.menus.length > 0) {
        return row.menus;
    }
    const dataPayload = row.data;
    if (dataPayload && Array.isArray(dataPayload.menus) && dataPayload.menus.length > 0) {
        return dataPayload.menus;
    }
    return [];
}

/**
 * Merges a Supabase `projects` row into a single Project object.
 * Top-level columns (menus, theme, pages, …) take precedence over the same keys
 * stored inside the `data` JSONB blob so CMS menus are never lost on load.
 */
export function mapSupabaseRowToProject(row: SupabaseProjectRow): Project {
    const dataPayload =
        row.data && typeof row.data === 'object' && !Array.isArray(row.data)
            ? row.data
            : {};

    const pageData =
        dataPayload.data && typeof dataPayload.data === 'object' && !Array.isArray(dataPayload.data)
            ? dataPayload.data
            : dataPayload;

    const rawComponentOrder = normalizeSections(nonEmptyArray(row.component_order) ?? nonEmptyArray(dataPayload.componentOrder));
    const componentOrder = normalizeProjectComponentOrder(looksLikeGlobalFallbackOrder(rawComponentOrder, pageData)
        ? inferComponentOrderFromData(pageData)
        : rawComponentOrder);
    const rawSectionVisibility =
        nonEmptyObject<Record<PageSection, boolean>>(row.section_visibility) ??
        nonEmptyObject<Record<PageSection, boolean>>(dataPayload.sectionVisibility) ??
        componentOrder?.reduce((acc, section) => {
            acc[section] = true;
            return acc;
        }, {} as Record<PageSection, boolean>);
    const sectionVisibility = componentOrder && rawSectionVisibility
        ? componentOrder.reduce((acc, section) => {
            acc[section] = rawSectionVisibility[section] ?? true;
            return acc;
        }, { ...rawSectionVisibility } as Record<PageSection, boolean>)
        : rawSectionVisibility;
    const rawPages = normalizePages(nonEmptyArray(row.pages) ?? nonEmptyArray(dataPayload.pages));
    const pages = looksLikeSparseFallbackPages(rawPages, pageData) && componentOrder
        ? generatePagesFromLegacyProject(componentOrder, sectionVisibility || {}, pageData)
        : rawPages;

    return {
        ...dataPayload,
        data: pageData,
        id: row.id,
        name: row.name ?? dataPayload.name,
        status: resolveProjectStatus(row),
        userId: row.user_id ?? dataPayload.userId,
        tenantId: row.tenant_id ?? dataPayload.tenantId,
        lastUpdated: row.last_updated ?? dataPayload.lastUpdated,
        thumbnailUrl: row.thumbnail_url ?? dataPayload.thumbnailUrl,
        theme: resolveProjectTheme(row.theme, dataPayload.theme, pageData),
        brandIdentity: nonEmptyObject(row.brand_identity) ?? dataPayload.brandIdentity,
        componentOrder,
        sectionVisibility,
        pages,
        menus: resolveProjectMenus(row),
        categories:
            (Array.isArray(row.categories) && row.categories.length > 0
                ? row.categories
                : dataPayload.categories) ?? undefined,
        aiAssistantConfig: row.ai_assistant_config ?? dataPayload.aiAssistantConfig,
        seoConfig: row.seo_config ?? dataPayload.seoConfig,
        crmConfig: row.crm_config ?? dataPayload.crmConfig,
    } as Project;
}
