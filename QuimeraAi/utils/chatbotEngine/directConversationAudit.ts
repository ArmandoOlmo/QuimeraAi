import type { ChatbotEngineSurfaceContext } from './surfaceContext';

export interface DirectConversationAuditMetadataInput {
    sessionId: string;
    sourceSurface: string;
    sourceModule: string;
    chatbotEngineContext?: ChatbotEngineSurfaceContext | null;
    metadata?: Record<string, unknown>;
}

export interface DirectParticipantUpdateAuditInput {
    conversationId: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
}

function cleanKeyPart(value: unknown): string {
    return String(value ?? 'none')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'none';
}

export function buildDirectConversationAuditIdempotencyKey(
    projectId: string,
    parts: Array<string | number | boolean | null | undefined>,
): string {
    return ['chatbot-engine-direct', projectId, ...parts]
        .map(cleanKeyPart)
        .join(':')
        .slice(0, 240);
}

export function buildDirectParticipantUpdateAuditIdempotencyKey(
    projectId: string,
    input: DirectParticipantUpdateAuditInput,
): string {
    return buildDirectConversationAuditIdempotencyKey(projectId, [
        'participant',
        input.conversationId,
        input.name,
        input.email,
        input.phone,
    ]);
}

export function buildDirectConversationAuditMetadata(
    input: DirectConversationAuditMetadataInput,
): Record<string, unknown> {
    return {
        directClientPersistence: true,
        sessionId: input.sessionId,
        sourceSurface: input.sourceSurface,
        sourceModule: input.sourceModule,
        chatbotEngineContext: input.chatbotEngineContext,
        ...(input.metadata || {}),
    };
}
