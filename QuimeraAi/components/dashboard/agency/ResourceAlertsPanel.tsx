/**
 * ResourceAlertsPanel
 * Display resource usage alerts for sub-clients
 */

import React from 'react';
import { ResourceAlert } from '../../../hooks/useAgencyMetrics';
import {
    getAlertColor,
    getAlertIcon,
    formatResourceName,
} from '../../../contexts/agency/AgencyContext';
import { AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { useRouter } from '../../../hooks/useRouter';

interface ResourceAlertsPanelProps {
    alerts: ResourceAlert[];
    maxVisible?: number;
}

export function ResourceAlertsPanel({ alerts, maxVisible = 5 }: ResourceAlertsPanelProps) {
    const { navigate } = useRouter();
    const visibleAlerts = alerts.slice(0, maxVisible);
    const hasMore = alerts.length > maxVisible;

    const getIcon = (severity: ResourceAlert['severity']) => {
        return severity === 'critical' ? (
            <AlertTriangle className="h-5 w-5" />
        ) : (
            <AlertCircle className="h-5 w-5" />
        );
    };

    const handleAlertClick = (alert: ResourceAlert) => {
        // Navigate to client detail page
        navigate(`/dashboard/agency/clients/${alert.clientId}`);
    };

    if (alerts.length === 0) {
        return (
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Alertas de Recursos
                </h3>
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                        <svg
                            className="h-8 w-8 text-green-600 dark:text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <p className="text-muted-foreground">
                        No hay alertas de recursos
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Todos los clientes están dentro de sus límites
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                    Alertas de Recursos
                </h3>
                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400">
                    {alerts.length}
                </span>
            </div>

            <div className="space-y-3">
                {visibleAlerts.map((alert) => (
                    <button
                        key={alert.id}
                        onClick={() => handleAlertClick(alert)}
                        className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${getAlertColor(
                            alert.severity
                        )}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(alert.severity)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="font-medium truncate">
                                        {alert.clientName}
                                    </p>
                                    <span className="flex-shrink-0 text-sm font-semibold">
                                        {alert.percentage}%
                                    </span>
                                </div>
                                <p className="text-sm opacity-90">
                                    {formatResourceName(alert.resource)}: {alert.usage} /{' '}
                                    {alert.limit}
                                </p>
                                {alert.severity === 'critical' && (
                                    <p className="text-xs mt-1 font-medium">
                                        ⚠ Límite casi alcanzado - Contactar cliente
                                    </p>
                                )}
                            </div>
                            <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1 opacity-60" />
                        </div>
                    </button>
                ))}
            </div>

            {hasMore && (
                <button
                    onClick={() => navigate('/dashboard/agency/alerts')}
                    className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                    Ver todas las alertas ({alerts.length})
                </button>
            )}
        </div>
    );
}
