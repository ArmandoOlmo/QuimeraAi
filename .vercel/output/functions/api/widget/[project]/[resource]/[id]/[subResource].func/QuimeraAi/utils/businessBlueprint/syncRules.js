import { shouldProtectFromRegeneration } from './adapters';
function createSyncAction(blueprint, sourceModule, targetModule, targetSystem, targetPath, reason, payload, allowProtectedOverwrite) {
    const isProtected = shouldProtectFromRegeneration(blueprint[targetModule]);
    return {
        id: `${sourceModule}-to-${targetSystem}-${targetPath.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        actionType: isProtected && !allowProtectedOverwrite ? 'skip_protected' : 'suggest_update',
        sourceModule,
        targetModule,
        targetSystem,
        targetPath,
        reason,
        payload,
        requiresConfirmation: isProtected || targetModule === 'ecommerceBlueprint',
    };
}
function hasPayload(value) {
    if (Array.isArray(value))
        return value.length > 0;
    if (value && typeof value === 'object')
        return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== '';
}
function addAction(actions, blueprint, options, sourceModule, targetModule, targetSystem, targetPath, reason, payload) {
    if (!hasPayload(payload))
        return;
    actions.push(createSyncAction(blueprint, sourceModule, targetModule, targetSystem, targetPath, reason, payload, options.allowProtectedOverwrite));
}
export function createCrossModuleSyncPlan(blueprint, options = {}) {
    const actions = [];
    const syncOptions = {
        allowProtectedOverwrite: options.allowProtectedOverwrite ?? false,
    };
    addAction(actions, blueprint, syncOptions, 'businessProfile', 'chatbotBlueprint', 'chatbot', 'knowledgeSources.business', 'Chatbot receives business knowledge sources from the AI Studio blueprint.', blueprint.chatbotBlueprint.businessKnowledge);
    addAction(actions, blueprint, syncOptions, 'ecommerceBlueprint', 'chatbotBlueprint', 'chatbot', 'knowledgeSources.products', 'Chatbot receives product and policy knowledge from ecommerce starter content.', [
        ...blueprint.chatbotBlueprint.productKnowledge,
        ...blueprint.chatbotBlueprint.policyKnowledge,
    ]);
    addAction(actions, blueprint, syncOptions, 'leadBlueprint', 'leadBlueprint', 'crm', 'leadTags', 'CRM receives normalized tags and lead source hints.', {
        leadSources: blueprint.leadBlueprint.leadSources,
        leadTags: blueprint.leadBlueprint.leadTags,
        activityTimelineEvents: blueprint.leadBlueprint.activityTimelineEvents,
    });
    addAction(actions, blueprint, syncOptions, 'emailMarketingBlueprint', 'emailMarketingBlueprint', 'emailMarketing', 'flowDrafts', 'Email Marketing receives draft flows from ecommerce and lead events.', blueprint.emailMarketingBlueprint.flows);
    addAction(actions, blueprint, syncOptions, 'storefrontBlueprint', 'storefrontBlueprint', 'storefront', 'sections', 'Storefront Builder receives presentation sections only.', blueprint.storefrontBlueprint.sections);
    addAction(actions, blueprint, syncOptions, 'ecommerceBlueprint', 'ecommerceBlueprint', 'ecommerce', 'settingsDraft', 'Ecommerce Engine receives draft settings without publishing inventory, checkout, discounts, or orders.', {
        categories: blueprint.ecommerceBlueprint.categories,
        inventoryMode: blueprint.ecommerceBlueprint.inventoryMode,
        fulfillmentMode: blueprint.ecommerceBlueprint.fulfillmentMode,
        discounts: blueprint.ecommerceBlueprint.discounts,
        giftCards: blueprint.ecommerceBlueprint.giftCards,
    });
    addAction(actions, blueprint, syncOptions, 'analyticsBlueprint', 'analyticsBlueprint', 'analytics', 'events', 'Analytics receives normalized cross-module event names.', blueprint.analyticsBlueprint.events);
    return {
        blueprintVersion: blueprint.blueprintVersion,
        generatedAt: options.now || new Date().toISOString(),
        actions,
        protectedActions: actions.filter(action => action.actionType === 'skip_protected'),
    };
}
//# sourceMappingURL=syncRules.js.map