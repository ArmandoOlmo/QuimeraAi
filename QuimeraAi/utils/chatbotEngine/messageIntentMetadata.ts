import type { ChatbotSurface } from '../../types/businessBlueprint';
import {
    buildChatbotEngineSurfaceContext,
    type ChatbotEngineSurfaceContext,
    type ChatbotEngineSurfaceContextInput,
} from './surfaceContext.js';
import {
    classifyChatbotMessageIntent,
    type ChatbotMessageIntentAnalysis,
} from './intentClassifier.js';

type ChatbotMessageRole = 'user' | 'model';

export interface BuildChatbotMessageIntentMetadataInput {
    role: ChatbotMessageRole;
    text: string;
    isVoiceMessage?: boolean;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    chatbotEngineContext?: ChatbotEngineSurfaceContextInput | ChatbotEngineSurfaceContext | null;
    previousConversationMetadata?: Record<string, unknown> | null;
    previousConversationTags?: string[] | null;
    now?: string;
}

export interface ChatbotMessageIntentMetadataResult {
    intent: ChatbotMessageIntentAnalysis | null;
    messageMetadata: Record<string, unknown>;
    conversationMetadata?: Record<string, unknown>;
    conversationTags?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanTags(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(
        value
            .filter((item): item is string => typeof item === 'string')
            .map(item => item.trim())
            .filter(Boolean),
    )).slice(0, 40);
}

function cleanIntentHistory(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter(isRecord)
        .slice(-9)
        .map(item => ({
            primaryIntent: item.primaryIntent,
            actionType: item.actionType ?? null,
            confidence: item.confidence,
            urgency: item.urgency,
            sourceSurface: item.sourceSurface,
            sourceModule: item.sourceModule,
            at: item.at,
        }));
}

export function buildChatbotMessageIntentMetadata(
    input: BuildChatbotMessageIntentMetadataInput,
): ChatbotMessageIntentMetadataResult {
    const surfaceContext = buildChatbotEngineSurfaceContext({
        ...(input.chatbotEngineContext || {}),
        sourceSurface: input.sourceSurface || input.chatbotEngineContext?.sourceSurface,
        sourceModule: input.sourceModule || input.chatbotEngineContext?.sourceModule,
    });
    const isInbound = input.role === 'user';
    const messageMetadata: Record<string, unknown> = {
        sourceSurface: surfaceContext.sourceSurface,
        sourceModule: surfaceContext.sourceModule,
        chatbotEngineContext: surfaceContext,
        isVoiceMessage: input.isVoiceMessage === true,
        role: input.role,
        direction: isInbound ? 'inbound' : 'outbound',
    };

    if (!isInbound) {
        return {
            intent: null,
            messageMetadata,
        };
    }

    const intent = classifyChatbotMessageIntent({
        text: input.text,
        sourceSurface: surfaceContext.sourceSurface,
        sourceModule: surfaceContext.sourceModule,
        context: surfaceContext,
    });
    const timestamp = input.now || new Date().toISOString();
    const previousMetadata = isRecord(input.previousConversationMetadata)
        ? input.previousConversationMetadata
        : {};
    const intentHistory = [
        ...cleanIntentHistory(previousMetadata.intentHistory),
        {
            primaryIntent: intent.primaryIntent,
            actionType: intent.actionType ?? null,
            confidence: intent.confidence,
            urgency: intent.urgency,
            sourceSurface: intent.sourceSurface,
            sourceModule: intent.sourceModule,
            at: timestamp,
        },
    ];
    const conversationTags = cleanTags(input.previousConversationTags);
    const nextTags = new Set<string>([
        ...conversationTags,
        `intent:${intent.primaryIntent}`,
        `surface:${surfaceContext.sourceSurface}`,
        `module:${surfaceContext.sourceModule}`,
    ]);

    if (intent.actionType) nextTags.add(`action:${intent.actionType}`);
    if (intent.urgency === 'high') nextTags.add('high-intent');

    messageMetadata.intent = intent;

    return {
        intent,
        messageMetadata,
        conversationMetadata: {
            ...previousMetadata,
            sourceSurface: surfaceContext.sourceSurface,
            sourceModule: surfaceContext.sourceModule,
            chatbotEngineContext: surfaceContext,
            lastIntent: intent.primaryIntent,
            lastIntentActionType: intent.actionType ?? null,
            lastIntentConfidence: intent.confidence,
            lastIntentUrgency: intent.urgency,
            lastIntentAt: timestamp,
            intentHistory: intentHistory.slice(-10),
        },
        conversationTags: Array.from(nextTags).slice(-40),
    };
}
