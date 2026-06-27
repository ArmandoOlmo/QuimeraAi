/**
 * ResourceAlertsPanel
 * Display resource usage alerts for sub-clients
 */

import React, { useState } from 'react';
import { ResourceAlert } from '../../../hooks/useAgencyMetrics';
import {
    getAlertColor,
    formatResourceName,
} from '../../../contexts/agency/AgencyContext';
import { AlertTriangle, AlertCircle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { AgencyEmptyState, AgencyPanel } from './AgencyDesignSystem';
import { StatusBadge } from '../../ui/system';

interface ResourceAlertsPanelProps {
    alerts: ResourceAlert[];
    maxVisible?: number;
    onSelectClient?: (clientId: string) => void;
}

export function ResourceAlertsPanel({ alerts, maxVisible = 5, onSelectClient }: ResourceAlertsPanelProps) {
    const [showAll, setShowAll] = useState(false);
    const visibleAlerts = showAll ? alerts : alerts.slice(0, maxVisible);
    const hasMore = alerts.length > maxVisible;

    const getIcon = (severity: ResourceAlert['severity']) => {
        return severity === 'critical' ? (
            <AlertTriangle className="h-5 w-5" />
        ) : (
            <AlertCircle className="h-5 w-5" />
        );
    };

    const handleAlertClick = (alert: ResourceAlert) => {
        onSelectClient?.(alert.clientId);
    };

    if (alerts.length === 0) {
        return (
            <AgencyPanel title="Alertas de Recursos" icon={AlertCircle}>
                <AgencyEmptyState
                    icon={CheckCircle2}
                    title="Sin alertas activas"
                    description="Todos los clientes están dentro de sus límites."
                />
            </AgencyPanel>
        );
    }

    return (
        <AgencyPanel
            title="Alertas de Recursos"
            icon={AlertTriangle}
            action={<StatusBadge size="sm" variant="danger">{alerts.length}</StatusBadge>}
        >
            <div className="space-y-3">
                {visibleAlerts.map((alert) => (
                    <button
                        key={alert.id}
                        onClick={() => handleAlertClick(alert)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors hover:border-q-border ${getAlertColor(
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
                                        Límite casi alcanzado - Contactar cliente
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
                    onClick={() => setShowAll((value) => !value)}
                    className="w-full mt-4 text-sm quimera-status-card-link font-medium"
                >
                    {showAll ? 'Mostrar menos' : `Ver todas las alertas (${alerts.length})`}
                </button>
            )}
        </AgencyPanel>
    );
}
