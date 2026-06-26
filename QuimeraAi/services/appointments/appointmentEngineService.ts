import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    Appointment,
    AppointmentParticipant,
    AppointmentReminder,
    AppointmentStatus,
    AppointmentType,
    BlockedDate,
} from '../../types';
import { recordAppointmentEngineEvent } from './appointmentEventService.js';
import { createAppointmentFollowUpTask, createOrLinkLeadForAppointment } from './appointmentLeadPipelineService.js';
import { createAppointmentPaymentDraft } from './appointmentPaymentService.js';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

export type AppointmentSource =
    | 'dashboard'
    | 'public_booking'
    | 'chatbot'
    | 'website_lead_form'
    | 'realty'
    | 'restaurant'
    | 'ecommerce'
    | 'import'
    | 'google_calendar';

export interface AppointmentEngineOptions {
    startDate?: Date | string;
    endDate?: Date | string;
    includeCancelled?: boolean;
    limit?: number;
}

export interface CanonicalAppointmentInput {
    projectId: string;
    tenantId?: string | null;
    title?: string;
    description?: string;
    type?: AppointmentType | string;
    status?: AppointmentStatus;
    priority?: Appointment['priority'];
    startDate: Date | string | number | { seconds: number; nanoseconds?: number };
    endDate: Date | string | number | { seconds: number; nanoseconds?: number };
    timezone?: string;
    organizerId?: string | null;
    organizerName?: string | null;
    organizerEmail?: string | null;
    participantName?: string | null;
    participantEmail?: string | null;
    participantPhone?: string | null;
    participants?: AppointmentParticipant[];
    location?: Appointment['location'];
    reminders?: AppointmentReminder[];
    linkedLeadId?: string | null;
    linkedLeadIds?: string[];
    linkedDealIds?: string[];
    tags?: string[];
    notes?: string | null;
    source?: AppointmentSource;
    sourceComponent?: string;
    sourceModule?: string;
    sourceConversationId?: string | null;
    sourceLeadId?: string | null;
    publicSubmissionId?: string | null;
    syncKey?: string | null;
    idempotencyKey?: string | null;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdBySystem?: boolean;
    needsReview?: boolean;
    generatedByAI?: boolean;
    correlationId?: string | null;
    bookingServiceId?: string | null;
    ecommerceProductId?: string | null;
    ecommerceOrderId?: string | null;
    paymentStatus?: string | null;
    locale?: string | null;
    metadata?: Record<string, unknown>;
    conversationTranscript?: string | null;
    createOrLinkLead?: boolean;
    allowConflicts?: boolean;
}

export interface CanonicalAppointmentResult {
    appointment: Appointment;
    appointmentId: string;
    leadId?: string;
    duplicate: boolean;
    warnings: string[];
}

export interface AppointmentConflictResult {
    hasConflict: boolean;
    appointments: Appointment[];
    blocks: BlockedDate[];
}

export interface CanonicalBlockedTimeInput {
    projectId: string;
    tenantId?: string | null;
    title: string;
    startDate: Date | string | number | { seconds: number; nanoseconds?: number };
    endDate: Date | string | number | { seconds: number; nanoseconds?: number };
    allDay?: boolean;
    reason?: string | null;
    color?: string | null;
    recurrence?: Record<string, unknown> | null;
    source?: AppointmentSource;
    metadata?: Record<string, unknown>;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export interface AppointmentWeeklyHoursRule {
    day: string;
    enabled: boolean;
    startTime: string;
    endTime: string;
}

export interface AppointmentAvailabilitySlotOptions extends AppointmentEngineOptions {
    durationMinutes?: number;
    intervalMinutes?: number;
    minimumNoticeMinutes?: number;
    weeklyHours?: AppointmentWeeklyHoursRule[];
    maxSlots?: number;
    now?: Date | string;
}

export interface AppointmentAvailabilitySlot {
    startDate: string;
    endDate: string;
    label: string;
    date: string;
    time: string;
}

const ACTIVE_BOOKING_STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed', 'in_progress', 'rescheduled'];

const fallbackId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const randomId = (prefix: string) => {
    const cryptoApi = globalThis.crypto as Crypto | undefined;
    return cryptoApi?.randomUUID ? cryptoApi.randomUUID() : fallbackId(prefix);
};

const normalizeString = (value: unknown, maxLength = 2000): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const uniqueStrings = (...groups: Array<Array<string | null | undefined> | undefined>): string[] => {
    const values = new Set<string>();
    groups.flat().forEach((value) => {
        const normalized = normalizeString(value, 120);
        if (normalized) values.add(normalized);
    });
    return Array.from(values);
};

export const toDate = (value: CanonicalAppointmentInput['startDate']): Date => {
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return new Date(value);
    }
    return new Date(Number.NaN);
};

const toIso = (value: CanonicalAppointmentInput['startDate']): string => {
    const date = toDate(value);
    if (Number.isNaN(date.getTime())) throw Object.assign(new Error('Invalid appointment date.'), { status: 400, code: 'invalid_date' });
    return date.toISOString();
};

export const timestampFromIso = (value?: string | null) => {
    if (!value) return { seconds: 0, nanoseconds: 0 };
    const time = new Date(value).getTime();
    return { seconds: Number.isFinite(time) ? Math.floor(time / 1000) : 0, nanoseconds: 0 };
};

const buildParticipant = (input: CanonicalAppointmentInput): AppointmentParticipant[] => {
    if (input.participants?.length) return input.participants;

    const name = normalizeString(input.participantName, 200);
    const email = normalizeString(input.participantEmail, 320);
    const phone = normalizeString(input.participantPhone, 80);

    if (!name && !email && !phone) return [];

    return [{
        id: randomId('participant'),
        type: 'lead',
        name: name || email || phone || 'Client',
        email: email || '',
        phone,
        role: 'attendee',
        status: 'pending',
        leadId: input.linkedLeadId || input.sourceLeadId || undefined,
    }];
};

const defaultReminders = (): AppointmentReminder[] => [
    { id: randomId('reminder'), type: 'email', minutesBefore: 1440, sent: false, enabled: true },
    { id: randomId('reminder'), type: 'email', minutesBefore: 60, sent: false, enabled: true },
];

const buildInitialMeetingNotes = (
    input: CanonicalAppointmentInput,
    content: string | undefined,
    source: AppointmentSource,
): Appointment['notes'] => {
    const normalizedContent = normalizeString(content, 6000);
    if (!normalizedContent) return [];

    const nowIso = new Date().toISOString();
    return [{
        id: randomId('note'),
        content: normalizedContent,
        createdAt: timestampFromIso(nowIso),
        createdBy: input.createdBy || input.organizerId || input.sourceComponent || 'ChatCore',
        isPrivate: false,
        aiGenerated: input.generatedByAI || source === 'chatbot',
        pinned: source === 'chatbot',
    }];
};

const DEFAULT_WEEKLY_HOURS: AppointmentWeeklyHoursRule[] = [
    { day: 'monday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'friday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { day: 'saturday', enabled: false, startTime: '09:00', endTime: '13:00' },
    { day: 'sunday', enabled: false, startTime: '09:00', endTime: '13:00' },
];

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const clampNumber = (value: number | undefined, fallback: number, min: number, max: number): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.round(value), min), max);
};

const parseClockTime = (value: string): { hours: number; minutes: number } | null => {
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
};

const setClockTime = (date: Date, value: string): Date | null => {
    const parsed = parseClockTime(value);
    if (!parsed) return null;
    const next = new Date(date);
    next.setHours(parsed.hours, parsed.minutes, 0, 0);
    return next;
};

const startOfDay = (date: Date): Date => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
};

const addDays = (date: Date, days: number): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const isOverlappingRange = (start: Date, end: Date, busyStart: Date, busyEnd: Date): boolean =>
    start < busyEnd && end > busyStart;

const formatSlotLabel = (start: Date, end: Date): string =>
    `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

const getAppointmentLocale = (appointment: Appointment): string | undefined => (
    typeof appointment.metadata?.locale === 'string' ? appointment.metadata.locale : undefined
);

export const mapAppointmentRowToAppointment = (row: any): Appointment => ({
    id: row.id,
    title: row.title || '',
    description: row.description || undefined,
    type: row.type || 'consultation',
    status: row.status || 'scheduled',
    priority: row.priority || 'medium',
    startDate: timestampFromIso(row.start_date),
    endDate: timestampFromIso(row.end_date),
    timezone: row.timezone || 'UTC',
    allDay: row.all_day || false,
    organizerId: row.organizer_id || '',
    organizerName: row.organizer_name || undefined,
    organizerEmail: row.organizer_email || undefined,
    participants: Array.isArray(row.participants) ? row.participants : [],
    location: row.location || { type: 'virtual' },
    recurrence: row.recurrence || undefined,
    isRecurringInstance: row.is_recurring_instance || false,
    reminders: Array.isArray(row.reminders) ? row.reminders : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    notes: Array.isArray(row.notes) ? row.notes : [],
    followUpActions: Array.isArray(row.follow_up_actions) ? row.follow_up_actions : [],
    aiInsights: row.ai_insights || undefined,
    aiPrepEnabled: row.ai_prep_enabled,
    autoTranscription: row.auto_transcription,
    googleSync: row.google_sync || undefined,
    linkedLeadIds: row.linked_lead_ids || undefined,
    linkedDealIds: row.linked_deal_ids || undefined,
    linkedProjectIds: row.linked_project_ids || undefined,
    parentAppointmentId: row.parent_appointment_id || undefined,
    tags: row.tags || undefined,
    color: row.color || undefined,
    customColor: row.custom_color || undefined,
    outcome: row.outcome || undefined,
    outcomeNotes: row.outcome_notes || undefined,
    rating: row.rating || undefined,
    actualDuration: row.actual_duration || undefined,
    createdAt: timestampFromIso(row.created_at),
    createdBy: row.created_by || '',
    updatedAt: row.updated_at ? timestampFromIso(row.updated_at) : undefined,
    updatedBy: row.updated_by || undefined,
    cancelledAt: row.cancelled_at ? timestampFromIso(row.cancelled_at) : undefined,
    cancelledBy: row.cancelled_by || undefined,
    cancelledReason: row.cancelled_reason || undefined,
    completedAt: row.completed_at ? timestampFromIso(row.completed_at) : undefined,
    tenantId: row.tenant_id || undefined,
    projectId: row.project_id || undefined,
    source: row.source || undefined,
    sourceComponent: row.source_component || undefined,
    sourceModule: row.source_module || undefined,
    sourceConversationId: row.source_conversation_id || undefined,
    sourceLeadId: row.source_lead_id || undefined,
    publicSubmissionId: row.public_submission_id || undefined,
    syncKey: row.sync_key || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    createdBySystem: row.created_by_system || false,
    needsReview: row.needs_review || false,
    generatedByAI: row.generated_by_ai || false,
    correlationId: row.correlation_id || undefined,
    bookingServiceId: row.booking_service_id || undefined,
    ecommerceProductId: row.ecommerce_product_id || undefined,
    ecommerceOrderId: row.ecommerce_order_id || undefined,
    paymentStatus: row.payment_status || undefined,
    metadata: row.metadata || undefined,
});

export const mapBlockedTimeRowToBlockedDate = (row: any): BlockedDate => ({
    id: row.id,
    title: row.title || '',
    startDate: timestampFromIso(row.start_date),
    endDate: timestampFromIso(row.end_date),
    allDay: row.all_day || false,
    reason: row.reason || undefined,
    color: row.color || undefined,
    recurring: row.recurrence || undefined,
    createdAt: timestampFromIso(row.created_at),
    createdBy: row.created_by || '',
    projectId: row.project_id || undefined,
    tenantId: row.tenant_id || undefined,
    source: row.source || undefined,
    metadata: row.metadata || undefined,
});

export function mapAppointmentPatchToRow(appointment: Partial<Appointment>, tenantId?: string, projectId?: string): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (appointment.title !== undefined) row.title = appointment.title;
    if (appointment.description !== undefined) row.description = appointment.description;
    if (appointment.type !== undefined) row.type = appointment.type;
    if (appointment.status !== undefined) row.status = appointment.status;
    if (appointment.priority !== undefined) row.priority = appointment.priority;
    if (appointment.startDate !== undefined) row.start_date = toIso(appointment.startDate);
    if (appointment.endDate !== undefined) row.end_date = toIso(appointment.endDate);
    if (appointment.timezone !== undefined) row.timezone = appointment.timezone;
    if (appointment.allDay !== undefined) row.all_day = appointment.allDay;
    if (appointment.organizerId !== undefined) row.organizer_id = appointment.organizerId;
    if (appointment.organizerName !== undefined) row.organizer_name = appointment.organizerName;
    if (appointment.organizerEmail !== undefined) row.organizer_email = appointment.organizerEmail;
    if (appointment.participants !== undefined) row.participants = appointment.participants;
    if (appointment.location !== undefined) row.location = appointment.location;
    if (appointment.recurrence !== undefined) row.recurrence = appointment.recurrence;
    if (appointment.isRecurringInstance !== undefined) row.is_recurring_instance = appointment.isRecurringInstance;
    if (appointment.reminders !== undefined) row.reminders = appointment.reminders;
    if (appointment.attachments !== undefined) row.attachments = appointment.attachments;
    if (appointment.notes !== undefined) row.notes = appointment.notes;
    if (appointment.followUpActions !== undefined) row.follow_up_actions = appointment.followUpActions;
    if (appointment.aiInsights !== undefined) row.ai_insights = appointment.aiInsights;
    if (appointment.aiPrepEnabled !== undefined) row.ai_prep_enabled = appointment.aiPrepEnabled;
    if (appointment.autoTranscription !== undefined) row.auto_transcription = appointment.autoTranscription;
    if (appointment.googleSync !== undefined) row.google_sync = appointment.googleSync;
    if (appointment.linkedLeadIds !== undefined) row.linked_lead_ids = appointment.linkedLeadIds;
    if (appointment.linkedDealIds !== undefined) row.linked_deal_ids = appointment.linkedDealIds;
    if (appointment.linkedProjectIds !== undefined) row.linked_project_ids = appointment.linkedProjectIds;
    if (appointment.parentAppointmentId !== undefined) row.parent_appointment_id = appointment.parentAppointmentId;
    if (appointment.tags !== undefined) row.tags = appointment.tags;
    if (appointment.color !== undefined) row.color = appointment.color;
    if (appointment.customColor !== undefined) row.custom_color = appointment.customColor;
    if (appointment.outcome !== undefined) row.outcome = appointment.outcome;
    if (appointment.outcomeNotes !== undefined) row.outcome_notes = appointment.outcomeNotes;
    if (appointment.rating !== undefined) row.rating = appointment.rating;
    if (appointment.actualDuration !== undefined) row.actual_duration = appointment.actualDuration;
    if (appointment.createdBy !== undefined) row.created_by = appointment.createdBy;
    if (appointment.updatedBy !== undefined) row.updated_by = appointment.updatedBy;
    if (appointment.cancelledBy !== undefined) row.cancelled_by = appointment.cancelledBy;
    if (appointment.cancelledReason !== undefined) row.cancelled_reason = appointment.cancelledReason;
    if (appointment.source !== undefined) row.source = appointment.source;
    if (appointment.sourceComponent !== undefined) row.source_component = appointment.sourceComponent;
    if (appointment.sourceModule !== undefined) row.source_module = appointment.sourceModule;
    if (appointment.sourceConversationId !== undefined) row.source_conversation_id = appointment.sourceConversationId;
    if (appointment.sourceLeadId !== undefined) row.source_lead_id = appointment.sourceLeadId;
    if (appointment.publicSubmissionId !== undefined) row.public_submission_id = appointment.publicSubmissionId;
    if (appointment.syncKey !== undefined) row.sync_key = appointment.syncKey;
    if (appointment.idempotencyKey !== undefined) row.idempotency_key = appointment.idempotencyKey;
    if (appointment.createdBySystem !== undefined) row.created_by_system = appointment.createdBySystem;
    if (appointment.needsReview !== undefined) row.needs_review = appointment.needsReview;
    if (appointment.generatedByAI !== undefined) row.generated_by_ai = appointment.generatedByAI;
    if (appointment.correlationId !== undefined) row.correlation_id = appointment.correlationId;
    if (appointment.bookingServiceId !== undefined) row.booking_service_id = appointment.bookingServiceId;
    if (appointment.ecommerceProductId !== undefined) row.ecommerce_product_id = appointment.ecommerceProductId;
    if (appointment.ecommerceOrderId !== undefined) row.ecommerce_order_id = appointment.ecommerceOrderId;
    if (appointment.paymentStatus !== undefined) row.payment_status = appointment.paymentStatus;
    if (appointment.metadata !== undefined) row.metadata = appointment.metadata;
    if (tenantId) row.tenant_id = tenantId;
    if (projectId) row.project_id = projectId;
    return row;
}

export async function getAppointmentsByProject(
    client: SupabaseLike,
    projectId: string,
    options: AppointmentEngineOptions = {},
): Promise<Appointment[]> {
    let query = client
        .from('project_appointments')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

    if (options.startDate) query = query.gte('start_date', toIso(options.startDate));
    if (options.endDate) query = query.lte('start_date', toIso(options.endDate));
    if (!options.includeCancelled) query = query.neq('status', 'cancelled');
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapAppointmentRowToAppointment);
}

export async function getBlockedTimesByProject(
    client: SupabaseLike,
    projectId: string,
    options: AppointmentEngineOptions = {},
): Promise<BlockedDate[]> {
    let query = client
        .from('project_appointment_blocks')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

    if (options.startDate) query = query.gte('end_date', toIso(options.startDate));
    if (options.endDate) query = query.lte('start_date', toIso(options.endDate));
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapBlockedTimeRowToBlockedDate);
}

export async function checkAppointmentConflicts(
    client: SupabaseLike,
    projectId: string,
    startDate: Date | string,
    endDate: Date | string,
    excludeId?: string,
): Promise<AppointmentConflictResult> {
    const startIso = toIso(startDate);
    const endIso = toIso(endDate);

    let appointmentQuery = client
        .from('project_appointments')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ACTIVE_BOOKING_STATUSES)
        .lt('start_date', endIso)
        .gt('end_date', startIso)
        .limit(25);

    if (excludeId) appointmentQuery = appointmentQuery.neq('id', excludeId);

    const [appointmentsResult, blocksResult] = await Promise.all([
        appointmentQuery,
        client
            .from('project_appointment_blocks')
            .select('*')
            .eq('project_id', projectId)
            .lt('start_date', endIso)
            .gt('end_date', startIso)
            .limit(25),
    ]);

    if (appointmentsResult.error) throw appointmentsResult.error;
    if (blocksResult.error) throw blocksResult.error;

    const appointments = (appointmentsResult.data || []).map(mapAppointmentRowToAppointment);
    const blocks = (blocksResult.data || []).map(mapBlockedTimeRowToBlockedDate);
    return {
        hasConflict: appointments.length > 0 || blocks.length > 0,
        appointments,
        blocks,
    };
}

export async function createAppointmentCanonical(
    client: SupabaseLike,
    input: CanonicalAppointmentInput,
): Promise<CanonicalAppointmentResult> {
    if (!input.projectId) throw Object.assign(new Error('projectId is required.'), { status: 400, code: 'missing_project_id' });

    const startIso = toIso(input.startDate);
    const endIso = toIso(input.endDate);
    if (new Date(endIso) <= new Date(startIso)) {
        throw Object.assign(new Error('Appointment endDate must be after startDate.'), { status: 400, code: 'invalid_range' });
    }

    if (input.idempotencyKey) {
        const existing = await client
            .from('project_appointments')
            .select('*')
            .eq('project_id', input.projectId)
            .eq('idempotency_key', input.idempotencyKey)
            .maybeSingle();
        if (existing.error) throw existing.error;
        if (existing.data) {
            const appointment = mapAppointmentRowToAppointment(existing.data);
            return { appointment, appointmentId: appointment.id, duplicate: true, warnings: [] };
        }
    }

    if (!input.allowConflicts) {
        const conflicts = await checkAppointmentConflicts(client, input.projectId, startIso, endIso);
        if (conflicts.hasConflict) {
            throw Object.assign(new Error('The selected appointment time is not available.'), {
                status: 409,
                code: 'appointment_conflict',
                conflicts,
            });
        }
    }

    const source = input.source || 'dashboard';
    const linkedLeadIds = uniqueStrings(input.linkedLeadIds, [input.linkedLeadId, input.sourceLeadId]);
    const appointmentNotes = normalizeString(input.notes, 6000);
    const initialNotes = buildInitialMeetingNotes(input, appointmentNotes, source);
    const metadata = {
        ...(input.metadata || {}),
        source,
        sourceComponent: input.sourceComponent,
        sourceModule: input.sourceModule,
        sourceConversationId: input.sourceConversationId,
        sourceLeadId: input.sourceLeadId || input.linkedLeadId,
        publicSubmissionId: input.publicSubmissionId,
        syncKey: input.syncKey,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        locale: input.locale,
        conversationTranscript: normalizeString(input.conversationTranscript, 20000),
        customerRequestSummary: appointmentNotes,
    };

    const row = {
        tenant_id: input.tenantId || null,
        project_id: input.projectId,
        title: normalizeString(input.title, 250) || 'Appointment',
        description: normalizeString(input.description, 5000) || '',
        type: input.type || 'consultation',
        status: input.status || 'scheduled',
        priority: input.priority || 'medium',
        start_date: startIso,
        end_date: endIso,
        timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        organizer_id: input.organizerId || null,
        organizer_name: normalizeString(input.organizerName, 200) || null,
        organizer_email: normalizeString(input.organizerEmail, 320) || null,
        participants: buildParticipant(input),
        location: input.location || { type: 'virtual' },
        reminders: input.reminders || defaultReminders(),
        attachments: [],
        notes: initialNotes,
        follow_up_actions: [],
        ai_prep_enabled: true,
        linked_lead_ids: linkedLeadIds,
        tags: uniqueStrings(input.tags, [source, input.sourceModule, input.sourceComponent]),
        source,
        source_component: input.sourceComponent || null,
        source_module: input.sourceModule || null,
        source_conversation_id: input.sourceConversationId || null,
        source_lead_id: input.sourceLeadId || input.linkedLeadId || null,
        public_submission_id: input.publicSubmissionId || null,
        sync_key: input.syncKey || null,
        idempotency_key: input.idempotencyKey || null,
        created_by_system: input.createdBySystem || false,
        needs_review: input.needsReview || false,
        generated_by_ai: input.generatedByAI || false,
        correlation_id: input.correlationId || randomId('correlation'),
        booking_service_id: input.bookingServiceId || null,
        ecommerce_product_id: input.ecommerceProductId || null,
        ecommerce_order_id: input.ecommerceOrderId || null,
        payment_status: input.paymentStatus || null,
        metadata,
        created_by: input.createdBy || input.organizerId || null,
        updated_by: input.updatedBy || input.createdBy || input.organizerId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const inserted = await client
        .from('project_appointments')
        .insert(row)
        .select('*')
        .single();

    if (inserted.error) {
        if (inserted.error.code === '23505' && input.idempotencyKey) {
            const existing = await client
                .from('project_appointments')
                .select('*')
                .eq('project_id', input.projectId)
                .eq('idempotency_key', input.idempotencyKey)
                .maybeSingle();
            if (existing.error) throw existing.error;
            if (existing.data) {
                const appointment = mapAppointmentRowToAppointment(existing.data);
                return { appointment, appointmentId: appointment.id, duplicate: true, warnings: [] };
            }
        }
        throw inserted.error;
    }

    let appointment = mapAppointmentRowToAppointment(inserted.data);
    const warnings: string[] = [];
    let leadId = input.linkedLeadId || input.sourceLeadId || undefined;

    if (input.createOrLinkLead !== false) {
        const leadResult = await createOrLinkLeadForAppointment(client, {
            tenantId: input.tenantId,
            projectId: input.projectId,
            appointmentId: appointment.id,
            appointmentTitle: appointment.title,
            appointmentStartIso: startIso,
            linkedLeadId: leadId,
            participantName: input.participantName || appointment.participants?.[0]?.name,
            participantEmail: input.participantEmail || appointment.participants?.[0]?.email,
            participantPhone: input.participantPhone || appointment.participants?.[0]?.phone,
            source,
            sourceComponent: input.sourceComponent,
            sourceModule: input.sourceModule,
            conversationTranscript: input.conversationTranscript,
            idempotencyKey: input.idempotencyKey,
            correlationId: appointment.correlationId,
            createdBy: input.createdBy,
            tags: row.tags,
            notes: input.notes || appointment.description,
            metadata,
        });
        leadId = leadResult.leadId || leadId;
        warnings.push(...leadResult.warnings);

        if (leadId && !appointment.linkedLeadIds?.includes(leadId)) {
            const nextLeadIds = uniqueStrings(appointment.linkedLeadIds, [leadId]);
            const updated = await client
                .from('project_appointments')
                .update({
                    linked_lead_ids: nextLeadIds,
                    source_lead_id: appointment.sourceLeadId || leadId,
                    metadata: {
                        ...(appointment.metadata || {}),
                        linkedLeadId: leadId,
                        leadPipelineWarnings: warnings,
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', appointment.id)
                .select('*')
                .single();
            if (updated.error) {
                warnings.push(`appointment_lead_link_failed:${updated.error.message}`);
            } else {
                appointment = mapAppointmentRowToAppointment(updated.data);
            }
        }
    }

    const paymentResult = await createAppointmentPaymentDraft(client, appointment);
    warnings.push(...paymentResult.warnings);
    if (paymentResult.orderId && (!appointment.ecommerceOrderId || appointment.paymentStatus !== paymentResult.paymentStatus)) {
        const updated = await client
            .from('project_appointments')
            .update({
                ecommerce_order_id: paymentResult.orderId,
                payment_status: appointment.paymentStatus || paymentResult.paymentStatus || 'pending',
                metadata: {
                    ...(appointment.metadata || {}),
                    ecommerceOrderId: paymentResult.orderId,
                    paymentStatus: appointment.paymentStatus || paymentResult.paymentStatus || 'pending',
                    paymentDraftWarnings: paymentResult.warnings,
                },
                updated_at: new Date().toISOString(),
            })
            .eq('id', appointment.id)
            .select('*')
            .single();
        if (updated.error) {
            warnings.push(`appointment_payment_link_failed:${updated.error.message}`);
        } else {
            appointment = mapAppointmentRowToAppointment(updated.data);
        }
    }

    const eventResult = await recordAppointmentEngineEvent(client, appointment, {
        eventType: 'appointment_requested',
        emailFlow: 'appointment_request_received',
        actorId: input.createdBy || input.organizerId,
        locale: input.locale || (typeof metadata.locale === 'string' ? metadata.locale : undefined),
    });
    if (eventResult.metadata) appointment = { ...appointment, metadata: eventResult.metadata };
    warnings.push(...eventResult.warnings);

    return {
        appointment,
        appointmentId: appointment.id,
        leadId,
        duplicate: false,
        warnings,
    };
}

export async function updateAppointmentCanonical(
    client: SupabaseLike,
    id: string,
    input: Partial<Appointment>,
): Promise<Appointment> {
    const row = {
        ...mapAppointmentPatchToRow(input),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
        .from('project_appointments')
        .update(row)
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    return mapAppointmentRowToAppointment(data);
}

export async function confirmAppointmentCanonical(
    client: SupabaseLike,
    id: string,
    actorId?: string | null,
): Promise<Appointment> {
    const appointment = await updateAppointmentCanonical(client, id, {
        status: 'confirmed',
        updatedBy: actorId || undefined,
    });
    const eventResult = await recordAppointmentEngineEvent(client, appointment, {
        eventType: 'appointment_confirmed',
        emailFlow: 'appointment_confirmation',
        queueReminders: true,
        actorId,
        locale: getAppointmentLocale(appointment),
    });
    return eventResult.metadata ? { ...appointment, metadata: eventResult.metadata } : appointment;
}

export async function markNoShowCanonical(
    client: SupabaseLike,
    id: string,
    actorId?: string | null,
): Promise<Appointment> {
    const appointment = await updateAppointmentCanonical(client, id, {
        status: 'no_show',
        updatedBy: actorId || undefined,
    });
    const eventResult = await recordAppointmentEngineEvent(client, appointment, {
        eventType: 'appointment_no_show',
        actorId,
        locale: getAppointmentLocale(appointment),
    });
    return eventResult.metadata ? { ...appointment, metadata: eventResult.metadata } : appointment;
}

export async function cancelAppointmentCanonical(
    client: SupabaseLike,
    id: string,
    reason?: string,
    cancelledBy?: string,
): Promise<Appointment> {
    const { data, error } = await client
        .from('project_appointments')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancelledBy || null,
            cancelled_reason: reason || null,
            updated_by: cancelledBy || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    const appointment = mapAppointmentRowToAppointment(data);
    const eventResult = await recordAppointmentEngineEvent(client, appointment, {
        eventType: 'appointment_cancelled',
        emailFlow: 'appointment_cancellation',
        actorId: cancelledBy,
        reason,
        locale: getAppointmentLocale(appointment),
    });
    return eventResult.metadata ? { ...appointment, metadata: eventResult.metadata } : appointment;
}

export async function completeAppointmentCanonical(
    client: SupabaseLike,
    id: string,
    outcome?: string,
    notes?: string,
): Promise<Appointment> {
    const { data, error } = await client
        .from('project_appointments')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            outcome: outcome || null,
            outcome_notes: notes || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    const appointment = mapAppointmentRowToAppointment(data);
    const leadId = appointment.linkedLeadIds?.[0];
    if (leadId && appointment.tenantId && appointment.projectId) {
        await createAppointmentFollowUpTask(client, {
            tenantId: appointment.tenantId,
            projectId: appointment.projectId,
            linkedLeadId: leadId,
            appointmentId: appointment.id,
            appointmentTitle: appointment.title,
            title: `Follow up: ${appointment.title}`,
            description: notes || appointment.outcomeNotes,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            source: appointment.source,
            correlationId: appointment.correlationId,
        });
    }
    const eventResult = await recordAppointmentEngineEvent(client, appointment, {
        eventType: 'appointment_completed',
        emailFlow: 'appointment_follow_up',
        outcome,
        notes,
        locale: getAppointmentLocale(appointment),
    });
    return eventResult.metadata ? { ...appointment, metadata: eventResult.metadata } : appointment;
}

export async function createBlockedTimeCanonical(
    client: SupabaseLike,
    input: CanonicalBlockedTimeInput,
): Promise<BlockedDate> {
    const startIso = toIso(input.startDate);
    const endIso = toIso(input.endDate);
    if (new Date(endIso) <= new Date(startIso)) {
        throw Object.assign(new Error('Blocked time endDate must be after startDate.'), { status: 400, code: 'invalid_range' });
    }

    const { data, error } = await client
        .from('project_appointment_blocks')
        .insert({
            tenant_id: input.tenantId || null,
            project_id: input.projectId,
            title: input.title,
            start_date: startIso,
            end_date: endIso,
            all_day: input.allDay || false,
            reason: input.reason || null,
            color: input.color || null,
            recurrence: input.recurrence || null,
            source: input.source || 'dashboard',
            metadata: input.metadata || {},
            created_by: input.createdBy || null,
            updated_by: input.updatedBy || input.createdBy || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

    if (error) throw error;
    return mapBlockedTimeRowToBlockedDate(data);
}

export async function updateBlockedTimeCanonical(
    client: SupabaseLike,
    id: string,
    input: Partial<CanonicalBlockedTimeInput>,
): Promise<BlockedDate> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) row.title = input.title;
    if (input.startDate !== undefined) row.start_date = toIso(input.startDate);
    if (input.endDate !== undefined) row.end_date = toIso(input.endDate);
    if (input.allDay !== undefined) row.all_day = input.allDay;
    if (input.reason !== undefined) row.reason = input.reason;
    if (input.color !== undefined) row.color = input.color;
    if (input.recurrence !== undefined) row.recurrence = input.recurrence;
    if (input.source !== undefined) row.source = input.source;
    if (input.metadata !== undefined) row.metadata = input.metadata;
    if (input.updatedBy !== undefined) row.updated_by = input.updatedBy;

    const { data, error } = await client
        .from('project_appointment_blocks')
        .update(row)
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    return mapBlockedTimeRowToBlockedDate(data);
}

export async function deleteBlockedTimeCanonical(client: SupabaseLike, id: string): Promise<void> {
    const { error } = await client.from('project_appointment_blocks').delete().eq('id', id);
    if (error) throw error;
}

export async function getAppointmentAvailability(
    client: SupabaseLike,
    projectId: string,
    options: AppointmentEngineOptions = {},
) {
    const [appointments, blocks] = await Promise.all([
        getAppointmentsByProject(client, projectId, options),
        getBlockedTimesByProject(client, projectId, options),
    ]);

    return {
        projectId,
        busySlots: appointments.map((appointment) => ({
            id: appointment.id,
            startDate: toDate(appointment.startDate).toISOString(),
            endDate: toDate(appointment.endDate).toISOString(),
            source: 'appointment' as const,
            status: appointment.status,
        })),
        blockedSlots: blocks.map((block) => ({
            id: block.id,
            startDate: toDate(block.startDate).toISOString(),
            endDate: toDate(block.endDate).toISOString(),
            source: 'block' as const,
            reason: block.reason,
        })),
    };
}

export async function getAvailableAppointmentSlots(
    client: SupabaseLike,
    projectId: string,
    options: AppointmentAvailabilitySlotOptions = {},
): Promise<AppointmentAvailabilitySlot[]> {
    const durationMinutes = clampNumber(options.durationMinutes, 60, 15, 480);
    const intervalMinutes = clampNumber(options.intervalMinutes, 30, 5, 240);
    const minimumNoticeMinutes = clampNumber(options.minimumNoticeMinutes, 120, 0, 60 * 24 * 30);
    const maxSlots = clampNumber(options.maxSlots, 48, 1, 200);
    const now = options.now ? toDate(options.now) : new Date();
    const earliestStart = new Date(now.getTime() + minimumNoticeMinutes * 60 * 1000);
    const startDate = startOfDay(options.startDate ? toDate(options.startDate) : earliestStart);
    const endDate = options.endDate ? toDate(options.endDate) : addDays(startDate, 14);
    const weeklyHours = options.weeklyHours?.length ? options.weeklyHours : DEFAULT_WEEKLY_HOURS;

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
        throw Object.assign(new Error('A valid availability range is required.'), { status: 400, code: 'invalid_availability_range' });
    }

    const [appointments, blocks] = await Promise.all([
        getAppointmentsByProject(client, projectId, {
            startDate,
            endDate,
            includeCancelled: true,
            limit: 500,
        }),
        getBlockedTimesByProject(client, projectId, {
            startDate,
            endDate,
            limit: 500,
        }),
    ]);

    const busyRanges = [
        ...appointments
            .filter(appointment => ACTIVE_BOOKING_STATUSES.includes(appointment.status))
            .map(appointment => ({
                start: toDate(appointment.startDate),
                end: toDate(appointment.endDate),
            })),
        ...blocks.map(block => ({
            start: toDate(block.startDate),
            end: toDate(block.endDate),
        })),
    ].filter(range => !Number.isNaN(range.start.getTime()) && !Number.isNaN(range.end.getTime()));

    const slots: AppointmentAvailabilitySlot[] = [];
    let cursorDay = startOfDay(startDate);

    while (cursorDay < endDate && slots.length < maxSlots) {
        const dayRule = weeklyHours.find(rule => rule.day.toLowerCase() === WEEKDAY_NAMES[cursorDay.getDay()]);
        if (!dayRule?.enabled) {
            cursorDay = addDays(cursorDay, 1);
            continue;
        }

        const windowStart = setClockTime(cursorDay, dayRule.startTime);
        const windowEnd = setClockTime(cursorDay, dayRule.endTime);
        if (!windowStart || !windowEnd || windowEnd <= windowStart) {
            cursorDay = addDays(cursorDay, 1);
            continue;
        }

        let slotStart = new Date(Math.max(windowStart.getTime(), startDate.getTime(), earliestStart.getTime()));
        const intervalMs = intervalMinutes * 60 * 1000;
        const remainder = slotStart.getMinutes() % intervalMinutes;
        if (remainder > 0) {
            slotStart = new Date(slotStart.getTime() + (intervalMinutes - remainder) * 60 * 1000);
            slotStart.setSeconds(0, 0);
        }

        while (slotStart < windowEnd && slots.length < maxSlots) {
            const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
            if (slotEnd > windowEnd || slotEnd > endDate) break;

            const hasConflict = busyRanges.some(range => isOverlappingRange(slotStart, slotEnd, range.start, range.end));
            if (!hasConflict) {
                slots.push({
                    startDate: slotStart.toISOString(),
                    endDate: slotEnd.toISOString(),
                    label: formatSlotLabel(slotStart, slotEnd),
                    date: slotStart.toISOString().slice(0, 10),
                    time: slotStart.toTimeString().slice(0, 5),
                });
            }

            slotStart = new Date(slotStart.getTime() + intervalMs);
        }

        cursorDay = addDays(cursorDay, 1);
    }

    return slots;
}

export const createAppointmentFromLead = (client: SupabaseLike, input: CanonicalAppointmentInput) =>
    createAppointmentCanonical(client, {
        ...input,
        source: input.source || 'dashboard',
        sourceModule: input.sourceModule || 'crm',
        linkedLeadId: input.linkedLeadId || input.sourceLeadId,
    });

export const createAppointmentFromChat = (client: SupabaseLike, input: CanonicalAppointmentInput) =>
    createAppointmentCanonical(client, {
        ...input,
        source: 'chatbot',
        sourceModule: input.sourceModule || 'chatcore',
        sourceComponent: input.sourceComponent || 'ChatCore',
        createdBySystem: input.createdBySystem ?? true,
    });

export const createAppointmentFromPublicBooking = (client: SupabaseLike, input: CanonicalAppointmentInput) =>
    createAppointmentCanonical(client, {
        ...input,
        source: 'public_booking',
        sourceModule: input.sourceModule || 'website-builder',
        sourceComponent: input.sourceComponent || 'PublicBooking',
        createdBySystem: input.createdBySystem ?? true,
        needsReview: input.needsReview ?? true,
    });

export const createAppointmentFromVerticalModule = (client: SupabaseLike, input: CanonicalAppointmentInput) =>
    createAppointmentCanonical(client, {
        ...input,
        source: input.source || 'dashboard',
        sourceModule: input.sourceModule || 'appointments',
    });
