/**
 * Appointment Management Types
 * Sistema completo de gestión de citas con IA y Google Calendar
 */

// =============================================================================
// ENUMS & BASIC TYPES
// =============================================================================

export type AppointmentStatus =
    | 'scheduled'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show'
    | 'rescheduled';

export type AppointmentType =
    | 'call'
    | 'video_call'
    | 'in_person'
    | 'demo'
    | 'consultation'
    | 'follow_up'
    | 'discovery'
    | 'closing'
    | (string & {});

export type AppointmentPriority = 'low' | 'medium' | 'high' | 'critical';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type ReminderType = 'email' | 'sms' | 'push' | 'whatsapp';

export type ParticipantType = 'lead' | 'contact' | 'team_member' | 'external';

export type ParticipantRole = 'host' | 'attendee' | 'optional' | 'observer';

export type ParticipantStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export type LocationType = 'virtual' | 'physical' | 'phone';

export type SyncStatus = 'synced' | 'pending' | 'error' | 'not_synced';

export type AppointmentOutcome =
    | 'successful'
    | 'partially_successful'
    | 'unsuccessful'
    | 'needs_follow_up';

// =============================================================================
// PARTICIPANT
// =============================================================================

export interface AppointmentParticipant {
    id: string;
    type: ParticipantType;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    avatar?: string;
    leadId?: string; // Si es importado desde leads
    role: ParticipantRole;
    status: ParticipantStatus;
    responseAt?: { seconds: number; nanoseconds: number };
    notes?: string;
    timezone?: string;
}

// =============================================================================
// REMINDER
// =============================================================================

export interface AppointmentReminder {
    id: string;
    type: ReminderType;
    minutesBefore: number; // 15, 30, 60, 1440 (1 día), etc.
    sent: boolean;
    sentAt?: { seconds: number; nanoseconds: number };
    customMessage?: string;
    enabled: boolean;
}

// =============================================================================
// LOCATION
// =============================================================================

export interface AppointmentLocation {
    type: LocationType;
    // Physical location
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: { lat: number; lng: number };
    roomName?: string;
    floor?: string;
    instructions?: string;
    // Virtual location
    meetingUrl?: string;
    meetingId?: string;
    meetingPassword?: string;
    platform?: 'zoom' | 'google_meet' | 'teams' | 'webex' | 'other';
    // Phone
    phoneNumber?: string;
    dialInCode?: string;
}

// =============================================================================
// RECURRENCE
// =============================================================================

export interface AppointmentRecurrence {
    type: RecurrenceType;
    interval?: number; // cada X días/semanas/meses
    endDate?: { seconds: number; nanoseconds: number };
    occurrences?: number; // o número de ocurrencias
    daysOfWeek?: number[]; // 0-6 para semanal (0 = Domingo)
    dayOfMonth?: number; // para mensual
    weekOfMonth?: number; // 1-4 o -1 para última semana
    exceptions?: string[]; // fechas excluidas (ISO strings)
    parentAppointmentId?: string; // para instancias de serie
    seriesId?: string; // ID de la serie completa
}

// =============================================================================
// ATTACHMENTS & NOTES
// =============================================================================

export interface AppointmentAttachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: { seconds: number; nanoseconds: number };
    uploadedBy: string;
    description?: string;
}

export interface MeetingNote {
    id: string;
    content: string;
    createdAt: { seconds: number; nanoseconds: number };
    createdBy: string;
    updatedAt?: { seconds: number; nanoseconds: number };
    isPrivate: boolean;
    aiGenerated?: boolean;
    pinned?: boolean;
}

// =============================================================================
// FOLLOW-UP ACTIONS
// =============================================================================

export interface FollowUpAction {
    id: string;
    title: string;
    description?: string;
    assignedTo?: string;
    assignedToName?: string;
    dueDate?: { seconds: number; nanoseconds: number };
    priority: AppointmentPriority;
    completed: boolean;
    completedAt?: { seconds: number; nanoseconds: number };
    completedBy?: string;
    linkedLeadId?: string;
    linkedAppointmentId?: string; // Para crear cita de seguimiento
    type: 'task' | 'email' | 'call' | 'meeting';
}

// =============================================================================
// AI INSIGHTS
// =============================================================================

export interface AppointmentAiInsights {
    // Pre-meeting preparation
    summary?: string;
    preparationTips?: string[];
    suggestedQuestions?: string[];
    talkingPoints?: string[];
    potentialObjections?: string[];
    recommendedApproach?: string;
    participantProfile?: string;

    // Scheduling intelligence
    successProbability?: number;
    recommendedDuration?: number;
    bestTimeSlots?: AppointmentTimeSlotSuggestion[];
    conflictWarnings?: string[];

    // Sentiment & Analysis
    sentimentAnalysis?: {
        score: number; // -1 to 1
        trend: 'positive' | 'neutral' | 'negative';
        keywords: string[];
        confidence: number;
    };

    // Post-meeting
    postMeetingSummary?: string;
    actionItems?: string[];
    keyDecisions?: string[];
    nextSteps?: string[];

    // Metadata
    generatedAt?: { seconds: number; nanoseconds: number };
    model?: string;
    version?: string;
}

export interface AppointmentTimeSlotSuggestion {
    start: string; // ISO string
    end: string;
    score: number; // 0-100
    reason: string;
    conflicts?: string[];
}

// =============================================================================
// GOOGLE CALENDAR SYNC
// =============================================================================

export interface GoogleCalendarSync {
    enabled: boolean;
    googleEventId?: string;
    googleCalendarId?: string;
    lastSyncAt?: { seconds: number; nanoseconds: number };
    syncStatus: SyncStatus;
    errorMessage?: string;
    etag?: string; // Para detectar cambios
    htmlLink?: string; // Link al evento en Google Calendar
    iCalUID?: string;
}

export interface GoogleCalendarConfig {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    calendarId: string;
    calendarName?: string;
    syncEnabled: boolean;
    lastFullSync?: { seconds: number; nanoseconds: number };
}

// =============================================================================
// TYPE CONFIGURATIONS (for UI) - Moved Up
// =============================================================================

export interface AppointmentTypeConfig {
    id: AppointmentType;
    label: string;
    icon: string;
    color: string;
    gradient: string;
    description?: string;
}

export interface AppointmentStatusConfig {
    id: AppointmentStatus;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    description?: string;
}

export interface AppointmentPriorityConfig {
    id: AppointmentPriority;
    label: string;
    icon: string;
    color: string;
    order: number;
}


// =============================================================================
// MAIN APPOINTMENT INTERFACE
// =============================================================================

export interface Appointment {
    id: string;

    // Basic Information
    title: string;
    description?: string;
    type: AppointmentType;
    status: AppointmentStatus;
    priority: AppointmentPriority;

    // Date & Time
    startDate: { seconds: number; nanoseconds: number };
    endDate: { seconds: number; nanoseconds: number };
    timezone: string;
    allDay?: boolean;

    // Participants
    organizerId: string;
    organizerName?: string;
    organizerEmail?: string;
    participants: AppointmentParticipant[];

    // Location
    location: AppointmentLocation;

    // Recurrence
    recurrence?: AppointmentRecurrence;
    isRecurringInstance?: boolean;

    // Reminders
    reminders: AppointmentReminder[];

    // Attachments & Notes
    attachments: AppointmentAttachment[];
    notes: MeetingNote[];

    // Follow-up
    followUpActions: FollowUpAction[];

    // AI Features
    aiInsights?: AppointmentAiInsights;
    aiPrepEnabled?: boolean;
    autoTranscription?: boolean;

    // Google Calendar
    googleSync?: GoogleCalendarSync;

    // Relations
    linkedLeadIds?: string[];
    linkedDealIds?: string[];
    linkedProjectIds?: string[];
    parentAppointmentId?: string;

    // Categorization
    tags?: string[];
    color?: string;
    customColor?: string;

    // Outcome & Completion
    outcome?: AppointmentOutcome;
    outcomeNotes?: string;
    rating?: number; // 1-5
    actualDuration?: number; // minutos reales

    // Metadata
    createdAt: { seconds: number; nanoseconds: number };
    createdBy: string;
    updatedAt?: { seconds: number; nanoseconds: number };
    updatedBy?: string;
    cancelledAt?: { seconds: number; nanoseconds: number };
    cancelledBy?: string;
    cancelledReason?: string;
    completedAt?: { seconds: number; nanoseconds: number };

    // Tenant/Project scope
    tenantId?: string;
    projectId?: string;
}


// =============================================================================
// FILTERS & SEARCH
// =============================================================================

export interface AppointmentFilters {
    search?: string;
    dateRange?: {
        start: string; // ISO string
        end: string;
    };
    statuses?: AppointmentStatus[];
    types?: AppointmentType[];
    priorities?: AppointmentPriority[];
    participantIds?: string[];
    organizerIds?: string[];
    linkedLeadIds?: string[];
    tags?: string[];
    hasAiInsights?: boolean;
    isRecurring?: boolean;
    showCancelled?: boolean;
    showCompleted?: boolean;
}

export interface AppointmentSortOptions {
    field: 'startDate' | 'createdAt' | 'title' | 'priority' | 'status';
    direction: 'asc' | 'desc';
}

// =============================================================================
// ANALYTICS
// =============================================================================

export interface AppointmentAnalytics {
    // Overview
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    upcomingAppointments: number;

    // Rates
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
    reschedulingRate: number;

    // Time metrics
    averageDuration: number;
    totalTimeInMeetings: number;

    // Patterns
    busiestDay: string;
    busiestHour: number;
    quietestDay: string;

    // Conversion
    conversionRate: number; // citas -> deals cerrados
    averageDealsPerAppointment: number;

    // Breakdown
    byType: Record<AppointmentType, number>;
    byStatus: Record<AppointmentStatus, number>;
    byOutcome: Record<AppointmentOutcome, number>;
    byPriority: Record<AppointmentPriority, number>;

    // Trends
    trendsLastMonth: {
        date: string;
        count: number;
        completed: number;
        cancelled: number;
    }[];

    // Comparisons
    vsLastMonth: {
        appointmentsChange: number;
        completionRateChange: number;
        avgDurationChange: number;
    };
}

// =============================================================================
// HELPER FUNCTIONS FOR CONFIGS
// =============================================================================

export const getAppointmentTypeConfig = (type: string): AppointmentTypeConfig => {
    // Check if it's a known type
    if (Object.prototype.hasOwnProperty.call(APPOINTMENT_TYPE_CONFIGS, type)) {
        return APPOINTMENT_TYPE_CONFIGS[type as keyof typeof APPOINTMENT_TYPE_CONFIGS];
    }

    // Default/Custom config
    return {
        id: type as AppointmentType,
        label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
        icon: 'Hash', // Use a generic icon for custom types
        color: 'slate',
        gradient: 'from-slate-500 to-slate-600',
        description: 'Tipo de cita personalizado'
    };
};

export const APPOINTMENT_TYPE_CONFIGS: Record<string, AppointmentTypeConfig> = {
    call: {
        id: 'call',
        label: 'Llamada',
        icon: 'Phone',
        color: 'blue',
        gradient: 'from-blue-500 to-blue-600',
    },
    video_call: {
        id: 'video_call',
        label: 'Videollamada',
        icon: 'Video',
        color: 'violet',
        gradient: 'from-violet-500 to-purple-600',
    },
    in_person: {
        id: 'in_person',
        label: 'Presencial',
        icon: 'MapPin',
        color: 'emerald',
        gradient: 'from-emerald-500 to-teal-600',
    },
    demo: {
        id: 'demo',
        label: 'Demo',
        icon: 'Play',
        color: 'orange',
        gradient: 'from-orange-500 to-amber-600',
    },
    consultation: {
        id: 'consultation',
        label: 'Consulta',
        icon: 'MessageSquare',
        color: 'cyan',
        gradient: 'from-cyan-500 to-sky-600',
    },
    follow_up: {
        id: 'follow_up',
        label: 'Seguimiento',
        icon: 'RefreshCw',
        color: 'yellow',
        gradient: 'from-yellow-500 to-amber-500',
    },
    discovery: {
        id: 'discovery',
        label: 'Discovery',
        icon: 'Search',
        color: 'pink',
        gradient: 'from-pink-500 to-rose-600',
    },
    closing: {
        id: 'closing',
        label: 'Cierre',
        icon: 'Trophy',
        color: 'green',
        gradient: 'from-green-500 to-emerald-600',
    },
};

export const APPOINTMENT_STATUS_CONFIGS: Record<AppointmentStatus, AppointmentStatusConfig> = {
    scheduled: {
        id: 'scheduled',
        label: 'Programada',
        icon: 'Clock',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    confirmed: {
        id: 'confirmed',
        label: 'Confirmada',
        icon: 'CheckCircle2',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
    },
    in_progress: {
        id: 'in_progress',
        label: 'En Progreso',
        icon: 'Play',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
    },
    completed: {
        id: 'completed',
        label: 'Completada',
        icon: 'Check',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
    },
    cancelled: {
        id: 'cancelled',
        label: 'Cancelada',
        icon: 'X',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
    },
    no_show: {
        id: 'no_show',
        label: 'No Show',
        icon: 'UserX',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
    },
    rescheduled: {
        id: 'rescheduled',
        label: 'Reprogramada',
        icon: 'RefreshCw',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
    },
};

export const APPOINTMENT_PRIORITY_CONFIGS: Record<AppointmentPriority, AppointmentPriorityConfig> = {
    low: {
        id: 'low',
        label: 'Baja',
        icon: 'ArrowDown',
        color: 'text-slate-400',
        order: 1,
    },
    medium: {
        id: 'medium',
        label: 'Media',
        icon: 'Minus',
        color: 'text-blue-500',
        order: 2,
    },
    high: {
        id: 'high',
        label: 'Alta',
        icon: 'ArrowUp',
        color: 'text-orange-500',
        order: 3,
    },
    critical: {
        id: 'critical',
        label: 'Crítica',
        icon: 'AlertTriangle',
        color: 'text-red-500',
        order: 4,
    },
};

// =============================================================================
// BLOCKED DATES
// =============================================================================

export interface BlockedDate {
    id: string;
    title: string;              // "Vacaciones", "Día libre", etc.
    startDate: { seconds: number; nanoseconds: number };
    endDate: { seconds: number; nanoseconds: number };
    allDay: boolean;            // true = día completo
    reason?: string;            // razón opcional
    color?: string;             // color personalizado (hex)
    recurring?: {               // bloqueo recurrente (futuro)
        type: 'weekly' | 'monthly';
        daysOfWeek?: number[];
    };
    createdAt: { seconds: number; nanoseconds: number };
    createdBy: string;
    projectId?: string;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_REMINDERS: Omit<AppointmentReminder, 'id' | 'sent' | 'sentAt'>[] = [
    { type: 'email', minutesBefore: 1440, enabled: true }, // 1 día antes
    { type: 'email', minutesBefore: 60, enabled: true },   // 1 hora antes
    { type: 'push', minutesBefore: 15, enabled: true },    // 15 min antes
];

