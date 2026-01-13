/**
 * ClientBillingManager
 * Manage billing configuration for each sub-client
 */

import React, { useState, useEffect } from 'react';
import { useAgency } from '../../../contexts/agency/AgencyContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
} from 'lucide-react';

const functions = getFunctions();

interface ClientBillingInfo {
    clientId: string;
    clientName: string;
    monthlyPrice?: number;
    status?: string;
    paymentMethod?: string;
    nextBillingDate?: Date;
    subscriptionId?: string;
}

export function ClientBillingManager() {
    const { subClients } = useAgency();
    const [clientsBilling, setClientsBilling] = useState<ClientBillingInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingClient, setEditingClient] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<string>('');
    const [setupModalClient, setSetupModalClient] = useState<string | null>(null);
    const [setupPrice, setSetupPrice] = useState<string>('');
    const [processingAction, setProcessingAction] = useState<string | null>(null);

    useEffect(() => {
        loadClientsBilling();
    }, [subClients]);

    const loadClientsBilling = () => {
        const billingInfo: ClientBillingInfo[] = subClients.map((client) => ({
            clientId: client.id,
            clientName: client.name,
            monthlyPrice: client.billing?.monthlyPrice,
            status: client.billing?.status,
            paymentMethod: client.billing?.stripeCustomerId ? 'configured' : undefined,
            nextBillingDate: client.billing?.nextBillingDate
                ? new Date((client.billing.nextBillingDate as any).seconds * 1000)
                : undefined,
            subscriptionId: client.billing?.stripeSubscriptionId,
        }));

        setClientsBilling(billingInfo);
    };

    const handleSetupBilling = async (clientId: string) => {
        if (!setupPrice || parseFloat(setupPrice) <= 0) {
            setError('Ingresa un precio válido');
            return;
        }

        setProcessingAction(clientId);
        setError(null);

        try {
            // In production, you would collect payment method here using Stripe Elements
            // For now, we'll use a test payment method
            const setupClientBilling = httpsCallable(functions, 'setupClientBilling');
            await setupClientBilling({
                clientTenantId: clientId,
                monthlyPrice: parseFloat(setupPrice),
                paymentMethodId: 'pm_card_visa', // Test payment method
            });

            setSetupModalClient(null);
            setSetupPrice('');
            loadClientsBilling();

            // Success notification
            alert('Facturación configurada exitosamente');
        } catch (err: any) {
            console.error('Error setting up billing:', err);
            setError(err.message || 'Error al configurar facturación');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleUpdatePrice = async (clientId: string) => {
        if (!editPrice || parseFloat(editPrice) <= 0) {
            setError('Ingresa un precio válido');
            return;
        }

        setProcessingAction(clientId);
        setError(null);

        try {
            const updatePrice = httpsCallable(functions, 'updateClientMonthlyPrice');
            await updatePrice({
                clientTenantId: clientId,
                newMonthlyPrice: parseFloat(editPrice),
            });

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

    const handleCancelSubscription = async (clientId: string, clientName: string) => {
        const confirmed = window.confirm(
            `¿Estás seguro de cancelar la suscripción de ${clientName}? Esto detendrá los cobros automáticos.`
        );

        if (!confirmed) return;

        setProcessingAction(clientId);
        setError(null);

        try {
            const cancelSubscription = httpsCallable(functions, 'cancelClientSubscription');
            await cancelSubscription({
                clientTenantId: clientId,
                cancelImmediately: false, // Cancel at period end
            });

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
                bg: 'bg-green-100 dark:bg-green-900/20',
                text: 'text-green-800 dark:text-green-400',
                label: 'Activo',
                icon: CheckCircle,
            },
            payment_failed: {
                bg: 'bg-red-100 dark:bg-red-900/20',
                text: 'text-red-800 dark:text-red-400',
                label: 'Pago Fallido',
                icon: XCircle,
            },
            cancelling: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/20',
                text: 'text-yellow-800 dark:text-yellow-400',
                label: 'Cancelando',
                icon: AlertCircle,
            },
            cancelled: {
                bg: 'bg-gray-100 dark:bg-gray-900/20',
                text: 'text-gray-800 dark:text-gray-400',
                label: 'Cancelado',
                icon: XCircle,
            },
        };

        if (!status) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400">
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
        return new Intl.DateFormat('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-900 dark:text-red-200">Error</h3>
                            <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Clients Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Configuración de Precios por Cliente
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Cliente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Precio Mensual
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Método de Pago
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Próxima Factura
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {clientsBilling.map((client) => (
                                <tr key={client.clientId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    {/* Client Name */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {client.clientName}
                                        </div>
                                    </td>

                                    {/* Monthly Price */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {editingClient === client.clientId ? (
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                        $
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={editPrice}
                                                        onChange={(e) => setEditPrice(e.target.value)}
                                                        className="w-32 pl-6 pr-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleUpdatePrice(client.clientId)}
                                                    disabled={processingAction === client.clientId}
                                                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
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
                                                    className="p-1 text-gray-600 hover:text-gray-700"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : client.monthlyPrice ? (
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    ${client.monthlyPrice.toFixed(2)}
                                                </span>
                                                <span className="text-sm text-gray-500">/mes</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(client.status)}
                                    </td>

                                    {/* Payment Method */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {client.paymentMethod ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <CreditCard className="h-4 w-4" />
                                                <span>Configurado</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Sin configurar</span>
                                        )}
                                    </td>

                                    {/* Next Billing Date */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {formatDate(client.nextBillingDate)}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!client.subscriptionId ? (
                                                <button
                                                    onClick={() => setSetupModalClient(client.clientId)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Configurar
                                                </button>
                                            ) : (
                                                <>
                                                    {client.status === 'active' && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingClient(client.clientId);
                                                                setEditPrice(
                                                                    client.monthlyPrice?.toString() || ''
                                                                );
                                                            }}
                                                            className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
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
                                                                processingAction === client.clientId
                                                            }
                                                            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
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
                        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                            No hay clientes para facturar
                        </p>
                    </div>
                )}
            </div>

            {/* Setup Modal */}
            {setupModalClient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Configurar Facturación
                            </h3>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Configura el precio mensual para{' '}
                                {clientsBilling.find((c) => c.clientId === setupModalClient)?.clientName}
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Precio Mensual (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        value={setupPrice}
                                        onChange={(e) => setSetupPrice(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    El cliente será facturado automáticamente cada mes
                                </p>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                <p className="text-sm text-blue-900 dark:text-blue-200">
                                    <strong>Nota:</strong> En producción, aquí se mostraría el formulario
                                    de Stripe Elements para capturar el método de pago del cliente.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setSetupModalClient(null);
                                    setSetupPrice('');
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleSetupBilling(setupModalClient)}
                                disabled={!setupPrice || processingAction === setupModalClient}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
        </div>
    );
}
