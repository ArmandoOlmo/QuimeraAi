import { createWebsiteEcommerceBlockSeedsFromSections, getWebsiteEcommerceBlockDefinition, validateWebsiteEcommerceBlock } from '../websiteEcommerceBlocks';
import { createBlueprintModuleState, createBusinessBlueprintFromWebsitePlan, shouldProtectFromRegeneration } from './adapters';
import { isRetiredDesignSuiteSection } from '../../data/retiredSuites';
const ECOMMERCE_PAGE_SECTIONS = new Set([
    'featuredProducts',
    'categoryGrid',
    'productHero',
    'saleCountdown',
    'collectionBanner',
]);
const MANUAL_SECTION_ACTIONS = new Set([
    'component_add',
    'component_remove',
    'component_reorder',
    'section_visibility',
    'section_settings',
]);
const SOURCE_ALIASES = {
    newest: 'new_arrivals',
    new: 'new_arrivals',
    new_arrivals: 'new_arrivals',
    latest: 'new_arrivals',
    featured: 'featured',
    manual: 'manual',
    category: 'category',
    categories: 'category',
    collection: 'collection',
    collections: 'collection',
    best: 'best_sellers',
    best_sellers: 'best_sellers',
    bestseller: 'best_sellers',
    bestsellers: 'best_sellers',
    promotion: 'promotion',
    promo: 'promotion',
    gift_cards: 'gift_cards',
    giftcards: 'gift_cards',
};
const ready = (warnings = [], blockers = []) => ({
    isReady: blockers.length === 0,
    blockers,
    warnings,
});
const isRecord = (value) => (Boolean(value) && typeof value === 'object' && !Array.isArray(value));
const cloneJson = (value) => {
    if (!value || typeof value !== 'object')
        return value;
    try {
        return JSON.parse(JSON.stringify(value));
    }
    catch {
        return Array.isArray(value) ? [] : {};
    }
};
const getSectionSettings = (data, section) => {
    const value = data ? data[section] : undefined;
    return isRecord(value) ? cloneJson(value) : {};
};
const normalizePages = (pages, componentOrder) => {
    const sanitizedComponentOrder = componentOrder.filter(section => !isRetiredDesignSuiteSection(section));
    if (Array.isArray(pages) && pages.length > 0) {
        return pages.map(page => ({
            id: page.id,
            title: page.title,
            slug: page.slug,
            sections: (page.sections?.length ? page.sections : sanitizedComponentOrder)
                .filter(section => !isRetiredDesignSuiteSection(section)),
        }));
    }
    return [{
            id: 'home',
            title: 'Home',
            slug: '/',
            sections: sanitizedComponentOrder,
        }];
};
const normalizeEcommerceSource = (value, fallback) => {
    const key = String(value || fallback).trim().toLowerCase();
    return SOURCE_ALIASES[key] || fallback;
};
const stringList = (value) => {
    if (!Array.isArray(value))
        return undefined;
    const ids = value.map(item => String(item || '').trim()).filter(Boolean);
    return ids.length > 0 ? ids : undefined;
};
const firstString = (...values) => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return undefined;
};
const numberIn = (value, allowed) => (typeof value === 'number' && allowed.includes(value) ? value : undefined);
const booleanValue = (value) => (typeof value === 'boolean' ? value : undefined);
const getNestedRecord = (value, key) => (isRecord(value) && isRecord(value[key]) ? value[key] : {});
const buildWebsitePlanFallback = (input, now) => {
    const data = input.data || {};
    const brandName = input.brandIdentity?.name || input.projectName || firstString(data.header?.logoText, data.hero?.headline) || 'Untitled Website';
    const colors = input.theme.globalColors || {
        primary: '#111827',
        secondary: '#374151',
        accent: '#2563eb',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#111827',
    };
    const hasEcommerce = input.componentOrder.some(section => ECOMMERCE_PAGE_SECTIONS.has(section));
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: brandName,
            industry: input.brandIdentity?.industry || (hasEcommerce ? 'ecommerce' : 'services'),
            description: input.brandIdentity?.coreValues || '',
            tagline: firstString(data.hero?.subheadline),
            services: [],
            contactInfo: {},
            hasEcommerce,
        },
        brandProfile: {
            colors: {
                primary: colors.primary,
                secondary: colors.secondary,
                accent: colors.accent,
                background: colors.background,
                surface: colors.surface,
                text: colors.text,
            },
            fonts: [
                input.theme.fontFamilyHeader,
                input.theme.fontFamilyBody,
                input.theme.fontFamilyButton,
            ].filter(Boolean),
        },
        contentMap: {
            pages: normalizePages(input.pages, input.componentOrder).map(page => ({
                title: page.title,
                url: page.slug,
                purpose: page.slug === '/' ? 'home' : 'website-page',
                summary: page.sections.join(', '),
            })),
            products: [],
        },
        componentPlan: input.componentOrder.map(component => ({
            component,
            reason: 'Synced from Website Editor runtime.',
            confidence: 1,
            source: 'user',
        })),
        assetPlan: [],
        qualityGoals: [`Website Editor sync ${now}`],
    };
};
const createBaseBlueprint = (input, now) => {
    if (input.businessBlueprint)
        return input.businessBlueprint;
    const blueprint = createBusinessBlueprintFromWebsitePlan(buildWebsitePlanFallback(input, now), {
        projectId: input.projectId,
        createdBy: input.userId,
        source: 'manual',
        now,
    });
    return {
        ...blueprint,
        metadata: {
            ...blueprint.metadata,
            generatedBy: 'user',
            userModified: true,
            lastEditedAt: now,
            lastSyncedAt: now,
            ...(input.userId ? { lastEditedBy: input.userId } : {}),
        },
    };
};
const getTouchedSections = (input) => {
    const touched = new Set();
    if (input.touchedSection)
        touched.add(input.touchedSection);
    if (input.action === 'component_reorder') {
        input.componentOrder.forEach(section => touched.add(section));
    }
    return touched;
};
const createSectionState = (now, section, index, visible, settings, pageIds, existing, input, shouldMarkTouched) => {
    const base = {
        enabled: visible,
        status: visible ? 'configured' : 'disabled',
        needsReview: false,
        readiness: ready(),
        sourceMap: {
            ...(existing?.sourceMap || {}),
            section: `componentOrder.${Math.max(index, 0)}`,
            visibility: `sectionVisibility.${section}`,
            settings: `data.${section}`,
            pages: 'pages',
            lastAction: input.action,
        },
        metadata: {
            ...(existing?.metadata || {}),
            generatedBy: existing?.metadata?.generatedBy || (shouldMarkTouched ? 'user' : 'ai'),
            userModified: existing?.metadata?.userModified || shouldMarkTouched,
            ...(shouldMarkTouched ? { lockedFromRegeneration: true } : {}),
            lastSyncedAt: now,
            ...(shouldMarkTouched ? { lastEditedAt: now } : {}),
            ...(shouldMarkTouched && input.userId ? { lastEditedBy: input.userId } : {}),
        },
    };
    return {
        ...createBlueprintModuleState(now, base),
        id: existing?.id || `website-section-${section}`,
        type: section,
        order: index,
        visible,
        pageIds,
        settings,
    };
};
const buildSectionBlueprints = (existing, input, pages, now) => {
    const touchedSections = getTouchedSections(input);
    const existingSections = Array.isArray(existing?.sectionBlueprints) ? existing.sectionBlueprints : [];
    const existingByType = new Map();
    existingSections.forEach(section => {
        if (!existingByType.has(section.type))
            existingByType.set(section.type, section);
    });
    const sectionTypes = new Set(input.componentOrder);
    if (input.touchedSection)
        sectionTypes.add(input.touchedSection);
    existingSections
        .filter(section => shouldProtectFromRegeneration(section))
        .forEach(section => sectionTypes.add(section.type));
    return Array.from(sectionTypes).map(section => {
        const index = input.componentOrder.indexOf(section);
        const existingSection = existingByType.get(section);
        const visible = index >= 0
            ? input.sectionVisibility[section] !== false
            : false;
        const pageIds = pages
            .filter(page => page.sections.includes(section))
            .map(page => page.id);
        const shouldMarkTouched = MANUAL_SECTION_ACTIONS.has(input.action) && touchedSections.has(section);
        return createSectionState(now, section, index >= 0 ? index : existingSection?.order ?? input.componentOrder.length, visible, getSectionSettings(input.data, section), pageIds, existingSection, input, shouldMarkTouched);
    }).sort((a, b) => a.order - b.order);
};
const resolveBlockSettings = (type, fallbackSource, sectionSettings) => {
    const definition = getWebsiteEcommerceBlockDefinition(type);
    const currentSource = getNestedRecord(sectionSettings, 'source');
    const sourceType = normalizeEcommerceSource(sectionSettings.sourceType || currentSource.type || sectionSettings.source || fallbackSource, fallbackSource);
    const productIds = stringList(sectionSettings.productIds || sectionSettings.selectedProductIds || currentSource.productIds);
    const categoryId = firstString(sectionSettings.categoryId, sectionSettings.selectedCategoryId, currentSource.categoryId);
    const collectionId = firstString(sectionSettings.collectionId, sectionSettings.selectedCollectionId, currentSource.collectionId);
    return {
        ...(definition?.defaultSettings || {}),
        source: {
            type: sourceType,
            ...(productIds ? { productIds } : {}),
            ...(categoryId ? { categoryId } : {}),
            ...(collectionId ? { collectionId } : {}),
        },
        layout: firstString(sectionSettings.layout, sectionSettings.variant) || definition?.defaultLayout,
        productCardVariant: firstString(sectionSettings.productCardVariant, sectionSettings.cardVariant, sectionSettings.productCardStyle),
        columns: numberIn(sectionSettings.columns, [2, 3, 4, 5]),
        limit: typeof sectionSettings.limit === 'number'
            ? sectionSettings.limit
            : typeof sectionSettings.productsToShow === 'number'
                ? sectionSettings.productsToShow
                : typeof sectionSettings.maxProducts === 'number'
                    ? sectionSettings.maxProducts
                    : definition?.defaultSettings.limit,
        showPrice: booleanValue(sectionSettings.showPrice) ?? definition?.defaultSettings.showPrice,
        showBadges: booleanValue(sectionSettings.showBadges) ?? definition?.defaultSettings.showBadges,
        showRating: booleanValue(sectionSettings.showRating) ?? definition?.defaultSettings.showRating,
        cta: {
            ...definition?.defaultSettings.cta,
            label: firstString(sectionSettings.ctaLabel, sectionSettings.buttonText) || definition?.defaultSettings.cta?.label,
            route: firstString(sectionSettings.ctaUrl, sectionSettings.buttonLink, sectionSettings.linkUrl) || definition?.defaultSettings.cta?.route,
        },
        styleVariant: firstString(sectionSettings.styleVariant, sectionSettings.variant),
    };
};
const buildEcommerceBlocks = (existing, input, now) => {
    const existingBlocks = Array.isArray(existing?.ecommerceBlocks) ? existing.ecommerceBlocks : [];
    const existingByType = new Map();
    existingBlocks.forEach(block => {
        if (!existingByType.has(block.type))
            existingByType.set(block.type, block);
    });
    return createWebsiteEcommerceBlockSeedsFromSections(input.componentOrder).map((seed, index) => {
        const existingBlock = existingByType.get(seed.type);
        const section = input.componentOrder.find(candidate => getWebsiteEcommerceBlockDefinition(seed.type)?.pageSections.includes(candidate));
        const sectionSettings = section ? getSectionSettings(input.data, section) : {};
        const settings = resolveBlockSettings(seed.type, seed.source, sectionSettings);
        const issues = validateWebsiteEcommerceBlock({
            id: existingBlock?.id || seed.id,
            type: seed.type,
            source: settings.source?.type || seed.source,
            targetRoute: seed.targetRoute,
            settings,
        });
        const blockers = issues.filter(issue => issue.severity === 'error').map(issue => issue.message);
        const warnings = issues.filter(issue => issue.severity === 'warning').map(issue => issue.message);
        const wasTouched = section ? getTouchedSections(input).has(section) : false;
        return {
            ...createBlueprintModuleState(now, {
                enabled: section ? input.sectionVisibility[section] !== false : true,
                status: blockers.length > 0 ? 'needs_review' : 'configured',
                needsReview: issues.length > 0,
                readiness: ready(warnings, blockers),
                sourceMap: {
                    ...(existingBlock?.sourceMap || {}),
                    section: section || seed.type,
                    settings: section ? `data.${section}` : `websiteBlueprint.ecommerceBlocks.${index}`,
                    canonicalSystem: 'ecommerce-engine',
                    presentationOwner: 'website-builder',
                    lastAction: input.action,
                },
                metadata: {
                    ...(existingBlock?.metadata || {}),
                    generatedBy: existingBlock?.metadata?.generatedBy || (wasTouched ? 'user' : 'ai'),
                    userModified: existingBlock?.metadata?.userModified || wasTouched,
                    ...(wasTouched ? { lockedFromRegeneration: true, lastEditedAt: now } : {}),
                    ...(wasTouched && input.userId ? { lastEditedBy: input.userId } : {}),
                    lastSyncedAt: now,
                },
            }),
            id: existingBlock?.id || seed.id,
            type: seed.type,
            source: settings.source?.type || seed.source,
            targetRoute: existingBlock?.targetRoute || seed.targetRoute,
            settings,
        };
    });
};
export function syncWebsiteBlueprintFromEditor(input) {
    const now = input.now || new Date().toISOString();
    const componentOrder = input.componentOrder.filter(section => !isRetiredDesignSuiteSection(section));
    const sectionVisibility = Object.fromEntries(Object.entries(input.sectionVisibility || {}).filter(([section]) => !isRetiredDesignSuiteSection(section)));
    const pagesInput = input.pages?.map(page => ({
        ...page,
        sections: page.sections?.filter(section => !isRetiredDesignSuiteSection(section)),
    }));
    const sanitizedInput = {
        ...input,
        componentOrder,
        sectionVisibility,
        pages: pagesInput,
    };
    const base = createBaseBlueprint(sanitizedInput, now);
    const existingWebsite = base.websiteBlueprint;
    const pages = normalizePages(sanitizedInput.pages, sanitizedInput.componentOrder);
    const sectionBlueprints = buildSectionBlueprints(existingWebsite, sanitizedInput, pages, now);
    const ecommerceBlocks = buildEcommerceBlocks(existingWebsite, sanitizedInput, now);
    const hasManualEdit = sanitizedInput.action !== 'save_project';
    return {
        ...base,
        projectId: base.projectId || sanitizedInput.projectId,
        updatedAt: now,
        lastSyncedAt: now,
        sourceMap: {
            ...(base.sourceMap || {}),
            websiteBlueprint: 'Website Editor Controls',
        },
        metadata: {
            ...base.metadata,
            lastSyncedAt: now,
            updatedAt: now,
            ...(hasManualEdit ? {
                generatedBy: base.metadata.generatedBy || 'user',
                userModified: true,
                lastEditedAt: now,
                ...(sanitizedInput.userId ? { lastEditedBy: sanitizedInput.userId } : {}),
            } : {}),
        },
        websiteBlueprint: {
            ...existingWebsite,
            enabled: true,
            status: hasManualEdit ? 'configured' : existingWebsite.status,
            needsReview: false,
            readiness: ready(),
            pages,
            sections: sanitizedInput.componentOrder,
            componentOrder: sanitizedInput.componentOrder,
            sectionVisibility: sanitizedInput.sectionVisibility,
            sectionBlueprints,
            ecommerceBlocks,
            chatbotPlacement: sanitizedInput.componentOrder.includes('chatbot')
                ? existingWebsite.chatbotPlacement === 'inline' ? 'both' : 'floating'
                : existingWebsite.chatbotPlacement || 'none',
            sourceMap: {
                ...(existingWebsite.sourceMap || {}),
                sections: 'componentOrder',
                componentOrder: 'componentOrder',
                sectionVisibility: 'sectionVisibility',
                pages: 'pages',
                ecommerceBlocks: 'websiteEcommerceBlocks.registry',
                lastAction: input.action,
            },
            metadata: {
                ...existingWebsite.metadata,
                generatedBy: existingWebsite.metadata.generatedBy || 'user',
                userModified: existingWebsite.metadata.userModified || hasManualEdit,
                lastSyncedAt: now,
                updatedAt: now,
                ...(hasManualEdit ? { lastEditedAt: now } : {}),
                ...(hasManualEdit && input.userId ? { lastEditedBy: input.userId } : {}),
            },
        },
    };
}
//# sourceMappingURL=websiteEditorSync.js.map