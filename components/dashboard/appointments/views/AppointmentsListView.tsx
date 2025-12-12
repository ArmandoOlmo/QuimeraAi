/**
 * AppointmentsListView
 * Vista de lista moderna con agrupación por fecha
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, Search, Filter, ChevronRight } from 'lucide-react';
import { Appointment } from '../../../../types';
import { AppointmentCard } from '../components/AppointmentCard';
import {
    timestampToDate,
    isToday,
    isSameDay,
    groupByDay,
    sortByStartDate,
    getRelativeTime,
} from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface AppointmentsListViewProps {
    appointments: Appointment[];
    onAppointmentClick: (appointment: Appointment) => void;
    onAppointmentEdit?: (appointment: Appointment) => void;
    onAppointmentDelete?: (appointment: Appointment) => void;
    searchQuery?: string;
    emptyMessage?: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface DayGroupProps {
    date: string;
    appointments: Appointment[];
    onAppointmentClick: (appointment: Appointment) => void;
    onAppointmentEdit?: (appointment: Appointment) => void;
    onAppointmentDelete?: (appointment: Appointment) => void;
    animationDelayStart: number;
}

const DayGroup: React.FC<DayGroupProps> = ({
    date,
    appointments,
    onAppointmentClick,
    onAppointmentEdit,
    onAppointmentDelete,
    animationDelayStart,
}) => {
    const { t } = useTranslation();
    const dateObj = new Date(date);
    const isCurrentDay = isToday(dateObj);
    const isPast = dateObj < new Date() && !isCurrentDay;

    // Format date label
    const getDateLabel = () => {
        if (isCurrentDay) return t('appointments.today');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (isSameDay(dateObj, tomorrow)) return t('appointments.tomorrow');

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (isSameDay(dateObj, yesterday)) return t('appointments.yesterday');

        return dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    };

    return (
        <div className={`mb-6 sm:mb-8 ${isPast ? 'opacity-60' : ''}`}>
            {/* Date header */}
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                <div className={`
                    flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full
                    ${isCurrentDay
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }
                `}>
                    <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
                    <span className="font-semibold text-xs sm:text-sm capitalize">
                        {getDateLabel()}
                    </span>
                </div>

                {!isCurrentDay && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                        {dateObj.toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short'
                        })}
                    </span>
                )}

                <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
                    {appointments.length}
                </span>
            </div>

            {/* Appointments grid */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {appointments.map((apt, index) => (
                    <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        onClick={() => onAppointmentClick(apt)}
                        onEdit={onAppointmentEdit ? () => onAppointmentEdit(apt) : undefined}
                        onDelete={onAppointmentDelete ? () => onAppointmentDelete(apt) : undefined}
                        animationDelay={animationDelayStart + (index * 50)}
                    />
                ))}
            </div>
        </div>
    );
};

// Empty state component
const EmptyState: React.FC<{ message?: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('appointments.noAppointments')}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
            {message || 'No se encontraron citas. Crea una nueva cita para comenzar a gestionar tu calendario.'}
        </p>
    </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AppointmentsListView: React.FC<AppointmentsListViewProps> = ({
    appointments,
    onAppointmentClick,
    onAppointmentEdit,
    onAppointmentDelete,
    searchQuery,
    emptyMessage,
}) => {
    // Sort and group appointments by day
    const groupedAppointments = useMemo(() => {
        const sorted = sortByStartDate(appointments, true);
        return groupByDay(sorted);
    }, [appointments]);

    // Convert map to array for rendering
    const dayGroups = useMemo(() => {
        const groups: { date: string; appointments: Appointment[] }[] = [];
        groupedAppointments.forEach((apts, date) => {
            groups.push({ date, appointments: apts });
        });
        // Sort groups by date
        groups.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return groups;
    }, [groupedAppointments]);

    // Separate into upcoming and past
    const { upcoming, past } = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcomingGroups: typeof dayGroups = [];
        const pastGroups: typeof dayGroups = [];

        dayGroups.forEach(group => {
            const groupDate = new Date(group.date);
            if (groupDate >= now) {
                upcomingGroups.push(group);
            } else {
                pastGroups.push(group);
            }
        });

        return { upcoming: upcomingGroups, past: pastGroups.reverse() }; // Reverse past to show most recent first
    }, [dayGroups]);

    if (appointments.length === 0) {
        return <EmptyState message={emptyMessage} />;
    }

    let animationDelay = 0;

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {/* Upcoming section */}
            {upcoming.length > 0 && (
                <section className="mb-8 sm:mb-12">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-xl font-bold text-foreground">{t('appointments.upcoming')}</h2>
                        <ChevronRight size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
                    </div>

                    {upcoming.map((group) => {
                        const component = (
                            <DayGroup
                                key={group.date}
                                date={group.date}
                                appointments={group.appointments}
                                onAppointmentClick={onAppointmentClick}
                                onAppointmentEdit={onAppointmentEdit}
                                onAppointmentDelete={onAppointmentDelete}
                                animationDelayStart={animationDelay}
                            />
                        );
                        animationDelay += group.appointments.length * 50;
                        return component;
                    })}
                </section>
            )}

            {/* Past section */}
            {past.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-xl font-bold text-foreground">{t('appointments.past')}</h2>
                        <span className="text-[10px] sm:text-xs bg-muted px-1.5 sm:px-2 py-0.5 rounded-full text-muted-foreground">
                            {past.reduce((sum, g) => sum + g.appointments.length, 0)}
                        </span>
                    </div>

                    {past.map((group) => {
                        const component = (
                            <DayGroup
                                key={group.date}
                                date={group.date}
                                appointments={group.appointments}
                                onAppointmentClick={onAppointmentClick}
                                onAppointmentEdit={onAppointmentEdit}
                                onAppointmentDelete={onAppointmentDelete}
                                animationDelayStart={animationDelay}
                            />
                        );
                        animationDelay += group.appointments.length * 50;
                        return component;
                    })}
                </section>
            )}
        </div>
    );
};

export default AppointmentsListView;


