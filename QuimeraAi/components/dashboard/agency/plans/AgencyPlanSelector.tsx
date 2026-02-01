/**
 * AgencyPlanSelector
 * Reusable component for selecting/assigning agency plans to clients
 */

import React, { useState, useEffect } from 'react';
import {
    Package,
    Check,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertCircle,
    Star,
    Users,
    Database,
    Zap,
} from 'lucide-react';
import { getAgencyPlans, assignPlanToClient } from '../../../../services/agencyPlansService';
import { AgencyPlan, calculateMarkup } from '../../../../types/agencyPlans';

// =============================================================================
// DROPDOWN SELECTOR
// =============================================================================

interface AgencyPlanDropdownProps {
    tenantId: string;
    selectedPlanId?: string | null;
    onChange: (plan: AgencyPlan | null) => void;
    disabled?: boolean;
    placeholder?: string;
    showPricing?: boolean;
}

export function AgencyPlanDropdown({
    tenantId,
    selectedPlanId,
    onChange,
    disabled = false,
    placeholder = 'Seleccionar plan...',
    showPricing = true,
}: AgencyPlanDropdownProps) {
    const [plans, setPlans] = useState<AgencyPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        loadPlans();
    }, [tenantId]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await getAgencyPlans(tenantId);
            setPlans(data);
        } catch (error) {
            console.error('Error loading plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedPlan = plans.find((p) => p.id === selectedPlanId);

    const handleSelect = (plan: AgencyPlan | null) => {
        onChange(plan);
        setIsOpen(false);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
                disabled={disabled || loading}
                className={`
                    w-full flex items-center justify-between px-4 py-2.5 
                    bg-background border border-border rounded-lg text-left
                    transition-colors
                    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer'}
                    ${isOpen ? 'border-primary ring-2 ring-primary/20' : ''}
                `}
            >
                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Cargando planes...</span>
                    </div>
                ) : selectedPlan ? (
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${selectedPlan.color}20` }}
                        >
                            <Package className="w-4 h-4" style={{ color: selectedPlan.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground truncate">{selectedPlan.name}</span>
                                {selectedPlan.isDefault && (
                                    <Star className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                )}
                            </div>
                            {showPricing && (
                                <span className="text-sm text-muted-foreground">
                                    {formatCurrency(selectedPlan.price)}/mes
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )}
                {!loading && (
                    isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && plans.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {/* No plan option */}
                    <button
                        type="button"
                        onClick={() => handleSelect(null)}
                        className={`
                            w-full flex items-center gap-3 px-4 py-3 text-left
                            hover:bg-muted/50 transition-colors
                            ${!selectedPlanId ? 'bg-muted/30' : ''}
                        `}
                    >
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <span className="text-muted-foreground">Sin plan asignado</span>
                        </div>
                        {!selectedPlanId && <Check className="w-4 h-4 text-primary" />}
                    </button>

                    {/* Plan options */}
                    {plans.map((plan) => (
                        <button
                            key={plan.id}
                            type="button"
                            onClick={() => handleSelect(plan)}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 text-left
                                hover:bg-muted/50 transition-colors border-t border-border
                                ${selectedPlanId === plan.id ? 'bg-muted/30' : ''}
                            `}
                        >
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${plan.color}20` }}
                            >
                                <Package className="w-4 h-4" style={{ color: plan.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{plan.name}</span>
                                    {plan.isDefault && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                            <Star className="w-3 h-3" />
                                            Default
                                        </span>
                                    )}
                                </div>
                                {showPricing && (
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span>{formatCurrency(plan.price)}/mes</span>
                                        <span>•</span>
                                        <span>{plan.limits.maxProjects === -1 ? '∞' : plan.limits.maxProjects} proyectos</span>
                                    </div>
                                )}
                            </div>
                            {selectedPlanId === plan.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                        </button>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {isOpen && plans.length === 0 && !loading && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        No hay planes creados aún.
                    </p>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// CARD SELECTOR (for modals/forms)
// =============================================================================

interface AgencyPlanCardSelectorProps {
    tenantId: string;
    selectedPlanId?: string | null;
    onChange: (plan: AgencyPlan | null) => void;
    showDetails?: boolean;
}

export function AgencyPlanCardSelector({
    tenantId,
    selectedPlanId,
    onChange,
    showDetails = true,
}: AgencyPlanCardSelectorProps) {
    const [plans, setPlans] = useState<AgencyPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlans();
    }, [tenantId]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await getAgencyPlans(tenantId);
            setPlans(data);
        } catch (error) {
            console.error('Error loading plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (plans.length === 0) {
        return (
            <div className="text-center py-8">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay planes disponibles</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const { markupPercentage } = calculateMarkup(plan.price, plan.baseCost);

                return (
                    <button
                        key={plan.id}
                        type="button"
                        onClick={() => onChange(isSelected ? null : plan)}
                        className={`
                            relative p-4 rounded-xl border-2 text-left transition-all
                            ${isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50 hover:bg-muted/30'
                            }
                        `}
                    >
                        {/* Selected indicator */}
                        {isSelected && (
                            <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-4 h-4 text-primary-foreground" />
                                </div>
                            </div>
                        )}

                        {/* Plan header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${plan.color}20` }}
                            >
                                <Package className="w-5 h-5" style={{ color: plan.color }} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground">{plan.name}</span>
                                    {plan.isDefault && (
                                        <Star className="w-4 h-4 text-amber-500" />
                                    )}
                                </div>
                                <span className="text-lg font-bold text-foreground">
                                    {formatCurrency(plan.price)}
                                    <span className="text-sm font-normal text-muted-foreground">/mes</span>
                                </span>
                            </div>
                        </div>

                        {/* Details */}
                        {showDetails && (
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Database className="w-4 h-4" />
                                    <span>
                                        {plan.limits.maxProjects === -1 ? 'Ilimitados' : plan.limits.maxProjects} proyectos
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Users className="w-4 h-4" />
                                    <span>
                                        {plan.limits.maxUsers === -1 ? 'Ilimitados' : plan.limits.maxUsers} usuarios
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Zap className="w-4 h-4" />
                                    <span>
                                        {plan.limits.maxAiCredits === -1 ? 'Ilimitados' : plan.limits.maxAiCredits.toLocaleString()} AI credits
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Clients badge */}
                        {plan.clientCount > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                    {plan.clientCount} cliente{plan.clientCount !== 1 ? 's' : ''} usando este plan
                                </span>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// ASSIGNMENT MODAL
// =============================================================================

interface AssignPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientTenantId: string;
    clientName: string;
    agencyTenantId: string;
    currentPlanId?: string | null;
    onAssigned: () => void;
}

export function AssignPlanModal({
    isOpen,
    onClose,
    clientTenantId,
    clientName,
    agencyTenantId,
    currentPlanId,
    onAssigned,
}: AssignPlanModalProps) {
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(currentPlanId || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedPlanId(currentPlanId || null);
            setError(null);
        }
    }, [isOpen, currentPlanId]);

    if (!isOpen) return null;

    const handleAssign = async () => {
        if (!selectedPlanId) {
            setError('Selecciona un plan');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await assignPlanToClient(clientTenantId, selectedPlanId);
            if (result.success) {
                onAssigned();
                onClose();
            } else {
                setError(result.error || 'Error al asignar el plan');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Asignar Plan</h3>
                    <p className="text-sm text-muted-foreground">
                        Selecciona un plan para <span className="font-medium text-foreground">{clientName}</span>
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <AgencyPlanCardSelector
                        tenantId={agencyTenantId}
                        selectedPlanId={selectedPlanId}
                        onChange={(plan) => setSelectedPlanId(plan?.id || null)}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={loading || !selectedPlanId}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Asignando...
                            </>
                        ) : (
                            'Asignar Plan'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
