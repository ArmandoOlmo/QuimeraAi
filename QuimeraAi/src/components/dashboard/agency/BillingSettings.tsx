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
import { useTranslation } from 'react-i18next';

interface StripeConnectStatus {
  isConnected: boolean;
  accountId?: string;
  detailsSubmitted?: boolean;
}

interface SubClient {
  id: string;
  name: string;
  billing?: {
    plan?: string;
    monthlyPrice?: number;
    status?: string;
  };
}

export function BillingSettings() {
  const { t } = useTranslation();
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
      const getStatus = httpsCallable(functions, 'getStripeConnectStatus');
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
      const connectStripe = httpsCallable(functions, 'createStripeConnectAccount');
      const result = await connectStripe({ tenantId: currentTenant?.id });
      const { url } = result.data as { url: string };
      window.location.href = url;
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast.error('Error al conectar con Stripe');
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (clientId: string) => {
    try {
      const updatePrice = httpsCallable(functions, 'updateClientMonthlyPrice');
      await updatePrice({ clientId, price: editingPrice });
      setSubClients(prev => prev.map(c => c.id === clientId ? { ...c, billing: { ...c.billing, monthlyPrice: editingPrice } } : c));
      setEditingClientId(null);
      toast.success('Precio actualizado');
    } catch (error) {
      toast.error('Error al actualizar precio');
    }
  };

  if (loading && !stripeStatus.isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Stripe Connect</h3>
            <p className="text-sm text-muted-foreground">
              Configura tu cuenta de Stripe para recibir pagos de tus clientes.
            </p>
          </div>
          {stripeStatus.isConnected ? (
            <Badge variant="success" className="bg-green-100 text-green-800">Conectado</Badge>
          ) : (
            <Button onClick={handleConnectStripe} disabled={loading}>
              Conectar con Stripe
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Gestión de Clientes</h3>
        <div className="space-y-4">
          {subClients.map(client => (
            <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-muted-foreground">{client.billing?.plan || 'Plan No Configurado'}</p>
              </div>
              <div className="flex items-center gap-4">
                {editingClientId === client.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editingPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-24"
                    />
                    <Button size="sm" onClick={() => handleUpdatePrice(client.id)}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingClientId(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">${client.billing?.monthlyPrice || 0}/mes</span>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingClientId(client.id);
                      setEditingPrice(client.billing?.monthlyPrice || 0);
                    }}>Editar</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {subClients.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No hay clientes configurados.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
