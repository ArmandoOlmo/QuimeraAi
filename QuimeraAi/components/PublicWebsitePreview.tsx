/**
 * PublicWebsitePreview Component
 * Renders a website preview independently in the browser without authentication
 * Supports URLs like: /#preview/{userId}/{projectId}
 * Supports store routing: #store, #store/category/slug, #store/product/slug
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { resolveI18nField, resolveI18nSectionData } from '../utils/i18nContent';
import { Project, PageData, ThemeData, PageSection, CMSPost, CMSCategory, Menu, FooterData, FontFamily, SEOConfig, SitePage, AiAssistantConfig } from '../types';
import { fontStacks, getGoogleFontsUrl, resolveFontFamily } from '../utils/fontLoader';
import { deriveColorsFromPalette } from '../utils/colorUtils';
import { componentStyles as defaultComponentStyles } from '../data/componentStyles';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { initialData } from '../data/initialData';
import { DynamicData, PublicProduct, PublicCategory } from '../utils/metaGenerator';
import AdPixelsInjector from './AdPixelsInjector';
import { getPreviewPrefetch } from '../utils/previewPrefetch';
import { getSafeImageUrl, isLegacyStorageUrl } from '../utils/imageUrlHelper';
import { getBootBackgroundColor } from '../utils/bootBackground';
import SectionBackground from './ui/SectionBackground';
import { usePublicRealtyListings } from '../hooks/usePublicRealtyListings';
import type { RealtyListingsSectionData, RealtyProperty } from '../types/realty';
import {
  REALTY_DEFAULT_ROUTE_SEGMENTS,
  matchRealtyDetailRoute,
  matchRealtyDirectoryRoute,
  resolveRealtyDetailPath,
  resolveRealtyDirectoryRoute,
} from '../utils/realtyWebsiteRoutes';
import { buildChatbotEngineSurfaceContext } from '../utils/chatbotEngine/surfaceContext';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function replaceBrokenSupabaseStorageUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return (isLegacyStorageUrl(value)
      ? getSafeImageUrl(value, { label: 'Imagen pendiente' })
      : value) as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => replaceBrokenSupabaseStorageUrls(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        replaceBrokenSupabaseStorageUrls(item),
      ])
    ) as T;
  }

  return value;
}

// Core components — needed immediately for first paint
import Header from './Header';
import HeroNeon from './HeroNeon';
import TestimonialsNeon from './TestimonialsNeon';
import FeaturesNeon from './FeaturesNeon';
import CtaNeon from './CtaNeon';
import PortfolioNeon from './PortfolioNeon';
import PricingNeon from './PricingNeon';
import FaqNeon from './FaqNeon';
import Hero from './Hero';
import Features from './Features';
import Separator from './Separator';
import Footer from './Footer';

// Lazy-loaded components — loaded on demand to reduce initial chunk
const HeroModern = lazy(() => import('./HeroModern'));
const HeroGradient = lazy(() => import('./HeroGradient'));
const HeroFitness = lazy(() => import('./HeroFitness'));

const HeroSplit = lazy(() => import('./HeroSplit'));
const HeroGallery = lazy(() => import('./HeroGallery'));
const HeroWave = lazy(() => import('./HeroWave'));
const HeroNova = lazy(() => import('./HeroNova'));
const HeroLead = lazy(() => import('./HeroLead'));
const SignupFloat = lazy(() => import('./SignupFloat'));
const Testimonials = lazy(() => import('./Testimonials'));
const Slideshow = lazy(() => import('./Slideshow'));
const Pricing = lazy(() => import('./Pricing'));
const Faq = lazy(() => import('./Faq'));
const Leads = lazy(() => import('./Leads'));
const AppointmentBooking = lazy(() => import('./AppointmentBooking'));
const Newsletter = lazy(() => import('./Newsletter'));
const CTASection = lazy(() => import('./CTASection'));
const Portfolio = lazy(() => import('./Portfolio'));
const Services = lazy(() => import('./Services'));
const Team = lazy(() => import('./Team'));
const Video = lazy(() => import('./Video'));
const HowItWorks = lazy(() => import('./HowItWorks'));
const ChatbotWidget = lazy(() => import('./ChatbotWidget'));
const BusinessMap = lazy(() => import('./BusinessMap'));
const MenuComponent = lazy(() => import('./Menu'));
const Banner = lazy(() => import('./Banner'));
const TopBar = lazy(() => import('./TopBar'));
const LogoBanner = lazy(() => import('./LogoBanner'));
const BlogPost = lazy(() => import('./BlogPost'));
const Products = lazy(() => import('./Products'));
const PageRenderer = lazy(() => import('./PageRenderer'));
const BlogCategoryPage = lazy(() => import('./BlogCategoryPage'));
const RealEstateListingsSection = lazy(() => import('./realty/PublicRealtyListingsSection'));
const PropertyDirectoryPage = lazy(() => import('./realty/PublicRealtyDirectoryPage'));
const PropertyDetailSection = lazy(() => import('./realty/PublicRealtyPropertyDetail'));
const RestaurantReservationComponent = lazy(() => import('./RestaurantReservation'));

// Lumina components
const HeroLumina = lazy(() => import('./HeroLumina'));

const FeaturesLumina = lazy(() => import('./FeaturesLumina'));
const CtaLumina = lazy(() => import('./CtaLumina'));
const PortfolioLumina = lazy(() => import('./PortfolioLumina'));
const PricingLumina = lazy(() => import('./PricingLumina'));
const TestimonialsLumina = lazy(() => import('./TestimonialsLumina'));
const FaqLumina = lazy(() => import('./FaqLumina'));



// Lazy load StorefrontApp for store views
const StorefrontApp = lazy(() => import('./ecommerce/StorefrontApp'));

const PREVIEW_LOGICAL_ROUTE_SEGMENTS = new Set([
  ...REALTY_DEFAULT_ROUTE_SEGMENTS,
  'listados',
  'blog',
  'tienda',
  'producto',
  'categoria',
  'carrito',
  'checkout',
  'pedido',
]);

const resolvePreviewBaseFromPath = (pathname: string): string => {
  if (!pathname.startsWith('/preview/')) return '';
  const parts = pathname.replace('/preview/', '').split('/').filter(Boolean);
  if (parts.length === 0) return '/preview';
  if (parts.length === 1) return `/preview/${parts[0]}`;
  if (PREVIEW_LOGICAL_ROUTE_SEGMENTS.has(parts[1])) return `/preview/${parts[0]}`;
  if (UUID_RE.test(parts[0]) && !UUID_RE.test(parts[1])) return `/preview/${parts[0]}`;
  return `/preview/${parts[0]}/${parts[1]}`;
};

// Separate component for store view to isolate Suspense and avoid hook count issues
interface StoreViewWrapperProps {
  projectId: string;
  storeView: StoreViewState;
  initialData?: any;
}

const StoreViewWrapper: React.FC<StoreViewWrapperProps> = ({ projectId, storeView, initialData }) => {
  const serverUrl =
    storeView.type === 'products' ? '/products' :
      storeView.type === 'store' ? '/' :
      storeView.type === 'category' ? `/category/${(storeView as { type: 'category'; slug: string }).slug}` :
        storeView.type === 'product' ? `/product/${(storeView as { type: 'product'; slug: string }).slug}` : '/';

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
      </div>
    }>
      <StorefrontApp
        projectId={projectId}
        serverUrl={serverUrl}
        initialData={initialData}
      />
    </Suspense>
  );
};

// Ecommerce components (lazy loaded)
const FeaturedProducts = lazy(() => import('./ecommerce').then(m => ({ default: m.FeaturedProducts })));
const CategoryGrid = lazy(() => import('./ecommerce').then(m => ({ default: m.CategoryGrid })));
const ProductHero = lazy(() => import('./ecommerce').then(m => ({ default: m.ProductHero })));
const SaleCountdown = lazy(() => import('./ecommerce').then(m => ({ default: m.SaleCountdown })));
const TrustBadges = lazy(() => import('./ecommerce').then(m => ({ default: m.TrustBadges })));
const RecentlyViewed = lazy(() => import('./ecommerce').then(m => ({ default: m.RecentlyViewed })));
const ProductReviews = lazy(() => import('./ecommerce').then(m => ({ default: m.ProductReviews })));
const CollectionBanner = lazy(() => import('./ecommerce').then(m => ({ default: m.CollectionBanner })));
const ProductBundle = lazy(() => import('./ecommerce').then(m => ({ default: m.ProductBundle })));
const AnnouncementBar = lazy(() => import('./ecommerce').then(m => ({ default: m.AnnouncementBar })));

// Store view types
type StoreViewState =
  | { type: 'none' }
  | { type: 'store' }
  | { type: 'products' }
  | { type: 'category'; slug: string }
  | { type: 'product'; slug: string };

const resolveWebsiteStorefrontHref = (href: string): string | null => {
  const rawHref = href.trim();
  if (!rawHref) return null;

  let pathname = rawHref.split(/[?#]/)[0] || '/';
  if (/^https?:\/\//i.test(rawHref)) {
    try {
      const url = new URL(rawHref);
      if (typeof window !== 'undefined' && url.origin !== window.location.origin) return null;
      pathname = url.pathname;
    } catch {
      return null;
    }
  }

  if (pathname === '/products' || pathname === '/catalog' || pathname === '/shop') {
    return '/tienda/productos';
  }

  if (pathname.startsWith('/product/')) {
    return `/tienda/producto/${pathname.replace('/product/', '').replace(/\/$/, '')}`;
  }

  if (pathname.startsWith('/category/')) {
    return `/tienda/categoria/${pathname.replace('/category/', '').replace(/\/$/, '')}`;
  }

  if (pathname.startsWith('/collection/')) {
    return `/tienda/categoria/${pathname.replace('/collection/', '').replace(/\/$/, '')}`;
  }

  if (
    pathname === '/tienda' ||
    pathname === '/tienda/' ||
    pathname === '/tienda/productos' ||
    pathname === '/tienda/productos/' ||
    pathname === '/tienda/catalogo' ||
    pathname === '/tienda/catalogo/' ||
    pathname.startsWith('/tienda/categoria/') ||
    pathname.startsWith('/tienda/producto/')
  ) {
    return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  }

  const storeRouteMatch = pathname.match(/^\/store\/[^/]+(?:\/(.*))?$/);
  if (!storeRouteMatch) return null;

  const route = (storeRouteMatch[1] || '').replace(/^\/+|\/+$/g, '');
  if (!route || route === 'tienda') return '/tienda';
  if (/^(products|catalog|shop|tienda\/productos|tienda\/catalogo)$/.test(route)) {
    return '/tienda/productos';
  }
  if (route.startsWith('tienda/producto/')) {
    return `/tienda/producto/${route.replace('tienda/producto/', '')}`;
  }
  if (route.startsWith('tienda/categoria/')) {
    return `/tienda/categoria/${route.replace('tienda/categoria/', '')}`;
  }
  if (route.startsWith('product/')) {
    return `/tienda/producto/${route.replace('product/', '')}`;
  }
  if (route.startsWith('category/')) {
    return `/tienda/categoria/${route.replace('category/', '')}`;
  }
  if (route.startsWith('collection/')) {
    return `/tienda/categoria/${route.replace('collection/', '')}`;
  }

  return null;
};

// fontStacks imported from utils/fontLoader.ts (single source of truth)

interface PublicWebsitePreviewProps {
  projectId?: string;
  userId?: string;
  /** Username for subdomain resolution (username.quimera.ai) */
  username?: string;
}

const PublicWebsitePreview: React.FC<PublicWebsitePreviewProps> = ({ projectId: propProjectId, userId: propUserId, username: propUsername }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<CMSCategory[]>([]);
  const [hasWhiteLabelBranding, setHasWhiteLabelBranding] = useState(false);
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | null>(null);
  const [brandingCompanyName, setBrandingCompanyName] = useState<string | null>(null);
  const [activePost, setActivePost] = useState<CMSPost | null>(null);
  const [storeView, setStoreView] = useState<StoreViewState>({ type: 'none' });
  const [activePage, setActivePage] = useState<SitePage | null>(null);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);

  // i18n — must be called unconditionally at top level (Rules of Hooks)
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || 'es';

  /**
   * Preview base path — preserves /preview/{userId}/{projectId} prefix
   * so sub-page URLs stay within the preview context and don't collide
   * with app-level routes like /blog.
   * For custom domains / subdomains this is empty (no prefix needed).
   */
  const previewBasePath = useMemo(() => {
    return resolvePreviewBaseFromPath(window.location.pathname);
  }, []);
  const isEditorPreviewRoute = Boolean(previewBasePath);

  /**
   * Strips the preview base path from a full pathname to get the
   * logical route (e.g. /blog/slug, /tienda, etc.).
   */
  const getLogicalPath = useCallback((fullPath: string): string => {
    if (previewBasePath && fullPath.startsWith(previewBasePath)) {
      return fullPath.slice(previewBasePath.length) || '/';
    }
    return fullPath;
  }, [previewBasePath]);

  /**
   * Update the browser URL via pushState and update SEO meta tags.
   * This enables shareable URLs, proper back-button behavior, 
   * and allows crawlers to discover sub-pages.
   * Preserves the preview prefix for /preview/ routes.
   */
  const updateBrowserUrl = useCallback((newPath: string) => {
    const fullPath = previewBasePath ? `${previewBasePath}${newPath}` : newPath;
    // Only pushState if the path actually changed
    if (window.location.pathname !== fullPath) {
      window.history.pushState(null, '', fullPath);
    }
  }, [previewBasePath]);

  /**
   * Update SEO meta tags dynamically when navigating within a user project.
   */
  const updatePageSEO = useCallback((opts: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    path?: string;
  }) => {
    const siteName = project?.brandIdentity?.name || project?.name || '';
    const pageTitle = opts.title ? `${opts.title} | ${siteName}` : siteName;
    document.title = pageTitle;

    // Helper to upsert a meta tag
    const setMeta = (sel: string, content: string, attr: 'name' | 'property' = 'name') => {
      if (!content) return;
      let el = document.querySelector(sel) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, sel.replace(`[${attr}="`, '').replace('"]', ''));
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (opts.description) setMeta('[name="description"]', opts.description);
    if (opts.title) {
      setMeta('[property="og:title"]', pageTitle, 'property');
      setMeta('[name="twitter:title"]', pageTitle);
    }
    if (opts.description) {
      setMeta('[property="og:description"]', opts.description, 'property');
      setMeta('[name="twitter:description"]', opts.description);
    }
    if (opts.image) {
      setMeta('[property="og:image"]', opts.image, 'property');
      setMeta('[name="twitter:image"]', opts.image);
    }
    if (opts.type) setMeta('[property="og:type"]', opts.type, 'property');
    if (opts.path) {
      const url = `${window.location.origin}${opts.path}`;
      setMeta('[property="og:url"]', url, 'property');
      // Update canonical
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = url;
    }
  }, [project]);

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

      // Remove SSR branded skeleton (smooth fade-out)
      if (typeof (window as any).__removeSkeleton === 'function') {
        (window as any).__removeSkeleton();
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

  // Consume prefetched tenant branding (already started before React mounted)
  useEffect(() => {
    const prefetch = getPreviewPrefetch();
    if (prefetch) {
      prefetch.then(data => {
        if (data.tenantBranding) {
          if (data.tenantBranding.logoUrl) setBrandingLogoUrl(data.tenantBranding.logoUrl);
          if (data.tenantBranding.companyName) setBrandingCompanyName(data.tenantBranding.companyName);
          setHasWhiteLabelBranding(true);
        }
      });
    }
  }, []);

  // Parse URL params from pathname: /preview/userId/projectId or /preview/projectId
  // Also supports hash: #preview/userId/projectId (legacy)
  const getIdsFromURL = () => {
    if (propProjectId) {
      console.log('[PublicWebsitePreview] Using explicit props:', { userId: propUserId || null, projectId: propProjectId });
      return { userId: propUserId || null, projectId: propProjectId };
    }

    // First check pathname (new format): /preview/userId/projectId or /preview/projectId
    const pathname = window.location.pathname;
    if (pathname.startsWith('/preview/')) {
      const parts = pathname.replace('/preview/', '').split('/').filter(Boolean);
      // One-part preview with a subroute: /preview/projectId/listados/:slug
      if (parts.length >= 2 && PREVIEW_LOGICAL_ROUTE_SEGMENTS.has(parts[1])) {
        console.log('[PublicWebsitePreview] Parsed projectId from pathname with subroute:', { projectId: parts[0], logicalRoute: parts.slice(1).join('/') });
        return { userId: null, projectId: parts[0] };
      }
      if (parts.length >= 2 && UUID_RE.test(parts[0]) && !UUID_RE.test(parts[1])) {
        console.log('[PublicWebsitePreview] Parsed UUID projectId from pathname with custom subroute:', { projectId: parts[0], logicalRoute: parts.slice(1).join('/') });
        return { userId: null, projectId: parts[0] };
      }
      // Two parts: /preview/userId/projectId
      if (parts.length >= 2) {
        console.log('[PublicWebsitePreview] Parsed IDs from pathname (full):', { userId: parts[0], projectId: parts[1] });
        return { userId: parts[0], projectId: parts[1] };
      }
      // One part: /preview/projectId (for published sites without userId)
      if (parts.length === 1) {
        console.log('[PublicWebsitePreview] Parsed projectId only from pathname:', { projectId: parts[0] });
        return { userId: null, projectId: parts[0] };
      }
    }

    // Also support hash format (legacy): #preview/userId/projectId
    const hash = window.location.hash;
    if (hash.startsWith('#preview/')) {
      const parts = hash.replace('#preview/', '').split('/').filter(Boolean);
      if (parts.length >= 2) {
        console.log('[PublicWebsitePreview] Parsed IDs from hash:', { userId: parts[0], projectId: parts[1] });
        return { userId: parts[0], projectId: parts[1] };
      }
      if (parts.length === 1) {
        console.log('[PublicWebsitePreview] Parsed projectId only from hash:', { projectId: parts[0] });
        return { userId: null, projectId: parts[0] };
      }
    }

    // Fallback to query params or props: ?userId=...&projectId=...
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId') || propUserId || null;
    const projectId = params.get('projectId') || propProjectId;

    console.log('[PublicWebsitePreview] Using props/query params:', { userId, projectId });
    return { userId, projectId };
  };

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      const { userId, projectId } = getIdsFromURL();

      // projectId is required, userId is optional for published sites
      // But username can be used to resolve projectId
      if (!projectId && !propUsername) {
        setError('Missing projectId in URL');
        setLoading(false);
        return;
      }

      try {
        let projectData: Project | null = null;

        // PRIORITY -2: Resolve username to projectId (user subdomain)
        let resolvedProjectId = projectId;
        let resolvedUserId = userId;
        if (!resolvedProjectId && propUsername) {
          console.log(`[PublicWebsitePreview] Resolving username: ${propUsername}`);
          try {
            const { data: tenant, error } = await supabase
              .from('tenants')
              .select('id, owner_user_id')
              .eq('slug', propUsername)
              .maybeSingle();

            if (error || !tenant) {
              console.warn(`[PublicWebsitePreview] Username '${propUsername}' not found`);
              setError(`User "${propUsername}" not found`);
              setLoading(false);
              return;
            }
            
            resolvedUserId = tenant.owner_user_id;

            // Get project associated with this tenant
            const { data: project } = await supabase
              .from('projects')
              .select('id')
              .eq('tenant_id', tenant.id)
              .limit(1)
              .maybeSingle();

            if (project) {
              resolvedProjectId = project.id;
              console.log(`[PublicWebsitePreview] Resolved username '${propUsername}' -> userId: ${resolvedUserId}, projectId: ${resolvedProjectId}`);
            } else {
              setError(`User "${propUsername}" has no published projects`);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('[PublicWebsitePreview] Error resolving username:', err);
            setError('Failed to resolve username');
            setLoading(false);
            return;
          }
        }

        // PRIORITY -1: Check for prefetched data (started before React mounted)
        const prefetch = getPreviewPrefetch();
        if (prefetch) {
          const prefetched = await prefetch;
          if (prefetched.project) {
            projectData = replaceBrokenSupabaseStorageUrls(prefetched.project) as Project;
            if (prefetched.posts.length > 0) setCmsPosts(prefetched.posts as CMSPost[]);
            if (prefetched.menus.length > 0) setMenus(prefetched.menus as Menu[]);
            if (prefetched.categories && prefetched.categories.length > 0) {
              setCategories(prefetched.categories as CMSCategory[]);
            } else if ((projectData as any).categories && Array.isArray((projectData as any).categories)) {
              setCategories((projectData as any).categories);
            }
            if (prefetched.tenantBranding) {
              setHasWhiteLabelBranding(true);
            }
            // Set project immediately, skip all other fetch paths
            setProject(projectData);
            setLoading(false);
            window.scrollTo(0, 0);
            return;
          }
        }

        // PRIORITY 0: Check for SSR-injected data (fastest path - no Supabase call needed)
        // This is set by the SSR server for custom domains
        const ssrData = typeof window !== 'undefined' ? (window as any).__INITIAL_DATA__ : null;

        if (ssrData?.project) {
          projectData = replaceBrokenSupabaseStorageUrls({ id: ssrData.projectId, ...ssrData.project }) as Project;

          console.log('[PublicWebsitePreview] ✅ Using SSR-injected data (no Supabase call)', {
            projectName: projectData.name,
            hasMenus: !!(projectData as any).menus?.length,
            menusCount: (projectData as any).menus?.length || 0,
          });

          // Set project immediately from SSR data
          setProject(projectData);

          // Load menus from SSR data
          if ((projectData as any).menus && Array.isArray((projectData as any).menus)) {
            console.log('[PublicWebsitePreview] ✅ Loaded menus from SSR data:', (projectData as any).menus.length);
            setMenus((projectData as any).menus);
          }

          // Load categories from SSR data
          if ((projectData as any).categories && Array.isArray((projectData as any).categories) && (projectData as any).categories.length > 0) {
            console.log('[PublicWebsitePreview] ✅ Loaded categories from SSR data:', (projectData as any).categories.length);
            setCategories((projectData as any).categories);
            // Categories not in SSR data — fetch from Supabase
            console.log('[PublicWebsitePreview] ⚠️ No categories in SSR data, fetching from Supabase...');
            try {
              const { data, error } = await supabase
                .from('projects')
                .select('published_data')
                .eq('id', ssrData.projectId)
                .maybeSingle();

              if (!error && data?.published_data) {
                const pd = data.published_data as any;
                if (pd.categories && Array.isArray(pd.categories) && pd.categories.length > 0) {
                  console.log('[PublicWebsitePreview] ✅ Loaded categories from Supabase (SSR fallback):', pd.categories.length);
                  setCategories(pd.categories);
                }
              }
            } catch (e) {
              console.warn('[PublicWebsitePreview] Error fetching categories fallback:', e);
            }
          }

          // Load CMS posts from SSR data
          // These come from entry-server.tsx as ProjectData.posts (PublicArticle[])
          // Also check for ssrData.posts which may be set directly
          const ssrPosts = ssrData.posts || (projectData as any).posts;
          if (ssrPosts && Array.isArray(ssrPosts)) {
            console.log('[PublicWebsitePreview] ✅ Loaded CMS posts from SSR data:', ssrPosts.length, ssrPosts.map((p: any) => p.slug));
            setCmsPosts(ssrPosts as CMSPost[]);
          } else {
            console.log('[PublicWebsitePreview] ⚠️ No CMS posts in SSR data, will need to load from Supabase');
            // Don't return yet - we need to load posts from Supabase
            // Continue to load posts below
          }

          setLoading(false);

          // If no posts were loaded from SSR, fetch them from Supabase
          if (!ssrPosts || ssrPosts.length === 0) {
            try {
              const { data, error } = await supabase
                .from('posts')
                .select('*')
                .contains('tags', [`project:${resolvedProjectId}`])
                .order('published_at', { ascending: false });

              if (!error && data && data.length > 0) {
                const posts = data.map(d => ({
                  id: d.id,
                  projectId: resolvedProjectId,
                  title: d.title,
                  slug: d.slug,
                  content: d.content,
                  excerpt: d.excerpt,
                  featuredImage: d.featured_image,
                  status: d.status,
                  author: d.author,
                  seoTitle: d.seo_title,
                  seoDescription: d.seo_description,
                  publishedAt: d.published_at,
                  createdAt: d.created_at,
                  updatedAt: d.updated_at
                } as any));
                console.log('[PublicWebsitePreview] ✅ Loaded CMS posts from Supabase (SSR fallback):', posts.length, posts.map((p: any) => p.slug));
                setCmsPosts(posts);
              } else {
                console.log('[PublicWebsitePreview] ⚠️ No CMS posts found in Supabase either');
              }
            } catch (e) {
              console.log('[PublicWebsitePreview] Error loading posts from Supabase:', e);
            }
          }

          // Don't return here! We want to check for updates in Supabase (Instant Publish)
          // The SSR data might be stale if a post was just published
        }

        // ========== NON-SSR / REFRESH PATH ==========
        // Fetch project doc and CMS posts in PARALLEL to minimize load time

        // STEP 1: Try Supabase published_data, then draft data for editor previews.
        if (!projectData && resolvedProjectId) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const canLoadDraftData = isEditorPreviewRoute && Boolean(sessionData.session);
            const projectSelect = canLoadDraftData
              ? 'id, tenant_id, user_id, name, published_data, data'
              : 'id, tenant_id, user_id, name, published_data';
            const projectResult = await supabase
              .from('projects')
              .select(projectSelect)
              .eq('id', resolvedProjectId)
              .maybeSingle();
            const projectRow = projectResult.data as any;
            const postsResult = projectRow?.tenant_id
              ? await supabase
                  .from('posts')
                  .select('*')
                  .eq('tenant_id', projectRow.tenant_id)
                  .eq('status', 'published')
                  .contains('tags', [`project:${resolvedProjectId}`])
                  .order('published_at', { ascending: false })
              : { data: [], error: null };

            if (!projectResult.error && projectResult.data) {
              const row = projectResult.data as any;
              const sourceData = canLoadDraftData ? (row.data || row.published_data) : row.published_data;
              const rawData = sourceData?.data && typeof sourceData.data === 'object'
                ? { ...sourceData, ...sourceData.data }
                : sourceData;

              if (rawData) {
                projectData = {
                  id: resolvedProjectId,
                  tenantId: row.tenant_id,
                  userId: row.user_id,
                  name: row.name || rawData.name,
                  ...rawData,
                } as Project;
                projectData = replaceBrokenSupabaseStorageUrls(projectData);
                console.log('[PublicWebsitePreview] ✅ Loaded from Supabase:', {
                  source: rawData === row.data ? 'data' : 'published_data',
                  hasCategories: !!rawData?.categories,
                  categoriesCount: rawData?.categories?.length || 0,
                });
              }
            }

            if (!postsResult.error && postsResult.data && postsResult.data.length > 0) {
              const posts = postsResult.data.map(d => ({
                  id: d.id,
                  projectId: resolvedProjectId,
                  title: d.title,
                  slug: d.slug,
                  content: d.content,
                  excerpt: d.excerpt,
                  featuredImage: d.featured_image,
                  status: d.status,
                  author: d.author,
                  seoTitle: d.seo_title,
                  seoDescription: d.seo_description,
                  publishedAt: d.published_at,
                  createdAt: d.created_at,
                  updatedAt: d.updated_at
                } as any));
              setCmsPosts(posts);
            }
          } catch (publicErr) {
            console.log('[PublicWebsitePreview] Could not load from Supabase:', publicErr);
          }
        }

        if (projectData) {
          setProject(projectData);

          // Fire-and-forget: tenant branding check (non-blocking)
          const tenantId = (projectData as any).tenantId;
          const ownerUserId = projectData.userId || userId;
          const brandingQuery = tenantId && UUID_RE.test(tenantId)
            ? supabase.from('tenants').select('branding').eq('id', tenantId).maybeSingle()
            : ownerUserId && UUID_RE.test(ownerUserId)
              ? supabase.from('tenants').select('branding').eq('owner_user_id', ownerUserId).maybeSingle()
              : null;

          if (brandingQuery) {
            void Promise.resolve(brandingQuery).then(({ data, error }) => {
              if (!error && data) {
                const branding = (data as any).branding;
                if (branding?.companyName || branding?.logoUrl) {
                  setHasWhiteLabelBranding(true);
                }
              }
            }).catch(() => { });
          }

          // Load menus from project data
          if (projectData.menus && Array.isArray(projectData.menus)) {
            setMenus(projectData.menus);
          } else {
            setMenus([]);
          }

          // Load categories from project data
          if ((projectData as any).categories && Array.isArray((projectData as any).categories) && (projectData as any).categories.length > 0) {
            console.log('[PublicWebsitePreview] ✅ Loaded categories from project data:', (projectData as any).categories.length);
            setCategories((projectData as any).categories);
          } else {
            setCategories([]);
          }
        } else {
          setError('Project not found');
        }
      } catch (err) {
        console.error('[PublicWebsitePreview] Error loading project:', err);
        setError('Failed to load project. Make sure the URL is correct.');
      } finally {
        window.scrollTo(0, 0);
        setLoading(false);
      }
    };

    loadProject();
  }, [propProjectId, propUserId]);

  const getRealtyListingsRouteData = useCallback((): RealtyListingsSectionData => (
    ((project?.data as any)?.realEstateListings || {}) as RealtyListingsSectionData
  ), [project?.data]);

  // Handle routing for articles, store and sections
  // Supports both real paths (/tienda, /blog/slug) and anchor scrolling (/#features)
  useEffect(() => {
    const handleNavigation = async () => {
      // Strip preview base path to get the logical route for matching
      const path = getLogicalPath(window.location.pathname);
      const hash = window.location.hash;
      const decodedHash = decodeURIComponent(hash);

      // NOTE: We don't reset views here anymore - each route handler is responsible
      // for resetting only the views it doesn't need. This prevents the issue where
      // posts aren't loaded yet but the reset already clears activePost.

      // ========================================
      // REAL PATH ROUTING (Shopify/Wix style)
      // ========================================

      // Blog article routing: /blog/slug
      if (path.startsWith('/blog/') && path !== '/blog/') {
        // Blog category routing: /blog/categoria/slug OR /blog/category/slug
        if (path.startsWith('/blog/categoria/') || path.startsWith('/blog/category/')) {
          const slug = path.replace('/blog/categoria/', '').replace('/blog/category/', '').replace(/\/$/, '');
          console.log('[PublicWebsitePreview] handleNavigation - Blog category:', slug);
          setStoreView({ type: 'none' });
          setActivePage(null);
          setActivePost(null);
          setActiveCategorySlug(slug);
          window.scrollTo(0, 0);
          return;
        }

        const slug = path.replace('/blog/', '').replace(/\/$/, '');
        console.log('[PublicWebsitePreview] handleNavigation - Looking for blog post:', slug);

        // 1. Check if already active
        if (activePost?.slug === slug) {
          return;
        }

        // 2. Try to find in pre-loaded list
        const post = cmsPosts.find(p => p.slug === slug);

        if (post) {
          console.log('[PublicWebsitePreview] Found blog post in loaded list:', post.title);
          setStoreView({ type: 'none' });
          setActivePage(null);
          setActivePost(post);
          window.scrollTo(0, 0);
        } else if (project?.id) {
          // 3. Fallback: Fetch specific post from Supabase (Fail-safe)
          // This handles cases where the post exists but wasn't in the initial batch or cmsPosts hasn't loaded properly
          console.log('[PublicWebsitePreview] Post not in loaded list, fetching directly from Supabase...');
          setLoadingPost(true);

          try {
            const { data: postRow, error: postError } = await supabase
              .from('posts')
              .select('*')
              .eq('slug', slug)
              .eq('status', 'published')
              .contains('tags', [`project:${project.id}`])
              .maybeSingle();

            if (!postError && postRow) {
              const fetchedPost = {
                id: postRow.id,
                projectId: project.id,
                title: postRow.title,
                slug: postRow.slug,
                content: postRow.content,
                excerpt: postRow.excerpt,
                featuredImage: postRow.featured_image,
                status: postRow.status,
                author: postRow.author,
                seoTitle: postRow.seo_title,
                seoDescription: postRow.seo_description,
                publishedAt: postRow.published_at,
                createdAt: postRow.created_at,
                updatedAt: postRow.updated_at,
              } as CMSPost;
              console.log('[PublicWebsitePreview] ✅ Successfully fetched post directly:', fetchedPost.title);
              setStoreView({ type: 'none' });
              setActivePage(null);
              setActivePost(fetchedPost);
              window.scrollTo(0, 0);
            } else {
              console.warn('[PublicWebsitePreview] Post not found in Supabase either for slug:', slug, postError);
            }
          } catch (err) {
            console.error('[PublicWebsitePreview] Error fetching post directly from Supabase:', err);
          } finally {
            setLoadingPost(false);
          }
        } else {
          console.log('[PublicWebsitePreview] Waiting for project to load before fetching post...');
        }
        return;
      }

      // Store catalog routing: /tienda/productos
      if (path === '/tienda/productos' || path === '/tienda/productos/' || path === '/tienda/catalogo' || path === '/tienda/catalogo/') {
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'products' });
        window.scrollTo(0, 0);
        return;
      }

      // Store routing: /tienda
      if (path === '/tienda' || path === '/tienda/') {
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'store' });
        window.scrollTo(0, 0);
        return;
      }

      // Store category routing: /tienda/categoria/slug
      if (path.startsWith('/tienda/categoria/')) {
        const slug = path.replace('/tienda/categoria/', '').replace(/\/$/, '');
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'category', slug });
        window.scrollTo(0, 0);
        return;
      }

      // Store product routing: /tienda/producto/slug
      if (path.startsWith('/tienda/producto/')) {
        const slug = path.replace('/tienda/producto/', '').replace(/\/$/, '');
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'product', slug });
        window.scrollTo(0, 0);
        return;
      }

      // ========================================
      // LEGACY HASH ROUTING (backward compatibility)
      // ========================================

      // Article routing: #article:slug (legacy)
      if (decodedHash.includes('#article:')) {
        const slug = decodedHash.split('#article:')[1].trim();
        const post = cmsPosts.find(p => p.slug === slug);
        if (post) {
          setStoreView({ type: 'none' });
          setActivePage(null);
          setActivePost(post);
          window.scrollTo(0, 0);
        }
        return;
      }

      // Blog category routing: #blog/categoria/slug OR #blog/category/slug
      if (decodedHash.includes('#blog/categoria/') || decodedHash.includes('#blog/category/')) {
        const slug = decodedHash
          .split('#blog/categoria/').pop()!
          .split('#blog/category/').pop()!
          .replace(/\/$/, '')
          .trim();
        console.log('[PublicWebsitePreview] Hash category routing:', slug);
        setStoreView({ type: 'none' });
        setActivePage(null);
        setActivePost(null);
        setActiveCategorySlug(slug);
        window.scrollTo(0, 0);
        return;
      }

      // Blog article routing via hash: #blog/slug
      if (decodedHash.startsWith('#blog/') && !decodedHash.startsWith('#blog/categoria/') && !decodedHash.startsWith('#blog/category/')) {
        const slug = decodedHash.replace('#blog/', '').replace(/\/$/, '').trim();
        const post = cmsPosts.find(p => p.slug === slug);
        if (post) {
          setStoreView({ type: 'none' });
          setActivePage(null);
          setActivePost(post);
          window.scrollTo(0, 0);
        }
        return;
      }

      // Store routing: #store (legacy)
      if (decodedHash === '#store' || decodedHash.endsWith('#store')) {
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'store' });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash === '#store/products' || decodedHash.endsWith('#store/products') || decodedHash === '#store/catalog' || decodedHash.endsWith('#store/catalog')) {
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'products' });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash.includes('#store/category/')) {
        const slug = decodedHash.split('#store/category/')[1];
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'category', slug });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash.includes('#store/product/')) {
        const slug = decodedHash.split('#store/product/')[1];
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'product', slug });
        window.scrollTo(0, 0);
        return;
      }

      const realtyRouteData = getRealtyListingsRouteData();
      const realtyDetailSlug = matchRealtyDetailRoute(path, realtyRouteData);
      if (realtyDetailSlug) {
        const detailPath = resolveRealtyDetailPath(realtyRouteData, realtyDetailSlug);
        const now = new Date().toISOString();
        setActivePost(null);
        setStoreView({ type: 'none' });
        setActiveCategorySlug(null);
        setActivePage({
          id: `page-property-detail-${realtyDetailSlug}`,
          title: 'Property Detail',
          slug: detailPath,
          type: 'static',
          sections: ['header', 'propertyDetail', 'footer'],
          sectionData: {
            realEstateListings: realtyRouteData,
          },
          seo: { title: 'Property Detail' },
          showInNavigation: false,
          createdAt: now,
          updatedAt: now,
        } as SitePage);
        window.scrollTo(0, 0);
        return;
      }

      if (matchRealtyDirectoryRoute(path, realtyRouteData)) {
        const directoryRoute = resolveRealtyDirectoryRoute(realtyRouteData);
        const now = new Date().toISOString();
        setActivePost(null);
        setStoreView({ type: 'none' });
        setActivePage({
          id: 'page-real-estate-listings-runtime',
          title: 'Listados',
          slug: directoryRoute,
          type: 'static',
          sections: ['header', 'propertyDirectory', 'footer'],
          sectionData: {
            realEstateListings: realtyRouteData,
          },
          seo: { title: 'Listados', description: 'Explora propiedades disponibles' },
          showInNavigation: true,
          navigationOrder: 25,
          createdAt: now,
          updatedAt: now,
        } as SitePage);
        window.scrollTo(0, 0);
        return;
      }

      // ========================================
      // MULTI-PAGE ROUTING (pages from project.pages)
      // ========================================
      if (project?.pages && project.pages.length > 0) {
        const pathSlug = path.replace(/^\//, '').replace(/\/$/, '');
        const matchedPage = project.pages.find(p => {
          const pageSlug = (p.slug || '').replace(/^\//, '').replace(/\/$/, '');
          return pageSlug === pathSlug && !p.isHomePage;
        });
        if (matchedPage) {
          console.log('[PublicWebsitePreview] handleNavigation - Found page:', matchedPage.title, matchedPage.slug);
          setActivePost(null);
          setStoreView({ type: 'none' });
          setActivePage(matchedPage);
          window.scrollTo(0, 0);
          return;
        }
      }

      // ========================================
      // ANCHOR SCROLL (/#section format)
      // ========================================
      if (hash.length > 1 && !hash.includes('#preview/')) {
        setTimeout(() => {
          const id = hash.substring(1);
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }

      // ========================================
      // ROOT PATH - Show home page
      // ========================================
      if (path === '/' || path === '') {
        setActivePost(null);
        setStoreView({ type: 'none' });
        setActivePage(null);
      }
    };

    handleNavigation();
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [cmsPosts, project, getLogicalPath, getRealtyListingsRouteData]);

  // Universal navigation handler for Header links
  const handleLinkNavigation = useCallback(async (href: string) => {
    console.log('[PublicWebsitePreview] handleLinkNavigation called with:', href);

    // Guard against undefined/null href
    if (!href) {
      console.warn('[PublicWebsitePreview] handleLinkNavigation called with empty href');
      return;
    }

    // Don't reset views immediately - wait until we know where we're going
    // This prevents flashing the home page while fetching data

    // Home page
    if (href === '/' || href === '') {
      console.log('[PublicWebsitePreview] Navigating to home');
      setActivePost(null);
      setStoreView({ type: 'none' });
      setActivePage(null);
      setActiveCategorySlug(null);
      updateBrowserUrl('/');
      updatePageSEO({ title: undefined, path: '/' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Anchor scroll (/#section or #section)
    if (href.startsWith('/#') || (href.startsWith('#') && !href.startsWith('#article:') && !href.startsWith('#store'))) {
      const id = href.replace('/#', '').replace('#', '');
      console.log('[PublicWebsitePreview] Scrolling to anchor:', id);

      // Must clear active views so home sections are rendered before scrolling
      const needsViewReset = activePost !== null || activePage !== null || storeView.type !== 'none';
      if (needsViewReset) {
        setActivePost(null);
        setStoreView({ type: 'none' });
        setActivePage(null);
        setActiveCategorySlug(null);
      }

      // Wait for menu close transition (300ms) + DOM re-render before scrolling
      setTimeout(() => {
        const element = document.getElementById(id);
        console.log('[PublicWebsitePreview] Element found:', !!element, element?.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          console.warn('[PublicWebsitePreview] Element not found for id:', id);
        }
      }, needsViewReset ? 350 : 100);
      return;
    }

    // Blog category: /blog/categoria/slug OR /blog/category/slug
    if (href.startsWith('/blog/categoria/') || href.startsWith('/blog/category/')) {
      const slug = href.replace('/blog/categoria/', '').replace('/blog/category/', '').replace(/\/$/, '');
      console.log('[PublicWebsitePreview] Navigating to blog category:', slug, '| Available categories:', categories.length, categories.map(c => c.slug));
      setStoreView({ type: 'none' });
      setActivePage(null);
      setActivePost(null);
      setActiveCategorySlug(slug);
      updateBrowserUrl(`/blog/categoria/${slug}`);
      updatePageSEO({ title: `Category: ${slug}`, type: 'website', path: `/blog/categoria/${slug}` });
      window.scrollTo(0, 0);
      return;
    }

    // Blog article: /blog/slug
    if (href.startsWith('/blog/')) {
      const slug = href.replace('/blog/', '').replace(/\/$/, '');
      console.log('[PublicWebsitePreview] Looking for blog post:', slug);

      const post = cmsPosts.find(p => p.slug === slug);
      if (post) {
        console.log('[PublicWebsitePreview] Found blog post:', post.title);
        setStoreView({ type: 'none' });
        setActivePage(null);
        setActiveCategorySlug(null);
        setActivePost(post);
        updateBrowserUrl(`/blog/${slug}`);
        updatePageSEO({ title: post.title, description: post.excerpt, image: post.featuredImage, type: 'article', path: `/blog/${slug}` });
        window.scrollTo(0, 0);
      } else if (project?.id) {
        console.log('[PublicWebsitePreview] Post not in loaded list, fetching directly...');
        setLoadingPost(true);
        try {
          const { data: postRow, error: postError } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .contains('tags', [`project:${project.id}`])
            .maybeSingle();

          if (!postError && postRow) {
            const fetchedPost = {
              id: postRow.id,
              projectId: project.id,
              title: postRow.title,
              slug: postRow.slug,
              content: postRow.content,
              excerpt: postRow.excerpt,
              featuredImage: postRow.featured_image,
              status: postRow.status,
              author: postRow.author,
              seoTitle: postRow.seo_title,
              seoDescription: postRow.seo_description,
              publishedAt: postRow.published_at,
              createdAt: postRow.created_at,
              updatedAt: postRow.updated_at,
            } as CMSPost;
            setStoreView({ type: 'none' });
            setActivePage(null);
            setActiveCategorySlug(null);
            setActivePost(fetchedPost);
            updateBrowserUrl(`/blog/${slug}`);
            updatePageSEO({ title: fetchedPost.title, description: fetchedPost.excerpt, image: fetchedPost.featuredImage, type: 'article', path: `/blog/${slug}` });
            window.scrollTo(0, 0);
          } else {
            console.warn('[PublicWebsitePreview] Blog post not found directly for slug:', slug, postError);
          }
        } catch (e) {
          console.error('[PublicWebsitePreview] Error fetching direct post from Supabase:', e);
        } finally {
          setLoadingPost(false);
        }
      } else {
        console.warn('[PublicWebsitePreview] Blog post not found and no project ID available');
      }
      return;
    }

    // Store: /tienda
    if (href === '/tienda/productos' || href === '/tienda/productos/' || href === '/tienda/catalogo' || href === '/tienda/catalogo/') {
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'products' });
      updateBrowserUrl('/tienda/productos');
      updatePageSEO({ title: 'Todos los productos', type: 'website', path: '/tienda/productos' });
      window.scrollTo(0, 0);
      return;
    }

    if (href === '/tienda' || href === '/tienda/') {
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'store' });
      updateBrowserUrl('/tienda');
      updatePageSEO({ title: 'Tienda', type: 'website', path: '/tienda' });
      window.scrollTo(0, 0);
      return;
    }

    // Store category: /tienda/categoria/slug
    if (href.startsWith('/tienda/categoria/')) {
      const slug = href.replace('/tienda/categoria/', '').replace(/\/$/, '');
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'category', slug });
      updateBrowserUrl(`/tienda/categoria/${slug}`);
      updatePageSEO({ title: `Categoría: ${slug}`, type: 'website', path: `/tienda/categoria/${slug}` });
      window.scrollTo(0, 0);
      return;
    }

    // Store product: /tienda/producto/slug
    if (href.startsWith('/tienda/producto/')) {
      const slug = href.replace('/tienda/producto/', '').replace(/\/$/, '');
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'product', slug });
      updateBrowserUrl(`/tienda/producto/${slug}`);
      updatePageSEO({ title: slug, type: 'product', path: `/tienda/producto/${slug}` });
      window.scrollTo(0, 0);
      return;
    }

    // Legacy hash support
    if (href.startsWith('#article:')) {
      const slug = href.replace('#article:', '').trim();
      const post = cmsPosts.find(p => p.slug === slug);
      if (post) {
        setStoreView({ type: 'none' });
        setActivePage(null);
        setActivePost(post);
        window.scrollTo(0, 0);
      }
      return;
    }

    if (href === '#store') {
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'store' });
      window.scrollTo(0, 0);
      return;
    }

    if (href === '#store/products' || href === '#store/catalog') {
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'products' });
      window.scrollTo(0, 0);
      return;
    }

    if (href.startsWith('#store/category/')) {
      const slug = href.replace('#store/category/', '');
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'category', slug });
      window.scrollTo(0, 0);
      return;
    }

    if (href.startsWith('#store/product/')) {
      const slug = href.replace('#store/product/', '');
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'product', slug });
      window.scrollTo(0, 0);
      return;
    }

    const realtyRouteData = getRealtyListingsRouteData();
    const realtyDetailSlug = matchRealtyDetailRoute(href, realtyRouteData);
    if (realtyDetailSlug) {
      const detailPath = resolveRealtyDetailPath(realtyRouteData, realtyDetailSlug);
      const now = new Date().toISOString();
      const runtimePage: SitePage = {
        id: `page-property-detail-${realtyDetailSlug}`,
        title: 'Property Detail',
        slug: detailPath,
        type: 'static',
        sections: ['header', 'propertyDetail', 'footer'],
        sectionData: {
          realEstateListings: realtyRouteData as any,
        },
        seo: { title: 'Property Detail' },
        showInNavigation: false,
        createdAt: now,
        updatedAt: now,
      };
      setActivePost(null);
      setStoreView({ type: 'none' });
      setActiveCategorySlug(null);
      setActivePage(runtimePage);
      updateBrowserUrl(detailPath);
      updatePageSEO({ title: 'Property Detail', type: 'website', path: detailPath });
      window.scrollTo(0, 0);
      return;
    }

    if (matchRealtyDirectoryRoute(href, realtyRouteData)) {
      const directoryRoute = resolveRealtyDirectoryRoute(realtyRouteData);
      const now = new Date().toISOString();
      const runtimePage: SitePage = {
        id: 'page-real-estate-listings-runtime',
        title: 'Listados',
        slug: directoryRoute,
        type: 'static',
        sections: ['header', 'propertyDirectory', 'footer'],
        sectionData: {
          realEstateListings: realtyRouteData as any,
        },
        seo: { title: 'Listados', description: 'Explora propiedades disponibles' },
        showInNavigation: true,
        navigationOrder: 25,
        createdAt: now,
        updatedAt: now,
      };
      setActivePost(null);
      setStoreView({ type: 'none' });
      setActivePage(runtimePage);
      updateBrowserUrl(directoryRoute);
      updatePageSEO({ title: 'Listados', description: 'Explora propiedades disponibles', type: 'website', path: directoryRoute });
      window.scrollTo(0, 0);
      return;
    }

    // External URLs - check if they match current domain
    if (href.startsWith('http://') || href.startsWith('https://')) {
      const currentOrigin = window.location.origin;
      if (href.startsWith(currentOrigin)) {
        // It's an internal link, strip the origin and treat as relative path
        const relativePath = href.replace(currentOrigin, '');
        console.log('[PublicWebsitePreview] Treating absolute URL as internal:', relativePath);
        // Recursively call handleLinkNavigation with relative path
        handleLinkNavigation(relativePath);
        return;
      }

      window.open(href, '_blank');
      return;
    }

    // Multi-page navigation: Check if href matches a page slug
    const slug = href.replace(/^\//, '').replace(/\/$/, '');
    if (project?.pages && project.pages.length > 0) {
      const matchedPage = project.pages.find(p => {
        const pageSlug = (p.slug || '').replace(/^\//, '').replace(/\/$/, '');
        return pageSlug === slug;
      });
      if (matchedPage) {
        console.log('[PublicWebsitePreview] Navigating to page:', matchedPage.title, matchedPage.slug);
        setActivePost(null);
        setStoreView({ type: 'none' });
        setActivePage(matchedPage);
        const pagePath = matchedPage.slug?.startsWith('/') ? matchedPage.slug : `/${matchedPage.slug}`;
        updateBrowserUrl(pagePath);
        updatePageSEO({ title: matchedPage.seo?.title || matchedPage.title, description: matchedPage.seo?.description, type: 'website', path: pagePath });
        window.scrollTo(0, 0);
        return;
      }
    }

    // Fallback: try to scroll to element by ID (for anchor navigation like #features)
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn('[PublicWebsitePreview] No page or element found for href:', href);
    }
  }, [cmsPosts, project, activePost, activePage, storeView, getRealtyListingsRouteData, updateBrowserUrl, updatePageSEO]);

  const handleEcommerceNavigate = useCallback((href: string) => {
    const storefrontHref = resolveWebsiteStorefrontHref(href) || href;
    handleLinkNavigation(storefrontHref);
  }, [handleLinkNavigation]);

  const handlePreviewClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

    const href = anchor.getAttribute('href') || '';
    const storefrontHref = resolveWebsiteStorefrontHref(href);
    if (!storefrontHref) return;

    event.preventDefault();
    handleLinkNavigation(storefrontHref);
  }, [handleLinkNavigation]);

  // Inject font CSS variables AND load Google Fonts dynamically
  useEffect(() => {
    if (project?.theme) {
      const root = document.documentElement;
      const resolvedHeader = resolveFontFamily(project.theme.fontFamilyHeader);
      const resolvedBody = resolveFontFamily(project.theme.fontFamilyBody);
      const resolvedButton = resolveFontFamily(project.theme.fontFamilyButton);

      const headerFont = fontStacks[resolvedHeader];
      const bodyFont = fontStacks[resolvedBody];
      const buttonFont = fontStacks[resolvedButton];

      root.style.setProperty('--font-header', headerFont);
      root.style.setProperty('--font-body', bodyFont);
      root.style.setProperty('--font-button', buttonFont);

      // Font weight & style variables
      root.style.setProperty('--font-weight-header', String(project.theme.fontWeightHeader ?? 700));
      root.style.setProperty('--font-weight-body', String(project.theme.fontWeightBody ?? 400));
      root.style.setProperty('--font-weight-button', String(project.theme.fontWeightButton ?? 600));
      root.style.setProperty('--font-style-header', project.theme.fontStyleHeader ?? 'normal');
      root.style.setProperty('--font-style-body', project.theme.fontStyleBody ?? 'normal');
      root.style.setProperty('--font-style-button', project.theme.fontStyleButton ?? 'normal');

      // All Caps variables
      root.style.setProperty('--headings-transform', project.theme.headingsAllCaps ? 'uppercase' : 'none');
      root.style.setProperty('--headings-spacing', project.theme.headingsAllCaps ? '0.05em' : 'normal');
      root.style.setProperty('--buttons-transform', project.theme.buttonsAllCaps ? 'uppercase' : 'none');
      root.style.setProperty('--buttons-spacing', project.theme.buttonsAllCaps ? '0.05em' : 'normal');
      root.style.setProperty('--navlinks-transform', project.theme.navLinksAllCaps ? 'uppercase' : 'none');
      root.style.setProperty('--navlinks-spacing', project.theme.navLinksAllCaps ? '0.05em' : 'normal');

      // Dynamic Google Fonts loading — uses resolved font keys
      const fontsToLoad = [...new Set([resolvedHeader, resolvedBody, resolvedButton])];
      if (fontsToLoad.length > 0) {
        const googleFontsUrl = getGoogleFontsUrl(fontsToLoad);
        
        const linkId = 'preview-google-fonts';
        let link = document.getElementById(linkId) as HTMLLinkElement;
        if (link) {
          link.href = googleFontsUrl;
        } else {
          link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = googleFontsUrl;
          document.head.appendChild(link);
        }
      }
    }
  }, [project?.theme]);

  // Apply SEO meta tags from project configuration
  useEffect(() => {
    if (!project) return;

    // Access seoConfig from project - it's stored directly on the project object
    const seoConfig = project.seoConfig as SEOConfig | undefined;
    const projectName = project.name;
    const heroData = project.data?.hero;

    console.log('[PublicWebsitePreview] Applying SEO config:', {
      hasSeoConfig: !!seoConfig,
      seoTitle: seoConfig?.title,
      projectName,
      heroHeadline: heroData?.headline
    });

    // Helper to create or update meta tag
    const toMetaText = (value: unknown): string => {
      if (value === undefined || value === null) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && !Array.isArray(value)) {
        return resolveI18nField(value as Record<string, string>, currentLanguage);
      }
      return String(value);
    };

    const setMetaTag = (selector: string, content: unknown, attribute: 'name' | 'property' = 'name') => {
      const safeContent = toMetaText(content);
      if (!safeContent) return;
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, selector.replace(`[${attribute}="`, '').replace('"]', ''));
        document.head.appendChild(element);
      }
      element.content = safeContent;
    };

    // Helper to set link tag
    const setLinkTag = (rel: string, href: string) => {
      if (!href) return;
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!element) {
        element = document.createElement('link');
        element.rel = rel;
        document.head.appendChild(element);
      }
      element.href = href;
    };

    // Helper to strip HTML tags from text
    const stripHtml = (html: unknown): string => {
      const safeHtml = toMetaText(html);
      if (!safeHtml) return '';
      return safeHtml.replace(/<[^>]*>/g, '').trim();
    };

    // Set document title - prefer seoConfig.title, then projectName, then hero headline
    const rawTitle = seoConfig?.title || projectName || stripHtml(heroData?.headline) || 'Website';
    const title = stripHtml(rawTitle);
    document.title = title;
    console.log('[PublicWebsitePreview] Document title set to:', title);

    // Basic SEO
    const description = stripHtml(seoConfig?.description || heroData?.subheadline || '');
    setMetaTag('[name="description"]', description);

    if (seoConfig?.keywords?.length) {
      setMetaTag('[name="keywords"]', seoConfig.keywords.join(', '));
    }
    if (seoConfig?.author) {
      setMetaTag('[name="author"]', seoConfig.author);
    }
    if (seoConfig?.robots) {
      setMetaTag('[name="robots"]', seoConfig.robots);
    }
    if (seoConfig?.language) {
      document.documentElement.lang = seoConfig.language;
    }

    // Open Graph
    setMetaTag('[property="og:type"]', seoConfig?.ogType || 'website', 'property');
    setMetaTag('[property="og:title"]', seoConfig?.ogTitle || title, 'property');
    setMetaTag('[property="og:description"]', seoConfig?.ogDescription || description, 'property');
    if (seoConfig?.ogImage || heroData?.imageUrl) {
      setMetaTag('[property="og:image"]', seoConfig?.ogImage || heroData?.imageUrl, 'property');
    }
    if (seoConfig?.ogSiteName) {
      setMetaTag('[property="og:site_name"]', seoConfig.ogSiteName, 'property');
    }
    setMetaTag('[property="og:url"]', window.location.href, 'property');

    // Twitter Card
    setMetaTag('[name="twitter:card"]', seoConfig?.twitterCard || 'summary_large_image');
    setMetaTag('[name="twitter:title"]', seoConfig?.twitterTitle || title);
    setMetaTag('[name="twitter:description"]', seoConfig?.twitterDescription || description);
    if (seoConfig?.twitterImage || heroData?.imageUrl) {
      setMetaTag('[name="twitter:image"]', seoConfig?.twitterImage || heroData?.imageUrl);
    }
    if (seoConfig?.twitterSite) {
      setMetaTag('[name="twitter:site"]', seoConfig.twitterSite);
    }
    if (seoConfig?.twitterCreator) {
      setMetaTag('[name="twitter:creator"]', seoConfig.twitterCreator);
    }

    // Site Verification
    if (seoConfig?.googleSiteVerification) {
      setMetaTag('[name="google-site-verification"]', seoConfig.googleSiteVerification);
    }
    if (seoConfig?.bingVerification) {
      setMetaTag('[name="msvalidate.01"]', seoConfig.bingVerification);
    }

    // Canonical URL
    if (seoConfig?.canonical) {
      setLinkTag('canonical', seoConfig.canonical);
    }

    // Favicon
    if (seoConfig?.favicon) {
      setLinkTag('icon', seoConfig.favicon);
      setLinkTag('shortcut icon', seoConfig.favicon);
      setLinkTag('apple-touch-icon', seoConfig.favicon);
    }

    // AI Bot Optimization
    if (seoConfig?.aiCrawlable) {
      setMetaTag('[name="ai:crawlable"]', 'true');
      if (seoConfig.aiDescription) {
        setMetaTag('[name="ai:description"]', seoConfig.aiDescription);
      }
      if (seoConfig.aiKeyTopics?.length) {
        setMetaTag('[name="ai:topics"]', seoConfig.aiKeyTopics.join(', '));
      }
    }

    // Structured Data (Schema.org JSON-LD)
    if (seoConfig?.schemaType) {
      let scriptElement = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }

      const schemaMarkup = {
        '@context': 'https://schema.org',
        '@type': seoConfig.schemaType,
        name: title,
        description: description,
        url: window.location.href,
        ...(seoConfig.schemaData || {}),
        ...(seoConfig.ogImage ? { image: seoConfig.ogImage } : {}),
      };
      scriptElement.textContent = JSON.stringify(schemaMarkup);
    }

    console.log('[PublicWebsitePreview] SEO meta tags applied:', { title, description, seoConfig: !!seoConfig });
  }, [project]);

  // Navigation handlers - MUST be before any conditional returns to avoid React hooks error #310
  // Note: Using propUserId/propProjectId directly to avoid stale closure issues with getIdsFromURL
  const handleBackToHome = useCallback(() => {
    // Navigate back to the preview base or root
    const homePath = previewBasePath || '/';
    if (window.location.pathname !== homePath) {
      window.history.pushState(null, '', homePath);
    }
    window.location.hash = '';
    setActivePost(null);
    setStoreView({ type: 'none' });
    setActivePage(null);
    setActiveCategorySlug(null);
  }, [previewBasePath]);

  const handleNavigateToStore = useCallback(() => {
    window.location.hash = 'store';
  }, []);

  const handleNavigateToCategory = useCallback((categorySlug: string) => {
    window.location.hash = `store/category/${categorySlug}`;
  }, []);

  const handleNavigateToProduct = useCallback((productSlug: string) => {
    window.location.hash = `store/product/${productSlug}`;
  }, []);

  // Check if project uses multi-page architecture
  const useMultiPageArchitecture = project?.pages && project.pages.length > 0;

  // Only fetch real estate properties if the project actually uses real estate sections
  const hasRealEstateSections = project?.componentOrder?.some((s: string) => 
    s === 'realEstateListings' || s === 'propertyDetail' || s === 'propertyDirectory'
  ) || false;
  const realEstateProjectId = hasRealEstateSections ? (project?.id || propProjectId || null) : null;

  const { properties: chatbotRealEstateProperties } = usePublicRealtyListings(realEstateProjectId, {
    limitCount: 50,
    featuredOnly: false,
    realtime: false,
  });

  const currentPropertyForChatbot = useMemo<RealtyProperty | null>(() => {
    const currentPath = getLogicalPath(window.location.pathname);
    const slug = matchRealtyDetailRoute(currentPath, getRealtyListingsRouteData());
    if (!slug) return null;
    return chatbotRealEstateProperties.find(property => property.slug === slug) || null;
  }, [activePage?.slug, chatbotRealEstateProperties, getLogicalPath, getRealtyListingsRouteData]);
  const activePageHasBookingSurface = useMemo(
    () => Boolean(activePage?.sections?.includes('appointmentBooking')),
    [activePage],
  );
  const websiteChatbotEngineContext = useMemo(() => {
    const route = typeof window !== 'undefined' ? getLogicalPath(window.location.pathname) : undefined;
    const isRealtyProperty = Boolean(currentPropertyForChatbot);
    const isBookingPage = !isRealtyProperty && activePageHasBookingSurface && Boolean(activePage);
    const entityType = isRealtyProperty
      ? 'realty_property'
      : isBookingPage
        ? 'booking_page'
      : activePage
        ? 'site_page'
        : activePost
          ? 'blog_post'
          : activeCategorySlug
            ? 'blog_category'
            : 'website';

    return buildChatbotEngineSurfaceContext({
      sourceSurface: isRealtyProperty ? 'realty_property_page' : isBookingPage ? 'booking_page' : 'website',
      sourceModule: isRealtyProperty ? 'real-estate' : isBookingPage ? 'appointments' : 'website-builder',
      route,
      entityType,
      entityId: currentPropertyForChatbot?.id || activePage?.id || activePost?.id || project?.id || storeProjectId || undefined,
      entitySlug: currentPropertyForChatbot?.slug || activePage?.slug || activePost?.slug || activeCategorySlug || undefined,
      contextKeys: [
        'website',
        isRealtyProperty ? 'realty_property_page' : '',
        isBookingPage ? 'booking_page' : '',
        isBookingPage ? 'appointments' : '',
        activePage ? 'site_page' : '',
        activePost ? 'blog_post' : '',
        activeCategorySlug ? 'blog_category' : '',
      ].filter(Boolean),
      metadata: {
        projectId: project?.id || storeProjectId,
        activePageSlug: activePage?.slug,
        activePostSlug: activePost?.slug,
        activeCategorySlug,
        activePageHasBookingSurface: isBookingPage,
        propertyId: currentPropertyForChatbot?.id,
        propertySlug: currentPropertyForChatbot?.slug,
        propertyTitle: currentPropertyForChatbot?.title,
      },
    });
  }, [
    activePageHasBookingSurface,
    activeCategorySlug,
    activePage,
    activePost,
    currentPropertyForChatbot,
    getLogicalPath,
    project?.id,
    storeProjectId,
  ]);

  // Loading state — invisible placeholder, SSR skeleton already provides the visual loading
  if (loading) {
    const bgColor = getBootBackgroundColor();
    return (
      <div aria-hidden="true" style={{ minHeight: '100vh', background: bgColor }} />
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Preview Not Available</h1>
          <p className="text-slate-400 mb-6">{error || 'The requested project could not be loaded.'}</p>
          <p className="text-slate-500 text-sm">
            URL format: <code className="bg-slate-800 px-2 py-1 rounded text-yellow-400">#preview/userId/projectId</code>
          </p>
        </div>
      </div>
    );
  }

  // Extract data from project
  const { data, theme, componentOrder: rawComponentOrder, sectionVisibility, componentStatus, componentStyles } = project;

  // Deduplicate componentOrder to prevent duplicate sections (e.g., 'team' appearing multiple times)
  const componentOrder = rawComponentOrder?.filter((s: string, i: number, arr: string[]) => arr.indexOf(s) === i);

  // Debug: Log component order and ecommerce data availability
  console.log('[PublicWebsitePreview] Project loaded:', {
    name: project.name,
    componentOrder,
    sectionVisibility,
    hasEcommerceData: {
      featuredProducts: !!data?.featuredProducts,
      categoryGrid: !!data?.categoryGrid,
      productHero: !!data?.productHero,
      trustBadges: !!data?.trustBadges,
    },
    heroCTALinks: {
      primaryCtaLink: data?.hero?.primaryCtaLink,
      primaryCtaLinkType: data?.hero?.primaryCtaLinkType,
      secondaryCtaLink: data?.hero?.secondaryCtaLink,
      secondaryCtaLinkType: data?.hero?.secondaryCtaLinkType,
    }
  });

  const pageBackgroundColor = theme?.pageBackground
    || theme?.globalColors?.background
    || data?.hero?.colors?.background
    || '#0f172a';

  // Helper to merge component data with styles and derive missing colors from palette
  const mergeComponentData = (componentKey: keyof typeof componentStyles | string) => {
    let componentData = (data as any)?.[componentKey];
    const projectStyles = (componentStyles as any)?.[componentKey];
    const defaultStyles = (defaultComponentStyles as any)[componentKey];
    const defaults = (initialData.data as any)[componentKey] || {};
    
    // Fall back to default styles if project styles are missing
    const styles = projectStyles || defaultStyles;

    // If the user hasn't supplied data, fall back to global defaults
    if (!componentData || Object.keys(componentData).length === 0) {
        componentData = defaults;
    }

    if (!componentData && !styles) return undefined;
    if (!componentData && styles) return resolveI18nSectionData(styles as any, currentLanguage) as any;
    if (!styles) return resolveI18nSectionData(componentData, currentLanguage);

    // First merge the colors
    const mergedColors = {
      ...styles?.colors,
      ...componentData?.colors
    };

    // Derive any missing colors from the template palette
    const derivedColors = deriveColorsFromPalette(mergedColors, componentKey as string);

    // Merge cornerGradient if it exists
    const mergedCornerGradient = styles?.cornerGradient ? {
      ...styles.cornerGradient,
      ...componentData?.cornerGradient,
    } : componentData?.cornerGradient;

    const mergedResult = {
      paddingY: 'lg',
      paddingX: 'sm',
      ...styles,
      ...componentData,
      colors: derivedColors,
      ...(mergedCornerGradient && { cornerGradient: mergedCornerGradient }),
    };

    // Resolve all i18n {es, en} objects to strings for the current language
    return resolveI18nSectionData(mergedResult, currentLanguage);
  };

  // Merged data for all components
  const mergedData = {
    hero: mergeComponentData('hero'),
    heroSplit: mergeComponentData('heroSplit'),
    heroGallery: mergeComponentData('heroGallery'),
    heroWave: mergeComponentData('heroWave'),
    heroNova: mergeComponentData('heroNova'),
    heroLead: mergeComponentData('heroLead'),
    features: mergeComponentData('features'),
    testimonials: mergeComponentData('testimonials'),
    slideshow: mergeComponentData('slideshow'),
    pricing: mergeComponentData('pricing'),
    faq: mergeComponentData('faq'),
    leads: mergeComponentData('leads'),
    newsletter: mergeComponentData('newsletter'),
    cta: mergeComponentData('cta'),
    portfolio: mergeComponentData('portfolio'),
    services: mergeComponentData('services'),
    team: mergeComponentData('team'),
    video: mergeComponentData('video'),
    howItWorks: mergeComponentData('howItWorks'),
    map: mergeComponentData('map'),
    menu: mergeComponentData('menu'),
    restaurantReservation: mergeComponentData('restaurantReservation'),
    banner: mergeComponentData('banner'),
    topBar: mergeComponentData('topBar'),
    logoBanner: mergeComponentData('logoBanner'),
    cmsFeed: mergeComponentData('cmsFeed'),
    signupFloat: mergeComponentData('signupFloat'),
    realEstateListings: mergeComponentData('realEstateListings'),
    footer: mergeComponentData('footer'),
    header: mergeComponentData('header'),
    products: mergeComponentData('products'),
    separator1: mergeComponentData('separator1'),
    separator2: mergeComponentData('separator2'),
    separator3: mergeComponentData('separator3'),
    separator4: mergeComponentData('separator4'),
    separator5: mergeComponentData('separator5'),
    // Lumina sections
    heroLumina: mergeComponentData('heroLumina'),
    heroNeon: mergeComponentData('heroNeon'),
    testimonialsNeon: mergeComponentData('testimonialsNeon'),
    featuresNeon: mergeComponentData('featuresNeon'),
    ctaNeon: mergeComponentData('ctaNeon'),
    portfolioNeon: mergeComponentData('portfolioNeon'),
    pricingNeon: mergeComponentData('pricingNeon'),
    faqNeon: mergeComponentData('faqNeon'),
    featuresLumina: mergeComponentData('featuresLumina'),
    ctaLumina: mergeComponentData('ctaLumina'),
    portfolioLumina: mergeComponentData('portfolioLumina'),
    pricingLumina: mergeComponentData('pricingLumina'),
    testimonialsLumina: mergeComponentData('testimonialsLumina'),
    faqLumina: mergeComponentData('faqLumina'),

    // Ecommerce section components
    featuredProducts: mergeComponentData('featuredProducts'),
    categoryGrid: mergeComponentData('categoryGrid'),
    productHero: mergeComponentData('productHero'),
    saleCountdown: mergeComponentData('saleCountdown'),
    trustBadges: mergeComponentData('trustBadges'),
    recentlyViewed: mergeComponentData('recentlyViewed'),
    productReviews: mergeComponentData('productReviews'),
    collectionBanner: mergeComponentData('collectionBanner'),
    productBundle: mergeComponentData('productBundle'),
    announcementBar: mergeComponentData('announcementBar'),
  };

  // Get projectId for store components - use the loaded project's ID
  // This works correctly for both preview URLs and custom domains
  const storeProjectId = project?.id || propProjectId || getIdsFromURL().projectId;
  const storeUserId = project?.userId || propUserId || getIdsFromURL().userId;

  /**
   * Verifica si un componente de ecommerce debe mostrarse en el landing page público
   * PublicWebsitePreview siempre muestra en contexto 'landing'
   */
  const isEcommerceComponentVisibleInLanding = (componentKey: PageSection): boolean => {
    const ecommerceDataMap: Record<string, { visibleIn?: 'landing' | 'store' | 'both' } | undefined> = {
      featuredProducts: mergedData.featuredProducts,
      categoryGrid: mergedData.categoryGrid,
      productHero: mergedData.productHero,
      saleCountdown: mergedData.saleCountdown,
      trustBadges: mergedData.trustBadges,
      recentlyViewed: mergedData.recentlyViewed,
      productReviews: mergedData.productReviews,
      collectionBanner: mergedData.collectionBanner,
      productBundle: mergedData.productBundle,
      announcementBar: mergedData.announcementBar,
    };

    const componentData = ecommerceDataMap[componentKey];
    if (!componentData) return true; // Si no es un componente de ecommerce, mostrar siempre

    const visibleIn = componentData.visibleIn || 'both'; // Por defecto 'both'

    return visibleIn === 'both' || visibleIn === 'landing';
  };

  // Resolve header links - prioritize: CMS Menu (by ID or main-menu) > Pages > Manual Links
  // CRITICAL: Use menus from state OR directly from project (for SSR hydration timing)
  const effectiveMenus = menus.length > 0 ? menus : (project?.menus || []);

  const headerLinks = (() => {
    // 0. Explicit manual override
    if (mergedData.header?.menuId === 'manual') {
      return mergedData.header?.links || [];
    }

    // 1. CMS Menu by ID takes priority if configured
    if (mergedData.header?.menuId) {
      const menu = effectiveMenus.find((m: Menu) => m.id === mergedData.header?.menuId);
      if (menu && menu.items?.length > 0) {
        console.log('[PublicWebsitePreview] HeaderLinks from CMS Menu by ID:', menu.id, menu.items.map((i: any) => ({ text: i.text, href: i.href, icon: i.icon })));
        return menu.items.map((i: any) => ({ text: i.text, href: i.href, icon: i.icon }));
      }
    }

    // 2. Try main-menu from CMS menus (IMPORTANT: This is what the web editor uses!)
    const mainMenu = effectiveMenus.find((m: Menu) => m.id === 'main' || m.handle === 'main-menu');
    if (mainMenu && mainMenu.items?.length > 0) {
      console.log('[PublicWebsitePreview] HeaderLinks from main-menu:', mainMenu.items.map((i: any) => ({ text: i.text, href: i.href, icon: i.icon })));
      return mainMenu.items.map((i: any) => ({ text: i.text, href: i.href, icon: i.icon }));
    }

    // 3. Generate from pages if available (multi-page architecture)
    if (project?.pages && project.pages.length > 0) {
      const navPages = project.pages
        .filter((p: SitePage) => p.showInNavigation)
        .sort((a: SitePage, b: SitePage) => (a.navigationOrder || 0) - (b.navigationOrder || 0));

      if (navPages.length > 0) {
        const links = navPages.map((p: SitePage) => ({
          text: p.title,
          // Use / for home page, real paths for other pages
          href: p.isHomePage ? '/' : `/${(p.slug || '').replace(/^\//, '')}`,
        }));
        console.log('[PublicWebsitePreview] HeaderLinks from pages:', links);
        return links;
      }
    }

    // 4. Fall back to manual links
    console.log('[PublicWebsitePreview] HeaderLinks from manual links:', mergedData.header?.links);
    return mergedData.header?.links || [];
  })();

  // Resolve footer columns from menus (using effectiveMenus for SSR hydration timing)
  const resolvedFooterData: FooterData = {
    ...mergedData.footer,
    // Auto-hide "Made with Quimera" badge when White Label branding is active
    hideBranding: mergedData.footer?.hideBranding || hasWhiteLabelBranding,
    linkColumns: mergedData.footer?.linkColumns?.map((col: any) => {
      if (col.menuId) {
        const menu = effectiveMenus.find((m: Menu) => m.id === col.menuId);
        if (menu) {
          return { ...col, links: menu.items.map((i: any) => ({ text: i.text, href: i.href })) };
        }
      }
      return col;
    }) || []
  };

  // Render component based on key, wrapped with SectionBackground for background images
  const renderComponent = (key: PageSection) => {
    if (key === 'propertyDirectory') {
      return (
        <PropertyDirectoryPage
          projectId={storeProjectId || ''}
          data={mergedData.realEstateListings}
          theme={theme}
          globalColors={theme?.globalColors as Record<string, string> | undefined}
          isPreviewMode={isEditorPreviewRoute}
          onNavigate={handleLinkNavigation}
        />
      );
    }

    if (key === 'propertyDetail') {
      const currentPath = getLogicalPath(window.location.pathname);
      const realtyData = mergedData.realEstateListings as RealtyListingsSectionData | undefined;
      const propertySlug = matchRealtyDetailRoute(currentPath, realtyData) || '';
      return (
        <PropertyDetailSection
          projectId={storeProjectId || ''}
          ownerId={project?.userId || undefined}
          propertySlug={propertySlug}
          data={realtyData}
          theme={theme}
          globalColors={theme?.globalColors as Record<string, string> | undefined}
          onNavigateToListings={() => handleLinkNavigation(resolveRealtyDirectoryRoute(realtyData))}
          onNavigateToProperty={(slug) => handleLinkNavigation(resolveRealtyDetailPath(realtyData, slug))}
        />
      );
    }

    const compData = mergedData[key as keyof typeof mergedData];
    if (!compData) return null;

    const borderRadius = theme?.cardBorderRadius || 'md';
    const buttonBorderRadius = theme?.buttonBorderRadius || 'md';

    // Helper to wrap any section with SectionBackground
    const withBackground = (element: React.ReactNode) => (
      <SectionBackground
        backgroundImageUrl={compData.backgroundImageUrl}
        backgroundOverlayEnabled={compData.backgroundOverlayEnabled}
        backgroundOverlayOpacity={compData.backgroundOverlayOpacity}
        backgroundOverlayColor={compData.backgroundOverlayColor}
        backgroundColor={compData.colors?.background}
        backgroundPosition={compData.backgroundPosition}
        backgroundBlurEnabled={compData.backgroundBlurEnabled}
        backgroundBlurAmount={compData.backgroundBlurAmount}
        backgroundBlurColor={compData.backgroundBlurColor}
        glassEffect={compData.glassEffect}
      >
        {element}
      </SectionBackground>
    );

    switch (key) {
      case 'hero':
        {
          const hbr = compData.buttonBorderRadius || buttonBorderRadius;
          if (compData.heroVariant === 'modern') return withBackground(<HeroModern {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />);
          if (compData.heroVariant === 'gradient') return withBackground(<HeroGradient {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />);
          if (compData.heroVariant === 'fitness') return withBackground(<HeroFitness {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />);

          return withBackground(<Hero {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />);
        }
      case 'heroSplit':
        return withBackground(<HeroSplit {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} onNavigate={handleLinkNavigation} />);
      case 'heroGallery':
        return compData ? withBackground(<HeroGallery {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} onNavigate={handleLinkNavigation} />) : null;
      case 'heroWave':
        return compData ? withBackground(<HeroWave {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} onNavigate={handleLinkNavigation} />) : null;
      case 'heroNova':
        return compData ? withBackground(<HeroNova {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} onNavigate={handleLinkNavigation} />) : null;
      case 'heroLead':
        return compData ? withBackground(<HeroLead {...compData} cardBorderRadius={compData.cardBorderRadius || borderRadius} inputBorderRadius={compData.inputBorderRadius || 'md'} buttonBorderRadius={compData.buttonBorderRadius || buttonBorderRadius} />) : null;
      case 'features':
        return withBackground(<Features {...compData} borderRadius={borderRadius} onNavigate={handleLinkNavigation} />);
      case 'testimonials':
        return withBackground(<Testimonials {...compData} borderRadius={compData.borderRadius || borderRadius} cardShadow={compData.cardShadow} borderStyle={compData.borderStyle} cardPadding={compData.cardPadding} testimonialsVariant={compData.testimonialsVariant} />);
      case 'slideshow':
        return withBackground(<Slideshow {...compData} borderRadius={borderRadius} />);
      case 'pricing':
        return withBackground(<Pricing {...compData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />);
      case 'faq':
        return withBackground(<Faq {...compData} borderRadius={borderRadius} />);
      case 'leads':
        return withBackground(
          <Leads
            {...compData}
            cardBorderRadius={compData.cardBorderRadius || borderRadius}
            inputBorderRadius={compData.inputBorderRadius || 'md'}
            buttonBorderRadius={compData.buttonBorderRadius || buttonBorderRadius}
            projectId={storeProjectId || undefined}
            ownerId={project?.userId || undefined}
          />
        );
      case 'appointmentBooking': {
        const bookingContext = buildChatbotEngineSurfaceContext({
          sourceSurface: 'booking_page',
          sourceModule: 'appointments',
          route: typeof window !== 'undefined' ? getLogicalPath(window.location.pathname) : undefined,
          entityType: 'booking_page',
          entityId: storeProjectId || project?.id || undefined,
          contextKeys: ['website', 'booking_page', 'appointments'],
          metadata: {
            projectId: storeProjectId || project?.id,
            ownerId: project?.userId,
            activePageId: activePage?.id,
            activePageSlug: activePage?.slug,
            sourceComponent: 'WebsiteAppointmentBookingSection',
          },
        });
        return withBackground(
          <AppointmentBooking
            {...compData}
            cardBorderRadius={compData.cardBorderRadius || borderRadius}
            inputBorderRadius={compData.inputBorderRadius || 'md'}
            buttonBorderRadius={compData.buttonBorderRadius || buttonBorderRadius}
            projectId={storeProjectId || undefined}
            ownerId={project?.userId || undefined}
            sourceComponent="WebsiteAppointmentBookingSection"
            sourceModule="appointments"
            sourceSurface="booking_page"
            chatbotEngineContext={bookingContext}
          />
        );
      }
      case 'realEstateListings':
        return withBackground(
          <RealEstateListingsSection
            data={compData}
            projectId={storeProjectId || null}
            isPreviewMode={isEditorPreviewRoute}
            theme={theme}
            globalColors={theme?.globalColors as Record<string, string> | undefined}
            onNavigate={handleLinkNavigation}
          />
        );
      case 'newsletter':
        return withBackground(<Newsletter {...compData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />);
      case 'cta':
        return withBackground(<CTASection {...compData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} onNavigate={handleLinkNavigation} />);
      case 'portfolio':
        return withBackground(<Portfolio {...compData} borderRadius={borderRadius} onNavigate={handleLinkNavigation} />);
      case 'services':
        return withBackground(<Services {...compData} borderRadius={borderRadius} />);
      case 'team':
        return withBackground(<Team {...compData} borderRadius={borderRadius} onNavigate={handleLinkNavigation} />);
      case 'video':
        return withBackground(<Video {...compData} borderRadius={borderRadius} />);
      case 'howItWorks':
        return withBackground(<HowItWorks {...compData} borderRadius={borderRadius} />);
      case 'map':
        return withBackground(<BusinessMap {...compData} apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''} borderRadius={borderRadius} />);
      case 'menu':
        return withBackground(<MenuComponent {...compData} borderRadius={borderRadius} dataSource={compData?.dataSource} restaurantId={compData?.restaurantId} />);
      case 'banner':
        return withBackground(<Banner {...compData} buttonBorderRadius={buttonBorderRadius} />);
      case 'topBar':
        return compData ? <TopBar {...compData} onNavigate={handleLinkNavigation} /> : null;
      case 'logoBanner':
        return compData ? <LogoBanner {...compData} onNavigate={handleLinkNavigation} /> : null;
      case 'products':
        return withBackground(<Products {...compData} primaryColor={compData?.colors?.accent || theme?.globalColors?.primary || '#4f46e5'} />);
      
      // Lumina sections
      case 'heroLumina':
        return compData ? withBackground(<HeroLumina {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} onNavigate={handleLinkNavigation} />) : null;
      case 'heroNeon':
        return compData ? withBackground(<HeroNeon {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} onNavigate={handleLinkNavigation} />) : null;
      case 'testimonialsNeon':
        return compData ? withBackground(<TestimonialsNeon {...compData} />) : null;
      case 'featuresNeon':
        return compData ? withBackground(<FeaturesNeon {...compData} />) : null;
      case 'ctaNeon':
        return compData ? withBackground(<CtaNeon {...compData} />) : null;
      case 'portfolioNeon':
        return compData ? withBackground(<PortfolioNeon {...compData} />) : null;
      case 'pricingNeon':
        return compData ? withBackground(<PricingNeon {...compData} />) : null;
      case 'faqNeon':
        return compData ? withBackground(<FaqNeon {...compData} />) : null;
      case 'featuresLumina':
        return compData ? withBackground(<FeaturesLumina {...compData} borderRadius={compData.borderRadius || borderRadius} onNavigate={handleLinkNavigation} />) : null;
      case 'ctaLumina':
        return compData ? withBackground(<CtaLumina {...compData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} onNavigate={handleLinkNavigation} />) : null;
      case 'portfolioLumina':
        return compData ? withBackground(<PortfolioLumina {...compData} borderRadius={borderRadius} onNavigate={handleLinkNavigation} />) : null;
      case 'pricingLumina':
        return compData ? withBackground(<PricingLumina {...compData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />) : null;
      case 'testimonialsLumina':
        return compData ? withBackground(<TestimonialsLumina {...compData} borderRadius={compData.borderRadius || borderRadius} />) : null;
      case 'faqLumina':
        return compData ? withBackground(<FaqLumina {...compData} borderRadius={borderRadius} />) : null;



      // Ecommerce section components
      case 'featuredProducts':
        return compData ? withBackground(
          <FeaturedProducts
            data={compData}
            storeId={storeProjectId || undefined}
            globalColors={theme?.globalColors}
            onProductClick={(slug) => handleEcommerceNavigate(`/tienda/producto/${slug}`)}
            onViewAllProducts={() => handleLinkNavigation('/tienda/productos')}
          />
        ) : null;
      case 'categoryGrid':
        return compData ? withBackground(
          <CategoryGrid
            data={compData}
            storeId={storeProjectId || undefined}
            globalColors={theme?.globalColors}
            onCategoryClick={(slug) => handleEcommerceNavigate(`/tienda/categoria/${slug}`)}
          />
        ) : null;
      case 'productHero':
        return compData ? withBackground(
          <ProductHero
            data={compData}
            storeId={storeProjectId || undefined}
            globalColors={theme?.globalColors}
            onProductClick={(slug) => handleEcommerceNavigate(`/tienda/producto/${slug}`)}
            onCollectionClick={(slug) => handleEcommerceNavigate(`/tienda/categoria/${slug}`)}
            onNavigate={handleEcommerceNavigate}
          />
        ) : null;
      case 'saleCountdown':
        return compData ? withBackground(
          <SaleCountdown
            data={compData}
            storeId={storeProjectId || undefined}
            globalColors={theme?.globalColors}
            onProductClick={(slug) => handleEcommerceNavigate(`/tienda/producto/${slug}`)}
            onNavigate={handleEcommerceNavigate}
          />
        ) : null;
      case 'trustBadges':
        return compData ? withBackground(<TrustBadges data={compData} storeId={storeProjectId || undefined} globalColors={theme?.globalColors} />) : null;
      case 'recentlyViewed':
        return compData ? withBackground(
          <RecentlyViewed
            data={compData}
            storeId={storeProjectId || undefined}
            globalColors={theme?.globalColors}
            onProductClick={(slug) => handleEcommerceNavigate(`/tienda/producto/${slug}`)}
          />
        ) : null;
      case 'productReviews':
        return compData ? withBackground(<ProductReviews data={compData} storeId={storeProjectId || undefined} globalColors={theme?.globalColors} />) : null;
      case 'collectionBanner':
        return compData ? withBackground(
          <CollectionBanner
            data={compData}
            storeId={storeProjectId || undefined}
            globalColors={theme?.globalColors}
            onCollectionClick={(slug) => handleEcommerceNavigate(`/tienda/categoria/${slug}`)}
            onNavigate={handleEcommerceNavigate}
          />
        ) : null;
      case 'productBundle':
        return compData ? withBackground(
          <ProductBundle
            data={compData}
            storeId={storeProjectId || undefined}
            globalColors={theme?.globalColors}
            onProductClick={(slug) => handleEcommerceNavigate(`/tienda/producto/${slug}`)}
            onNavigate={handleEcommerceNavigate}
          />
        ) : null;
      case 'announcementBar':
        return compData ? <AnnouncementBar data={compData} storeId={storeProjectId || undefined} globalColors={theme?.globalColors} onNavigate={handleEcommerceNavigate} /> : null;
      case 'separator1':
      case 'separator2':
      case 'separator3':
      case 'separator4':
      case 'separator5':
        return compData ? <Separator data={compData} /> : null;
      case 'restaurantReservation': {
        const resData = (mergedData as any).restaurantReservation;
        return resData ? withBackground(
          <RestaurantReservationComponent
            data={resData}
            borderRadius={borderRadius}
            buttonBorderRadius={buttonBorderRadius}
          />
        ) : null;
      }
      default:
        return null;
    }
  };

  // Check if we're showing a store view
  const isStoreViewActive = storeView.type !== 'none';
  const isRealEstateRuntimePage = Boolean(activePage?.sections?.includes('propertyDetail') || activePage?.sections?.includes('propertyDirectory'));
  const fallbackChatbotConfig: AiAssistantConfig = {
    // Fallback for legacy chatbot configuration
    isActive: true,
    agentName: 'Assistant',
    tone: 'Professional',
    languages: 'Spanish',
    businessProfile: '',
    productsServices: '',
    policiesContact: '',
    specialInstructions: '',
    faqs: [],
    knowledgeDocuments: [],
    knowledgeLinks: [],
    widgetColor: project.data?.chatbot?.colors?.primary || '#4f46e5',
    leadCaptureEnabled: true,
    enableLiveVoice: false,
    voiceName: 'Zephyr',
    appearance: {
      branding: {
        logoType: 'none',
        logoSize: 'md',
        showBotAvatar: true,
        showUserAvatar: false,
        userAvatarStyle: 'initials'
      },
      colors: {
        primaryColor: project.data?.chatbot?.colors?.primary || '#4f46e5',
        secondaryColor: project.data?.chatbot?.colors?.secondaryColor || '#6366f1',
        accentColor: project.data?.chatbot?.colors?.accentColor || '#22c55e',
        userBubbleColor: project.data?.chatbot?.colors?.primary || '#4f46e5',
        userTextColor: '#ffffff',
        botBubbleColor: '#f8fafc',
        botTextColor: '#0f172a',
        backgroundColor: '#ffffff',
        inputBackground: '#ffffff',
        inputBorder: '#cbd5e1',
        inputText: '#0f172a',
        headerBackground: project.data?.chatbot?.colors?.primary || '#4f46e5',
        headerText: '#ffffff'
      },
      behavior: {
        position: project.data?.chatbot?.position || 'bottom-right',
        offsetX: 20,
        offsetY: 20,
        width: 'md',
        height: 'md',
        autoOpen: false,
        autoOpenDelay: 5,
        openOnScroll: 0,
        openOnTime: 0,
        fullScreenOnMobile: true
      },
      messages: {
        welcomeMessage: project.data?.chatbot?.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte hoy?',
        welcomeMessageEnabled: true,
        welcomeDelay: 1,
        inputPlaceholder: project.data?.chatbot?.placeholderText || 'Escribe tu mensaje...',
        quickReplies: [],
        showTypingIndicator: true
      },
      button: {
        buttonStyle: 'circle',
        buttonSize: 'lg',
        buttonIcon: 'chat',
        showButtonText: false,
        pulseEffect: true,
        shadowSize: 'lg',
        showTooltip: false,
        tooltipText: 'Chat'
      },
      theme: 'light'
    }
  };
  const baseStandaloneChatbotConfig = project.aiAssistantConfig || fallbackChatbotConfig;
  const propertyChatbotContext = currentPropertyForChatbot ? [
    'Current visitor context: the user is viewing a real estate property detail page.',
    `Property title: ${currentPropertyForChatbot.title}`,
    `Price: ${currentPropertyForChatbot.price}`,
    `Address: ${[currentPropertyForChatbot.address, currentPropertyForChatbot.city, currentPropertyForChatbot.state, currentPropertyForChatbot.zipCode].filter(Boolean).join(', ')}`,
    `Type: ${currentPropertyForChatbot.propertyType}`,
    `Beds: ${currentPropertyForChatbot.bedrooms}`,
    `Baths: ${currentPropertyForChatbot.bathrooms}`,
    `Square feet: ${currentPropertyForChatbot.area}`,
    `Year built: ${currentPropertyForChatbot.yearBuilt || 'N/A'}`,
    `Amenities: ${(currentPropertyForChatbot.amenities || []).join(', ') || 'N/A'}`,
    `Description: ${currentPropertyForChatbot.description}`,
    'When asked about this property, answer using this context. For financing or investment questions, explain estimates clearly and invite the visitor to request official guidance from the realtor.',
  ].join('\n') : '';
  const enrichedStandaloneChatbotConfig = propertyChatbotContext ? {
    ...baseStandaloneChatbotConfig,
    specialInstructions: [
      (baseStandaloneChatbotConfig as any).specialInstructions,
      propertyChatbotContext,
    ].filter(Boolean).join('\n\n'),
  } : baseStandaloneChatbotConfig;

  return (
    <div
      className="min-h-screen text-slate-200 overflow-x-hidden transition-colors duration-500"
      style={{ backgroundColor: pageBackgroundColor }}
    >
      <style>{`
        :root {
          --site-base-bg: ${pageBackgroundColor};
          --site-surface-bg: ${theme?.globalColors?.surface || pageBackgroundColor};
        }
        body, .bg-site-base { background-color: ${pageBackgroundColor}; }
      `}</style>

      {/* Announcement Bar - Above Header position */}
      {componentOrder?.includes('announcementBar' as PageSection) && mergedData.announcementBar?.position === 'above-header' && componentStatus?.announcementBar !== false && sectionVisibility?.announcementBar !== false && mergedData.announcementBar && (
        <div id="announcementBar-above" className="w-full">
          <AnnouncementBar data={mergedData.announcementBar} storeId={storeProjectId || undefined} globalColors={theme?.globalColors} onNavigate={handleEcommerceNavigate} />
        </div>
      )}

      {/* TopBar - Above Header position */}
      {componentOrder?.includes('topBar' as PageSection) && mergedData.topBar?.aboveHeader && componentStatus?.topBar !== false && sectionVisibility?.topBar !== false && mergedData.topBar && (
        <Suspense fallback={null}>
          <TopBar {...mergedData.topBar} onNavigate={handleLinkNavigation} />
        </Suspense>
      )}

      {/* Header - Visible on landing, hidden on store view (StorefrontLayout handles it) */}
      {!isStoreViewActive && componentStatus?.header !== false && sectionVisibility?.header !== false && mergedData.header && (
        <Header {...mergedData.header} links={headerLinks} onNavigate={handleLinkNavigation} forceSolid={isRealEstateRuntimePage} />
      )}

      <main className="min-h-screen bg-site-base relative" onClickCapture={handlePreviewClickCapture}>
        {/* Loading Overlay for async navigation */}
        {loadingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          </div>
        )}
        {/* Store View */}
        {isStoreViewActive && storeProjectId ? (
          <StoreViewWrapper
            projectId={storeProjectId}
            storeView={storeView}
            initialData={{
              ...project, // Pass all project fields including componentOrder, sectionVisibility, etc.
              header: mergedData.header, // Context-aware header
              theme: theme, // Context-aware theme
            }}
          />
        ) : activeCategorySlug ? (
          /* Category View */
          (() => {
            // Use categories state, OR fall back to project data directly if state is empty
            const projectCategories: CMSCategory[] = categories.length > 0 
              ? categories 
              : ((project as any)?.categories && Array.isArray((project as any).categories) ? (project as any).categories : []);
            console.log('[PublicWebsitePreview] 🔍 Category render debug:', {
              activeCategorySlug,
              categoriesFromState: categories.length,
              categoriesFromProject: (project as any)?.categories?.length || 0,
              finalCategoriesCount: projectCategories.length,
              categorySlugs: projectCategories.map((c: CMSCategory) => c.slug),
              cmsPostsCount: cmsPosts.length,
            });
            const category = projectCategories.find((c: CMSCategory) => c.slug === activeCategorySlug);
            if (!category) {
              // If still loading, show spinner instead of error
              if (loading) {
                return (
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                );
              }
              console.warn('[PublicWebsitePreview] ❌ Category NOT found! Slug:', activeCategorySlug, 'Available slugs:', projectCategories.map((c: CMSCategory) => c.slug));
              return (
                <div className="flex items-center justify-center min-h-[50vh] text-white/50">
                  <p>Category not found</p>
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
                textColor={data?.hero?.colors?.text || '#ffffff'}
                accentColor={data?.hero?.colors?.primary || '#4f46e5'}
                headerStyle={mergedData?.header?.style || ''}
              />
            );
          })()
        ) : activePost ? (() => {
          /* Article View */
          const postCategory = categories.find(c => c.id === activePost.categoryId)
            || ((project as any)?.categories || []).find((c: any) => c.id === activePost.categoryId);
          return (
            <BlogPost
              post={activePost}
              theme={theme}
              onBack={handleBackToHome}
              backgroundColor={pageBackgroundColor}
              textColor={data?.hero?.colors?.text || '#ffffff'}
              accentColor={data?.hero?.colors?.primary || '#4f46e5'}
              layoutType={postCategory?.layoutType}
            />
          );
        })() : activePage ? (
          /* Multi-Page View - Render specific page using PageRenderer */
          <PageRenderer
            page={activePage}
            project={{ ...project, menus: effectiveMenus }}
            isPreview={true}
            onNavigate={handleLinkNavigation}
            contentOnly={true}
          />
        ) : (
          /* Home View - Sections */
          <>
            {componentOrder
              ?.filter(key => {
                // Lista de componentes de ecommerce que deben verificar visibilidad
                const ecommerceComponents: PageSection[] = [
                  'featuredProducts', 'categoryGrid', 'productHero', 'saleCountdown',
                  'trustBadges', 'recentlyViewed', 'productReviews', 'collectionBanner',
                  'productBundle', 'announcementBar'
                ];

                const isEcommerce = ecommerceComponents.includes(key as PageSection);
                const statusVisible = componentStatus?.[key as PageSection] !== false;
                const sectionVisible = sectionVisibility?.[key as PageSection] !== false;
                const notExcluded = key !== 'footer' && key !== 'chatbot' && key !== 'header' &&
                  // AnnouncementBar is rendered separately when positioned above header
                  !(key === 'announcementBar' && mergedData.announcementBar?.position === 'above-header') &&
                  // TopBar is rendered separately when positioned above header
                  !(key === 'topBar' && mergedData.topBar?.aboveHeader);
                const baseVisibility = statusVisible && sectionVisible && notExcluded;

                // Para componentes de ecommerce, verificar también visibleIn
                if (isEcommerce) {
                  const visibleInLanding = isEcommerceComponentVisibleInLanding(key as PageSection);
                  const finalVisibility = baseVisibility && visibleInLanding;
                  console.log(`[PublicWebsitePreview] Ecommerce component "${key}": status=${statusVisible}, section=${sectionVisible}, visibleIn=${visibleInLanding}, final=${finalVisibility}`);
                  return finalVisibility;
                }

                return baseVisibility;
              })
              .map(key => (
                <div id={key} key={key} className="w-full">
                  <Suspense fallback={null}>
                    {renderComponent(key as PageSection)}
                  </Suspense>
                </div>
              ))}
          </>
        )}
      </main>

      {/* Footer - Always visible */}
      {componentStatus?.footer !== false && sectionVisibility?.footer !== false && (
        <div id="footer" className="w-full">
          <Footer {...resolvedFooterData} onNavigate={handleLinkNavigation} />
        </div>
      )}

      {/* Chatbot Widget - rendered outside store views; StorefrontApp owns storefront/checkout chat context */}
      {!isStoreViewActive && (
        <ChatbotWidget
          isPreview={false}
          hidePoweredBy={hasWhiteLabelBranding}
          standaloneConfig={enrichedStandaloneChatbotConfig}
          standaloneProject={{
            id: project.id || storeProjectId || '',
            userId: project.userId || storeUserId || '', // Important for ChatCore to know the project owner
            name: project.name || '',
            data: project.data,
            theme: project.theme,
            componentOrder: project.componentOrder,
            sectionVisibility: project.sectionVisibility,
          }}
          chatbotEngineContext={websiteChatbotEngineContext}
        />
      )}

      {/* SignupFloat - Floating overlay rendered outside section flow */}
      {mergedData.signupFloat && componentOrder?.includes('signupFloat') && (sectionVisibility?.signupFloat !== false) && (
        <Suspense fallback={null}>
          <SignupFloat
            {...mergedData.signupFloat}
            projectId={project.id || storeProjectId || undefined}
            ownerId={project.userId || undefined}
            isPreviewMode={true}
          />
        </Suspense>
      )}

      {/* Ad Tracking Pixels (if configured in SEO settings) */}
      {project.seoConfig?.adPixels && (
        <AdPixelsInjector config={project.seoConfig.adPixels} />
      )}


    </div>
  );
};

export default PublicWebsitePreview;
