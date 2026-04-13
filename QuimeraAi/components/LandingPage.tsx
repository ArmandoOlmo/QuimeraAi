
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Header from './Header';
import Hero from './Hero';
import HeroModern from './HeroModern';
import HeroGradient from './HeroGradient';
import HeroFitness from './HeroFitness';
import HeroEditorial from './HeroEditorial';
import HeroCinematic from './HeroCinematic';
import HeroMinimal from './HeroMinimal';
import HeroBold from './HeroBold';
import HeroOverlap from './HeroOverlap';
import HeroVerticalSplit from './HeroVerticalSplit';
import HeroGlass from './HeroGlass';
import HeroStacked from './HeroStacked';
import HeroSplit from './HeroSplit';
import HeroGallery from './HeroGallery';
import HeroWave from './HeroWave';
import HeroNova from './HeroNova';
import Features from './Features';
import Testimonials from './Testimonials';
import Slideshow from './Slideshow';
import Pricing from './Pricing';
import Faq from './Faq';
import Leads from './Leads';
import Newsletter from './Newsletter';
import CTASection from './CTASection';
import Footer from './Footer';
import Portfolio from './Portfolio';
import Services from './Services';
import Team from './Team';
import Video from './Video';
import HowItWorks from './HowItWorks';
import BlogPost from './BlogPost';
import BlogCategoryPage from './BlogCategoryPage';
import ChatbotWidget from './ChatbotWidget';
import BusinessMap from './BusinessMap';
import Menu from './Menu';
import Banner from './Banner';
import TopBar from './TopBar';
import LogoBanner from './LogoBanner';
import SignupFloat from './SignupFloat';
import SectionBackground from './ui/SectionBackground';
import Products from './Products';
import { PageSection, FontFamily, CMSPost, CMSCategory, FooterData } from '../types';
import { fontStacks, loadGoogleFonts, loadGoogleFontsSync, resolveFontFamily } from '../utils/fontLoader';
import { useSafeAuth } from '../contexts/core/AuthContext';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { useCMS } from '../contexts/cms';
import { useAdmin } from '../contexts/admin';
import { deriveColorsFromPalette } from '../utils/colorUtils';
import { usePublicProducts } from '../hooks/usePublicProducts';
// Importación centralizada de componentes de ecommerce
// Estos componentes funcionan tanto en Landing Page como en Ecommerce
import {
  ProductSearchPage,
  ProductDetailPage,
  FeaturedProducts,
  CategoryGrid,
  ProductHero,
  SaleCountdown,
  TrustBadges,
  RecentlyViewed,
  ProductReviews,
  CollectionBanner,
  ProductBundle,
  AnnouncementBar,
  CartDrawer,
  CheckoutPageEnhanced,
} from './ecommerce';
import { StorefrontCartProvider, useSafeStorefrontCart } from './ecommerce/context';

// Store view types for hash routing
type StoreView =
  | { type: 'none' }
  | { type: 'store' }
  | { type: 'category'; slug: string }
  | { type: 'product'; slug: string }
  | { type: 'checkout' };

// fontStacks imported from utils/fontLoader.ts (single source of truth)

// Import useSafeEditor
import { useSafeEditor } from '../contexts/EditorContext';
import { useSafeTenant } from '../contexts/tenant';

// ... (rest of imports)

// Inner component that uses the cart context
const LandingPageContent: React.FC = () => {
  const authContext = useSafeAuth();
  const user = authContext?.user ?? null;
  const { activeSection, onSectionSelect } = useUI();
  const tenantContext = useSafeTenant();
  const hasWhiteLabelBranding = !!(tenantContext?.currentTenant?.branding?.companyName || tenantContext?.currentTenant?.branding?.logoUrl);

  // Context resolution: Prefer EditorContext data for real-time updates when in editor
  const editorContext = useSafeEditor();
  const projectContext = useProject();

  const isEditorMode = editorContext?.view === 'editor' && !!editorContext?.data;

  const data = (isEditorMode ? editorContext!.data : projectContext.data) || projectContext.data;
  const theme = (isEditorMode ? editorContext!.theme : projectContext.theme) || projectContext.theme;
  const componentOrder = (isEditorMode ? editorContext!.componentOrder : projectContext.componentOrder) || projectContext.componentOrder;
  const sectionVisibility = (isEditorMode ? editorContext!.sectionVisibility : projectContext.sectionVisibility) || projectContext.sectionVisibility;
  const { activeProjectId, pages, activePage } = projectContext;

  const { cmsPosts, isLoadingCMS, menus, categories } = useCMS();
  const { componentStatus, customComponents, componentStyles } = useAdmin();
  const [activePost, setActivePost] = useState<CMSPost | null>(null);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [blogSlugNotFound, setBlogSlugNotFound] = useState(false);

  // Store view state for ecommerce hash routing
  const [storeView, setStoreView] = useState<StoreView>({ type: 'none' });

  // Load products from public store (storeId = projectId)
  const { products: storefrontProducts, isLoading: isLoadingProducts } = usePublicProducts(activeProjectId);

  // Cart context - available when wrapped in StorefrontCartProvider
  // Uses safe version that returns defaults when not in provider
  const cart = useSafeStorefrontCart();

  // Multi-page architecture: Use active page's sections if available
  const effectiveComponentOrder = useMemo(() => {
    // If not in editor mode (public view), use activePage sections
    if (activePage?.sections?.length) {
      return activePage.sections;
    }
    // Fallback to componentOrder (either from editor or project context)
    return componentOrder;
  }, [activePage, componentOrder]);

  const effectiveSectionVisibility = useMemo(() => {
    if (activePage?.sections?.length) {
      // Create visibility based on page sections
      const visibility: Record<string, boolean> = {};
      activePage.sections.forEach(s => {
        visibility[s] = sectionVisibility[s] ?? true;
      });
      return visibility;
    }
    return sectionVisibility;
  }, [activePage, sectionVisibility]);

  // Inject font variables into :root for Tailwind to use
  useEffect(() => {
    const root = document.documentElement;
    // Resolve font keys — migrates old/removed fonts to new equivalents
    const resolvedHeader = resolveFontFamily(theme.fontFamilyHeader);
    const resolvedBody = resolveFontFamily(theme.fontFamilyBody);
    const resolvedButton = resolveFontFamily(theme.fontFamilyButton);

    const headerFont = fontStacks[resolvedHeader];
    const bodyFont = fontStacks[resolvedBody];
    const buttonFont = fontStacks[resolvedButton];

    // Set CSS variables immediately so layout uses the correct font stack
    root.style.setProperty('--font-header', headerFont);
    root.style.setProperty('--font-body', bodyFont);
    root.style.setProperty('--font-button', buttonFont);

    // Font weight & style variables
    root.style.setProperty('--font-weight-header', String(theme.fontWeightHeader ?? 700));
    root.style.setProperty('--font-weight-body', String(theme.fontWeightBody ?? 400));
    root.style.setProperty('--font-weight-button', String(theme.fontWeightButton ?? 600));
    root.style.setProperty('--font-style-header', theme.fontStyleHeader ?? 'normal');
    root.style.setProperty('--font-style-body', theme.fontStyleBody ?? 'normal');
    root.style.setProperty('--font-style-button', theme.fontStyleButton ?? 'normal');

    // All Caps variables
    root.style.setProperty('--headings-transform', theme.headingsAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--headings-spacing', theme.headingsAllCaps ? '0.05em' : 'normal');
    root.style.setProperty('--buttons-transform', theme.buttonsAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--buttons-spacing', theme.buttonsAllCaps ? '0.05em' : 'normal');
    root.style.setProperty('--navlinks-transform', theme.navLinksAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--navlinks-spacing', theme.navLinksAllCaps ? '0.05em' : 'normal');

    // Load Google Fonts: inject <link> synchronously, browser handles swap via font-display: swap
    const fontsToLoad = [...new Set([resolvedHeader, resolvedBody, resolvedButton])];
    loadGoogleFontsSync(fontsToLoad, 'editor-preview-fonts');
  }, [theme.fontFamilyHeader, theme.fontFamilyBody, theme.fontFamilyButton, theme.fontWeightHeader, theme.fontWeightBody, theme.fontWeightButton, theme.fontStyleHeader, theme.fontStyleBody, theme.fontStyleButton, theme.headingsAllCaps, theme.buttonsAllCaps, theme.navLinksAllCaps]);

  // Handle routing for Articles, Store and Sections
  // Supports both real paths (/tienda, /blog/slug) and anchor scrolling (/#features)
  useEffect(() => {
    const handleNavigation = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const decodedHash = decodeURIComponent(hash);

      // Reset all views first
      setActivePost(null);
      setStoreView({ type: 'none' });
      setIsRouting(false);
      setBlogSlugNotFound(false);

      // ========================================
      // REAL PATH ROUTING (Shopify/Wix style)
      // ========================================

      // Blog article routing: /blog/slug
      if (path.startsWith('/blog/') && path !== '/blog/') {
        setIsRouting(true);
        const slug = path.replace('/blog/', '');
        const post = cmsPosts.find(p => p.slug === slug);

        if (post) {
          setActivePost(post);
          setBlogSlugNotFound(false);
          window.scrollTo(0, 0);
          setIsRouting(false);
        } else {
          if (!isLoadingCMS && cmsPosts.length > 0) {
            console.warn(`Article with slug "${slug}" not found.`);
            setBlogSlugNotFound(true);
            setIsRouting(false);
          }
        }
        return;
      }

      // Store routing: /tienda
      if (path === '/tienda' || path === '/tienda/') {
        setStoreView({ type: 'store' });
        window.scrollTo(0, 0);
        return;
      }

      // Store category routing: /tienda/categoria/slug
      if (path.startsWith('/tienda/categoria/')) {
        const slug = path.replace('/tienda/categoria/', '').replace(/\/$/, '');
        setStoreView({ type: 'category', slug });
        window.scrollTo(0, 0);
        return;
      }

      // Store product routing: /tienda/producto/slug
      if (path.startsWith('/tienda/producto/')) {
        const slug = path.replace('/tienda/producto/', '').replace(/\/$/, '');
        setStoreView({ type: 'product', slug });
        window.scrollTo(0, 0);
        return;
      }

      // Checkout routing: /checkout
      if (path === '/checkout' || path === '/checkout/') {
        setStoreView({ type: 'checkout' });
        window.scrollTo(0, 0);
        return;
      }

      // ========================================
      // LEGACY HASH ROUTING (backward compatibility)
      // ========================================

      // Article routing: #article:slug (legacy)
      if (decodedHash.startsWith('#article:')) {
        setIsRouting(true);
        const slug = decodedHash.replace('#article:', '').trim();
        const post = cmsPosts.find(p => p.slug === slug);

        if (post) {
          setActivePost(post);
          window.scrollTo(0, 0);
          setIsRouting(false);
        } else {
          if (!isLoadingCMS && cmsPosts.length > 0) {
            console.warn(`Article with slug "${slug}" not found.`);
            setIsRouting(false);
          }
        }
        return;
      }

      // Store routing: #store (legacy)
      if (decodedHash === '#store') {
        setStoreView({ type: 'store' });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash.startsWith('#store/category/')) {
        const slug = decodedHash.replace('#store/category/', '');
        setStoreView({ type: 'category', slug });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash.startsWith('#store/product/')) {
        const slug = decodedHash.replace('#store/product/', '');
        setStoreView({ type: 'product', slug });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash === '#checkout') {
        setStoreView({ type: 'checkout' });
        window.scrollTo(0, 0);
        return;
      }

      // ========================================
      // ANCHOR SCROLL (/#section format)
      // ========================================
      if (hash.length > 1) {
        setTimeout(() => {
          const id = hash.substring(1);
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };

    // Check initial path/hash
    handleNavigation();

    // Listen for changes
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [cmsPosts, isLoadingCMS]);

  const handleBackToHome = () => {
    window.history.pushState({}, '', '/');
    setActivePost(null);
    setActiveCategorySlug(null);
    setBlogSlugNotFound(false);
    setStoreView({ type: 'none' });
    window.scrollTo(0, 0);
  };

  // Store navigation handlers - use real paths
  const handleNavigateToStore = useCallback(() => {
    window.history.pushState({}, '', '/tienda');
    setStoreView({ type: 'store' });
    window.scrollTo(0, 0);
  }, []);

  const handleNavigateToCategory = useCallback((categorySlug: string) => {
    window.history.pushState({}, '', `/tienda/categoria/${categorySlug}`);
    setStoreView({ type: 'category', slug: categorySlug });
    window.scrollTo(0, 0);
  }, []);

  const handleNavigateToProduct = useCallback((productSlug: string) => {
    window.history.pushState({}, '', `/tienda/producto/${productSlug}`);
    setStoreView({ type: 'product', slug: productSlug });
    window.scrollTo(0, 0);
  }, []);

  const handleNavigateToCheckout = useCallback(() => {
    window.history.pushState({}, '', '/checkout');
    setStoreView({ type: 'checkout' });
    window.scrollTo(0, 0);
  }, []);

  // Universal navigation handler for Header links
  const handleLinkNavigation = useCallback((href: string) => {
    // Reset views
    setActivePost(null);
    setActiveCategorySlug(null);
    setStoreView({ type: 'none' });
    setBlogSlugNotFound(false);

    // Home page
    if (href === '/' || href === '') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Anchor scroll (/#section or #section)
    if (href.startsWith('/#') || (href.startsWith('#') && !href.startsWith('#article:') && !href.startsWith('#store'))) {
      const id = href.replace('/#', '').replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return;
    }

    // Blog category: /blog/categoria/slug
    if (href.startsWith('/blog/categoria/')) {
      const slug = href.replace('/blog/categoria/', '').replace(/\/$/, '');
      console.log('[LandingPage] Navigating to blog category:', slug);
      setActiveCategorySlug(slug);
      window.scrollTo(0, 0);
      return;
    }

    // Blog article: /blog/slug
    if (href.startsWith('/blog/')) {
      const slug = href.replace('/blog/', '').replace(/\/$/, '');
      const post = cmsPosts.find(p => p.slug === slug);
      if (post) {
        setActivePost(post);
        setBlogSlugNotFound(false);
        window.scrollTo(0, 0);
      } else {
        console.warn(`[LandingPage] Blog post not found for slug: ${slug}`);
        setBlogSlugNotFound(true);
        window.scrollTo(0, 0);
      }
      return;
    }

    // Store: /tienda
    if (href === '/tienda' || href === '/tienda/') {
      setStoreView({ type: 'store' });
      window.scrollTo(0, 0);
      return;
    }

    // Store category: /tienda/categoria/slug
    if (href.startsWith('/tienda/categoria/')) {
      const slug = href.replace('/tienda/categoria/', '').replace(/\/$/, '');
      setStoreView({ type: 'category', slug });
      window.scrollTo(0, 0);
      return;
    }

    // Store product: /tienda/producto/slug
    if (href.startsWith('/tienda/producto/')) {
      const slug = href.replace('/tienda/producto/', '').replace(/\/$/, '');
      setStoreView({ type: 'product', slug });
      window.scrollTo(0, 0);
      return;
    }

    // Checkout
    if (href === '/checkout' || href === '/checkout/') {
      setStoreView({ type: 'checkout' });
      window.scrollTo(0, 0);
      return;
    }

    // Legacy hash support
    if (href.startsWith('#article:')) {
      const slug = href.replace('#article:', '').trim();
      const post = cmsPosts.find(p => p.slug === slug);
      if (post) {
        setActivePost(post);
        window.scrollTo(0, 0);
      }
      return;
    }

    if (href === '#store') {
      setStoreView({ type: 'store' });
      window.scrollTo(0, 0);
      return;
    }

    if (href.startsWith('#store/category/')) {
      const slug = href.replace('#store/category/', '');
      setStoreView({ type: 'category', slug });
      window.scrollTo(0, 0);
      return;
    }

    if (href.startsWith('#store/product/')) {
      const slug = href.replace('#store/product/', '');
      setStoreView({ type: 'product', slug });
      window.scrollTo(0, 0);
      return;
    }

    // External URLs - open in new tab
    if (href.startsWith('http://') || href.startsWith('https://')) {
      window.open(href, '_blank');
      return;
    }

    // Fallback: try to scroll to element by ID
    const id = href.replace(/^\//, '').replace(/\/$/, '');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [cmsPosts]);

  // Check if we're showing a store view
  const isStoreViewActive = storeView.type !== 'none';

  // Helper function to render custom components
  const renderCustomComponent = (customComponentId: string) => {
    const customComp = customComponents.find(c => c.id === customComponentId);
    if (!customComp) return null;

    // Merge custom component styles with base data and componentStyles
    const baseComponentData = data[customComp.baseComponent];
    const baseStyles = componentStyles[customComp.baseComponent as keyof typeof componentStyles];

    // Merge colors with priority: base data < base styles < custom styles
    const mergedColors = {
      ...baseComponentData?.colors,
      ...baseStyles?.colors,
      ...customComp.styles?.colors
    };

    // Derive missing colors from palette
    const derivedColors = deriveColorsFromPalette(mergedColors, customComp.baseComponent);

    const mergedData = {
      ...baseComponentData,
      ...baseStyles,
      ...customComp.styles,
      colors: derivedColors
    };

    // Render the base component with custom styles
    const borderRadius = theme.cardBorderRadius;
    const buttonBorderRadius = theme.buttonBorderRadius;

    switch (customComp.baseComponent) {
      case 'hero':
        const hbr = mergedData.buttonBorderRadius || buttonBorderRadius;
        if (mergedData.heroVariant === 'modern') return <HeroModern {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'gradient') return <HeroGradient {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'fitness') return <HeroFitness {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'editorial') return <HeroEditorial {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'cinematic') return <HeroCinematic {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'minimal') return <HeroMinimal {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'bold') return <HeroBold {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'overlap') return <HeroOverlap {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'verticalSplit') return <HeroVerticalSplit {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'glass') return <HeroGlass {...mergedData} borderRadius={hbr} />;
        if (mergedData.heroVariant === 'stacked') return <HeroStacked {...mergedData} borderRadius={hbr} />;
        return <Hero {...mergedData} borderRadius={hbr} />;
      case 'features':
        return <Features {...mergedData} borderRadius={mergedData.borderRadius || borderRadius} />;
      case 'testimonials':
        return <Testimonials {...mergedData} borderRadius={mergedData.borderRadius || borderRadius} cardShadow={mergedData.cardShadow} borderStyle={mergedData.borderStyle} cardPadding={mergedData.cardPadding} testimonialsVariant={mergedData.testimonialsVariant} />;
      case 'slideshow':
        return <Slideshow {...mergedData} borderRadius={borderRadius} />;
      case 'pricing':
        return <Pricing {...mergedData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;
      case 'faq':
        return <Faq {...mergedData} borderRadius={borderRadius} />;
      case 'leads':
        return <Leads {...mergedData} cardBorderRadius={mergedData.cardBorderRadius || borderRadius} inputBorderRadius={mergedData.inputBorderRadius || 'md'} buttonBorderRadius={mergedData.buttonBorderRadius || buttonBorderRadius} />;
      case 'newsletter':
        return <Newsletter {...mergedData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;
      case 'cta':
        return <CTASection {...mergedData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;
      case 'portfolio':
        return <Portfolio {...mergedData} borderRadius={borderRadius} />;
      case 'services':
        return <Services {...mergedData} borderRadius={borderRadius} />;
      case 'team':
        return <Team {...mergedData} borderRadius={borderRadius} />;
      case 'video':
        return <Video {...mergedData} borderRadius={borderRadius} />;
      case 'howItWorks':
        return <HowItWorks {...mergedData} borderRadius={borderRadius} />;
      case 'map':
        return <BusinessMap {...mergedData} apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''} borderRadius={borderRadius} />;
      case 'menu':
        return <Menu {...mergedData} borderRadius={borderRadius} />;
      default:
        return null;
    }
  };

  // Merge componentStyles (defaults) with data (user changes) - user changes take priority
  // Then derive any missing colors from the template palette
  const mergedHeroColors = {
    ...componentStyles.hero?.colors,  // default colors first
    ...data.hero.colors               // user color changes override
  };
  const mergedHeroData = {
    ...componentStyles.hero,  // defaults first
    ...data.hero,             // user changes override defaults
    colors: deriveColorsFromPalette(mergedHeroColors, 'hero')
  };

  // Helper function to merge componentStyles (defaults) with data (user changes)
  // User changes in data take priority over componentStyles defaults
  // Then derive any missing colors from the template palette
  const mergeComponentData = (componentKey: keyof typeof componentStyles) => {
    const componentData = data[componentKey];
    const styles = componentStyles[componentKey];
    // If neither exists, return undefined
    if (!componentData && !styles) return undefined;
    // If only styles exist (no user data), use styles as base
    if (!componentData && styles) return styles;
    // If only data exists (no default styles), return data
    if (!styles) return componentData;

    // First merge the colors: defaults, then user/template colors
    const mergedColors = {
      ...styles.colors,         // default colors first
      ...componentData.colors   // user/template color changes override
    };

    // Derive any missing colors from the template palette
    const derivedColors = deriveColorsFromPalette(mergedColors, componentKey);

    // Merge cornerGradient if it exists in styles (defaults first, then user changes)
    const mergedCornerGradient = (styles as any).cornerGradient ? {
      ...(styles as any).cornerGradient,    // default cornerGradient values
      ...(componentData as any).cornerGradient  // user cornerGradient changes override
    } : (componentData as any).cornerGradient;

    return {
      ...styles,           // defaults first
      ...componentData,    // user changes override defaults
      colors: derivedColors,
      ...(mergedCornerGradient && { cornerGradient: mergedCornerGradient })
    };
  };

  const mergedFeaturesData = mergeComponentData('features');
  const mergedTestimonialsData = mergeComponentData('testimonials');
  const mergedSlideshowData = mergeComponentData('slideshow');
  const mergedPricingData = mergeComponentData('pricing');
  const mergedFaqData = mergeComponentData('faq');
  const mergedLeadsData = mergeComponentData('leads');
  const mergedNewsletterData = mergeComponentData('newsletter');
  const mergedCtaData = mergeComponentData('cta');
  const mergedPortfolioData = mergeComponentData('portfolio');
  const mergedServicesData = mergeComponentData('services');
  const mergedTeamData = mergeComponentData('team');
  const mergedVideoData = mergeComponentData('video');
  const mergedHowItWorksData = mergeComponentData('howItWorks');
  const mergedMapData = mergeComponentData('map');
  const mergedMenuData = mergeComponentData('menu');
  const mergedBannerData = mergeComponentData('banner');
  const mergedFooterData = mergeComponentData('footer');
  const mergedHeaderData = mergeComponentData('header');
  const mergedHeroSplitData = mergeComponentData('heroSplit');
  const mergedHeroGalleryData = mergeComponentData('heroGallery');
  const mergedHeroWaveData = mergeComponentData('heroWave');
  const mergedHeroNovaData = mergeComponentData('heroNova');
  const mergedTopBarData = mergeComponentData('topBar');
  const mergedLogoBannerData = mergeComponentData('logoBanner');
  const mergedProductsData = mergeComponentData('products');
  const mergedCMSFeedData = mergeComponentData('cmsFeed');

  // Ecommerce section components
  const mergedFeaturedProductsData = mergeComponentData('featuredProducts');
  const mergedCategoryGridData = mergeComponentData('categoryGrid');
  const mergedProductHeroData = mergeComponentData('productHero');
  const mergedSaleCountdownData = mergeComponentData('saleCountdown');
  const mergedTrustBadgesData = mergeComponentData('trustBadges');
  const mergedRecentlyViewedData = mergeComponentData('recentlyViewed');
  const mergedProductReviewsData = mergeComponentData('productReviews');
  const mergedCollectionBannerData = mergeComponentData('collectionBanner');
  const mergedProductBundleData = mergeComponentData('productBundle');
  const mergedAnnouncementBarData = mergeComponentData('announcementBar');

  // Merge storefront products with component data
  const productsWithData = useMemo(() => {
    const baseData = mergedProductsData || data.products || {};
    return {
      ...baseData,
      // Override products array with data loaded from publicStores
      products: storefrontProducts,
    };
  }, [mergedProductsData, data.products, storefrontProducts]);

  /**
   * Verifica si algún componente de ecommerce está habilitado (visible)
   * Esto se usa para determinar si mostrar el carrito de compras en el header
   */
  const isAnyEcommerceComponentEnabled = useMemo(() => {
    const ecommerceComponents: PageSection[] = [
      'products', 'featuredProducts', 'categoryGrid', 'productHero',
      'saleCountdown', 'trustBadges', 'recentlyViewed', 'productReviews',
      'collectionBanner', 'productBundle', 'announcementBar', 'storeSettings'
    ];

    return ecommerceComponents.some(component =>
      componentStatus[component] && effectiveSectionVisibility[component]
    );
  }, [componentStatus, effectiveSectionVisibility]);

  /**
   * Verifica si un componente de ecommerce debe mostrarse en el contexto actual
   * @param componentKey - Clave del componente (ej: 'featuredProducts')
   * @param context - Contexto actual: 'landing' (home) o 'store' (tienda/categoría/producto)
   * @returns true si el componente debe mostrarse
   */
  const isEcommerceComponentVisibleIn = useCallback((componentKey: PageSection, context: 'landing' | 'store'): boolean => {
    const ecommerceDataMap: Record<string, { visibleIn?: 'landing' | 'store' | 'both' }> = {
      featuredProducts: mergedFeaturedProductsData,
      categoryGrid: mergedCategoryGridData,
      productHero: mergedProductHeroData,
      saleCountdown: mergedSaleCountdownData,
      trustBadges: mergedTrustBadgesData,
      recentlyViewed: mergedRecentlyViewedData,
      productReviews: mergedProductReviewsData,
      collectionBanner: mergedCollectionBannerData,
      productBundle: mergedProductBundleData,
      announcementBar: mergedAnnouncementBarData,
    };

    const componentData = ecommerceDataMap[componentKey];
    if (!componentData) return true; // Si no es un componente de ecommerce, mostrar siempre

    const visibleIn = componentData.visibleIn || 'both'; // Por defecto 'both'

    return visibleIn === 'both' || visibleIn === context;
  }, [
    mergedFeaturedProductsData,
    mergedCategoryGridData,
    mergedProductHeroData,
    mergedSaleCountdownData,
    mergedTrustBadgesData,
    mergedRecentlyViewedData,
    mergedProductReviewsData,
    mergedCollectionBannerData,
    mergedProductBundleData,
    mergedAnnouncementBarData,
  ]);

  const componentsMap: Record<PageSection, React.ReactNode> = {
    hero: (
      <SectionBackground backgroundImageUrl={mergedHeroData?.backgroundImageUrl} backgroundColor={mergedHeroData?.colors?.background} backgroundOverlayEnabled={mergedHeroData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroData?.backgroundOverlayColor}>
        {(() => {
          const hbr = mergedHeroData.buttonBorderRadius || theme.buttonBorderRadius;
          const nav = handleLinkNavigation;
          if (mergedHeroData.heroVariant === 'modern') return <HeroModern {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'gradient') return <HeroGradient {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'fitness') return <HeroFitness {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'editorial') return <HeroEditorial {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'cinematic') return <HeroCinematic {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'minimal') return <HeroMinimal {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'bold') return <HeroBold {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'overlap') return <HeroOverlap {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'verticalSplit') return <HeroVerticalSplit {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'glass') return <HeroGlass {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'stacked') return <HeroStacked {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          return <Hero {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
        })()}
      </SectionBackground>
    ),
    heroSplit: <SectionBackground backgroundImageUrl={mergedHeroSplitData?.backgroundImageUrl} backgroundColor={mergedHeroSplitData?.colors?.background} backgroundOverlayEnabled={mergedHeroSplitData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroSplitData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroSplitData?.backgroundOverlayColor}><HeroSplit {...mergedHeroSplitData} borderRadius={mergedHeroSplitData?.buttonBorderRadius || theme.buttonBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    heroGallery: mergedHeroGalleryData ? (
      <HeroGallery
        {...mergedHeroGalleryData}
        borderRadius={mergedHeroGalleryData?.buttonBorderRadius || theme.buttonBorderRadius}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    heroWave: mergedHeroWaveData ? (
      <HeroWave
        {...mergedHeroWaveData}
        borderRadius={mergedHeroWaveData?.buttonBorderRadius || theme.buttonBorderRadius}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    heroNova: mergedHeroNovaData ? (
      <HeroNova
        {...mergedHeroNovaData}
        borderRadius={mergedHeroNovaData?.buttonBorderRadius || theme.buttonBorderRadius}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    features: <SectionBackground backgroundImageUrl={mergedFeaturesData?.backgroundImageUrl} backgroundColor={mergedFeaturesData?.colors?.background} backgroundOverlayEnabled={mergedFeaturesData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedFeaturesData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedFeaturesData?.backgroundOverlayColor}><Features {...mergedFeaturesData} borderRadius={mergedFeaturesData.borderRadius || theme.cardBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    testimonials: <SectionBackground backgroundImageUrl={mergedTestimonialsData?.backgroundImageUrl} backgroundColor={mergedTestimonialsData?.colors?.background} backgroundOverlayEnabled={mergedTestimonialsData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedTestimonialsData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedTestimonialsData?.backgroundOverlayColor}><Testimonials {...mergedTestimonialsData} borderRadius={mergedTestimonialsData.borderRadius || theme.cardBorderRadius} cardShadow={mergedTestimonialsData.cardShadow} borderStyle={mergedTestimonialsData.borderStyle} cardPadding={mergedTestimonialsData.cardPadding} testimonialsVariant={mergedTestimonialsData.testimonialsVariant} /></SectionBackground>,
    slideshow: <SectionBackground backgroundImageUrl={mergedSlideshowData?.backgroundImageUrl} backgroundColor={mergedSlideshowData?.colors?.background} backgroundOverlayEnabled={mergedSlideshowData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedSlideshowData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedSlideshowData?.backgroundOverlayColor}><Slideshow {...mergedSlideshowData} borderRadius={theme.cardBorderRadius} /></SectionBackground>,
    pricing: <SectionBackground backgroundImageUrl={mergedPricingData?.backgroundImageUrl} backgroundColor={mergedPricingData?.colors?.background} backgroundOverlayEnabled={mergedPricingData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedPricingData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedPricingData?.backgroundOverlayColor}><Pricing {...mergedPricingData} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} /></SectionBackground>,
    faq: <SectionBackground backgroundImageUrl={mergedFaqData?.backgroundImageUrl} backgroundColor={mergedFaqData?.colors?.background} backgroundOverlayEnabled={mergedFaqData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedFaqData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedFaqData?.backgroundOverlayColor}><Faq {...mergedFaqData} borderRadius={theme.cardBorderRadius} /></SectionBackground>,
    leads: <SectionBackground backgroundImageUrl={mergedLeadsData?.backgroundImageUrl} backgroundColor={mergedLeadsData?.colors?.background} backgroundOverlayEnabled={mergedLeadsData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedLeadsData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedLeadsData?.backgroundOverlayColor}><Leads {...mergedLeadsData} cardBorderRadius={mergedLeadsData.cardBorderRadius || theme.cardBorderRadius} inputBorderRadius={mergedLeadsData.inputBorderRadius || 'md'} buttonBorderRadius={mergedLeadsData.buttonBorderRadius || theme.buttonBorderRadius} /></SectionBackground>,
    newsletter: <SectionBackground backgroundImageUrl={mergedNewsletterData?.backgroundImageUrl} backgroundColor={mergedNewsletterData?.colors?.background} backgroundOverlayEnabled={mergedNewsletterData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedNewsletterData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedNewsletterData?.backgroundOverlayColor}><Newsletter {...mergedNewsletterData} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} /></SectionBackground>,
    cta: <SectionBackground backgroundImageUrl={mergedCtaData?.backgroundImageUrl} backgroundColor={mergedCtaData?.colors?.background} backgroundOverlayEnabled={mergedCtaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedCtaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedCtaData?.backgroundOverlayColor}><CTASection {...mergedCtaData} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    portfolio: <SectionBackground backgroundImageUrl={mergedPortfolioData?.backgroundImageUrl} backgroundColor={mergedPortfolioData?.colors?.background} backgroundOverlayEnabled={mergedPortfolioData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedPortfolioData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedPortfolioData?.backgroundOverlayColor}><Portfolio {...mergedPortfolioData} borderRadius={theme.cardBorderRadius} /></SectionBackground>,
    services: <SectionBackground backgroundImageUrl={mergedServicesData?.backgroundImageUrl} backgroundColor={mergedServicesData?.colors?.background} backgroundOverlayEnabled={mergedServicesData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedServicesData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedServicesData?.backgroundOverlayColor}><Services {...mergedServicesData} borderRadius={theme.cardBorderRadius} /></SectionBackground>,
    team: <SectionBackground backgroundImageUrl={mergedTeamData?.backgroundImageUrl} backgroundColor={mergedTeamData?.colors?.background} backgroundOverlayEnabled={mergedTeamData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedTeamData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedTeamData?.backgroundOverlayColor}><Team {...mergedTeamData} borderRadius={theme.cardBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    video: <SectionBackground backgroundImageUrl={mergedVideoData?.backgroundImageUrl} backgroundColor={mergedVideoData?.colors?.background} backgroundOverlayEnabled={mergedVideoData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedVideoData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedVideoData?.backgroundOverlayColor}><Video {...mergedVideoData} borderRadius={theme.cardBorderRadius} /></SectionBackground>,
    howItWorks: <SectionBackground backgroundImageUrl={mergedHowItWorksData?.backgroundImageUrl} backgroundColor={mergedHowItWorksData?.colors?.background} backgroundOverlayEnabled={mergedHowItWorksData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHowItWorksData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHowItWorksData?.backgroundOverlayColor}><HowItWorks {...mergedHowItWorksData} borderRadius={theme.cardBorderRadius} /></SectionBackground>,
    map: <SectionBackground backgroundImageUrl={mergedMapData?.backgroundImageUrl} backgroundColor={mergedMapData?.colors?.background} backgroundOverlayEnabled={mergedMapData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedMapData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedMapData?.backgroundOverlayColor}><BusinessMap {...mergedMapData} apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''} borderRadius={theme.cardBorderRadius} /></SectionBackground>,
    menu: <SectionBackground backgroundImageUrl={mergedMenuData?.backgroundImageUrl} backgroundColor={mergedMenuData?.colors?.background} backgroundOverlayEnabled={mergedMenuData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedMenuData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedMenuData?.backgroundOverlayColor}><Menu {...mergedMenuData} borderRadius={theme.cardBorderRadius} /></SectionBackground>,
    banner: <Banner {...mergedBannerData} buttonBorderRadius={theme.buttonBorderRadius} />,
    topBar: mergedTopBarData ? (
      <TopBar
        {...mergedTopBarData}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    logoBanner: mergedLogoBannerData ? (
      <LogoBanner
        {...mergedLogoBannerData}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    products: (
      <Products
        {...productsWithData}
        primaryColor={productsWithData.colors?.accent || theme.globalColors?.primary || '#4f46e5'}
        storeUrl="#store"
      />
    ),
    chatbot: null, // Deprecated: ChatbotWidget now renders automatically when aiAssistantConfig.isActive
    footer: <Footer {...mergedFooterData} onNavigate={handleLinkNavigation} />,
    header: null,
    typography: null,
    colors: null, // Global colors are managed via theme settings
    // Ecommerce section components
    featuredProducts: mergedFeaturedProductsData ? (
      <FeaturedProducts
        data={mergedFeaturedProductsData}
        storeId={activeProjectId || undefined}
        onProductClick={handleNavigateToProduct}
      />
    ) : null,
    categoryGrid: mergedCategoryGridData ? (
      <CategoryGrid
        data={mergedCategoryGridData}
        storeId={activeProjectId || undefined}
        onCategoryClick={handleNavigateToCategory}
      />
    ) : null,
    productHero: mergedProductHeroData ? (
      <ProductHero
        data={mergedProductHeroData}
        storeId={activeProjectId || undefined}
        onProductClick={handleNavigateToProduct}
      />
    ) : null,
    saleCountdown: mergedSaleCountdownData ? (
      <SaleCountdown
        data={mergedSaleCountdownData}
        storeId={activeProjectId || undefined}
        onProductClick={handleNavigateToProduct}
      />
    ) : null,
    trustBadges: mergedTrustBadgesData ? (
      <TrustBadges data={mergedTrustBadgesData} />
    ) : null,
    recentlyViewed: mergedRecentlyViewedData ? (
      <RecentlyViewed
        data={mergedRecentlyViewedData}
        storeId={activeProjectId || undefined}
        onProductClick={handleNavigateToProduct}
      />
    ) : null,
    productReviews: mergedProductReviewsData ? (
      <ProductReviews data={mergedProductReviewsData} />
    ) : null,
    collectionBanner: mergedCollectionBannerData ? (
      <CollectionBanner
        data={mergedCollectionBannerData}
        onCollectionClick={handleNavigateToCategory}
      />
    ) : null,
    productBundle: mergedProductBundleData ? (
      <ProductBundle
        data={mergedProductBundleData}
        storeId={activeProjectId || undefined}
        onProductClick={handleNavigateToProduct}
      />
    ) : null,
    announcementBar: mergedAnnouncementBarData ? (
      <AnnouncementBar data={mergedAnnouncementBarData} />
    ) : null,
    // Store settings is a config section, not a visual component
    storeSettings: null,
    // CMS Feed section - renders blog posts grid
    cmsFeed: (() => {
      const fd = mergedCMSFeedData || data.cmsFeed || {} as any;
      const colors = fd.colors || {};
      const layout = fd.layout || 'grid';
      const cols = fd.columns || 3;
      const maxPosts = fd.maxPosts || 6;
      const categoryFilter = fd.categoryFilter || 'all';
      const showOnlyPublished = fd.showOnlyPublished !== false;
      const showFeaturedImage = fd.showFeaturedImage !== false;
      const showExcerpt = fd.showExcerpt !== false;
      const showDate = fd.showDate !== false;
      const showAuthor = fd.showAuthor !== false;
      const showCategoryBadge = fd.showCategoryBadge !== false;
      const showReadMore = fd.showReadMore !== false;
      const readMoreText = fd.readMoreText || 'Read More';
      const viewAllText = fd.viewAllText || '';
      const viewAllLink = fd.viewAllLink || '/blog';
      const imageStyle = fd.imageStyle || 'rounded';
      const cardStyle = fd.cardStyle || 'classic';

      const paddingYMap: Record<string, string> = { none: '0', sm: '2rem', md: '4rem', lg: '6rem', xl: '8rem' };
      const paddingXMap: Record<string, string> = { none: '0', sm: '1rem', md: '2rem', lg: '4rem', xl: '6rem' };
      const py = paddingYMap[fd.paddingY || 'md'] || '4rem';
      const px = paddingXMap[fd.paddingX || 'md'] || '2rem';

      const titleSizeMap: Record<string, string> = { sm: '1.5rem', md: '2rem', lg: '2.5rem', xl: '3rem' };
      const descSizeMap: Record<string, string> = { sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' };

      let filteredPosts = [...cmsPosts];
      if (showOnlyPublished) filteredPosts = filteredPosts.filter(p => p.status === 'published');
      if (categoryFilter !== 'all') filteredPosts = filteredPosts.filter(p => p.categoryId === categoryFilter);
      filteredPosts = filteredPosts.slice(0, maxPosts);

      const imageRadius = imageStyle === 'rounded' ? theme.cardBorderRadius || 'lg' : imageStyle === 'square' ? 'none' : 'none';
      const borderRadiusMap: Record<string, string> = { none: '0', sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', '2xl': '1.5rem', full: '9999px' };
      const cardRadius = borderRadiusMap[theme.cardBorderRadius || 'lg'] || '0.75rem';
      const imgRadiusVal = borderRadiusMap[imageRadius] || '0.75rem';

      const gridColClass = layout === 'grid'
        ? cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 md:grid-cols-2' : cols === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : layout === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

      const resolvedCategory = (catId: string) => {
        const cat = categories.find((c: any) => c.id === catId);
        return cat?.name || '';
      };

      // === CARD RENDERERS ===
      const renderCard = (post: any, idx?: number) => {
        const categoryName = post.categoryId ? resolvedCategory(post.categoryId) : '';
        const dateStr = new Date(post.publishedAt || post.createdAt).toLocaleDateString();

        // Classic: Image top, text below
        if (cardStyle === 'classic') return (
          <div key={post.id} className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ borderRadius: cardRadius, background: colors.cardBackground || '#1e293b', border: `1px solid ${colors.cardBorder || '#334155'}` }} onClick={() => handleLinkNavigation(`/blog/${post.slug}`)}>
            {showFeaturedImage && post.featuredImage && (
              <div className="h-52 overflow-hidden" style={{ borderRadius: imageStyle === 'cover' ? '0' : `${imgRadiusVal} ${imgRadiusVal} 0 0` }}>
                <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            )}
            <div className="p-5">
              {showCategoryBadge && categoryName && <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3" style={{ background: colors.categoryBadgeBackground || '#4f46e5', color: colors.categoryBadgeText || '#fff' }}>{categoryName}</span>}
              <h3 className="font-bold text-lg mb-2 group-hover:opacity-80 transition-opacity" style={{ color: colors.cardHeading || '#f8fafc' }}>{post.title}</h3>
              {showExcerpt && <p className="line-clamp-2 mb-3" style={{ color: colors.cardExcerpt || '#94a3b8', fontSize: '0.875rem' }}>{post.excerpt}</p>}
              <div className="flex items-center gap-3 text-xs" style={{ color: colors.cardText || '#cbd5e1' }}>
                {showAuthor && post.author && <span>{post.author}</span>}
                {showDate && <span>{dateStr}</span>}
              </div>
              {showReadMore && <span className="inline-block mt-3 text-sm font-semibold" style={{ color: colors.buttonBackground || '#4f46e5' }}>{readMoreText} \u2192</span>}
            </div>
          </div>
        );

        // Overlay: Text on top of image with gradient
        if (cardStyle === 'overlay') return (
          <div key={post.id} className="group cursor-pointer relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl" style={{ borderRadius: cardRadius, minHeight: '320px' }} onClick={() => handleLinkNavigation(`/blog/${post.slug}`)}>
            {post.featuredImage ? (
              <img src={post.featuredImage} alt={post.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            ) : (
              <div className="absolute inset-0" style={{ background: colors.cardBackground || '#1e293b' }} />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />
            <div className="relative h-full flex flex-col justify-end p-6" style={{ minHeight: '320px' }}>
              {showCategoryBadge && categoryName && <span className="inline-block w-fit px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3" style={{ background: colors.categoryBadgeBackground || '#4f46e5', color: colors.categoryBadgeText || '#fff' }}>{categoryName}</span>}
              <h3 className="font-bold text-xl mb-2 drop-shadow-lg group-hover:opacity-90 transition-opacity" style={{ color: '#ffffff' }}>{post.title}</h3>
              {showExcerpt && <p className="line-clamp-2 mb-3 drop-shadow" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>{post.excerpt}</p>}
              <div className="flex items-center gap-3 text-xs drop-shadow" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {showAuthor && post.author && <span>{post.author}</span>}
                {showDate && <span>{dateStr}</span>}
              </div>
              {showReadMore && <span className="inline-block mt-3 text-sm font-semibold" style={{ color: colors.categoryBadgeBackground || '#4f46e5' }}>{readMoreText} \u2192</span>}
            </div>
          </div>
        );

        // Minimal: Small thumbnail left, text right (compact)
        if (cardStyle === 'minimal') return (
          <div key={post.id} className="group cursor-pointer flex gap-4 p-4 overflow-hidden transition-all duration-300 hover:translate-x-1" style={{ borderRadius: cardRadius, background: colors.cardBackground || '#1e293b', border: `1px solid ${colors.cardBorder || '#334155'}` }} onClick={() => handleLinkNavigation(`/blog/${post.slug}`)}>
            {showFeaturedImage && post.featuredImage && (
              <div className="w-20 h-20 flex-shrink-0 overflow-hidden" style={{ borderRadius: imgRadiusVal }}>
                <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {showCategoryBadge && categoryName && <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full mb-1.5" style={{ background: colors.categoryBadgeBackground || '#4f46e5', color: colors.categoryBadgeText || '#fff' }}>{categoryName}</span>}
              <h3 className="font-bold text-sm mb-1 truncate group-hover:opacity-80 transition-opacity" style={{ color: colors.cardHeading || '#f8fafc' }}>{post.title}</h3>
              {showExcerpt && <p className="line-clamp-1 text-xs" style={{ color: colors.cardExcerpt || '#94a3b8' }}>{post.excerpt}</p>}
              <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: colors.cardText || '#cbd5e1' }}>
                {showAuthor && post.author && <span>{post.author}</span>}
                {showDate && <span>{dateStr}</span>}
              </div>
            </div>
          </div>
        );

        // Compact Square: 1:1 aspect ratio with overlay text
        if (cardStyle === 'compact') return (
          <div key={post.id} className="group cursor-pointer relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl" style={{ borderRadius: cardRadius, paddingBottom: '100%' /* 1:1 */ }} onClick={() => handleLinkNavigation(`/blog/${post.slug}`)}>
            {post.featuredImage ? (
              <img src={post.featuredImage} alt={post.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            ) : (
              <div className="absolute inset-0" style={{ background: colors.cardBackground || '#1e293b' }} />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              {showCategoryBadge && categoryName && <span className="inline-block w-fit px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full mb-2" style={{ background: colors.categoryBadgeBackground || '#4f46e5', color: colors.categoryBadgeText || '#fff' }}>{categoryName}</span>}
              <h3 className="font-bold text-base mb-1 drop-shadow-lg group-hover:opacity-90 transition-opacity line-clamp-2" style={{ color: '#ffffff' }}>{post.title}</h3>
              <div className="flex items-center gap-2 text-[10px] drop-shadow" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {showAuthor && post.author && <span>{post.author}</span>}
                {showDate && <span>{dateStr}</span>}
              </div>
            </div>
          </div>
        );

        // Editorial: Large image, bold heading, generous spacing
        return (
          <div key={post.id} className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ borderRadius: cardRadius, background: colors.cardBackground || '#1e293b', border: `1px solid ${colors.cardBorder || '#334155'}` }} onClick={() => handleLinkNavigation(`/blog/${post.slug}`)}>
            {showFeaturedImage && post.featuredImage && (
              <div className="h-64 overflow-hidden" style={{ borderRadius: imageStyle === 'cover' ? '0' : `${imgRadiusVal} ${imgRadiusVal} 0 0` }}>
                <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                {showCategoryBadge && categoryName && <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full" style={{ background: colors.categoryBadgeBackground || '#4f46e5', color: colors.categoryBadgeText || '#fff' }}>{categoryName}</span>}
                <div className="flex items-center gap-2 text-xs" style={{ color: colors.cardText || '#cbd5e1' }}>
                  {showDate && <span>{dateStr}</span>}
                </div>
              </div>
              <h3 className="font-extrabold text-2xl mb-3 group-hover:opacity-80 transition-opacity leading-tight" style={{ color: colors.cardHeading || '#f8fafc', fontFamily: 'var(--font-header)' }}>{post.title}</h3>
              {showExcerpt && <p className="line-clamp-3 mb-4 leading-relaxed" style={{ color: colors.cardExcerpt || '#94a3b8' }}>{post.excerpt}</p>}
              <div className="flex items-center justify-between">
                {showAuthor && post.author && <span className="text-sm font-medium" style={{ color: colors.cardText || '#cbd5e1' }}>{post.author}</span>}
                {showReadMore && <span className="text-sm font-bold" style={{ color: colors.buttonBackground || '#4f46e5' }}>{readMoreText} \u2192</span>}
              </div>
            </div>
          </div>
        );
      };

      return (
        <SectionBackground
          backgroundImageUrl={fd.backgroundImageUrl}
          backgroundColor={colors.background}
          backgroundOverlayEnabled={fd.backgroundOverlayEnabled}
          backgroundOverlayOpacity={fd.backgroundOverlayOpacity}
          backgroundOverlayColor={fd.backgroundOverlayColor}
        >
          <section id="cmsFeed" style={{ padding: `${py} ${px}`, background: colors.background || 'transparent' }}>
            {/* Corner Gradient */}
            {fd.cornerGradient?.enabled && (
              <div className="absolute inset-0 pointer-events-none" style={{
                background: (() => {
                  const dirs: Record<string, string> = { 'top-left': 'to bottom right', 'top-right': 'to bottom left', 'bottom-left': 'to top right', 'bottom-right': 'to top left' };
                  const dir = dirs[fd.cornerGradient.position] || 'to bottom right';
                  const hex = fd.cornerGradient.color || '#ffffff';
                  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
                  return `linear-gradient(${dir}, rgba(${r},${g},${b},${(fd.cornerGradient.opacity || 20) / 100}) 0%, transparent ${fd.cornerGradient.size || 50}%)`;
                })()
              }} />
            )}

            <div className="container mx-auto relative z-10">
              {/* Section Header */}
              {(fd.title || fd.description) && (
                <div className="text-center mb-12">
                  {fd.title && (
                    <h2 style={{ fontSize: titleSizeMap[fd.titleFontSize || 'md'], color: colors.heading || '#F9FAFB', fontFamily: 'var(--font-header)', fontWeight: 'var(--font-weight-header)' as any }} className="font-bold mb-4">
                      {fd.title}
                    </h2>
                  )}
                  {fd.description && (
                    <p style={{ fontSize: descSizeMap[fd.descriptionFontSize || 'md'], color: colors.text || '#94a3b8' }} className="max-w-2xl mx-auto">
                      {fd.description}
                    </p>
                  )}
                </div>
              )}

              {/* Posts Grid */}
              {filteredPosts.length === 0 ? (
                <div className="text-center py-16" style={{ color: colors.text || '#94a3b8' }}>
                  <p className="text-lg opacity-60">No articles to display</p>
                </div>
              ) : layout === 'magazine' ? (
                /* Magazine Layout: Large featured + smaller grid */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredPosts.map((post, idx) => (
                    <div key={post.id} className={idx === 0 ? 'lg:row-span-2' : ''}>
                      {renderCard(post, idx)}
                    </div>
                  ))}
                </div>
              ) : layout === 'carousel' ? (
                /* Carousel Layout: Horizontal scroll */
                <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                  {filteredPosts.map((post, idx) => (
                    <div key={post.id} className="flex-shrink-0 snap-start" style={{ width: cardStyle === 'compact' ? '280px' : '320px' }}>
                      {renderCard(post, idx)}
                    </div>
                  ))}
                </div>
              ) : layout === 'list' ? (
                /* List Layout */
                <div className="space-y-4">
                  {filteredPosts.map((post, idx) => renderCard(post, idx))}
                </div>
              ) : (
                /* Default Grid Layout */
                <div className={`grid ${gridColClass} gap-6`}>
                  {filteredPosts.map((post, idx) => renderCard(post, idx))}
                </div>
              )}

              {/* View All CTA */}
              {viewAllText && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => handleLinkNavigation(viewAllLink)}
                    className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all duration-300 hover:opacity-90"
                    style={{ background: colors.buttonBackground || '#4f46e5', color: colors.buttonText || '#fff', borderRadius: borderRadiusMap[theme.buttonBorderRadius || 'md'] || '0.5rem' }}
                  >
                    {viewAllText}
                  </button>
                </div>
              )}
            </div>
          </section>
        </SectionBackground>
      );
    })(),
    // SignupFloat is a floating overlay, rendered separately below
    signupFloat: null,
  };

  // Font variables are now injected directly into :root via useEffect above
  // This ensures Tailwind's font-header, font-body, and font-button classes work correctly

  // Dynamic Menu Resolution - prioritize: CMS Menu > Pages > Manual Links
  const headerLinks = useMemo(() => {
    // 1. CMS Menu takes priority if configured
    if (mergedHeaderData.menuId) {
      const menu = menus.find(m => m.id === mergedHeaderData.menuId);
      if (menu) {
        return menu.items.map(i => ({ text: i.text, href: i.href }));
      }
    }

    // 2. Generate from pages if available (multi-page architecture)
    if (pages && pages.length > 0) {
      const navPages = pages
        .filter(p => p.showInNavigation)
        .sort((a, b) => (a.navigationOrder || 0) - (b.navigationOrder || 0));

      if (navPages.length > 0) {
        return navPages.map(p => ({
          text: p.title,
          // Use / for home page, real paths for other pages
          href: p.isHomePage ? '/' : `/${(p.slug || '').replace(/^\//, '')}`,
        }));
      }
    }

    // 3. Fall back to manual links
    return mergedHeaderData.links;
  }, [mergedHeaderData.menuId, mergedHeaderData.links, menus, pages]);

  // Resolve Footer Columns dynamically
  const resolvedFooterData: FooterData = {
    ...mergedFooterData,
    // Auto-hide "Made with Quimera" badge when White Label branding is active
    hideBranding: mergedFooterData.hideBranding || hasWhiteLabelBranding,
    linkColumns: mergedFooterData.linkColumns.map(col => {
      if (col.menuId) {
        const menu = menus.find(m => m.id === col.menuId);
        if (menu) {
          return { ...col, links: menu.items.map(i => ({ text: i.text, href: i.href })) };
        }
      }
      return col;
    })
  };

  const isArticleHash = typeof window !== 'undefined' && window.location.hash.startsWith('#article:');
  const isBlogPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/blog/');

  // Determine if we should show the loading spinner for an article
  const showArticleLoading = (isArticleHash || isBlogPath) && (isLoadingCMS || (isRouting && !activePost));

  // Use theme pageBackground with smart fallback based on globalColors or hero background
  // Priority: pageBackground > globalColors.background > hero background > default
  const pageBackgroundColor = theme?.pageBackground
    || theme?.globalColors?.background
    || data?.hero?.colors?.background
    || '#0f172a'; // Default to modern dark slate instead of white

  return (
    <div
      className={`text-slate-200 overflow-x-hidden transition-colors duration-500`}
    // Use inline style for background color to handle dynamic values safely
    // The `bg-[color]` utility doesn't handle undefined values gracefully in runtime CSS generation
    // Note: Removed font-body class from here - each component applies its own font class
    >
      <style>{`
            :root {
                --site-base-bg: ${pageBackgroundColor};
                --site-surface-bg: ${theme?.globalColors?.surface || pageBackgroundColor};
            }
            body, .bg-site-base { background-color: ${pageBackgroundColor}; }
        `}</style>

      {/* Announcement Bar - Above Header position */}
      {mergedAnnouncementBarData?.position === 'above-header' && componentStatus['announcementBar' as PageSection] && effectiveSectionVisibility['announcementBar' as PageSection] && (
        <div
          id="announcementBar-above"
          className={`w-full cursor-pointer transition-all duration-200 ${activeSection === 'announcementBar' ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSectionSelect('announcementBar' as PageSection);
          }}
        >
          {componentsMap['announcementBar' as PageSection]}
        </div>
      )}

      {/* TopBar - Above Header position */}
      {mergedTopBarData?.aboveHeader && componentStatus['topBar' as PageSection] && effectiveSectionVisibility['topBar' as PageSection] && (
        <div
          id="topBar-above"
          className={`w-full cursor-pointer transition-all duration-200 ${activeSection === 'topBar' ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSectionSelect('topBar' as PageSection);
          }}
        >
          {componentsMap['topBar' as PageSection]}
        </div>
      )}

      {/* Header is always visible - forceSolid when in store view (no hero behind) */}
      <Header
        {...mergedHeaderData}
        links={headerLinks}
        forceSolid={isStoreViewActive}
        showCart={storefrontProducts.length > 0 && isAnyEcommerceComponentEnabled}
        cartItemCount={cart.itemCount}
        onCartClick={cart.toggleCart}
        onNavigate={handleLinkNavigation}
      />

      {/* Cart Drawer - only when store has products AND ecommerce is enabled */}
      {storefrontProducts.length > 0 && isAnyEcommerceComponentEnabled && (
        <CartDrawer
          isOpen={cart.isCartOpen}
          onClose={cart.closeCart}
          items={cart.items}
          subtotal={cart.subtotal}
          discountCode={cart.discountCode || undefined}
          discountAmount={cart.discountAmount}
          onUpdateQuantity={cart.updateQuantity}
          onRemoveItem={cart.removeItem}
          onApplyDiscount={cart.applyDiscount}
          onRemoveDiscount={cart.removeDiscount}
          onCheckout={() => {
            handleNavigateToCheckout();
            cart.closeCart();
          }}
          storeId={activeProjectId || ''}
          primaryColor={theme.globalColors?.primary || '#6366f1'}
          freeShippingThreshold={500}
          colors={{
            background: data.storeSettings?.cartDrawerColors?.background || theme.globalColors?.background || theme.globalColors?.surface,
            heading: data.storeSettings?.cartDrawerColors?.heading || theme.globalColors?.heading,
            text: data.storeSettings?.cartDrawerColors?.text || theme.globalColors?.textMuted || theme.globalColors?.text,
            accent: data.storeSettings?.cartDrawerColors?.accent || theme.globalColors?.primary,
            cardBackground: data.storeSettings?.cartDrawerColors?.cardBackground || theme.globalColors?.surface,
            cardText: data.storeSettings?.cartDrawerColors?.cardText || theme.globalColors?.text,
            buttonBackground: data.storeSettings?.cartDrawerColors?.buttonBackground || theme.globalColors?.primary,
            buttonText: data.storeSettings?.cartDrawerColors?.buttonText,
            priceColor: data.storeSettings?.cartDrawerColors?.priceColor || theme.globalColors?.primary,
            borderColor: data.storeSettings?.cartDrawerColors?.borderColor || theme.globalColors?.border,
          }}
        />
      )}

      <main className="min-h-screen bg-site-base relative">
        {/* 1. Loading State */}
        {showArticleLoading && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-editor-text-secondary">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading article...</p>
          </div>
        )}

        {/* 2. Article View */}
        {!showArticleLoading && activePost && (() => {
          const postCategory = categories.find(c => c.id === activePost.categoryId);
          return (
            <BlogPost
              post={activePost}
              theme={theme}
              onBack={handleBackToHome}
              backgroundColor={pageBackgroundColor}
              textColor={data.hero?.colors?.text || '#ffffff'}
              accentColor={data.hero?.colors?.primary || '#4f46e5'}
              layoutType={postCategory?.layoutType}
            />
          );
        })()}

        {/* 2.5. Category View */}
        {!showArticleLoading && !activePost && activeCategorySlug && (() => {
          const category = categories.find(c => c.slug === activeCategorySlug);
          if (!category) {
            return (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-3xl font-bold text-site-heading mb-4">Category not found</h2>
                <button onClick={handleBackToHome} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all">Back to Home</button>
              </div>
            );
          }
          const categoryPosts = cmsPosts.filter(p => p.categoryId === category.id);
          return (
            <BlogCategoryPage
              category={category}
              posts={categoryPosts}
              onNavigateBack={handleBackToHome}
              onArticleClick={(slug) => handleLinkNavigation(`/blog/${slug}`)}
              backgroundColor={pageBackgroundColor}
              textColor={data.hero?.colors?.text || '#ffffff'}
              accentColor={data.hero?.colors?.primary || '#4f46e5'}
              headerStyle={data.header?.style || ''}
            />
          );
        })()}

        {/* 3. 404 State (Article hash or /blog/ path but no post found after loading) */}
        {!showArticleLoading && (isArticleHash || blogSlugNotFound) && !activePost && !isLoadingCMS && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl font-bold text-site-heading mb-4">Article Not Found</h2>
            <p className="text-site-body mb-8">The article you are looking for does not exist or has been removed.</p>
            <button
              onClick={handleBackToHome}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all"
            >
              Back to Home
            </button>
          </div>
        )}

        {/* 4. Store View - All Products */}
        {storeView.type === 'store' && activeProjectId && (
          <>
            {/* Ecommerce Section Components (above products) */}
            {effectiveComponentOrder
              .filter(key => {
                const ecommerceSections: PageSection[] = ['announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'saleCountdown', 'collectionBanner'];
                return ecommerceSections.includes(key as PageSection) &&
                  componentStatus[key as PageSection] &&
                  effectiveSectionVisibility[key as PageSection] &&
                  isEcommerceComponentVisibleIn(key as PageSection, 'store');
              })
              .map(key => (
                <div
                  id={key}
                  key={key}
                  className={`w-full cursor-pointer transition-all duration-200 ${activeSection === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSectionSelect(key as PageSection);
                  }}
                >
                  {componentsMap[key as PageSection]}
                </div>
              ))
            }

            {/* Main Product Search */}
            <ProductSearchPage
              storeId={activeProjectId}
              onProductClick={handleNavigateToProduct}
              primaryColor={theme.globalColors?.primary || '#6366f1'}
              embedded={true}
              title="Tienda"
              showFilterSidebar={data.storeSettings?.showFilterSidebar !== false}
              showSearchBar={data.storeSettings?.showSearchBar !== false}
              showSortOptions={data.storeSettings?.showSortOptions !== false}
              showViewModeToggle={data.storeSettings?.showViewModeToggle !== false}
              defaultViewMode={data.storeSettings?.defaultViewMode || 'grid'}
              productsPerPage={data.storeSettings?.productsPerPage || 12}
              gridColumns={data.storeSettings?.gridColumns || 4}
              cardStyle={data.storeSettings?.cardStyle || 'modern'}
              borderRadius={data.storeSettings?.borderRadius || 'xl'}
              cardGap={data.storeSettings?.cardGap || 'md'}
              paddingY={data.storeSettings?.paddingY || 'md'}
              paddingX={data.storeSettings?.paddingX || 'md'}
              themeColors={{
                background: 'transparent',
                text: data.storeSettings?.colors?.text || theme.globalColors?.text || '#94a3b8',
                heading: data.storeSettings?.colors?.heading || theme.globalColors?.heading || '#ffffff',
                cardBackground: data.storeSettings?.colors?.cardBackground || theme.globalColors?.surface || '#1e293b',
                cardText: data.storeSettings?.colors?.cardText || theme.globalColors?.text || '#94a3b8',
                border: data.storeSettings?.colors?.borderColor || theme.globalColors?.border || '#334155',
                priceColor: data.storeSettings?.colors?.priceColor || theme.globalColors?.heading || '#ffffff',
                salePriceColor: data.storeSettings?.colors?.salePriceColor || '#ef4444',
                mutedText: data.storeSettings?.colors?.text || theme.globalColors?.text || '#64748b',
              }}
            />

            {/* Ecommerce Section Components (below products) */}
            {effectiveComponentOrder
              .filter(key => {
                const ecommerceSectionsBelow: PageSection[] = ['trustBadges', 'recentlyViewed', 'productReviews', 'productBundle'];
                return ecommerceSectionsBelow.includes(key as PageSection) &&
                  componentStatus[key as PageSection] &&
                  effectiveSectionVisibility[key as PageSection] &&
                  isEcommerceComponentVisibleIn(key as PageSection, 'store');
              })
              .map(key => (
                <div
                  id={key}
                  key={key}
                  className={`w-full cursor-pointer transition-all duration-200 ${activeSection === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSectionSelect(key as PageSection);
                  }}
                >
                  {componentsMap[key as PageSection]}
                </div>
              ))
            }
          </>
        )}

        {/* 5. Store View - Category */}
        {storeView.type === 'category' && activeProjectId && (
          <>
            {/* Announcement Bar for category view */}
            {componentStatus['announcementBar' as PageSection] && effectiveSectionVisibility['announcementBar' as PageSection] && isEcommerceComponentVisibleIn('announcementBar', 'store') && (
              <div
                id="announcementBar"
                className={`w-full cursor-pointer transition-all duration-200 ${activeSection === 'announcementBar' ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSectionSelect('announcementBar' as PageSection);
                }}
              >
                {componentsMap['announcementBar' as PageSection]}
              </div>
            )}

            <ProductSearchPage
              storeId={activeProjectId}
              onProductClick={handleNavigateToProduct}
              initialCategory={storeView.slug}
              primaryColor={theme.globalColors?.primary || '#6366f1'}
              embedded={true}
              showFilterSidebar={data.storeSettings?.showFilterSidebar !== false}
              showSearchBar={data.storeSettings?.showSearchBar !== false}
              showSortOptions={data.storeSettings?.showSortOptions !== false}
              showViewModeToggle={data.storeSettings?.showViewModeToggle !== false}
              defaultViewMode={data.storeSettings?.defaultViewMode || 'grid'}
              productsPerPage={data.storeSettings?.productsPerPage || 12}
              gridColumns={data.storeSettings?.gridColumns || 4}
              cardStyle={data.storeSettings?.cardStyle || 'modern'}
              borderRadius={data.storeSettings?.borderRadius || 'xl'}
              cardGap={data.storeSettings?.cardGap || 'md'}
              paddingY={data.storeSettings?.paddingY || 'md'}
              paddingX={data.storeSettings?.paddingX || 'md'}
              themeColors={{
                background: 'transparent',
                text: data.storeSettings?.colors?.text || theme.globalColors?.text || '#94a3b8',
                heading: data.storeSettings?.colors?.heading || theme.globalColors?.heading || '#ffffff',
                cardBackground: data.storeSettings?.colors?.cardBackground || theme.globalColors?.surface || '#1e293b',
                cardText: data.storeSettings?.colors?.cardText || theme.globalColors?.text || '#94a3b8',
                border: data.storeSettings?.colors?.borderColor || theme.globalColors?.border || '#334155',
                priceColor: data.storeSettings?.colors?.priceColor || theme.globalColors?.heading || '#ffffff',
                salePriceColor: data.storeSettings?.colors?.salePriceColor || '#ef4444',
                mutedText: data.storeSettings?.colors?.text || theme.globalColors?.text || '#64748b',
              }}
            />

            {/* Trust badges and recently viewed for category view */}
            {effectiveComponentOrder
              .filter(key => {
                const ecommerceSectionsBelow: PageSection[] = ['trustBadges', 'recentlyViewed'];
                return ecommerceSectionsBelow.includes(key as PageSection) &&
                  componentStatus[key as PageSection] &&
                  effectiveSectionVisibility[key as PageSection] &&
                  isEcommerceComponentVisibleIn(key as PageSection, 'store');
              })
              .map(key => (
                <div
                  id={key}
                  key={key}
                  className={`w-full cursor-pointer transition-all duration-200 ${activeSection === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSectionSelect(key as PageSection);
                  }}
                >
                  {componentsMap[key as PageSection]}
                </div>
              ))
            }
          </>
        )}

        {/* 6. Store View - Product Detail */}
        {storeView.type === 'product' && activeProjectId && (
          <>
            <ProductDetailPage
              storeId={activeProjectId}
              productSlug={storeView.slug}
              onNavigateToStore={handleNavigateToStore}
              onNavigateToCategory={handleNavigateToCategory}
              onNavigateToProduct={handleNavigateToProduct}
              onAddToCart={(product, quantity, variant) => cart.addItem(product, quantity, variant)}
              colors={data?.productDetailPage?.colors}
            />

            {/* Ecommerce components for product detail view */}
            {effectiveComponentOrder
              .filter(key => {
                const productDetailSections: PageSection[] = ['recentlyViewed', 'productReviews', 'productBundle', 'trustBadges'];
                return productDetailSections.includes(key as PageSection) &&
                  componentStatus[key as PageSection] &&
                  effectiveSectionVisibility[key as PageSection] &&
                  isEcommerceComponentVisibleIn(key as PageSection, 'store');
              })
              .map(key => (
                <div
                  id={key}
                  key={key}
                  className={`w-full cursor-pointer transition-all duration-200 ${activeSection === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSectionSelect(key as PageSection);
                  }}
                >
                  {componentsMap[key as PageSection]}
                </div>
              ))
            }
          </>
        )}

        {/* 6.5. Store View - Checkout */}
        {storeView.type === 'checkout' && activeProjectId && (
          <CheckoutPageEnhanced
            storeId={activeProjectId}
            onSuccess={(orderId) => {
              // Navigate to order confirmation or back to store
              cart.clearCart();
              handleNavigateToStore();
            }}
            onBack={handleNavigateToStore}
            onNavigateToStore={handleNavigateToStore}
          />
        )}

        {/* 7. Home View (Sections) - Only show when not in article, category, or store view */}
        {!isArticleHash && !activePost && !activeCategorySlug && !isStoreViewActive && (
          <>
            {effectiveComponentOrder
              .filter(key => {
                // Lista de componentes de ecommerce que deben verificar visibilidad
                const ecommerceComponents: PageSection[] = [
                  'featuredProducts', 'categoryGrid', 'productHero', 'saleCountdown',
                  'trustBadges', 'recentlyViewed', 'productReviews', 'collectionBanner',
                  'productBundle', 'announcementBar'
                ];

                const isEcommerce = ecommerceComponents.includes(key as PageSection);
                const baseVisibility = componentStatus[key as PageSection] &&
                  effectiveSectionVisibility[key as PageSection] &&
                  key !== 'footer' &&
                  key !== 'chatbot' &&
                  key !== 'header' && // Header is rendered separately
                  // AnnouncementBar is rendered separately when positioned above header
                  !(key === 'announcementBar' && mergedAnnouncementBarData?.position === 'above-header') &&
                  // TopBar is rendered separately when positioned above header
                  !(key === 'topBar' && mergedTopBarData?.aboveHeader);

                // Para componentes de ecommerce, verificar también visibleIn
                if (isEcommerce) {
                  return baseVisibility && isEcommerceComponentVisibleIn(key as PageSection, 'landing');
                }

                return baseVisibility;
              })
              .map(key => {
                return (
                  <div
                    id={key}
                    key={key}
                    className={`w-full cursor-pointer transition-all duration-200 ${activeSection === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSectionSelect(key as PageSection);
                    }}
                  >
                    {componentsMap[key as PageSection]}
                  </div>
                )
              })}
          </>
        )}
      </main>

      {/* Footer - Always visible on all pages including articles */}
      {!showArticleLoading && componentStatus.footer && effectiveSectionVisibility.footer && (
        <div
          id="footer"
          className={`w-full cursor-pointer transition-all duration-200 ${activeSection === 'footer' ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSectionSelect('footer' as PageSection);
          }}
        >
          <Footer {...resolvedFooterData} onNavigate={handleLinkNavigation} />
        </div>
      )}

      {/* Chatbot Widget - Renders independently outside component order */}
      <ChatbotWidget />

      {/* SignupFloat - Floating overlay rendered outside section flow */}
      {data?.signupFloat && effectiveComponentOrder.includes('signupFloat') && (sectionVisibility.signupFloat !== false) && (
        <SignupFloat
          {...data.signupFloat}
          projectId={activeProjectId || undefined}
          isPreviewMode={isEditorMode}
        />
      )}
    </div>
  );
};

// Main LandingPage component that wraps content in StorefrontCartProvider
const LandingPage: React.FC = () => {
  const { activeProjectId } = useProject();

  // Always wrap in StorefrontCartProvider when we have a project
  // The cart will just be empty if no products exist
  if (activeProjectId) {
    return (
      <StorefrontCartProvider storeId={activeProjectId}>
        <LandingPageContent />
      </StorefrontCartProvider>
    );
  }

  // Fallback when no project (shouldn't happen but safe)
  return <LandingPageContent />;
};

export default LandingPage;
