import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Zap, Layout, Palette, Image as ImageIcon, MessageSquare, BarChart3, Check, Menu, X } from 'lucide-react';
import LanguageSelector from './ui/LanguageSelector';

// --- Brand Assets ---
const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface PublicLandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ 
  onNavigateToLogin, 
  onNavigateToRegister 
}) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      titleKey: "landing.feature1Title",
      descKey: "landing.feature1Desc"
    },
    {
      icon: <ImageIcon className="w-6 h-6" />,
      titleKey: "landing.feature2Title",
      descKey: "landing.feature2Desc"
    },
    {
      icon: <Layout className="w-6 h-6" />,
      titleKey: "landing.feature3Title",
      descKey: "landing.feature3Desc"
    },
    {
      icon: <Palette className="w-6 h-6" />,
      titleKey: "landing.feature4Title",
      descKey: "landing.feature4Desc"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      titleKey: "landing.feature5Title",
      descKey: "landing.feature5Desc"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      titleKey: "landing.feature6Title",
      descKey: "landing.feature6Desc"
    }
  ];

  const pricingPlans = [
    {
      nameKey: 'landing.planStarter',
      price: '$29',
      periodKey: 'landing.perMonth',
      descKey: 'landing.planStarterDesc',
      featureKeys: ['landing.feature5Projects', 'landing.featureAIContent', 'landing.featureBasicTemplates', 'landing.featureEmailSupport'],
      featured: false
    },
    {
      nameKey: 'landing.planPro',
      price: '$79',
      periodKey: 'landing.perMonth',
      descKey: 'landing.planProDesc',
      featureKeys: ['landing.featureUnlimitedProjects', 'landing.featureAIImages', 'landing.featurePremiumTemplates', 'landing.featurePrioritySupport', 'landing.featureCustomDomains', 'landing.featureAnalytics'],
      featured: true
    },
    {
      nameKey: 'landing.planEnterprise',
      price: 'Custom',
      periodKey: '',
      descKey: 'landing.planEnterpriseDesc',
      featureKeys: ['landing.featureAllPro', 'landing.featureWhiteLabel', 'landing.featureAPI', 'landing.featureDedicatedSupport', 'landing.featureCustomIntegrations', 'landing.featureSLA'],
      featured: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* === HEADER === */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2 sm:gap-3">
              <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-8 h-8 sm:w-10 sm:h-10" />
              <span className="text-lg sm:text-xl font-bold text-white">
                Quimera<span className="text-yellow-400">.ai</span>
              </span>
            </a>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">{t('landing.navFeatures')}</a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">{t('landing.navPricing')}</a>
            </nav>

            {/* CTA Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <button 
                onClick={onNavigateToLogin}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {t('landing.login')}
              </button>
              <button 
                onClick={onNavigateToRegister}
                className="px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
              >
                {t('landing.register')}
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
                <a 
                  href="#features" 
                  className="text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('landing.navFeatures')}
                </a>
                <a 
                  href="#pricing" 
                  className="text-gray-300 hover:text-white transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('landing.navPricing')}
                </a>
              </nav>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateToLogin();
                  }}
                  className="w-full py-3 text-center text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors"
                >
                  {t('landing.login')}
                </button>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateToRegister();
                  }}
                  className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                >
                  {t('landing.register')}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* === HERO SECTION === */}
      <section className="min-h-screen flex flex-col items-center justify-center pt-16 sm:pt-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo Grande */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48 mx-auto mb-6 sm:mb-8">
            <img
              src={QUIMERA_LOGO}
              alt="Quimera AI"
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] sm:drop-shadow-[0_0_50px_rgba(250,204,21,0.6)]"
            />
          </div>

          {/* Título Principal */}
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black leading-tight mb-4 sm:mb-6 px-2">
            {t('landing.heroTitle1')}
            <span className="block text-yellow-400">
              {t('landing.heroTitle2')}
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            {t('landing.heroSubtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 px-4 sm:px-0">
            <button 
              onClick={onNavigateToRegister}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {t('landing.startFree')}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 active:scale-[0.98] transition-all"
            >
              {t('landing.viewFeatures')}
            </button>
          </div>

        </div>
      </section>

      {/* === FEATURES SECTION === */}
      <section id="features" className="py-16 sm:py-20 md:py-24 bg-[#0A0A0A]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2">
              {t('landing.featuresTitle')}
              <span className="text-yellow-400"> {t('landing.featuresTitleHighlight')}</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-2">
              {t('landing.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-5 sm:p-8 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl hover:bg-white/10 hover:border-yellow-400/30 active:scale-[0.99] transition-all"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400/10 rounded-lg sm:rounded-xl flex items-center justify-center text-yellow-400 mb-4 sm:mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{t(feature.titleKey)}</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{t(feature.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === PRICING SECTION === */}
      <section id="pricing" className="py-16 sm:py-20 md:py-24 bg-[#050505]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2">
              {t('landing.pricingTitle')} <span className="text-yellow-400">{t('landing.pricingTitleHighlight')}</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-2">
              {t('landing.pricingSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative p-5 sm:p-8 rounded-xl sm:rounded-2xl transition-all active:scale-[0.99] ${
                  plan.featured 
                    ? 'bg-yellow-400/10 border-2 border-yellow-400/50 order-first md:order-none'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 bg-yellow-400 text-black text-xs sm:text-sm font-bold rounded-full whitespace-nowrap">
                    {t('landing.mostPopular')}
                  </div>
                )}
                <h3 className="text-xl sm:text-2xl font-bold mb-2 mt-2 sm:mt-0">{t(plan.nameKey)}</h3>
                <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">{t(plan.descKey)}</p>
                <div className="mb-4 sm:mb-6">
                  <span className="text-3xl sm:text-4xl font-black">{plan.price}</span>
                  <span className="text-gray-500 text-sm sm:text-base">{plan.periodKey ? t(plan.periodKey) : ''}</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {plan.featureKeys.map((featureKey, i) => (
                    <li key={i} className="flex items-start gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={onNavigateToRegister}
                  className={`w-full py-2.5 sm:py-3 rounded-xl font-semibold transition-all active:scale-[0.98] ${
                    plan.featured
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {t('landing.getStarted')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA SECTION === */}
      <section className="py-16 sm:py-20 md:py-24 bg-[#0A0A0A]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-2">
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 sm:mb-10 px-2">
              {t('landing.ctaSubtitle')}
            </p>
            <button 
              onClick={onNavigateToRegister}
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-yellow-400 text-black font-bold text-base sm:text-lg rounded-xl hover:bg-yellow-300 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 sm:gap-3 mx-4 sm:mx-0"
            >
              {t('landing.startFree')}
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <p className="mt-3 sm:mt-4 text-gray-500 text-xs sm:text-sm">{t('landing.noCreditCard')}</p>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="py-8 sm:py-12 border-t border-white/10 bg-[#050505]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:gap-6 md:flex-row md:justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className="font-bold text-sm sm:text-base">Quimera<span className="text-yellow-400">.ai</span></span>
            </div>
            
            {/* Links */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors py-1">{t('landing.footerPrivacy')}</a>
              <a href="#" className="hover:text-white transition-colors py-1">{t('landing.footerTerms')}</a>
              <a href="#" className="hover:text-white transition-colors py-1">{t('landing.footerContact')}</a>
            </div>
            
            {/* Copyright */}
            <div className="text-xs sm:text-sm text-gray-500">
              © {new Date().getFullYear()} Quimera.ai
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLandingPage;
