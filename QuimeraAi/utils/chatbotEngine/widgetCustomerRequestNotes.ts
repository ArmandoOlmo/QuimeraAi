import {
    appendChatbotCustomerRequestNotes,
    buildChatbotCustomerRequestNotes,
    type ChatbotCustomerRequestContact,
    type ChatbotCustomerRequestIntent,
    type ChatbotCustomerRequestMessage,
} from './customerRequestNotes';

export interface BuildWidgetCustomerRequestNotesInput {
    body: Record<string, unknown>;
    projectName?: string | null;
    agentName?: string | null;
    sourceSurface?: string | null;
    sourceModule?: string | null;
    customer?: ChatbotCustomerRequestContact | null;
    customerProvidedNotes?: string | null;
    appointmentTitle?: string | null;
    appointmentDateTime?: string | null;
    conversationId?: string | null;
    leadId?: string | null;
    locale?: string | null;
    generatedAt?: Date;
}

const GENERATED_SUMMARY_MARKER = 'Resumen de solicitud del cliente / Customer request summary';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const cleanText = (value: unknown, maxLength = 1200): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const cleanNoteBlock = (value: unknown, maxLength = 6000): string => {
    if (typeof value !== 'string') return '';
    return value
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, maxLength);
};

const normalizeNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const firstText = (...values: unknown[]): string => {
    for (const value of values) {
        const text = cleanText(value, 1800);
        if (text) return text;
    }
    return '';
};

const metadataFromBody = (body: Record<string, unknown>): Record<string, unknown> => (
    isRecord(body.metadata) ? body.metadata : {}
);

const contextFromBody = (body: Record<string, unknown>): Record<string, unknown> => {
    const metadata = metadataFromBody(body);
    const context = body.chatbotEngineContext || body.context || metadata.chatbotEngineContext;
    return isRecord(context) ? context : {};
};

const nestedRecord = (source: Record<string, unknown>, key: string): Record<string, unknown> => (
    isRecord(source[key]) ? source[key] as Record<string, unknown> : {}
);

const roleFromPayload = (message: Record<string, unknown>): string => {
    const role = cleanText(message.role, 40).toLowerCase();
    if (role === 'assistant' || role === 'model') return 'model';
    if (role === 'user' || role === 'customer' || role === 'visitor') return 'user';

    const direction = cleanText(message.direction, 40).toLowerCase();
    if (direction === 'inbound') return 'user';
    if (direction === 'outbound') return 'model';
    return role || 'message';
};

const textFromMessage = (message: Record<string, unknown>): string => firstText(
    message.text,
    message.message,
    message.content,
    nestedRecord(message, 'payload').text,
);

const normalizeMessages = (value: unknown): ChatbotCustomerRequestMessage[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item): ChatbotCustomerRequestMessage | null => {
            if (typeof item === 'string') return { role: 'user', text: cleanText(item, 1200) };
            if (!isRecord(item)) return null;
            const text = textFromMessage(item);
            if (!text) return null;
            return {
                role: roleFromPayload(item),
                text,
            };
        })
        .filter((item): item is ChatbotCustomerRequestMessage => Boolean(item?.text))
        .slice(-12);
};

const parseTranscriptMessages = (transcript: unknown): ChatbotCustomerRequestMessage[] => {
    const text = cleanNoteBlock(transcript, 20000);
    if (!text) return [];

    return text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map((line): ChatbotCustomerRequestMessage | null => {
            const [rawPrefix, ...rest] = line.split(':');
            const body = rest.join(':').trim();
            if (!body) return null;
            const prefix = rawPrefix.trim().toLowerCase();
            const role = ['usuario', 'cliente', 'user', 'customer', 'visitor', 'visitante'].includes(prefix)
                ? 'user'
                : ['asistente', 'assistant', 'model', 'ai', 'chatcore'].includes(prefix)
                    ? 'model'
                    : 'message';
            return { role, text: cleanText(body, 1200) };
        })
        .filter((item): item is ChatbotCustomerRequestMessage => Boolean(item?.text))
        .slice(-12);
};

export const normalizeWidgetCustomerRequestMessages = (
    body: Record<string, unknown>,
): ChatbotCustomerRequestMessage[] => {
    const metadata = metadataFromBody(body);
    const fromArrays = [
        normalizeMessages(body.messages),
        normalizeMessages(body.conversationMessages),
        normalizeMessages(body.chatMessages),
        normalizeMessages(metadata.messages),
    ].find(messages => messages.length > 0);
    if (fromArrays?.length) return fromArrays;

    const transcriptMessages = parseTranscriptMessages(
        body.conversationTranscript || metadata.conversationTranscript,
    );
    if (transcriptMessages.length) return transcriptMessages;

    const latestMessage = firstText(body.message, body.description);
    return latestMessage ? [{ role: 'user', text: latestMessage }] : [];
};

const resolveContact = (
    body: Record<string, unknown>,
    explicit?: ChatbotCustomerRequestContact | null,
): ChatbotCustomerRequestContact => {
    const participantInfo = isRecord(body.participantInfo) ? body.participantInfo : {};
    return {
        name: firstText(
            explicit?.name,
            body.name,
            body.customerName,
            body.participantName,
            body.recipientName,
            participantInfo.name,
        ) || null,
        email: firstText(
            explicit?.email,
            body.email,
            body.customerEmail,
            body.participantEmail,
            body.recipientEmail,
            participantInfo.email,
        ) || null,
        phone: firstText(
            explicit?.phone,
            body.phone,
            body.customerPhone,
            body.participantPhone,
            participantInfo.phone,
        ) || null,
    };
};

const resolveIntent = (body: Record<string, unknown>): ChatbotCustomerRequestIntent => {
    const metadata = metadataFromBody(body);
    const intentSource = [
        body.intentAnalysis,
        body.aiIntent,
        metadata.intentAnalysis,
        metadata.intent,
    ].find(isRecord) as Record<string, unknown> | undefined;

    return {
        customerInterest: firstText(
            intentSource?.customerInterest,
            intentSource?.summary,
            body.aiAnalysis,
            body.customerInterest,
        ) || null,
        urgency: firstText(intentSource?.urgency, intentSource?.urgencyLevel, body.urgency) || null,
        urgencyLevel: firstText(intentSource?.urgencyLevel, intentSource?.urgency, body.urgencyLevel) || null,
        recommendedAction: firstText(
            intentSource?.recommendedAction,
            intentSource?.nextBestAction,
            body.recommendedAction,
        ) || null,
        intentScore: normalizeNumber(
            intentSource?.intentScore
            ?? intentSource?.score
            ?? body.intentScore
            ?? body.aiScore
            ?? body.leadScore,
        ) ?? null,
    };
};

const existingGeneratedSummary = (body: Record<string, unknown>): string => {
    const metadata = metadataFromBody(body);
    const candidates = [
        body.customerRequestSummary,
        metadata.customerRequestSummary,
        body.notes,
    ];
    return candidates
        .map(value => cleanNoteBlock(value))
        .find(value => value.includes(GENERATED_SUMMARY_MARKER)) || '';
};

export const buildWidgetCustomerRequestNotes = (
    input: BuildWidgetCustomerRequestNotesInput,
): string => {
    const existingSummary = existingGeneratedSummary(input.body);
    if (existingSummary) return existingSummary;

    const metadata = metadataFromBody(input.body);
    const context = contextFromBody(input.body);
    const sourceSurface = input.sourceSurface || firstText(input.body.sourceSurface, context.sourceSurface);
    const sourceModule = input.sourceModule || firstText(input.body.sourceModule, metadata.sourceModule, context.sourceModule);
    const conversationId = input.conversationId || firstText(
        input.body.sourceConversationId,
        input.body.conversationId,
        metadata.sourceConversationId,
        metadata.conversationId,
    );
    const leadId = input.leadId || firstText(input.body.linkedLeadId, input.body.leadId, metadata.sourceLeadId);
    const customerProvidedNotes = firstText(
        input.customerProvidedNotes,
        input.body.customerRequestSummary,
        metadata.customerRequestSummary,
        input.body.notes,
        input.body.message,
        input.body.description,
    );

    return buildChatbotCustomerRequestNotes({
        projectName: input.projectName,
        agentName: input.agentName,
        messages: normalizeWidgetCustomerRequestMessages(input.body),
        intentAnalysis: resolveIntent(input.body),
        customer: resolveContact(input.body, input.customer),
        customerProvidedNotes,
        appointmentTitle: input.appointmentTitle || firstText(input.body.title),
        appointmentDateTime: input.appointmentDateTime || firstText(input.body.startDate, input.body.appointmentDateTime),
        sourceSurface,
        sourceModule,
        conversationId,
        leadId,
        locale: input.locale || firstText(input.body.locale, metadata.locale),
        generatedAt: input.generatedAt,
    });
};

export const appendWidgetCustomerRequestNotes = (
    existingNotes: string | null | undefined,
    input: BuildWidgetCustomerRequestNotesInput,
): string => appendChatbotCustomerRequestNotes(existingNotes, buildWidgetCustomerRequestNotes(input));
