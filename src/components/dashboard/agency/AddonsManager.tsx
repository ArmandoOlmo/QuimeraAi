/**
 * Add-ons Manager
 * Manage subscription add-ons (extra sub-clients, storage, AI credits)
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, Minus, HardDrive, Zap, Users } from 'lucide-react';

interface AddonPricing {
  extraSubClients: number;
  extraStorageGB: number;
  extraAiCredits: number;
}

interface Addon {
  id: string;
  name: string;
  description: string;
  pricePerUnit: number;
  unit: string;
  icon: React.ReactNode;
  currentQuantity: number;
}

export function AddonsManager() {
  const { currentTenant } = useTenant();
  const functions = getFunctions();

  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<AddonPricing | null>(null);
  const [addons, setAddons] = useState<Record<string, number>>({
    extraSubClients: 0,
    extraStorageGB: 0,
    extraAiCredits: 0,
  });
  const [pendingAddons, setPendingAddons] = useState<Record<string, number>>({
    extraSubClients: 0,
    extraStorageGB: 0,
    extraAiCredits: 0,
  });

  useEffect(() => {
    loadPricing();
    // loadCurrentAddons is now handled inside loadPricing
  }, [currentTenant]);

  const loadPricing = async () => {
    if (!currentTenant) return;

    // Default pricing values (used as fallback if Cloud Function unavailable)
    const defaultPricing: AddonPricing = {
      extraSubClients: 15, // $15 per additional sub-client
      extraStorageGB: 10,  // $10 per 100GB block
      extraAiCredits: 20,  // $20 per 1000 credits block
    };

    try {
      const getPricing = httpsCallable(functions, 'getAddonsPricing');
      const result = await getPricing({ tenantId: currentTenant.id }) as any;
      const data = result.data;

      // Extract pricing from addons array (backend returns 'addons' not 'availableAddons')
      const addonsArray = data.addons || data.availableAddons;
      if (addonsArray) {
        const pricingObj: AddonPricing = { ...defaultPricing };

        const currentAddonsFromBackend: Record<string, number> = {
          extraSubClients: 0,
          extraStorageGB: 0,
          extraAiCredits: 0,
        };

        addonsArray.forEach((addon: any) => {
          if (addon.id in pricingObj) {
            pricingObj[addon.id as keyof AddonPricing] = addon.pricePerUnit;
            currentAddonsFromBackend[addon.id] = addon.currentQuantity || 0;
          }
        });

        setPricing(pricingObj);
        setAddons(currentAddonsFromBackend);
        setPendingAddons(currentAddonsFromBackend);
      } else if (data.pricing) {
        // Fallback: use direct pricing object if available
        setPricing(data.pricing);
        // Load current addons from tenant data
        loadCurrentAddons();
      }
    } catch (error: any) {
      console.error('Error loading pricing:', error);
      // Use default pricing as fallback when function is unavailable
      console.log('Using default pricing values');
      setPricing(defaultPricing);
      loadCurrentAddons();
      toast.error('Precios cargados localmente (función no disponible)');
    }
  };


  const loadCurrentAddons = async () => {
    if (!currentTenant) return;

    // Load from tenant data
    const currentAddons = currentTenant.billing?.addons || {
      extraSubClients: 0,
      extraStorageGB: 0,
      extraAiCredits: 0,
    };

    setAddons(currentAddons);
    setPendingAddons(currentAddons);
  };

  const handleQuantityChange = (addonKey: string, delta: number) => {
    setPendingAddons((prev) => ({
      ...prev,
      [addonKey]: Math.max(0, (prev[addonKey] || 0) + delta),
    }));
  };

  const calculateTotalPrice = () => {
    if (!pricing) return 0;

    return (
      pendingAddons.extraSubClients * pricing.extraSubClients +
      pendingAddons.extraStorageGB * pricing.extraStorageGB +
      pendingAddons.extraAiCredits * pricing.extraAiCredits
    );
  };

  const hasChanges = () => {
    return JSON.stringify(addons) !== JSON.stringify(pendingAddons);
  };

  const handleUpdateSubscription = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const update = httpsCallable(functions, 'updateSubscriptionAddons');
      await update({
        tenantId: currentTenant.id,
        addons: pendingAddons,
      });

      toast.success('Add-ons actualizados exitosamente');
      setAddons(pendingAddons);
    } catch (error: any) {
      console.error('Error updating addons:', error);
      toast.error('Error al actualizar add-ons: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPendingAddons(addons);
  };

  if (!pricing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const addonsList: Addon[] = [
    {
      id: 'extraSubClients',
      name: 'Sub-clientes Adicionales',
      description: 'Agrega más sub-clientes a tu plan',
      pricePerUnit: pricing.extraSubClients,
      unit: 'cliente',
      icon: <Users className="w-5 h-5" />,
      currentQuantity: pendingAddons.extraSubClients,
    },
    {
      id: 'extraStorageGB',
      name: 'Almacenamiento Extra',
      description: '100 GB adicionales por unidad',
      pricePerUnit: pricing.extraStorageGB,
      unit: '100GB',
      icon: <HardDrive className="w-5 h-5" />,
      currentQuantity: pendingAddons.extraStorageGB,
    },
    {
      id: 'extraAiCredits',
      name: 'AI Credits Extra',
      description: '1000 créditos adicionales/mes por unidad',
      pricePerUnit: pricing.extraAiCredits,
      unit: '1000 credits',
      icon: <Zap className="w-5 h-5" />,
      currentQuantity: pendingAddons.extraAiCredits,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Complementos (Add-ons)
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Personaliza tu plan agregando recursos adicionales
        </p>
      </div>

      {/* Add-ons List */}
      <div className="space-y-4">
        {addonsList.map((addon) => (
          <Card key={addon.id}>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="bg-primary-100 dark:bg-primary-900/20 p-3 rounded-lg">
                    {addon.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {addon.name}
                      </h3>
                      <Badge variant="primary">
                        ${addon.pricePerUnit}/{addon.unit}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {addon.description}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(addon.id, -1)}
                        disabled={addon.currentQuantity === 0 || loading}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>

                      <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {addon.currentQuantity}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {addon.unit}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(addon.id, 1)}
                        disabled={loading}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Subtotal
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${addon.currentQuantity * addon.pricePerUnit}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      /mes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Resumen de Add-ons
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Costo mensual que se suma a tu plan base
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Mensual
              </div>
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                ${calculateTotalPrice()}
                <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                  /mes
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            {addonsList.map((addon) => {
              const subtotal = addon.currentQuantity * addon.pricePerUnit;
              if (subtotal === 0) return null;

              return (
                <div
                  key={addon.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {addon.name} ({addon.currentQuantity} × ${addon.pricePerUnit})
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${subtotal}/mes
                  </span>
                </div>
              );
            })}

            {calculateTotalPrice() === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                No hay add-ons seleccionados
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {hasChanges() && (
            <div className="flex items-center gap-3 mt-4">
              <Button
                onClick={handleUpdateSubscription}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Subscription'
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Info Card */}
      <Card>
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Información Importante
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Los cambios se aplican inmediatamente y se prorratean en tu próxima
                factura
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Puedes aumentar o reducir la cantidad de add-ons en cualquier momento
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Los add-ons se renuevan automáticamente cada mes junto con tu plan base
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Si reduces la cantidad, el cambio se reflejará en el próximo ciclo de
                facturación
              </span>
            </li>
          </ul>
        </div>
      </Card>

      {/* Proration Notice */}
      {hasChanges() && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota sobre proration:</strong> Al cambiar tus add-ons, Stripe
            ajustará automáticamente tu próxima factura. Si aumentas la cantidad, se te
            cobrará la porción proporcional para el resto del mes. Si reduces, se
            aplicará un crédito.
          </p>
        </div>
      )}
    </div>
  );
}
