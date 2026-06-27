/**
 * BillingSettings
 * Configure Stripe Connect and manage agency billing
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import {
    CreditCard,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Loader2,
    DollarSign,
    TrendingUp,
    HelpCircle,
    Users,
    ChevronDown,
    ChevronUp,
    Building2,
    User,
    FileText,
    Landmark,
    Shield,
    Clock,
    ArrowRight,
    Info,
} from 'lucide-react';
import { supabase } from '../../../supabase';
import { ClientBillingManager } from './ClientBillingManager';
import { InvoiceHistory } from './InvoiceHistory';
import {
    AgencyCommandCenter,
    AgencyNextAction,
    AgencyPanel,
    AgencyReadinessPanel,
    AgencyStatCard,
} from './AgencyDesignSystem';



interface StripeConnectStatus {
    status: 'not_configured' | 'pending' | 'active';
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted?: boolean;
    requirements?: any;
}

export function BillingSettings() {
    const { t } = useTranslation();
    const { currentTenant } = useTenant();
    const { user } = useAuth();

    const [connectStatus, setConnectStatus] = useState<StripeConnectStatus>({
        status: 'not_configured',
        charges_enabled: false,
        payouts_enabled: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'history'>('overview');
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        loadConnectStatus();
    }, [currentTenant]);

    const loadConnectStatus = async () => {
        if (!currentTenant) return;

        setLoading(true);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'getStripeConnectStatus', tenantId: currentTenant.id }
            });
            if (result.error) throw result.error;
            const data = result.data?.data || result.data;
            setConnectStatus(data as any);
        } catch (err: any) {
            console.error('Error loading Connect status:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSetupStripeConnect = async () => {
        if (!currentTenant) return;

        setLoading(true);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: {
                    action: 'createStripeConnectAccount',
                    tenantId: currentTenant.id,
                    businessInfo: {
                        country: 'US',
                        // Can add more business info from a form
                    },
                }
            });
            if (result.error) throw result.error;

            const data = result.data?.data || result.data;
            if (data.onboardingUrl) {
                // Redirect to Stripe onboarding
                window.location.href = data.onboardingUrl;
            }
        } catch (err: any) {
            console.error('Error setting up Stripe Connect:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const openStripeDashboard = () => {
        const connectAccountId = currentTenant?.billing?.stripeConnectAccountId;
        if (connectAccountId) {
            window.open(
                `https://dashboard.stripe.com/connect/accounts/${connectAccountId}`,
                '_blank'
            );
        }
    };

    const billingReady = connectStatus.status === 'active' && connectStatus.charges_enabled && connectStatus.payouts_enabled;
    const billingReadinessItems = [
        {
            label: t('dashboard.agency.billingPage.readinessConnect', 'Stripe Connect'),
            description: connectStatus.status === 'active'
                ? t('dashboard.agency.billingPage.readinessConnectReady', 'Cuenta conectada')
                : t('dashboard.agency.billingPage.readinessConnectPending', 'Pendiente de conexión'),
            complete: connectStatus.status === 'active',
            icon: CreditCard,
            onClick: connectStatus.status === 'active' ? openStripeDashboard : handleSetupStripeConnect,
        },
        {
            label: t('dashboard.agency.billingPage.readinessCharges', 'Cobros habilitados'),
            description: connectStatus.charges_enabled
                ? t('dashboard.agency.billingPage.readinessChargesReady', 'Puedes cobrar clientes')
                : t('dashboard.agency.billingPage.readinessChargesPending', 'Completa verificación'),
            complete: connectStatus.charges_enabled,
            icon: DollarSign,
            onClick: connectStatus.charges_enabled ? undefined : handleSetupStripeConnect,
        },
        {
            label: t('dashboard.agency.billingPage.readinessPayouts', 'Payouts habilitados'),
            description: connectStatus.payouts_enabled
                ? t('dashboard.agency.billingPage.readinessPayoutsReady', 'Retiros disponibles')
                : t('dashboard.agency.billingPage.readinessPayoutsPending', 'Stripe requiere datos adicionales'),
            complete: connectStatus.payouts_enabled,
            icon: Landmark,
            onClick: connectStatus.payouts_enabled ? undefined : handleSetupStripeConnect,
        },
        {
            label: t('dashboard.agency.billingPage.readinessClientBilling', 'Billing de clientes'),
            description: billingReady
                ? t('dashboard.agency.billingPage.readinessClientBillingReady', 'Gestión por cliente disponible')
                : t('dashboard.agency.billingPage.readinessClientBillingBlocked', 'Requiere Connect activo'),
            complete: billingReady,
            icon: Users,
            onClick: billingReady ? () => setActiveTab('clients') : handleSetupStripeConnect,
        },
    ];
    const billingReadinessScore = Math.round(
        (billingReadinessItems.filter((item) => item.complete).length / billingReadinessItems.length) * 100,
    );
    const billingNextAction = billingReady
        ? {
            label: t('dashboard.agency.billingPage.nextOpenStripe', 'Abrir Stripe Dashboard'),
            description: t('dashboard.agency.billingPage.nextOpenStripeDesc', 'Revisa payouts, disputas y balance.'),
            icon: ExternalLink,
            tone: 'success' as const,
            onClick: openStripeDashboard,
        }
        : {
            label: t('dashboard.agency.billingPage.nextConnectStripe', 'Conectar Stripe'),
            description: t('dashboard.agency.billingPage.nextConnectStripeDesc', 'Activa cobros y suscripciones de clientes.'),
            icon: CreditCard,
            tone: 'warning' as const,
            onClick: handleSetupStripeConnect,
        };

    if (loading && connectStatus.status === 'not_configured') {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-q-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
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

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <AgencyCommandCenter
                    icon={CreditCard}
                    eyebrow={t('dashboard.agency.billingPage.commandCenter', 'Billing center')}
                    title={t('dashboard.agency.billingPage.commandTitle', 'Cobros de agencia')}
                    subtitle={t('dashboard.agency.billingPage.commandSubtitle', 'Stripe Connect, suscripciones de clientes, payouts e historial financiero.')}
                    metrics={[
                        {
                            label: t('dashboard.agency.billingPage.connectStatus', 'Connect'),
                            value: connectStatus.status === 'active'
                                ? t('dashboard.agency.billingPage.statusActive', 'Activo')
                                : connectStatus.status === 'pending'
                                    ? t('dashboard.agency.billingPage.statusPending', 'Pendiente')
                                    : t('dashboard.agency.billingPage.statusMissing', 'Sin conectar'),
                            icon: CreditCard,
                        },
                        {
                            label: t('dashboard.agency.billingPage.chargesStatus', 'Cobros'),
                            value: connectStatus.charges_enabled ? t('common.enabled', 'Activo') : t('common.disabled', 'Inactivo'),
                            icon: DollarSign,
                        },
                        {
                            label: t('dashboard.agency.billingPage.payoutsStatus', 'Payouts'),
                            value: connectStatus.payouts_enabled ? t('common.enabled', 'Activo') : t('common.disabled', 'Inactivo'),
                            icon: Landmark,
                        },
                        {
                            label: t('dashboard.agency.billingPage.mrrTotal'),
                            value: `$${currentTenant?.billing?.mrr?.toLocaleString() || '0'}`,
                            icon: TrendingUp,
                        },
                    ]}
                    action={
                        <AgencyNextAction
                            label={billingNextAction.label}
                            description={billingNextAction.description}
                            icon={billingNextAction.icon}
                            tone={billingNextAction.tone}
                            onClick={billingNextAction.onClick}
                        />
                    }
                />

                <AgencyReadinessPanel
                    title={t('dashboard.agency.billingPage.readinessTitle', 'Readiness de billing')}
                    subtitle={t('dashboard.agency.billingPage.readinessSubtitle', '{{ready}}/{{total}} señales listas', {
                        ready: billingReadinessItems.filter((item) => item.complete).length,
                        total: billingReadinessItems.length,
                    })}
                    score={billingReadinessScore}
                    items={billingReadinessItems}
                    tone={billingReadinessScore >= 80 ? 'success' : billingReadinessScore >= 50 ? 'warning' : 'danger'}
                />
            </div>

            {/* Collapsible Instructions Section */}
            <AgencyPanel contentClassName="!p-0">
                <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <HelpCircle className="h-5 w-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                        <div className="text-left">
                            <h3 className="font-semibold text-foreground">
                                {connectStatus.status === 'not_configured'
                                    ? '¿Cómo configuro mi cuenta de pagos?'
                                    : '¿Cómo completo la verificación de Stripe?'}
                            </h3>
                            <p className="text-sm text-q-text-muted">
                                Guía paso a paso con instrucciones detalladas
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium quimera-status-card-accent-text">
                            {showInstructions ? 'Ocultar guía' : 'Ver guía'}
                        </span>
                        {showInstructions ? (
                            <ChevronUp className="h-5 w-5 text-q-text-muted" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-q-text-muted" />
                        )}
                    </div>
                </button>

                {showInstructions && (
                    <div className="px-6 pb-6 space-y-6">
                        {/* Divider */}
                        <div className="border-t border-q-border" />

                        {/* What is Stripe Connect */}
                        <div className="bg-muted/30 rounded-xl p-5 border border-q-border">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-q-bg rounded-xl flex-shrink-0 border border-q-border">
                                    <Info className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground text-lg mb-2">
                                        ¿Qué es Stripe Connect?
                                    </h4>
                                    <p className="text-q-text-muted leading-relaxed">
                                        Stripe Connect es un sistema de pagos seguro que te permite <strong>cobrar a tus clientes directamente</strong>.
                                        Es como tener tu propia cuenta bancaria digital para recibir pagos de forma automática.
                                        Los pagos van directo a tu cuenta, y tú controlas cuánto cobras.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step by Step Guide */}
                        <div>
                            <h4 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                                <FileText className="h-4 w-4 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                Pasos para configurar tu cuenta
                            </h4>

                            <div className="space-y-4">
                                {/* Step 1 */}
                                <div className="relative pl-8 pb-4 border-l-2 border-q-border ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                        1
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-4 border border-q-border ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CreditCard className="h-5 w-5 text-primary" />
                                            <h5 className="font-semibold text-foreground">
                                                Haz clic en "Conectar con Stripe"
                                            </h5>
                                        </div>
                                        <p className="text-q-text-muted text-sm">
                                            Busca el botón azul que dice <span className="bg-primary/10 px-2 py-0.5 rounded text-primary font-medium">"Conectar con Stripe"</span> y haz clic.
                                            Serás redirigido a la página oficial de Stripe.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="relative pl-8 pb-4 border-l-2 border-q-border ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                        2
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-4 border border-q-border ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Building2 className="h-5 w-5 text-primary" />
                                            <h5 className="font-semibold text-foreground">
                                                Ingresa información de tu negocio
                                            </h5>
                                        </div>
                                        <p className="text-q-text-muted text-sm mb-3">
                                            Stripe te pedirá datos básicos de tu empresa o agencia:
                                        </p>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <CheckCircle className="h-4 w-4 text-q-success flex-shrink-0" />
                                                <span>Nombre legal de tu negocio</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <CheckCircle className="h-4 w-4 text-q-success flex-shrink-0" />
                                                <span>Dirección comercial</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <CheckCircle className="h-4 w-4 text-q-success flex-shrink-0" />
                                                <span>Número de identificación fiscal (EIN o equivalente)</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <CheckCircle className="h-4 w-4 text-q-success flex-shrink-0" />
                                                <span>Tipo de negocio (individual, LLC, corporación, etc.)</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="relative pl-8 pb-4 border-l-2 border-q-border ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                        3
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-4 border border-q-border ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <User className="h-5 w-5 text-primary" />
                                            <h5 className="font-semibold text-foreground">
                                                Verifica tu identidad
                                            </h5>
                                        </div>
                                        <p className="text-q-text-muted text-sm mb-3">
                                            Por seguridad, Stripe necesita verificar quién eres. Necesitarás:
                                        </p>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>Documento de identidad (pasaporte, licencia de conducir o ID nacional)</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>Una selfie o foto tuya (para comparar con tu documento)</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>Fecha de nacimiento y últimos 4 dígitos de tu SSN (en EE.UU.)</span>
                                            </li>
                                        </ul>
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-q-border">
                                            <p className="text-xs text-q-text-muted flex items-start gap-2">
                                                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Consejo:</strong> Ten tu documento listo antes de comenzar.
                                                    Si usas tu teléfono, asegúrate de tener buena iluminación para las fotos.
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="relative pl-8 pb-4 border-l-2 border-q-border ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                        4
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-4 border border-q-border ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Landmark className="h-5 w-5 text-primary" />
                                            <h5 className="font-semibold text-foreground">
                                                Agrega tu cuenta bancaria
                                            </h5>
                                        </div>
                                        <p className="text-q-text-muted text-sm mb-3">
                                            Para recibir tus pagos, necesitas conectar una cuenta bancaria:
                                        </p>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>Número de cuenta y número de ruta (routing number)</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-q-text-muted">
                                                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>La cuenta debe estar a nombre del negocio o del dueño</span>
                                            </li>
                                        </ul>
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-q-border">
                                            <p className="text-xs text-q-text-muted flex items-start gap-2">
                                                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Tranquilo:</strong> Stripe es una plataforma segura usada por millones de negocios.
                                                    Tus datos están encriptados y protegidos.
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 5 */}
                                <div className="relative pl-8 ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-q-success rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                        <CheckCircle className="h-5 w-5" />
                                    </div>
                                    <div className="bg-q-success/10 rounded-xl p-4 border border-q-success/20 ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Clock className="h-5 w-5 text-q-success" />
                                            <h5 className="font-semibold text-foreground">
                                                ¡Espera la activación!
                                            </h5>
                                        </div>
                                        <p className="text-q-text-muted text-sm">
                                            Una vez completados todos los pasos, Stripe verificará tu información.
                                            Esto puede tomar desde <strong>unos minutos hasta 24-48 horas</strong>.
                                            Te notificaremos cuando tu cuenta esté lista para recibir pagos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FAQ Section */}
                        <div className="bg-muted/30 rounded-xl p-5 border border-q-border">
                            <h4 className="font-bold text-foreground text-lg mb-4">
                                Preguntas frecuentes
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <h5 className="font-semibold text-foreground text-sm mb-1">
                                        ¿Stripe cobra comisiones?
                                    </h5>
                                    <p className="text-q-text-muted text-sm">
                                        Sí, Stripe cobra una pequeña comisión por cada transacción (generalmente 2.9% + $0.30 por cobro).
                                        Esto se descuenta automáticamente antes de depositar en tu cuenta.
                                    </p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-foreground text-sm mb-1">
                                        ¿Cuándo recibo mis pagos?
                                    </h5>
                                    <p className="text-q-text-muted text-sm">
                                        Los pagos se depositan automáticamente en tu cuenta bancaria.
                                        El tiempo estándar es de 2 días hábiles después de recibir un pago de un cliente.
                                    </p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-foreground text-sm mb-1">
                                        ¿Puedo usar mi cuenta personal?
                                    </h5>
                                    <p className="text-q-text-muted text-sm">
                                        Sí, si eres un profesional independiente puedes usar tu cuenta personal.
                                        Si tienes una empresa registrada, es mejor usar la cuenta bancaria empresarial.
                                    </p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-foreground text-sm mb-1">
                                        ¿Qué pasa si Stripe rechaza mi verificación?
                                    </h5>
                                    <p className="text-q-text-muted text-sm">
                                        Stripe te indicará qué información falta o es incorrecta.
                                        Podrás corregirla haciendo clic en "Ir a Stripe" y completando los datos pendientes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Support Note */}
                        <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl">
                            <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                            <p className="text-sm text-foreground">
                                ¿Tienes problemas o dudas? Contacta a nuestro equipo de soporte y te ayudaremos a completar la configuración.
                            </p>
                        </div>
                    </div>
                )}
            </AgencyPanel>

            {/* Stripe Connect Setup */}
            {connectStatus.status === 'not_configured' ? (
                <AgencyPanel contentClassName="p-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-q-accent/10 dark:bg-q-accent/12 mb-4">
                            <CreditCard className="h-8 w-8 text-q-accent dark:text-q-accent" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            {t('dashboard.agency.billingPage.stripeConnectTitle')}
                        </h2>
                        <p className="text-q-text-muted mb-6">
                            {t('dashboard.agency.billingPage.stripeConnectSubtitle')}
                        </p>

                        <div className="bg-muted/50 rounded-lg p-6 mb-6 text-left">
                            <h3 className="font-semibold text-foreground mb-3">
                                {t('dashboard.agency.billingPage.benefits')}
                            </h3>
                            <ul className="space-y-2 text-sm text-q-text-muted">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-q-success flex-shrink-0 mt-0.5" />
                                    <span>{t('dashboard.agency.billingPage.benefit1')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-q-success flex-shrink-0 mt-0.5" />
                                    <span>{t('dashboard.agency.billingPage.benefit2')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-q-success flex-shrink-0 mt-0.5" />
                                    <span>{t('dashboard.agency.billingPage.benefit3')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-q-success flex-shrink-0 mt-0.5" />
                                    <span>{t('dashboard.agency.billingPage.benefit4')}</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={handleSetupStripeConnect}
                            disabled={loading}
                            className="quimera-guide-cta mx-auto px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {t('dashboard.agency.billingPage.configuring')}
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-5 w-5" />
                                    {t('dashboard.agency.billingPage.connectWithStripe')}
                                </>
                            )}
                        </button>

                        <p className="text-xs text-q-text-muted mt-4">
                            {t('dashboard.agency.billingPage.redirectNotice')}
                        </p>
                    </div>
                </AgencyPanel>
            ) : (
                <>
                    {/* Stripe Connect Status Card */}
                    <AgencyPanel>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div
                                    className={`inline-flex items-center justify-center h-12 w-12 rounded-lg ${connectStatus.charges_enabled
                                        ? 'bg-q-success/10 dark:bg-q-success/12'
                                        : 'bg-q-accent/10 dark:bg-q-accent/12'
                                        }`}
                                >
                                    {connectStatus.charges_enabled ? (
                                        <CheckCircle className="h-6 w-6 text-q-success dark:text-q-success" />
                                    ) : (
                                        <AlertCircle className="h-6 w-6 text-q-accent dark:text-q-accent" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {t('dashboard.agency.billingPage.stripeConnect')}
                                    </h3>
                                    <p className="text-sm text-q-text-muted mt-1">
                                        {connectStatus.charges_enabled
                                            ? t('dashboard.agency.billingPage.accountActive')
                                            : t('dashboard.agency.billingPage.pendingSetup')}
                                    </p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-q-text-muted dark:text-gray-400">
                                                {t('dashboard.agency.billingPage.charges')}
                                            </span>
                                            <span
                                                className={`font-medium ${connectStatus.charges_enabled
                                                    ? 'text-q-success'
                                                    : 'text-q-text-muted'
                                                    }`}
                                            >
                                                {connectStatus.charges_enabled
                                                    ? t('dashboard.agency.billingPage.enabled')
                                                    : t('dashboard.agency.billingPage.disabled')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-q-text-muted">
                                                {t('dashboard.agency.billingPage.payouts')}
                                            </span>
                                            <span
                                                className={`font-medium ${connectStatus.payouts_enabled
                                                    ? 'text-q-success'
                                                    : 'text-q-text-muted'
                                                    }`}
                                            >
                                                {connectStatus.payouts_enabled
                                                    ? t('dashboard.agency.billingPage.enabled')
                                                    : t('dashboard.agency.billingPage.disabled')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={openStripeDashboard}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-q-accent dark:text-q-accent hover:text-q-accent dark:hover:text-q-accent transition-colors"
                            >
                                {t('dashboard.agency.billingPage.viewInStripe')}
                                <ExternalLink className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Requirements if any */}
                        {connectStatus.requirements?.currently_due?.length > 0 && (
                            <div className="mt-4 p-4 bg-q-accent/10 dark:bg-q-accent/12 border border-q-accent/25 dark:border-q-accent/30 rounded-lg">
                                <p className="text-sm font-medium text-q-accent dark:text-q-accent mb-2">
                                    {t('dashboard.agency.billingPage.requiredInfo')}
                                </p>
                                <ul className="text-sm text-q-accent dark:text-q-accent space-y-1">
                                    {connectStatus.requirements.currently_due.map(
                                        (req: string, i: number) => (
                                            <li key={i}>• {req}</li>
                                        )
                                    )}
                                </ul>
                                <button
                                    onClick={openStripeDashboard}
                                    className="mt-3 text-sm font-medium text-q-accent dark:text-q-accent hover:underline"
                                >
                                    {t('dashboard.agency.billingPage.completeInStripe')}
                                </button>
                            </div>
                        )}
                    </AgencyPanel>

                    {/* Tabs */}
                    <div className="border-b border-q-border">
                        <nav className="flex gap-8">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                                    ? 'border-q-accent/25 text-q-accent dark:text-q-accent'
                                    : 'border-transparent text-q-text-muted hover:text-q-text dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                {t('dashboard.agency.billingPage.tabOverview')}
                            </button>
                            <button
                                onClick={() => setActiveTab('clients')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'clients'
                                    ? 'border-q-accent/25 text-q-accent dark:text-q-accent'
                                    : 'border-transparent text-q-text-muted hover:text-foreground'
                                    }`}
                            >
                                {t('dashboard.agency.billingPage.tabClients')}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'history'
                                    ? 'border-q-accent/25 text-q-accent dark:text-q-accent'
                                    : 'border-transparent text-q-text-muted hover:text-foreground'
                                    }`}
                            >
                                {t('dashboard.agency.billingPage.tabHistory')}
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <AgencyStatCard
                                icon={DollarSign}
                                label={t('dashboard.agency.billingPage.mrrTotal')}
                                value={`$${currentTenant?.billing?.mrr?.toLocaleString() || '0'}`}
                                tone="success"
                                hint={t('dashboard.agency.billingPage.mrrDescription')}
                            />
                            <AgencyStatCard
                                icon={TrendingUp}
                                label={t('dashboard.agency.billingPage.activeSubscriptions')}
                                value="0"
                                tone="accent"
                                hint={t('dashboard.agency.billingPage.activeSubsDescription')}
                            />
                            <AgencyStatCard
                                icon={CreditCard}
                                label={t('dashboard.agency.billingPage.nextPayout')}
                                value="$0"
                                hint={t('dashboard.agency.billingPage.availableInStripe')}
                            />
                        </div>
                    )}

                    {activeTab === 'clients' && connectStatus.charges_enabled && (
                        <ClientBillingManager />
                    )}

                    {activeTab === 'history' && <InvoiceHistory />}

                    {!connectStatus.charges_enabled && activeTab !== 'overview' && (
                        <div className="bg-q-accent/10 dark:bg-q-accent/12 border border-q-accent/25 dark:border-q-accent/30 rounded-lg p-6 text-center">
                            <AlertCircle className="h-12 w-12 text-q-accent dark:text-q-accent mx-auto mb-3" />
                            <h3 className="font-semibold text-q-accent dark:text-q-accent mb-2">
                                {t('dashboard.agency.billingPage.completeStripeSetup')}
                            </h3>
                            <p className="text-q-accent dark:text-q-accent mb-4">
                                {t('dashboard.agency.billingPage.completeStripeSetupDesc')}
                            </p>
                            <button
                                onClick={openStripeDashboard}
                                className="px-4 py-2 bg-q-accent text-q-text-on-accent rounded-lg hover:bg-q-accent transition-colors"
                            >
                                {t('dashboard.agency.billingPage.goToStripe')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
