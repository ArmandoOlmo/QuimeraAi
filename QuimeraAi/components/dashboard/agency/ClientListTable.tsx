/**
 * ClientListTable
 * Table displaying all sub-clients with their status and key metrics
 */

import React, { useState } from 'react';
import { Tenant } from '../../../types/multiTenant';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { useRouter } from '../../../hooks/useRouter';
import {
    ExternalLink,
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    Users,
} from 'lucide-react';
import { settingsPanelClass } from '../settings/SettingsStatCard';
import { ROUTES } from '../../../routes/config';

interface ClientListTableProps {
    clients: Tenant[];
}

export function ClientListTable({ clients }: ClientListTableProps) {
    const { navigate } = useRouter();
    const { getClientMetrics, exportClientData } = useAgency();
    const [exportingClientId, setExportingClientId] = useState<string | null>(null);

    const getStatusBadge = (status: Tenant['status']) => {
        const styles: Record<Tenant['status'], { bg: string; text: string; label: string; icon: React.ReactNode }> = {
            active: {
                bg: 'bg-green-100 dark:bg-green-900/20',
                text: 'text-green-800 dark:text-green-400',
                label: 'Activo',
                icon: <CheckCircle className="h-3.5 w-3.5" />,
            },
            trial: {
                bg: 'bg-blue-100 dark:bg-blue-900/20',
                text: 'text-blue-800 dark:text-blue-400',
                label: 'Prueba',
                icon: <Clock className="h-3.5 w-3.5" />,
            },
            suspended: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/20',
                text: 'text-yellow-800 dark:text-yellow-400',
                label: 'Suspendido',
                icon: <AlertTriangle className="h-3.5 w-3.5" />,
            },
            expired: {
                bg: 'bg-gray-100 dark:bg-gray-800',
                text: 'text-gray-600 dark:text-gray-400',
                label: 'Expirado',
                icon: <Clock className="h-3.5 w-3.5" />,
            },

        };

        const style = styles[status];

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
            >
                {style.icon}
                {style.label}
            </span>
        );
    };

    const formatPercentage = (value: number): string => {
        return `${Math.round(value)}%`;
    };

    const getUsageColor = (percentage: number): string => {
        if (percentage >= 95) return 'text-red-600 dark:text-red-400 font-semibold';
        if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400 font-medium';
        return 'text-gray-600 dark:text-gray-400';
    };

    const handleExportClient = async (clientId: string) => {
        setExportingClientId(clientId);
        try {
            await exportClientData(clientId);
        } catch (error) {
            console.error('Error exporting client data:', error);
        } finally {
            setExportingClientId(null);
        }
    };

    if (clients.length === 0) {
        return (
            <div className={`${settingsPanelClass} p-12`}>
                <div className="text-center">
                    <Users className="h-10 w-10 text-q-text-muted/40 mx-auto mb-4" strokeWidth={1.5} />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No hay clientes todavía
                    </h3>
                    <p className="text-q-text-muted mt-1">
                        Comienza agregando tu primer sub-cliente
                    </p>
                    <button
                        onClick={() => navigate(ROUTES.AGENCY_NEW_CLIENT)}
                        className="quimera-guide-cta mt-4 px-4 py-2 rounded-xl font-medium transition-colors"
                    >
                        Agregar Primer Cliente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={settingsPanelClass}>
            <div className="px-5 py-4 border-b border-q-border flex items-center gap-3">
                <Users size={20} className="quimera-dashboard-header-icon" strokeWidth={2} />
                <h2 className="text-lg font-semibold text-foreground">
                    Clientes ({clients.length})
                </h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-secondary/30">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-q-text-muted uppercase tracking-wider">
                                Cliente
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-q-text-muted uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-q-text-muted uppercase tracking-wider">
                                Plan
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-q-text-muted uppercase tracking-wider">
                                Proyectos
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-q-text-muted uppercase tracking-wider">
                                Storage
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-q-text-muted uppercase tracking-wider">
                                AI Credits
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-q-text-muted uppercase tracking-wider">
                                MRR
                            </th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-q-text-muted uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-q-border">
                        {clients.map((client) => {
                            const metrics = getClientMetrics(client.id);
                            const hasAlerts = metrics && metrics.alerts.length > 0;

                            return (
                                <tr
                                    key={client.id}
                                    className="hover:bg-secondary/20 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/dashboard/agency/clients/${client.id}`)}
                                >
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {client.name}
                                                </div>
                                                <div className="text-sm text-q-text-muted">
                                                    {client.slug}
                                                </div>
                                            </div>
                                            {hasAlerts && (
                                                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        {getStatusBadge(client.status)}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        <span className="text-sm text-foreground capitalize">
                                            {client.subscriptionPlan.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        {metrics ? (
                                            <span className={`text-sm ${getUsageColor(metrics.usagePercentages.projects)}`}>
                                                {metrics.usage.projectCount} / {metrics.limits.maxProjects}
                                                <span className="text-xs ml-1">
                                                    ({formatPercentage(metrics.usagePercentages.projects)})
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        {metrics ? (
                                            <span className={`text-sm ${getUsageColor(metrics.usagePercentages.storage)}`}>
                                                {metrics.usage.storageUsedGB.toFixed(1)} GB
                                                <span className="text-xs ml-1">
                                                    ({formatPercentage(metrics.usagePercentages.storage)})
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        {metrics ? (
                                            <span className={`text-sm ${getUsageColor(metrics.usagePercentages.aiCredits)}`}>
                                                {metrics.usage.aiCreditsUsed.toLocaleString()}
                                                <span className="text-xs ml-1">
                                                    ({formatPercentage(metrics.usagePercentages.aiCredits)})
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        {client.billing?.mrr ? (
                                            <span className="text-sm font-medium text-foreground">
                                                ${client.billing.mrr.toFixed(0)}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleExportClient(client.id);
                                                }}
                                                disabled={exportingClientId === client.id}
                                                className="p-2 text-q-text-muted hover:text-foreground transition-colors disabled:opacity-50"
                                                title="Exportar datos"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/dashboard/agency/clients/${client.id}`);
                                                }}
                                                className="p-2 text-q-text-muted hover:text-foreground transition-colors"
                                                title="Ver detalles"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
