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
    appointmentTimezone?: string | null;
    sourceSurface?: string | null;
    sourceModule?: string | null;
    conversationId?: string | null;
    leadId?: string | null;
    locale?: string | null;
    generatedAt?: Date;
}

export interface BuildReadableChatbotCustomerRequestNoteOptions {
    customer?: ChatbotCustomerRequestContact | null;
    appointmentTitle?: string | null;
    appointmentDateTime?: string | null;
    appointmentTimezone?: string | null;
}

const MAX_NOTE_LENGTH = 6000;
const MAX_SNIPPET_LENGTH = 700;
const GENERATED_SUMMARY_MARKER = 'Resumen de solicitud del cliente / Customer request summary';
const FOLLOW_UP_SUMMARY_MARKER = 'Resumen de seguimiento / Follow-up summary';

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

const normalizeDisplayWhitespace = (value: string): string => (
    value.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim()
);

const safeTimeZone = (value?: string | null): string => {
    const cleaned = cleanText(value, 80);
    if (!cleaned) return 'UTC';
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: cleaned }).format(new Date());
        return cleaned;
    } catch {
        return 'UTC';
    }
};

const formatHumanDateTime = (
    value?: string | null,
    locale: 'es' | 'en' = 'es',
    timeZone?: string | null,
): string => {
    const raw = cleanText(value, 250);
    if (!raw) return '';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;

    const formatted = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: safeTimeZone(timeZone),
    }).format(parsed);

    return normalizeDisplayWhitespace(locale === 'es' ? formatted.replace(',', ' a las') : formatted);
};

const contactIdentity = (contact?: ChatbotCustomerRequestContact | null): string => (
    uniqueNonEmpty([contact?.name, contact?.email, contact?.phone]).join(', ')
);

const readableUrgency = (value: string, locale: 'es' | 'en'): string => {
    const normalized = cleanText(value, 80)
        .split('|')[0]
        .replace(/\bscore\b.*$/i, '')
        .trim()
        .toLowerCase();
    if (!normalized || normalized === 'unknown') return '';

    const map: Record<string, { es: string; en: string }> = {
        urgent: { es: 'urgente', en: 'urgent' },
        high: { es: 'alta', en: 'high' },
        medium: { es: 'media', en: 'medium' },
        normal: { es: 'normal', en: 'normal' },
        low: { es: 'baja', en: 'low' },
    };
    return map[normalized]?.[locale] || cleanText(value, 80).split('|')[0].trim();
};

const formatConversationLine = (message: ChatbotCustomerRequestMessage, locale: 'es' | 'en'): string => {
    const text = cleanText(message.text, MAX_SNIPPET_LENGTH);
    if (!text) return '';
    const role = message.role === 'user'
        ? (locale === 'es' ? 'Cliente' : 'Customer')
        : message.role === 'model' || message.role === 'assistant'
            ? (locale === 'es' ? 'Asistente' : 'Assistant')
            : (locale === 'es' ? 'Mensaje' : 'Message');
    return `${role}: ${text}`;
};

const formatConversationContext = (
    messages: ChatbotCustomerRequestMessage[] = [],
    locale: 'es' | 'en',
): string => (
    messages
        .filter(message => cleanText(message.text, MAX_SNIPPET_LENGTH))
        .slice(-4)
        .map(message => formatConversationLine(message, locale))
        .filter(Boolean)
        .join(' | ')
);

const buildConversationalSummary = (input: {
    header: string;
    customer?: ChatbotCustomerRequestContact | null;
    request?: string | null;
    appointmentTitle?: string | null;
    appointmentDateTime?: string | null;
    appointmentTimezone?: string | null;
    urgency?: string | null;
    recommendedAction?: string | null;
    contextEs?: string | null;
    contextEn?: string | null;
}): string => {
    const customer = contactIdentity(input.customer);
    const request = cleanSentencePart(cleanText(input.request, 1400));
    const appointmentTitle = cleanSentencePart(cleanText(input.appointmentTitle, 250));
    const appointmentTimeEs = formatHumanDateTime(input.appointmentDateTime, 'es', input.appointmentTimezone);
    const appointmentTimeEn = formatHumanDateTime(input.appointmentDateTime, 'en', input.appointmentTimezone);
    const urgencyEs = readableUrgency(cleanText(input.urgency, 80), 'es');
    const urgencyEn = readableUrgency(cleanText(input.urgency, 80), 'en');
    const recommendedAction = cleanSentencePart(cleanText(input.recommendedAction, 1000));
    const contextEs = cleanSentencePart(cleanText(input.contextEs, 1800));
    const contextEn = cleanSentencePart(cleanText(input.contextEn, 1800));

    const customerEs = customer ? `El cliente ${customer}` : 'El cliente';
    const customerEn = customer ? `The customer ${customer}` : 'The customer';

    const spanishSummary = compactParagraph([
        request
            ? `${customerEs} quiere: ${request}`
            : `${customerEs} necesita seguimiento del equipo`,
        appointmentTitle || appointmentTimeEs
            ? `Cita: ${appointmentTitle || 'sin título'}${appointmentTimeEs ? ` para ${appointmentTimeEs}` : ''}`
            : '',
        urgencyEs ? `Prioridad: ${urgencyEs}` : '',
        recommendedAction ? `Próximo paso sugerido: ${recommendedAction}` : '',
        contextEs ? `Contexto de la conversación: ${contextEs}` : '',
    ]);

    const englishSummary = compactParagraph([
        request
            ? `${customerEn} wants: ${request}`
            : `${customerEn} needs team follow-up`,
        appointmentTitle || appointmentTimeEn
            ? `Appointment: ${appointmentTitle || 'untitled'}${appointmentTimeEn ? ` for ${appointmentTimeEn}` : ''}`
            : '',
        urgencyEn ? `Priority: ${urgencyEn}` : '',
        recommendedAction ? `Suggested next step: ${recommendedAction}` : '',
        contextEn ? `Conversation context: ${contextEn}` : '',
    ]);

    return [
        input.header,
        spanishSummary ? `ES: ${spanishSummary}` : '',
        englishSummary ? `EN: ${englishSummary}` : '',
    ].filter(Boolean).join('\n').slice(0, MAX_NOTE_LENGTH);
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
    const urgency = cleanText(intent.urgency || intent.urgencyLevel, 80) || 'unknown';
    const recommendedAction = cleanText(intent.recommendedAction, 1000);

    return buildConversationalSummary({
        header: GENERATED_SUMMARY_MARKER,
        customer: input.customer,
        request: primaryRequest,
        appointmentTitle: input.appointmentTitle,
        appointmentDateTime: input.appointmentDateTime,
        appointmentTimezone: input.appointmentTimezone,
        urgency,
        recommendedAction,
        contextEs: formatConversationContext(messages, 'es'),
        contextEn: formatConversationContext(messages, 'en'),
    });
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

const cleanSentencePart = (value: string): string => cleanText(value, 1400).replace(/\.+$/g, '').trim();

const finishSentence = (value: string): string => {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed) return '';
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const compactParagraph = (sentences: string[]): string => (
    sentences
        .map(finishSentence)
        .filter(Boolean)
        .join(' ')
        .slice(0, MAX_NOTE_LENGTH)
);

const looksConversationalGeneratedNote = (value: string): boolean => (
    (value.includes(GENERATED_SUMMARY_MARKER) || value.includes(FOLLOW_UP_SUMMARY_MARKER))
    && value.includes('ES:')
    && value.includes('EN:')
    && !value.includes('Lead ID:')
    && !value.includes('Generado en / Generated at:')
    && !value.includes('Fecha solicitada / Requested time:')
);

export const buildReadableChatbotCustomerRequestNote = (
    customerRequestNotes?: string | null,
    fallback?: string | null,
    options: BuildReadableChatbotCustomerRequestNoteOptions = {},
): string => {
    const raw = cleanNoteBlock(customerRequestNotes);
    if (!raw) return cleanNoteBlock(fallback);
    if (looksConversationalGeneratedNote(raw)) {
        return raw.includes(GENERATED_SUMMARY_MARKER)
            ? raw.replace(GENERATED_SUMMARY_MARKER, FOLLOW_UP_SUMMARY_MARKER)
            : raw;
    }
    if (!raw.includes(GENERATED_SUMMARY_MARKER)) return raw;

    const lines = raw
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    const optionCustomer = uniqueNonEmpty([
        options.customer?.name,
        options.customer?.email,
        options.customer?.phone,
    ]).join(' | ');
    const customer = valueAfterAnyLabel(lines, ['Cliente / Customer: ']) || optionCustomer;
    const request = valueAfterAnyLabel(lines, ['Lo que desea el cliente / What the customer wants: ']);
    const appointment = valueAfterAnyLabel(lines, ['Cita / Appointment: ']) || cleanText(options.appointmentTitle, 250);
    const requestedTime = valueAfterAnyLabel(lines, ['Fecha solicitada / Requested time: ']) || cleanText(options.appointmentDateTime, 250);
    const urgency = valueAfterAnyLabel(lines, ['Urgencia / Urgency: ']);
    const recommendedAction = valueAfterAnyLabel(lines, ['Accion recomendada / Recommended action: ']);
    const latestMessage = valueAfterAnyLabel(lines, ['Ultimo mensaje del cliente / Latest customer message: ']);
    const context = conversationContextFromSummary(lines) || latestMessage;

    return buildConversationalSummary({
        header: FOLLOW_UP_SUMMARY_MARKER,
        customer: {
            name: customer || null,
            email: null,
            phone: null,
        },
        request,
        appointmentTitle: appointment,
        appointmentDateTime: requestedTime,
        appointmentTimezone: options.appointmentTimezone,
        urgency,
        recommendedAction,
        contextEs: context,
        contextEn: context,
    });
};
