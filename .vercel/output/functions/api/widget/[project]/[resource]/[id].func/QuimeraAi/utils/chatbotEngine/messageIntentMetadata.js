import { buildChatbotEngineSurfaceContext, } from './surfaceContext';
import { classifyChatbotMessageIntent, } from './intentClassifier';
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function cleanTags(value) {
    if (!Array.isArray(value))
        return [];
    return Array.from(new Set(value
        .filter((item) => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean))).slice(0, 40);
}
function cleanIntentHistory(value) {
    if (!Array.isArray(value))
        return [];
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
export function buildChatbotMessageIntentMetadata(input) {
    const surfaceContext = buildChatbotEngineSurfaceContext({
        ...(input.chatbotEngineContext || {}),
        sourceSurface: input.sourceSurface || input.chatbotEngineContext?.sourceSurface,
        sourceModule: input.sourceModule || input.chatbotEngineContext?.sourceModule,
    });
    const isInbound = input.role === 'user';
    const messageMetadata = {
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
    const nextTags = new Set([
        ...conversationTags,
        `intent:${intent.primaryIntent}`,
        `surface:${surfaceContext.sourceSurface}`,
        `module:${surfaceContext.sourceModule}`,
    ]);
    if (intent.actionType)
        nextTags.add(`action:${intent.actionType}`);
    if (intent.urgency === 'high')
        nextTags.add('high-intent');
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
//# sourceMappingURL=messageIntentMetadata.js.map