/**
 * CalendarWeekView
 * Vista semanal interactiva del calendario con drag-and-drop
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Appointment, APPOINTMENT_TYPE_CONFIGS } from '../../../../types';
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
    const typeConfig = APPOINTMENT_TYPE_CONFIGS[appointment.type];
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
    
    // Gradient classes
    const gradientClasses: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600',
        violet: 'from-violet-500 to-purple-600',
        emerald: 'from-emerald-500 to-teal-600',
        orange: 'from-orange-500 to-amber-600',
        cyan: 'from-cyan-500 to-sky-600',
        yellow: 'from-yellow-500 to-amber-500',
        pink: 'from-pink-500 to-rose-600',
        green: 'from-green-500 to-emerald-600',
    };
    
    const isShort = height < 50;
    
    return (
        <div
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                absolute left-1 right-1 z-10
                bg-gradient-to-br ${gradientClasses[typeConfig.color]}
                rounded-lg overflow-hidden
                cursor-pointer group
                transition-all duration-200
                hover:shadow-lg hover:scale-[1.02] hover:z-20
                border border-white/20
            `}
            style={{
                top: `${top}px`,
                height: `${height}px`,
                minHeight: '24px',
            }}
        >
            {/* Shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            
            {/* Content */}
            <div className={`relative h-full p-2 ${isShort ? 'flex items-center gap-2' : ''}`}>
                <p className={`text-white font-semibold ${isShort ? 'text-xs truncate' : 'text-sm line-clamp-2'}`}>
                    {appointment.title}
                </p>
                {!isShort && (
                    <p className="text-white/80 text-xs mt-0.5">
                        {formatTime(appointment.startDate)} - {formatTime(appointment.endDate)}
                    </p>
                )}
            </div>
            
            {/* Resize handle */}
            <div className="
                absolute bottom-0 left-0 right-0 h-2 
                cursor-s-resize opacity-0 group-hover:opacity-100
                bg-black/20 transition-opacity
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
    workingHoursStart = 8,
    workingHoursEnd = 18,
}) => {
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
    
    // Scroll to current time on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            const scrollTo = Math.max(0, workingHoursStart * HOUR_HEIGHT - 50);
            scrollContainerRef.current.scrollTop = scrollTo;
        }
    }, [workingHoursStart]);
    
    // Check if today is in the current week
    const todayInWeek = weekDays.some(day => isToday(day));
    const todayIndex = weekDays.findIndex(day => isToday(day));
    
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Header with days */}
            <div className="flex border-b border-border sticky top-0 z-20 bg-background">
                {/* Time column header */}
                <div className="w-10 sm:w-14 lg:w-16 flex-shrink-0 border-r border-border p-1 sm:p-2">
                    <span className="text-[8px] sm:text-xs text-muted-foreground font-medium hidden sm:block">
                        GMT{new Date().getTimezoneOffset() / -60 >= 0 ? '+' : ''}{new Date().getTimezoneOffset() / -60}
                    </span>
                </div>
                
                {/* Day headers */}
                {weekDays.map((day, index) => {
                    const isCurrentDay = isToday(day);
                    const dayKey = day.toISOString().split('T')[0];
                    const dayAppointments = appointmentsByDay.get(dayKey) || [];
                    
                    return (
                        <div
                            key={dayKey}
                            className={`
                                flex-1 p-1.5 sm:p-3 text-center border-r border-border last:border-r-0
                                transition-colors min-w-[80px] sm:min-w-0
                                ${isCurrentDay ? 'bg-primary/5' : ''}
                            `}
                        >
                            <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}`}>
                                {DAYS_ES[day.getDay()]}
                            </p>
                            <p className={`
                                text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1
                                ${isCurrentDay 
                                    ? 'text-primary' 
                                    : 'text-foreground'
                                }
                            `}>
                                {day.getDate()}
                            </p>
                            {dayAppointments.length > 0 && (
                                <div className={`
                                    mt-0.5 sm:mt-1 inline-flex items-center justify-center
                                    px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium
                                    ${isCurrentDay 
                                        ? 'bg-primary/20 text-primary' 
                                        : 'bg-muted text-muted-foreground'
                                    }
                                `}>
                                    {dayAppointments.length}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Scrollable time grid */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-auto custom-scrollbar"
            >
                <div className="flex min-w-[560px] sm:min-w-[700px] lg:min-w-[800px]">
                    {/* Time column */}
                    <div className="w-10 sm:w-14 lg:w-16 flex-shrink-0 border-r border-border relative">
                        {HOURS.map(hour => (
                            <div
                                key={hour}
                                className="border-b border-border/30 flex items-start justify-end pr-1 sm:pr-2 pt-1"
                                style={{ height: `${HOUR_HEIGHT}px` }}
                            >
                                <span className={`
                                    text-[10px] sm:text-xs font-medium
                                    ${hour >= workingHoursStart && hour < workingHoursEnd 
                                        ? 'text-muted-foreground' 
                                        : 'text-muted-foreground/50'
                                    }
                                `}>
                                    {hour}
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
                                    flex-1 border-r border-border/50 last:border-r-0 relative
                                    ${isCurrentDay ? 'bg-primary/[0.02]' : ''}
                                `}
                            >
                                {/* Hour slots */}
                                {HOURS.map(hour => {
                                    const isWorkingHour = hour >= workingHoursStart && hour < workingHoursEnd;
                                    
                                    return (
                                        <div
                                            key={hour}
                                            onClick={() => {
                                                const slotDate = new Date(day);
                                                slotDate.setHours(hour, 0, 0, 0);
                                                onSlotClick(slotDate, hour);
                                            }}
                                            className={`
                                                border-b border-border/30
                                                cursor-pointer group
                                                transition-colors duration-150
                                                hover:bg-primary/5
                                                ${!isWorkingHour ? 'bg-muted/20' : ''}
                                            `}
                                            style={{ height: `${HOUR_HEIGHT}px` }}
                                        >
                                            {/* Half-hour line */}
                                            <div 
                                                className="border-b border-dashed border-border/20"
                                                style={{ marginTop: `${HOUR_HEIGHT / 2}px` }}
                                            />
                                            
                                            {/* Hover indicator */}
                                            <div className="
                                                absolute inset-1 rounded-lg
                                                border-2 border-dashed border-primary/30
                                                opacity-0 group-hover:opacity-100
                                                transition-opacity pointer-events-none
                                                flex items-center justify-center
                                            ">
                                                <span className="text-xs text-primary font-medium bg-background px-2 py-0.5 rounded">
                                                    + Crear cita
                                                </span>
                                            </div>
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
                                
                                {/* Current time indicator */}
                                {isCurrentDay && (
                                    <div
                                        className="absolute left-0 right-0 z-30 pointer-events-none"
                                        style={{ top: `${currentTimeTop}px` }}
                                    >
                                        {/* Circle */}
                                        <div className="
                                            absolute -left-1.5 -top-1.5
                                            w-3 h-3 rounded-full bg-red-500
                                            shadow-lg shadow-red-500/50
                                        " />
                                        {/* Line */}
                                        <div className="
                                            h-0.5 bg-red-500
                                            shadow-lg shadow-red-500/50
                                        " />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CalendarWeekView;


