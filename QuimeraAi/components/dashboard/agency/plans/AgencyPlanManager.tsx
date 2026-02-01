/**
 * AgencyPlanManager
 * Main component for managing agency service plans
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../../../contexts/tenant/TenantContext';
import { useAuth } from '../../../../contexts/core/AuthContext';
import {
    Plus,
    Package,
    Edit,
    Archive,
    RotateCcw,
    Trash2,
    Users,
    DollarSign,
    TrendingUp,
    CheckCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
    Star,
    MoreVertical,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    getAgencyPlans,
    getAgencyPlanStats,
    archiveAgencyPlan,
    restoreAgencyPlan,
    deleteAgencyPlan,
} from '../../../../services/agencyPlansService';
import {
    AgencyPlan,
    AgencyPlanStats,
    calculateMarkup,
    QUIMERA_PROJECT_COST,
} from '../../../../types/agencyPlans';
import { AgencyPlanEditor } from './AgencyPlanEditor';
import { MarkupSummary } from './MarkupSummary';

export function AgencyPlanManager() {
    const { t } = useTranslation();
    const { currentTenant } = useTenant();
    const { user } = useAuth();

    // State
    const [plans, setPlans] = useState<AgencyPlan[]>([]);
    const [stats, setStats] = useState<AgencyPlanStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);

    // Modal state
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<AgencyPlan | null>(null);

    // Action states
    const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

    // Load data
    const loadData = useCallback(async () => {
        if (!currentTenant?.id) return;

        try {
            setError(null);
            const [plansData, statsData] = await Promise.all([
                getAgencyPlans(currentTenant.id, showArchived, true),
                getAgencyPlanStats(currentTenant.id),
            ]);
            setPlans(plansData);
            setStats(statsData);
        } catch (err) {
            console.error('Error loading plans:', err);
            setError('Error al cargar los planes');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [currentTenant?.id, showArchived]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadData();
    };

    // Handlers
    const handleNewPlan = () => {
        setEditingPlan(null);
        setEditorOpen(true);
    };

    const handleEditPlan = (plan: AgencyPlan) => {
        setEditingPlan(plan);
        setEditorOpen(true);
    };

    const handleArchivePlan = async (plan: AgencyPlan) => {
        if (!confirm(`¿Archivar el plan "${plan.name}"? Los clientes actuales no serán afectados.`)) {
            return;
        }

        setProcessingPlanId(plan.id);
        const result = await archiveAgencyPlan(plan.id, user?.uid);
        setProcessingPlanId(null);

        if (result.success) {
            loadData();
        } else {
            setError(result.error || 'Error al archivar el plan');
        }
    };

    const handleRestorePlan = async (plan: AgencyPlan) => {
        setProcessingPlanId(plan.id);
        const result = await restoreAgencyPlan(plan.id, user?.uid);
        setProcessingPlanId(null);

        if (result.success) {
            loadData();
        } else {
            setError(result.error || 'Error al restaurar el plan');
        }
    };

    const handleDeletePlan = async (plan: AgencyPlan) => {
        if (!confirm(`¿Eliminar permanentemente el plan "${plan.name}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        setProcessingPlanId(plan.id);
        const result = await deleteAgencyPlan(plan.id);
        setProcessingPlanId(null);

        if (result.success) {
            loadData();
        } else {
            setError(result.error || 'Error al eliminar el plan');
        }
    };

    const handleEditorClose = () => {
        setEditorOpen(false);
        setEditingPlan(null);
    };

    const handlePlanSaved = () => {
        handleEditorClose();
        loadData();
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Planes de Servicio</h2>
                    <p className="text-muted-foreground mt-1">
                        Crea y gestiona los planes que ofreces a tus clientes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showArchived
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {showArchived ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showArchived ? 'Ocultar Archivados' : 'Ver Archivados'}
                    </button>
                    <button
                        onClick={handleNewPlan}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Plan
                    </button>
                </div>
            </div>

            {/* Instructions Banner */}
            {plans.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
                    <button
                        onClick={() => setInstructionsCollapsed(!instructionsCollapsed)}
                        className="w-full flex items-center justify-between"
                    >
                        <h4 className="font-semibold text-amber-500 flex items-center gap-2">
                            💡 ¿Cómo funcionan los Planes de Servicio?
                        </h4>
                        {instructionsCollapsed ? (
                            <ChevronDown className="w-5 h-5 text-amber-500" />
                        ) : (
                            <ChevronUp className="w-5 h-5 text-amber-500" />
                        )}
                    </button>
                    {!instructionsCollapsed && (
                        <div className="mt-3 space-y-3">
                            <div className="text-muted-foreground space-y-2">
                                <p>
                                    <strong className="text-foreground">Los planes te permiten ofrecer diferentes niveles de servicio a tus clientes.</strong>
                                    {' '}Por cada plan defines un precio (lo que cobra tu agencia) y un costo base (lo que pagas a Quimera).
                                    La diferencia es tu <span className="text-green-500 font-medium">ganancia mensual</span>.
                                </p>
                                <ul className="list-disc list-inside space-y-1 pl-2">
                                    <li><strong className="text-foreground">Precio:</strong> Lo que tu cliente paga mensualmente</li>
                                    <li><strong className="text-foreground">Costo base:</strong> El costo de Quimera por proyecto (según tu plan de agencia)</li>
                                    <li><strong className="text-foreground">Límites:</strong> Proyectos, usuarios, créditos IA y almacenamiento</li>
                                    <li><strong className="text-foreground">Features:</strong> Funcionalidades incluidas (Chat IA, E-commerce, CRM, etc.)</li>
                                </ul>
                            </div>
                            <div className="pt-2 border-t border-amber-500/20">
                                <p className="text-amber-400">
                                    👉 Haz clic en <strong>"+ Nuevo Plan"</strong> para crear tu primer plan de servicio.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-destructive font-medium">Error</p>
                        <p className="text-destructive/80 text-sm">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive">
                        ×
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Planes Activos</p>
                                <p className="text-2xl font-bold text-foreground">{stats.activePlans}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Clientes Totales</p>
                                <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">MRR Total</p>
                                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalMRR)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Ganancia Mensual</p>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalMarkup)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Markup Summary Table */}
            {plans.length > 0 && currentTenant?.id && (
                <MarkupSummary tenantId={currentTenant.id} />
            )}

            {/* Plans Grid */}
            {plans.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No hay planes creados
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Crea tu primer plan de servicio para empezar a ofrecerlo a tus clientes.
                        Define precio, límites y features incluidas.
                    </p>
                    <button
                        onClick={handleNewPlan}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Primer Plan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map((plan) => {
                        const { markup, markupPercentage } = calculateMarkup(plan.price, plan.baseCost);
                        const isProcessing = processingPlanId === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`
                                    bg-card border rounded-xl overflow-hidden transition-all
                                    ${plan.isArchived ? 'opacity-60 border-dashed' : 'border-border'}
                                    ${plan.isDefault ? 'ring-2 ring-primary' : ''}
                                `}
                            >
                                {/* Plan Header */}
                                <div
                                    className="p-4 border-b border-border"
                                    style={{ backgroundColor: `${plan.color}10` }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: `${plan.color}20` }}
                                            >
                                                <Package className="w-5 h-5" style={{ color: plan.color }} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                                    {plan.name}
                                                    {plan.isDefault && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary text-primary-foreground">
                                                            <Star className="w-3 h-3" />
                                                            Default
                                                        </span>
                                                    )}
                                                    {plan.isArchived && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                                                            Archivado
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-1">
                                                    {plan.description || 'Sin descripción'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <MoreVertical className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="p-4 border-b border-border">
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-3xl font-bold text-foreground">
                                            {formatCurrency(plan.price)}
                                        </span>
                                        <span className="text-muted-foreground">/mes</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Costo: </span>
                                            <span className="text-foreground">{formatCurrency(plan.baseCost)}</span>
                                        </div>
                                        <div className="text-green-600 dark:text-green-400 font-medium">
                                            +{formatCurrency(markup)} ({Math.round(markupPercentage)}%)
                                        </div>
                                    </div>
                                </div>

                                {/* Limits Summary */}
                                <div className="p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Proyectos</span>
                                        <span className="text-foreground font-medium">
                                            {plan.limits.maxProjects === -1 ? '∞' : plan.limits.maxProjects}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Usuarios</span>
                                        <span className="text-foreground font-medium">
                                            {plan.limits.maxUsers === -1 ? '∞' : plan.limits.maxUsers}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">AI Credits</span>
                                        <span className="text-foreground font-medium">
                                            {plan.limits.maxAiCredits === -1 ? '∞' : plan.limits.maxAiCredits.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Almacenamiento</span>
                                        <span className="text-foreground font-medium">
                                            {plan.limits.maxStorageGB === -1 ? '∞' : `${plan.limits.maxStorageGB} GB`}
                                        </span>
                                    </div>
                                </div>

                                {/* Stats & Actions */}
                                <div className="p-4 bg-muted/30 border-t border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                                {plan.clientCount} cliente{plan.clientCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditPlan(plan)}
                                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                title="Editar"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            {plan.isArchived ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRestorePlan(plan)}
                                                        disabled={isProcessing}
                                                        className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                                                        title="Restaurar"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePlan(plan)}
                                                        disabled={isProcessing}
                                                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                                        title="Eliminar permanentemente"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleArchivePlan(plan)}
                                                    disabled={isProcessing}
                                                    className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 transition-colors"
                                                    title="Archivar"
                                                >
                                                    <Archive className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Plan Editor Modal */}
            <AgencyPlanEditor
                isOpen={editorOpen}
                onClose={handleEditorClose}
                plan={editingPlan}
                onSave={handlePlanSaved}
            />
        </div>
    );
}
