import { describe, expect, it } from 'vitest';
import type { AiAssistantConfig } from '../../types/ai-assistant';
import type { Project } from '../../types/project';
import { resolveChatCoreVoiceSettings } from '../../utils/chatbotEngine/voiceSettings';

function buildConfig(overrides: Partial<AiAssistantConfig> = {}): AiAssistantConfig {
    return {
        agentName: 'Quimera Agent',
        tone: 'professional',
        languages: 'Español e Inglés',
        businessProfile: 'Bilingual business',
        productsServices: 'Services',
        policiesContact: 'Contact us',
        specialInstructions: '',
        faqs: [],
        knowledgeDocuments: [],
        knowledgeLinks: [],
        widgetColor: '#f59e0b',
        isActive: true,
        leadCaptureEnabled: true,
        enableLiveVoice: false,
        voiceName: 'Puck',
        ...overrides,
    };
}

function buildProject(voiceSettings: Record<string, unknown>, location: 'root' | 'data' = 'root'): Project {
    const businessBlueprint = {
        chatbotBlueprint: {
            deployment: {
                voiceSettings,
            },
        },
    };

    return {
        id: 'project_voice',
        name: 'Project Voice',
        status: 'Draft',
        data: location === 'data' ? { businessBlueprint } : {},
        theme: {},
        componentOrder: [],
        sectionVisibility: {},
        ...(location === 'root' ? { businessBlueprint } : {}),
    } as unknown as Project;
}

describe('resolveChatCoreVoiceSettings', () => {
    it('prefers project ChatbotBlueprint voice settings over legacy assistant config', () => {
        const settings = resolveChatCoreVoiceSettings(
            buildConfig({
                enableLiveVoice: true,
                voiceProvider: 'elevenlabs',
                voiceAgentId: 'legacy_agent',
            }),
            buildProject({
                enabled: true,
                provider: 'elevenlabs',
                agentId: 'blueprint_agent',
                languageMode: 'project_default',
                consentRequired: false,
            }),
        );

        expect(settings).toMatchObject({
            enabled: true,
            provider: 'elevenlabs',
            agentId: 'blueprint_agent',
            languageMode: 'project_default',
            consentRequired: false,
            source: 'chatbotBlueprint',
        });
    });

    it('resolves voice settings from project.data.businessBlueprint for legacy storage', () => {
        const settings = resolveChatCoreVoiceSettings(
            buildConfig(),
            buildProject({
                enabled: true,
                provider: 'elevenlabs',
                agentId: 'data_blueprint_agent',
                languageMode: 'visitor_language',
            }, 'data'),
        );

        expect(settings).toMatchObject({
            enabled: true,
            agentId: 'data_blueprint_agent',
            source: 'chatbotBlueprint',
        });
    });

    it('keeps voice disabled when the blueprint has no provider or no agent ID', () => {
        const providerMissing = resolveChatCoreVoiceSettings(
            buildConfig(),
            buildProject({ enabled: true, provider: 'none', agentId: 'agent_1' }),
        );
        const agentMissing = resolveChatCoreVoiceSettings(
            buildConfig(),
            buildProject({ enabled: true, provider: 'elevenlabs' }),
        );

        expect(providerMissing).toMatchObject({
            enabled: false,
            unavailableReason: 'provider_missing',
            source: 'chatbotBlueprint',
        });
        expect(agentMissing).toMatchObject({
            enabled: false,
            unavailableReason: 'agent_missing',
            source: 'chatbotBlueprint',
        });
    });

    it('supports legacy aiAssistantConfig voice settings without a blueprint', () => {
        const settings = resolveChatCoreVoiceSettings(
            buildConfig({
                enableLiveVoice: true,
                voiceProvider: 'elevenlabs',
                liveVoiceAgentId: 'legacy_alias_agent',
                voiceLanguageMode: 'fixed',
            }),
            buildProject({ enabled: false }),
        );

        expect(settings).toMatchObject({
            enabled: true,
            provider: 'elevenlabs',
            agentId: 'legacy_alias_agent',
            languageMode: 'fixed',
            source: 'aiAssistantConfig',
        });
    });

    it('does not enable voice from enableLiveVoice alone', () => {
        const settings = resolveChatCoreVoiceSettings(
            buildConfig({ enableLiveVoice: true }),
            buildProject({ enabled: false }),
        );

        expect(settings).toMatchObject({
            enabled: false,
        });
        expect(settings.agentId).toBeUndefined();
    });
});
