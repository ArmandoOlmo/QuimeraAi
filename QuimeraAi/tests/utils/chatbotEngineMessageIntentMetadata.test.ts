import { describe, expect, it } from 'vitest';
import { buildChatbotMessageIntentMetadata } from '../../utils/chatbotEngine/messageIntentMetadata';

describe('chatbotEngine message intent metadata', () => {
    it('adds bilingual user intent metadata for saved ChatCore conversations', () => {
        const result = buildChatbotMessageIntentMetadata({
            role: 'user',
            text: 'Hola, quiero agendar una cita. Can you book an appointment tomorrow?',
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            previousConversationTags: ['web-chat'],
            now: '2026-06-26T12:00:00.000Z',
        });

        expect(result.intent).toMatchObject({
            primaryIntent: 'appointment_request',
            actionType: 'create_appointment',
            urgency: 'high',
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
        });
        expect(result.messageMetadata.intent).toMatchObject({
            primaryIntent: 'appointment_request',
        });
        expect(result.conversationMetadata).toMatchObject({
            lastIntent: 'appointment_request',
            lastIntentActionType: 'create_appointment',
            lastIntentUrgency: 'high',
            lastIntentAt: '2026-06-26T12:00:00.000Z',
        });
        expect(result.conversationTags).toEqual(expect.arrayContaining([
            'web-chat',
            'intent:appointment_request',
            'action:create_appointment',
            'surface:booking_page',
            'module:appointments',
            'high-intent',
        ]));
    });

    it('preserves previous metadata while capping intent history', () => {
        const previousHistory = Array.from({ length: 12 }, (_, index) => ({
            primaryIntent: 'general_question',
            actionType: null,
            confidence: 0.32,
            urgency: 'low',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            at: `2026-06-26T10:${String(index).padStart(2, '0')}:00.000Z`,
            rawText: 'do not keep this',
        }));

        const result = buildChatbotMessageIntentMetadata({
            role: 'user',
            text: 'I need a formal quote and send invoice details',
            sourceSurface: 'website',
            sourceModule: 'finance',
            previousConversationMetadata: {
                crmOwnerId: 'owner-1',
                intentHistory: previousHistory,
            },
            previousConversationTags: ['lead'],
            now: '2026-06-26T12:15:00.000Z',
        });

        expect(result.conversationMetadata?.crmOwnerId).toBe('owner-1');
        expect(result.conversationMetadata?.intentHistory).toHaveLength(10);
        expect(result.conversationMetadata?.intentHistory).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    primaryIntent: 'finance_quote_request',
                    actionType: 'create_finance_quote_request',
                    at: '2026-06-26T12:15:00.000Z',
                }),
            ]),
        );
        expect(JSON.stringify(result.conversationMetadata)).not.toContain('do not keep this');
    });

    it('does not classify outbound model messages as visitor intent', () => {
        const result = buildChatbotMessageIntentMetadata({
            role: 'model',
            text: 'I can help you book an appointment.',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(result.intent).toBeNull();
        expect(result.messageMetadata).toMatchObject({
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            role: 'model',
            direction: 'outbound',
        });
        expect(result.conversationMetadata).toBeUndefined();
        expect(result.conversationTags).toBeUndefined();
    });
});
