/**
 * AboutPage — Public marketing page about Quimera.ai
 * Uses MarketingLayout to match the app's global header/footer.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Brain,
  Zap,
  Palette,
  ShieldCheck,
  Globe,
  Rocket,
  Users,
  Star,
  ArrowRight,
  Target,
  Heart,
  Lightbulb,
} from 'lucide-react';
import MarketingLayout from './MarketingLayout';

interface AboutPageProps {
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToHome?: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const { t } = useTranslation();

  const stats = [
    { value: '10K+', labelKey: 'about.statSites', icon: Globe },
    { value: '50+', labelKey: 'about.statCountries', icon: Users },
    { value: '99.9%', labelKey: 'about.statUptime', icon: Rocket },
    { value: '4.9★', labelKey: 'about.statRating', icon: Star },
  ];

  const values = [
    {
      icon: Brain,
      titleKey: 'about.valueAiTitle',
      descKey: 'about.valueAiDesc',
      gradient: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'text-purple-400',
      hoverBorder: 'hover:border-purple-500/30',
    },
    {
      icon: Zap,
      titleKey: 'about.valueSpeedTitle',
      descKey: 'about.valueSpeedDesc',
      gradient: 'from-yellow-500/20 to-yellow-500/5',
      iconColor: 'text-yellow-400',
      hoverBorder: 'hover:border-yellow-500/30',
    },
    {
      icon: Palette,
      titleKey: 'about.valueDesignTitle',
      descKey: 'about.valueDesignDesc',
      gradient: 'from-pink-500/20 to-pink-500/5',
      iconColor: 'text-pink-400',
      hoverBorder: 'hover:border-pink-500/30',
    },
    {
      icon: ShieldCheck,
      titleKey: 'about.valueSecurityTitle',
      descKey: 'about.valueSecurityDesc',
      gradient: 'from-green-500/20 to-green-500/5',
      iconColor: 'text-green-400',
      hoverBorder: 'hover:border-green-500/30',
    },
  ];

  const pillars = [
    {
      icon: Target,
      titleKey: 'about.pillarMissionTitle',
      descKey: 'about.pillarMissionDesc',
    },
    {
      icon: Lightbulb,
      titleKey: 'about.pillarVisionTitle',
      descKey: 'about.pillarVisionDesc',
    },
    {
      icon: Heart,
      titleKey: 'about.pillarCommitmentTitle',
      descKey: 'about.pillarCommitmentDesc',
    },
  ];

  return (
    <MarketingLayout
      onNavigateToHome={onNavigateToHome}
      onNavigateToLogin={onNavigateToLogin}
      onNavigateToRegister={onNavigateToRegister}
    >
      {/* Hero */}
      <section className="py-20 md:py-28 px-6 text-center relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(250,204,21,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-medium mb-6">
            <Users size={16} />
            {t('about.badge', 'Quimera.ai')}
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent leading-tight">
            {t('about.heroTitle', 'Sobre Quimera AI')}
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t('about.heroSubtitle', 'Quimera nace de la visión de democratizar la creación web con inteligencia artificial. Creemos que cada persona y negocio merece una presencia digital profesional, sin barreras técnicas.')}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-16 md:pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.labelKey}
                  className="text-center p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-yellow-400/20 transition-all duration-300 group"
                >
                  <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-yellow-400/10 flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors">
                    <Icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">
                    {t(stat.labelKey)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission / Vision / Commitment */}
      <section className="pb-16 md:pb-24 px-6 border-t border-white/5 pt-16 md:pt-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.titleKey}
                  className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-yellow-400/20 transition-all duration-300"
                >
                  <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {t(pillar.titleKey)}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {t(pillar.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="pb-16 md:pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4 bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
            {t('about.valuesTitle', 'Nuestros valores')}
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
            {t('about.valuesSubtitle', 'Los principios que guían todo lo que construimos.')}
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.titleKey}
                  className={`relative p-8 rounded-2xl bg-white/[0.03] border border-white/5 ${v.hoverBorder} transition-all duration-300 group overflow-hidden`}
                >
                  {/* Subtle gradient background on hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${v.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                  />
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-6 h-6 ${v.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors">
                      {t(v.titleKey)}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {t(v.descKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t('about.ctaTitle', '¿Listo para crear?')}
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            {t('about.ctaSubtitle', 'Únete a miles de creadores que construyen sus sitios web con Quimera AI.')}
          </p>
          <button
            onClick={onNavigateToRegister}
            className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 active:scale-[0.98] transition-all shadow-lg shadow-yellow-400/10"
          >
            {t('about.ctaButton', 'Comienza gratis')}
            <ArrowRight size={20} />
          </button>
          <p className="text-gray-600 text-sm mt-3">
            {t('about.ctaNote', 'Sin tarjeta de crédito requerida')}
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default AboutPage;
