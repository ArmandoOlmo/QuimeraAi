/**
 * useAdminAppointments Hook
 * Hook para gestionar citas a nivel de plataforma (Super Admin)
 * Los datos se almacenan en la colección raíz `platformAppointments` — NO asociados a ningún proyecto
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Appointment,
    AppointmentStatus,
    AppointmentFilters,
    AppointmentSortOptions,
    AppointmentAnalytics,
    AppointmentParticipant,
    DEFAULT_REMINDERS,
} from '../../../../types';
import { useAuth } from '../../../../contexts/core/AuthContext';
import {
    db,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
} from '../../../../firebase';
import {
    dateToTimestamp,
    filterByDateRange,
    sortByStartDate,
    getStartOfWeek,
    getEndOfWeek,
    getTodayAppointments,
    getUpcomingAppointments,
    findConflicts,
    calculateDuration,
} from '../../appointments/utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface UseAdminAppointmentsReturn {
    // State
    appointments: Appointment[];
    isLoading: boolean;
    error: string | null;

    // Selected
    selectedAppointment: Appointment | null;
    setSelectedAppointment: (apt: Appointment | null) => void;

    // Filtered/sorted
    filteredAppointments: Appointment[];

    // Filters
    filters: AppointmentFilters;
    setFilters: React.Dispatch<React.SetStateAction<AppointmentFilters>>;
    clearFilters: () => void;

    // Sort
    sortOptions: AppointmentSortOptions;
    setSortOptions: React.Dispatch<React.SetStateAction<AppointmentSortOptions>>;

    // CRUD
    createAppointment: (data: Partial<Appointment>) => Promise<Appointment>;
    updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
    deleteAppointment: (id: string) => Promise<void>;

    // Status
    updateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
    confirmAppointment: (id: string) => Promise<void>;
    cancelAppointment: (id: string, reason?: string) => Promise<void>;
    completeAppointment: (id: string, outcome?: string, notes?: string) => Promise<void>;
    markNoShow: (id: string) => Promise<void>;

    // Participants
    addParticipant: (appointmentId: string, participant: AppointmentParticipant) => Promise<void>;
    removeParticipant: (appointmentId: string, participantId: string) => Promise<void>;
    updateParticipantStatus: (
        appointmentId: string,
        participantId: string,
        status: 'accepted' | 'declined' | 'tentative'
    ) => Promise<void>;

    // Conflicts
    checkConflicts: (start: Date, end: Date, excludeId?: string) => Appointment[];

    // Computed
    todayAppointments: Appointment[];
    upcomingAppointments: Appointment[];
    thisWeekAppointments: Appointment[];
    analytics: AppointmentAnalytics;

    // Refresh
    refresh: () => Promise<void>;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_FILTERS: AppointmentFilters = {
    search: '',
    statuses: [],
    types: [],
    priorities: [],
    participantIds: [],
    tags: [],
    showCancelled: false,
    showCompleted: true,
};

const DEFAULT_SORT: AppointmentSortOptions = {
    field: 'startDate',
    direction: 'asc',
};

const PLATFORM_ID = '__platform__';

// =============================================================================
// HOOK
// =============================================================================

export const useAdminAppointments = (): UseAdminAppointmentsReturn => {
    const { user } = useAuth();

    // State
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // Filters & Sort
    const [filters, setFilters] = useState<AppointmentFilters>(DEFAULT_FILTERS);
    const [sortOptions, setSortOptions] = useState<AppointmentSortOptions>(DEFAULT_SORT);

    // =========================================================================
    // FIREBASE LISTENER — Platform-level (no project scope)
    // =========================================================================

    useEffect(() => {
        if (!user) {
            setAppointments([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const appointmentsRef = collection(db, 'platformAppointments');
        const q = query(appointmentsRef, orderBy('startDate', 'asc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data: Appointment[] = [];
                snapshot.forEach((docSnap) => {
                    data.push({
                        id: docSnap.id,
                        ...docSnap.data(),
                        projectId: PLATFORM_ID,
                    } as Appointment);
                });
                setAppointments(data);
                setIsLoading(false);
            },
            (err) => {
                console.error('[useAdminAppointments] Error:', err);
                setError('Error al cargar las citas de plataforma');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // =========================================================================
    // FILTERED & SORTED
    // =========================================================================

    const filteredAppointments = useMemo(() => {
        let result = [...appointments];

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(apt =>
                apt.title.toLowerCase().includes(searchLower) ||
                apt.description?.toLowerCase().includes(searchLower) ||
                apt.participants.some(p =>
                    p.name.toLowerCase().includes(searchLower) ||
                    p.email.toLowerCase().includes(searchLower)
                )
            );
        }

        if (filters.statuses && filters.statuses.length > 0) {
            result = result.filter(apt => filters.statuses!.includes(apt.status));
        } else {
            if (!filters.showCancelled) {
                result = result.filter(apt => apt.status !== 'cancelled');
            }
            if (!filters.showCompleted) {
                result = result.filter(apt => apt.status !== 'completed');
            }
        }

        if (filters.types && filters.types.length > 0) {
            result = result.filter(apt => filters.types!.includes(apt.type));
        }

        if (filters.priorities && filters.priorities.length > 0) {
            result = result.filter(apt => filters.priorities!.includes(apt.priority));
        }

        if (filters.dateRange?.start && filters.dateRange?.end) {
            result = filterByDateRange(result, new Date(filters.dateRange.start), new Date(filters.dateRange.end));
        }

        if (filters.tags && filters.tags.length > 0) {
            result = result.filter(apt => apt.tags?.some(tag => filters.tags!.includes(tag)));
        }

        result = sortByStartDate(result, sortOptions.direction === 'asc');
        return result;
    }, [appointments, filters, sortOptions]);

    // =========================================================================
    // COMPUTED
    // =========================================================================

    const todayAppointments = useMemo(() => getTodayAppointments(appointments), [appointments]);
    const upcomingAppointments = useMemo(() => getUpcomingAppointments(appointments, 10), [appointments]);

    const thisWeekAppointments = useMemo(() => {
        const now = new Date();
        return filterByDateRange(appointments, getStartOfWeek(now), getEndOfWeek(now))
            .filter(apt => apt.status !== 'cancelled');
    }, [appointments]);

    const analytics = useMemo((): AppointmentAnalytics => {
        const total = appointments.length;
        const completed = appointments.filter(a => a.status === 'completed').length;
        const cancelled = appointments.filter(a => a.status === 'cancelled').length;
        const noShows = appointments.filter(a => a.status === 'no_show').length;
        const upcoming = appointments.filter(a =>
            a.status !== 'cancelled' && a.status !== 'completed' && a.startDate.seconds > Date.now() / 1000
        ).length;

        const completedWithDuration = appointments.filter(a => a.status === 'completed' && a.actualDuration);
        const avgDuration = completedWithDuration.length > 0
            ? completedWithDuration.reduce((sum, a) => sum + (a.actualDuration || 0), 0) / completedWithDuration.length
            : 45;

        const byType: Record<string, number> = {};
        appointments.forEach(apt => { byType[apt.type] = (byType[apt.type] || 0) + 1; });
        const byStatus: Record<string, number> = {};
        appointments.forEach(apt => { byStatus[apt.status] = (byStatus[apt.status] || 0) + 1; });
        const byPriority: Record<string, number> = {};
        appointments.forEach(apt => { byPriority[apt.priority] = (byPriority[apt.priority] || 0) + 1; });

        const dayCount: Record<number, number> = {};
        appointments.forEach(apt => {
            const day = new Date(apt.startDate.seconds * 1000).getDay();
            dayCount[day] = (dayCount[day] || 0) + 1;
        });
        const busiestDayNum = Object.entries(dayCount).sort(([, a], [, b]) => b - a)[0]?.[0] || '1';
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        const hourCount: Record<number, number> = {};
        appointments.forEach(apt => {
            const hour = new Date(apt.startDate.seconds * 1000).getHours();
            hourCount[hour] = (hourCount[hour] || 0) + 1;
        });
        const busiestHour = parseInt(Object.entries(hourCount).sort(([, a], [, b]) => b - a)[0]?.[0] || '10');

        return {
            totalAppointments: total,
            completedAppointments: completed,
            cancelledAppointments: cancelled,
            upcomingAppointments: upcoming,
            completionRate: total > 0 ? (completed / total) * 100 : 0,
            cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
            noShowRate: total > 0 ? (noShows / total) * 100 : 0,
            reschedulingRate: 0,
            averageDuration: avgDuration,
            totalTimeInMeetings: completedWithDuration.reduce((sum, a) => sum + (a.actualDuration || 0), 0),
            busiestDay: dayNames[parseInt(busiestDayNum)],
            busiestHour,
            quietestDay: dayNames[0],
            conversionRate: 0,
            averageDealsPerAppointment: 0,
            byType: byType as any,
            byStatus: byStatus as any,
            byOutcome: { successful: 0, partially_successful: 0, unsuccessful: 0, needs_follow_up: 0 },
            byPriority: byPriority as any,
            trendsLastMonth: [],
            vsLastMonth: { appointmentsChange: 0, completionRateChange: 0, avgDurationChange: 0 },
        };
    }, [appointments]);

    // =========================================================================
    // CRUD
    // =========================================================================

    const createAppointment = useCallback(async (data: Partial<Appointment>): Promise<Appointment> => {
        if (!user) throw new Error('Usuario no autenticado');

        const now = dateToTimestamp(new Date());

        // Deep clean to remove undefined values
        const deepClean = (obj: any): any => {
            if (obj === null || obj === undefined) return undefined;
            if (Array.isArray(obj)) return obj.map(item => deepClean(item)).filter(item => item !== undefined);
            if (typeof obj === 'object' && obj !== null) {
                const cleaned: Record<string, any> = {};
                for (const key in obj) {
                    const value = deepClean(obj[key]);
                    if (value !== undefined) cleaned[key] = value;
                }
                return Object.keys(cleaned).length > 0 ? cleaned : undefined;
            }
            return obj;
        };

        const locationData = data.location || { type: 'virtual' };
        const cleanLocation: Record<string, any> = { type: locationData.type || 'virtual' };
        if (locationData.meetingUrl) cleanLocation.meetingUrl = locationData.meetingUrl;
        if (locationData.address) cleanLocation.address = locationData.address;

        const newAppointment: Record<string, any> = {
            title: data.title || 'Nueva Cita',
            type: data.type || 'video_call',
            status: data.status || 'scheduled',
            priority: data.priority || 'medium',
            startDate: data.startDate || now,
            endDate: data.endDate || now,
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            organizerId: user.uid,
            participants: deepClean(data.participants) || [],
            location: cleanLocation,
            reminders: deepClean(data.reminders) || DEFAULT_REMINDERS.map((r, i) => ({
                ...r, id: `reminder_${i}_${Date.now()}`, sent: false,
            })),
            attachments: [],
            notes: [],
            followUpActions: [],
            aiPrepEnabled: data.aiPrepEnabled ?? true,
            linkedLeadIds: data.linkedLeadIds || [],
            tags: data.tags || [],
            createdAt: now,
            createdBy: user.uid,
            projectId: PLATFORM_ID,
        };

        if (data.description) newAppointment.description = data.description;
        if (user.displayName) newAppointment.organizerName = user.displayName;
        if (user.email) newAppointment.organizerEmail = user.email;
        if (data.color) newAppointment.color = data.color;

        const finalData = deepClean(newAppointment);
        const appointmentsRef = collection(db, 'platformAppointments');
        const docRef = await addDoc(appointmentsRef, finalData);

        return { id: docRef.id, ...finalData } as Appointment;
    }, [user]);

    const updateAppointment = useCallback(async (id: string, data: Partial<Appointment>): Promise<void> => {
        if (!user) throw new Error('Usuario no autenticado');
        const ref = doc(db, 'platformAppointments', id);
        await updateDoc(ref, { ...data, updatedAt: dateToTimestamp(new Date()), updatedBy: user.uid });

        if (selectedAppointment?.id === id) {
            setSelectedAppointment(prev => prev ? { ...prev, ...data } : null);
        }
    }, [user, selectedAppointment]);

    const deleteAppointment = useCallback(async (id: string): Promise<void> => {
        if (!user) throw new Error('Usuario no autenticado');
        const ref = doc(db, 'platformAppointments', id);
        await deleteDoc(ref);
        if (selectedAppointment?.id === id) setSelectedAppointment(null);
    }, [user, selectedAppointment]);

    // =========================================================================
    // STATUS
    // =========================================================================

    const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
        await updateAppointment(id, { status });
    }, [updateAppointment]);

    const confirmAppointment = useCallback(async (id: string) => {
        await updateStatus(id, 'confirmed');
    }, [updateStatus]);

    const cancelAppointment = useCallback(async (id: string, reason?: string) => {
        await updateAppointment(id, {
            status: 'cancelled',
            cancelledAt: dateToTimestamp(new Date()),
            cancelledBy: user?.uid,
            cancelledReason: reason,
        });
    }, [updateAppointment, user]);

    const completeAppointment = useCallback(async (id: string, outcome?: string, notes?: string) => {
        const appointment = appointments.find(a => a.id === id);
        const actualDuration = appointment ? calculateDuration(appointment.startDate, appointment.endDate) : undefined;
        await updateAppointment(id, {
            status: 'completed',
            completedAt: dateToTimestamp(new Date()),
            outcome: outcome as any,
            outcomeNotes: notes,
            actualDuration,
        });
    }, [updateAppointment, appointments]);

    const markNoShow = useCallback(async (id: string) => {
        await updateStatus(id, 'no_show');
    }, [updateStatus]);

    // =========================================================================
    // PARTICIPANTS
    // =========================================================================

    const addParticipant = useCallback(async (appointmentId: string, participant: AppointmentParticipant) => {
        const apt = appointments.find(a => a.id === appointmentId);
        if (!apt) throw new Error('Cita no encontrada');
        await updateAppointment(appointmentId, { participants: [...apt.participants, participant] });
    }, [appointments, updateAppointment]);

    const removeParticipant = useCallback(async (appointmentId: string, participantId: string) => {
        const apt = appointments.find(a => a.id === appointmentId);
        if (!apt) throw new Error('Cita no encontrada');
        await updateAppointment(appointmentId, { participants: apt.participants.filter(p => p.id !== participantId) });
    }, [appointments, updateAppointment]);

    const updateParticipantStatus = useCallback(async (
        appointmentId: string, participantId: string, status: 'accepted' | 'declined' | 'tentative'
    ) => {
        const apt = appointments.find(a => a.id === appointmentId);
        if (!apt) throw new Error('Cita no encontrada');
        const updated = apt.participants.map(p =>
            p.id === participantId ? { ...p, status, responseAt: dateToTimestamp(new Date()) } : p
        );
        await updateAppointment(appointmentId, { participants: updated });
    }, [appointments, updateAppointment]);

    // =========================================================================
    // CONFLICT DETECTION
    // =========================================================================

    const checkConflicts = useCallback((start: Date, end: Date, excludeId?: string): Appointment[] => {
        return findConflicts(appointments, {
            id: excludeId || '',
            startDate: dateToTimestamp(start),
            endDate: dateToTimestamp(end),
        });
    }, [appointments]);

    // =========================================================================
    // UTILITY
    // =========================================================================

    const clearFilters = useCallback(() => { setFilters(DEFAULT_FILTERS); }, []);

    const refresh = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const ref = collection(db, 'platformAppointments');
            const q = query(ref, orderBy('startDate', 'asc'));
            const snapshot = await getDocs(q);
            const data: Appointment[] = [];
            snapshot.forEach((docSnap) => {
                data.push({ id: docSnap.id, ...docSnap.data(), projectId: PLATFORM_ID } as Appointment);
            });
            setAppointments(data);
        } catch (err) {
            console.error('[useAdminAppointments] Error refreshing:', err);
            setError('Error al actualizar las citas');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // =========================================================================
    // RETURN
    // =========================================================================

    return {
        appointments,
        isLoading,
        error,
        selectedAppointment,
        setSelectedAppointment,
        filteredAppointments,
        filters,
        setFilters,
        clearFilters,
        sortOptions,
        setSortOptions,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        updateStatus,
        confirmAppointment,
        cancelAppointment,
        completeAppointment,
        markNoShow,
        addParticipant,
        removeParticipant,
        updateParticipantStatus,
        checkConflicts,
        todayAppointments,
        upcomingAppointments,
        thisWeekAppointments,
        analytics,
        refresh,
    };
};

export default useAdminAppointments;
