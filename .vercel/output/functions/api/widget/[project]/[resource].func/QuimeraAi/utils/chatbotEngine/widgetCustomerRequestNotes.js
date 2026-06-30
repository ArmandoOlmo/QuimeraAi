import { appendChatbotCustomerRequestNotes, buildChatbotCustomerRequestNotes, } from './customerRequestNotes';
const GENERATED_SUMMARY_MARKER = 'Resumen de solicitud del cliente / Customer request summary';
const isRecord = (value) => (Boolean(value) && typeof value === 'object' && !Array.isArray(value));
const cleanText = (value, maxLength = 1200) => {
    if (typeof value !== 'string')
        return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};
const cleanNoteBlock = (value, maxLength = 6000) => {
    if (typeof value !== 'string')
        return '';
    return value
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/[ ]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, maxLength);
};
const normalizeNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return undefined;
};
const firstText = (...values) => {
    for (const value of values) {
        const text = cleanText(value, 1800);
        if (text)
            return text;
    }
    return '';
};
const metadataFromBody = (body) => (isRecord(body.metadata) ? body.metadata : {});
const contextFromBody = (body) => {
    const metadata = metadataFromBody(body);
    const context = body.chatbotEngineContext || body.context || metadata.chatbotEngineContext;
    return isRecord(context) ? context : {};
};
const nestedRecord = (source, key) => (isRecord(source[key]) ? source[key] : {});
const roleFromPayload = (message) => {
    const role = cleanText(message.role, 40).toLowerCase();
    if (role === 'assistant' || role === 'model')
        return 'model';
    if (role === 'user' || role === 'customer' || role === 'visitor')
        return 'user';
    const direction = cleanText(message.direction, 40).toLowerCase();
    if (direction === 'inbound')
        return 'user';
    if (direction === 'outbound')
        return 'model';
    return role || 'message';
};
const textFromMessage = (message) => firstText(message.text, message.message, message.content, nestedRecord(message, 'payload').text);
const normalizeMessages = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => {
        if (typeof item === 'string')
            return { role: 'user', text: cleanText(item, 1200) };
        if (!isRecord(item))
            return null;
        const text = textFromMessage(item);
        if (!text)
            return null;
        return {
            role: roleFromPayload(item),
            text,
        };
    })
        .filter((item) => Boolean(item?.text))
        .slice(-12);
};
const parseTranscriptMessages = (transcript) => {
    const text = cleanNoteBlock(transcript, 20000);
    if (!text)
        return [];
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map((line) => {
        const [rawPrefix, ...rest] = line.split(':');
        const body = rest.join(':').trim();
        if (!body)
            return null;
        const prefix = rawPrefix.trim().toLowerCase();
        const role = ['usuario', 'cliente', 'user', 'customer', 'visitor', 'visitante'].includes(prefix)
            ? 'user'
            : ['asistente', 'assistant', 'model', 'ai', 'chatcore'].includes(prefix)
                ? 'model'
                : 'message';
        return { role, text: cleanText(body, 1200) };
    })
        .filter((item) => Boolean(item?.text))
        .slice(-12);
};
export const normalizeWidgetCustomerRequestMessages = (body) => {
    const metadata = metadataFromBody(body);
    const fromArrays = [
        normalizeMessages(body.messages),
        normalizeMessages(body.conversationMessages),
        normalizeMessages(body.chatMessages),
        normalizeMessages(metadata.messages),
    ].find(messages => messages.length > 0);
    if (fromArrays?.length)
        return fromArrays;
    const transcriptMessages = parseTranscriptMessages(body.conversationTranscript || metadata.conversationTranscript);
    if (transcriptMessages.length)
        return transcriptMessages;
    const latestMessage = firstText(body.message, body.description);
    return latestMessage ? [{ role: 'user', text: latestMessage }] : [];
};
const resolveContact = (body, explicit) => {
    const participantInfo = isRecord(body.participantInfo) ? body.participantInfo : {};
    return {
        name: firstText(explicit?.name, body.name, body.customerName, body.participantName, body.recipientName, participantInfo.name) || null,
        email: firstText(explicit?.email, body.email, body.customerEmail, body.participantEmail, body.recipientEmail, participantInfo.email) || null,
        phone: firstText(explicit?.phone, body.phone, body.customerPhone, body.participantPhone, participantInfo.phone) || null,
    };
};
const resolveIntent = (body) => {
    const metadata = metadataFromBody(body);
    const intentSource = [
        body.intentAnalysis,
        body.aiIntent,
        metadata.intentAnalysis,
        metadata.intent,
    ].find(isRecord);
    return {
        customerInterest: firstText(intentSource?.customerInterest, intentSource?.summary, body.aiAnalysis, body.customerInterest) || null,
        urgency: firstText(intentSource?.urgency, intentSource?.urgencyLevel, body.urgency) || null,
        urgencyLevel: firstText(intentSource?.urgencyLevel, intentSource?.urgency, body.urgencyLevel) || null,
        recommendedAction: firstText(intentSource?.recommendedAction, intentSource?.nextBestAction, body.recommendedAction) || null,
        intentScore: normalizeNumber(intentSource?.intentScore
            ?? intentSource?.score
            ?? body.intentScore
            ?? body.aiScore
            ?? body.leadScore) ?? null,
    };
};
const existingGeneratedSummary = (body) => {
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
export const buildWidgetCustomerRequestNotes = (input) => {
    const existingSummary = existingGeneratedSummary(input.body);
    if (existingSummary)
        return existingSummary;
    const metadata = metadataFromBody(input.body);
    const context = contextFromBody(input.body);
    const sourceSurface = input.sourceSurface || firstText(input.body.sourceSurface, context.sourceSurface);
    const sourceModule = input.sourceModule || firstText(input.body.sourceModule, metadata.sourceModule, context.sourceModule);
    const conversationId = input.conversationId || firstText(input.body.sourceConversationId, input.body.conversationId, metadata.sourceConversationId, metadata.conversationId);
    const leadId = input.leadId || firstText(input.body.linkedLeadId, input.body.leadId, metadata.sourceLeadId);
    const customerProvidedNotes = firstText(input.customerProvidedNotes, input.body.customerRequestSummary, metadata.customerRequestSummary, input.body.notes, input.body.message, input.body.description);
    return buildChatbotCustomerRequestNotes({
        projectName: input.projectName,
        agentName: input.agentName,
        messages: normalizeWidgetCustomerRequestMessages(input.body),
        intentAnalysis: resolveIntent(input.body),
        customer: resolveContact(input.body, input.customer),
        customerProvidedNotes,
        appointmentTitle: input.appointmentTitle || firstText(input.body.title),
        appointmentDateTime: input.appointmentDateTime || firstText(input.body.startDate, input.body.appointmentDateTime),
        appointmentTimezone: input.appointmentTimezone || firstText(input.body.timezone, input.body.appointmentTimezone, metadata.timezone, metadata.appointmentTimezone),
        sourceSurface,
        sourceModule,
        conversationId,
        leadId,
        locale: input.locale || firstText(input.body.locale, metadata.locale),
        generatedAt: input.generatedAt,
    });
};
export const appendWidgetCustomerRequestNotes = (existingNotes, input) => appendChatbotCustomerRequestNotes(existingNotes, buildWidgetCustomerRequestNotes(input));
//# sourceMappingURL=widgetCustomerRequestNotes.js.map