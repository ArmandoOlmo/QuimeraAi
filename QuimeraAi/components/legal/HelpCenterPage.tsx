/**
 * Help Center Page
 * Centro de ayuda completo con búsqueda, categorías, FAQs y contacto
 * Soporte bilingüe (ES/EN)
 * Usa los colores del tema de Quimera (Cadmium Yellow)
 * Conectado con el sistema de artículos de AppContent
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  BookOpen,
  Rocket,
  CreditCard,
  Globe,
  Palette,
  Bot,
  Users,
  ShoppingBag,
  Mail,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  Zap,
  Shield,
  Settings,
  FileText,
  Sparkles,
  Menu,
  X,
  Clock,
  Eye
} from 'lucide-react';
import LanguageSelector from '../ui/LanguageSelector';
import { useSafeAppContent } from '../../contexts/appContent';
import { AppNavItem, DEFAULT_APP_NAVIGATION, AppArticle } from '../../types/appContent';

// Brand Assets
const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

// Icon mapping for categories
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  BookOpen,
  Rocket,
  CreditCard,
  Globe,
  Palette,
  Bot,
  Users,
  ShoppingBag,
  Mail,
  Zap,
  Shield,
  Settings,
  FileText,
  Sparkles,
  HelpCircle
};

// Mapeo de categorías del Help Center a tags de artículos
const HELP_CATEGORY_TAGS: Record<string, string[]> = {
  'getting-started': ['getting-started', 'inicio', 'primeros-pasos', 'onboarding', 'start', 'comenzar'],
  'website-builder': ['editor', 'builder', 'diseño', 'design', 'components', 'website', 'sitio'],
  'ai-assistant': ['ai', 'chatbot', 'assistant', 'ia', 'bot', 'asistente', 'inteligencia'],
  'domains': ['domains', 'dominios', 'dns', 'custom-domain', 'dominio'],
  'billing': ['billing', 'facturación', 'subscription', 'payment', 'pricing', 'pago', 'suscripción', 'plan'],
  'ecommerce': ['ecommerce', 'tienda', 'store', 'products', 'checkout', 'productos', 'ventas'],
  'leads-crm': ['leads', 'crm', 'contacts', 'forms', 'contactos', 'formularios'],
  'integrations': ['integrations', 'meta', 'whatsapp', 'facebook', 'api', 'integraciones', 'conectar'],
};

interface HelpCategory {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

interface FaqItem {
  id: string;
  questionKey: string;
  answerKey: string;
}

const HelpCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Unlock overflow so this standalone public page can scroll
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) { root.style.overflow = 'visible'; root.style.height = 'auto'; }
    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
      if (root) { root.style.overflow = ''; root.style.height = ''; }
    };
  }, []);

  // Get dynamic content from AppContent context
  const appContent = useSafeAppContent();
  const navigation = appContent?.navigation || DEFAULT_APP_NAVIGATION;

  // Obtener artículos de ayuda (categoría 'help', 'guide', o 'tutorial')
  const helpArticles = useMemo(() => {
    if (!appContent?.articles) return [];
    return appContent.articles.filter(
      article => article.status === 'published' &&
        ['help', 'guide', 'tutorial'].includes(article.category)
    );
  }, [appContent?.articles]);

  // Función para contar artículos por categoría
  const getArticleCountForCategory = (categoryId: string): number => {
    const tags = HELP_CATEGORY_TAGS[categoryId] || [];
    if (tags.length === 0) return 0;
    return helpArticles.filter(article =>
      article.tags?.some(tag => tags.includes(tag.toLowerCase()))
    ).length;
  };

  // Filtrar artículos por categoría seleccionada (basado en tags)
  const filteredByCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const tags = HELP_CATEGORY_TAGS[selectedCategory] || [];
    return helpArticles.filter(article =>
      article.tags?.some(tag => tags.includes(tag.toLowerCase()))
    );
  }, [helpArticles, selectedCategory]);

  // Artículos populares (los más vistos o featured)
  const popularArticles = useMemo(() => {
    if (helpArticles.length === 0) return [];
    return helpArticles
      .filter(a => a.featured || (a.views && a.views > 0))
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 6);
  }, [helpArticles]);

  // SPA navigation helper
  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Handle navigation item click
  const handleNavItemClick = (item: AppNavItem) => {
    setIsMobileMenuOpen(false);
    if (item.type === 'anchor') {
      // Go to landing page and scroll to section
      navigateTo('/');
    } else if (item.href === '/blog') {
      navigateTo('/blog');
    } else if (item.href.startsWith('/')) {
      navigateTo(item.href);
    } else if (item.href.startsWith('http')) {
      window.open(item.href, item.target || '_blank');
    }
  };

  const handleNavigateToLogin = () => navigateTo('/login');
  const handleNavigateToRegister = () => navigateTo('/register');

  // Navegar a artículo
  const handleArticleClick = (article: AppArticle) => {
    window.location.href = `/blog/${article.slug}`;
  };

  // Seleccionar/deseleccionar categoría
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  // Categories data
  const categories: HelpCategory[] = [
    {
      id: 'getting-started',
      icon: 'Rocket',
      titleKey: 'helpCenter.categories.gettingStarted.title',
      descriptionKey: 'helpCenter.categories.gettingStarted.description',
    },
    {
      id: 'website-builder',
      icon: 'Palette',
      titleKey: 'helpCenter.categories.websiteBuilder.title',
      descriptionKey: 'helpCenter.categories.websiteBuilder.description',
    },
    {
      id: 'ai-assistant',
      icon: 'Bot',
      titleKey: 'helpCenter.categories.aiAssistant.title',
      descriptionKey: 'helpCenter.categories.aiAssistant.description',
    },
    {
      id: 'domains',
      icon: 'Globe',
      titleKey: 'helpCenter.categories.domains.title',
      descriptionKey: 'helpCenter.categories.domains.description',
    },
    {
      id: 'billing',
      icon: 'CreditCard',
      titleKey: 'helpCenter.categories.billing.title',
      descriptionKey: 'helpCenter.categories.billing.description',
    },
    {
      id: 'ecommerce',
      icon: 'ShoppingBag',
      titleKey: 'helpCenter.categories.ecommerce.title',
      descriptionKey: 'helpCenter.categories.ecommerce.description',
    },
    {
      id: 'leads-crm',
      icon: 'Users',
      titleKey: 'helpCenter.categories.leadsCrm.title',
      descriptionKey: 'helpCenter.categories.leadsCrm.description',
    },
    {
      id: 'integrations',
      icon: 'Zap',
      titleKey: 'helpCenter.categories.integrations.title',
      descriptionKey: 'helpCenter.categories.integrations.description',
    }
  ];

  // FAQs
  const faqs: FaqItem[] = [
    { id: '1', questionKey: 'helpCenter.faqs.whatIsQuimera.question', answerKey: 'helpCenter.faqs.whatIsQuimera.answer' },
    { id: '2', questionKey: 'helpCenter.faqs.howToStart.question', answerKey: 'helpCenter.faqs.howToStart.answer' },
    { id: '3', questionKey: 'helpCenter.faqs.pricing.question', answerKey: 'helpCenter.faqs.pricing.answer' },
    { id: '4', questionKey: 'helpCenter.faqs.customDomain.question', answerKey: 'helpCenter.faqs.customDomain.answer' },
    { id: '5', questionKey: 'helpCenter.faqs.aiCredits.question', answerKey: 'helpCenter.faqs.aiCredits.answer' },
    { id: '6', questionKey: 'helpCenter.faqs.cancelSubscription.question', answerKey: 'helpCenter.faqs.cancelSubscription.answer' },
    { id: '7', questionKey: 'helpCenter.faqs.dataPrivacy.question', answerKey: 'helpCenter.faqs.dataPrivacy.answer' },
    { id: '8', questionKey: 'helpCenter.faqs.multipleWebsites.question', answerKey: 'helpCenter.faqs.multipleWebsites.answer' }
  ];

  // Filtrar categorías basadas en búsqueda
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter(cat =>
      t(cat.titleKey).toLowerCase().includes(query) ||
      t(cat.descriptionKey).toLowerCase().includes(query)
    );
  }, [searchQuery, categories, t]);

  // Filtrar artículos populares basados en búsqueda
  const filteredPopularArticles = useMemo(() => {
    if (!searchQuery.trim()) return popularArticles;
    const query = searchQuery.toLowerCase();
    return helpArticles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.excerpt?.toLowerCase().includes(query) ||
      article.tags?.some(tag => tag.toLowerCase().includes(query))
    ).slice(0, 6);
  }, [searchQuery, popularArticles, helpArticles]);

  // Filtrar FAQs basadas en búsqueda
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(faq =>
      t(faq.questionKey).toLowerCase().includes(query) ||
      t(faq.answerKey).toLowerCase().includes(query)
    );
  }, [searchQuery, faqs, t]);

  // Componente para renderizar un artículo
  const ArticleCard: React.FC<{ article: AppArticle }> = ({ article }) => (
    <button
      onClick={() => handleArticleClick(article)}
      className="group flex items-start gap-4 p-5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-yellow-400/20 rounded-xl transition-all text-left w-full"
    >
      {article.featuredImage ? (
        <img
          src={article.featuredImage}
          alt={article.title}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="p-3 bg-yellow-400/10 rounded-lg flex-shrink-0">
          <BookOpen className="text-yellow-400" size={24} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium group-hover:text-yellow-400 transition-colors mb-1 line-clamp-2">
          {article.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{article.excerpt}</p>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {article.readTime && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {article.readTime} min
            </span>
          )}
          {article.views !== undefined && article.views > 0 && (
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {article.views}
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="text-gray-600 group-hover:text-yellow-400 transition-colors flex-shrink-0" size={16} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Gradient Background - Quimera Yellow Theme */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-[128px]" />
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-yellow-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-amber-500/5 rounded-full blur-[90px]" />
      </div>

      {/* === HEADER (Same as Landing Page) === */}
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
                onClick={handleNavigateToLogin}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {navigation.header.cta?.loginText || t('landing.login')}
              </button>
              <button
                onClick={handleNavigateToRegister}
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
                    handleNavigateToLogin();
                  }}
                  className="w-full py-3 text-center text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors"
                >
                  {navigation.header.cta?.loginText || t('landing.login')}
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleNavigateToRegister();
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

      {/* Hero Section - with padding for fixed header */}
      <section className="relative pt-28 sm:pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full mb-6">
            <Sparkles className="text-yellow-400" size={16} />
            <span className="text-yellow-300 text-sm font-medium">{t('helpCenter.hero.badge')}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            {t('helpCenter.hero.title')}
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            {t('helpCenter.hero.subtitle')}
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-2xl blur-xl" />
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <Search className="ml-5 text-gray-400" size={22} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('helpCenter.hero.searchPlaceholder')}
                className="flex-1 px-4 py-5 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-4 text-gray-400 hover:text-white transition-colors text-xl"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {['helpCenter.quickLinks.gettingStarted', 'helpCenter.quickLinks.billing', 'helpCenter.quickLinks.domains'].map((key, i) => (
              <button
                key={i}
                onClick={() => setSearchQuery(t(key))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/30 rounded-full text-sm text-gray-300 hover:text-white transition-all"
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="relative px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">{t('helpCenter.sections.categories')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCategories.map((category) => {
              const IconComponent = ICON_MAP[category.icon] || BookOpen;
              const articleCount = getArticleCountForCategory(category.id);
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`group relative p-6 text-left bg-white/5 hover:bg-white/10 border rounded-2xl transition-all duration-300 ${isSelected
                      ? 'border-yellow-400/50 bg-yellow-400/10'
                      : 'border-white/5 hover:border-yellow-400/30'
                    }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent rounded-2xl transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`} />
                  <div className="relative">
                    <div className={`w-12 h-12 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 rounded-xl flex items-center justify-center mb-4 transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'
                      }`}>
                      <IconComponent className="text-yellow-400" size={24} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 transition-colors ${isSelected ? 'text-yellow-400' : 'text-white group-hover:text-yellow-400'
                      }`}>
                      {t(category.titleKey)}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">
                      {t(category.descriptionKey)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FileText size={14} />
                      <span>{articleCount} {t('helpCenter.articles.label')}</span>
                    </div>
                  </div>
                  <ChevronRight className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${isSelected
                      ? 'text-yellow-400 translate-x-1'
                      : 'text-gray-600 group-hover:text-yellow-400 group-hover:translate-x-1'
                    }`} size={20} />
                </button>
              );
            })}
          </div>

          {/* Artículos de la categoría seleccionada */}
          {selectedCategory && (
            <div className="mt-8 animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                  {(() => {
                    const cat = categories.find(c => c.id === selectedCategory);
                    const IconComponent = cat ? ICON_MAP[cat.icon] || BookOpen : BookOpen;
                    return (
                      <>
                        <IconComponent className="text-yellow-400" size={24} />
                        {t(cat?.titleKey || '')}
                      </>
                    );
                  })()}
                </h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {t('common.clear')} <X size={14} />
                </button>
              </div>

              {filteredByCategory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredByCategory.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
                  <BookOpen className="mx-auto text-gray-600 mb-4" size={48} />
                  <p className="text-gray-400 mb-2">{t('helpCenter.noArticlesInCategory')}</p>
                  <p className="text-sm text-gray-600">{t('helpCenter.noArticlesInCategoryHint')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Popular Articles */}
      {(filteredPopularArticles.length > 0 || helpArticles.length === 0) && !selectedCategory && (
        <section className="relative px-6 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="text-yellow-400" size={24} />
              <h2 className="text-2xl font-bold text-white">{t('helpCenter.sections.popularArticles')}</h2>
            </div>

            {filteredPopularArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPopularArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
                <FileText className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400">{t('helpCenter.noArticlesYet')}</p>
                <p className="text-sm text-gray-600 mt-2">{t('helpCenter.noArticlesYetHint')}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="relative px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <HelpCircle className="text-yellow-400" size={24} />
            <h2 className="text-2xl font-bold text-white">{t('helpCenter.sections.faqs')}</h2>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <div
                key={faq.id}
                className={`bg-white/5 border rounded-xl overflow-hidden transition-all duration-300 ${openFaqIndex === index
                    ? 'border-yellow-400/30 shadow-lg shadow-yellow-400/5'
                    : 'border-white/5 hover:border-white/10'
                  }`}
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <h3 className={`font-medium transition-colors ${openFaqIndex === index ? 'text-yellow-400' : 'text-white'
                    }`}>
                    {t(faq.questionKey)}
                  </h3>
                  <ChevronDown
                    className={`text-gray-400 transition-transform duration-300 ${openFaqIndex === index ? 'rotate-180 text-yellow-400' : ''
                      }`}
                    size={20}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${openFaqIndex === index
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                    }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                      {t(faq.answerKey)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support Section */}
      <section className="relative px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 md:p-12 bg-gradient-to-br from-yellow-400/10 to-amber-500/5 border border-yellow-400/20 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-2xl mb-6 shadow-lg shadow-yellow-400/30">
                <MessageCircle className="text-black" size={32} />
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {t('helpCenter.contact.title')}
              </h2>
              <p className="text-gray-300 mb-8 max-w-lg mx-auto">
                {t('helpCenter.contact.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="mailto:support@quimera.ai"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                >
                  <Mail size={20} />
                  {t('helpCenter.contact.emailUs')}
                </a>
                <a
                  href="#chat"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 text-white font-semibold rounded-xl border border-white/10 hover:bg-white/10 hover:border-yellow-400/30 transition-colors"
                >
                  <MessageCircle size={20} />
                  {t('helpCenter.contact.liveChat')}
                </a>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                {t('helpCenter.contact.responseTime')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Quimera AI. {t('helpCenter.footer.rights')}
            </p>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="text-sm text-gray-400 hover:text-white transition-colors">
                {t('helpCenter.footer.privacy')}
              </a>
              <a href="/terms-of-service" className="text-sm text-gray-400 hover:text-white transition-colors">
                {t('helpCenter.footer.terms')}
              </a>
              <a href="/cookie-policy" className="text-sm text-gray-400 hover:text-white transition-colors">
                {t('helpCenter.footer.cookies')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HelpCenterPage;
