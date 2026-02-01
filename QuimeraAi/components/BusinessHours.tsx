/**
 * BusinessHours Component
 * Displays business operating hours in a clean, organized format
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { FooterBusinessHours, FooterDayHours } from '../types';

interface BusinessHoursProps {
    businessHours?: FooterBusinessHours;
    colors?: {
        text?: string;
        heading?: string;
        accent?: string;
        openBadge?: string;
        closedBadge?: string;
    };
    variant?: 'compact' | 'full' | 'inline';
    showIcon?: boolean;
    title?: string;
    className?: string;
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DAY_LABELS: Record<string, { en: string; es: string; short: string }> = {
    monday: { en: 'Monday', es: 'Lunes', short: 'Mon' },
    tuesday: { en: 'Tuesday', es: 'Martes', short: 'Tue' },
    wednesday: { en: 'Wednesday', es: 'Miércoles', short: 'Wed' },
    thursday: { en: 'Thursday', es: 'Jueves', short: 'Thu' },
    friday: { en: 'Friday', es: 'Viernes', short: 'Fri' },
    saturday: { en: 'Saturday', es: 'Sábado', short: 'Sat' },
    sunday: { en: 'Sunday', es: 'Domingo', short: 'Sun' },
};

const formatTime = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const isCurrentlyOpen = (businessHours?: FooterBusinessHours): boolean => {
    if (!businessHours) return false;
    
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()] as keyof FooterBusinessHours;
    const dayHours = businessHours[currentDay];
    
    if (!dayHours?.isOpen || !dayHours.openTime || !dayHours.closeTime) return false;
    
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= dayHours.openTime && currentTime <= dayHours.closeTime;
};

const getCurrentDayName = (): string => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[new Date().getDay()];
};

const BusinessHours: React.FC<BusinessHoursProps> = ({
    businessHours,
    colors = {},
    variant = 'compact',
    showIcon = true,
    title = 'Hours',
    className = '',
}) => {
    if (!businessHours) return null;

    const hasAnyHours = DAYS_ORDER.some(day => businessHours[day]?.isOpen);
    if (!hasAnyHours) return null;

    const currentDay = getCurrentDayName();
    const isOpen = isCurrentlyOpen(businessHours);

    const textColor = colors?.text || 'inherit';
    const headingColor = colors?.heading || 'inherit';
    const accentColor = colors?.accent || '#06b6d4';

    // Group consecutive days with same hours
    const groupHours = () => {
        const groups: { days: string[]; hours: FooterDayHours }[] = [];
        
        DAYS_ORDER.forEach(day => {
            const dayHours = businessHours[day];
            if (!dayHours) return;

            const lastGroup = groups[groups.length - 1];
            if (
                lastGroup &&
                lastGroup.hours.isOpen === dayHours.isOpen &&
                lastGroup.hours.openTime === dayHours.openTime &&
                lastGroup.hours.closeTime === dayHours.closeTime
            ) {
                lastGroup.days.push(day);
            } else {
                groups.push({ days: [day], hours: dayHours });
            }
        });

        return groups;
    };

    if (variant === 'inline') {
        const todayHours = businessHours[currentDay as keyof FooterBusinessHours];
        return (
            <div className={`flex items-center gap-2 ${className}`} style={{ color: textColor }}>
                {showIcon && <Clock size={14} style={{ color: accentColor }} />}
                <span className="text-sm">
                    {todayHours?.isOpen ? (
                        <>
                            <span 
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mr-2"
                                style={{ 
                                    backgroundColor: isOpen ? '#10b98120' : '#f59e0b20',
                                    color: isOpen ? '#10b981' : '#f59e0b'
                                }}
                            >
                                {isOpen ? 'Open' : 'Closed'}
                            </span>
                            {formatTime(todayHours.openTime || '')} - {formatTime(todayHours.closeTime || '')}
                        </>
                    ) : (
                        <span style={{ opacity: 0.6 }}>Closed Today</span>
                    )}
                </span>
            </div>
        );
    }

    if (variant === 'compact') {
        const groups = groupHours();
        return (
            <div className={className}>
                {title && (
                    <h4 
                        className="font-semibold mb-3 flex items-center gap-2"
                        style={{ color: headingColor }}
                    >
                        {showIcon && <Clock size={16} style={{ color: accentColor }} />}
                        {title}
                    </h4>
                )}
                <div className="space-y-2">
                    {groups.map((group, idx) => (
                        <div 
                            key={idx}
                            className="text-sm"
                            style={{ color: textColor }}
                        >
                            <div className="font-medium" style={{ opacity: 0.9 }}>
                                {group.days.length > 1
                                    ? `${DAY_LABELS[group.days[0]].short} - ${DAY_LABELS[group.days[group.days.length - 1]].short}`
                                    : DAY_LABELS[group.days[0]].short}
                            </div>
                            <div style={{ opacity: group.hours.isOpen ? 1 : 0.5 }}>
                                {group.hours.isOpen
                                    ? `${formatTime(group.hours.openTime || '')} - ${formatTime(group.hours.closeTime || '')}`
                                    : 'Closed'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Full variant - shows all days
    return (
        <div className={className}>
            {title && (
                <h4 
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{ color: headingColor }}
                >
                    {showIcon && <Clock size={18} style={{ color: accentColor }} />}
                    {title}
                    {isOpen && (
                        <span 
                            className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: '#10b98120', color: '#10b981' }}
                        >
                            Open Now
                        </span>
                    )}
                </h4>
            )}
            <div className="space-y-2">
                {DAYS_ORDER.map(day => {
                    const dayHours = businessHours[day];
                    const isToday = day === currentDay;
                    
                    return (
                        <div 
                            key={day}
                            className={`flex justify-between items-center text-sm py-1 px-2 rounded ${
                                isToday ? 'bg-white/5' : ''
                            }`}
                            style={{ 
                                color: textColor,
                                borderLeft: isToday ? `2px solid ${accentColor}` : '2px solid transparent'
                            }}
                        >
                            <span 
                                className="font-medium"
                                style={{ opacity: isToday ? 1 : 0.8 }}
                            >
                                {DAY_LABELS[day].en}
                            </span>
                            <span style={{ opacity: dayHours?.isOpen ? 1 : 0.5 }}>
                                {dayHours?.isOpen
                                    ? `${formatTime(dayHours.openTime || '')} - ${formatTime(dayHours.closeTime || '')}`
                                    : 'Closed'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BusinessHours;
















