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
    XCircle,
    MoreVertical,
    Download,
} from 'lucide-react';

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
            <div className="bg-card rounded-lg border border-border p-12">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                        <svg
                            className="h-8 w-8 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No hay clientes todavía
                    </h3>
                    <p className="text-muted-foreground mt-1">
                        Comienza agregando tu primer sub-cliente
                    </p>
                    <button
                        onClick={() => navigate('/dashboard/agency/clients/new')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Agregar Primer Cliente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-3xl font-bold text-foreground">
                    Clientes ({clients.length})
                </h1>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Cliente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Plan
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Proyectos
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Storage
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                AI Credits
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                MRR
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {clients.map((client) => {
                            const metrics = getClientMetrics(client.id);
                            const hasAlerts = metrics && metrics.alerts.length > 0;

                            return (
                                <tr
                                    key={client.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/dashboard/agency/clients/${client.id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {client.name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {client.slug}
                                                </div>
                                            </div>
                                            {hasAlerts && (
                                                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(client.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-foreground capitalize">
                                            {client.subscriptionPlan.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
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
                                    <td className="px-6 py-4 whitespace-nowrap">
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
                                    <td className="px-6 py-4 whitespace-nowrap">
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {client.billing?.mrr ? (
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
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
                                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                                                title="Exportar datos"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/dashboard/agency/clients/${client.id}`);
                                                }}
                                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
