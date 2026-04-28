/**
 * AdminAppointmentsDashboard.tsx
 * Dashboard de Citas para Super Admin — opera sobre platformAppointments (sin proyecto)
 * Versión simplificada que reutiliza subcomponentes del módulo de citas existente.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    Calendar, Plus, Search, ChevronLeft, ChevronRight,
    Columns, List, CalendarDays, RefreshCw,
    Loader2, Clock, CheckCircle2, XCircle, Download,
    TrendingUp, CalendarRange,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/core/AuthContext';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import { Appointment, AppointmentStatus } from '../../../types';
import HeaderBackButton from '../../ui/HeaderBackButton';

// Reuse existing sub-components

import { CreateAppointmentModal } from '../appointments/components/CreateAppointmentModal';
import { AppointmentDetailDrawer } from '../appointments/components/AppointmentDetailDrawer';
import { CalendarWeekView } from '../appointments/views/CalendarWeekView';
import { CalendarMonthView } from '../appointments/views/CalendarMonthView';
import { CalendarDayView } from '../appointments/views/CalendarDayView';
import { AppointmentsListView } from '../appointments/views/AppointmentsListView';
import ConfirmationModal from '../../ui/ConfirmationModal';
import MobileSearchModal from '../../ui/MobileSearchModal';

// Admin hook
import { useAdminAppointments } from './hooks/useAdminAppointments';

// Helper


// =============================================================================
// TYPES
// =============================================================================

type ViewMode = 'day' | 'week' | 'month' | 'list';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface AdminAppointmentsDashboardProps {
    onBack: () => void;
}

const AdminAppointmentsDashboard: React.FC<AdminAppointmentsDashboardProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { user } = useAuth();


    // Admin appointments hook (platform-level, not project-scoped)
    const {
        appointments,
        filteredAppointments,
        isLoading,
        selectedAppointment,
        setSelectedAppointment,
        filters,
        setFilters,
        clearFilters,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        updateStatus,
        todayAppointments,
        upcomingAppointments,
        analytics,
        refresh,
    } = useAdminAppointments();

    // Local state
    const [viewMode, setViewMode] = useState<ViewMode>(
        typeof window !== 'undefined' && window.innerWidth < 640 ? 'day' : 'week'
    );
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalInitialDate, setCreateModalInitialDate] = useState<Date | undefined>();
    const [createModalInitialHour, setCreateModalInitialHour] = useState<number | undefined>();
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteAppointment, setPendingDeleteAppointment] = useState<Appointment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // =========================================================================
    // NAVIGATION
    // =========================================================================

    const navigateDate = useCallback((direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') { setCurrentDate(new Date()); return; }
        const newDate = new Date(currentDate);
        const delta = direction === 'next' ? 1 : -1;
        switch (viewMode) {
            case 'day': newDate.setDate(newDate.getDate() + delta); break;
            case 'week': newDate.setDate(newDate.getDate() + (delta * 7)); break;
            case 'month': newDate.setMonth(newDate.getMonth() + delta); break;
        }
        setCurrentDate(newDate);
    }, [currentDate, viewMode]);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const handleAppointmentClick = useCallback((appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsDetailDrawerOpen(true);
    }, [setSelectedAppointment]);

    const handleSlotClick = useCallback((date: Date, hour: number) => {
        setCreateModalInitialDate(date);
        setCreateModalInitialHour(hour);
        setIsCreateModalOpen(true);
    }, []);

    const handleCreateAppointment = useCallback(async (data: Partial<Appointment>) => {
        if (editingAppointment) {
            await updateAppointment(editingAppointment.id, data);
        } else {
            await createAppointment(data);
        }
        setIsCreateModalOpen(false);
        setCreateModalInitialDate(undefined);
        setCreateModalInitialHour(undefined);
        setEditingAppointment(null);
    }, [createAppointment, updateAppointment, editingAppointment]);

    const handleEditAppointment = useCallback(() => {
        if (selectedAppointment) {
            setEditingAppointment(selectedAppointment);
            setIsDetailDrawerOpen(false);
            setIsCreateModalOpen(true);
        }
    }, [selectedAppointment]);

    const handleStatusChange = useCallback(async (status: AppointmentStatus) => {
        if (selectedAppointment) {
            await updateStatus(selectedAppointment.id, status);
        }
    }, [selectedAppointment, updateStatus]);

    const handleDeleteAppointment = useCallback(async () => {
        if (!selectedAppointment) return;
        setPendingDeleteAppointment(selectedAppointment);
        setShowDeleteConfirm(true);
    }, [selectedAppointment]);

    const confirmDeleteAppointment = useCallback(async () => {
        const apt = pendingDeleteAppointment;
        if (!apt) return;
        setIsDeleting(true);
        try {
            await deleteAppointment(apt.id);
            setIsDetailDrawerOpen(false);
            setSelectedAppointment(null);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            setPendingDeleteAppointment(null);
        }
    }, [pendingDeleteAppointment, deleteAppointment, setSelectedAppointment]);

    // CSV Export
    const handleExportCSV = () => {
        const headers = ['Title', 'Type', 'Status', 'Start', 'End', 'Priority', 'Participants'];
        const rows = filteredAppointments.map(a => [
            a.title, a.type, a.status,
            a.startDate?.seconds ? new Date(a.startDate.seconds * 1000).toLocaleString() : '',
            a.endDate?.seconds ? new Date(a.endDate.seconds * 1000).toLocaleString() : '',
            a.priority,
            a.participants?.map(p => p.name).join('; ') || '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-appointments-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Search-filtered appointments
    const searchedAppointments = useMemo(() => {
        if (!searchQuery) return filteredAppointments;
        const q = searchQuery.toLowerCase();
        return filteredAppointments.filter(a =>
            a.title.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q) ||
            a.participants?.some(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
        );
    }, [filteredAppointments, searchQuery]);

    // Date label
    const dateLabel = useMemo(() => {
        const options: Intl.DateTimeFormatOptions = viewMode === 'day'
            ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
            : viewMode === 'month'
                ? { month: 'long', year: 'numeric' }
                : { month: 'long', year: 'numeric' };
        return currentDate.toLocaleDateString('es-ES', options);
    }, [currentDate, viewMode]);

    // View mode icons
    const viewModes: { id: ViewMode; icon: React.ElementType; label: string }[] = [
        { id: 'day', icon: CalendarDays, label: t('appointments.viewDay', 'Día') },
        { id: 'week', icon: Columns, label: t('appointments.viewWeek', 'Semana') },
        { id: 'month', icon: CalendarRange, label: t('appointments.viewMonth', 'Mes') },
        { id: 'list', icon: List, label: t('appointments.viewList', 'Lista') },
    ];

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons className="absolute inset-x-0 top-14 h-64 z-0 pointer-events-none overflow-hidden" />

                {/* Header */}
                <header className="h-14 bg-q-bg/95 border-b border-q-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h1 className="text-lg font-bold">{t('superadmin.platformAppointments', 'Citas de Plataforma')}</h1>
                        <span className="text-xs text-q-text-muted bg-secondary px-2 py-0.5 rounded-full">{appointments.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <HeaderBackButton onClick={onBack} />
                        {/* View Mode switcher */}
                        <div className="hidden sm:flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
                            {viewModes.map(vm => {
                                const Icon = vm.icon;
                                return (
                                    <button
                                        key={vm.id}
                                        onClick={() => setViewMode(vm.id)}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === vm.id ? 'bg-primary text-primary-foreground' : 'text-q-text-muted hover:text-foreground'}`}
                                        title={vm.label}
                                    >
                                        <Icon size={16} />
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => setIsMobileSearchOpen(true)} className="p-1.5 rounded-md text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors"><Search size={18} /></button>
                        <button onClick={handleExportCSV} className="p-1.5 rounded-md text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors" title="Exportar CSV"><Download size={18} /></button>
                        <button onClick={() => refresh()} className="p-1.5 rounded-md text-q-text-muted hover:text-foreground hover:bg-secondary transition-colors" title="Actualizar"><RefreshCw size={18} /></button>
                        <button
                            onClick={() => { setEditingAppointment(null); setIsCreateModalOpen(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium"
                        >
                            <Plus size={16} /><span className="hidden sm:inline">{t('appointments.createNew', 'Nueva Cita')}</span>
                        </button>
                    </div>
                </header>

                {/* Stats Bar */}
                <div className="px-4 sm:px-6 py-3 border-b border-q-border/50 bg-q-surface/80 backdrop-blur-sm flex items-center gap-4 flex-wrap text-xs relative z-[1]">
                    <span className="text-q-text-muted">{t('appointments.total', 'Total')}: <b className="text-foreground">{analytics.totalAppointments}</b></span>
                    <span className="text-blue-500 flex items-center gap-1"><Clock size={12} />{t('appointments.upcoming', 'Próximas')}: <b>{analytics.upcomingAppointments}</b></span>
                    <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={12} />{t('appointments.completed', 'Completadas')}: <b>{analytics.completedAppointments}</b></span>
                    <span className="text-red-500 flex items-center gap-1"><XCircle size={12} />{t('appointments.cancelled', 'Canceladas')}: <b>{analytics.cancelledAppointments}</b></span>
                    <span className="text-purple-500 ml-auto flex items-center gap-1"><TrendingUp size={12} />{t('appointments.completionRate', 'Tasa')}: <b>{analytics.completionRate.toFixed(0)}%</b></span>
                </div>

                {/* Calendar Navigation */}
                <div className="px-4 sm:px-6 py-2.5 border-b border-q-border/50 flex items-center justify-between bg-q-surface/80 backdrop-blur-sm relative z-[1]">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigateDate('prev')} className="p-1.5 rounded-md hover:bg-secondary text-q-text-muted hover:text-foreground transition-colors"><ChevronLeft size={18} /></button>
                        <button onClick={() => navigateDate('today')} className="px-3 py-1 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors">{t('appointments.today', 'Hoy')}</button>
                        <button onClick={() => navigateDate('next')} className="p-1.5 rounded-md hover:bg-secondary text-q-text-muted hover:text-foreground transition-colors"><ChevronRight size={18} /></button>
                    </div>
                    <h2 className="text-sm font-bold capitalize">{dateLabel}</h2>
                    {/* Mobile view mode selector */}
                    <div className="flex sm:hidden items-center gap-0.5 bg-secondary rounded-lg p-0.5">
                        {viewModes.map(vm => {
                            const Icon = vm.icon;
                            return (
                                <button
                                    key={vm.id}
                                    onClick={() => setViewMode(vm.id)}
                                    className={`p-1 rounded-md transition-all ${viewMode === vm.id ? 'bg-primary text-primary-foreground' : 'text-q-text-muted'}`}
                                >
                                    <Icon size={14} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto relative z-10">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : appointments.length === 0 && viewMode === 'list' ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                            <Calendar className="w-16 h-16 text-q-text-muted/30 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">{t('appointments.emptyState.title', 'Sin citas de plataforma')}</h3>
                            <p className="text-sm text-q-text-muted mb-4 max-w-md">
                                {t('appointments.emptyState.adminDesc', 'Las citas agendadas desde la plataforma aparecerán aquí.')}
                            </p>
                            <button
                                onClick={() => { setEditingAppointment(null); setIsCreateModalOpen(true); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                            >
                                <Plus size={16} />{t('appointments.createNew', 'Nueva Cita')}
                            </button>
                        </div>
                    ) : viewMode === 'day' ? (
                        <CalendarDayView
                            currentDate={currentDate}
                            appointments={searchedAppointments}
                            blockedDates={[]}
                            onAppointmentClick={handleAppointmentClick}
                            onSlotClick={handleSlotClick}
                        />
                    ) : viewMode === 'week' ? (
                        <CalendarWeekView
                            currentDate={currentDate}
                            appointments={searchedAppointments}
                            blockedDates={[]}
                            onAppointmentClick={handleAppointmentClick}
                            onSlotClick={handleSlotClick}
                        />
                    ) : viewMode === 'month' ? (
                        <CalendarMonthView
                            currentDate={currentDate}
                            appointments={searchedAppointments}
                            blockedDates={[]}
                            onAppointmentClick={handleAppointmentClick}
                            onDayClick={(date: Date) => {
                                setCurrentDate(date);
                                setViewMode('day');
                            }}
                        />
                    ) : (
                        <AppointmentsListView
                            appointments={searchedAppointments}
                            onAppointmentClick={handleAppointmentClick}
                        />
                    )}
                </main>
            </div>

            {/* Modals */}
            <MobileSearchModal
                isOpen={isMobileSearchOpen}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClose={() => setIsMobileSearchOpen(false)}
                placeholder={t('appointments.searchPlaceholder', 'Buscar citas...')}
            />

            {isCreateModalOpen && (
                <CreateAppointmentModal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingAppointment(null);
                        setCreateModalInitialDate(undefined);
                        setCreateModalInitialHour(undefined);
                    }}
                    onSubmit={handleCreateAppointment}
                    initialDate={createModalInitialDate}
                    initialHour={createModalInitialHour}
                    editingAppointment={editingAppointment || undefined}
                    leads={[]}
                />
            )}

            {isDetailDrawerOpen && selectedAppointment && (
                <AppointmentDetailDrawer
                    appointment={selectedAppointment}
                    isOpen={isDetailDrawerOpen}
                    onClose={() => { setIsDetailDrawerOpen(false); setSelectedAppointment(null); }}
                    onEdit={handleEditAppointment}
                    onDelete={handleDeleteAppointment}
                    onStatusChange={handleStatusChange}
                />
            )}

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onCancel={() => { setShowDeleteConfirm(false); setPendingDeleteAppointment(null); }}
                onConfirm={confirmDeleteAppointment}
                title={t('appointments.deleteConfirm.title', 'Eliminar Cita')}
                message={t('appointments.deleteConfirm.message', '¿Estás seguro de que quieres eliminar esta cita? Esta acción no se puede deshacer.')}
                confirmText={t('common.delete', 'Eliminar')}
                isLoading={isDeleting}
                variant="danger"
            />
        </>
    );
};

export default AdminAppointmentsDashboard;
