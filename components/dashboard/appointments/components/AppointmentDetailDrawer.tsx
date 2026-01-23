/**
 * AppointmentDetailDrawer
 * Drawer lateral con detalles completos de la cita
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Calendar,
    Clock,
    Video,
    Phone,
    MapPin,
    Users,
    Edit,
    Trash2,
    Copy,
    ExternalLink,
    Sparkles,
    MessageSquare,
    FileText,
    CheckCircle2,
    AlertCircle,
    Bell,
    MoreVertical,
    Share2,
    RefreshCw,
    Download,
    Tag,
    Plus,
    Check,
    Play,
    Loader2,
} from 'lucide-react';
import {
    Appointment,
    AppointmentStatus,
    APPOINTMENT_TYPE_CONFIGS,
    APPOINTMENT_STATUS_CONFIGS,
    APPOINTMENT_PRIORITY_CONFIGS,
    MeetingNote,
    FollowUpAction,
} from '../../../../types';
import {
    formatTime,
    formatDateOnly,
    formatDuration,
    calculateDuration,
    getRelativeTime,
    getInitials,
    getAvatarColor,
    timestampToDate,
    downloadAsICS,
} from '../utils/appointmentHelpers';
import { AIPreparationPanel } from './AIPreparationPanel';

// =============================================================================
// TYPES
// =============================================================================

interface AppointmentDetailDrawerProps {
    appointment: Appointment | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onStatusChange?: (status: AppointmentStatus) => Promise<void>;
    onGenerateAiPrep?: () => Promise<void>;
    onAddNote?: (content: string) => Promise<void>;
    onUpdateAiInsights?: (insights: any) => Promise<void>;
    isGeneratingAi?: boolean;
}

type TabId = 'details' | 'participants' | 'notes' | 'ai';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TabButtonProps {
    id: TabId;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
    badge?: number;
}

const TabButton: React.FC<TabButtonProps> = ({ id, label, icon: Icon, isActive, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
            transition-all duration-200
            ${isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }
        `}
    >
        <Icon size={16} />
        <span className="hidden sm:inline">{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className={`
                ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold
                ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
                {badge}
            </span>
        )}
    </button>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AppointmentDetailDrawer: React.FC<AppointmentDetailDrawerProps> = ({
    appointment,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    onStatusChange,
    onGenerateAiPrep,
    onAddNote,
    onUpdateAiInsights,
    isGeneratingAi,
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabId>('details');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const handleAddNote = async () => {
        if (!newNoteContent.trim() || !onAddNote) return;
        setIsAddingNote(true);
        try {
            await onAddNote(newNoteContent.trim());
            setNewNoteContent('');
            setShowNoteInput(false);
        } catch (error) {
            console.error('Error adding note:', error);
        } finally {
            setIsAddingNote(false);
        }
    };

    if (!appointment) return null;

    const typeConfig = APPOINTMENT_TYPE_CONFIGS[appointment.type] || APPOINTMENT_TYPE_CONFIGS.video_call;
    const statusConfig = APPOINTMENT_STATUS_CONFIGS[appointment.status] || APPOINTMENT_STATUS_CONFIGS.scheduled;
    const priorityConfig = APPOINTMENT_PRIORITY_CONFIGS[appointment.priority] || APPOINTMENT_PRIORITY_CONFIGS.medium;
    const startDate = timestampToDate(appointment.startDate);
    const endDate = timestampToDate(appointment.endDate);
    const duration = calculateDuration(appointment.startDate, appointment.endDate);

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

    const handleStatusChange = async (status: AppointmentStatus) => {
        if (!onStatusChange) return;
        setIsChangingStatus(true);
        try {
            await onStatusChange(status);
        } finally {
            setIsChangingStatus(false);
            setShowStatusMenu(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`
                    fixed inset-0 bg-black/40 backdrop-blur-sm z-40
                    transition-opacity duration-300
                    ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
                onClick={() => {
                    setShowMoreMenu(false);
                    setShowStatusMenu(false);
                    onClose();
                }}
            />

            {/* Drawer */}
            <div
                className={`
                    fixed right-0 top-0 bottom-0 w-full sm:w-[500px] lg:w-[550px]
                    bg-background border-l border-border shadow-2xl
                    z-50 flex flex-col
                    transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Header with gradient */}
                <div className={`
                    relative overflow-hidden
                    bg-gradient-to-br ${gradientClasses[typeConfig.color]}
                    p-4 sm:p-6 pb-14 sm:pb-16
                `}>
                    {/* Background pattern - hidden on small screens for performance */}
                    <div className="absolute inset-0 opacity-10 hidden sm:block">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                    >
                        <X size={18} className="sm:w-5 sm:h-5" />
                    </button>

                    {/* Header content */}
                    <div className="relative z-[1]">
                        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                            <span className="text-white/80 text-xs sm:text-sm font-medium">
                                {typeConfig.label}
                            </span>
                            <span className="text-white/40">·</span>
                            <span className={`
                                px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold
                                bg-white/20 text-white
                            `}>
                                {statusConfig.label}
                            </span>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5 sm:mb-2 line-clamp-2">
                            {appointment.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/80 text-xs sm:text-sm">
                            <div className="flex items-center gap-1">
                                <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
                                {startDate.toLocaleDateString('es-ES', {
                                    day: 'numeric',
                                    month: 'short'
                                })}
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                                {formatTime(appointment.startDate)}
                                <span className="hidden sm:inline">- {formatTime(appointment.endDate)}</span>
                            </div>
                            <span className="text-white/60 hidden sm:inline">
                                ({formatDuration(duration)})
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Bar */}
                <div className="px-4 sm:px-6 -mt-7 sm:-mt-8 relative z-10 flex gap-1.5 sm:gap-2">
                    {/* Join button */}
                    {appointment.location?.meetingUrl && (
                        <a
                            href={appointment.location.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 sm:py-3 bg-card border border-border rounded-xl shadow-lg font-semibold text-xs sm:text-sm text-foreground flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-secondary transition-colors"
                        >
                            <Video size={16} className="sm:w-[18px] sm:h-[18px] text-primary" />
                            <span>{t('appointments.join')}</span>
                        </a>
                    )}

                    {/* Status dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                            className="h-full px-2.5 sm:px-4 bg-card border border-border rounded-xl shadow-lg text-xs sm:text-sm text-foreground flex items-center gap-1.5 sm:gap-2 hover:bg-secondary transition-colors"
                        >
                            {isChangingStatus ? (
                                <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                            ) : (
                                <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
                            )}
                            <span className="hidden sm:inline">{t('leads.status')}</span>
                        </button>

                        {showStatusMenu && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-xl shadow-xl py-1 z-50 animate-scale-in">
                                {Object.entries(APPOINTMENT_STATUS_CONFIGS).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleStatusChange(key as AppointmentStatus)}
                                        className={`
                                            w-full px-4 py-2 text-left text-sm flex items-center gap-2
                                            hover:bg-secondary transition-colors
                                            ${appointment.status === key ? `${config.color} font-medium` : 'text-foreground'}
                                        `}
                                    >
                                        {appointment.status === key && <Check size={14} />}
                                        {config.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* More actions */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="px-3 h-full bg-card border border-border rounded-xl shadow-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                            <MoreVertical size={18} />
                        </button>

                        {showMoreMenu && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl py-1 z-50 animate-scale-in">
                                {/* Copy meeting link */}
                                {appointment.location?.meetingUrl && (
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(appointment.location.meetingUrl!);
                                            setShowMoreMenu(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-secondary transition-colors text-foreground"
                                    >
                                        <Copy size={16} className="text-muted-foreground" />
                                        {t('appointments.copyMeetingLink')}
                                    </button>
                                )}

                                {/* Download ICS */}
                                <button
                                    onClick={() => {
                                        downloadAsICS(appointment);
                                        setShowMoreMenu(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-secondary transition-colors text-foreground"
                                >
                                    <Download size={16} className="text-muted-foreground" />
                                    {t('appointments.downloadCalendar')}
                                </button>

                                {/* Share */}
                                <button
                                    onClick={() => {
                                        const shareText = `${appointment.title}\n📅 ${timestampToDate(appointment.startDate).toLocaleDateString('es-ES')}\n⏰ ${formatTime(appointment.startDate)} - ${formatTime(appointment.endDate)}${appointment.location?.meetingUrl ? `\n🔗 ${appointment.location.meetingUrl}` : ''}`;
                                        navigator.clipboard.writeText(shareText);
                                        setShowMoreMenu(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-secondary transition-colors text-foreground"
                                >
                                    <Share2 size={16} className="text-muted-foreground" />
                                    {t('appointments.copyDetails')}
                                </button>

                                {/* Divider */}
                                <div className="my-1 border-t border-border" />

                                {/* Edit */}
                                {onEdit && (
                                    <button
                                        onClick={() => {
                                            onEdit();
                                            setShowMoreMenu(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-secondary transition-colors text-foreground"
                                    >
                                        <Edit size={16} className="text-muted-foreground" />
                                        {t('appointments.editAppointment')}
                                    </button>
                                )}

                                {/* Delete */}
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onDelete();
                                            setShowMoreMenu(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-secondary transition-colors text-red-500"
                                    >
                                        <Trash2 size={16} />
                                        {t('appointments.deleteAppointment')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-6 pb-2 flex gap-1 overflow-x-auto">
                    <TabButton
                        id="details"
                        label={t('appointments.details')}
                        icon={FileText}
                        isActive={activeTab === 'details'}
                        onClick={() => setActiveTab('details')}
                    />
                    <TabButton
                        id="participants"
                        label={t('appointments.participants')}
                        icon={Users}
                        isActive={activeTab === 'participants'}
                        onClick={() => setActiveTab('participants')}
                        badge={appointment.participants?.length || 0}
                    />
                    <TabButton
                        id="notes"
                        label={t('appointments.notes')}
                        icon={MessageSquare}
                        isActive={activeTab === 'notes'}
                        onClick={() => setActiveTab('notes')}
                        badge={appointment.notes?.length}
                    />
                    <TabButton
                        id="ai"
                        label="IA"
                        icon={Sparkles}
                        isActive={activeTab === 'ai'}
                        onClick={() => setActiveTab('ai')}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Description */}
                            {appointment.description && (
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {t('common.description')}
                                    </h4>
                                    <p className="text-sm text-foreground leading-relaxed">
                                        {appointment.description}
                                    </p>
                                </div>
                            )}

                            {/* Location */}
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    {t('appointments.location')}
                                </h4>
                                <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
                                    <div className="p-2 bg-secondary rounded-lg">
                                        {appointment.location?.type === 'virtual' && <Video size={18} className="text-primary" />}
                                        {appointment.location?.type === 'physical' && <MapPin size={18} className="text-primary" />}
                                        {appointment.location?.type === 'phone' && <Phone size={18} className="text-primary" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-foreground">
                                            {appointment.location?.type === 'virtual' && 'Reunión virtual'}
                                            {appointment.location?.type === 'physical' && 'Reunión presencial'}
                                            {appointment.location?.type === 'phone' && 'Llamada telefónica'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {appointment.location?.meetingUrl || appointment.location?.address || appointment.location?.phoneNumber || 'Sin detalles'}
                                        </p>
                                    </div>
                                    {appointment.location?.meetingUrl && (
                                        <a
                                            href={appointment.location.meetingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Priority & Tags */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {t('appointments.priority')}
                                    </h4>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 ${priorityConfig.color} font-medium text-sm`}>
                                        {priorityConfig.label}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {t('appointments.type')}
                                    </h4>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 text-foreground font-medium text-sm">
                                        {typeConfig.label}
                                    </span>
                                </div>
                            </div>

                            {/* Tags */}
                            {appointment.tags && appointment.tags.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {t('leads.tags')}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {appointment.tags.map(tag => (
                                            <span
                                                key={tag}
                                                className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reminders */}
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    {t('appointments.remindersLabel')}
                                </h4>
                                <div className="space-y-2">
                                    {appointment.reminders?.map(reminder => (
                                        <div
                                            key={reminder.id}
                                            className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg"
                                        >
                                            <Bell size={14} className={reminder.sent ? 'text-green-500' : 'text-muted-foreground'} />
                                            <span className="text-sm text-foreground flex-1">
                                                {reminder.minutesBefore < 60
                                                    ? `${reminder.minutesBefore} minutos antes`
                                                    : reminder.minutesBefore < 1440
                                                        ? `${reminder.minutesBefore / 60} hora(s) antes`
                                                        : `${reminder.minutesBefore / 1440} día(s) antes`
                                                }
                                            </span>
                                            {reminder.sent && (
                                                <Check size={14} className="text-green-500" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Participants Tab */}
                    {activeTab === 'participants' && (
                        <div className="space-y-4 animate-fade-in">
                            {appointment.participants?.map(participant => (
                                <div
                                    key={participant.id}
                                    className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl"
                                >
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center text-white font-bold
                                        ${getAvatarColor(participant.name)}
                                    `}>
                                        {participant.avatar ? (
                                            <img src={participant.avatar} alt={participant.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            getInitials(participant.name)
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-foreground">{participant.name}</p>
                                            {participant.role === 'host' && (
                                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                                    Organizador
                                                </span>
                                            )}
                                            {participant.type === 'lead' && (
                                                <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-500 rounded text-xs font-medium">
                                                    Lead
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">{participant.email}</p>
                                        {participant.company && (
                                            <p className="text-xs text-muted-foreground">{participant.company}</p>
                                        )}
                                    </div>
                                    <div className={`
                                        px-2.5 py-1 rounded-full text-xs font-medium
                                        ${participant.status === 'accepted' ? 'bg-green-500/10 text-green-500' :
                                            participant.status === 'declined' ? 'bg-red-500/10 text-red-500' :
                                                participant.status === 'tentative' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-muted text-muted-foreground'}
                                    `}>
                                        {participant.status === 'accepted' ? 'Aceptado' :
                                            participant.status === 'declined' ? 'Rechazado' :
                                                participant.status === 'tentative' ? 'Tentativo' :
                                                    'Pendiente'}
                                    </div>
                                </div>
                            ))}

                            {(!appointment.participants || appointment.participants.length === 0) && (
                                <div className="text-center py-8">
                                    <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No hay participantes en esta cita
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes Tab */}
                    {activeTab === 'notes' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Add Note Form */}
                            {showNoteInput ? (
                                <div className="p-4 bg-secondary/30 rounded-xl space-y-3">
                                    <textarea
                                        value={newNoteContent}
                                        onChange={(e) => setNewNoteContent(e.target.value)}
                                        placeholder="Escribe tu nota aquí..."
                                        rows={4}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setShowNoteInput(false);
                                                setNewNoteContent('');
                                            }}
                                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleAddNote}
                                            disabled={!newNoteContent.trim() || isAddingNote}
                                            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isAddingNote ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={14} />
                                                    Guardar nota
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowNoteInput(true)}
                                    className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    Añadir nota
                                </button>
                            )}

                            {appointment.notes?.map(note => (
                                <div
                                    key={note.id}
                                    className="p-4 bg-secondary/30 rounded-xl"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-muted-foreground">
                                            {timestampToDate(note.createdAt).toLocaleDateString('es-ES')}
                                        </span>
                                        {note.aiGenerated && (
                                            <span className="flex items-center gap-1 text-xs text-purple-500">
                                                <Sparkles size={12} />
                                                Generado por IA
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground whitespace-pre-wrap">
                                        {note.content}
                                    </p>
                                </div>
                            ))}

                            {(!appointment.notes || appointment.notes.length === 0) && !showNoteInput && (
                                <div className="text-center py-8">
                                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No hay notas todavía
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI Tab */}
                    {activeTab === 'ai' && onUpdateAiInsights && (
                        <AIPreparationPanel
                            appointment={appointment}
                            onInsightsGenerated={onUpdateAiInsights}
                        />
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-3 sm:p-4 border-t border-border bg-secondary/20 flex gap-1.5 sm:gap-2">
                    <button
                        onClick={() => downloadAsICS(appointment)}
                        className="flex-1 py-2 sm:py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-colors"
                    >
                        <Download size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Exportar</span>
                    </button>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="flex-1 py-2 sm:py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-colors"
                        >
                            <Edit size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Editar</span>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="py-2 sm:py-2.5 px-3 sm:px-4 text-red-500 hover:bg-red-500/10 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-colors"
                        >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default AppointmentDetailDrawer;


