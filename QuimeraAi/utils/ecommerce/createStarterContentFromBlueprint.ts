import { supabase } from '../../supabase';
import type {
    BusinessBlueprint,
    EcommerceBlueprint,
    EcommerceStarterContentStatus,
    StorefrontBlueprint,
    StarterProductBlueprint,
} from '../../types/businessBlueprint';
import {
    createAiBlueprintContentKey,
    findStarterContentMatch,
    isAiGeneratedStarterContent,
    isUserModifiedStarterContent,
    slugifyStarterContentName,
    type StarterContentItemType,
    type StarterContentRecord,
} from './starterContentIdempotency';

type JsonRecord = Record<string, unknown>;

export interface CreateStarterContentOptions {
    dryRun?: boolean;
    overwriteExisting?: boolean;
    createProducts?: boolean;
    createCategories?: boolean;
    createGiftCards?: boolean;
    maxProducts?: number;
}

export interface CreateStarterContentInput {
    projectId: string;
    storeId: string;
    userId: string;
    businessBlueprint: BusinessBlueprint;
    ecommerceBlueprint: EcommerceBlueprint;
    storefrontBlueprint?: StorefrontBlueprint;
    options?: CreateStarterContentOptions;
    repository?: StarterContentRepository;
    now?: string;
}

export interface StarterContentRepository {
    listCategories(projectId: string, storeId: string): Promise<StarterContentRecord[]>;
    listProducts(projectId: string, storeId: string): Promise<StarterContentRecord[]>;
    insertCategories(rows: StarterCategoryInsertRow[]): Promise<StarterContentRecord[]>;
    insertProducts(rows: StarterProductInsertRow[]): Promise<StarterContentRecord[]>;
}

export interface StarterCategoryInsertRow {
    project_id: string;
    store_id: string;
    name: string;
    slug: string;
    data: JsonRecord;
}

export interface StarterProductInsertRow {
    project_id: string;
    store_id: string;
    category_id?: string | null;
    name: string;
    slug: string;
    description: string;
    short_description?: string;
    price?: number;
    currency?: string;
    quantity: number;
    inventory_quantity: number;
    track_inventory: boolean;
    images: unknown[];
    tags: string[];
    has_variants: boolean;
    variants: unknown[];
    options: unknown[];
    status: 'draft';
    is_digital: boolean;
    is_featured: boolean;
    data: JsonRecord;
}

export interface StarterContentSkippedItem {
    type: StarterContentItemType;
    name: string;
    slug: string;
    reason: 'already_exists' | 'already_generated' | 'blueprint_duplicate' | 'user_modified' | 'disabled_by_options';
    existingId?: string;
}

export interface StarterContentPreviewCategory {
    type: 'category';
    name: string;
    slug: string;
    position: number;
    wouldCreate: boolean;
    existingId?: string;
    metadata: JsonRecord;
}

export interface StarterContentPreviewProduct {
    type: 'product' | 'gift-card';
    name: string;
    slug: string;
    categoryName?: string;
    categorySlug?: string;
    categoryId?: string;
    description: string;
    status: 'draft';
    price?: number;
    priceDisplay: string;
    trackInventory: boolean;
    inventoryQuantity: number;
    wouldCreate: boolean;
    existingId?: string;
    metadata: JsonRecord;
    payload: StarterProductInsertRow;
}

export interface StarterContentDryRunPreview {
    categories: StarterContentPreviewCategory[];
    products: StarterContentPreviewProduct[];
    giftCards: StarterContentPreviewProduct[];
    missingSettings: string[];
    readinessBlockers: string[];
    warnings: string[];
}

export interface StarterContentSummary {
    dryRun: boolean;
    categoriesPlanned: number;
    productsPlanned: number;
    giftCardsPlanned: number;
    categoriesCreated: number;
    productsCreated: number;
    giftCardsCreated: number;
    skipped: number;
    needsReview: true;
    notPublished: true;
}

export interface StarterContentResult {
    createdCategoryIds: string[];
    createdProductIds: string[];
    createdGiftCardIds: string[];
    skippedItems: StarterContentSkippedItem[];
    warnings: string[];
    errors: string[];
    summary: StarterContentSummary;
    dryRunPreview: StarterContentDryRunPreview;
}

interface PlannedCategory {
    preview: StarterContentPreviewCategory;
    row: StarterCategoryInsertRow;
}

interface PlannedProduct {
    preview: StarterContentPreviewProduct;
    row: StarterProductInsertRow;
}

interface ResolvedOptions {
    dryRun: boolean;
    overwriteExisting: boolean;
    createProducts: boolean;
    createCategories: boolean;
    createGiftCards: boolean;
    maxProducts: number;
}

const DEFAULT_OPTIONS: ResolvedOptions = {
    dryRun: false,
    overwriteExisting: false,
    createProducts: true,
    createCategories: true,
    createGiftCards: true,
    maxProducts: 8,
};

const DEFAULT_PRICE_DISPLAY = 'Consultar precio';

const uniqueValues = (values: Array<string | undefined | null>): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const normalized = value?.trim();
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(normalized);
    }

    return result;
};

const ensureResultShape = (
    dryRun: boolean,
    skippedItems: StarterContentSkippedItem[] = [],
    warnings: string[] = [],
    errors: string[] = [],
    preview?: Partial<StarterContentDryRunPreview>,
    createdCategoryIds: string[] = [],
    createdProductIds: string[] = [],
    createdGiftCardIds: string[] = [],
): StarterContentResult => {
    const dryRunPreview: StarterContentDryRunPreview = {
        categories: preview?.categories || [],
        products: preview?.products || [],
        giftCards: preview?.giftCards || [],
        missingSettings: preview?.missingSettings || [],
        readinessBlockers: preview?.readinessBlockers || [],
        warnings: preview?.warnings || warnings,
    };

    return {
        createdCategoryIds,
        createdProductIds,
        createdGiftCardIds,
        skippedItems,
        warnings,
        errors,
        summary: {
            dryRun,
            categoriesPlanned: dryRunPreview.categories.filter(item => item.wouldCreate).length,
            productsPlanned: dryRunPreview.products.filter(item => item.wouldCreate).length,
            giftCardsPlanned: dryRunPreview.giftCards.filter(item => item.wouldCreate).length,
            categoriesCreated: createdCategoryIds.length,
            productsCreated: createdProductIds.length,
            giftCardsCreated: createdGiftCardIds.length,
            skipped: skippedItems.length,
            needsReview: true,
            notPublished: true,
        },
        dryRunPreview,
    };
};

const getErrorMessage = (error: unknown): string => {
    if (!error) return 'Unknown starter content error';
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message || 'Unknown starter content error');
    }
    return String(error);
};

const getBlueprintVersion = (businessBlueprint: BusinessBlueprint): string =>
    businessBlueprint.blueprintVersion || 'unknown-version';

const buildBaseMetadata = (
    input: CreateStarterContentInput,
    itemType: StarterContentItemType,
    name: string,
    slug: string,
    blueprintPath: string,
    now: string,
): JsonRecord => ({
    generatedBy: 'ai',
    generatedByAI: true,
    needsReview: true,
    source: 'ai-studio',
    sourceModule: 'ai-studio-c2',
    aiBlueprintContentKey: createAiBlueprintContentKey({
        projectId: input.projectId,
        storeId: input.storeId,
        blueprintVersion: getBlueprintVersion(input.businessBlueprint),
        itemType,
        name,
        slug,
    }),
    blueprintPath,
    createdFromBlueprintVersion: getBlueprintVersion(input.businessBlueprint),
    createdFromProjectId: input.projectId,
    createdFromStoreId: input.storeId,
    createdByUserId: input.userId,
    userModified: false,
    lockedFromRegeneration: false,
    safeToEdit: true,
    notPublished: true,
    createdAt: now,
    updatedAt: now,
});

const createCategoryDescription = (name: string): string =>
    `Draft category suggested by AI Studio for ${name}. Review before publishing products.`;

const isGiftCardName = (value: unknown): boolean =>
    typeof value === 'string' && /gift\s*cards?|tarjetas?\s*de\s*regalo/i.test(value);

const isDigitalProduct = (product: StarterProductBlueprint, ecommerceBlueprint: EcommerceBlueprint): boolean => {
    if (ecommerceBlueprint.digitalProductsEnabled && /guide|digital|download|course|template|consultation|resource/i.test(`${product.name} ${product.category || ''}`)) {
        return true;
    }

    return /guide|digital|download|course|template|resource/i.test(`${product.name} ${product.category || ''}`);
};

const giftCardsApply = (ecommerceBlueprint: EcommerceBlueprint): boolean => {
    if (!ecommerceBlueprint.giftCardsEnabled && ecommerceBlueprint.giftCards?.enabled !== true) return false;

    const extraSignals = (ecommerceBlueprint as EcommerceBlueprint & { industrySignals?: string[] }).industrySignals || [];
    const storeType = String(ecommerceBlueprint.storeType || '').toLowerCase();
    const text = [
        storeType,
        ecommerceBlueprint.catalogStrategy,
        ...extraSignals,
        ...(ecommerceBlueprint.productCategories || []),
        ...ecommerceBlueprint.categories,
        ...ecommerceBlueprint.starterProducts.flatMap(product => [product.name, product.category]),
    ].filter(Boolean).join(' ').toLowerCase();

    const explicitGiftCard = isGiftCardName(text);
    if (/real[_\s-]?estate/.test(storeType) && !explicitGiftCard) return false;

    return explicitGiftCard ||
        /restaurant|service|wellness|retail|experience|event|fitness|fashion|beauty|luxury|commerce|marketplace/.test(text);
};

const hasSuggestedPrice = (product: StarterProductBlueprint): product is StarterProductBlueprint & { suggestedPrice: number } =>
    typeof product.suggestedPrice === 'number' &&
    Number.isFinite(product.suggestedPrice) &&
    product.suggestedPrice > 0;

const buildReadinessMetadata = (isGiftCard: boolean): JsonRecord => ({
    needsMerchantReview: true,
    productsDrafted: false,
    paymentsConfigured: false,
    inventoryConfigured: false,
    storefrontPublished: false,
    giftCardPaymentBlocked: isGiftCard,
});

const getMissingSettings = (ecommerceBlueprint: EcommerceBlueprint): string[] => {
    const missing: string[] = [];

    if (ecommerceBlueprint.paymentMode !== 'live') missing.push('payments');
    if (ecommerceBlueprint.taxMode !== 'automatic' && ecommerceBlueprint.taxMode !== 'manual') missing.push('taxes');
    if (ecommerceBlueprint.shippingMode !== 'automatic' && ecommerceBlueprint.shippingMode !== 'manual') missing.push('shipping');
    if (ecommerceBlueprint.inventoryMode === 'not_configured') missing.push('inventory');

    return missing;
};

const getReadinessBlockers = (ecommerceBlueprint: EcommerceBlueprint): string[] => {
    const blockers = [
        'Draft products require merchant review before publishing.',
        'Storefront publishing remains disabled for AI starter content.',
    ];

    if (ecommerceBlueprint.paymentMode !== 'live') blockers.push('Payments are not configured for live checkout.');
    if (ecommerceBlueprint.inventoryMode === 'not_configured') blockers.push('Inventory has not been configured by the merchant.');

    return blockers;
};

const getWarnings = (ecommerceBlueprint: EcommerceBlueprint, dryRun: boolean): string[] => {
    const warnings = [
        'AI starter content is created as draft only and needs merchant review.',
        'No payment, tax, shipping, discount, inventory decrement, email, lead event, or storefront publish action is performed.',
    ];

    if (dryRun) warnings.unshift('Dry run only: no database writes will be performed.');
    if ((ecommerceBlueprint.discounts || []).length > 0) warnings.push('Blueprint discounts remain suggestions only; no active discounts are created.');

    return warnings;
};

const createDefaultRepository = (): StarterContentRepository => ({
    async listCategories(projectId: string) {
        const { data, error } = await supabase
            .from('store_categories')
            .select('id,name,slug,data')
            .eq('project_id', projectId);

        if (error) throw error;
        return (data || []) as StarterContentRecord[];
    },
    async listProducts(projectId: string) {
        const { data, error } = await supabase
            .from('store_products')
            .select('id,name,slug,data')
            .eq('project_id', projectId);

        if (error) throw error;
        return (data || []) as StarterContentRecord[];
    },
    async insertCategories(rows: StarterCategoryInsertRow[]) {
        if (rows.length === 0) return [];

        const { data, error } = await supabase
            .from('store_categories')
            .insert(rows)
            .select('id,name,slug,data');

        if (error) throw error;
        return (data || []) as StarterContentRecord[];
    },
    async insertProducts(rows: StarterProductInsertRow[]) {
        if (rows.length === 0) return [];

        const { data, error } = await supabase
            .from('store_products')
            .insert(rows)
            .select('id,name,slug,data');

        if (error) throw error;
        return (data || []) as StarterContentRecord[];
    },
});

const planCategories = (
    input: CreateStarterContentInput,
    options: ResolvedOptions,
    existingCategories: StarterContentRecord[],
    skippedItems: StarterContentSkippedItem[],
    now: string,
): { planned: PlannedCategory[]; categoryIdBySlug: Map<string, string> } => {
    const categoryIdBySlug = new Map<string, string>();
    for (const category of existingCategories) {
        categoryIdBySlug.set(slugifyStarterContentName(category.slug || category.name), category.id);
    }

    if (!options.createCategories) {
        for (const name of uniqueValues([
            ...(input.ecommerceBlueprint.productCategories || []),
            ...input.ecommerceBlueprint.starterProducts.map(product => product.category),
        ])) {
            skippedItems.push({
                type: 'category',
                name,
                slug: slugifyStarterContentName(name, 'category'),
                reason: 'disabled_by_options',
            });
        }
        return { planned: [], categoryIdBySlug };
    }

    const categoryNames = uniqueValues([
        ...(input.ecommerceBlueprint.productCategories || input.ecommerceBlueprint.categories || []),
        ...input.ecommerceBlueprint.starterProducts.map(product => product.category),
        ...(giftCardsApply(input.ecommerceBlueprint) ? ['Gift Cards'] : []),
    ]);
    const planned: PlannedCategory[] = [];
    const plannedSlugs = new Set<string>();

    categoryNames.forEach((name, index) => {
        const slug = slugifyStarterContentName(name, `category-${index + 1}`);
        const metadata = buildBaseMetadata(input, 'category', name, slug, `ecommerceBlueprint.productCategories[${index}]`, now);
        const key = String(metadata.aiBlueprintContentKey);
        const existing = findStarterContentMatch(existingCategories, { key, name, slug });

        if (existing) {
            categoryIdBySlug.set(slug, existing.id);
            skippedItems.push({
                type: 'category',
                name,
                slug,
                reason: isUserModifiedStarterContent(existing)
                    ? 'user_modified'
                    : isAiGeneratedStarterContent(existing)
                        ? 'already_generated'
                        : 'already_exists',
                existingId: existing.id,
            });
            return;
        }

        if (plannedSlugs.has(slug)) {
            skippedItems.push({
                type: 'category',
                name,
                slug,
                reason: 'blueprint_duplicate',
            });
            return;
        }

        plannedSlugs.add(slug);

        const data: JsonRecord = {
            ...metadata,
            name,
            slug,
            description: createCategoryDescription(name),
            position: index,
        };

        planned.push({
            preview: {
                type: 'category',
                name,
                slug,
                position: index,
                wouldCreate: true,
                metadata: data,
            },
            row: {
                project_id: input.projectId,
                store_id: input.storeId,
                name,
                slug,
                data,
            },
        });
    });

    return { planned, categoryIdBySlug };
};

const makeProductPayload = (
    input: CreateStarterContentInput,
    product: StarterProductBlueprint,
    index: number,
    now: string,
    categoryIdBySlug: Map<string, string>,
    itemType: 'product' | 'gift-card',
): StarterProductInsertRow => {
    const name = product.name.trim() || `Draft product ${index + 1}`;
    const slug = slugifyStarterContentName(name, `draft-product-${index + 1}`);
    const categoryName = product.category?.trim();
    const categorySlug = categoryName ? slugifyStarterContentName(categoryName, 'category') : undefined;
    const isGiftCard = itemType === 'gift-card';
    const metadata = buildBaseMetadata(input, itemType, name, slug, `ecommerceBlueprint.starterProducts[${index}]`, now);
    const priceSuggested = hasSuggestedPrice(product);
    const data: JsonRecord = {
        ...metadata,
        name,
        slug,
        categoryName,
        categorySlug,
        description: product.description || `Draft product generated from the AI Studio business brief. Review before publishing.`,
        generatedProductStatus: 'draft',
        sourceProductStatus: product.status,
        suggestedReason: product.description || 'Suggested by AI Studio from the ecommerce blueprint.',
        priceSource: product.priceSource || 'unset',
        priceSuggested,
        priceDisplay: priceSuggested ? undefined : DEFAULT_PRICE_DISPLAY,
        stockSource: product.stockSource || 'unset',
        inventoryMode: 'unset',
        inventoryQuantity: 0,
        trackInventory: false,
        imagePlaceholder: {
            enabled: true,
            source: 'ai-studio',
            label: categoryName || name,
        },
        readiness: buildReadinessMetadata(isGiftCard),
        userModified: false,
        lockedFromRegeneration: false,
        discountStatus: 'none',
        isGiftCardDraft: isGiftCard,
        paymentActivationRequired: isGiftCard,
    };

    const payload: StarterProductInsertRow = {
        project_id: input.projectId,
        store_id: input.storeId,
        category_id: categorySlug ? categoryIdBySlug.get(categorySlug) || null : null,
        name,
        slug,
        description: String(data.description),
        short_description: product.description || 'AI Studio draft. Review before publishing.',
        currency: 'USD',
        quantity: 0,
        inventory_quantity: 0,
        track_inventory: false,
        images: [],
        tags: ['ai-studio', 'draft', ...(categoryName ? [categorySlug || categoryName] : [])],
        has_variants: false,
        variants: [],
        options: [],
        status: 'draft',
        is_digital: isDigitalProduct(product, input.ecommerceBlueprint),
        is_featured: false,
        data,
    };

    if (priceSuggested) {
        payload.price = product.suggestedPrice;
        data.suggestedPrice = product.suggestedPrice;
    }

    return payload;
};

const planProducts = (
    input: CreateStarterContentInput,
    options: ResolvedOptions,
    existingProducts: StarterContentRecord[],
    categoryIdBySlug: Map<string, string>,
    skippedItems: StarterContentSkippedItem[],
    now: string,
): PlannedProduct[] => {
    if (!options.createProducts) {
        input.ecommerceBlueprint.starterProducts.forEach((product, index) => {
            const name = product.name || `Draft product ${index + 1}`;
            skippedItems.push({
                type: isGiftCardName(`${product.name} ${product.category}`) ? 'gift-card' : 'product',
                name,
                slug: slugifyStarterContentName(name, `draft-product-${index + 1}`),
                reason: 'disabled_by_options',
            });
        });
        return [];
    }

    const giftCardsEnabled = giftCardsApply(input.ecommerceBlueprint);
    const rawProducts = input.ecommerceBlueprint.starterProducts
        .slice(0, options.maxProducts)
        .filter(product => product.name?.trim());
    const hasGiftCardProduct = rawProducts.some(product => isGiftCardName(`${product.name} ${product.category}`));
    const starterProducts = [...rawProducts];

    if (giftCardsEnabled && options.createGiftCards && !hasGiftCardProduct && starterProducts.length < options.maxProducts) {
        starterProducts.push({
            name: 'Gift Card Draft',
            category: 'Gift Cards',
            description: 'Draft gift card offer generated by AI Studio. Configure value, terms, and payments before publishing.',
            priceSource: 'unset',
            stockSource: 'unset',
            status: 'draft',
            needsReview: true,
            isPublished: false,
            publishStatus: 'not_published',
            discountStatus: 'none',
        });
    }

    const planned: PlannedProduct[] = [];
    const plannedSlugs = new Set<string>();

    starterProducts.forEach((product, index) => {
        const name = product.name.trim();
        const slug = slugifyStarterContentName(name, `draft-product-${index + 1}`);
        const itemType = isGiftCardName(`${product.name} ${product.category}`) ? 'gift-card' : 'product';

        if (itemType === 'gift-card' && !options.createGiftCards) {
            skippedItems.push({
                type: itemType,
                name,
                slug,
                reason: 'disabled_by_options',
            });
            return;
        }

        const payload = makeProductPayload(input, product, index, now, categoryIdBySlug, itemType);
        const key = String(payload.data.aiBlueprintContentKey);
        const existing = findStarterContentMatch(existingProducts, { key, name, slug });

        if (existing) {
            skippedItems.push({
                type: itemType,
                name,
                slug,
                reason: isUserModifiedStarterContent(existing)
                    ? 'user_modified'
                    : isAiGeneratedStarterContent(existing)
                        ? 'already_generated'
                        : 'already_exists',
                existingId: existing.id,
            });
            return;
        }

        if (plannedSlugs.has(slug)) {
            skippedItems.push({
                type: itemType,
                name,
                slug,
                reason: 'blueprint_duplicate',
            });
            return;
        }

        plannedSlugs.add(slug);

        planned.push({
            preview: {
                type: itemType,
                name,
                slug,
                categoryName: product.category,
                categorySlug: product.category ? slugifyStarterContentName(product.category, 'category') : undefined,
                categoryId: payload.category_id || undefined,
                description: payload.description,
                status: 'draft',
                price: payload.price,
                priceDisplay: payload.price === undefined ? DEFAULT_PRICE_DISPLAY : `$${payload.price.toFixed(2)}`,
                trackInventory: false,
                inventoryQuantity: 0,
                wouldCreate: true,
                metadata: payload.data,
                payload,
            },
            row: payload,
        });
    });

    return planned;
};

const mapInsertedIdsBySlug = (records: StarterContentRecord[]): Map<string, string> => {
    const ids = new Map<string, string>();

    for (const record of records) {
        ids.set(slugifyStarterContentName(record.slug || record.name), record.id);
    }

    return ids;
};

export const createStarterContentFromBlueprint = async (
    input: CreateStarterContentInput,
): Promise<StarterContentResult> => {
    const options: ResolvedOptions = {
        ...DEFAULT_OPTIONS,
        ...input.options,
    };
    const now = input.now || new Date().toISOString();
    const warnings = getWarnings(input.ecommerceBlueprint, options.dryRun);
    const missingSettings = getMissingSettings(input.ecommerceBlueprint);
    const readinessBlockers = getReadinessBlockers(input.ecommerceBlueprint);
    const skippedItems: StarterContentSkippedItem[] = [];

    if (!input.projectId || !input.storeId || !input.userId) {
        return ensureResultShape(options.dryRun, skippedItems, warnings, ['Missing project, store, or user identifier.'], {
            missingSettings,
            readinessBlockers,
            warnings,
        });
    }

    if (!input.ecommerceBlueprint.enabled) {
        warnings.push('Ecommerce blueprint is disabled; no starter content will be created.');
        return ensureResultShape(options.dryRun, skippedItems, warnings, [], {
            missingSettings,
            readinessBlockers,
            warnings,
        });
    }

    const repository = input.repository || createDefaultRepository();

    try {
        const [existingCategories, existingProducts] = await Promise.all([
            repository.listCategories(input.projectId, input.storeId),
            repository.listProducts(input.projectId, input.storeId),
        ]);
        const { planned: plannedCategories, categoryIdBySlug } = planCategories(
            input,
            options,
            existingCategories,
            skippedItems,
            now,
        );
        const plannedProducts = planProducts(
            input,
            options,
            existingProducts,
            categoryIdBySlug,
            skippedItems,
            now,
        );
        const preview: StarterContentDryRunPreview = {
            categories: plannedCategories.map(item => item.preview),
            products: plannedProducts.map(item => item.preview),
            giftCards: plannedProducts.filter(item => item.preview.type === 'gift-card').map(item => item.preview),
            missingSettings,
            readinessBlockers,
            warnings,
        };

        if (options.overwriteExisting) {
            warnings.push('overwriteExisting is intentionally not applied to user-edited content; existing matches remain skipped by default.');
        }

        if (options.dryRun) {
            return ensureResultShape(true, skippedItems, warnings, [], preview);
        }

        const insertedCategories = options.createCategories
            ? await repository.insertCategories(plannedCategories.map(item => item.row))
            : [];
        const insertedCategoryIds = insertedCategories.map(record => record.id);
        const insertedCategoryIdBySlug = mapInsertedIdsBySlug(insertedCategories);

        for (const [slug, id] of insertedCategoryIdBySlug) {
            categoryIdBySlug.set(slug, id);
        }

        const productRows = plannedProducts.map((item) => {
            const categorySlug = item.preview.categorySlug;
            const categoryId = categorySlug ? categoryIdBySlug.get(categorySlug) || null : null;

            return {
                ...item.row,
                category_id: categoryId,
                data: {
                    ...item.row.data,
                    categoryId,
                },
            };
        });
        const insertedProducts = options.createProducts
            ? await repository.insertProducts(productRows)
            : [];
        const insertedProductIds = insertedProducts.map(record => record.id);
        const giftCardSlugs = new Set(plannedProducts
            .filter(item => item.preview.type === 'gift-card')
            .map(item => item.preview.slug));
        const insertedGiftCardIds = insertedProducts
            .filter(record => giftCardSlugs.has(slugifyStarterContentName(record.slug || record.name)))
            .map(record => record.id);

        return ensureResultShape(
            false,
            skippedItems,
            warnings,
            [],
            preview,
            insertedCategoryIds,
            insertedProductIds,
            insertedGiftCardIds,
        );
    } catch (error) {
        return ensureResultShape(options.dryRun, skippedItems, warnings, [getErrorMessage(error)], {
            missingSettings,
            readinessBlockers,
            warnings,
        });
    }
};

export interface BuildStarterContentBusinessBlueprintUpdateInput {
    businessBlueprint: BusinessBlueprint;
    result?: StarterContentResult;
    status: EcommerceStarterContentStatus;
    now?: string;
}

const mergeIds = (existing: string[] | undefined, created: string[] | undefined): string[] =>
    Array.from(new Set([...(existing || []), ...(created || [])].filter(Boolean)));

export const buildStarterContentBusinessBlueprintUpdate = ({
    businessBlueprint,
    result,
    status,
    now = new Date().toISOString(),
}: BuildStarterContentBusinessBlueprintUpdateInput): BusinessBlueprint => {
    const ecommerceBlueprint = businessBlueprint.ecommerceBlueprint;
    const previousRefs = ecommerceBlueprint.createdContentRefs || {
        categoryIds: [],
        productIds: [],
        giftCardIds: [],
    };
    const createdContentRefs = status === 'created_draft'
        ? {
            categoryIds: mergeIds(previousRefs.categoryIds, result?.createdCategoryIds),
            productIds: mergeIds(previousRefs.productIds, result?.createdProductIds),
            giftCardIds: mergeIds(previousRefs.giftCardIds, result?.createdGiftCardIds),
        }
        : previousRefs;
    const productsDrafted = createdContentRefs.productIds.length > 0 || status === 'created_draft';
    const summary = result?.summary;

    return {
        ...businessBlueprint,
        updatedAt: now,
        metadata: {
            ...businessBlueprint.metadata,
            updatedAt: now,
            lastSyncedAt: now,
        },
        ecommerceBlueprint: {
            ...ecommerceBlueprint,
            starterContentStatus: status,
            createdContentRefs,
            starterContentSummary: {
                ...(ecommerceBlueprint.starterContentSummary || {}),
                categoriesSuggested: summary?.categoriesPlanned ?? ecommerceBlueprint.starterContentSummary?.categoriesSuggested ?? 0,
                productsSuggested: summary?.productsPlanned ?? ecommerceBlueprint.starterContentSummary?.productsSuggested ?? 0,
                giftCardsSuggested: summary?.giftCardsPlanned ?? ecommerceBlueprint.starterContentSummary?.giftCardsSuggested ?? 0,
                categoriesCreated: createdContentRefs.categoryIds.length,
                productsCreated: createdContentRefs.productIds.length,
                giftCardsCreated: createdContentRefs.giftCardIds.length,
                skipped: summary?.skipped ?? ecommerceBlueprint.starterContentSummary?.skipped ?? 0,
                lastPreviewedAt: status === 'previewed' ? now : ecommerceBlueprint.starterContentSummary?.lastPreviewedAt,
                lastCreatedAt: status === 'created_draft' ? now : ecommerceBlueprint.starterContentSummary?.lastCreatedAt,
                dismissedAt: status === 'dismissed' ? now : ecommerceBlueprint.starterContentSummary?.dismissedAt,
            },
            starterContentReadiness: {
                productsDrafted,
                needsMerchantReview: true,
                paymentsConfigured: false,
                inventoryConfigured: false,
                storefrontPublished: false,
            },
            metadata: {
                ...ecommerceBlueprint.metadata,
                updatedAt: now,
                lastSyncedAt: now,
            },
        },
    };
};
