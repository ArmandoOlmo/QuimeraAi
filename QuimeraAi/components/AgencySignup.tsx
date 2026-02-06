/**
 * AgencySignup Component
 * Public page for agency plan registration and Stripe checkout
 * 
 * Features:
 * - Displays 3 agency plans (Starter, Pro, Scale)
 * - Monthly/Annual billing toggle with discount
 * - Price calculator showing base fee + project cost
 * - Direct integration with Stripe Checkout
 * - Matches Quimera.ai Landing Page Design System
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    Building2, Check, Sparkles, ArrowRight, Zap, Crown,
    Users, Globe, Lock, Menu, X, Twitter, Linkedin, Instagram, Youtube, Github, MessageCircle, Quote
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/core/AuthContext';
import { usePlans } from '../contexts/PlansContext';
import { useRouter } from '../hooks/useRouter';
import { ROUTES } from '../routes/config';
import { hexToRgba } from '../utils/colorUtils';
import { useTranslation } from 'react-i18next';
import { useSafeAppContent } from '../contexts/appContent';
import { DEFAULT_APP_NAVIGATION } from '../types/appContent';
import LanguageSelector from './ui/LanguageSelector';

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

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
    twitter: <Twitter size={18} />,
    linkedin: <Linkedin size={18} />,
    instagram: <Instagram size={18} />,
    youtube: <Youtube size={18} />,
    github: <Github size={18} />,
    discord: <MessageCircle size={18} />,
};

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

    // Get content and navigation from global context
    const appContent = useSafeAppContent();
    const navigation = appContent?.navigation || DEFAULT_APP_NAVIGATION;

    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    // Ref to track if auto-checkout was already triggered
    const autoCheckoutTriggered = useRef(false);

    // Auto-trigger checkout when returning from login with plan param
    useEffect(() => {
        if (autoCheckoutTriggered.current) return;
        if (!user || plansLoading) return;

        const urlParams = new URLSearchParams(window.location.search);
        const planFromUrl = urlParams.get('plan');

        if (planFromUrl && ['agency_starter', 'agency_pro', 'agency_scale'].includes(planFromUrl)) {
            autoCheckoutTriggered.current = true;
            // Small delay to ensure state is ready
            setTimeout(() => {
                handleSelectPlan(planFromUrl);
            }, 500);
        }
    }, [user, plansLoading, handleSelectPlan]);

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

    // Handle navigation item click
    const handleNavItemClick = (item: any) => {
        if (item.type === 'anchor') {
            const element = document.querySelector(item.href);
            element?.scrollIntoView({ behavior: 'smooth' });
        } else if (item.href === '/blog') {
            window.location.href = '/blog';
        } else if (item.href.startsWith('/')) {
            window.location.href = item.href;
        } else if (item.href.startsWith('http')) {
            window.open(item.href, item.target || '_blank');
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-[#1a1a1a] to-transparent opacity-50" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.05] bg-purple-500" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.05] bg-emerald-500" />
            </div>

            {/* === HEADER === */}
            <header
                className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
                style={{
                    backgroundColor: `#0A0A0Af2`,
                    borderBottom: `1px solid #ffffff0d`,
                }}
            >
                <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <a href="/" className="flex items-center gap-2 sm:gap-3">
                            <img
                                src={navigation.header.logo?.imageUrl || QUIMERA_LOGO}
                                alt={navigation.header.logo?.text || "Quimera.ai"}
                                className="w-8 h-8 sm:w-10 sm:h-10"
                            />
                            <span className="text-lg sm:text-xl font-bold text-white">
                                {(navigation.header.logo?.text || 'Quimera.ai').split('.')[0] || 'Quimera'}
                                <span className="text-yellow-400">.ai</span>
                            </span>
                        </a>

                        {/* Navigation - Desktop */}
                        <nav className="hidden md:flex items-center gap-8">
                            {navigation.header.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavItemClick(item)}
                                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    {item.label}
                                    {item.isNew && (
                                        <span className="px-1.5 py-0.5 text-[10px] bg-yellow-400 text-black rounded-full font-bold">NEW</span>
                                    )}
                                </button>
                            ))}
                        </nav>

                        {/* CTA Buttons - Desktop */}
                        <div className="hidden md:flex items-center gap-4">
                            <LanguageSelector variant="minimal" />
                            {!user && (
                                <button
                                    onClick={() => navigate(ROUTES.LOGIN)}
                                    className="text-sm text-gray-300 hover:text-white transition-colors"
                                >
                                    {navigation.header.cta?.loginText || t('landing.login')}
                                </button>
                            )}
                            <button
                                onClick={() => user ? navigate(ROUTES.DASHBOARD) : navigate(ROUTES.REGISTER)}
                                className="px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                            >
                                {user ? 'Dashboard' : (navigation.header.cta?.registerText || t('landing.register'))}
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex items-center gap-3 md:hidden">
                            <LanguageSelector variant="minimal" />
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-gray-300 hover:text-white transition-colors"
                                aria-label="Toggle menu"
                            >
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {isMobileMenuOpen && (
                        <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4 animate-in slide-in-from-top duration-200">
                            <nav className="flex flex-col gap-4 mb-6">
                                {navigation.header.items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavItemClick(item)}
                                        className="text-gray-300 hover:text-white transition-colors py-2 text-left flex items-center gap-2"
                                    >
                                        {item.label}
                                        {item.isNew && (
                                            <span className="px-1.5 py-0.5 text-[10px] bg-yellow-400 text-black rounded-full font-bold">NEW</span>
                                        )}
                                    </button>
                                ))}
                            </nav>
                            <div className="flex flex-col gap-3">
                                {!user && (
                                    <button
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            navigate(ROUTES.LOGIN);
                                        }}
                                        className="w-full py-3 text-center text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors"
                                    >
                                        {navigation.header.cta?.loginText || t('landing.login')}
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        user ? navigate(ROUTES.DASHBOARD) : navigate(ROUTES.REGISTER);
                                    }}
                                    className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                                >
                                    {user ? 'Dashboard' : (navigation.header.cta?.registerText || t('landing.register'))}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 px-6 pt-32 pb-16">
                <div className="max-w-7xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-400 text-sm font-medium mb-6">
                            <Building2 size={16} />
                            Planes para Agencias
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4">
                            Crece tu agencia con
                            <span className="text-yellow-400"> IA</span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                            Gestiona todos los proyectos de tus clientes desde una sola plataforma.
                            Fee base + $29/mes por proyecto activo.
                        </p>

                        {/* Billing Toggle */}
                        <div className="inline-flex items-center gap-4 p-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${billingCycle === 'monthly'
                                    ? 'bg-white text-black'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Mensual
                            </button>
                            <button
                                onClick={() => setBillingCycle('annually')}
                                className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${billingCycle === 'annually'
                                    ? 'bg-white text-black'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Anual
                                <span className="px-2 py-0.5 bg-green-400 text-black text-xs rounded-full font-bold">
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
                            <div className="w-8 h-8 border-2 border-t-transparent border-yellow-400 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {agencyPlans.map((plan) => {
                                const Icon = plan.icon;
                                const price = getDisplayPrice(plan.baseFee);
                                const savings = getAnnualSavings(plan.baseFee);
                                const isLoading = isCheckoutLoading === plan.id;
                                const isFeatured = plan.isFeatured;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`
                                            relative flex flex-col p-8 rounded-2xl backdrop-blur-xl
                                            border transition-all duration-300 hover:scale-[1.02]
                                            ${isFeatured
                                                ? 'bg-yellow-400/5 border-yellow-400/30'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }
                                        `}
                                    >
                                        {/* Featured Badge */}
                                        {isFeatured && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-yellow-400 rounded-full text-black text-sm font-bold shadow-lg">
                                                    <Sparkles size={14} />
                                                    Más Popular
                                                </div>
                                            </div>
                                        )}

                                        {/* Plan Header */}
                                        <div className="text-center mb-6">
                                            <div
                                                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                                                style={{ backgroundColor: hexToRgba(plan.color, 0.1), color: plan.color }}
                                            >
                                                <Icon size={28} />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-1">
                                                {plan.name}
                                            </h3>
                                            <p className="text-gray-400 text-sm">
                                                {plan.description}
                                            </p>
                                        </div>

                                        {/* Pricing */}
                                        <div className="text-center mb-6 pb-6 border-b border-white/10">
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-5xl font-bold text-white">
                                                    ${price}
                                                </span>
                                                <span className="text-gray-400">/mes</span>
                                            </div>
                                            {billingCycle === 'annually' && (
                                                <p className="text-green-400 text-sm mt-1 font-medium">
                                                    Ahorras {savings}% anualmente
                                                </p>
                                            )}
                                            <div className="mt-3 px-3 py-1.5 bg-white/5 rounded-lg inline-block text-sm text-gray-400">
                                                + <span className="text-white font-semibold">${plan.projectCost}</span>/mes por proyecto
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-3 mb-8 flex-grow">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-400/10 flex items-center justify-center mt-0.5">
                                                        <Check size={12} className="text-yellow-400" />
                                                    </div>
                                                    <span className="text-gray-300 text-sm">
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
                                                w-full py-3.5 px-6 rounded-xl font-bold
                                                flex items-center justify-center gap-2
                                                transition-all duration-300
                                                ${isFeatured
                                                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                                                    : 'bg-white text-black hover:bg-gray-100'
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
                                        <p className="text-center text-gray-500 text-xs mt-4">
                                            7 días de prueba gratis • Sin tarjeta requerida
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Trust Indicators */}
                    <div className="mt-20 text-center">
                        <p className="text-gray-500 text-sm mb-6">
                            Más de 500 agencias confían en Quimera.ai
                        </p>
                        <div className="flex justify-center items-center gap-8 flex-wrap opacity-60">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Lock size={18} />
                                <span className="text-sm">Pagos seguros con Stripe</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <Users size={18} />
                                <span className="text-sm">Clientes ilimitados</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <Globe size={18} />
                                <span className="text-sm">Dominios personalizados</span>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="mt-24 max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold text-white text-center mb-12">
                            Preguntas <span className="text-yellow-400">Frecuentes</span>
                        </h2>

                        <div className="space-y-4">
                            <div className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                <h3 className="text-white font-semibold mb-2">
                                    ¿Cómo funciona el modelo de precios?
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Pagas un fee base mensual según tu plan, más $29/mes por cada proyecto activo de cliente.
                                    Los créditos de IA se comparten entre todos tus proyectos.
                                </p>
                            </div>

                            <div className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                <h3 className="text-white font-semibold mb-2">
                                    ¿Puedo cancelar en cualquier momento?
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Sí, puedes cancelar tu suscripción en cualquier momento desde tu dashboard.
                                    No hay permanencia ni penalizaciones.
                                </p>
                            </div>

                            <div className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                <h3 className="text-white font-semibold mb-2">
                                    ¿Qué pasa si necesito más créditos de IA?
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Puedes comprar paquetes adicionales de créditos en cualquier momento,
                                    o actualizar a un plan superior con más créditos incluidos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* === FOOTER === */}
            <footer
                className="py-12 sm:py-16"
                style={{
                    backgroundColor: '#0A0A0A',
                    color: '#ffffff',
                    borderTop: `1px solid #ffffff1a`,
                }}
            >
                <div className="container mx-auto px-4 sm:px-6">
                    {/* Footer Columns */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        {/* Logo Column */}
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-8 h-8" />
                                <span className="font-bold">
                                    Quimera
                                    <span className="text-yellow-400">.ai</span>
                                </span>
                            </div>
                            <p className="text-sm mb-4 text-gray-500">
                                Build amazing websites with AI
                            </p>

                            {/* Social Links */}
                            {navigation.footer.socialLinks && navigation.footer.socialLinks.length > 0 && (
                                <div className="flex items-center gap-3">
                                    {navigation.footer.socialLinks.map((social) => (
                                        <a
                                            key={social.id}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                        >
                                            {SOCIAL_ICONS[social.platform]}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dynamic Columns */}
                        {navigation.footer.columns.map((column) => (
                            <div key={column.id}>
                                <h4 className="font-semibold text-white mb-4">{column.title}</h4>
                                <ul className="space-y-2">
                                    {column.items.map((item) => (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => handleNavItemClick(item)}
                                                className="text-sm text-gray-500 hover:text-white transition-colors"
                                            >
                                                {item.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Bar */}
                    <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/10 md:flex-row md:justify-between">
                        <div className="text-xs sm:text-sm text-gray-500">
                            © {new Date().getFullYear()} Quimera.ai. All rights reserved.
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
                            <a href="/changelog" className="hover:text-white transition-colors">{t('landing.footerChangelog', 'Changelog')}</a>
                            <a href="/help-center" className="hover:text-white transition-colors">{t('landing.footerHelpCenter', 'Centro de Ayuda')}</a>
                            <a href="/privacy-policy" className="hover:text-white transition-colors">{t('landing.footerPrivacy', 'Política de Privacidad')}</a>
                            <a href="/terms-of-service" className="hover:text-white transition-colors">{t('landing.footerTerms', 'Términos de Servicio')}</a>
                            <a href="/cookie-policy" className="hover:text-white transition-colors">{t('landing.footerCookies', 'Política de Cookies')}</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default AgencySignup;
