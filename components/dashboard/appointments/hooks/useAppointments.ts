/**
 * useAppointments Hook
 * Hook personalizado para gestionar el estado y operaciones de citas
 * Las citas están sincronizadas por proyecto (projectId)
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
import { useProject } from '../../../../contexts/project';
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
    generateAppointmentId,
    dateToTimestamp,
    filterByDateRange,
    sortByStartDate,
    getStartOfWeek,
    getEndOfWeek,
    getTodayAppointments,
    getUpcomingAppointments,
    findConflicts,
    calculateDuration,
} from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface UseAppointmentsReturn {
    // State
    appointments: Appointment[];
    isLoading: boolean;
    error: string | null;
    
    // Selected appointment
    selectedAppointment: Appointment | null;
    setSelectedAppointment: (apt: Appointment | null) => void;
    
    // Filtered/sorted appointments
    filteredAppointments: Appointment[];
    
    // Filters
    filters: AppointmentFilters;
    setFilters: React.Dispatch<React.SetStateAction<AppointmentFilters>>;
    clearFilters: () => void;
    
    // Sort
    sortOptions: AppointmentSortOptions;
    setSortOptions: React.Dispatch<React.SetStateAction<AppointmentSortOptions>>;
    
    // CRUD Operations
    createAppointment: (data: Partial<Appointment>) => Promise<Appointment>;
    updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
    deleteAppointment: (id: string) => Promise<void>;
    
    // Status operations
    updateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
    confirmAppointment: (id: string) => Promise<void>;
    cancelAppointment: (id: string, reason?: string) => Promise<void>;
    completeAppointment: (id: string, outcome?: string, notes?: string) => Promise<void>;
    markNoShow: (id: string) => Promise<void>;
    
    // Participant operations
    addParticipant: (appointmentId: string, participant: AppointmentParticipant) => Promise<void>;
    removeParticipant: (appointmentId: string, participantId: string) => Promise<void>;
    updateParticipantStatus: (
        appointmentId: string,
        participantId: string,
        status: 'accepted' | 'declined' | 'tentative'
    ) => Promise<void>;
    
    // Conflict detection
    checkConflicts: (start: Date, end: Date, excludeId?: string) => Appointment[];
    
    // Computed values
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

// =============================================================================
// HOOK
// =============================================================================

export const useAppointments = (): UseAppointmentsReturn => {
    const { user } = useAuth();
    const { activeProjectId } = useProject();
    
    // State
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    
    // Filters & Sort
    const [filters, setFilters] = useState<AppointmentFilters>(DEFAULT_FILTERS);
    const [sortOptions, setSortOptions] = useState<AppointmentSortOptions>(DEFAULT_SORT);
    
    // ==========================================================================
    // FIREBASE LISTENER - Sincronizado por proyecto
    // ==========================================================================
    
    useEffect(() => {
        console.log('[useAppointments] 🔄 useEffect triggered', { hasUser: !!user, activeProjectId });
        
        if (!user) {
            console.log('[useAppointments] ⚠️ No user, clearing appointments');
            setAppointments([]);
            setIsLoading(false);
            return;
        }

        if (!activeProjectId) {
            console.log('[useAppointments] ⚠️ No activeProjectId, clearing appointments');
            setAppointments([]);
            setIsLoading(false);
            setError('Selecciona un proyecto para ver las citas');
            return;
        }

        setIsLoading(true);
        setError(null);

        // Ruta sincronizada por proyecto: users/{userId}/projects/{projectId}/appointments
        const appointmentPath = `users/${user.uid}/projects/${activeProjectId}/appointments`;
        console.log('[useAppointments] 📍 Loading appointments from:', appointmentPath);
        
        const appointmentsRef = collection(db, 'users', user.uid, 'projects', activeProjectId, 'appointments');
        const q = query(appointmentsRef, orderBy('startDate', 'asc'));
        
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                console.log('[useAppointments] 📅 Received snapshot with', snapshot.size, 'documents');
                console.log('[useAppointments] 📅 Reading from path: users/' + user.uid + '/projects/' + activeProjectId + '/appointments');
                const appointmentsData: Appointment[] = [];
                snapshot.forEach((doc) => {
                    console.log('[useAppointments] 📅 Found appointment:', doc.id, doc.data().title);
                    appointmentsData.push({
                        id: doc.id,
                        ...doc.data(),
                        projectId: activeProjectId, // Asegurar que projectId esté presente
                    } as Appointment);
                });
                setAppointments(appointmentsData);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching appointments:', err);
                setError('Error al cargar las citas');
                setIsLoading(false);
            }
        );
        
        return () => unsubscribe();
    }, [user, activeProjectId]);
    
    // ==========================================================================
    // FILTERED & SORTED APPOINTMENTS
    // ==========================================================================
    
    const filteredAppointments = useMemo(() => {
        let result = [...appointments];
        
        // Text search
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
        
        // Status filter
        if (filters.statuses && filters.statuses.length > 0) {
            result = result.filter(apt => filters.statuses!.includes(apt.status));
        } else {
            // Default: hide cancelled unless explicitly shown
            if (!filters.showCancelled) {
                result = result.filter(apt => apt.status !== 'cancelled');
            }
            if (!filters.showCompleted) {
                result = result.filter(apt => apt.status !== 'completed');
            }
        }
        
        // Type filter
        if (filters.types && filters.types.length > 0) {
            result = result.filter(apt => filters.types!.includes(apt.type));
        }
        
        // Priority filter
        if (filters.priorities && filters.priorities.length > 0) {
            result = result.filter(apt => filters.priorities!.includes(apt.priority));
        }
        
        // Date range filter
        if (filters.dateRange?.start && filters.dateRange?.end) {
            result = filterByDateRange(
                result,
                new Date(filters.dateRange.start),
                new Date(filters.dateRange.end)
            );
        }
        
        // Tags filter
        if (filters.tags && filters.tags.length > 0) {
            result = result.filter(apt =>
                apt.tags?.some(tag => filters.tags!.includes(tag))
            );
        }
        
        // Participant filter
        if (filters.participantIds && filters.participantIds.length > 0) {
            result = result.filter(apt =>
                apt.participants.some(p => filters.participantIds!.includes(p.id))
            );
        }
        
        // Linked leads filter
        if (filters.linkedLeadIds && filters.linkedLeadIds.length > 0) {
            result = result.filter(apt =>
                apt.linkedLeadIds?.some(id => filters.linkedLeadIds!.includes(id))
            );
        }
        
        // Sort
        result = sortByStartDate(result, sortOptions.direction === 'asc');
        
        return result;
    }, [appointments, filters, sortOptions]);
    
    // ==========================================================================
    // COMPUTED VALUES
    // ==========================================================================
    
    const todayAppointments = useMemo(() => {
        return getTodayAppointments(appointments);
    }, [appointments]);
    
    const upcomingAppointments = useMemo(() => {
        return getUpcomingAppointments(appointments, 10);
    }, [appointments]);
    
    const thisWeekAppointments = useMemo(() => {
        const now = new Date();
        const start = getStartOfWeek(now);
        const end = getEndOfWeek(now);
        return filterByDateRange(appointments, start, end)
            .filter(apt => apt.status !== 'cancelled');
    }, [appointments]);
    
    const analytics = useMemo((): AppointmentAnalytics => {
        const total = appointments.length;
        const completed = appointments.filter(a => a.status === 'completed').length;
        const cancelled = appointments.filter(a => a.status === 'cancelled').length;
        const noShows = appointments.filter(a => a.status === 'no_show').length;
        const upcoming = appointments.filter(a => 
            a.status !== 'cancelled' && 
            a.status !== 'completed' &&
            a.startDate.seconds > Date.now() / 1000
        ).length;
        
        // Calculate average duration
        const completedWithDuration = appointments.filter(a => 
            a.status === 'completed' && a.actualDuration
        );
        const avgDuration = completedWithDuration.length > 0
            ? completedWithDuration.reduce((sum, a) => sum + (a.actualDuration || 0), 0) / completedWithDuration.length
            : 45;
        
        // Group by type
        const byType: Record<string, number> = {};
        appointments.forEach(apt => {
            byType[apt.type] = (byType[apt.type] || 0) + 1;
        });
        
        // Group by status
        const byStatus: Record<string, number> = {};
        appointments.forEach(apt => {
            byStatus[apt.status] = (byStatus[apt.status] || 0) + 1;
        });
        
        // Group by priority
        const byPriority: Record<string, number> = {};
        appointments.forEach(apt => {
            byPriority[apt.priority] = (byPriority[apt.priority] || 0) + 1;
        });
        
        // Find busiest day
        const dayCount: Record<number, number> = {};
        appointments.forEach(apt => {
            const day = new Date(apt.startDate.seconds * 1000).getDay();
            dayCount[day] = (dayCount[day] || 0) + 1;
        });
        const busiestDayNum = Object.entries(dayCount)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || '1';
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        // Find busiest hour
        const hourCount: Record<number, number> = {};
        appointments.forEach(apt => {
            const hour = new Date(apt.startDate.seconds * 1000).getHours();
            hourCount[hour] = (hourCount[hour] || 0) + 1;
        });
        const busiestHour = parseInt(
            Object.entries(hourCount).sort(([, a], [, b]) => b - a)[0]?.[0] || '10'
        );
        
        return {
            totalAppointments: total,
            completedAppointments: completed,
            cancelledAppointments: cancelled,
            upcomingAppointments: upcoming,
            completionRate: total > 0 ? (completed / total) * 100 : 0,
            cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
            noShowRate: total > 0 ? (noShows / total) * 100 : 0,
            reschedulingRate: 0, // Would need to track this
            averageDuration: avgDuration,
            totalTimeInMeetings: completedWithDuration.reduce((sum, a) => sum + (a.actualDuration || 0), 0),
            busiestDay: dayNames[parseInt(busiestDayNum)],
            busiestHour,
            quietestDay: dayNames[0], // Simplified
            conversionRate: 0, // Would need deals data
            averageDealsPerAppointment: 0,
            byType: byType as any,
            byStatus: byStatus as any,
            byOutcome: {
                successful: 0,
                partially_successful: 0,
                unsuccessful: 0,
                needs_follow_up: 0,
            },
            byPriority: byPriority as any,
            trendsLastMonth: [],
            vsLastMonth: {
                appointmentsChange: 0,
                completionRateChange: 0,
                avgDurationChange: 0,
            },
        };
    }, [appointments]);
    
    // ==========================================================================
    // CRUD OPERATIONS
    // ==========================================================================
    
    const createAppointment = useCallback(async (data: Partial<Appointment>): Promise<Appointment> => {
        if (!user) throw new Error('Usuario no autenticado');
        if (!activeProjectId) throw new Error('No hay proyecto seleccionado');
        
        const now = dateToTimestamp(new Date());
        
        // Deep clean function to remove ALL undefined values recursively
        const deepClean = (obj: any): any => {
            if (obj === null || obj === undefined) return undefined;
            if (Array.isArray(obj)) {
                return obj.map(item => deepClean(item)).filter(item => item !== undefined);
            }
            if (typeof obj === 'object' && obj !== null) {
                const cleaned: Record<string, any> = {};
                for (const key in obj) {
                    const value = deepClean(obj[key]);
                    if (value !== undefined) {
                        cleaned[key] = value;
                    }
                }
                return Object.keys(cleaned).length > 0 ? cleaned : undefined;
            }
            return obj;
        };
        
        // Build clean location object
        const locationData = data.location || { type: 'virtual' };
        const cleanLocation: Record<string, any> = { type: locationData.type || 'virtual' };
        if (locationData.meetingUrl) cleanLocation.meetingUrl = locationData.meetingUrl;
        if (locationData.address) cleanLocation.address = locationData.address;
        if (locationData.phoneNumber) cleanLocation.phoneNumber = locationData.phoneNumber;
        if (locationData.platform) cleanLocation.platform = locationData.platform;
        
        // Build base appointment object - only include defined values
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
                ...r,
                id: `reminder_${i}_${Date.now()}`,
                sent: false,
            })),
            attachments: [],
            notes: [],
            followUpActions: [],
            aiPrepEnabled: data.aiPrepEnabled ?? true,
            linkedLeadIds: data.linkedLeadIds || [],
            tags: data.tags || [],
            createdAt: now,
            createdBy: user.uid,
            projectId: activeProjectId, // Incluir projectId en el documento
        };
        
        // Add optional fields only if they have values
        if (data.description) newAppointment.description = data.description;
        if (user.displayName) newAppointment.organizerName = user.displayName;
        if (user.email) newAppointment.organizerEmail = user.email;
        if (data.color) newAppointment.color = data.color;
        
        // Final deep clean to ensure no undefined values anywhere
        const finalData = deepClean(newAppointment);
        
        // Ruta sincronizada por proyecto: users/{userId}/projects/{projectId}/appointments
        const appointmentsRef = collection(db, 'users', user.uid, 'projects', activeProjectId, 'appointments');
        const docRef = await addDoc(appointmentsRef, finalData);
        
        return {
            id: docRef.id,
            ...finalData,
        } as Appointment;
    }, [user, activeProjectId]);
    
    const updateAppointment = useCallback(async (id: string, data: Partial<Appointment>): Promise<void> => {
        if (!user) throw new Error('Usuario no autenticado');
        if (!activeProjectId) throw new Error('No hay proyecto seleccionado');
        
        // Ruta sincronizada por proyecto
        const appointmentRef = doc(db, 'users', user.uid, 'projects', activeProjectId, 'appointments', id);
        await updateDoc(appointmentRef, {
            ...data,
            updatedAt: dateToTimestamp(new Date()),
            updatedBy: user.uid,
        });
        
        // Update selected if it's the same
        if (selectedAppointment?.id === id) {
            setSelectedAppointment(prev => prev ? { ...prev, ...data } : null);
        }
    }, [user, activeProjectId, selectedAppointment]);
    
    const deleteAppointment = useCallback(async (id: string): Promise<void> => {
        if (!user) throw new Error('Usuario no autenticado');
        if (!activeProjectId) throw new Error('No hay proyecto seleccionado');
        
        // Ruta sincronizada por proyecto
        const appointmentRef = doc(db, 'users', user.uid, 'projects', activeProjectId, 'appointments', id);
        await deleteDoc(appointmentRef);
        
        if (selectedAppointment?.id === id) {
            setSelectedAppointment(null);
        }
    }, [user, activeProjectId, selectedAppointment]);
    
    // ==========================================================================
    // STATUS OPERATIONS
    // ==========================================================================
    
    const updateStatus = useCallback(async (id: string, status: AppointmentStatus): Promise<void> => {
        await updateAppointment(id, { status });
    }, [updateAppointment]);
    
    const confirmAppointment = useCallback(async (id: string): Promise<void> => {
        await updateStatus(id, 'confirmed');
    }, [updateStatus]);
    
    const cancelAppointment = useCallback(async (id: string, reason?: string): Promise<void> => {
        await updateAppointment(id, {
            status: 'cancelled',
            cancelledAt: dateToTimestamp(new Date()),
            cancelledBy: user?.uid,
            cancelledReason: reason,
        });
    }, [updateAppointment, user]);
    
    const completeAppointment = useCallback(async (
        id: string,
        outcome?: string,
        notes?: string
    ): Promise<void> => {
        const appointment = appointments.find(a => a.id === id);
        const actualDuration = appointment
            ? calculateDuration(appointment.startDate, appointment.endDate)
            : undefined;
        
        await updateAppointment(id, {
            status: 'completed',
            completedAt: dateToTimestamp(new Date()),
            outcome: outcome as any,
            outcomeNotes: notes,
            actualDuration,
        });
    }, [updateAppointment, appointments]);
    
    const markNoShow = useCallback(async (id: string): Promise<void> => {
        await updateStatus(id, 'no_show');
    }, [updateStatus]);
    
    // ==========================================================================
    // PARTICIPANT OPERATIONS
    // ==========================================================================
    
    const addParticipant = useCallback(async (
        appointmentId: string,
        participant: AppointmentParticipant
    ): Promise<void> => {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (!appointment) throw new Error('Cita no encontrada');
        
        const updatedParticipants = [...appointment.participants, participant];
        await updateAppointment(appointmentId, { participants: updatedParticipants });
    }, [appointments, updateAppointment]);
    
    const removeParticipant = useCallback(async (
        appointmentId: string,
        participantId: string
    ): Promise<void> => {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (!appointment) throw new Error('Cita no encontrada');
        
        const updatedParticipants = appointment.participants.filter(p => p.id !== participantId);
        await updateAppointment(appointmentId, { participants: updatedParticipants });
    }, [appointments, updateAppointment]);
    
    const updateParticipantStatus = useCallback(async (
        appointmentId: string,
        participantId: string,
        status: 'accepted' | 'declined' | 'tentative'
    ): Promise<void> => {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (!appointment) throw new Error('Cita no encontrada');
        
        const updatedParticipants = appointment.participants.map(p =>
            p.id === participantId
                ? { ...p, status, responseAt: dateToTimestamp(new Date()) }
                : p
        );
        await updateAppointment(appointmentId, { participants: updatedParticipants });
    }, [appointments, updateAppointment]);
    
    // ==========================================================================
    // CONFLICT DETECTION
    // ==========================================================================
    
    const checkConflicts = useCallback((
        start: Date,
        end: Date,
        excludeId?: string
    ): Appointment[] => {
        return findConflicts(appointments, {
            id: excludeId || '',
            startDate: dateToTimestamp(start),
            endDate: dateToTimestamp(end),
        });
    }, [appointments]);
    
    // ==========================================================================
    // UTILITY FUNCTIONS
    // ==========================================================================
    
    const clearFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
    }, []);
    
    const refresh = useCallback(async (): Promise<void> => {
        if (!user || !activeProjectId) return;
        
        setIsLoading(true);
        try {
            // Ruta sincronizada por proyecto
            const appointmentsRef = collection(db, 'users', user.uid, 'projects', activeProjectId, 'appointments');
            const q = query(appointmentsRef, orderBy('startDate', 'asc'));
            const snapshot = await getDocs(q);
            
            const appointmentsData: Appointment[] = [];
            snapshot.forEach((doc) => {
                appointmentsData.push({
                    id: doc.id,
                    ...doc.data(),
                    projectId: activeProjectId,
                } as Appointment);
            });
            
            setAppointments(appointmentsData);
        } catch (err) {
            console.error('Error refreshing appointments:', err);
            setError('Error al actualizar las citas');
        } finally {
            setIsLoading(false);
        }
    }, [user, activeProjectId]);
    
    // ==========================================================================
    // RETURN
    // ==========================================================================
    
    return {
        // State
        appointments,
        isLoading,
        error,
        selectedAppointment,
        setSelectedAppointment,
        
        // Filtered appointments
        filteredAppointments,
        
        // Filters
        filters,
        setFilters,
        clearFilters,
        
        // Sort
        sortOptions,
        setSortOptions,
        
        // CRUD
        createAppointment,
        updateAppointment,
        deleteAppointment,
        
        // Status
        updateStatus,
        confirmAppointment,
        cancelAppointment,
        completeAppointment,
        markNoShow,
        
        // Participants
        addParticipant,
        removeParticipant,
        updateParticipantStatus,
        
        // Conflicts
        checkConflicts,
        
        // Computed
        todayAppointments,
        upcomingAppointments,
        thisWeekAppointments,
        analytics,
        
        // Refresh
        refresh,
    };
};

export default useAppointments;

