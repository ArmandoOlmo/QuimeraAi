import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DollarSign, TrendingUp, TrendingDown, Users,
    Activity, Crown, Wallet, BarChart3,
    RefreshCw, Menu, Calendar, PieChart as PieChartIcon,
    Building2, Zap, CloudDownload
} from 'lucide-react';
import {
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    startOfMonth, endOfMonth, subMonths, format
} from 'date-fns';
import { es } from 'date-fns/locale';
import QuimeraLoader from '@/components/ui/QuimeraLoader';
import { Tenant } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import { fetchBillingData } from '../../../data/mockBillingData';
import { BillingData } from '../../../types';
import { useAdmin } from '../../../contexts/admin';
import { getAuth } from 'firebase/auth';
import HeaderBackButton from '../../ui/HeaderBackButton';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FinancialDashboardProps {
    onBack: () => void;
}

type DatePreset = 'thisMonth' | 'lastMonth' | 'last90Days' | 'thisYear' | 'all';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
    free: '#6b7280', starter: '#06b6d4', básico: '#3b82f6', basic: '#3b82f6',
    profesional: '#8b5cf6', professional: '#8b5cf6', pro: '#8b5cf6', individual: '#4f46e5',
    avanzado: '#4f46e5', advanced: '#4f46e5', agencia: '#ec4899', agency: '#ec4899',
    'agency starter': '#06b6d4', 'agency pro': '#8b5cf6', 'agency scale': '#4f46e5',
    enterprise: '#f59e0b', custom: '#10b981',
};
const FALLBACK_COLORS = ['#4f46e5', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];
const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400', trial: 'bg-amber-500/20 text-amber-400',
    suspended: 'bg-red-500/20 text-red-400', expired: 'bg-gray-500/20 text-gray-400',
    cancelled: 'bg-gray-500/20 text-gray-400',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, isPositiveTrend }: {
    title: string; value: string; icon: any; trend?: string; trendLabel?: string; isPositiveTrend?: boolean;
}) => (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-5 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 ease-out">
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
    const { tenants, fetchTenants } = useAdmin();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [datePreset, setDatePreset] = useState<DatePreset>('thisYear');
    const [stripeData, setStripeData] = useState<BillingData | null>(null);
    const [stripeLoaded, setStripeLoaded] = useState(false);

    // ─── Data Loading ────────────────────────────────────────────────────────

    const loadAllData = async () => {
        setLoading(true);
        try {
            // Fetch tenants from admin context and Stripe data in parallel
            const [, billing] = await Promise.all([
                fetchTenants(),
                fetchBillingData().catch(err => {
                    console.warn('Stripe API failed, using Firestore fallback:', err);
                    return null;
                }),
            ]);
            if (billing && (billing.mrr > 0 || billing.activeSubscriptions > 0 || billing.revenueTrend?.some(r => r.revenue > 0))) {
                setStripeData(billing);
                setStripeLoaded(true);
            }
        } catch (error) {
            console.error('Error loading financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAllData(); }, []);

    const syncBilling = async () => {
        setSyncing(true);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');
            const token = await user.getIdToken();
            const res = await fetch('https://us-central1-quimeraai.cloudfunctions.net/syncBillingToFirestore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            console.log('[Sync Billing] Result:', data);
            // Reload all data after sync
            await loadAllData();
        } catch (error) {
            console.error('[Sync Billing] Error:', error);
        } finally {
            setSyncing(false);
        }
    };

    // ─── Tenant Stats (always from Firestore via useAdmin) ───────────────────

    const getCreatedDate = (tenant: Tenant): Date => {
        if (!tenant.createdAt) return new Date(2024, 0, 1);
        if (typeof tenant.createdAt === 'string') return new Date(tenant.createdAt);
        if (typeof tenant.createdAt === 'object' && 'seconds' in tenant.createdAt) {
            return new Date(tenant.createdAt.seconds * 1000);
        }
        return new Date(2024, 0, 1);
    };

    const activeTenants = useMemo(
        () => tenants.filter(t => t.status === 'active' || t.status === 'trial'),
        [tenants]
    );

    const paidTenants = useMemo(
        () => tenants.filter(t => {
            const plan = (t.subscriptionPlan || 'free').toLowerCase();
            return plan !== 'free' && (t.status === 'active' || t.status === 'trial');
        }),
        [tenants]
    );

    // Plan distribution from Firestore (always available)
    const firestorePlanDist = useMemo(() => {
        const dist: Record<string, number> = {};
        tenants.forEach(t => {
            const plan = (t.subscriptionPlan || 'free');
            dist[plan] = (dist[plan] || 0) + 1;
        });
        return Object.entries(dist)
            .filter(([, count]) => count > 0)
            .map(([plan, count], idx) => ({
                name: plan.charAt(0).toUpperCase() + plan.slice(1),
                value: count,
                fill: PLAN_COLORS[plan.toLowerCase()] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);
    }, [tenants]);

    // MRR from Firestore tenants
    const firestoreMRR = useMemo(
        () => tenants.reduce((sum, t) => sum + (t.billingInfo?.mrr || 0), 0),
        [tenants]
    );

    // Tenant growth over time
    const tenantGrowth = useMemo(() => {
        const data: { month: string; newTenants: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const mStart = startOfMonth(monthDate);
            const mEnd = endOfMonth(monthDate);
            const label = format(monthDate, 'MMM yy', { locale: es });
            const newCount = tenants.filter(t => {
                const created = getCreatedDate(t);
                return created >= mStart && created <= mEnd;
            }).length;
            data.push({ month: label, newTenants: newCount });
        }
        return data;
    }, [tenants]);

    const recentTenants = useMemo(() =>
        [...tenants].sort((a, b) => getCreatedDate(b).getTime() - getCreatedDate(a).getTime()).slice(0, 10),
        [tenants]
    );

    // ─── Final values: Stripe > Firestore fallback ──────────────────────────

    const mrr = stripeLoaded ? stripeData!.mrr : firestoreMRR;
    const activeSubscriptions = stripeLoaded ? stripeData!.activeSubscriptions : paidTenants.length;
    const arpu = stripeLoaded ? stripeData!.arpu : (paidTenants.length > 0 ? firestoreMRR / paidTenants.length : 0);
    const revenueTrend = stripeLoaded ? stripeData!.revenueTrend : [];

    const conversionRate = activeTenants.length > 0
        ? Math.round((paidTenants.length / activeTenants.length) * 100) : 0;

    // Pie data: Stripe plan distribution if available, else Firestore counts
    const pieData = useMemo(() => {
        if (stripeLoaded && stripeData!.planDistribution?.length > 0) {
            return stripeData!.planDistribution.map((p, idx) => ({
                name: p.planName,
                value: p.subscribers,
                fill: p.color || PLAN_COLORS[p.planName.toLowerCase()] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
            }));
        }
        return firestorePlanDist;
    }, [stripeLoaded, stripeData, firestorePlanDist]);

    // ─── Period filter ───────────────────────────────────────────────────────

    const datePresets: { id: DatePreset; label: string }[] = [
        { id: 'thisMonth', label: t('superadmin.financesDetail.thisMonth', 'Este Mes') },
        { id: 'lastMonth', label: t('superadmin.financesDetail.lastMonth', 'Mes Pasado') },
        { id: 'last90Days', label: t('superadmin.financesDetail.last90Days', '90 Días') },
        { id: 'thisYear', label: t('superadmin.financesDetail.thisYear', 'Este Año') },
        { id: 'all', label: t('superadmin.financesDetail.allTime', 'Todo') },
    ];

    const monthsToShow: Record<DatePreset, number> = {
        thisMonth: 1, lastMonth: 2, last90Days: 3, thisYear: 12, all: 12,
    };

    const filteredRevenueTrend = useMemo(() =>
        datePreset === 'all' ? revenueTrend : revenueTrend.slice(-monthsToShow[datePreset]),
        [revenueTrend, datePreset]
    );

    const filteredTenantGrowth = useMemo(() =>
        datePreset === 'all' ? tenantGrowth : tenantGrowth.slice(-monthsToShow[datePreset]),
        [tenantGrowth, datePreset]
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
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-foreground">${mrr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        <button
                            onClick={syncBilling}
                            disabled={syncing || loading}
                            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            title="Sync Stripe → Firestore"
                        >
                            <CloudDownload size={14} className={syncing ? 'animate-bounce' : ''} />
                            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                        </button>
                        <button onClick={loadAllData} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <HeaderBackButton onClick={onBack} />
                    </div>
                </header>

                {/* ── Period Selector ─────────────────────────────────────── */}
                <div className="flex items-center gap-1 border-b border-border px-3 sm:px-6 py-2 bg-card/50 z-10 overflow-x-auto">
                    <Calendar className="w-4 h-4 text-muted-foreground mr-1 shrink-0" />
                    {datePresets.map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => setDatePreset(preset.id)}
                            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${datePreset === preset.id
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${stripeLoaded ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                        <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                            {stripeLoaded ? 'Stripe' : 'Firestore'}
                        </span>
                    </div>
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
                                    title={t('superadmin.arpu')}
                                    value={`$${arpu.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    icon={Activity}
                                    trendLabel={t('superadmin.financesDetail.avgRevenue', 'Ingreso promedio por usuario')}
                                />
                                <StatCard
                                    title={t('superadmin.financesDetail.conversionRate', 'Conversión')}
                                    value={`${conversionRate}%`}
                                    icon={TrendingUp}
                                    trendLabel={`${paidTenants.length} ${t('superadmin.financesDetail.paidVsFree', 'de pago')} / ${activeTenants.length} total`}
                                />
                            </div>

                            {/* ── Charts Row ──────────────────────────────────── */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">

                                {/* Revenue Over Time (AreaChart) — only if Stripe data */}
                                <div className="xl:col-span-2">
                                    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-6">
                                        <h3 className="font-bold text-base sm:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-primary" />
                                            {stripeLoaded
                                                ? t('superadmin.financesDetail.mrrOverTime', 'Ingresos por Mes (Stripe)')
                                                : t('superadmin.financesDetail.tenantGrowth', 'Crecimiento de Clientes')
                                            }
                                        </h3>
                                        <div className="h-[250px] sm:h-[300px] w-full">
                                            {stripeLoaded && filteredRevenueTrend.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={filteredRevenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                        <XAxis dataKey="month" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                                        <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Ingresos" animationDuration={1500} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                /* Fallback: show tenant growth as BarChart if no Stripe */
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={filteredTenantGrowth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                        <XAxis dataKey="month" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                                        <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                                                        <Tooltip content={<CustomTooltip prefix="" />} />
                                                        <Bar dataKey="newTenants" fill="#4f46e5" radius={[6, 6, 0, 0]} name={t('superadmin.financesDetail.newClients', 'Nuevos Clientes')} animationDuration={1200} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Plan Distribution (PieChart) — always from tenants */}
                                <div className="xl:col-span-1">
                                    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-6 h-full">
                                        <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                                            <PieChartIcon className="w-5 h-5 text-primary" />
                                            {t('superadmin.financesDetail.revenueByPlan', 'Distribución por Plan')}
                                        </h3>
                                        {pieData.length > 0 ? (
                                            <>
                                                <div className="h-[170px] sm:h-[180px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" animationDuration={1200}>
                                                                {pieData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip content={<CustomTooltip prefix="" />} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="space-y-2 mt-2">
                                                    {pieData.map((item) => {
                                                        const total = pieData.reduce((s, p) => s + p.value, 0);
                                                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                                                        return (
                                                            <div key={item.name} className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                                                                    <span className="font-medium text-foreground truncate">{item.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="font-bold text-foreground">{item.value}</span>
                                                                    <span className="text-xs text-muted-foreground">{pct}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm italic">
                                                {t('superadmin.financesDetail.noData', 'Sin datos')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Second Row: Tenant Growth + Recent Table ────── */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">

                                {/* Tenant Growth (BarChart) */}
                                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-6">
                                    <h3 className="font-bold text-base sm:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        {t('superadmin.financesDetail.tenantGrowth', 'Crecimiento de Clientes')}
                                    </h3>
                                    <div className="h-[220px] sm:h-[260px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={filteredTenantGrowth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="month" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                                                <Tooltip content={<CustomTooltip prefix="" />} />
                                                <Bar dataKey="newTenants" fill="#4f46e5" radius={[6, 6, 0, 0]} name={t('superadmin.financesDetail.newClients', 'Nuevos Clientes')} animationDuration={1200} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Recent Tenants Table */}
                                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-card/70 backdrop-blur-xl p-4 sm:p-6">
                                    <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        {t('superadmin.financesDetail.recentClients', 'Clientes Recientes')}
                                        <span className="text-xs text-muted-foreground font-normal ml-auto">{tenants.length} total</span>
                                    </h3>
                                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                                        <table className="w-full text-sm min-w-[380px]">
                                            <thead>
                                                <tr className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                                                    <th className="text-left py-2 pl-4 sm:pl-0 pr-2">{t('superadmin.financesDetail.name', 'Nombre')}</th>
                                                    <th className="text-left py-2 pr-2">{t('superadmin.financesDetail.plan', 'Plan')}</th>
                                                    <th className="text-left py-2 pr-2">Tipo</th>
                                                    <th className="text-center py-2 pr-4 sm:pr-0">{t('superadmin.financesDetail.status', 'Estado')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recentTenants.map(tenant => (
                                                    <tr key={tenant.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                                                        <td className="py-2.5 pl-4 sm:pl-0 pr-2">
                                                            <div className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                                                                {tenant.name || tenant.companyName || tenant.email || 'Sin nombre'}
                                                            </div>
                                                            <div className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[180px]">
                                                                {tenant.email || tenant.id}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 pr-2">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-secondary/50 text-foreground capitalize">
                                                                {tenant.subscriptionPlan || 'free'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-2">
                                                            <span className="text-xs text-muted-foreground capitalize">
                                                                {tenant.type || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-4 sm:pr-0 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${STATUS_COLORS[tenant.status] || STATUS_COLORS.expired}`}>
                                                                {tenant.status || 'unknown'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {recentTenants.length === 0 && (
                                                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground italic">{t('superadmin.financesDetail.noClients', 'No hay clientes registrados')}</td></tr>
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
