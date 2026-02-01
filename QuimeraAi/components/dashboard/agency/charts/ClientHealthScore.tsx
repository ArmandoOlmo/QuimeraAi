/**
 * ClientHealthScore
 * Traffic light indicators for client health
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    AlertCircle,
    XCircle,
    Activity,
    TrendingUp,
    Clock,
    CreditCard,
} from 'lucide-react';

interface ClientHealth {
    clientId: string;
    clientName: string;
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
        usage: number;        // Resource usage percentage
        activity: number;     // Days since last activity
        payment: 'ok' | 'pending' | 'overdue';
        trend: 'up' | 'stable' | 'down';
    };
}

interface ClientHealthScoreProps {
    clients: ClientHealth[];
    isLoading?: boolean;
}

export function ClientHealthScore({ clients, isLoading }: ClientHealthScoreProps) {
    const { t } = useTranslation();
    const healthCounts = {
        healthy: clients.filter((c) => c.status === 'healthy').length,
        warning: clients.filter((c) => c.status === 'warning').length,
        critical: clients.filter((c) => c.status === 'critical').length,
    };

    const getStatusIcon = (status: ClientHealth['status']) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-400" />;
            case 'critical':
                return <XCircle className="w-5 h-5 text-red-400" />;
        }
    };

    const getStatusColor = (status: ClientHealth['status']) => {
        switch (status) {
            case 'healthy':
                return 'border-emerald-500/30 bg-emerald-500/10';
            case 'warning':
                return 'border-yellow-500/30 bg-yellow-500/10';
            case 'critical':
                return 'border-red-500/30 bg-red-500/10';
        }
    };

    const getPaymentBadge = (payment: ClientHealth['metrics']['payment']) => {
        switch (payment) {
            case 'ok':
                return (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                        {t('dashboard.agency.charts.clientHealth.paymentOk', 'Al día')}
                    </span>
                );
            case 'pending':
                return (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                        {t('dashboard.agency.charts.clientHealth.paymentPending', 'Pendiente')}
                    </span>
                );
            case 'overdue':
                return (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                        {t('dashboard.agency.charts.clientHealth.paymentOverdue', 'Vencido')}
                    </span>
                );
        }
    };

    const getTrendIcon = (trend: ClientHealth['metrics']['trend']) => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="w-4 h-4 text-emerald-400" />;
            case 'stable':
                return <Activity className="w-4 h-4 text-blue-400" />;
            case 'down':
                return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
        }
    };

    if (isLoading) {
        return (
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <div className="animate-pulse">
                    <div className="h-6 w-40 bg-editor-border rounded mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-editor-border rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-editor-panel-bg border border-editor-border rounded-xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-editor-text-primary flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        {t('dashboard.agency.charts.clientHealth.title', 'Salud de Clientes')}
                    </h3>
                    <p className="text-sm text-editor-text-secondary">
                        {t('dashboard.agency.charts.clientHealth.subtitle', 'Estado general de la cartera')}
                    </p>
                </div>
            </div>

            {/* Summary badges */}
            <div className="flex gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">
                        {healthCounts.healthy}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">
                        {healthCounts.warning}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">
                        {healthCounts.critical}
                    </span>
                </div>
            </div>

            {/* Client list */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {clients.length === 0 ? (
                    <div className="text-center py-8 text-editor-text-secondary">
                        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>{t('dashboard.agency.charts.clientHealth.noClients', 'No hay clientes para mostrar')}</p>
                    </div>
                ) : (
                    clients
                        .sort((a, b) => {
                            const order = { critical: 0, warning: 1, healthy: 2 };
                            return order[a.status] - order[b.status];
                        })
                        .map((client, index) => (
                            <motion.div
                                key={client.clientId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-4 rounded-lg border ${getStatusColor(client.status)}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(client.status)}
                                        <span className="font-medium text-editor-text-primary">
                                            {client.clientName}
                                        </span>
                                    </div>
                                    {getPaymentBadge(client.metrics.payment)}
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                    {/* Usage */}
                                    <div className="flex items-center gap-1 text-editor-text-secondary">
                                        <div className="w-16 h-1.5 bg-editor-border rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${client.metrics.usage > 90
                                                        ? 'bg-red-400'
                                                        : client.metrics.usage > 70
                                                            ? 'bg-yellow-400'
                                                            : 'bg-emerald-400'
                                                    }`}
                                                style={{ width: `${client.metrics.usage}%` }}
                                            />
                                        </div>
                                        <span>{client.metrics.usage}%</span>
                                    </div>

                                    {/* Last activity */}
                                    <div className="flex items-center gap-1 text-editor-text-secondary">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            {client.metrics.activity === 0
                                                ? t('dashboard.agency.charts.clientHealth.today', 'Hoy')
                                                : `${client.metrics.activity}d`}
                                        </span>
                                    </div>

                                    {/* Trend */}
                                    <div className="flex items-center gap-1">
                                        {getTrendIcon(client.metrics.trend)}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                )}
            </div>
        </motion.div>
    );
}

export default ClientHealthScore;
