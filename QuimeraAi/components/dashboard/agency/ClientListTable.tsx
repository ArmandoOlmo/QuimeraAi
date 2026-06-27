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
import { ROUTES } from '../../../routes/config';
import { AgencyPanel } from './AgencyDesignSystem';
import { StatusBadge } from '../../ui/system';
import { Client360Panel } from './Client360Panel';

interface ClientListTableProps {
    clients: Tenant[];
    onSelectClient?: (clientId: string) => void;
    renderClient360?: boolean;
}

export function ClientListTable({ clients, onSelectClient, renderClient360 = true }: ClientListTableProps) {
    const { navigate } = useRouter();
    const { getClientMetrics, exportClientData, recentActivity } = useAgency();
    const [exportingClientId, setExportingClientId] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const selectedClient = clients.find(client => client.id === selectedClientId) || null;

    const getStatusBadge = (status: Tenant['status']) => {
        const styles: Record<Tenant['status'], { bg: string; text: string; label: string; icon: React.ReactNode }> = {
            active: {
                bg: 'bg-q-success/10 dark:bg-q-success/12',
                text: 'text-q-success dark:text-q-success',
                label: 'Activo',
                icon: <CheckCircle className="h-3.5 w-3.5" />,
            },
            trial: {
                bg: 'bg-q-accent/10 dark:bg-q-accent/12',
                text: 'text-q-accent dark:text-q-accent',
                label: 'Prueba',
                icon: <Clock className="h-3.5 w-3.5" />,
            },
            suspended: {
                bg: 'bg-q-accent/10 dark:bg-q-accent/12',
                text: 'text-q-accent dark:text-q-accent',
                label: 'Suspendido',
                icon: <AlertTriangle className="h-3.5 w-3.5" />,
            },
            expired: {
                bg: 'bg-q-surface-overlay dark:bg-gray-800',
                text: 'text-q-text-muted dark:text-gray-400',
                label: 'Expirado',
                icon: <Clock className="h-3.5 w-3.5" />,
            },

        };

        const style = styles[status];

        return (
            <StatusBadge
                size="sm"
                variant={status === 'active' ? 'success' : status === 'expired' ? 'muted' : 'warning'}
                className={`inline-flex items-center gap-1.5 ${style.bg} ${style.text}`}
            >
                {style.icon}
                {style.label}
            </StatusBadge>
        );
    };

    const formatPercentage = (value: number): string => {
        return `${Math.round(value)}%`;
    };

    const getUsageColor = (percentage: number): string => {
        if (percentage >= 95) return 'text-q-error dark:text-q-error font-semibold';
        if (percentage >= 80) return 'text-q-accent dark:text-q-accent font-medium';
        return 'text-q-text-muted dark:text-gray-400';
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

    const handleOpenClient = (clientId: string) => {
        if (onSelectClient) {
            onSelectClient(clientId);
            return;
        }

        setSelectedClientId(clientId);
    };

    const getClientMrr = (client: Tenant) => {
        const value = client.billing?.mrr ?? client.billing?.monthlyPrice ?? client.billingInfo?.mrr ?? 0;
        const amount = Number(value);
        return Number.isFinite(amount) && amount > 0 ? amount : 0;
    };

    if (clients.length === 0) {
        return (
            <AgencyPanel>
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
            </AgencyPanel>
        );
    }

    return (
        <>
            <AgencyPanel title={`Clientes (${clients.length})`} icon={Users} contentClassName="!p-0">
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
                                        onClick={() => handleOpenClient(client.id)}
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
                                                    <AlertTriangle className="h-4 w-4 text-q-accent flex-shrink-0" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            {getStatusBadge(client.status)}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="text-sm text-foreground capitalize">
                                                {(client.subscriptionPlan || 'individual').replace('_', ' ')}
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
                                                <span className="text-sm text-q-text-muted">-</span>
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
                                                <span className="text-sm text-q-text-muted">-</span>
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
                                                <span className="text-sm text-q-text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            {getClientMrr(client) > 0 ? (
                                                <span className="text-sm font-medium text-foreground">
                                                    ${getClientMrr(client).toFixed(0)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-q-text-muted">-</span>
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
                                                        handleOpenClient(client.id);
                                                    }}
                                                    className="p-2 text-q-text-muted hover:text-foreground transition-colors"
                                                    title="Client 360"
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
            </AgencyPanel>
            {renderClient360 && (
                <Client360Panel
                    client={selectedClient}
                    metrics={selectedClient ? getClientMetrics(selectedClient.id) : null}
                    activities={recentActivity}
                    isOpen={Boolean(selectedClient)}
                    isExporting={Boolean(selectedClient && exportingClientId === selectedClient.id)}
                    onClose={() => setSelectedClientId(null)}
                    onExport={handleExportClient}
                />
            )}
        </>
    );
}
