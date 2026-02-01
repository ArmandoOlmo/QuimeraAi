/**
 * AICreditsPoolChart
 * Donut chart showing AI credits distribution by client
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { Sparkles, AlertTriangle } from 'lucide-react';

interface ClientCreditsUsage {
    name: string;
    creditsUsed: number;
}

interface AICreditsPoolChartProps {
    poolTotal: number;
    poolUsed: number;
    clientBreakdown: ClientCreditsUsage[];
    isLoading?: boolean;
}

const COLORS = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export function AICreditsPoolChart({
    poolTotal,
    poolUsed,
    clientBreakdown,
    isLoading,
}: AICreditsPoolChartProps) {
    const { t } = useTranslation();
    const poolRemaining = poolTotal - poolUsed;
    const usagePercentage = poolTotal > 0 ? (poolUsed / poolTotal) * 100 : 0;
    const isLow = usagePercentage > 80;
    const isCritical = usagePercentage > 95;

    // Prepare data for donut chart
    const chartData = [
        ...clientBreakdown.map((client) => ({
            name: client.name,
            value: client.creditsUsed,
        })),
    ];

    // Add remaining as a segment if there's unused credits
    if (poolRemaining > 0 && chartData.length > 0) {
        chartData.push({
            name: t('dashboard.agency.charts.aiCredits.available', 'Disponible'),
            value: poolRemaining,
        });
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const percentage = poolTotal > 0 ? ((data.value / poolTotal) * 100).toFixed(1) : 0;
            return (
                <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium text-editor-text-primary mb-1">
                        {data.name}
                    </p>
                    <p className="text-sm" style={{ color: data.payload.fill }}>
                        {data.value.toLocaleString()} {t('dashboard.agency.charts.aiCredits.credits', 'créditos')} ({percentage}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <div className="animate-pulse">
                    <div className="h-6 w-40 bg-editor-border rounded mb-4" />
                    <div className="h-64 bg-editor-border rounded-full mx-auto w-64" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-editor-panel-bg border border-editor-border rounded-xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-editor-text-primary flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        {t('dashboard.agency.charts.aiCredits.title', 'Pool de AI Credits')}
                    </h3>
                    <p className="text-sm text-editor-text-secondary">
                        {t('dashboard.agency.charts.aiCredits.subtitle', 'Distribución por cliente')}
                    </p>
                </div>
                {(isLow || isCritical) && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isCritical
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        <AlertTriangle className="w-3 h-3" />
                        {isCritical ? t('dashboard.agency.charts.aiCredits.critical', 'Crítico') : t('dashboard.agency.charts.aiCredits.low', 'Bajo')}
                    </div>
                )}
            </div>

            {/* Center stats */}
            <div className="relative">
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.name === t('dashboard.agency.charts.aiCredits.available', 'Disponible')
                                                ? '#374151'
                                                : COLORS[index % COLORS.length]
                                        }
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-editor-text-primary">
                            <CountUp
                                start={0}
                                end={usagePercentage}
                                duration={1.5}
                                decimals={0}
                                suffix="%"
                            />
                        </div>
                        <div className="text-xs text-editor-text-secondary">{t('dashboard.agency.charts.aiCredits.used', 'usado')}</div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
                {clientBreakdown.slice(0, 5).map((client, index) => (
                    <div key={client.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-editor-text-secondary truncate max-w-[120px]">
                                {client.name}
                            </span>
                        </div>
                        <span className="text-editor-text-primary">
                            {client.creditsUsed.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            {/* Footer stats */}
            <div className="mt-4 pt-4 border-t border-editor-border grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-editor-text-secondary">{t('dashboard.agency.charts.aiCredits.usedLabel', 'Usados')}</p>
                    <p className="text-lg font-semibold text-purple-400">
                        {poolUsed.toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-editor-text-secondary">{t('dashboard.agency.charts.aiCredits.availableLabel', 'Disponibles')}</p>
                    <p className="text-lg font-semibold text-editor-text-primary">
                        {poolRemaining.toLocaleString()}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

export default AICreditsPoolChart;
