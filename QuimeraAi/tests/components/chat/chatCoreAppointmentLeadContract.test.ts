import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('ChatCore appointment lead contract', () => {
    it('keeps the lead returned by appointment creation and links the Inbox conversation', () => {
        const source = readSource('components/chat/ChatCore.tsx');

        expect(source).toContain('export interface ChatAppointmentResult');
        expect(source).toContain('onCreateAppointment?: (appointmentData: ChatAppointmentData) => Promise<ChatAppointmentHandlerResult>');
        expect(source).toContain('const registerAppointmentResult = async');
        expect(source).toContain('capturedLeadIdRef.current = result.leadId');
        expect(source).toContain('await linkToLead(result.leadId)');
        expect(source.match(/registerAppointmentResult\(await onCreateAppointment\(appointmentData\)\)/g)).toHaveLength(4);
    });

    it('returns appointmentId and leadId from all ChatCore appointment hosts', () => {
        const hosts = [
            'components/ChatbotWidget.tsx',
            'components/chat/EmbedWidget.tsx',
            'components/dashboard/ai/ChatSimulator.tsx',
        ];

        hosts.forEach((path) => {
            const source = readSource(path);
            expect(source).toContain('ChatAppointmentHandlerResult');
            expect(source).toContain('appointmentId:');
            expect(source).toContain('leadId:');
        });
    });

    it('wires public direct ChatCore hosts through surface context and deployment guards', () => {
        const embedWidget = readSource('components/chat/EmbedWidget.tsx');
        expect(embedWidget).toContain('buildChatbotEngineSurfaceContext');
        expect(embedWidget).toContain('canRenderChatbotSurface');
        expect(embedWidget).toContain('embeddedChatbotEngineContext');
        expect(embedWidget).toContain('if (!chatbotSurfaceVisible) return null');
        expect(embedWidget).toContain('chatbotEngineContext={embeddedChatbotEngineContext}');

        const bioPage = readSource('components/PublicBioPage.tsx');
        expect(bioPage).toContain('canRenderChatbotSurface');
        expect(bioPage).toContain('bioPageChatbotSurfaceVisible');
        expect(bioPage).toContain('if (!bioPageChatbotSurfaceVisible) return');
        expect(bioPage).toContain('{isChatbotOpen && bioPageChatbotSurfaceVisible && (');
        expect(bioPage).toContain('chatbotEngineContext={bioPageChatbotEngineContext}');
    });

    it('keeps internal ChatCore previews on canonical admin preview surfaces', () => {
        const simulator = readSource('components/dashboard/ai/ChatSimulator.tsx');
        expect(simulator).toContain('simulatorChatbotEngineContext');
        expect(simulator).toContain("sourceSurface: 'admin_preview'");
        expect(simulator).toContain("contextKeys: ['test_lab', 'chat_simulator']");
        expect(simulator).toContain('chatbotEngineContext={simulatorChatbotEngineContext}');
        expect(simulator).not.toContain("sourceSurface: 'test_lab'");

        const setupWizard = readSource('components/dashboard/ai/ChatbotSetupWizard.tsx');
        expect(setupWizard).toContain('buildChatbotEngineSurfaceContext');
        expect(setupWizard).toContain("sourceSurface: 'admin_preview'");
        expect(setupWizard).toContain("contextKeys: ['setup_wizard', 'preview']");

        const bioPageBuilder = readSource('components/dashboard/BioPageBuilder.tsx');
        expect(bioPageBuilder).toContain('buildChatbotEngineSurfaceContext');
        expect(bioPageBuilder).toContain("sourceSurface: 'admin_preview'");
        expect(bioPageBuilder).toContain("contextKeys: ['bio_page_builder', 'chatbot_preview']");
    });
});
