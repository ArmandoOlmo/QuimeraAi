import { describe, expect, it } from 'vitest';
import {
    isProjectAiAssistantConfigActive,
    resolveProjectAiAssistantConfig,
} from '../../utils/chatbotEngine/projectAiAssistantConfig';

describe('widget AI assistant config resolver', () => {
    it('treats persisted ChatCore configs as active unless explicitly disabled', () => {
        expect(isProjectAiAssistantConfigActive({ agentName: 'ChatCore' })).toBe(true);
        expect(isProjectAiAssistantConfigActive({ isActive: true, agentName: 'ChatCore' })).toBe(true);
        expect(isProjectAiAssistantConfigActive({ isActive: false, agentName: 'ChatCore' })).toBe(false);
        expect(isProjectAiAssistantConfigActive(null)).toBe(false);
    });

    it('uses AI Studio ChatCore config stored in project data when the column is empty', () => {
        const config = resolveProjectAiAssistantConfig({
            ai_assistant_config: null,
            data: {
                aiAssistantConfig: {
                    isActive: true,
                    agentName: 'Asistente de Brasa Prime',
                    knowledgeDocuments: [
                        {
                            id: 'ai-studio-chatcore-project-knowledge',
                            content: 'Conocimiento del proyecto para ChatCore',
                        },
                    ],
                },
            },
        });

        expect(config?.isActive).toBe(true);
        expect(config?.knowledgeDocuments?.[0]?.id).toBe('ai-studio-chatcore-project-knowledge');
    });

    it('keeps the explicit column config when it exists', () => {
        const config = resolveProjectAiAssistantConfig({
            ai_assistant_config: {
                isActive: false,
                agentName: 'Manual config',
            },
            data: {
                aiAssistantConfig: {
                    isActive: true,
                    agentName: 'Generated config',
                },
            },
        });

        expect(config).toMatchObject({
            isActive: false,
            agentName: 'Manual config',
        });
    });

    it('hydrates a populated legacy config with BusinessBlueprint ChatCore knowledge when documents are missing', () => {
        const config = resolveProjectAiAssistantConfig({
            ai_assistant_config: {
                isActive: true,
                agentName: 'Manual Brasa Assistant',
                businessProfile: 'Manual restaurant profile.',
                knowledgeDocuments: [],
            },
            data: {
                businessBlueprint: {
                    businessProfile: {
                        businessName: 'Brasa Prime',
                        industry: 'restaurant',
                        description: 'Steakhouse with reservations, private events, and online orders.',
                        services: [
                            { name: 'Dinner reservations', description: 'Table bookings for guests.' },
                        ],
                        contactInfo: { phone: '787-000-0000' },
                    },
                    chatbotBlueprint: {
                        enabled: true,
                        status: 'needs_review',
                        agentProfile: {
                            agentName: 'Brasa Prime AI Agent',
                            supportedLanguages: ['es', 'en'],
                            fallbackMessage: 'Use reviewed restaurant information only.',
                        },
                        businessKnowledge: ['Open for dinner and private events.'],
                        productKnowledge: ['Gift cards'],
                        policyKnowledge: ['Reservations require confirmation.'],
                    },
                },
            },
        });

        expect(config?.agentName).toBe('Manual Brasa Assistant');
        expect(config?.businessProfile).toBe('Manual restaurant profile.');
        expect(config?.source).toBe('aiAssistantConfig+businessBlueprint.chatbotBlueprint');
        expect(config?.knowledgeDocuments?.[0]).toMatchObject({
            id: 'ai-studio-chatcore-project-knowledge',
            source: 'businessBlueprint.chatbotBlueprint',
        });
        expect(config?.knowledgeDocuments?.[0]?.content).toContain('Open for dinner and private events.');
        expect(config?.productsServices).toContain('Gift cards');
    });

    it('supports legacy nested project snapshots', () => {
        const config = resolveProjectAiAssistantConfig({
            ai_assistant_config: {},
            data: {
                data: {
                    aiAssistant: {
                        isActive: true,
                        agentName: 'Nested assistant',
                    },
                },
            },
        });

        expect(config).toMatchObject({
            isActive: true,
            agentName: 'Nested assistant',
        });
    });

    it('derives a public ChatCore config from BusinessBlueprint when legacy config is empty', () => {
        const config = resolveProjectAiAssistantConfig({
            ai_assistant_config: {},
            data: {
                aiAssistantConfig: {},
                businessBlueprint: {
                    businessProfile: {
                        businessName: 'Ganova',
                        industry: 'consulting',
                        description: 'Operational consulting for growing teams.',
                        services: [
                            { name: 'Process audit', description: 'Find bottlenecks and automation opportunities.' },
                        ],
                        contactInfo: { email: 'hello@example.com' },
                    },
                    brandProfile: {
                        colors: { primary: '#f4b000' },
                    },
                    chatbotBlueprint: {
                        enabled: true,
                        status: 'needs_review',
                        agentProfile: {
                            agentName: 'Ganova AI Agent',
                            tone: 'professional',
                            supportedLanguages: ['es', 'en'],
                            welcomeMessage: 'Hola. Puedo ayudarte con Ganova.',
                            fallbackMessage: 'Puedo recopilar tus datos o pasar esto a un humano.',
                        },
                        leadCapture: {
                            enabled: true,
                            mode: 'hybrid',
                            triggerAfterMessages: 2,
                        },
                        deployment: {
                            voiceSettings: { enabled: false },
                        },
                        businessKnowledge: ['Ganova helps operational teams.'],
                        productKnowledge: ['Process audit'],
                        policyKnowledge: ['Do not invent prices or availability.'],
                    },
                },
            },
        });

        expect(config).toMatchObject({
            isActive: true,
            agentName: 'Ganova AI Agent',
            widgetColor: '#f4b000',
            source: 'businessBlueprint.chatbotBlueprint',
        });
        expect(config?.languages).toBe('Spanish, English');
        expect(config?.leadCaptureConfig.triggerAfterMessages).toBe(2);
        expect(config?.knowledgeDocuments?.[0]).toMatchObject({
            id: 'ai-studio-chatcore-project-knowledge',
            source: 'businessBlueprint.chatbotBlueprint',
        });
        expect(config?.knowledgeDocuments?.[0]?.content).toContain('Ganova helps operational teams.');
    });

    it('does not derive ChatCore config from a disabled BusinessBlueprint chatbot', () => {
        const config = resolveProjectAiAssistantConfig({
            ai_assistant_config: {},
            data: {
                aiAssistantConfig: {},
                businessBlueprint: {
                    businessProfile: { businessName: 'Disabled Bot' },
                    chatbotBlueprint: {
                        enabled: false,
                        agentProfile: { agentName: 'Disabled Bot Agent' },
                    },
                },
            },
        });

        expect(config).toBeNull();
    });
});
