/**
 * CreateAppointmentModal
 * Modal de creación de citas con wizard multi-step
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    ChevronLeft,
    ChevronRight,
    Check,
    Calendar,
    Clock,
    Users,
    Settings,
    Sparkles,
    Video,
    Phone,
    MapPin,
    Plus,
    Trash2,
    Bell,
    AlertCircle,
    Loader2,
    Search,
} from 'lucide-react';
import {
    Appointment,
    AppointmentType,
    AppointmentPriority,
    AppointmentParticipant,
    AppointmentReminder,
    AppointmentLocation,
    APPOINTMENT_TYPE_CONFIGS,
    APPOINTMENT_PRIORITY_CONFIGS,
    DEFAULT_REMINDERS,
    getAppointmentTypeConfig,
} from '../../../../types';
import { Lead } from '../../../../types';
import Modal from '../../../ui/Modal';
import {
    generateParticipantId,
    generateReminderId,
    dateToTimestamp,
    formatReminderTime,
    isValidEmail,
    getInitials,
    getAvatarColor,
} from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface CreateAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Appointment>) => Promise<void>;
    leads: Lead[];
    initialDate?: Date;
    initialHour?: number;
    editingAppointment?: Appointment;
}

type WizardStep = 'basics' | 'datetime' | 'participants' | 'settings';

interface FormData {
    title: string;
    description: string;
    type: AppointmentType;
    priority: AppointmentPriority;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    timezone: string;
    participants: AppointmentParticipant[];
    locationType: 'virtual' | 'physical' | 'phone';
    meetingUrl: string;
    address: string;
    phoneNumber: string;
    reminders: AppointmentReminder[];
    aiPrepEnabled: boolean;
    tags: string[];
    linkedLeadIds: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
    { id: 'basics', label: 'Información', icon: Calendar },
    { id: 'datetime', label: 'Fecha y Hora', icon: Clock },
    { id: 'participants', label: 'Participantes', icon: Users },
    { id: 'settings', label: 'Configuración', icon: Settings },
];

const REMINDER_OPTIONS = [
    { minutes: 15, label: '15 minutos antes' },
    { minutes: 30, label: '30 minutos antes' },
    { minutes: 60, label: '1 hora antes' },
    { minutes: 120, label: '2 horas antes' },
    { minutes: 1440, label: '1 día antes' },
    { minutes: 2880, label: '2 días antes' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getDefaultFormData = (initialDate?: Date, initialHour?: number, editingAppointment?: Appointment | null): FormData => {
    // If editing, populate from existing appointment
    if (editingAppointment) {
        const startDate = editingAppointment.startDate instanceof Date
            ? editingAppointment.startDate
            : (editingAppointment.startDate as any)?.toDate?.() || new Date();
        const endDate = editingAppointment.endDate instanceof Date
            ? editingAppointment.endDate
            : (editingAppointment.endDate as any)?.toDate?.() || new Date();

        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const formatTime = (d: Date) => d.toTimeString().slice(0, 5);

        return {
            title: editingAppointment.title || '',
            description: editingAppointment.description || '',
            type: editingAppointment.type || 'video_call',
            priority: editingAppointment.priority || 'medium',
            startDate: formatDate(startDate),
            startTime: formatTime(startDate),
            endDate: formatDate(endDate),
            endTime: formatTime(endDate),
            timezone: editingAppointment.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            participants: editingAppointment.participants || [],
            locationType: editingAppointment.location?.type || 'virtual',
            meetingUrl: editingAppointment.location?.meetingUrl || '',
            address: editingAppointment.location?.address || '',
            phoneNumber: editingAppointment.location?.phoneNumber || '',
            reminders: editingAppointment.reminders || DEFAULT_REMINDERS.map((r) => ({
                ...r,
                id: generateReminderId(),
                sent: false,
            })),
            aiPrepEnabled: editingAppointment.aiPrepEnabled ?? true,
            tags: editingAppointment.tags || [],
            linkedLeadIds: editingAppointment.linkedLeadIds || [],
        };
    }

    // Default for new appointment
    const now = initialDate || new Date();
    const startHour = initialHour ?? now.getHours() + 1;

    const startDate = new Date(now);
    startDate.setHours(startHour, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const formatTime = (d: Date) => d.toTimeString().slice(0, 5);

    return {
        title: '',
        description: '',
        type: 'video_call',
        priority: 'medium',
        startDate: formatDate(startDate),
        startTime: formatTime(startDate),
        endDate: formatDate(endDate),
        endTime: formatTime(endDate),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        participants: [],
        locationType: 'virtual',
        meetingUrl: '',
        address: '',
        phoneNumber: '',
        reminders: DEFAULT_REMINDERS.map((r, i) => ({
            ...r,
            id: generateReminderId(),
            sent: false,
        })),
        aiPrepEnabled: true,
        tags: [],
        linkedLeadIds: [],
    };
};

// =============================================================================
// STEP COMPONENTS
// =============================================================================

// Step 1: Basics
interface BasicsStepProps {
    data: FormData;
    onChange: (data: Partial<FormData>) => void;
}

const BasicsStep: React.FC<BasicsStepProps> = ({ data, onChange }) => {
    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Title */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                    Título de la cita *
                </label>
                <input
                    type="text"
                    value={data.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="Ej: Llamada de discovery con cliente"
                    className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    autoFocus
                />
            </div>

            {/* Type selector */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                    Tipo de cita
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {Object.entries(APPOINTMENT_TYPE_CONFIGS).map(([key, config]) => {
                        const isSelected = data.type === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onChange({ type: key as AppointmentType })}
                                className={`
                                    relative p-3 rounded-xl border-2 text-left
                                    transition-all duration-200
                                    ${isSelected
                                        ? `border-${config.color}-500 bg-${config.color}-500/10`
                                        : 'border-border hover:border-muted-foreground/30 hover:bg-secondary/50'
                                    }
                                `}
                            >
                                <div className={`
                                    w-8 h-8 rounded-lg mb-2 flex items-center justify-center
                                    ${isSelected ? `bg-gradient-to-br ${config.gradient} text-white` : 'bg-muted text-muted-foreground'}
                                `}>
                                    {key === 'call' && <Phone size={16} />}
                                    {key === 'video_call' && <Video size={16} />}
                                    {key === 'in_person' && <MapPin size={16} />}
                                    {key === 'demo' && <Sparkles size={16} />}
                                    {key === 'consultation' && <Users size={16} />}
                                    {key === 'follow_up' && <Clock size={16} />}
                                    {key === 'discovery' && <Search size={16} />}
                                    {key === 'closing' && <Check size={16} />}
                                </div>
                                <p className={`text-xs font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {config.label}
                                </p>
                                {isSelected && (
                                    <div className="absolute top-2 right-2">
                                        <Check size={14} className="text-primary" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Custom Type Input */}
                <div className="relative">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 ml-1">
                        O escribe un tipo personalizado
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={Object.keys(APPOINTMENT_TYPE_CONFIGS).includes(data.type) ? '' : data.type}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) onChange({ type: val as AppointmentType });
                            }}
                            placeholder="Ej. Entrevista, Coaching, Terapia..."
                            className={`
                                w-full h-10 bg-secondary/50 border rounded-xl px-4 pl-10 text-sm
                                outline-none focus:ring-2 focus:ring-primary/50 transition-all
                                ${!Object.keys(APPOINTMENT_TYPE_CONFIGS).includes(data.type) && data.type
                                    ? 'border-primary text-foreground'
                                    : 'border-border text-muted-foreground'
                                }
                            `}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <Sparkles size={14} />
                        </div>
                    </div>
                    {/* Display current custom type if selected */}
                    {!Object.keys(APPOINTMENT_TYPE_CONFIGS).includes(data.type) && data.type && (
                        <div className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
                                <span className="text-xs font-bold">#</span>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                                Tipo seleccionado: <span className="text-primary">{data.type}</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Priority */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                    Prioridad
                </label>
                <div className="flex gap-2">
                    {Object.entries(APPOINTMENT_PRIORITY_CONFIGS).map(([key, config]) => {
                        const isSelected = data.priority === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onChange({ priority: key as AppointmentPriority })}
                                className={`
                                    flex-1 py-2.5 px-4 rounded-xl border-2 font-medium text-sm
                                    transition-all duration-200
                                    ${isSelected
                                        ? `border-current ${config.color} bg-current/10`
                                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                                    }
                                `}
                            >
                                {config.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                    Descripción
                </label>
                <textarea
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Añade contexto o notas sobre la cita..."
                    rows={3}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
            </div>
        </div >
    );
};

// Step 2: DateTime
interface DateTimeStepProps {
    data: FormData;
    onChange: (data: Partial<FormData>) => void;
}

const DateTimeStep: React.FC<DateTimeStepProps> = ({ data, onChange }) => {
    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Date & Time grid */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                        Fecha de inicio *
                    </label>
                    <input
                        type="date"
                        value={data.startDate}
                        onChange={(e) => onChange({ startDate: e.target.value })}
                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                        Hora de inicio *
                    </label>
                    <input
                        type="time"
                        value={data.startTime}
                        onChange={(e) => onChange({ startTime: e.target.value })}
                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                        Fecha de fin
                    </label>
                    <input
                        type="date"
                        value={data.endDate}
                        onChange={(e) => onChange({ endDate: e.target.value })}
                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                        Hora de fin
                    </label>
                    <input
                        type="time"
                        value={data.endTime}
                        onChange={(e) => onChange({ endTime: e.target.value })}
                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                </div>
            </div>

            {/* Quick duration buttons */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                    Duración rápida
                </label>
                <div className="flex gap-2 flex-wrap">
                    {[15, 30, 45, 60, 90, 120].map(minutes => (
                        <button
                            key={minutes}
                            type="button"
                            onClick={() => {
                                const start = new Date(`${data.startDate}T${data.startTime}`);
                                const end = new Date(start.getTime() + minutes * 60000);
                                onChange({
                                    endDate: end.toISOString().split('T')[0],
                                    endTime: end.toTimeString().slice(0, 5),
                                });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timezone */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                    Zona horaria
                </label>
                <select
                    value={data.timezone}
                    onChange={(e) => onChange({ timezone: e.target.value })}
                    className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                    <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                    <option value="America/New_York">Nueva York (GMT-5)</option>
                    <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                    <option value="Europe/Madrid">Madrid (GMT+1)</option>
                    <option value="Europe/London">Londres (GMT+0)</option>
                    <option value="America/Bogota">Bogotá (GMT-5)</option>
                    <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
                </select>
            </div>

            {/* Location type */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                    Ubicación
                </label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                        { type: 'virtual', icon: Video, label: 'Virtual' },
                        { type: 'physical', icon: MapPin, label: 'Presencial' },
                        { type: 'phone', icon: Phone, label: 'Teléfono' },
                    ].map(({ type, icon: Icon, label }) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onChange({ locationType: type as any })}
                            className={`
                                flex flex-col items-center gap-2 p-4 rounded-xl border-2
                                transition-all duration-200
                                ${data.locationType === type
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/30'
                                }
                            `}
                        >
                            <Icon size={20} className={data.locationType === type ? 'text-primary' : 'text-muted-foreground'} />
                            <span className={`text-sm font-medium ${data.locationType === type ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Location details */}
                {data.locationType === 'virtual' && (
                    <input
                        type="url"
                        value={data.meetingUrl}
                        onChange={(e) => onChange({ meetingUrl: e.target.value })}
                        placeholder="https://meet.google.com/... o https://zoom.us/..."
                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                )}
                {data.locationType === 'physical' && (
                    <input
                        type="text"
                        value={data.address}
                        onChange={(e) => onChange({ address: e.target.value })}
                        placeholder="Dirección completa..."
                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                )}
                {data.locationType === 'phone' && (
                    <input
                        type="tel"
                        value={data.phoneNumber}
                        onChange={(e) => onChange({ phoneNumber: e.target.value })}
                        placeholder="+52 55 1234 5678"
                        className="w-full h-12 bg-secondary/50 border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                )}
            </div>
        </div>
    );
};

// Step 3: Participants
interface ParticipantsStepProps {
    data: FormData;
    leads: Lead[];
    onChange: (data: Partial<FormData>) => void;
}

const ParticipantsStep: React.FC<ParticipantsStepProps> = ({ data, leads, onChange }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showLeadPicker, setShowLeadPicker] = useState(false);
    const [newParticipant, setNewParticipant] = useState({ name: '', email: '' });

    const filteredLeads = useMemo(() => {
        if (!searchQuery) return leads.slice(0, 10);
        const query = searchQuery.toLowerCase();
        return leads.filter(lead =>
            lead.name?.toLowerCase().includes(query) ||
            lead.email?.toLowerCase().includes(query) ||
            lead.company?.toLowerCase().includes(query)
        ).slice(0, 10);
    }, [leads, searchQuery]);

    const addLeadAsParticipant = (lead: Lead) => {
        const newP: AppointmentParticipant = {
            id: generateParticipantId(),
            type: 'lead',
            name: lead.name || '',
            email: lead.email || '',
            phone: lead.phone,
            company: lead.company,
            leadId: lead.id,
            role: 'attendee',
            status: 'pending',
        };
        onChange({
            participants: [...data.participants, newP],
            linkedLeadIds: [...data.linkedLeadIds, lead.id],
        });
        setShowLeadPicker(false);
        setSearchQuery('');
    };

    const addExternalParticipant = () => {
        if (!newParticipant.name || !newParticipant.email) return;
        if (!isValidEmail(newParticipant.email)) return;

        const newP: AppointmentParticipant = {
            id: generateParticipantId(),
            type: 'external',
            name: newParticipant.name,
            email: newParticipant.email,
            role: 'attendee',
            status: 'pending',
        };
        onChange({ participants: [...data.participants, newP] });
        setNewParticipant({ name: '', email: '' });
    };

    const removeParticipant = (id: string) => {
        const participant = data.participants.find(p => p.id === id);
        const updatedParticipants = data.participants.filter(p => p.id !== id);
        const updatedLeadIds = participant?.leadId
            ? data.linkedLeadIds.filter(lid => lid !== participant.leadId)
            : data.linkedLeadIds;
        onChange({ participants: updatedParticipants, linkedLeadIds: updatedLeadIds });
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Import from Leads */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-foreground">
                        Importar desde Leads
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowLeadPicker(!showLeadPicker)}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        <Users size={14} />
                        Seleccionar leads
                    </button>
                </div>

                {showLeadPicker && (
                    <div className="border border-border rounded-xl p-4 bg-secondary/30 mb-4 animate-scale-in">
                        <div className="flex items-center gap-2 mb-3 bg-editor-border/40 rounded-lg px-3 py-2">
                            <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar leads..."
                                className="flex-1 bg-transparent outline-none text-sm min-w-0"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {filteredLeads.map(lead => {
                                const isAdded = data.linkedLeadIds.includes(lead.id);
                                return (
                                    <button
                                        key={lead.id}
                                        type="button"
                                        onClick={() => !isAdded && addLeadAsParticipant(lead)}
                                        disabled={isAdded}
                                        className={`
                                            w-full flex items-center gap-3 p-2 rounded-lg text-left
                                            transition-colors
                                            ${isAdded
                                                ? 'bg-primary/10 cursor-not-allowed'
                                                : 'hover:bg-secondary'
                                            }
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-full ${getAvatarColor(lead.name || '')} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                            {getInitials(lead.name || '')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                                        </div>
                                        {isAdded && <Check size={16} className="text-primary" />}
                                    </button>
                                );
                            })}

                            {filteredLeads.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No se encontraron leads
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add external participant */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                    Añadir participante externo
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newParticipant.name}
                        onChange={(e) => setNewParticipant(p => ({ ...p, name: e.target.value }))}
                        placeholder="Nombre"
                        className="flex-1 h-10 bg-secondary/50 border border-border rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <input
                        type="email"
                        value={newParticipant.email}
                        onChange={(e) => setNewParticipant(p => ({ ...p, email: e.target.value }))}
                        placeholder="email@ejemplo.com"
                        className="flex-1 h-10 bg-secondary/50 border border-border rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                        type="button"
                        onClick={addExternalParticipant}
                        disabled={!newParticipant.name || !newParticipant.email}
                        className="h-10 px-4 bg-primary text-primary-foreground rounded-lg font-medium text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Participants list */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                    Participantes ({data.participants.length})
                </label>

                {data.participants.length === 0 ? (
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                        <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Aún no hay participantes. Importa desde tus leads o añade participantes externos.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.participants.map(participant => (
                            <div
                                key={participant.id}
                                className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl group"
                            >
                                <div className={`w-10 h-10 rounded-full ${getAvatarColor(participant.name)} flex items-center justify-center text-white font-bold shrink-0`}>
                                    {getInitials(participant.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground">{participant.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{participant.email}</p>
                                </div>
                                {participant.type === 'lead' && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        Lead
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeParticipant(participant.id)}
                                    className="p-1.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Step 4: Settings
interface SettingsStepProps {
    data: FormData;
    onChange: (data: Partial<FormData>) => void;
}

const SettingsStep: React.FC<SettingsStepProps> = ({ data, onChange }) => {
    const toggleReminder = (minutes: number) => {
        const existing = data.reminders.find(r => r.minutesBefore === minutes);
        if (existing) {
            onChange({ reminders: data.reminders.filter(r => r.minutesBefore !== minutes) });
        } else {
            const newReminder: AppointmentReminder = {
                id: generateReminderId(),
                type: 'email',
                minutesBefore: minutes,
                sent: false,
                enabled: true,
            };
            onChange({ reminders: [...data.reminders, newReminder] });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Reminders */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                    <Bell size={14} className="inline mr-2" />
                    Recordatorios
                </label>
                <div className="flex flex-wrap gap-2">
                    {REMINDER_OPTIONS.map(option => {
                        const isActive = data.reminders.some(r => r.minutesBefore === option.minutes);
                        return (
                            <button
                                key={option.minutes}
                                type="button"
                                onClick={() => toggleReminder(option.minutes)}
                                className={`
                                    px-3 py-2 rounded-lg text-sm font-medium
                                    transition-all duration-200
                                    ${isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    }
                                `}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* AI Preparation */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 text-white rounded-lg">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">Preparación con IA</p>
                            <p className="text-sm text-muted-foreground">
                                Genera briefing, preguntas clave y estrategia
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.aiPrepEnabled}
                            onChange={(e) => onChange({ aiPrepEnabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-purple-500 transition-colors">
                            <div className={`
                                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                                transition-transform duration-200
                                ${data.aiPrepEnabled ? 'translate-x-5' : ''}
                            `} />
                        </div>
                    </label>
                </div>
            </div>

            {/* Tags */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                    Etiquetas
                </label>
                <input
                    type="text"
                    placeholder="Escribe y presiona Enter para añadir..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value && !data.tags.includes(value)) {
                                onChange({ tags: [...data.tags, value] });
                                (e.target as HTMLInputElement).value = '';
                            }
                        }
                    }}
                    className="w-full h-10 bg-secondary/50 border border-border rounded-lg px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
                {data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {data.tags.map(tag => (
                            <span
                                key={tag}
                                className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium flex items-center gap-1"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => onChange({ tags: data.tags.filter(t => t !== tag) })}
                                    className="hover:text-red-500"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <h4 className="font-semibold text-foreground mb-3">Resumen</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="text-foreground font-medium">
                            {APPOINTMENT_TYPE_CONFIGS[data.type]?.label}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha:</span>
                        <span className="text-foreground font-medium">
                            {new Date(data.startDate).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Hora:</span>
                        <span className="text-foreground font-medium">
                            {data.startTime} - {data.endTime}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Participantes:</span>
                        <span className="text-foreground font-medium">
                            {data.participants.length}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Recordatorios:</span>
                        <span className="text-foreground font-medium">
                            {data.reminders.length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    leads,
    initialDate,
    initialHour,
    editingAppointment,
}) => {
    const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
    const [formData, setFormData] = useState<FormData>(() => getDefaultFormData(initialDate, initialHour, editingAppointment));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === STEPS.length - 1;

    const handleChange = useCallback((updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    const validateStep = (): boolean => {
        const newErrors: string[] = [];

        switch (currentStep) {
            case 'basics':
                if (!formData.title.trim()) newErrors.push('El título es requerido');
                break;
            case 'datetime':
                if (!formData.startDate) newErrors.push('La fecha de inicio es requerida');
                if (!formData.startTime) newErrors.push('La hora de inicio es requerida');
                break;
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleNext = () => {
        if (!validateStep()) return;

        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEPS.length) {
            setCurrentStep(STEPS[nextIndex].id);
        }
    };

    const handlePrev = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(STEPS[prevIndex].id);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        setIsSubmitting(true);
        try {
            const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

            // Build location object without undefined values (Firebase doesn't accept undefined)
            const location: AppointmentLocation = {
                type: formData.locationType,
            };

            if (formData.locationType === 'virtual' && formData.meetingUrl) {
                location.meetingUrl = formData.meetingUrl;
            }
            if (formData.locationType === 'physical' && formData.address) {
                location.address = formData.address;
            }
            if (formData.locationType === 'phone' && formData.phoneNumber) {
                location.phoneNumber = formData.phoneNumber;
            }

            // Build appointment data without undefined values
            const appointmentData: Partial<Appointment> = {
                title: formData.title,
                type: formData.type,
                priority: formData.priority,
                startDate: dateToTimestamp(startDateTime),
                endDate: dateToTimestamp(endDateTime),
                timezone: formData.timezone,
                participants: formData.participants,
                location,
                reminders: formData.reminders,
                aiPrepEnabled: formData.aiPrepEnabled,
                tags: formData.tags.length > 0 ? formData.tags : [],
                linkedLeadIds: formData.linkedLeadIds.length > 0 ? formData.linkedLeadIds : [],
            };

            // Only add optional fields if they have values
            if (formData.description?.trim()) {
                appointmentData.description = formData.description;
            }

            await onSubmit(appointmentData);

            onClose();
            setFormData(getDefaultFormData());
            setCurrentStep('basics');
        } catch (error) {
            console.error('Error creating appointment:', error);
            setErrors(['Error al crear la cita. Inténtalo de nuevo.']);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setFormData(getDefaultFormData(initialDate, initialHour, editingAppointment));
            setCurrentStep('basics');
            setErrors([]);
        }
    }, [isOpen, initialDate, initialHour, editingAppointment]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
            <div className="flex flex-col h-[80vh] max-h-[700px]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">
                            {editingAppointment ? 'Editar cita' : 'Nueva cita'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {STEPS[currentStepIndex].label}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress */}
                <div className="px-6 py-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        {STEPS.map((step, index) => {
                            const isActive = index === currentStepIndex;
                            const isCompleted = index < currentStepIndex;
                            const Icon = step.icon;

                            return (
                                <React.Fragment key={step.id}>
                                    <button
                                        onClick={() => index < currentStepIndex && setCurrentStep(step.id)}
                                        disabled={index > currentStepIndex}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg
                                            transition-all duration-200
                                            ${isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : isCompleted
                                                    ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                                                    : 'text-muted-foreground'
                                            }
                                        `}
                                    >
                                        {isCompleted ? (
                                            <Check size={16} />
                                        ) : (
                                            <Icon size={16} />
                                        )}
                                        <span className="text-sm font-medium hidden sm:inline">
                                            {step.label}
                                        </span>
                                    </button>

                                    {index < STEPS.length - 1 && (
                                        <ChevronRight size={16} className="text-muted-foreground/50" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {errors.map((error, i) => (
                            <p key={i} className="text-sm text-red-500 flex items-center gap-2">
                                <AlertCircle size={14} />
                                {error}
                            </p>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {currentStep === 'basics' && (
                        <BasicsStep data={formData} onChange={handleChange} />
                    )}
                    {currentStep === 'datetime' && (
                        <DateTimeStep data={formData} onChange={handleChange} />
                    )}
                    {currentStep === 'participants' && (
                        <ParticipantsStep data={formData} leads={leads} onChange={handleChange} />
                    )}
                    {currentStep === 'settings' && (
                        <SettingsStep data={formData} onChange={handleChange} />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border bg-secondary/20">
                    <button
                        onClick={handlePrev}
                        disabled={isFirstStep}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                            transition-colors
                            ${isFirstStep
                                ? 'text-muted-foreground/50 cursor-not-allowed'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }
                        `}
                    >
                        <ChevronLeft size={18} />
                        Anterior
                    </button>

                    {isLastStep ? (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {editingAppointment ? 'Guardando...' : 'Creando...'}
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    {editingAppointment ? 'Guardar cambios' : 'Crear cita'}
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                        >
                            Siguiente
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default CreateAppointmentModal;

