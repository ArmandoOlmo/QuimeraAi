/**
 * RevenueByClientChart
 * Horizontal bar chart showing revenue by client (top 10)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface ClientRevenue {
    name: string;
    revenue: number;
    projects: number;
}

interface RevenueByClientChartProps {
    data: ClientRevenue[];
    isLoading?: boolean;
}

const COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export function RevenueByClientChart({ data, isLoading }: RevenueByClientChartProps) {
    const { t } = useTranslation();
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium text-editor-text-primary mb-1">{label}</p>
                    <p className="text-sm text-emerald-400">
                        {t('dashboard.agency.charts.revenueByClient.revenue', 'Ingresos')}: {formatCurrency(data.revenue)}
                    </p>
                    <p className="text-sm text-blue-400">
                        {t('dashboard.agency.charts.revenueByClient.projects', 'Proyectos')}: {data.projects}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Sort and take top 10
    const sortedData = [...data]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    const totalRevenue = data.reduce((sum, client) => sum + client.revenue, 0);

    if (isLoading) {
        return (
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <div className="animate-pulse">
                    <div className="h-6 w-40 bg-editor-border rounded mb-4" />
                    <div className="h-64 bg-editor-border rounded" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-editor-panel-bg border border-editor-border rounded-xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-editor-text-primary">
                        {t('dashboard.agency.charts.revenueByClient.title', 'Ingresos por Cliente')}
                    </h3>
                    <p className="text-sm text-editor-text-secondary">{t('dashboard.agency.charts.revenueByClient.subtitle', 'Top 10 clientes por ingresos')}</p>
                </div>
                <div className="flex items-center gap-2 text-editor-text-secondary">
                    <Users className="w-5 h-5" />
                    <span className="text-sm">{data.length} {t('dashboard.agency.charts.revenueByClient.clients', 'clientes')}</span>
                </div>
            </div>

            {/* Chart */}
            {sortedData.length > 0 ? (
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sortedData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                            <XAxis
                                type="number"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                                {sortedData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-64 flex items-center justify-center text-editor-text-secondary">
                    <p>{t('dashboard.agency.charts.revenueByClient.noData', 'No hay datos de ingresos disponibles')}</p>
                </div>
            )}

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-editor-border flex justify-between items-center">
                <span className="text-sm text-editor-text-secondary">{t('dashboard.agency.charts.revenueByClient.totalMrr', 'Total MRR')}</span>
                <span className="text-lg font-semibold text-editor-text-primary">
                    {formatCurrency(totalRevenue)}
                </span>
            </div>
        </motion.div>
    );
}

export default RevenueByClientChart;
