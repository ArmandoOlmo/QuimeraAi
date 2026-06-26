/**
 * AppointmentsDashboard
 * Dashboard principal de gestión de citas
 * Las citas están sincronizadas por proyecto
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Calendar,
    Plus,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Menu,
    Columns,
    Grid,
    List,
    CalendarDays,
    CalendarRange,
    Sparkles,
    Settings,
    RefreshCw,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Download,
    Upload,
    TrendingUp,
    Users,
    X,
    Store,
    ChevronDown,
    Layers,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useCRM } from '../../../contexts/crm/CRMContext';
import { useAI } from '../../../contexts/ai/AIContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import DashboardSidebar from '../DashboardSidebar';
import ProjectSelectorPage from './ProjectSelectorPage';
import {
    Appointment,
    BlockedDate,
    AppointmentStatus,
    AppointmentFilters,
    GoogleCalendarConfig,
    APPOINTMENT_TYPE_CONFIGS,
    APPOINTMENT_STATUS_CONFIGS,
} from '../../../types';
import { supabase } from '../../../supabase';

// Import components
import { AppointmentCard } from './components/AppointmentCard';
import { CreateAppointmentModal } from './components/CreateAppointmentModal';
import { AppointmentDetailDrawer } from './components/AppointmentDetailDrawer';
import { GoogleCalendarConnect } from './components/GoogleCalendarConnect';
import { AIPreparationPanel } from './components/AIPreparationPanel';
import { CalendarToolbar } from './components/CalendarToolbar';
import { BlockDateModal } from './components/BlockDateModal';
import { AppointmentAnalyticsPanel } from './components/AppointmentAnalyticsPanel';
import { AppointmentEngineReadinessPanel } from './components/AppointmentEngineReadinessPanel';
import ConfirmationModal from '../../ui/ConfirmationModal';
import HeaderBackButton from '../../ui/HeaderBackButton';

// Import views
import { CalendarWeekView } from './views/CalendarWeekView';
import { CalendarMonthView } from './views/CalendarMonthView';
import { CalendarDayView } from './views/CalendarDayView';
import { AppointmentsListView } from './views/AppointmentsListView';

// Import hooks
import { useAppointments } from './hooks/useAppointments';
import { useBlockedDates } from './hooks/useBlockedDates';

// =============================================================================
// TYPES
// =============================================================================

type ViewMode = 'day' | 'week' | 'month' | 'list';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AppointmentsDashboard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { leads } = useCRM();
    const { hasApiKey, promptForKeySelection, handleApiError } = useAI();
    const { setView } = useUI();
    const { activeProject, activeProjectId, projects, loadProject } = useProject();

    // Project selection state
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    const [showProjectSelector, setShowProjectSelector] = useState(false);

    // Determinar qué proyecto usar
    const effectiveProjectId = selectedProjectId || activeProjectId;
    const effectiveProject = projects.find(p => p.id === effectiveProjectId) || activeProject;

    // Use appointments hook
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
    } = useAppointments();

    // Local state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    const [showGoogleCalendar, setShowGoogleCalendar] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [isGeneratingAiPrep, setIsGeneratingAiPrep] = useState(false);

    // Blocked dates state
    const {
        blockedDates,
        legacyBlockedDates,
        hasLegacyBlockedDates,
        isMigratingLegacyBlockedDates,
        createBlockedDate,
        updateBlockedDate,
        deleteBlockedDate,
        migrateLegacyBlockedDates,
    } = useBlockedDates();
    const [legacyMigrationNotice, setLegacyMigrationNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const selectedAppointmentLinkedLeads = useMemo(() => {
        if (!selectedAppointment) return [];

        const linkedLeadIds = new Set<string>([
            ...(selectedAppointment.linkedLeadIds || []),
            selectedAppointment.sourceLeadId || '',
            ...(selectedAppointment.participants || [])
                .map(participant => participant.leadId || '')
                .filter(Boolean),
        ].filter(Boolean));

        if (linkedLeadIds.size === 0) return [];

        return leads.filter(lead => linkedLeadIds.has(lead.id));
    }, [leads, selectedAppointment]);
    const appointmentsBlueprint = useMemo(() => (
        effectiveProject?.businessBlueprint?.appointmentsBlueprint
        || (effectiveProject?.data as any)?.businessBlueprint?.appointmentsBlueprint
        || null
    ), [effectiveProject]);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<BlockedDate | null>(null);
    const [blockModalInitialDate, setBlockModalInitialDate] = useState<Date | undefined>();
    const [blockModalInitialHour, setBlockModalInitialHour] = useState<number | undefined>();

    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteAppointment, setPendingDeleteAppointment] = useState<Appointment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Google Calendar state: canonical server-side sync, scoped by project
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
    const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error' | 'not_synced'>('not_synced');
    const [googleConfig, setGoogleConfig] = useState<GoogleCalendarConfig | undefined>();
    const [googleConfigured, setGoogleConfigured] = useState(true);

    const getSupabaseAccessToken = useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error(t('appointments.errors.unauthenticated'));
        return token;
    }, [t]);

    const callGoogleCalendarApi = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
        const token = await getSupabaseAccessToken();
        const response = await fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || t('appointments.google.errorSyncCalendar'));
        }
        return payload as T;
    }, [getSupabaseAccessToken, t]);

    const refreshGoogleCalendarStatus = useCallback(async () => {
        if (!effectiveProjectId || !user) {
            setIsGoogleConnected(false);
            setGoogleConfig(undefined);
            setSyncStatus('not_synced');
            setLastSyncTime(undefined);
            return;
        }

        try {
            const status = await callGoogleCalendarApi<{
                configured: boolean;
                connected: boolean;
                calendarId: string;
                calendarName?: string;
                syncEnabled: boolean;
                syncStatus?: 'synced' | 'pending' | 'error' | 'not_synced';
                lastSyncAt?: string | null;
                lastError?: string | null;
            }>(`/api/appointments/google/status?projectId=${encodeURIComponent(effectiveProjectId)}`);

            setGoogleConfigured(status.configured);
            setIsGoogleConnected(status.connected);
            setSyncStatus(status.syncStatus || (status.connected ? 'pending' : 'not_synced'));
            setGoogleError(status.lastError || null);
            setGoogleConfig({
                calendarId: status.calendarId || 'primary',
                calendarName: status.calendarName,
                syncEnabled: status.syncEnabled,
            });
            setLastSyncTime(status.lastSyncAt ? new Date(status.lastSyncAt) : undefined);
        } catch (error: any) {
            setGoogleError(error.message || t('appointments.google.errorSyncCalendar'));
            setIsGoogleConnected(false);
            setSyncStatus('error');
        }
    }, [callGoogleCalendarApi, effectiveProjectId, t, user]);

    useEffect(() => {
        refreshGoogleCalendarStatus();
    }, [refreshGoogleCalendarStatus]);

    const handleGoogleConnect = useCallback(async () => {
        if (!effectiveProjectId) {
            const message = t('appointments.errors.noProjectSelected');
            setGoogleError(message);
            throw new Error(message);
        }
        if (!googleConfigured) {
            const message = t('appointments.google.notConfigured');
            setGoogleError(message);
            throw new Error(message);
        }

        setIsGoogleLoading(true);
        setGoogleError(null);

        try {
            const result = await callGoogleCalendarApi<{ authorizationUrl: string }>('/api/appointments/google/oauth/start', {
                method: 'POST',
                body: JSON.stringify({
                    projectId: effectiveProjectId,
                    calendarId: googleConfig?.calendarId || 'primary',
                    returnUrl: window.location.href,
                }),
            });
            window.location.href = result.authorizationUrl;
        } catch (error: any) {
            const message = error.message || t('appointments.google.errorConnect');
            setGoogleError(message);
            setIsGoogleConnected(false);
            throw new Error(message);
        } finally {
            setIsGoogleLoading(false);
        }
    }, [callGoogleCalendarApi, effectiveProjectId, googleConfig?.calendarId, googleConfigured, t]);

    const handleGoogleDisconnect = useCallback(async () => {
        if (!effectiveProjectId) return;

        setIsGoogleLoading(true);
        setGoogleError(null);
        try {
            await callGoogleCalendarApi('/api/appointments/google/status', {
                method: 'DELETE',
                body: JSON.stringify({
                    projectId: effectiveProjectId,
                    calendarId: googleConfig?.calendarId || 'primary',
                }),
            });
            setIsGoogleConnected(false);
            setGoogleConfig(undefined);
            setSyncStatus('not_synced');
            setLastSyncTime(undefined);
        } catch (error: any) {
            const message = error.message || t('appointments.google.errorDisconnect');
            setGoogleError(message);
            throw new Error(message);
        } finally {
            setIsGoogleLoading(false);
        }
    }, [callGoogleCalendarApi, effectiveProjectId, googleConfig?.calendarId, t]);

    const runGoogleCalendarSync = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!effectiveProjectId) {
            setGoogleError(t('appointments.errors.noProjectSelected'));
            return;
        }
        if (!isGoogleConnected) {
            if (!options.silent) setGoogleError(t('appointments.google.connectFirst'));
            return;
        }

        if (!options.silent) setIsGoogleLoading(true);
        setGoogleError(null);
        setSyncStatus('pending');

        try {
            const result = await callGoogleCalendarApi<{
                summary?: { errors?: string[] };
            }>('/api/appointments/google/sync', {
                method: 'POST',
                body: JSON.stringify({
                    projectId: effectiveProjectId,
                    calendarId: googleConfig?.calendarId || 'primary',
                }),
            });

            await refresh();
            await refreshGoogleCalendarStatus();

            const errors = result.summary?.errors || [];
            if (errors.length) {
                setSyncStatus('error');
                setGoogleError(t('appointments.google.syncCompleteWithErrors', { count: errors.length }));
            } else {
                setSyncStatus('synced');
                setLastSyncTime(new Date());
            }
        } catch (error: any) {
            setGoogleError(error.message || t('appointments.google.errorSyncCalendar'));
            setSyncStatus('error');
            if (!options.silent) throw error;
        } finally {
            if (!options.silent) setIsGoogleLoading(false);
        }
    }, [callGoogleCalendarApi, effectiveProjectId, googleConfig?.calendarId, isGoogleConnected, refresh, refreshGoogleCalendarStatus, t]);

    const handleGoogleSync = useCallback(async () => {
        await runGoogleCalendarSync();
    }, [runGoogleCalendarSync]);

    // Handler for project selection
    const handleProjectSelect = (projectId: string) => {
        setSelectedProjectId(projectId);
        setShowProjectSelector(false);
        // Load the project but DO NOT switch view to editor
        loadProject(projectId, false, false);
    };

    // Handlers
    const navigateDate = useCallback((direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }

        const newDate = new Date(currentDate);
        const delta = direction === 'next' ? 1 : -1;

        switch (viewMode) {
            case 'day':
                newDate.setDate(newDate.getDate() + delta);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + (delta * 7));
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + delta);
                break;
        }

        setCurrentDate(newDate);
    }, [currentDate, viewMode]);

    const handleAppointmentClick = useCallback((appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsDetailDrawerOpen(true);
    }, [setSelectedAppointment]);

    const handleSlotClick = useCallback((date: Date, hour: number) => {
        setCreateModalInitialDate(date);
        setCreateModalInitialHour(hour);
        setIsCreateModalOpen(true);
    }, []);

    const handleMigrateLegacyBlockedDates = useCallback(async () => {
        setLegacyMigrationNotice(null);
        try {
            const result = await migrateLegacyBlockedDates();
            setLegacyMigrationNotice({
                type: 'success',
                text: t('appointments.blockedDates.migrationSuccess', {
                    count: result.migrated,
                    skipped: result.skipped,
                }),
            });
        } catch (err) {
            console.error('[AppointmentsDashboard] Error migrating legacy blockedDates:', err);
            setLegacyMigrationNotice({
                type: 'error',
                text: t('appointments.blockedDates.migrationError'),
            });
        }
    }, [migrateLegacyBlockedDates, t]);

    const handleCreateAppointment = useCallback(async (data: Partial<Appointment>) => {
        let createdAppointment: Appointment | null = null;

        if (editingAppointment) {
            // Update existing appointment
            await updateAppointment(editingAppointment.id, data);
            createdAppointment = { ...editingAppointment, ...data } as Appointment;
        } else {
            // Create new appointment - returns the full Appointment object with id
            createdAppointment = await createAppointment(data);
        }

        // Auto-sync to Google Calendar if connected
        if (isGoogleConnected && createdAppointment) {
            try {
                await runGoogleCalendarSync({ silent: true });
            } catch (syncError) {
                console.error('[AppointmentsDashboard] Error auto-syncing Google Calendar:', syncError);
            }
        }

        setIsCreateModalOpen(false);
        setCreateModalInitialDate(undefined);
        setCreateModalInitialHour(undefined);
        setEditingAppointment(null);
    }, [createAppointment, updateAppointment, editingAppointment, isGoogleConnected, runGoogleCalendarSync]);

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

    const handleGenerateAiPrep = useCallback(async () => {
        if (!selectedAppointment) return;
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }
        setIsGeneratingAiPrep(true);
        // The actual generation will be handled by the AIPreparationPanel component
        // This just triggers the state for the drawer to know we're generating
    }, [selectedAppointment, hasApiKey, promptForKeySelection]);

    const handleAddNote = useCallback(async (content: string) => {
        if (!selectedAppointment) return;

        const newNote = {
            id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content,
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            createdBy: user?.id || '',
            aiGenerated: false,
            isPrivate: false,
        };

        const currentNotes = selectedAppointment.notes || [];
        await updateAppointment(selectedAppointment.id, {
            notes: [...currentNotes, newNote]
        });

        // Note: Don't update local state manually - Supabase onSnapshot will handle it
    }, [selectedAppointment, updateAppointment, user]);

    const handleUpdateAiInsights = useCallback(async (insights: any) => {
        if (!selectedAppointment) return;

        await updateAppointment(selectedAppointment.id, {
            aiInsights: insights
        });

        setIsGeneratingAiPrep(false);
        // Note: Don't update local state manually - Supabase onSnapshot will handle it
    }, [selectedAppointment, updateAppointment]);

    // Search filter
    const displayedAppointments = useMemo(() => {
        if (!searchQuery) return filteredAppointments;

        const query = searchQuery.toLowerCase();
        return filteredAppointments.filter(apt =>
            apt.title.toLowerCase().includes(query) ||
            apt.description?.toLowerCase().includes(query) ||
            apt.participants.some(p => p.name.toLowerCase().includes(query))
        );
    }, [filteredAppointments, searchQuery]);

    // Get date label for header
    const getDateLabel = () => {
        switch (viewMode) {
            case 'day':
                return currentDate.toLocaleDateString(i18n.language, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                });
            case 'week':
                const weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                if (weekStart.getMonth() === weekEnd.getMonth()) {
                    return `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekStart.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}`;
                }
                return `${weekStart.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}`;
            case 'month':
                return currentDate.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
            default:
                return t('appointments.allAppointments');
        }
    };

    // Mostrar página de selección de proyecto si no hay proyecto o si el usuario quiere ver todos
    if (showProjectSelector || !effectiveProjectId || projects.filter(p => p.status !== 'Template').length === 0) {
        return (
            <ProjectSelectorPage
                onProjectSelect={handleProjectSelect}
                onBack={showProjectSelector ? () => setShowProjectSelector(false) : () => setView('dashboard')}
            />
        );
    }

    return (
        <div className="flex h-screen bg-q-bg text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
 <header className="quimera-dashboard-header-bar h-12 px-3 sm:px-5 flex items-center justify-between z-20 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-lg transition-colors touch-manipulation"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <Calendar className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <div>
                                <h1 className="text-base font-bold text-foreground">{t('appointments.title')}</h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Quick Stats */}
                        <div className="hidden lg:flex items-center gap-5 mr-3 pr-3 border-r border-q-border">
                            <div className="text-right">
                                <p className="text-[10px] text-q-text-muted uppercase font-semibold tracking-wider">
                                    {t('appointments.completedLabel')}
                                </p>
                                <p className="text-base font-bold leading-tight text-q-success">{analytics.completedAppointments}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-q-text-muted uppercase font-semibold tracking-wider">
                                    {t('appointments.successRate')}
                                </p>
                                <p className="text-base font-bold leading-tight text-foreground">{analytics.completionRate.toFixed(0)}%</p>
                            </div>
                        </div>

                        {/* Google Calendar */}
                        <button
                            onClick={() => setShowGoogleCalendar(!showGoogleCalendar)}
                            className={`
                                hidden md:flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-colors
                                ${isGoogleConnected
                                    ? 'bg-q-success/10 text-q-success hover:bg-q-success/20'
                                    : 'bg-secondary text-q-text-muted hover:text-foreground hover:bg-secondary/80'
                                }
                            `}
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="hidden lg:inline">
                                {isGoogleConnected ? t('appointments.google.syncButton') : t('appointments.google.googleButton')}
                            </span>
                        </button>
                        <HeaderBackButton onClick={() => setView('dashboard')} />
                    </div>
                </header>

                {/* Toolbar */}
                <CalendarToolbar
                    currentDate={currentDate}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onNavigate={navigateDate}
                    dateLabel={getDateLabel()}
                    onSearch={setSearchQuery}
                    searchQuery={searchQuery}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    showFilters={showFilters}
                    onRefresh={refresh}
                    isLoading={isLoading}
                    onCreateClick={() => {
                        setCreateModalInitialDate(undefined);
                        setCreateModalInitialHour(undefined);
                        setIsCreateModalOpen(true);
                    }}
                    onBlockClick={() => {
                        setEditingBlock(null);
                        setBlockModalInitialDate(undefined);
                        setBlockModalInitialHour(undefined);
                        setIsBlockModalOpen(true);
                    }}
                />

                <AppointmentAnalyticsPanel analytics={analytics} />
                <AppointmentEngineReadinessPanel
                    analytics={analytics}
                    appointmentsBlueprint={appointmentsBlueprint}
                    googleConfigured={googleConfigured}
                    googleConnected={isGoogleConnected}
                    hasLegacyBlockedDates={hasLegacyBlockedDates}
                    legacyBlockedDateCount={legacyBlockedDates.length}
                />

                {/* Filters Panel */}
                {showFilters && (
                    <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-q-border bg-secondary/20 animate-slide-down overflow-x-auto">
                        <div className="flex flex-wrap gap-4">
                            {/* Status filters */}
                            <div>
                                <label className="text-xs font-semibold text-q-text-muted uppercase tracking-wider mb-2 block">
                                    {t('appointments.statusFilter')}
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(APPOINTMENT_STATUS_CONFIGS).map(([key, config]) => {
                                        const isActive = filters.statuses?.includes(key as AppointmentStatus);
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    const current = filters.statuses || [];
                                                    setFilters({
                                                        ...filters,
                                                        statuses: isActive
                                                            ? current.filter(s => s !== key)
                                                            : [...current, key as AppointmentStatus]
                                                    });
                                                }}
                                                className={`
                                                    px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                                                    ${isActive
                                                        ? `${config.bgColor} ${config.color}`
                                                        : 'bg-secondary/50 text-q-text-muted hover:text-foreground'
                                                    }
                                                `}
                                            >
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Type filters */}
                            <div>
                                <label className="text-xs font-semibold text-q-text-muted uppercase tracking-wider mb-2 block">
                                    {t('appointments.typeFilter')}
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(APPOINTMENT_TYPE_CONFIGS).map(([key, config]) => {
                                        const isActive = filters.types?.includes(key as any);
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    const current = filters.types || [];
                                                    setFilters({
                                                        ...filters,
                                                        types: isActive
                                                            ? current.filter(t => t !== key)
                                                            : [...current, key as any]
                                                    });
                                                }}
                                                className={`
                                                    px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                                                    ${isActive
                                                        ? 'bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text'
                                                        : 'bg-secondary/50 text-q-text-muted hover:text-foreground'
                                                    }
                                                `}
                                            >
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Clear filters */}
                            <div className="flex items-end">
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-q-text-muted hover:text-foreground hover:underline"
                                >
                                    {t('appointments.clearFilters')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {hasLegacyBlockedDates && (
                    <div className="px-3 sm:px-6 py-3 border-b border-q-border bg-q-warning/10">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3 min-w-0">
                                <AlertCircle className="w-5 h-5 text-q-warning shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">
                                        {t('appointments.blockedDates.migrationTitle')}
                                    </p>
                                    <p className="text-xs text-q-text-muted">
                                        {t('appointments.blockedDates.migrationDesc', { count: legacyBlockedDates.length })}
                                    </p>
                                    {legacyMigrationNotice && (
                                        <p className={`mt-1 text-xs ${legacyMigrationNotice.type === 'error' ? 'text-q-error' : 'text-q-success'}`}>
                                            {legacyMigrationNotice.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleMigrateLegacyBlockedDates}
                                disabled={isMigratingLegacyBlockedDates}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-q-warning px-3 text-xs font-semibold text-q-bg transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isMigratingLegacyBlockedDates ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                {isMigratingLegacyBlockedDates
                                    ? t('appointments.blockedDates.migratingLegacy')
                                    : t('appointments.blockedDates.migrateLegacy')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 flex min-h-0">
                    {/* Calendar/List View */}
                    <div className="flex-1 flex flex-col min-h-0">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                    <Loader2 className="w-10 h-10 quimera-status-card-accent-text animate-spin mx-auto mb-4" />
                                    <p className="text-sm text-q-text-muted">{t('appointments.loadingAppointments')}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'week' && (
                                    <CalendarWeekView
                                        appointments={displayedAppointments}
                                        currentDate={currentDate}
                                        onAppointmentClick={handleAppointmentClick}
                                        onSlotClick={handleSlotClick}
                                        blockedDates={blockedDates}
                                        onBlockClick={(bd) => {
                                            setEditingBlock(bd);
                                            setIsBlockModalOpen(true);
                                        }}
                                    />
                                )}

                                {viewMode === 'month' && (
                                    <CalendarMonthView
                                        appointments={displayedAppointments}
                                        currentDate={currentDate}
                                        onAppointmentClick={handleAppointmentClick}
                                        onDayClick={(date) => {
                                            setCurrentDate(date);
                                            setViewMode('day');
                                        }}
                                        blockedDates={blockedDates}
                                    />
                                )}

                                {viewMode === 'day' && (
                                    <CalendarDayView
                                        appointments={displayedAppointments}
                                        currentDate={currentDate}
                                        onAppointmentClick={handleAppointmentClick}
                                        onSlotClick={handleSlotClick}
                                        blockedDates={blockedDates}
                                        onBlockClick={(bd) => {
                                            setEditingBlock(bd);
                                            setIsBlockModalOpen(true);
                                        }}
                                    />
                                )}

                                {viewMode === 'list' && (
                                    <AppointmentsListView
                                        appointments={displayedAppointments}
                                        onAppointmentClick={handleAppointmentClick}
                                        onAppointmentEdit={(apt) => {
                                            setSelectedAppointment(apt);
                                            setIsDetailDrawerOpen(true);
                                        }}
                                        onAppointmentDelete={async (apt) => {
                                            setPendingDeleteAppointment(apt);
                                            setShowDeleteConfirm(true);
                                        }}
                                        searchQuery={searchQuery}
                                    />
                                )}
                            </>
                        )}
                    </div>

                    {/* Google Calendar Sidebar */}
                    {showGoogleCalendar && (
                        <div className="w-80 border-l border-q-border p-4 overflow-y-auto bg-q-bg animate-slide-in-right hidden lg:block">
                            <GoogleCalendarConnect
                                isConnected={isGoogleConnected}
                                config={googleConfig}
                                onConnect={handleGoogleConnect}
                                onDisconnect={handleGoogleDisconnect}
                                onSync={handleGoogleSync}
                                syncStatus={syncStatus}
                                lastSyncTime={lastSyncTime}
                            />
                        </div>
                    )}
                </main>
            </div>

            {/* Create/Edit Modal */}
            <CreateAppointmentModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setCreateModalInitialDate(undefined);
                    setCreateModalInitialHour(undefined);
                    setEditingAppointment(null);
                }}
                onSubmit={handleCreateAppointment}
                leads={leads}
                initialDate={createModalInitialDate}
                initialHour={createModalInitialHour}
                editingAppointment={editingAppointment}
            />

            {/* Detail Drawer */}
            <AppointmentDetailDrawer
                appointment={selectedAppointment}
                isOpen={isDetailDrawerOpen}
                onClose={() => {
                    setIsDetailDrawerOpen(false);
                    setSelectedAppointment(null);
                }}
                onEdit={handleEditAppointment}
                onDelete={handleDeleteAppointment}
                onStatusChange={handleStatusChange}
                onGenerateAiPrep={handleGenerateAiPrep}
                onAddNote={handleAddNote}
                onUpdateAiInsights={handleUpdateAiInsights}
                isGeneratingAi={isGeneratingAiPrep}
                linkedLeads={selectedAppointmentLinkedLeads}
            />

            {/* Block Date Modal */}
            <BlockDateModal
                isOpen={isBlockModalOpen}
                onClose={() => {
                    setIsBlockModalOpen(false);
                    setEditingBlock(null);
                    setBlockModalInitialDate(undefined);
                    setBlockModalInitialHour(undefined);
                }}
                onSave={async (data) => {
                    if (editingBlock) {
                        await updateBlockedDate(editingBlock.id, data);
                    } else {
                        await createBlockedDate(data);
                    }
                }}
                onDelete={deleteBlockedDate}
                editingBlock={editingBlock}
                initialDate={blockModalInitialDate}
                initialHour={blockModalInitialHour}
            />

            {/* Delete Appointment Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onConfirm={confirmDeleteAppointment}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setPendingDeleteAppointment(null);
                }}
                title={t('appointments.deleteConfirmTitle', '¿Eliminar cita?')}
                message={t('appointments.deleteConfirmMessage', '¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.')}
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};

export default AppointmentsDashboard;
