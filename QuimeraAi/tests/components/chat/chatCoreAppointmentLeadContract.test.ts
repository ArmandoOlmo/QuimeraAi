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

    it('keeps ChatbotWidget appointment writes on the canonical Widget API and waits for a real leadId', () => {
        const source = readSource('components/ChatbotWidget.tsx');

        expect(source).not.toContain('createAppointmentFromChat');
        expect(source).toContain('canonical Widget API appointment capture');
        expect(source).toContain('fetch(`${WIDGET_API_BASE_URL}/${encodeURIComponent(widgetApiProjectId)}/appointments`');
        expect(source).toContain('if (data.leadId) {');
        expect(source).toContain('Appointment saved but CRM leadId was not returned.');
        expect(source).not.toContain('data.leadId || appointmentData.participantName || appointmentData.participantEmail');
    });

    it('gates live voice sessions through the canonical Widget API before starting the provider', () => {
        const source = readSource('components/chat/ChatCore.tsx');

        expect(source).toContain('type ChatCoreVoiceSessionResponse');
        expect(source).toContain('const requestCanonicalVoiceSession = async');
        expect(source).toContain('/voice/session');
        expect(source).toContain('const canonicalSession = await requestCanonicalVoiceSession(sessionId)');
        expect(source).toContain('if (canonicalSession?.agentId)');
        expect(source).toContain('const session = await Conversation.startSession({');
        expect(source).toContain('agentId,');
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

    it('renders project ChatCore from the active assistant config instead of legacy chatbot section visibility', () => {
        const landingPage = readSource('components/LandingPage.tsx');
        expect(landingPage).toContain('const shouldRenderChatbotWidget = Boolean(');
        expect(landingPage).toContain('isProjectAiAssistantConfigActive(activeProjectChatbotConfig)');
        expect(landingPage).toContain('shouldRenderChatbotWidget && isSectionServiceAvailable');
        expect(landingPage).not.toContain('effectiveSectionVisibility.chatbot && (');

        const publicPreview = readSource('components/PublicWebsitePreview.tsx');
        expect(publicPreview).toContain('const shouldRenderChatbotWidget = Boolean(');
        expect(publicPreview).toContain('isProjectAiAssistantConfigActive(enrichedStandaloneChatbotConfig)');
        expect(publicPreview).toContain('shouldRenderChatbotWidget && isSectionServiceAvailable');
        expect(publicPreview).toContain('published_data, ai_assistant_config');
        expect(publicPreview).toContain('aiAssistantConfig: rawData.aiAssistantConfig || row.ai_assistant_config || null');
        expect(publicPreview).not.toContain('effectiveSectionVisibility.chatbot !== false && (');

        const previewPrefetch = readSource('utils/previewPrefetch.ts');
        expect(previewPrefetch).toContain('published_data, ai_assistant_config');
        expect(previewPrefetch).toContain('aiAssistantConfig: (sourceData as Record<string, unknown>).aiAssistantConfig || row.ai_assistant_config || null');

        const ssrRenderer = readSource('server/ssrRenderer.ts');
        expect(ssrRenderer).toContain('published_data, ai_assistant_config');
        expect(ssrRenderer).toContain('aiAssistantConfig: data.aiAssistantConfig || row.ai_assistant_config || null');
    });
});
