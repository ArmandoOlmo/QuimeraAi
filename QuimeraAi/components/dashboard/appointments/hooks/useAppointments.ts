/**
 * useAppointments Hook
 * Hook personalizado para gestionar el estado y operaciones de citas
 * Las citas están sincronizadas por proyecto (projectId) a través de Supabase
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useSafeTenant } from '../../../../contexts/tenant';
import { supabase } from '../../../../supabase';
import {
    filterByDateRange,
    sortByStartDate,
    getStartOfWeek,
    getEndOfWeek,
    getTodayAppointments,
    getUpcomingAppointments,
    findConflicts,
    calculateDuration,
    dateToTimestamp,
} from '../utils/appointmentHelpers';
import {
    cancelAppointmentCanonical,
    completeAppointmentCanonical,
    confirmAppointmentCanonical,
    createAppointmentCanonical,
    getAppointmentsByProject,
    markNoShowCanonical,
    updateAppointmentCanonical,
} from '../../../../services/appointments/appointmentEngineService';
import { buildAppointmentEngineAnalytics } from '../../../../services/appointments/appointmentAnalyticsService';

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
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProjectId } = useProject();
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;
    
    // State
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    
    // Filters & Sort
    const [filters, setFilters] = useState<AppointmentFilters>(DEFAULT_FILTERS);
    const [sortOptions, setSortOptions] = useState<AppointmentSortOptions>(DEFAULT_SORT);
    
    // ==========================================================================
    // SUPABASE LISTENER - Sincronizado por proyecto
    // ==========================================================================
    
    const fetchAppointments = useCallback(async () => {
        if (!user || !activeProjectId) return;
        
        try {
            const appointmentsData = await getAppointmentsByProject(supabase, activeProjectId, {
                includeCancelled: true,
            });
            setAppointments(appointmentsData);
            setError(null);
        } catch (err: any) {
            console.error('[useAppointments] Error fetching appointments:', err);
            setError(err.message || t('appointments.errors.loadAppointments'));
        } finally {
            setIsLoading(false);
        }
    }, [user, activeProjectId, t]);

    useEffect(() => {
        if (!user) {
            setAppointments([]);
            setIsLoading(false);
            return;
        }

        if (!activeProjectId) {
            setAppointments([]);
            setIsLoading(false);
            setError(t('appointments.errors.selectProject'));
            return;
        }

        setIsLoading(true);
        fetchAppointments();

        const channel = supabase.channel(`public:appointments:project_id=eq.${activeProjectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_appointments',
                filter: `project_id=eq.${activeProjectId}`
            }, () => {
                fetchAppointments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId, fetchAppointments]);
    
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
                apt.participants?.some(p => 
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
        
        // Sort
        return sortByStartDate(result, sortOptions.direction === 'asc');
    }, [appointments, filters, sortOptions]);
    
    // ==========================================================================
    // CRUD OPERATIONS
    // ==========================================================================
    
    const createAppointment = async (data: Partial<Appointment>): Promise<Appointment> => {
        if (!user || !activeProjectId) throw new Error(t('appointments.errors.userOrProjectUnavailable'));

        try {
            const result = await createAppointmentCanonical(supabase, {
                ...(data as any),
                tenantId: currentTenantId || data.tenantId,
                projectId: activeProjectId,
                organizerId: data.organizerId || user.id,
                organizerName: data.organizerName || (user.user_metadata?.full_name || user.user_metadata?.name || user.email || ''),
                organizerEmail: data.organizerEmail || user.email || '',
                createdBy: user.id,
                updatedBy: user.id,
                source: data.source || 'dashboard',
                sourceModule: data.sourceModule || 'appointments',
                sourceComponent: data.sourceComponent || 'AppointmentsDashboard',
                createOrLinkLead: true,
            });
            const newAppointment = result.appointment;
            setAppointments(prev => [...prev, newAppointment]);
            return newAppointment;
        } catch (error) {
            console.error('[useAppointments] Error creating appointment:', error);
            throw error;
        }
    };
    
    const updateAppointment = async (id: string, data: Partial<Appointment>): Promise<void> => {
        if (!user || !activeProjectId) throw new Error(t('appointments.errors.userOrProjectUnavailable'));

        try {
            await updateAppointmentCanonical(supabase, id, {
                ...data,
                updatedBy: user.id,
            });
            
            // Optimistic update done via realtime channel
        } catch (error) {
            console.error('[useAppointments] Error updating appointment:', error);
            throw error;
        }
    };
    
    const deleteAppointment = async (id: string): Promise<void> => {
        if (!user || !activeProjectId) throw new Error(t('appointments.errors.userOrProjectUnavailable'));

        try {
            const { error } = await supabase
                .from('project_appointments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            if (selectedAppointment?.id === id) {
                setSelectedAppointment(null);
            }
        } catch (error) {
            console.error('[useAppointments] Error deleting appointment:', error);
            throw error;
        }
    };
    
    // ==========================================================================
    // STATUS OPERATIONS
    // ==========================================================================
    
    const updateStatus = async (id: string, status: AppointmentStatus): Promise<void> => {
        await updateAppointment(id, { status });
    };
    
    const confirmAppointment = async (id: string): Promise<void> => {
        if (!user) throw new Error(t('appointments.errors.userNotLoggedIn'));
        await confirmAppointmentCanonical(supabase, id, user.id);
    };
    
    const cancelAppointment = async (id: string, reason?: string): Promise<void> => {
        if (!user) throw new Error(t('appointments.errors.userNotLoggedIn'));
        
        try {
            await cancelAppointmentCanonical(supabase, id, reason, user.id);
        } catch (error) {
            console.error('[useAppointments] Error cancelling appointment:', error);
            throw error;
        }
    };
    
    const completeAppointment = async (id: string, outcome?: string, notes?: string): Promise<void> => {
        if (!user) throw new Error(t('appointments.errors.userNotLoggedIn'));
        
        const apt = appointments.find(a => a.id === id);
        if (!apt) throw new Error(t('appointments.errors.notFound'));
        
        // Calculate duration if not provided
        const duration = apt.actualDuration || calculateDuration(
            apt.startDate,
            apt.endDate
        );
        
        try {
            await completeAppointmentCanonical(supabase, id, outcome, notes);
            await updateAppointmentCanonical(supabase, id, {
                actualDuration: duration,
                updatedBy: user.id,
            });
        } catch (error) {
            console.error('[useAppointments] Error completing appointment:', error);
            throw error;
        }
    };
    
    const markNoShow = async (id: string): Promise<void> => {
        if (!user) throw new Error(t('appointments.errors.userNotLoggedIn'));
        await markNoShowCanonical(supabase, id, user.id);
    };
    
    // ==========================================================================
    // PARTICIPANT OPERATIONS
    // ==========================================================================
    
    const addParticipant = async (appointmentId: string, participant: AppointmentParticipant): Promise<void> => {
        const apt = appointments.find(a => a.id === appointmentId);
        if (!apt) throw new Error(t('appointments.errors.notFound'));
        
        const currentParticipants = apt.participants || [];
        if (currentParticipants.some(p => p.id === participant.id || p.email === participant.email)) {
            throw new Error(t('appointments.errors.participantAlreadyAdded'));
        }
        
        const updatedParticipants = [...currentParticipants, participant];
        await updateAppointment(appointmentId, { participants: updatedParticipants });
    };
    
    const removeParticipant = async (appointmentId: string, participantId: string): Promise<void> => {
        const apt = appointments.find(a => a.id === appointmentId);
        if (!apt) throw new Error(t('appointments.errors.notFound'));
        
        const updatedParticipants = (apt.participants || []).filter(p => p.id !== participantId);
        await updateAppointment(appointmentId, { participants: updatedParticipants });
    };
    
    const updateParticipantStatus = async (
        appointmentId: string,
        participantId: string,
        status: 'accepted' | 'declined' | 'tentative'
    ): Promise<void> => {
        const apt = appointments.find(a => a.id === appointmentId);
        if (!apt) throw new Error(t('appointments.errors.notFound'));
        
        const updatedParticipants = (apt.participants || []).map(p => {
            if (p.id === participantId) {
                return { ...p, status };
            }
            return p;
        });
        
        await updateAppointment(appointmentId, { participants: updatedParticipants });
    };
    
    // ==========================================================================
    // CONFLICT DETECTION
    // ==========================================================================
    
    const checkConflicts = useCallback((start: Date, end: Date, excludeId?: string): Appointment[] => {
        // Find appointments that overlap with the given time range
        return findConflicts(appointments, {
            id: excludeId || '__candidate__',
            startDate: dateToTimestamp(start),
            endDate: dateToTimestamp(end),
        });
    }, [appointments]);
    
    // ==========================================================================
    // COMPUTED VALUES
    // ==========================================================================
    
    const todayAppointments = useMemo(() => {
        return getTodayAppointments(appointments);
    }, [appointments]);
    
    const upcomingAppointments = useMemo(() => {
        return getUpcomingAppointments(appointments);
    }, [appointments]);
    
    const thisWeekAppointments = useMemo(() => {
        const start = getStartOfWeek(new Date());
        const end = getEndOfWeek(new Date());
        return filterByDateRange(appointments, start, end);
    }, [appointments]);
    
    const analytics = useMemo((): AppointmentAnalytics => {
        const now = new Date();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        const lastMonthAppointments = filterByDateRange(appointments, startOfLastMonth, endOfLastMonth);
        
        // Count statuses
        const completed = appointments.filter(a => a.status === 'completed').length;
        const cancelled = appointments.filter(a => a.status === 'cancelled').length;
        const noShows = appointments.filter(a => a.status === 'no_show').length;
        const rescheduled = appointments.filter(a => a.status === 'rescheduled').length;
        
        const total = appointments.length;
        const totalPast = appointments.filter(a => new Date(a.startDate.seconds * 1000) < now).length || 1; // prevent div by 0
        
        const engine = buildAppointmentEngineAnalytics(appointments);

        return {
            totalAppointments: total,
            completedAppointments: completed,
            cancelledAppointments: cancelled,
            upcomingAppointments: upcomingAppointments.length,
            
            completionRate: Math.round((completed / totalPast) * 100) || 0,
            cancellationRate: Math.round((cancelled / totalPast) * 100) || 0,
            noShowRate: Math.round((noShows / totalPast) * 100) || 0,
            reschedulingRate: Math.round((rescheduled / total) * 100) || 0,
            
            averageDuration: Math.round(
                appointments.reduce((sum, a) => sum + (a.actualDuration || 0), 0) / (completed || 1)
            ),
            totalTimeInMeetings: appointments.reduce((sum, a) => sum + (a.actualDuration || 0), 0),
            
            busiestDay: 'Martes', // Needs real calc
            busiestHour: 10,
            quietestDay: 'Viernes',
            
            conversionRate: 0,
            averageDealsPerAppointment: 0,
            
            byType: appointments.reduce((acc, a) => {
                acc[a.type] = (acc[a.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            
            byStatus: appointments.reduce((acc, a) => {
                acc[a.status] = (acc[a.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            
            byOutcome: appointments.reduce((acc, a) => {
                if (a.outcome) {
                    acc[a.outcome] = (acc[a.outcome] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>),
            
            byPriority: appointments.reduce((acc, a) => {
                acc[a.priority] = (acc[a.priority] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            
            trendsLastMonth: [],
            
            vsLastMonth: {
                appointmentsChange: total - lastMonthAppointments.length,
                completionRateChange: 0, // Need to calc last month completion
                avgDurationChange: 0,
            },

            engine,
        };
    }, [appointments, upcomingAppointments]);
    
    // ==========================================================================
    // UTILS
    // ==========================================================================
    
    const clearFilters = () => {
        setFilters(DEFAULT_FILTERS);
    };
    
    return {
        // State
        appointments,
        isLoading,
        error,
        
        // Selected
        selectedAppointment,
        setSelectedAppointment,
        
        // Filtered
        filteredAppointments,
        filters,
        setFilters,
        clearFilters,
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
        
        refresh: fetchAppointments
    };
};

export default useAppointments;
