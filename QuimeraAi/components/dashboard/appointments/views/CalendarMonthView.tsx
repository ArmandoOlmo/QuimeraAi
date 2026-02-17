/**
 * CalendarMonthView
 * Vista mensual del calendario con vista de tarjetas
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Ban } from 'lucide-react';
import { Appointment, BlockedDate, APPOINTMENT_TYPE_CONFIGS } from '../../../../types';
import {
    getMonthDays,
    timestampToDate,
    isToday,
    isSameDay,
    formatTime,
} from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface CalendarMonthViewProps {
    appointments: Appointment[];
    currentDate: Date;
    onAppointmentClick: (appointment: Appointment) => void;
    onDayClick: (date: Date) => void;
    weekStartsOn?: number;
    blockedDates?: BlockedDate[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MAX_VISIBLE_APPOINTMENTS = 3;

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface DayAppointmentChipProps {
    appointment: Appointment;
    onClick: () => void;
}

const DayAppointmentChip: React.FC<DayAppointmentChipProps> = ({ appointment, onClick }) => {
    const typeConfig = APPOINTMENT_TYPE_CONFIGS[appointment.type];

    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-500',
        violet: 'bg-violet-500',
        emerald: 'bg-emerald-500',
        orange: 'bg-orange-500',
        cyan: 'bg-cyan-500',
        yellow: 'bg-yellow-500',
        pink: 'bg-pink-500',
        green: 'bg-green-500',
    };

    // Fallback to blue if typeConfig is undefined
    const color = typeConfig?.color || 'blue';

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                w-full text-left text-xs px-2 py-1 rounded-md
                ${colorClasses[color]} text-white
                truncate hover:opacity-90 transition-opacity
                font-medium
            `}
        >
            <span className="opacity-80 mr-1">{formatTime(appointment.startDate)}</span>
            {appointment.title}
        </button>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
    appointments,
    currentDate,
    onAppointmentClick,
    onDayClick,
    weekStartsOn = 1,
    blockedDates = [],
}) => {
    const { t } = useTranslation();
    // Get ordered days for headers
    const orderedDays = useMemo(() => {
        const days = [...DAYS_ES];
        const reordered = [...days.slice(weekStartsOn), ...days.slice(0, weekStartsOn)];
        return reordered;
    }, [weekStartsOn]);

    // Get all days to display
    const monthDays = useMemo(() => getMonthDays(currentDate, weekStartsOn), [currentDate, weekStartsOn]);

    // Current month for comparison
    const currentMonth = currentDate.getMonth();

    // Group appointments by day
    const appointmentsByDay = useMemo(() => {
        const map = new Map<string, Appointment[]>();

        appointments.forEach(apt => {
            const aptDate = timestampToDate(apt.startDate);
            const dayKey = aptDate.toISOString().split('T')[0];
            if (!map.has(dayKey)) {
                map.set(dayKey, []);
            }
            map.get(dayKey)!.push(apt);
        });

        // Sort appointments within each day
        map.forEach((dayApts) => {
            dayApts.sort((a, b) => a.startDate.seconds - b.startDate.seconds);
        });

        return map;
    }, [appointments]);

    // Split days into weeks
    const weeks = useMemo(() => {
        const result: Date[][] = [];
        for (let i = 0; i < monthDays.length; i += 7) {
            result.push(monthDays.slice(i, i + 7));
        }
        return result;
    }, [monthDays]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
                {orderedDays.map((day, index) => (
                    <div
                        key={day}
                        className={`
                            py-2 text-center text-xs font-semibold uppercase tracking-wider
                            ${index === 5 || index === 6 ? 'text-muted-foreground/60' : 'text-muted-foreground'}
                        `}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1 grid grid-rows-[repeat(auto-fill,1fr)] gap-1">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1 min-h-[120px]">
                        {week.map((day) => {
                            const dayKey = day.toISOString().split('T')[0];
                            const dayAppointments = appointmentsByDay.get(dayKey) || [];
                            const isCurrentMonth = day.getMonth() === currentMonth;
                            const isCurrentDay = isToday(day);
                            const hasMore = dayAppointments.length > MAX_VISIBLE_APPOINTMENTS;

                            return (
                                <div
                                    key={dayKey}
                                    onClick={() => onDayClick(day)}
                                    className={`
                                        relative rounded-xl border overflow-hidden
                                        cursor-pointer group
                                        transition-all duration-200
                                        hover:border-primary/50 hover:shadow-lg
                                        ${isCurrentDay
                                            ? 'border-primary bg-primary/5'
                                            : isCurrentMonth
                                                ? 'border-border/50 bg-card/50 hover:bg-card'
                                                : 'border-transparent bg-muted/20 opacity-50'
                                        }
                                    `}
                                >
                                    {/* Day number */}
                                    <div className="p-2 flex items-center justify-between">
                                        <span className={`
                                            ${isCurrentDay
                                                ? 'w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm'
                                                : `text-sm font-medium ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}`
                                            }
                                        `}>
                                            {day.getDate()}
                                        </span>

                                        {dayAppointments.length > 0 && !isCurrentDay && (
                                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                                {dayAppointments.length}
                                            </span>
                                        )}

                                        {/* Blocked indicator */}
                                        {isCurrentMonth && blockedDates.some(bd => {
                                            const bdStart = new Date(bd.startDate.seconds * 1000);
                                            const bdEnd = new Date(bd.endDate.seconds * 1000);
                                            if (bd.allDay) {
                                                bdStart.setHours(0, 0, 0, 0);
                                                bdEnd.setHours(23, 59, 59, 999);
                                            }
                                            const dayStart = new Date(day);
                                            dayStart.setHours(0, 0, 0, 0);
                                            const dayEnd = new Date(day);
                                            dayEnd.setHours(23, 59, 59, 999);
                                            return bdStart <= dayEnd && bdEnd >= dayStart;
                                        }) && (
                                                <span className="text-[10px] text-destructive bg-destructive/10 px-1 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <Ban size={8} />
                                                </span>
                                            )}
                                    </div>

                                    {/* Appointments */}
                                    {isCurrentMonth && dayAppointments.length > 0 && (
                                        <div className="px-1.5 pb-1.5 space-y-1">
                                            {dayAppointments.slice(0, MAX_VISIBLE_APPOINTMENTS).map(apt => (
                                                <DayAppointmentChip
                                                    key={apt.id}
                                                    appointment={apt}
                                                    onClick={() => onAppointmentClick(apt)}
                                                />
                                            ))}

                                            {hasMore && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDayClick(day); }}
                                                    className="
                                                        w-full text-xs text-center py-1 rounded-md
                                                        text-muted-foreground hover:text-foreground
                                                        hover:bg-muted/50 transition-colors
                                                        flex items-center justify-center gap-1
                                                    "
                                                >
                                                    +{dayAppointments.length - MAX_VISIBLE_APPOINTMENTS} {t('common.more')}
                                                    <ChevronRight size={12} />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="
                                        absolute inset-0 bg-primary/5
                                        opacity-0 group-hover:opacity-100
                                        transition-opacity pointer-events-none
                                    " />
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarMonthView;















