/**
 * Add-ons Manager
 * Manage subscription add-ons for agency plans
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Plus,
  Minus,
  Users,
  HardDrive,
  Zap,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Package,
} from 'lucide-react';
import { useTenant } from '@/contexts/tenant/TenantContext';
import QuimeraLoader from '@/components/ui/QuimeraLoader';

// ============================================================================
// TYPES
// ============================================================================

interface AddonOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  pricePerUnit: number;
  unit: string;
  unitLabel: string;
  currentQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  recommended?: boolean;
}

interface SubscriptionAddons {
  extraSubClients?: number;
  extraStorageGB?: number;
  extraAiCredits?: number;
}

interface AddonsManagerProps {
  onUpdate?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ADDON_PRICING = {
  extraSubClients: 15, // $15 per additional sub-client
  extraStorageGB: 0.1, // $0.10 per GB (sold in 100GB blocks = $10)
  extraAiCredits: 0.02, // $0.02 per credit (sold in 1000 credit blocks = $20)
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AddonsManager({ onUpdate }: AddonsManagerProps) {
  const { currentTenant } = useTenant();
  const [addons, setAddons] = useState<AddonOption[]>([]);
  const [originalAddons, setOriginalAddons] = useState<SubscriptionAddons>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const functions = getFunctions();

  // ============================================================================
  // LOAD CURRENT ADDONS
  // ============================================================================

  useEffect(() => {
    if (currentTenant) {
      loadCurrentAddons();
    }
  }, [currentTenant]);

  const loadCurrentAddons = () => {
    setIsLoading(true);

    const currentAddons: SubscriptionAddons = {
      extraSubClients: currentTenant?.billing?.addons?.extraSubClients || 0,
      extraStorageGB: currentTenant?.billing?.addons?.extraStorageGB || 0,
      extraAiCredits: currentTenant?.billing?.addons?.extraAiCredits || 0,
    };

    setOriginalAddons(currentAddons);

    const addonOptions: AddonOption[] = [
      {
        id: 'extraSubClients',
        name: 'Sub-clientes Adicionales',
        description:
          'Aumenta el límite de sub-clientes que puedes gestionar',
        icon: <Users className="h-6 w-6" />,
        pricePerUnit: ADDON_PRICING.extraSubClients,
        unit: 'cliente',
        unitLabel: 'clientes',
        currentQuantity: currentAddons.extraSubClients || 0,
        minQuantity: 0,
        maxQuantity: 50,
        recommended: true,
      },
      {
        id: 'extraStorageGB',
        name: 'Almacenamiento Extra',
        description: 'Espacio adicional para archivos, imágenes y contenido',
        icon: <HardDrive className="h-6 w-6" />,
        pricePerUnit: 10, // $10 por bloque de 100GB
        unit: '100GB',
        unitLabel: 'bloques de 100GB',
        currentQuantity: Math.floor((currentAddons.extraStorageGB || 0) / 100),
        minQuantity: 0,
        maxQuantity: 50, // Max 5TB extra
      },
      {
        id: 'extraAiCredits',
        name: 'AI Credits Extra',
        description: 'Créditos adicionales para funciones de IA',
        icon: <Zap className="h-6 w-6" />,
        pricePerUnit: 20, // $20 por bloque de 1000 créditos
        unit: '1000 credits',
        unitLabel: 'bloques de 1000 créditos',
        currentQuantity: Math.floor((currentAddons.extraAiCredits || 0) / 1000),
        minQuantity: 0,
        maxQuantity: 100, // Max 100k extra credits
      },
    ];

    setAddons(addonOptions);
    setIsLoading(false);
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateAddonQuantity = (addonId: string, delta: number) => {
    setAddons((prev) =>
      prev.map((addon) => {
        if (addon.id === addonId) {
          const newQuantity = Math.max(
            addon.minQuantity,
            Math.min(addon.maxQuantity, addon.currentQuantity + delta)
          );
          return { ...addon, currentQuantity: newQuantity };
        }
        return addon;
      })
    );
    setHasChanges(true);
    setError(null);
    setSuccessMessage(null);
  };

  const setAddonQuantity = (addonId: string, quantity: number) => {
    setAddons((prev) =>
      prev.map((addon) => {
        if (addon.id === addonId) {
          const newQuantity = Math.max(
            addon.minQuantity,
            Math.min(addon.maxQuantity, quantity)
          );
          return { ...addon, currentQuantity: newQuantity };
        }
        return addon;
      })
    );
    setHasChanges(true);
    setError(null);
    setSuccessMessage(null);
  };

  const calculateAddonsCost = (): number => {
    return addons.reduce(
      (total, addon) => total + addon.currentQuantity * addon.pricePerUnit,
      0
    );
  };

  const calculateOriginalCost = (): number => {
    const extraSubClientsOriginal = originalAddons.extraSubClients || 0;
    const extraStorageOriginal =
      Math.floor((originalAddons.extraStorageGB || 0) / 100) * 10;
    const extraCreditsOriginal =
      Math.floor((originalAddons.extraAiCredits || 0) / 1000) * 20;

    return extraSubClientsOriginal * 15 + extraStorageOriginal + extraCreditsOriginal;
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Convert addon quantities to actual values
      const newAddons: SubscriptionAddons = {
        extraSubClients:
          addons.find((a) => a.id === 'extraSubClients')?.currentQuantity || 0,
        extraStorageGB:
          (addons.find((a) => a.id === 'extraStorageGB')?.currentQuantity || 0) *
          100,
        extraAiCredits:
          (addons.find((a) => a.id === 'extraAiCredits')?.currentQuantity || 0) *
          1000,
      };

      // Call Cloud Function to update subscription
      const updateSubscriptionAddons = httpsCallable(
        functions,
        'updateSubscriptionAddons'
      );

      const result = await updateSubscriptionAddons({
        tenantId: currentTenant?.id,
        addons: newAddons,
      });

      const data = result.data as any;

      if (data.success) {
        setSuccessMessage(
          `Add-ons actualizados correctamente. Nuevo total: $${data.newMonthlyTotal}/mes`
        );
        setOriginalAddons(newAddons);
        setHasChanges(false);

        if (onUpdate) {
          onUpdate();
        }

        // Reload tenant data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error updating addons:', err);
      setError(
        err.message || 'Error al actualizar los add-ons. Intenta nuevamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    loadCurrentAddons();
    setHasChanges(false);
    setError(null);
    setSuccessMessage(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <QuimeraLoader size="md" />
      </div>
    );
  }

  const currentCost = calculateAddonsCost();
  const originalCost = calculateOriginalCost();
  const costDifference = currentCost - originalCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-7 w-7 text-blue-600" />
          Complementos (Add-ons)
        </h2>
        <p className="text-gray-600 mt-2">
          Personaliza tu plan agregando recursos adicionales según tus necesidades
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900">¡Éxito!</h4>
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Add-ons Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {addons.map((addon) => (
          <AddonCard
            key={addon.id}
            addon={addon}
            onIncrease={() => updateAddonQuantity(addon.id, 1)}
            onDecrease={() => updateAddonQuantity(addon.id, -1)}
            onQuantityChange={(qty) => setAddonQuantity(addon.id, qty)}
          />
        ))}
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Resumen de Costos
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Costos mensuales de add-ons
            </p>
          </div>
          {hasChanges && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
              Cambios sin guardar
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Current Add-ons Cost */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Costo Actual de Add-ons:</span>
            <span className="text-xl font-bold text-gray-900">
              ${originalCost.toFixed(2)}/mes
            </span>
          </div>

          {/* New Add-ons Cost (if changed) */}
          {hasChanges && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Nuevo Costo de Add-ons:</span>
                <span className="text-xl font-bold text-blue-600">
                  ${currentCost.toFixed(2)}/mes
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                <span className="font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Diferencia:
                </span>
                <span
                  className={`text-xl font-bold ${costDifference > 0
                    ? 'text-red-600'
                    : costDifference < 0
                      ? 'text-green-600'
                      : 'text-gray-600'
                    }`}
                >
                  {costDifference > 0 ? '+' : ''}${costDifference.toFixed(2)}/mes
                </span>
              </div>
            </>
          )}

          {/* Breakdown */}
          {currentCost > 0 && (
            <div className="pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-600 mb-2">Desglose:</p>
              <div className="space-y-1">
                {addons.map((addon) => {
                  if (addon.currentQuantity > 0) {
                    const cost = addon.currentQuantity * addon.pricePerUnit;
                    return (
                      <div
                        key={addon.id}
                        className="flex justify-between text-sm text-gray-700"
                      >
                        <span>
                          {addon.name} ({addon.currentQuantity} {addon.unitLabel})
                        </span>
                        <span>${cost.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="pt-3 border-t border-blue-200">
            <p className="text-xs text-gray-600">
              💡 Los add-ons se suman a tu plan base. La facturación se actualiza
              inmediatamente y el cambio se prorratea en tu próxima factura.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {hasChanges && (
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Actualizando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADDON CARD COMPONENT
// ============================================================================

interface AddonCardProps {
  addon: AddonOption;
  onIncrease: () => void;
  onDecrease: () => void;
  onQuantityChange: (quantity: number) => void;
}

function AddonCard({
  addon,
  onIncrease,
  onDecrease,
  onQuantityChange,
}: AddonCardProps) {
  const totalCost = addon.currentQuantity * addon.pricePerUnit;

  return (
    <div
      className={`bg-white border-2 rounded-lg p-6 transition-all ${addon.recommended
        ? 'border-blue-500 shadow-md'
        : 'border-gray-200 hover:border-gray-300'
        }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-3 rounded-lg ${addon.recommended ? 'bg-blue-100' : 'bg-gray-100'
            }`}
        >
          {React.cloneElement(addon.icon as React.ReactElement, {
            className: `h-6 w-6 ${addon.recommended ? 'text-blue-600' : 'text-gray-600'
              }`,
          })}
        </div>
        {addon.recommended && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
            Recomendado
          </span>
        )}
      </div>

      {/* Info */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{addon.name}</h3>
      <p className="text-sm text-gray-600 mb-4">{addon.description}</p>

      {/* Pricing */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">
            ${addon.pricePerUnit}
          </span>
          <span className="text-sm text-gray-600">/ {addon.unit}</span>
        </div>
      </div>

      {/* Quantity Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onDecrease}
            disabled={addon.currentQuantity <= addon.minQuantity}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" />
          </button>

          <input
            type="number"
            value={addon.currentQuantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
            min={addon.minQuantity}
            max={addon.maxQuantity}
            className="flex-1 text-center text-xl font-semibold border border-gray-300 rounded-lg py-2"
          />

          <button
            onClick={onIncrease}
            disabled={addon.currentQuantity >= addon.maxQuantity}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-center text-gray-600">
          {addon.currentQuantity} {addon.unitLabel}
        </p>
      </div>

      {/* Total Cost */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Costo Mensual:
          </span>
          <span className="text-lg font-bold text-gray-900">
            ${totalCost.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
