/**
 * PublicWebsitePreview Component
 * Renders a website preview independently in the browser without authentication
 * Supports URLs like: /#preview/{userId}/{projectId}
 * Supports store routing: #store, #store/category/slug, #store/product/slug
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { db, doc, getDoc, collection, getDocs, query, orderBy, where, limit } from '../firebase';
import { Project, PageData, ThemeData, PageSection, CMSPost, Menu, FooterData, FontFamily, SEOConfig, SitePage } from '../types';
import { deriveColorsFromPalette } from '../utils/colorUtils';
import { AlertTriangle } from 'lucide-react';
import AdPixelsInjector from './AdPixelsInjector';

// Import all website components
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
import ChatbotWidget from './ChatbotWidget';
import BusinessMap from './BusinessMap';
import MenuComponent from './Menu';
import Banner from './Banner';
import BlogPost from './BlogPost';
import Products from './Products';
import PageRenderer from './PageRenderer';

// Lazy load StorefrontApp for store views
const StorefrontApp = lazy(() => import('./ecommerce/StorefrontApp'));

// Separate component for store view to isolate Suspense and avoid hook count issues
interface StoreViewWrapperProps {
  projectId: string;
  storeView: StoreViewState;
  initialData?: any;
}

const StoreViewWrapper: React.FC<StoreViewWrapperProps> = ({ projectId, storeView, initialData }) => {
  const serverUrl =
    storeView.type === 'store' ? '/' :
      storeView.type === 'category' ? `/category/${(storeView as { type: 'category'; slug: string }).slug}` :
        storeView.type === 'product' ? `/product/${(storeView as { type: 'product'; slug: string }).slug}` : '/';

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        {/* Generic spinner - white-label compatible (no Quimera branding) */}
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

// Ecommerce components (usables en Landing y Ecommerce)
import {
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
} from './ecommerce';

// Store view types
type StoreViewState =
  | { type: 'none' }
  | { type: 'store' }
  | { type: 'category'; slug: string }
  | { type: 'product'; slug: string };

// Font stacks for CSS injection
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

interface PublicWebsitePreviewProps {
  projectId?: string;
  userId?: string;
}

const PublicWebsitePreview: React.FC<PublicWebsitePreviewProps> = ({ projectId: propProjectId, userId: propUserId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [activePost, setActivePost] = useState<CMSPost | null>(null);
  const [storeView, setStoreView] = useState<StoreViewState>({ type: 'none' });
  const [activePage, setActivePage] = useState<SitePage | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);

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

  // Parse URL params from pathname: /preview/userId/projectId or /preview/projectId
  // Also supports hash: #preview/userId/projectId (legacy)
  const getIdsFromURL = () => {
    // First check pathname (new format): /preview/userId/projectId or /preview/projectId
    const pathname = window.location.pathname;
    if (pathname.startsWith('/preview/')) {
      const parts = pathname.replace('/preview/', '').split('/').filter(Boolean);
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
      if (!projectId) {
        setError('Missing projectId in URL');
        setLoading(false);
        return;
      }

      try {
        let projectData: Project | null = null;

        // PRIORITY 0: Check for SSR-injected data (fastest path - no Firestore call needed)
        // This is set by the SSR server for custom domains
        const ssrData = typeof window !== 'undefined' ? (window as any).__INITIAL_DATA__ : null;

        if (ssrData?.project) {
          projectData = { id: ssrData.projectId, ...ssrData.project } as Project;

          console.log('[PublicWebsitePreview] ✅ Using SSR-injected data (no Firestore call)', {
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

          // Load CMS posts from SSR data
          // These come from entry-server.tsx as ProjectData.posts (PublicArticle[])
          // Also check for ssrData.posts which may be set directly
          const ssrPosts = ssrData.posts || (projectData as any).posts;
          if (ssrPosts && Array.isArray(ssrPosts)) {
            console.log('[PublicWebsitePreview] ✅ Loaded CMS posts from SSR data:', ssrPosts.length, ssrPosts.map((p: any) => p.slug));
            setCmsPosts(ssrPosts as CMSPost[]);
          } else {
            console.log('[PublicWebsitePreview] ⚠️ No CMS posts in SSR data, will need to load from Firestore');
            // Don't return yet - we need to load posts from publicStores
            // Continue to load posts below
          }

          setLoading(false);

          // If no posts were loaded from SSR, fetch them from publicStores
          if (!ssrPosts || ssrPosts.length === 0) {
            try {
              const publicPostsCol = collection(db, 'publicStores', ssrData.projectId, 'posts');
              const publicPostsQuery = query(publicPostsCol, orderBy('publishedAt', 'desc'));
              const publicPostsSnap = await getDocs(publicPostsQuery);

              if (!publicPostsSnap.empty) {
                const posts = publicPostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost));
                console.log('[PublicWebsitePreview] ✅ Loaded CMS posts from publicStores (SSR fallback):', posts.length, posts.map(p => p.slug));
                setCmsPosts(posts);
              } else {
                console.log('[PublicWebsitePreview] ⚠️ No CMS posts found in publicStores either');
              }
            } catch (e) {
              console.log('[PublicWebsitePreview] Error loading posts from publicStores:', e);
            }
          }

          // Don't return here! We want to check for updates in publicStores (Instant Publish)
          // The SSR data might be stale if a post was just published
        }

        // PRIORITY 1: Try publicStores first (public access, contains published data with SEO)
        // This is now also used to refresh SSR data
        try {
          const publicStoreRef = doc(db, 'publicStores', projectId);
          const publicStoreSnap = await getDoc(publicStoreRef);

          if (publicStoreSnap.exists()) {
            const rawData = publicStoreSnap.data();

            // If we already have project data from SSR, just update specific fields if needed
            // But for CMS posts, we need to query the subcollection specifically
            if (!projectData) {
              projectData = { id: publicStoreSnap.id, ...rawData } as Project;
              console.log('[PublicWebsitePreview] ✅ Loaded from publicStores', {
                hasSeoConfig: !!rawData.seoConfig,
                seoTitle: rawData.seoConfig?.title,
                seoDescription: rawData.seoConfig?.description?.substring(0, 50),
                projectName: rawData.name
              });
            }
          }
        } catch (publicErr) {
          console.log('[PublicWebsitePreview] Could not load from publicStores:', publicErr);
        }

        // ALWAYS fetch fresh CMS posts from publicStores to ensure "Instant Publish" works
        // This overrides/merges with SSR posts
        if (projectId) {
          try {
            console.log('[PublicWebsitePreview] 🔄 Checking for fresh CMS posts from publicStores...');
            const publicPostsCol = collection(db, 'publicStores', projectId, 'posts');
            // Get all published posts
            const publicPostsQuery = query(publicPostsCol, orderBy('publishedAt', 'desc'));
            const publicPostsSnap = await getDocs(publicPostsQuery);

            if (!publicPostsSnap.empty) {
              const freshPosts = publicPostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost));
              console.log('[PublicWebsitePreview] ✅ Loaded fresh CMS posts from publicStores:', freshPosts.length);

              // Update state with fresh posts
              setCmsPosts(freshPosts);
            } else {
              // Only log if we didn't have SSR posts either
              if (!cmsPosts.length) {
                console.log('[PublicWebsitePreview] ℹ️ No CMS posts found in publicStores');
              }
            }
          } catch (e) {
            console.error('[PublicWebsitePreview] Error fetching specific posts from publicStores:', e);
          }
        }

        // Return here only if we successfully loaded project data (either from SSR or publicStores)
        if (projectData) {
          setProject(projectData);
          setLoading(false);
          return;
        }
        try {
          const publicStoreRef = doc(db, 'publicStores', projectId);
          const publicStoreSnap = await getDoc(publicStoreRef);

          if (publicStoreSnap.exists()) {
            const rawData = publicStoreSnap.data();
            projectData = { id: publicStoreSnap.id, ...rawData } as Project;
            console.log('[PublicWebsitePreview] ✅ Loaded from publicStores', {
              hasSeoConfig: !!rawData.seoConfig,
              seoTitle: rawData.seoConfig?.title,
              seoDescription: rawData.seoConfig?.description?.substring(0, 50),
              projectName: rawData.name
            });
          }
        } catch (publicErr) {
          console.log('[PublicWebsitePreview] Could not load from publicStores:', publicErr);
        }

        // PRIORITY 2: Try user's projects collection (requires userId and auth)
        if (!projectData && userId) {
          try {
            const projectRef = doc(db, 'users', userId, 'projects', projectId);
            const projectSnap = await getDoc(projectRef);

            if (projectSnap.exists()) {
              const rawData = projectSnap.data();
              projectData = { id: projectSnap.id, ...rawData } as Project;
              console.log('[PublicWebsitePreview] ✅ Loaded from user collection', {
                hasSeoConfig: !!rawData.seoConfig,
                seoTitle: rawData.seoConfig?.title,
                projectName: rawData.name
              });
            }
          } catch (userProjectErr) {
            console.log('[PublicWebsitePreview] Could not load from user collection (may require auth):', userProjectErr);
          }
        }

        // PRIORITY 3: Try templates as last resort
        if (!projectData) {
          try {
            const templateRef = doc(db, 'templates', projectId);
            const templateSnap = await getDoc(templateRef);

            if (templateSnap.exists()) {
              const rawData = templateSnap.data();
              projectData = { id: templateSnap.id, ...rawData } as Project;
              console.log('[PublicWebsitePreview] ✅ Loaded from templates', {
                hasSeoConfig: !!rawData.seoConfig,
                projectName: rawData.name
              });
            }
          } catch (templateErr) {
            console.log('[PublicWebsitePreview] Could not load from templates:', templateErr);
          }
        }

        // Log if no data found
        if (!projectData) {
          console.error('[PublicWebsitePreview] ❌ Project not found in any collection:', { userId, projectId });
        }

        if (projectData) {
          setProject(projectData);

          // Load CMS posts for this project
          // First try publicStores (published), then fall back to user draft if userId available
          try {
            // Try publicStores first (published site)
            const publicPostsCol = collection(db, 'publicStores', projectId, 'posts');
            const publicPostsQuery = query(publicPostsCol, orderBy('publishedAt', 'desc'));
            const publicPostsSnap = await getDocs(publicPostsQuery);

            if (!publicPostsSnap.empty) {
              const posts = publicPostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost));
              setCmsPosts(posts);
              console.log('[PublicWebsitePreview] ✅ Loaded CMS posts from publicStores:', posts.length);
            } else if (userId) {
              // Fall back to user draft posts (for preview mode) - only if userId is available
              console.log('[PublicWebsitePreview] No posts in publicStores, trying user draft...');
              const draftPostsCol = collection(db, 'users', userId, 'projects', projectId, 'posts');
              const draftPostsQuery = query(draftPostsCol, orderBy('publishedAt', 'desc'));
              const draftPostsSnap = await getDocs(draftPostsQuery);
              const posts = draftPostsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost));
              setCmsPosts(posts);
              console.log('[PublicWebsitePreview] ✅ Loaded CMS posts from user draft:', posts.length);
            } else {
              console.log('[PublicWebsitePreview] No posts in publicStores and no userId for draft fallback');
              setCmsPosts([]);
            }
          } catch (e) {
            console.log('[PublicWebsitePreview] No CMS posts found or error loading:', e);
          }

          // Load menus from project data (menus are stored inside the project document, not as a subcollection)
          // This works for both publicStores and user project documents
          if (projectData.menus && Array.isArray(projectData.menus)) {
            console.log('[PublicWebsitePreview] ✅ Loaded menus from project data:', projectData.menus.length);
            setMenus(projectData.menus);
          } else {
            console.log('[PublicWebsitePreview] No menus found in project data');
            setMenus([]);
          }
        } else {
          setError('Project not found');
        }
      } catch (err) {
        console.error('[PublicWebsitePreview] Error loading project:', err);
        setError('Failed to load project. Make sure the URL is correct.');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [propProjectId, propUserId]);

  // Handle routing for articles, store and sections
  // Supports both real paths (/tienda, /blog/slug) and anchor scrolling (/#features)
  useEffect(() => {
    const handleNavigation = async () => {
      const path = window.location.pathname;
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
          // 3. Fallback: Fetch specific post from Firestore (Fail-safe)
          // This handles cases where the post exists but wasn't in the initial batch or cmsPosts hasn't loaded properly
          console.log('[PublicWebsitePreview] Post not in loaded list, fetching directly from Firestore...');
          setLoadingPost(true);

          try {
            // Try publicStores first (Published content)
            const publicPostsRef = collection(db, 'publicStores', project.id, 'posts');
            const q = query(publicPostsRef, where('slug', '==', slug), limit(1));
            const snap = await getDocs(q);

            if (!snap.empty) {
              const fetchedPost = { id: snap.docs[0].id, ...snap.docs[0].data() } as CMSPost;
              console.log('[PublicWebsitePreview] ✅ Successfully fetched post directly:', fetchedPost.title);
              setStoreView({ type: 'none' });
              setActivePage(null);
              setActivePost(fetchedPost);
              window.scrollTo(0, 0);
            } else {
              console.warn('[PublicWebsitePreview] Post not found in Firestore either for slug:', slug);
            }
          } catch (err) {
            console.error('[PublicWebsitePreview] Error fetching post directly:', err);
          } finally {
            setLoadingPost(false);
          }
        } else {
          console.log('[PublicWebsitePreview] Waiting for project to load before fetching post...');
        }
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

      // Store routing: #store (legacy)
      if (decodedHash === '#store' || decodedHash.endsWith('#store')) {
        setActivePost(null);
        setActivePage(null);
        setStoreView({ type: 'store' });
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
  }, [cmsPosts, project]);

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

    // Blog article: /blog/slug
    if (href.startsWith('/blog/')) {
      const slug = href.replace('/blog/', '').replace(/\/$/, '');
      console.log('[PublicWebsitePreview] Looking for blog post:', slug);

      const post = cmsPosts.find(p => p.slug === slug);
      if (post) {
        console.log('[PublicWebsitePreview] Found blog post:', post.title);
        setStoreView({ type: 'none' });
        setActivePage(null);
        setActivePost(post);
        window.scrollTo(0, 0);
      } else if (project?.id) {
        console.log('[PublicWebsitePreview] Post not in loaded list, fetching directly...');
        setLoadingPost(true);
        try {
          // Try publicStores first
          const publicPostsRef = collection(db, 'publicStores', project.id, 'posts');
          const q = query(publicPostsRef, where('slug', '==', slug), limit(1));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const fetchedPost = { id: snap.docs[0].id, ...snap.docs[0].data() } as CMSPost;
            setStoreView({ type: 'none' });
            setActivePage(null);
            setActivePost(fetchedPost);
            window.scrollTo(0, 0);
          } else {
            console.warn('[PublicWebsitePreview] Blog post not found directly for slug:', slug);
          }
        } catch (e) {
          console.error('[PublicWebsitePreview] Error fetching direct post:', e);
        } finally {
          setLoadingPost(false);
        }
      } else {
        console.warn('[PublicWebsitePreview] Blog post not found and no project ID available');
      }
      return;
    }

    // Store: /tienda
    if (href === '/tienda' || href === '/tienda/') {
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'store' });
      window.scrollTo(0, 0);
      return;
    }

    // Store category: /tienda/categoria/slug
    if (href.startsWith('/tienda/categoria/')) {
      const slug = href.replace('/tienda/categoria/', '').replace(/\/$/, '');
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'category', slug });
      window.scrollTo(0, 0);
      return;
    }

    // Store product: /tienda/producto/slug
    if (href.startsWith('/tienda/producto/')) {
      const slug = href.replace('/tienda/producto/', '').replace(/\/$/, '');
      setActivePost(null);
      setActivePage(null);
      setStoreView({ type: 'product', slug });
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
  }, [cmsPosts, project, activePost, activePage, storeView]);

  // Inject font CSS variables
  useEffect(() => {
    if (project?.theme) {
      const root = document.documentElement;
      const headerFont = fontStacks[project.theme.fontFamilyHeader] || fontStacks['roboto'];
      const bodyFont = fontStacks[project.theme.fontFamilyBody] || fontStacks['roboto'];
      const buttonFont = fontStacks[project.theme.fontFamilyButton] || fontStacks['roboto'];

      root.style.setProperty('--font-header', headerFont);
      root.style.setProperty('--font-body', bodyFont);
      root.style.setProperty('--font-button', buttonFont);

      // All Caps variables
      root.style.setProperty('--headings-transform', project.theme.headingsAllCaps ? 'uppercase' : 'none');
      root.style.setProperty('--headings-spacing', project.theme.headingsAllCaps ? '0.05em' : 'normal');
      root.style.setProperty('--buttons-transform', project.theme.buttonsAllCaps ? 'uppercase' : 'none');
      root.style.setProperty('--buttons-spacing', project.theme.buttonsAllCaps ? '0.05em' : 'normal');
      root.style.setProperty('--navlinks-transform', project.theme.navLinksAllCaps ? 'uppercase' : 'none');
      root.style.setProperty('--navlinks-spacing', project.theme.navLinksAllCaps ? '0.05em' : 'normal');
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
    const setMetaTag = (selector: string, content: string, attribute: 'name' | 'property' = 'name') => {
      if (!content) return;
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, selector.replace(`[${attribute}="`, '').replace('"]', ''));
        document.head.appendChild(element);
      }
      element.content = content;
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
    const stripHtml = (html: string): string => {
      if (!html) return '';
      return html.replace(/<[^>]*>/g, '').trim();
    };

    // Set document title - prefer seoConfig.title, then projectName, then hero headline
    const rawTitle = seoConfig?.title || projectName || stripHtml(heroData?.headline) || 'Website';
    const title = stripHtml(rawTitle);
    document.title = title;
    console.log('[PublicWebsitePreview] Document title set to:', title);

    // Basic SEO
    const description = seoConfig?.description || heroData?.subheadline || '';
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
    // For custom domains, clear hash entirely to go to home
    // For preview URLs, reconstruct the preview hash
    if (propUserId && propProjectId) {
      // Custom domain - just clear the hash
      window.location.hash = '';
    } else {
      // Preview URL - reconstruct from URL
      const pathname = window.location.pathname;
      if (pathname.startsWith('/preview/')) {
        const parts = pathname.replace('/preview/', '').split('/');
        if (parts[0] && parts[1]) {
          window.location.hash = '';
        }
      }
    }
    setActivePost(null);
    setStoreView({ type: 'none' });
    setActivePage(null);
  }, [propUserId, propProjectId]);

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

  // Loading state - Generic spinner for public preview (no Quimera branding)
  // Uses project colors if available from query params (passed by SSR server) or window config
  if (loading) {
    // Try to get colors from multiple sources:
    // 1. Query params (pc=primaryColor, bc=backgroundColor) - passed by SSR iframe
    // 2. window.__DOMAIN_CONFIG__ - injected by SSR for direct access
    // 3. Default fallback
    let primaryColor = '#ffffff';
    let backgroundColor = '#0f172a';

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryPrimary = urlParams.get('pc');
      const queryBackground = urlParams.get('bc');

      if (queryPrimary) {
        primaryColor = decodeURIComponent(queryPrimary);
      }
      if (queryBackground) {
        backgroundColor = decodeURIComponent(queryBackground);
      }

      // Fallback to window config if no query params
      const serverConfig = (window as any).__DOMAIN_CONFIG__;
      if (!queryPrimary && serverConfig?.primaryColor) {
        primaryColor = serverConfig.primaryColor;
      }
      if (!queryBackground && serverConfig?.backgroundColor) {
        backgroundColor = serverConfig.backgroundColor;
      }
    }

    const trackColor = `${primaryColor}33`; // 20% opacity

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: backgroundColor }}
      >
        <div className="text-center">
          {/* Modern circular loader with project colors */}
          <div className="relative flex items-center justify-center mb-8" style={{ width: 80, height: 80 }}>
            {/* Outer pulsing ring */}
            <div
              className="absolute w-20 h-20 rounded-full animate-pulse"
              style={{ border: `3px solid ${trackColor}` }}
            />

            {/* Middle rotating ring */}
            <div
              className="absolute w-16 h-16 rounded-full"
              style={{
                border: '3px solid transparent',
                borderTopColor: primaryColor,
                borderRightColor: trackColor,
                animation: 'spin 1s linear infinite'
              }}
            />

            {/* Inner spinning loader (reverse direction) */}
            <div
              className="absolute w-12 h-12 rounded-full"
              style={{
                border: '3px solid transparent',
                borderTopColor: primaryColor,
                animation: 'spin 0.7s linear infinite reverse'
              }}
            />

            {/* Center dot */}
            <div
              className="absolute w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: primaryColor }}
            />
          </div>

          {/* Loading text with dots animation */}
          <div
            className="flex items-center justify-center gap-1 text-sm"
            style={{ color: primaryColor, opacity: 0.8 }}
          >
            <span>Loading</span>
            <span className="flex gap-0.5">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </span>
          </div>
        </div>

        {/* CSS for spin animation */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
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
  const { data, theme, componentOrder, sectionVisibility, componentStatus, componentStyles } = project;

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
    }
  });

  const pageBackgroundColor = theme?.pageBackground
    || theme?.globalColors?.background
    || data?.hero?.colors?.background
    || '#0f172a';

  // Helper to merge component data with styles and derive missing colors from palette
  const mergeComponentData = (componentKey: keyof typeof componentStyles) => {
    const componentData = data?.[componentKey];
    const styles = componentStyles?.[componentKey];
    if (!componentData) return componentData;
    if (!styles) return componentData;

    // First merge the colors
    const mergedColors = {
      ...styles?.colors,
      ...componentData?.colors
    };

    // Derive any missing colors from the template palette
    const derivedColors = deriveColorsFromPalette(mergedColors, componentKey);

    return {
      ...styles,
      ...componentData,
      colors: derivedColors
    };
  };

  // Merged data for all components
  const mergedData = {
    hero: mergeComponentData('hero'),
    heroSplit: mergeComponentData('heroSplit'),
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
    footer: mergeComponentData('footer'),
    header: mergeComponentData('header'),
    products: mergeComponentData('products'),
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
    // 1. CMS Menu by ID takes priority if configured
    if (mergedData.header?.menuId) {
      const menu = effectiveMenus.find((m: Menu) => m.id === mergedData.header?.menuId);
      if (menu && menu.items?.length > 0) {
        console.log('[PublicWebsitePreview] HeaderLinks from CMS Menu by ID:', menu.id, menu.items.map((i: any) => ({ text: i.text, href: i.href })));
        return menu.items.map((i: any) => ({ text: i.text, href: i.href }));
      }
    }

    // 2. Try main-menu from CMS menus (IMPORTANT: This is what the web editor uses!)
    const mainMenu = effectiveMenus.find((m: Menu) => m.id === 'main' || m.handle === 'main-menu');
    if (mainMenu && mainMenu.items?.length > 0) {
      console.log('[PublicWebsitePreview] HeaderLinks from main-menu:', mainMenu.items.map((i: any) => ({ text: i.text, href: i.href })));
      return mainMenu.items.map((i: any) => ({ text: i.text, href: i.href }));
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

  // Render component based on key
  const renderComponent = (key: PageSection) => {
    const compData = mergedData[key as keyof typeof mergedData];
    if (!compData) return null;

    const borderRadius = theme?.cardBorderRadius || 'md';
    const buttonBorderRadius = theme?.buttonBorderRadius || 'md';

    switch (key) {
      case 'hero':
        {
          const hbr = compData.buttonBorderRadius || buttonBorderRadius;
          if (compData.heroVariant === 'modern') return <HeroModern {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'gradient') return <HeroGradient {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'fitness') return <HeroFitness {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'editorial') return <HeroEditorial {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'cinematic') return <HeroCinematic {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'minimal') return <HeroMinimal {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'bold') return <HeroBold {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'overlap') return <HeroOverlap {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'verticalSplit') return <HeroVerticalSplit {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'glass') return <HeroGlass {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          if (compData.heroVariant === 'stacked') return <HeroStacked {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
          return <Hero {...compData} borderRadius={hbr} onNavigate={handleLinkNavigation} />;
        }
      case 'heroSplit':
        return <HeroSplit {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} onNavigate={handleLinkNavigation} />;
      case 'features':
        return <Features {...compData} borderRadius={borderRadius} />;
      case 'testimonials':
        return <Testimonials {...compData} borderRadius={compData.borderRadius || borderRadius} cardShadow={compData.cardShadow} borderStyle={compData.borderStyle} cardPadding={compData.cardPadding} testimonialsVariant={compData.testimonialsVariant} />;
      case 'slideshow':
        return <Slideshow {...compData} borderRadius={borderRadius} />;
      case 'pricing':
        return <Pricing {...compData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;
      case 'faq':
        return <Faq {...compData} borderRadius={borderRadius} />;
      case 'leads':
        return <Leads {...compData} cardBorderRadius={compData.cardBorderRadius || borderRadius} inputBorderRadius={compData.inputBorderRadius || 'md'} buttonBorderRadius={compData.buttonBorderRadius || buttonBorderRadius} />;
      case 'newsletter':
        return <Newsletter {...compData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;
      case 'cta':
        return <CTASection {...compData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;
      case 'portfolio':
        return <Portfolio {...compData} borderRadius={borderRadius} onNavigate={handleLinkNavigation} />;
      case 'services':
        return <Services {...compData} borderRadius={borderRadius} />;
      case 'team':
        return <Team {...compData} borderRadius={borderRadius} />;
      case 'video':
        return <Video {...compData} borderRadius={borderRadius} />;
      case 'howItWorks':
        return <HowItWorks {...compData} borderRadius={borderRadius} />;
      case 'map':
        return <BusinessMap {...compData} apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''} borderRadius={borderRadius} />;
      case 'menu':
        return <MenuComponent {...compData} borderRadius={borderRadius} />;
      case 'banner':
        return <Banner {...compData} buttonBorderRadius={buttonBorderRadius} />;
      case 'products':
        return <Products {...compData} primaryColor={compData?.colors?.accent || theme?.globalColors?.primary || '#4f46e5'} />;
      // Ecommerce section components
      case 'featuredProducts':
        return compData ? (
          <FeaturedProducts
            data={compData}
            storeId={storeProjectId || undefined}
          />
        ) : null;
      case 'categoryGrid':
        return compData ? (
          <CategoryGrid
            data={compData}
            storeId={storeProjectId || undefined}
          />
        ) : null;
      case 'productHero':
        return compData ? (
          <ProductHero
            data={compData}
            storeId={storeProjectId || undefined}
          />
        ) : null;
      case 'saleCountdown':
        return compData ? (
          <SaleCountdown
            data={compData}
            storeId={storeProjectId || undefined}
          />
        ) : null;
      case 'trustBadges':
        return compData ? <TrustBadges data={compData} /> : null;
      case 'recentlyViewed':
        return compData ? (
          <RecentlyViewed
            data={compData}
            storeId={storeProjectId || undefined}
          />
        ) : null;
      case 'productReviews':
        return compData ? <ProductReviews data={compData} /> : null;
      case 'collectionBanner':
        return compData ? <CollectionBanner data={compData} /> : null;
      case 'productBundle':
        return compData ? (
          <ProductBundle
            data={compData}
            storeId={storeProjectId || undefined}
          />
        ) : null;
      case 'announcementBar':
        return compData ? <AnnouncementBar data={compData} /> : null;
      default:
        return null;
    }
  };

  // Check if we're showing a store view
  const isStoreViewActive = storeView.type !== 'none';

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
      {mergedData.announcementBar?.position === 'above-header' && componentStatus?.announcementBar !== false && sectionVisibility?.announcementBar !== false && mergedData.announcementBar && (
        <div id="announcementBar-above" className="w-full">
          <AnnouncementBar data={mergedData.announcementBar} />
        </div>
      )}

      {/* Header - Visible on landing, hidden on store view (StorefrontLayout handles it) */}
      {!isStoreViewActive && componentStatus?.header !== false && sectionVisibility?.header !== false && mergedData.header && (
        <Header {...mergedData.header} links={headerLinks} onNavigate={handleLinkNavigation} />
      )}

      <main className="min-h-screen bg-site-base relative">
        {/* Loading Overlay for async navigation */}
        {loadingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary border-t-2 border-r-2 border-transparent"></div>
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
        ) : activePost ? (
          /* Article View */
          <BlogPost
            post={activePost}
            theme={theme}
            onBack={handleBackToHome}
            backgroundColor={pageBackgroundColor}
            textColor={data?.hero?.colors?.text || '#ffffff'}
            accentColor={data?.hero?.colors?.primary || '#4f46e5'}
          />
        ) : activePage ? (
          /* Multi-Page View - Render specific page using PageRenderer */
          <PageRenderer
            page={activePage}
            project={project}
            isPreview={true}
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
                  !(key === 'announcementBar' && mergedData.announcementBar?.position === 'above-header');
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
                  {renderComponent(key as PageSection)}
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

      {/* Chatbot Widget (if enabled in project) */}
      {(project.aiAssistantConfig?.isActive || (project.data?.chatbot?.isActive)) && (
        <ChatbotWidget
          standaloneConfig={project.aiAssistantConfig || {
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
                secondaryColor: '#ffffff',
                accentColor: project.data?.chatbot?.colors?.primary || '#4f46e5',
                userBubbleColor: project.data?.chatbot?.colors?.primary || '#4f46e5',
                userTextColor: '#ffffff',
                botBubbleColor: '#f1f5f9',
                botTextColor: '#0f172a',
                backgroundColor: project.data?.chatbot?.colors?.background || '#ffffff',
                inputBackground: '#f8fafc',
                inputBorder: '#e2e8f0',
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
          }}
          standaloneProject={{
            id: project.id || storeProjectId || '',
            userId: project.userId, // Important for ChatCore to know the project owner
            name: project.name || '',
            data: project.data,
            theme: project.theme,
            componentOrder: project.componentOrder,
            sectionVisibility: project.sectionVisibility,
          }}
        />
      )}

      {/* Ad Tracking Pixels (if configured in SEO settings) */}
      {project.seoConfig?.adPixels && (
        <AdPixelsInjector config={project.seoConfig.adPixels} />
      )}


    </div>
  );
};

export default PublicWebsitePreview;
