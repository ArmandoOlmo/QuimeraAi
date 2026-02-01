/**
 * AnalyticsView
 * Vista de analytics y métricas de ecommerce
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Users,
    Package,
    Loader2,
    Calendar,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useEcommerceAnalytics } from '../hooks/useEcommerceAnalytics';
import { useEcommerceTheme, withOpacity } from '../hooks/useEcommerceTheme';
import { useEcommerceContext } from '../EcommerceDashboard';

type DateRange = '7d' | '30d' | '90d' | '1y';

const AnalyticsView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const theme = useEcommerceTheme();
    const [dateRange, setDateRange] = useState<DateRange>('30d');

    // Use theme color for charts
    const COLORS = [theme.primary, '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    const {
        isLoading,
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue,
        revenueByMonth,
        revenueByDay,
        topProducts,
        topCustomers,
        ordersByStatus,
        conversionMetrics,
        compareWithPreviousPeriod,
    } = useEcommerceAnalytics(user?.uid || '', storeId);

    // Calculate comparison
    const comparison = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        switch (dateRange) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
        }

        return compareWithPreviousPeriod(startDate, now);
    }, [dateRange, compareWithPreviousPeriod]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatPercentage = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    };

    // Order status data for pie chart
    const orderStatusData = useMemo(() => {
        return [
            { name: 'Pendientes', value: ordersByStatus.pending || 0, color: '#f59e0b' },
            { name: 'Pagados', value: ordersByStatus.paid || 0, color: '#22c55e' },
            { name: 'Enviados', value: ordersByStatus.shipped || 0, color: '#8b5cf6' },
            { name: 'Entregados', value: ordersByStatus.delivered || 0, color: '#06b6d4' },
            { name: 'Cancelados', value: ordersByStatus.cancelled || 0, color: '#ef4444' },
        ].filter(item => item.value > 0);
    }, [ordersByStatus]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin" style={{ color: theme.primary }} size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.analytics', 'Analytics')}
                    </h2>
                    <p className="text-muted-foreground">
                        {t('ecommerce.analyticsSubtitle', 'Métricas y rendimiento de tu tienda')}
                    </p>
                </div>

                {/* Date Range Selector */}
                <div className="flex items-center gap-2 bg-card/50 rounded-lg p-1">
                    {(['7d', '30d', '90d', '1y'] as DateRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${dateRange === range
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {range === '7d' && '7 días'}
                            {range === '30d' && '30 días'}
                            {range === '90d' && '90 días'}
                            {range === '1y' && '1 año'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title={t('ecommerce.revenue', 'Ingresos')}
                    value={formatCurrency(comparison.currentRevenue)}
                    change={comparison.revenueChange}
                    icon={DollarSign}
                    color="green"
                />
                <MetricCard
                    title={t('ecommerce.orders', 'Pedidos')}
                    value={comparison.currentOrders.toString()}
                    change={comparison.ordersChange}
                    icon={ShoppingCart}
                    color="blue"
                />
                <MetricCard
                    title={t('ecommerce.customers', 'Clientes')}
                    value={totalCustomers.toString()}
                    icon={Users}
                    color="purple"
                />
                <MetricCard
                    title={t('ecommerce.avgOrderValue', 'Ticket Promedio')}
                    value={formatCurrency(averageOrderValue)}
                    icon={TrendingUp}
                    color="primary"
                    themeColor={theme.primary}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        {t('ecommerce.revenueOverTime', 'Ingresos en el Tiempo')}
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueByDay.slice(-30)}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="day"
                                    stroke="#9ca3af"
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return `${date.getDate()}/${date.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis stroke="#9ca3af" tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#6366f1"
                                    fill="url(#colorRevenue)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders by Status */}
                <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        {t('ecommerce.ordersByStatus', 'Pedidos por Estado')}
                    </h3>
                    <div className="h-64">
                        {orderStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={orderStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {orderStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                {t('ecommerce.noOrdersYet', 'No hay pedidos aún')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Products & Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        {t('ecommerce.topProducts', 'Productos Más Vendidos')}
                    </h3>
                    {topProducts.length > 0 ? (
                        <div className="space-y-3">
                            {topProducts.slice(0, 5).map((product, index) => (
                                <div key={product.productId} className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-primary/20 text-primary shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-foreground font-medium truncate">{product.productName}</p>
                                        <p className="text-muted-foreground text-sm">{product.totalSold} vendidos</p>
                                    </div>
                                    <p className="text-green-400 font-semibold">
                                        {formatCurrency(product.revenue)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">
                            {t('ecommerce.noSalesYet', 'No hay ventas aún')}
                        </p>
                    )}
                </div>

                {/* Top Customers */}
                <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        {t('ecommerce.topCustomers', 'Mejores Clientes')}
                    </h3>
                    {topCustomers.length > 0 ? (
                        <div className="space-y-3">
                            {topCustomers.slice(0, 5).map((customer, index) => (
                                <div key={customer.customerId} className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-foreground font-medium truncate">{customer.name}</p>
                                        <p className="text-muted-foreground text-sm">{customer.totalOrders} pedidos</p>
                                    </div>
                                    <p className="text-green-400 font-semibold">
                                        {formatCurrency(customer.totalSpent)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">
                            {t('ecommerce.noCustomersYet', 'No hay clientes aún')}
                        </p>
                    )}
                </div>
            </div>

            {/* Conversion Metrics */}
            <div className="bg-card/50 rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    {t('ecommerce.conversionMetrics', 'Métricas de Conversión')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold text-foreground">{conversionMetrics.paidOrders}</p>
                        <p className="text-sm text-muted-foreground">{t('ecommerce.paidOrders', 'Pedidos Pagados')}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold text-yellow-400">{conversionMetrics.pendingOrders}</p>
                        <p className="text-sm text-muted-foreground">{t('ecommerce.pendingOrders', 'Pendientes')}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold text-red-400">{conversionMetrics.cancelledOrders}</p>
                        <p className="text-sm text-muted-foreground">{t('ecommerce.cancelledOrders', 'Cancelados')}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold text-green-400">
                            {conversionMetrics.conversionRate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">{t('ecommerce.conversionRate', 'Tasa de Conversión')}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-3xl font-bold text-orange-400">
                            {conversionMetrics.cancellationRate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">{t('ecommerce.cancellationRate', 'Tasa de Cancelación')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Metric Card Component
interface MetricCardProps {
    title: string;
    value: string;
    change?: number;
    icon: React.ElementType;
    color: 'green' | 'blue' | 'purple' | 'primary';
    themeColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color, themeColor }) => {
    const colorClasses: Record<string, string> = {
        green: 'bg-green-500/20 text-green-400',
        blue: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
        primary: 'bg-primary/20 text-primary',
    };

    return (
        <div className="bg-card/50 rounded-xl p-6 border border-border">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-muted-foreground text-sm">{title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                    {change !== undefined && (
                        <div
                            className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}
                        >
                            {change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(change).toFixed(1)}% vs período anterior
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.primary}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;
