/**
 * Add-ons Manager
 * Manage subscription add-ons for agency plans
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
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
  extraStorageGB: 10,  // $10 per 100GB block
  extraAiCredits: 20,  // $20 per 1000 credits block
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
        pricePerUnit: ADDON_PRICING.extraStorageGB,
        unit: '100GB',
        unitLabel: 'bloques de 100GB',
        currentQuantity: currentAddons.extraStorageGB || 0,
        minQuantity: 0,
        maxQuantity: 50, // Max 5TB extra
      },
      {
        id: 'extraAiCredits',
        name: 'AI Credits Extra',
        description: 'Créditos adicionales para funciones de IA',
        icon: <Zap className="h-6 w-6" />,
        pricePerUnit: ADDON_PRICING.extraAiCredits,
        unit: '1000 credits',
        unitLabel: 'bloques de 1000 créditos',
        currentQuantity: currentAddons.extraAiCredits || 0,
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
    const extraSubClientsOriginal = (originalAddons.extraSubClients || 0) * ADDON_PRICING.extraSubClients;
    const extraStorageOriginal = (originalAddons.extraStorageGB || 0) * ADDON_PRICING.extraStorageGB;
    const extraCreditsOriginal = (originalAddons.extraAiCredits || 0) * ADDON_PRICING.extraAiCredits;

    return extraSubClientsOriginal + extraStorageOriginal + extraCreditsOriginal;
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Addon quantities are already in block units (matching backend expectations)
      const newAddons: SubscriptionAddons = {
        extraSubClients:
          addons.find((a) => a.id === 'extraSubClients')?.currentQuantity || 0,
        extraStorageGB:
          addons.find((a) => a.id === 'extraStorageGB')?.currentQuantity || 0,
        extraAiCredits:
          addons.find((a) => a.id === 'extraAiCredits')?.currentQuantity || 0,
      };

      // Call Supabase Edge Function to update subscription
      const result = await supabase.functions.invoke('stripe-api', {
        body: {
          action: 'updateSubscriptionAddons',
          tenantId: currentTenant?.id,
          addons: newAddons,
        }
      });
      if (result.error) throw result.error;

      const data = result.data?.data || result.data;

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
        <h2 className="text-2xl font-bold text-q-text flex items-center gap-2">
          <Package className="h-7 w-7 text-q-accent" />
          Complementos (Add-ons)
        </h2>
        <p className="text-q-text-muted mt-2">
          Personaliza tu plan agregando recursos adicionales según tus necesidades
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-q-error/10 border border-q-error/25 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-q-error mt-0.5" />
          <div>
            <h4 className="font-semibold text-q-error">Error</h4>
            <p className="text-q-error text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-q-success/10 border border-q-success/25 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-q-success mt-0.5" />
          <div>
            <h4 className="font-semibold text-q-success">¡Éxito!</h4>
            <p className="text-q-success text-sm">{successMessage}</p>
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
      <div className="bg-gradient-to-br from-q-accent to-q-accent border border-q-accent/25 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-q-text flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-q-accent" />
              Resumen de Costos
            </h3>
            <p className="text-sm text-q-text-muted mt-1">
              Costos mensuales de add-ons
            </p>
          </div>
          {hasChanges && (
            <span className="px-3 py-1 bg-q-accent/10 text-q-accent text-xs font-semibold rounded-full">
              Cambios sin guardar
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Current Add-ons Cost */}
          <div className="flex justify-between items-center">
            <span className="text-q-text">Costo Actual de Add-ons:</span>
            <span className="text-xl font-bold text-q-text">
              ${originalCost.toFixed(2)}/mes
            </span>
          </div>

          {/* New Add-ons Cost (if changed) */}
          {hasChanges && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-q-text">Nuevo Costo de Add-ons:</span>
                <span className="text-xl font-bold text-q-accent">
                  ${currentCost.toFixed(2)}/mes
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-q-accent/25">
                <span className="font-semibold text-q-text flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Diferencia:
                </span>
                <span
                  className={`text-xl font-bold ${costDifference > 0
                    ? 'text-q-error'
                    : costDifference < 0
                      ? 'text-q-success'
                      : 'text-q-text-muted'
                    }`}
                >
                  {costDifference > 0 ? '+' : ''}${costDifference.toFixed(2)}/mes
                </span>
              </div>
            </>
          )}

          {/* Breakdown */}
          {currentCost > 0 && (
            <div className="pt-3 border-t border-q-accent/25">
              <p className="text-xs text-q-text-muted mb-2">Desglose:</p>
              <div className="space-y-1">
                {addons.map((addon) => {
                  if (addon.currentQuantity > 0) {
                    const cost = addon.currentQuantity * addon.pricePerUnit;
                    return (
                      <div
                        key={addon.id}
                        className="flex justify-between text-sm text-q-text"
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
          <div className="pt-3 border-t border-q-accent/25">
            <p className="text-xs text-q-text-muted">
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
            className="px-6 py-2 border border-q-border text-q-text rounded-lg hover:bg-q-surface-overlay font-semibold"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-6 py-2 bg-q-accent text-q-text-on-accent rounded-lg hover:bg-q-accent font-semibold disabled:opacity-50 flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-q-border border-t-transparent rounded-full" />
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
      className={`bg-q-surface border-2 rounded-lg p-6 transition-all ${addon.recommended
        ? 'border-q-accent/25 shadow-md'
        : 'border-q-border hover:border-q-border'
        }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-3 rounded-lg ${addon.recommended ? 'bg-q-accent/10' : 'bg-q-surface-overlay'
            }`}
        >
          {React.cloneElement(addon.icon as React.ReactElement, {
            className: `h-6 w-6 ${addon.recommended ? 'text-q-accent' : 'text-q-text-muted'
              }`,
          })}
        </div>
        {addon.recommended && (
          <span className="px-2 py-1 bg-q-accent/10 text-q-accent text-xs font-semibold rounded">
            Recomendado
          </span>
        )}
      </div>

      {/* Info */}
      <h3 className="text-lg font-semibold text-q-text mb-2">{addon.name}</h3>
      <p className="text-sm text-q-text-muted mb-4">{addon.description}</p>

      {/* Pricing */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-q-text">
            ${addon.pricePerUnit}
          </span>
          <span className="text-sm text-q-text-muted">/ {addon.unit}</span>
        </div>
      </div>

      {/* Quantity Control */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onDecrease}
            disabled={addon.currentQuantity <= addon.minQuantity}
            className="p-2 border border-q-border rounded-lg hover:bg-q-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" />
          </button>

          <input
            type="number"
            value={addon.currentQuantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
            min={addon.minQuantity}
            max={addon.maxQuantity}
            className="flex-1 text-center text-xl font-semibold border border-q-border rounded-lg py-2"
          />

          <button
            onClick={onIncrease}
            disabled={addon.currentQuantity >= addon.maxQuantity}
            className="p-2 border border-q-border rounded-lg hover:bg-q-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-center text-q-text-muted">
          {addon.currentQuantity} {addon.unitLabel}
        </p>
      </div>

      {/* Total Cost */}
      <div className="mt-4 pt-4 border-t border-q-border">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-q-text">
            Costo Mensual:
          </span>
          <span className="text-lg font-bold text-q-text">
            ${totalCost.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
