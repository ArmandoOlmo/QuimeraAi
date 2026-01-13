/**
 * Agency Billing Settings
 * Manage Stripe Connect, client billing, and add-ons
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { toast } from 'react-hot-toast';
import { Loader2, ExternalLink, DollarSign, CreditCard, Plus } from 'lucide-react';

interface StripeConnectStatus {
  isConnected: boolean;
  accountId?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

interface SubClient {
  id: string;
  name: string;
  billing?: {
    monthlyPrice?: number;
    status?: string;
    paymentMethod?: string;
    nextBillingDate?: Date;
  };
}

export function BillingSettings() {
  const { currentTenant } = useTenant();
  const functions = getFunctions();

  const [loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus>({
    isConnected: false,
  });
  const [subClients, setSubClients] = useState<SubClient[]>([]);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  useEffect(() => {
    loadBillingData();
  }, [currentTenant]);

  const loadBillingData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      // Get Stripe Connect status
      const getStatus = httpsCallable(functions, 'agencyBilling-getStripeConnectStatus');
      const statusResult = await getStatus({ tenantId: currentTenant.id });
      setStripeStatus(statusResult.data as StripeConnectStatus);

      // Load sub-clients (would come from TenantContext in real implementation)
      // For now, mock data
      // TODO: Replace with actual query from Firestore
      // const clientsQuery = query(
      //   collection(db, 'tenants'),
      //   where('ownerTenantId', '==', currentTenant.id)
      // );
      // const clientsSnapshot = await getDocs(clientsQuery);
      // setSubClients(clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error: any) {
      console.error('Error loading billing data:', error);
      toast.error('Error al cargar datos de facturación');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setLoading(true);
      const createAccount = httpsCallable(functions, 'agencyBilling-createStripeConnectAccount');
      const result = await createAccount({ tenantId: currentTenant?.id }) as any;

      if (result.data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = result.data.onboardingUrl;
      } else {
        toast.success('Cuenta de Stripe Connect creada exitosamente');
        await loadBillingData();
      }
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast.error('Error al conectar Stripe: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    try {
      const createLoginLink = httpsCallable(functions, 'stripeConnect-createLoginLink');
      const result = await createLoginLink({ accountId: stripeStatus.accountId }) as any;

      if (result.data.url) {
        window.open(result.data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error opening Stripe dashboard:', error);
      toast.error('Error al abrir dashboard de Stripe');
    }
  };

  const handleSetupClientBilling = async (clientId: string, monthlyPrice: number) => {
    try {
      setLoading(true);
      const setup = httpsCallable(functions, 'agencyBilling-setupClientBilling');
      await setup({
        clientTenantId: clientId,
        monthlyPrice,
        paymentMethodId: 'pm_test_card', // TODO: Replace with actual payment method selection
      });

      toast.success('Facturación configurada exitosamente');
      setEditingClientId(null);
      await loadBillingData();
    } catch (error: any) {
      console.error('Error setting up billing:', error);
      toast.error('Error al configurar facturación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (clientId: string, newPrice: number) => {
    try {
      setLoading(true);
      const update = httpsCallable(functions, 'agencyBilling-updateClientMonthlyPrice');
      await update({
        clientTenantId: clientId,
        newMonthlyPrice: newPrice,
      });

      toast.success('Precio actualizado exitosamente');
      setEditingClientId(null);
      await loadBillingData();
    } catch (error: any) {
      console.error('Error updating price:', error);
      toast.error('Error al actualizar precio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (clientId: string) => {
    if (!confirm('¿Estás seguro de cancelar la facturación para este cliente?')) {
      return;
    }

    try {
      setLoading(true);
      const cancel = httpsCallable(functions, 'agencyBilling-cancelClientSubscription');
      await cancel({ clientTenantId: clientId });

      toast.success('Facturación cancelada');
      await loadBillingData();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast.error('Error al cancelar facturación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (clientId: string) => {
    try {
      setLoading(true);
      const generate = httpsCallable(functions, 'agencyBilling-generateClientInvoice');
      const result = await generate({ clientTenantId: clientId }) as any;

      if (result.data.invoiceUrl) {
        window.open(result.data.invoiceUrl, '_blank');
        toast.success('Invoice generado');
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error('Error al generar invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stripeStatus.isConnected) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stripe Connect Setup */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stripe Connect
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configura tu cuenta de Stripe para cobrar a tus clientes
              </p>
            </div>
            {stripeStatus.isConnected && (
              <Badge variant="success">
                Conectado
              </Badge>
            )}
          </div>

          {!stripeStatus.isConnected ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                Para facturar a tus sub-clientes, necesitas conectar una cuenta de Stripe Connect.
                Esto te permitirá recibir pagos directamente.
              </p>
              <Button onClick={handleConnectStripe} disabled={loading}>
                <CreditCard className="w-4 h-4 mr-2" />
                Conectar Stripe
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Account ID</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {stripeStatus.accountId}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Estado</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={stripeStatus.chargesEnabled ? 'success' : 'warning'}>
                      {stripeStatus.chargesEnabled ? 'Activo' : 'Pendiente'}
                    </Badge>
                    {!stripeStatus.detailsSubmitted && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">
                        Completar onboarding
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenStripeDashboard}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Dashboard de Stripe
                </Button>
                {!stripeStatus.detailsSubmitted && (
                  <Button onClick={handleConnectStripe}>
                    Completar Configuración
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Client Billing Management */}
      {stripeStatus.isConnected && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Facturación de Sub-clientes
            </h3>

            {subClients.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No hay sub-clientes aún
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Crea tu primer sub-cliente para configurar facturación
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Precio Mensual
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Próxima Factura
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {subClients.map((client) => (
                      <tr key={client.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {client.name}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {editingClientId === client.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editingPrice}
                                onChange={(e) => setEditingPrice(Number(e.target.value))}
                                className="w-24"
                                min="0"
                                step="1"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePrice(client.id, editingPrice)}
                              >
                                Guardar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingClientId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900 dark:text-white">
                                ${client.billing?.monthlyPrice || 0}/mes
                              </span>
                              {client.billing?.monthlyPrice && (
                                <button
                                  onClick={() => {
                                    setEditingClientId(client.id);
                                    setEditingPrice(client.billing?.monthlyPrice || 0);
                                  }}
                                  className="text-xs text-primary-600 hover:text-primary-700"
                                >
                                  Editar
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              client.billing?.status === 'active'
                                ? 'success'
                                : client.billing?.status === 'payment_failed'
                                ? 'error'
                                : 'default'
                            }
                          >
                            {client.billing?.status || 'No configurado'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {client.billing?.nextBillingDate
                            ? new Date(client.billing.nextBillingDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {!client.billing?.monthlyPrice ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingClientId(client.id);
                                  setEditingPrice(50);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Configurar
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleGenerateInvoice(client.id)}
                                >
                                  Invoice
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelSubscription(client.id)}
                                >
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Información Importante
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Quimera cobra una comisión del 10% sobre cada pago</li>
            <li>• Los pagos se procesan automáticamente cada mes</li>
            <li>• Puedes generar invoices manualmente en cualquier momento</li>
            <li>• Los clientes con pagos fallidos se suspenden automáticamente</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
