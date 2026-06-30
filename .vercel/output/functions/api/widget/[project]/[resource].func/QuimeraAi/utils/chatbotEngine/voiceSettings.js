function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function cleanString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function normalizeProvider(value) {
    return value === 'elevenlabs' ? 'elevenlabs' : 'none';
}
function normalizeLanguageMode(value) {
    return value === 'project_default' || value === 'fixed' || value === 'visitor_language'
        ? value
        : 'visitor_language';
}
function getProjectChatbotVoiceSettings(project) {
    const directBlueprint = isRecord(project.businessBlueprint) ? project.businessBlueprint : null;
    const dataBlueprint = isRecord(project.data) && isRecord(project.data.businessBlueprint)
        ? project.data.businessBlueprint
        : null;
    const blueprint = directBlueprint || dataBlueprint;
    const chatbotBlueprint = isRecord(blueprint?.chatbotBlueprint) ? blueprint.chatbotBlueprint : null;
    const deployment = isRecord(chatbotBlueprint?.deployment) ? chatbotBlueprint.deployment : null;
    const voiceSettings = isRecord(deployment?.voiceSettings) ? deployment.voiceSettings : null;
    return voiceSettings;
}
function resolveFromVoiceRecord(settings, source) {
    if (!settings || settings.enabled !== true)
        return null;
    const provider = normalizeProvider(settings.provider);
    const agentId = cleanString(settings.agentId);
    const languageMode = normalizeLanguageMode(settings.languageMode);
    const consentRequired = settings.consentRequired !== false;
    if (provider === 'none') {
        return {
            enabled: false,
            provider,
            languageMode,
            consentRequired,
            source,
            unavailableReason: 'provider_missing',
        };
    }
    if (!agentId) {
        return {
            enabled: false,
            provider,
            languageMode,
            consentRequired,
            source,
            unavailableReason: 'agent_missing',
        };
    }
    return {
        enabled: true,
        provider,
        agentId,
        languageMode,
        consentRequired,
        source,
    };
}
function resolveLegacyAiAssistantVoice(config) {
    if (config.enableLiveVoice !== true)
        return null;
    const record = config;
    return resolveFromVoiceRecord({
        enabled: true,
        provider: record.voiceProvider || 'none',
        agentId: record.voiceAgentId || record.liveVoiceAgentId,
        languageMode: record.voiceLanguageMode,
        consentRequired: record.voiceConsentRequired,
    }, 'aiAssistantConfig');
}
export function resolveChatCoreVoiceSettings(config, project) {
    const blueprintVoice = resolveFromVoiceRecord(getProjectChatbotVoiceSettings(project), 'chatbotBlueprint');
    if (blueprintVoice?.enabled)
        return blueprintVoice;
    const legacyVoice = resolveLegacyAiAssistantVoice(config);
    if (legacyVoice)
        return legacyVoice;
    return blueprintVoice || {
        enabled: false,
        provider: 'none',
        languageMode: 'visitor_language',
        consentRequired: true,
        source: 'disabled',
        unavailableReason: config.enableLiveVoice ? 'agent_missing' : 'disabled',
    };
}
export function getChatCoreVoiceSessionReadiness(settings, consentAccepted = false) {
    if (!settings.enabled) {
        return { allowed: false, reason: settings.unavailableReason || 'disabled' };
    }
    if (settings.provider === 'none') {
        return { allowed: false, reason: 'provider_missing' };
    }
    if (!settings.agentId) {
        return { allowed: false, reason: 'agent_missing' };
    }
    if (settings.consentRequired && !consentAccepted) {
        return { allowed: false, reason: 'consent_required' };
    }
    return { allowed: true };
}
//# sourceMappingURL=voiceSettings.js.map