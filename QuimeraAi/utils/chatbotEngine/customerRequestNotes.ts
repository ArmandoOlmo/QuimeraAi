export interface ChatbotCustomerRequestMessage {
    role?: 'user' | 'model' | 'assistant' | string;
    text?: string | null;
}

export interface ChatbotCustomerRequestIntent {
    customerInterest?: string | null;
    urgency?: string | null;
    urgencyLevel?: string | null;
    recommendedAction?: string | null;
    intentScore?: number | null;
}

export interface ChatbotCustomerRequestContact {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
}

export interface BuildChatbotCustomerRequestNotesInput {
    projectName?: string | null;
    agentName?: string | null;
    messages?: ChatbotCustomerRequestMessage[];
    intentAnalysis?: ChatbotCustomerRequestIntent | null;
    customer?: ChatbotCustomerRequestContact | null;
    customerProvidedNotes?: string | null;
    appointmentTitle?: string | null;
    appointmentDateTime?: string | null;
    sourceSurface?: string | null;
    sourceModule?: string | null;
    conversationId?: string | null;
    leadId?: string | null;
    locale?: string | null;
    generatedAt?: Date;
}

const MAX_NOTE_LENGTH = 6000;
const MAX_SNIPPET_LENGTH = 700;

const cleanText = (value: unknown, maxLength = 1200): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const cleanNoteBlock = (value: unknown, maxLength = MAX_NOTE_LENGTH): string => {
    if (typeof value !== 'string') return '';
    return value
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, maxLength);
};

const formatRole = (role?: string) => {
    if (role === 'user') return 'Cliente / Customer';
    if (role === 'model' || role === 'assistant') return 'Asistente / Assistant';
    return role || 'Mensaje / Message';
};

const uniqueNonEmpty = (values: Array<string | null | undefined>): string[] => {
    const seen = new Set<string>();
    return values
        .map(value => cleanText(value, 500))
        .filter(value => {
            if (!value || seen.has(value.toLowerCase())) return false;
            seen.add(value.toLowerCase());
            return true;
        });
};

const latestUserMessage = (messages: ChatbotCustomerRequestMessage[] = []) => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message?.role === 'user') {
            const text = cleanText(message.text, MAX_SNIPPET_LENGTH);
            if (text) return text;
        }
    }
    return '';
};

const formatConversationSnapshot = (messages: ChatbotCustomerRequestMessage[] = []) => (
    messages
        .filter(message => cleanText(message.text, MAX_SNIPPET_LENGTH))
        .slice(-8)
        .map(message => `- ${formatRole(message.role)}: ${cleanText(message.text, MAX_SNIPPET_LENGTH)}`)
        .join('\n')
);

export const buildChatbotCustomerRequestNotes = (input: BuildChatbotCustomerRequestNotesInput): string => {
    const messages = input.messages || [];
    const intent = input.intentAnalysis || {};
    const latestRequest = latestUserMessage(messages);
    const explicitNotes = cleanText(input.customerProvidedNotes, 1400);
    const customerInterest = cleanText(intent.customerInterest, 1000);
    const primaryRequest = uniqueNonEmpty([explicitNotes, customerInterest, latestRequest])[0]
        || 'No especificado todavia / Not specified yet';
    const contactParts = uniqueNonEmpty([
        input.customer?.name,
        input.customer?.email,
        input.customer?.phone,
    ]);
    const sourceParts = uniqueNonEmpty([input.sourceSurface, input.sourceModule]);
    const conversationSnapshot = formatConversationSnapshot(messages);
    const urgency = cleanText(intent.urgency || intent.urgencyLevel, 80) || 'unknown';
    const recommendedAction = cleanText(intent.recommendedAction, 1000);
    const score = typeof intent.intentScore === 'number' && Number.isFinite(intent.intentScore)
        ? String(Math.round(intent.intentScore))
        : '';
    const generatedAt = (input.generatedAt || new Date()).toISOString();

    const lines = [
        'Resumen de solicitud del cliente / Customer request summary',
        `Proyecto / Project: ${cleanText(input.projectName, 250) || 'N/A'}`,
        `Origen / Source: ${sourceParts.join(' - ') || 'ChatCore'}`,
        contactParts.length ? `Cliente / Customer: ${contactParts.join(' | ')}` : '',
        input.conversationId ? `Conversacion / Conversation: ${cleanText(input.conversationId, 160)}` : '',
        input.leadId ? `Lead ID: ${cleanText(input.leadId, 160)}` : '',
        input.appointmentTitle ? `Cita / Appointment: ${cleanText(input.appointmentTitle, 250)}` : '',
        input.appointmentDateTime ? `Fecha solicitada / Requested time: ${cleanText(input.appointmentDateTime, 250)}` : '',
        `Lo que desea el cliente / What the customer wants: ${primaryRequest}`,
        explicitNotes && explicitNotes !== primaryRequest ? `Notas del cliente / Customer notes: ${explicitNotes}` : '',
        customerInterest && customerInterest !== primaryRequest ? `Interes detectado por IA / AI detected interest: ${customerInterest}` : '',
        latestRequest && latestRequest !== primaryRequest ? `Ultimo mensaje del cliente / Latest customer message: ${latestRequest}` : '',
        `Urgencia / Urgency: ${urgency}${score ? ` | Score: ${score}/100` : ''}`,
        recommendedAction ? `Accion recomendada / Recommended action: ${recommendedAction}` : '',
        conversationSnapshot ? `Resumen de conversacion / Conversation snapshot:\n${conversationSnapshot}` : '',
        `Generado por / Generated by: ${cleanText(input.agentName, 160) || 'ChatCore'}`,
        `Idioma UI / UI language: ${cleanText(input.locale, 40) || 'unknown'}`,
        `Generado en / Generated at: ${generatedAt}`,
    ].filter(Boolean);

    return lines.join('\n').slice(0, MAX_NOTE_LENGTH);
};

export const appendChatbotCustomerRequestNotes = (
    existingNotes?: string | null,
    customerRequestNotes?: string | null,
): string => {
    const existing = cleanNoteBlock(existingNotes);
    const next = cleanNoteBlock(customerRequestNotes);
    if (!next) return existing;
    if (!existing) return next;

    const dedupeNeedle = next.slice(0, 160);
    if (dedupeNeedle && existing.includes(dedupeNeedle)) return existing;
    return `${existing}\n\n${next}`.slice(0, MAX_NOTE_LENGTH);
};

const valueAfterAnyLabel = (lines: string[], labels: string[]): string => {
    for (const line of lines) {
        for (const label of labels) {
            if (line.startsWith(label)) return cleanText(line.slice(label.length), 1400);
        }
    }
    return '';
};

const conversationContextFromSummary = (lines: string[]): string => {
    const index = lines.findIndex(line => line.startsWith('Resumen de conversacion / Conversation snapshot:'));
    if (index < 0) return '';
    return lines
        .slice(index + 1)
        .filter(line => line.startsWith('- '))
        .map(line => line.replace(/^-+\s*/, ''))
        .map(line => line.replace(/^Cliente \/ Customer:\s*/i, 'Cliente: '))
        .map(line => line.replace(/^Asistente \/ Assistant:\s*/i, 'Asistente: '))
        .slice(0, 3)
        .join(' | ');
};

export const buildReadableChatbotCustomerRequestNote = (
    customerRequestNotes?: string | null,
    fallback?: string | null,
): string => {
    const raw = cleanNoteBlock(customerRequestNotes);
    if (!raw) return cleanNoteBlock(fallback);
    if (!raw.includes('Resumen de solicitud del cliente / Customer request summary')) return raw;

    const lines = raw
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    const customer = valueAfterAnyLabel(lines, ['Cliente / Customer: ']);
    const request = valueAfterAnyLabel(lines, ['Lo que desea el cliente / What the customer wants: ']);
    const appointment = valueAfterAnyLabel(lines, ['Cita / Appointment: ']);
    const requestedTime = valueAfterAnyLabel(lines, ['Fecha solicitada / Requested time: ']);
    const urgency = valueAfterAnyLabel(lines, ['Urgencia / Urgency: ']);
    const recommendedAction = valueAfterAnyLabel(lines, ['Accion recomendada / Recommended action: ']);
    const latestMessage = valueAfterAnyLabel(lines, ['Ultimo mensaje del cliente / Latest customer message: ']);
    const context = conversationContextFromSummary(lines) || latestMessage;

    const readableLines = [
        'Resumen para seguimiento / Follow-up summary',
        customer ? `Cliente / Customer: ${customer}` : '',
        request ? `Solicitud / Request: ${request}` : '',
        appointment ? `Cita / Appointment: ${appointment}` : '',
        requestedTime ? `Fecha solicitada / Requested time: ${requestedTime}` : '',
        urgency && urgency !== 'unknown' ? `Prioridad / Priority: ${urgency}` : '',
        recommendedAction ? `Siguiente paso sugerido / Suggested next step: ${recommendedAction}` : '',
        context ? `Contexto / Context: ${context}` : '',
    ].filter(Boolean);

    return (readableLines.length > 1 ? readableLines.join('\n') : raw).slice(0, MAX_NOTE_LENGTH);
};
