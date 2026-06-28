import { describe, expect, it } from 'vitest';
import type { AiAssistantConfig, Project } from '../../types';
import {
    extractChatCoreWebsiteContext,
    mergeChatCoreWebsiteDraft,
    parseChatCoreWebsiteGuideResult,
} from '../../utils/chatbotEngine/chatCoreWebsiteContent';

const baseConfig: AiAssistantConfig = {
    agentName: 'ChatCore',
    tone: 'Professional',
    languages: 'Spanish, English',
    businessProfile: '',
    productsServices: '',
    policiesContact: '',
    specialInstructions: '',
    faqs: [],
    knowledgeDocuments: [
        {
            id: 'manual-doc',
            name: 'Manual doc',
            content: 'Human uploaded policy.',
            extractedAt: { seconds: 0, nanoseconds: 0 },
            fileType: 'text/plain',
            size: 22,
        },
    ],
    knowledgeLinks: [],
    widgetColor: '#111827',
    isActive: true,
    leadCaptureEnabled: true,
    enableLiveVoice: false,
    voiceName: 'Zephyr',
};

function makeProject(overrides: Partial<Project> = {}): Project {
    return {
        id: 'project-1',
        name: 'Brasa Prime',
        status: 'Draft',
        data: {
            hero: {
                title: 'Brasa Prime Steakhouse',
                subtitle: 'Reservas privadas y cenas al carbón en San Juan.',
                imageUrl: 'https://example.com/hero.jpg',
            },
            services: {
                title: 'Servicios',
                items: [
                    { name: 'Reservas para cena', description: 'Mesas para grupos y parejas.' },
                    { name: 'Eventos privados', description: 'Menús para celebraciones.' },
                ],
            },
            footer: {
                email: 'hola@brasa.test',
                phone: '787-000-0000',
            },
        } as any,
        theme: {} as any,
        brandIdentity: {} as any,
        componentOrder: ['hero', 'services', 'footer'] as any,
        sectionVisibility: {
            hero: true,
            services: true,
            footer: true,
        } as any,
        ...overrides,
    };
}

describe('chatCoreWebsiteContent', () => {
    it('extracts usable ChatCore context from a saved website project', () => {
        const context = extractChatCoreWebsiteContext(makeProject());

        expect(context.hasUsableContent).toBe(true);
        expect(context.sectionCount).toBe(3);
        expect(context.content).toContain('Brasa Prime Steakhouse');
        expect(context.content).toContain('Eventos privados');
        expect(context.content).toContain('hola@brasa.test');
        expect(context.content).not.toContain('https://example.com/hero.jpg');
    });

    it('parses a guided LLM draft from fenced JSON', () => {
        const result = parseChatCoreWebsiteGuideResult(`
\`\`\`json
{
  "assistantReply": "Ya preparé el borrador.",
  "ready": true,
  "draft": {
    "agentName": "Brasa Prime AI",
    "tone": "Friendly",
    "languages": "Spanish, English",
    "businessProfile": "Restaurante de carnes en San Juan.",
    "productsServices": "Reservas para cena\\nEventos privados",
    "policiesContact": "Email: hola@brasa.test",
    "specialInstructions": "Confirmar reservas antes de crear citas.",
    "faqs": [
      { "question": "¿Aceptan grupos?", "answer": "Sí, con reserva previa." }
    ],
    "knowledgeDocument": {
      "name": "Brasa Prime - ChatCore knowledge",
      "content": "# Brasa Prime\\nRestaurante de carnes."
    }
  }
}
\`\`\`
        `, 'Brasa Prime');

        expect(result.ready).toBe(true);
        expect(result.assistantReply).toBe('Ya preparé el borrador.');
        expect(result.draft?.agentName).toBe('Brasa Prime AI');
        expect(result.draft?.faqs[0]).toMatchObject({
            id: 'chatcore-website-faq-1',
            question: '¿Aceptan grupos?',
        });
        expect(result.draft?.knowledgeDocument).toMatchObject({
            id: 'chatcore-website-generated-knowledge',
            fileType: 'text/markdown',
        });
    });

    it('applies the website draft while preserving external knowledge documents', () => {
        const result = parseChatCoreWebsiteGuideResult(JSON.stringify({
            assistantReply: 'Draft ready.',
            ready: true,
            draft: {
                businessProfile: 'Website-derived profile.',
                productsServices: 'Website-derived services.',
                policiesContact: 'Website-derived contact.',
                specialInstructions: 'Website-derived instructions.',
                faqs: [{ question: 'Question?', answer: 'Answer.' }],
            },
        }), 'Brasa Prime');

        const merged = mergeChatCoreWebsiteDraft(baseConfig, result.draft!);

        expect(merged.businessProfile).toBe('Website-derived profile.');
        expect(merged.faqs).toHaveLength(1);
        expect(merged.knowledgeDocuments[0].id).toBe('chatcore-website-generated-knowledge');
        expect(merged.knowledgeDocuments[1].id).toBe('manual-doc');
        expect(merged.isActive).toBe(true);
    });
});
