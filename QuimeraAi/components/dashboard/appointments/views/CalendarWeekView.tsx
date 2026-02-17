/**
 * CalendarWeekView
 * Vista semanal interactiva del calendario con drag-and-drop
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Appointment, BlockedDate, APPOINTMENT_TYPE_CONFIGS } from '../../../../types';
import { Ban } from 'lucide-react';
import { AppointmentCard } from '../components/AppointmentCard';
import {
    getWeekDays,
    timestampToDate,
    isToday,
    isSameDay,
    formatTime,
} from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface CalendarWeekViewProps {
    appointments: Appointment[];
    currentDate: Date;
    onAppointmentClick: (appointment: Appointment) => void;
    onSlotClick: (date: Date, hour: number) => void;
    weekStartsOn?: number;
    workingHoursStart?: number;
    workingHoursEnd?: number;
    blockedDates?: BlockedDate[];
    onBlockClick?: (blockedDate: BlockedDate) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64; // px per hour

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TimeSlotAppointmentProps {
    appointment: Appointment;
    onClick: () => void;
    dayStart: Date;
}

const TimeSlotAppointment: React.FC<TimeSlotAppointmentProps> = ({
    appointment,
    onClick,
    dayStart,
}) => {
    const startDate = timestampToDate(appointment.startDate);
    const endDate = timestampToDate(appointment.endDate);

    // Calculate position and height
    const dayStartMs = dayStart.getTime();
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const startMinutesFromDayStart = (startMs - dayStartMs) / (1000 * 60);
    const durationMinutes = (endMs - startMs) / (1000 * 60);

    const top = (startMinutesFromDayStart / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24); // Min height of 24px

    return (
        <div
            className="absolute left-0.5 right-1 z-10 hover:z-20 transition-all duration-200"
            style={{
                top: `${top}px`,
                height: `${height}px`,
            }}
        >
            <AppointmentCard
                appointment={appointment}
                onClick={(e) => { e?.stopPropagation?.(); onClick(); }}
                variant="fresha"
                className="h-full w-full shadow-sm"
            />

            {/* Resize handle (Visual only for now) */}
            <div className="
                absolute bottom-0 left-0 right-0 h-1.5 
                cursor-s-resize opacity-0 hover:opacity-100
                bg-black/10 transition-opacity
                rounded-b-md
            " />
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
    appointments,
    currentDate,
    onAppointmentClick,
    onSlotClick,
    weekStartsOn = 1,
    workingHoursStart = 0, // Fresha usually shows full day or wider range
    workingHoursEnd = 24,
    blockedDates = [],
    onBlockClick,
}) => {
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [currentTimeTop, setCurrentTimeTop] = useState(0);

    // Get week days
    const weekDays = useMemo(() => getWeekDays(currentDate, weekStartsOn), [currentDate, weekStartsOn]);

    // Group appointments by day
    const appointmentsByDay = useMemo(() => {
        const map = new Map<string, Appointment[]>();

        weekDays.forEach(day => {
            const dayKey = day.toISOString().split('T')[0];
            map.set(dayKey, []);
        });

        appointments.forEach(apt => {
            const aptDate = timestampToDate(apt.startDate);
            const dayKey = aptDate.toISOString().split('T')[0];
            if (map.has(dayKey)) {
                map.get(dayKey)!.push(apt);
            }
        });

        return map;
    }, [appointments, weekDays]);

    // Update current time indicator
    useEffect(() => {
        const updateCurrentTime = () => {
            const now = new Date();
            const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
            setCurrentTimeTop((minutesSinceMidnight / 60) * HOUR_HEIGHT);
        };

        updateCurrentTime();
        const interval = setInterval(updateCurrentTime, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    // Scroll to 8 AM on mount if not specified otherwise
    useEffect(() => {
        if (scrollContainerRef.current) {
            const scrollTo = Math.max(0, 8 * HOUR_HEIGHT - 50);
            scrollContainerRef.current.scrollTop = scrollTo;
        }
    }, []);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {/* Header with days */}
            <div className="flex border-b border-border sticky top-0 z-30 bg-background shadow-xs">
                {/* Time column header */}
                <div className="w-16 flex-shrink-0 border-r border-border bg-background" />

                {/* Day headers */}
                {weekDays.map((day, index) => {
                    const isCurrentDay = isToday(day);
                    const dayKey = day.toISOString().split('T')[0];

                    return (
                        <div
                            key={dayKey}
                            className={`
                                flex-1 py-3 text-center border-r border-border last:border-r-0
                                min-w-[100px] flex flex-col items-center justify-center gap-1
                                ${isCurrentDay ? 'bg-primary/5' : 'bg-background'}
                            `}
                        >
                            <span className={`text-xs font-semibold uppercase tracking-wide ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}`}>
                                {DAYS_ES[day.getDay()]}
                            </span>
                            <div className={`
                                w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold
                                ${isCurrentDay
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-foreground hover:bg-secondary/50'
                                }
                            `}>
                                {day.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable time grid */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-auto custom-scrollbar relative"
            >
                {/* Current Time Indicator Line (Spanning full width) */}
                {weekDays.some(day => isToday(day)) && (
                    <div
                        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${currentTimeTop}px` }}
                    >
                        <div className="w-16 flex justify-end pr-2">
                            <span className="text-[10px] font-bold text-red-500 bg-background px-1 rounded">
                                {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex-1 h-px bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
                    </div>
                )}

                <div className="flex min-w-[700px] lg:min-w-full">
                    {/* Time column */}
                    <div className="w-16 flex-shrink-0 border-r border-border bg-background z-10">
                        {HOURS.map(hour => (
                            <div
                                key={hour}
                                className="h-[64px] relative"
                            >
                                <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground font-medium bg-background px-1">
                                    {hour}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day, dayIndex) => {
                        const isCurrentDay = isToday(day);
                        const dayKey = day.toISOString().split('T')[0];
                        const dayAppointments = appointmentsByDay.get(dayKey) || [];
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);

                        return (
                            <div
                                key={dayKey}
                                className={`
                                    flex-1 border-r border-border/40 last:border-r-0 relative
                                    ${isCurrentDay ? 'bg-primary/[0.02]' : ''}
                                `}
                            >
                                {/* Hour slots background lines */}
                                {HOURS.map(hour => {
                                    // Check if this slot is blocked
                                    const slotStart = new Date(day);
                                    slotStart.setHours(hour, 0, 0, 0);
                                    const slotEnd = new Date(day);
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
                                                    const sd = new Date(day);
                                                    sd.setHours(hour, 0, 0, 0);
                                                    onSlotClick(sd, hour);
                                                }
                                            }}
                                            className={`
                                                h-[64px] border-b border-border/20 cursor-pointer transition-colors relative
                                                ${blocked
                                                    ? 'cursor-not-allowed'
                                                    : 'hover:bg-black/[0.02]'
                                                }
                                            `}
                                        >
                                            {blocked && (
                                                <div
                                                    className="absolute inset-0 z-[5] pointer-events-none"
                                                    style={{
                                                        background: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(239,68,68,0.08) 4px, rgba(239,68,68,0.08) 8px)',
                                                    }}
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-auto">
                                                        <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                            <Ban size={10} />
                                                            {blocked.title}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Appointments */}
                                {dayAppointments.map(apt => (
                                    <TimeSlotAppointment
                                        key={apt.id}
                                        appointment={apt}
                                        onClick={() => onAppointmentClick(apt)}
                                        dayStart={dayStart}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CalendarWeekView;


