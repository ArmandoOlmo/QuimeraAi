/**
 * Add-ons Manager
 * Manage subscription add-ons (extra sub-clients, storage, AI credits)
 * Redesigned to match app's design patterns
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Minus, HardDrive, Zap, Users, Package, ChevronDown, ChevronUp, Info, CreditCard, TrendingUp, DollarSign } from 'lucide-react';

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
  const { t } = useTranslation();
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

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
      setError(t('dashboard.agency.addonsPage.errorLoadingPricing') + ' (usando precios por defecto)');
    }
  };


  const loadCurrentAddons = async () => {
    if (!currentTenant) return;

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
    setError(null);
    setSuccess(null);
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
      setError(null);
      const update = httpsCallable(functions, 'updateSubscriptionAddons');
      await update({
        tenantId: currentTenant.id,
        addons: pendingAddons,
      });

      setSuccess(t('dashboard.agency.addonsPage.updatedSuccess'));
      setAddons(pendingAddons);
    } catch (error: any) {
      console.error('Error updating addons:', error);
      setError(t('dashboard.agency.addonsPage.updateError') + ' ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPendingAddons(addons);
    setError(null);
    setSuccess(null);
  };

  if (!pricing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const addonsList: Addon[] = [
    {
      id: 'extraSubClients',
      name: t('dashboard.agency.addonsPage.extraSubClients'),
      description: t('dashboard.agency.addonsPage.extraSubClientsDesc'),
      pricePerUnit: pricing.extraSubClients,
      unit: t('dashboard.agency.addonsPage.client'),
      icon: <Users className="w-5 h-5 text-primary" />,
      currentQuantity: pendingAddons.extraSubClients,
    },
    {
      id: 'extraStorageGB',
      name: t('dashboard.agency.addonsPage.extraStorage'),
      description: t('dashboard.agency.addonsPage.extraStorageDesc'),
      pricePerUnit: pricing.extraStorageGB,
      unit: '100GB',
      icon: <HardDrive className="w-5 h-5 text-primary" />,
      currentQuantity: pendingAddons.extraStorageGB,
    },
    {
      id: 'extraAiCredits',
      name: t('dashboard.agency.addonsPage.extraAiCredits'),
      description: t('dashboard.agency.addonsPage.extraAiCreditsDesc'),
      pricePerUnit: pricing.extraAiCredits,
      unit: '1000 credits',
      icon: <Zap className="w-5 h-5 text-primary" />,
      currentQuantity: pendingAddons.extraAiCredits,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-500 text-sm">{success}</p>
        </div>
      )}

      {/* Instructions - Collapsible */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors"
        >
          <h4 className="font-semibold text-primary flex items-center gap-2 text-base">
            <Info className="w-5 h-5" />
            📋 Guía: ¿Cómo funcionan los Add-ons?
          </h4>
          {showInstructions ? <ChevronUp className="text-primary" size={20} /> : <ChevronDown className="text-primary" size={20} />}
        </button>

        {showInstructions && (
          <div className="px-5 pb-5 text-sm space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">1</span>
                <div>
                  <strong className="text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Sub-clientes Adicionales
                  </strong>
                  <p className="text-muted-foreground">Cada unidad te permite agregar un cliente adicional a tu cuenta de agencia. Ideal cuando tu negocio crece y necesitas gestionar más clientes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">2</span>
                <div>
                  <strong className="text-foreground flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-primary" />
                    Almacenamiento Extra
                  </strong>
                  <p className="text-muted-foreground">Cada bloque añade 100GB de almacenamiento para imágenes, videos y archivos de tus clientes. Perfecto para proyectos con mucho contenido multimedia.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">3</span>
                <div>
                  <strong className="text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Créditos de IA Adicionales
                  </strong>
                  <p className="text-muted-foreground">Cada bloque incluye 1000 créditos de IA para generar contenido, imágenes, textos de marketing y más con inteligencia artificial.</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-primary/20 space-y-2">
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong className="text-foreground">Facturación:</strong> Los add-ons se cobran mensualmente junto con tu suscripción base.</p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong className="text-foreground">Prorrateado:</strong> Si agregas add-ons a mitad de mes, solo pagas la parte proporcional.</p>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground"><strong className="text-foreground">Flexibilidad:</strong> Puedes aumentar o reducir add-ons en cualquier momento según tus necesidades.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add-ons List */}
      <div className="space-y-4">
        {addonsList.map((addon) => (
          <div key={addon.id} className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="bg-primary/10 p-3 rounded-lg">
                  {addon.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {addon.name}
                    </h3>
                    <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                      ${addon.pricePerUnit}/{addon.unit}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {addon.description}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4 mt-4">
                    <button
                      onClick={() => handleQuantityChange(addon.id, -1)}
                      disabled={addon.currentQuantity === 0 || loading}
                      className="h-9 w-9 rounded-lg bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="text-center min-w-[60px]">
                      <div className="text-2xl font-bold text-foreground">
                        {addon.currentQuantity}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {addon.unit}
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuantityChange(addon.id, 1)}
                      disabled={loading}
                      className="h-9 w-9 rounded-lg bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">
                  {t('dashboard.agency.addonsPage.subtotal')}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${addon.currentQuantity * addon.pricePerUnit}
                  <span className="text-sm font-normal text-muted-foreground">
                    {t('dashboard.agency.addonsPage.perMonth')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {t('dashboard.agency.addonsPage.summary')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('dashboard.agency.addonsPage.summaryDesc')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">
              {t('dashboard.agency.addonsPage.totalMonthly')}
            </div>
            <div className="text-3xl font-bold text-primary">
              ${calculateTotalPrice()}
              <span className="text-lg font-normal text-muted-foreground">
                {t('dashboard.agency.addonsPage.perMonth')}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
          {addonsList.map((addon) => {
            const subtotal = addon.currentQuantity * addon.pricePerUnit;
            if (subtotal === 0) return null;

            return (
              <div
                key={addon.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {addon.name} ({addon.currentQuantity} × ${addon.pricePerUnit})
                </span>
                <span className="font-medium text-foreground">
                  ${subtotal}/mes
                </span>
              </div>
            );
          })}

          {calculateTotalPrice() === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              {t('dashboard.agency.addonsPage.noAddonsSelected')}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {hasChanges() && (
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleUpdateSubscription}
              disabled={loading}
              className="flex-1 h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('dashboard.agency.addonsPage.updating')}
                </>
              ) : (
                t('dashboard.agency.addonsPage.updateSubscription')
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="h-10 px-4 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground font-medium transition-colors disabled:opacity-50"
            >
              {t('dashboard.agency.addonsPage.cancelChanges')}
            </button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          {t('dashboard.agency.addonsPage.importantInfo')}
        </h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              {t('dashboard.agency.addonsPage.info1')}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              {t('dashboard.agency.addonsPage.info2')}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              {t('dashboard.agency.addonsPage.info3')}
            </span>
          </li>
        </ul>
      </div>

      {/* Proration Notice */}
      {hasChanges() && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong>{t('dashboard.agency.addonsPage.prorationNotice')}</strong> {t('dashboard.agency.addonsPage.prorationDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
