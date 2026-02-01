/**
 * Appointment Helpers
 * Utilidades y funciones auxiliares para el sistema de citas
 */

import {
    Appointment,
    AppointmentType,
    AppointmentStatus,
    AppointmentPriority,
    AppointmentParticipant,
    AppointmentReminder,
    APPOINTMENT_TYPE_CONFIGS,
    APPOINTMENT_STATUS_CONFIGS,
    APPOINTMENT_PRIORITY_CONFIGS,
    getAppointmentTypeConfig,
} from '../../../../types';

// =============================================================================
// DATE & TIME HELPERS
// =============================================================================

/**
 * Formatea una fecha de Firestore timestamp a Date
 */
export const timestampToDate = (timestamp: { seconds: number; nanoseconds: number }): Date => {
    return new Date(timestamp.seconds * 1000);
};

/**
 * Convierte una Date a Firestore timestamp
 */
export const dateToTimestamp = (date: Date): { seconds: number; nanoseconds: number } => {
    return {
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
    };
};

/**
 * Formatea una fecha para mostrar
 */
export const formatAppointmentDate = (
    timestamp: { seconds: number; nanoseconds: number },
    options?: Intl.DateTimeFormatOptions
): string => {
    const date = timestampToDate(timestamp);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    };
    return date.toLocaleDateString('es-ES', options || defaultOptions);
};

/**
 * Formatea solo la hora
 */
export const formatTime = (timestamp: { seconds: number; nanoseconds: number }): string => {
    const date = timestampToDate(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formatea la fecha sin hora
 */
export const formatDateOnly = (timestamp: { seconds: number; nanoseconds: number }): string => {
    const date = timestampToDate(timestamp);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

/**
 * Calcula la duración en minutos entre dos timestamps
 */
export const calculateDuration = (
    start: { seconds: number; nanoseconds: number },
    end: { seconds: number; nanoseconds: number }
): number => {
    return Math.round((end.seconds - start.seconds) / 60);
};

/**
 * Formatea la duración en texto legible
 */
export const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
};

/**
 * Obtiene el inicio del día
 */
export const getStartOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Obtiene el fin del día
 */
export const getEndOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Obtiene el inicio de la semana
 */
export const getStartOfWeek = (date: Date, weekStartsOn: number = 1): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Obtiene el fin de la semana
 */
export const getEndOfWeek = (date: Date, weekStartsOn: number = 1): Date => {
    const start = getStartOfWeek(date, weekStartsOn);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

/**
 * Obtiene los días de una semana
 */
export const getWeekDays = (date: Date, weekStartsOn: number = 1): Date[] => {
    const start = getStartOfWeek(date, weekStartsOn);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
};

/**
 * Obtiene los días de un mes para el calendario
 */
export const getMonthDays = (date: Date, weekStartsOn: number = 1): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);

    // Ajustar al inicio de la semana
    const start = getStartOfWeek(firstDay, weekStartsOn);

    // Calcular cuántas semanas necesitamos mostrar
    const endOfMonth = getStartOfWeek(new Date(lastDay.getTime() + 7 * 24 * 60 * 60 * 1000), weekStartsOn);

    const days: Date[] = [];
    let current = new Date(start);

    while (current < endOfMonth) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return days;
};

/**
 * Verifica si dos fechas son el mismo día
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

/**
 * Verifica si una fecha es hoy
 */
export const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
};

/**
 * Verifica si una fecha está en el pasado
 */
export const isPast = (timestamp: { seconds: number; nanoseconds: number }): boolean => {
    return timestamp.seconds * 1000 < Date.now();
};

/**
 * Verifica si una cita está en progreso
 */
export const isInProgress = (appointment: Appointment): boolean => {
    const now = Date.now();
    const start = appointment.startDate.seconds * 1000;
    const end = appointment.endDate.seconds * 1000;
    return now >= start && now <= end;
};

/**
 * Tiempo relativo (hace X minutos, en X horas, etc.)
 */
export const getRelativeTime = (timestamp: { seconds: number; nanoseconds: number }): string => {
    const now = Date.now();
    const time = timestamp.seconds * 1000;
    const diff = time - now;
    const absDiff = Math.abs(diff);

    const minutes = Math.floor(absDiff / (1000 * 60));
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

    if (diff > 0) {
        // Future
        if (minutes < 60) return `en ${minutes} min`;
        if (hours < 24) return `en ${hours}h`;
        if (days === 1) return 'mañana';
        if (days < 7) return `en ${days} días`;
        return formatDateOnly(timestamp);
    } else {
        // Past
        if (minutes < 60) return `hace ${minutes} min`;
        if (hours < 24) return `hace ${hours}h`;
        if (days === 1) return 'ayer';
        if (days < 7) return `hace ${days} días`;
        return formatDateOnly(timestamp);
    }
};

// =============================================================================
// APPOINTMENT HELPERS
// =============================================================================

/**
 * Obtiene la configuración de tipo de cita
 */
export const getTypeConfig = (type: AppointmentType) => {
    return getAppointmentTypeConfig(type);
};

/**
 * Obtiene la configuración de estado de cita
 */
export const getStatusConfig = (status: AppointmentStatus) => {
    return APPOINTMENT_STATUS_CONFIGS[status];
};

/**
 * Obtiene la configuración de prioridad
 */
export const getPriorityConfig = (priority: AppointmentPriority) => {
    return APPOINTMENT_PRIORITY_CONFIGS[priority];
};

/**
 * Obtiene el color de fondo para un tipo de cita
 */
export const getTypeBackgroundColor = (type: AppointmentType): string => {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500/10',
        violet: 'bg-violet-500/10',
        emerald: 'bg-emerald-500/10',
        orange: 'bg-orange-500/10',
        cyan: 'bg-cyan-500/10',
        yellow: 'bg-yellow-500/10',
        pink: 'bg-pink-500/10',
        green: 'bg-green-500/10',
    };
    const config = getTypeConfig(type);
    return colorMap[config.color] || 'bg-gray-500/10';
};

/**
 * Obtiene las clases CSS para el gradiente de un tipo
 */
export const getTypeGradientClasses = (type: AppointmentType): string => {
    const config = getTypeConfig(type);
    return `bg-gradient-to-br ${config.gradient}`;
};

/**
 * Genera iniciales de un nombre
 */
export const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Genera un color de avatar basado en el nombre
 */
export const getAvatarColor = (name: string): string => {
    const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-orange-500',
        'bg-pink-500',
        'bg-cyan-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-indigo-500',
        'bg-teal-500',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

// =============================================================================
// CONFLICT DETECTION
// =============================================================================

/**
 * Verifica si dos citas se solapan
 */
export const appointmentsOverlap = (apt1: Appointment, apt2: Appointment): boolean => {
    const start1 = apt1.startDate.seconds;
    const end1 = apt1.endDate.seconds;
    const start2 = apt2.startDate.seconds;
    const end2 = apt2.endDate.seconds;

    return start1 < end2 && start2 < end1;
};

/**
 * Encuentra conflictos entre citas
 */
export const findConflicts = (
    appointments: Appointment[],
    newAppointment: Pick<Appointment, 'startDate' | 'endDate' | 'id'>
): Appointment[] => {
    return appointments.filter(apt => {
        if (apt.id === newAppointment.id) return false;
        if (apt.status === 'cancelled') return false;

        return appointmentsOverlap(
            apt,
            { ...apt, startDate: newAppointment.startDate, endDate: newAppointment.endDate }
        );
    });
};

/**
 * Verifica si un slot de tiempo está disponible
 */
export const isSlotAvailable = (
    appointments: Appointment[],
    start: Date,
    end: Date,
    excludeId?: string
): boolean => {
    const conflicts = appointments.filter(apt => {
        if (apt.id === excludeId) return false;
        if (apt.status === 'cancelled') return false;

        const aptStart = apt.startDate.seconds * 1000;
        const aptEnd = apt.endDate.seconds * 1000;
        const slotStart = start.getTime();
        const slotEnd = end.getTime();

        return slotStart < aptEnd && aptStart < slotEnd;
    });

    return conflicts.length === 0;
};

// =============================================================================
// SORTING & FILTERING
// =============================================================================

/**
 * Ordena citas por fecha de inicio
 */
export const sortByStartDate = (appointments: Appointment[], ascending = true): Appointment[] => {
    return [...appointments].sort((a, b) => {
        const diff = a.startDate.seconds - b.startDate.seconds;
        return ascending ? diff : -diff;
    });
};

/**
 * Filtra citas por rango de fechas
 */
export const filterByDateRange = (
    appointments: Appointment[],
    start: Date,
    end: Date
): Appointment[] => {
    const startTs = start.getTime() / 1000;
    const endTs = end.getTime() / 1000;

    return appointments.filter(apt => {
        return apt.startDate.seconds >= startTs && apt.startDate.seconds <= endTs;
    });
};

/**
 * Agrupa citas por día
 */
export const groupByDay = (appointments: Appointment[]): Map<string, Appointment[]> => {
    const groups = new Map<string, Appointment[]>();

    appointments.forEach(apt => {
        const date = timestampToDate(apt.startDate);
        const key = date.toISOString().split('T')[0];

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(apt);
    });

    return groups;
};

/**
 * Obtiene citas próximas
 */
export const getUpcomingAppointments = (
    appointments: Appointment[],
    limit = 5
): Appointment[] => {
    const now = Date.now() / 1000;

    return appointments
        .filter(apt => apt.startDate.seconds > now && apt.status !== 'cancelled')
        .sort((a, b) => a.startDate.seconds - b.startDate.seconds)
        .slice(0, limit);
};

/**
 * Obtiene citas de hoy
 */
export const getTodayAppointments = (appointments: Appointment[]): Appointment[] => {
    const today = new Date();
    const start = getStartOfDay(today);
    const end = getEndOfDay(today);

    return filterByDateRange(appointments, start, end)
        .filter(apt => apt.status !== 'cancelled')
        .sort((a, b) => a.startDate.seconds - b.startDate.seconds);
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Valida los datos de una cita
 */
export const validateAppointment = (
    appointment: Partial<Appointment>
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!appointment.title?.trim()) {
        errors.push('El título es requerido');
    }

    if (!appointment.startDate) {
        errors.push('La fecha de inicio es requerida');
    }

    if (!appointment.endDate) {
        errors.push('La fecha de fin es requerida');
    }

    if (appointment.startDate && appointment.endDate) {
        if (appointment.startDate.seconds >= appointment.endDate.seconds) {
            errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
        }
    }

    if (!appointment.participants || appointment.participants.length === 0) {
        errors.push('Debe haber al menos un participante');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

/**
 * Valida un email
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// =============================================================================
// REMINDER HELPERS
// =============================================================================

/**
 * Genera ID único para un reminder
 */
export const generateReminderId = (): string => {
    return `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Crea un recordatorio por defecto
 */
export const createDefaultReminder = (
    type: 'email' | 'sms' | 'push' | 'whatsapp',
    minutesBefore: number
): AppointmentReminder => {
    return {
        id: generateReminderId(),
        type,
        minutesBefore,
        sent: false,
        enabled: true,
    };
};

/**
 * Formatea el tiempo del recordatorio
 */
export const formatReminderTime = (minutesBefore: number): string => {
    if (minutesBefore < 60) {
        return `${minutesBefore} minutos antes`;
    }
    const hours = minutesBefore / 60;
    if (hours < 24) {
        return `${hours} hora${hours > 1 ? 's' : ''} antes`;
    }
    const days = hours / 24;
    return `${days} día${days > 1 ? 's' : ''} antes`;
};

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Genera un ID único para una cita
 */
export const generateAppointmentId = (): string => {
    return `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Genera un ID único para un participante
 */
export const generateParticipantId = (): string => {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// =============================================================================
// EXPORT HELPERS
// =============================================================================

/**
 * Convierte una cita a formato ICS para exportar
 */
export const appointmentToICS = (appointment: Appointment): string => {
    const formatICSDate = (ts: { seconds: number; nanoseconds: number }): string => {
        const date = new Date(ts.seconds * 1000);
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Quimera.ai//Appointments//ES',
        'BEGIN:VEVENT',
        `UID:${appointment.id}`,
        `DTSTART:${formatICSDate(appointment.startDate)}`,
        `DTEND:${formatICSDate(appointment.endDate)}`,
        `SUMMARY:${appointment.title}`,
        appointment.description ? `DESCRIPTION:${appointment.description.replace(/\n/g, '\\n')}` : '',
        appointment.location?.address ? `LOCATION:${appointment.location.address}` : '',
        ...appointment.participants.map(p => `ATTENDEE;CN=${p.name}:mailto:${p.email}`),
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean);

    return lines.join('\r\n');
};

/**
 * Descarga la cita como archivo ICS
 */
export const downloadAsICS = (appointment: Appointment): void => {
    const icsContent = appointmentToICS(appointment);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${appointment.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};





















