/**
 * PublicLandingPage
 * Landing page pública de Quimera.ai
 * Ahora con contenido dinámico gestionado desde el panel de Super Admin
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  MessageCircle,
  Quote,
  ChevronDown as ChevronDownIcon,
  User
} from 'lucide-react';
import LanguageSelector from './ui/LanguageSelector';
import { useSafeAppContent } from '../contexts/appContent';
import { AppArticle, AppNavItem, DEFAULT_APP_NAVIGATION } from '../types/appContent';
import { useLandingPlans } from '../hooks/useLandingPlans';
import { doc, getDoc } from '../firebase';
import { db } from '../firebase';

// --- Brand Assets ---
const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

// Types for preview sections
interface PreviewSection {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  data: Record<string, any>;
}

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

  // Preview mode - listens for postMessage from Landing Page Editor
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSections, setPreviewSections] = useState<PreviewSection[]>([]);

  // Listen for preview updates from the Landing Page Editor
  useEffect(() => {
    // Check if we're in preview mode (loaded in iframe with ?preview=landing)
    const urlParams = new URLSearchParams(window.location.search);
    const previewParam = urlParams.get('preview');
    const isInPreviewMode = previewParam === 'landing';
    setIsPreviewMode(isInPreviewMode);

    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from same origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'LANDING_EDITOR_UPDATE') {
        console.log('[Preview] Received sections update:', event.data.sections?.length || 0);
        setPreviewSections(event.data.sections || []);
      }

      // Handle scroll to section request from editor
      if (event.data?.type === 'SCROLL_TO_SECTION') {
        const sectionType = event.data.sectionType;
        const sectionElement = document.getElementById(`section-${sectionType}`);
        if (sectionElement) {
          sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify parent that preview is ready to receive updates
    if (isInPreviewMode && window.parent !== window) {
      console.log('[Preview] Sending PREVIEW_READY message');
      window.parent.postMessage({ type: 'PREVIEW_READY' }, window.location.origin);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load saved landing page configuration from Firestore (production mode only)
  useEffect(() => {
    const loadSavedConfiguration = async () => {
      // Skip if in preview mode - preview mode uses postMessage from editor
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('preview') === 'landing') return;

      try {
        const settingsRef = doc(db, 'globalSettings', 'landingPage');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.sections && Array.isArray(data.sections)) {
            console.log('[PublicLandingPage] Loaded saved configuration from Firestore:', data.sections.length, 'sections');
            setPreviewSections(data.sections);
          }
        }
      } catch (error) {
        console.error('[PublicLandingPage] Error loading saved configuration:', error);
      }
    };

    loadSavedConfiguration();
  }, []);

  // Get dynamic content from AppContent context
  const appContent = useSafeAppContent();

  // Get dynamic pricing plans from Firestore (connected to Super Admin)
  // Only shows plans that have showInLanding = true in Super Admin
  const { plans: dynamicPlans, isLoading: isLoadingPlans } = useLandingPlans();

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

  // Helper to check if a section is visible (works in both preview AND production mode)
  const isSectionVisible = useMemo(() => (sectionType: string) => {
    // If no sections loaded yet, show all sections (default state)
    if (previewSections.length === 0) return true;
    const section = previewSections.find(s =>
      s.type === sectionType ||
      s.type.startsWith(sectionType) ||
      s.id === sectionType
    );
    // Return enabled status (default to true if section not found)
    return section?.enabled !== false;
  }, [previewSections]);

  // Helper to get preview/saved data for a specific section type (works in both preview AND production mode)
  const getPreviewData = useMemo(() => (sectionType: string) => {
    // If no sections loaded, return null (use defaults)
    if (previewSections.length === 0) return null;
    const section = previewSections.find(s =>
      s.type === sectionType ||
      s.type.startsWith(sectionType) ||
      s.id === sectionType
    );
    return section?.enabled !== false ? section?.data || null : null;
  }, [previewSections]);

  // Get preview overrides for Hero section
  const heroPreview = getPreviewData('hero');

  // Get preview overrides for Features section
  const featuresPreview = getPreviewData('features');

  // Get preview overrides for Pricing section
  const pricingPreview = getPreviewData('pricing');

  // Get preview overrides for CTA section
  const ctaPreview = getPreviewData('cta');

  // Get preview overrides for Footer section
  const footerPreview = getPreviewData('footer');

  // Get preview overrides for Header section
  const headerPreview = getPreviewData('header');

  // Get preview overrides for Testimonials section
  const testimonialsPreview = getPreviewData('testimonials');

  // Get preview overrides for FAQ section
  const faqPreview = getPreviewData('faq');

  // Get preview overrides for Typography (global fonts)
  const typographyPreview = getPreviewData('typography');

  // Helper to convert kebab-case font names to CSS font-family format
  const formatFontName = (font: string): string => {
    // Convert 'open-sans' to 'Open Sans', 'playfair-display' to 'Playfair Display', etc.
    return font.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Global typography values (with fallback formatting)
  const globalHeadingFont = formatFontName(typographyPreview?.headingFont || 'poppins');
  const globalBodyFont = formatFontName(typographyPreview?.bodyFont || 'mulish');
  const globalButtonFont = formatFontName(typographyPreview?.buttonFont || 'poppins');
  const headingsCaps = typographyPreview?.headingsCaps || false;
  const buttonsCaps = typographyPreview?.buttonsCaps || false;
  const navLinksCaps = typographyPreview?.navLinksCaps || false;

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [openFaqIndices, setOpenFaqIndices] = useState<Set<number>>(new Set());

  // Toggle FAQ item (single or multiple open)
  const toggleFaq = (index: number, allowMultiple: boolean) => {
    if (allowMultiple) {
      setOpenFaqIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
    } else {
      setOpenFaqIndex(prev => prev === index ? null : index);
    }
  };

  // Compute ordered section types based on previewSections order
  // This enables dynamic reordering in the preview
  const orderedSectionTypes = useMemo(() => {
    // Default order when not in preview mode
    const defaultOrder = ['hero', 'features', 'testimonials', 'pricing', 'faq', 'cta'];

    // Default order if no sections loaded
    if (previewSections.length === 0) {
      return defaultOrder;
    }

    // Sort sections by their order property, excluding header and footer
    const sortedSections = [...previewSections]
      .filter(s => s.type !== 'header' && s.type !== 'footer')
      .sort((a, b) => a.order - b.order);

    return sortedSections.map(s => s.type);
  }, [isPreviewMode, previewSections]);

  // Pricing plans are now loaded dynamically from Firestore via useLandingPlans hook
  // This connects the Super Admin plan management with the public landing page

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

  // Render a section by type - enables dynamic ordering
  const renderSection = (sectionType: string): React.ReactNode => {
    // Check visibility first
    if (!isSectionVisible(sectionType)) return null;

    switch (sectionType) {
      case 'hero':
        // Get style values from preview data with defaults
        const heroBackgroundColor = heroPreview?.backgroundColor || '#0A0A0A';
        const heroTextColor = heroPreview?.textColor || '#ffffff';
        const heroPadding = heroPreview?.padding || 80;
        const heroShowGradient = heroPreview?.showGradient ?? false;
        const heroLayout = heroPreview?.layout || 'centered';

        // Debug logging
        console.log('[Preview] Rendering Hero with:', {
          isPreviewMode,
          previewSectionsLength: previewSections.length,
          heroPreview,
          heroBackgroundColor,
          heroTextColor
        });

        // Determine layout alignment classes
        const heroAlignmentClasses = heroLayout === 'left'
          ? 'items-start text-left'
          : heroLayout === 'right'
            ? 'items-end text-right'
            : 'items-center text-center';

        return (
          <section
            key="hero"
            id="section-hero"
            className={`min-h-screen flex flex-col justify-center pt-16 sm:pt-20 px-4 sm:px-6 relative overflow-hidden ${heroAlignmentClasses}`}
            style={{
              backgroundColor: heroBackgroundColor,
              color: heroTextColor,
              paddingTop: `${heroPadding}px`,
              paddingBottom: `${heroPadding}px`,
            }}
          >
            {/* Optional gradient overlay */}
            {heroShowGradient && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${heroBackgroundColor}00 0%, ${heroBackgroundColor}80 50%, ${heroBackgroundColor} 100%)`,
                }}
              />
            )}

            <div className={`max-w-4xl ${heroLayout === 'centered' ? 'mx-auto' : heroLayout === 'left' ? 'mr-auto' : 'ml-auto'} relative z-10`}>
              {/* Logo Grande */}
              <div className={`w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48 mb-6 sm:mb-8 ${heroLayout === 'centered' ? 'mx-auto' : ''}`}>
                <img
                  src={heroPreview?.heroImage || QUIMERA_LOGO}
                  alt="Quimera AI"
                  className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] sm:drop-shadow-[0_0_50px_rgba(250,204,21,0.6)]"
                />
              </div>

              {/* Título Principal */}
              <h1
                className="text-3xl sm:text-5xl md:text-7xl font-black leading-tight mb-4 sm:mb-6 px-2"
                style={{
                  color: heroTextColor,
                  fontFamily: `var(--font-heading)`,
                  textTransform: headingsCaps ? 'uppercase' : 'none',
                }}
              >
                {heroPreview?.title || t('landing.heroTitle1')}
                <span className="block text-yellow-400">
                  {heroPreview?.subtitle ? '' : t('landing.heroTitle2')}
                </span>
              </h1>

              {/* Subtítulo */}
              <p
                className="text-base sm:text-lg md:text-xl max-w-2xl mb-8 sm:mb-10 leading-relaxed px-2"
                style={{ color: `${heroTextColor}99` }}
              >
                {heroPreview?.subtitle || t('landing.heroSubtitle')}
              </p>

              {/* CTA Buttons */}
              <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 px-4 sm:px-0 ${heroLayout === 'centered' ? 'justify-center' : heroLayout === 'left' ? 'justify-start' : 'justify-end'}`}>
                <button
                  onClick={onNavigateToRegister}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={{
                    fontFamily: `var(--font-button)`,
                    textTransform: buttonsCaps ? 'uppercase' : 'none',
                  }}
                >
                  {heroPreview?.primaryButtonText || t('landing.startFree')}
                  <ArrowRight className="w-5 h-5" />
                </button>
                {(heroPreview?.showSecondaryButton !== false) && (
                  <button
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-white/10 font-semibold rounded-xl hover:bg-white/10 active:scale-[0.98] transition-all"
                    style={{
                      color: heroTextColor,
                      fontFamily: `var(--font-button)`,
                      textTransform: buttonsCaps ? 'uppercase' : 'none',
                    }}
                  >
                    {heroPreview?.secondaryButtonText || t('landing.viewFeatures')}
                  </button>
                )}
              </div>
            </div>
          </section>
        );

      case 'features':
        // Get Features section style values from preview data
        const featuresBackgroundColor = featuresPreview?.backgroundColor || '#0A0A0A';
        const featuresTextColor = featuresPreview?.textColor || '#ffffff';
        const featuresAccentColor = featuresPreview?.accentColor || '#facc15'; // yellow-400
        const featuresPadding = featuresPreview?.padding || 80;

        return (
          <section
            key="features"
            id="section-features"
            className="py-16 sm:py-20 md:py-24"
            style={{
              backgroundColor: featuresBackgroundColor,
              color: featuresTextColor,
              paddingTop: `${featuresPadding}px`,
              paddingBottom: `${featuresPadding}px`,
            }}
          >
            <div className="container mx-auto px-4 sm:px-6">
              <div className="text-center mb-10 sm:mb-16">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2" style={{ color: featuresTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                  {featuresPreview?.title || t('landing.featuresTitle')}
                  <span style={{ color: featuresAccentColor }}> {featuresPreview?.title ? '' : t('landing.featuresTitleHighlight')}</span>
                </h2>
                <p className="text-sm sm:text-base max-w-2xl mx-auto px-2" style={{ color: `${featuresTextColor}99` }}>
                  {featuresPreview?.subtitle || t('landing.featuresSubtitle')}
                </p>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${featuresPreview?.columns || 3} gap-4 sm:gap-6`}>
                {(featuresPreview?.features || features).map((feature: any, index: number) => (
                  <div
                    key={index}
                    className="p-5 sm:p-8 rounded-xl sm:rounded-2xl hover:scale-[1.02] active:scale-[0.99] transition-all"
                    style={{
                      backgroundColor: `${featuresTextColor}08`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: `${featuresTextColor}15`,
                    }}
                  >
                    {(featuresPreview?.showIcons !== false) && (
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6"
                        style={{ backgroundColor: `${featuresAccentColor}15`, color: featuresAccentColor }}
                      >
                        {feature.icon || <Zap className="w-6 h-6" />}
                      </div>
                    )}
                    <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3" style={{ color: featuresTextColor }}>
                      {feature.title || (feature.titleKey ? t(feature.titleKey) : '')}
                    </h3>
                    <p className="text-sm sm:text-base leading-relaxed" style={{ color: `${featuresTextColor}99` }}>
                      {feature.description || (feature.descKey ? t(feature.descKey) : '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'pricing':
        // Get Pricing section style values from preview data
        const pricingBackgroundColor = pricingPreview?.backgroundColor || '#0A0A0A';
        const pricingTextColor = pricingPreview?.textColor || '#ffffff';
        const pricingAccentColor = pricingPreview?.accentColor || '#facc15'; // yellow-400
        const pricingPadding = pricingPreview?.padding || 80;
        // Determine if we should show the popular highlight
        const shouldHighlightPopular = pricingPreview?.highlightPopular !== false;
        const showBillingToggle = pricingPreview?.showBillingToggle !== false;

        return (
          <section
            key="pricing"
            id="section-pricing"
            className="py-16 sm:py-20 md:py-24"
            style={{
              backgroundColor: pricingBackgroundColor,
              color: pricingTextColor,
              paddingTop: `${pricingPadding}px`,
              paddingBottom: `${pricingPadding}px`,
            }}
          >
            <div className="container mx-auto px-4 sm:px-6">
              <div className="text-center mb-10 sm:mb-16">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2" style={{ color: pricingTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                  {pricingPreview?.title || t('landing.pricingTitle')} <span style={{ color: pricingAccentColor }}>{pricingPreview?.title ? '' : t('landing.pricingTitleHighlight')}</span>
                </h2>
                <p className="text-sm sm:text-base max-w-2xl mx-auto px-2" style={{ color: `${pricingTextColor}99` }}>
                  {pricingPreview?.subtitle || t('landing.pricingSubtitle')}
                </p>

                {/* Billing Toggle - Monthly/Annual */}
                {showBillingToggle && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <span className="text-sm" style={{ color: `${pricingTextColor}99` }}>{t('landing.monthly', 'Mensual')}</span>
                    <button
                      className="relative w-12 h-6 rounded-full transition-colors"
                      style={{ backgroundColor: `${pricingAccentColor}33` }}
                      aria-label={t('landing.toggleBilling', 'Cambiar facturación')}
                    >
                      <span className="absolute left-1 top-1 w-4 h-4 rounded-full transition-transform" style={{ backgroundColor: pricingAccentColor }} />
                    </button>
                    <span className="text-sm" style={{ color: `${pricingTextColor}99` }}>
                      {t('landing.annual', 'Anual')}
                      <span className="ml-2 px-2 py-0.5 text-xs font-bold text-green-400 bg-green-400/10 rounded-full">
                        {t('landing.savePercent', '-20%')}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {isLoadingPlans ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: pricingAccentColor }} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
                  {dynamicPlans.map((plan, index) => {
                    const isPlanPopular = (plan.featured || plan.isPopular) && shouldHighlightPopular;
                    return (
                      <div
                        key={plan.id}
                        className={`relative p-5 sm:p-8 rounded-xl sm:rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.99] ${isPlanPopular
                          ? 'order-first md:order-none md:scale-105 shadow-xl'
                          : ''
                          }`}
                        style={{
                          animationDelay: `${index * 100}ms`,
                          backgroundColor: isPlanPopular ? `${pricingAccentColor}15` : `${pricingTextColor}08`,
                          borderWidth: isPlanPopular ? '2px' : '1px',
                          borderStyle: 'solid',
                          borderColor: isPlanPopular ? `${pricingAccentColor}50` : `${pricingTextColor}15`,
                          boxShadow: isPlanPopular ? `0 20px 50px ${pricingAccentColor}20` : 'none',
                        }}
                      >
                        {isPlanPopular && (
                          <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
                            <div
                              className="animate-pulse flex items-center gap-1.5 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-full whitespace-nowrap"
                              style={{
                                background: `linear-gradient(90deg, ${pricingAccentColor}, ${pricingAccentColor}dd)`,
                                color: pricingBackgroundColor,
                                boxShadow: `0 4px 20px ${pricingAccentColor}40`,
                              }}
                            >
                              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                              {t('landing.mostPopular')}
                            </div>
                          </div>
                        )}
                        <h3 className="text-xl sm:text-2xl font-bold mb-2 mt-2 sm:mt-0" style={{ color: pricingTextColor }}>{plan.name}</h3>
                        <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: `${pricingTextColor}99` }}>{plan.description}</p>
                        <div className="mb-4 sm:mb-6">
                          <span className="text-3xl sm:text-4xl font-black" style={{ color: pricingTextColor }}>{plan.price}</span>
                          <span className="text-sm sm:text-base" style={{ color: `${pricingTextColor}66` }}>{plan.period}</span>
                          {plan.priceValue > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-bold text-green-400 bg-green-400/10 rounded-full">
                              {t('landing.saveAnnually', 'Ahorra 20%')}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base" style={{ color: `${pricingTextColor}cc` }}>
                              <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" style={{ color: pricingAccentColor }} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={onNavigateToRegister}
                          className="w-full py-2.5 sm:py-3 rounded-xl font-semibold transition-all active:scale-[0.98]"
                          style={{
                            background: isPlanPopular ? `linear-gradient(90deg, ${pricingAccentColor}, ${pricingAccentColor}dd)` : `${pricingTextColor}15`,
                            color: isPlanPopular ? pricingBackgroundColor : pricingTextColor,
                            boxShadow: isPlanPopular ? `0 8px 25px ${pricingAccentColor}30` : 'none',
                          }}
                        >
                          {plan.priceValue === 0 ? t('landing.startFree', 'Empieza Gratis') : t('landing.getStarted')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );

      case 'testimonials': {
        // Get Testimonials section style values from preview data
        const testimonialsBackgroundColor = testimonialsPreview?.backgroundColor || '#050505';
        const testimonialsTextColor = testimonialsPreview?.textColor || '#ffffff';
        const testimonialsAccentColor = testimonialsPreview?.accentColor || '#facc15';
        const testimonialsPadding = testimonialsPreview?.padding || 80;
        const testimonialsLayout = testimonialsPreview?.layout || 'grid';
        const testimonials = testimonialsPreview?.testimonials || [];

        // Default testimonials if none provided
        const defaultTestimonials = [
          {
            name: 'María García',
            role: 'CEO, TechStart',
            text: 'Quimera transformó completamente nuestra presencia online. En solo minutos teníamos un sitio web profesional.',
            avatar: ''
          },
          {
            name: 'Carlos López',
            role: 'Fundador, DesignHub',
            text: 'La inteligencia artificial de Quimera es increíble. Entendió exactamente lo que necesitábamos.',
            avatar: ''
          },
          {
            name: 'Ana Martínez',
            role: 'Marketing Director, GrowthCo',
            text: 'Nunca había sido tan fácil crear y mantener nuestro sitio web. Lo recomiendo totalmente.',
            avatar: ''
          }
        ];

        const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;

        return (
          <section
            key="testimonials"
            id="section-testimonials"
            className="py-16 sm:py-20 md:py-24"
            style={{
              backgroundColor: testimonialsBackgroundColor,
              color: testimonialsTextColor,
              paddingTop: `${testimonialsPadding}px`,
              paddingBottom: `${testimonialsPadding}px`,
            }}
          >
            <div className="container mx-auto px-4 sm:px-6">
              <div className="text-center mb-10 sm:mb-16">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2" style={{ color: testimonialsTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                  {testimonialsPreview?.title || t('landing.testimonialsTitle', 'Lo que dicen nuestros')}
                  <span style={{ color: testimonialsAccentColor }}> {t('landing.testimonialsTitleHighlight', 'clientes')}</span>
                </h2>
                <p className="text-sm sm:text-base max-w-2xl mx-auto px-2" style={{ color: `${testimonialsTextColor}99` }}>
                  {testimonialsPreview?.subtitle || t('landing.testimonialsSubtitle', 'Miles de empresas confían en Quimera para su presencia digital')}
                </p>
              </div>

              <div className={`grid gap-6 ${testimonialsLayout === 'masonry' ? 'columns-1 md:columns-2 lg:columns-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {displayTestimonials.map((testimonial: any, index: number) => (
                  <div
                    key={index}
                    className="p-6 rounded-2xl hover:scale-[1.02] transition-all break-inside-avoid"
                    style={{
                      backgroundColor: `${testimonialsTextColor}08`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: `${testimonialsTextColor}15`,
                    }}
                  >
                    {/* Quote icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${testimonialsAccentColor}15`, color: testimonialsAccentColor }}
                    >
                      <Quote className="w-5 h-5" />
                    </div>

                    {/* Testimonial text */}
                    <p
                      className="text-base sm:text-lg mb-6 leading-relaxed"
                      style={{ color: `${testimonialsTextColor}dd` }}
                    >
                      "{testimonial.text}"
                    </p>

                    {/* Author info */}
                    <div className="flex items-center gap-3">
                      {testimonial.avatar ? (
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${testimonialsAccentColor}20`, color: testimonialsAccentColor }}
                        >
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold" style={{ color: testimonialsTextColor }}>
                          {testimonial.name}
                        </p>
                        <p className="text-sm" style={{ color: `${testimonialsTextColor}66` }}>
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      case 'cta':
        // Get CTA section style values from preview data
        const ctaBackgroundColor = ctaPreview?.backgroundColor || '#050505';
        const ctaTextColor = ctaPreview?.textColor || '#ffffff';
        const ctaAccentColor = ctaPreview?.accentColor || '#facc15';
        const ctaPadding = ctaPreview?.padding || 80;

        return (
          <section
            key="cta"
            id="section-cta"
            className="py-16 sm:py-20 md:py-24"
            style={{
              backgroundColor: ctaBackgroundColor,
              color: ctaTextColor,
              paddingTop: `${ctaPadding}px`,
              paddingBottom: `${ctaPadding}px`,
            }}
          >
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-3xl mx-auto text-center">
                <h2
                  className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-2"
                  style={{
                    color: ctaTextColor,
                    fontFamily: `var(--font-heading)`,
                    textTransform: headingsCaps ? 'uppercase' : 'none',
                  }}
                >
                  {ctaPreview?.title || t('landing.ctaTitle')}
                </h2>
                <p
                  className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 px-2"
                  style={{ color: `${ctaTextColor}99` }}
                >
                  {ctaPreview?.subtitle || t('landing.ctaSubtitle')}
                </p>
                <button
                  onClick={onNavigateToRegister}
                  className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 font-bold text-base sm:text-lg rounded-xl hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 sm:gap-3 mx-4 sm:mx-0"
                  style={{
                    backgroundColor: ctaAccentColor,
                    color: ctaBackgroundColor,
                    fontFamily: `var(--font-button)`,
                    textTransform: buttonsCaps ? 'uppercase' : 'none',
                  }}
                >
                  {ctaPreview?.buttonText || t('landing.startFree')}
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <p className="mt-3 sm:mt-4 text-xs sm:text-sm" style={{ color: `${ctaTextColor}66` }}>
                  {t('landing.noCreditCard')}
                </p>
              </div>
            </div>
          </section>
        );

      case 'faq': {
        // Get FAQ section style values from preview data
        const faqBackgroundColor = faqPreview?.backgroundColor || '#0A0A0A';
        const faqTextColor = faqPreview?.textColor || '#ffffff';
        const faqAccentColor = faqPreview?.accentColor || '#facc15';
        const faqPadding = faqPreview?.padding || 80;
        const faqStyle = faqPreview?.style || 'accordion';
        const allowMultipleOpen = faqPreview?.allowMultipleOpen ?? false;
        const faqs = faqPreview?.faqs || [];

        // Default FAQs if none provided
        const defaultFaqs = [
          {
            question: '¿Qué es Quimera.ai?',
            answer: 'Quimera.ai es una plataforma de creación de sitios web potenciada por inteligencia artificial que te permite crear sitios web profesionales en minutos, sin necesidad de conocimientos técnicos.'
          },
          {
            question: '¿Necesito saber programar?',
            answer: 'No, no necesitas ningún conocimiento de programación. Nuestra IA se encarga de todo el trabajo técnico mientras tú te enfocas en el contenido y el diseño.'
          },
          {
            question: '¿Puedo usar mi propio dominio?',
            answer: 'Sí, puedes conectar tu propio dominio personalizado o usar un subdominio gratuito de Quimera.ai.'
          },
          {
            question: '¿Hay una prueba gratuita?',
            answer: 'Sí, ofrecemos un plan gratuito que te permite explorar todas las funcionalidades básicas. También puedes actualizar a planes premium para acceder a más características.'
          }
        ];

        const displayFaqs = faqs.length > 0 ? faqs : defaultFaqs;

        return (
          <section
            key="faq"
            id="section-faq"
            className="py-16 sm:py-20 md:py-24"
            style={{
              backgroundColor: faqBackgroundColor,
              color: faqTextColor,
              paddingTop: `${faqPadding}px`,
              paddingBottom: `${faqPadding}px`,
            }}
          >
            <div className="container mx-auto px-4 sm:px-6">
              <div className="text-center mb-10 sm:mb-16">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2" style={{ color: faqTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                  {faqPreview?.title || t('landing.faqTitle', 'Preguntas')}
                  <span style={{ color: faqAccentColor }}> {t('landing.faqTitleHighlight', 'Frecuentes')}</span>
                </h2>
                <p className="text-sm sm:text-base max-w-2xl mx-auto px-2" style={{ color: `${faqTextColor}99` }}>
                  {faqPreview?.subtitle || t('landing.faqSubtitle', 'Todo lo que necesitas saber sobre Quimera.ai')}
                </p>
              </div>

              <div className="max-w-3xl mx-auto space-y-4">
                {displayFaqs.map((faq: any, index: number) => {
                  const isOpen = allowMultipleOpen ? openFaqIndices.has(index) : openFaqIndex === index;

                  if (faqStyle === 'cards') {
                    return (
                      <div
                        key={index}
                        className="p-6 rounded-2xl"
                        style={{
                          backgroundColor: `${faqTextColor}08`,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: `${faqTextColor}15`,
                        }}
                      >
                        <h3 className="text-lg font-semibold mb-3" style={{ color: faqTextColor }}>
                          {faq.question}
                        </h3>
                        <p className="text-sm sm:text-base leading-relaxed" style={{ color: `${faqTextColor}99` }}>
                          {faq.answer}
                        </p>
                      </div>
                    );
                  }

                  if (faqStyle === 'list') {
                    return (
                      <div
                        key={index}
                        className="pb-4 mb-4"
                        style={{ borderBottom: `1px solid ${faqTextColor}15` }}
                      >
                        <h3 className="text-lg font-semibold mb-2" style={{ color: faqTextColor }}>
                          {faq.question}
                        </h3>
                        <p className="text-sm sm:text-base leading-relaxed" style={{ color: `${faqTextColor}99` }}>
                          {faq.answer}
                        </p>
                      </div>
                    );
                  }

                  // Default: accordion style
                  return (
                    <div
                      key={index}
                      className="rounded-xl overflow-hidden transition-all"
                      style={{
                        backgroundColor: isOpen ? `${faqAccentColor}10` : `${faqTextColor}08`,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: isOpen ? `${faqAccentColor}30` : `${faqTextColor}15`,
                      }}
                    >
                      <button
                        onClick={() => toggleFaq(index, allowMultipleOpen)}
                        className="w-full flex items-center justify-between p-5 text-left transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="text-base sm:text-lg font-semibold pr-4" style={{ color: faqTextColor }}>
                          {faq.question}
                        </span>
                        <ChevronDownIcon
                          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          style={{ color: faqAccentColor }}
                        />
                      </button>
                      {isOpen && (
                        <div
                          className="px-5 pb-5 pt-0 text-sm sm:text-base leading-relaxed animate-in slide-in-from-top-2 duration-200"
                          style={{ color: `${faqTextColor}99` }}
                        >
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  };

  // Get Header color values
  const headerBackgroundColor = headerPreview?.backgroundColor || '#0A0A0A';
  const headerTextColor = headerPreview?.textColor || '#ffffff';
  const headerAccentColor = headerPreview?.accentColor || '#facc15';

  // Get Footer color values
  const footerBackgroundColor = footerPreview?.backgroundColor || '#0A0A0A';
  const footerTextColor = footerPreview?.textColor || '#ffffff';
  const footerAccentColor = footerPreview?.accentColor || '#facc15';

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: headerBackgroundColor,
        color: headerTextColor,
        fontFamily: `'${globalBodyFont}', system-ui, sans-serif`,
        // CSS Custom properties for fonts
        ['--font-heading' as any]: `'${globalHeadingFont}', system-ui, sans-serif`,
        ['--font-body' as any]: `'${globalBodyFont}', system-ui, sans-serif`,
        ['--font-button' as any]: `'${globalButtonFont}', system-ui, sans-serif`,
        // CSS Custom properties for text transform (ALL CAPS)
        ['--heading-transform' as any]: headingsCaps ? 'uppercase' : 'none',
        ['--button-transform' as any]: buttonsCaps ? 'uppercase' : 'none',
        ['--nav-transform' as any]: navLinksCaps ? 'uppercase' : 'none',
      }}
    >
      {/* === HEADER === */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
        style={{
          backgroundColor: `${headerBackgroundColor}f2`,
          borderBottom: `1px solid ${headerTextColor}0d`,
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 sm:gap-3">
              <img
                src={headerPreview?.logoImage || navigation.header.logo?.imageUrl || QUIMERA_LOGO}
                alt={navigation.header.logo?.text || "Quimera.ai"}
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
              <span className="text-lg sm:text-xl font-bold text-white">
                {(headerPreview?.logoText || navigation.header.logo?.text || 'Quimera.ai').split('.')[0] || 'Quimera'}
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
                  style={{
                    textTransform: navLinksCaps ? 'uppercase' : 'none',
                  }}
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
              {(headerPreview?.showLoginButton ?? true) && (
                <button
                  onClick={onNavigateToLogin}
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                  style={{ textTransform: buttonsCaps ? 'uppercase' : 'none' }}
                >
                  {headerPreview?.loginButtonText || navigation.header.cta?.loginText || t('landing.login')}
                </button>
              )}
              {(headerPreview?.showRegisterButton ?? true) && (
                <button
                  onClick={onNavigateToRegister}
                  className="px-5 py-2.5 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                  style={{
                    fontFamily: `var(--font-button)`,
                    textTransform: buttonsCaps ? 'uppercase' : 'none',
                  }}
                >
                  {headerPreview?.registerButtonText || navigation.header.cta?.registerText || t('landing.register')}
                </button>
              )}
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

      {/* === DYNAMICALLY ORDERED SECTIONS === */}
      {orderedSectionTypes.map(sectionType => renderSection(sectionType))}

      {/* === FOOTER === */}
      <footer
        id="section-footer"
        className="py-12 sm:py-16"
        style={{
          backgroundColor: footerBackgroundColor,
          color: footerTextColor,
          borderTop: `1px solid ${footerTextColor}1a`,
        }}
      >
        <div className="container mx-auto px-4 sm:px-6">
          {/* Footer Columns */}
          {navigation.footer.columns.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              {/* Logo Column */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <img src={QUIMERA_LOGO} alt="Quimera.ai" className="w-8 h-8" />
                  <span className="font-bold" style={{ color: footerTextColor }}>
                    {footerPreview?.companyName || 'Quimera'}
                    <span style={{ color: footerAccentColor }}>.ai</span>
                  </span>
                </div>
                <p className="text-sm mb-4" style={{ color: `${footerTextColor}80` }}>
                  {footerPreview?.tagline || t('landing.footerTagline', 'Build amazing websites with AI')}
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
              {footerPreview?.copyright || navigation.footer.bottomText || `© ${new Date().getFullYear()} Quimera.ai. All rights reserved.`}
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              <a href="/changelog" className="hover:text-white transition-colors">{t('landing.footerChangelog', 'Changelog')}</a>
              <a href="/help-center" className="hover:text-white transition-colors">{t('landing.footerHelpCenter', 'Centro de Ayuda')}</a>
              <a href="/privacy-policy" className="hover:text-white transition-colors">{t('landing.footerPrivacy', 'Política de Privacidad')}</a>
              <a href="/terms-of-service" className="hover:text-white transition-colors">{t('landing.footerTerms', 'Términos de Servicio')}</a>
              <a href="/cookie-policy" className="hover:text-white transition-colors">{t('landing.footerCookies', 'Política de Cookies')}</a>
              <a href="/data-deletion" className="hover:text-white transition-colors">{t('landing.footerDataDeletion', 'Eliminación de Datos')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLandingPage;
