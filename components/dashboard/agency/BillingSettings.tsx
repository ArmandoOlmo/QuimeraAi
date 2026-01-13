/**
 * BillingSettings
 * Configure Stripe Connect and manage agency billing
 */

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useAuth } from '../../../contexts/AuthContext';
import {
    CreditCard,
    ExternalLink,
    CheckCircle,
    AlertCircle,
    Loader2,
    DollarSign,
    TrendingUp,
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
            setConnectStatus((result.data as any).status);
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
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Configuración de Facturación
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Gestiona pagos y facturación de tus clientes
                </p>
            </div>

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

            {/* Stripe Connect Setup */}
            {connectStatus.status === 'not_configured' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                            <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Conecta con Stripe
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Configura Stripe Connect para comenzar a facturar a tus clientes
                            directamente. Recibe pagos automáticos cada mes.
                        </p>

                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 mb-6 text-left">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                                Beneficios:
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>Cobros automáticos mensuales</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>Gestión de métodos de pago</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>Generación automática de invoices</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span>Reportes de ingresos en tiempo real</span>
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
                                    Configurando...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-5 w-5" />
                                    Conectar con Stripe
                                </>
                            )}
                        </button>

                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                            Serás redirigido a Stripe para completar la configuración
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Stripe Connect Status Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div
                                    className={`inline-flex items-center justify-center h-12 w-12 rounded-lg ${
                                        connectStatus.charges_enabled
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
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Stripe Connect
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {connectStatus.charges_enabled
                                            ? 'Cuenta activa - Puedes facturar a clientes'
                                            : 'Configuración pendiente - Completa tu perfil en Stripe'}
                                    </p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                Cobros:
                                            </span>
                                            <span
                                                className={`font-medium ${
                                                    connectStatus.charges_enabled
                                                        ? 'text-green-600'
                                                        : 'text-gray-400'
                                                }`}
                                            >
                                                {connectStatus.charges_enabled
                                                    ? 'Habilitado'
                                                    : 'Deshabilitado'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                Pagos:
                                            </span>
                                            <span
                                                className={`font-medium ${
                                                    connectStatus.payouts_enabled
                                                        ? 'text-green-600'
                                                        : 'text-gray-400'
                                                }`}
                                            >
                                                {connectStatus.payouts_enabled
                                                    ? 'Habilitado'
                                                    : 'Deshabilitado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={openStripeDashboard}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                                Ver en Stripe
                                <ExternalLink className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Requirements if any */}
                        {connectStatus.requirements?.currently_due?.length > 0 && (
                            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                                    Información requerida:
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
                                    Completar en Stripe →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex gap-8">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'overview'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Vista General
                            </button>
                            <button
                                onClick={() => setActiveTab('clients')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'clients'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Gestión de Clientes
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'history'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                Historial de Pagos
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* MRR Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        MRR Total
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    ${currentTenant?.billing?.mrr?.toLocaleString() || '0'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                    Ingreso mensual recurrente
                                </p>
                            </div>

                            {/* Active Subscriptions */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Suscripciones Activas
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    0
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                    Clientes con facturación activa
                                </p>
                            </div>

                            {/* Next Payout */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <CreditCard className="h-5 w-5 text-purple-600" />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Próximo Pago
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    $0
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                    Disponible en Stripe
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
                                Completa la configuración de Stripe
                            </h3>
                            <p className="text-yellow-800 dark:text-yellow-300 mb-4">
                                Necesitas completar la configuración de tu cuenta de Stripe para
                                acceder a esta sección.
                            </p>
                            <button
                                onClick={openStripeDashboard}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                            >
                                Ir a Stripe
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
