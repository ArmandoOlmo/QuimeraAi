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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ClientBillingManager } from './ClientBillingManager';
import { InvoiceHistory } from './InvoiceHistory';

const functions = getFunctions();

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
            const getStatus = httpsCallable(functions, 'getStripeConnectStatus');
            const result = await getStatus({ tenantId: currentTenant.id });
            setConnectStatus(result.data as any);
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
            const createAccount = httpsCallable(functions, 'createStripeConnectAccount');
            const result = await createAccount({
                tenantId: currentTenant.id,
                businessInfo: {
                    country: 'US',
                    // Can add more business info from a form
                },
            });

            const data = result.data as any;
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

    if (loading && connectStatus.status === 'not_configured') {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
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

            {/* Collapsible Instructions Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <HelpCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-foreground">
                                {connectStatus.status === 'not_configured'
                                    ? '¿Cómo configuro mi cuenta de pagos?'
                                    : '¿Cómo completo la verificación de Stripe?'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Guía paso a paso con instrucciones detalladas
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">
                            {showInstructions ? 'Ocultar guía' : 'Ver guía'}
                        </span>
                        {showInstructions ? (
                            <ChevronUp className="h-5 w-5 text-primary" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-primary" />
                        )}
                    </div>
                </button>

                {showInstructions && (
                    <div className="px-6 pb-6 space-y-6">
                        {/* Divider */}
                        <div className="border-t border-border" />

                        {/* What is Stripe Connect */}
                        <div className="bg-muted/30 rounded-xl p-5 border border-border">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-background rounded-xl flex-shrink-0 border border-border">
                                    <Info className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground text-lg mb-2">
                                        ¿Qué es Stripe Connect?
                                    </h4>
                                    <p className="text-muted-foreground leading-relaxed">
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
                                <span className="p-1.5 bg-primary/10 rounded-lg">
                                    <FileText className="h-4 w-4 text-primary" />
                                </span>
                                Pasos para configurar tu cuenta
                            </h4>

                            <div className="space-y-4">
                                {/* Step 1 */}
                                <div className="relative pl-8 pb-4 border-l-2 border-border ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                        1
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-4 border border-border ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CreditCard className="h-5 w-5 text-primary" />
                                            <h5 className="font-semibold text-foreground">
                                                Haz clic en "Conectar con Stripe"
                                            </h5>
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            Busca el botón azul que dice <span className="bg-primary/10 px-2 py-0.5 rounded text-primary font-medium">"Conectar con Stripe"</span> y haz clic.
                                            Serás redirigido a la página oficial de Stripe.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="relative pl-8 pb-4 border-l-2 border-border ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                        2
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-4 border border-border ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Building2 className="h-5 w-5 text-primary" />
                                            <h5 className="font-semibold text-foreground">
                                                Ingresa información de tu negocio
                                            </h5>
                                        </div>
                                        <p className="text-muted-foreground text-sm mb-3">
                                            Stripe te pedirá datos básicos de tu empresa o agencia:
                                        </p>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                <span>Nombre legal de tu negocio</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                <span>Dirección comercial</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                <span>Número de identificación fiscal (EIN o equivalente)</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                <span>Tipo de negocio (individual, LLC, corporación, etc.)</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="relative pl-8 pb-4 border-l-2 border-border ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                        3
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-4 border border-border ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <User className="h-5 w-5 text-primary" />
                                            <h5 className="font-semibold text-foreground">
                                                Verifica tu identidad
                                            </h5>
                                        </div>
                                        <p className="text-muted-foreground text-sm mb-3">
                                            Por seguridad, Stripe necesita verificar quién eres. Necesitarás:
                                        </p>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>Documento de identidad (pasaporte, licencia de conducir o ID nacional)</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>Una selfie o foto tuya (para comparar con tu documento)</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>Fecha de nacimiento y últimos 4 dígitos de tu SSN (en EE.UU.)</span>
                                            </li>
                                        </ul>
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                                            <p className="text-xs text-muted-foreground flex items-start gap-2">
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
                                <div className="relative pl-8 pb-4 border-l-2 border-border ml-4">
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                                        4
                                    </div>
                                    <div className="bg-muted/30 rounded-xl p-4 border border-border ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Landmark className="h-5 w-5 text-primary" />
                                            <h5 className="font-semibold text-foreground">
                                                Agrega tu cuenta bancaria
                                            </h5>
                                        </div>
                                        <p className="text-muted-foreground text-sm mb-3">
                                            Para recibir tus pagos, necesitas conectar una cuenta bancaria:
                                        </p>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>Número de cuenta y número de ruta (routing number)</span>
                                            </li>
                                            <li className="flex items-center gap-2 text-muted-foreground">
                                                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span>La cuenta debe estar a nombre del negocio o del dueño</span>
                                            </li>
                                        </ul>
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                                            <p className="text-xs text-muted-foreground flex items-start gap-2">
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
                                    <div className="absolute -left-4 top-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                        <CheckCircle className="h-5 w-5" />
                                    </div>
                                    <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 ml-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Clock className="h-5 w-5 text-green-600" />
                                            <h5 className="font-semibold text-foreground">
                                                ¡Espera la activación!
                                            </h5>
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            Una vez completados todos los pasos, Stripe verificará tu información.
                                            Esto puede tomar desde <strong>unos minutos hasta 24-48 horas</strong>.
                                            Te notificaremos cuando tu cuenta esté lista para recibir pagos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FAQ Section */}
                        <div className="bg-muted/30 rounded-xl p-5 border border-border">
                            <h4 className="font-bold text-foreground text-lg mb-4">
                                Preguntas frecuentes
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <h5 className="font-semibold text-foreground text-sm mb-1">
                                        ¿Stripe cobra comisiones?
                                    </h5>
                                    <p className="text-muted-foreground text-sm">
                                        Sí, Stripe cobra una pequeña comisión por cada transacción (generalmente 2.9% + $0.30 por cobro).
                                        Esto se descuenta automáticamente antes de depositar en tu cuenta.
                                    </p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-foreground text-sm mb-1">
                                        ¿Cuándo recibo mis pagos?
                                    </h5>
                                    <p className="text-muted-foreground text-sm">
                                        Los pagos se depositan automáticamente en tu cuenta bancaria.
                                        El tiempo estándar es de 2 días hábiles después de recibir un pago de un cliente.
                                    </p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-foreground text-sm mb-1">
                                        ¿Puedo usar mi cuenta personal?
                                    </h5>
                                    <p className="text-muted-foreground text-sm">
                                        Sí, si eres un profesional independiente puedes usar tu cuenta personal.
                                        Si tienes una empresa registrada, es mejor usar la cuenta bancaria empresarial.
                                    </p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-foreground text-sm mb-1">
                                        ¿Qué pasa si Stripe rechaza mi verificación?
                                    </h5>
                                    <p className="text-muted-foreground text-sm">
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
            </div>

            {/* Stripe Connect Setup */}
            {connectStatus.status === 'not_configured' ? (
                <div className="bg-card rounded-lg border border-border p-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                            <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            {t('dashboard.agency.billingPage.stripeConnectTitle')}
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            {t('dashboard.agency.billingPage.stripeConnectSubtitle')}
                        </p>

                        <div className="bg-muted/50 rounded-lg p-6 mb-6 text-left">
                            <h3 className="font-semibold text-foreground mb-3">
                                {t('dashboard.agency.billingPage.benefits')}
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>{t('dashboard.agency.billingPage.benefit1')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>{t('dashboard.agency.billingPage.benefit2')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>{t('dashboard.agency.billingPage.benefit3')}</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>{t('dashboard.agency.billingPage.benefit4')}</span>
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={handleSetupStripeConnect}
                            disabled={loading}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
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

                        <p className="text-xs text-muted-foreground mt-4">
                            {t('dashboard.agency.billingPage.redirectNotice')}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Stripe Connect Status Card */}
                    <div className="bg-card rounded-lg border border-border p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div
                                    className={`inline-flex items-center justify-center h-12 w-12 rounded-lg ${connectStatus.charges_enabled
                                        ? 'bg-green-100 dark:bg-green-900/20'
                                        : 'bg-yellow-100 dark:bg-yellow-900/20'
                                        }`}
                                >
                                    {connectStatus.charges_enabled ? (
                                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {t('dashboard.agency.billingPage.stripeConnect')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {connectStatus.charges_enabled
                                            ? t('dashboard.agency.billingPage.accountActive')
                                            : t('dashboard.agency.billingPage.pendingSetup')}
                                    </p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {t('dashboard.agency.billingPage.charges')}
                                            </span>
                                            <span
                                                className={`font-medium ${connectStatus.charges_enabled
                                                    ? 'text-green-600'
                                                    : 'text-gray-400'
                                                    }`}
                                            >
                                                {connectStatus.charges_enabled
                                                    ? t('dashboard.agency.billingPage.enabled')
                                                    : t('dashboard.agency.billingPage.disabled')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-muted-foreground">
                                                {t('dashboard.agency.billingPage.payouts')}
                                            </span>
                                            <span
                                                className={`font-medium ${connectStatus.payouts_enabled
                                                    ? 'text-green-600'
                                                    : 'text-gray-400'
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
                                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                                {t('dashboard.agency.billingPage.viewInStripe')}
                                <ExternalLink className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Requirements if any */}
                        {connectStatus.requirements?.currently_due?.length > 0 && (
                            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                                    {t('dashboard.agency.billingPage.requiredInfo')}
                                </p>
                                <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                                    {connectStatus.requirements.currently_due.map(
                                        (req: string, i: number) => (
                                            <li key={i}>• {req}</li>
                                        )
                                    )}
                                </ul>
                                <button
                                    onClick={openStripeDashboard}
                                    className="mt-3 text-sm font-medium text-yellow-900 dark:text-yellow-200 hover:underline"
                                >
                                    {t('dashboard.agency.billingPage.completeInStripe')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-border">
                        <nav className="flex gap-8">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                {t('dashboard.agency.billingPage.tabOverview')}
                            </button>
                            <button
                                onClick={() => setActiveTab('clients')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'clients'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {t('dashboard.agency.billingPage.tabClients')}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'history'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {t('dashboard.agency.billingPage.tabHistory')}
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* MRR Card */}
                            <div className="bg-card rounded-lg border border-border p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {t('dashboard.agency.billingPage.mrrTotal')}
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    ${currentTenant?.billing?.mrr?.toLocaleString() || '0'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                    {t('dashboard.agency.billingPage.mrrDescription')}
                                </p>
                            </div>

                            {/* Active Subscriptions */}
                            <div className="bg-card rounded-lg border border-border p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {t('dashboard.agency.billingPage.activeSubscriptions')}
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-foreground">
                                    0
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('dashboard.agency.billingPage.activeSubsDescription')}
                                </p>
                            </div>

                            {/* Next Payout */}
                            <div className="bg-card rounded-lg border border-border p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <CreditCard className="h-5 w-5 text-purple-600" />
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {t('dashboard.agency.billingPage.nextPayout')}
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-foreground">
                                    $0
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('dashboard.agency.billingPage.availableInStripe')}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'clients' && connectStatus.charges_enabled && (
                        <ClientBillingManager />
                    )}

                    {activeTab === 'history' && <InvoiceHistory />}

                    {!connectStatus.charges_enabled && activeTab !== 'overview' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
                            <AlertCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
                            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                                {t('dashboard.agency.billingPage.completeStripeSetup')}
                            </h3>
                            <p className="text-yellow-800 dark:text-yellow-300 mb-4">
                                {t('dashboard.agency.billingPage.completeStripeSetupDesc')}
                            </p>
                            <button
                                onClick={openStripeDashboard}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
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
