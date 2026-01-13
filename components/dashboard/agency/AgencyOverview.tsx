/**
 * AgencyOverview
 * Overview cards showing aggregated metrics across all sub-clients
 */

import React from 'react';
import { AggregatedMetrics } from '../../../hooks/useAgencyMetrics';
import {
    Users,
    FolderKanban,
    Contact,
    DollarSign,
    HardDrive,
    Sparkles,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';

interface AgencyOverviewProps {
    metrics: AggregatedMetrics;
    totalClients: number;
}

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: {
        value: number;
        label: string;
    };
    color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink' | 'emerald';
}

function MetricCard({ title, value, subtitle, icon, trend, color }: MetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };

    const colorClass = colorClasses[color];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            {trend.value >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span
                                className={`text-sm font-medium ${
                                    trend.value >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                                {trend.value >= 0 ? '+' : ''}
                                {trend.value}%
                            </span>
                            <span className="text-xs text-gray-500">{trend.label}</span>
                        </div>
                    )}
                </div>
                <div
                    className={`flex items-center justify-center h-12 w-12 rounded-lg border ${colorClass}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

export function AgencyOverview({ metrics, totalClients }: AgencyOverviewProps) {
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('es-MX').format(num);
    };

    const formatStorage = (gb: number): string => {
        if (gb < 1) {
            return `${(gb * 1024).toFixed(0)} MB`;
        }
        return `${gb.toFixed(1)} GB`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* MRR */}
            <MetricCard
                title="MRR (Ingreso Mensual Recurrente)"
                value={formatCurrency(metrics.mrr)}
                subtitle={`${metrics.activeSubClients} clientes activos`}
                icon={<DollarSign className="h-6 w-6" />}
                color="emerald"
            />

            {/* Total Clients */}
            <MetricCard
                title="Clientes Totales"
                value={totalClients}
                subtitle={`${metrics.activeSubClients} activos`}
                icon={<Users className="h-6 w-6" />}
                color="blue"
            />

            {/* Total Projects */}
            <MetricCard
                title="Proyectos Totales"
                value={formatNumber(metrics.totalProjects)}
                subtitle="Todos los clientes"
                icon={<FolderKanban className="h-6 w-6" />}
                color="purple"
            />

            {/* Total Leads */}
            <MetricCard
                title="Leads Totales"
                value={formatNumber(metrics.totalLeads)}
                subtitle="Todos los clientes"
                icon={<Contact className="h-6 w-6" />}
                color="orange"
            />

            {/* Total Users */}
            <MetricCard
                title="Usuarios Totales"
                value={formatNumber(metrics.totalUsers)}
                subtitle="Miembros de equipos"
                icon={<Users className="h-6 w-6" />}
                color="cyan"
            />

            {/* Storage Used */}
            <MetricCard
                title="Almacenamiento Usado"
                value={formatStorage(metrics.storageUsedGB)}
                subtitle="Todos los clientes"
                icon={<HardDrive className="h-6 w-6" />}
                color="pink"
            />

            {/* AI Credits Used */}
            <MetricCard
                title="AI Credits Consumidos"
                value={formatNumber(metrics.aiCreditsUsed)}
                subtitle="Último mes"
                icon={<Sparkles className="h-6 w-6" />}
                color="purple"
            />

            {/* Revenue (if available) */}
            {metrics.totalRevenue > 0 && (
                <MetricCard
                    title="Ingresos Generados"
                    value={formatCurrency(metrics.totalRevenue)}
                    subtitle="E-commerce de clientes"
                    icon={<DollarSign className="h-6 w-6" />}
                    color="green"
                />
            )}
        </div>
    );
}
