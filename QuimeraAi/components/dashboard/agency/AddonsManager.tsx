/**
 * Add-ons Manager
 * Manage subscription add-ons (extra sub-clients, storage, AI credits)
 * Redesigned to match app's design patterns
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Minus, HardDrive, Zap, Users, Package, ChevronDown, ChevronUp, Info, CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import QuimeraLoader from '@/components/ui/QuimeraLoader';
import { StatusBadge } from '../../ui/system';
import { AgencyCommandCenter, AgencyNextAction, AgencyPanel, AgencyReadinessPanel } from './AgencyDesignSystem';

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
      const result = await supabase.functions.invoke('stripe-api', {
        body: { action: 'getAddonsPricing', tenantId: currentTenant.id }
      });
      if (result.error) throw result.error;
      const data = result.data?.data || result.data;

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
      const result = await supabase.functions.invoke('stripe-api', {
        body: {
          action: 'updateSubscriptionAddons',
          tenantId: currentTenant.id,
          addons: pendingAddons,
        }
      });
      if (result.error) throw result.error;

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
        <QuimeraLoader size="md" />
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
      icon: <Users className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />,
      currentQuantity: pendingAddons.extraSubClients,
    },
    {
      id: 'extraStorageGB',
      name: t('dashboard.agency.addonsPage.extraStorage'),
      description: t('dashboard.agency.addonsPage.extraStorageDesc'),
      pricePerUnit: pricing.extraStorageGB,
      unit: '100GB',
      icon: <HardDrive className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />,
      currentQuantity: pendingAddons.extraStorageGB,
    },
    {
      id: 'extraAiCredits',
      name: t('dashboard.agency.addonsPage.extraAiCredits'),
      description: t('dashboard.agency.addonsPage.extraAiCreditsDesc'),
      pricePerUnit: pricing.extraAiCredits,
      unit: '1000 credits',
      icon: <Zap className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />,
      currentQuantity: pendingAddons.extraAiCredits,
    },
  ];
  const currentMonthlyTotal =
    addons.extraSubClients * pricing.extraSubClients +
    addons.extraStorageGB * pricing.extraStorageGB +
    addons.extraAiCredits * pricing.extraAiCredits;
  const pendingMonthlyTotal = calculateTotalPrice();
  const totalAddonUnits =
    pendingAddons.extraSubClients +
    pendingAddons.extraStorageGB +
    pendingAddons.extraAiCredits;
  const pendingDelta = pendingMonthlyTotal - currentMonthlyTotal;
  const hasPendingChanges = hasChanges();
  const addonsReadinessItems = [
    {
      label: t('dashboard.agency.addonsPage.readinessPricing', 'Precios cargados'),
      description: t('dashboard.agency.addonsPage.readinessPricingDesc', 'Tarifas disponibles para capacidad adicional.'),
      complete: Boolean(pricing),
      icon: DollarSign,
    },
    {
      label: t('dashboard.agency.addonsPage.readinessBilling', 'Facturación lista'),
      description: t('dashboard.agency.addonsPage.readinessBillingDesc', 'Los cambios se aplican a la suscripción activa.'),
      complete: Boolean(currentTenant?.billing?.stripeSubscriptionId || currentTenant?.billing?.stripeCustomerId),
      icon: CreditCard,
    },
    {
      label: t('dashboard.agency.addonsPage.readinessCapacity', 'Capacidad definida'),
      description: t('dashboard.agency.addonsPage.readinessCapacityDesc', '{{count}} unidades seleccionadas', { count: totalAddonUnits }),
      complete: totalAddonUnits > 0,
      icon: Package,
    },
    {
      label: t('dashboard.agency.addonsPage.readinessChanges', 'Cambios controlados'),
      description: hasPendingChanges
        ? t('dashboard.agency.addonsPage.readinessChangesPending', 'Hay cambios pendientes')
        : t('dashboard.agency.addonsPage.readinessChangesClean', 'No hay cambios pendientes'),
      complete: !hasPendingChanges,
      icon: TrendingUp,
    },
  ];
  const addonsReadinessScore = Math.round(
    (addonsReadinessItems.filter((item) => item.complete).length / addonsReadinessItems.length) * 100,
  );
  const addonsNextAction = hasPendingChanges
    ? {
      label: t('dashboard.agency.addonsPage.nextApplyChanges', 'Aplicar cambios'),
      description: pendingDelta >= 0
        ? t('dashboard.agency.addonsPage.nextApplyChangesIncrease', '+{{amount}}/mes', { amount: pendingDelta })
        : t('dashboard.agency.addonsPage.nextApplyChangesDecrease', '-{{amount}}/mes', { amount: Math.abs(pendingDelta) }),
      icon: CreditCard,
      tone: 'warning' as const,
      onClick: handleUpdateSubscription,
    }
    : {
      label: t('dashboard.agency.addonsPage.nextReviewCapacity', 'Revisar capacidad'),
      description: t('dashboard.agency.addonsPage.nextReviewCapacityDesc', 'Ajusta clientes, storage o AI Credits según demanda.'),
      icon: Package,
      tone: 'accent' as const,
      onClick: () => setShowInstructions((value) => !value),
    };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-q-error/10 border border-q-error/30 rounded-lg p-4">
          <p className="text-q-error text-sm">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-q-success/10 border border-q-success/30 rounded-lg p-4">
          <p className="text-q-success text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <AgencyCommandCenter
          icon={Package}
          eyebrow={t('dashboard.agency.addonsPage.commandCenter', 'Capacity center')}
          title={t('dashboard.agency.addonsPage.commandTitle', 'Add-ons de agencia')}
          subtitle={t('dashboard.agency.addonsPage.commandSubtitle', 'Capacidad adicional para clientes, storage y generaciones AI.')}
          metrics={[
            {
              label: t('dashboard.agency.addonsPage.totalUnits', 'Unidades'),
              value: totalAddonUnits,
              icon: Package,
            },
            {
              label: t('dashboard.agency.addonsPage.extraSubClients'),
              value: pendingAddons.extraSubClients,
              icon: Users,
            },
            {
              label: t('dashboard.agency.addonsPage.extraStorage'),
              value: pendingAddons.extraStorageGB,
              icon: HardDrive,
            },
            {
              label: t('dashboard.agency.addonsPage.extraAiCredits'),
              value: pendingAddons.extraAiCredits,
              icon: Zap,
            },
          ]}
          action={
            <AgencyNextAction
              label={addonsNextAction.label}
              description={addonsNextAction.description}
              icon={addonsNextAction.icon}
              tone={addonsNextAction.tone}
              onClick={addonsNextAction.onClick}
            />
          }
        />

        <AgencyReadinessPanel
          title={t('dashboard.agency.addonsPage.readinessTitle', 'Readiness de capacidad')}
          subtitle={t('dashboard.agency.addonsPage.readinessSubtitle', '{{ready}}/{{total}} señales listas', {
            ready: addonsReadinessItems.filter((item) => item.complete).length,
            total: addonsReadinessItems.length,
          })}
          score={addonsReadinessScore}
          items={addonsReadinessItems}
          tone={addonsReadinessScore >= 80 ? 'success' : addonsReadinessScore >= 50 ? 'warning' : 'danger'}
        />
      </div>

      {/* Instructions - Collapsible */}
      <AgencyPanel contentClassName="!p-0">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <h4 className="font-semibold text-foreground flex items-center gap-2 text-base">
            <Info className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
            Guía de Add-ons
          </h4>
          {showInstructions ? <ChevronUp className="text-q-text-muted" size={20} /> : <ChevronDown className="text-q-text-muted" size={20} />}
        </button>

        {showInstructions && (
          <div className="px-5 pb-5 text-sm space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-q-accent/10 quimera-status-card-accent-text text-xs font-bold shrink-0">1</span>
                <div>
                  <strong className="text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 quimera-dashboard-header-icon" strokeWidth={2} />
                    Sub-clientes Adicionales
                  </strong>
                  <p className="text-q-text-muted">Cada unidad te permite agregar un cliente adicional a tu cuenta de agencia. Ideal cuando tu negocio crece y necesitas gestionar más clientes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-q-accent/10 quimera-status-card-accent-text text-xs font-bold shrink-0">2</span>
                <div>
                  <strong className="text-foreground flex items-center gap-2">
                    <HardDrive className="w-4 h-4 quimera-dashboard-header-icon" strokeWidth={2} />
                    Almacenamiento Extra
                  </strong>
                  <p className="text-q-text-muted">Cada bloque añade 100GB de almacenamiento para imágenes, videos y archivos de tus clientes. Perfecto para proyectos con mucho contenido multimedia.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-q-accent/10 quimera-status-card-accent-text text-xs font-bold shrink-0">3</span>
                <div>
                  <strong className="text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 quimera-dashboard-header-icon" strokeWidth={2} />
                    Créditos de IA Adicionales
                  </strong>
                  <p className="text-q-text-muted">Cada bloque incluye 1000 créditos de IA para generar contenido, imágenes, textos de marketing y más con inteligencia artificial.</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-q-border space-y-2">
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 quimera-dashboard-header-icon shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-q-text-muted"><strong className="text-foreground">Facturación:</strong> Los add-ons se cobran mensualmente junto con tu suscripción base.</p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 quimera-dashboard-header-icon shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-q-text-muted"><strong className="text-foreground">Prorrateado:</strong> Si agregas add-ons a mitad de mes, solo pagas la parte proporcional.</p>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 quimera-dashboard-header-icon shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-q-text-muted"><strong className="text-foreground">Flexibilidad:</strong> Puedes aumentar o reducir add-ons en cualquier momento según tus necesidades.</p>
              </div>
            </div>
          </div>
        )}
      </AgencyPanel>

      {/* Add-ons List */}
      <div className="space-y-4">
        {addonsList.map((addon) => (
          <AgencyPanel key={addon.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex-shrink-0">
                  {addon.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {addon.name}
                    </h3>
                    <StatusBadge size="sm" variant="info">
                      ${addon.pricePerUnit}/{addon.unit}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-q-text-muted">
                    {addon.description}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4 mt-4">
                    <button
                      onClick={() => handleQuantityChange(addon.id, -1)}
                      disabled={addon.currentQuantity === 0 || loading}
                      className="h-9 w-9 rounded-lg bg-secondary/50 hover:bg-secondary border border-q-border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="text-center min-w-[60px]">
                      <div className="text-2xl font-bold text-foreground">
                        {addon.currentQuantity}
                      </div>
                      <div className="text-xs text-q-text-muted">
                        {addon.unit}
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuantityChange(addon.id, 1)}
                      disabled={loading}
                      className="h-9 w-9 rounded-lg bg-secondary/50 hover:bg-secondary border border-q-border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-q-text-muted mb-1">
                  {t('dashboard.agency.addonsPage.subtotal')}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${addon.currentQuantity * addon.pricePerUnit}
                  <span className="text-sm font-normal text-q-text-muted">
                    {t('dashboard.agency.addonsPage.perMonth')}
                  </span>
                </div>
              </div>
            </div>
          </AgencyPanel>
        ))}
      </div>

      {/* Summary */}
      <AgencyPanel>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
              {t('dashboard.agency.addonsPage.summary')}
            </h3>
            <p className="text-sm text-q-text-muted mt-1">
              {t('dashboard.agency.addonsPage.summaryDesc')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-q-text-muted mb-1">
              {t('dashboard.agency.addonsPage.totalMonthly')}
            </div>
            <div className="text-3xl font-bold quimera-status-card-accent-text">
              ${calculateTotalPrice()}
              <span className="text-lg font-normal text-q-text-muted">
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
                <span className="text-q-text-muted">
                  {addon.name} ({addon.currentQuantity} × ${addon.pricePerUnit})
                </span>
                <span className="font-medium text-foreground">
                  ${subtotal}/mes
                </span>
              </div>
            );
          })}

          {calculateTotalPrice() === 0 && (
            <p className="text-sm text-q-text-muted text-center py-2">
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
              className="quimera-guide-cta flex-1 h-10 justify-center disabled:opacity-50"
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
      </AgencyPanel>

      {/* Info Card */}
      <AgencyPanel>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          {t('dashboard.agency.addonsPage.importantInfo')}
        </h4>
        <ul className="text-sm text-q-text-muted space-y-2">
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
      </AgencyPanel>

      {/* Proration Notice */}
      {hasChanges() && (
        <div className="bg-q-accent/10 border border-q-accent/30 rounded-lg p-4">
          <p className="text-sm text-q-accent">
            <strong>{t('dashboard.agency.addonsPage.prorationNotice')}</strong> {t('dashboard.agency.addonsPage.prorationDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
