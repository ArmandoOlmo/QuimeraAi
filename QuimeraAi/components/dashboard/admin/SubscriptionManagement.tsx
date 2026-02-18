/**
 * Subscription Management - Super Admin
 * Dashboard completo para gestionar suscripciones y AI credits
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useAuth } from '../../../contexts/core/AuthContext';
import {
    ArrowLeft,
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
import DashboardSidebar from '../DashboardSidebar';
import StatCard from './StatCard';
import UnifiedPlanEditor from './UnifiedPlanEditor';
import {
    db,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    doc,
    updateDoc,
    serverTimestamp,
} from '../../../firebase';
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
    initializePlansInFirestore,
    syncPlansFromHardcoded,
    getPlanStatistics,
    migrateToNewPlanStructure,
    isMigrationNeeded,
    StoredPlan,
    PlanStats,
} from '../../../services/plansService';

// =============================================================================
// TYPES
// =============================================================================

interface SubscriptionManagementProps {
    onBack: () => void;
}

interface TenantCreditsData {
    tenantId: string;
    tenantName: string;
    planId: SubscriptionPlanId;
    creditsUsed: number;
    creditsIncluded: number;
    creditsRemaining: number;
    usagePercentage: number;
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
        <div className="bg-editor-panel-bg p-6 rounded-xl border border-editor-border">
            <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-editor-accent" />
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
                                    className="text-[10px] fill-current text-editor-text-secondary"
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
                                        className="text-xs font-semibold fill-current text-editor-text-primary"
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
        <div className="bg-editor-panel-bg p-6 rounded-xl border border-editor-border">
            <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-editor-accent" />
                Uso por Tipo de Operación
            </h3>
            <div className="space-y-3">
                {sortedData.map(([operation, count]) => {
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    const color = operationColors[operation] || '#6b7280';

                    return (
                        <div key={operation}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-editor-text-secondary">
                                    {operationLabels[operation] || operation}
                                </span>
                                <span className="text-sm text-editor-text-primary font-medium">
                                    {count.toLocaleString()} ({percentage.toFixed(1)}%)
                                </span>
                            </div>
                            <div className="h-2 bg-editor-border rounded-full overflow-hidden">
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
        <div className="bg-editor-panel-bg p-6 rounded-xl border border-editor-border">
            <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-editor-accent" />
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
                                <span className="text-sm text-editor-text-secondary">{plan.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-editor-text-primary font-medium">{count}</span>
                                <span className="text-xs text-editor-text-secondary w-12 text-right">
                                    {percentage.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-editor-border flex items-center justify-between">
                <span className="text-sm text-editor-text-secondary">Total Tenants</span>
                <span className="text-lg font-bold text-editor-text-primary">{total}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-editor-panel-bg rounded-xl border border-editor-border w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-editor-text-primary flex items-center gap-2">
                        <Gift className="w-5 h-5 text-editor-accent" />
                        Agregar Credits
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-editor-bg rounded-lg">
                    <p className="text-sm text-editor-text-secondary">Tenant</p>
                    <p className="text-editor-text-primary font-medium">{tenant.tenantName}</p>
                    <p className="text-sm text-editor-text-secondary mt-1">
                        Credits actuales: {tenant.creditsRemaining.toLocaleString()} / {tenant.creditsIncluded.toLocaleString()}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-editor-text-secondary mb-2">
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
                                            ? 'bg-editor-accent text-white'
                                            : 'bg-editor-border text-editor-text-secondary hover:bg-editor-border/80'
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
                            className="mt-2 w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                            placeholder="O ingresa una cantidad personalizada"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-editor-text-secondary mb-2">
                            Razón (opcional)
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                            placeholder="Ej: Compensación por problema técnico"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg bg-editor-border text-editor-text-primary hover:bg-editor-border/80 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || credits <= 0}
                            className="flex-1 px-4 py-2 rounded-lg bg-editor-accent text-white hover:opacity-90 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Agregando...' : `Agregar ${credits} Credits`}
                        </button>
                    </div>
                </form>
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
    const plan = SUBSCRIPTION_PLANS[tenant.planId];

    return (
        <tr className="border-b border-editor-border hover:bg-editor-bg transition-colors">
            <td className="p-4">
                <div>
                    <p className="text-editor-text-primary font-medium">{tenant.tenantName}</p>
                    <p className="text-xs text-editor-text-secondary">{tenant.tenantId}</p>
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
                    <div className="flex-1 max-w-[120px]">
                        <div className="h-2 bg-editor-border rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${Math.min(tenant.usagePercentage, 100)}%`,
                                    backgroundColor: usageColor,
                                }}
                            />
                        </div>
                    </div>
                    <span className="text-sm text-editor-text-secondary w-12 text-right">
                        {tenant.usagePercentage}%
                    </span>
                </div>
            </td>
            <td className="p-4 text-right">
                <span className="text-editor-text-primary font-medium">
                    {tenant.creditsUsed.toLocaleString()}
                </span>
                <span className="text-editor-text-secondary"> / {tenant.creditsIncluded.toLocaleString()}</span>
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
                        className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onAddCredits(tenant)}
                        className="p-2 rounded-lg hover:bg-editor-accent/20 text-editor-accent hover:opacity-80 transition-colors"
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

    const [planEditorModal, setPlanEditorModal] = useState<{
        isOpen: boolean;
        plan: StoredPlan | null;
    }>({ isOpen: false, plan: null });

    // Cargar datos
    const loadData = useCallback(async () => {
        try {
            setError(null);

            // Cargar uso de credits de todos los tenants
            const usageSnapshot = await getDocs(collection(db, 'aiCreditsUsage'));
            const usageData: TenantCreditsData[] = [];

            let totalCreditsUsed = 0;
            let totalCreditsAllocated = 0;
            let tenantsNearLimit = 0;
            let tenantsOverLimit = 0;
            // Inicializar distribución con todos los planes disponibles
            const planDistribution: Partial<Record<SubscriptionPlanId, number>> = {};
            const usageByOperation: Record<string, number> = {};
            const dailyUsageMap: Record<string, number> = {};

            for (const doc of usageSnapshot.docs) {
                const data = doc.data() as AiCreditsUsage;
                const tenantId = doc.id;

                // Obtener nombre del tenant
                let tenantName = tenantId;
                try {
                    const tenantDoc = await getDocs(
                        query(collection(db, 'tenants'), where('id', '==', tenantId), limit(1))
                    );
                    if (!tenantDoc.empty) {
                        tenantName = tenantDoc.docs[0].data().name || tenantId;
                    }
                } catch (e) {
                    // Ignore
                }

                const usagePercentage = data.creditsIncluded > 0
                    ? Math.round((data.creditsUsed / data.creditsIncluded) * 100)
                    : 0;

                // Determinar plan basado en credits incluidos
                let planId: SubscriptionPlanId = 'free';
                for (const [id, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
                    if (plan.limits.maxAiCredits === data.creditsIncluded) {
                        planId = id as SubscriptionPlanId;
                        break;
                    }
                }

                usageData.push({
                    tenantId,
                    tenantName,
                    planId,
                    creditsUsed: data.creditsUsed || 0,
                    creditsIncluded: data.creditsIncluded || 0,
                    creditsRemaining: data.creditsRemaining || 0,
                    usagePercentage,
                });

                // Actualizar estadísticas globales
                totalCreditsUsed += data.creditsUsed || 0;
                totalCreditsAllocated += data.creditsIncluded || 0;
                planDistribution[planId] = (planDistribution[planId] || 0) + 1;

                if (usagePercentage >= 80 && usagePercentage < 100) tenantsNearLimit++;
                if (usagePercentage >= 100) tenantsOverLimit++;

                // Agregar uso por operación
                if (data.usageByOperation) {
                    for (const [op, count] of Object.entries(data.usageByOperation)) {
                        usageByOperation[op] = (usageByOperation[op] || 0) + (count as number);
                    }
                }

                // Agregar uso diario
                if (data.dailyUsage) {
                    for (const day of data.dailyUsage) {
                        dailyUsageMap[day.date] = (dailyUsageMap[day.date] || 0) + day.credits;
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

            // Cargar transacciones recientes
            const transactionsSnapshot = await getDocs(
                query(
                    collection(db, 'aiCreditsTransactions'),
                    orderBy('timestamp', 'desc'),
                    limit(50)
                )
            );

            const transactions: AiCreditTransaction[] = transactionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as AiCreditTransaction));

            setRecentTransactions(transactions);

            // Cargar planes desde Firestore
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
        const result = await savePlan(plan, user?.uid);
        if (result.success) {
            await loadData();
            // Show warning if Stripe sync failed but Firestore succeeded
            if (result.stripeError) {
                setError(`Plan guardado en Firestore pero no se pudo sincronizar con Stripe: ${result.stripeError}`);
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
                const result = await archivePlan(planId, user?.uid);
                if (result.success) {
                    await loadData();
                    if (result.stripeError) {
                        setError(`Plan archivado en Firestore pero no se pudo sincronizar con Stripe: ${result.stripeError}`);
                    }
                } else {
                    setError(result.error || 'Error al archivar el plan');
                }
            },
        });
    };

    const handleRestorePlan = async (planId: string) => {
        const result = await restorePlan(planId, user?.uid);
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
            message: '¿Inicializar los planes en Firestore? Esto solo funciona si no hay planes existentes.',
            variant: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsRefreshing(true);
                const result = await initializePlansInFirestore(user?.uid);
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
            message: '¿Sincronizar los planes del código a Firestore? Esto actualizará los planes existentes y creará nuevos planes como "Hobby".',
            variant: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsRefreshing(true);
                try {
                    const result = await syncPlansFromHardcoded(user?.uid);
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
                    const result = await migrateToNewPlanStructure(user?.uid);
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
            <div className="flex h-screen bg-editor-bg items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-editor-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-editor-text-secondary">Cargando datos de suscripciones...</p>
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

            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onBack}
                                className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-editor-accent" />
                                <h1 className="text-lg font-semibold text-editor-text-primary">
                                    Gestión de Suscripciones & AI Credits
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </header>

                    {/* Tabs */}
                    <div className="px-4 sm:px-6 border-b border-editor-border">
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
                                            ? 'border-editor-accent text-editor-accent'
                                            : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
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
                            <div className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                                <AlertCircle className="w-5 h-5" />
                                <span>{error}</span>
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-auto hover:text-red-300"
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
                                    <div className="lg:col-span-2 bg-editor-panel-bg p-6 rounded-xl border border-editor-border">
                                        <h3 className="text-lg font-semibold text-editor-text-primary mb-4 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-amber-400" />
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
                                                        className="flex items-center justify-between p-3 bg-editor-bg rounded-lg"
                                                    >
                                                        <div>
                                                            <p className="text-editor-text-primary font-medium">{tenant.tenantName}</p>
                                                            <p className="text-xs text-editor-text-secondary">
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
                                                                className="px-3 py-1 rounded-lg bg-editor-accent/20 text-editor-accent text-sm hover:bg-editor-accent/30 transition-colors"
                                                            >
                                                                + Credits
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            {tenants.filter(t => t.usagePercentage >= 80).length === 0 && (
                                                <p className="text-editor-text-secondary text-center py-4">
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
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-editor-text-secondary" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Buscar tenant..."
                                            className="w-full pl-10 pr-4 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                        />
                                    </div>
                                    <select
                                        value={filterPlan}
                                        onChange={(e) => setFilterPlan(e.target.value as any)}
                                        className="px-4 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                    >
                                        <option value="all">Todos los planes</option>
                                        {Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => (
                                            <option key={id} value={id}>{plan.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="px-4 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                    >
                                        <option value="usage">Ordenar por uso</option>
                                        <option value="name">Ordenar por nombre</option>
                                        <option value="remaining">Ordenar por restantes</option>
                                    </select>
                                </div>

                                {/* Table */}
                                <div className="bg-editor-panel-bg rounded-xl border border-editor-border overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-editor-bg">
                                                <tr>
                                                    <th className="p-4 text-left text-sm font-medium text-editor-text-secondary">Tenant</th>
                                                    <th className="p-4 text-left text-sm font-medium text-editor-text-secondary">Plan</th>
                                                    <th className="p-4 text-left text-sm font-medium text-editor-text-secondary">Uso</th>
                                                    <th className="p-4 text-right text-sm font-medium text-editor-text-secondary">Credits Usados</th>
                                                    <th className="p-4 text-right text-sm font-medium text-editor-text-secondary">Restantes</th>
                                                    <th className="p-4 text-right text-sm font-medium text-editor-text-secondary">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTenants.map(tenant => (
                                                    <TenantRow
                                                        key={tenant.tenantId}
                                                        tenant={tenant}
                                                        onAddCredits={(t) => setAddCreditsModal({ isOpen: true, tenant: t })}
                                                        onViewDetails={(t) => {
                                                            // TODO: Implementar modal de detalles del tenant
                                                            alert(`Tenant: ${t.tenantName}\nPlan: ${t.planId}\nCredits usados: ${t.creditsUsed.toLocaleString()}\nCredits restantes: ${t.creditsRemaining.toLocaleString()}\nUso: ${t.usagePercentage}%`);
                                                        }}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {filteredTenants.length === 0 && (
                                        <div className="p-8 text-center text-editor-text-secondary">
                                            No se encontraron tenants
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Transactions Tab */}
                        {activeTab === 'transactions' && (
                            <div className="space-y-4">
                                <div className="bg-editor-panel-bg rounded-xl border border-editor-border overflow-hidden">
                                    <div className="p-4 border-b border-editor-border">
                                        <h3 className="text-lg font-semibold text-editor-text-primary">
                                            Últimas Transacciones de Credits
                                        </h3>
                                    </div>
                                    <div className="divide-y divide-editor-border">
                                        {recentTransactions.map(tx => (
                                            <div key={tx.id} className="p-4 hover:bg-editor-bg transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`
                                                            w-10 h-10 rounded-lg flex items-center justify-center
                                                            ${tx.creditsUsed < 0 ? 'bg-green-500/20 text-green-400' : 'bg-editor-accent/20 text-editor-accent'}
                                                        `}>
                                                            {tx.creditsUsed < 0 ? <Plus className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-editor-text-primary font-medium">
                                                                {tx.description || tx.operation}
                                                            </p>
                                                            <p className="text-xs text-editor-text-secondary">
                                                                {tx.tenantId} • {tx.model || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-semibold ${tx.creditsUsed < 0 ? 'text-green-400' : 'text-editor-text-primary'}`}>
                                                            {tx.creditsUsed < 0 ? '+' : '-'}{Math.abs(tx.creditsUsed)} credits
                                                        </p>
                                                        <p className="text-xs text-editor-text-secondary">
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
                                        <div className="p-8 text-center text-editor-text-secondary">
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
                                    <div className="p-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                <Zap className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-purple-300 mb-1">
                                                    Nueva Estructura de Planes Disponible
                                                </h4>
                                                <p className="text-sm text-purple-300/80 mb-3">
                                                    Hay una nueva estructura de planes lista para implementar:
                                                </p>
                                                <ul className="text-sm text-purple-300/70 space-y-1 mb-3">
                                                    <li>• <strong>Individual</strong> - $49/mes con 7 días trial, todas las features</li>
                                                    <li>• <strong>Agency Starter</strong> - $99/mes + $29/proyecto, pool 2,000 créditos</li>
                                                    <li>• <strong>Agency Pro</strong> - $199/mes + $29/proyecto, pool 5,000 créditos</li>
                                                    <li>• <strong>Agency Scale</strong> - $399/mes + $29/proyecto, pool 15,000 créditos</li>
                                                </ul>
                                                <p className="text-xs text-purple-300/60">
                                                    Los planes legacy (Hobby, Starter, Pro, Agency, Agency Plus) serán archivados. Los usuarios existentes no serán afectados.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleMigrateToNewPlans}
                                                disabled={isMigrating}
                                                className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors flex items-center gap-2 flex-shrink-0"
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
                                        <h3 className="text-lg font-semibold text-editor-text-primary">
                                            Gestión de Planes
                                        </h3>
                                        <p className="text-sm text-editor-text-secondary">
                                            Administra los planes de suscripción y sus límites
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setShowArchivedPlans(!showArchivedPlans)}
                                            className={`
                                                px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                                ${showArchivedPlans
                                                    ? 'bg-editor-accent text-white'
                                                    : 'bg-editor-border text-editor-text-secondary hover:text-editor-text-primary'
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
                                                className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors flex items-center gap-2"
                                            >
                                                <Zap className="w-4 h-4" />
                                                Inicializar Planes
                                            </button>
                                        )}
                                        <button
                                            onClick={handleMigrateToNewPlans}
                                            disabled={isMigrating || isRefreshing}
                                            className={`px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2 ${needsMigration
                                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse'
                                                    : 'bg-purple-600'
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
                                            className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
                                            title="Sincronizar planes del código a Firestore"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                            Sync desde Código
                                        </button>
                                        <button
                                            onClick={() => setPlanEditorModal({ isOpen: true, plan: null })}
                                            className="px-4 py-2 rounded-lg bg-editor-accent text-white text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2"
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
                                                        bg-editor-panel-bg rounded-xl border border-editor-border overflow-hidden
                                                        ${plan.isArchived ? 'opacity-60' : ''}
                                                        ${plan.isFeatured ? 'ring-2 ring-editor-accent' : ''}
                                                    `}
                                                >
                                                    {/* Plan Header */}
                                                    <div
                                                        className="p-4 border-b border-editor-border"
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
                                                                    <h4 className="font-semibold text-editor-text-primary flex items-center gap-2">
                                                                        {plan.name}
                                                                        {plan._fromCode && (
                                                                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full animate-pulse">
                                                                                Nuevo
                                                                            </span>
                                                                        )}
                                                                        {plan.isPopular && (
                                                                            <span className="px-2 py-0.5 bg-editor-accent text-white text-xs rounded-full">
                                                                                Popular
                                                                            </span>
                                                                        )}
                                                                        {plan.isArchived && (
                                                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                                                                Archivado
                                                                            </span>
                                                                        )}
                                                                    </h4>
                                                                    <p className="text-xs text-editor-text-secondary">{plan.id}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => setPlanEditorModal({ isOpen: true, plan })}
                                                                    className="p-1.5 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                {plan.isArchived ? (
                                                                    <button
                                                                        onClick={() => handleRestorePlan(plan.id)}
                                                                        className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                                                                        title="Restaurar"
                                                                    >
                                                                        <RotateCcw className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleArchivePlan(plan.id)}
                                                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                                                        title="Archivar"
                                                                    >
                                                                        <Archive className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-editor-text-secondary line-clamp-2">
                                                            {plan.description}
                                                        </p>
                                                    </div>

                                                    {/* Pricing */}
                                                    <div className="p-4 border-b border-editor-border">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl font-bold text-editor-text-primary">
                                                                ${plan.price?.monthly || 0}
                                                            </span>
                                                            <span className="text-editor-text-secondary">/mes</span>
                                                        </div>
                                                        {plan.price?.annually && plan.price.annually > 0 && plan.price.annually < (plan.price?.monthly || 0) && (
                                                            <p className="text-xs text-green-400 mt-1">
                                                                ${plan.price.annually}/mes si pagas anual
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Key Limits */}
                                                    <div className="p-4 space-y-2">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-editor-text-secondary flex items-center gap-2">
                                                                <Sparkles className="w-4 h-4" />
                                                                AI Credits
                                                            </span>
                                                            <span className="text-editor-text-primary font-medium">
                                                                {formatLimit(plan.limits?.maxAiCredits || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-editor-text-secondary flex items-center gap-2">
                                                                <Layers className="w-4 h-4" />
                                                                Proyectos
                                                            </span>
                                                            <span className="text-editor-text-primary font-medium">
                                                                {formatLimit(plan.limits?.maxProjects || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-editor-text-secondary flex items-center gap-2">
                                                                <Users className="w-4 h-4" />
                                                                Usuarios
                                                            </span>
                                                            <span className="text-editor-text-primary font-medium">
                                                                {formatLimit(plan.limits?.maxUsers || 0)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    {stats && (
                                                        <div className="px-4 pb-4">
                                                            <div className="p-3 bg-editor-bg rounded-lg">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-editor-text-secondary">
                                                                        Suscriptores activos
                                                                    </span>
                                                                    <span className="text-sm font-semibold text-editor-text-primary">
                                                                        {stats.activeSubscribers}
                                                                    </span>
                                                                </div>
                                                                {stats.mrr > 0 && (
                                                                    <div className="flex items-center justify-between mt-1">
                                                                        <span className="text-xs text-editor-text-secondary">
                                                                            MRR
                                                                        </span>
                                                                        <span className="text-sm font-semibold text-green-400">
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
                                    <div className="bg-editor-panel-bg rounded-xl border border-editor-border p-8 text-center">
                                        <Layers className="w-12 h-12 text-editor-text-secondary mx-auto mb-4" />
                                        <h4 className="text-lg font-semibold text-editor-text-primary mb-2">
                                            No hay planes configurados
                                        </h4>
                                        <p className="text-editor-text-secondary mb-4">
                                            Inicializa los planes predefinidos o crea uno nuevo
                                        </p>
                                        <div className="flex justify-center gap-3">
                                            <button
                                                onClick={handleInitializePlans}
                                                className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/30 transition-colors"
                                            >
                                                Inicializar Predefinidos
                                            </button>
                                            <button
                                                onClick={() => setPlanEditorModal({ isOpen: true, plan: null })}
                                                className="px-4 py-2 rounded-lg bg-editor-accent text-white font-medium hover:opacity-90 transition-colors"
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
