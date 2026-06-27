/**
 * ClientBillingManager
 * Manage billing configuration for each sub-client
 */

import React, { useState, useEffect } from 'react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useServiceAccess } from '../../../hooks/useServiceAccess';
import { supabase } from '../../../supabase';
import {
    DollarSign,
    CreditCard,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    Loader2,
    AlertCircle,
    Plus,
    Settings,
    Package,
} from 'lucide-react';
import { AssignPlanModal } from './plans';
import { GeneratePaymentLink } from './GeneratePaymentLink';
import {
    AgencyPanel,
    agencyModalBodyClass,
    agencyModalFooterClass,
    agencyModalOverlayClass,
    agencyModalPanelClass,
} from './AgencyDesignSystem';



interface ClientBillingInfo {
    clientId: string;
    clientName: string;
    monthlyPrice?: number;
    status?: string;
    paymentMethod?: string;
    paymentMethodStatus?: 'configured' | 'checkout_pending';
    nextBillingDate?: Date;
    subscriptionId?: string;
    agencyPlanId?: string;
    agencyPlanName?: string;
    limits?: any;
}

export function ClientBillingManager() {
    const { subClients } = useAgency();
    const { currentTenant } = useTenant();
    const serviceAccess = useServiceAccess();
    const agencyBillingAccess = serviceAccess.canAccessModule('agency-billing', {
        serviceId: 'agency',
        requiredPermission: 'canManageBilling',
    });
    const agencyPlanAssignmentAccess = serviceAccess.canAccessModule('agency-service-plans', {
        serviceId: 'agency',
        requiredPermission: 'canManageBilling',
    });
    const canManageAgencyBilling = !serviceAccess.isLoading && agencyBillingAccess.allowed;
    const canAssignClientPlan = !serviceAccess.isLoading && agencyPlanAssignmentAccess.allowed;
    const [clientsBilling, setClientsBilling] = useState<ClientBillingInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingClient, setEditingClient] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<string>('');
    const [setupModalClient, setSetupModalClient] = useState<string | null>(null);
    const [setupPrice, setSetupPrice] = useState<string>('');
    const [editLimitsClient, setEditLimitsClient] = useState<string | null>(null);
    const [editLimits, setEditLimits] = useState<any>(null);
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [cancelConfirm, setCancelConfirm] = useState<{ isOpen: boolean; clientId: string; clientName: string }>({ isOpen: false, clientId: '', clientName: '' });

    // Plan assignment modal state
    const [assignPlanModal, setAssignPlanModal] = useState<{
        isOpen: boolean;
        clientId: string;
        clientName: string;
        currentPlanId: string | null;
    }>({ isOpen: false, clientId: '', clientName: '', currentPlanId: null });

    // Payment link modal state
    const [paymentLinkModal, setPaymentLinkModal] = useState<{
        isOpen: boolean;
        clientId: string;
        clientName: string;
        currentPlanId: string | null;
    }>({ isOpen: false, clientId: '', clientName: '', currentPlanId: null });

    useEffect(() => {
        loadClientsBilling();
    }, [subClients]);

    const parseBillingDate = (value: any): Date | undefined => {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (typeof value === 'string') {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? undefined : parsed;
        }
        if (typeof value.seconds === 'number') {
            return new Date(value.seconds * 1000);
        }
        return undefined;
    };

    const formatPaymentMethodSummary = (billing: Record<string, any>): { label?: string; status?: ClientBillingInfo['paymentMethodStatus'] } => {
        const details = billing.paymentMethodDetails && typeof billing.paymentMethodDetails === 'object'
            ? billing.paymentMethodDetails
            : null;
        const type = typeof details?.type === 'string' ? details.type : '';
        const brand = typeof details?.brand === 'string' ? details.brand : '';
        const last4 = typeof details?.last4 === 'string' ? details.last4 : '';

        if (type === 'card' && last4) {
            const cardBrand = brand ? `${brand.charAt(0).toUpperCase()}${brand.slice(1)}` : 'Card';
            return { label: `${cardBrand} **** ${last4}`, status: 'configured' };
        }

        if (type) {
            return { label: `${type.replaceAll('_', ' ')} via Stripe`, status: 'configured' };
        }

        if (billing.stripeCheckoutSessionId && !billing.stripeSubscriptionId) {
            return { label: 'Checkout pendiente', status: 'checkout_pending' };
        }

        if (billing.stripeSubscriptionId) {
            return { label: 'Stripe Billing', status: 'configured' };
        }

        return {};
    };

    const loadClientsBilling = () => {
        const billingInfo: ClientBillingInfo[] = subClients.map((client) => {
            const billing = (client.billing || {}) as Record<string, any>;
            const paymentMethod = formatPaymentMethodSummary(billing);

            return {
                clientId: client.id,
                clientName: client.name,
                monthlyPrice: client.billing?.monthlyPrice,
                status: (client.billing as any)?.status,
                paymentMethod: paymentMethod.label,
                paymentMethodStatus: paymentMethod.status,
                nextBillingDate: parseBillingDate(client.billing?.nextBillingDate || client.billing?.currentPeriodEnd),
                subscriptionId: client.billing?.stripeSubscriptionId || client.billing?.stripeCheckoutSessionId,
                agencyPlanId: (client as any).agencyPlanId || client.billing?.agencyPlanId,
                agencyPlanName: (client as any).agencyPlanName || client.billing?.agencyPlanName,
                limits: client.limits,
            };
        });

        setClientsBilling(billingInfo);
    };

    const requireAgencyBillingAccess = () => {
        if (serviceAccess.isLoading) {
            setError('Validando acceso a facturación de agencia');
            return false;
        }

        if (!agencyBillingAccess.allowed) {
            setError(agencyBillingAccess.message);
            return false;
        }

        return true;
    };

    const requireAgencyPlanAssignmentAccess = () => {
        if (serviceAccess.isLoading) {
            setError('Validando acceso a planes de servicio de agencia');
            return false;
        }

        if (!agencyPlanAssignmentAccess.allowed) {
            setError(agencyPlanAssignmentAccess.message);
            return false;
        }

        return true;
    };

    const handleOpenAssignPlan = (client: ClientBillingInfo) => {
        if (!requireAgencyPlanAssignmentAccess()) return;

        setAssignPlanModal({
            isOpen: true,
            clientId: client.clientId,
            clientName: client.clientName,
            currentPlanId: client.agencyPlanId || null,
        });
    };

    const handlePlanAssigned = () => {
        // Refresh the client list - the parent component should reload
        loadClientsBilling();
    };

    const handleUpdateLimits = async () => {
        if (!editLimitsClient || !editLimits) return;
        if (!requireAgencyBillingAccess()) return;

        setProcessingAction(editLimitsClient);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'updateTenantLimits', tenantId: editLimitsClient, limits: editLimits }
            });
            if (result.error) throw result.error;

            setEditLimitsClient(null);
            setEditLimits(null);
            loadClientsBilling();
            alert('Límites actualizados exitosamente');
        } catch (err: any) {
            console.error('Error updating limits:', err);
            setError(err.message || 'Error al actualizar límites');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleSetupBilling = async (clientId: string) => {
        if (!requireAgencyBillingAccess()) return;

        if (!setupPrice || parseFloat(setupPrice) <= 0) {
            setError('Ingresa un precio válido');
            return;
        }

        setProcessingAction(clientId);
        setError(null);

        try {
            const origin = window.location.origin;
            const result = await supabase.functions.invoke('stripe-api', {
                body: {
                    action: 'setupClientBilling',
                    clientTenantId: clientId,
                    monthlyPrice: parseFloat(setupPrice),
                    successUrl: `${origin}/dashboard/agency/billing?billing=success&client=${clientId}`,
                    cancelUrl: `${origin}/dashboard/agency/billing?billing=cancelled&client=${clientId}`,
                }
            });
            if (result.error) throw result.error;

            const checkoutUrl = (result.data as any)?.data?.url || (result.data as any)?.url;
            setSetupModalClient(null);
            setSetupPrice('');
            loadClientsBilling();

            if (checkoutUrl) {
                window.location.assign(checkoutUrl);
                return;
            }

            alert('Sesión de pago creada. Revisa Stripe para completar la configuración.');
        } catch (err: any) {
            console.error('Error setting up billing:', err);
            setError(err.message || 'Error al configurar facturación');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleUpdatePrice = async (clientId: string) => {
        if (!requireAgencyBillingAccess()) return;

        if (!editPrice || parseFloat(editPrice) <= 0) {
            setError('Ingresa un precio válido');
            return;
        }

        setProcessingAction(clientId);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: {
                    action: 'updateClientMonthlyPrice',
                    clientTenantId: clientId,
                    newMonthlyPrice: parseFloat(editPrice)
                }
            });
            if (result.error) throw result.error;

            setEditingClient(null);
            setEditPrice('');
            loadClientsBilling();

            alert('Precio actualizado exitosamente');
        } catch (err: any) {
            console.error('Error updating price:', err);
            setError(err.message || 'Error al actualizar precio');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleCancelSubscription = (clientId: string, clientName: string) => {
        if (!requireAgencyBillingAccess()) return;

        setCancelConfirm({ isOpen: true, clientId, clientName });
    };

    const confirmCancelSubscription = async () => {
        const { clientId } = cancelConfirm;
        setCancelConfirm({ isOpen: false, clientId: '', clientName: '' });
        if (!requireAgencyBillingAccess()) return;

        setProcessingAction(clientId);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: {
                    action: 'cancelClientSubscription',
                    clientTenantId: clientId,
                    cancelImmediately: false
                }
            });
            if (result.error) throw result.error;

            loadClientsBilling();
            alert('Suscripción cancelada. Se detendrá al final del período actual.');
        } catch (err: any) {
            console.error('Error cancelling subscription:', err);
            setError(err.message || 'Error al cancelar suscripción');
        } finally {
            setProcessingAction(null);
        }
    };

    const getStatusBadge = (status?: string) => {
        const styles: Record<string, { bg: string; text: string; label: string; icon: any }> = {
            active: {
                bg: 'bg-q-success/10 dark:bg-q-success/12',
                text: 'text-q-success dark:text-q-success',
                label: 'Activo',
                icon: CheckCircle,
            },
            payment_failed: {
                bg: 'bg-q-error/10 dark:bg-q-error/12',
                text: 'text-q-error dark:text-q-error',
                label: 'Pago Fallido',
                icon: XCircle,
            },
            cancelling: {
                bg: 'bg-q-accent/10 dark:bg-q-accent/12',
                text: 'text-q-accent dark:text-q-accent',
                label: 'Cancelando',
                icon: AlertCircle,
            },
            checkout_pending: {
                bg: 'bg-q-accent/10 dark:bg-q-accent/12',
                text: 'text-q-accent dark:text-q-accent',
                label: 'Checkout pendiente',
                icon: AlertCircle,
            },
            payment_link_pending: {
                bg: 'bg-q-accent/10 dark:bg-q-accent/12',
                text: 'text-q-accent dark:text-q-accent',
                label: 'Link pendiente',
                icon: AlertCircle,
            },
            trial: {
                bg: 'bg-primary/10 dark:bg-primary/12',
                text: 'text-primary dark:text-primary',
                label: 'Trial',
                icon: CheckCircle,
            },
            cancelled: {
                bg: 'bg-q-surface-overlay dark:bg-gray-900/20',
                text: 'text-q-text dark:text-gray-400',
                label: 'Cancelado',
                icon: XCircle,
            },
        };

        if (!status) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-q-surface-overlay dark:bg-gray-900/20 text-q-text dark:text-gray-400">
                    Sin configurar
                </span>
            );
        }

        const style = styles[status] || styles.active;
        const Icon = style.icon;

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
            >
                <Icon className="h-3.5 w-3.5" />
                {style.label}
            </span>
        );
    };

    const formatDate = (date?: Date) => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {error && (
                <div className="bg-q-error/10 dark:bg-q-error/12 border border-q-error/25 dark:border-q-error/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-q-error dark:text-q-error flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-q-error dark:text-q-error">Error</h3>
                            <p className="text-q-error dark:text-q-error text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Clients Table */}
            <AgencyPanel title="Configuración de Precios por Cliente" contentClassName="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                    Cliente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                    Plan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                    Precio Mensual
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                    Método de Pago
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                    Próxima Factura
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-q-text-muted uppercase">
                                    Límites
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-q-text-muted uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {clientsBilling.map((client) => (
                                <tr key={client.clientId} className="hover:bg-muted/50">
                                    {/* Client Name */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-foreground">
                                            {client.clientName}
                                        </div>
                                    </td>

                                    {/* Plan */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {client.agencyPlanName ? (
                                            <button
                                                onClick={() => handleOpenAssignPlan(client)}
                                                disabled={!canAssignClientPlan}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Package className="h-3 w-3" />
                                                {client.agencyPlanName}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenAssignPlan(client)}
                                                disabled={!canAssignClientPlan}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-q-text-muted hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Asignar Plan
                                            </button>
                                        )}
                                    </td>

                                    {/* Monthly Price */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {editingClient === client.clientId ? (
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-q-text-muted">
                                                        $
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={editPrice}
                                                        onChange={(e) => setEditPrice(e.target.value)}
                                                        className="w-32 pl-6 pr-3 py-1 border border-q-border rounded bg-q-bg text-foreground text-sm focus:ring-2 focus:ring-q-accent/35"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleUpdatePrice(client.clientId)}
                                                    disabled={processingAction === client.clientId}
                                                    className="p-1 text-q-success hover:text-q-success disabled:opacity-50"
                                                >
                                                    {processingAction === client.clientId ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingClient(null);
                                                        setEditPrice('');
                                                    }}
                                                    className="p-1 text-q-text-muted hover:text-q-text"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : client.monthlyPrice ? (
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    ${client.monthlyPrice.toFixed(2)}
                                                </span>
                                                <span className="text-sm text-q-text-muted">/mes</span>
                                            </div>
                                        ) : (
                                            <span className="text-q-text-muted">-</span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(client.status)}
                                    </td>

                                    {/* Payment Method */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {client.paymentMethod ? (
                                            <div className="flex items-center gap-2 text-sm text-foreground">
                                                <CreditCard className={client.paymentMethodStatus === 'checkout_pending' ? 'h-4 w-4 text-q-accent' : 'h-4 w-4 text-primary'} />
                                                <span>{client.paymentMethod}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-q-text-muted">Sin configurar</span>
                                        )}
                                    </td>

                                    {/* Next Billing Date */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                        {formatDate(client.nextBillingDate)}
                                    </td>

                                    {/* Limits */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-xs text-q-text-muted space-y-1">
                                            <div>Proyectos: <span className="text-foreground font-medium">{client.limits?.maxProjects || 0}</span></div>
                                            <div>AI Credits: <span className="text-foreground font-medium">{client.limits?.maxAiCredits || 0}</span></div>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!client.subscriptionId ? (
                                                <button
                                                    onClick={() => {
                                                        if (!requireAgencyBillingAccess()) return;

                                                        setPaymentLinkModal({
                                                            isOpen: true,
                                                            clientId: client.clientId,
                                                            clientName: client.clientName,
                                                            currentPlanId: client.agencyPlanId || null,
                                                        });
                                                    }}
                                                    disabled={!canManageAgencyBilling}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-q-accent hover:text-q-accent dark:text-q-accent dark:hover:text-q-accent hover:bg-q-accent/10 dark:hover:bg-q-accent/12 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Generar Link
                                                </button>
                                            ) : (
                                                <>
                                                    {client.status === 'active' && (
                                                        <button
                                                            onClick={() => {
                                                                if (!requireAgencyBillingAccess()) return;

                                                                setEditLimitsClient(client.clientId);
                                                                setEditLimits({ ...(client as any).limits });
                                                            }}
                                                            disabled={!canManageAgencyBilling}
                                                            className="p-2 text-q-accent hover:text-q-accent dark:text-q-accent dark:hover:text-q-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Editar límites"
                                                        >
                                                            <Settings className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {client.status === 'active' && (
                                                        <button
                                                            onClick={() => {
                                                                if (!requireAgencyBillingAccess()) return;

                                                                setEditingClient(client.clientId);
                                                                setEditPrice(
                                                                    client.monthlyPrice?.toString() || ''
                                                                );
                                                            }}
                                                            disabled={!canManageAgencyBilling}
                                                            className="p-2 text-q-accent hover:text-q-accent dark:text-q-accent dark:hover:text-q-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Editar precio"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {client.status === 'active' && (
                                                        <button
                                                            onClick={() =>
                                                                handleCancelSubscription(
                                                                    client.clientId,
                                                                    client.clientName
                                                                )
                                                            }
                                                            disabled={
                                                                processingAction === client.clientId || !canManageAgencyBilling
                                                            }
                                                            className="p-2 text-q-error hover:text-q-error dark:text-q-error dark:hover:text-q-error disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Cancelar suscripción"
                                                        >
                                                            {processingAction === client.clientId ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {clientsBilling.length === 0 && (
                    <div className="text-center py-12">
                        <DollarSign className="h-12 w-12 text-q-text-muted mx-auto mb-4" />
                        <p className="text-q-text-muted">
                            No hay clientes para facturar
                        </p>
                    </div>
                )}
            </AgencyPanel>

            {/* Edit Limits Modal */}
            {editLimitsClient && (
                <div className={agencyModalOverlayClass}>
                    <div className={`${agencyModalPanelClass} max-w-md`}>
                        <div className="shrink-0 px-6 py-4 border-b border-q-border">
                            <h3 className="text-lg font-semibold text-foreground">
                                Gestionar Límites del Plan
                            </h3>
                        </div>

                        <div className={`${agencyModalBodyClass} p-6 space-y-4`}>
                            <p className="text-sm text-q-text-muted mb-4">
                                Ajusta los límites de recursos para{' '}
                                <span className="font-medium text-foreground">
                                    {clientsBilling.find(c => c.clientId === editLimitsClient)?.clientName}
                                </span>
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-q-text-muted uppercase mb-1">
                                        Proyectos Máx.
                                    </label>
                                    <input
                                        type="number"
                                        value={editLimits?.maxProjects || 0}
                                        onChange={(e) => setEditLimits({ ...editLimits, maxProjects: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-q-border rounded-lg bg-q-bg text-foreground focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-q-text-muted uppercase mb-1">
                                        Usuarios Máx.
                                    </label>
                                    <input
                                        type="number"
                                        value={editLimits?.maxUsers || 0}
                                        onChange={(e) => setEditLimits({ ...editLimits, maxUsers: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-q-border rounded-lg bg-q-bg text-foreground focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-q-text-muted uppercase mb-1">
                                        Almacenamiento (GB)
                                    </label>
                                    <input
                                        type="number"
                                        value={editLimits?.maxStorageGB || 0}
                                        onChange={(e) => setEditLimits({ ...editLimits, maxStorageGB: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-q-border rounded-lg bg-q-bg text-foreground focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-q-text-muted uppercase mb-1">
                                        Créditos AI Máx.
                                    </label>
                                    <input
                                        type="number"
                                        value={editLimits?.maxAiCredits || 0}
                                        onChange={(e) => setEditLimits({ ...editLimits, maxAiCredits: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-q-border rounded-lg bg-q-bg text-foreground focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={`${agencyModalFooterClass} px-6 py-4 flex flex-wrap justify-end gap-3`}>
                            <button
                                onClick={() => {
                                    setEditLimitsClient(null);
                                    setEditLimits(null);
                                }}
                                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                                disabled={processingAction === editLimitsClient}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateLimits}
                                disabled={processingAction === editLimitsClient || !canManageAgencyBilling}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingAction === editLimitsClient ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Setup Modal */}
            {setupModalClient && (
                <div className={agencyModalOverlayClass}>
                    <div className={`${agencyModalPanelClass} max-w-md`}>
                        <div className="shrink-0 px-6 py-4 border-b border-q-border">
                            <h3 className="text-lg font-semibold text-foreground">
                                Configurar Facturación
                            </h3>
                        </div>

                        <div className={`${agencyModalBodyClass} px-6 py-4 space-y-4`}>
                            <p className="text-sm text-q-text-muted">
                                Configura el precio mensual para{' '}
                                {clientsBilling.find((c) => c.clientId === setupModalClient)?.clientName}
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Precio Mensual (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-q-text-muted">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        value={setupPrice}
                                        onChange={(e) => setSetupPrice(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-q-border rounded-lg bg-q-bg text-foreground focus:ring-2 focus:ring-q-accent/35"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                                <p className="text-xs text-q-text-muted dark:text-gray-500 mt-1">
                                    El cliente será facturado automáticamente cada mes
                                </p>
                            </div>
                        </div>

                        <div className={`${agencyModalFooterClass} px-6 py-4 flex flex-wrap justify-end gap-3`}>
                            <button
                                onClick={() => {
                                    setSetupModalClient(null);
                                    setSetupPrice('');
                                }}
                                className="px-4 py-2 text-foreground hover:bg-q-surface-overlay dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleSetupBilling(setupModalClient)}
                                disabled={!setupPrice || processingAction === setupModalClient || !canManageAgencyBilling}
                                className="px-4 py-2 bg-q-accent text-q-text-on-accent rounded-lg hover:bg-q-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                            >
                                {processingAction === setupModalClient ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Configurando...
                                    </>
                                ) : (
                                    'Configurar Facturación'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Plan Modal */}
            {currentTenant?.id && (
                <AssignPlanModal
                    isOpen={assignPlanModal.isOpen}
                    onClose={() => setAssignPlanModal({ ...assignPlanModal, isOpen: false })}
                    clientTenantId={assignPlanModal.clientId}
                    clientName={assignPlanModal.clientName}
                    agencyTenantId={currentTenant.id}
                    currentPlanId={assignPlanModal.currentPlanId}
                    onAssigned={handlePlanAssigned}
                />
            )}

            {/* Generate Payment Link Modal */}
            <GeneratePaymentLink
                isOpen={paymentLinkModal.isOpen}
                onClose={() => setPaymentLinkModal({ ...paymentLinkModal, isOpen: false })}
                clientTenantId={paymentLinkModal.clientId}
                clientName={paymentLinkModal.clientName}
                currentPlanId={paymentLinkModal.currentPlanId}
            />

            <ConfirmationModal
                isOpen={cancelConfirm.isOpen}
                onConfirm={confirmCancelSubscription}
                onCancel={() => setCancelConfirm({ isOpen: false, clientId: '', clientName: '' })}
                title="¿Cancelar suscripción?"
                message={`¿Estás seguro de cancelar la suscripción de ${cancelConfirm.clientName}? Esto detendrá los cobros automáticos.`}
                variant="danger"
            />
        </div>
    );
}
