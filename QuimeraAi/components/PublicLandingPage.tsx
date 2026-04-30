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
import CtaSection from './CtaSection';

import LanguageSelector from './ui/LanguageSelector';
import ImageCarousel from './ImageCarousel';
import Separator from './Separator';
import { useSafeAppContent } from '../contexts/appContent';
import { AppArticle, AppNavItem, DEFAULT_APP_NAVIGATION } from '../types/appContent';
import { useLandingPlans } from '../hooks/useLandingPlans';
import { doc, getDoc, collection, getDocs } from '../firebase';
import { db } from '../firebase';
import { savePlatformLead } from '../services/platformLeadService';
import { fontStacks, resolveFontFamily, loadGoogleFontsSync } from '../utils/fontLoader';
import Header from './Header';
import SectionBackground from './ui/SectionBackground';
import Hero from './Hero';
import HeroModern from './HeroModern';
import HeroGradient from './HeroGradient';
import Features from './Features';
import Pricing from './Pricing';
import Testimonials from './Testimonials';
import Faq from './Faq';

// Import Quimera Suite Components
import HeroQuimera from './quimera/HeroQuimera';
import FeaturesQuimera from './quimera/FeaturesQuimera';
import PricingQuimera from './quimera/PricingQuimera';
import TestimonialsQuimera from './quimera/TestimonialsQuimera';
import FaqQuimera from './quimera/FaqQuimera';
import CtaQuimera from './quimera/CtaQuimera';
import PlatformShowcaseQuimera from './quimera/PlatformShowcaseQuimera';
import AiCapabilitiesQuimera from './quimera/AiCapabilitiesQuimera';
import IndustrySolutionsQuimera from './quimera/IndustrySolutionsQuimera';
import AgencyWhiteLabelQuimera from './quimera/AgencyWhiteLabelQuimera';
import MetricsQuimera from './quimera/MetricsQuimera';

// Import Lumina components
import HeroLumina from './HeroLumina';
import FeaturesLumina from './FeaturesLumina';
import CtaLumina from './CtaLumina';
import PortfolioLumina from './PortfolioLumina';
import PricingLumina from './PricingLumina';
import TestimonialsLumina from './TestimonialsLumina';
import FaqLumina from './FaqLumina';

// Import Neon components
import HeroNeon from './HeroNeon';
import FeaturesNeon from './FeaturesNeon';
import CtaNeon from './CtaNeon';
import PortfolioNeon from './PortfolioNeon';
import PricingNeon from './PricingNeon';
import TestimonialsNeon from './TestimonialsNeon';
import FaqNeon from './FaqNeon';

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
  const [isAnnualBilling, setIsAnnualBilling] = useState(false);

  // Preview mode - listens for postMessage from Landing Page Editor
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSections, setPreviewSections] = useState<PreviewSection[]>([]);
  // Tracks whether sections have been loaded (prevents flash of default/stale content)
  const [sectionsLoaded, setSectionsLoaded] = useState(false);

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
    const isInPreviewMode = previewParam === 'landing' || window.location.pathname === '/landing-editor-preview';
    setIsPreviewMode(isInPreviewMode);

    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from same origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'LANDING_EDITOR_UPDATE') {
        console.log('[Preview] Received sections update:', event.data.sections?.length || 0);
        setPreviewSections(event.data.sections || []);
        setSectionsLoaded(true);
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
      if (urlParams.get('preview') === 'landing' || window.location.pathname === '/landing-editor-preview') return;

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
          setSectionsLoaded(true);
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
      } finally {
        // Mark as loaded even if empty/error — prevents infinite loading
        setSectionsLoaded(true);
      }
    };

    loadSavedConfiguration();
  }, []);

  // Inject Typography settings from the "typography" section
  useEffect(() => {
    const typographySection = previewSections.find(s => s.type === 'typography');
    const typographyData = typographySection?.data || {};

    const headingsFont = typographyData.headingFont || 'inter';
    const bodyFont = typographyData.bodyFont || 'inter';
    const buttonsFont = typographyData.buttonFont || 'inter';

    const headingsCaps = typographyData.headingsCaps || false;
    const buttonsCaps = typographyData.buttonsCaps || false;
    const navLinksCaps = typographyData.navLinksCaps || false;

    const root = document.documentElement;
    const resolvedHeader = resolveFontFamily(headingsFont);
    const resolvedBody = resolveFontFamily(bodyFont);
    const resolvedButton = resolveFontFamily(buttonsFont);

    const headerFontStack = fontStacks[resolvedHeader];
    const bodyFontStack = fontStacks[resolvedBody];
    const buttonFontStack = fontStacks[resolvedButton];

    root.style.setProperty('--font-header', headerFontStack);
    root.style.setProperty('--font-body', bodyFontStack);
    root.style.setProperty('--font-button', buttonFontStack);

    root.style.setProperty('--headings-transform', headingsCaps ? 'uppercase' : 'none');
    root.style.setProperty('--headings-spacing', headingsCaps ? '0.05em' : 'normal');
    root.style.setProperty('--buttons-transform', buttonsCaps ? 'uppercase' : 'none');
    root.style.setProperty('--buttons-spacing', buttonsCaps ? '0.05em' : 'normal');
    root.style.setProperty('--navlinks-transform', navLinksCaps ? 'uppercase' : 'none');
    root.style.setProperty('--navlinks-spacing', navLinksCaps ? '0.05em' : 'normal');

    // Set font weights and styles
    root.style.setProperty('--font-weight-header', typographyData.fontWeightHeader || '700');
    root.style.setProperty('--font-style-header', typographyData.fontStyleHeader || 'normal');
    root.style.setProperty('--font-weight-body', typographyData.fontWeightBody || '400');
    root.style.setProperty('--font-style-body', typographyData.fontStyleBody || 'normal');
    root.style.setProperty('--font-weight-button', typographyData.fontWeightButton || '600');
    root.style.setProperty('--font-style-button', typographyData.fontStyleButton || 'normal');

    const fontsToLoad = [...new Set([resolvedHeader, resolvedBody, resolvedButton])];
    loadGoogleFontsSync(fontsToLoad, 'public-landing-fonts');
  }, [previewSections]);

  // Handle clicking components in visualizer to focus them in editor
  useEffect(() => {
    if (!isPreviewMode) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      // Find the closest parent with data-section-id
      const sectionElement = target.closest('[data-section-id]');
      
      if (sectionElement) {
        const sectionId = sectionElement.getAttribute('data-section-id');
        if (sectionId) {
          // Send message to parent editor to focus this section
          window.parent.postMessage({
            type: 'SECTION_FOCUS',
            sectionId: sectionId
          }, '*');
        }
      }
      
      // In preview mode, prevent ALL link navigation to avoid breaking the editor.
      // Only allow hash anchors for in-page scrolling.
      if (anchor) {
        const href = anchor.getAttribute('href') || '';
        if (!href.startsWith('#')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [isPreviewMode]);

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
      const href = item.href;
      const anchorId = href.startsWith('#') ? href.slice(1) : href;
      
      if (isPreviewMode) {
        // Find the mapped section type if using standard identifiers
        const typeMap: Record<string, string> = {
          'features': 'featuresQuimera',
          'pricing': 'pricingQuimera',
        };
        const targetSection = typeMap[anchorId] || anchorId;
        
        window.parent.postMessage({
          type: 'SECTION_FOCUS',
          sectionId: targetSection
        }, '*');
      }

      // Scroll to anchor - try multiple selectors to handle Quimera/Lumina suffixes
      let element = null;
      try {
        element = document.getElementById(`section-${anchorId}`) ||
                  document.getElementById(anchorId) ||
                  document.querySelector(href);
      } catch (e) {
        // Ignore querySelector errors for invalid hrefs
      }

      if (!element) {
        // Fallback 1: Match section ID containing the anchor name (e.g. section-featuresQuimera matches 'features')
        const allSections = document.querySelectorAll('[id^="section-"]');
        element = Array.from(allSections).find(el => el.id.toLowerCase().includes(anchorId.toLowerCase())) || null;
      }

      if (!element) {
        // Fallback 2: Match data-section-id
        const allDataSections = document.querySelectorAll('[data-section-id]');
        element = Array.from(allDataSections).find(el => (el.getAttribute('data-section-id') || '').toLowerCase().includes(anchorId.toLowerCase())) || null;
      }

      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (isPreviewMode) {
      // In preview mode, block all non-anchor navigation to prevent
      // the iframe from navigating away and breaking the editor
      return;
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
  };

  // Generic link navigation for CTA buttons — handles anchors, internal routes, external URLs
  const navigateToLink = (href: string) => {
    if (!href) return;
    if (href.startsWith('#')) {
      // Anchor scroll — always allowed (even in preview mode)
      const anchorId = href.slice(1);
      const element =
        document.getElementById(`section-${anchorId}`) ||
        document.getElementById(anchorId);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else if (isPreviewMode) {
      // In preview mode, block all non-anchor navigation
      return;
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

  const renderSuiteSection = (section: PreviewSection, Component: any) => {
    const glassEffect = section.type === 'bentoShowcaseQuimera'
      ? section.data?.glassEffect !== false
      : section.data?.glassEffect;

    return (
      <section key={section.id} id={`section-${section.type}`} data-section-id={section.id}>
        <SectionBackground 
          backgroundImageUrl={section.data?.backgroundImageUrl || section.data?.imageUrl} 
          backgroundColor={section.data?.colors?.background || section.data?.backgroundColor} 
          backgroundOverlayEnabled={section.data?.backgroundOverlayEnabled} 
          backgroundOverlayOpacity={section.data?.backgroundOverlayOpacity ?? section.data?.overlayOpacity} 
          backgroundOverlayColor={section.data?.backgroundOverlayColor || section.data?.overlayColor} 
          backgroundPosition={section.data?.backgroundPosition}
          glassEffect={glassEffect}
        >
          <Component {...section.data} isPreviewMode={isPreviewMode} />
        </SectionBackground>
      </section>
    );
  };

  const renderSection = (section: PreviewSection): React.ReactNode => {
    // Check visibility first
    if (section.enabled === false) return null;

    const sectionType = section.type;

    switch (sectionType) {
      // ── QUIMERA SUITE COMPONENTS ──
      case 'heroQuimera':
        return <section key={section.id} id={`section-${sectionType}`} data-section-id={section.id}><HeroQuimera {...section.data} isPreviewMode={isPreviewMode} /></section>;
      case 'platformShowcaseQuimera':
        return renderSuiteSection(section, PlatformShowcaseQuimera);
      case 'bentoShowcaseQuimera':
        return renderSuiteSection(section, FeaturesQuimera);
      case 'agentDemonstrationQuimera':
        return renderSuiteSection(section, AiCapabilitiesQuimera);
      case 'pricingQuimera':
        return renderSuiteSection(section, PricingQuimera);
      case 'testimonialsQuimera':
        return renderSuiteSection(section, TestimonialsQuimera);
      case 'faqQuimera':
        return renderSuiteSection(section, FaqQuimera);
      case 'metricsQuimera':
        return renderSuiteSection(section, MetricsQuimera);
      case 'industrySolutionsQuimera':
        return renderSuiteSection(section, IndustrySolutionsQuimera);
      case 'finalCtaQuimera':
        return renderSuiteSection(section, CtaQuimera);
      case 'aiCapabilitiesQuimera':
        return renderSuiteSection(section, AiCapabilitiesQuimera);
      case 'agencyWhiteLabelQuimera':
        return renderSuiteSection(section, AgencyWhiteLabelQuimera);

      // ── LUMINA SUITE COMPONENTS ──
      case 'heroLumina':
        return renderSuiteSection(section, HeroLumina);
      case 'featuresLumina':
        return renderSuiteSection(section, FeaturesLumina);
      case 'ctaLumina':
        return renderSuiteSection(section, CtaLumina);
      case 'portfolioLumina':
        return renderSuiteSection(section, PortfolioLumina);
      case 'pricingLumina':
        return renderSuiteSection(section, PricingLumina);
      case 'testimonialsLumina':
        return renderSuiteSection(section, TestimonialsLumina);
      case 'faqLumina':
        return renderSuiteSection(section, FaqLumina);

      // ── NEON SUITE COMPONENTS ──
      case 'heroNeon':
        return renderSuiteSection(section, HeroNeon);
      case 'featuresNeon':
        return renderSuiteSection(section, FeaturesNeon);
      case 'ctaNeon':
        return renderSuiteSection(section, CtaNeon);
      case 'portfolioNeon':
        return renderSuiteSection(section, PortfolioNeon);
      case 'pricingNeon':
        return renderSuiteSection(section, PricingNeon);
      case 'testimonialsNeon':
        return renderSuiteSection(section, TestimonialsNeon);
      case 'faqNeon':
        return renderSuiteSection(section, FaqNeon);

      // ── LEGACY & CORE SECTIONS ──
      // ── LEGACY & CORE SECTIONS ──
      case 'hero':
        return <section key={section.id} id={`section-${sectionType}`} data-section-id={section.id} className="relative w-full"><Hero {...section.data} /></section>;
      case 'heroModern':
        return <section key={section.id} id={`section-${sectionType}`} data-section-id={section.id} className="relative w-full"><HeroModern {...section.data} /></section>;
      case 'heroGradient':
        return <section key={section.id} id={`section-${sectionType}`} data-section-id={section.id} className="relative w-full"><HeroGradient {...section.data} /></section>;
      case 'features':
        return renderSuiteSection(section, Features);
      case 'pricing':
        return renderSuiteSection(section, Pricing);
      case 'testimonials':
        return renderSuiteSection(section, Testimonials);

      case 'cta':
        return renderSuiteSection(section, CtaSection);
      case 'faq':
        return renderSuiteSection(section, Faq);
      case 'separator1':
      case 'separator2':
      case 'separator3':
      case 'separator4':
      case 'separator5': {
        const separatorData = section.data || {};
        return separatorData ? <Separator key={section.id} data={separatorData} /> : null;
      }

      default:
        return null;
    }
  };

  // Get Global color values
  const colorsPreview = getPreviewData('colors');
  const globalBackgroundColor = colorsPreview?.backgroundColor || '#0A0A0A';
  const globalTextColor = colorsPreview?.textColor || '#ffffff';

  // Get Header color values
  const headerBackgroundColor = headerPreview?.backgroundColor || globalBackgroundColor;
  const headerTextColor = headerPreview?.textColor || globalTextColor;
  const headerAccentColor = headerPreview?.accentColor || '#facc15';

  // Get Footer color values
  const footerBackgroundColor = footerPreview?.backgroundColor || globalBackgroundColor;
  const footerTextColor = footerPreview?.textColor || globalTextColor;
  const footerAccentColor = footerPreview?.accentColor || '#facc15';

  // Show minimal loading screen until sections arrive to prevent flash of default/stale content
  if (!sectionsLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0A0A0A' }}
      />
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: globalBackgroundColor,
        color: globalTextColor,
        fontFamily: `'${globalBodyFont}', system-ui, sans-serif`,
        // CSS Custom properties for fonts
        ['--font-heading' as any]: `'${globalHeadingFont}', system-ui, sans-serif`,
        ['--font-body' as any]: `'${globalBodyFont}', system-ui, sans-serif`,
        ['--font-button' as any]: `'${globalButtonFont}', system-ui, sans-serif`,
        // CSS Custom properties for text transform (ALL CAPS)
        ['--heading-transform' as any]: headingsCaps ? 'uppercase' : 'none',
        ['--button-transform' as any]: buttonsCaps ? 'uppercase' : 'none',
        ['--nav-transform' as any]: navLinksCaps ? 'uppercase' : 'none',
        // Global variables for generic usage
        ['--foreground' as any]: globalTextColor,
      }}
    >
      {/* === HEADER === */}
      <Header
        style={headerPreview?.style || 'floating-glass'}
        layout={headerPreview?.layout || 'minimal'}
        isSticky={headerPreview?.isSticky ?? true}
        glassEffect={headerPreview?.glassEffect ?? true}
        links={navigation.header.items.map(item => ({
          text: item.label,
          href: item.href,
        }))}
        logoType={headerPreview?.logoType || (navigation.header.logo?.imageUrl ? 'both' : 'text')}
        logoText={headerPreview?.logoText || navigation.header.logo?.text || 'Quimera.ai'}
        logoImageUrl={headerPreview?.logoImageUrl || navigation.header.logo?.imageUrl || QUIMERA_FULL_LOGO}
        logoWidth={headerPreview?.logoWidth || 120}
        logoHeight={headerPreview?.logoHeight}
        showLogin={headerPreview?.showLoginButton ?? true}
        loginText={getTranslatedLabel(headerPreview?.loginText || navigation.header.cta?.loginText || t('landing.login'))}
        showCta={headerPreview?.showRegisterButton ?? true}
        ctaText={getTranslatedLabel(headerPreview?.registerText || navigation.header.cta?.registerText || t('landing.register'))}
        ctaUrl="/register"
        loginUrl="/login"
        buttonBorderRadius={headerPreview?.buttonBorderRadius || 'md'}
        hoverStyle={headerPreview?.hoverStyle || 'highlight'}
        backgroundColor={`${headerBackgroundColor}f2`}
        textColor={headerTextColor}
        colors={{
          background: `${headerBackgroundColor}f2`,
          text: headerTextColor,
          accent: headerAccentColor
        }}
        onNavigate={(href) => {
          // In preview mode, only allow anchor scrolling — block all real navigation
          if (isPreviewMode) {
            if (href.startsWith('#')) {
              const el = document.getElementById(href.slice(1));
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
            return;
          }
          const item = navigation.header.items.find((i: AppNavItem) => i.href === href);
          if (item) {
             handleNavItemClick(item);
          } else {
             if (href === '/login' || href === '#login') onNavigateToLogin();
             else if (href === '/register' || href === '#register') onNavigateToRegister();
             else {
               if (href.startsWith('#')) {
                 const el = document.getElementById(href.slice(1));
                 if (el) el.scrollIntoView({ behavior: 'smooth' });
               } else {
                 window.location.href = href;
               }
             }
          }
        }}
      />

      {/* === DYNAMICALLY ORDERED SECTIONS === */}
      {orderedSections.map(section => renderSection(section))}

      {/* === FOOTER === */}
      <footer
        id="section-footer"
        data-section-id="footer"
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
                    // In preview mode, block all navigation to prevent iframe from navigating away
                    if (isPreviewMode) return;
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
