import { resolveProjectChatbotBlueprint } from './blueprintDashboard';
const SURFACE_TO_CHANNEL_KEY = {
    website: 'webWidget',
    storefront: 'storefront',
    checkout: 'checkout',
    bio_page: 'bioPage',
    booking_page: 'bookingPage',
    restaurant_menu: 'restaurantMenu',
    realty_property_page: 'realtyPropertyPage',
    admin_preview: 'adminPreview',
    voice: 'voice',
};
const VALID_SURFACES = new Set(Object.keys(SURFACE_TO_CHANNEL_KEY));
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function normalizeSurface(value) {
    return typeof value === 'string' && VALID_SURFACES.has(value)
        ? value
        : 'website';
}
function getSafetySettings(blueprint) {
    return isRecord(blueprint.deployment?.safetySettings) ? blueprint.deployment.safetySettings : {};
}
function shouldUseStrictSurfaceDeployment(blueprint, options) {
    if (typeof options.strict === 'boolean')
        return options.strict;
    const safetySettings = getSafetySettings(blueprint);
    return safetySettings.requireSurfaceDeployment === true
        || safetySettings.requireExplicitSurfaceDeployment === true;
}
function legacyEvaluation(surface, reason, warnings = []) {
    return {
        allowed: true,
        visible: true,
        strict: false,
        source: 'legacy',
        reason,
        surface,
        blockers: [],
        warnings,
    };
}
function blockedEvaluation(input) {
    return {
        allowed: false,
        visible: false,
        strict: input.strict,
        source: 'chatbotBlueprint',
        reason: input.reason,
        surface: input.surface,
        surfaceKey: input.surfaceKey,
        status: input.status,
        blockers: [input.blocker],
        warnings: [],
    };
}
export function resolveChatbotSurfaceDeploymentKey(surface) {
    return SURFACE_TO_CHANNEL_KEY[normalizeSurface(surface)];
}
export function evaluateChatbotSurfaceDeployment(projectOrBlueprint, sourceSurface, options = {}) {
    const surface = normalizeSurface(sourceSurface);
    const blueprint = isRecord(projectOrBlueprint) && projectOrBlueprint['engineVersion'] === 'v2'
        ? projectOrBlueprint
        : resolveProjectChatbotBlueprint(projectOrBlueprint);
    if (!blueprint) {
        return legacyEvaluation(surface, 'chatbot_blueprint_missing_legacy_allowed', [
            'chatbot_blueprint_missing',
        ]);
    }
    const surfaceKey = resolveChatbotSurfaceDeploymentKey(surface);
    const channel = blueprint.channels?.[surfaceKey];
    const strict = shouldUseStrictSurfaceDeployment(blueprint, options);
    if (!channel) {
        if (strict) {
            return blockedEvaluation({
                surface,
                surfaceKey,
                status: 'disabled',
                strict,
                reason: 'surface_not_deployed',
                blocker: 'surface_channel_missing',
            });
        }
        return legacyEvaluation(surface, 'surface_channel_missing_legacy_allowed', [
            'surface_channel_missing',
        ]);
    }
    if (channel.status === 'paused') {
        return blockedEvaluation({
            surface,
            surfaceKey,
            status: channel.status,
            strict,
            reason: 'surface_paused',
            blocker: 'surface_paused',
        });
    }
    if (channel.status === 'disabled') {
        return blockedEvaluation({
            surface,
            surfaceKey,
            status: channel.status,
            strict,
            reason: 'surface_disabled',
            blocker: 'surface_disabled',
        });
    }
    if (channel.enabled && channel.status === 'deployed') {
        return {
            allowed: true,
            visible: true,
            strict,
            source: 'chatbotBlueprint',
            reason: 'surface_deployed',
            surface,
            surfaceKey,
            status: channel.status,
            blockers: [],
            warnings: [],
        };
    }
    if (channel.enabled && channel.status === 'test' && (options.isPreview || surface === 'admin_preview')) {
        return {
            allowed: true,
            visible: true,
            strict,
            source: 'chatbotBlueprint',
            reason: 'surface_test_preview_allowed',
            surface,
            surfaceKey,
            status: channel.status,
            blockers: [],
            warnings: ['surface_test_mode'],
        };
    }
    if (strict) {
        return blockedEvaluation({
            surface,
            surfaceKey,
            status: channel.status,
            strict,
            reason: 'surface_not_deployed',
            blocker: `surface_status_${channel.status}`,
        });
    }
    return {
        allowed: true,
        visible: true,
        strict,
        source: 'chatbotBlueprint',
        reason: 'surface_legacy_allowed',
        surface,
        surfaceKey,
        status: channel.status,
        blockers: [],
        warnings: ['surface_deployment_not_enforced'],
    };
}
export function canRenderChatbotSurface(projectOrBlueprint, sourceSurface, options = {}) {
    return evaluateChatbotSurfaceDeployment(projectOrBlueprint, sourceSurface, options).visible;
}
//# sourceMappingURL=deploymentGuard.js.map