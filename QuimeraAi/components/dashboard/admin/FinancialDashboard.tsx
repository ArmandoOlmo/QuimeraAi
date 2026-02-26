import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DollarSign, TrendingUp, TrendingDown, Users, ArrowUpRight,
    Activity, Crown, Wallet, BarChart3, Receipt, ArrowLeft,
    RefreshCw, Menu, Calendar, PieChart as PieChartIcon,
    Building2, Zap
} from 'lucide-react';
import {
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    startOfMonth, endOfMonth, subMonths, format
} from 'date-fns';
import { es } from 'date-fns/locale';
import { db, collection, getDocs } from '../../../firebase';
import QuimeraLoader from '@/components/ui/QuimeraLoader';
import { Tenant } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import { fetchBillingData } from '../../../data/mockBillingData';
import { BillingData } from '../../../types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FinancialDashboardProps {
    onBack: () => void;
}

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
    individual: '#4f46e5',
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
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, isPositiveTrend }: {
    title: string;
    value: string;
    icon: any;
    trend?: string;
    trendLabel?: string;
    isPositiveTrend?: boolean;
}) => (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 ease-out">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-15 dark:opacity-10 blur-2xl bg-gradient-to-br from-primary to-primary/60 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
        <div className="relative z-10 flex justify-between items-start mb-3">
            <div className="p-2 bg-primary/20 rounded-lg">
                <Icon size={18} className="text-primary" />
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
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">{value}</h3>
            {trendLabel && <p className="text-[10px] sm:text-xs text-muted-foreground">{trendLabel}</p>}
        </div>
    </div>
);

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
    const [stripeData, setStripeData] = useState<BillingData | null>(null);
    const [allTenants, setAllTenants] = useState<Tenant[]>([]);

    // ─── Data Loading ────────────────────────────────────────────────────────

    const loadAllData = async () => {
        setLoading(true);
        try {
            // Fetch Stripe data (real revenue) and Firestore tenants in parallel
            const [billing, tenantsSnap] = await Promise.all([
                fetchBillingData(),
                getDocs(collection(db, 'tenants')),
            ]);
            setStripeData(billing);
            setAllTenants(tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
        } catch (error) {
            console.error('Error loading financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // ─── Derived from Firestore (tenant-level aggregation) ───────────────────

    const getCreatedDate = (tenant: Tenant): Date => {
        if (!tenant.createdAt) return new Date(2024, 0, 1);
        if (typeof tenant.createdAt === 'string') return new Date(tenant.createdAt);
        return new Date(tenant.createdAt.seconds * 1000);
    };

    const activeTenants = useMemo(
        () => allTenants.filter(t => t.status === 'active' || t.status === 'trial'),
        [allTenants]
    );

    const tenantGrowth = useMemo(() => {
        const data: { month: string; newTenants: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const mStart = startOfMonth(monthDate);
            const mEnd = endOfMonth(monthDate);
            const label = format(monthDate, 'MMM yy', { locale: es });
            const newCount = allTenants.filter(t => {
                const created = getCreatedDate(t);
                return created >= mStart && created <= mEnd;
            }).length;
            data.push({ month: label, newTenants: newCount });
        }
        return data;
    }, [allTenants]);

    const recentTenants = useMemo(() =>
        [...allTenants]
            .sort((a, b) => getCreatedDate(b).getTime() - getCreatedDate(a).getTime())
            .slice(0, 10),
        [allTenants]
    );

    // ─── Stripe-powered values ───────────────────────────────────────────────

    const mrr = stripeData?.mrr ?? 0;
    const activeSubscriptions = stripeData?.activeSubscriptions ?? 0;
    const arpu = stripeData?.arpu ?? 0;
    const churnRate = stripeData?.churnRate ?? 0;
    const revenueTrend = stripeData?.revenueTrend ?? [];
    const planDistribution = stripeData?.planDistribution ?? [];

    const conversionRate = activeTenants.length > 0
        ? Math.round((activeSubscriptions / activeTenants.length) * 100)
        : 0;

    // PieChart data from Stripe
    const pieData = useMemo(() =>
        planDistribution.map((p, idx) => ({
            name: p.planName,
            value: p.subscribers,
            fill: p.color || PLAN_COLORS[p.planName.toLowerCase()] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
        })),
        [planDistribution]
    );

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
                <DashboardWaveRibbons className="absolute inset-x-0 top-28 h-72 z-0 pointer-events-none overflow-hidden" />

                {/* ── Header ─────────────────────────────────────────────── */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
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
                                ${mrr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        <button
                            onClick={loadAllData}
                            disabled={loading}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onBack}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                </header>

                {/* ── Live data source indicator ──────────────────────────── */}
                <div className="flex items-center gap-2 px-3 sm:px-6 py-2 bg-card/50 border-b border-border z-10">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground font-medium">
                        {t('superadmin.financesDetail.liveStripe', 'Datos en vivo from Stripe')}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                        {activeTenants.length} {t('superadmin.financesDetail.totalActive', 'activos totales')} · {allTenants.length} total
                    </span>
                </div>

                {/* ── Main Content ────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-3 sm:p-6 relative z-10">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <QuimeraLoader size="lg" />
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500">

                            {/* ── Hero Metric Cards ──────────────────────────── */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                                <StatCard
                                    title={t('superadmin.financesDetail.totalMRR', 'MRR Total')}
                                    value={`$${mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    icon={Wallet}
                                    trendLabel={t('superadmin.financesDetail.projectedMonthly', 'Ingreso recurrente mensual')}
                                />
                                <StatCard
                                    title={t('superadmin.financesDetail.paidSubs', 'Suscripciones')}
                                    value={activeSubscriptions.toString()}
                                    icon={Crown}
                                    trendLabel={`${activeTenants.length} ${t('superadmin.financesDetail.totalActive', 'activos totales')}`}
                                />
                                <StatCard
                                    title="ARPU"
                                    value={`$${arpu.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    icon={Activity}
                                    trendLabel={t('superadmin.financesDetail.avgRevenue', 'Ingreso promedio por usuario')}
                                />
                                <StatCard
                                    title={t('superadmin.financesDetail.conversionRate', 'Conversión')}
                                    value={`${conversionRate}%`}
                                    icon={TrendingUp}
                                    trendLabel={t('superadmin.financesDetail.paidVsFree', 'Pago vs gratuito')}
                                />
                            </div>

                            {/* ── Charts Row ──────────────────────────────────── */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">

                                {/* Revenue Over Time from Stripe (AreaChart) */}
                                <div className="xl:col-span-2">
                                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-6">
                                        <h3 className="font-bold text-base sm:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-primary" />
                                            {t('superadmin.financesDetail.revenueOverTime', 'Ingresos por Mes (Stripe)')}
                                        </h3>
                                        <div className="h-[250px] sm:h-[300px] w-full">
                                            {revenueTrend.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
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
                                                            tickFormatter={(v) => `$${v}`}
                                                        />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="revenue"
                                                            stroke="#4f46e5"
                                                            strokeWidth={3}
                                                            fillOpacity={1}
                                                            fill="url(#colorRevenue)"
                                                            name={t('superadmin.financesDetail.revenue', 'Ingresos')}
                                                            animationDuration={1500}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
                                                    {t('superadmin.financesDetail.noData', 'Sin datos de planes')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Plan Distribution from Stripe (PieChart) */}
                                <div className="xl:col-span-1">
                                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-6 h-full">
                                        <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                                            <PieChartIcon className="w-5 h-5 text-primary" />
                                            {t('superadmin.financesDetail.revenueByPlan', 'Suscriptores por Plan')}
                                        </h3>
                                        {pieData.length > 0 ? (
                                            <>
                                                <div className="h-[170px] sm:h-[180px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={pieData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={45}
                                                                outerRadius={70}
                                                                paddingAngle={4}
                                                                dataKey="value"
                                                                animationDuration={1200}
                                                            >
                                                                {pieData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                content={<CustomTooltip prefix="" />}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="space-y-2 mt-2">
                                                    {pieData
                                                        .sort((a, b) => b.value - a.value)
                                                        .map((item) => (
                                                            <div key={item.name} className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                                                                    <span className="font-medium text-foreground truncate">{item.name}</span>
                                                                </div>
                                                                <span className="font-bold text-foreground ml-2">{item.value}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm italic">
                                                {t('superadmin.financesDetail.noData', 'Sin datos de planes')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Second Row: Tenant Growth + Recent Table ────── */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">

                                {/* Tenant Growth (BarChart) */}
                                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-6">
                                    <h3 className="font-bold text-base sm:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        {t('superadmin.financesDetail.tenantGrowth', 'Crecimiento de Clientes')}
                                    </h3>
                                    <div className="h-[220px] sm:h-[260px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={tenantGrowth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis
                                                    dataKey="month"
                                                    stroke="#94a3b8"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 10 }}
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
                                                    name={t('superadmin.financesDetail.newClients', 'Nuevos Clientes')}
                                                    animationDuration={1200}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Recent Tenants Table */}
                                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-6">
                                    <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        {t('superadmin.financesDetail.recentClients', 'Clientes Recientes')}
                                    </h3>
                                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                                        <table className="w-full text-sm min-w-[400px]">
                                            <thead>
                                                <tr className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                                                    <th className="text-left py-2 pl-4 sm:pl-0 pr-3">{t('superadmin.financesDetail.name', 'Nombre')}</th>
                                                    <th className="text-left py-2 pr-3">{t('superadmin.financesDetail.plan', 'Plan')}</th>
                                                    <th className="text-right py-2 pr-3">MRR</th>
                                                    <th className="text-center py-2 pr-4 sm:pr-0">{t('superadmin.financesDetail.status', 'Estado')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recentTenants.map(tenant => (
                                                    <tr key={tenant.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                                                        <td className="py-2.5 pl-4 sm:pl-0 pr-3">
                                                            <div className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                                                                {tenant.name || tenant.companyName || tenant.email}
                                                            </div>
                                                            <div className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[180px]">{tenant.email}</div>
                                                        </td>
                                                        <td className="py-2.5 pr-3">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-secondary/50 text-foreground capitalize">
                                                                {tenant.subscriptionPlan || 'free'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-3 text-right font-bold text-foreground text-xs sm:text-sm">
                                                            ${(tenant.billingInfo?.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-2.5 pr-4 sm:pr-0 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${STATUS_COLORS[tenant.status] || STATUS_COLORS.expired}`}>
                                                                {tenant.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {recentTenants.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="text-center py-8 text-muted-foreground italic">
                                                            {t('superadmin.financesDetail.noClients', 'No hay clientes registrados')}
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
