/**
 * GoogleCalendarConnect
 * Componente para conectar y sincronizar con Google Calendar
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../../../ui/ConfirmationModal';
import {
    Calendar,
    Check,
    X,
    RefreshCw,
    Loader2,
    Link2,
    Unlink,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronDown,
    Settings,
    ExternalLink,
} from 'lucide-react';
import { GoogleCalendarConfig, SyncStatus } from '../../../../types';

// =============================================================================
// TYPES
// =============================================================================

interface GoogleCalendarConnectProps {
    isConnected: boolean;
    config?: GoogleCalendarConfig;
    onConnect: () => Promise<void>;
    onDisconnect: () => Promise<void>;
    onSync: () => Promise<void>;
    lastSyncTime?: Date;
    syncStatus?: SyncStatus;
    className?: string;
}

// =============================================================================
// GOOGLE CALENDAR ICON
// =============================================================================

const GoogleCalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24">
        {/* Calendar base - gray */}
        <path fill="#5F6368" d="M19.5 4H18V3c0-.55-.45-1-1-1s-1 .45-1 1v1H8V3c0-.55-.45-1-1-1s-1 .45-1 1v1H4.5C3.12 4 2 5.12 2 6.5v13C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 5.12 20.88 4 19.5 4zM4.5 6H6v1c0 .55.45 1 1 1s1-.45 1-1V6h8v1c0 .55.45 1 1 1s1-.45 1-1V6h1.5c.28 0 .5.22.5.5V9H4V6.5c0-.28.22-.5.5-.5zm15 14H4.5c-.28 0-.5-.22-.5-.5V11h16v8.5c0 .28-.22.5-.5.5z" />
        {/* Google colors squares */}
        <rect fill="#EA4335" x="6" y="12" width="4" height="4" rx="0.5" />
        <rect fill="#FBBC05" x="11" y="12" width="4" height="4" rx="0.5" />
        <rect fill="#34A853" x="6" y="17" width="4" height="2" rx="0.5" />
        <rect fill="#4285F4" x="11" y="17" width="4" height="2" rx="0.5" />
    </svg>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const GoogleCalendarConnect: React.FC<GoogleCalendarConnectProps> = ({
    isConnected,
    config,
    onConnect,
    onDisconnect,
    onSync,
    lastSyncTime,
    syncStatus = 'not_synced',
    className = '',
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const { t } = useTranslation();

    const handleConnect = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await onConnect();
        } catch (err: any) {
            setError(err.message || 'Error al conectar con Google Calendar');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        setShowDisconnectConfirm(false);
        try {
            await onDisconnect();
        } catch (err: any) {
            setError(err.message || 'Error al desconectar');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setError(null);
        try {
            await onSync();
        } catch (err: any) {
            setError(err.message || 'Error al sincronizar');
        } finally {
            setIsSyncing(false);
        }
    };

    const getSyncStatusInfo = () => {
        switch (syncStatus) {
            case 'synced':
                return { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Sincronizado', icon: CheckCircle2 };
            case 'pending':
                return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pendiente', icon: Clock };
            case 'error':
                return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Error', icon: AlertCircle };
            default:
                return { color: 'text-muted-foreground', bg: 'bg-muted', label: 'No sincronizado', icon: Calendar };
        }
    };

    const statusInfo = getSyncStatusInfo();
    const StatusIcon = statusInfo.icon;

    // Not connected state
    if (!isConnected) {
        return (
            <div className={`rounded-2xl border border-border overflow-hidden ${className}`}>
                <div className="p-6 bg-gradient-to-br from-blue-500/5 via-red-500/5 to-yellow-500/5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                            <GoogleCalendarIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-lg">Google Calendar</h3>
                            <p className="text-sm text-muted-foreground">
                                Sincroniza tus citas automáticamente
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check size={16} className="text-green-500" />
                            Sincronización bidireccional
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check size={16} className="text-green-500" />
                            Notificaciones automáticas
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check size={16} className="text-green-500" />
                            Crear Google Meet automáticamente
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm text-red-500 flex items-center gap-2">
                                <AlertCircle size={14} />
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleConnect}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="animate-spin text-gray-700" />
                        ) : (
                            <GoogleCalendarIcon className="w-5 h-5" />
                        )}
                        <span className="text-gray-800">
                            {isLoading ? 'Conectando...' : 'Conectar con Google Calendar'}
                        </span>
                    </button>

                    <p className="text-xs text-muted-foreground text-center mt-3">
                        Usamos OAuth 2.0 para una conexión segura
                    </p>
                </div>
            </div>
        );
    }

    // Connected state
    return (
        <>
            <div className={`rounded-2xl border border-border overflow-hidden ${className}`}>
                {/* Header */}
                <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                            <GoogleCalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">Google Calendar</h3>
                                <span className={`
                                flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                ${statusInfo.bg} ${statusInfo.color}
                            `}>
                                    <StatusIcon size={12} />
                                    {statusInfo.label}
                                </span>
                            </div>
                            {config?.calendarName && (
                                <p className="text-xs text-muted-foreground">{config.calendarName}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                            title="Sincronizar ahora"
                        >
                            {isSyncing ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <RefreshCw size={18} />
                            )}
                        </button>

                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`
                            p-2 rounded-lg transition-colors
                            ${showSettings
                                    ? 'bg-secondary text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                }
                        `}
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                {/* Settings panel */}
                {showSettings && (
                    <div className="p-4 border-b border-border bg-secondary/10 animate-fade-in">
                        <div className="space-y-4">
                            {/* Sync toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-foreground text-sm">Sincronización automática</p>
                                    <p className="text-xs text-muted-foreground">
                                        Mantén tus citas sincronizadas automáticamente
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config?.syncEnabled ?? true}
                                        onChange={() => { }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors">
                                        <div className={`
                                        absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                                        transition-transform duration-200
                                        ${config?.syncEnabled !== false ? 'translate-x-5' : ''}
                                    `} />
                                    </div>
                                </label>
                            </div>

                            {/* Calendar selector */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Calendario
                                </label>
                                <select
                                    value={config?.calendarId || 'primary'}
                                    onChange={() => { }}
                                    className="w-full h-10 bg-secondary/50 border border-border rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="primary">Calendario principal</option>
                                </select>
                            </div>

                            {/* Disconnect button */}
                            <button
                                onClick={() => setShowDisconnectConfirm(true)}
                                disabled={isLoading}
                                className="w-full py-2 px-4 text-red-500 hover:bg-red-500/10 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Unlink size={16} />
                                )}
                                Desconectar
                            </button>
                        </div>
                    </div>
                )}

                {/* Status info */}
                <div className="p-4">
                    {error && (
                        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm text-red-500 flex items-center gap-2">
                                <AlertCircle size={14} />
                                {error}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Última sincronización:</span>
                        <span className="text-foreground">
                            {lastSyncTime
                                ? lastSyncTime.toLocaleString('es-ES', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                                : 'Nunca'
                            }
                        </span>
                    </div>

                    <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                    >
                        Abrir Google Calendar
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDisconnectConfirm}
                onConfirm={handleDisconnect}
                onCancel={() => setShowDisconnectConfirm(false)}
                title={t('appointments.disconnectGoogle', '¿Desconectar Google Calendar?')}
                message={t('appointments.disconnectGoogleMessage', '¿Estás seguro de que deseas desconectar Google Calendar? Tus citas existentes no se eliminarán.')}
                variant="danger"
                isLoading={isLoading}
            />
        </>
    );
};

export default GoogleCalendarConnect;



