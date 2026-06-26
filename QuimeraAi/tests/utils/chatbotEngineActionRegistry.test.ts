import { describe, expect, it } from 'vitest';
import type { ChatbotActionType, ChatbotBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import {
    buildChatbotEngineObservedEvent,
    evaluateChatbotAction,
} from '../../utils/chatbotEngine/actionRegistry';

function buildPlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Quimera Wellness',
            industry: 'appointments and ecommerce',
            description: 'A bilingual service business that captures leads and books appointments.',
            tagline: 'Book smarter',
            services: [{ name: 'Consultation', description: 'Reviewed appointment flow.' }],
            contactInfo: { city: 'San Juan', country: 'Puerto Rico', email: 'hello@example.com' },
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#0f766e',
                secondary: '#111827',
                accent: '#f59e0b',
                background: '#f8fafc',
                surface: '#ffffff',
                text: '#111827',
            },
            visualStyle: 'clean service',
        },
        contentMap: { pages: [], products: [] },
        componentPlan: [
            { component: 'heroLead', reason: 'Lead capture', confidence: 0.9 },
            { component: 'chatbot', reason: 'ChatCore', confidence: 0.9 },
        ],
        assetPlan: [],
        qualityGoals: ['canonical chatbot engine'],
    };
}

function buildBlueprint(): ChatbotBlueprint {
    return createBusinessBlueprintFromWebsitePlan(buildPlan(), {
        now: '2026-06-26T00:00:00.000Z',
        projectId: 'project_chatbot',
        tenantId: 'tenant_chatbot',
    }).chatbotBlueprint;
}

function configureAction(blueprint: ChatbotBlueprint, actionType: ChatbotActionType): ChatbotBlueprint {
    return {
        ...blueprint,
        actions: blueprint.actions.map(action => action.actionType === actionType
            ? {
                ...action,
                enabled: true,
                status: 'configured' as const,
                needsReview: false,
                requiresReview: false,
                readiness: { isReady: true, blockers: [], warnings: [] },
            }
            : action),
    };
}

describe('chatbotEngine Action Registry', () => {
    it('blocks generated public actions until the registry action is configured', () => {
        const result = evaluateChatbotAction({
            blueprint: buildBlueprint(),
            projectId: 'project_chatbot',
            tenantId: 'tenant_chatbot',
            actionType: 'create_lead',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            hasConsent: true,
            idempotencyParts: ['lead@example.com'],
        });

        expect(result.allowed).toBe(false);
        expect(result.eventType).toBe('chatbot_action_blocked');
        expect(result.auditEvent.action_status).toBe('blocked');
        expect(result.blockers).toEqual(expect.arrayContaining(['action_disabled', 'action_status_needs_review', 'action_needs_review']));
        expect(result.auditEvent.metadata).toMatchObject({
            reason: 'action_disabled',
            compatibilityMode: false,
            publicRequest: true,
        });
    });

    it('requires consent for configured lead capture actions', () => {
        const result = evaluateChatbotAction({
            blueprint: configureAction(buildBlueprint(), 'create_lead'),
            projectId: 'project_chatbot',
            actionType: 'create_lead',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            hasConsent: false,
            idempotencyParts: ['lead@example.com'],
        });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('consent_required');
        expect(result.blockers).toContain('consent_required');
    });

    it('allows configured actions and produces deterministic idempotency keys', () => {
        const input = {
            blueprint: configureAction(buildBlueprint(), 'create_lead'),
            projectId: 'project_chatbot',
            actionType: 'create_lead' as const,
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            hasConsent: true,
            idempotencyParts: ['lead@example.com', 'pricing'],
            correlationId: 'corr_123',
        };

        const first = evaluateChatbotAction(input);
        const second = evaluateChatbotAction(input);

        expect(first.allowed).toBe(true);
        expect(first.eventType).toBe('chatbot_action_allowed');
        expect(first.idempotencyKey).toBe(second.idempotencyKey);
        expect(first.idempotencyKey).toContain('chatbot-engine:project_chatbot:create_lead');
    });

    it('registers Finance quote requests as public consented draft actions', () => {
        const blueprint = buildBlueprint();
        const financeAction = blueprint.actions.find(action => action.actionType === 'create_finance_quote_request');

        expect(financeAction).toMatchObject({
            ownerModule: 'finance',
            publicAllowed: true,
            requiresConsent: true,
            enabled: false,
            needsReview: true,
        });

        const result = evaluateChatbotAction({
            blueprint: configureAction(blueprint, 'create_finance_quote_request'),
            projectId: 'project_chatbot',
            actionType: 'create_finance_quote_request',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            hasConsent: true,
            idempotencyParts: ['lead@example.com', 'quote'],
        });

        expect(result.allowed).toBe(true);
        expect(result.auditEvent.metadata.ownerModule).toBe('finance');
    });

    it('keeps legacy projects compatible when no ChatbotBlueprint V2 exists', () => {
        const result = evaluateChatbotAction({
            blueprint: null,
            projectId: 'legacy_project',
            actionType: 'create_appointment',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            idempotencyParts: ['guest@example.com', '2026-07-01T10:00:00.000Z'],
        });

        expect(result.allowed).toBe(true);
        expect(result.compatibilityMode).toBe(true);
        expect(result.reason).toBe('legacy_no_chatbot_blueprint');
        expect(result.auditEvent.metadata.compatibilityMode).toBe(true);
    });

    it('builds scoped observed events for conversation persistence', () => {
        const event = buildChatbotEngineObservedEvent({
            projectId: 'project_chatbot',
            tenantId: 'tenant_chatbot',
            actionType: 'save_message',
            eventType: 'chatbot_message_saved',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
            conversationId: '11111111-1111-4111-8111-111111111111',
            messageId: '22222222-2222-4222-8222-222222222222',
            idempotencyParts: ['conversation', 1],
            metadata: {
                role: 'user',
                messageLength: 42,
            },
        });

        expect(event.project_id).toBe('project_chatbot');
        expect(event.action_type).toBe('save_message');
        expect(event.action_status).toBe('observed');
        expect(event.metadata).toMatchObject({
            role: 'user',
            messageLength: 42,
            reason: 'chatbot_message_saved',
        });
    });
});
