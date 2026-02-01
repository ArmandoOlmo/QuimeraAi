/**
 * MRRChart
 * Area chart showing Monthly Recurring Revenue over time
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface MRRDataPoint {
    month: string;
    mrr: number;
    clients: number;
}

interface MRRChartProps {
    data: MRRDataPoint[];
    currentMRR: number;
    previousMRR?: number;
    isLoading?: boolean;
}

export function MRRChart({ data, currentMRR, previousMRR = 0, isLoading }: MRRChartProps) {
    const { t } = useTranslation();
    const percentChange = useMemo(() => {
        if (previousMRR === 0) return 0;
        return ((currentMRR - previousMRR) / previousMRR) * 100;
    }, [currentMRR, previousMRR]);

    const isPositive = percentChange >= 0;

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
            return (
                <div className="bg-editor-panel-bg border border-editor-border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-medium text-editor-text-primary mb-1">{label}</p>
                    <p className="text-sm text-emerald-400">
                        MRR: {formatCurrency(payload[0].value)}
                    </p>
                    {payload[1] && (
                        <p className="text-sm text-blue-400">
                            {t('dashboard.agency.charts.mrr.clients', 'Clientes')}: {payload[1].value}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6">
                <div className="animate-pulse">
                    <div className="h-6 w-32 bg-editor-border rounded mb-4" />
                    <div className="h-64 bg-editor-border rounded" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-editor-panel-bg border border-editor-border rounded-xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-editor-text-primary">
                        {t('dashboard.agency.charts.mrr.title', 'Ingresos Recurrentes (MRR)')}
                    </h3>
                    <p className="text-sm text-editor-text-secondary">{t('dashboard.agency.charts.mrr.subtitle', 'Últimos 12 meses')}</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        <span className="text-2xl font-bold text-editor-text-primary">
                            <CountUp
                                start={0}
                                end={currentMRR}
                                duration={1.5}
                                separator=","
                                prefix="$"
                            />
                        </span>
                    </div>
                    {previousMRR > 0 && (
                        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                            <span>
                                {isPositive ? '+' : ''}{percentChange.toFixed(1)}% {t('dashboard.agency.charts.mrr.vsPrevMonth', 'vs mes anterior')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                            type="monotone"
                            dataKey="mrr"
                            name="MRR"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#mrrGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

export default MRRChart;
