/**
 * CalendarDayView
 * Vista diaria detallada del calendario
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus, Ban } from 'lucide-react';
import { Appointment, BlockedDate, APPOINTMENT_TYPE_CONFIGS } from '../../../../types';
import { AppointmentCard } from '../components/AppointmentCard';
import {
    timestampToDate,
    isToday,
    formatTime,
    formatDateOnly,
    getStartOfDay,
    getEndOfDay,
} from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface CalendarDayViewProps {
    appointments: Appointment[];
    currentDate: Date;
    onAppointmentClick: (appointment: Appointment) => void;
    onSlotClick: (date: Date, hour: number) => void;
    workingHoursStart?: number;
    workingHoursEnd?: number;
    blockedDates?: BlockedDate[];
    onBlockClick?: (blockedDate: BlockedDate) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 80; // px per hour

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
    appointments,
    currentDate,
    onAppointmentClick,
    onSlotClick,
    workingHoursStart = 8,
    workingHoursEnd = 18,
    blockedDates = [],
    onBlockClick,
}) => {
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [currentTimeTop, setCurrentTimeTop] = useState(0);

    const isCurrentDay = isToday(currentDate);

    // Filter appointments for current day
    const dayAppointments = useMemo(() => {
        const start = getStartOfDay(currentDate);
        const end = getEndOfDay(currentDate);

        return appointments.filter(apt => {
            const aptDate = timestampToDate(apt.startDate);
            return aptDate >= start && aptDate <= end;
        }).sort((a, b) => a.startDate.seconds - b.startDate.seconds);
    }, [appointments, currentDate]);

    // Update current time indicator
    useEffect(() => {
        const updateCurrentTime = () => {
            const now = new Date();
            const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
            setCurrentTimeTop((minutesSinceMidnight / 60) * HOUR_HEIGHT);
        };

        updateCurrentTime();
        const interval = setInterval(updateCurrentTime, 60000);

        return () => clearInterval(interval);
    }, []);

    // Scroll to current time on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            const scrollTo = Math.max(0, workingHoursStart * HOUR_HEIGHT - 100);
            scrollContainerRef.current.scrollTop = scrollTo;
        }
    }, [workingHoursStart]);

    // Calculate appointment positions
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);

    return (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-background">
            {/* Left sidebar with day info - Hidden on mobile, shown as header */}
            <div className="hidden md:flex md:w-72 lg:w-80 border-r border-border flex-col">
                {/* Day header */}
                <div className={`
                    p-4 lg:p-6 border-b border-border
                    ${isCurrentDay ? 'bg-primary/5' : ''}
                `}>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        {currentDate.toLocaleDateString('es-ES', { weekday: 'long' })}
                    </p>
                    <p className={`text-3xl lg:text-4xl font-bold ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                        {currentDate.getDate()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {currentDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                    </p>

                    {isCurrentDay && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </div>
                            {t('appointments.today')}
                        </div>
                    )}
                </div>

                {/* Appointments list for the day */}
                <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-2 lg:space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-foreground">
                            {t('appointments.appointments')}
                        </h3>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {dayAppointments.length}
                        </span>
                    </div>

                    {dayAppointments.length === 0 ? (
                        <div className="text-center py-6">
                            <Clock className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                {t('appointments.noAppointments')}
                            </p>
                            <button
                                onClick={() => onSlotClick(currentDate, workingHoursStart)}
                                className="mt-2 text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
                            >
                                <Plus size={14} />
                                {t('common.create')}
                            </button>
                        </div>
                    ) : (
                        dayAppointments.map((apt, index) => (
                            <AppointmentCard
                                key={apt.id}
                                appointment={apt}
                                variant="compact"
                                onClick={() => onAppointmentClick(apt)}
                                animationDelay={index * 50}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Mobile day header */}
            <div className={`
                md:hidden px-4 py-3 border-b border-border flex items-center justify-between
                ${isCurrentDay ? 'bg-primary/5' : ''}
            `}>
                <div className="flex items-center gap-3">
                    <p className={`text-2xl font-bold ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                        {currentDate.getDate()}
                    </p>
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            {currentDate.toLocaleDateString('es-ES', { weekday: 'short', month: 'short' })}
                        </p>
                        {isCurrentDay && (
                            <span className="text-xs text-primary">{t('appointments.today')}</span>
                        )}
                    </div>
                </div>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {dayAppointments.length} cita{dayAppointments.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Main timeline view */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center px-4">
                    <span className="text-sm text-muted-foreground">
                        {formatDateOnly({ seconds: currentDate.getTime() / 1000, nanoseconds: 0 })}
                    </span>
                </div>

                {/* Scrollable timeline */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-auto custom-scrollbar"
                >
                    <div className="flex min-h-full">
                        {/* Time column */}
                        <div className="w-20 flex-shrink-0 border-r border-border">
                            {HOURS.map(hour => (
                                <div
                                    key={hour}
                                    className="border-b border-border/30 flex items-start justify-end pr-3 pt-1"
                                    style={{ height: `${HOUR_HEIGHT}px` }}
                                >
                                    <span className={`
                                        text-sm font-medium
                                        ${hour >= workingHoursStart && hour < workingHoursEnd
                                            ? 'text-foreground'
                                            : 'text-muted-foreground/50'
                                        }
                                    `}>
                                        {hour.toString().padStart(2, '0')}:00
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Timeline content */}
                        <div className="flex-1 relative">
                            {/* Hour slots */}
                            {HOURS.map(hour => {
                                const isWorkingHour = hour >= workingHoursStart && hour < workingHoursEnd;

                                // Check if this slot is blocked
                                const slotStart = new Date(currentDate);
                                slotStart.setHours(hour, 0, 0, 0);
                                const slotEnd = new Date(currentDate);
                                slotEnd.setHours(hour, 59, 59, 999);

                                const blocked = blockedDates.find(bd => {
                                    const bdStart = new Date(bd.startDate.seconds * 1000);
                                    const bdEnd = new Date(bd.endDate.seconds * 1000);
                                    if (bd.allDay) {
                                        bdStart.setHours(0, 0, 0, 0);
                                        bdEnd.setHours(23, 59, 59, 999);
                                    }
                                    return bdStart <= slotEnd && bdEnd >= slotStart;
                                });

                                return (
                                    <div
                                        key={hour}
                                        onClick={() => {
                                            if (blocked && onBlockClick) {
                                                onBlockClick(blocked);
                                            } else if (!blocked) {
                                                const slotDate = new Date(currentDate);
                                                slotDate.setHours(hour, 0, 0, 0);
                                                onSlotClick(slotDate, hour);
                                            }
                                        }}
                                        className={`
                                            border-b border-border/30
                                            group relative
                                            transition-colors duration-150
                                            ${blocked
                                                ? 'cursor-not-allowed'
                                                : 'cursor-pointer hover:bg-primary/5'
                                            }
                                            ${!isWorkingHour ? 'bg-muted/10' : ''}
                                        `}
                                        style={{ height: `${HOUR_HEIGHT}px` }}
                                    >
                                        {/* Half-hour line */}
                                        <div
                                            className="absolute left-0 right-0 border-b border-dashed border-border/20"
                                            style={{ top: `${HOUR_HEIGHT / 2}px` }}
                                        />

                                        {blocked ? (
                                            /* Blocked overlay */
                                            <div
                                                className="absolute inset-0 z-[5]"
                                                style={{
                                                    background: 'repeating-linear-gradient(135deg, transparent, transparent 5px, rgba(239,68,68,0.06) 5px, rgba(239,68,68,0.06) 10px)',
                                                }}
                                            >
                                                <div className="absolute inset-2 flex items-center justify-center">
                                                    <span className="text-xs font-medium text-destructive/60 bg-destructive/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Ban size={12} />
                                                        {blocked.title}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Hover indicator */
                                            <div className="
                                                absolute inset-2 rounded-xl
                                                border-2 border-dashed border-primary/30
                                                opacity-0 group-hover:opacity-100
                                                transition-opacity
                                                flex items-center justify-center
                                            ">
                                                <span className="text-sm text-primary font-medium bg-background px-3 py-1 rounded-full shadow-sm">
                                                    <Plus size={14} className="inline mr-1" />
                                                    {hour.toString().padStart(2, '0')}:00
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Appointments */}
                            {dayAppointments.map(apt => {
                                const startDate = timestampToDate(apt.startDate);
                                const endDate = timestampToDate(apt.endDate);

                                const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                                const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
                                const durationMinutes = endMinutes - startMinutes;

                                const top = (startMinutes / 60) * HOUR_HEIGHT;
                                const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 40);

                                return (
                                    <div
                                        key={apt.id}
                                        className="absolute left-4 right-4 z-10 transition-all duration-200 hover:z-20"
                                        style={{
                                            top: `${top}px`,
                                            height: `${height}px`,
                                        }}
                                    >
                                        <AppointmentCard
                                            appointment={apt}
                                            variant="fresha"
                                            onClick={() => onAppointmentClick(apt)}
                                            className="h-full w-full shadow-md"
                                        />
                                    </div>
                                );
                            })}

                            {/* Current time indicator */}
                            {isCurrentDay && (
                                <div
                                    className="absolute left-0 right-0 z-30 pointer-events-none"
                                    style={{ top: `${currentTimeTop}px` }}
                                >
                                    <div className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                                    <div className="h-0.5 bg-red-500 shadow-lg shadow-red-500/50" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarDayView;


