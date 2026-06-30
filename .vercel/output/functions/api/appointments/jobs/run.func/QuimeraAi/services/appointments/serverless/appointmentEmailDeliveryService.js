import { dispatchCrossModuleTransactionalEmail } from '../../email/serverless/emailCrossModuleDispatcher.js';
const DEFAULT_FROM_EMAIL = 'Quimera Ai <no-reply@quimera.ai>';
const DEFAULT_PRIMARY_COLOR = '#4f46e5';
const DEFAULT_LIMIT = 25;
const APPOINTMENT_EMAIL_FLOWS = new Set([
    'appointment_request_received',
    'appointment_confirmation',
    'appointment_cancellation',
    'appointment_follow_up',
    'appointment_reminder',
]);
const FLOW_SETTING_KEYS = {
    appointment_request_received: ['appointmentRequestReceived', 'appointment_request_received'],
    appointment_confirmation: ['appointmentConfirmation', 'appointment_confirmation'],
    appointment_cancellation: ['appointmentCancellation', 'appointment_cancellation'],
    appointment_follow_up: ['appointmentFollowUp', 'appointment_follow_up'],
    appointment_reminder: ['appointmentReminder', 'appointment_reminder'],
};
const SUBJECTS = {
    en: {
        appointment_request_received: 'Appointment request received: {{title}}',
        appointment_confirmation: 'Appointment confirmed: {{title}}',
        appointment_cancellation: 'Appointment cancelled: {{title}}',
        appointment_follow_up: 'Follow up for your appointment: {{title}}',
        appointment_reminder: 'Appointment reminder: {{title}}',
    },
    es: {
        appointment_request_received: 'Solicitud de cita recibida: {{title}}',
        appointment_confirmation: 'Cita confirmada: {{title}}',
        appointment_cancellation: 'Cita cancelada: {{title}}',
        appointment_follow_up: 'Seguimiento de tu cita: {{title}}',
        appointment_reminder: 'Recordatorio de cita: {{title}}',
    },
};
const EMAIL_COPY = {
    en: {
        labels: {
            greeting: 'Hi {{name}},',
            fallbackName: 'there',
            appointment: 'Appointment',
            starts: 'Starts',
            ends: 'Ends',
            timezone: 'Timezone',
            details: 'Details',
            payment: 'Payment',
            noEndTime: 'End time to be confirmed',
            replyHelp: 'Reply to this email if you need to update the appointment details.',
        },
        flows: {
            appointment_request_received: {
                preheader: 'We received your appointment request.',
                intro: 'We received your appointment request.',
                nextStep: 'The team will review availability and confirm the final time.',
                footer: 'You will receive another message once the appointment is confirmed.',
            },
            appointment_confirmation: {
                preheader: 'Your appointment is confirmed.',
                intro: 'Your appointment is confirmed.',
                nextStep: 'The team will be ready with the appointment context and linked CRM notes.',
                footer: 'Please arrive on time or reply if you need to reschedule.',
            },
            appointment_cancellation: {
                preheader: 'Your appointment has been cancelled.',
                intro: 'Your appointment has been cancelled.',
                nextStep: 'Reply to this email if you want to request a new time.',
                footer: 'No further action is required unless you want to reschedule.',
            },
            appointment_follow_up: {
                preheader: 'Follow up for your appointment.',
                intro: 'Thanks for attending your appointment.',
                nextStep: 'The team can continue the conversation from the linked CRM record.',
                footer: 'Reply with any questions or next steps you want us to track.',
            },
            appointment_reminder: {
                preheader: 'Reminder for your upcoming appointment.',
                intro: 'This is a reminder for your upcoming appointment.',
                nextStep: 'The team has the appointment context prepared.',
                footer: 'Reply to this email if you need to update the time.',
            },
        },
    },
    es: {
        labels: {
            greeting: 'Hola {{name}},',
            fallbackName: 'equipo',
            appointment: 'Cita',
            starts: 'Comienza',
            ends: 'Termina',
            timezone: 'Zona horaria',
            details: 'Detalles',
            payment: 'Pago',
            noEndTime: 'Hora de cierre por confirmar',
            replyHelp: 'Responde a este email si necesitas actualizar los detalles de la cita.',
        },
        flows: {
            appointment_request_received: {
                preheader: 'Recibimos tu solicitud de cita.',
                intro: 'Recibimos tu solicitud de cita.',
                nextStep: 'El equipo revisará la disponibilidad y confirmará el horario final.',
                footer: 'Recibirás otro mensaje cuando la cita quede confirmada.',
            },
            appointment_confirmation: {
                preheader: 'Tu cita está confirmada.',
                intro: 'Tu cita está confirmada.',
                nextStep: 'El equipo tendrá listo el contexto de la cita y las notas vinculadas del CRM.',
                footer: 'Llega a tiempo o responde si necesitas reprogramar.',
            },
            appointment_cancellation: {
                preheader: 'Tu cita fue cancelada.',
                intro: 'Tu cita fue cancelada.',
                nextStep: 'Responde a este email si quieres solicitar un nuevo horario.',
                footer: 'No necesitas hacer nada mas a menos que quieras reprogramar.',
            },
            appointment_follow_up: {
                preheader: 'Seguimiento de tu cita.',
                intro: 'Gracias por asistir a tu cita.',
                nextStep: 'El equipo puede continuar la conversación desde el registro vinculado del CRM.',
                footer: 'Responde con cualquier pregunta o próximo paso que quieras que registremos.',
            },
            appointment_reminder: {
                preheader: 'Recordatorio para tu próxima cita.',
                intro: 'Este es un recordatorio de tu próxima cita.',
                nextStep: 'El equipo tiene preparado el contexto de la cita.',
                footer: 'Responde a este email si necesitas actualizar el horario.',
            },
        },
    },
};
export function createResendAppointmentEmailProvider(apiKey) {
    if (!apiKey)
        return undefined;
    return {
        async send(input) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    from: input.from,
                    to: input.to,
                    subject: input.subject,
                    html: input.html,
                    text: input.text,
                    reply_to: input.replyTo,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(String(data?.message || data?.error || 'Email provider request failed'));
            }
            return { providerMessageId: data?.id ? String(data.id) : undefined };
        },
    };
}
export async function processAppointmentEmailLogs(client, options = {}) {
    const now = toIso(options.now);
    const limit = normalizeLimit(options.limit);
    const provider = options.provider || createResendAppointmentEmailProvider(options.resendApiKey);
    const summary = {
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        deferred: 0,
        ignored: 0,
        results: [],
    };
    const { data, error } = await client
        .from('email_logs')
        .select('*')
        .in('status', ['queued', 'scheduled'])
        .eq('provider', 'resend')
        .contains('metadata', { triggeredBy: 'appointments-engine', sourceModule: 'appointments' })
        .limit(limit);
    if (error)
        throw error;
    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
        summary.processed += 1;
        const result = await processAppointmentEmailLog(client, row, {
            now,
            provider,
            defaultFromEmail: options.defaultFromEmail || DEFAULT_FROM_EMAIL,
        });
        summary.results.push(result);
        summary[result.status] += 1;
    }
    return summary;
}
async function processAppointmentEmailLog(client, row, options) {
    const metadata = normalizeRecord(row.metadata);
    const flowType = normalizeFlowType(row.type || row.template_id);
    const baseResult = {
        logId: row.id || undefined,
        flowType,
        recipientEmail: normalizeEmail(row.recipient_email),
    };
    if (!flowType) {
        return { ...baseResult, status: 'ignored', reason: 'Unsupported appointment email flow' };
    }
    if (!isAppointmentEngineLog(metadata)) {
        return { ...baseResult, status: 'ignored', reason: 'Email log is not owned by Appointments Engine' };
    }
    if (isFutureScheduledLog(row, metadata, options.now)) {
        return { ...baseResult, status: 'deferred', reason: 'Scheduled send time has not arrived' };
    }
    const recipientEmail = normalizeEmail(row.recipient_email);
    if (!isValidEmail(recipientEmail)) {
        await markEmailLog(client, row, {
            status: 'skipped',
            error_message: 'Missing or invalid recipient email',
            error_code: 'invalid_recipient',
            metadata: withDeliveryMetadata(metadata, options.now, 'skipped'),
        });
        return { ...baseResult, status: 'skipped', reason: 'Missing or invalid recipient email' };
    }
    try {
        const settings = await getAppointmentEmailSettings(client, row.project_id || row.store_id);
        const decision = shouldSendAppointmentEmail(flowType, settings, options.provider);
        if (!decision.shouldSend) {
            if (decision.retryable) {
                await markEmailLog(client, row, {
                    error_message: decision.reason,
                    error_code: decision.errorCode,
                    metadata: withDeliveryMetadata(metadata, options.now, 'deferred'),
                });
                return {
                    ...baseResult,
                    status: 'deferred',
                    reason: decision.reason,
                };
            }
            await markEmailLog(client, row, {
                status: 'skipped',
                error_message: decision.reason,
                error_code: decision.errorCode,
                metadata: withDeliveryMetadata(metadata, options.now, 'skipped'),
            });
            return {
                ...baseResult,
                status: 'skipped',
                reason: decision.reason,
            };
        }
        const rendered = renderAppointmentEmail({
            row,
            flowType,
            settings,
            defaultFromEmail: options.defaultFromEmail,
        });
        const idempotencyKey = stringOrUndefined(metadata.idempotencyKey)
            || stringOrUndefined(row.idempotency_key)
            || `appointments:${stringOrUndefined(metadata.appointmentId) || row.id}:${flowType}:${stringOrUndefined(metadata.eventId) || options.now}`;
        await ensureCanonicalLogFields(client, row, metadata, flowType, idempotencyKey);
        const delivery = await dispatchCrossModuleTransactionalEmail({
            supabase: client,
            provider: toCanonicalProvider(options.provider),
            projectId: String(row.project_id || row.store_id || metadata.projectId || ''),
            userId: row.user_id || null,
            type: flowType,
            recipientEmail,
            recipientName: row.recipient_name || null,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            idempotencyKey,
            scheduledAt: stringOrUndefined(metadata.sendAt) || options.now,
            sourceModule: stringOrUndefined(row.source_module || metadata.sourceModule) || 'appointments',
            sourceComponent: stringOrUndefined(row.source_component || metadata.sourceComponent),
            sourceEvent: stringOrUndefined(row.source_event || metadata.eventType) || flowType,
            sourceEntityType: 'appointment',
            sourceEntityId: stringOrUndefined(row.source_entity_id || metadata.appointmentId) || row.lead_id || row.id || undefined,
            metadata: withDeliveryMetadata(metadata, options.now, 'queued', {
                bodyKey: `appointmentBooking.emailBodies.${flowType}`,
            }),
        });
        if (delivery.status === 'sent') {
            await markEmailLog(client, row, {
                status: 'sent',
                subject: rendered.subject,
                sent_at: options.now,
                provider_message_id: delivery.providerMessageId || null,
                error_message: null,
                error_code: null,
                metadata: withDeliveryMetadata(metadata, options.now, 'sent', {
                    providerMessageId: delivery.providerMessageId,
                    bodyKey: `appointmentBooking.emailBodies.${flowType}`,
                    canonicalOutbox: true,
                }),
            });
            return {
                ...baseResult,
                status: 'sent',
                providerMessageId: delivery.providerMessageId,
            };
        }
        if (delivery.status === 'skipped') {
            await markEmailLog(client, row, {
                status: 'skipped',
                subject: rendered.subject,
                error_message: delivery.reason || null,
                error_code: 'canonical_email_skipped',
                metadata: withDeliveryMetadata(metadata, options.now, 'skipped', {
                    bodyKey: `appointmentBooking.emailBodies.${flowType}`,
                    canonicalOutbox: true,
                }),
            });
            return { ...baseResult, status: 'skipped', reason: delivery.reason };
        }
        if (delivery.status === 'failed') {
            await markEmailLog(client, row, {
                status: 'failed',
                subject: rendered.subject,
                error_message: delivery.reason || 'Canonical email delivery failed',
                error_code: 'canonical_email_failed',
                metadata: withDeliveryMetadata(metadata, options.now, 'failed', {
                    bodyKey: `appointmentBooking.emailBodies.${flowType}`,
                    canonicalOutbox: true,
                }),
            });
            return { ...baseResult, status: 'failed', reason: delivery.reason };
        }
        await markEmailLog(client, row, {
            subject: rendered.subject,
            error_message: delivery.reason || null,
            error_code: delivery.status === 'deferred' ? 'canonical_email_deferred' : null,
            metadata: withDeliveryMetadata(metadata, options.now, 'deferred', {
                bodyKey: `appointmentBooking.emailBodies.${flowType}`,
                canonicalOutbox: true,
            }),
        });
        return { ...baseResult, status: 'deferred', reason: delivery.reason || 'Queued in canonical email outbox' };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markEmailLog(client, row, {
            status: 'failed',
            error_message: message,
            error_code: 'provider_send_failed',
            metadata: withDeliveryMetadata(metadata, options.now, 'failed'),
        });
        return { ...baseResult, status: 'failed', reason: message };
    }
}
async function getAppointmentEmailSettings(client, projectId) {
    if (!projectId)
        return normalizeEmailSettings(null);
    const { data, error } = await client
        .from('email_settings')
        .select('*')
        .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
        .limit(1)
        .maybeSingle();
    if (error)
        throw error;
    return normalizeEmailSettings(data);
}
function shouldSendAppointmentEmail(flowType, settings, provider) {
    if (!settings.exists || !settings.enabled) {
        return {
            shouldSend: false,
            reason: 'Email settings are not configured',
            errorCode: 'email_settings_missing',
        };
    }
    if (settings.provider !== 'resend') {
        return {
            shouldSend: false,
            reason: `Unsupported email provider: ${settings.provider}`,
            errorCode: 'unsupported_provider',
        };
    }
    if (!settings.apiKeyConfigured) {
        return {
            shouldSend: false,
            reason: 'Email provider is not configured',
            errorCode: 'email_provider_unconfigured',
        };
    }
    if (!provider) {
        return {
            shouldSend: false,
            reason: 'Email provider sender is not available in this runtime',
            errorCode: 'email_provider_missing',
            retryable: true,
        };
    }
    const transactional = settings.transactional || {};
    if (transactional.appointments === false || transactional.appointmentEmails === false) {
        return {
            shouldSend: false,
            reason: 'Appointment emails are disabled',
            errorCode: 'appointment_emails_disabled',
        };
    }
    const disabled = FLOW_SETTING_KEYS[flowType].some(key => transactional[key] === false);
    if (disabled) {
        return {
            shouldSend: false,
            reason: `${flowType} is disabled`,
            errorCode: 'appointment_email_flow_disabled',
        };
    }
    if (settings.appointmentTemplates[flowType]?.enabled === false) {
        return {
            shouldSend: false,
            reason: `${flowType} template is disabled`,
            errorCode: 'appointment_email_template_disabled',
        };
    }
    return { shouldSend: true };
}
function renderAppointmentEmail(input) {
    const metadata = normalizeRecord(input.row.metadata);
    const locale = normalizeLocale(metadata.locale);
    const copy = EMAIL_COPY[locale];
    const flow = copy.flows[input.flowType];
    const title = readAppointmentTitle(input.row, metadata, locale);
    const name = input.row.recipient_name || copy.labels.fallbackName;
    const timezone = stringOrUndefined(metadata.timezone);
    const startDate = stringOrUndefined(metadata.startDate);
    const endDate = stringOrUndefined(metadata.endDate);
    const paymentStatus = stringOrUndefined(metadata.paymentStatus);
    const ecommerceOrderId = stringOrUndefined(metadata.ecommerceOrderId || input.row.order_id);
    const template = input.settings.appointmentTemplates[input.flowType] || {};
    const details = [
        `${copy.labels.appointment}: ${title}`,
        startDate ? `${copy.labels.starts}: ${formatDateTime(startDate, locale, timezone)}` : '',
        endDate ? `${copy.labels.ends}: ${formatDateTime(endDate, locale, timezone)}` : `${copy.labels.ends}: ${copy.labels.noEndTime}`,
        timezone ? `${copy.labels.timezone}: ${timezone}` : '',
        paymentStatus ? `${copy.labels.payment}: ${paymentStatus}${ecommerceOrderId ? ` (${ecommerceOrderId})` : ''}` : '',
    ].filter(Boolean);
    const variables = {
        title,
        name,
        start: startDate ? formatDateTime(startDate, locale, timezone) : '',
        end: endDate ? formatDateTime(endDate, locale, timezone) : copy.labels.noEndTime,
        timezone: timezone || '',
        paymentStatus: paymentStatus || '',
        ecommerceOrderId: ecommerceOrderId || '',
        flowType: input.flowType,
        projectName: stringOrUndefined(metadata.projectName) || '',
    };
    const subject = input.row.subject
        || renderTemplateString(template.subject, variables)
        || SUBJECTS[locale][input.flowType].replace('{{title}}', title);
    const preheader = renderTemplateString(template.preheader, variables) || flow.preheader;
    const intro = renderTemplateString(template.intro, variables) || flow.intro;
    const nextStep = renderTemplateString(template.nextStep, variables) || flow.nextStep;
    const footer = renderTemplateString(template.footer, variables) || flow.footer;
    const text = [
        renderTemplateString(template.text, variables) || preheader,
        '',
        copy.labels.greeting.replace('{{name}}', name),
        intro,
        nextStep,
        '',
        `${copy.labels.details}:`,
        ...details.map(line => `- ${line}`),
        '',
        copy.labels.replyHelp,
        footer,
        input.settings.footerText || '',
    ].filter(Boolean).join('\n');
    const customHtml = renderTemplateString(template.html, variables);
    return {
        subject,
        text,
        html: customHtml || renderSimpleHtml({
            subject,
            preheader,
            body: text,
            primaryColor: template.primaryColor || input.settings.primaryColor,
        }),
    };
}
async function markEmailLog(client, row, patch) {
    if (!row.id)
        return;
    const { error } = await client
        .from('email_logs')
        .update({
        ...patch,
        updated_at: patch.updated_at || new Date().toISOString(),
    })
        .eq('id', row.id);
    if (error)
        throw error;
}
async function ensureCanonicalLogFields(client, row, metadata, flowType, idempotencyKey) {
    if (!row.id)
        return;
    const patch = {};
    if (!row.idempotency_key)
        patch.idempotency_key = idempotencyKey;
    if (!row.email_kind)
        patch.email_kind = 'transactional';
    if (!row.source_module)
        patch.source_module = stringOrUndefined(metadata.sourceModule) || 'appointments';
    if (!row.source_component && stringOrUndefined(metadata.sourceComponent)) {
        patch.source_component = stringOrUndefined(metadata.sourceComponent);
    }
    if (!row.source_event)
        patch.source_event = stringOrUndefined(metadata.eventType) || flowType;
    if (!row.source_entity_type)
        patch.source_entity_type = 'appointment';
    if (!row.source_entity_id)
        patch.source_entity_id = stringOrUndefined(metadata.appointmentId) || row.id;
    if (!row.correlation_id)
        patch.correlation_id = stringOrUndefined(metadata.correlationId) || idempotencyKey;
    if (Object.keys(patch).length === 0)
        return;
    await markEmailLog(client, row, patch);
    Object.assign(row, patch);
}
function normalizeEmailSettings(row) {
    const data = normalizeRecord(row);
    return {
        exists: Boolean(row),
        enabled: Boolean(row),
        provider: String(data.provider || 'resend'),
        apiKeyConfigured: data.api_key_configured === true || data.apiKeyConfigured === true,
        fromEmail: normalizeEmail(data.from_email || data.fromEmail),
        fromName: stringOrUndefined(data.from_name || data.fromName),
        replyTo: normalizeEmail(data.reply_to || data.replyTo),
        primaryColor: stringOrUndefined(data.primary_color || data.primaryColor) || DEFAULT_PRIMARY_COLOR,
        footerText: stringOrUndefined(data.footer_text || data.footerText),
        transactional: normalizeRecord(data.transactional),
        appointmentTemplates: normalizeAppointmentTemplates(normalizeRecord(data.transactional).appointmentTemplates),
    };
}
function resolveFrom(settings, defaultFromEmail) {
    const fromEmail = settings.fromEmail || defaultFromEmail;
    if (!settings.fromEmail)
        return defaultFromEmail;
    return settings.fromName ? `${settings.fromName} <${fromEmail}>` : fromEmail;
}
function toCanonicalProvider(provider) {
    if (!provider)
        return undefined;
    return {
        name: 'resend',
        send: provider.send,
    };
}
function isAppointmentEngineLog(metadata) {
    return metadata.triggeredBy === 'appointments-engine' && metadata.sourceModule === 'appointments';
}
function isFutureScheduledLog(row, metadata, now) {
    if (row.status !== 'scheduled')
        return false;
    const sendAt = stringOrUndefined(metadata.sendAt);
    if (!sendAt)
        return false;
    return new Date(sendAt).getTime() > new Date(now).getTime();
}
function withDeliveryMetadata(metadata, at, status, extra = {}) {
    return {
        ...metadata,
        delivery: {
            ...normalizeRecord(metadata.delivery),
            ...extra,
            provider: 'resend',
            status,
            processedAt: at,
        },
    };
}
function normalizeFlowType(value) {
    if (!value)
        return undefined;
    return APPOINTMENT_EMAIL_FLOWS.has(value)
        ? value
        : undefined;
}
function normalizeAppointmentTemplates(value) {
    const templates = normalizeRecord(value);
    return Object.fromEntries(Object.entries(templates).map(([key, template]) => {
        const data = normalizeRecord(template);
        return [key, {
                enabled: data.enabled !== false,
                subject: stringOrUndefined(data.subject),
                preheader: stringOrUndefined(data.preheader),
                intro: stringOrUndefined(data.intro),
                nextStep: stringOrUndefined(data.nextStep),
                footer: stringOrUndefined(data.footer),
                html: stringOrUndefined(data.html),
                text: stringOrUndefined(data.text),
                primaryColor: stringOrUndefined(data.primaryColor),
            }];
    }));
}
function renderTemplateString(value, variables) {
    const template = stringOrUndefined(value);
    if (!template)
        return '';
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => variables[key] || '');
}
function readAppointmentTitle(row, metadata, locale) {
    const i18n = normalizeRecord(metadata.i18n);
    const params = normalizeRecord(i18n.params);
    return stringOrUndefined(metadata.title)
        || stringOrUndefined(params.title)
        || stringOrUndefined(metadata.appointmentTitle)
        || SUBJECTS[locale].appointment_reminder.replace('{{title}}', '').trim()
        || 'Appointment';
}
function renderSimpleHtml(input) {
    const paragraphs = input.body
        .split('\n')
        .map(line => line.trim())
        .map(line => {
        if (!line)
            return '<br />';
        if (line.startsWith('- '))
            return `<li>${escapeHtml(line.slice(2))}</li>`;
        return `<p>${escapeHtml(line)}</p>`;
    })
        .join('\n');
    return [
        '<!doctype html>',
        '<html>',
        '<body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">',
        `<span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>`,
        '<main style="max-width:640px;margin:0 auto;padding:32px 16px;">',
        '<section style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">',
        `<div style="width:40px;height:4px;background:${escapeHtml(input.primaryColor)};border-radius:999px;margin-bottom:20px;"></div>`,
        `<h1 style="font-size:22px;line-height:1.3;margin:0 0 18px;">${escapeHtml(input.subject)}</h1>`,
        paragraphs.replace(/<\/li>\n<li>/g, '</li><li>'),
        '</section>',
        '</main>',
        '</body>',
        '</html>',
    ].join('');
}
function formatDateTime(value, locale, timezone) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    try {
        return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: timezone || undefined,
        }).format(date);
    }
    catch (_error) {
        return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    }
}
function toIso(value) {
    if (!value)
        return new Date().toISOString();
    if (value instanceof Date)
        return value.toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
function normalizeLimit(value) {
    if (!Number.isFinite(value))
        return DEFAULT_LIMIT;
    return Math.max(1, Math.min(100, Math.floor(value || DEFAULT_LIMIT)));
}
function normalizeLocale(value) {
    if (typeof value !== 'string')
        return 'es';
    return value.toLowerCase().split('-')[0] === 'en' ? 'en' : 'es';
}
function normalizeRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function stringOrUndefined(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
//# sourceMappingURL=appointmentEmailDeliveryService.js.map