/**
 * PricingPage — Public marketing page for Quimera.ai plans & pricing
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    period: '',
    description: 'Ideal para empezar tu presencia digital',
    features: [
      '1 sitio web',
      '500 créditos AI / mes',
      'Subdominio quimera.ai',
      'SSL incluido',
      'Editor drag & drop',
    ],
    cta: 'Empieza gratis',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mes',
    description: 'Para negocios en crecimiento',
    features: [
      '5 sitios web',
      '5,000 créditos AI / mes',
      'Dominio personalizado',
      'SSL incluido',
      'CMS + Blog',
      'Ecommerce básico',
      'SEO avanzado',
      'Email marketing',
    ],
    cta: 'Empezar Pro',
    highlighted: true,
  },
  {
    name: 'Agency',
    price: '$79',
    period: '/mes',
    description: 'Para agencias y equipos',
    features: [
      'Sitios ilimitados',
      '20,000 créditos AI / mes',
      'Dominios ilimitados',
      'White label',
      'Multi-tenant',
      'Gestión de clientes',
      'Reportes avanzados',
      'Soporte prioritario',
    ],
    cta: 'Contactar ventas',
    highlighted: false,
  },
];

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

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-[#0a0a1a]/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onNavigateToHome}
            className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            Quimera AI
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateToLogin}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Iniciar sesión
            </button>
            <button
              onClick={onNavigateToRegister}
              className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors font-medium"
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
          Planes y precios
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Elige el plan perfecto para tu negocio. Todos incluyen acceso a nuestro editor con IA y hosting premium.
        </p>
      </section>

      {/* Plans Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-indigo-600/20 to-purple-600/10 border-2 border-indigo-500/40 shadow-2xl shadow-indigo-500/10 scale-105'
                  : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                  Más popular
                </div>
              )}

              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-white/40 text-sm mb-6">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-white/40">{plan.period}</span>}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-white/70">
                    <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={onNavigateToRegister}
                className={`w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  plan.highlighted
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/30">
        © {new Date().getFullYear()} Quimera AI. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default PricingPage;
