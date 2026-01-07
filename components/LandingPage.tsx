
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Header from './Header';
import Hero from './Hero';
import HeroModern from './HeroModern';
import HeroGradient from './HeroGradient';
import HeroFitness from './HeroFitness';
import HeroSplit from './HeroSplit';
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
import ChatbotWidget from './ChatbotWidget';
import BusinessMap from './BusinessMap';
import Menu from './Menu';
import Banner from './Banner';
import Products from './Products';
import { PageSection, FontFamily, CMSPost, FooterData } from '../types';
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

const fontStacks: Record<FontFamily, string> = {
    roboto: "'Roboto', sans-serif",
    'open-sans': "'Open Sans', sans-serif",
    lato: "'Lato', sans-serif",
    'slabo-27px': "'Slabo 27px', serif",
    oswald: "'Oswald', sans-serif",
    'source-sans-pro': "'Source Sans Pro', sans-serif",
    montserrat: "'Montserrat', sans-serif",
    raleway: "'Raleway', sans-serif",
    'pt-sans': "'PT Sans', sans-serif",
    merriweather: "'Merriweather', serif",
    lora: "'Lora', serif",
    ubuntu: "'Ubuntu', sans-serif",
    'playfair-display': "'Playfair Display', serif",
    'crimson-text': "'Crimson Text', serif",
    poppins: "'Poppins', sans-serif",
    arvo: "'Arvo', serif",
    mulish: "'Mulish', sans-serif",
    'noto-sans': "'Noto Sans', sans-serif",
    'noto-serif': "'Noto Serif', serif",
    inconsolata: "'Inconsolata', monospace",
    'indie-flower': "'Indie Flower', cursive",
    cabin: "'Cabin', sans-serif",
    'fira-sans': "'Fira Sans', sans-serif",
    pacifico: "'Pacifico', cursive",
    'josefin-sans': "'Josefin Sans', sans-serif",
    anton: "'Anton', sans-serif",
    'yanone-kaffeesatz': "'Yanone Kaffeesatz', sans-serif",
    arimo: "'Arimo', sans-serif",
    lobster: "'Lobster', cursive",
    'bree-serif': "'Bree Serif', serif",
    vollkorn: "'Vollkorn', serif",
    abel: "'Abel', sans-serif",
    'archivo-narrow': "'Archivo Narrow', sans-serif",
    'francois-one': "'Francois One', sans-serif",
    signika: "'Signika', sans-serif",
    oxygen: "'Oxygen', sans-serif",
    quicksand: "'Quicksand', sans-serif",
    'pt-serif': "'PT Serif', serif",
    bitter: "'Bitter', serif",
    'exo-2': "'Exo 2', sans-serif",
    'varela-round': "'Varela Round', sans-serif",
    dosis: "'Dosis', sans-serif",
    'noticia-text': "'Noticia Text', serif",
    'titillium-web': "'Titillium Web', sans-serif",
    nobile: "'Nobile', sans-serif",
    cardo: "'Cardo', serif",
    asap: "'Asap', sans-serif",
    questrial: "'Questrial', sans-serif",
    'dancing-script': "'Dancing Script', cursive",
    'amatic-sc': "'Amatic SC', cursive",
};

// Inner component that uses the cart context
const LandingPageContent: React.FC = () => {
  const authContext = useSafeAuth();
  const user = authContext?.user ?? null;
  const { activeSection, onSectionSelect } = useUI();
  const { data, theme, componentOrder, sectionVisibility, activeProjectId, pages, activePage } = useProject();
  const { cmsPosts, isLoadingCMS, menus } = useCMS();
  const { componentStatus, customComponents, componentStyles } = useAdmin();
  const [activePost, setActivePost] = useState<CMSPost | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  
  // Store view state for ecommerce hash routing
  const [storeView, setStoreView] = useState<StoreView>({ type: 'none' });

  // Load products from public store (storeId = projectId)
  const { products: storefrontProducts, isLoading: isLoadingProducts } = usePublicProducts(activeProjectId);
  
  // Cart context - available when wrapped in StorefrontCartProvider
  // Uses safe version that returns defaults when not in provider
  const cart = useSafeStorefrontCart();

  // Multi-page architecture: Use active page's sections if available
  const effectiveComponentOrder = useMemo(() => {
    if (activePage?.sections?.length) {
      return activePage.sections;
    }
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
    const headerFont = fontStacks[theme.fontFamilyHeader];
    const bodyFont = fontStacks[theme.fontFamilyBody];
    const buttonFont = fontStacks[theme.fontFamilyButton];
    
    root.style.setProperty('--font-header', headerFont);
    root.style.setProperty('--font-body', bodyFont);
    root.style.setProperty('--font-button', buttonFont);
    
    // All Caps variables
    root.style.setProperty('--headings-transform', theme.headingsAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--headings-spacing', theme.headingsAllCaps ? '0.05em' : 'normal');
    root.style.setProperty('--buttons-transform', theme.buttonsAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--buttons-spacing', theme.buttonsAllCaps ? '0.05em' : 'normal');
    root.style.setProperty('--navlinks-transform', theme.navLinksAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--navlinks-spacing', theme.navLinksAllCaps ? '0.05em' : 'normal');
  }, [theme.fontFamilyHeader, theme.fontFamilyBody, theme.fontFamilyButton, theme.headingsAllCaps, theme.buttonsAllCaps, theme.navLinksAllCaps]);

  // Handle Hash Routing for Articles and Store
  useEffect(() => {
      const handleHashChange = () => {
          const hash = window.location.hash;
          const decodedHash = decodeURIComponent(hash); // Handle %20 spaces

          // Reset all views first
          setActivePost(null);
          setStoreView({ type: 'none' });
          setIsRouting(false);

          // Article routing: #article:slug
          if (decodedHash.startsWith('#article:')) {
              setIsRouting(true);
              const slug = decodedHash.replace('#article:', '');
              const post = cmsPosts.find(p => p.slug === slug);
              
              if (post) {
                  setActivePost(post);
                  window.scrollTo(0, 0);
                  setIsRouting(false);
              } else {
                  // If posts are loading, wait (handled by isLoadingCMS in UI)
                  // If loaded and not found, stay in routing state or show 404 (handled in UI)
                   if (!isLoadingCMS && cmsPosts.length > 0) {
                       console.warn(`Article with slug "${slug}" not found.`);
                       setIsRouting(false);
                   }
              }
              return;
          }
          
          // Store routing: #store, #store/category/slug, #store/product/slug
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
          
          // Checkout routing: #checkout
          if (decodedHash === '#checkout') {
              setStoreView({ type: 'checkout' });
              window.scrollTo(0, 0);
              return;
          }
          
          // Handle scrolling for section links (e.g. #features)
          if (hash.length > 1) {
              // Allow render cycle to complete before scrolling
              setTimeout(() => {
                  const id = hash.substring(1);
                  const element = document.getElementById(id);
                  if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
              }, 100);
          }
      };

      // Check initial hash
      handleHashChange();

      // Listen for changes
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [cmsPosts, isLoadingCMS]); // Re-run when posts load via subscription

  const handleBackToHome = () => {
      window.location.hash = ''; 
      // This triggers hashchange, which sets activePost(null) and storeView to none
  };

  // Store navigation handlers
  const handleNavigateToStore = useCallback(() => {
      window.location.hash = 'store';
  }, []);

  const handleNavigateToCategory = useCallback((categorySlug: string) => {
      window.location.hash = `store/category/${categorySlug}`;
  }, []);

  const handleNavigateToProduct = useCallback((productSlug: string) => {
      window.location.hash = `store/product/${productSlug}`;
  }, []);

  const handleNavigateToCheckout = useCallback(() => {
      window.location.hash = 'checkout';
  }, []);

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
        return mergedData.heroVariant === 'modern'
          ? <HeroModern {...mergedData} borderRadius={mergedData.buttonBorderRadius || buttonBorderRadius} />
          : mergedData.heroVariant === 'gradient'
            ? <HeroGradient {...mergedData} borderRadius={mergedData.buttonBorderRadius || buttonBorderRadius} />
            : mergedData.heroVariant === 'fitness'
              ? <HeroFitness {...mergedData} borderRadius={mergedData.buttonBorderRadius || buttonBorderRadius} />
              : <Hero {...mergedData} borderRadius={mergedData.buttonBorderRadius || buttonBorderRadius} />;
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
  const mergedProductsData = mergeComponentData('products');

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
      mergedHeroData.heroVariant === 'modern' 
        ? <HeroModern {...mergedHeroData} borderRadius={mergedHeroData.buttonBorderRadius || theme.buttonBorderRadius} />
        : mergedHeroData.heroVariant === 'gradient'
          ? <HeroGradient {...mergedHeroData} borderRadius={mergedHeroData.buttonBorderRadius || theme.buttonBorderRadius} />
          : mergedHeroData.heroVariant === 'fitness'
            ? <HeroFitness {...mergedHeroData} borderRadius={mergedHeroData.buttonBorderRadius || theme.buttonBorderRadius} />
            : <Hero {...mergedHeroData} borderRadius={mergedHeroData.buttonBorderRadius || theme.buttonBorderRadius} />
    ),
    heroSplit: <HeroSplit {...mergedHeroSplitData} borderRadius={mergedHeroSplitData?.buttonBorderRadius || theme.buttonBorderRadius} />,
    features: <Features {...mergedFeaturesData} borderRadius={mergedFeaturesData.borderRadius || theme.cardBorderRadius} />,
    testimonials: <Testimonials {...mergedTestimonialsData} borderRadius={mergedTestimonialsData.borderRadius || theme.cardBorderRadius} cardShadow={mergedTestimonialsData.cardShadow} borderStyle={mergedTestimonialsData.borderStyle} cardPadding={mergedTestimonialsData.cardPadding} testimonialsVariant={mergedTestimonialsData.testimonialsVariant} />,
    slideshow: <Slideshow {...mergedSlideshowData} borderRadius={theme.cardBorderRadius} />,
    pricing: <Pricing {...mergedPricingData} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />,
    faq: <Faq {...mergedFaqData} borderRadius={theme.cardBorderRadius} />,
    leads: <Leads {...mergedLeadsData} cardBorderRadius={mergedLeadsData.cardBorderRadius || theme.cardBorderRadius} inputBorderRadius={mergedLeadsData.inputBorderRadius || 'md'} buttonBorderRadius={mergedLeadsData.buttonBorderRadius || theme.buttonBorderRadius} />,
    newsletter: <Newsletter {...mergedNewsletterData} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />,
    cta: <CTASection {...mergedCtaData} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />,
    portfolio: <Portfolio {...mergedPortfolioData} borderRadius={theme.cardBorderRadius} />,
    services: <Services {...mergedServicesData} borderRadius={theme.cardBorderRadius} />,
    team: <Team {...mergedTeamData} borderRadius={theme.cardBorderRadius} />,
    video: <Video {...mergedVideoData} borderRadius={theme.cardBorderRadius} />,
    howItWorks: <HowItWorks {...mergedHowItWorksData} borderRadius={theme.cardBorderRadius} />,
    map: <BusinessMap {...mergedMapData} apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''} borderRadius={theme.cardBorderRadius} />,
    menu: <Menu {...mergedMenuData} borderRadius={theme.cardBorderRadius} />,
    banner: <Banner {...mergedBannerData} buttonBorderRadius={theme.buttonBorderRadius} />,
    products: (
      <Products
        {...productsWithData}
        primaryColor={productsWithData.colors?.accent || theme.globalColors?.primary || '#4f46e5'}
        storeUrl="#store"
      />
    ),
    chatbot: null, // Deprecated: ChatbotWidget now renders automatically when aiAssistantConfig.isActive
    footer: <Footer {...mergedFooterData} />,
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
          // Use hash for SPA mode in editor, real paths in SSR
          href: p.isHomePage ? '#' : `#${(p.slug || '').replace(/^\//, '')}`,
        }));
      }
    }
    
    // 3. Fall back to manual links
    return mergedHeaderData.links;
  }, [mergedHeaderData.menuId, mergedHeaderData.links, menus, pages]);

  // Resolve Footer Columns dynamically
  const resolvedFooterData: FooterData = {
      ...mergedFooterData,
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

  // Determine if we should show the loading spinner for an article
  const showArticleLoading = isArticleHash && (isLoadingCMS || (isRouting && !activePost));

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

      {/* Header is always visible - forceSolid when in store view (no hero behind) */}
      <Header 
        {...mergedHeaderData} 
        links={headerLinks} 
        forceSolid={isStoreViewActive}
        showCart={storefrontProducts.length > 0}
        cartItemCount={cart.itemCount}
        onCartClick={cart.toggleCart}
      />
      
      {/* Cart Drawer - only when store has products */}
      {storefrontProducts.length > 0 && (
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
        {!showArticleLoading && activePost && (
            <BlogPost 
                post={activePost} 
                theme={theme} 
                onBack={handleBackToHome}
                backgroundColor={pageBackgroundColor}
                textColor={data.hero?.colors?.text || '#ffffff'}
                accentColor={data.hero?.colors?.primary || '#4f46e5'}
            />
        )}

        {/* 3. 404 State (Article hash but no post found after loading) */}
        {!showArticleLoading && isArticleHash && !activePost && !isLoadingCMS && (
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

        {/* 7. Home View (Sections) - Only show when not in article or store view */}
        {!isArticleHash && !activePost && !isStoreViewActive && (
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
                                           key !== 'header'; // Header is rendered separately
                    
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
            <Footer {...resolvedFooterData} />
        </div>
      )}

      {/* Chatbot Widget - Renders independently outside component order */}
      <ChatbotWidget />
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
