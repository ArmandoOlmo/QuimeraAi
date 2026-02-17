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
    APPOINTMENT_TYPE_CONFIGS,
    APPOINTMENT_STATUS_CONFIGS,
} from '../../../types';

// Import components
import { AppointmentCard } from './components/AppointmentCard';
import { CreateAppointmentModal } from './components/CreateAppointmentModal';
import { AppointmentDetailDrawer } from './components/AppointmentDetailDrawer';
import { GoogleCalendarConnect } from './components/GoogleCalendarConnect';
import { AIPreparationPanel } from './components/AIPreparationPanel';
import { CalendarToolbar } from './components/CalendarToolbar';
import { BlockDateModal } from './components/BlockDateModal';

// Import views
import { CalendarWeekView } from './views/CalendarWeekView';
import { CalendarMonthView } from './views/CalendarMonthView';
import { CalendarDayView } from './views/CalendarDayView';
import { AppointmentsListView } from './views/AppointmentsListView';

// Import hooks
import { useAppointments } from './hooks/useAppointments';
import { useBlockedDates } from './hooks/useBlockedDates';

// Import Google Calendar service
import {
    loadGoogleApiScripts,
    initializeGapiClient,
    initializeTokenClient,
    requestAuthorization,
    revokeAccess,
    isAuthenticated,
    getSavedConnectionState,
    syncAppointmentToGoogle,
    getCalendarEvents,
} from '../../../utils/googleCalendarService';

// =============================================================================
// TYPES
// =============================================================================

type ViewMode = 'day' | 'week' | 'month' | 'list';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AppointmentsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { leads } = useCRM();
    const { hasApiKey, promptForKeySelection, handleApiError } = useAI();
    const { setView } = useUI();
    const { activeProject, activeProjectId, projects, loadProject } = useProject();

    // Project selection state
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
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
    const [viewMode, setViewMode] = useState<ViewMode>('week');
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
        createBlockedDate,
        updateBlockedDate,
        deleteBlockedDate,
    } = useBlockedDates();
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<BlockedDate | null>(null);
    const [blockModalInitialDate, setBlockModalInitialDate] = useState<Date | undefined>();
    const [blockModalInitialHour, setBlockModalInitialHour] = useState<number | undefined>();

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
                console.log('🔄 Auto-syncing to Google Calendar...');

                const syncResult = await syncAppointmentToGoogle(createdAppointment, 'primary', true);

                if (syncResult.syncStatus === 'synced') {
                    await updateAppointment(createdAppointment.id, { googleSync: syncResult });
                    console.log('✅ Auto-synced to Google Calendar!');
                } else {
                    console.warn('⚠️ Sync completed with status:', syncResult.syncStatus);
                }
            } catch (syncError) {
                console.error('⚠️ Error auto-syncing to Google:', syncError);
                // Don't fail the creation, just log the sync error
            }
        }

        setIsCreateModalOpen(false);
        setCreateModalInitialDate(undefined);
        setCreateModalInitialHour(undefined);
        setEditingAppointment(null);
    }, [createAppointment, updateAppointment, editingAppointment, isGoogleConnected]);

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
        if (selectedAppointment && confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
            await deleteAppointment(selectedAppointment.id);
            setIsDetailDrawerOpen(false);
            setSelectedAppointment(null);
        }
    }, [selectedAppointment, deleteAppointment, setSelectedAppointment]);

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
            createdBy: user?.uid || '',
            aiGenerated: false,
            isPrivate: false,
        };

        const currentNotes = selectedAppointment.notes || [];
        await updateAppointment(selectedAppointment.id, {
            notes: [...currentNotes, newNote]
        });

        // Note: Don't update local state manually - Firebase onSnapshot will handle it
    }, [selectedAppointment, updateAppointment, user]);

    const handleUpdateAiInsights = useCallback(async (insights: any) => {
        if (!selectedAppointment) return;

        await updateAppointment(selectedAppointment.id, {
            aiInsights: insights
        });

        setIsGeneratingAiPrep(false);
        // Note: Don't update local state manually - Firebase onSnapshot will handle it
    }, [selectedAppointment, updateAppointment]);

    // Google Calendar state
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);

    // Check if Google Client ID is configured
    const hasGoogleCredentials = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Initialize Google API on mount
    useEffect(() => {
        if (!hasGoogleCredentials) return;

        const initGoogle = async () => {
            try {
                console.log('🔄 Initializing Google Calendar API...');
                await loadGoogleApiScripts();
                await initializeGapiClient();
                initializeTokenClient(
                    (token) => {
                        console.log('✅ Token received via callback');
                        setIsGoogleConnected(true);
                        setGoogleError(null);
                    },
                    (error) => {
                        console.error('❌ Token error:', error.message);
                        setGoogleError(error.message);
                        setIsGoogleConnected(false);
                    }
                );

                // Check if already authenticated or was previously connected
                const wasConnected = getSavedConnectionState();
                if (isAuthenticated() || wasConnected) {
                    console.log('📌 Restoring previous connection state');
                    setIsGoogleConnected(true);
                }

                console.log('✅ Google Calendar API initialized');
            } catch (error: any) {
                console.error('❌ Error initializing Google API:', error);
                setGoogleError('Error al inicializar Google API');
            }
        };

        initGoogle();
    }, [hasGoogleCredentials]);

    // Google Calendar handlers
    const handleGoogleConnect = useCallback(async () => {
        if (!hasGoogleCredentials) {
            setGoogleError('Google Calendar no está configurado. Agrega VITE_GOOGLE_CLIENT_ID a tu archivo .env.local');
            return;
        }

        setIsGoogleLoading(true);
        setGoogleError(null);

        try {
            console.log('🔗 Connecting to Google Calendar...');
            const token = await requestAuthorization();
            console.log('✅ Connected! Token received:', token ? 'Yes' : 'No');
            setIsGoogleConnected(true);
            setGoogleError(null);
        } catch (error: any) {
            console.error('❌ Error connecting to Google:', error);
            // Check for popup blocked
            if (error.message?.includes('popup')) {
                setGoogleError('Por favor, permite las ventanas emergentes para conectar con Google Calendar');
            } else {
                setGoogleError(error.message || 'Error al conectar con Google Calendar');
            }
            setIsGoogleConnected(false);
        } finally {
            setIsGoogleLoading(false);
        }
    }, [hasGoogleCredentials]);

    const handleGoogleDisconnect = useCallback(async () => {
        setIsGoogleLoading(true);
        try {
            revokeAccess();
            setIsGoogleConnected(false);
            setGoogleError(null);
        } catch (error: any) {
            setGoogleError(error.message);
        } finally {
            setIsGoogleLoading(false);
        }
    }, []);

    const handleGoogleSync = useCallback(async () => {
        if (!isGoogleConnected) {
            setGoogleError('Primero conecta con Google Calendar');
            return;
        }

        setIsGoogleLoading(true);
        setGoogleError(null);

        try {
            console.log('🔄 Syncing appointments to Google Calendar...');

            // Sync each appointment to Google Calendar
            let syncedCount = 0;
            let errorCount = 0;

            for (const appointment of appointments) {
                try {
                    console.log(`📅 Syncing: ${appointment.title}`);
                    const syncResult = await syncAppointmentToGoogle(appointment, 'primary', true);

                    if (syncResult.syncStatus === 'synced') {
                        // Update the appointment with Google sync info
                        await updateAppointment(appointment.id, {
                            googleSync: syncResult,
                        });
                        syncedCount++;
                        console.log(`✅ Synced: ${appointment.title}`);
                    } else {
                        errorCount++;
                        console.error(`❌ Error syncing: ${appointment.title}`, syncResult.errorMessage);
                    }
                } catch (err) {
                    errorCount++;
                    console.error(`❌ Error syncing appointment ${appointment.title}:`, err);
                }
            }

            await refresh();

            if (errorCount > 0) {
                setGoogleError(`Sincronización completada con ${errorCount} errores`);
            } else {
                console.log(`✅ All ${syncedCount} appointments synced successfully!`);
            }
        } catch (error: any) {
            console.error('❌ Sync error:', error);
            setGoogleError(error.message || 'Error al sincronizar con Google Calendar');
        } finally {
            setIsGoogleLoading(false);
        }
    }, [isGoogleConnected, appointments, updateAppointment, refresh]);

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
                return currentDate.toLocaleDateString('es-ES', {
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
                    return `${weekStart.getDate()} - ${weekEnd.getDate()} de ${weekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
                }
                return `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            case 'month':
                return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            default:
                return 'Todas las citas';
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
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <header className="h-14 sm:h-16 px-3 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-xl transition-colors touch-manipulation"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl">
                                <Calendar className="text-primary w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-bold text-foreground">Citas</h1>
                                {/* Project Selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Store size={12} />
                                        <span className="max-w-[150px] truncate">
                                            {effectiveProject?.name || 'Seleccionar proyecto'}
                                        </span>
                                        <ChevronDown size={12} className={`transition-transform ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown */}
                                    {isProjectSelectorOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setIsProjectSelectorOpen(false)}
                                            />
                                            <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 py-2 max-h-80 overflow-auto">
                                                {/* Header */}
                                                <div className="px-4 py-2 border-b border-border/50 mb-2">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        Cambio rápido
                                                    </p>
                                                </div>

                                                {/* Recent Projects */}
                                                {projects.filter(p => p.status !== 'Template').slice(0, 5).map((project) => (
                                                    <button
                                                        key={project.id}
                                                        onClick={() => {
                                                            handleProjectSelect(project.id);
                                                            setIsProjectSelectorOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors ${project.id === effectiveProjectId ? 'bg-primary/10' : ''
                                                            }`}
                                                    >
                                                        <div className="w-8 h-6 rounded overflow-hidden bg-muted flex-shrink-0">
                                                            {project.thumbnailUrl ? (
                                                                <img
                                                                    src={project.thumbnailUrl}
                                                                    alt={project.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Layers size={12} className="text-muted-foreground/50" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="flex-1 text-sm text-left truncate">
                                                            {project.name}
                                                        </span>
                                                        {project.id === effectiveProjectId && (
                                                            <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                                                        )}
                                                    </button>
                                                ))}

                                                {/* Ver todos */}
                                                <div className="border-t border-border/50 mt-2 pt-2">
                                                    <button
                                                        onClick={() => {
                                                            setIsProjectSelectorOpen(false);
                                                            setShowProjectSelector(true);
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-primary/10 transition-colors"
                                                    >
                                                        <Grid size={14} />
                                                        Ver todos los proyectos
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Quick Stats */}
                        <div className="hidden lg:flex items-center gap-6 mr-4 pr-4 border-r border-border">
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                                    Completadas
                                </p>
                                <p className="text-lg font-bold text-green-500">{analytics.completedAppointments}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                                    Tasa éxito
                                </p>
                                <p className="text-lg font-bold text-foreground">{analytics.completionRate.toFixed(0)}%</p>
                            </div>
                        </div>

                        {/* Google Calendar */}
                        <button
                            onClick={() => setShowGoogleCalendar(!showGoogleCalendar)}
                            className={`
                                hidden md:flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-medium transition-colors
                                ${isGoogleConnected
                                    ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                                }
                            `}
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="hidden lg:inline">
                                {isGoogleConnected ? 'Sincronizado' : 'Google'}
                            </span>
                        </button>
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

                {/* Filters Panel */}
                {showFilters && (
                    <div className="px-6 py-4 border-b border-border bg-secondary/20 animate-slide-down">
                        <div className="flex flex-wrap gap-4">
                            {/* Status filters */}
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                    Estado
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
                                                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
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
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                    Tipo
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
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
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
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                >
                                    Limpiar filtros
                                </button>
                            </div>
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
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                                    <p className="text-sm text-muted-foreground">Cargando citas...</p>
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
                                            if (confirm('¿Eliminar esta cita?')) {
                                                await deleteAppointment(apt.id);
                                            }
                                        }}
                                        searchQuery={searchQuery}
                                    />
                                )}
                            </>
                        )}
                    </div>

                    {/* Google Calendar Sidebar */}
                    {showGoogleCalendar && (
                        <div className="w-80 border-l border-border p-4 overflow-y-auto bg-background animate-slide-in-right hidden lg:block">
                            <GoogleCalendarConnect
                                isConnected={isGoogleConnected}
                                onConnect={handleGoogleConnect}
                                onDisconnect={handleGoogleDisconnect}
                                onSync={handleGoogleSync}
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
        </div>
    );
};

export default AppointmentsDashboard;


