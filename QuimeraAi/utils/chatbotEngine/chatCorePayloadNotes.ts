import { buildWidgetCustomerRequestNotes } from './widgetCustomerRequestNotes';
import type { ChatbotEngineSurfaceContext } from './surfaceContext';

type NotePayload = Record<string, unknown>;

interface BaseChatCorePayloadNotesInput {
    projectName?: string | null;
    agentName?: string | null;
    sourceSurface?: string | null;
    sourceModule?: string | null;
    chatbotEngineContext?: ChatbotEngineSurfaceContext | null;
    locale?: string | null;
    generatedAt?: Date;
}

export interface BuildChatCoreLeadPayloadNotesInput extends BaseChatCorePayloadNotesInput {
    leadData: NotePayload;
}

export interface BuildChatCoreAppointmentPayloadNotesInput extends BaseChatCorePayloadNotesInput {
    appointmentData: NotePayload;
}

const isRecord = (value: unknown): value is NotePayload => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const cleanText = (value: unknown, maxLength = 1200): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const toIsoString = (value: unknown): string => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? cleanText(value, 120) : parsed.toISOString();
    }
    return '';
};

const mergeMetadata = (
    payload: NotePayload,
    sourceSurface: string,
    sourceModule: string,
    chatbotEngineContext?: ChatbotEngineSurfaceContext | null,
): NotePayload => ({
    ...(isRecord(payload.metadata) ? payload.metadata : {}),
    sourceSurface,
    sourceModule,
    ...(chatbotEngineContext ? { chatbotEngineContext } : {}),
});

const resolveSourceSurface = (
    payload: NotePayload,
    input: BaseChatCorePayloadNotesInput,
    fallback = 'website',
): string => cleanText(input.sourceSurface, 120)
    || cleanText(input.chatbotEngineContext?.sourceSurface, 120)
    || cleanText(payload.sourceSurface, 120)
    || cleanText(isRecord(payload.metadata) ? payload.metadata.sourceSurface : undefined, 120)
    || fallback;

const resolveSourceModule = (
    payload: NotePayload,
    input: BaseChatCorePayloadNotesInput,
    fallback = 'chatcore',
): string => cleanText(input.sourceModule, 120)
    || cleanText(input.chatbotEngineContext?.sourceModule, 120)
    || cleanText(payload.sourceModule, 120)
    || cleanText(isRecord(payload.metadata) ? payload.metadata.sourceModule : undefined, 120)
    || fallback;

const resolveLocale = (payload: NotePayload, input: BaseChatCorePayloadNotesInput): string => (
    cleanText(input.locale, 40)
    || cleanText(payload.locale, 40)
    || cleanText(isRecord(payload.metadata) ? payload.metadata.locale : undefined, 40)
);

export const buildChatCoreLeadPayloadNotes = (
    input: BuildChatCoreLeadPayloadNotesInput,
): string => {
    const sourceSurface = resolveSourceSurface(input.leadData, input);
    const sourceModule = resolveSourceModule(input.leadData, input);
    const locale = resolveLocale(input.leadData, input);
    const body = {
        ...input.leadData,
        sourceSurface,
        sourceModule,
        locale,
        chatbotEngineContext: input.chatbotEngineContext || input.leadData.chatbotEngineContext,
        metadata: mergeMetadata(input.leadData, sourceSurface, sourceModule, input.chatbotEngineContext),
    };

    return buildWidgetCustomerRequestNotes({
        body,
        projectName: input.projectName,
        agentName: input.agentName,
        sourceSurface,
        sourceModule,
        locale,
        generatedAt: input.generatedAt,
    });
};

export const buildChatCoreAppointmentPayloadNotes = (
    input: BuildChatCoreAppointmentPayloadNotesInput,
): string => {
    const sourceSurface = resolveSourceSurface(input.appointmentData, input);
    const sourceModule = resolveSourceModule(input.appointmentData, input);
    const locale = resolveLocale(input.appointmentData, input);
    const startDate = toIsoString(input.appointmentData.startDate);
    const body = {
        ...input.appointmentData,
        startDate,
        endDate: toIsoString(input.appointmentData.endDate),
        sourceSurface,
        sourceModule,
        locale,
        chatbotEngineContext: input.chatbotEngineContext || input.appointmentData.chatbotEngineContext,
        metadata: mergeMetadata(input.appointmentData, sourceSurface, sourceModule, input.chatbotEngineContext),
    };

    return buildWidgetCustomerRequestNotes({
        body,
        projectName: input.projectName,
        agentName: input.agentName,
        sourceSurface,
        sourceModule,
        locale,
        customer: {
            name: cleanText(input.appointmentData.participantName, 200) || null,
            email: cleanText(input.appointmentData.participantEmail, 320) || null,
            phone: cleanText(input.appointmentData.participantPhone, 80) || null,
        },
        customerProvidedNotes: cleanText(input.appointmentData.notes, 1800)
            || cleanText(input.appointmentData.description, 1800)
            || null,
        appointmentTitle: cleanText(input.appointmentData.title, 250) || null,
        appointmentDateTime: startDate || null,
        conversationId: cleanText(input.appointmentData.sourceConversationId, 120)
            || cleanText(input.appointmentData.conversationId, 120)
            || null,
        leadId: cleanText(input.appointmentData.linkedLeadId, 120)
            || cleanText(input.appointmentData.leadId, 120)
            || null,
        generatedAt: input.generatedAt,
    });
};
