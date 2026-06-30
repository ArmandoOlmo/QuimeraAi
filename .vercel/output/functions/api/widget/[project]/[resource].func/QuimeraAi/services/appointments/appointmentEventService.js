const MAX_STORED_EVENTS = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_SUBJECTS = {
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
const normalizeLocale = (value) => {
    if (typeof value !== 'string')
        return 'es';
    const locale = value.toLowerCase().split('-')[0];
    return locale === 'en' ? 'en' : 'es';
};
const normalizeRecord = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const timestampToIso = (value) => {
    if (!value || typeof value.seconds !== 'number')
        return undefined;
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
const firstParticipant = (appointment) => appointment.participants?.find(participant => (participant.email || participant.phone || participant.name)) || appointment.participants?.[0];
const renderSubject = (flowType, title, locale) => {
    const normalizedLocale = normalizeLocale(locale);
    return EMAIL_SUBJECTS[normalizedLocale][flowType].replace('{{title}}', title || 'Appointment');
};
const subjectKeyForFlow = (flowType) => `appointmentBooking.emailSubjects.${flowType}`;
const isUuid = (value) => !!value && UUID_RE.test(value);
const normalizeEventSourceModule = (value) => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized ? normalized : undefined;
};
const getEventSourceModule = (appointment) => {
    const sourceModule = normalizeEventSourceModule(appointment.sourceModule);
    if (sourceModule === 'chatcore' || appointment.sourceComponent === 'ChatCore')
        return 'chatcore';
    if (appointment.source === 'chatbot' || sourceModule === 'chatbot')
        return 'chatbot';
    if (appointment.source === 'public_booking')
        return sourceModule || 'website-builder';
    return sourceModule || 'appointments';
};
const buildIntegrationEvent = (appointment, options, createdAt) => ({
    id: `appointment-event:${appointment.id}:${options.eventType}:${createdAt}`,
    projectId: appointment.projectId || '',
    tenantId: appointment.tenantId,
    sourceModule: getEventSourceModule(appointment),
    eventType: options.eventType,
    entityType: 'appointment',
    entityId: appointment.id,
    createdAt,
    createdBy: options.actorId || appointment.updatedBy || appointment.createdBy || undefined,
    correlationId: appointment.correlationId,
    payload: {
        appointmentId: appointment.id,
        title: appointment.title,
        status: appointment.status,
        source: appointment.source,
        sourceComponent: appointment.sourceComponent,
        sourceModule: appointment.sourceModule,
        sourceConversationId: appointment.sourceConversationId,
        sourceLeadId: appointment.sourceLeadId,
        linkedLeadIds: appointment.linkedLeadIds || [],
        bookingServiceId: appointment.bookingServiceId,
        ecommerceProductId: appointment.ecommerceProductId,
        ecommerceOrderId: appointment.ecommerceOrderId,
        paymentStatus: appointment.paymentStatus,
        startDate: timestampToIso(appointment.startDate),
        endDate: timestampToIso(appointment.endDate),
        timezone: appointment.timezone,
        reason: options.reason || undefined,
        outcome: options.outcome || undefined,
        notes: options.notes || undefined,
    },
});
const appendEventMetadata = (appointment, event, options) => {
    const metadata = normalizeRecord(appointment.metadata);
    const analytics = normalizeRecord(metadata.analytics);
    const existingEvents = Array.isArray(metadata.integrationEvents) ? metadata.integrationEvents : [];
    const existingAnalyticsEvents = Array.isArray(analytics.events) ? analytics.events : [];
    return {
        ...metadata,
        eventVersion: 1,
        lastAppointmentEvent: event.eventType,
        lastAppointmentEventAt: event.createdAt,
        integrationEvents: [...existingEvents, event].slice(-MAX_STORED_EVENTS),
        analytics: {
            ...analytics,
            lastEventName: event.eventType,
            lastEventAt: event.createdAt,
            events: [
                ...existingAnalyticsEvents,
                {
                    eventName: event.eventType,
                    sourceModule: event.sourceModule,
                    entityType: event.entityType,
                    entityId: event.entityId,
                    createdAt: event.createdAt,
                    correlationId: event.correlationId,
                },
            ].slice(-MAX_STORED_EVENTS),
        },
        locale: normalizeLocale(options.locale || metadata.locale),
    };
};
const getReminderSendAt = (appointment, reminder) => {
    const startIso = timestampToIso(appointment.startDate);
    if (!startIso)
        return null;
    const start = new Date(startIso);
    const sendAt = new Date(start.getTime() - reminder.minutesBefore * 60 * 1000);
    return Number.isNaN(sendAt.getTime()) ? null : sendAt.toISOString();
};
async function queueAppointmentEmailLog(client, appointment, flowType, event, options) {
    const participant = firstParticipant(appointment);
    if (!appointment.projectId || !participant?.email)
        return {};
    const locale = normalizeLocale(options.locale || appointment.metadata?.locale);
    const startDate = timestampToIso(appointment.startDate);
    const endDate = timestampToIso(appointment.endDate);
    const idempotencyKey = `appointments:${appointment.id}:${flowType}:${event.id}`;
    const sourceModule = getEventSourceModule(appointment);
    const { data, error } = await client
        .from('email_logs')
        .insert({
        project_id: appointment.projectId,
        store_id: appointment.projectId,
        user_id: isUuid(appointment.organizerId) ? appointment.organizerId : null,
        type: flowType,
        recipient_email: participant.email,
        recipient_name: participant.name || null,
        subject: renderSubject(flowType, appointment.title, locale),
        status: flowType === 'appointment_reminder' ? 'scheduled' : 'queued',
        provider: 'resend',
        lead_id: appointment.linkedLeadIds?.[0] || appointment.sourceLeadId || null,
        order_id: appointment.ecommerceOrderId || null,
        email_kind: 'transactional',
        source_module: sourceModule,
        source_component: appointment.sourceComponent || null,
        source_event: event.eventType,
        source_entity_type: 'appointment',
        source_entity_id: appointment.id,
        correlation_id: appointment.correlationId || idempotencyKey,
        idempotency_key: idempotencyKey,
        metadata: {
            triggeredBy: 'appointments-engine',
            sourceModule,
            sourceComponent: appointment.sourceComponent,
            eventId: event.id,
            eventType: event.eventType,
            appointmentId: appointment.id,
            projectId: appointment.projectId,
            tenantId: appointment.tenantId,
            correlationId: appointment.correlationId,
            source: appointment.source,
            sourceConversationId: appointment.sourceConversationId,
            bookingServiceId: appointment.bookingServiceId,
            ecommerceProductId: appointment.ecommerceProductId,
            ecommerceOrderId: appointment.ecommerceOrderId,
            paymentStatus: appointment.paymentStatus,
            startDate,
            endDate,
            timezone: appointment.timezone,
            idempotencyKey,
            locale,
            subjectKey: subjectKeyForFlow(flowType),
            i18n: {
                key: subjectKeyForFlow(flowType),
                params: { title: appointment.title },
            },
            sendAt: options.now,
        },
        created_at: event.createdAt,
        updated_at: event.createdAt,
    })
        .select('id')
        .single();
    if (error)
        return { warning: `email_log_queue_failed:${error.message}` };
    return { id: data?.id };
}
async function queueAppointmentReminderLogs(client, appointment, event, options) {
    const nowMs = new Date(options.now || event.createdAt).getTime();
    const emailReminders = appointment.reminders.filter(reminder => (reminder.enabled !== false && reminder.type === 'email' && !reminder.sent));
    const results = [];
    for (const reminder of emailReminders) {
        const sendAt = getReminderSendAt(appointment, reminder);
        if (!sendAt || new Date(sendAt).getTime() <= nowMs)
            continue;
        results.push(await queueAppointmentEmailLog(client, appointment, 'appointment_reminder', event, {
            ...options,
            now: sendAt,
        }));
    }
    return results;
}
export async function recordAppointmentEngineEvent(client, appointment, options) {
    const warnings = [];
    if (!appointment.id || !appointment.projectId) {
        return { queuedEmailLogIds: [], warnings: ['appointment_event_skipped_missing_scope'] };
    }
    const createdAt = options.now || new Date().toISOString();
    const event = buildIntegrationEvent(appointment, options, createdAt);
    const metadata = appendEventMetadata(appointment, event, options);
    const queuedEmailLogIds = [];
    const updated = await client
        .from('project_appointments')
        .update({
        metadata,
        updated_at: createdAt,
    })
        .eq('id', appointment.id)
        .select('metadata')
        .single();
    if (updated.error) {
        warnings.push(`appointment_event_metadata_failed:${updated.error.message}`);
    }
    if (options.emailFlow) {
        const queued = await queueAppointmentEmailLog(client, appointment, options.emailFlow, event, options);
        if (queued.id)
            queuedEmailLogIds.push(queued.id);
        if (queued.warning)
            warnings.push(queued.warning);
    }
    if (options.queueReminders) {
        const reminderResults = await queueAppointmentReminderLogs(client, appointment, event, options);
        reminderResults.forEach(result => {
            if (result.id)
                queuedEmailLogIds.push(result.id);
            if (result.warning)
                warnings.push(result.warning);
        });
    }
    return {
        event,
        metadata: normalizeRecord(updated.data?.metadata || metadata),
        queuedEmailLogIds,
        warnings,
    };
}
//# sourceMappingURL=appointmentEventService.js.map