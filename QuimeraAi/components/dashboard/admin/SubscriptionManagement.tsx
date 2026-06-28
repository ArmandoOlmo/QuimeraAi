/**
 * Subscription Management - Super Admin
 * Dashboard completo para gestionar suscripciones y AI credits
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useAuth } from '../../../contexts/core/AuthContext';
import { supabase } from '../../../supabase';
import {
    Menu,
    Sparkles,
    Users,
    TrendingUp,
    TrendingDown,
    CreditCard,
    RefreshCw,
    AlertCircle,
    Search,
    Filter,
    Plus,
    ChevronRight,
    ChevronDown,
    Download,
    BarChart3,
    PieChart,
    Calendar,
    Clock,
    Zap,
    ImageIcon,
    MessageSquare,
    FileText,
    Crown,
    Gift,
    History,
    Settings,
    Eye,
    Edit,
    MoreVertical,
    Check,
    X,
    Archive,
    RotateCcw,
    DollarSign,
    Layers,
} from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';
import DashboardSidebar from '../DashboardSidebar';
import StatCard from './StatCard';
import UnifiedPlanEditor from './UnifiedPlanEditor';
import {
    SUBSCRIPTION_PLANS,
    AI_CREDIT_PACKAGES,
    AiCreditOperation,
    AiCreditsUsage,
    AiCreditTransaction,
    SubscriptionPlanId,
    getUsageColor,
    formatLimit,
} from '../../../types/subscription';
import { addCredits } from '../../../services/aiCreditsService';
import {
    getAllPlans,
    savePlan,
    archivePlan,
    restorePlan,
    initializePlansInSupabase,
    syncPlansFromHardcoded,
    getPlanStatistics,
    migrateToNewPlanStructure,
    isMigrationNeeded,
    StoredPlan,
    PlanStats,
} from '../../../services/plansService';
import AppSelect from '../../ui/AppSelect';

// =============================================================================
// TYPES
// =============================================================================

interface SubscriptionManagementProps {
    onBack: () => void;
}

interface TenantCreditsData {
    tenantId: string;
    tenantName: string;
    tenantSlug?: string;
    tenantEmail?: string;
    companyName?: string;
    tenantType?: string;
    tenantStatus?: string;
    ownerUserId?: string;
    ownerTenantId?: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    lastActiveAt?: string | null;
    planId: SubscriptionPlanId;
    subscriptionStatus?: string;
    billingCycle?: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    trialEndDate?: string | null;
    cancelAtPeriodEnd?: boolean;
    cancelledAt?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    hasSubscriptionRecord: boolean;
    creditsUsed: number;
    storedCreditsUsed: number;
    verifiedCreditsUsed: number;
    transactionCreditsAdded: number;
    transactionCount: number;
    usageVerificationStatus: 'verified' | 'mismatch' | 'untracked';
    usageVerificationDifference: number;
    creditsIncluded: number;
    creditsRemaining: number;
    creditsOverage: number;
    usagePercentage: number;
    usageByOperation: Record<string, number>;
    dailyUsage: Array<{ date: string; credits: number }>;
    recentTransactions: AiCreditTransaction[];
    projectCount: number;
    memberCount: number;
    lastActivity?: Date;
}

interface GlobalStats {
    totalTenants: number;
    totalCreditsUsed: number;
    totalCreditsAllocated: number;
    averageUsagePercentage: number;
    tenantsNearLimit: number;
    tenantsOverLimit: number;
    planDistribution: Partial<Record<SubscriptionPlanId, number>>;
    usageByOperation: Record<string, number>;
    dailyUsage: Array<{ date: string; credits: number }>;
}

type TimestampLike = { seconds: number; nanoseconds: number };

type SubscriptionUsageRow = {
    tenant_id: string;
    plan_id: string | null;
    billing_cycle: string | null;
    status: string | null;
    start_date: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_end_date: string | null;
    cancel_at_period_end: boolean | null;
    cancelled_at: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    add_ons: unknown;
    credit_packages_purchased: unknown;
    ai_credits_usage: Partial<AiCreditsUsage> | null;
    created_at: string | null;
    updated_at: string | null;
};

type TenantLookupRow = {
    id: string;
    name: string | null;
    slug: string | null;
    email: string | null;
    company_name: string | null;
    type: string | null;
    owner_user_id: string | null;
    owner_tenant_id: string | null;
    subscription_plan: string | null;
    status: string | null;
    limits: Record<string, any> | null;
    usage: Record<string, any> | null;
    billing: Record<string, any> | null;
    trial_ends_at: string | null;
    parent_credits_pool_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    last_active_at: string | null;
};

type AiCreditTransactionRow = {
    id: string;
    tenant_id: string | null;
    user_id: string | null;
    operation: string;
    credits_used: number | string | null;
    description: string | null;
    metadata: Record<string, any> | null;
    created_at: string | null;
};

type TenantScopedRow = {
    tenant_id: string | null;
};

const toTimestamp = (value: unknown): TimestampLike => {
    if (value && typeof value === 'object' && typeof (value as TimestampLike).seconds === 'number') {
        return {
            seconds: (value as TimestampLike).seconds,
            nanoseconds: Number((value as TimestampLike).nanoseconds) || 0,
        };
    }

    if (typeof value === 'string') {
        const time = Date.parse(value);
        if (Number.isFinite(time)) {
            return { seconds: Math.floor(time / 1000), nanoseconds: 0 };
        }
    }

    return { seconds: 0, nanoseconds: 0 };
};

const readNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDateTime = (value: string | TimestampLike | null | undefined): string => {
    const timestamp = toTimestamp(value);
    if (!timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString();
};

const formatDateRange = (start?: string | null, end?: string | null): string => {
    const startLabel = formatDateTime(start);
    const endLabel = formatDateTime(end);
    if (startLabel === 'N/A' && endLabel === 'N/A') return 'N/A';
    return `${startLabel} - ${endLabel}`;
};

const shortId = (value?: string | null): string => {
    if (!value) return 'N/A';
    return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
};

const normalizePlanIdForAdmin = (planId: string | null | undefined): SubscriptionPlanId => {
    return planId && planId in SUBSCRIPTION_PLANS ? planId as SubscriptionPlanId : 'free';
};

const normalizeUsageRecord = (
    usage: Partial<AiCreditsUsage> | null | undefined,
    planId: SubscriptionPlanId
): AiCreditsUsage => {
    const planLimit = SUBSCRIPTION_PLANS[planId]?.limits.maxAiCredits || 0;
    const creditsIncluded = readNumber(
        (usage as any)?.creditsIncluded ?? (usage as any)?.credits_included,
        planLimit
    );
    const creditsUsed = readNumber(
        (usage as any)?.creditsUsed ?? (usage as any)?.credits_used ?? (usage as any)?.used,
        0
    );
    const creditsRemaining = readNumber(
        (usage as any)?.creditsRemaining ?? (usage as any)?.credits_remaining ?? (usage as any)?.remaining,
        Math.max(0, creditsIncluded - creditsUsed)
    );

    return {
        tenantId: String((usage as any)?.tenantId ?? (usage as any)?.tenant_id ?? ''),
        periodStart: toTimestamp((usage as any)?.periodStart ?? (usage as any)?.period_start),
        periodEnd: toTimestamp((usage as any)?.periodEnd ?? (usage as any)?.period_end),
        creditsIncluded,
        creditsUsed,
        creditsRemaining,
        creditsOverage: readNumber((usage as any)?.creditsOverage ?? (usage as any)?.credits_overage, Math.max(0, creditsUsed - creditsIncluded)),
        usageByOperation: ((usage as any)?.usageByOperation ?? (usage as any)?.usage_by_operation ?? {}) as Record<AiCreditOperation, number>,
        dailyUsage: Array.isArray((usage as any)?.dailyUsage)
            ? (usage as any).dailyUsage
            : Array.isArray((usage as any)?.daily_usage)
                ? (usage as any).daily_usage
                : [],
        lastUpdated: toTimestamp((usage as any)?.lastUpdated ?? (usage as any)?.last_updated),
        parentTenantId: (usage as any)?.parentTenantId ?? (usage as any)?.parent_tenant_id,
        isAgencyPool: (usage as any)?.isAgencyPool ?? (usage as any)?.is_agency_pool,
        subClientsUsage: (usage as any)?.subClientsUsage ?? (usage as any)?.sub_clients_usage,
    };
};

const normalizeTransactionRow = (row: AiCreditTransactionRow): AiCreditTransaction => {
    const metadata = row.metadata || {};
    const creditsUsed = readNumber(row.credits_used, 0);

    return {
        id: row.id,
        tenantId: row.tenant_id || '',
        userId: row.user_id || '',
        operation: row.operation as AiCreditOperation,
        creditsUsed,
        description: row.description || undefined,
        model: metadata.model,
        tokensInput: metadata.tokensInput ?? metadata.tokens_input,
        tokensOutput: metadata.tokensOutput ?? metadata.tokens_output,
        timestamp: toTimestamp(row.created_at),
        metadata,
        type: creditsUsed < 0 ? 'credit' : 'debit',
        amount: -creditsUsed,
    };
};

const groupByTenant = <T extends { tenantId?: string; tenant_id?: string | null }>(rows: T[]): Map<string, T[]> => {
    const grouped = new Map<string, T[]>();
    for (const row of rows) {
        const tenantId = row.tenantId || row.tenant_id || '';
        if (!tenantId) continue;
        const current = grouped.get(tenantId) || [];
        current.push(row);
        grouped.set(tenantId, current);
    }
    return grouped;
};

const countByTenant = (rows: TenantScopedRow[]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const row of rows) {
        if (!row.tenant_id) continue;
        counts.set(row.tenant_id, (counts.get(row.tenant_id) || 0) + 1);
    }
    return counts;
};

const isTransactionInPeriod = (
    transaction: AiCreditTransaction,
    periodStart?: TimestampLike,
    periodEnd?: TimestampLike
): boolean => {
    const seconds = transaction.timestamp?.seconds || 0;
    if (!seconds) return false;
    if (periodStart?.seconds && seconds < periodStart.seconds) return false;
    if (periodEnd?.seconds && seconds > periodEnd.seconds) return false;
    return true;
};

const buildUsageFromTransactions = (
    transactions: AiCreditTransaction[],
    periodStart?: TimestampLike,
    periodEnd?: TimestampLike
) => {
    const scopedTransactions = transactions.filter((transaction) => isTransactionInPeriod(transaction, periodStart, periodEnd));
    const usageByOperation: Record<string, number> = {};
    const dailyUsageMap: Record<string, number> = {};
    let creditsUsed = 0;
    let creditsAdded = 0;

    for (const transaction of scopedTransactions) {
        const amount = readNumber(transaction.creditsUsed);
        if (amount > 0) {
            creditsUsed += amount;
            usageByOperation[transaction.operation] = (usageByOperation[transaction.operation] || 0) + amount;
            const date = new Date((transaction.timestamp?.seconds || 0) * 1000).toISOString().slice(0, 10);
            dailyUsageMap[date] = (dailyUsageMap[date] || 0) + amount;
        } else if (amount < 0) {
            creditsAdded += Math.abs(amount);
        }
    }

    return {
        creditsUsed,
        creditsAdded,
        transactionCount: scopedTransactions.length,
        usageByOperation,
        dailyUsage: Object.entries(dailyUsageMap)
            .map(([date, credits]) => ({ date, credits }))
            .sort((a, b) => a.date.localeCompare(b.date)),
    };
};

const mergeUsageBreakdown = (
    storedUsage: Record<string, number> | undefined,
    verifiedUsage: Record<string, number>
): Record<string, number> => {
    return Object.keys(verifiedUsage).length > 0 ? verifiedUsage : storedUsage || {};
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Gráfico de uso diario de credits
 */
const DailyUsageChart: React.FC<{ data: Array<{ date: string; credits: number }> }> = ({ data }) => {
    const { t } = useTranslation();
    const chartHeight = 200;
    const chartWidth = 600;
    const maxCredits = Math.max(...data.map(d => d.credits), 1);

    const barWidth = chartWidth / data.length - 4;

    return (
        <div className="bg-q-surface p-6 rounded-xl border border-q-border">
            <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-q-accent" />
                Uso Diario de AI Credits
            </h3>
            <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="min-w-[600px]">
                    {data.map((d, i) => {
                        const barHeight = (d.credits / maxCredits) * chartHeight;
                        const x = i * (barWidth + 4) + 2;
                        const y = chartHeight - barHeight;
                        const isToday = i === data.length - 1;

                        return (
                            <g key={i} className="group">
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    rx={4}
                                    fill="var(--editor-accent)"
                                    className={`${isToday ? 'opacity-100' : 'opacity-70'} group-hover:opacity-100 transition-opacity`}
                                />
                                <text
                                    x={x + barWidth / 2}
                                    y={chartHeight + 20}
                                    textAnchor="middle"
                                    className="text-[10px] fill-current text-q-text-secondary"
                                >
                                    {d.date.split('-').slice(1).join('/')}
                                </text>
                                {/* Tooltip on hover */}
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <rect
                                        x={x + barWidth / 2 - 30}
                                        y={y - 30}
                                        width={60}
                                        height={24}
                                        rx={4}
                                        fill="var(--editor-panel-bg)"
                                        stroke="var(--editor-border)"
                                    />
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 14}
                                        textAnchor="middle"
                                        className="text-xs font-semibold fill-current text-q-text"
                                    >
                                        {d.credits.toLocaleString()}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

/**
 * Gráfico de distribución por operación
 */
const OperationDistributionChart: React.FC<{ data: Record<string, number> }> = ({ data }) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);

    const operationLabels: Record<string, string> = {
        image_generation: 'Imágenes',
        image_generation_fast: 'Imágenes Rápidas',
        image_generation_ultra: 'Imágenes HD',
        chatbot_message: 'Chatbot',
        ai_assistant_request: 'Asistente IA',
        ai_assistant_complex: 'Asistente Complejo',
        content_generation: 'Contenido',
        onboarding_complete: 'Onboarding',
        design_plan: 'Design Plan',
        product_description: 'Productos',
        seo_optimization: 'SEO',
        email_generation: 'Emails',
        translation: 'Traducciones',
    };

    const operationColors: Record<string, string> = {
        image_generation: '#8b5cf6',
        image_generation_fast: '#a78bfa',
        image_generation_ultra: '#7c3aed',
        chatbot_message: '#10b981',
        ai_assistant_request: '#6366f1',
        ai_assistant_complex: '#4f46e5',
        content_generation: '#f59e0b',
        onboarding_complete: '#ec4899',
        design_plan: '#14b8a6',
        product_description: '#f97316',
        seo_optimization: '#06b6d4',
        email_generation: '#84cc16',
        translation: '#a855f7',
    };

    const sortedData = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    return (
        <div className="bg-q-surface p-6 rounded-xl border border-q-border">
            <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-q-accent" />
                Uso por Tipo de Operación
            </h3>
            <div className="space-y-3">
                {sortedData.map(([operation, count]) => {
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    const color = operationColors[operation] || '#6b7280';

                    return (
                        <div key={operation}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-q-text-secondary">
                                    {operationLabels[operation] || operation}
                                </span>
                                <span className="text-sm text-q-text font-medium">
                                    {count.toLocaleString()} ({percentage.toFixed(1)}%)
                                </span>
                            </div>
                            <div className="h-2 bg-q-surface-overlay rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: color,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Card de distribución de planes
 */
const PlanDistributionCard: React.FC<{
    planStats: Record<string, PlanStats>;
    plans: Record<string, StoredPlan>;
}> = ({ planStats, plans }) => {
    const total = Object.values(planStats).reduce((sum, stat) => sum + stat.activeSubscribers, 0);

    // Usar los planes cargados o fallback a SUBSCRIPTION_PLANS
    const plansToShow = Object.keys(plans).length > 0 ? plans : SUBSCRIPTION_PLANS;

    return (
        <div className="bg-q-surface p-6 rounded-xl border border-q-border">
            <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-q-accent" />
                Distribución de Planes
            </h3>
            <div className="space-y-3">
                {Object.entries(plansToShow).map(([planId, plan]) => {
                    const count = planStats[planId]?.activeSubscribers || 0;
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                        <div key={planId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: plan.color }}
                                />
                                <span className="text-sm text-q-text-secondary">{plan.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-q-text font-medium">{count}</span>
                                <span className="text-xs text-q-text-secondary w-12 text-right">
                                    {percentage.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-q-border flex items-center justify-between">
                <span className="text-sm text-q-text-secondary">Total Tenants</span>
                <span className="text-lg font-bold text-q-text">{total}</span>
            </div>
        </div>
    );
};

/**
 * Modal para agregar credits a un tenant
 */
const AddCreditsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tenant: TenantCreditsData | null;
    onAddCredits: (tenantId: string, credits: number, reason: string) => Promise<void>;
}> = ({ isOpen, onClose, tenant, onAddCredits }) => {
    const [credits, setCredits] = useState(100);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen || !tenant) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onAddCredits(tenant.tenantId, credits, reason);
            onClose();
        } catch (error) {
            console.error('Error adding credits:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-q-text/50 backdrop-blur-sm">
            <div className="bg-q-surface rounded-xl border border-q-border w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-q-text flex items-center gap-2">
                        <Gift className="w-5 h-5 text-q-accent" />
                        Agregar Credits
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-q-surface-overlay text-q-text-secondary hover:text-q-text transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-q-bg rounded-lg">
                    <p className="text-sm text-q-text-secondary">Tenant</p>
                    <p className="text-q-text font-medium">{tenant.tenantName}</p>
                    <p className="text-sm text-q-text-secondary mt-1">
                        Credits actuales: {tenant.creditsRemaining.toLocaleString()} / {tenant.creditsIncluded.toLocaleString()}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-q-text-secondary mb-2">
                            Cantidad de Credits
                        </label>
                        <div className="flex gap-2">
                            {[100, 500, 1000, 2000].map((amount) => (
                                <button
                                    key={amount}
                                    type="button"
                                    onClick={() => setCredits(amount)}
                                    className={`
                                        px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                        ${credits === amount
                                            ? 'bg-q-accent text-q-text-on-accent'
                                            : 'bg-q-surface-overlay text-q-text-secondary hover:bg-q-surface-overlay/80'
                                        }
                                    `}
                                >
                                    {amount}
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            value={credits}
                            onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
                            className="mt-2 w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:border-q-accent"
                            placeholder="O ingresa una cantidad personalizada"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-q-text-secondary mb-2">
                            Razón (opcional)
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 bg-q-bg border border-q-border rounded-lg text-q-text focus:outline-none focus:border-q-accent"
                            placeholder="Ej: Compensación por problema técnico"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg bg-q-surface-overlay text-q-text hover:bg-q-surface-overlay/80 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || credits <= 0}
                            className="flex-1 px-4 py-2 rounded-lg bg-q-accent text-q-text-on-accent hover:opacity-90 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Agregando...' : `Agregar ${credits} Credits`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TenantDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tenant: TenantCreditsData | null;
    onAddCredits: (tenant: TenantCreditsData) => void;
}> = ({ isOpen, onClose, tenant, onAddCredits }) => {
    if (!isOpen || !tenant) return null;

    const plan = SUBSCRIPTION_PLANS[tenant.planId] || SUBSCRIPTION_PLANS.free;
    const verificationConfig = {
        verified: {
            label: 'Uso verificado',
            className: 'bg-q-success/15 text-q-success border-q-success/30',
            description: 'El uso guardado cuadra con las transacciones del periodo.',
        },
        mismatch: {
            label: 'Diferencia detectada',
            className: 'bg-q-warning/15 text-q-warning border-q-warning/30',
            description: 'El uso guardado no cuadra exactamente con las transacciones del periodo.',
        },
        untracked: {
            label: 'Pendiente de sincronizar',
            className: 'bg-q-warning/15 text-q-warning border-q-warning/30',
            description: 'Hay consumo en el ledger de transacciones, pero la suscripción no tiene ese uso guardado todavía.',
        },
    }[tenant.usageVerificationStatus];

    const operationEntries = Object.entries(tenant.usageByOperation)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-q-text/50 backdrop-blur-sm p-4">
            <div className="bg-q-surface rounded-xl border border-q-border w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-q-border">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-q-text truncate">{tenant.tenantName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${verificationConfig.className}`}>
                                {verificationConfig.label}
                            </span>
                            {tenant.tenantStatus && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-q-bg text-q-text-secondary border border-q-border">
                                    {tenant.tenantStatus}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-q-text-secondary mt-1 truncate">
                            {tenant.companyName || tenant.tenantEmail || tenant.tenantSlug || 'Sin identificador comercial'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-q-surface-overlay text-q-text-secondary hover:text-q-text transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-84px)] p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <p className="text-xs text-q-text-secondary">Plan</p>
                            <p className="text-lg font-semibold text-q-text mt-1">{plan.name}</p>
                            <p className="text-xs text-q-text-secondary mt-1">{tenant.subscriptionStatus || 'Sin suscripción'}</p>
                        </div>
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <p className="text-xs text-q-text-secondary">Créditos usados</p>
                            <p className="text-lg font-semibold text-q-text mt-1">{tenant.creditsUsed.toLocaleString()}</p>
                            <p className="text-xs text-q-text-secondary mt-1">Verificado: {tenant.verifiedCreditsUsed.toLocaleString()}</p>
                        </div>
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <p className="text-xs text-q-text-secondary">Disponibles</p>
                            <p className="text-lg font-semibold text-q-text mt-1">{tenant.creditsRemaining.toLocaleString()}</p>
                            <p className="text-xs text-q-text-secondary mt-1">Incluidos: {tenant.creditsIncluded.toLocaleString()}</p>
                        </div>
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <p className="text-xs text-q-text-secondary">Uso</p>
                            <p className="text-lg font-semibold text-q-text mt-1">{tenant.usagePercentage}%</p>
                            <p className="text-xs text-q-text-secondary mt-1">Overage: {tenant.creditsOverage.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className={`rounded-lg border p-4 ${verificationConfig.className}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <p className="font-semibold">{verificationConfig.label}</p>
                                <p className="text-sm opacity-90">{verificationConfig.description}</p>
                            </div>
                            <div className="text-sm sm:text-right">
                                <p>Guardado: {tenant.storedCreditsUsed.toLocaleString()}</p>
                                <p>Ledger: {tenant.verifiedCreditsUsed.toLocaleString()}</p>
                                <p>Diferencia: {tenant.usageVerificationDifference.toLocaleString()}</p>
                            </div>
                        </div>
                        {!tenant.hasSubscriptionRecord && (
                            <p className="text-sm mt-3">
                                Este tenant no tiene fila de suscripción; el uso mostrado viene del ledger de transacciones y del límite del plan.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-q-accent" />
                                Identidad del Tenant
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-q-text-secondary">Nombre</p>
                                    <p className="text-q-text font-medium">{tenant.tenantName}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Slug</p>
                                    <p className="text-q-text font-medium">{tenant.tenantSlug || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Email</p>
                                    <p className="text-q-text font-medium">{tenant.tenantEmail || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Compañía</p>
                                    <p className="text-q-text font-medium">{tenant.companyName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Tipo</p>
                                    <p className="text-q-text font-medium">{tenant.tenantType || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Owner</p>
                                    <p className="text-q-text font-mono text-xs">{shortId(tenant.ownerUserId)}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Proyectos</p>
                                    <p className="text-q-text font-medium">{tenant.projectCount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Miembros</p>
                                    <p className="text-q-text font-medium">{tenant.memberCount.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-q-accent" />
                                Suscripción
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-q-text-secondary">Estado</p>
                                    <p className="text-q-text font-medium">{tenant.subscriptionStatus || 'Sin registro'}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Ciclo</p>
                                    <p className="text-q-text font-medium">{tenant.billingCycle || 'N/A'}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-q-text-secondary">Periodo actual</p>
                                    <p className="text-q-text font-medium">{formatDateRange(tenant.currentPeriodStart, tenant.currentPeriodEnd)}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Trial termina</p>
                                    <p className="text-q-text font-medium">{formatDateTime(tenant.trialEndDate)}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Cancelar al terminar</p>
                                    <p className="text-q-text font-medium">{tenant.cancelAtPeriodEnd ? 'Sí' : 'No'}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Stripe customer</p>
                                    <p className="text-q-text font-mono text-xs">{shortId(tenant.stripeCustomerId)}</p>
                                </div>
                                <div>
                                    <p className="text-q-text-secondary">Stripe subscription</p>
                                    <p className="text-q-text font-mono text-xs">{shortId(tenant.stripeSubscriptionId)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-q-accent" />
                                Uso por Operación
                            </h4>
                            <div className="space-y-3">
                                {operationEntries.map(([operation, credits]) => (
                                    <div key={operation}>
                                        <div className="flex justify-between gap-3 text-sm mb-1">
                                            <span className="text-q-text-secondary truncate">{operation}</span>
                                            <span className="text-q-text font-medium">{credits.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 bg-q-surface-overlay rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-q-accent"
                                                style={{ width: `${tenant.creditsUsed > 0 ? Math.min((credits / tenant.creditsUsed) * 100, 100) : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {operationEntries.length === 0 && (
                                    <p className="text-sm text-q-text-secondary">No hay operaciones de consumo registradas.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                                <History className="w-4 h-4 text-q-accent" />
                                Transacciones Recientes
                            </h4>
                            <div className="space-y-3">
                                {tenant.recentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-start justify-between gap-3 border-b border-q-border pb-3 last:border-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-q-text truncate">{transaction.description || transaction.operation}</p>
                                            <p className="text-xs text-q-text-secondary">{formatDateTime(transaction.timestamp)}</p>
                                        </div>
                                        <span className={`text-sm font-semibold ${transaction.creditsUsed < 0 ? 'text-q-success' : 'text-q-text'}`}>
                                            {transaction.creditsUsed < 0 ? '+' : '-'}{Math.abs(transaction.creditsUsed).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                                {tenant.recentTransactions.length === 0 && (
                                    <p className="text-sm text-q-text-secondary">No hay transacciones recientes.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <p className="text-q-text-secondary">Creado</p>
                            <p className="text-q-text font-medium">{formatDateTime(tenant.createdAt)}</p>
                        </div>
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <p className="text-q-text-secondary">Actualizado</p>
                            <p className="text-q-text font-medium">{formatDateTime(tenant.updatedAt)}</p>
                        </div>
                        <div className="bg-q-bg rounded-lg border border-q-border p-4">
                            <p className="text-q-text-secondary">Última actividad</p>
                            <p className="text-q-text font-medium">{tenant.lastActivity ? tenant.lastActivity.toLocaleString() : formatDateTime(tenant.lastActiveAt)}</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-q-surface-overlay text-q-text hover:bg-q-surface-overlay/80 transition-colors"
                        >
                            Cerrar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onAddCredits(tenant);
                                onClose();
                            }}
                            className="px-4 py-2 rounded-lg bg-q-accent text-q-text-on-accent hover:opacity-90 transition-colors inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar Credits
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Fila de tenant en la tabla
 */
const TenantRow: React.FC<{
    tenant: TenantCreditsData;
    onAddCredits: (tenant: TenantCreditsData) => void;
    onViewDetails: (tenant: TenantCreditsData) => void;
}> = ({ tenant, onAddCredits, onViewDetails }) => {
    const usageColor = getUsageColor(tenant.usagePercentage);
    const plan = SUBSCRIPTION_PLANS[tenant.planId] || SUBSCRIPTION_PLANS.free;
    const subtitle = tenant.companyName || tenant.tenantEmail || tenant.tenantSlug || shortId(tenant.tenantId);
    const verificationBadge = {
        verified: 'bg-q-success/10 text-q-success border-q-success/25',
        mismatch: 'bg-q-warning/10 text-q-warning border-q-warning/25',
        untracked: 'bg-q-warning/10 text-q-warning border-q-warning/25',
    }[tenant.usageVerificationStatus];
    const verificationLabel = {
        verified: 'Verificado',
        mismatch: 'Diferencia',
        untracked: 'Por sincronizar',
    }[tenant.usageVerificationStatus];

    return (
        <tr className="border-b border-q-border hover:bg-q-bg transition-colors">
            <td className="p-4">
                <div className="min-w-[220px]">
                    <p className="text-q-text font-medium">{tenant.tenantName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-q-text-secondary">{subtitle}</p>
                        {tenant.tenantStatus && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-q-bg text-q-text-secondary border border-q-border">
                                {tenant.tenantStatus}
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="p-4">
                <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                        backgroundColor: `${plan.color}20`,
                        color: plan.color,
                    }}
                >
                    {plan.name}
                </span>
            </td>
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-[96px] max-w-[120px]">
                        <div className="h-2 bg-q-surface-overlay rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${Math.min(tenant.usagePercentage, 100)}%`,
                                    backgroundColor: usageColor,
                                }}
                            />
                        </div>
                    </div>
                    <span className="text-sm text-q-text-secondary w-12 text-right">
                        {tenant.usagePercentage}%
                    </span>
                </div>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${verificationBadge}`}>
                    {verificationLabel}
                </span>
            </td>
            <td className="p-4 text-right">
                <span className="text-q-text font-medium">
                    {tenant.creditsUsed.toLocaleString()}
                </span>
                <span className="text-q-text-secondary"> / {tenant.creditsIncluded.toLocaleString()}</span>
            </td>
            <td className="p-4 text-right">
                <span style={{ color: usageColor }} className="font-medium">
                    {tenant.creditsRemaining.toLocaleString()}
                </span>
            </td>
            <td className="p-4">
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => onViewDetails(tenant)}
                        className="p-2 rounded-lg hover:bg-q-surface-overlay text-q-text-secondary hover:text-q-text transition-colors"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onAddCredits(tenant)}
                        className="p-2 rounded-lg hover:bg-q-accent/20 text-q-accent hover:opacity-80 transition-colors"
                        title="Agregar credits"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Data states
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [tenants, setTenants] = useState<TenantCreditsData[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<AiCreditTransaction[]>([]);

    // UI states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState<SubscriptionPlanId | 'all'>('all');
    const [sortBy, setSortBy] = useState<'usage' | 'name' | 'remaining'>('usage');
    const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'transactions' | 'plans'>('overview');

    // Plans states
    const [plans, setPlans] = useState<Record<string, StoredPlan>>({});
    const [planStats, setPlanStats] = useState<Record<string, PlanStats>>({});
    const [showArchivedPlans, setShowArchivedPlans] = useState(false);
    const [needsMigration, setNeedsMigration] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    // Modal states
    const [addCreditsModal, setAddCreditsModal] = useState<{
        isOpen: boolean;
        tenant: TenantCreditsData | null;
    }>({ isOpen: false, tenant: null });

    const [tenantDetailsModal, setTenantDetailsModal] = useState<{
        isOpen: boolean;
        tenant: TenantCreditsData | null;
    }>({ isOpen: false, tenant: null });

    const [planEditorModal, setPlanEditorModal] = useState<{
        isOpen: boolean;
        plan: StoredPlan | null;
    }>({ isOpen: false, plan: null });

    // Cargar datos
    const loadData = useCallback(async () => {
        try {
            setError(null);

            // Cargar tenants primero: algunos tenants legacy no tienen fila en subscriptions,
            // pero sí tienen consumo real en ai_credits_transactions.
            const [
                { data: subscriptionRows, error: subscriptionsError },
                { data: tenantRows, error: tenantsError },
                { data: transactionRows, error: transactionsError },
                { data: projectRows, error: projectsError },
                { data: memberRows, error: membersError },
            ] = await Promise.all([
                supabase
                    .from('subscriptions')
                    .select('tenant_id, plan_id, billing_cycle, status, start_date, current_period_start, current_period_end, trial_end_date, cancel_at_period_end, cancelled_at, stripe_customer_id, stripe_subscription_id, add_ons, credit_packages_purchased, ai_credits_usage, created_at, updated_at'),
                supabase
                    .from('tenants')
                    .select('id, name, slug, email, company_name, type, owner_user_id, owner_tenant_id, subscription_plan, status, limits, usage, billing, trial_ends_at, parent_credits_pool_id, created_at, updated_at, last_active_at'),
                supabase
                    .from('ai_credits_transactions')
                    .select('id, tenant_id, user_id, operation, credits_used, description, metadata, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5000),
                supabase
                    .from('projects')
                    .select('tenant_id'),
                supabase
                    .from('tenant_members')
                    .select('tenant_id'),
            ]);

            if (subscriptionsError) throw subscriptionsError;
            if (tenantsError) throw tenantsError;
            if (transactionsError) throw transactionsError;
            if (projectsError) throw projectsError;
            if (membersError) throw membersError;

            const subscriptionLookup = new Map<string, SubscriptionUsageRow>(
                ((subscriptionRows ?? []) as SubscriptionUsageRow[]).map((subscription) => [subscription.tenant_id, subscription])
            );
            const normalizedTransactions = ((transactionRows ?? []) as AiCreditTransactionRow[]).map(normalizeTransactionRow);
            const transactionsByTenant = groupByTenant(normalizedTransactions);
            const projectCounts = countByTenant((projectRows ?? []) as TenantScopedRow[]);
            const memberCounts = countByTenant((memberRows ?? []) as TenantScopedRow[]);
            const usageData: TenantCreditsData[] = [];

            let totalCreditsUsed = 0;
            let totalCreditsAllocated = 0;
            let tenantsNearLimit = 0;
            let tenantsOverLimit = 0;
            // Inicializar distribución con todos los planes disponibles
            const planDistribution: Partial<Record<SubscriptionPlanId, number>> = {};
            const usageByOperation: Record<string, number> = {};
            const dailyUsageMap: Record<string, number> = {};

            for (const tenant of (tenantRows ?? []) as TenantLookupRow[]) {
                const tenantId = tenant.id;
                const subscription = subscriptionLookup.get(tenantId);
                const planId = normalizePlanIdForAdmin(subscription?.plan_id || tenant.subscription_plan);
                const data = normalizeUsageRecord(subscription?.ai_credits_usage, planId);
                const tenantTransactions = transactionsByTenant.get(tenantId) || [];
                const periodStart = data.periodStart.seconds ? data.periodStart : toTimestamp(subscription?.current_period_start);
                const periodEnd = data.periodEnd.seconds ? data.periodEnd : toTimestamp(subscription?.current_period_end);
                const verifiedUsage = buildUsageFromTransactions(tenantTransactions, periodStart, periodEnd);
                const storedCreditsUsed = data.creditsUsed || readNumber(tenant.usage?.aiCreditsUsed ?? tenant.usage?.ai_credits_used);
                const displayCreditsUsed = Math.max(storedCreditsUsed, verifiedUsage.creditsUsed);
                const creditsIncluded = data.creditsIncluded || readNumber(tenant.limits?.maxAiCredits ?? tenant.limits?.max_ai_credits, SUBSCRIPTION_PLANS[planId]?.limits.maxAiCredits || 0);
                const creditsRemaining = subscription?.ai_credits_usage
                    ? data.creditsRemaining
                    : Math.max(0, creditsIncluded - displayCreditsUsed);
                const usageDifference = storedCreditsUsed - verifiedUsage.creditsUsed;
                const usageVerificationStatus: TenantCreditsData['usageVerificationStatus'] = Math.abs(usageDifference) <= 1
                    ? 'verified'
                    : storedCreditsUsed === 0 && verifiedUsage.creditsUsed > 0
                        ? 'untracked'
                        : 'mismatch';
                const tenantName = tenant.name || tenant.company_name || tenant.slug || `Tenant ${shortId(tenantId)}`;
                const combinedUsageByOperation = mergeUsageBreakdown(data.usageByOperation, verifiedUsage.usageByOperation);
                const combinedDailyUsage = verifiedUsage.dailyUsage.length > 0 ? verifiedUsage.dailyUsage : data.dailyUsage;

                const usagePercentage = creditsIncluded > 0
                    ? Math.round((displayCreditsUsed / creditsIncluded) * 100)
                    : displayCreditsUsed > 0 ? 100 : 0;

                usageData.push({
                    tenantId,
                    tenantName,
                    tenantSlug: tenant.slug || undefined,
                    tenantEmail: tenant.email || undefined,
                    companyName: tenant.company_name || undefined,
                    tenantType: tenant.type || undefined,
                    tenantStatus: tenant.status || undefined,
                    ownerUserId: tenant.owner_user_id || undefined,
                    ownerTenantId: tenant.owner_tenant_id || undefined,
                    createdAt: tenant.created_at,
                    updatedAt: tenant.updated_at,
                    lastActiveAt: tenant.last_active_at,
                    planId,
                    subscriptionStatus: subscription?.status || undefined,
                    billingCycle: subscription?.billing_cycle || undefined,
                    currentPeriodStart: subscription?.current_period_start || null,
                    currentPeriodEnd: subscription?.current_period_end || null,
                    trialEndDate: subscription?.trial_end_date || tenant.trial_ends_at || null,
                    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
                    cancelledAt: subscription?.cancelled_at || null,
                    stripeCustomerId: subscription?.stripe_customer_id || null,
                    stripeSubscriptionId: subscription?.stripe_subscription_id || null,
                    hasSubscriptionRecord: Boolean(subscription),
                    creditsUsed: displayCreditsUsed,
                    storedCreditsUsed,
                    verifiedCreditsUsed: verifiedUsage.creditsUsed,
                    transactionCreditsAdded: verifiedUsage.creditsAdded,
                    transactionCount: verifiedUsage.transactionCount,
                    usageVerificationStatus,
                    usageVerificationDifference: usageDifference,
                    creditsIncluded,
                    creditsRemaining,
                    creditsOverage: Math.max(data.creditsOverage || 0, Math.max(0, displayCreditsUsed - creditsIncluded)),
                    usagePercentage,
                    usageByOperation: combinedUsageByOperation,
                    dailyUsage: combinedDailyUsage,
                    recentTransactions: tenantTransactions.slice(0, 8),
                    projectCount: projectCounts.get(tenantId) || 0,
                    memberCount: memberCounts.get(tenantId) || 0,
                    lastActivity: tenantTransactions[0]?.timestamp?.seconds
                        ? new Date(tenantTransactions[0].timestamp.seconds * 1000)
                        : tenant.last_active_at
                            ? new Date(tenant.last_active_at)
                            : undefined,
                });

                // Actualizar estadísticas globales
                totalCreditsUsed += displayCreditsUsed;
                totalCreditsAllocated += creditsIncluded;
                planDistribution[planId] = (planDistribution[planId] || 0) + 1;

                if (usagePercentage >= 80 && usagePercentage < 100) tenantsNearLimit++;
                if (usagePercentage >= 100) tenantsOverLimit++;

                // Agregar uso por operación
                if (combinedUsageByOperation) {
                    for (const [op, count] of Object.entries(combinedUsageByOperation)) {
                        usageByOperation[op] = (usageByOperation[op] || 0) + readNumber(count);
                    }
                }

                // Agregar uso diario
                if (combinedDailyUsage) {
                    for (const day of combinedDailyUsage) {
                        dailyUsageMap[day.date] = (dailyUsageMap[day.date] || 0) + readNumber(day.credits);
                    }
                }
            }

            // Convertir uso diario a array ordenado
            const dailyUsage = Object.entries(dailyUsageMap)
                .map(([date, credits]) => ({ date, credits }))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-30);

            // Calcular promedio de uso
            const averageUsagePercentage = usageData.length > 0
                ? Math.round(usageData.reduce((sum, t) => sum + t.usagePercentage, 0) / usageData.length)
                : 0;

            setGlobalStats({
                totalTenants: usageData.length,
                totalCreditsUsed,
                totalCreditsAllocated,
                averageUsagePercentage,
                tenantsNearLimit,
                tenantsOverLimit,
                planDistribution,
                usageByOperation,
                dailyUsage,
            });

            setTenants(usageData);

            setRecentTransactions(normalizedTransactions.slice(0, 50));

            // Cargar planes desde Supabase
            const loadedPlans = await getAllPlans();
            setPlans(loadedPlans);

            // Cargar estadísticas de planes
            const stats = await getPlanStatistics();
            setPlanStats(stats);

            // Verificar si necesita migración a nuevos planes
            const migrationNeeded = await isMigrationNeeded();
            setNeedsMigration(migrationNeeded);

        } catch (err) {
            console.error('Error loading subscription data:', err);
            setError('Error al cargar los datos de suscripciones');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadData();
    };

    const handleAddCredits = async (tenantId: string, credits: number, reason: string) => {
        const success = await addCredits(tenantId, credits, 'manual', { reason });
        if (success) {
            await loadData();
        }
    };

    // Plan handlers
    const handleSavePlan = async (plan: StoredPlan) => {
        const result = await savePlan(plan, user?.id);
        if (result.success) {
            await loadData();
            // Show warning if Stripe sync failed but Supabase succeeded
            if (result.stripeError) {
                setError(`Plan guardado en Supabase pero no se pudo sincronizar con Stripe: ${result.stripeError}`);
            }
        } else {
            throw new Error(result.error);
        }
    };

    // Shared confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'warning' | 'danger';
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', variant: 'warning', onConfirm: () => { } });

    const handleArchivePlan = async (planId: string) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Archivar plan?',
            message: '¿Estás seguro de archivar este plan? Los usuarios existentes no serán afectados.',
            variant: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                const result = await archivePlan(planId, user?.id);
                if (result.success) {
                    await loadData();
                    if (result.stripeError) {
                        setError(`Plan archivado en Supabase pero no se pudo sincronizar con Stripe: ${result.stripeError}`);
                    }
                } else {
                    setError(result.error || 'Error al archivar el plan');
                }
            },
        });
    };

    const handleRestorePlan = async (planId: string) => {
        const result = await restorePlan(planId, user?.id);
        if (result.success) {
            await loadData();
        } else {
            setError(result.error || 'Error al restaurar el plan');
        }
    };

    const handleInitializePlans = async () => {
        setConfirmModal({
            isOpen: true,
            title: '¿Inicializar planes?',
            message: '¿Inicializar los planes en Supabase? Esto solo funciona si no hay planes existentes.',
            variant: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsRefreshing(true);
                const result = await initializePlansInSupabase(user?.id);
                if (result.success) {
                    await loadData();
                } else {
                    setError(result.error || 'Error al inicializar planes');
                }
                setIsRefreshing(false);
            },
        });
    };

    const handleSyncPlansFromCode = async () => {
        setConfirmModal({
            isOpen: true,
            title: '¿Sincronizar planes?',
            message: '¿Sincronizar los planes del código a Supabase? Esto actualizará los planes existentes y creará nuevos planes como "Hobby".',
            variant: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsRefreshing(true);
                try {
                    const result = await syncPlansFromHardcoded(user?.id);
                    if (result.success) {
                        await loadData();
                        alert(`Sincronización completada: ${result.plansCreated} creados, ${result.plansUpdated} actualizados`);
                    } else {
                        setError(result.error || 'Error al sincronizar planes');
                    }
                } catch (err) {
                    setError('Error al sincronizar planes desde el código');
                }
                setIsRefreshing(false);
            },
        });
    };

    const handleMigrateToNewPlans = async () => {
        const confirmMsg = `¿Migrar a la nueva estructura de planes?

Esta acción:
- ARCHIVARÁ los planes legacy: Hobby, Starter, Pro, Agency, Agency Plus
- CREARÁ/ACTUALIZARÁ los nuevos planes: Free, Individual, Agency Starter, Agency Pro, Agency Scale, Enterprise
- SINCRONIZARÁ todos los nuevos planes con Stripe

Los usuarios existentes NO serán afectados, mantendrán su plan actual.

¿Continuar?`;

        setConfirmModal({
            isOpen: true,
            title: '¿Migrar estructura de planes?',
            message: confirmMsg,
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));

                setIsMigrating(true);
                setError(null);

                try {
                    console.log('[Migration] Starting migration...');
                    const result = await migrateToNewPlanStructure(user?.id);
                    console.log('[Migration] Result:', result);

                    // Build detailed message
                    const details: string[] = [];

                    if (result.archived.length > 0) {
                        details.push(`✅ Planes archivados: ${result.archived.join(', ')}`);
                    } else {
                        details.push(`ℹ️ No se archivaron planes (ya estaban archivados o no existían)`);
                    }

                    if (result.created.length > 0) {
                        details.push(`✅ Planes creados: ${result.created.join(', ')}`);
                    }

                    if (result.updated.length > 0) {
                        details.push(`✅ Planes actualizados: ${result.updated.join(', ')}`);
                    }

                    if (result.created.length === 0 && result.updated.length === 0) {
                        details.push(`ℹ️ No se crearon ni actualizaron planes`);
                    }

                    if (result.errors.length > 0) {
                        details.push(`\n⚠️ Errores:\n${result.errors.join('\n')}`);
                    }

                    await loadData();

                    const statusEmoji = result.success ? '✅' : '⚠️';
                    const statusText = result.success ? 'Migración completada' : 'Migración completada con advertencias';

                    alert(`${statusEmoji} ${statusText}\n\n${details.join('\n')}`);

                    if (!result.success) {
                        setError(`Algunos errores durante la migración: ${result.errors.join('; ')}`);
                    }
                } catch (err) {
                    console.error('[Migration] Error:', err);
                    setError(`Error en la migración: ${err instanceof Error ? err.message : 'desconocido'}`);
                }

                setIsMigrating(false);
            },
        });
    };

    // Filtrar y ordenar tenants
    const filteredTenants = tenants
        .filter(t => {
            if (filterPlan !== 'all' && t.planId !== filterPlan) return false;
            if (searchQuery && !t.tenantName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'usage':
                    return b.usagePercentage - a.usagePercentage;
                case 'name':
                    return a.tenantName.localeCompare(b.tenantName);
                case 'remaining':
                    return a.creditsRemaining - b.creditsRemaining;
                default:
                    return 0;
            }
        });

    if (isLoading) {
        return (
            <div className="flex h-screen bg-q-bg items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-q-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-q-text-secondary">Cargando datos de suscripciones...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <AddCreditsModal
                isOpen={addCreditsModal.isOpen}
                onClose={() => setAddCreditsModal({ isOpen: false, tenant: null })}
                tenant={addCreditsModal.tenant}
                onAddCredits={handleAddCredits}
            />
            <TenantDetailsModal
                isOpen={tenantDetailsModal.isOpen}
                onClose={() => setTenantDetailsModal({ isOpen: false, tenant: null })}
                tenant={tenantDetailsModal.tenant}
                onAddCredits={(tenant) => setAddCreditsModal({ isOpen: true, tenant })}
            />

            <div className="flex h-screen bg-q-bg text-q-text">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
 <header className="admin-dashboard-topbar quimera-dashboard-header-bar h-14 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-q-surface-overlay text-q-text-secondary"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                                <h1 className="text-lg font-semibold text-q-text">
                                    Gestión de Suscripciones & AI Credits
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 rounded-lg hover:bg-q-surface-overlay text-q-text-secondary hover:text-q-text transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                    </div>
                    <HeaderBackButton onClick={onBack} className="border-q-border/60 bg-q-surface/60 text-q-text-secondary hover:bg-q-surface-overlay/40 hover:text-q-text focus:ring-q-accent/25" />
                </header>

                    {/* Tabs */}
                    <div className="px-4 sm:px-6 border-b border-q-border">
                        <div className="flex gap-1">
                            {[
                                { id: 'overview', label: 'Overview', icon: BarChart3 },
                                { id: 'plans', label: 'Planes', icon: Layers },
                                { id: 'tenants', label: 'Tenants', icon: Users },
                                { id: 'transactions', label: 'Transacciones', icon: History },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2
                                        ${activeTab === tab.id
                                            ? 'border-q-accent text-q-accent'
                                            : 'border-transparent text-q-text-secondary hover:text-q-text'
                                        }
                                    `}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                        {error && (
                            <div className="mb-6 flex items-center gap-2 p-4 bg-q-error/10 border border-q-error/20 rounded-lg text-q-error">
                                <AlertCircle className="w-5 h-5" />
                                <span>{error}</span>
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-auto hover:text-q-error"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Overview Tab */}
                        {activeTab === 'overview' && globalStats && (
                            <div className="space-y-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        title="Total Tenants"
                                        value={globalStats.totalTenants.toLocaleString()}
                                        icon={<Users className="w-6 h-6" />}
                                    />
                                    <StatCard
                                        title="Credits Usados (Total)"
                                        value={globalStats.totalCreditsUsed.toLocaleString()}
                                        icon={<Sparkles className="w-6 h-6" />}
                                    />
                                    <StatCard
                                        title="Uso Promedio"
                                        value={`${globalStats.averageUsagePercentage}%`}
                                        icon={<TrendingUp className="w-6 h-6" />}
                                    />
                                    <StatCard
                                        title="Cerca del Límite"
                                        value={`${globalStats.tenantsNearLimit + globalStats.tenantsOverLimit}`}
                                        icon={<AlertCircle className="w-6 h-6" />}
                                    />
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <DailyUsageChart data={globalStats.dailyUsage} />
                                    <OperationDistributionChart data={globalStats.usageByOperation} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <PlanDistributionCard planStats={planStats} plans={plans} />

                                    {/* Alertas */}
                                    <div className="lg:col-span-2 bg-q-surface p-6 rounded-xl border border-q-border">
                                        <h3 className="text-lg font-semibold text-q-text mb-4 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-q-accent" />
                                            Tenants que Requieren Atención
                                        </h3>
                                        <div className="space-y-3">
                                            {tenants
                                                .filter(t => t.usagePercentage >= 80)
                                                .sort((a, b) => b.usagePercentage - a.usagePercentage)
                                                .slice(0, 5)
                                                .map(tenant => (
                                                    <div
                                                        key={tenant.tenantId}
                                                        className="flex items-center justify-between p-3 bg-q-bg rounded-lg"
                                                    >
                                                        <div>
                                                            <p className="text-q-text font-medium">{tenant.tenantName}</p>
                                                            <p className="text-xs text-q-text-secondary">
                                                                {tenant.creditsRemaining.toLocaleString()} credits restantes
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className="text-sm font-medium"
                                                                style={{ color: getUsageColor(tenant.usagePercentage) }}
                                                            >
                                                                {tenant.usagePercentage}%
                                                            </span>
                                                            <button
                                                                onClick={() => setAddCreditsModal({ isOpen: true, tenant })}
                                                                className="px-3 py-1 rounded-lg bg-q-accent/20 text-q-accent text-sm hover:bg-q-accent/30 transition-colors"
                                                            >
                                                                + Credits
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            {tenants.filter(t => t.usagePercentage >= 80).length === 0 && (
                                                <p className="text-q-text-secondary text-center py-4">
                                                    Todos los tenants tienen suficientes credits
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tenants Tab */}
                        {activeTab === 'tenants' && (
                            <div className="space-y-4">
                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-q-text-secondary" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Buscar tenant..."
                                            className="w-full pl-10 pr-4 py-2 bg-q-surface border border-q-border rounded-lg text-q-text focus:outline-none focus:border-q-accent"
                                        />
                                    </div>
                                    <AppSelect
                                        value={filterPlan}
                                        onChange={(e) => setFilterPlan(e.target.value as any)}
                                        className="px-4 py-2 bg-q-surface border border-q-border rounded-lg text-q-text focus:outline-none focus:border-q-accent"
                                    >
                                        <option value="all">Todos los planes</option>
                                        {Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => (
                                            <option key={id} value={id}>{plan.name}</option>
                                        ))}
                                    </AppSelect>
                                    <AppSelect
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="px-4 py-2 bg-q-surface border border-q-border rounded-lg text-q-text focus:outline-none focus:border-q-accent"
                                    >
                                        <option value="usage">Ordenar por uso</option>
                                        <option value="name">Ordenar por nombre</option>
                                        <option value="remaining">Ordenar por restantes</option>
                                    </AppSelect>
                                </div>

                                {/* Table */}
                                <div className="bg-q-surface rounded-xl border border-q-border overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-q-bg">
                                                <tr>
                                                    <th className="p-4 text-left text-sm font-medium text-q-text-secondary">Tenant</th>
                                                    <th className="p-4 text-left text-sm font-medium text-q-text-secondary">Plan</th>
                                                    <th className="p-4 text-left text-sm font-medium text-q-text-secondary">Uso</th>
                                                    <th className="p-4 text-right text-sm font-medium text-q-text-secondary">Credits Usados</th>
                                                    <th className="p-4 text-right text-sm font-medium text-q-text-secondary">Restantes</th>
                                                    <th className="p-4 text-right text-sm font-medium text-q-text-secondary">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTenants.map(tenant => (
                                                    <TenantRow
                                                        key={tenant.tenantId}
                                                        tenant={tenant}
                                                        onAddCredits={(t) => setAddCreditsModal({ isOpen: true, tenant: t })}
                                                        onViewDetails={(t) => setTenantDetailsModal({ isOpen: true, tenant: t })}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {filteredTenants.length === 0 && (
                                        <div className="p-8 text-center text-q-text-secondary">
                                            No se encontraron tenants
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Transactions Tab */}
                        {activeTab === 'transactions' && (
                            <div className="space-y-4">
                                <div className="bg-q-surface rounded-xl border border-q-border overflow-hidden">
                                    <div className="p-4 border-b border-q-border">
                                        <h3 className="text-lg font-semibold text-q-text">
                                            Últimas Transacciones de Credits
                                        </h3>
                                    </div>
                                    <div className="divide-y divide-editor-border">
                                        {recentTransactions.map(tx => (
                                            <div key={tx.id} className="p-4 hover:bg-q-bg transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`
                                                            w-10 h-10 rounded-lg flex items-center justify-center
                                                            ${tx.creditsUsed < 0 ? 'bg-q-success/20 text-q-success' : 'bg-q-accent/20 text-q-accent'}
                                                        `}>
                                                            {tx.creditsUsed < 0 ? <Plus className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-q-text font-medium">
                                                                {tx.description || tx.operation}
                                                            </p>
                                                            <p className="text-xs text-q-text-secondary">
                                                                {tx.tenantId} • {tx.model || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-semibold ${tx.creditsUsed < 0 ? 'text-q-success' : 'text-q-text'}`}>
                                                            {tx.creditsUsed < 0 ? '+' : '-'}{Math.abs(tx.creditsUsed)} credits
                                                        </p>
                                                        <p className="text-xs text-q-text-secondary">
                                                            {tx.timestamp?.seconds
                                                                ? new Date(tx.timestamp.seconds * 1000).toLocaleString()
                                                                : 'N/A'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {recentTransactions.length === 0 && (
                                        <div className="p-8 text-center text-q-text-secondary">
                                            No hay transacciones recientes
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Plans Tab */}
                        {activeTab === 'plans' && (
                            <div className="space-y-6">
                                {/* Migration Banner */}
                                {needsMigration && (
                                    <div className="p-4 bg-gradient-to-r from-q-accent/20 to-q-accent/20 border border-q-accent/30 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-q-accent/20 flex items-center justify-center flex-shrink-0">
                                                <Zap className="w-5 h-5 text-q-accent" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-q-accent mb-1">
                                                    Nueva Estructura de Planes Disponible
                                                </h4>
                                                <p className="text-sm text-q-accent/80 mb-3">
                                                    Hay una nueva estructura de planes lista para implementar:
                                                </p>
                                                <ul className="text-sm text-q-accent/70 space-y-1 mb-3">
                                                    <li>• <strong>Individual</strong> - $49/mes con 7 días trial, todas las features</li>
                                                    <li>• <strong>Agency Starter</strong> - $99/mes + $29/proyecto, pool 2,000 créditos</li>
                                                    <li>• <strong>Agency Pro</strong> - $199/mes + $29/proyecto, pool 5,000 créditos</li>
                                                    <li>• <strong>Agency Scale</strong> - $399/mes + $29/proyecto, pool 15,000 créditos</li>
                                                </ul>
                                                <p className="text-xs text-q-accent/60">
                                                    Los planes legacy (Hobby, Starter, Pro, Agency, Agency Plus) serán archivados. Los usuarios existentes no serán afectados.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleMigrateToNewPlans}
                                                disabled={isMigrating}
                                                className="px-4 py-2 rounded-lg bg-q-accent text-q-text-on-accent text-sm font-medium hover:bg-q-accent transition-colors flex items-center gap-2 flex-shrink-0"
                                            >
                                                {isMigrating ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        Migrando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-4 h-4" />
                                                        Migrar Ahora
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Header con acciones */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-q-text">
                                            Gestión de Planes
                                        </h3>
                                        <p className="text-sm text-q-text-secondary">
                                            Administra los planes de suscripción y sus límites
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setShowArchivedPlans(!showArchivedPlans)}
                                            className={`
                                                px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                                ${showArchivedPlans
                                                    ? 'bg-q-accent text-q-text-on-accent'
                                                    : 'bg-q-surface-overlay text-q-text-secondary hover:text-q-text'
                                                }
                                            `}
                                        >
                                            <Archive className="w-4 h-4" />
                                            {showArchivedPlans ? 'Ocultar Archivados' : 'Ver Archivados'}
                                        </button>
                                        {Object.keys(plans).length === 0 && (
                                            <button
                                                onClick={handleInitializePlans}
                                                disabled={isRefreshing}
                                                className="px-4 py-2 rounded-lg bg-q-accent/20 text-q-accent text-sm font-medium hover:bg-q-accent/30 transition-colors flex items-center gap-2"
                                            >
                                                <Zap className="w-4 h-4" />
                                                Inicializar Planes
                                            </button>
                                        )}
                                        <button
                                            onClick={handleMigrateToNewPlans}
                                            disabled={isMigrating || isRefreshing}
                                            className={`px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2 ${needsMigration
                                                    ? 'bg-gradient-to-r from-q-accent to-q-accent animate-pulse'
                                                    : 'bg-q-accent'
                                                }`}
                                            title="Migrar a los nuevos planes (Individual, Agency Starter/Pro/Scale)"
                                        >
                                            {isMigrating ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Zap className="w-4 h-4" />
                                            )}
                                            {isMigrating ? 'Migrando...' : 'Migrar Planes'}
                                        </button>
                                        <button
                                            onClick={handleSyncPlansFromCode}
                                            disabled={isRefreshing}
                                            className="px-4 py-2 rounded-lg bg-q-accent/20 text-q-accent text-sm font-medium hover:bg-q-accent/30 transition-colors flex items-center gap-2"
                                            title="Sincronizar planes del código a Supabase"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                            Sync desde Código
                                        </button>
                                        <button
                                            onClick={() => setPlanEditorModal({ isOpen: true, plan: null })}
                                            className="px-4 py-2 rounded-lg bg-q-accent text-q-text-on-accent text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Nuevo Plan
                                        </button>
                                    </div>
                                </div>

                                {/* Plans Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.values(plans)
                                        .filter(plan => showArchivedPlans ? plan.isArchived : !plan.isArchived)
                                        .sort((a, b) => (a.price?.monthly || 0) - (b.price?.monthly || 0))
                                        .map(plan => {
                                            const stats = planStats[plan.id];

                                            return (
                                                <div
                                                    key={plan.id}
                                                    className={`
                                                        bg-q-surface rounded-xl border border-q-border overflow-hidden
                                                        ${plan.isArchived ? 'opacity-60' : ''}
                                                        ${plan.isFeatured ? 'ring-2 ring-q-accent' : ''}
                                                    `}
                                                >
                                                    {/* Plan Header */}
                                                    <div
                                                        className="p-4 border-b border-q-border"
                                                        style={{ backgroundColor: `${plan.color}10` }}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                                    style={{ backgroundColor: `${plan.color}20` }}
                                                                >
                                                                    <Crown className="w-4 h-4" style={{ color: plan.color }} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-q-text flex items-center gap-2">
                                                                        {plan.name}
                                                                        {plan._fromCode && (
                                                                            <span className="px-2 py-0.5 bg-q-accent/20 text-q-accent text-xs rounded-full animate-pulse">
                                                                                Nuevo
                                                                            </span>
                                                                        )}
                                                                        {plan.isPopular && (
                                                                            <span className="px-2 py-0.5 bg-q-accent text-q-text-on-accent text-xs rounded-full">
                                                                                Popular
                                                                            </span>
                                                                        )}
                                                                        {plan.isArchived && (
                                                                            <span className="px-2 py-0.5 bg-q-error/20 text-q-error text-xs rounded-full">
                                                                                Archivado
                                                                            </span>
                                                                        )}
                                                                    </h4>
                                                                    <p className="text-xs text-q-text-secondary">{plan.id}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => setPlanEditorModal({ isOpen: true, plan })}
                                                                    className="p-1.5 rounded-lg hover:bg-q-surface-overlay text-q-text-secondary hover:text-q-text transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                {plan.isArchived ? (
                                                                    <button
                                                                        onClick={() => handleRestorePlan(plan.id)}
                                                                        className="p-1.5 rounded-lg hover:bg-q-success/20 text-q-success transition-colors"
                                                                        title="Restaurar"
                                                                    >
                                                                        <RotateCcw className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleArchivePlan(plan.id)}
                                                                        className="p-1.5 rounded-lg hover:bg-q-error/20 text-q-error transition-colors"
                                                                        title="Archivar"
                                                                    >
                                                                        <Archive className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-q-text-secondary line-clamp-2">
                                                            {plan.description}
                                                        </p>
                                                    </div>

                                                    {/* Pricing */}
                                                    <div className="p-4 border-b border-q-border">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl font-bold text-q-text">
                                                                ${plan.price?.monthly || 0}
                                                            </span>
                                                            <span className="text-q-text-secondary">/mes</span>
                                                        </div>
                                                        {plan.price?.annually && plan.price.annually > 0 && plan.price.annually < (plan.price?.monthly || 0) && (
                                                            <p className="text-xs text-q-success mt-1">
                                                                ${plan.price.annually}/mes si pagas anual
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Key Limits */}
                                                    <div className="p-4 space-y-2">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-q-text-secondary flex items-center gap-2">
                                                                <Sparkles className="w-4 h-4" />
                                                                AI Credits
                                                            </span>
                                                            <span className="text-q-text font-medium">
                                                                {formatLimit(plan.limits?.maxAiCredits || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-q-text-secondary flex items-center gap-2">
                                                                <Layers className="w-4 h-4" />
                                                                Proyectos
                                                            </span>
                                                            <span className="text-q-text font-medium">
                                                                {formatLimit(plan.limits?.maxProjects || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-q-text-secondary flex items-center gap-2">
                                                                <Users className="w-4 h-4" />
                                                                Usuarios
                                                            </span>
                                                            <span className="text-q-text font-medium">
                                                                {formatLimit(plan.limits?.maxUsers || 0)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    {stats && (
                                                        <div className="px-4 pb-4">
                                                            <div className="p-3 bg-q-bg rounded-lg">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-q-text-secondary">
                                                                        Suscriptores activos
                                                                    </span>
                                                                    <span className="text-sm font-semibold text-q-text">
                                                                        {stats.activeSubscribers}
                                                                    </span>
                                                                </div>
                                                                {stats.mrr > 0 && (
                                                                    <div className="flex items-center justify-between mt-1">
                                                                        <span className="text-xs text-q-text-secondary">
                                                                            MRR
                                                                        </span>
                                                                        <span className="text-sm font-semibold text-q-success">
                                                                            ${stats.mrr.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>

                                {Object.keys(plans).length === 0 && (
                                    <div className="bg-q-surface rounded-xl border border-q-border p-8 text-center">
                                        <Layers className="w-12 h-12 text-q-text-secondary mx-auto mb-4" />
                                        <h4 className="text-lg font-semibold text-q-text mb-2">
                                            No hay planes configurados
                                        </h4>
                                        <p className="text-q-text-secondary mb-4">
                                            Inicializa los planes predefinidos o crea uno nuevo
                                        </p>
                                        <div className="flex justify-center gap-3">
                                            <button
                                                onClick={handleInitializePlans}
                                                className="px-4 py-2 rounded-lg bg-q-accent/20 text-q-accent font-medium hover:bg-q-accent/30 transition-colors"
                                            >
                                                Inicializar Predefinidos
                                            </button>
                                            <button
                                                onClick={() => setPlanEditorModal({ isOpen: true, plan: null })}
                                                className="px-4 py-2 rounded-lg bg-q-accent text-q-text-on-accent font-medium hover:opacity-90 transition-colors"
                                            >
                                                Crear Plan Nuevo
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Plan Editor Modal */}
            <UnifiedPlanEditor
                isOpen={planEditorModal.isOpen}
                onClose={() => setPlanEditorModal({ isOpen: false, plan: null })}
                plan={planEditorModal.plan}
                onSave={handleSavePlan}
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />
        </>
    );
};

export default SubscriptionManagement;
