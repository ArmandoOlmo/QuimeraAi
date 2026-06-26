import type { AiAssistantConfig } from '../../types/ai-assistant';
import type { Project } from '../../types/project';

export type ChatbotVoiceProvider = 'none' | 'elevenlabs';
export type ChatbotVoiceLanguageMode = 'project_default' | 'visitor_language' | 'fixed';

export interface ResolvedChatbotVoiceSettings {
    enabled: boolean;
    provider: ChatbotVoiceProvider;
    agentId?: string;
    languageMode: ChatbotVoiceLanguageMode;
    consentRequired: boolean;
    source: 'chatbotBlueprint' | 'aiAssistantConfig' | 'disabled';
    unavailableReason?: 'disabled' | 'provider_missing' | 'agent_missing';
}

type VoiceSettingsRecord = {
    enabled?: unknown;
    provider?: unknown;
    agentId?: unknown;
    languageMode?: unknown;
    consentRequired?: unknown;
};

function isRecord(value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeProvider(value: unknown): ChatbotVoiceProvider {
    return value === 'elevenlabs' ? 'elevenlabs' : 'none';
}

function normalizeLanguageMode(value: unknown): ChatbotVoiceLanguageMode {
    return value === 'project_default' || value === 'fixed' || value === 'visitor_language'
        ? value
        : 'visitor_language';
}

function getProjectChatbotVoiceSettings(project: Project): VoiceSettingsRecord | null {
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

function resolveFromVoiceRecord(
    settings: VoiceSettingsRecord | null,
    source: ResolvedChatbotVoiceSettings['source'],
): ResolvedChatbotVoiceSettings | null {
    if (!settings || settings.enabled !== true) return null;

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

function resolveLegacyAiAssistantVoice(config: AiAssistantConfig): ResolvedChatbotVoiceSettings | null {
    if (config.enableLiveVoice !== true) return null;
    const record = config as AiAssistantConfig & {
        voiceProvider?: unknown;
        voiceAgentId?: unknown;
        liveVoiceAgentId?: unknown;
        voiceConsentRequired?: unknown;
        voiceLanguageMode?: unknown;
    };

    return resolveFromVoiceRecord({
        enabled: true,
        provider: record.voiceProvider || 'none',
        agentId: record.voiceAgentId || record.liveVoiceAgentId,
        languageMode: record.voiceLanguageMode,
        consentRequired: record.voiceConsentRequired,
    }, 'aiAssistantConfig');
}

export function resolveChatCoreVoiceSettings(
    config: AiAssistantConfig,
    project: Project,
): ResolvedChatbotVoiceSettings {
    const blueprintVoice = resolveFromVoiceRecord(getProjectChatbotVoiceSettings(project), 'chatbotBlueprint');
    if (blueprintVoice?.enabled) return blueprintVoice;

    const legacyVoice = resolveLegacyAiAssistantVoice(config);
    if (legacyVoice) return legacyVoice;

    return blueprintVoice || {
        enabled: false,
        provider: 'none',
        languageMode: 'visitor_language',
        consentRequired: true,
        source: 'disabled',
        unavailableReason: config.enableLiveVoice ? 'agent_missing' : 'disabled',
    };
}
