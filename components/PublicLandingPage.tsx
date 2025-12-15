/**
 * PublicLandingPage
 * Landing page pública de Quimera.ai
 * Ahora con contenido dinámico gestionado desde el panel de Super Admin
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight, 
  Zap, 
  Layout, 
  Palette, 
  Image as ImageIcon, 
  MessageSquare, 
  BarChart3, 
  Check, 
  Menu, 
  X,
  Calendar,
  Clock,
  Star,
  FileText,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Github,
  MessageCircle
} from 'lucide-react';
import LanguageSelector from './ui/LanguageSelector';
import { useSafeAppContent } from '../contexts/appContent';
import { AppArticle, AppNavItem, DEFAULT_APP_NAVIGATION } from '../types/appContent';

// --- Brand Assets ---
const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface PublicLandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToBlog?: () => void;
  onNavigateToArticle?: (slug: string) => void;
}

// Social icons mapping
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter size={18} />,
  linkedin: <Linkedin size={18} />,
  instagram: <Instagram size={18} />,
  youtube: <Youtube size={18} />,
  github: <Github size={18} />,
  discord: <MessageCircle size={18} />,
};

const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ 
  onNavigateToLogin, 
  onNavigateToRegister,
  onNavigateToBlog,
  onNavigateToArticle
}) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get dynamic content from AppContent context
  const appContent = useSafeAppContent();
  
  // Use navigation from context or defaults
  const navigation = appContent?.navigation || DEFAULT_APP_NAVIGATION;
  const featuredArticles = appContent?.featuredArticles || [];
  const isLoadingContent = appContent?.isLoadingNavigation || false;

  // Default features (can be made dynamic later)
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

  // Handle navigation item click
  const handleNavItemClick = (item: AppNavItem) => {
    if (item.type === 'anchor') {
      // Scroll to anchor
      const element = document.querySelector(item.href);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else if (item.type === 'article' && item.articleSlug && onNavigateToArticle) {
      onNavigateToArticle(item.articleSlug);
    } else if (item.href === '/blog' && onNavigateToBlog) {
      onNavigateToBlog();
    } else if (item.href.startsWith('/')) {
      // Internal link - could be handled by router
      window.location.href = item.href;
    } else if (item.href.startsWith('http')) {
      // External link
      window.open(item.href, item.target || '_blank');
    }
    setIsMobileMenuOpen(false);
  };

  // Article Card Component
  const ArticleCard: React.FC<{ article: AppArticle; onClick: () => void }> = ({ article, onClick }) => (
    <div 
      onClick={onClick}
      className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-yellow-400/30 transition-all cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {article.featuredImage ? (
          <img 
            src={article.featuredImage} 
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-yellow-400/20 to-purple-600/20 flex items-center justify-center">
            <FileText className="w-12 h-12 text-white/30" />
          </div>
        )}
        {article.featured && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center gap-1">
            <Star size={10} /> Featured
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span className="px-2 py-0.5 bg-white/10 rounded-full capitalize">{article.category}</span>
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {new Date(article.createdAt).toLocaleDateString()}
          </span>
          {article.readTime && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {article.readTime} min
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-yellow-400 transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-gray-400 line-clamp-2">
          {article.excerpt}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* === HEADER === */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/5">
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
                {navigation.header.logo?.text?.split('.')[0] || 'Quimera'}
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
              <button 
                onClick={onNavigateToLogin}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {navigation.header.cta?.loginText || t('landing.login')}
              </button>
              <button 
                onClick={onNavigateToRegister}
                className="px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
              >
                {navigation.header.cta?.registerText || t('landing.register')}
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
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateToLogin();
                  }}
                  className="w-full py-3 text-center text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors"
                >
                  {navigation.header.cta?.loginText || t('landing.login')}
                </button>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateToRegister();
                  }}
                  className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                >
                  {navigation.header.cta?.registerText || t('landing.register')}
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

      {/* === BLOG/ARTICLES SECTION === */}
      {featuredArticles.length > 0 && (
        <section id="blog" className="py-16 sm:py-20 md:py-24 bg-[#050505]">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2">
                {t('landing.blogTitle', 'Latest from the')} <span className="text-yellow-400">{t('landing.blogTitleHighlight', 'Blog')}</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-2">
                {t('landing.blogSubtitle', 'Insights, tutorials, and updates from the Quimera team')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArticles.slice(0, 3).map((article) => (
                <ArticleCard 
                  key={article.id} 
                  article={article} 
                  onClick={() => onNavigateToArticle?.(article.slug)}
                />
              ))}
            </div>

            {onNavigateToBlog && (
              <div className="text-center mt-10">
                <button
                  onClick={onNavigateToBlog}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all inline-flex items-center gap-2"
                >
                  {t('landing.viewAllArticles', 'View all articles')}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* === PRICING SECTION === */}
      <section id="pricing" className="py-16 sm:py-20 md:py-24 bg-[#0A0A0A]">
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
      <section className="py-16 sm:py-20 md:py-24 bg-[#050505]">
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
      <footer className="py-12 sm:py-16 border-t border-white/10 bg-[#0A0A0A]">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Footer Columns */}
          {navigation.footer.columns.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              {/* Logo Column */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-8 h-8" />
                  <span className="font-bold">Quimera<span className="text-yellow-400">.ai</span></span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {t('landing.footerTagline', 'Build amazing websites with AI')}
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
          )}

          {/* Newsletter */}
          {navigation.footer.showNewsletter && (
            <div className="border-t border-white/10 pt-8 mb-8">
              <div className="max-w-md mx-auto text-center md:text-left md:max-w-none md:flex md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <h4 className="font-semibold text-white mb-1">
                    {navigation.footer.newsletterTitle || 'Stay updated'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {navigation.footer.newsletterDescription || 'Get the latest news and updates'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-400/50"
                  />
                  <button className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/10 md:flex-row md:justify-between">
            <div className="text-xs sm:text-sm text-gray-500">
              {navigation.footer.bottomText || `© ${new Date().getFullYear()} Quimera.ai. All rights reserved.`}
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              <a href="/privacy" className="hover:text-white transition-colors">{t('landing.footerPrivacy')}</a>
              <a href="/terms" className="hover:text-white transition-colors">{t('landing.footerTerms')}</a>
              <a href="/contact" className="hover:text-white transition-colors">{t('landing.footerContact')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLandingPage;
