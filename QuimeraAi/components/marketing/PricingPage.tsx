/**
 * PricingPage — Public marketing page for Quimera.ai plans & pricing
 * Dynamically connected to Firestore plans via useLandingPlans hook.
 * Uses MarketingLayout for consistent header/footer/scroll.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Star,
  ArrowRight,
  Zap,
  Shield,
  Sparkles,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import { useLandingPlans, LandingPlan } from '../../hooks/useLandingPlans';

// =============================================================================
// FAQ DATA
// =============================================================================

const FAQ_ITEMS = [
  {
    questionKey: 'pricing.faq.cancelQ',
    questionFallback: '¿Puedo cancelar en cualquier momento?',
    answerKey: 'pricing.faq.cancelA',
    answerFallback: 'Sí, puedes cancelar tu suscripción en cualquier momento sin cargos adicionales. Tu plan seguirá activo hasta el final del período de facturación actual.',
  },
  {
    questionKey: 'pricing.faq.upgradeQ',
    questionFallback: '¿Puedo cambiar de plan?',
    answerKey: 'pricing.faq.upgradeA',
    answerFallback: 'Puedes actualizar o degradar tu plan cuando quieras. Los cambios se aplicarán de inmediato y se prorrateará el cobro según el tiempo restante.',
  },
  {
    questionKey: 'pricing.faq.creditsQ',
    questionFallback: '¿Qué son los AI Credits?',
    answerKey: 'pricing.faq.creditsA',
    answerFallback: 'Los AI Credits son la unidad que mide el uso de nuestras funciones de inteligencia artificial: generación de contenido, diseño asistido, chatbot, y más. Se renuevan cada mes según tu plan.',
  },
  {
    questionKey: 'pricing.faq.trialQ',
    questionFallback: '¿Hay período de prueba?',
    answerKey: 'pricing.faq.trialA',
    answerFallback: 'El plan Starter es completamente gratuito y no requiere tarjeta de crédito. Puedes usarlo todo el tiempo que necesites antes de decidir actualizar.',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

interface PricingPageProps {
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { t } = useTranslation();
  const { plans: dynamicPlans, isLoading: isLoadingPlans } = useLandingPlans();
  const [isAnnualBilling, setIsAnnualBilling] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <MarketingLayout
      onNavigateToHome={onNavigateToHome}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToRegister={onNavigateToRegister}
    >
      <div className="bg-[#0A0A0A] text-white selection:bg-yellow-400 selection:text-black">

        {/* ================================================================= */}
        {/* HERO SECTION */}
        {/* ================================================================= */}
        <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-20 overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-yellow-400/8 blur-[140px] rounded-full pointer-events-none" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-semibold mb-8 backdrop-blur-md">
              <Sparkles size={16} className="fill-current" />
              {t('pricing.badge', 'Planes flexibles para cada etapa')}
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 tracking-tighter leading-none">
              {t('pricing.title', 'Planes y')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                {t('pricing.titleHighlight', 'Precios')}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed mb-10">
              {t('pricing.subtitle', 'Elige el plan perfecto para tu negocio. Todos incluyen acceso a nuestro editor con IA y hosting premium.')}
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span
                className="text-sm font-semibold transition-all duration-300 cursor-pointer"
                style={{ color: !isAnnualBilling ? '#ffffff' : '#ffffff66' }}
                onClick={() => setIsAnnualBilling(false)}
              >
                {t('pricing.monthly', 'Mensual')}
              </span>

              <button
                onClick={() => setIsAnnualBilling(!isAnnualBilling)}
                className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                style={{ backgroundColor: isAnnualBilling ? '#facc15' : '#facc1533' }}
                aria-label={t('pricing.toggleBilling', 'Cambiar facturación')}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full transition-all duration-300 shadow-md"
                  style={{
                    backgroundColor: isAnnualBilling ? '#0A0A0A' : '#facc15',
                    left: isAnnualBilling ? 'calc(100% - 24px)' : '4px',
                  }}
                />
              </button>

              <span
                className="text-sm font-semibold transition-all duration-300 cursor-pointer"
                style={{ color: isAnnualBilling ? '#ffffff' : '#ffffff66' }}
                onClick={() => setIsAnnualBilling(true)}
              >
                {t('pricing.annual', 'Anual')}
                <span className="ml-2 px-2 py-0.5 text-xs font-bold text-green-400 bg-green-400/10 rounded-full">
                  {t('pricing.savePercent', '-20%')}
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* PLANS GRID */}
        {/* ================================================================= */}
        <section className="container mx-auto px-4 sm:px-6 pb-24 sm:pb-32 relative z-10">
          {isLoadingPlans ? (
            <div className="flex justify-center items-center py-24">
              <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
            </div>
          ) : dynamicPlans.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-gray-500 text-lg">{t('pricing.noPlans', 'No hay planes disponibles en este momento.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto items-stretch">
              {dynamicPlans.map((plan, index) => {
                const isPlanPopular = plan.featured || plan.isPopular;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-3xl p-8 sm:p-10 transition-all duration-500 hover:-translate-y-2 group ${
                      isPlanPopular
                        ? 'md:scale-105 shadow-[0_20px_60px_rgba(250,204,21,0.15)]'
                        : 'hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]'
                    }`}
                    style={{
                      backgroundColor: isPlanPopular ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.03)',
                      borderWidth: isPlanPopular ? '2px' : '1px',
                      borderStyle: 'solid',
                      borderColor: isPlanPopular ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Popular badge */}
                    {isPlanPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div
                          className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-full whitespace-nowrap shadow-[0_4px_20px_rgba(250,204,21,0.4)]"
                          style={{
                            background: 'linear-gradient(90deg, #facc15, #eab308)',
                            color: '#0A0A0A',
                          }}
                        >
                          <Star size={14} className="fill-current" />
                          {t('pricing.mostPopular', 'Más popular')}
                        </div>
                      </div>
                    )}

                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold mb-2 mt-2">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-8">
                      <span className="text-5xl font-black tracking-tight">
                        {isAnnualBilling ? plan.annualPrice : plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-base text-gray-500 ml-1">{plan.period}</span>
                      )}
                      {plan.priceValue > 0 && !isAnnualBilling && plan.annualPriceValue < plan.priceValue && (
                        <div className="mt-2">
                          <span className="text-xs font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                            {t('pricing.saveAnnually', 'Ahorra 20% con el plan anual')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={onNavigateToRegister}
                      className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 mb-8 flex items-center justify-center gap-2 ${
                        isPlanPopular
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400 shadow-[0_8px_25px_rgba(250,204,21,0.3)] hover:shadow-[0_12px_35px_rgba(250,204,21,0.4)]'
                          : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      {plan.priceValue === 0
                        ? t('pricing.startFree', 'Empieza Gratis')
                        : t('pricing.getStarted', 'Comenzar ahora')}
                      <ArrowRight size={16} className={isPlanPopular ? '' : 'group-hover:translate-x-1 transition-transform'} />
                    </button>

                    {/* Features list */}
                    <ul className="space-y-4 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              backgroundColor: isPlanPopular ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.08)',
                            }}
                          >
                            <Check size={12} className={isPlanPopular ? 'text-yellow-400' : 'text-gray-400'} />
                          </div>
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* TRUST BADGES */}
        {/* ================================================================= */}
        <section className="border-t border-white/5 py-16 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                  <Shield size={24} className="text-yellow-400" />
                </div>
                <h4 className="font-bold text-white">{t('pricing.trustSecurity', 'SSL Incluido')}</h4>
                <p className="text-sm text-gray-500">{t('pricing.trustSecurityDesc', 'Todos los planes incluyen certificado SSL gratuito y hosting seguro.')}</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                  <Zap size={24} className="text-yellow-400" />
                </div>
                <h4 className="font-bold text-white">{t('pricing.trustSpeed', 'Hosting Premium')}</h4>
                <p className="text-sm text-gray-500">{t('pricing.trustSpeedDesc', 'Infraestructura global con CDN para máxima velocidad y rendimiento.')}</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                  <Sparkles size={24} className="text-yellow-400" />
                </div>
                <h4 className="font-bold text-white">{t('pricing.trustAI', 'IA Integrada')}</h4>
                <p className="text-sm text-gray-500">{t('pricing.trustAIDesc', 'Editor inteligente con IA para diseño, contenido y SEO automático.')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* FAQ SECTION */}
        {/* ================================================================= */}
        <section className="border-t border-white/5 py-20 sm:py-28">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter mb-4">
                {t('pricing.faqTitle', 'Preguntas')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                  {t('pricing.faqTitleHighlight', 'Frecuentes')}
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                {t('pricing.faqSubtitle', 'Todo lo que necesitas saber sobre nuestros planes y facturación.')}
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {FAQ_ITEMS.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-colors hover:border-white/10"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <HelpCircle size={20} className="text-yellow-400/60 flex-shrink-0" />
                      <span className="font-semibold text-white">
                        {t(faq.questionKey, faq.questionFallback)}
                      </span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-gray-500 flex-shrink-0 transition-transform duration-300 ${
                        expandedFaq === index ? 'rotate-180 text-yellow-400' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`transition-all duration-300 overflow-hidden ${
                      expandedFaq === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="px-6 pb-6 pl-16 text-gray-400 text-sm leading-relaxed">
                      {t(faq.answerKey, faq.answerFallback)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* CTA SECTION */}
        {/* ================================================================= */}
        <section className="border-t border-white/5 py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/5 to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter mb-6">
              {t('pricing.ctaTitle', '¿Listo para empezar?')}
            </h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
              {t('pricing.ctaSubtitle', 'Crea tu primera web con IA en menos de 5 minutos. Sin tarjeta de crédito.')}
            </p>
            <button
              onClick={onNavigateToRegister}
              className="px-10 py-5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold text-lg rounded-xl hover:from-yellow-300 hover:to-yellow-400 transition-all shadow-[0_8px_30px_rgba(250,204,21,0.3)] hover:shadow-[0_12px_40px_rgba(250,204,21,0.5)] hover:scale-105 inline-flex items-center gap-3"
            >
              {t('pricing.ctaButton', 'Empieza Gratis Ahora')}
              <ArrowRight size={20} />
            </button>
            <p className="mt-4 text-sm text-gray-600">{t('pricing.noCreditCard', 'No se requiere tarjeta de crédito')}</p>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
};

export default PricingPage;
