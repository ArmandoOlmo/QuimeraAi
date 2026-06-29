
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Header from './Header';
import Hero from './Hero';
import HeroModern from './HeroModern';
import HeroGradient from './HeroGradient';
import HeroFitness from './HeroFitness';

import HeroSplit from './HeroSplit';
import HeroGallery from './HeroGallery';
import HeroWave from './HeroWave';
import HeroNova from './HeroNova';
import HeroLead from './HeroLead';
// Lumina components
import HeroLumina from './HeroLumina';
import HeroNeon from './HeroNeon';
import TestimonialsNeon from './TestimonialsNeon';
import FeaturesNeon from './FeaturesNeon';
import CtaNeon from './CtaNeon';
import PortfolioNeon from './PortfolioNeon';
import PricingNeon from './PricingNeon';
import FaqNeon from './FaqNeon';
import FeaturesLumina from './FeaturesLumina';
import CtaLumina from './CtaLumina';
import PortfolioLumina from './PortfolioLumina';
import PricingLumina from './PricingLumina';
import TestimonialsLumina from './TestimonialsLumina';
import FaqLumina from './FaqLumina';

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
import WhatIsQuimeraSection from './quimera/WhatIsQuimeraSection';
import TemplatesPreviewQuimera from './quimera/TemplatesPreviewQuimera';
import AiWebStudioQuimera from './quimera/AiWebStudioQuimera';
import ContentManagerQuimera from './quimera/ContentManagerQuimera';
import ImageGeneratorQuimera from './quimera/ImageGeneratorQuimera';
import ChatbotWorkflowQuimera from './quimera/ChatbotWorkflowQuimera';
import ChatbotBuilderQuimera from './quimera/ChatbotBuilderQuimera';
import LeadsManagerQuimera from './quimera/LeadsManagerQuimera';
import AppointmentsQuimera from './quimera/AppointmentsQuimera';
import BioPageQuimera from './quimera/BioPageQuimera';
import EmailMarketingQuimera from './quimera/EmailMarketingQuimera';

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
import Showcase from './Showcase';
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
import QuimeraLoader from './ui/QuimeraLoader';
import SignupFloat from './SignupFloat';
import SectionBackground from './ui/SectionBackground';
import Products from './Products';
import Separator from './Separator';
import RealEstateListingsSection from './realty/PublicRealtyListingsSection';
import PropertyDirectoryPage from './realty/PublicRealtyDirectoryPage';
import RestaurantReservation from './RestaurantReservation';
import PropertyDetailSection from './realty/PublicRealtyPropertyDetail';
import {
  matchRealtyDetailRoute,
  matchRealtyDirectoryRoute,
  resolveRealtyDetailPath,
  resolveRealtyDirectoryRoute,
} from '../utils/realtyWebsiteRoutes';
import { PageSection, FontFamily, CMSPost, CMSCategory, FooterData, ThemeData, AiAssistantConfig } from '../types';
import type { PlatformServiceId } from '../types/serviceAvailability';
import { fontStacks, loadGoogleFonts, loadGoogleFontsSync, resolveFontFamily } from '../utils/fontLoader';
import { initialData } from '../data/initialData';
import { useSafeAuth } from '../contexts/core/AuthContext';
import { useUI } from '../contexts/core/UIContext';
import { useProject } from '../contexts/project';
import { useCMS } from '../contexts/cms';
import { useAdmin } from '../contexts/admin';
import { deriveColorsFromPalette } from '../utils/colorUtils';
import { usePublicProducts } from '../hooks/usePublicProducts';
import { useServiceAvailability } from '../hooks/useServiceAvailability';
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
  | { type: 'products' }
  | { type: 'category'; slug: string }
  | { type: 'product'; slug: string }
  | { type: 'checkout' };

// fontStacks imported from utils/fontLoader.ts (single source of truth)

// Import useSafeEditor
import { useSafeEditor } from '../contexts/EditorContext';
import { useSafeTenant } from '../contexts/tenant';
import { sanitizeI18nObject } from '../utils/sanitizeData';
import { useTranslation } from 'react-i18next';
import { normalizeStorefrontHrefForWebsiteContext } from '../utils/storefrontRouter';
import { buildChatbotEngineSurfaceContext } from '../utils/chatbotEngine/surfaceContext';
import {
  isProjectAiAssistantConfigActive,
  resolveProjectAiAssistantConfig,
} from '../utils/chatbotEngine/projectAiAssistantConfig';
import {
  buildServiceAwareComponentStatus,
  buildServiceAwareSectionVisibility,
  filterServiceAvailablePages,
  filterServiceAvailableSections,
  isSectionServiceAvailable,
} from '../utils/serviceAvailabilitySections';

// ... (rest of imports)

// Inner component that uses the cart context
const LandingPageContent: React.FC = () => {
  const authContext = useSafeAuth();
  const user = authContext?.user ?? null;
  const { activeSection, onSectionSelect, previewRef } = useUI();
  const tenantContext = useSafeTenant();
  const hasWhiteLabelBranding = !!(tenantContext?.currentTenant?.branding?.companyName || tenantContext?.currentTenant?.branding?.logoUrl);

  // Context resolution: Prefer EditorContext data for real-time updates when in editor
  const editorContext = useSafeEditor();
  const projectContext = useProject();

  const isEditorMode = editorContext?.view === 'editor' && !!editorContext?.data;
  
  const { i18n } = useTranslation();
  const preferredLanguage = i18n.language?.startsWith('es') ? 'es' : 'en';
  const { isServicePublic, isLoading: isLoadingServiceAvailability } = useServiceAvailability();
  const isPublicServiceAvailable = useCallback((serviceId: PlatformServiceId) => (
    !isLoadingServiceAvailability && isServicePublic(serviceId)
  ), [isLoadingServiceAvailability, isServicePublic]);
  const isCmsServiceAvailable = isPublicServiceAvailable('cms');
  const isEcommerceServiceAvailable = isPublicServiceAvailable('ecommerce');
  const isRealEstateServiceAvailable = isPublicServiceAvailable('realEstate');

  const rawData = (isEditorMode ? editorContext!.data : projectContext.data) || projectContext.data;
  const data = useMemo(() => sanitizeI18nObject(rawData, preferredLanguage), [rawData, preferredLanguage]);
  
  const theme: ThemeData = {
    ...initialData.theme,
    ...(((isEditorMode ? editorContext?.theme : projectContext?.theme) || projectContext?.theme) ?? {}),
  };
  const componentOrder = (isEditorMode ? editorContext?.componentOrder : projectContext?.componentOrder) || projectContext?.componentOrder;
  const sectionVisibility = (isEditorMode ? editorContext?.sectionVisibility : projectContext?.sectionVisibility) || projectContext?.sectionVisibility;
  const { activeProjectId, activeProject, pages, activePage, setActivePage } = projectContext || {};

  const { cmsPosts, isLoadingCMS, menus, categories } = useCMS();
  const { componentStatus, customComponents, componentStyles: rawComponentStyles } = useAdmin();
  const componentStyles = useMemo(() => sanitizeI18nObject(rawComponentStyles, preferredLanguage), [rawComponentStyles, preferredLanguage]);
  const [activePost, setActivePost] = useState<CMSPost | null>(null);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [blogSlugNotFound, setBlogSlugNotFound] = useState(false);
  const [activePropertySlug, setActivePropertySlug] = useState<string | null>(null);
  const [showRealtyDirectory, setShowRealtyDirectory] = useState(false);

  // Navigation guard: prevents handleNavigation (hashchange/popstate listener)
  // from running redundantly after handleLinkNavigation already handled the event.
  const navigationGuardRef = useRef(false);

  // Ref to track activePage inside handleNavigation without adding it to deps
  const activePageRef = useRef(activePage);
  useEffect(() => { activePageRef.current = activePage; }, [activePage]);

  // Store view state for ecommerce hash routing
  const [storeView, setStoreView] = useState<StoreView>({ type: 'none' });

  // Load products from public store (storeId = projectId)
  const { products: storefrontProducts, isLoading: isLoadingProducts } = usePublicProducts(activeProjectId);

  // Cart context - available when wrapped in StorefrontCartProvider
  // Uses safe version that returns defaults when not in provider
  const cart = useSafeStorefrontCart();

  // Multi-page architecture: Use active page's sections if available
  // IMPORTANT: For the home page, always use the global componentOrder because
  // it reflects the full set of sections the user has configured in the editor.
  // activePage.sections for the home page may be a stale/incomplete snapshot.
  const serviceFilteredPages = useMemo(() => (
    filterServiceAvailablePages(pages || [], isPublicServiceAvailable)
  ), [isPublicServiceAvailable, pages]);

  const rawEffectiveComponentOrder = useMemo(() => {
    if (activePage?.sections?.length && !activePage.isHomePage) {
      return activePage.sections;
    }
    // Fallback to componentOrder (either from editor or project context)
    return componentOrder;
  }, [activePage, componentOrder]);

  const effectiveComponentOrder = useMemo(() => (
    filterServiceAvailableSections(rawEffectiveComponentOrder || [], isPublicServiceAvailable)
  ), [isPublicServiceAvailable, rawEffectiveComponentOrder]);

  const effectiveSectionVisibility = useMemo(() => {
    if (activePage?.sections?.length && !activePage.isHomePage) {
      // Create visibility based on page sections
      const visibility: Record<string, boolean> = {};
      activePage.sections.forEach(s => {
        visibility[s] = sectionVisibility?.[s] ?? true;
      });
      visibility.header = sectionVisibility?.header ?? true;
      visibility.footer = sectionVisibility?.footer ?? true;
      return buildServiceAwareSectionVisibility(visibility as Record<PageSection, boolean>, isPublicServiceAvailable);
    }
    return buildServiceAwareSectionVisibility(sectionVisibility || {}, isPublicServiceAvailable);
  }, [activePage, isPublicServiceAvailable, sectionVisibility]);

  const effectiveComponentStatus = useMemo(() => (
    buildServiceAwareComponentStatus(
      componentStatus,
      [
        ...(rawEffectiveComponentOrder || []),
        ...serviceFilteredPages.flatMap(page => page.sections || []),
      ],
      isPublicServiceAvailable,
    )
  ), [componentStatus, isPublicServiceAvailable, rawEffectiveComponentOrder, serviceFilteredPages]);
  const activeProjectChatbotConfig = useMemo(() => resolveProjectAiAssistantConfig({
    ai_assistant_config: activeProject?.aiAssistantConfig || null,
    data: {
      ...(data || {}),
      aiAssistantConfig: activeProject?.aiAssistantConfig,
      businessBlueprint: (activeProject as any)?.businessBlueprint || (data as any)?.businessBlueprint,
    },
  }) as AiAssistantConfig | null, [activeProject?.aiAssistantConfig, (activeProject as any)?.businessBlueprint, data]);
  const shouldRenderChatbotWidget = Boolean(
    activeProjectChatbotConfig &&
    isProjectAiAssistantConfigActive(activeProjectChatbotConfig)
  );

  // Inject font variables into :root for Tailwind to use
  useEffect(() => {
    const root = document.documentElement;
    // Resolve font keys — migrates old/removed fonts to new equivalents
    const resolvedHeader = resolveFontFamily(theme?.fontFamilyHeader || 'Inter');
    const resolvedBody = resolveFontFamily(theme?.fontFamilyBody || 'Inter');
    const resolvedButton = resolveFontFamily(theme?.fontFamilyButton || 'Inter');

    const headerFont = fontStacks[resolvedHeader];
    const bodyFont = fontStacks[resolvedBody];
    const buttonFont = fontStacks[resolvedButton];

    // Set CSS variables immediately so layout uses the correct font stack
    root.style.setProperty('--font-header', headerFont);
    root.style.setProperty('--font-body', bodyFont);
    root.style.setProperty('--font-button', buttonFont);

    // Font weight & style variables
    root.style.setProperty('--font-weight-header', String(theme?.fontWeightHeader ?? 700));
    root.style.setProperty('--font-weight-body', String(theme?.fontWeightBody ?? 400));
    root.style.setProperty('--font-weight-button', String(theme?.fontWeightButton ?? 600));
    root.style.setProperty('--font-style-header', theme?.fontStyleHeader ?? 'normal');
    root.style.setProperty('--font-style-body', theme?.fontStyleBody ?? 'normal');
    root.style.setProperty('--font-style-button', theme?.fontStyleButton ?? 'normal');

    // All Caps variables
    root.style.setProperty('--headings-transform', theme?.headingsAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--headings-spacing', theme?.headingsAllCaps ? '0.05em' : 'normal');
    root.style.setProperty('--buttons-transform', theme?.buttonsAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--buttons-spacing', theme?.buttonsAllCaps ? '0.05em' : 'normal');
    root.style.setProperty('--navlinks-transform', theme?.navLinksAllCaps ? 'uppercase' : 'none');
    root.style.setProperty('--navlinks-spacing', theme?.navLinksAllCaps ? '0.05em' : 'normal');

    // Load Google Fonts: inject <link> synchronously, browser handles swap via font-display: swap
    const fontsToLoad = [...new Set([resolvedHeader, resolvedBody, resolvedButton])];
    loadGoogleFontsSync(fontsToLoad, 'editor-preview-fonts');
  }, [theme?.fontFamilyHeader, theme?.fontFamilyBody, theme?.fontFamilyButton, theme?.fontWeightHeader, theme?.fontWeightBody, theme?.fontWeightButton, theme?.fontStyleHeader, theme?.fontStyleBody, theme?.fontStyleButton, theme?.headingsAllCaps, theme?.buttonsAllCaps, theme?.navLinksAllCaps]);

  // Handle routing for Articles, Store and Sections
  // Supports both real paths (/tienda, /blog/slug) and anchor scrolling (/#features)
  useEffect(() => {
    const handleNavigation = () => {
      // GUARD: If handleLinkNavigation already handled this navigation event,
      // skip to avoid double-handling that resets state incorrectly.
      if (navigationGuardRef.current) {
        navigationGuardRef.current = false;
        return;
      }

      const path = window.location.pathname;
      const hash = window.location.hash;
      const decodedHash = decodeURIComponent(hash);
      const resetUnavailableServiceRoute = () => {
        setActivePost(null);
        setStoreView({ type: 'none' });
        setIsRouting(false);
        setBlogSlugNotFound(false);
        setActivePropertySlug(null);
        setShowRealtyDirectory(false);
      };

      // ========================================
      // ANCHOR SCROLL — handle FIRST, before any state resets.
      // Anchor hashes (#services, #features) should scroll the current page
      // without resetting views or switching pages.
      // ========================================
      if (hash.length > 1 && !hash.startsWith('#article:') && !hash.startsWith('#store') && !hash.startsWith('#checkout') && !hash.startsWith('#blog/')) {
        // It's a simple anchor — just scroll, don't touch any state
        const homePage = serviceFilteredPages.find(page => page.isHomePage);
        const currentPage = activePageRef.current;
        // If we're on a non-home page, switch back to home first
        const needsPageReset = currentPage && currentPage.id !== homePage?.id;
        if (needsPageReset) {
          setActivePage(homePage ? homePage.id : null);
        }
        setTimeout(() => {
          const id = hash.substring(1);
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, needsPageReset ? 350 : 100);
        return;
      }

      // Reset all views first (only for non-anchor navigation)
      setActivePost(null);
      setStoreView({ type: 'none' });
      setIsRouting(false);
      setBlogSlugNotFound(false);
      setActivePropertySlug(null);
      setShowRealtyDirectory(false);

      // ========================================
      // REAL PATH ROUTING (Shopify/Wix style)
      // ========================================

      // Blog article routing: /blog/slug
      if (path.startsWith('/blog/') && path !== '/blog/') {
        if (!isCmsServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
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

      // Store catalog routing: /tienda/productos
      if (path === '/tienda/productos' || path === '/tienda/productos/' || path === '/tienda/catalogo' || path === '/tienda/catalogo/') {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        setStoreView({ type: 'products' });
        window.scrollTo(0, 0);
        return;
      }

      // Store routing: /tienda
      if (path === '/tienda' || path === '/tienda/') {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        setStoreView({ type: 'store' });
        window.scrollTo(0, 0);
        return;
      }

      // Store category routing: /tienda/categoria/slug
      if (path.startsWith('/tienda/categoria/')) {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        const slug = path.replace('/tienda/categoria/', '').replace(/\/$/, '');
        setStoreView({ type: 'category', slug });
        window.scrollTo(0, 0);
        return;
      }

      // Store product routing: /tienda/producto/slug
      if (path.startsWith('/tienda/producto/')) {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        const slug = path.replace('/tienda/producto/', '').replace(/\/$/, '');
        setStoreView({ type: 'product', slug });
        window.scrollTo(0, 0);
        return;
      }

      // Checkout routing: /checkout
      if (path === '/checkout' || path === '/checkout/') {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        setStoreView({ type: 'checkout' });
        window.scrollTo(0, 0);
        return;
      }

      const realtyRouteData = data.realEstateListings;
      const realtyDetailSlug = matchRealtyDetailRoute(path, realtyRouteData);
      if (realtyDetailSlug) {
        if (!isRealEstateServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        setActivePropertySlug(realtyDetailSlug);
        window.scrollTo(0, 0);
        return;
      }

      if (matchRealtyDirectoryRoute(path, realtyRouteData)) {
        if (!isRealEstateServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        setActivePage(null);
        setShowRealtyDirectory(true);
        window.scrollTo(0, 0);
        return;
      }

      // Multi-page routing: match clean page slugs such as /listados
      // IMPORTANT: Only match non-home pages here. For the root path (/),
      // we fall through to the "root path" handler below.
      if (serviceFilteredPages.length > 0) {
        const pathSlug = path.replace(/^\//, '').replace(/\/$/, '');

        // Skip empty slug — root path is handled separately below
        if (pathSlug) {
          const matchedPage = serviceFilteredPages.find(page => {
            const pageSlug = (page.slug || '').replace(/^\//, '').replace(/\/$/, '');
            return pageSlug === pathSlug && !page.isHomePage;
          });

          if (matchedPage) {
            setActivePage(matchedPage.id);
            window.scrollTo(0, 0);
            return;
          }
        }

        // Root path with multi-page: ensure home page is active
        if (path === '/' || path === '') {
          const homePage = serviceFilteredPages.find(p => p.isHomePage);
          setActivePage(homePage ? homePage.id : null);
          return;
        }
      }

      // ========================================
      // LEGACY HASH ROUTING (backward compatibility)
      // ========================================

      // Article routing: #article:slug (legacy)
      if (decodedHash.startsWith('#article:')) {
        if (!isCmsServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
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
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        setStoreView({ type: 'store' });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash === '#store/products' || decodedHash === '#store/catalog') {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        setStoreView({ type: 'products' });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash.startsWith('#store/category/')) {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        const slug = decodedHash.replace('#store/category/', '');
        setStoreView({ type: 'category', slug });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash.startsWith('#store/product/')) {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        const slug = decodedHash.replace('#store/product/', '');
        setStoreView({ type: 'product', slug });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash === '#checkout') {
        if (!isEcommerceServiceAvailable) {
          resetUnavailableServiceRoute();
          return;
        }
        setStoreView({ type: 'checkout' });
        window.scrollTo(0, 0);
        return;
      }

      // NOTE: Anchor scroll (/#section) is handled at the TOP of handleNavigation,
      // before any state resets, to avoid disrupting the page shell.
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
  }, [
    cmsPosts,
    data.realEstateListings,
    isCmsServiceAvailable,
    isEcommerceServiceAvailable,
    isLoadingCMS,
    isRealEstateServiceAvailable,
    serviceFilteredPages,
    setActivePage,
  ]);

  const scrollPreviewToTop = useCallback(() => {
    if (previewRef?.current) {
      previewRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [previewRef]);

  const navigateInsideEditorStorefront = useCallback((href: string) => {
    if (!isEcommerceServiceAvailable) return false;

    const normalized = normalizeStorefrontHrefForWebsiteContext(href, activeProjectId);
    if (!normalized) return false;

    setActivePost(null);
    setActiveCategorySlug(null);
    setBlogSlugNotFound(false);
    setActivePropertySlug(null);
    setShowRealtyDirectory(false);
    const homePage = serviceFilteredPages.find(page => page.isHomePage);
    setActivePage(homePage ? homePage.id : null);

    if (normalized === '/tienda') {
      setStoreView({ type: 'store' });
      scrollPreviewToTop();
      return true;
    }

    if (normalized === '/tienda/productos') {
      setStoreView({ type: 'products' });
      scrollPreviewToTop();
      return true;
    }

    if (normalized.startsWith('/tienda/categoria/')) {
      const slug = normalized.replace('/tienda/categoria/', '').replace(/\/$/, '');
      setStoreView({ type: 'category', slug });
      scrollPreviewToTop();
      return true;
    }

    if (normalized.startsWith('/tienda/producto/')) {
      const slug = normalized.replace('/tienda/producto/', '').replace(/\/$/, '');
      setStoreView({ type: 'product', slug });
      scrollPreviewToTop();
      return true;
    }

    if (normalized === '/checkout') {
      setStoreView({ type: 'checkout' });
      scrollPreviewToTop();
      return true;
    }

    return false;
  }, [activeProjectId, isEcommerceServiceAvailable, scrollPreviewToTop, serviceFilteredPages, setActivePage]);

  const handleViewAllProducts = useCallback(() => {
    if (!isEcommerceServiceAvailable) return;
    if (!isEditorMode) {
      window.history.pushState({}, '', '/tienda/productos');
    }
    navigateInsideEditorStorefront('/tienda/productos');
  }, [isEcommerceServiceAvailable, isEditorMode, navigateInsideEditorStorefront]);

  const handlePreviewClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditorMode) return;

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    const normalized = normalizeStorefrontHrefForWebsiteContext(href, activeProjectId);
    if (!normalized) return;

    event.preventDefault();
    event.stopPropagation();

    navigateInsideEditorStorefront(normalized);
  }, [activeProjectId, isEditorMode, navigateInsideEditorStorefront]);

  const handleBackToHome = () => {
    if (!isEditorMode) {
      window.history.pushState({}, '', '/');
    }
    setActivePost(null);
    setActiveCategorySlug(null);
    setBlogSlugNotFound(false);
    setActivePropertySlug(null);
    setShowRealtyDirectory(false);
    setStoreView({ type: 'none' });
    // Reset multi-page active page to home (or null for legacy projects)
    const homePage = serviceFilteredPages.find(page => page.isHomePage);
    setActivePage(homePage ? homePage.id : null);
    scrollPreviewToTop();
  };

  // Store navigation handlers - use real paths
  const handleNavigateToStore = useCallback(() => {
    if (!isEcommerceServiceAvailable) return;
    if (!isEditorMode) {
      window.history.pushState({}, '', '/tienda');
    }
    navigateInsideEditorStorefront('/tienda');
  }, [isEcommerceServiceAvailable, isEditorMode, navigateInsideEditorStorefront]);

  const handleNavigateToCategory = useCallback((categorySlug: string) => {
    if (!isEcommerceServiceAvailable) return;
    if (!isEditorMode) {
      window.history.pushState({}, '', `/tienda/categoria/${categorySlug}`);
    }
    navigateInsideEditorStorefront(`/tienda/categoria/${categorySlug}`);
  }, [isEcommerceServiceAvailable, isEditorMode, navigateInsideEditorStorefront]);

  const handleNavigateToProduct = useCallback((productSlug: string) => {
    if (!isEcommerceServiceAvailable) return;
    if (!isEditorMode) {
      window.history.pushState({}, '', `/tienda/producto/${productSlug}`);
    }
    navigateInsideEditorStorefront(`/tienda/producto/${productSlug}`);
  }, [isEcommerceServiceAvailable, isEditorMode, navigateInsideEditorStorefront]);

  const handleNavigateToCheckout = useCallback(() => {
    if (!isEcommerceServiceAvailable) return;
    if (!isEditorMode) {
      window.history.pushState({}, '', '/checkout');
    }
    navigateInsideEditorStorefront('/checkout');
  }, [isEcommerceServiceAvailable, isEditorMode, navigateInsideEditorStorefront]);

  // Universal navigation handler for Header links
  const handleLinkNavigation = useCallback((href: string) => {
    // Set navigation guard to prevent handleNavigation from firing redundantly
    // after this handler changes the URL (via pushState or scrollTo).
    navigationGuardRef.current = true;
    // Clear the guard after a tick in case no hashchange/popstate fires
    setTimeout(() => { navigationGuardRef.current = false; }, 50);

    const storefrontHref = normalizeStorefrontHrefForWebsiteContext(href, activeProjectId);
    if (storefrontHref) {
      if (!isEcommerceServiceAvailable) {
        setStoreView({ type: 'none' });
        return;
      }
      if (isEditorMode) {
        if (navigateInsideEditorStorefront(storefrontHref)) return;
      } else {
        if (storefrontHref === '/tienda') {
          handleNavigateToStore();
          return;
        }
        if (storefrontHref === '/tienda/productos') {
          handleViewAllProducts();
          return;
        }
        if (storefrontHref.startsWith('/tienda/categoria/')) {
          handleNavigateToCategory(storefrontHref.replace('/tienda/categoria/', '').replace(/\/$/, ''));
          return;
        }
        if (storefrontHref.startsWith('/tienda/producto/')) {
          handleNavigateToProduct(storefrontHref.replace('/tienda/producto/', '').replace(/\/$/, ''));
          return;
        }
        if (storefrontHref === '/checkout') {
          handleNavigateToCheckout();
          return;
        }
      }
    }

    // Reset views
    setActivePost(null);
    setActiveCategorySlug(null);
    setStoreView({ type: 'none' });
    setBlogSlugNotFound(false);
    setActivePropertySlug(null);
    setShowRealtyDirectory(false);

    // Home page
    if (href === '/' || href === '') {
      const homePage = serviceFilteredPages.find(page => page.isHomePage);
      if (homePage) {
        setActivePage(homePage.id);
      } else {
        // No home page in pages array — reset to null so
        // effectiveComponentOrder falls back to the global componentOrder
        setActivePage(null);
      }
      scrollPreviewToTop();
      return;
    }

    // Anchor scroll (/#section or #section)
    if (href.startsWith('/#') || (href.startsWith('#') && !href.startsWith('#article:') && !href.startsWith('#store'))) {
      const id = href.replace('/#', '').replace('#', '');
      const homePage = serviceFilteredPages.find(page => page.isHomePage);
      const needsPageReset = Boolean(activePage && activePage.id !== homePage?.id);

      if (needsPageReset) {
        setActivePage(homePage ? homePage.id : null);
      }

      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, needsPageReset ? 350 : 100);
      return;
    }

    // Blog category: /blog/categoria/slug
    if (href.startsWith('/blog/categoria/')) {
      if (!isCmsServiceAvailable) return;
      const slug = href.replace('/blog/categoria/', '').replace(/\/$/, '');
      console.log('[LandingPage] Navigating to blog category:', slug);
      setActivePropertySlug(null);
      setActiveCategorySlug(slug);
      scrollPreviewToTop();
      return;
    }

    // Blog article: /blog/slug
    if (href.startsWith('/blog/')) {
      if (!isCmsServiceAvailable) return;
      const slug = href.replace('/blog/', '').replace(/\/$/, '');
      const post = cmsPosts.find(p => p.slug === slug);
      if (post) {
        setActivePropertySlug(null);
        setActivePost(post);
        setBlogSlugNotFound(false);
        scrollPreviewToTop();
      } else {
        console.warn(`[LandingPage] Blog post not found for slug: ${slug}`);
        setBlogSlugNotFound(true);
        scrollPreviewToTop();
      }
      return;
    }

    // Store catalog: /tienda/productos
    if (href === '/tienda/productos' || href === '/tienda/productos/' || href === '/tienda/catalogo' || href === '/tienda/catalogo/') {
      if (!isEcommerceServiceAvailable) return;
      setActivePropertySlug(null);
      setStoreView({ type: 'products' });
      scrollPreviewToTop();
      return;
    }

    // Store: /tienda
    if (href === '/tienda' || href === '/tienda/') {
      if (!isEcommerceServiceAvailable) return;
      setActivePropertySlug(null);
      setStoreView({ type: 'store' });
      scrollPreviewToTop();
      return;
    }

    // Store category: /tienda/categoria/slug
    if (href.startsWith('/tienda/categoria/')) {
      if (!isEcommerceServiceAvailable) return;
      const slug = href.replace('/tienda/categoria/', '').replace(/\/$/, '');
      setActivePropertySlug(null);
      setStoreView({ type: 'category', slug });
      scrollPreviewToTop();
      return;
    }

    // Store product: /tienda/producto/slug
    if (href.startsWith('/tienda/producto/')) {
      if (!isEcommerceServiceAvailable) return;
      const slug = href.replace('/tienda/producto/', '').replace(/\/$/, '');
      setActivePropertySlug(null);
      setStoreView({ type: 'product', slug });
      scrollPreviewToTop();
      return;
    }

    // Checkout
    if (href === '/checkout' || href === '/checkout/') {
      if (!isEcommerceServiceAvailable) return;
      setActivePropertySlug(null);
      setStoreView({ type: 'checkout' });
      scrollPreviewToTop();
      return;
    }

    // Legacy hash support
    if (href.startsWith('#article:')) {
      if (!isCmsServiceAvailable) return;
      const slug = href.replace('#article:', '').trim();
      const post = cmsPosts.find(p => p.slug === slug);
      if (post) {
        setActivePost(post);
        scrollPreviewToTop();
      }
      return;
    }

    if (href === '#store') {
      if (!isEcommerceServiceAvailable) return;
      setActivePropertySlug(null);
      setStoreView({ type: 'store' });
      scrollPreviewToTop();
      return;
    }

    if (href === '#store/products' || href === '#store/catalog') {
      if (!isEcommerceServiceAvailable) return;
      setActivePropertySlug(null);
      setStoreView({ type: 'products' });
      scrollPreviewToTop();
      return;
    }

    if (href.startsWith('#store/category/')) {
      if (!isEcommerceServiceAvailable) return;
      const slug = href.replace('#store/category/', '');
      setActivePropertySlug(null);
      setStoreView({ type: 'category', slug });
      scrollPreviewToTop();
      return;
    }

    if (href.startsWith('#store/product/')) {
      if (!isEcommerceServiceAvailable) return;
      const slug = href.replace('#store/product/', '');
      setActivePropertySlug(null);
      setStoreView({ type: 'product', slug });
      scrollPreviewToTop();
      return;
    }

    const realtyRouteData = data.realEstateListings;
    const realtyDetailSlug = matchRealtyDetailRoute(href, realtyRouteData);
    if (realtyDetailSlug) {
      if (!isRealEstateServiceAvailable) return;
      setShowRealtyDirectory(false);
      setActivePropertySlug(realtyDetailSlug);
      window.scrollTo(0, 0);
      return;
    }

    if (matchRealtyDirectoryRoute(href, realtyRouteData)) {
      if (!isRealEstateServiceAvailable) return;
      const directoryRoute = resolveRealtyDirectoryRoute(realtyRouteData);
      setActivePage(null);
      setShowRealtyDirectory(true);
      window.history.pushState({}, '', directoryRoute);
      scrollPreviewToTop();
      return;
    }

    // External URLs - open in new tab
    if (href.startsWith('http://') || href.startsWith('https://')) {
      window.open(href, '_blank');
      return;
    }

    // Multi-page navigation: match website pages created by the builder
    const pageSlug = href.replace(/^\//, '').replace(/\/$/, '');
    if (serviceFilteredPages.length > 0) {
      const matchedPage = serviceFilteredPages.find(page => {
        const normalizedSlug = (page.slug || '').replace(/^\//, '').replace(/\/$/, '');
        return normalizedSlug === pageSlug;
      });

      if (matchedPage) {
        setActivePage(matchedPage.id);
        scrollPreviewToTop();
        return;
      }
    }

    // Fallback: try to scroll to element by ID
    const id = href.replace(/^\//, '').replace(/\/$/, '');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [
    activePage,
    activeProjectId,
    cmsPosts,
    data.realEstateListings,
    handleNavigateToCategory,
    handleNavigateToCheckout,
    handleNavigateToProduct,
    handleNavigateToStore,
    handleViewAllProducts,
    isCmsServiceAvailable,
    isEcommerceServiceAvailable,
    isEditorMode,
    isRealEstateServiceAvailable,
    navigateInsideEditorStorefront,
    scrollPreviewToTop,
    serviceFilteredPages,
    setActivePage,
  ]);

  // Check if we're showing a store view
  const isStoreViewActive = isEcommerceServiceAvailable && storeView.type !== 'none';
  const landingChatbotEngineContext = useMemo(() => {
    const route = typeof window !== 'undefined' ? window.location.pathname : undefined;
    const isRealtyProperty = Boolean(activePropertySlug);
    const isStorefrontSurface = isStoreViewActive;
    const isCheckout = isStoreViewActive && storeView.type === 'checkout';
    const entityType = isRealtyProperty
      ? 'realty_property'
      : isCheckout
        ? 'checkout'
        : storeView.type === 'product'
          ? 'product'
          : storeView.type === 'category'
            ? 'category'
            : showRealtyDirectory
              ? 'realty_directory'
              : activePost
                ? 'blog_post'
                : activeCategorySlug
                  ? 'blog_category'
                  : activePage
                    ? 'site_page'
                    : 'website';

    return buildChatbotEngineSurfaceContext({
      sourceSurface: isRealtyProperty ? 'realty_property_page' : isCheckout ? 'checkout' : isStorefrontSurface ? 'storefront' : 'website',
      sourceModule: isRealtyProperty || showRealtyDirectory ? 'real-estate' : isCheckout ? 'ecommerce' : isStorefrontSurface ? 'storefront-builder' : 'website-builder',
      route,
      entityType,
      entityId: activePage?.id || activePost?.id || activeProjectId || undefined,
      entitySlug: activePropertySlug || (storeView.type === 'product' || storeView.type === 'category' ? storeView.slug : undefined) || activeCategorySlug || activePage?.slug || undefined,
      contextKeys: [
        'website',
        isRealtyProperty ? 'realty_property_page' : '',
        showRealtyDirectory ? 'realty_directory' : '',
        isStorefrontSurface ? 'storefront' : '',
        isCheckout ? 'checkout' : '',
        storeView.type === 'product' ? 'product' : '',
        storeView.type === 'category' ? 'category' : '',
        activePost ? 'blog_post' : '',
        activeCategorySlug ? 'blog_category' : '',
        activePage ? 'site_page' : '',
      ].filter(Boolean),
      metadata: {
        projectId: activeProjectId,
        ownerId: activeProject?.userId,
        activePageSlug: activePage?.slug,
        activePostSlug: activePost?.slug,
        activeCategorySlug,
        propertySlug: activePropertySlug,
        storeView: storeView.type,
      },
    });
  }, [activeCategorySlug, activePage, activePost, activeProject?.userId, activeProjectId, activePropertySlug, isStoreViewActive, showRealtyDirectory, storeView]);

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
      case 'showcase':
        return <Showcase {...mergedData} borderRadius={mergedData.borderRadius || borderRadius} onNavigate={handleLinkNavigation} />;
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
    ...data.hero?.colors               // user color changes override
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
    const derivedColors = deriveColorsFromPalette(mergedColors, String(componentKey));

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
  const mergedScreenshotCarouselData = mergeComponentData('screenshotCarousel');
  const mergedPricingData = mergeComponentData('pricing');
  const mergedFaqData = mergeComponentData('faq');
  const mergedLeadsData = mergeComponentData('leads');
  const mergedNewsletterData = mergeComponentData('newsletter');
  const mergedCtaData = mergeComponentData('cta');
  const mergedPortfolioData = mergeComponentData('portfolio');
  const mergedShowcaseData = mergeComponentData('showcase');
  const mergedServicesData = mergeComponentData('services');
  const mergedTeamData = mergeComponentData('team');
  const mergedVideoData = mergeComponentData('video');
  const mergedHowItWorksData = mergeComponentData('howItWorks');
  const mergedMapData = mergeComponentData('map');
  const mergedMenuData = mergeComponentData('menu');
  const mergedBannerData = mergeComponentData('banner');
  const mergedFooterData = mergeComponentData('footer');
  const mergedHeaderData = mergeComponentData('header');
  const mergedHeroModernData = mergeComponentData('heroModern');
  const mergedHeroGradientData = mergeComponentData('heroGradient');
  const mergedHeroSplitData = mergeComponentData('heroSplit');
  const mergedHeroGalleryData = mergeComponentData('heroGallery');
  const mergedHeroWaveData = mergeComponentData('heroWave');
  const mergedHeroNovaData = mergeComponentData('heroNova');
  const mergedHeroLeadData = mergeComponentData('heroLead');
  const mergedTopBarData = mergeComponentData('topBar');
  const mergedLogoBannerData = mergeComponentData('logoBanner');
  const mergedRestaurantReservationData = mergeComponentData('restaurantReservation');
  
  // Lumina sections
  const mergedHeroLuminaData = mergeComponentData('heroLumina');
  const mergedHeroNeonData = mergeComponentData('heroNeon');
  const mergedTestimonialsNeonData = mergeComponentData('testimonialsNeon');
  const mergedFeaturesNeonData = mergeComponentData('featuresNeon');
  const mergedCtaNeonData = mergeComponentData('ctaNeon');
  const mergedPortfolioNeonData = mergeComponentData('portfolioNeon');
  const mergedPricingNeonData = mergeComponentData('pricingNeon');
  const mergedFaqNeonData = mergeComponentData('faqNeon');
  const mergedFeaturesLuminaData = mergeComponentData('featuresLumina');
  const mergedCtaLuminaData = mergeComponentData('ctaLumina');
  const mergedPortfolioLuminaData = mergeComponentData('portfolioLumina');
  const mergedPricingLuminaData = mergeComponentData('pricingLumina');
  const mergedTestimonialsLuminaData = mergeComponentData('testimonialsLumina');
  const mergedFaqLuminaData = mergeComponentData('faqLumina');

  // ─── TopBar height measurement for Header offset ────────────────────────
  const topBarAboveRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const isTopBarAboveVisible = !!(effectiveComponentOrder?.includes('topBar' as PageSection) && mergedTopBarData?.aboveHeader && effectiveComponentStatus['topBar' as PageSection] && effectiveSectionVisibility['topBar' as PageSection]);

  useEffect(() => {
    if (!isTopBarAboveVisible) {
      setTopBarHeight(0);
      return;
    }
    const el = topBarAboveRef.current;
    if (!el) return;

    // Initial measurement
    setTopBarHeight(el.getBoundingClientRect().height);

    // Watch for size changes
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTopBarHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isTopBarAboveVisible]);
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
  const mergedRealEstateListingsData = mergeComponentData('realEstateListings');

  const mergedSeparator1Data = mergeComponentData('separator1');
  const mergedSeparator2Data = mergeComponentData('separator2');
  const mergedSeparator3Data = mergeComponentData('separator3');
  const mergedSeparator4Data = mergeComponentData('separator4');
  const mergedSeparator5Data = mergeComponentData('separator5');

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
      effectiveComponentStatus[component] && effectiveSectionVisibility[component]
    );
  }, [effectiveComponentStatus, effectiveSectionVisibility]);

  const shouldShowStorefrontCart = Boolean(
    activeProjectId &&
    isEcommerceServiceAvailable &&
    isAnyEcommerceComponentEnabled &&
    (storefrontProducts.length > 0 || cart.itemCount > 0 || isStoreViewActive)
  );

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

  const renderQuimeraSection = (
    componentKey: PageSection,
    Component: React.ComponentType<any>,
    extraProps: Record<string, any> = {},
  ) => {
    const sectionData = (data as any)?.[componentKey];
    if (!sectionData) return null;
    const glassEffect = componentKey === 'bentoShowcaseQuimera'
      ? sectionData.glassEffect !== false
      : sectionData.glassEffect;

    return (
      <SectionBackground
        backgroundImageUrl={sectionData.backgroundImageUrl || sectionData.imageUrl}
        backgroundImageOpacity={sectionData.backgroundImageOpacity ?? sectionData.bgOpacity}
        backgroundColor={sectionData.colors?.background || sectionData.backgroundColor}
        backgroundOverlayEnabled={sectionData.backgroundOverlayEnabled}
        backgroundOverlayOpacity={sectionData.backgroundOverlayOpacity ?? sectionData.overlayOpacity}
        backgroundOverlayColor={sectionData.backgroundOverlayColor || sectionData.overlayColor}
        backgroundPosition={sectionData.backgroundPosition}
        backgroundBlurEnabled={sectionData.backgroundBlurEnabled}
        backgroundBlurAmount={sectionData.backgroundBlurAmount}
        backgroundBlurColor={sectionData.backgroundBlurColor}
        glassEffect={glassEffect}
      >
        <Component {...sectionData} isPreviewMode={isEditorMode} {...extraProps} />
      </SectionBackground>
    );
  };

  const componentsMap: Partial<Record<PageSection, React.ReactNode>> = {
    hero: (
      <SectionBackground backgroundImageUrl={mergedHeroData?.backgroundImageUrl} backgroundColor={mergedHeroData?.colors?.background} backgroundOverlayEnabled={mergedHeroData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroData?.backgroundOverlayColor} backgroundPosition={mergedHeroData?.backgroundPosition} glassEffect={mergedHeroData?.glassEffect}>
        {(() => {
          const hbr = mergedHeroData.buttonBorderRadius || theme.buttonBorderRadius;
          const nav = handleLinkNavigation;
          if (mergedHeroData.heroVariant === 'modern') return <HeroModern {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'gradient') return <HeroGradient {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
          if (mergedHeroData.heroVariant === 'fitness') return <HeroFitness {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;

          return <Hero {...mergedHeroData} borderRadius={hbr} onNavigate={nav} />;
        })()}
      </SectionBackground>
    ),
    heroModern: mergedHeroModernData ? (
      <SectionBackground backgroundImageUrl={mergedHeroModernData?.backgroundImageUrl} backgroundColor={mergedHeroModernData?.colors?.background} backgroundOverlayEnabled={mergedHeroModernData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroModernData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroModernData?.backgroundOverlayColor} backgroundPosition={mergedHeroModernData?.backgroundPosition} glassEffect={mergedHeroModernData?.glassEffect}>
        <HeroModern {...mergedHeroModernData} borderRadius={mergedHeroModernData?.buttonBorderRadius || theme.buttonBorderRadius} onNavigate={handleLinkNavigation} />
      </SectionBackground>
    ) : null,
    heroGradient: mergedHeroGradientData ? (
      <SectionBackground backgroundImageUrl={mergedHeroGradientData?.backgroundImageUrl} backgroundColor={mergedHeroGradientData?.colors?.background} backgroundOverlayEnabled={mergedHeroGradientData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroGradientData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroGradientData?.backgroundOverlayColor} backgroundPosition={mergedHeroGradientData?.backgroundPosition} glassEffect={mergedHeroGradientData?.glassEffect}>
        <HeroGradient {...mergedHeroGradientData} borderRadius={mergedHeroGradientData?.buttonBorderRadius || theme.buttonBorderRadius} onNavigate={handleLinkNavigation} />
      </SectionBackground>
    ) : null,
    heroSplit: <SectionBackground backgroundImageUrl={mergedHeroSplitData?.backgroundImageUrl} backgroundColor={mergedHeroSplitData?.colors?.background} backgroundOverlayEnabled={mergedHeroSplitData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroSplitData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroSplitData?.backgroundOverlayColor} backgroundPosition={mergedHeroSplitData?.backgroundPosition}><HeroSplit {...mergedHeroSplitData} borderRadius={mergedHeroSplitData?.buttonBorderRadius || theme.buttonBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    heroGallery: mergedHeroGalleryData ? (
      <SectionBackground backgroundImageUrl={mergedHeroGalleryData?.backgroundImageUrl} backgroundColor={mergedHeroGalleryData?.colors?.background} backgroundOverlayEnabled={mergedHeroGalleryData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroGalleryData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroGalleryData?.backgroundOverlayColor} backgroundPosition={mergedHeroGalleryData?.backgroundPosition}>
        <HeroGallery
          {...mergedHeroGalleryData}
          borderRadius={mergedHeroGalleryData?.buttonBorderRadius || theme.buttonBorderRadius}
          onNavigate={handleLinkNavigation}
        />
      </SectionBackground>
    ) : null,
    heroWave: mergedHeroWaveData ? (
      <SectionBackground backgroundImageUrl={mergedHeroWaveData?.backgroundImageUrl} backgroundColor={mergedHeroWaveData?.colors?.background} backgroundOverlayEnabled={mergedHeroWaveData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroWaveData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroWaveData?.backgroundOverlayColor} backgroundPosition={mergedHeroWaveData?.backgroundPosition}>
        <HeroWave
          {...mergedHeroWaveData}
          borderRadius={mergedHeroWaveData?.buttonBorderRadius || theme.buttonBorderRadius}
          onNavigate={handleLinkNavigation}
        />
      </SectionBackground>
    ) : null,
    heroNova: mergedHeroNovaData ? (
      <SectionBackground backgroundImageUrl={mergedHeroNovaData?.backgroundImageUrl} backgroundColor={mergedHeroNovaData?.colors?.background} backgroundOverlayEnabled={mergedHeroNovaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroNovaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroNovaData?.backgroundOverlayColor} backgroundPosition={mergedHeroNovaData?.backgroundPosition}>
        <HeroNova
          {...mergedHeroNovaData}
          borderRadius={mergedHeroNovaData?.buttonBorderRadius || theme.buttonBorderRadius}
          onNavigate={handleLinkNavigation}
        />
      </SectionBackground>
    ) : null,
    heroLead: mergedHeroLeadData ? (
      <SectionBackground backgroundImageUrl={mergedHeroLeadData?.backgroundImageUrl} backgroundColor={mergedHeroLeadData?.colors?.background} backgroundOverlayEnabled={mergedHeroLeadData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroLeadData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroLeadData?.backgroundOverlayColor} backgroundPosition={mergedHeroLeadData?.backgroundPosition}>
        <HeroLead
          {...mergedHeroLeadData}
          cardBorderRadius={mergedHeroLeadData?.cardBorderRadius || theme.cardBorderRadius}
          inputBorderRadius={mergedHeroLeadData?.inputBorderRadius || 'md'}
          buttonBorderRadius={mergedHeroLeadData?.buttonBorderRadius || theme.buttonBorderRadius}
        />
      </SectionBackground>
    ) : null,
    features: <SectionBackground backgroundImageUrl={mergedFeaturesData?.backgroundImageUrl} backgroundColor={mergedFeaturesData?.colors?.background} backgroundOverlayEnabled={mergedFeaturesData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedFeaturesData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedFeaturesData?.backgroundOverlayColor} backgroundPosition={mergedFeaturesData?.backgroundPosition}><Features {...mergedFeaturesData} borderRadius={mergedFeaturesData.borderRadius || theme.cardBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    testimonials: <SectionBackground backgroundImageUrl={mergedTestimonialsData?.backgroundImageUrl} backgroundColor={mergedTestimonialsData?.colors?.background} backgroundOverlayEnabled={mergedTestimonialsData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedTestimonialsData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedTestimonialsData?.backgroundOverlayColor} backgroundPosition={mergedTestimonialsData?.backgroundPosition}><Testimonials {...mergedTestimonialsData} borderRadius={mergedTestimonialsData.borderRadius || theme.cardBorderRadius} cardShadow={mergedTestimonialsData.cardShadow} borderStyle={mergedTestimonialsData.borderStyle} cardPadding={mergedTestimonialsData.cardPadding} testimonialsVariant={mergedTestimonialsData.testimonialsVariant} /></SectionBackground>,
    slideshow: <SectionBackground backgroundImageUrl={mergedSlideshowData?.backgroundImageUrl} backgroundColor={mergedSlideshowData?.colors?.background} backgroundOverlayEnabled={mergedSlideshowData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedSlideshowData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedSlideshowData?.backgroundOverlayColor} backgroundPosition={mergedSlideshowData?.backgroundPosition}><Slideshow {...mergedSlideshowData} borderRadius={mergedSlideshowData?.borderRadius || theme.cardBorderRadius} /></SectionBackground>,
    screenshotCarousel: <SectionBackground backgroundImageUrl={mergedScreenshotCarouselData?.backgroundImageUrl} backgroundColor={mergedScreenshotCarouselData?.colors?.background} backgroundOverlayEnabled={mergedScreenshotCarouselData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedScreenshotCarouselData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedScreenshotCarouselData?.backgroundOverlayColor} backgroundPosition={mergedScreenshotCarouselData?.backgroundPosition}><Slideshow {...mergedScreenshotCarouselData} borderRadius={mergedScreenshotCarouselData?.borderRadius || theme.cardBorderRadius} /></SectionBackground>,
    pricing: <SectionBackground backgroundImageUrl={mergedPricingData?.backgroundImageUrl} backgroundColor={mergedPricingData?.colors?.background} backgroundOverlayEnabled={mergedPricingData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedPricingData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedPricingData?.backgroundOverlayColor} backgroundPosition={mergedPricingData?.backgroundPosition}><Pricing {...mergedPricingData} cardBorderRadius={mergedPricingData?.cardBorderRadius || theme.cardBorderRadius} buttonBorderRadius={mergedPricingData?.buttonBorderRadius || theme.buttonBorderRadius} /></SectionBackground>,
    faq: <SectionBackground backgroundImageUrl={mergedFaqData?.backgroundImageUrl} backgroundColor={mergedFaqData?.colors?.background} backgroundOverlayEnabled={mergedFaqData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedFaqData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedFaqData?.backgroundOverlayColor} backgroundPosition={mergedFaqData?.backgroundPosition}><Faq {...mergedFaqData} borderRadius={mergedFaqData?.borderRadius || theme.cardBorderRadius} /></SectionBackground>,
    leads: <SectionBackground backgroundImageUrl={mergedLeadsData?.backgroundImageUrl} backgroundColor={mergedLeadsData?.colors?.background} backgroundOverlayEnabled={mergedLeadsData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedLeadsData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedLeadsData?.backgroundOverlayColor} backgroundPosition={mergedLeadsData?.backgroundPosition}><Leads {...mergedLeadsData} cardBorderRadius={mergedLeadsData?.cardBorderRadius || theme.cardBorderRadius} inputBorderRadius={mergedLeadsData?.inputBorderRadius || 'md'} buttonBorderRadius={mergedLeadsData?.buttonBorderRadius || theme.buttonBorderRadius} /></SectionBackground>,
    newsletter: <SectionBackground backgroundImageUrl={mergedNewsletterData?.backgroundImageUrl} backgroundColor={mergedNewsletterData?.colors?.background} backgroundOverlayEnabled={mergedNewsletterData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedNewsletterData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedNewsletterData?.backgroundOverlayColor} backgroundPosition={mergedNewsletterData?.backgroundPosition}><Newsletter {...mergedNewsletterData} cardBorderRadius={mergedNewsletterData?.cardBorderRadius || theme.cardBorderRadius} buttonBorderRadius={mergedNewsletterData?.buttonBorderRadius || theme.buttonBorderRadius} /></SectionBackground>,
    cta: <SectionBackground backgroundImageUrl={mergedCtaData?.backgroundImageUrl} backgroundColor={mergedCtaData?.colors?.background} backgroundOverlayEnabled={mergedCtaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedCtaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedCtaData?.backgroundOverlayColor} backgroundPosition={mergedCtaData?.backgroundPosition}><CTASection {...mergedCtaData} cardBorderRadius={mergedCtaData?.cardBorderRadius || theme.cardBorderRadius} buttonBorderRadius={mergedCtaData?.buttonBorderRadius || theme.buttonBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    portfolio: <SectionBackground backgroundImageUrl={mergedPortfolioData?.backgroundImageUrl} backgroundColor={mergedPortfolioData?.colors?.background} backgroundOverlayEnabled={mergedPortfolioData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedPortfolioData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedPortfolioData?.backgroundOverlayColor} backgroundPosition={mergedPortfolioData?.backgroundPosition}><Portfolio {...mergedPortfolioData} borderRadius={mergedPortfolioData?.borderRadius || theme.cardBorderRadius} /></SectionBackground>,
    showcase: <SectionBackground backgroundImageUrl={mergedShowcaseData?.backgroundImageUrl} backgroundColor={mergedShowcaseData?.colors?.background} backgroundOverlayEnabled={mergedShowcaseData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedShowcaseData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedShowcaseData?.backgroundOverlayColor} backgroundPosition={mergedShowcaseData?.backgroundPosition}><Showcase {...mergedShowcaseData} borderRadius={mergedShowcaseData?.borderRadius || theme.cardBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    services: <SectionBackground backgroundImageUrl={mergedServicesData?.backgroundImageUrl} backgroundColor={mergedServicesData?.colors?.background} backgroundOverlayEnabled={mergedServicesData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedServicesData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedServicesData?.backgroundOverlayColor} backgroundPosition={mergedServicesData?.backgroundPosition}><Services {...mergedServicesData} borderRadius={mergedServicesData?.borderRadius || theme.cardBorderRadius} /></SectionBackground>,
    team: <SectionBackground backgroundImageUrl={mergedTeamData?.backgroundImageUrl} backgroundColor={mergedTeamData?.colors?.background} backgroundOverlayEnabled={mergedTeamData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedTeamData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedTeamData?.backgroundOverlayColor} backgroundPosition={mergedTeamData?.backgroundPosition}><Team {...mergedTeamData} borderRadius={mergedTeamData?.borderRadius || theme.cardBorderRadius} onNavigate={handleLinkNavigation} /></SectionBackground>,
    video: <SectionBackground backgroundImageUrl={mergedVideoData?.backgroundImageUrl} backgroundColor={mergedVideoData?.colors?.background} backgroundOverlayEnabled={mergedVideoData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedVideoData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedVideoData?.backgroundOverlayColor} backgroundPosition={mergedVideoData?.backgroundPosition}><Video {...mergedVideoData} borderRadius={mergedVideoData?.borderRadius || theme.cardBorderRadius} /></SectionBackground>,
    howItWorks: <SectionBackground backgroundImageUrl={mergedHowItWorksData?.backgroundImageUrl} backgroundColor={mergedHowItWorksData?.colors?.background} backgroundOverlayEnabled={mergedHowItWorksData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHowItWorksData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHowItWorksData?.backgroundOverlayColor} backgroundPosition={mergedHowItWorksData?.backgroundPosition}><HowItWorks {...mergedHowItWorksData} borderRadius={mergedHowItWorksData?.borderRadius || theme.cardBorderRadius} /></SectionBackground>,
    map: <SectionBackground backgroundImageUrl={mergedMapData?.backgroundImageUrl} backgroundColor={mergedMapData?.colors?.background} backgroundOverlayEnabled={mergedMapData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedMapData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedMapData?.backgroundOverlayColor} backgroundPosition={mergedMapData?.backgroundPosition}><BusinessMap {...mergedMapData} apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''} borderRadius={mergedMapData?.borderRadius || theme.cardBorderRadius} /></SectionBackground>,
    menu: <SectionBackground backgroundImageUrl={mergedMenuData?.backgroundImageUrl} backgroundColor={mergedMenuData?.colors?.background} backgroundOverlayEnabled={mergedMenuData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedMenuData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedMenuData?.backgroundOverlayColor} backgroundPosition={mergedMenuData?.backgroundPosition}><Menu {...mergedMenuData} borderRadius={mergedMenuData?.borderRadius || theme.cardBorderRadius} dataSource={mergedMenuData?.dataSource} restaurantId={mergedMenuData?.restaurantId} /></SectionBackground>,
    restaurantReservation: mergedRestaurantReservationData ? (
      <SectionBackground backgroundImageUrl={mergedRestaurantReservationData?.backgroundImageUrl} backgroundColor={mergedRestaurantReservationData?.colors?.background} backgroundOverlayEnabled={mergedRestaurantReservationData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedRestaurantReservationData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedRestaurantReservationData?.backgroundOverlayColor} backgroundPosition={mergedRestaurantReservationData?.backgroundPosition}>
        <RestaurantReservation data={mergedRestaurantReservationData} borderRadius={mergedRestaurantReservationData?.borderRadius || theme.cardBorderRadius} buttonBorderRadius={mergedRestaurantReservationData?.buttonBorderRadius || theme.buttonBorderRadius} />
      </SectionBackground>
    ) : null,
    heroQuimera: (data as any)?.heroQuimera ? <HeroQuimera {...(data as any).heroQuimera} isPreviewMode={isEditorMode} /> : null,
    featuresQuimera: renderQuimeraSection('featuresQuimera', FeaturesQuimera),
    pricingQuimera: renderQuimeraSection('pricingQuimera', PricingQuimera),
    testimonialsQuimera: renderQuimeraSection('testimonialsQuimera', TestimonialsQuimera),
    faqQuimera: renderQuimeraSection('faqQuimera', FaqQuimera),
    ctaQuimera: renderQuimeraSection('ctaQuimera', CtaQuimera, { onNavigate: handleLinkNavigation }),
    platformShowcaseQuimera: renderQuimeraSection('platformShowcaseQuimera', PlatformShowcaseQuimera),
    bentoShowcaseQuimera: renderQuimeraSection('bentoShowcaseQuimera', FeaturesQuimera),
    agentDemonstrationQuimera: renderQuimeraSection('agentDemonstrationQuimera', AiCapabilitiesQuimera),
    aiCapabilitiesQuimera: renderQuimeraSection('aiCapabilitiesQuimera', AiCapabilitiesQuimera),
    industrySolutionsQuimera: renderQuimeraSection('industrySolutionsQuimera', IndustrySolutionsQuimera),
    agencyWhiteLabelQuimera: renderQuimeraSection('agencyWhiteLabelQuimera', AgencyWhiteLabelQuimera),
    metricsQuimera: renderQuimeraSection('metricsQuimera', MetricsQuimera),
    finalCtaQuimera: renderQuimeraSection('finalCtaQuimera', CtaQuimera, { onNavigate: handleLinkNavigation }),
    whatIsQuimera: renderQuimeraSection('whatIsQuimera', WhatIsQuimeraSection),
    templatesPreviewQuimera: renderQuimeraSection('templatesPreviewQuimera', TemplatesPreviewQuimera),
    aiWebStudioQuimera: renderQuimeraSection('aiWebStudioQuimera', AiWebStudioQuimera),
    contentManagerQuimera: renderQuimeraSection('contentManagerQuimera', ContentManagerQuimera),
    imageGeneratorQuimera: renderQuimeraSection('imageGeneratorQuimera', ImageGeneratorQuimera),
    chatbotWorkflowQuimera: renderQuimeraSection('chatbotWorkflowQuimera', ChatbotWorkflowQuimera),
    chatbotBuilderQuimera: renderQuimeraSection('chatbotBuilderQuimera', ChatbotBuilderQuimera),
    leadsManagerQuimera: renderQuimeraSection('leadsManagerQuimera', LeadsManagerQuimera),
    appointmentsQuimera: renderQuimeraSection('appointmentsQuimera', AppointmentsQuimera),
    bioPageQuimera: renderQuimeraSection('bioPageQuimera', BioPageQuimera),
    emailMarketingQuimera: renderQuimeraSection('emailMarketingQuimera', EmailMarketingQuimera),
    // Lumina sections
    heroLumina: mergedHeroLuminaData ? (
      <SectionBackground backgroundImageUrl={mergedHeroLuminaData?.backgroundImageUrl} backgroundColor={mergedHeroLuminaData?.colors?.background} backgroundOverlayEnabled={mergedHeroLuminaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroLuminaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroLuminaData?.backgroundOverlayColor} backgroundPosition={mergedHeroLuminaData?.backgroundPosition}>
        <HeroLumina {...mergedHeroLuminaData} borderRadius={mergedHeroLuminaData?.buttonBorderRadius || theme.buttonBorderRadius} onNavigate={handleLinkNavigation} />
      </SectionBackground>
    ) : null,
    heroNeon: mergedHeroNeonData ? (
      <SectionBackground backgroundImageUrl={mergedHeroNeonData?.backgroundImageUrl} backgroundColor={mergedHeroNeonData?.colors?.background} backgroundOverlayEnabled={mergedHeroNeonData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedHeroNeonData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedHeroNeonData?.backgroundOverlayColor} backgroundPosition={mergedHeroNeonData?.backgroundPosition}>
        <HeroNeon {...mergedHeroNeonData} borderRadius={mergedHeroNeonData?.buttonBorderRadius || theme.buttonBorderRadius} onNavigate={handleLinkNavigation} />
      </SectionBackground>
    ) : null,
    testimonialsNeon: mergedTestimonialsNeonData ? (
      <SectionBackground backgroundImageUrl={mergedTestimonialsNeonData?.backgroundImageUrl} backgroundColor={mergedTestimonialsNeonData?.colors?.background} backgroundOverlayEnabled={mergedTestimonialsNeonData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedTestimonialsNeonData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedTestimonialsNeonData?.backgroundOverlayColor} backgroundPosition={mergedTestimonialsNeonData?.backgroundPosition}>
        <TestimonialsNeon {...mergedTestimonialsNeonData} />
      </SectionBackground>
    ) : null,
    featuresNeon: mergedFeaturesNeonData ? (
      <SectionBackground backgroundImageUrl={mergedFeaturesNeonData?.backgroundImageUrl} backgroundColor={mergedFeaturesNeonData?.colors?.background} backgroundOverlayEnabled={mergedFeaturesNeonData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedFeaturesNeonData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedFeaturesNeonData?.backgroundOverlayColor} backgroundPosition={mergedFeaturesNeonData?.backgroundPosition}>
        <FeaturesNeon {...mergedFeaturesNeonData} />
      </SectionBackground>
    ) : null,
    ctaNeon: mergedCtaNeonData ? (
      <SectionBackground backgroundImageUrl={mergedCtaNeonData?.backgroundImageUrl} backgroundColor={mergedCtaNeonData?.colors?.background} backgroundOverlayEnabled={mergedCtaNeonData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedCtaNeonData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedCtaNeonData?.backgroundOverlayColor} backgroundPosition={mergedCtaNeonData?.backgroundPosition}>
        <CtaNeon {...mergedCtaNeonData} />
      </SectionBackground>
    ) : null,
    portfolioNeon: mergedPortfolioNeonData ? (
      <SectionBackground backgroundImageUrl={mergedPortfolioNeonData?.backgroundImageUrl} backgroundColor={mergedPortfolioNeonData?.colors?.background} backgroundOverlayEnabled={mergedPortfolioNeonData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedPortfolioNeonData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedPortfolioNeonData?.backgroundOverlayColor} backgroundPosition={mergedPortfolioNeonData?.backgroundPosition}>
        <PortfolioNeon {...mergedPortfolioNeonData} />
      </SectionBackground>
    ) : null,
    pricingNeon: mergedPricingNeonData ? (
      <SectionBackground backgroundImageUrl={mergedPricingNeonData?.backgroundImageUrl} backgroundColor={mergedPricingNeonData?.colors?.background} backgroundOverlayEnabled={mergedPricingNeonData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedPricingNeonData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedPricingNeonData?.backgroundOverlayColor} backgroundPosition={mergedPricingNeonData?.backgroundPosition}>
        <PricingNeon {...mergedPricingNeonData} />
      </SectionBackground>
    ) : null,
    faqNeon: mergedFaqNeonData ? (
      <SectionBackground backgroundImageUrl={mergedFaqNeonData?.backgroundImageUrl} backgroundColor={mergedFaqNeonData?.colors?.background} backgroundOverlayEnabled={mergedFaqNeonData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedFaqNeonData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedFaqNeonData?.backgroundOverlayColor} backgroundPosition={mergedFaqNeonData?.backgroundPosition}>
        <FaqNeon {...mergedFaqNeonData} />
      </SectionBackground>
    ) : null,
    featuresLumina: mergedFeaturesLuminaData ? (
      <SectionBackground backgroundImageUrl={mergedFeaturesLuminaData?.backgroundImageUrl} backgroundColor={mergedFeaturesLuminaData?.colors?.background} backgroundOverlayEnabled={mergedFeaturesLuminaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedFeaturesLuminaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedFeaturesLuminaData?.backgroundOverlayColor} backgroundPosition={mergedFeaturesLuminaData?.backgroundPosition}>
        <FeaturesLumina {...mergedFeaturesLuminaData} borderRadius={mergedFeaturesLuminaData?.borderRadius || theme.cardBorderRadius} onNavigate={handleLinkNavigation} />
      </SectionBackground>
    ) : null,
    ctaLumina: mergedCtaLuminaData ? (
      <SectionBackground backgroundImageUrl={mergedCtaLuminaData?.backgroundImageUrl} backgroundColor={mergedCtaLuminaData?.colors?.background} backgroundOverlayEnabled={mergedCtaLuminaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedCtaLuminaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedCtaLuminaData?.backgroundOverlayColor} backgroundPosition={mergedCtaLuminaData?.backgroundPosition}>
        <CtaLumina {...mergedCtaLuminaData} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} onNavigate={handleLinkNavigation} />
      </SectionBackground>
    ) : null,
    portfolioLumina: mergedPortfolioLuminaData ? (
      <SectionBackground backgroundImageUrl={mergedPortfolioLuminaData?.backgroundImageUrl} backgroundColor={mergedPortfolioLuminaData?.colors?.background} backgroundOverlayEnabled={mergedPortfolioLuminaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedPortfolioLuminaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedPortfolioLuminaData?.backgroundOverlayColor} backgroundPosition={mergedPortfolioLuminaData?.backgroundPosition}>
        <PortfolioLumina {...mergedPortfolioLuminaData} borderRadius={theme.cardBorderRadius} onNavigate={handleLinkNavigation} />
      </SectionBackground>
    ) : null,
    pricingLumina: mergedPricingLuminaData ? (
      <SectionBackground backgroundImageUrl={mergedPricingLuminaData?.backgroundImageUrl} backgroundColor={mergedPricingLuminaData?.colors?.background} backgroundOverlayEnabled={mergedPricingLuminaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedPricingLuminaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedPricingLuminaData?.backgroundOverlayColor} backgroundPosition={mergedPricingLuminaData?.backgroundPosition}>
        <PricingLumina {...mergedPricingLuminaData} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />
      </SectionBackground>
    ) : null,
    testimonialsLumina: mergedTestimonialsLuminaData ? (
      <SectionBackground backgroundImageUrl={mergedTestimonialsLuminaData?.backgroundImageUrl} backgroundColor={mergedTestimonialsLuminaData?.colors?.background} backgroundOverlayEnabled={mergedTestimonialsLuminaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedTestimonialsLuminaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedTestimonialsLuminaData?.backgroundOverlayColor} backgroundPosition={mergedTestimonialsLuminaData?.backgroundPosition}>
        <TestimonialsLumina {...mergedTestimonialsLuminaData} borderRadius={mergedTestimonialsLuminaData?.borderRadius || theme.cardBorderRadius} />
      </SectionBackground>
    ) : null,
    faqLumina: mergedFaqLuminaData ? (
      <SectionBackground backgroundImageUrl={mergedFaqLuminaData?.backgroundImageUrl} backgroundColor={mergedFaqLuminaData?.colors?.background} backgroundOverlayEnabled={mergedFaqLuminaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedFaqLuminaData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedFaqLuminaData?.backgroundOverlayColor} backgroundPosition={mergedFaqLuminaData?.backgroundPosition}>
        <FaqLumina {...mergedFaqLuminaData} borderRadius={theme.cardBorderRadius} />
      </SectionBackground>
    ) : null,
    banner: <Banner {...mergedBannerData} buttonBorderRadius={mergedBannerData?.buttonBorderRadius || theme.buttonBorderRadius} />,
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
        storeUrl="#store/products"
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
        globalColors={theme.globalColors}
        onProductClick={handleNavigateToProduct}
        onViewAllProducts={handleViewAllProducts}
      />
    ) : null,
    categoryGrid: mergedCategoryGridData ? (
      <CategoryGrid
        data={mergedCategoryGridData}
        storeId={activeProjectId || undefined}
        globalColors={theme.globalColors}
        onCategoryClick={handleNavigateToCategory}
      />
    ) : null,
    productHero: mergedProductHeroData ? (
      <ProductHero
        data={mergedProductHeroData}
        storeId={activeProjectId || undefined}
        globalColors={theme.globalColors}
        onProductClick={handleNavigateToProduct}
        onCollectionClick={handleNavigateToCategory}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    saleCountdown: mergedSaleCountdownData ? (
      <SaleCountdown
        data={mergedSaleCountdownData}
        storeId={activeProjectId || undefined}
        globalColors={theme.globalColors}
        onProductClick={handleNavigateToProduct}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    trustBadges: mergedTrustBadgesData ? (
      <TrustBadges data={mergedTrustBadgesData} storeId={activeProjectId || undefined} globalColors={theme.globalColors} />
    ) : null,
    recentlyViewed: mergedRecentlyViewedData ? (
      <RecentlyViewed
        data={mergedRecentlyViewedData}
        storeId={activeProjectId || undefined}
        globalColors={theme.globalColors}
        onProductClick={handleNavigateToProduct}
      />
    ) : null,
    productReviews: mergedProductReviewsData ? (
      <ProductReviews data={mergedProductReviewsData} storeId={activeProjectId || undefined} globalColors={theme.globalColors} />
    ) : null,
    collectionBanner: mergedCollectionBannerData ? (
      <CollectionBanner
        data={mergedCollectionBannerData}
        storeId={activeProjectId || undefined}
        globalColors={theme.globalColors}
        onCollectionClick={handleNavigateToCategory}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    productBundle: mergedProductBundleData ? (
      <ProductBundle
        data={mergedProductBundleData}
        storeId={activeProjectId || undefined}
        globalColors={theme.globalColors}
        onProductClick={handleNavigateToProduct}
        onNavigate={handleLinkNavigation}
      />
    ) : null,
    announcementBar: mergedAnnouncementBarData ? (
      <AnnouncementBar data={mergedAnnouncementBarData} storeId={activeProjectId || undefined} globalColors={theme.globalColors} onNavigate={handleLinkNavigation} />
    ) : null,
    realEstateListings: (
      <SectionBackground backgroundImageUrl={mergedRealEstateListingsData?.backgroundImageUrl} backgroundColor={mergedRealEstateListingsData?.colors?.background} backgroundOverlayEnabled={mergedRealEstateListingsData?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedRealEstateListingsData?.backgroundOverlayOpacity} backgroundOverlayColor={mergedRealEstateListingsData?.backgroundOverlayColor} backgroundPosition={mergedRealEstateListingsData?.backgroundPosition}>
        <RealEstateListingsSection
          data={mergedRealEstateListingsData || data.realEstateListings}
          projectId={activeProjectId || null}
          isPreviewMode={isEditorMode}
          theme={theme}
          globalColors={theme.globalColors}
          onNavigate={handleLinkNavigation}
        />
      </SectionBackground>
    ),
    propertyDirectory: (
      <PropertyDirectoryPage
        data={mergedRealEstateListingsData || data.realEstateListings}
        projectId={activeProjectId || ''}
        isPreviewMode={isEditorMode}
        theme={theme}
        globalColors={theme.globalColors}
        onNavigate={handleLinkNavigation}
      />
    ),
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
        const authorLabel = post.author || post.authorName || '';
        const postShowAuthor = showAuthor && post.showAuthor !== false;
        const postShowDate = showDate && post.showDate !== false;

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
                {postShowAuthor && authorLabel && <span>{authorLabel}</span>}
                {postShowDate && <span>{dateStr}</span>}
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
                {postShowAuthor && authorLabel && <span>{authorLabel}</span>}
                {postShowDate && <span>{dateStr}</span>}
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
                {postShowAuthor && authorLabel && <span>{authorLabel}</span>}
                {postShowDate && <span>{dateStr}</span>}
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
                {postShowAuthor && authorLabel && <span>{authorLabel}</span>}
                {postShowDate && <span>{dateStr}</span>}
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
                  {postShowDate && <span>{dateStr}</span>}
                </div>
              </div>
              <h3 className="font-extrabold text-2xl mb-3 group-hover:opacity-80 transition-opacity leading-tight" style={{ color: colors.cardHeading || '#f8fafc', fontFamily: 'var(--font-header)' }}>{post.title}</h3>
              {showExcerpt && <p className="line-clamp-3 mb-4 leading-relaxed" style={{ color: colors.cardExcerpt || '#94a3b8' }}>{post.excerpt}</p>}
              <div className="flex items-center justify-between">
                {postShowAuthor && authorLabel && <span className="text-sm font-medium" style={{ color: colors.cardText || '#cbd5e1' }}>{authorLabel}</span>}
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
          backgroundPosition={fd.backgroundPosition}
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
    separator1: mergedSeparator1Data ? <Separator data={mergedSeparator1Data} /> : null,
    separator2: mergedSeparator2Data ? <Separator data={mergedSeparator2Data} /> : null,
    separator3: mergedSeparator3Data ? <Separator data={mergedSeparator3Data} /> : null,
    separator4: mergedSeparator4Data ? <Separator data={mergedSeparator4Data} /> : null,
    separator5: mergedSeparator5Data ? <Separator data={mergedSeparator5Data} /> : null,
  };

  // Font variables are now injected directly into :root via useEffect above
  // This ensures Tailwind's font-header, font-body, and font-button classes work correctly

  // Dynamic Menu Resolution - prioritize: CMS Menu > Pages > Manual Links
  const headerLinks = useMemo(() => {
    // 0. Explicit manual override
    if (mergedHeaderData.menuId === 'manual') {
      return mergedHeaderData.links || [];
    }

    // 1. CMS Menu takes priority if configured
    if (mergedHeaderData.menuId) {
      const menu = menus.find(m => m.id === mergedHeaderData.menuId);
      if (menu && menu.items?.length > 0) {
        return menu.items.map(i => ({ text: i.text, href: i.href, icon: i.icon }));
      }
    }

    // 2. Generate from pages if available (multi-page architecture)
    if (serviceFilteredPages.length > 0) {
      const navPages = serviceFilteredPages
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
  }, [mergedHeaderData?.menuId, mergedHeaderData?.links, menus, serviceFilteredPages]);

  // Resolve Footer Columns dynamically
  const resolvedFooterData: FooterData = {
    ...(mergedFooterData || {}),
    // Auto-hide "Made with Quimera" badge when White Label branding is active
    hideBranding: mergedFooterData?.hideBranding || hasWhiteLabelBranding,
    linkColumns: (mergedFooterData?.linkColumns || []).map(col => {
      if (col.menuId) {
        const menu = menus.find(m => m.id === col.menuId);
        if (menu) {
          return { ...col, links: menu.items.map(i => ({ text: i.text, href: i.href })) };
        }
      }
      return col;
    })
  };

  const isArticleHash = isCmsServiceAvailable && typeof window !== 'undefined' && window.location.hash.startsWith('#article:');
  const isBlogPath = isCmsServiceAvailable && typeof window !== 'undefined' && window.location.pathname.startsWith('/blog/');

  // Determine if we should show the loading spinner for an article
  const showArticleLoading = isCmsServiceAvailable && (isArticleHash || isBlogPath) && (isLoadingCMS || (isRouting && !activePost));

  // Use theme pageBackground with smart fallback based on globalColors or hero background
  // Priority: pageBackground > globalColors.background > hero background > default
  const pageBackgroundColor = theme?.pageBackground
    || theme?.globalColors?.background
    || data?.hero?.colors?.background
    || '#0f172a'; // Default to modern dark slate instead of white

  return (
    <div
      className={`text-slate-200 overflow-x-hidden transition-colors duration-500`}
      onClickCapture={handlePreviewClickCapture}
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
      {effectiveComponentOrder?.includes('announcementBar' as PageSection) && mergedAnnouncementBarData?.position === 'above-header' && effectiveComponentStatus['announcementBar' as PageSection] && effectiveSectionVisibility['announcementBar' as PageSection] && (
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
      {effectiveComponentOrder?.includes('topBar' as PageSection) && mergedTopBarData?.aboveHeader && effectiveComponentStatus['topBar' as PageSection] && effectiveSectionVisibility['topBar' as PageSection] && (
        <div
          ref={topBarAboveRef}
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
        forceSolid={isStoreViewActive || showRealtyDirectory || Boolean(activePropertySlug) || Boolean(activePage?.sections?.includes('propertyDetail') || activePage?.sections?.includes('propertyDirectory'))}
        showCart={shouldShowStorefrontCart}
        cartItemCount={cart.itemCount}
        onCartClick={cart.toggleCart}
        onNavigate={handleLinkNavigation}
        containerRef={previewRef}
        isPreviewMode={isEditorMode}
        topBarOffset={topBarHeight}
      />

      {/* Cart Drawer - only when store has products AND ecommerce is enabled */}
      {shouldShowStorefrontCart && (
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
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-q-text-secondary">
            <QuimeraLoader size="md" />
            <p>Loading article...</p>
          </div>
        )}

        {/* 2. Article View */}
        {!showArticleLoading && isCmsServiceAvailable && activePost && (() => {
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
        {!showArticleLoading && isCmsServiceAvailable && !activePost && activeCategorySlug && (() => {
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
        {!showArticleLoading && isCmsServiceAvailable && (isArticleHash || blogSlugNotFound) && !activePost && !isLoadingCMS && (
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

        {/* 3.5. Real Estate Property Detail View */}
        {!showArticleLoading && isRealEstateServiceAvailable && !activePost && !activeCategorySlug && activePropertySlug && activeProjectId && (
          <PropertyDetailSection
            projectId={activeProjectId}
            ownerId={activeProject?.userId || undefined}
            propertySlug={activePropertySlug}
            data={mergedRealEstateListingsData || data.realEstateListings}
            theme={theme}
            globalColors={theme.globalColors}
            onNavigateHome={handleBackToHome}
            onNavigateToListings={() => handleLinkNavigation(resolveRealtyDirectoryRoute(mergedRealEstateListingsData || data.realEstateListings))}
            onNavigateToProperty={(slug) => {
              setActivePropertySlug(slug);
              window.history.pushState({}, '', resolveRealtyDetailPath(mergedRealEstateListingsData || data.realEstateListings, slug));
              window.scrollTo(0, 0);
            }}
          />
        )}

        {/* 3.6. Real Estate Directory View */}
        {!showArticleLoading && isRealEstateServiceAvailable && !activePost && !activeCategorySlug && !activePropertySlug && showRealtyDirectory && activeProjectId && (
          <PropertyDirectoryPage
            projectId={activeProjectId}
            data={mergedRealEstateListingsData || data.realEstateListings}
            isPreviewMode={isEditorMode}
            theme={theme}
            globalColors={theme.globalColors}
            onNavigate={handleLinkNavigation}
          />
        )}

        {/* 4. Storefront Landing View */}
        {isStoreViewActive && storeView.type === 'store' && activeProjectId && (
          <>
            {/* Ecommerce landing sections only. Full catalog lives in /tienda/productos. */}
            {effectiveComponentOrder
              .filter(key => {
                const ecommerceSections: PageSection[] = [
                  'announcementBar',
                  'productHero',
                  'featuredProducts',
                  'categoryGrid',
                  'saleCountdown',
                  'collectionBanner',
                  'trustBadges',
                  'recentlyViewed',
                  'productReviews',
                  'productBundle',
                ];
                return ecommerceSections.includes(key as PageSection) &&
                  effectiveComponentStatus[key as PageSection] &&
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

        {/* 4.1. Store Catalog View */}
        {isStoreViewActive && storeView.type === 'products' && activeProjectId && (
          <ProductSearchPage
            storeId={activeProjectId}
            onProductClick={handleNavigateToProduct}
            onAddToCart={(product) => cart.addItem(product, 1)}
            primaryColor={theme.globalColors?.primary || '#6366f1'}
            embedded={true}
            title="Todos los productos"
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
        )}

        {/* 5. Store View - Category */}
        {isStoreViewActive && storeView.type === 'category' && activeProjectId && (
          <>
            {/* Announcement Bar for category view */}
            {effectiveComponentOrder?.includes('announcementBar' as PageSection) && effectiveComponentStatus['announcementBar' as PageSection] && effectiveSectionVisibility['announcementBar' as PageSection] && isEcommerceComponentVisibleIn('announcementBar', 'store') && (
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
              onAddToCart={(product) => cart.addItem(product, 1)}
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
                  effectiveComponentStatus[key as PageSection] &&
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
        {isStoreViewActive && storeView.type === 'product' && activeProjectId && (
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
                  effectiveComponentStatus[key as PageSection] &&
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
        {isStoreViewActive && storeView.type === 'checkout' && activeProjectId && (
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
        {!isArticleHash && !activePost && !activeCategorySlug && !activePropertySlug && !showRealtyDirectory && !isStoreViewActive && (
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
                const baseVisibility = effectiveComponentStatus[key as PageSection] &&
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
      {!showArticleLoading && effectiveComponentStatus.footer && effectiveSectionVisibility.footer && (
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
      {shouldRenderChatbotWidget && isSectionServiceAvailable('chatbot' as PageSection, isPublicServiceAvailable) && (
        <ChatbotWidget
          isPreview={isEditorMode}
          standaloneConfig={activeProjectChatbotConfig}
          chatbotEngineContext={landingChatbotEngineContext}
        />
      )}

      {/* SignupFloat - Floating overlay rendered outside section flow */}
      {data?.signupFloat && effectiveComponentOrder.includes('signupFloat') && effectiveComponentStatus.signupFloat && effectiveSectionVisibility.signupFloat && (
        <SignupFloat
          {...data.signupFloat}
          projectId={activeProjectId || undefined}
          ownerId={activeProject?.userId || undefined}
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
