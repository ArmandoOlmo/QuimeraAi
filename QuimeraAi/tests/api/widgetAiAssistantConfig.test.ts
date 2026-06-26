import { describe, expect, it } from 'vitest';
import { resolveProjectAiAssistantConfig } from '../../utils/chatbotEngine/projectAiAssistantConfig';

describe('widget AI assistant config resolver', () => {
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
});
