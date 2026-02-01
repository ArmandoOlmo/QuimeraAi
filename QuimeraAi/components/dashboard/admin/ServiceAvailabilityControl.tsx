/**
 * ServiceAvailabilityControl
 * Panel de control para gestionar la disponibilidad global de servicios
 * Solo accesible por Owner y Super Admin
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Save, RefreshCw, Clock, AlertTriangle,
    FileText, Users, ShoppingCart, Bot, Mail, Sparkles,
    BarChart3, Calendar, Globe, LayoutTemplate, Wallet,
    Check, X, History, Filter, Menu
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import { useServiceAvailability } from '../../../hooks/useServiceAvailability';
import {
    ServiceStatus,
    PlatformServiceId,
    PLATFORM_SERVICES,
    ServiceMetadata,
    getStatusColor,
    ServiceAuditEntry,
} from '../../../types/serviceAvailability';

// =============================================================================
// TYPES
// =============================================================================

interface ServiceAvailabilityControlProps {
    onBack: () => void;
}

type TabType = 'services' | 'audit';

// =============================================================================
// ICON MAPPING
// =============================================================================

const iconMap: Record<string, React.ReactNode> = {
    FileText: <FileText size={20} />,
    Users: <Users size={20} />,
    ShoppingCart: <ShoppingCart size={20} />,
    Bot: <Bot size={20} />,
    Mail: <Mail size={20} />,
    Sparkles: <Sparkles size={20} />,
    BarChart3: <BarChart3 size={20} />,
    Calendar: <Calendar size={20} />,
    Globe: <Globe size={20} />,
    LayoutTemplate: <LayoutTemplate size={20} />,
    Wallet: <Wallet size={20} />,
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// Status Badge
const StatusBadge: React.FC<{ status: ServiceStatus }> = ({ status }) => {
    const { t } = useTranslation();
    const color = getStatusColor(status);

    const labels: Record<ServiceStatus, string> = {
        public: t('serviceAvailability.statusPublic', 'Público'),
        not_public: t('serviceAvailability.statusNotPublic', 'No Público'),
        development: t('serviceAvailability.statusDevelopment', 'Desarrollo'),
    };

    return (
        <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${color}20`, color }}
        >
            {labels[status]}
        </span>
    );
};

// Status Selector
const StatusSelector: React.FC<{
    currentStatus: ServiceStatus;
    onSelect: (status: ServiceStatus, reason?: string) => void;
    isUpdating: boolean;
}> = ({ currentStatus, onSelect, isUpdating }) => {
    const { t } = useTranslation();
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<ServiceStatus | null>(null);
    const [reason, setReason] = useState('');

    const statuses: { value: ServiceStatus; label: string; color: string }[] = [
        { value: 'public', label: t('serviceAvailability.statusPublic', 'Público'), color: '#10b981' },
        { value: 'not_public', label: t('serviceAvailability.statusNotPublic', 'No Público'), color: '#ef4444' },
        { value: 'development', label: t('serviceAvailability.statusDevelopment', 'Desarrollo'), color: '#f59e0b' },
    ];

    const handleStatusClick = (status: ServiceStatus) => {
        if (status === currentStatus || isUpdating) return;

        // Show reason modal for non-public statuses
        if (status !== 'public') {
            setPendingStatus(status);
            setShowReasonModal(true);
        } else {
            onSelect(status);
        }
    };

    const handleConfirm = () => {
        if (pendingStatus) {
            onSelect(pendingStatus, reason || undefined);
            setShowReasonModal(false);
            setPendingStatus(null);
            setReason('');
        }
    };

    return (
        <>
            <div className="flex gap-1.5">
                {statuses.map(s => (
                    <button
                        key={s.value}
                        onClick={() => handleStatusClick(s.value)}
                        disabled={isUpdating}
                        className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                            ${currentStatus === s.value
                                ? 'ring-2 ring-offset-2 ring-offset-editor-panel-bg'
                                : 'opacity-50 hover:opacity-100'
                            }
                            ${isUpdating ? 'cursor-not-allowed' : 'cursor-pointer'}
                        `}
                        style={{
                            backgroundColor: `${s.color}20`,
                            color: s.color,
                            ...(currentStatus === s.value && { boxShadow: `0 0 0 2px var(--editor-panel-bg), 0 0 0 4px ${s.color}` }),
                        }}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Reason Modal */}
            {showReasonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-editor-text-primary">
                                    {t('serviceAvailability.confirmChange', 'Confirmar Cambio')}
                                </h3>
                                <p className="text-sm text-editor-text-secondary">
                                    {pendingStatus === 'not_public'
                                        ? t('serviceAvailability.warningNotPublic', 'Este servicio será completamente oculto')
                                        : t('serviceAvailability.warningDevelopment', 'Solo Super Admin podrá acceder')}
                                </p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-editor-text-secondary mb-2">
                                {t('serviceAvailability.reasonOptional', 'Razón (opcional)')}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={t('serviceAvailability.reasonPlaceholder', 'Ej: Mantenimiento programado...')}
                                className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-sm resize-none focus:outline-none focus:border-editor-accent"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowReasonModal(false);
                                    setPendingStatus(null);
                                    setReason('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-4 py-2 text-sm font-medium bg-editor-accent text-white rounded-lg hover:bg-editor-accent/90 transition-colors"
                            >
                                {t('common.confirm', 'Confirmar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Service Card
const ServiceCard: React.FC<{
    service: ServiceMetadata;
    status: ServiceStatus;
    statusReason?: string;
    onStatusChange: (status: ServiceStatus, reason?: string) => void;
    isUpdating: boolean;
}> = ({ service, status, statusReason, onStatusChange, isUpdating }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 hover:border-editor-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${getStatusColor(status)}15`, color: getStatusColor(status) }}
                    >
                        {iconMap[service.icon] || <FileText size={20} />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-editor-text-primary">
                            {t(service.nameKey, service.id)}
                        </h3>
                        <p className="text-sm text-editor-text-secondary mt-0.5">
                            {t(service.descriptionKey, '')}
                        </p>
                        {statusReason && (
                            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                                <AlertTriangle size={12} />
                                {statusReason}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-editor-border">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-editor-text-secondary">
                        {t('serviceAvailability.status', 'Estado')}:
                    </span>
                    <StatusSelector
                        currentStatus={status}
                        onSelect={onStatusChange}
                        isUpdating={isUpdating}
                    />
                </div>
            </div>
        </div>
    );
};

// Audit Log Entry
const AuditLogEntry: React.FC<{ entry: ServiceAuditEntry }> = ({ entry }) => {
    const { t } = useTranslation();
    const service = PLATFORM_SERVICES.find(s => s.id === entry.serviceId);
    const date = new Date(entry.timestamp.seconds * 1000);

    return (
        <div className="flex items-start gap-4 py-3 border-b border-editor-border last:border-0">
            <div className="w-8 h-8 rounded-full bg-editor-accent/10 flex items-center justify-center flex-shrink-0">
                <History className="w-4 h-4 text-editor-accent" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-editor-text-primary">
                        {service ? t(service.nameKey, entry.serviceId) : entry.serviceId}
                    </span>
                    <span className="text-editor-text-secondary">→</span>
                    <StatusBadge status={entry.previousStatus} />
                    <span className="text-editor-text-secondary">→</span>
                    <StatusBadge status={entry.newStatus} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-editor-text-secondary">
                    <span>{entry.userEmail}</span>
                    <span>•</span>
                    <span>{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                </div>
                {entry.reason && (
                    <p className="text-sm text-editor-text-secondary mt-1 italic">
                        "{entry.reason}"
                    </p>
                )}
            </div>
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ServiceAvailabilityControl: React.FC<ServiceAvailabilityControlProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('services');
    const [updatingService, setUpdatingService] = useState<PlatformServiceId | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const {
        availability,
        isLoading,
        error,
        auditLog,
        isLoadingAuditLog,
        updateServiceStatus,
        refreshAuditLog,
        getServiceStatus,
    } = useServiceAvailability();

    // Group services by category
    const groupedServices = useMemo(() => {
        const filtered = categoryFilter === 'all'
            ? PLATFORM_SERVICES
            : PLATFORM_SERVICES.filter(s => s.category === categoryFilter);

        return {
            core: filtered.filter(s => s.category === 'core'),
            marketing: filtered.filter(s => s.category === 'marketing'),
            tools: filtered.filter(s => s.category === 'tools'),
            advanced: filtered.filter(s => s.category === 'advanced'),
        };
    }, [categoryFilter]);

    const categories = [
        { id: 'all', label: t('common.all', 'Todos') },
        { id: 'core', label: t('serviceAvailability.categoryCore', 'Core') },
        { id: 'marketing', label: t('serviceAvailability.categoryMarketing', 'Marketing') },
        { id: 'tools', label: t('serviceAvailability.categoryTools', 'Herramientas') },
        { id: 'advanced', label: t('serviceAvailability.categoryAdvanced', 'Avanzado') },
    ];

    const handleStatusChange = async (serviceId: PlatformServiceId, status: ServiceStatus, reason?: string) => {
        setUpdatingService(serviceId);
        await updateServiceStatus(serviceId, status, reason);
        setUpdatingService(null);
    };

    const renderServiceGrid = (services: ServiceMetadata[], title: string) => {
        if (services.length === 0) return null;

        return (
            <div className="mb-8">
                <h2 className="text-sm font-semibold text-editor-text-secondary uppercase tracking-wider mb-4">
                    {title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map(service => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            status={getServiceStatus(service.id)}
                            statusReason={availability?.services[service.id]?.statusReason}
                            onStatusChange={(status, reason) => handleStatusChange(service.id, status, reason)}
                            isUpdating={updatingService === service.id}
                        />
                    ))}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-editor-accent animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors md:hidden"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onBack}
                            className="p-2 -ml-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors hidden md:block"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="font-bold text-editor-text-primary">
                                {t('serviceAvailability.title', 'Disponibilidad de Servicios')}
                            </h1>
                            <p className="text-xs text-editor-text-secondary hidden sm:block">
                                {t('serviceAvailability.subtitle', 'Control global de servicios de la plataforma')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="hidden md:flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('common.back', 'Volver')}
                    </button>
                </header>

                {/* Tabs */}
                <div className="border-b border-editor-border px-4 sm:px-6">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('services')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'services'
                                ? 'border-editor-accent text-editor-accent'
                                : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                        >
                            {t('serviceAvailability.tabServices', 'Servicios')}
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'audit'
                                ? 'border-editor-accent text-editor-accent'
                                : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                                }`}
                        >
                            <History size={16} />
                            {t('serviceAvailability.tabAuditLog', 'Historial')}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {activeTab === 'services' && (
                        <>
                            {/* Category Filter */}
                            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                                <Filter size={16} className="text-editor-text-secondary flex-shrink-0" />
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategoryFilter(cat.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${categoryFilter === cat.id
                                            ? 'bg-editor-accent text-white'
                                            : 'bg-editor-panel-bg text-editor-text-secondary hover:text-editor-text-primary'
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* Services Grid */}
                            {categoryFilter === 'all' ? (
                                <>
                                    {renderServiceGrid(groupedServices.core, t('serviceAvailability.categoryCore', 'Core'))}
                                    {renderServiceGrid(groupedServices.marketing, t('serviceAvailability.categoryMarketing', 'Marketing'))}
                                    {renderServiceGrid(groupedServices.tools, t('serviceAvailability.categoryTools', 'Herramientas'))}
                                    {renderServiceGrid(groupedServices.advanced, t('serviceAvailability.categoryAdvanced', 'Avanzado'))}
                                </>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {PLATFORM_SERVICES.filter(s => s.category === categoryFilter).map(service => (
                                        <ServiceCard
                                            key={service.id}
                                            service={service}
                                            status={getServiceStatus(service.id)}
                                            statusReason={availability?.services[service.id]?.statusReason}
                                            onStatusChange={(status, reason) => handleStatusChange(service.id, status, reason)}
                                            isUpdating={updatingService === service.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'audit' && (
                        <div className="bg-editor-panel-bg border border-editor-border rounded-xl">
                            <div className="p-4 border-b border-editor-border flex items-center justify-between">
                                <h2 className="font-semibold text-editor-text-primary">
                                    {t('serviceAvailability.auditLogTitle', 'Registro de Cambios')}
                                </h2>
                                <button
                                    onClick={refreshAuditLog}
                                    disabled={isLoadingAuditLog}
                                    className="p-2 text-editor-text-secondary hover:text-editor-accent transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingAuditLog ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="p-4">
                                {isLoadingAuditLog ? (
                                    <div className="flex items-center justify-center py-8">
                                        <RefreshCw className="w-6 h-6 text-editor-accent animate-spin" />
                                    </div>
                                ) : auditLog.length === 0 ? (
                                    <div className="text-center py-8 text-editor-text-secondary">
                                        <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>{t('serviceAvailability.noAuditEntries', 'No hay cambios registrados')}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-editor-border">
                                        {auditLog.map(entry => (
                                            <AuditLogEntry key={entry.id} entry={entry} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ServiceAvailabilityControl;

