/**
 * AgencySignup Component
 * Public page for agency plan registration and Stripe checkout
 * 
 * Features:
 * - Displays 3 agency plans (Starter, Pro, Scale)
 * - Monthly/Annual billing toggle with discount
 * - Price calculator showing base fee + project cost
 * - Direct integration with Stripe Checkout
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
    Building2, Check, Sparkles, ArrowRight, Zap, Crown,
    Users, Database, Bot, Mail, Globe, Lock
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/core/AuthContext';
import { usePlans } from '../contexts/PlansContext';
import { useRouter } from '../hooks/useRouter';
import { ROUTES } from '../routes/config';
import { hexToRgba } from '../utils/colorUtils';
import { useTranslation } from 'react-i18next';

// =============================================================================
// TYPES
// =============================================================================

interface AgencyPlanDisplay {
    id: string;
    name: string;
    description: string;
    baseFee: { monthly: number; annually: number };
    projectCost: number;
    poolCredits: number;
    features: string[];
    icon: React.ElementType;
    color: string;
    isFeatured: boolean;
}

type BillingCycle = 'monthly' | 'annually';

// =============================================================================
// CONSTANTS
// =============================================================================

const AGENCY_PLANS_CONFIG: Record<string, Omit<AgencyPlanDisplay, 'baseFee'>> = {
    agency_starter: {
        id: 'agency_starter',
        name: 'Agency Starter',
        description: 'Para agencias que comienzan',
        projectCost: 29,
        poolCredits: 2000,
        features: [
            '5 usuarios del equipo',
            '50 GB de almacenamiento',
            '2,000 AI credits (pool compartido)',
            'White-label completo',
            'Dominios personalizados ilimitados',
            'CRM y automatizaciones',
            'E-commerce incluido',
            'Soporte prioritario',
        ],
        icon: Building2,
        color: '#10b981',
        isFeatured: false,
    },
    agency_pro: {
        id: 'agency_pro',
        name: 'Agency Pro',
        description: 'Para agencias en crecimiento',
        projectCost: 29,
        poolCredits: 5000,
        features: [
            '15 usuarios del equipo',
            '200 GB de almacenamiento',
            '5,000 AI credits (pool compartido)',
            'Todo lo de Starter',
            '50,000 leads mensuales',
            '50,000 emails mensuales',
            'Analytics avanzados',
            'API y Webhooks',
        ],
        icon: Zap,
        color: '#8b5cf6',
        isFeatured: true,
    },
    agency_scale: {
        id: 'agency_scale',
        name: 'Agency Scale',
        description: 'Para agencias de alto volumen',
        projectCost: 29,
        poolCredits: 15000,
        features: [
            '50 usuarios del equipo',
            '1 TB de almacenamiento',
            '15,000 AI credits (pool compartido)',
            'Todo lo de Pro',
            'Leads ilimitados',
            'Emails ilimitados',
            'Sin fee de transacción',
            'Soporte dedicado',
        ],
        icon: Crown,
        color: '#f59e0b',
        isFeatured: false,
    },
};

// =============================================================================
// COMPONENT
// =============================================================================

const AgencySignup: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { plans, isLoading: plansLoading } = usePlans();
    const { navigate } = useRouter();

    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Build agency plans with prices from Firestore
    const agencyPlans = useMemo((): AgencyPlanDisplay[] => {
        return ['agency_starter', 'agency_pro', 'agency_scale'].map(planId => {
            const stored = plans[planId];
            const config = AGENCY_PLANS_CONFIG[planId];

            return {
                ...config,
                baseFee: stored ? stored.price : { monthly: 0, annually: 0 },
            };
        });
    }, [plans]);

    // Handle plan selection and checkout
    const handleSelectPlan = useCallback(async (planId: string) => {
        // If not logged in, redirect to register with return URL
        if (!user) {
            navigate(`${ROUTES.REGISTER}?redirect=/agency-signup&plan=${planId}`);
            return;
        }

        setIsCheckoutLoading(planId);
        setError(null);

        try {
            const functions = getFunctions();
            const createCheckoutSession = httpsCallable<
                { planId: string; billingCycle: BillingCycle; tenantId: string; successUrl: string; cancelUrl: string },
                { success: boolean; url: string }
            >(functions, 'createCheckoutSession');

            // Note: tenantId needs to be obtained from user context
            // For new signups without a tenant, the checkout should create one
            const result = await createCheckoutSession({
                planId,
                billingCycle,
                tenantId: user.uid, // Temporary - should be actual tenant ID
                successUrl: `${window.location.origin}/dashboard?subscription=success&plan=${planId}`,
                cancelUrl: `${window.location.origin}/agency-signup?cancelled=true`,
            });

            if (result.data.success && result.data.url) {
                window.location.href = result.data.url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (err: any) {
            console.error('[AgencySignup] Checkout error:', err);
            setError(err.message || 'Error al iniciar el checkout. Por favor, intente de nuevo.');
        } finally {
            setIsCheckoutLoading(null);
        }
    }, [user, billingCycle, navigate]);

    // Calculate annual savings
    const getAnnualSavings = (baseFee: { monthly: number; annually: number }) => {
        return ((baseFee.monthly - baseFee.annually) / baseFee.monthly * 100).toFixed(0);
    };

    // Get display price
    const getDisplayPrice = (baseFee: { monthly: number; annually: number }) => {
        return billingCycle === 'monthly' ? baseFee.monthly : baseFee.annually;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 bg-purple-500" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 bg-emerald-500" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 bg-blue-500" />
            </div>

            {/* Header */}
            <header className="relative z-10 py-6 px-6 flex justify-between items-center max-w-7xl mx-auto">
                <a href="/" className="flex items-center gap-2">
                    <img
                        src="/logo.svg"
                        alt="Quimera AI"
                        className="h-8 w-auto"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span className="text-xl font-bold text-white">Quimera.ai</span>
                </a>

                <div className="flex items-center gap-4">
                    {!user ? (
                        <>
                            <a
                                href="/login"
                                className="text-slate-300 hover:text-white transition-colors"
                            >
                                Iniciar sesión
                            </a>
                            <a
                                href="/register"
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-white font-medium transition-all"
                            >
                                Registrarse
                            </a>
                        </>
                    ) : (
                        <a
                            href="/dashboard"
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-white font-medium transition-all"
                        >
                            Ir al Dashboard
                        </a>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 px-6 py-16">
                <div className="max-w-7xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-6">
                            <Building2 size={16} />
                            Planes para Agencias
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                            Crece tu agencia con
                            <span className="bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent"> IA</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
                            Gestiona todos los proyectos de tus clientes desde una sola plataforma.
                            Fee base + $29/mes por proyecto activo.
                        </p>

                        {/* Billing Toggle */}
                        <div className="inline-flex items-center gap-4 p-1 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${billingCycle === 'monthly'
                                    ? 'bg-white text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Mensual
                            </button>
                            <button
                                onClick={() => setBillingCycle('annually')}
                                className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${billingCycle === 'annually'
                                    ? 'bg-white text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Anual
                                <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                                    -20%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-center">
                            {error}
                        </div>
                    )}

                    {/* Plans Grid */}
                    {plansLoading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {agencyPlans.map((plan) => {
                                const Icon = plan.icon;
                                const price = getDisplayPrice(plan.baseFee);
                                const savings = getAnnualSavings(plan.baseFee);
                                const isLoading = isCheckoutLoading === plan.id;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`
                                            relative flex flex-col p-8 rounded-2xl backdrop-blur-xl
                                            border transition-all duration-300 hover:scale-[1.02]
                                            ${plan.isFeatured
                                                ? 'bg-white/10 border-purple-500/50 shadow-xl shadow-purple-500/20'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }
                                        `}
                                    >
                                        {/* Featured Badge */}
                                        {plan.isFeatured && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-sm font-bold shadow-lg">
                                                    <Sparkles size={14} />
                                                    Más Popular
                                                </div>
                                            </div>
                                        )}

                                        {/* Plan Header */}
                                        <div className="text-center mb-6">
                                            <div
                                                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                                                style={{ backgroundColor: hexToRgba(plan.color, 0.2) }}
                                            >
                                                <Icon size={28} style={{ color: plan.color }} />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-1">
                                                {plan.name}
                                            </h3>
                                            <p className="text-slate-400 text-sm">
                                                {plan.description}
                                            </p>
                                        </div>

                                        {/* Pricing */}
                                        <div className="text-center mb-6 pb-6 border-b border-white/10">
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-5xl font-bold text-white">
                                                    ${price}
                                                </span>
                                                <span className="text-slate-400">/mes</span>
                                            </div>
                                            {billingCycle === 'annually' && (
                                                <p className="text-emerald-400 text-sm mt-1">
                                                    Ahorras {savings}% anualmente
                                                </p>
                                            )}
                                            <div className="mt-3 px-3 py-1.5 bg-slate-800/50 rounded-lg inline-block">
                                                <span className="text-slate-300 text-sm">
                                                    + <span className="text-white font-semibold">${plan.projectCost}</span>/mes por proyecto
                                                </span>
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-3 mb-8 flex-grow">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <div
                                                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                                        style={{ backgroundColor: hexToRgba(plan.color, 0.2) }}
                                                    >
                                                        <Check size={12} style={{ color: plan.color }} />
                                                    </div>
                                                    <span className="text-slate-300 text-sm">
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA Button */}
                                        <button
                                            onClick={() => handleSelectPlan(plan.id)}
                                            disabled={isLoading}
                                            className={`
                                                w-full py-3.5 px-6 rounded-xl font-semibold
                                                flex items-center justify-center gap-2
                                                transition-all duration-300
                                                ${plan.isFeatured
                                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                                                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                                                }
                                                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current" />
                                                    Procesando...
                                                </>
                                            ) : (
                                                <>
                                                    Comenzar ahora
                                                    <ArrowRight size={18} />
                                                </>
                                            )}
                                        </button>

                                        {/* Trial Note */}
                                        <p className="text-center text-slate-500 text-xs mt-4">
                                            7 días de prueba gratis • Sin tarjeta requerida
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Trust Indicators */}
                    <div className="mt-20 text-center">
                        <p className="text-slate-500 text-sm mb-6">
                            Más de 500 agencias confían en Quimera.ai
                        </p>
                        <div className="flex justify-center items-center gap-8 flex-wrap">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Lock size={18} />
                                <span className="text-sm">Pagos seguros con Stripe</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Users size={18} />
                                <span className="text-sm">Clientes ilimitados</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Globe size={18} />
                                <span className="text-sm">Dominios personalizados</span>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="mt-24 max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-white text-center mb-12">
                            Preguntas Frecuentes
                        </h2>

                        <div className="space-y-4">
                            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                                <h3 className="text-white font-semibold mb-2">
                                    ¿Cómo funciona el modelo de precios?
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    Pagas un fee base mensual según tu plan, más $29/mes por cada proyecto activo de cliente.
                                    Los créditos de IA se comparten entre todos tus proyectos.
                                </p>
                            </div>

                            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                                <h3 className="text-white font-semibold mb-2">
                                    ¿Puedo cancelar en cualquier momento?
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    Sí, puedes cancelar tu suscripción en cualquier momento desde tu dashboard.
                                    No hay permanencia ni penalizaciones.
                                </p>
                            </div>

                            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                                <h3 className="text-white font-semibold mb-2">
                                    ¿Qué pasa si necesito más créditos de IA?
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    Puedes comprar paquetes adicionales de créditos en cualquier momento,
                                    o actualizar a un plan superior con más créditos incluidos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-8 px-6 border-t border-white/10 mt-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} Quimera.ai. Todos los derechos reservados.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="/privacy-policy" className="text-slate-500 hover:text-white text-sm transition-colors">
                            Privacidad
                        </a>
                        <a href="/terms-of-service" className="text-slate-500 hover:text-white text-sm transition-colors">
                            Términos
                        </a>
                        <a href="/help-center" className="text-slate-500 hover:text-white text-sm transition-colors">
                            Ayuda
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default AgencySignup;
