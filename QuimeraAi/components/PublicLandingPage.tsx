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
import ImageCarousel from './ImageCarousel';
import { useSafeAppContent } from '../contexts/appContent';
import { AppArticle, AppNavItem, DEFAULT_APP_NAVIGATION } from '../types/appContent';
import { useLandingPlans } from '../hooks/useLandingPlans';
import { doc, getDoc, collection, getDocs } from '../firebase';
import { db } from '../firebase';
import { savePlatformLead } from '../services/platformLeadService';

// --- Brand Assets ---
import { QUIMERA_DEFAULT_LOGO, QUIMERA_FULL_LOGO } from '../hooks/useAppLogo';

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
  const [isAnnualBilling, setIsAnnualBilling] = useState(false);

  // Preview mode - listens for postMessage from Landing Page Editor
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSections, setPreviewSections] = useState<PreviewSection[]>([]);

  // Override overflow:hidden from index.html to allow native page scrolling
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }

    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
      if (root) {
        root.style.overflow = '';
        root.style.height = '';
      }
    };
  }, []);

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
        const sectionId = event.data.sectionId;
        if (sectionId) {
          const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
          if (sectionElement) {
            sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
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
        // Primary: load from sub-collection (new format, no 1 MB limit)
        const sectionsColRef = collection(db, 'globalSettings', 'landingPage', 'sections');
        const sectionsSnap = await getDocs(sectionsColRef);

        if (!sectionsSnap.empty) {
          const loadedSections = sectionsSnap.docs
            .map(d => d.data() as typeof previewSections[0])
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          console.log('[PublicLandingPage] Loaded from sub-collection:', loadedSections.length, 'sections');
          setPreviewSections(loadedSections);
          return;
        }

        // Fallback: legacy single-document format
        const settingsRef = doc(db, 'globalSettings', 'landingPage');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.sections && Array.isArray(data.sections)) {
            console.log('[PublicLandingPage] Loaded from legacy doc:', data.sections.length, 'sections');
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

  // Helper to translate well-known navigation labels dynamically
  const getTranslatedLabel = (label: string) => {
    if (!label) return label;
    const normalized = label.trim().toLowerCase();
    switch (normalized) {
      case 'features': return t('landing.navFeatures', 'Características');
      case 'pricing': return t('landing.navPricing', 'Precios');
      case 'blog': return t('landing.navBlog', 'Blog');
      case 'help': return t('landing.navHelp', 'Ayuda');
      case 'templates': return t('landing.navTemplates', 'Plantillas');
      case 'documentation': return t('landing.navDocumentation', 'Documentación');
      case 'help center': return t('landing.navHelpCenter', 'Centro de Ayuda');
      case 'about': return t('landing.navAbout', 'Nosotros');
      case 'contact': return t('landing.navContact', 'Contacto');
      case 'product': return t('landing.navProduct', 'Producto');
      case 'resources': return t('landing.navResources', 'Recursos');
      case 'company': return t('landing.navCompany', 'Empresa');
      case 'legal': return t('landing.navLegal', 'Legal');
      case 'login': return t('landing.login', 'Iniciar Sesión');
      case 'get started': return t('landing.register', 'Registrarse');
      default: return label;
    }
  };

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

    // Find all matching sections
    const matchingSections = previewSections.filter(s =>
      s.type === sectionType ||
      s.type.startsWith(sectionType) ||
      s.id === sectionType
    );

    // If multiple matches, prefer the one with data (fixes legacy data issue where sections might be duplicated)
    let section = matchingSections[0];
    if (matchingSections.length > 1) {
      const sectionWithData = matchingSections.find(s => s.data && Object.keys(s.data).length > 0);
      if (sectionWithData) {
        section = sectionWithData;
      }
    }

    const result = section?.enabled !== false ? section?.data || null : null;

    return result;
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

  // Compute ordered sections based on previewSections order
  // This enables dynamic reordering in the preview
  const orderedSections = useMemo(() => {
    // Default order when not in preview mode or empty
    const defaultOrder = ['hero', 'features', 'testimonials', 'pricing', 'faq', 'cta'];

    // Default order if no sections loaded
    if (previewSections.length === 0) {
      return defaultOrder.map((type, index) => ({
        id: type,
        type,
        enabled: true,
        order: index,
        data: {}
      } as PreviewSection));
    }

    // Sort sections by their order property, excluding header and footer
    const sortedSections = [...previewSections]
      .filter(s => s.type !== 'header' && s.type !== 'footer')
      .sort((a, b) => a.order - b.order);

    return sortedSections;
  }, [isPreviewMode, previewSections]);

  // Pricing plans are now loaded dynamically from Firestore via useLandingPlans hook
  // This connects the Super Admin plan management with the public landing page

  // Handle navigation item click
  const handleNavItemClick = (item: AppNavItem) => {
    if (item.type === 'anchor') {
      // Scroll to anchor — try both #hash and #section-hash selectors
      const href = item.href; // e.g. "#features"
      const anchorId = href.startsWith('#') ? href.slice(1) : href;
      const element =
        document.getElementById(`section-${anchorId}`) ||
        document.getElementById(anchorId) ||
        document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else if (item.type === 'article' && item.articleSlug && onNavigateToArticle) {
      onNavigateToArticle(item.articleSlug);
    } else if (item.href === '/blog' && onNavigateToBlog) {
      onNavigateToBlog();
    } else if (item.href.startsWith('/')) {
      // Internal link — use SPA navigation (History API) instead of full page reload
      window.history.pushState(null, '', item.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (item.href.startsWith('http')) {
      // External link
      window.open(item.href, item.target || '_blank');
    }
    setIsMobileMenuOpen(false);
  };

  // Generic link navigation for CTA buttons — handles anchors, internal routes, external URLs
  const navigateToLink = (href: string) => {
    if (!href) return;
    if (href.startsWith('#')) {
      // Anchor scroll
      const anchorId = href.slice(1);
      const element =
        document.getElementById(`section-${anchorId}`) ||
        document.getElementById(anchorId);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else if (href === '/register') {
      onNavigateToRegister();
    } else if (href === '/login') {
      onNavigateToLogin();
    } else if (href === '/blog' && onNavigateToBlog) {
      onNavigateToBlog();
    } else if (href.startsWith('/')) {
      window.history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (href.startsWith('http')) {
      window.open(href, '_blank');
    }
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
  // Reusable background image overlay for sections
  const SectionBgImage: React.FC<{ sectionData: Record<string, any> }> = ({ sectionData }) => {
    if (!sectionData?.bgImageEnabled || !sectionData?.bgImageUrl) return null;
    return (
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={sectionData.bgImageUrl}
          alt=""
          className="w-full h-full"
          style={{
            objectFit: (sectionData.bgObjectFit || 'cover') as any,
            objectPosition: sectionData.bgPosition || 'center center',
            filter: sectionData.bgBlur > 0 ? `blur(${sectionData.bgBlur}px)` : undefined,
            opacity: (sectionData.bgOpacity ?? 100) / 100,
            transform: sectionData.bgBlur > 0 ? 'scale(1.05)' : undefined,
          }}
        />
      </div>
    );
  };

  const renderSection = (section: PreviewSection): React.ReactNode => {
    // Check visibility first
    if (section.enabled === false) return null;

    const sectionType = section.type;

    switch (sectionType) {
      case 'hero':
      case 'heroModern':
      case 'heroGradient': {
        const currentSectionData = section.data || {};
        const heroBackgroundColor = currentSectionData?.backgroundColor || '#0A0A0A';
        const heroTextColor = currentSectionData?.textColor || '#ffffff';
        const heroPadding = currentSectionData?.padding || 80;
        const heroShowGradient = currentSectionData?.showGradient ?? (sectionType === 'heroGradient' ? true : false);
        const heroLayout = currentSectionData?.layout || 'centered';
        const overlayOpacity = currentSectionData?.overlayOpacity ?? 0;
        const overlayColor = currentSectionData?.overlayColor || '#000000';
        const gradientDirection = currentSectionData?.gradientDirection || 'to bottom';
        const gradientStart = currentSectionData?.gradientStart || (sectionType === 'heroGradient' ? '#ff0080' : '#000000');
        const gradientEnd = currentSectionData?.gradientEnd || (sectionType === 'heroGradient' ? '#7928ca' : 'transparent');
        const heroAnimationEnabled = currentSectionData?.heroAnimationEnabled !== false;
        const heroAnimationType = currentSectionData?.heroAnimationType || 'goldRibbons';
        const heroBgImageEnabled = currentSectionData?.heroBgImageEnabled || false;
        const heroBgImageUrl = currentSectionData?.heroBgImageUrl || '';
        const heroBgObjectFit = currentSectionData?.heroBgObjectFit || 'cover';
        const heroBgPosition = currentSectionData?.heroBgPosition || 'center center';
        const heroBgBlur = currentSectionData?.heroBgBlur || 0;
        const heroBgOpacity = (currentSectionData?.heroBgOpacity ?? 100) / 100;

        const heroAlignmentClasses = heroLayout === 'left' ? 'items-start text-left'
          : heroLayout === 'right' ? 'items-end text-right'
            : heroLayout === 'split' ? 'items-start text-left'
              : 'items-center text-center';

        const sectionStyle = {
          backgroundColor: heroBackgroundColor,
          color: heroTextColor,
          paddingTop: `${heroPadding}px`,
          paddingBottom: sectionType === 'heroGradient' ? '0px' : `${heroPadding}px`,
          background: heroShowGradient
            ? `linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd}), ${heroBackgroundColor}`
            : heroBackgroundColor
        };

        const overlayComponent = (
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
          />
        );

        if (sectionType === 'hero') {
          return (
            <section
              key="hero"
              id={`section-${sectionType}`}
              data-section-id={section.id}
              className={`min-h-screen flex flex-col justify-center pt-16 sm:pt-20 px-4 sm:px-6 relative overflow-hidden ${heroAlignmentClasses}`}
              style={sectionStyle}
            >
              {/* Hero Background Image */}
              {heroBgImageEnabled && heroBgImageUrl && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img
                    src={heroBgImageUrl}
                    alt=""
                    className="w-full h-full"
                    style={{
                      objectFit: heroBgObjectFit as any,
                      objectPosition: heroBgPosition,
                      filter: heroBgBlur > 0 ? `blur(${heroBgBlur}px)` : undefined,
                      opacity: heroBgOpacity,
                      transform: heroBgBlur > 0 ? 'scale(1.05)' : undefined,
                    }}
                  />
                </div>
              )}
              {/* Hero Background Animations */}
              {heroAnimationEnabled && heroAnimationType === 'goldRibbons' && (
              <>
              <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Deep warm ambient glow layers */}
                <div className="absolute inset-0" style={{
                  background: 'radial-gradient(ellipse 120% 80% at 50% 55%, rgba(160, 120, 20, 0.12) 0%, rgba(120, 80, 10, 0.06) 40%, transparent 70%)',
                }} />
                <div className="absolute inset-0" style={{
                  background: 'radial-gradient(ellipse 60% 40% at 30% 50%, rgba(200, 150, 30, 0.08) 0%, transparent 60%)',
                }} />
                <div className="absolute inset-0" style={{
                  background: 'radial-gradient(ellipse 60% 40% at 70% 45%, rgba(180, 130, 20, 0.08) 0%, transparent 60%)',
                }} />

                {/* Pulsing ambient glow behind ribbons */}
                <div className="absolute" style={{
                  width: '60%', height: '40%', left: '20%', top: '10%',
                  background: 'radial-gradient(ellipse, rgba(218,165,32,0.1) 0%, transparent 70%)',
                  animation: 'heroPulse 8s ease-in-out infinite',
                }} />

                {/* Floating gold particles */}
                {[
                  { left: '10%', top: '15%', size: 4, dur: '14s', delay: '0s' },
                  { left: '25%', top: '25%', size: 3, dur: '18s', delay: '2s' },
                  { left: '45%', top: '10%', size: 5, dur: '16s', delay: '4s' },
                  { left: '60%', top: '20%', size: 3, dur: '20s', delay: '1s' },
                  { left: '75%', top: '30%', size: 4, dur: '15s', delay: '3s' },
                  { left: '85%', top: '12%', size: 3, dur: '17s', delay: '5s' },
                  { left: '35%', top: '35%', size: 2, dur: '22s', delay: '6s' },
                  { left: '55%', top: '5%', size: 3, dur: '19s', delay: '7s' },
                ].map((p, i) => (
                  <div key={`particle-${i}`} className="absolute rounded-full" style={{
                    left: p.left, top: p.top, width: `${p.size}px`, height: `${p.size}px`,
                    background: 'radial-gradient(circle, rgba(255,220,80,0.8), rgba(218,165,32,0.3))',
                    boxShadow: '0 0 8px rgba(218,165,32,0.4)',
                    animation: `heroParticle ${p.dur} ease-in-out ${p.delay} infinite`,
                  }} />
                ))}

                <style>{`
                  @keyframes heroPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.08); }
                  }
                  @keyframes heroParticle {
                    0%   { transform: translate(0, 0) scale(1); opacity: 0.3; }
                    20%  { transform: translate(15px, -25px) scale(1.3); opacity: 0.7; }
                    40%  { transform: translate(-10px, -40px) scale(0.8); opacity: 0.4; }
                    60%  { transform: translate(20px, -15px) scale(1.1); opacity: 0.6; }
                    80%  { transform: translate(-5px, -30px) scale(0.9); opacity: 0.3; }
                    100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
                  }
                `}</style>

                {/* Main SVG wave system — extra wide to prevent edge clipping */}
                <svg
                  className="absolute top-0"
                  style={{ width: '300%', height: '100%', left: '-100%' }}
                  viewBox="0 0 3000 1000"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* Main gold metallic gradient */}
                    <linearGradient id="gold3d1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(120,80,10,0)" />
                      <stop offset="10%" stopColor="rgba(160,110,20,0.3)" />
                      <stop offset="30%" stopColor="rgba(218,165,32,0.7)" />
                      <stop offset="45%" stopColor="rgba(255,210,60,0.9)" />
                      <stop offset="55%" stopColor="rgba(255,220,80,1)" />
                      <stop offset="70%" stopColor="rgba(218,165,32,0.7)" />
                      <stop offset="90%" stopColor="rgba(160,110,20,0.3)" />
                      <stop offset="100%" stopColor="rgba(120,80,10,0)" />
                    </linearGradient>
                    {/* Shadow/depth gradient */}
                    <linearGradient id="gold3dShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(80,50,5,0)" />
                      <stop offset="15%" stopColor="rgba(100,60,10,0.4)" />
                      <stop offset="40%" stopColor="rgba(140,90,15,0.6)" />
                      <stop offset="60%" stopColor="rgba(140,90,15,0.6)" />
                      <stop offset="85%" stopColor="rgba(100,60,10,0.4)" />
                      <stop offset="100%" stopColor="rgba(80,50,5,0)" />
                    </linearGradient>
                    {/* Bright specular highlight */}
                    <linearGradient id="gold3dHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,230,120,0)" />
                      <stop offset="20%" stopColor="rgba(255,240,150,0.2)" />
                      <stop offset="45%" stopColor="rgba(255,250,200,0.6)" />
                      <stop offset="55%" stopColor="rgba(255,250,200,0.6)" />
                      <stop offset="80%" stopColor="rgba(255,240,150,0.2)" />
                      <stop offset="100%" stopColor="rgba(255,230,120,0)" />
                    </linearGradient>
                    {/* Secondary warm ribbon */}
                    <linearGradient id="gold3d2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(140,90,10,0)" />
                      <stop offset="15%" stopColor="rgba(180,120,20,0.35)" />
                      <stop offset="40%" stopColor="rgba(210,155,35,0.6)" />
                      <stop offset="60%" stopColor="rgba(210,155,35,0.6)" />
                      <stop offset="85%" stopColor="rgba(180,120,20,0.35)" />
                      <stop offset="100%" stopColor="rgba(140,90,10,0)" />
                    </linearGradient>
                    {/* Soft glow filter */}
                    <filter id="softGlow3d">
                      <feGaussianBlur stdDeviation="12" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* Deep shadow filter */}
                    <filter id="deepShadow">
                      <feGaussianBlur stdDeviation="20" />
                    </filter>
                    {/* Specular filter */}
                    <filter id="specular3d">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Layer 1: Deep shadow (bottom) — gives depth */}
                  <path
                    d="M-200,320 C200,220 500,420 900,280 C1300,140 1600,380 2000,260 C2400,140 2700,340 3200,300"
                    fill="none"
                    stroke="url(#gold3dShadow)"
                    strokeWidth="100"
                    strokeLinecap="round"
                    filter="url(#deepShadow)"
                    opacity="0.5"
                    style={{ animation: 'goldFlow1 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />

                  {/* Layer 2: Main thick ribbon body */}
                  <path
                    d="M-200,300 C200,180 500,400 900,260 C1300,120 1600,360 2000,240 C2400,120 2700,320 3200,280"
                    fill="none"
                    stroke="url(#gold3d1)"
                    strokeWidth="70"
                    strokeLinecap="round"
                    filter="url(#softGlow3d)"
                    style={{ animation: 'goldFlow1 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />

                  {/* Layer 3: Specular highlight on main ribbon */}
                  <path
                    d="M-200,295 C200,178 500,395 900,255 C1300,118 1600,355 2000,235 C2400,118 2700,315 3200,275"
                    fill="none"
                    stroke="url(#gold3dHighlight)"
                    strokeWidth="20"
                    strokeLinecap="round"
                    filter="url(#specular3d)"
                    style={{ animation: 'goldFlow1 20s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />

                  {/* Layer 4: Secondary ribbon shadow */}
                  <path
                    d="M-200,370 C300,270 600,470 1000,330 C1400,190 1700,410 2100,290 C2500,170 2800,370 3200,340"
                    fill="none"
                    stroke="url(#gold3dShadow)"
                    strokeWidth="65"
                    strokeLinecap="round"
                    filter="url(#deepShadow)"
                    opacity="0.4"
                    style={{ animation: 'goldFlow2 25s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />

                  {/* Layer 5: Secondary ribbon */}
                  <path
                    d="M-200,350 C300,250 600,450 1000,310 C1400,170 1700,390 2100,270 C2500,150 2800,350 3200,320"
                    fill="none"
                    stroke="url(#gold3d2)"
                    strokeWidth="50"
                    strokeLinecap="round"
                    filter="url(#softGlow3d)"
                    style={{ animation: 'goldFlow2 25s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />

                  {/* Layer 6: Thin accent filament — top */}
                  <path
                    d="M-200,260 C250,350 550,170 850,290 C1150,410 1450,200 1750,280 C2050,360 2350,190 2650,270 C2950,350 3100,220 3200,260"
                    fill="none"
                    stroke="url(#gold3dHighlight)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    filter="url(#specular3d)"
                    opacity="0.7"
                    style={{ animation: 'goldFlow3 30s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />

                  {/* Layer 7: Thin accent filament — bottom */}
                  <path
                    d="M-200,330 C300,400 600,230 900,340 C1200,450 1500,240 1800,330 C2100,420 2400,250 2700,330 C2900,380 3100,290 3200,330"
                    fill="none"
                    stroke="url(#gold3d1)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    opacity="0.4"
                    style={{ animation: 'goldFlow3 30s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite reverse' }}
                  />
                </svg>

                {/* Warm bokeh particles for cinematic depth */}
                <div className="absolute inset-0" style={{ opacity: 0.4 }}>
                  <div className="absolute rounded-full" style={{
                    width: '300px', height: '300px', left: '5%', top: '5%',
                    background: 'radial-gradient(circle, rgba(218,165,32,0.15) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                    animation: 'bokeh1 16s ease-in-out infinite',
                  }} />
                  <div className="absolute rounded-full" style={{
                    width: '250px', height: '250px', right: '10%', top: '10%',
                    background: 'radial-gradient(circle, rgba(255,200,50,0.12) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                    animation: 'bokeh2 20s ease-in-out infinite',
                  }} />
                  <div className="absolute rounded-full" style={{
                    width: '200px', height: '200px', left: '40%', top: '15%',
                    background: 'radial-gradient(circle, rgba(180,130,20,0.1) 0%, transparent 70%)',
                    filter: 'blur(35px)',
                    animation: 'bokeh3 22s ease-in-out infinite',
                  }} />
                </div>

                {/* CSS Keyframes — smooth cubic-bezier flow */}
                <style>{`
                  @keyframes goldFlow1 {
                    0%   { transform: translateX(0%) translateY(0px); }
                    10%  { transform: translateX(1.5%) translateY(-8px); }
                    20%  { transform: translateX(3%) translateY(-15px); }
                    30%  { transform: translateX(2%) translateY(-5px); }
                    40%  { transform: translateX(-1%) translateY(10px); }
                    50%  { transform: translateX(-2.5%) translateY(18px); }
                    60%  { transform: translateX(-1.5%) translateY(12px); }
                    70%  { transform: translateX(1%) translateY(-3px); }
                    80%  { transform: translateX(2.5%) translateY(-12px); }
                    90%  { transform: translateX(1%) translateY(-5px); }
                    100% { transform: translateX(0%) translateY(0px); }
                  }
                  @keyframes goldFlow2 {
                    0%   { transform: translateX(0%) translateY(0px); }
                    15%  { transform: translateX(-2%) translateY(12px); }
                    30%  { transform: translateX(-3.5%) translateY(20px); }
                    45%  { transform: translateX(-1%) translateY(8px); }
                    55%  { transform: translateX(1.5%) translateY(-6px); }
                    70%  { transform: translateX(3%) translateY(-16px); }
                    85%  { transform: translateX(1.5%) translateY(-8px); }
                    100% { transform: translateX(0%) translateY(0px); }
                  }
                  @keyframes goldFlow3 {
                    0%   { transform: translateX(0%) translateY(0px); }
                    12%  { transform: translateX(1%) translateY(10px); }
                    25%  { transform: translateX(2.5%) translateY(16px); }
                    37%  { transform: translateX(1%) translateY(6px); }
                    50%  { transform: translateX(-1.5%) translateY(-8px); }
                    62%  { transform: translateX(-3%) translateY(-18px); }
                    75%  { transform: translateX(-2%) translateY(-10px); }
                    87%  { transform: translateX(-0.5%) translateY(-3px); }
                    100% { transform: translateX(0%) translateY(0px); }
                  }
                  @keyframes bokeh1 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
                    33% { transform: translate(30px, -20px) scale(1.1); opacity: 0.6; }
                    66% { transform: translate(-20px, 15px) scale(0.9); opacity: 0.3; }
                  }
                  @keyframes bokeh2 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
                    40% { transform: translate(-25px, 20px) scale(1.15); opacity: 0.5; }
                    70% { transform: translate(15px, -10px) scale(0.95); opacity: 0.25; }
                  }
                  @keyframes bokeh3 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
                    50% { transform: translate(20px, -25px) scale(1.2); opacity: 0.5; }
                  }
                `}</style>
              </div>

              {/* Bottom Gold Waves — mirrored at bottom of hero */}
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <svg
                  className="absolute"
                  style={{ width: '300%', height: '40%', left: '-100%', bottom: '-10%' }}
                  viewBox="0 0 3000 500"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="goldBot1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(120,80,10,0)" />
                      <stop offset="10%" stopColor="rgba(160,110,20,0.3)" />
                      <stop offset="30%" stopColor="rgba(218,165,32,0.7)" />
                      <stop offset="50%" stopColor="rgba(255,220,80,1)" />
                      <stop offset="70%" stopColor="rgba(218,165,32,0.7)" />
                      <stop offset="90%" stopColor="rgba(160,110,20,0.3)" />
                      <stop offset="100%" stopColor="rgba(120,80,10,0)" />
                    </linearGradient>
                    <linearGradient id="goldBotShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(80,50,5,0)" />
                      <stop offset="20%" stopColor="rgba(100,60,10,0.4)" />
                      <stop offset="50%" stopColor="rgba(140,90,15,0.6)" />
                      <stop offset="80%" stopColor="rgba(100,60,10,0.4)" />
                      <stop offset="100%" stopColor="rgba(80,50,5,0)" />
                    </linearGradient>
                    <linearGradient id="goldBotHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,230,120,0)" />
                      <stop offset="25%" stopColor="rgba(255,240,150,0.2)" />
                      <stop offset="50%" stopColor="rgba(255,250,200,0.6)" />
                      <stop offset="75%" stopColor="rgba(255,240,150,0.2)" />
                      <stop offset="100%" stopColor="rgba(255,230,120,0)" />
                    </linearGradient>
                    <linearGradient id="goldBot2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(140,90,10,0)" />
                      <stop offset="20%" stopColor="rgba(180,120,20,0.35)" />
                      <stop offset="50%" stopColor="rgba(210,155,35,0.6)" />
                      <stop offset="80%" stopColor="rgba(180,120,20,0.35)" />
                      <stop offset="100%" stopColor="rgba(140,90,10,0)" />
                    </linearGradient>
                    <filter id="softGlowBot">
                      <feGaussianBlur stdDeviation="12" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="deepShadowBot">
                      <feGaussianBlur stdDeviation="20" />
                    </filter>
                    <filter id="specularBot">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Bottom shadow */}
                  <path
                    d="M-200,280 C200,380 500,180 900,320 C1300,460 1600,220 2000,340 C2400,460 2700,260 3200,300"
                    fill="none"
                    stroke="url(#goldBotShadow)"
                    strokeWidth="90"
                    strokeLinecap="round"
                    filter="url(#deepShadowBot)"
                    opacity="0.5"
                    style={{ animation: 'goldFlowBot1 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />
                  {/* Bottom main ribbon */}
                  <path
                    d="M-200,260 C200,360 500,160 900,300 C1300,440 1600,200 2000,320 C2400,440 2700,240 3200,280"
                    fill="none"
                    stroke="url(#goldBot1)"
                    strokeWidth="65"
                    strokeLinecap="round"
                    filter="url(#softGlowBot)"
                    style={{ animation: 'goldFlowBot1 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />
                  {/* Bottom specular */}
                  <path
                    d="M-200,255 C200,358 500,155 900,295 C1300,438 1600,195 2000,315 C2400,438 2700,235 3200,275"
                    fill="none"
                    stroke="url(#goldBotHighlight)"
                    strokeWidth="18"
                    strokeLinecap="round"
                    filter="url(#specularBot)"
                    style={{ animation: 'goldFlowBot1 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />
                  {/* Bottom secondary ribbon */}
                  <path
                    d="M-200,310 C300,410 600,210 1000,350 C1400,490 1700,250 2100,370 C2500,490 2800,290 3200,330"
                    fill="none"
                    stroke="url(#goldBot2)"
                    strokeWidth="45"
                    strokeLinecap="round"
                    filter="url(#softGlowBot)"
                    style={{ animation: 'goldFlowBot2 28s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                  />
                  {/* Bottom filament */}
                  <path
                    d="M-200,240 C250,310 550,170 850,270 C1150,370 1450,190 1750,270 C2050,350 2350,180 2650,260 C2950,340 3100,230 3200,260"
                    fill="none"
                    stroke="url(#goldBotHighlight)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    filter="url(#specularBot)"
                    opacity="0.6"
                    style={{ animation: 'goldFlowBot2 28s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite reverse' }}
                  />
                </svg>

                {/* Bottom bokeh */}
                <div className="absolute inset-0" style={{ opacity: 0.3 }}>
                  <div className="absolute rounded-full" style={{
                    width: '280px', height: '280px', left: '15%', bottom: '5%',
                    background: 'radial-gradient(circle, rgba(218,165,32,0.12) 0%, transparent 70%)',
                    filter: 'blur(45px)',
                    animation: 'bokeh1 18s ease-in-out infinite reverse',
                  }} />
                  <div className="absolute rounded-full" style={{
                    width: '220px', height: '220px', right: '20%', bottom: '8%',
                    background: 'radial-gradient(circle, rgba(255,200,50,0.1) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                    animation: 'bokeh2 22s ease-in-out infinite reverse',
                  }} />
                </div>

                <style>{`
                  @keyframes goldFlowBot1 {
                    0%   { transform: translateX(0%) translateY(0px); }
                    10%  { transform: translateX(-1.5%) translateY(8px); }
                    20%  { transform: translateX(-3%) translateY(12px); }
                    30%  { transform: translateX(-2%) translateY(5px); }
                    40%  { transform: translateX(1%) translateY(-8px); }
                    50%  { transform: translateX(2.5%) translateY(-15px); }
                    60%  { transform: translateX(1.5%) translateY(-10px); }
                    70%  { transform: translateX(-1%) translateY(3px); }
                    80%  { transform: translateX(-2.5%) translateY(10px); }
                    90%  { transform: translateX(-1%) translateY(4px); }
                    100% { transform: translateX(0%) translateY(0px); }
                  }
                  @keyframes goldFlowBot2 {
                    0%   { transform: translateX(0%) translateY(0px); }
                    15%  { transform: translateX(2%) translateY(-10px); }
                    30%  { transform: translateX(3.5%) translateY(-18px); }
                    45%  { transform: translateX(1%) translateY(-6px); }
                    55%  { transform: translateX(-1.5%) translateY(5px); }
                    70%  { transform: translateX(-3%) translateY(14px); }
                    85%  { transform: translateX(-1.5%) translateY(6px); }
                    100% { transform: translateX(0%) translateY(0px); }
                  }
                `}</style>
              </div>
              </>
              )}

              {/* Aurora Glow Animation */}
              {heroAnimationEnabled && heroAnimationType === 'auroraGlow' && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute" style={{ width: '50%', height: '50%', left: '5%', top: '10%', background: 'radial-gradient(ellipse, rgba(218,165,32,0.25) 0%, transparent 70%)', filter: 'blur(100px)', animation: 'auroraMove1 18s ease-in-out infinite' }} />
                <div className="absolute" style={{ width: '45%', height: '45%', right: '5%', top: '5%', background: 'radial-gradient(ellipse, rgba(255,220,80,0.2) 0%, transparent 70%)', filter: 'blur(120px)', animation: 'auroraMove2 22s ease-in-out infinite' }} />
                <div className="absolute" style={{ width: '40%', height: '55%', left: '30%', bottom: '10%', background: 'radial-gradient(ellipse, rgba(180,130,20,0.2) 0%, transparent 70%)', filter: 'blur(90px)', animation: 'auroraMove3 25s ease-in-out infinite' }} />
                <div className="absolute" style={{ width: '35%', height: '40%', left: '55%', top: '25%', background: 'radial-gradient(ellipse, rgba(255,200,50,0.15) 0%, transparent 70%)', filter: 'blur(110px)', animation: 'auroraMove4 20s ease-in-out infinite' }} />
                <div className="absolute" style={{ width: '30%', height: '35%', left: '10%', top: '40%', background: 'radial-gradient(ellipse, rgba(200,150,30,0.12) 0%, transparent 70%)', filter: 'blur(100px)', animation: 'auroraMove5 28s ease-in-out infinite' }} />
                <style>{`
                  @keyframes auroraMove1 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(80px,-60px) scale(1.15)} 50%{transform:translate(-40px,50px) scale(0.9)} 75%{transform:translate(60px,30px) scale(1.1)} }
                  @keyframes auroraMove2 { 0%,100%{transform:translate(0,0) scale(1)} 30%{transform:translate(-70px,40px) scale(1.2)} 60%{transform:translate(50px,-50px) scale(0.85)} 80%{transform:translate(-30px,-20px) scale(1.05)} }
                  @keyframes auroraMove3 { 0%,100%{transform:translate(0,0) scale(1)} 20%{transform:translate(60px,-70px) scale(1.1)} 50%{transform:translate(-80px,30px) scale(1.2)} 80%{transform:translate(40px,50px) scale(0.9)} }
                  @keyframes auroraMove4 { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-50px,-40px) scale(1.15)} 65%{transform:translate(70px,60px) scale(0.95)} 85%{transform:translate(-20px,30px) scale(1.05)} }
                  @keyframes auroraMove5 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(50px,40px) scale(1.1)} 70%{transform:translate(-60px,-30px) scale(1.2)} }
                `}</style>
              </div>
              )}

              {/* Particle Field Animation */}
              {heroAnimationEnabled && heroAnimationType === 'particleField' && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(218,165,32,0.08) 0%, transparent 70%)' }} />
                {Array.from({length: 24}).map((_, i) => {
                  const x = (i * 17 + 7) % 100;
                  const y = (i * 23 + 11) % 80 + 5;
                  const size = 2 + (i % 4);
                  const dur = 12 + (i % 8) * 2;
                  const delay = (i * 0.7) % 6;
                  const orbitRadius = 20 + (i % 5) * 15;
                  return (
                    <div key={`pf-${i}`} className="absolute" style={{ left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,220,80,${0.6 + (i%3)*0.15}) 0%, rgba(218,165,32,0.2) 100%)`, boxShadow: `0 0 ${size*3}px rgba(218,165,32,0.4), 0 0 ${size*6}px rgba(218,165,32,0.15)`, animation: `particleOrbit${i%6} ${dur}s ease-in-out ${delay}s infinite` }} />
                  );
                })}
                <style>{`
                  @keyframes particleOrbit0 { 0%,100%{transform:translate(0,0) scale(1);opacity:.4} 25%{transform:translate(25px,-35px) scale(1.3);opacity:.8} 50%{transform:translate(-15px,-55px) scale(.7);opacity:.3} 75%{transform:translate(30px,-20px) scale(1.1);opacity:.7} }
                  @keyframes particleOrbit1 { 0%,100%{transform:translate(0,0) scale(1);opacity:.5} 30%{transform:translate(-30px,20px) scale(1.4);opacity:.9} 60%{transform:translate(20px,-40px) scale(.8);opacity:.3} 85%{transform:translate(-10px,15px) scale(1.2);opacity:.6} }
                  @keyframes particleOrbit2 { 0%,100%{transform:translate(0,0) scale(1);opacity:.3} 20%{transform:translate(35px,25px) scale(1.2);opacity:.7} 55%{transform:translate(-25px,-30px) scale(.9);opacity:.4} 80%{transform:translate(15px,35px) scale(1.3);opacity:.8} }
                  @keyframes particleOrbit3 { 0%,100%{transform:translate(0,0) scale(1);opacity:.45} 35%{transform:translate(-20px,-45px) scale(1.5);opacity:.85} 65%{transform:translate(30px,15px) scale(.6);opacity:.25} 90%{transform:translate(-15px,-10px) scale(1.1);opacity:.6} }
                  @keyframes particleOrbit4 { 0%,100%{transform:translate(0,0) scale(1);opacity:.35} 25%{transform:translate(40px,-15px) scale(1.2);opacity:.75} 50%{transform:translate(-30px,35px) scale(.85);opacity:.3} 75%{transform:translate(10px,-40px) scale(1.4);opacity:.8} }
                  @keyframes particleOrbit5 { 0%,100%{transform:translate(0,0) scale(1);opacity:.5} 30%{transform:translate(-35px,-25px) scale(1.3);opacity:.7} 60%{transform:translate(25px,40px) scale(.75);opacity:.35} 85%{transform:translate(-20px,10px) scale(1.15);opacity:.65} }
                `}</style>
              </div>
              )}

              {/* Liquid Metal Animation */}
              {heroAnimationEnabled && heroAnimationType === 'liquidMetal' && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{ filter: 'url(#gooey-metal)' }}>
                {/* SVG Filter for Gooey Metaball Effect */}
                <svg className="absolute hidden">
                  <defs>
                    <filter id="gooey-metal">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 40 -15" result="gooey" />
                      <feBlend in="SourceGraphic" in2="gooey" />
                    </filter>
                  </defs>
                </svg>

                {/* Metallic Drops */}
                <div className="absolute inset-0 z-0 opacity-80">
                  <div className="absolute w-40 h-40 rounded-full left-1/4 top-1/3" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #fbc02d, #f57f17)', boxShadow: 'inset -15px -15px 30px rgba(130,100,0,0.8), 0 20px 40px rgba(0,0,0,0.3)', animation: 'dropFloat1 15s infinite alternate ease-in-out' }} />
                  <div className="absolute w-60 h-60 rounded-full left-1/2 top-1/2" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #fbc02d, #f57f17)', boxShadow: 'inset -20px -20px 40px rgba(130,100,0,0.8), 0 20px 50px rgba(0,0,0,0.3)', animation: 'dropFloat2 20s infinite alternate ease-in-out' }} />
                  <div className="absolute w-32 h-32 rounded-full left-2/3 top-1/4" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #ffb300, #ff6f00)', boxShadow: 'inset -10px -10px 20px rgba(130,100,0,0.8), 0 10px 30px rgba(0,0,0,0.2)', animation: 'dropFloat3 18s infinite alternate ease-in-out' }} />
                  <div className="absolute w-48 h-48 rounded-full left-1/3 top-2/3" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #fbc02d, #f57f17)', boxShadow: 'inset -18px -18px 35px rgba(130,100,0,0.8), 0 15px 40px rgba(0,0,0,0.3)', animation: 'dropFloat4 22s infinite alternate ease-in-out' }} />
                  <div className="absolute w-24 h-24 rounded-full left-3/4 top-2/3" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #ffb300, #ff6f00)', boxShadow: 'inset -8px -8px 15px rgba(130,100,0,0.8), 0 10px 20px rgba(0,0,0,0.2)', animation: 'dropFloat5 16s infinite alternate ease-in-out' }} />
                  
                  {/* Additional Drops for Richer Effect */}
                  <div className="absolute w-20 h-20 rounded-full left-1/5 top-1/5" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #fbc02d, #f57f17)', boxShadow: 'inset -10px -10px 20px rgba(130,100,0,0.8), 0 10px 20px rgba(0,0,0,0.2)', animation: 'dropFloat6 14s infinite alternate ease-in-out' }} />
                  <div className="absolute w-52 h-52 rounded-full left-3/5 top-1/6" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #ffb300, #ff6f00)', boxShadow: 'inset -16px -16px 30px rgba(130,100,0,0.8), 0 15px 35px rgba(0,0,0,0.3)', animation: 'dropFloat7 24s infinite alternate ease-in-out' }} />
                  <div className="absolute w-36 h-36 rounded-full left-4/5 top-1/2" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #fbc02d, #f57f17)', boxShadow: 'inset -12px -12px 25px rgba(130,100,0,0.8), 0 15px 25px rgba(0,0,0,0.25)', animation: 'dropFloat8 19s infinite alternate ease-in-out' }} />
                  <div className="absolute w-28 h-28 rounded-full left-1/6 top-3/4" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #ffb300, #ff6f00)', boxShadow: 'inset -10px -10px 20px rgba(130,100,0,0.8), 0 10px 30px rgba(0,0,0,0.2)', animation: 'dropFloat9 17s infinite alternate ease-in-out' }} />
                  <div className="absolute w-16 h-16 rounded-full left-1/2 top-4/5" style={{ background: 'radial-gradient(circle at 30% 30%, #fffde7, #fbc02d, #f57f17)', boxShadow: 'inset -6px -6px 12px rgba(130,100,0,0.8), 0 5px 15px rgba(0,0,0,0.2)', animation: 'dropFloat10 13s infinite alternate ease-in-out' }} />
                </div>
                
                <style>{`
                  @keyframes dropFloat1 {
                    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    33% { transform: translate(150px, -100px) scale(1.1) rotate(45deg); }
                    66% { transform: translate(50px, 150px) scale(0.9) rotate(90deg); }
                    100% { transform: translate(-100px, 50px) scale(1.05) rotate(135deg); }
                  }
                  @keyframes dropFloat2 {
                    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    33% { transform: translate(-100px, 150px) scale(0.95) rotate(-45deg); }
                    66% { transform: translate(-200px, -50px) scale(1.15) rotate(-90deg); }
                    100% { transform: translate(100px, -100px) scale(0.85) rotate(-135deg); }
                  }
                  @keyframes dropFloat3 {
                    0% { transform: translate(0, 0) scale(1.1) rotate(0deg); }
                    33% { transform: translate(-150px, -150px) scale(0.9) rotate(60deg); }
                    66% { transform: translate(100px, 50px) scale(1.2) rotate(120deg); }
                    100% { transform: translate(-50px, 150px) scale(0.95) rotate(180deg); }
                  }
                  @keyframes dropFloat4 {
                    0% { transform: translate(0, 0) scale(0.9) rotate(0deg); }
                    33% { transform: translate(200px, -50px) scale(1.1) rotate(-60deg); }
                    66% { transform: translate(-50px, -150px) scale(0.95) rotate(-120deg); }
                    100% { transform: translate(-150px, 100px) scale(1.05) rotate(-180deg); }
                  }
                  @keyframes dropFloat5 {
                    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    33% { transform: translate(-100px, -100px) scale(1.2) rotate(90deg); }
                    66% { transform: translate(-250px, 50px) scale(0.8) rotate(180deg); }
                    100% { transform: translate(50px, -50px) scale(1.1) rotate(270deg); }
                  }
                  @keyframes dropFloat6 {
                    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    40% { transform: translate(120px, 120px) scale(1.3) rotate(60deg); }
                    80% { transform: translate(-80px, 180px) scale(0.8) rotate(120deg); }
                    100% { transform: translate(-40px, -40px) scale(1.1) rotate(180deg); }
                  }
                  @keyframes dropFloat7 {
                    0% { transform: translate(0, 0) scale(0.85) rotate(0deg); }
                    33% { transform: translate(-180px, 80px) scale(1) rotate(-30deg); }
                    66% { transform: translate(-50px, 200px) scale(1.2) rotate(-90deg); }
                    100% { transform: translate(150px, 50px) scale(0.9) rotate(-150deg); }
                  }
                  @keyframes dropFloat8 {
                    0% { transform: translate(0, 0) scale(1.1) rotate(0deg); }
                    35% { transform: translate(-100px, -150px) scale(0.9) rotate(45deg); }
                    70% { transform: translate(-250px, -50px) scale(1.15) rotate(135deg); }
                    100% { transform: translate(-50px, 100px) scale(1) rotate(225deg); }
                  }
                  @keyframes dropFloat9 {
                    0% { transform: translate(0, 0) scale(0.95) rotate(0deg); }
                    30% { transform: translate(180px, -120px) scale(1.2) rotate(-60deg); }
                    65% { transform: translate(250px, 80px) scale(0.85) rotate(-120deg); }
                    100% { transform: translate(80px, -80px) scale(1.05) rotate(-200deg); }
                  }
                  @keyframes dropFloat10 {
                    0% { transform: translate(0, 0) scale(1.2) rotate(0deg); }
                    30% { transform: translate(-150px, -80px) scale(0.8) rotate(70deg); }
                    60% { transform: translate(100px, -200px) scale(1.3) rotate(140deg); }
                    100% { transform: translate(50px, -100px) scale(0.9) rotate(240deg); }
                  }
                `}</style>
              </div>
              )}

              {/* Topographic Mesh Animation */}
              {heroAnimationEnabled && heroAnimationType === 'topoMesh' && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="topoStroke1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(218,165,32,0)" />
                      <stop offset="30%" stopColor="rgba(218,165,32,0.4)" />
                      <stop offset="50%" stopColor="rgba(255,220,80,0.6)" />
                      <stop offset="70%" stopColor="rgba(218,165,32,0.4)" />
                      <stop offset="100%" stopColor="rgba(218,165,32,0)" />
                    </linearGradient>
                    <linearGradient id="topoStroke2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(180,130,20,0)" />
                      <stop offset="25%" stopColor="rgba(180,130,20,0.25)" />
                      <stop offset="50%" stopColor="rgba(218,165,32,0.4)" />
                      <stop offset="75%" stopColor="rgba(180,130,20,0.25)" />
                      <stop offset="100%" stopColor="rgba(180,130,20,0)" />
                    </linearGradient>
                    <filter id="topoGlow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Contour Ring 1 — outermost */}
                  <path fill="none" stroke="url(#topoStroke2)" strokeWidth="1.5" opacity="0.3" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="30s" repeatCount="indefinite" values="
                      M100,400 C200,200 400,150 600,300 C800,450 1000,200 1100,400;
                      M100,350 C250,180 450,250 600,350 C750,450 950,180 1100,350;
                      M100,420 C200,250 350,180 600,280 C850,380 1050,250 1100,420;
                      M100,400 C200,200 400,150 600,300 C800,450 1000,200 1100,400
                    " />
                  </path>

                  {/* Contour Ring 2 */}
                  <path fill="none" stroke="url(#topoStroke1)" strokeWidth="1.8" opacity="0.4" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="28s" repeatCount="indefinite" values="
                      M150,400 C270,230 420,180 600,320 C780,460 950,230 1050,400;
                      M150,370 C280,210 440,260 600,360 C760,460 930,210 1050,370;
                      M150,430 C260,260 400,200 600,300 C800,400 960,260 1050,430;
                      M150,400 C270,230 420,180 600,320 C780,460 950,230 1050,400
                    " />
                  </path>

                  {/* Contour Ring 3 */}
                  <path fill="none" stroke="url(#topoStroke1)" strokeWidth="2" opacity="0.5" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="26s" repeatCount="indefinite" values="
                      M200,400 C320,260 460,210 600,340 C740,470 880,260 1000,400;
                      M200,380 C330,250 470,280 600,370 C730,460 870,250 1000,380;
                      M200,420 C310,270 450,220 600,320 C750,420 880,270 1000,420;
                      M200,400 C320,260 460,210 600,340 C740,470 880,260 1000,400
                    " />
                  </path>

                  {/* Contour Ring 4 */}
                  <path fill="none" stroke="url(#topoStroke1)" strokeWidth="2.2" opacity="0.55" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="24s" repeatCount="indefinite" values="
                      M260,400 C360,290 490,240 600,350 C710,460 840,290 940,400;
                      M260,385 C370,275 500,290 600,375 C700,460 830,275 940,385;
                      M260,415 C355,300 480,250 600,335 C720,420 845,300 940,415;
                      M260,400 C360,290 490,240 600,350 C710,460 840,290 940,400
                    " />
                  </path>

                  {/* Contour Ring 5 — inner */}
                  <path fill="none" stroke="url(#topoStroke1)" strokeWidth="2.5" opacity="0.6" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="22s" repeatCount="indefinite" values="
                      M330,400 C400,310 510,270 600,360 C690,450 800,310 870,400;
                      M330,390 C410,300 520,300 600,380 C680,460 790,300 870,390;
                      M330,410 C395,320 505,280 600,345 C695,410 805,320 870,410;
                      M330,400 C400,310 510,270 600,360 C690,450 800,310 870,400
                    " />
                  </path>

                  {/* Contour Ring 6 — innermost, brightest */}
                  <path fill="none" stroke="url(#topoStroke1)" strokeWidth="2.8" opacity="0.7" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="20s" repeatCount="indefinite" values="
                      M400,400 C450,340 530,310 600,370 C670,430 750,340 800,400;
                      M400,395 C455,335 535,330 600,380 C665,430 745,335 800,395;
                      M400,405 C445,345 525,315 600,360 C675,405 755,345 800,405;
                      M400,400 C450,340 530,310 600,370 C670,430 750,340 800,400
                    " />
                  </path>

                  {/* Secondary contour set — offset upward */}
                  <path fill="none" stroke="url(#topoStroke2)" strokeWidth="1.2" opacity="0.25" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="32s" repeatCount="indefinite" values="
                      M50,250 C200,100 400,80 600,200 C800,320 1000,100 1150,250;
                      M50,230 C220,90 420,120 600,220 C780,320 980,90 1150,230;
                      M50,270 C190,110 380,90 600,190 C820,290 1010,110 1150,270;
                      M50,250 C200,100 400,80 600,200 C800,320 1000,100 1150,250
                    " />
                  </path>
                  <path fill="none" stroke="url(#topoStroke2)" strokeWidth="1.4" opacity="0.3" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="29s" repeatCount="indefinite" values="
                      M120,260 C260,130 430,110 600,220 C770,330 940,130 1080,260;
                      M120,245 C270,120 440,140 600,235 C760,330 930,120 1080,245;
                      M120,275 C250,140 420,115 600,210 C780,305 945,140 1080,275;
                      M120,260 C260,130 430,110 600,220 C770,330 940,130 1080,260
                    " />
                  </path>

                  {/* Lower contour set */}
                  <path fill="none" stroke="url(#topoStroke2)" strokeWidth="1.2" opacity="0.2" filter="url(#topoGlow)">
                    <animate attributeName="d" dur="34s" repeatCount="indefinite" values="
                      M50,580 C200,700 400,720 600,600 C800,480 1000,700 1150,580;
                      M50,600 C220,710 420,680 600,580 C780,480 980,710 1150,600;
                      M50,560 C190,690 380,710 600,610 C820,510 1010,690 1150,560;
                      M50,580 C200,700 400,720 600,600 C800,480 1000,700 1150,580
                    " />
                  </path>
                </svg>

                {/* Ambient glow at center */}
                <div className="absolute" style={{ width: '40%', height: '40%', left: '30%', top: '25%', background: 'radial-gradient(circle, rgba(218,165,32,0.08) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'topoGlowPulse 15s ease-in-out infinite' }} />
                <style>{`
                  @keyframes topoGlowPulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.7;transform:scale(1.1)} }
                `}</style>
              </div>
              )}

              {/* Nebula / Cosmic Smoke Animation */}
              {heroAnimationEnabled && heroAnimationType === 'nebulaDrift' && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* SVG Turbulence Filter — creates organic smoke texture */}
                <svg className="absolute w-0 h-0">
                  <defs>
                    <filter id="nebula-turbulence" x="0%" y="0%" width="100%" height="100%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" seed="2" result="noise">
                        <animate attributeName="seed" values="2;50;2" dur="20s" repeatCount="indefinite" />
                      </feTurbulence>
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="120" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    <filter id="nebula-glow">
                      <feGaussianBlur stdDeviation="30" />
                    </filter>
                  </defs>
                </svg>

                {/* Nebula Layers — smoke/gas clouds with turbulence filter */}
                <div className="absolute inset-0" style={{ filter: 'url(#nebula-turbulence)' }}>
                  {/* Primary cloud */}
                  <div className="absolute" style={{
                    width: '70%', height: '70%', left: '15%', top: '10%',
                    background: 'radial-gradient(ellipse at 40% 40%, rgba(255,220,80,0.35) 0%, rgba(218,165,32,0.15) 40%, transparent 70%)',
                    filter: 'blur(60px)',
                    animation: 'nebulaFloat1 25s ease-in-out infinite',
                  }} />
                  {/* Secondary cloud */}
                  <div className="absolute" style={{
                    width: '60%', height: '65%', right: '5%', top: '15%',
                    background: 'radial-gradient(ellipse at 60% 50%, rgba(200,150,30,0.3) 0%, rgba(180,130,20,0.1) 45%, transparent 70%)',
                    filter: 'blur(70px)',
                    animation: 'nebulaFloat2 30s ease-in-out infinite',
                  }} />
                  {/* Tertiary cloud — deeper/warmer */}
                  <div className="absolute" style={{
                    width: '55%', height: '50%', left: '25%', bottom: '5%',
                    background: 'radial-gradient(ellipse at 50% 60%, rgba(160,100,10,0.25) 0%, rgba(140,80,5,0.1) 50%, transparent 70%)',
                    filter: 'blur(50px)',
                    animation: 'nebulaFloat3 22s ease-in-out infinite',
                  }} />
                  {/* Bright core glow */}
                  <div className="absolute" style={{
                    width: '35%', height: '35%', left: '32%', top: '28%',
                    background: 'radial-gradient(circle, rgba(255,240,150,0.2) 0%, rgba(255,220,80,0.08) 50%, transparent 70%)',
                    filter: 'blur(40px)',
                    animation: 'nebulaPulse 12s ease-in-out infinite',
                  }} />
                </div>

                {/* Subtle star-like specks scattered across */}
                {Array.from({length: 16}).map((_, i) => {
                  const x = (i * 19 + 5) % 90 + 5;
                  const y = (i * 29 + 13) % 80 + 5;
                  const size = 1.5 + (i % 3);
                  const delay = (i * 0.8) % 5;
                  return (
                    <div key={`neb-star-${i}`} className="absolute rounded-full" style={{
                      left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`,
                      background: `radial-gradient(circle, rgba(255,240,180,${0.5 + (i%3)*0.15}) 0%, transparent 100%)`,
                      boxShadow: `0 0 ${size*2}px rgba(255,220,80,0.3)`,
                      animation: `nebulaSparkle ${3 + (i%4)}s ease-in-out ${delay}s infinite`,
                    }} />
                  );
                })}

                <style>{`
                  @keyframes nebulaFloat1 {
                    0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
                    25% { transform: translate(60px,-40px) scale(1.1) rotate(2deg); }
                    50% { transform: translate(-30px,50px) scale(0.95) rotate(-1deg); }
                    75% { transform: translate(40px,20px) scale(1.05) rotate(1deg); }
                  }
                  @keyframes nebulaFloat2 {
                    0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
                    30% { transform: translate(-50px,30px) scale(1.08) rotate(-2deg); }
                    60% { transform: translate(40px,-40px) scale(0.92) rotate(1.5deg); }
                    85% { transform: translate(-20px,-15px) scale(1.03) rotate(-0.5deg); }
                  }
                  @keyframes nebulaFloat3 {
                    0%,100% { transform: translate(0,0) scale(1); }
                    35% { transform: translate(45px,-35px) scale(1.12); }
                    65% { transform: translate(-55px,25px) scale(0.9); }
                    90% { transform: translate(20px,40px) scale(1.06); }
                  }
                  @keyframes nebulaPulse {
                    0%,100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.9; transform: scale(1.15); }
                  }
                  @keyframes nebulaSparkle {
                    0%,100% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 0.9; transform: scale(1.3); }
                  }
                `}</style>
              </div>
              )}

              {/* Electric Storm Animation */}
              {heroAnimationEnabled && heroAnimationType === 'electricStorm' && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="boltGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,240,150,0.9)" />
                      <stop offset="50%" stopColor="rgba(255,220,80,0.7)" />
                      <stop offset="100%" stopColor="rgba(218,165,32,0.3)" />
                    </linearGradient>
                    <linearGradient id="boltGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,250,200,0.8)" />
                      <stop offset="100%" stopColor="rgba(218,165,32,0.2)" />
                    </linearGradient>
                    <filter id="boltGlow">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="boltGlowWide">
                      <feGaussianBlur stdDeviation="12" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Main lightning bolt 1 */}
                  <polyline fill="none" stroke="url(#boltGrad1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#boltGlow)" opacity="0">
                    <animate attributeName="points" dur="8s" repeatCount="indefinite" values="
                      100,50 180,150 150,180 250,300 220,320 350,500 300,520 420,700;
                      120,40 200,160 170,190 280,310 240,340 370,510 320,540 440,720;
                      90,60 170,140 140,170 240,290 210,310 340,490 290,510 410,690;
                      100,50 180,150 150,180 250,300 220,320 350,500 300,520 420,700
                    " />
                    <animate attributeName="opacity" dur="8s" repeatCount="indefinite" values="0;0;0.8;1;0.6;0;0;0" />
                  </polyline>

                  {/* Lightning bolt 1 — wide glow */}
                  <polyline fill="none" stroke="rgba(255,220,80,0.15)" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" filter="url(#boltGlowWide)" opacity="0">
                    <animate attributeName="points" dur="8s" repeatCount="indefinite" values="
                      100,50 180,150 150,180 250,300 220,320 350,500 300,520 420,700;
                      120,40 200,160 170,190 280,310 240,340 370,510 320,540 440,720;
                      90,60 170,140 140,170 240,290 210,310 340,490 290,510 410,690;
                      100,50 180,150 150,180 250,300 220,320 350,500 300,520 420,700
                    " />
                    <animate attributeName="opacity" dur="8s" repeatCount="indefinite" values="0;0;0.4;0.6;0.3;0;0;0" />
                  </polyline>

                  {/* Branch from bolt 1 */}
                  <polyline fill="none" stroke="url(#boltGrad2)" strokeWidth="1.5" strokeLinecap="round" filter="url(#boltGlow)" opacity="0">
                    <animate attributeName="points" dur="8s" repeatCount="indefinite" values="
                      250,300 300,280 340,310 400,260;
                      280,310 330,290 370,320 430,270;
                      240,290 290,270 330,300 390,250;
                      250,300 300,280 340,310 400,260
                    " />
                    <animate attributeName="opacity" dur="8s" repeatCount="indefinite" values="0;0;0.6;0.8;0.4;0;0;0" />
                  </polyline>

                  {/* Main lightning bolt 2 */}
                  <polyline fill="none" stroke="url(#boltGrad1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#boltGlow)" opacity="0">
                    <animate attributeName="points" dur="11s" repeatCount="indefinite" values="
                      800,80 750,180 780,210 700,350 730,380 650,520 680,560 600,720;
                      820,70 770,190 800,220 720,360 750,390 670,530 700,570 620,730;
                      790,90 740,170 770,200 690,340 720,370 640,510 670,550 590,710;
                      800,80 750,180 780,210 700,350 730,380 650,520 680,560 600,720
                    " />
                    <animate attributeName="opacity" dur="11s" repeatCount="indefinite" values="0;0;0;0.7;1;0.5;0;0;0" />
                  </polyline>

                  {/* Main lightning bolt 3 — center horizontal */}
                  <polyline fill="none" stroke="url(#boltGrad2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#boltGlow)" opacity="0">
                    <animate attributeName="points" dur="14s" repeatCount="indefinite" values="
                      200,400 320,380 350,420 480,370 510,410 650,360 680,400 820,380 850,410 1000,390;
                      220,410 340,390 370,430 500,380 530,420 670,370 700,410 840,390 870,420 1020,400;
                      190,390 310,370 340,410 470,360 500,400 640,350 670,390 810,370 840,400 990,380;
                      200,400 320,380 350,420 480,370 510,410 650,360 680,400 820,380 850,410 1000,390
                    " />
                    <animate attributeName="opacity" dur="14s" repeatCount="indefinite" values="0;0;0;0;0.6;0.9;0.7;0;0;0;0" />
                  </polyline>

                  {/* Small spark cluster */}
                  <polyline fill="none" stroke="url(#boltGrad1)" strokeWidth="1.2" strokeLinecap="round" filter="url(#boltGlow)" opacity="0">
                    <animate attributeName="points" dur="6s" repeatCount="indefinite" values="
                      500,200 520,180 540,210 560,190;
                      510,190 530,170 550,200 570,180;
                      490,210 510,190 530,220 550,200;
                      500,200 520,180 540,210 560,190
                    " />
                    <animate attributeName="opacity" dur="6s" repeatCount="indefinite" values="0;0.9;0;0;0.7;0" />
                  </polyline>

                  {/* Small spark cluster 2 */}
                  <polyline fill="none" stroke="url(#boltGrad2)" strokeWidth="1" strokeLinecap="round" filter="url(#boltGlow)" opacity="0">
                    <animate attributeName="points" dur="9s" repeatCount="indefinite" values="
                      900,500 920,480 940,510 960,490 980,520;
                      910,490 930,470 950,500 970,480 990,510;
                      890,510 910,490 930,520 950,500 970,530;
                      900,500 920,480 940,510 960,490 980,520
                    " />
                    <animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;0;0.8;0;0;0.6;0;0" />
                  </polyline>
                </svg>

                {/* Ambient flash glow */}
                <div className="absolute" style={{ width: '30%', height: '40%', left: '5%', top: '10%', background: 'radial-gradient(circle, rgba(255,220,80,0.1) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'stormFlash1 8s ease-in-out infinite' }} />
                <div className="absolute" style={{ width: '25%', height: '35%', right: '10%', top: '15%', background: 'radial-gradient(circle, rgba(255,240,150,0.08) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'stormFlash2 11s ease-in-out infinite' }} />
                <style>{`
                  @keyframes stormFlash1 { 0%,30%,100%{opacity:0} 32%{opacity:.6} 34%{opacity:0} 36%{opacity:.8} 38%{opacity:0} }
                  @keyframes stormFlash2 { 0%,50%,100%{opacity:0} 52%{opacity:.5} 54%{opacity:0} 55%{opacity:.7} 57%{opacity:0} }
                `}</style>
              </div>
              )}

              {/* Ink Diffusion Animation */}
              {heroAnimationEnabled && heroAnimationType === 'inkDiffusion' && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Ink drop 1 — large center */}
                <div className="absolute" style={{
                  width: '500px', height: '500px', left: '30%', top: '15%', transform: 'translate(-50%, -10%)',
                  background: 'radial-gradient(circle at 45% 45%, rgba(255,220,80,0.4) 0%, rgba(218,165,32,0.2) 25%, rgba(180,130,20,0.08) 50%, transparent 70%)',
                  filter: 'blur(30px)',
                  borderRadius: '40% 60% 55% 45% / 50% 40% 60% 50%',
                  animation: 'inkExpand1 20s ease-in-out infinite',
                }} />
                {/* Ink drop 2 — right side */}
                <div className="absolute" style={{
                  width: '400px', height: '400px', right: '5%', top: '25%',
                  background: 'radial-gradient(circle at 55% 40%, rgba(200,150,30,0.35) 0%, rgba(180,130,20,0.15) 30%, rgba(160,110,20,0.05) 55%, transparent 70%)',
                  filter: 'blur(35px)',
                  borderRadius: '55% 45% 50% 50% / 45% 55% 45% 55%',
                  animation: 'inkExpand2 25s ease-in-out infinite',
                }} />
                {/* Ink drop 3 — bottom left */}
                <div className="absolute" style={{
                  width: '450px', height: '450px', left: '5%', bottom: '0%',
                  background: 'radial-gradient(circle at 40% 55%, rgba(255,200,50,0.3) 0%, rgba(218,165,32,0.12) 35%, rgba(160,100,10,0.04) 60%, transparent 70%)',
                  filter: 'blur(25px)',
                  borderRadius: '50% 50% 40% 60% / 55% 45% 55% 45%',
                  animation: 'inkExpand3 22s ease-in-out infinite',
                }} />
                {/* Ink drop 4 — small accent */}
                <div className="absolute" style={{
                  width: '250px', height: '250px', left: '55%', top: '50%',
                  background: 'radial-gradient(circle, rgba(255,240,150,0.25) 0%, rgba(218,165,32,0.1) 40%, transparent 70%)',
                  filter: 'blur(20px)',
                  borderRadius: '45% 55% 60% 40% / 50% 50% 50% 50%',
                  animation: 'inkExpand4 18s ease-in-out infinite',
                }} />
                {/* Ink bleed tendrils — simulated with elongated shapes */}
                <div className="absolute" style={{
                  width: '300px', height: '80px', left: '35%', top: '35%',
                  background: 'linear-gradient(90deg, transparent, rgba(218,165,32,0.15), rgba(255,220,80,0.2), rgba(218,165,32,0.15), transparent)',
                  filter: 'blur(15px)',
                  borderRadius: '50%',
                  animation: 'inkTendril1 15s ease-in-out infinite',
                  transformOrigin: 'left center',
                }} />
                <div className="absolute" style={{
                  width: '250px', height: '60px', right: '20%', top: '55%',
                  background: 'linear-gradient(90deg, transparent, rgba(200,150,30,0.12), rgba(218,165,32,0.18), rgba(200,150,30,0.12), transparent)',
                  filter: 'blur(12px)',
                  borderRadius: '50%',
                  animation: 'inkTendril2 18s ease-in-out infinite',
                  transformOrigin: 'right center',
                }} />

                <style>{`
                  @keyframes inkExpand1 {
                    0%,100% { transform: translate(-50%,-10%) scale(0.8) rotate(0deg); opacity: 0.5; border-radius: 40% 60% 55% 45% / 50% 40% 60% 50%; }
                    25% { transform: translate(-48%,-8%) scale(1.1) rotate(5deg); opacity: 0.8; border-radius: 50% 50% 45% 55% / 55% 45% 50% 50%; }
                    50% { transform: translate(-52%,-12%) scale(1.25) rotate(-3deg); opacity: 0.6; border-radius: 45% 55% 60% 40% / 45% 55% 55% 45%; }
                    75% { transform: translate(-49%,-9%) scale(1) rotate(2deg); opacity: 0.7; border-radius: 55% 45% 50% 50% / 50% 50% 45% 55%; }
                  }
                  @keyframes inkExpand2 {
                    0%,100% { transform: scale(0.7) rotate(0deg); opacity: 0.4; border-radius: 55% 45% 50% 50% / 45% 55% 45% 55%; }
                    30% { transform: scale(1.15) rotate(-4deg); opacity: 0.75; border-radius: 45% 55% 55% 45% / 55% 45% 50% 50%; }
                    60% { transform: scale(1.3) rotate(3deg); opacity: 0.5; border-radius: 50% 50% 40% 60% / 45% 55% 55% 45%; }
                    85% { transform: scale(0.9) rotate(-1deg); opacity: 0.65; border-radius: 60% 40% 50% 50% / 50% 50% 40% 60%; }
                  }
                  @keyframes inkExpand3 {
                    0%,100% { transform: scale(0.75) rotate(0deg); opacity: 0.45; }
                    35% { transform: scale(1.2) rotate(6deg); opacity: 0.7; }
                    65% { transform: scale(1.1) rotate(-2deg); opacity: 0.55; }
                    90% { transform: scale(0.85) rotate(3deg); opacity: 0.6; }
                  }
                  @keyframes inkExpand4 {
                    0%,100% { transform: scale(0.6); opacity: 0.3; }
                    40% { transform: scale(1.3); opacity: 0.7; }
                    70% { transform: scale(1); opacity: 0.4; }
                  }
                  @keyframes inkTendril1 {
                    0%,100% { transform: scaleX(0.5) rotate(-5deg); opacity: 0.3; }
                    50% { transform: scaleX(1.5) rotate(10deg); opacity: 0.7; }
                  }
                  @keyframes inkTendril2 {
                    0%,100% { transform: scaleX(0.6) rotate(5deg); opacity: 0.25; }
                    50% { transform: scaleX(1.4) rotate(-8deg); opacity: 0.6; }
                  }
                `}</style>
              </div>
              )}

              {/* Wave Ripples Animation */}
              {heroAnimationEnabled && heroAnimationType === 'waveRipples' && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Ripple Source 1 — center-left */}
                {Array.from({length: 5}).map((_, i) => (
                  <div key={`rip1-${i}`} className="absolute rounded-full" style={{
                    left: '30%', top: '40%',
                    width: '0px', height: '0px',
                    border: `${1.5 - i * 0.15}px solid rgba(218,165,32,${0.4 - i * 0.06})`,
                    boxShadow: `0 0 ${10 - i * 1.5}px rgba(255,220,80,${0.15 - i * 0.02}), inset 0 0 ${8 - i}px rgba(218,165,32,${0.08 - i * 0.01})`,
                    animation: `rippleExpand ${6 + i * 0.8}s ease-out ${i * 1.2}s infinite`,
                    transform: 'translate(-50%, -50%)',
                  }} />
                ))}

                {/* Ripple Source 2 — right */}
                {Array.from({length: 5}).map((_, i) => (
                  <div key={`rip2-${i}`} className="absolute rounded-full" style={{
                    left: '70%', top: '35%',
                    width: '0px', height: '0px',
                    border: `${1.3 - i * 0.12}px solid rgba(255,220,80,${0.35 - i * 0.05})`,
                    boxShadow: `0 0 ${8 - i}px rgba(218,165,32,${0.12 - i * 0.02})`,
                    animation: `rippleExpand ${7 + i * 0.9}s ease-out ${i * 1.4 + 2}s infinite`,
                    transform: 'translate(-50%, -50%)',
                  }} />
                ))}

                {/* Ripple Source 3 — bottom center */}
                {Array.from({length: 4}).map((_, i) => (
                  <div key={`rip3-${i}`} className="absolute rounded-full" style={{
                    left: '50%', top: '65%',
                    width: '0px', height: '0px',
                    border: `${1.2 - i * 0.1}px solid rgba(200,150,30,${0.3 - i * 0.05})`,
                    boxShadow: `0 0 ${6 - i * 0.8}px rgba(218,165,32,${0.1 - i * 0.02})`,
                    animation: `rippleExpand ${8 + i * 1}s ease-out ${i * 1.6 + 1}s infinite`,
                    transform: 'translate(-50%, -50%)',
                  }} />
                ))}

                {/* Ripple Source 4 — top left accent */}
                {Array.from({length: 3}).map((_, i) => (
                  <div key={`rip4-${i}`} className="absolute rounded-full" style={{
                    left: '15%', top: '20%',
                    width: '0px', height: '0px',
                    border: `${1 - i * 0.1}px solid rgba(255,240,150,${0.25 - i * 0.05})`,
                    animation: `rippleExpand ${9 + i * 1.2}s ease-out ${i * 2 + 3}s infinite`,
                    transform: 'translate(-50%, -50%)',
                  }} />
                ))}

                {/* Central ambient glow */}
                <div className="absolute" style={{ width: '8px', height: '8px', left: '30%', top: '40%', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,220,80,0.6) 0%, rgba(218,165,32,0.2) 50%, transparent 100%)', boxShadow: '0 0 20px rgba(218,165,32,0.4)', animation: 'rippleCorePulse 3s ease-in-out infinite' }} />
                <div className="absolute" style={{ width: '6px', height: '6px', left: '70%', top: '35%', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,240,150,0.5) 0%, rgba(218,165,32,0.15) 50%, transparent 100%)', boxShadow: '0 0 15px rgba(218,165,32,0.3)', animation: 'rippleCorePulse 4s ease-in-out 1s infinite' }} />
                <div className="absolute" style={{ width: '5px', height: '5px', left: '50%', top: '65%', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,150,30,0.5) 0%, transparent 100%)', boxShadow: '0 0 12px rgba(218,165,32,0.25)', animation: 'rippleCorePulse 3.5s ease-in-out 0.5s infinite' }} />

                <style>{`
                  @keyframes rippleExpand {
                    0% { width: 0; height: 0; opacity: 1; }
                    100% { width: 600px; height: 600px; opacity: 0; }
                  }
                  @keyframes rippleCorePulse {
                    0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
                    50% { transform: translate(-50%,-50%) scale(1.8); opacity: 1; }
                  }
                `}</style>
              </div>
              )}

              {overlayComponent}
              <div className={`w-full max-w-7xl mx-auto relative z-10 ${heroLayout === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center' : ''}`}>
                <div className={`${heroLayout === 'centered' ? 'mx-auto max-w-4xl' : heroLayout === 'left' ? 'mr-auto max-w-4xl' : heroLayout === 'right' ? 'ml-auto max-w-4xl' : ''}`}>
                  {/* Logo/Image (Visible in centered/left/right) */}
                  {heroLayout !== 'split' && currentSectionData?.heroImageVisible !== false && (
                    <div className={`w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48 mb-6 sm:mb-8 ${heroLayout === 'centered' ? 'mx-auto' : heroLayout === 'right' ? 'ml-auto' : ''}`}>
                      <img src={currentSectionData?.heroImage || QUIMERA_DEFAULT_LOGO} alt="Quimera AI" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] sm:drop-shadow-[0_0_50px_rgba(250,204,21,0.6)]" />
                    </div>
                  )}

                  <h1 className={`font-black leading-tight mb-4 sm:mb-6 px-2 ${
                    ({'sm':'text-2xl sm:text-3xl md:text-4xl','md':'text-3xl sm:text-4xl md:text-5xl','lg':'text-3xl sm:text-5xl md:text-7xl','xl':'text-4xl sm:text-6xl md:text-8xl'})[currentSectionData?.headlineFontSize || 'lg'] || 'text-3xl sm:text-5xl md:text-7xl'
                  }`} style={{ color: heroTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                    {currentSectionData?.title || t('landing.heroTitle1')}
                    <span className="block" style={{ color: currentSectionData?.accentColor || '#facc15' }}>{currentSectionData?.subtitle ? '' : t('landing.heroTitle2')}</span>
                  </h1>
                  <p className={`max-w-2xl mb-8 sm:mb-10 leading-relaxed px-2 ${
                    ({'sm':'text-sm sm:text-base','md':'text-base sm:text-lg md:text-xl','lg':'text-lg sm:text-xl md:text-2xl','xl':'text-xl sm:text-2xl md:text-3xl'})[currentSectionData?.subheadlineFontSize || 'md'] || 'text-base sm:text-lg md:text-xl'
                  }`} style={{ color: `${heroTextColor}99`, marginLeft: heroLayout === 'centered' ? 'auto' : '0', marginRight: heroLayout === 'centered' ? 'auto' : '0' }}>
                    {currentSectionData?.subtitle || t('landing.heroSubtitle')}
                  </p>
                  <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 px-4 sm:px-0 ${heroLayout === 'centered' ? 'justify-center' : heroLayout === 'left' || heroLayout === 'split' ? 'justify-start' : 'justify-end'}`}>
                    <button
                      onClick={() => navigateToLink(currentSectionData?.primaryCtaLink || '/register')}
                      className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: currentSectionData?.accentColor || '#facc15',
                        color: '#000000',
                        fontFamily: `var(--font-button)`,
                        textTransform: buttonsCaps ? 'uppercase' : 'none'
                      }}
                    >
                      {currentSectionData?.primaryButtonText || t('landing.startFree')}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    {currentSectionData?.showSecondaryButton !== false && (
                      <button onClick={() => navigateToLink(currentSectionData?.secondaryCtaLink || '#features')} className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-white/10 font-semibold rounded-xl hover:bg-white/10 active:scale-[0.98] transition-all" style={{ color: heroTextColor, fontFamily: `var(--font-button)`, textTransform: buttonsCaps ? 'uppercase' : 'none' }}>
                        {currentSectionData?.secondaryButtonText || t('landing.viewFeatures')}
                      </button>
                    )}
                  </div>
                </div>

                {heroLayout === 'split' && currentSectionData?.heroImageVisible !== false && (
                  <div className="flex items-center justify-center">
                    <img
                      src={currentSectionData?.heroImage || QUIMERA_DEFAULT_LOGO}
                      alt="Hero Visual"
                      className="w-full max-w-md object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
              </div>
            </section>
          );
        }

        if (sectionType === 'heroModern') {
          const isReversed = heroLayout === 'right';
          const isCentered = heroLayout === 'centered';

          return (
            <section
              key="heroModern"
              id={`section-${sectionType}`}
              data-section-id={section.id}
              className="min-h-screen flex items-center justify-center relative overflow-hidden"
              style={sectionStyle}
            >
              {/* Hero Background Image */}
              {heroBgImageEnabled && heroBgImageUrl && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img
                    src={heroBgImageUrl}
                    alt=""
                    className="w-full h-full"
                    style={{
                      objectFit: heroBgObjectFit as any,
                      objectPosition: heroBgPosition,
                      filter: heroBgBlur > 0 ? `blur(${heroBgBlur}px)` : undefined,
                      opacity: heroBgOpacity,
                      transform: heroBgBlur > 0 ? 'scale(1.05)' : undefined,
                    }}
                  />
                </div>
              )}
              <div className="absolute inset-0 z-0 text-center">
                {currentSectionData?.heroImage && (
                  <img src={currentSectionData.heroImage} alt="Background" className="w-full h-full object-cover opacity-30 blur-sm scale-110" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t" style={{ background: `linear-gradient(to top, ${heroBackgroundColor}, ${heroBackgroundColor}cc, transparent)` }} />
              </div>
              {overlayComponent}
              <div className="relative z-10 w-full max-w-7xl px-4 sm:px-6">
                <div className={`grid grid-cols-1 ${isCentered ? 'max-w-4xl mx-auto' : 'lg:grid-cols-2'} gap-12 items-center text-center`}>
                  <div className={`space-y-8 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl ${isReversed ? 'lg:order-2 text-right' : isCentered ? 'text-center' : 'text-left'}`}>
                    <h1 className="text-4xl sm:text-6xl font-black leading-tight tracking-tight" style={{ fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                      {currentSectionData?.title || t('landing.heroTitle1')}
                    </h1>
                    <p className={`text-lg sm:text-xl leading-relaxed opacity-80 ${isCentered ? 'mx-auto' : ''}`} style={{ fontFamily: `var(--font-body)` }}>
                      {currentSectionData?.subtitle || t('landing.heroSubtitle')}
                    </p>
                    <div className={`flex flex-col sm:flex-row gap-4 pt-4 ${isReversed ? 'lg:justify-end' : isCentered ? 'justify-center' : 'justify-start'}`}>
                      <button onClick={() => navigateToLink(currentSectionData?.primaryCtaLink || '/register')} className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-all flex items-center justify-center gap-2" style={{ fontFamily: `var(--font-button)`, textTransform: buttonsCaps ? 'uppercase' : 'none' }}>
                        {currentSectionData?.primaryButtonText || t('landing.startFree')}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {!isCentered && currentSectionData?.heroImageVisible !== false && (
                    <div className={`flex items-center justify-center relative ${isReversed ? 'lg:order-1' : ''}`}>
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
                      <img src={currentSectionData?.heroImage || QUIMERA_DEFAULT_LOGO} alt="Hero Visual" className="relative w-full max-w-md object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-700" />
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        }

        if (sectionType === 'heroGradient') {
          const isLeft = heroLayout === 'left';
          const isRight = heroLayout === 'right';

          return (
            <section
              key="heroGradient"
              id={`section-${sectionType}`}
              data-section-id={section.id}
              className={`min-h-screen flex flex-col relative overflow-hidden ${isLeft ? 'items-start text-left' : isRight ? 'items-end text-right' : 'items-center text-center'} ${heroPadding < 100 ? 'pt-24' : ''} justify-end`}
              style={sectionStyle}
            >
              {/* Hero Background Image */}
              {heroBgImageEnabled && heroBgImageUrl && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img
                    src={heroBgImageUrl}
                    alt=""
                    className="w-full h-full"
                    style={{
                      objectFit: heroBgObjectFit as any,
                      objectPosition: heroBgPosition,
                      filter: heroBgBlur > 0 ? `blur(${heroBgBlur}px)` : undefined,
                      opacity: heroBgOpacity,
                      transform: heroBgBlur > 0 ? 'scale(1.05)' : undefined,
                    }}
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
              {overlayComponent}
              <div className={`relative z-10 w-full max-w-7xl px-4 sm:px-6 ${isLeft ? 'mr-auto' : isRight ? 'ml-auto' : 'mx-auto'}`}>
                <div className={`inline-block mb-6 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-medium tracking-wide`} style={{ color: heroTextColor }}>
                  ✨ {t('landing.newFeature', 'Nuevo Diseño Disponible')}
                </div>
                <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 tracking-tighter drop-shadow-lg" style={{ color: heroTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                  {currentSectionData?.title || t('landing.heroTitle1')}
                </h1>
                <p className={`text-xl sm:text-2xl max-w-3xl mb-10 font-light opacity-90 ${!isLeft && !isRight ? 'mx-auto' : ''}`} style={{ color: heroTextColor, fontFamily: `var(--font-body)` }}>
                  {currentSectionData?.subtitle || t('landing.heroSubtitle')}
                </p>
                <div className={`flex flex-col sm:flex-row gap-5 ${isLeft ? 'justify-start' : isRight ? 'justify-end' : 'justify-center'}`}>
                  <button onClick={() => navigateToLink(currentSectionData?.primaryCtaLink || '/register')} className="px-8 py-4 bg-black text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-xl flex items-center justify-center gap-2" style={{ fontFamily: `var(--font-button)`, textTransform: buttonsCaps ? 'uppercase' : 'none' }}>
                    {currentSectionData?.primaryButtonText || t('landing.startFree')}
                    <Zap className="w-5 h-5 fill-current" />
                  </button>
                </div>
                <div className={`mt-16 sm:mt-24 relative max-w-6xl w-full ${isLeft ? 'mr-auto' : isRight ? 'ml-auto' : 'mx-auto'}`}>
                  <div className="relative rounded-t-xl bg-white/5 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden ring-1 ring-white/10">
                    {/* Browser Header - Glassmorphic */}
                    <div className="h-10 bg-white/10 backdrop-blur-md flex items-center px-4 border-b border-white/10 gap-4 select-none">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/80 transition-colors" />
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 transition-colors" />
                        <div className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/80 transition-colors" />
                      </div>
                      <div className="flex-1 max-w-2xl mx-auto h-6 bg-black/20 rounded-md border border-white/5 flex items-center justify-center backdrop-blur-sm group cursor-text">
                        <div className="flex items-center gap-2 opacity-50 text-[10px] text-white font-mono group-hover:opacity-80 transition-opacity">
                          <div className="w-2 h-2 rounded-full bg-white/50"></div>
                          <span>quimera.ai</span>
                        </div>
                      </div>
                    </div>
                    {/* Browser Content - Taller Viewport */}
                    <div className="relative h-[300px] sm:h-[450px] md:h-[600px] bg-black/40 backdrop-blur-sm">
                      {currentSectionData?.heroImage ? (
                        <img
                          src={currentSectionData.heroImage}
                          alt="Website Preview"
                          className="w-full h-full object-cover object-top opacity-90 hover:opacity-100 transition-opacity duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <span className="text-lg font-medium">No image selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section >
          );
        }

        return null;
      }

      case 'features': {
        // Get Features section style values from section data
        const fp = section.data || {};
        const fBg = fp.backgroundColor || '#0A0A0A';
        const fText = fp.textColor || '#ffffff';
        const fAccent = fp.accentColor || '#facc15';
        const fVariant = fp.featuresVariant || 'classic';
        const fCols = fp.columns || fp.gridColumns || 3;
        const fShowIcons = fp.showIcons !== false;
        const fShowHeader = fp.showSectionHeader !== false;
        const fImgHeight = fp.imageHeight || 200;
        const fImgFit = fp.imageObjectFit || 'cover';
        const fAnimEnabled = fp.enableCardAnimation !== false;
        const fAnimType = fp.animationType || 'fade-in-up';
        const fOverlayAlign = fp.overlayTextAlignment || 'left';

        // Card colors
        const fCardBg = fp.colors?.cardBackground || `${fText}08`;
        const fCardHeading = fp.colors?.cardHeading || fText;
        const fCardText = fp.colors?.cardText || `${fText}99`;
        const fCardBorder = fp.colors?.borderColor || `${fText}15`;
        const fDescColor = fp.colors?.description || `${fText}99`;

        // Padding: support both numeric `padding` and string `paddingY`/`paddingX`
        const paddingMap: Record<string, string> = { none: '0px', sm: '32px', md: '48px', lg: '80px', xl: '120px' };
        const fPadY = fp.paddingY ? (paddingMap[fp.paddingY] || '80px') : (fp.padding ? `${fp.padding}px` : '80px');
        const fPadX = fp.paddingX ? (paddingMap[fp.paddingX] || '24px') : '24px';

        // Title font size
        const titleSizeMap: Record<string, string> = { sm: '1.5rem', md: '2.25rem', lg: '3rem', xl: '3.75rem' };
        const fTitleSize = titleSizeMap[fp.titleFontSize || 'md'] || '2.25rem';
        const descSizeMap: Record<string, string> = { sm: '0.75rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' };
        const fDescSize = descSizeMap[fp.descriptionFontSize || 'md'] || '1rem';

        const featureItems = fp.features || features;

        // Animation CSS helper
        const getAnimStyle = (index: number) => {
          if (!fAnimEnabled || fAnimType === 'none') return {};
          const delay = `${index * 0.1}s`;
          const base = { animationDelay: delay, animationDuration: '0.6s', animationFillMode: 'both' as const };
          switch (fAnimType) {
            case 'fade-in': return { ...base, animation: `fadeIn 0.6s ease ${delay} both` };
            case 'fade-in-up': return { ...base, animation: `fadeInUp 0.6s ease ${delay} both` };
            case 'fade-in-down': return { ...base, animation: `fadeInDown 0.6s ease ${delay} both` };
            case 'slide-up': return { ...base, animation: `slideUp 0.6s ease ${delay} both` };
            case 'scale-in': return { ...base, animation: `scaleIn 0.6s ease ${delay} both` };
            case 'bounce-in': return { ...base, animation: `bounceIn 0.8s ease ${delay} both` };
            default: return {};
          }
        };

        // Render a single feature card based on variant
        const renderFeatureCard = (feature: any, index: number) => {
          if (fVariant === 'image-overlay') {
            // Image Overlay variant
            return (
              <div
                key={index}
                className="relative rounded-xl sm:rounded-2xl overflow-hidden group hover:scale-[1.02] active:scale-[0.99] transition-all"
                style={{ ...getAnimStyle(index), height: `${fImgHeight + 100}px` }}
              >
                {feature.imageUrl && (
                  <img
                    src={feature.imageUrl}
                    alt={feature.title || ''}
                    className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110"
                    style={{ objectFit: fImgFit as any }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div
                  className={`absolute bottom-0 left-0 right-0 p-5 sm:p-6 ${
                    fOverlayAlign === 'center' ? 'text-center' : fOverlayAlign === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2" style={{ color: fCardHeading }}>
                    {feature.title || (feature.titleKey ? t(feature.titleKey) : '')}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: fCardText }}>
                    {feature.description || (feature.descKey ? t(feature.descKey) : '')}
                  </p>
                </div>
              </div>
            );
          }

          // Classic / Bento / Premium variants
          return (
            <div
              key={index}
              className={`rounded-xl sm:rounded-2xl overflow-hidden hover:scale-[1.02] active:scale-[0.99] transition-all ${
                fVariant === 'bento-premium' && index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
              }`}
              style={{
                backgroundColor: fCardBg,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: fCardBorder,
                ...getAnimStyle(index),
              }}
            >
              {/* Feature image */}
              {feature.imageUrl && (
                <div style={{ height: `${fImgHeight}px`, overflow: 'hidden' }}>
                  <img
                    src={feature.imageUrl}
                    alt={feature.title || ''}
                    className="w-full h-full transition-transform duration-500 hover:scale-110"
                    style={{ objectFit: fImgFit as any }}
                  />
                </div>
              )}
              <div className="p-5 sm:p-8">
                {fShowIcons && (
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6"
                    style={{ backgroundColor: `${fAccent}15`, color: fAccent }}
                  >
                    {feature.icon || <Zap className="w-6 h-6" />}
                  </div>
                )}
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3" style={{ color: fCardHeading }}>
                  {feature.title || (feature.titleKey ? t(feature.titleKey) : '')}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: fCardText }}>
                  {feature.description || (feature.descKey ? t(feature.descKey) : '')}
                </p>
              </div>
            </div>
          );
        };

        // Grid class based on variant
        const gridClass = fVariant === 'modern'
          ? `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${fCols} gap-4 sm:gap-6 auto-rows-auto`
          : fVariant === 'bento-premium'
          ? `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${fCols} gap-4 sm:gap-6`
          : `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${fCols} gap-4 sm:gap-6`;

        return (
          <section
            key={section.id}
            id={`section-${sectionType}`}
            data-section-id={section.id}
            style={{
              backgroundColor: fBg,
              color: fText,
              paddingTop: fPadY,
              paddingBottom: fPadY,
              paddingLeft: fPadX,
              paddingRight: fPadX,
              position: 'relative' as const,
              overflow: 'hidden' as const,
            }}
          >
            <SectionBgImage sectionData={fp} />
            {/* Animation keyframes */}
            {fAnimEnabled && fAnimType !== 'none' && (
              <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeInDown { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
                @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
              `}</style>
            )}
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              {fShowHeader && (
                <div className="text-center mb-10 sm:mb-16">
                  <h2 className="font-bold mb-3 sm:mb-4 px-2" style={{ color: fText, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none', fontSize: fTitleSize }}>
                    {fp.title || t('landing.featuresTitle')}
                    <span style={{ color: fAccent }}> {fp.title ? '' : t('landing.featuresTitleHighlight')}</span>
                  </h2>
                  <p className="max-w-2xl mx-auto px-2" style={{ color: fDescColor, fontSize: fDescSize }}>
                    {fp.subtitle || t('landing.featuresSubtitle')}
                  </p>
                </div>
              )}

              <div className={gridClass}>
                {featureItems.map((feature: any, index: number) => renderFeatureCard(feature, index))}
              </div>
            </div>
          </section>
        );
      }

      case 'pricing': {
        // Get Pricing section style values from section data — read from colors.* (written by controls)
        const pp = section.data || {};
        const ppColors = pp.colors || {};
        const pricingBackgroundColor = ppColors.background || pp.backgroundColor || '#0A0A0A';
        const pricingTextColor = ppColors.heading || pp.textColor || '#ffffff';
        const pricingDescColor = ppColors.description || `${pricingTextColor}99`;
        const pricingBodyText = ppColors.text || `${pricingTextColor}99`;
        const pricingAccentColor = ppColors.accent || pp.accentColor || '#facc15';

        // Card colors
        const pCardBg = ppColors.cardBackground || `${pricingTextColor}08`;
        const pCardHeading = ppColors.cardHeading || pricingTextColor;
        const pCardText = ppColors.cardText || `${pricingTextColor}99`;
        const pPriceColor = ppColors.priceColor || pricingTextColor;
        const pBorderColor = ppColors.borderColor || `${pricingTextColor}15`;
        const pCheckColor = ppColors.checkmarkColor || pricingAccentColor;

        // Button colors
        const pBtnBg = ppColors.buttonBackground || pricingAccentColor;
        const pBtnText = ppColors.buttonText || pricingBackgroundColor;

        // Gradient colors (for gradient variant)
        const pGradStart = ppColors.gradientStart || '#4f46e5';
        const pGradEnd = ppColors.gradientEnd || '#7c3aed';

        // Padding: support paddingY/paddingX string tokens and numeric padding fallback
        const pPaddingMap: Record<string, string> = { none: '0px', sm: '32px', md: '48px', lg: '80px', xl: '120px' };
        const pPadY = pp.paddingY ? (pPaddingMap[pp.paddingY] || '80px') : (pp.padding ? `${pp.padding}px` : '80px');
        const pPadX = pp.paddingX ? (pPaddingMap[pp.paddingX] || '24px') : '24px';

        // Card border radius
        const pRadiusMap: Record<string, string> = { none: '0px', sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', '2xl': '1.5rem' };
        const pCardRadius = pRadiusMap[pp.cardBorderRadius || 'xl'] || '1rem';

        // Pricing variant
        const pVariant = pp.pricingVariant || 'classic';

        // Determine if we should show the popular highlight
        const shouldHighlightPopular = pp.highlightPopular !== false;
        const showBillingToggle = pp.showBillingToggle !== false;

        // Card style based on variant
        const getCardStyle = (isPop: boolean, idx: number) => {
          const base: React.CSSProperties = {
            animationDelay: `${idx * 100}ms`,
            borderRadius: pCardRadius,
          };
          if (pVariant === 'gradient') {
            return {
              ...base,
              background: isPop
                ? `linear-gradient(135deg, ${pGradStart}, ${pGradEnd})`
                : `linear-gradient(135deg, ${pCardBg}, ${pCardBg})`,
              borderWidth: isPop ? '2px' : '1px',
              borderStyle: 'solid' as const,
              borderColor: isPop ? `${pricingAccentColor}50` : pBorderColor,
              boxShadow: isPop ? `0 20px 50px ${pricingAccentColor}20` : 'none',
            };
          }
          if (pVariant === 'glassmorphism') {
            return {
              ...base,
              background: isPop ? `${pricingAccentColor}15` : 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderWidth: '1px',
              borderStyle: 'solid' as const,
              borderColor: isPop ? `${pricingAccentColor}40` : 'rgba(255,255,255,0.1)',
              boxShadow: isPop ? `0 20px 50px ${pricingAccentColor}20` : '0 8px 32px rgba(0,0,0,0.1)',
            };
          }
          if (pVariant === 'minimalist') {
            return {
              ...base,
              backgroundColor: 'transparent',
              borderWidth: isPop ? '2px' : '1px',
              borderStyle: 'solid' as const,
              borderColor: isPop ? pricingAccentColor : pBorderColor,
              boxShadow: 'none',
            };
          }
          // classic
          return {
            ...base,
            backgroundColor: isPop ? `${pricingAccentColor}15` : pCardBg,
            borderWidth: isPop ? '2px' : '1px',
            borderStyle: 'solid' as const,
            borderColor: isPop ? `${pricingAccentColor}50` : pBorderColor,
            boxShadow: isPop ? `0 20px 50px ${pricingAccentColor}20` : 'none',
          };
        };

        return (
          <section
            key={section.id}
            id={`section-${sectionType}`}
            data-section-id={section.id}
            style={{
              backgroundColor: pricingBackgroundColor,
              color: pricingTextColor,
              paddingTop: pPadY,
              paddingBottom: pPadY,
              paddingLeft: pPadX,
              paddingRight: pPadX,
              position: 'relative' as const,
              overflow: 'hidden' as const,
            }}
          >
            <SectionBgImage sectionData={section.data || {}} />
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="text-center mb-10 sm:mb-16">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2" style={{ color: pricingTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                  {pp.title || t('landing.pricingTitle')} <span style={{ color: pricingAccentColor }}>{pp.title ? '' : t('landing.pricingTitleHighlight')}</span>
                </h2>
                <p className="text-sm sm:text-base max-w-2xl mx-auto px-2" style={{ color: pricingDescColor }}>
                  {pp.subtitle || t('landing.pricingSubtitle')}
                </p>

                {/* Billing Toggle - Monthly/Annual */}
                {showBillingToggle && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <span className="text-sm" style={{ color: !isAnnualBilling ? pricingTextColor : pricingBodyText, fontWeight: !isAnnualBilling ? 600 : 400, transition: 'all 0.3s' }}>{t('landing.monthly', 'Mensual')}</span>
                    <button
                      onClick={() => setIsAnnualBilling(!isAnnualBilling)}
                      className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1"
                      style={{
                        backgroundColor: isAnnualBilling ? pricingAccentColor : `${pricingAccentColor}33`,
                        '--tw-ring-color': `${pricingAccentColor}50`,
                      } as React.CSSProperties}
                      aria-label={t('landing.toggleBilling', 'Cambiar facturación')}
                    >
                      <span
                        className="absolute top-1 w-5 h-5 rounded-full transition-all duration-300 shadow-md"
                        style={{
                          backgroundColor: isAnnualBilling ? pricingBackgroundColor : pricingAccentColor,
                          left: isAnnualBilling ? 'calc(100% - 24px)' : '4px',
                        }}
                      />
                    </button>
                    <span className="text-sm" style={{ color: isAnnualBilling ? pricingTextColor : pricingBodyText, fontWeight: isAnnualBilling ? 600 : 400, transition: 'all 0.3s' }}>
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
                        className={`relative p-5 sm:p-8 transition-all hover:scale-[1.02] active:scale-[0.99] ${isPlanPopular
                          ? 'order-first md:order-none md:scale-105 shadow-xl'
                          : ''
                          }`}
                        style={getCardStyle(isPlanPopular, index)}
                      >
                        {isPlanPopular && (
                          <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
                            <div
                              className="animate-pulse flex items-center gap-1.5 px-4 py-1.5 text-xs sm:text-sm font-bold rounded-full whitespace-nowrap"
                              style={{
                                background: `linear-gradient(90deg, ${pBtnBg}, ${pBtnBg}dd)`,
                                color: pBtnText,
                                boxShadow: `0 4px 20px ${pricingAccentColor}40`,
                              }}
                            >
                              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                              {t('landing.mostPopular')}
                            </div>
                          </div>
                        )}
                        <h3 className="text-xl sm:text-2xl font-bold mb-2 mt-2 sm:mt-0" style={{ color: pCardHeading }}>{plan.name}</h3>
                        <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: pCardText }}>{plan.description}</p>
                        <div className="mb-4 sm:mb-6">
                          <span className="text-3xl sm:text-4xl font-black" style={{ color: pPriceColor }}>
                            {isAnnualBilling ? plan.annualPrice : plan.price}
                          </span>
                          <span className="text-sm sm:text-base" style={{ color: `${pPriceColor}66` }}>{plan.period}</span>
                          {plan.priceValue > 0 && !isAnnualBilling && plan.annualPriceValue < plan.priceValue && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-bold text-green-400 bg-green-400/10 rounded-full">
                              {t('landing.saveAnnually', 'Ahorra 20%')}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base" style={{ color: pCardText }}>
                              <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" style={{ color: pCheckColor }} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => navigateToLink('/register')}
                          className="w-full py-2.5 sm:py-3 font-semibold transition-all active:scale-[0.98]"
                          style={{
                            borderRadius: pCardRadius,
                            background: isPlanPopular ? `linear-gradient(90deg, ${pBtnBg}, ${pBtnBg}dd)` : `${pBtnBg}15`,
                            color: isPlanPopular ? pBtnText : pricingTextColor,
                            boxShadow: isPlanPopular ? `0 8px 25px ${pBtnBg}30` : 'none',
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
      }

      case 'testimonials': {
        // Get Testimonials section style values from section data
        const testimonialsPreview = section.data || {};
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
            key={section.id}
            id={`section-${sectionType}`}
            data-section-id={section.id}
            className="py-16 sm:py-20 md:py-24 relative overflow-hidden"
            style={{
              backgroundColor: testimonialsBackgroundColor,
              color: testimonialsTextColor,
              paddingTop: `${testimonialsPadding}px`,
              paddingBottom: `${testimonialsPadding}px`,
            }}
          >
            <SectionBgImage sectionData={section.data || {}} />
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
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

            {/* Bottom Gold Waves */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <svg
                className="absolute"
                style={{ width: '300%', height: '40%', left: '-100%', bottom: '-10%' }}
                viewBox="0 0 3000 500"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="goldTest1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(120,80,10,0)" />
                    <stop offset="10%" stopColor="rgba(160,110,20,0.3)" />
                    <stop offset="30%" stopColor="rgba(218,165,32,0.7)" />
                    <stop offset="50%" stopColor="rgba(255,220,80,1)" />
                    <stop offset="70%" stopColor="rgba(218,165,32,0.7)" />
                    <stop offset="90%" stopColor="rgba(160,110,20,0.3)" />
                    <stop offset="100%" stopColor="rgba(120,80,10,0)" />
                  </linearGradient>
                  <linearGradient id="goldTestShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(80,50,5,0)" />
                    <stop offset="20%" stopColor="rgba(100,60,10,0.4)" />
                    <stop offset="50%" stopColor="rgba(140,90,15,0.6)" />
                    <stop offset="80%" stopColor="rgba(100,60,10,0.4)" />
                    <stop offset="100%" stopColor="rgba(80,50,5,0)" />
                  </linearGradient>
                  <linearGradient id="goldTestHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,230,120,0)" />
                    <stop offset="25%" stopColor="rgba(255,240,150,0.2)" />
                    <stop offset="50%" stopColor="rgba(255,250,200,0.6)" />
                    <stop offset="75%" stopColor="rgba(255,240,150,0.2)" />
                    <stop offset="100%" stopColor="rgba(255,230,120,0)" />
                  </linearGradient>
                  <filter id="softGlowTest">
                    <feGaussianBlur stdDeviation="12" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="deepShadowTest">
                    <feGaussianBlur stdDeviation="20" />
                  </filter>
                  <filter id="specularTest">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M-200,280 C200,380 500,180 900,320 C1300,460 1600,220 2000,340 C2400,460 2700,260 3200,300"
                  fill="none" stroke="url(#goldTestShadow)" strokeWidth="90" strokeLinecap="round"
                  filter="url(#deepShadowTest)" opacity="0.5"
                  style={{ animation: 'goldFlowBot1 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                />
                <path
                  d="M-200,260 C200,360 500,160 900,300 C1300,440 1600,200 2000,320 C2400,440 2700,240 3200,280"
                  fill="none" stroke="url(#goldTest1)" strokeWidth="65" strokeLinecap="round"
                  filter="url(#softGlowTest)"
                  style={{ animation: 'goldFlowBot1 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                />
                <path
                  d="M-200,255 C200,358 500,155 900,295 C1300,438 1600,195 2000,315 C2400,438 2700,235 3200,275"
                  fill="none" stroke="url(#goldTestHighlight)" strokeWidth="18" strokeLinecap="round"
                  filter="url(#specularTest)"
                  style={{ animation: 'goldFlowBot1 22s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}
                />
                <path
                  d="M-200,240 C250,310 550,170 850,270 C1150,370 1450,190 1750,270 C2050,350 2350,180 2650,260 C2950,340 3100,230 3200,260"
                  fill="none" stroke="url(#goldTestHighlight)" strokeWidth="8" strokeLinecap="round"
                  filter="url(#specularTest)" opacity="0.6"
                  style={{ animation: 'goldFlowBot2 28s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite reverse' }}
                />
              </svg>
              <div className="absolute inset-0" style={{ opacity: 0.3 }}>
                <div className="absolute rounded-full" style={{
                  width: '280px', height: '280px', left: '15%', bottom: '5%',
                  background: 'radial-gradient(circle, rgba(218,165,32,0.12) 0%, transparent 70%)',
                  filter: 'blur(45px)', animation: 'bokeh1 18s ease-in-out infinite reverse',
                }} />
                <div className="absolute rounded-full" style={{
                  width: '220px', height: '220px', right: '20%', bottom: '8%',
                  background: 'radial-gradient(circle, rgba(255,200,50,0.1) 0%, transparent 70%)',
                  filter: 'blur(40px)', animation: 'bokeh2 22s ease-in-out infinite reverse',
                }} />
              </div>
            </div>

          </section>
        );
      }

      case 'screenshotCarousel': {
        const carouselPreview = section.data || {};
        const carouselBackgroundColor = carouselPreview?.backgroundColor || '#0A0A0A';
        const carouselTextColor = carouselPreview?.textColor || '#ffffff';
        const carouselPadding = carouselPreview?.padding || 80;

        const carouselData = {
          images: carouselPreview?.images || [],
          autoScroll: carouselPreview?.autoScroll ?? true,
          scrollDirection: (carouselPreview?.scrollDirection || 'left') as 'left' | 'right',
          scrollSpeed: carouselPreview?.scrollSpeed || 50,
          pauseOnHover: carouselPreview?.pauseOnHover ?? true,
          gap: 16,
          showNavigation: carouselPreview?.showNavigation ?? true,
          showScrollbar: carouselPreview?.showScrollbar ?? false,
          aspectRatio: (carouselPreview?.aspectRatio || '16:9') as '16:9' | '4:3' | '3:2' | '1:1' | 'custom',
          variant: (carouselPreview?.variant || 'basic') as 'basic' | 'gradient' | 'cards' | 'modern',
          colors: {
            background: 'transparent',
          },
        };

        return (
          <section
            key={section.id}
            id={`section-${sectionType}`}
            data-section-id={section.id}
            className="py-16 sm:py-20 md:py-24 overflow-hidden"
            style={{
              backgroundColor: carouselBackgroundColor,
              color: carouselTextColor,
              paddingTop: `${carouselPadding}px`,
              paddingBottom: `${carouselPadding}px`,
            }}
          >
            <div className="container mx-auto px-4 sm:px-6 mb-8 sm:mb-12 text-center">
              {(carouselPreview?.title || carouselPreview?.subtitle) && (
                <div className="max-w-3xl mx-auto mb-8 sm:mb-12">
                  {carouselPreview?.title && (
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4"
                      style={{
                        color: carouselTextColor,
                        fontFamily: `var(--font-heading)`,
                        textTransform: headingsCaps ? 'uppercase' : 'none',
                      }}>
                      {carouselPreview.title}
                    </h2>
                  )}
                  {carouselPreview?.subtitle && (
                    <p className="text-base sm:text-lg" style={{ color: `${carouselTextColor}cc` }}>
                      {carouselPreview.subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>

            <ImageCarousel
              data={carouselData}
              isEditing={false}
            />
          </section>
        );
      }

      case 'cta': {
        // Get CTA section style values — read from colors.* (written by controls)
        const ct = section.data || {};
        const ctColors = ct.colors || {};
        const ctaBgColor = ctColors.background || ct.backgroundColor || '#050505';
        const ctaHeadingColor = ctColors.heading || ct.textColor || '#ffffff';
        const ctaDescColor = ctColors.text || `${ctaHeadingColor}99`;
        const ctaBtnBg = ctColors.buttonBackground || ct.accentColor || '#ffffff';
        const ctaBtnText = ctColors.buttonText || ctaBgColor;
        const ctaGradStart = ctColors.gradientStart || '#4f46e5';
        const ctaGradEnd = ctColors.gradientEnd || '#7c3aed';

        // Padding tokens
        const ctPadMap: Record<string, string> = { none: '0px', sm: '32px', md: '48px', lg: '80px', xl: '120px' };
        const ctPadY = ct.paddingY ? (ctPadMap[ct.paddingY] || '80px') : (ct.padding ? `${ct.padding}px` : '80px');
        const ctPadX = ct.paddingX ? (ctPadMap[ct.paddingX] || '24px') : '24px';

        // Corner gradient
        const ctCorner = ct.cornerGradient || {};
        const ctCornerEnabled = ctCorner.enabled || false;
        const ctCornerColor = ctCorner.color || '#ffffff';
        const ctCornerOpacity = (ctCorner.opacity ?? 20) / 100;
        const ctCornerSize = ctCorner.size || 50;
        const ctCornerPos = ctCorner.position || 'top-left';
        const ctCornerPositionMap: Record<string, string> = {
          'top-left': 'top: 0; left: 0',
          'top-right': 'top: 0; right: 0',
          'bottom-left': 'bottom: 0; left: 0',
          'bottom-right': 'bottom: 0; right: 0',
        };

        // Background pattern
        const ctShowPattern = ct.showPattern ?? false;

        return (
          <section
            key="cta"
            id="section-cta"
            data-section-id={section.id}
            style={{
              background: ctColors.gradientStart
                ? `linear-gradient(135deg, ${ctaGradStart}, ${ctaGradEnd})`
                : ctaBgColor,
              color: ctaHeadingColor,
              paddingTop: ctPadY,
              paddingBottom: ctPadY,
              paddingLeft: ctPadX,
              paddingRight: ctPadX,
              position: 'relative' as const,
              overflow: 'hidden' as const,
            }}
          >
            <SectionBgImage sectionData={section.data || {}} />

            {/* Corner gradient overlay */}
            {ctCornerEnabled && (
              <div
                className="absolute pointer-events-none"
                style={{
                  ...Object.fromEntries(ctCornerPositionMap[ctCornerPos]?.split('; ').map(s => s.split(': ')) || []),
                  width: `${ctCornerSize}%`,
                  height: `${ctCornerSize}%`,
                  background: `radial-gradient(circle at ${ctCornerPos.replace('-', ' ')}, ${ctCornerColor}${Math.round(ctCornerOpacity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
                  zIndex: 1,
                }}
              />
            )}

            {/* Background pattern */}
            {ctShowPattern && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, ${ctaHeadingColor}08 1px, transparent 0)`,
                  backgroundSize: '32px 32px',
                  zIndex: 1,
                }}
              />
            )}

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <h2
                  className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-2"
                  style={{
                    color: ctaHeadingColor,
                    fontFamily: `var(--font-heading)`,
                    textTransform: headingsCaps ? 'uppercase' : 'none',
                  }}
                >
                  {ct.title || t('landing.ctaTitle')}
                </h2>
                <p
                  className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 px-2"
                  style={{ color: ctaDescColor }}
                >
                  {ct.description || ct.subtitle || t('landing.ctaSubtitle')}
                </p>
                <button
                  onClick={() => navigateToLink(ct.buttonLink || '/register')}
                  className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 font-bold text-base sm:text-lg rounded-xl hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 sm:gap-3 mx-4 sm:mx-0"
                  style={{
                    backgroundColor: ctaBtnBg,
                    color: ctaBtnText,
                    fontFamily: `var(--font-button)`,
                    textTransform: buttonsCaps ? 'uppercase' : 'none',
                  }}
                >
                  {ct.buttonText || t('landing.startFree')}
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <p className="mt-3 sm:mt-4 text-xs sm:text-sm" style={{ color: `${ctaHeadingColor}66` }}>
                  {t('landing.noCreditCard')}
                </p>
              </div>
            </div>
          </section>
        );
      }

      case 'faq': {
        // Get FAQ section style values — read from colors.* (written by controls)
        const fq = section.data || {};
        const fqColors = fq.colors || {};
        const faqBackgroundColor = fqColors.background || fq.backgroundColor || '#0A0A0A';
        const faqTextColor = fqColors.heading || fq.textColor || '#ffffff';
        const faqDescColor = fqColors.description || `${faqTextColor}99`;
        const faqAccentColor = fqColors.accent || fq.accentColor || '#facc15';
        const faqCardBg = fqColors.cardBackground || `${faqTextColor}08`;
        const faqQuestionColor = fqColors.text || faqTextColor;
        const faqBorderColor = fqColors.borderColor || `${faqTextColor}15`;
        const faqGradStart = fqColors.gradientStart || '#6366f1';
        const faqGradEnd = fqColors.gradientEnd || '#8b5cf6';

        // Padding tokens
        const fqPadMap: Record<string, string> = { none: '0px', sm: '32px', md: '48px', lg: '80px', xl: '120px' };
        const fqPadY = fq.paddingY ? (fqPadMap[fq.paddingY] || '80px') : (fq.padding ? `${fq.padding}px` : '80px');
        const fqPadX = fq.paddingX ? (fqPadMap[fq.paddingX] || '24px') : '24px';

        // Variant: controls write faqVariant, fallback to style
        const faqStyle = fq.faqVariant || fq.style || 'classic';
        const allowMultipleOpen = fq.allowMultipleOpen ?? false;
        // Controls write to items[], legacy data may use faqs[]
        const faqs = fq.items || fq.faqs || [];

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

        // Card style generator based on variant
        const getFaqCardStyle = (isOpen: boolean): React.CSSProperties => {
          if (faqStyle === 'gradient') {
            return {
              background: isOpen
                ? `linear-gradient(135deg, ${faqGradStart}20, ${faqGradEnd}20)`
                : `linear-gradient(135deg, ${faqCardBg}, ${faqCardBg})`,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: isOpen ? `${faqAccentColor}30` : faqBorderColor,
            };
          }
          if (faqStyle === 'minimal') {
            return {
              backgroundColor: 'transparent',
              borderWidth: '0',
              borderBottomWidth: '1px',
              borderStyle: 'solid',
              borderColor: faqBorderColor,
            };
          }
          if (faqStyle === 'cards') {
            return {
              backgroundColor: faqCardBg,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: faqBorderColor,
            };
          }
          // classic (accordion)
          return {
            backgroundColor: isOpen ? `${faqAccentColor}10` : faqCardBg,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: isOpen ? `${faqAccentColor}30` : faqBorderColor,
          };
        };

        return (
          <section
            key="faq"
            id="section-faq"
            data-section-id={section.id}
            style={{
              backgroundColor: faqBackgroundColor,
              color: faqTextColor,
              paddingTop: fqPadY,
              paddingBottom: fqPadY,
              paddingLeft: fqPadX,
              paddingRight: fqPadX,
              position: 'relative' as const,
              overflow: 'hidden' as const,
            }}
          >
            <SectionBgImage sectionData={section.data || {}} />
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="text-center mb-10 sm:mb-16">
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 px-2" style={{ color: faqTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                  {fq.title || t('landing.faqTitle', 'Preguntas')}
                  <span style={{ color: faqAccentColor }}> {t('landing.faqTitleHighlight', 'Frecuentes')}</span>
                </h2>
                <p className="text-sm sm:text-base max-w-2xl mx-auto px-2" style={{ color: faqDescColor }}>
                  {fq.description || fq.subtitle || t('landing.faqSubtitle', 'Todo lo que necesitas saber sobre Quimera.ai')}
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
                        style={getFaqCardStyle(false)}
                      >
                        <h3 className="text-lg font-semibold mb-3" style={{ color: faqQuestionColor }}>
                          {faq.question}
                        </h3>
                        <p className="text-sm sm:text-base leading-relaxed" style={{ color: faqDescColor }}>
                          {faq.answer}
                        </p>
                      </div>
                    );
                  }

                  if (faqStyle === 'minimal') {
                    return (
                      <div
                        key={index}
                        className="pb-4 mb-4"
                        style={{ borderBottom: `1px solid ${faqBorderColor}` }}
                      >
                        <h3 className="text-lg font-semibold mb-2" style={{ color: faqQuestionColor }}>
                          {faq.question}
                        </h3>
                        <p className="text-sm sm:text-base leading-relaxed" style={{ color: faqDescColor }}>
                          {faq.answer}
                        </p>
                      </div>
                    );
                  }

                  // Default: accordion/classic/gradient style
                  return (
                    <div
                      key={index}
                      className="rounded-xl overflow-hidden transition-all"
                      style={getFaqCardStyle(isOpen)}
                    >
                      <button
                        onClick={() => toggleFaq(index, allowMultipleOpen)}
                        className="w-full flex items-center justify-between p-5 text-left transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="text-base sm:text-lg font-semibold pr-4" style={{ color: faqQuestionColor }}>
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
                          style={{ color: faqDescColor }}
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
            <a href="/" className="flex items-center">
              <img
                src={QUIMERA_FULL_LOGO}
                alt="Quimera.ai"
                className="h-8 sm:h-10 w-auto"
              />
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
                  {getTranslatedLabel(item.label)}
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
                  {getTranslatedLabel(headerPreview?.loginText || navigation.header.cta?.loginText || t('landing.login'))}
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
                  {getTranslatedLabel(headerPreview?.registerText || navigation.header.cta?.registerText || t('landing.register'))}
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
                    {getTranslatedLabel(item.label)}
                    {item.isNew && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-yellow-400 text-black rounded-full font-bold">NEW</span>
                    )}
                  </button>
                ))}
              </nav>
              <div className="flex flex-col gap-3">
                {(headerPreview?.showLoginButton ?? true) && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNavigateToLogin();
                    }}
                    className="w-full py-3 text-center text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors"
                    style={{ textTransform: buttonsCaps ? 'uppercase' : 'none' }}
                  >
                    {getTranslatedLabel(headerPreview?.loginText || navigation.header.cta?.loginText || t('landing.login'))}
                  </button>
                )}
                {(headerPreview?.showRegisterButton ?? true) && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNavigateToRegister();
                    }}
                    className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                    style={{
                      fontFamily: `var(--font-button)`,
                      textTransform: buttonsCaps ? 'uppercase' : 'none',
                    }}
                  >
                    {getTranslatedLabel(headerPreview?.registerText || navigation.header.cta?.registerText || t('landing.register'))}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* === DYNAMICALLY ORDERED SECTIONS === */}
      {orderedSections.map(section => renderSection(section))}

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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
              {/* Logo Column */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center mb-4">
                  <img src={QUIMERA_FULL_LOGO} alt="Quimera.ai" className="h-8 w-auto" />
                </div>
                <p className="text-sm mb-4" style={{ color: `${footerTextColor}80` }}>
                  {footerPreview?.tagline || t('landing.footerTagline', 'Build amazing websites with AI')}
                </p>

                {/* Social Links - controlled by editor's showSocialLinks toggle */}
                {(footerPreview?.showSocialLinks !== false) && navigation.footer.socialLinks && navigation.footer.socialLinks.length > 0 && (
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
                  <h4 className="font-semibold text-white mb-4">{getTranslatedLabel(column.title)}</h4>
                  <ul className="space-y-2">
                    {column.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => handleNavItemClick(item)}
                          className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                          {getTranslatedLabel(item.label)}
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
                    {navigation.footer.newsletterTitle || t('landing.footerNewsletterTitle', 'Mantente al día')}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {navigation.footer.newsletterDescription || t('landing.footerNewsletterDesc', 'Recibe las últimas noticias y actualizaciones')}
                  </p>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
                    const email = emailInput?.value?.trim();
                    if (!email) return;
                    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
                    const originalText = btn.textContent;
                    try {
                      btn.disabled = true;
                      btn.textContent = '...';
                      await savePlatformLead({
                        name: email.split('@')[0],
                        email,
                        source: 'newsletter',
                        status: 'new',
                        score: 30,
                        tags: ['newsletter', 'landing'],
                      });
                      emailInput.value = '';
                      btn.textContent = '✓';
                      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
                    } catch (err) {
                      console.error('[Newsletter] Error saving lead:', err);
                      btn.textContent = 'Error';
                      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    required
                    placeholder={t('landing.footerEmailPlaceholder', 'Ingresa tu email')}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-400/50"
                  />
                  <button type="submit" className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors text-sm">
                    {t('landing.footerSubscribe', 'Suscribirse')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/10 md:flex-row md:justify-between">
            <div className="text-xs sm:text-sm text-gray-500">
              {footerPreview?.copyright || navigation.footer.bottomText || `© ${new Date().getFullYear()} Quimera.ai. ${t('landing.footerRights', 'Todos los derechos reservados.')}`}
            </div>

            {/* Legal Links - controlled by editor's showLegalLinks toggle */}
            {(footerPreview?.showLegalLinks !== false) && (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              {[
                { href: '/changelog', label: t('landing.footerChangelog', 'Changelog') },
                { href: '/help-center', label: t('landing.footerHelpCenter', 'Centro de Ayuda') },
                { href: '/privacy-policy', label: t('landing.footerPrivacy', 'Política de Privacidad') },
                { href: '/terms-of-service', label: t('landing.footerTerms', 'Términos de Servicio') },
                { href: '/cookie-policy', label: t('landing.footerCookies', 'Política de Cookies') },
                { href: '/data-deletion', label: t('landing.footerDataDeletion', 'Eliminación de Datos') },
              ].map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    window.history.pushState(null, '', link.href);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLandingPage;
