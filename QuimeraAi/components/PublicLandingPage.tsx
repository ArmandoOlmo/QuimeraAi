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
              {/* Flowing Gold Liquid 3D Background */}
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

              {overlayComponent}
              <div className={`w-full max-w-7xl mx-auto relative z-10 ${heroLayout === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center' : ''}`}>
                <div className={`${heroLayout === 'centered' ? 'mx-auto max-w-4xl' : heroLayout === 'left' ? 'mr-auto max-w-4xl' : heroLayout === 'right' ? 'ml-auto max-w-4xl' : ''}`}>
                  {/* Logo/Image (Visible in centered/left/right) */}
                  {heroLayout !== 'split' && (
                    <div className={`w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48 mb-6 sm:mb-8 ${heroLayout === 'centered' ? 'mx-auto' : heroLayout === 'right' ? 'ml-auto' : ''}`}>
                      <img src={currentSectionData?.heroImage || QUIMERA_LOGO} alt="Quimera AI" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] sm:drop-shadow-[0_0_50px_rgba(250,204,21,0.6)]" />
                    </div>
                  )}

                  <h1 className="text-3xl sm:text-5xl md:text-7xl font-black leading-tight mb-4 sm:mb-6 px-2" style={{ color: heroTextColor, fontFamily: `var(--font-heading)`, textTransform: headingsCaps ? 'uppercase' : 'none' }}>
                    {currentSectionData?.title || t('landing.heroTitle1')}
                    <span className="block" style={{ color: currentSectionData?.accentColor || '#facc15' }}>{currentSectionData?.subtitle ? '' : t('landing.heroTitle2')}</span>
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl max-w-2xl mb-8 sm:mb-10 leading-relaxed px-2" style={{ color: `${heroTextColor}99`, marginLeft: heroLayout === 'centered' ? 'auto' : '0', marginRight: heroLayout === 'centered' ? 'auto' : '0' }}>
                    {currentSectionData?.subtitle || t('landing.heroSubtitle')}
                  </p>
                  <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 px-4 sm:px-0 ${heroLayout === 'centered' ? 'justify-center' : heroLayout === 'left' || heroLayout === 'split' ? 'justify-start' : 'justify-end'}`}>
                    <button
                      onClick={onNavigateToRegister}
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
                      <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-white/10 font-semibold rounded-xl hover:bg-white/10 active:scale-[0.98] transition-all" style={{ color: heroTextColor, fontFamily: `var(--font-button)`, textTransform: buttonsCaps ? 'uppercase' : 'none' }}>
                        {currentSectionData?.secondaryButtonText || t('landing.viewFeatures')}
                      </button>
                    )}
                  </div>
                </div>

                {heroLayout === 'split' && (
                  <div className="flex items-center justify-center">
                    <img
                      src={currentSectionData?.heroImage || QUIMERA_LOGO}
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
                      <button onClick={onNavigateToRegister} className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-all flex items-center justify-center gap-2" style={{ fontFamily: `var(--font-button)`, textTransform: buttonsCaps ? 'uppercase' : 'none' }}>
                        {currentSectionData?.primaryButtonText || t('landing.startFree')}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {!isCentered && (
                    <div className={`flex items-center justify-center relative ${isReversed ? 'lg:order-1' : ''}`}>
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
                      <img src={currentSectionData?.heroImage || QUIMERA_LOGO} alt="Hero Visual" className="relative w-full max-w-md object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-700" />
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
                  <button onClick={onNavigateToRegister} className="px-8 py-4 bg-black text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-xl flex items-center justify-center gap-2" style={{ fontFamily: `var(--font-button)`, textTransform: buttonsCaps ? 'uppercase' : 'none' }}>
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

      case 'features':
        // Get Features section style values from section data
        const featuresPreview = section.data || {};
        const featuresBackgroundColor = featuresPreview?.backgroundColor || '#0A0A0A';
        const featuresTextColor = featuresPreview?.textColor || '#ffffff';
        const featuresAccentColor = featuresPreview?.accentColor || '#facc15'; // yellow-400
        const featuresPadding = featuresPreview?.padding || 80;

        return (
          <section
            key={section.id}
            id={`section-${sectionType}`}
            data-section-id={section.id}
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
        // Get Pricing section style values from section data
        const pricingPreview = section.data || {};
        const pricingBackgroundColor = pricingPreview?.backgroundColor || '#0A0A0A';
        const pricingTextColor = pricingPreview?.textColor || '#ffffff';
        const pricingAccentColor = pricingPreview?.accentColor || '#facc15'; // yellow-400
        const pricingPadding = pricingPreview?.padding || 80;
        // Determine if we should show the popular highlight
        const shouldHighlightPopular = pricingPreview?.highlightPopular !== false;
        const showBillingToggle = pricingPreview?.showBillingToggle !== false;

        return (
          <section
            key={section.id}
            id={`section-${sectionType}`}
            data-section-id={section.id}
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
                  {headerPreview?.loginText || navigation.header.cta?.loginText || t('landing.login')}
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
                  {headerPreview?.registerText || navigation.header.cta?.registerText || t('landing.register')}
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
                {(headerPreview?.showLoginButton ?? true) && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onNavigateToLogin();
                    }}
                    className="w-full py-3 text-center text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors"
                    style={{ textTransform: buttonsCaps ? 'uppercase' : 'none' }}
                  >
                    {headerPreview?.loginText || navigation.header.cta?.loginText || t('landing.login')}
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
                    {headerPreview?.registerText || navigation.header.cta?.registerText || t('landing.register')}
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
