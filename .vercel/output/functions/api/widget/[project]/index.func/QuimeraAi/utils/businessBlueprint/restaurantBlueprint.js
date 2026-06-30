const RESTAURANT_PATTERN = /\b(restaurant|restaurante|caf[eé]|cafeteria|food|comida|steakhouse|bakery|panader[ií]a|catering|bar|sushi|pizza|brunch|fine dining|casual dining|food truck|menu|reservas?)\b/i;
function ready(warnings = [], blockers = []) {
    return { isReady: blockers.length === 0, warnings, blockers };
}
function metadata(now) {
    return {
        generatedBy: 'ai',
        generatedByAI: true,
        userModified: false,
        generatedAt: now,
        updatedAt: now,
        generationSource: 'ai-studio-restaurant',
    };
}
function sourceMap(path) {
    return { source: path };
}
function asString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function asNumber(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
        return undefined;
    return value;
}
function uniqueValues(values, limit = 20) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const normalized = value?.trim();
        if (!normalized)
            continue;
        const key = normalized.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(normalized);
        if (result.length >= limit)
            break;
    }
    return result;
}
function slugify(value) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}
function getContextText(context) {
    return [
        context.businessName,
        context.industry,
        context.subIndustry,
        context.description,
        ...(context.services || []).flatMap(service => [service.name, service.description]),
        ...(context.menuItems || []).flatMap(item => {
            if (!item || typeof item !== 'object')
                return [];
            const record = item;
            return [record.name, record.title, record.category, record.description].filter(Boolean).map(String);
        }),
    ].filter(Boolean).join(' ').toLowerCase();
}
export function isRestaurantIndustryText(value) {
    return RESTAURANT_PATTERN.test(value || '');
}
function inferCuisineType(context) {
    const text = getContextText(context);
    if (/\bsteakhouse|steak|asador|parrilla\b/i.test(text))
        return 'Steakhouse';
    if (/\bsushi|japanese|japon[eé]s\b/i.test(text))
        return 'Sushi';
    if (/\bpizza|pizzeria\b/i.test(text))
        return 'Pizza';
    if (/\bbakery|panader[ií]a|pastry|reposter/i.test(text))
        return 'Bakery';
    if (/\bcaf[eé]|coffee|cafeteria\b/i.test(text))
        return 'Cafe';
    if (/\bbar|cocktail|drinks?\b/i.test(text))
        return 'Bar';
    if (/\bbrunch\b/i.test(text))
        return 'Brunch';
    if (/\bcatering\b/i.test(text))
        return 'Catering';
    if (/\bfine dining\b/i.test(text))
        return 'Fine Dining';
    return asString(context.industry) || 'Restaurant';
}
function getContactValue(contactInfo, keys) {
    if (!contactInfo)
        return '';
    for (const key of keys) {
        const value = asString(contactInfo[key]);
        if (value)
            return value;
    }
    return '';
}
function inferCategories(context) {
    const menuCategories = uniqueValues((context.menuItems || []).map(item => {
        if (!item || typeof item !== 'object')
            return undefined;
        const record = item;
        return asString(record.category);
    }), 8);
    if (menuCategories.length > 0)
        return menuCategories;
    const text = getContextText(context);
    if (/\bsteakhouse|steak|asador|parrilla\b/i.test(text))
        return ['Starters', 'Steaks', 'Sides', 'Desserts', 'Wine & Cocktails'];
    if (/\bsushi|japanese|japon[eé]s\b/i.test(text))
        return ['Starters', 'Sushi Rolls', 'Nigiri', 'Bowls', 'Drinks'];
    if (/\bpizza|pizzeria\b/i.test(text))
        return ['Starters', 'Pizzas', 'Pastas', 'Desserts', 'Drinks'];
    if (/\bbakery|panader[ií]a|pastry|reposter/i.test(text))
        return ['Pastries', 'Breads', 'Cakes', 'Coffee', 'Seasonal'];
    if (/\bcaf[eé]|coffee|cafeteria\b/i.test(text))
        return ['Coffee', 'Breakfast', 'Lunch', 'Bakery', 'Drinks'];
    if (/\bbar|cocktail|drinks?\b/i.test(text))
        return ['Small Plates', 'Cocktails', 'Wine', 'Beer', 'Non-Alcoholic'];
    if (/\bcatering\b/i.test(text))
        return ['Catering Packages', 'Platters', 'Desserts', 'Beverages'];
    const serviceCategories = uniqueValues((context.services || []).map(service => service.name), 5);
    return serviceCategories.length > 0 ? serviceCategories : ['Starters', 'Mains', 'Desserts', 'Drinks'];
}
function draftItemName(category, cuisineType, index) {
    if (/steak/i.test(cuisineType) && /steak/i.test(category))
        return 'Signature steak draft';
    if (/sushi/i.test(cuisineType) && /roll|sushi/i.test(category))
        return 'Signature roll draft';
    if (/pizza/i.test(cuisineType) && /pizza/i.test(category))
        return 'Signature pizza draft';
    if (/bakery/i.test(cuisineType) && /pastr|bread|cake/i.test(category))
        return `${category} feature draft`;
    if (/cafe/i.test(cuisineType) && /coffee/i.test(category))
        return 'Signature coffee draft';
    if (/bar/i.test(cuisineType) && /cocktail/i.test(category))
        return 'Signature cocktail draft';
    return `${category} draft ${index + 1}`;
}
function createMenuItemDraft(input) {
    return {
        id: input.id,
        name: input.name,
        description: input.description,
        category: input.category,
        suggestedPrice: input.suggestedPrice,
        currency: input.currency,
        priceSource: input.priceSource,
        ingredients: [],
        allergens: [],
        dietaryTags: [],
        imagePrompt: `${input.name}, ${input.category}, restaurant menu photography, review-safe draft`,
        isFeatured: input.index < 3,
        availabilityStatus: 'draft',
        needsReview: true,
        generatedByAI: true,
        userModified: false,
    };
}
function inferMenuItems(context, categories, currency) {
    const mappedItems = (context.menuItems || [])
        .map((item, index) => {
        if (!item || typeof item !== 'object')
            return null;
        const record = item;
        const name = asString(record.name) || asString(record.title);
        if (!name)
            return null;
        const category = asString(record.category) || categories[index % Math.max(categories.length, 1)] || 'Menu';
        const suggestedPrice = asNumber(record.price);
        return createMenuItemDraft({
            id: `menu-item-${slugify(name) || index + 1}`,
            name,
            description: asString(record.description) || 'Draft menu item imported from the website plan. Review before publishing.',
            category,
            suggestedPrice,
            currency,
            priceSource: suggestedPrice !== undefined ? 'user-provided' : 'unset',
            index,
        });
    })
        .filter((item) => Boolean(item));
    if (mappedItems.length > 0)
        return mappedItems.slice(0, 24);
    const cuisineType = inferCuisineType(context);
    return categories.slice(0, 6).map((category, index) => createMenuItemDraft({
        id: `menu-item-${slugify(category)}-${index + 1}`,
        name: draftItemName(category, cuisineType, index),
        description: `AI-generated ${category.toLowerCase()} item draft for a ${cuisineType.toLowerCase()} concept. Review name, ingredients, allergens, availability, and price before publishing.`,
        category,
        currency,
        priceSource: 'unset',
        index,
    }));
}
function defaultOffer(enabled, status = enabled ? 'draft' : 'disabled') {
    return {
        enabled,
        status,
        needsReview: enabled,
    };
}
function createEcommerceOffers(context) {
    const text = getContextText(context);
    const has = (pattern) => pattern.test(text);
    const defaultEnabled = RESTAURANT_PATTERN.test(text);
    return {
        giftCards: defaultOffer(defaultEnabled || has(/\bgift card|tarjeta de regalo\b/i)),
        cateringPackages: defaultOffer(has(/\bcatering|private event|evento|package|paquete\b/i)),
        eventTickets: defaultOffer(has(/\bevent ticket|events?|evento|brunch|tasting\b/i)),
        reservationDeposits: defaultOffer(has(/\bdeposit|dep[oó]sito|reservation deposit\b/i)),
        mealKits: defaultOffer(has(/\bmeal kit|take home|para llevar|kit\b/i)),
        merch: defaultOffer(has(/\bmerch|merchandise|shirt|camisa\b/i)),
    };
}
function legacyOffersFrom(offers) {
    return Object.entries(offers)
        .filter(([, value]) => value.enabled && value.status !== 'disabled')
        .map(([key]) => key);
}
function mergeOffer(base, existing) {
    return {
        ...base,
        ...existing,
        needsReview: (existing?.enabled ?? base.enabled) ? existing?.needsReview ?? true : false,
    };
}
function normalizeOffers(value, fallback) {
    if (!value || Array.isArray(value) || typeof value !== 'object')
        return fallback;
    const record = value;
    return {
        giftCards: mergeOffer(fallback.giftCards, record.giftCards),
        cateringPackages: mergeOffer(fallback.cateringPackages, record.cateringPackages),
        eventTickets: mergeOffer(fallback.eventTickets, record.eventTickets),
        reservationDeposits: mergeOffer(fallback.reservationDeposits, record.reservationDeposits),
        mealKits: mergeOffer(fallback.mealKits, record.mealKits),
        merch: mergeOffer(fallback.merch, record.merch),
    };
}
function buildProfile(context, enabled) {
    const contactInfo = context.contactInfo || {};
    const name = asString(context.businessName) || 'Restaurant draft';
    const address = getContactValue(contactInfo, ['address', 'location', 'streetAddress']);
    const phone = getContactValue(contactInfo, ['phone', 'telephone']);
    const email = getContactValue(contactInfo, ['email']);
    const hours = getContactValue(contactInfo, ['hours', 'businessHours']);
    const blockers = enabled
        ? [
            !address ? 'Restaurant address needs merchant review.' : '',
            !phone ? 'Restaurant phone needs merchant review.' : '',
            !hours ? 'Restaurant hours need merchant review.' : '',
        ].filter(Boolean)
        : [];
    return {
        name,
        cuisineType: inferCuisineType(context),
        address,
        phone,
        email: email || undefined,
        hours,
        logoUrl: getContactValue(contactInfo, ['logoUrl']) || undefined,
        heroImageUrl: getContactValue(contactInfo, ['heroImageUrl']) || undefined,
        publicSlug: slugify(name),
        languagesEnabled: ['en', 'es'],
        currency: getContactValue(contactInfo, ['currency']) || 'USD',
        sourceMap: sourceMap('websitePlan.businessProfile'),
        readiness: ready([], blockers),
    };
}
function buildMenuDraft(context, currency, enabled) {
    const categories = enabled ? inferCategories(context) : [];
    const items = enabled ? inferMenuItems(context, categories, currency) : [];
    return {
        categories,
        items,
        dietaryTags: [],
        allergens: [],
        modifiers: [],
        upsells: [],
        priceSource: items.some(item => item.priceSource === 'user-provided') ? 'user-provided' : 'unset',
        generatedByAI: true,
        userModified: false,
        needsReview: enabled,
        status: enabled ? 'needs_review' : 'draft',
        publishStatus: 'not_published',
    };
}
function buildReservations(enabled, source) {
    return {
        enabled,
        status: enabled ? 'needs_review' : 'disabled',
        maxPartySize: 8,
        minPartySize: 1,
        reservationInterval: 30,
        averageTableDuration: 90,
        tablePreferences: ['indoor', 'outdoor', 'bar', 'private'],
        capacityRules: [],
        depositRequired: false,
        cancellationPolicy: '',
        confirmationMode: 'manual',
        source,
        needsReview: enabled,
        readiness: enabled
            ? ready(['Reservation settings are draft-only until capacity, hours, and confirmation policy are reviewed.'])
            : ready([], ['Restaurant reservations are disabled for this blueprint.']),
    };
}
function buildPublicMenu(enabled) {
    return {
        enabled,
        qrMenuEnabled: enabled,
        routeStrategy: '/menu/:restaurantId',
        qrCodeStatus: enabled ? 'draft' : 'disabled',
        categoryNavigationEnabled: true,
        stickyCtaEnabled: true,
        showCallButton: true,
        showMapButton: true,
        showReserveButton: enabled,
        themePreset: 'food',
        menuVariant: 'categoryMenu',
        mobileBehavior: 'sticky_actions',
    };
}
function buildIntegrations(enabled, offers) {
    return {
        chatbotKnowledgeSources: enabled
            ? ['menu items', 'ingredients', 'allergens', 'dietary tags', 'hours', 'location', 'reservation policy', 'catering offers', 'gift cards']
            : [],
        crmLeadSources: enabled ? ['reservation_created', 'catering_inquiry_created', 'gift_card_interest', 'qr_menu'] : [],
        crmTags: enabled ? ['restaurant', 'reservation', 'high-intent', ...(offers.cateringPackages.enabled ? ['catering'] : []), ...(offers.giftCards.enabled ? ['gift-card'] : [])] : [],
        emailFlows: enabled
            ? ['reservation_received', 'reservation_confirmed', 'reservation_reminder', 'reservation_cancelled', 'post_visit_review_request', 'catering_follow_up']
            : [],
        analyticsEvents: enabled
            ? ['restaurant_menu_viewed', 'qr_menu_viewed', 'dish_clicked', 'category_clicked', 'call_clicked', 'map_clicked', 'reservation_started', 'reservation_created']
            : [],
        financeRevenueSources: legacyOffersFrom(offers),
        automationFlows: enabled ? ['reservation_follow_up', 'review_request', 'catering_follow_up'] : [],
    };
}
export function getRestaurantEcommerceOfferKeys(value) {
    if (!value)
        return [];
    const offers = value.ecommerceOffers;
    if (Array.isArray(offers))
        return offers;
    return uniqueValues([
        ...(value.legacyEcommerceOffers || []),
        ...legacyOffersFrom(offers),
    ]);
}
export function createRestaurantBlueprintFromContext(context = {}) {
    const now = context.now || new Date().toISOString();
    const enabled = context.enabled ?? RESTAURANT_PATTERN.test(getContextText(context));
    const profile = buildProfile(context, enabled);
    const menuDraft = buildMenuDraft(context, profile.currency, enabled);
    const reservations = buildReservations(enabled, context.source || 'ai-studio');
    const publicMenu = buildPublicMenu(enabled);
    const ecommerceOffers = createEcommerceOffers(context);
    const integrations = buildIntegrations(enabled, ecommerceOffers);
    const warnings = enabled
        ? [
            'AI-generated restaurant profile, menu, reservations, ecommerce offers, and automations require merchant review.',
            'Suggested menu item names and any AI prices must not be published before review.',
        ]
        : [];
    return {
        enabled,
        status: enabled ? 'needs_review' : 'disabled',
        needsReview: enabled,
        readiness: ready(warnings, profile.readiness.blockers),
        metadata: metadata(now),
        sourceMap: {
            profile: 'restaurantBlueprint.profile',
            menuDraft: 'restaurantBlueprint.menuDraft',
            reservations: 'restaurantBlueprint.reservations',
            publicMenu: 'restaurantBlueprint.publicMenu',
            ecommerceOffers: 'restaurantBlueprint.ecommerceOffers',
            integrations: 'restaurantBlueprint.integrations',
        },
        profile,
        menuDraft,
        reservations,
        publicMenu,
        ecommerceOffers,
        integrations,
        menuSignals: uniqueValues([
            ...menuDraft.categories,
            ...menuDraft.items.map(item => item.name),
        ], 20),
        reservationRules: enabled ? ['manual confirmation', 'party size', 'business hours', 'reservation interval'] : [],
        legacyEcommerceOffers: legacyOffersFrom(ecommerceOffers),
    };
}
export function createRestaurantBlueprintFromWebsitePlan(plan, now) {
    return createRestaurantBlueprintFromContext({
        businessName: plan.businessProfile.businessName,
        industry: plan.businessProfile.industry,
        description: plan.businessProfile.description,
        services: plan.businessProfile.services,
        contactInfo: plan.businessProfile.contactInfo,
        menuItems: plan.contentMap.menuItems,
        now,
        source: plan.source === 'imported-url' ? 'imported' : 'ai-studio',
    });
}
export function normalizeRestaurantBlueprint(value, context = {}) {
    const fallback = createRestaurantBlueprintFromContext(context);
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return fallback;
    const record = value;
    const ecommerceOffers = normalizeOffers(record.ecommerceOffers, fallback.ecommerceOffers);
    const legacyEcommerceOffers = uniqueValues([
        ...(Array.isArray(record.ecommerceOffers) ? record.ecommerceOffers : []),
        ...(record.legacyEcommerceOffers || []),
        ...legacyOffersFrom(ecommerceOffers),
    ]);
    return {
        ...fallback,
        ...record,
        readiness: record.readiness || fallback.readiness,
        metadata: { ...fallback.metadata, ...(record.metadata || {}) },
        sourceMap: { ...(fallback.sourceMap || {}), ...(record.sourceMap || {}) },
        profile: { ...fallback.profile, ...(record.profile || {}) },
        menuDraft: { ...fallback.menuDraft, ...(record.menuDraft || {}) },
        reservations: { ...fallback.reservations, ...(record.reservations || {}) },
        publicMenu: { ...fallback.publicMenu, ...(record.publicMenu || {}) },
        ecommerceOffers,
        integrations: { ...fallback.integrations, ...(record.integrations || {}) },
        menuSignals: record.menuSignals || fallback.menuSignals,
        reservationRules: record.reservationRules || fallback.reservationRules,
        legacyEcommerceOffers,
    };
}
//# sourceMappingURL=restaurantBlueprint.js.map