/**
 * Add-ons Manager
 * Manage subscription add-ons (extra sub-clients, storage, AI credits)
 * Redesigned to match app's design patterns
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Minus, HardDrive, Zap, Users, Package } from 'lucide-react';

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

  useEffect(() => {
    loadPricing();
    // loadCurrentAddons is now handled inside loadPricing
  }, [currentTenant]);

  const loadPricing = async () => {
    if (!currentTenant) return;

    try {
      const getPricing = httpsCallable(functions, 'agencyBilling-getAddonsPricing');
      const result = await getPricing({ tenantId: currentTenant.id }) as any;
      const data = result.data;

      // Extract pricing from availableAddons array
      if (data.availableAddons) {
        const pricingObj: AddonPricing = {
          extraSubClients: 15, // default values
          extraStorageGB: 10,
          extraAiCredits: 20,
        };

        const currentAddonsFromBackend: Record<string, number> = {
          extraSubClients: 0,
          extraStorageGB: 0,
          extraAiCredits: 0,
        };

        data.availableAddons.forEach((addon: any) => {
          if (addon.id in pricingObj) {
            pricingObj[addon.id as keyof AddonPricing] = addon.pricePerUnit;
            currentAddonsFromBackend[addon.id] = addon.currentQuantity || 0;
          }
        });

        setPricing(pricingObj);
        setAddons(currentAddonsFromBackend);
        setPendingAddons(currentAddonsFromBackend);
      }
    } catch (error: any) {
      console.error('Error loading pricing:', error);
      setError(t('dashboard.agency.addonsPage.errorLoadingPricing'));
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
      const update = httpsCallable(functions, 'agencyBilling-updateSubscriptionAddons');
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
    <div className="space-y-6">
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
