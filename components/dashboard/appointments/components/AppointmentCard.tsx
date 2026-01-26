/**
 * AppointmentCard
 * Tarjeta de cita premium con diseño glassmorphism
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Clock,
    Video,
    Phone,
    MapPin,
    Users,
    MoreVertical,
    Calendar,
    Sparkles,
    Play,
    MessageSquare,
    Search,
    Trophy,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    X,
    Check,
    ExternalLink,
    Edit,
    Trash2,
    Copy,
    Bell,
    Hash,
} from 'lucide-react';
import {
    Appointment,
    AppointmentType,
    APPOINTMENT_TYPE_CONFIGS,
    APPOINTMENT_STATUS_CONFIGS,
    getAppointmentTypeConfig,
} from '../../../../types';
import {
    formatTime,
    formatDuration,
    calculateDuration,
    getRelativeTime,
    getInitials,
    getAvatarColor,
    isToday,
    isPast,
    isInProgress,
    timestampToDate,
} from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface AppointmentCardProps {
    appointment: Appointment;
    onClick?: (e?: React.MouseEvent) => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onJoin?: () => void;
    variant?: 'default' | 'compact' | 'minimal' | 'fresha';
    showActions?: boolean;
    className?: string;
    animationDelay?: number;
}

// =============================================================================
// ICON MAP
// =============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
    Phone,
    Video,
    MapPin,
    Play,
    MessageSquare,
    RefreshCw,
    Search,
    Trophy,
    Hash,
    Clock,
    Users,
    Check,
    X,
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
    appointment,
    onClick,
    onEdit,
    onDelete,
    onJoin,
    variant = 'default',
    showActions = true,
    className = '',
    animationDelay = 0,
}) => {
    const { t } = useTranslation();
    const [showMenu, setShowMenu] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const typeConfig = getAppointmentTypeConfig(appointment.type);
    const statusConfig = APPOINTMENT_STATUS_CONFIGS[appointment.status] || APPOINTMENT_STATUS_CONFIGS.scheduled;
    const TypeIcon = ICON_MAP[typeConfig.icon] || Video;

    const startDate = timestampToDate(appointment.startDate);
    const endDate = timestampToDate(appointment.endDate);
    const duration = calculateDuration(appointment.startDate, appointment.endDate);
    const inProgress = isInProgress(appointment);
    const past = isPast(appointment.endDate);
    const today = isToday(startDate);

    // Gradient classes based on type
    const gradientClasses: Record<string, string> = {
        blue: 'from-blue-500/20 via-blue-500/5 to-transparent',
        violet: 'from-violet-500/20 via-violet-500/5 to-transparent',
        emerald: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
        orange: 'from-orange-500/20 via-orange-500/5 to-transparent',
        cyan: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
        yellow: 'from-yellow-500/20 via-yellow-500/5 to-transparent',
        pink: 'from-pink-500/20 via-pink-500/5 to-transparent',
        green: 'from-green-500/20 via-green-500/5 to-transparent',
    };

    const solidColorClasses: Record<string, string> = {
        blue: 'bg-blue-500',
        violet: 'bg-violet-500',
        emerald: 'bg-emerald-500',
        orange: 'bg-orange-500',
        cyan: 'bg-cyan-500',
        yellow: 'bg-yellow-500',
        pink: 'bg-pink-500',
        green: 'bg-green-500',
    };

    const textColorClasses: Record<string, string> = {
        blue: 'text-blue-500',
        violet: 'text-violet-500',
        emerald: 'text-emerald-500',
        orange: 'text-orange-500',
        cyan: 'text-cyan-500',
        yellow: 'text-yellow-500',
        pink: 'text-pink-500',
        green: 'text-green-500',
    };

    // ==========================================================================
    // FRESHA VARIANT (Clean, Solid, Flat)
    // ==========================================================================

    if (variant === 'fresha') {
        const freshaColors: Record<string, string> = {
            blue: 'bg-[#00a3ff] text-white',      // Cyan-ish Blue
            violet: 'bg-[#8b5cf6] text-white',    // Violet
            emerald: 'bg-[#10b981] text-white',   // Emerald
            orange: 'bg-[#f97316] text-white',    // Orange
            cyan: 'bg-[#06b6d4] text-white',      // Cyan
            yellow: 'bg-[#eab308] text-white',    // Yellow
            pink: 'bg-[#ec4899] text-white',      // Pink
            green: 'bg-[#22c55e] text-white',     // Green
            default: 'bg-[#3b82f6] text-white',   // Default Blue
        };

        const cardColor = freshaColors[typeConfig.color] || freshaColors.default;

        return (
            <div
                onClick={onClick}
                className={`
                    relative overflow-hidden
                    ${cardColor}
                    rounded-md
                    cursor-pointer
                    transition-all duration-200
                    hover:brightness-95 hover:scale-[1.01] hover:shadow-md hover:z-20
                    ${className}
                `}
                style={{
                    animationDelay: `${animationDelay}ms`,
                    borderLeft: '3px solid rgba(0,0,0,0.1)'
                }}
            >
                <div className="p-1 px-2 h-full flex flex-col justify-center min-h-[24px]">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-xs font-bold leading-tight flex-shrink-0 opacity-90">
                            {formatTime(appointment.startDate)}
                        </span>
                        <span className="text-xs font-semibold leading-tight truncate">
                            {appointment.title}
                        </span>
                    </div>

                    {/* Show more details only if height permits (approx > 45px) */}
                    <div className="hidden xs:block opacity-90 text-[10px] truncate mt-0.5">
                        {/* Additional info if needed */}
                        {appointment.participants?.[0]?.name}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================================================
    // MINIMAL VARIANT (for calendar cells)
    // ==========================================================================

    if (variant === 'minimal') {
        return (
            <div
                onClick={onClick}
                className={`
                    ${solidColorClasses[typeConfig.color]} 
                    text-white text-xs px-2 py-1 rounded-md cursor-pointer 
                    truncate hover:opacity-90 transition-all duration-200
                    hover:shadow-lg hover:scale-[1.02]
                    ${className}
                `}
                style={{ animationDelay: `${animationDelay}ms` }}
                title={`${appointment.title} - ${formatTime(appointment.startDate)}`}
            >
                <span className="font-medium">{formatTime(appointment.startDate)}</span>
                <span className="mx-1">·</span>
                <span className="truncate">{appointment.title}</span>
            </div>
        );
    }

    // ==========================================================================
    // COMPACT VARIANT
    // ==========================================================================

    if (variant === 'compact') {
        return (
            <div
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    group relative overflow-hidden
                    bg-card/50 backdrop-blur-xl 
                    border border-border/50 rounded-xl
                    p-3 cursor-pointer
                    transition-all duration-300 ease-out
                    hover:bg-card/80 hover:border-border
                    hover:shadow-lg hover:shadow-black/5
                    hover:-translate-y-0.5
                    animate-fade-in-up
                    ${className}
                `}
                style={{ animationDelay: `${animationDelay}ms` }}
            >
                {/* Left color indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${solidColorClasses[typeConfig.color]} rounded-l-xl`} />

                <div className="flex items-center gap-3 pl-2">
                    {/* Icon */}
                    <div className={`
                        ${solidColorClasses[typeConfig.color]} 
                        p-2 rounded-lg text-white
                        transition-transform duration-300
                        group-hover:scale-110
                    `}>
                        <TypeIcon size={14} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                            {appointment.title}
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime(appointment.startDate)} - {formatTime(appointment.endDate)}
                        </p>
                    </div>

                    {/* Status badge */}
                    <span className={`
                        ${statusConfig.bgColor} ${statusConfig.color}
                        px-2 py-0.5 rounded-full text-xs font-medium
                        flex items-center gap-1
                    `}>
                        {inProgress && (
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                            </span>
                        )}
                        {statusConfig.label}
                    </span>
                </div>
            </div>
        );
    }

    // ==========================================================================
    // DEFAULT VARIANT (Full card with glassmorphism)
    // ==========================================================================

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
            className={`
                group relative overflow-hidden
                bg-card/40 backdrop-blur-2xl
                border border-white/10 dark:border-white/5
                rounded-2xl
                transition-all duration-500 ease-out
                hover:bg-card/60 hover:border-white/20
                hover:shadow-2xl hover:shadow-black/10
                hover:-translate-y-1
                cursor-pointer
                animate-fade-in-up
                ${className}
            `}
            style={{
                animationDelay: `${animationDelay}ms`,
            }}
        >
            {/* Background gradient based on type */}
            <div className={`
                absolute inset-0 bg-gradient-to-br ${gradientClasses[typeConfig.color]}
                opacity-0 group-hover:opacity-100
                transition-opacity duration-500
            `} />

            {/* Animated border glow on hover */}
            <div className={`
                absolute inset-0 rounded-2xl
                opacity-0 group-hover:opacity-100
                transition-opacity duration-500
                pointer-events-none
            `}
                style={{
                    background: `linear-gradient(135deg, ${typeConfig.color === 'blue' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)'} 0%, transparent 50%)`,
                }}
            />

            {/* Left color indicator with animation */}
            <div className={`
                absolute left-0 top-0 bottom-0 w-1.5 
                ${solidColorClasses[typeConfig.color]}
                rounded-l-2xl
                transition-all duration-300
                group-hover:w-2
            `}>
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="relative p-5 pl-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Type icon with gradient background */}
                        <div className={`
                            relative p-3 rounded-xl
                            bg-gradient-to-br ${typeConfig.gradient}
                            text-white shadow-lg
                            transition-all duration-300
                            group-hover:scale-110 group-hover:shadow-xl
                        `}>
                            <TypeIcon size={20} />
                            {/* Shine effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
                        </div>

                        <div>
                            <h4 className="font-bold text-foreground text-base mb-0.5 line-clamp-1">
                                {appointment.title}
                            </h4>
                            <p className={`text-xs font-medium ${textColorClasses[typeConfig.color]}`}>
                                {typeConfig.label}
                            </p>
                        </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                        {/* Status badge */}
                        <span className={`
                            ${statusConfig.bgColor} ${statusConfig.color}
                            px-2.5 py-1 rounded-full text-xs font-semibold
                            flex items-center gap-1.5
                            backdrop-blur-sm
                            border border-current/10
                        `}>
                            {inProgress && (
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                                </span>
                            )}
                            {statusConfig.label}
                        </span>

                        {/* Menu button */}
                        {showActions && (
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                    className={`
                                        p-1.5 rounded-lg
                                        text-muted-foreground hover:text-foreground
                                        hover:bg-white/10
                                        transition-all duration-200
                                        opacity-0 group-hover:opacity-100
                                    `}
                                >
                                    <MoreVertical size={16} />
                                </button>

                                {/* Dropdown menu */}
                                {showMenu && (
                                    <div className="
                                        absolute right-0 top-full mt-1 z-50
                                        bg-popover/95 backdrop-blur-xl
                                        border border-border rounded-xl
                                        shadow-2xl shadow-black/20
                                        py-1 min-w-[160px]
                                        animate-scale-in
                                    ">
                                        {onEdit && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-white/5 flex items-center gap-2"
                                            >
                                                <Edit size={14} />
                                                {t('appointments.actions.edit')}
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-white/5 flex items-center gap-2"
                                        >
                                            <Copy size={14} />
                                            {t('common.duplicate')}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-white/5 flex items-center gap-2"
                                        >
                                            <Bell size={14} />
                                            {t('appointments.form.reminders')}
                                        </button>
                                        <div className="my-1 border-t border-border/50" />
                                        {onDelete && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                                                className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                                            >
                                                <Trash2 size={14} />
                                                {t('appointments.actions.delete')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Time & Location */}
                <div className="space-y-2 sm:space-y-2.5 mb-3 sm:mb-4">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <div className={`
                            p-1 sm:p-1.5 rounded-lg bg-white/5 
                            ${textColorClasses[typeConfig.color]}
                        `}>
                            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                        </div>
                        <div className="flex flex-wrap items-center">
                            <span className="text-foreground font-medium">
                                {today ? t('appointments.today') : startDate.toLocaleDateString('es-ES', {
                                    day: 'numeric',
                                    month: 'short'
                                })}
                            </span>
                            <span className="text-muted-foreground mx-1">·</span>
                            <span className="text-muted-foreground">
                                {formatTime(appointment.startDate)}
                            </span>
                            <span className="text-muted-foreground/60 ml-1 hidden sm:inline">
                                - {formatTime(appointment.endDate)} ({formatDuration(duration)})
                            </span>
                        </div>
                    </div>

                    {/* Location - Hidden on very small screens */}
                    {appointment.location && (
                        <div className="hidden xs:flex items-center gap-2 text-xs sm:text-sm">
                            <div className={`
                                p-1 sm:p-1.5 rounded-lg bg-white/5 
                                ${textColorClasses[typeConfig.color]}
                            `}>
                                {appointment.location.type === 'virtual' ? (
                                    <Video size={12} className="sm:w-3.5 sm:h-3.5" />
                                ) : appointment.location.type === 'phone' ? (
                                    <Phone size={12} className="sm:w-3.5 sm:h-3.5" />
                                ) : (
                                    <MapPin size={12} className="sm:w-3.5 sm:h-3.5" />
                                )}
                            </div>
                            <span className="text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                                {appointment.location.type === 'virtual'
                                    ? t('appointments.locations.virtual')
                                    : appointment.location.type === 'phone'
                                        ? t('appointments.locations.phone')
                                        : t('appointments.locations.physical')
                                }
                            </span>
                        </div>
                    )}
                </div>

                {/* Participants */}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Avatar stack */}
                        <div className="flex -space-x-1.5 sm:-space-x-2">
                            {appointment.participants.slice(0, 3).map((participant, index) => (
                                <div
                                    key={participant.id}
                                    className={`
                                        relative w-6 h-6 sm:w-8 sm:h-8 rounded-full 
                                        ${getAvatarColor(participant.name)}
                                        flex items-center justify-center
                                        text-[10px] sm:text-xs font-bold text-white
                                        border-2 border-card
                                        transition-transform duration-300
                                        hover:scale-110 hover:z-10
                                    `}
                                    style={{ zIndex: 3 - index }}
                                    title={participant.name}
                                >
                                    {participant.avatar ? (
                                        <img
                                            src={participant.avatar}
                                            alt={participant.name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        getInitials(participant.name)
                                    )}
                                </div>
                            ))}

                            {appointment.participants.length > 3 && (
                                <div className="
                                    relative w-6 h-6 sm:w-8 sm:h-8 rounded-full 
                                    bg-muted
                                    flex items-center justify-center
                                    text-[10px] sm:text-xs font-bold text-muted-foreground
                                    border-2 border-card
                                ">
                                    +{appointment.participants.length - 3}
                                </div>
                            )}
                        </div>

                        {/* Participant count - hidden on mobile */}
                        <span className="text-xs text-muted-foreground hidden md:inline">
                            {appointment.participants.length}
                        </span>
                    </div>

                    {/* Right side indicators */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* AI Insights indicator */}
                        {appointment.aiInsights && (
                            <div className={`
                                flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full
                                bg-purple-500/10 text-purple-500
                                text-[10px] sm:text-xs font-medium
                            `}>
                                <Sparkles size={10} className="sm:w-3 sm:h-3" />
                            </div>
                        )}

                        {/* Relative time - shortened on mobile */}
                        <span className="text-[10px] sm:text-xs text-muted-foreground max-w-[60px] sm:max-w-none truncate">
                            {getRelativeTime(appointment.startDate)}
                        </span>
                    </div>
                </div>

                {/* Quick actions (visible on hover) */}
                <div className={`
                    mt-4 pt-3 border-t border-white/5
                    flex gap-2
                    transition-all duration-300
                    opacity-0 max-h-0 overflow-hidden
                    group-hover:opacity-100 group-hover:max-h-20
                `}>
                    {/* Join button for virtual meetings */}
                    {appointment.location?.type === 'virtual' && appointment.location.meetingUrl && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onJoin) {
                                    onJoin();
                                } else {
                                    window.open(appointment.location.meetingUrl, '_blank');
                                }
                            }}
                            className={`
                                flex-1 py-2 rounded-xl
                                bg-gradient-to-r ${typeConfig.gradient}
                                text-white font-semibold text-sm
                                flex items-center justify-center gap-2
                                hover:opacity-90 transition-opacity
                                shadow-lg
                            `}
                        >
                            <Video size={16} />
                            {t('appointments.actions.join')}
                        </button>
                    )}

                    {/* Edit button */}
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="
                                flex-1 py-2 rounded-xl
                                bg-white/5 hover:bg-white/10
                                text-foreground font-medium text-sm
                                flex items-center justify-center gap-2
                                transition-colors
                            "
                        >
                            <Edit size={16} />
                            {t('appointments.actions.edit')}
                        </button>
                    )}
                </div>
            </div>

            {/* Priority indicator (top right corner) */}
            {appointment.priority === 'high' || appointment.priority === 'critical' ? (
                <div className={`
                    absolute top-3 right-3
                    w-2 h-2 rounded-full
                    ${appointment.priority === 'critical' ? 'bg-red-500' : 'bg-orange-500'}
                    animate-pulse
                `} />
            ) : null}
        </div>
    );
};

export default AppointmentCard;


