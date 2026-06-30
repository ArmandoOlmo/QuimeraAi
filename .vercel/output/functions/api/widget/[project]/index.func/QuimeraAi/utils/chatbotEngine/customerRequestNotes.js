const MAX_NOTE_LENGTH = 6000;
const MAX_SNIPPET_LENGTH = 700;
const GENERATED_SUMMARY_MARKER = 'Resumen de solicitud del cliente / Customer request summary';
const FOLLOW_UP_SUMMARY_MARKER = 'Resumen de seguimiento / Follow-up summary';
const SPANISH_SECTION_TITLE = 'Español / Spanish';
const ENGLISH_SECTION_TITLE = 'English / Inglés';
const cleanText = (value, maxLength = 1200) => {
    if (typeof value !== 'string')
        return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};
const cleanNoteBlock = (value, maxLength = MAX_NOTE_LENGTH) => {
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
const formatRole = (role) => {
    if (role === 'user')
        return 'Cliente / Customer';
    if (role === 'model' || role === 'assistant')
        return 'Asistente / Assistant';
    return role || 'Mensaje / Message';
};
const uniqueNonEmpty = (values) => {
    const seen = new Set();
    return values
        .map(value => cleanText(value, 500))
        .filter(value => {
        if (!value || seen.has(value.toLowerCase()))
            return false;
        seen.add(value.toLowerCase());
        return true;
    });
};
const normalizeDisplayWhitespace = (value) => (value.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim());
const stripLanguagePrefix = (value) => (value.replace(/^(ES|EN)\s*:\s*/i, '').trim());
const safeTimeZone = (value) => {
    const cleaned = cleanText(value, 80);
    if (!cleaned)
        return 'UTC';
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: cleaned }).format(new Date());
        return cleaned;
    }
    catch {
        return 'UTC';
    }
};
const formatHumanDateTime = (value, locale = 'es', timeZone) => {
    const raw = cleanText(value, 250);
    if (!raw)
        return '';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()))
        return raw;
    const formatted = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: safeTimeZone(timeZone),
    }).format(parsed);
    return normalizeDisplayWhitespace(locale === 'es' ? formatted.replace(',', ' a las') : formatted);
};
const contactIdentity = (contact) => (uniqueNonEmpty([contact?.name, contact?.email, contact?.phone]).join(', '));
const readableUrgency = (value, locale) => {
    const normalized = cleanText(value, 80)
        .split('|')[0]
        .replace(/\bscore\b.*$/i, '')
        .trim()
        .toLowerCase();
    if (!normalized || normalized === 'unknown')
        return '';
    const map = {
        urgent: { es: 'urgente', en: 'urgent' },
        high: { es: 'alta', en: 'high' },
        medium: { es: 'media', en: 'medium' },
        normal: { es: 'normal', en: 'normal' },
        low: { es: 'baja', en: 'low' },
    };
    return map[normalized]?.[locale] || cleanText(value, 80).split('|')[0].trim();
};
const formatConversationLine = (message, locale) => {
    const text = cleanText(message.text, MAX_SNIPPET_LENGTH);
    if (!text)
        return '';
    const role = message.role === 'user'
        ? (locale === 'es' ? 'Cliente' : 'Customer')
        : message.role === 'model' || message.role === 'assistant'
            ? (locale === 'es' ? 'Asistente' : 'Assistant')
            : (locale === 'es' ? 'Mensaje' : 'Message');
    return `${role}: ${text}`;
};
const formatConversationContext = (messages = [], locale) => (messages
    .filter(message => cleanText(message.text, MAX_SNIPPET_LENGTH))
    .slice(-4)
    .map(message => formatConversationLine(message, locale))
    .filter(Boolean)
    .join('\n'));
const splitContextLines = (value) => {
    const block = cleanNoteBlock(value, 1800);
    if (!block)
        return [];
    return block
        .split(/\n|\s+\|\s+/)
        .map(line => cleanSentencePart(line))
        .filter(Boolean)
        .slice(0, 4);
};
const bullet = (label, value) => {
    const cleaned = cleanSentencePart(cleanText(value, 1600));
    if (!cleaned)
        return '';
    return `- ${label}: ${finishSentence(cleaned)}`;
};
const bulletGroup = (label, lines) => {
    if (!lines.length)
        return [];
    return [
        `- ${label}:`,
        ...lines.map(line => `  - ${finishSentence(line)}`),
    ];
};
const buildConversationalSummary = (input) => {
    const customer = contactIdentity(input.customer);
    const request = stripLanguagePrefix(cleanSentencePart(cleanText(input.request, 1400)));
    const appointmentTitle = cleanSentencePart(cleanText(input.appointmentTitle, 250));
    const appointmentTimeEs = formatHumanDateTime(input.appointmentDateTime, 'es', input.appointmentTimezone);
    const appointmentTimeEn = formatHumanDateTime(input.appointmentDateTime, 'en', input.appointmentTimezone);
    const urgencyEs = readableUrgency(cleanText(input.urgency, 80), 'es');
    const urgencyEn = readableUrgency(cleanText(input.urgency, 80), 'en');
    const recommendedAction = stripLanguagePrefix(cleanSentencePart(cleanText(input.recommendedAction, 1000)));
    const contextEs = splitContextLines(input.contextEs);
    const contextEn = splitContextLines(input.contextEn);
    const spanishBullets = [
        bullet('Cliente', customer || 'No especificado'),
        bullet('Lo que desea', request || 'Necesita seguimiento del equipo'),
        bullet('Cita', appointmentTitle),
        bullet('Fecha y hora', appointmentTimeEs),
        bullet('Prioridad', urgencyEs),
        bullet('Próximo paso sugerido', recommendedAction),
        ...bulletGroup('Contexto de la conversación', contextEs),
    ].filter(Boolean);
    const englishBullets = [
        bullet('Customer', customer || 'Not specified'),
        bullet('Request', request || 'Needs team follow-up'),
        bullet('Appointment', appointmentTitle),
        bullet('Date and time', appointmentTimeEn),
        bullet('Priority', urgencyEn),
        bullet('Suggested next step', recommendedAction),
        ...bulletGroup('Conversation context', contextEn),
    ].filter(Boolean);
    return [
        input.header,
        '',
        SPANISH_SECTION_TITLE,
        '',
        ...spanishBullets,
        '',
        ENGLISH_SECTION_TITLE,
        '',
        ...englishBullets,
    ].join('\n').trim().slice(0, MAX_NOTE_LENGTH);
};
const latestUserMessage = (messages = []) => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message?.role === 'user') {
            const text = cleanText(message.text, MAX_SNIPPET_LENGTH);
            if (text)
                return text;
        }
    }
    return '';
};
const formatConversationSnapshot = (messages = []) => (messages
    .filter(message => cleanText(message.text, MAX_SNIPPET_LENGTH))
    .slice(-8)
    .map(message => `- ${formatRole(message.role)}: ${cleanText(message.text, MAX_SNIPPET_LENGTH)}`)
    .join('\n'));
export const buildChatbotCustomerRequestNotes = (input) => {
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
export const appendChatbotCustomerRequestNotes = (existingNotes, customerRequestNotes) => {
    const existing = cleanNoteBlock(existingNotes);
    const next = cleanNoteBlock(customerRequestNotes);
    if (!next)
        return existing;
    if (!existing)
        return next;
    const dedupeNeedle = next.slice(0, 160);
    if (dedupeNeedle && existing.includes(dedupeNeedle))
        return existing;
    return `${existing}\n\n${next}`.slice(0, MAX_NOTE_LENGTH);
};
const valueAfterAnyLabel = (lines, labels) => {
    for (const line of lines) {
        for (const label of labels) {
            if (line.startsWith(label))
                return cleanText(line.slice(label.length), 1400);
        }
    }
    return '';
};
const conversationContextFromSummary = (lines) => {
    const index = lines.findIndex(line => line.startsWith('Resumen de conversacion / Conversation snapshot:'));
    if (index < 0)
        return '';
    return lines
        .slice(index + 1)
        .filter(line => line.startsWith('- '))
        .map(line => line.replace(/^-+\s*/, ''))
        .map(line => line.replace(/^Cliente \/ Customer:\s*/i, 'Cliente: '))
        .map(line => line.replace(/^Asistente \/ Assistant:\s*/i, 'Asistente: '))
        .slice(0, 3)
        .join(' | ');
};
const cleanSentencePart = (value) => cleanText(value, 1400).replace(/\.+$/g, '').trim();
const finishSentence = (value) => {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed)
        return '';
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};
const compactParagraph = (sentences) => (sentences
    .map(finishSentence)
    .filter(Boolean)
    .join(' ')
    .slice(0, MAX_NOTE_LENGTH));
const looksDocumentFormattedGeneratedNote = (value) => ((value.includes(GENERATED_SUMMARY_MARKER) || value.includes(FOLLOW_UP_SUMMARY_MARKER))
    && value.includes(SPANISH_SECTION_TITLE)
    && value.includes(ENGLISH_SECTION_TITLE)
    && value.includes('- Lo que desea:')
    && value.includes('- Request:')
    && !value.includes('Lead ID:')
    && !value.includes('Generado en / Generated at:')
    && !value.includes('Fecha solicitada / Requested time:'));
const extractBetween = (value, start, endLabels) => {
    const startIndex = value.toLowerCase().indexOf(start.toLowerCase());
    if (startIndex < 0)
        return '';
    const afterStart = value.slice(startIndex + start.length);
    const endIndexes = endLabels
        .map(label => afterStart.toLowerCase().indexOf(label.toLowerCase()))
        .filter(index => index >= 0);
    const endIndex = endIndexes.length ? Math.min(...endIndexes) : afterStart.length;
    return cleanSentencePart(afterStart.slice(0, endIndex));
};
const extractCompactSummaryValue = (lines, labels) => {
    const line = valueAfterAnyLabel(lines, labels);
    if (!line)
        return '';
    return extractBetween(line, 'quiere:', [
        'Cita:',
        'Prioridad:',
        'Próximo paso sugerido:',
        'Contexto de la conversación:',
    ]) || extractBetween(line, 'wants:', [
        'Appointment:',
        'Priority:',
        'Suggested next step:',
        'Conversation context:',
    ]) || line;
};
const extractCompactCustomer = (lines) => {
    const line = valueAfterAnyLabel(lines, ['ES: ', 'EN: ']);
    if (!line)
        return '';
    return extractBetween(line, 'El cliente ', [' quiere:', ' necesita:'])
        || extractBetween(line, 'The customer ', [' wants:', ' needs:']);
};
export const buildReadableChatbotCustomerRequestNote = (customerRequestNotes, fallback, options = {}) => {
    const raw = cleanNoteBlock(customerRequestNotes);
    if (!raw)
        return cleanNoteBlock(fallback);
    if (looksDocumentFormattedGeneratedNote(raw)) {
        return raw.includes(GENERATED_SUMMARY_MARKER)
            ? raw.replace(GENERATED_SUMMARY_MARKER, FOLLOW_UP_SUMMARY_MARKER)
            : raw;
    }
    if (!raw.includes(GENERATED_SUMMARY_MARKER))
        return raw;
    const lines = raw
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    const optionCustomer = uniqueNonEmpty([
        options.customer?.name,
        options.customer?.email,
        options.customer?.phone,
    ]).join(' | ');
    const customer = valueAfterAnyLabel(lines, ['Cliente / Customer: ']) || extractCompactCustomer(lines) || optionCustomer;
    const request = valueAfterAnyLabel(lines, ['Lo que desea el cliente / What the customer wants: '])
        || extractCompactSummaryValue(lines, ['ES: ', 'EN: ']);
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
//# sourceMappingURL=customerRequestNotes.js.map