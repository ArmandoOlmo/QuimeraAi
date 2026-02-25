import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DollarSign, TrendingUp, TrendingDown, Users, ArrowUpRight,
    Activity, Crown, Wallet, BarChart3, Receipt, ArrowLeft,
    RefreshCw, Menu, Calendar, Filter, PieChart as PieChartIcon,
    Building2, Zap
} from 'lucide-react';
import {
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear,
    subDays, endOfDay, format
} from 'date-fns';
import { es } from 'date-fns/locale';
import { db, collection, getDocs } from '../../../firebase';
import QuimeraLoader from '@/components/ui/QuimeraLoader';
import { Tenant } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FinancialDashboardProps {
    onBack: () => void;
}

interface FinancialStats {
    totalMRR: number;
    previousMRR: number;
    activePaidSubscribers: number;
    previousPaidSubscribers: number;
    totalActiveTenants: number;
    previousActiveTenants: number;
    planDistribution: Record<string, { count: number; mrr: number }>;
    mrrOverTime: { month: string; mrr: number }[];
    tenantGrowth: { month: string; newTenants: number }[];
    recentTenants: Tenant[];
}

type DatePreset = 'thisMonth' | 'lastMonth' | 'last90Days' | 'thisYear' | 'all';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
    free: '#6b7280',
    starter: '#06b6d4',
    básico: '#3b82f6',
    basic: '#3b82f6',
    profesional: '#8b5cf6',
    professional: '#8b5cf6',
    pro: '#8b5cf6',
    avanzado: '#4f46e5',
    advanced: '#4f46e5',
    agencia: '#ec4899',
    agency: '#ec4899',
    enterprise: '#f59e0b',
    custom: '#10b981',
};

const FALLBACK_COLORS = ['#4f46e5', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400',
    trial: 'bg-amber-500/20 text-amber-400',
    suspended: 'bg-red-500/20 text-red-400',
    expired: 'bg-gray-500/20 text-gray-400',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: StatCard (matches existing app pattern)
// ─────────────────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, isPositiveTrend }: {
    title: string;
    value: string;
    icon: any;
    trend?: string;
    trendLabel?: string;
    isPositiveTrend?: boolean;
}) => (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 ease-out">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-15 dark:opacity-10 blur-2xl bg-gradient-to-br from-primary to-primary/60 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
        <div className="relative z-10 flex justify-between items-start mb-3">
            <div className="p-2 bg-primary/20 rounded-lg">
                <Icon size={20} className="text-primary" />
            </div>
            {trend && (
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isPositiveTrend ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                    {isPositiveTrend ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trend}
                </span>
            )}
        </div>
        <div className="relative z-10 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold text-foreground">{value}</h3>
            {trendLabel && <p className="text-xs text-muted-foreground">{trendLabel}</p>}
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, prefix = '$' }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl px-4 py-3 shadow-xl">
            <p className="text-xs text-[#94a3b8] mb-1 font-medium">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
                    {entry.name}: {prefix}{Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </p>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [datePreset, setDatePreset] = useState<DatePreset>('thisYear');
    const [allTenants, setAllTenants] = useState<Tenant[]>([]);

    // ─── Data Loading ────────────────────────────────────────────────────────

    const loadFinancialData = async () => {
        setLoading(true);
        try {
            const tenantsSnap = await getDocs(collection(db, 'tenants'));
            const tenants = tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
            setAllTenants(tenants);
        } catch (error) {
            console.error('Error loading financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFinancialData();
    }, []);

    // ─── Date Range Logic ────────────────────────────────────────────────────

    const dateRange = useMemo(() => {
        const now = new Date();
        switch (datePreset) {
            case 'thisMonth':
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case 'lastMonth': {
                const lm = subMonths(now, 1);
                return { start: startOfMonth(lm), end: endOfMonth(lm) };
            }
            case 'last90Days':
                return { start: subDays(now, 90), end: endOfDay(now) };
            case 'thisYear':
                return { start: startOfYear(now), end: endOfYear(now) };
            case 'all':
            default:
                return { start: new Date(2020, 0, 1), end: endOfDay(now) };
        }
    }, [datePreset]);

    const previousDateRange = useMemo(() => {
        const now = new Date();
        switch (datePreset) {
            case 'thisMonth': {
                const lm = subMonths(now, 1);
                return { start: startOfMonth(lm), end: endOfMonth(lm) };
            }
            case 'lastMonth': {
                const prev = subMonths(now, 2);
                return { start: startOfMonth(prev), end: endOfMonth(prev) };
            }
            case 'last90Days':
                return { start: subDays(now, 180), end: subDays(now, 91) };
            case 'thisYear': {
                const ly = subMonths(now, 12);
                return { start: startOfYear(ly), end: endOfYear(ly) };
            }
            case 'all':
            default:
                return null;
        }
    }, [datePreset]);

    // ─── Computed Stats ──────────────────────────────────────────────────────

    const stats = useMemo((): FinancialStats => {
        const activeTenants = allTenants.filter(t => t.status === 'active' || t.status === 'trial');

        // Helper to parse tenant creation timestamp
        const getCreatedDate = (tenant: Tenant): Date => {
            if (!tenant.createdAt) return new Date(2024, 0, 1);
            if (typeof tenant.createdAt === 'string') return new Date(tenant.createdAt);
            return new Date(tenant.createdAt.seconds * 1000);
        };

        // Current period aggregation
        let totalMRR = 0;
        let activePaidSubscribers = 0;
        const planDistribution: Record<string, { count: number; mrr: number }> = {};

        activeTenants.forEach(tenant => {
            const plan = (tenant.subscriptionPlan || 'free').toLowerCase();
            const mrr = tenant.billingInfo?.mrr || 0;

            if (mrr > 0 || (plan !== 'free')) {
                activePaidSubscribers++;
                totalMRR += mrr;
            }

            if (!planDistribution[plan]) {
                planDistribution[plan] = { count: 0, mrr: 0 };
            }
            planDistribution[plan].count++;
            planDistribution[plan].mrr += mrr;
        });

        // Previous period (for trend %)
        let previousMRR = 0;
        let previousPaidSubscribers = 0;
        let previousActiveTenants = 0;

        if (previousDateRange) {
            allTenants.forEach(tenant => {
                const created = getCreatedDate(tenant);
                if (created <= previousDateRange.end) {
                    previousActiveTenants++;
                    const mrr = tenant.billingInfo?.mrr || 0;
                    const plan = (tenant.subscriptionPlan || 'free').toLowerCase();
                    if (mrr > 0 || plan !== 'free') {
                        previousPaidSubscribers++;
                        previousMRR += mrr;
                    }
                }
            });
        }

        // MRR Over Time — last 12 months
        const mrrOverTime: { month: string; mrr: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const monthEnd = endOfMonth(monthDate);
            const label = format(monthDate, 'MMM yy', { locale: es });

            let monthMRR = 0;
            activeTenants.forEach(tenant => {
                const created = getCreatedDate(tenant);
                if (created <= monthEnd) {
                    monthMRR += tenant.billingInfo?.mrr || 0;
                }
            });

            mrrOverTime.push({ month: label, mrr: monthMRR });
        }

        // Tenant Growth — new tenants per month (last 12)
        const tenantGrowth: { month: string; newTenants: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const mStart = startOfMonth(monthDate);
            const mEnd = endOfMonth(monthDate);
            const label = format(monthDate, 'MMM yy', { locale: es });

            const newCount = allTenants.filter(t => {
                const created = getCreatedDate(t);
                return created >= mStart && created <= mEnd;
            }).length;

            tenantGrowth.push({ month: label, newTenants: newCount });
        }

        // Recent tenants
        const recentTenants = [...allTenants]
            .sort((a, b) => {
                const da = getCreatedDate(a).getTime();
                const db2 = getCreatedDate(b).getTime();
                return db2 - da;
            })
            .slice(0, 10);

        return {
            totalMRR,
            previousMRR,
            activePaidSubscribers,
            previousPaidSubscribers,
            totalActiveTenants: activeTenants.length,
            previousActiveTenants,
            planDistribution,
            mrrOverTime,
            tenantGrowth,
            recentTenants,
        };
    }, [allTenants, dateRange, previousDateRange]);

    // ─── Derived Values ──────────────────────────────────────────────────────

    const arpu = stats.activePaidSubscribers > 0
        ? stats.totalMRR / stats.activePaidSubscribers
        : 0;

    const conversionRate = stats.totalActiveTenants > 0
        ? Math.round((stats.activePaidSubscribers / stats.totalActiveTenants) * 100)
        : 0;

    const mrrTrend = stats.previousMRR > 0
        ? `${(((stats.totalMRR - stats.previousMRR) / stats.previousMRR) * 100).toFixed(1)}%`
        : undefined;

    const subsTrend = stats.previousPaidSubscribers > 0
        ? `${(((stats.activePaidSubscribers - stats.previousPaidSubscribers) / stats.previousPaidSubscribers) * 100).toFixed(1)}%`
        : undefined;

    // Pie chart data
    const pieData = useMemo(() => {
        return Object.entries(stats.planDistribution)
            .filter(([, d]) => d.count > 0)
            .map(([plan, data], idx) => ({
                name: plan.charAt(0).toUpperCase() + plan.slice(1),
                value: data.mrr,
                count: data.count,
                fill: PLAN_COLORS[plan.toLowerCase()] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
            }));
    }, [stats.planDistribution]);

    // ─── Date Preset Options ─────────────────────────────────────────────────

    const datePresets: { id: DatePreset; label: string }[] = [
        { id: 'thisMonth', label: t('superadmin.finances.thisMonth', 'Este Mes') },
        { id: 'lastMonth', label: t('superadmin.finances.lastMonth', 'Mes Pasado') },
        { id: 'last90Days', label: t('superadmin.finances.last90Days', '90 Días') },
        { id: 'thisYear', label: t('superadmin.finances.thisYear', 'Este Año') },
        { id: 'all', label: t('superadmin.finances.allTime', 'Todo') },
    ];

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                <DashboardWaveRibbons className="absolute inset-x-0 top-28 h-72 z-0 pointer-events-none overflow-hidden" />

                {/* ── Header ─────────────────────────────────────────────── */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <DollarSign className="text-primary w-5 h-5" />
                            <h1 className="text-sm sm:text-lg font-semibold text-foreground">
                                {t('superadmin.finances', 'Finanzas & MRR')}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-3">
                        {/* Live MRR badge */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-foreground">
                                ${stats.totalMRR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        <button
                            onClick={loadFinancialData}
                            disabled={loading}
                            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onBack}
                            className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                </header>

                {/* ── Period Selector ─────────────────────────────────────── */}
                <div className="flex border-b border-border px-3 sm:px-6 bg-card/50 z-10">
                    <div className="flex items-center gap-1 py-2">
                        <Calendar className="w-4 h-4 text-muted-foreground mr-1" />
                        {datePresets.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => setDatePreset(preset.id)}
                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${datePreset === preset.id
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Main Content ────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <QuimeraLoader size="lg" />
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

                            {/* ── Hero Metric Cards ──────────────────────────── */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                                <StatCard
                                    title={t('superadmin.finances.totalMRR', 'MRR Total')}
                                    value={`$${stats.totalMRR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    icon={Wallet}
                                    trend={mrrTrend}
                                    isPositiveTrend={stats.totalMRR >= stats.previousMRR}
                                    trendLabel={t('superadmin.finances.projectedMonthly', 'Ingreso recurrente mensual')}
                                />
                                <StatCard
                                    title={t('superadmin.finances.paidSubs', 'Suscripciones')}
                                    value={stats.activePaidSubscribers.toString()}
                                    icon={Crown}
                                    trend={subsTrend}
                                    isPositiveTrend={stats.activePaidSubscribers >= stats.previousPaidSubscribers}
                                    trendLabel={`${stats.totalActiveTenants} ${t('superadmin.finances.totalActive', 'activos totales')}`}
                                />
                                <StatCard
                                    title="ARPU"
                                    value={`$${arpu.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    icon={Activity}
                                    trendLabel={t('superadmin.finances.avgRevenue', 'Ingreso promedio por usuario')}
                                />
                                <StatCard
                                    title={t('superadmin.finances.conversionRate', 'Conversión')}
                                    value={`${conversionRate}%`}
                                    icon={TrendingUp}
                                    trendLabel={t('superadmin.finances.paidVsFree', 'Pago vs gratuito')}
                                />
                            </div>

                            {/* ── Charts Row ──────────────────────────────────── */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                                {/* MRR Over Time (AreaChart) */}
                                <div className="xl:col-span-2">
                                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5 text-primary" />
                                                {t('superadmin.finances.mrrOverTime', 'MRR a lo largo del tiempo')}
                                            </h3>
                                        </div>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={stats.mrrOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                    <XAxis
                                                        dataKey="month"
                                                        stroke="#94a3b8"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 11 }}
                                                    />
                                                    <YAxis
                                                        stroke="#94a3b8"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 11 }}
                                                        tickFormatter={(v) => `$${v.toLocaleString()}`}
                                                    />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="mrr"
                                                        stroke="#4f46e5"
                                                        strokeWidth={3}
                                                        fillOpacity={1}
                                                        fill="url(#colorMRR)"
                                                        name="MRR"
                                                        animationDuration={1500}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue by Plan (Donut PieChart) */}
                                <div className="xl:col-span-1">
                                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-6 h-full">
                                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                            <PieChartIcon className="w-5 h-5 text-primary" />
                                            {t('superadmin.finances.revenueByPlan', 'Ingresos por Plan')}
                                        </h3>
                                        {pieData.length > 0 ? (
                                            <>
                                                <div className="h-[180px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={pieData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={50}
                                                                outerRadius={75}
                                                                paddingAngle={4}
                                                                dataKey="value"
                                                                animationDuration={1200}
                                                            >
                                                                {pieData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                content={<CustomTooltip />}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                {/* Legend List */}
                                                <div className="space-y-2 mt-2">
                                                    {pieData
                                                        .sort((a, b) => b.value - a.value)
                                                        .map((item) => {
                                                            const pct = stats.totalMRR > 0
                                                                ? ((item.value / stats.totalMRR) * 100).toFixed(1)
                                                                : '0';
                                                            return (
                                                                <div key={item.name} className="flex items-center justify-between text-sm">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                                                                        <span className="font-medium text-foreground">{item.name}</span>
                                                                        <span className="text-xs text-muted-foreground">({item.count})</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-foreground">
                                                                            ${item.value.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">{pct}%</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm italic">
                                                {t('superadmin.finances.noData', 'Sin datos de planes')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Second Row: Tenant Growth + Recent Table ────── */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                                {/* Tenant Growth (BarChart) */}
                                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-6">
                                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        {t('superadmin.finances.tenantGrowth', 'Crecimiento de Clientes')}
                                    </h3>
                                    <div className="h-[260px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.tenantGrowth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis
                                                    dataKey="month"
                                                    stroke="#94a3b8"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11 }}
                                                />
                                                <YAxis
                                                    stroke="#94a3b8"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11 }}
                                                    allowDecimals={false}
                                                />
                                                <Tooltip content={<CustomTooltip prefix="" />} />
                                                <Bar
                                                    dataKey="newTenants"
                                                    fill="#4f46e5"
                                                    radius={[6, 6, 0, 0]}
                                                    name={t('superadmin.finances.newClients', 'Nuevos Clientes')}
                                                    animationDuration={1200}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Recent Tenants Table */}
                                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-6">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        {t('superadmin.finances.recentClients', 'Clientes Recientes')}
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                                                    <th className="text-left py-2 pr-3">{t('superadmin.finances.name', 'Nombre')}</th>
                                                    <th className="text-left py-2 pr-3">{t('superadmin.finances.plan', 'Plan')}</th>
                                                    <th className="text-right py-2 pr-3">MRR</th>
                                                    <th className="text-center py-2">{t('superadmin.finances.status', 'Estado')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.recentTenants.map(tenant => (
                                                    <tr key={tenant.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                                                        <td className="py-2.5 pr-3">
                                                            <div className="font-medium text-foreground truncate max-w-[150px]">
                                                                {tenant.name || tenant.companyName || tenant.email}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">{tenant.email}</div>
                                                        </td>
                                                        <td className="py-2.5 pr-3">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-secondary/50 text-foreground capitalize">
                                                                {tenant.subscriptionPlan || 'free'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-3 text-right font-bold text-foreground">
                                                            ${(tenant.billingInfo?.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-2.5 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[tenant.status] || STATUS_COLORS.expired}`}>
                                                                {tenant.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {stats.recentTenants.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="text-center py-8 text-muted-foreground italic">
                                                            {t('superadmin.finances.noClients', 'No hay clientes registrados')}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default FinancialDashboard;
