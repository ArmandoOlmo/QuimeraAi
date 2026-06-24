import type {
    BusinessBlueprint,
    CrossModuleSyncDraft,
    CrossModuleSyncModule,
    CrossModuleSyncModuleState,
    EcommerceBlueprint,
    EcommerceStarterContentRefs,
    StorefrontBlueprint,
} from '../../types/businessBlueprint';
import {
    createCrossModuleSyncKey,
    findCrossModuleDraftMatch,
    isAiGeneratedCrossModuleDraft,
    isUserModifiedCrossModuleDraft,
} from './crossModuleSyncIdempotency';
import { getRestaurantEcommerceOfferKeys } from './restaurantBlueprint';

export interface CrossModuleSyncInput {
    projectId: string;
    userId: string;
    storeId: string;
    businessBlueprint: BusinessBlueprint;
    ecommerceBlueprint?: EcommerceBlueprint;
    storefrontBlueprint?: StorefrontBlueprint;
    createdContentRefs?: EcommerceStarterContentRefs;
    now?: string;
    options?: {
        dryRun?: boolean;
        syncChatbot?: boolean;
        syncLeads?: boolean;
        syncEmailMarketing?: boolean;
        syncAnalytics?: boolean;
        overwriteExisting?: boolean;
    };
}

export interface CrossModuleSyncSkippedItem {
    module: CrossModuleSyncModule;
    itemType: string;
    name: string;
    syncKey: string;
    reason: 'already_generated' | 'user_modified' | 'existing_name' | 'disabled';
    existingId?: string;
}

export interface CrossModuleSyncSummary {
    dryRun: boolean;
    planned: number;
    created: number;
    updated: number;
    skipped: number;
    chatbotDrafts: number;
    leadDrafts: number;
    emailDrafts: number;
    analyticsDrafts: number;
    needsMerchantReview: true;
    noRuntimeActivated: true;
}

export interface CrossModuleSyncResult {
    chatbotDrafts: CrossModuleSyncDraft[];
    leadDrafts: CrossModuleSyncDraft[];
    emailDrafts: CrossModuleSyncDraft[];
    analyticsDrafts: CrossModuleSyncDraft[];
    skippedItems: CrossModuleSyncSkippedItem[];
    warnings: string[];
    errors: string[];
    summary: CrossModuleSyncSummary;
    syncRefs: {
        chatbot: string[];
        leads: string[];
        emailMarketing: string[];
        analytics: string[];
    };
    businessBlueprint: BusinessBlueprint;
}

type DraftDetails = Partial<Omit<CrossModuleSyncDraft,
    'id' |
    'syncKey' |
    'module' |
    'itemType' |
    'name' |
    'status' |
    'enabled' |
    'active' |
    'needsReview' |
    'generatedByAI' |
    'userModified' |
    'safeToEdit' |
    'source' |
    'createdAt' |
    'updatedAt'
>>;

type ModulePlan = {
    module: CrossModuleSyncModule;
    accepted: CrossModuleSyncDraft[];
    skipped: CrossModuleSyncSkippedItem[];
    nextState: CrossModuleSyncModuleState;
};

const SAFE_WRITER_WARNINGS = [
    'Chatbot knowledge drafts are stored in businessBlueprint.crossModuleSync until a draft-safe chatbot writer is available.',
    'CRM lead tags, sources, and events are stored in businessBlueprint.crossModuleSync; no lead records are created.',
    'Email marketing flow drafts are stored in businessBlueprint.crossModuleSync; no campaigns, schedules, or sends are activated.',
    'Analytics event definitions are stored in businessBlueprint.crossModuleSync; no runtime tracking is instrumented.',
];

const LEAD_TAGS = [
    'ecommerce',
    'product-interest',
    'abandoned-cart',
    'checkout-started',
    'buyer',
    'repeat-customer',
    'high-intent',
];

const LEAD_SOURCES = [
    'Storefront',
    'Product Inquiry',
    'Checkout',
    'Chatbot Product Question',
    'Gift Card',
    'Newsletter',
    'AI Storefront',
];

const LEAD_EVENT_DEFINITIONS = [
    'product_view',
    'add_to_cart',
    'checkout_started',
    'abandoned_cart',
    'purchase_completed',
    'product_inquiry',
    'back_in_stock_request',
];

const ANALYTICS_EVENTS = [
    'product_view',
    'collection_view',
    'add_to_cart',
    'remove_from_cart',
    'checkout_started',
    'checkout_failed',
    'purchase_completed',
    'email_signup',
    'chatbot_product_question',
    'product_inquiry',
];

function uniqueValues(values: Array<string | undefined | null>, limit = 60): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const normalized = value?.trim();
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(normalized);
        if (result.length >= limit) break;
    }

    return result;
}

function includesAny(values: string[], patterns: RegExp[]): boolean {
    const text = values.join(' ').toLowerCase();
    return patterns.some(pattern => pattern.test(text));
}

function hasGiftCards(ecommerceBlueprint: EcommerceBlueprint): boolean {
    return ecommerceBlueprint.giftCardsEnabled === true || ecommerceBlueprint.giftCards?.enabled === true;
}

function hasRestaurantContext(blueprint: BusinessBlueprint, ecommerceBlueprint: EcommerceBlueprint): boolean {
    return includesAny([
        blueprint.businessProfile.industry,
        blueprint.businessProfile.description,
        ...(ecommerceBlueprint.categories || []),
        ...(ecommerceBlueprint.productCategories || []),
        ...(blueprint.restaurantBlueprint?.menuSignals || []),
        ...getRestaurantEcommerceOfferKeys(blueprint.restaurantBlueprint),
    ], [/restaurant|restaurante|cafe|menu|catering|reservation|reserv/i]);
}

function hasRealEstateContext(blueprint: BusinessBlueprint, ecommerceBlueprint: EcommerceBlueprint): boolean {
    return includesAny([
        blueprint.businessProfile.industry,
        blueprint.businessProfile.description,
        ecommerceBlueprint.storeType,
        ecommerceBlueprint.catalogStrategy,
        ...(ecommerceBlueprint.categories || []),
        ...(ecommerceBlueprint.productCategories || []),
        ...(blueprint.realEstateBlueprint?.leadTypes || []),
        ...(blueprint.realEstateBlueprint?.digitalProducts || []),
    ], [/real estate|realtor|inmobili|propiedad|buyer|seller|consultation|guide/i]);
}

function hasServicesContext(blueprint: BusinessBlueprint, ecommerceBlueprint: EcommerceBlueprint): boolean {
    return includesAny([
        blueprint.businessProfile.industry,
        blueprint.businessProfile.description,
        ecommerceBlueprint.storeType,
        ecommerceBlueprint.catalogStrategy,
        ...blueprint.businessProfile.services.flatMap(service => [service.name, service.description]),
        ...(blueprint.appointmentsBlueprint?.serviceTypes || []),
        ...(blueprint.appointmentsBlueprint?.paidBookingTypes || []),
    ], [/service|servicio|appointment|cita|consultation|consulta|booking|package|deposit/i]);
}

function createDraft(
    input: CrossModuleSyncInput,
    module: CrossModuleSyncModule,
    itemType: string,
    name: string,
    details: DraftDetails,
): CrossModuleSyncDraft {
    const now = input.now || new Date().toISOString();
    const syncKey = createCrossModuleSyncKey({
        projectId: input.projectId,
        module,
        itemType,
        name,
        blueprintVersion: input.businessBlueprint.blueprintVersion,
    });

    return {
        id: syncKey,
        syncKey,
        module,
        itemType,
        name,
        status: 'draft',
        enabled: false,
        active: false,
        needsReview: true,
        generatedByAI: true,
        userModified: false,
        safeToEdit: true,
        source: 'ai-studio-c3',
        createdAt: now,
        updatedAt: now,
        ...details,
        metadata: {
            projectId: input.projectId,
            userId: input.userId,
            storeId: input.storeId,
            blueprintVersion: input.businessBlueprint.blueprintVersion,
            createdContentRefs: input.createdContentRefs || input.businessBlueprint.ecommerceBlueprint.createdContentRefs,
            generatedByAI: true,
            userModified: false,
            safeWriter: 'businessBlueprint.crossModuleSync',
            generationSource: 'ai-studio-c3',
            ...(details.metadata || {}),
        },
    };
}

function createChatbotDrafts(input: CrossModuleSyncInput): CrossModuleSyncDraft[] {
    const blueprint = input.businessBlueprint;
    const ecommerceBlueprint = input.ecommerceBlueprint || blueprint.ecommerceBlueprint;
    const categories = uniqueValues([
        ...(ecommerceBlueprint.productCategories || ecommerceBlueprint.categories || []),
        ...ecommerceBlueprint.starterProducts.map(product => product.category),
    ]);
    const products = uniqueValues(ecommerceBlueprint.starterProducts.map(product => product.name), 24);
    const drafts: CrossModuleSyncDraft[] = [];

    drafts.push(createDraft(input, 'chatbot', 'knowledge_source', 'Business profile ecommerce context', {
        description: 'Draft source for business profile, offer, audience, and reviewed store context.',
        content: [
            blueprint.businessProfile.businessName,
            blueprint.businessProfile.industry,
            blueprint.businessProfile.description,
            ...blueprint.businessProfile.services.map(service => `${service.name}: ${service.description}`),
        ].filter(Boolean).join('\n'),
        readinessBlockers: ['Merchant must review business claims before chatbot runtime uses this source.'],
    }));

    if (categories.length > 0) {
        drafts.push(createDraft(input, 'chatbot', 'knowledge_source', 'Product categories FAQ draft', {
            description: 'Draft chatbot FAQ source for storefront categories.',
            content: categories.map(category => `Category draft: ${category}`).join('\n'),
            readinessBlockers: ['Product categories must be reviewed before public chatbot answers.'],
        }));
    }

    if (products.length > 0) {
        drafts.push(createDraft(input, 'chatbot', 'knowledge_source', 'Starter products FAQ draft', {
            description: 'Draft chatbot FAQ source for AI-created starter products.',
            content: products.map(product => `Product draft: ${product}`).join('\n'),
            readinessBlockers: ['Starter products remain draft and must not be treated as published catalog data.'],
        }));
    }

    drafts.push(createDraft(input, 'chatbot', 'knowledge_source', 'Shipping returns and pickup policy draft', {
        description: 'Draft policy source for shipping, returns, pickup, payment, and tax questions.',
        content: 'Draft store policies: payment, tax, shipping, returns, and pickup rules need merchant review.',
        readinessBlockers: ['Policies must be completed and approved by the merchant.'],
    }));

    if (hasGiftCards(ecommerceBlueprint)) {
        drafts.push(createDraft(input, 'chatbot', 'knowledge_source', 'Gift card FAQ draft', {
            description: 'Draft source for gift card purchase, delivery, redemption, and support questions.',
            content: 'Gift card info is draft-only until redemption, delivery, expiration, and refund rules are reviewed.',
            readinessBlockers: ['Gift card rules need merchant approval.'],
        }));
    }

    if (hasRestaurantContext(blueprint, ecommerceBlueprint)) {
        drafts.push(createDraft(input, 'chatbot', 'knowledge_source', 'Restaurant catering and reservations draft', {
            description: 'Draft source for menu, catering, reservation, event, and gift card questions.',
            content: 'Restaurant context: reservations, menu, catering, event tickets, and gift cards need review.',
            readinessBlockers: ['Restaurant availability and catering rules must be reviewed.'],
        }));
    }

    if (hasRealEstateContext(blueprint, ecommerceBlueprint)) {
        drafts.push(createDraft(input, 'chatbot', 'knowledge_source', 'Real estate consultation guide draft', {
            description: 'Draft source for buyer guides, seller guides, consultations, and lead capture handoff.',
            content: 'Real estate context stays informational until reviewed and should not imply legal or financial advice.',
            readinessBlockers: ['Broker/agent must review lead capture language and consultation claims.'],
        }));
    }

    if (hasServicesContext(blueprint, ecommerceBlueprint)) {
        drafts.push(createDraft(input, 'chatbot', 'knowledge_source', 'Appointments and services draft', {
            description: 'Draft source for appointment, package, deposit, and add-on questions.',
            content: 'Appointments context: paid consultations, packages, deposits, and add-ons require service availability review.',
            readinessBlockers: ['Service availability and booking rules must be reviewed.'],
        }));
    }

    return drafts;
}

function createLeadDrafts(input: CrossModuleSyncInput): CrossModuleSyncDraft[] {
    const blueprint = input.businessBlueprint;
    const ecommerceBlueprint = input.ecommerceBlueprint || blueprint.ecommerceBlueprint;
    const tags = [
        ...LEAD_TAGS,
        ...(blueprint.leadBlueprint?.leadTags || []),
        ...(hasGiftCards(ecommerceBlueprint) ? ['gift-card'] : []),
        ...(hasServicesContext(blueprint, ecommerceBlueprint) ? ['service-inquiry'] : []),
        ...(hasRestaurantContext(blueprint, ecommerceBlueprint) ? ['restaurant-catering'] : []),
        ...(hasRealEstateContext(blueprint, ecommerceBlueprint) ? ['real-estate-consultation'] : []),
    ];
    const sources = [
        ...LEAD_SOURCES,
        ...(blueprint.leadBlueprint?.leadSources || []),
    ];
    const events = [
        ...LEAD_EVENT_DEFINITIONS,
        ...(blueprint.leadBlueprint?.activityTimelineEvents || []),
    ];

    return [
        ...uniqueValues(tags).map(tag => createDraft(input, 'leads', 'tag', tag, {
            description: `Draft CRM tag definition for ${tag}.`,
            readinessBlockers: ['CRM tags need merchant review before automation rules use them.'],
        })),
        ...uniqueValues(sources).map(source => createDraft(input, 'leads', 'source', source, {
            description: `Draft lead source definition for ${source}.`,
            readinessBlockers: ['Lead source routing is inactive until reviewed.'],
        })),
        ...uniqueValues(events).map(eventName => createDraft(input, 'leads', 'activity_event_definition', eventName, {
            description: `Draft lead activity event definition for ${eventName}.`,
            readinessBlockers: ['No lead activities are created by this draft definition.'],
            metadata: { eventName },
        })),
    ];
}

function createEmailFlowDraft(
    input: CrossModuleSyncInput,
    type: string,
    name: string,
    triggerType: string,
    subjectDraft: string,
    bodyOutlineDraft: string,
    variablesNeeded: string[],
): CrossModuleSyncDraft {
    return createDraft(input, 'emailMarketing', 'flow', name, {
        description: `Draft inactive email flow for ${name}.`,
        triggerType,
        subjectDraft,
        bodyOutlineDraft,
        variablesNeeded,
        readinessBlockers: [
            'Merchant must review copy, recipients, sender, unsubscribe, and compliance settings.',
            'Automation remains disabled and no provider call is made by this draft.',
        ],
        metadata: {
            flowType: type,
            automationActive: false,
            scheduled: false,
            emailSent: false,
            liveRecipients: false,
        },
    });
}

function createEmailDrafts(input: CrossModuleSyncInput): CrossModuleSyncDraft[] {
    const blueprint = input.businessBlueprint;
    const ecommerceBlueprint = input.ecommerceBlueprint || blueprint.ecommerceBlueprint;
    const drafts = [
        createEmailFlowDraft(input, 'welcome', 'Welcome flow draft', 'email_signup', 'Welcome to {{storeName}}', 'Introduce the brand, expectations, and next best action.', ['storeName', 'customerName']),
        createEmailFlowDraft(input, 'abandoned_cart', 'Abandoned cart flow draft', 'abandoned_cart', 'Still thinking it over?', 'Remind the shopper about saved cart items without activating cart recovery runtime.', ['storeName', 'cartItems', 'checkoutUrl']),
        createEmailFlowDraft(input, 'order_confirmation', 'Order confirmation draft', 'purchase_completed', 'Order received: {{orderNumber}}', 'Confirm order details after payment systems are configured and reviewed.', ['orderNumber', 'customerName', 'orderSummary']),
        createEmailFlowDraft(input, 'merchant_new_order_alert', 'Merchant new order alert draft', 'purchase_completed', 'New order needs review', 'Notify merchant about a new order after order events are approved.', ['orderNumber', 'orderTotal', 'customerName']),
        createEmailFlowDraft(input, 'post_purchase', 'Post purchase follow-up draft', 'purchase_completed', 'How did everything go?', 'Ask for feedback, review, or next best purchase after fulfillment rules are reviewed.', ['customerName', 'productNames']),
        createEmailFlowDraft(input, 'product_recommendation', 'Product recommendation draft', 'product_view', 'Recommended for you', 'Suggest related products based on reviewed catalog categories.', ['customerName', 'productNames', 'categoryNames']),
        createEmailFlowDraft(input, 'back_in_stock', 'Back in stock draft', 'back_in_stock_request', '{{productName}} is back', 'Notify interested customers only after inventory and consent rules are reviewed.', ['productName', 'customerName']),
        createEmailFlowDraft(input, 'low_stock_merchant_alert', 'Low stock merchant alert draft', 'low_stock', 'Low stock needs attention', 'Alert merchant about inventory risk without touching inventory runtime.', ['productName', 'quantity']),
        createEmailFlowDraft(input, 'winback', 'Winback flow draft', 'customer_inactive', 'We saved something for you', 'Invite dormant customers back after consent and segmentation are reviewed.', ['customerName', 'storeName']),
    ];

    if (hasGiftCards(ecommerceBlueprint)) {
        drafts.push(createEmailFlowDraft(input, 'gift_card_confirmation', 'Gift card confirmation draft', 'gift_card_purchase', 'Gift card draft confirmation', 'Confirm gift card purchase after redemption and delivery rules are reviewed.', ['customerName', 'giftCardAmount', 'recipientEmail']));
    }

    if (hasRestaurantContext(blueprint, ecommerceBlueprint)) {
        drafts.push(createEmailFlowDraft(input, 'catering_inquiry_follow_up', 'Catering inquiry follow-up draft', 'product_inquiry', 'Catering request received', 'Follow up on catering and event package inquiries after merchant review.', ['customerName', 'eventDate', 'partySize']));
    }

    if (hasRealEstateContext(blueprint, ecommerceBlueprint)) {
        drafts.push(createEmailFlowDraft(input, 'consultation_guide_follow_up', 'Consultation and guide follow-up draft', 'product_inquiry', 'Your consultation guide request', 'Follow up on buyer/seller guide and consultation interest without creating live automations.', ['leadName', 'guideType', 'consultationUrl']));
    }

    return drafts;
}

function createAnalyticsDrafts(input: CrossModuleSyncInput): CrossModuleSyncDraft[] {
    return ANALYTICS_EVENTS.map(eventName => createDraft(input, 'analytics', 'event_definition', eventName, {
        description: `Draft analytics event definition for ${eventName}.`,
        readinessBlockers: ['Runtime event tracking is not instrumented by this draft definition.'],
        metadata: {
            eventName,
            runtimeInstrumented: false,
            eventEmitted: false,
        },
    }));
}

function planModule(
    input: CrossModuleSyncInput,
    module: CrossModuleSyncModule,
    candidates: CrossModuleSyncDraft[],
): ModulePlan {
    const overwriteExisting = input.options?.overwriteExisting === true;
    const existingState = input.businessBlueprint.crossModuleSync?.[module];
    const existingDrafts = existingState?.drafts || [];
    const accepted: CrossModuleSyncDraft[] = [];
    const skipped: CrossModuleSyncSkippedItem[] = [];
    let nextDrafts = [...existingDrafts];

    for (const candidate of candidates) {
        const match = findCrossModuleDraftMatch(nextDrafts, candidate);

        if (match) {
            const isUserModified = isUserModifiedCrossModuleDraft(match.draft);
            const isAiGenerated = isAiGeneratedCrossModuleDraft(match.draft);

            if (isUserModified) {
                skipped.push({
                    module,
                    itemType: candidate.itemType,
                    name: candidate.name,
                    syncKey: candidate.syncKey,
                    reason: 'user_modified',
                    existingId: match.draft.id,
                });
                continue;
            }

            if (overwriteExisting && isAiGenerated) {
                nextDrafts = nextDrafts.map(draft => draft.id === match.draft.id ? { ...candidate, id: match.draft.id } : draft);
                accepted.push({ ...candidate, id: match.draft.id });
                continue;
            }

            skipped.push({
                module,
                itemType: candidate.itemType,
                name: candidate.name,
                syncKey: candidate.syncKey,
                reason: match.reason === 'sync_key' ? 'already_generated' : 'existing_name',
                existingId: match.draft.id,
            });
            continue;
        }

        accepted.push(candidate);
        nextDrafts.push(candidate);
    }

    return {
        module,
        accepted,
        skipped,
        nextState: {
            status: nextDrafts.length > 0 ? 'synced_draft' : 'skipped',
            refs: nextDrafts.map(draft => draft.id),
            drafts: nextDrafts,
        },
    };
}

function buildResult(input: CrossModuleSyncInput, dryRun: boolean): CrossModuleSyncResult {
    const blueprint = input.businessBlueprint;
    const ecommerceBlueprint = input.ecommerceBlueprint || blueprint.ecommerceBlueprint;
    const enabledOptions = {
        chatbot: input.options?.syncChatbot !== false,
        leads: input.options?.syncLeads !== false,
        emailMarketing: input.options?.syncEmailMarketing !== false,
        analytics: input.options?.syncAnalytics !== false,
    };
    const now = input.now || new Date().toISOString();
    const plans: ModulePlan[] = [];
    const disabledSkipped: CrossModuleSyncSkippedItem[] = [];
    const addPlan = (module: CrossModuleSyncModule, candidates: CrossModuleSyncDraft[], enabled: boolean) => {
        if (!enabled) {
            disabledSkipped.push(...candidates.map(candidate => ({
                module,
                itemType: candidate.itemType,
                name: candidate.name,
                syncKey: candidate.syncKey,
                reason: 'disabled' as const,
            })));
            return;
        }

        plans.push(planModule(input, module, candidates));
    };

    addPlan('chatbot', createChatbotDrafts(input), enabledOptions.chatbot);
    addPlan('leads', createLeadDrafts(input), enabledOptions.leads);
    addPlan('emailMarketing', createEmailDrafts(input), enabledOptions.emailMarketing);
    addPlan('analytics', createAnalyticsDrafts(input), enabledOptions.analytics);

    const planFor = (module: CrossModuleSyncModule): ModulePlan | undefined => plans.find(plan => plan.module === module);
    const chatbotPlan = planFor('chatbot');
    const leadsPlan = planFor('leads');
    const emailPlan = planFor('emailMarketing');
    const analyticsPlan = planFor('analytics');
    const skippedItems = [...plans.flatMap(plan => plan.skipped), ...disabledSkipped];
    const accepted = plans.flatMap(plan => plan.accepted);
    const warnings = [...SAFE_WRITER_WARNINGS];
    const errors: string[] = [];

    if (!ecommerceBlueprint.enabled) {
        warnings.push('Ecommerce blueprint is disabled; generated cross-module drafts remain inactive.');
    }

    const summary: CrossModuleSyncSummary = {
        dryRun,
        planned: accepted.length,
        created: dryRun ? 0 : accepted.length,
        updated: 0,
        skipped: skippedItems.length,
        chatbotDrafts: chatbotPlan?.accepted.length || 0,
        leadDrafts: leadsPlan?.accepted.length || 0,
        emailDrafts: emailPlan?.accepted.length || 0,
        analyticsDrafts: analyticsPlan?.accepted.length || 0,
        needsMerchantReview: true,
        noRuntimeActivated: true,
    };

    const applyState = !dryRun;
    const nextBusinessBlueprint: BusinessBlueprint = applyState ? {
        ...blueprint,
        updatedAt: now,
        lastSyncedAt: now,
        crossModuleSync: {
            status: 'synced_draft',
            syncedAt: now,
            previewedAt: blueprint.crossModuleSync?.previewedAt,
            chatbot: chatbotPlan?.nextState || blueprint.crossModuleSync?.chatbot,
            leads: leadsPlan?.nextState || blueprint.crossModuleSync?.leads,
            emailMarketing: emailPlan?.nextState || blueprint.crossModuleSync?.emailMarketing,
            analytics: analyticsPlan?.nextState || blueprint.crossModuleSync?.analytics,
            warnings,
            readiness: {
                chatbotReady: Boolean(chatbotPlan?.nextState.refs.length || blueprint.crossModuleSync?.chatbot?.refs.length),
                leadTagsReady: Boolean(leadsPlan?.nextState.refs.length || blueprint.crossModuleSync?.leads?.refs.length),
                emailFlowsReady: Boolean(emailPlan?.nextState.refs.length || blueprint.crossModuleSync?.emailMarketing?.refs.length),
                analyticsReady: Boolean(analyticsPlan?.nextState.refs.length || blueprint.crossModuleSync?.analytics?.refs.length),
                needsMerchantReview: true,
            },
        },
    } : blueprint;

    return {
        chatbotDrafts: chatbotPlan?.accepted || [],
        leadDrafts: leadsPlan?.accepted || [],
        emailDrafts: emailPlan?.accepted || [],
        analyticsDrafts: analyticsPlan?.accepted || [],
        skippedItems,
        warnings,
        errors,
        summary,
        syncRefs: {
            chatbot: chatbotPlan?.nextState.refs || blueprint.crossModuleSync?.chatbot?.refs || [],
            leads: leadsPlan?.nextState.refs || blueprint.crossModuleSync?.leads?.refs || [],
            emailMarketing: emailPlan?.nextState.refs || blueprint.crossModuleSync?.emailMarketing?.refs || [],
            analytics: analyticsPlan?.nextState.refs || blueprint.crossModuleSync?.analytics?.refs || [],
        },
        businessBlueprint: nextBusinessBlueprint,
    };
}

export function previewCrossModuleSync(input: CrossModuleSyncInput): CrossModuleSyncResult {
    return buildResult({ ...input, options: { ...input.options, dryRun: true } }, true);
}

export function applyCrossModuleSync(input: CrossModuleSyncInput): CrossModuleSyncResult {
    return buildResult({ ...input, options: { ...input.options, dryRun: false } }, false);
}
