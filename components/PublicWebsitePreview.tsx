/**
 * PublicWebsitePreview Component
 * Renders a website preview independently in the browser without authentication
 * Supports URLs like: /#preview/{userId}/{projectId}
 * Supports store routing: #store, #store/category/slug, #store/product/slug
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { db, doc, getDoc, collection, getDocs, query, orderBy } from '../firebase';
import { Project, PageData, ThemeData, PageSection, CMSPost, Menu, FooterData, FontFamily, SEOConfig } from '../types';
import { deriveColorsFromPalette } from '../utils/colorUtils';
import { AlertTriangle } from 'lucide-react';
import AdPixelsInjector from './AdPixelsInjector';

// Import all website components
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
import ChatbotWidget from './ChatbotWidget';
import BusinessMap from './BusinessMap';
import MenuComponent from './Menu';
import Banner from './Banner';
import BlogPost from './BlogPost';
import Products from './Products';

// Lazy load StorefrontApp for store views
const StorefrontApp = lazy(() => import('./ecommerce/StorefrontApp'));

// Separate component for store view to isolate Suspense and avoid hook count issues
interface StoreViewWrapperProps {
  projectId: string;
  storeView: StoreViewState;
}

const StoreViewWrapper: React.FC<StoreViewWrapperProps> = ({ projectId, storeView }) => {
  const serverUrl = 
    storeView.type === 'store' ? '/' :
    storeView.type === 'category' ? `/category/${(storeView as { type: 'category'; slug: string }).slug}` :
    storeView.type === 'product' ? `/product/${(storeView as { type: 'product'; slug: string }).slug}` : '/';

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <StorefrontApp
        projectId={projectId}
        serverUrl={serverUrl}
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

  // Parse URL params from pathname: /preview/userId/projectId
  // Also supports hash: #preview/userId/projectId (legacy)
  const getIdsFromURL = () => {
    // First check pathname (new format): /preview/userId/projectId
    const pathname = window.location.pathname;
    if (pathname.startsWith('/preview/')) {
      const parts = pathname.replace('/preview/', '').split('/');
      if (parts[0] && parts[1]) {
        console.log('[PublicWebsitePreview] Parsed IDs from pathname:', { userId: parts[0], projectId: parts[1] });
        return { userId: parts[0], projectId: parts[1] };
      }
    }
    
    // Also support hash format (legacy): #preview/userId/projectId
    const hash = window.location.hash;
    if (hash.startsWith('#preview/')) {
      const parts = hash.replace('#preview/', '').split('/');
      if (parts[0] && parts[1]) {
        console.log('[PublicWebsitePreview] Parsed IDs from hash:', { userId: parts[0], projectId: parts[1] });
        return { userId: parts[0], projectId: parts[1] };
      }
    }
    
    // Fallback to query params or props: ?userId=...&projectId=...
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId') || propUserId;
    const projectId = params.get('projectId') || propProjectId;
    
    console.log('[PublicWebsitePreview] Using props/query params:', { userId, projectId });
    return { userId, projectId };
  };

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      const { userId, projectId } = getIdsFromURL();
      
      if (!userId || !projectId) {
        setError('Missing userId or projectId in URL');
        setLoading(false);
        return;
      }

      try {
        let projectData: Project | null = null;

        // PRIORITY 1: Try publicStores first (public access, contains published data with SEO)
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

        // PRIORITY 2: Try user's projects collection (requires auth)
        if (!projectData) {
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
          try {
            const postsCol = collection(db, 'users', userId, 'projects', projectId, 'posts');
            const postsQuery = query(postsCol, orderBy('publishedAt', 'desc'));
            const postsSnap = await getDocs(postsQuery);
            const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost));
            setCmsPosts(posts);
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

  // Handle hash routing for articles and store
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const decodedHash = decodeURIComponent(hash);

      // Reset views first
      setActivePost(null);
      setStoreView({ type: 'none' });

      // Article routing: #article:slug
      if (decodedHash.includes('#article:')) {
        const slug = decodedHash.split('#article:')[1];
        const post = cmsPosts.find(p => p.slug === slug);
        if (post) {
          setActivePost(post);
          window.scrollTo(0, 0);
        }
        return;
      }

      // Store routing: #store, #store/category/slug, #store/product/slug
      if (decodedHash === '#store' || decodedHash.endsWith('#store')) {
        setStoreView({ type: 'store' });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash.includes('#store/category/')) {
        const slug = decodedHash.split('#store/category/')[1];
        setStoreView({ type: 'category', slug });
        window.scrollTo(0, 0);
        return;
      }

      if (decodedHash.includes('#store/product/')) {
        const slug = decodedHash.split('#store/product/')[1];
        setStoreView({ type: 'product', slug });
        window.scrollTo(0, 0);
        return;
      }

      // Handle scrolling for section links (e.g. #features)
      if (hash.length > 1 && !hash.includes('#preview/')) {
        setTimeout(() => {
          const id = hash.substring(1);
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [cmsPosts]);

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

  // Resolve header links from menus
  const headerLinks = mergedData.header?.menuId 
    ? menus.find(m => m.id === mergedData.header?.menuId)?.items.map(i => ({ text: i.text, href: i.href })) || []
    : mergedData.header?.links || [];

  // Resolve footer columns from menus
  const resolvedFooterData: FooterData = {
    ...mergedData.footer,
    linkColumns: mergedData.footer?.linkColumns?.map((col: any) => {
      if (col.menuId) {
        const menu = menus.find(m => m.id === col.menuId);
        if (menu) {
          return { ...col, links: menu.items.map(i => ({ text: i.text, href: i.href })) };
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
        return compData.heroVariant === 'modern' 
          ? <HeroModern {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} />
          : compData.heroVariant === 'gradient'
            ? <HeroGradient {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} />
            : compData.heroVariant === 'fitness'
              ? <HeroFitness {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} />
              : <Hero {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} />;
      case 'heroSplit':
        return <HeroSplit {...compData} borderRadius={compData.buttonBorderRadius || buttonBorderRadius} />;
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
        return <Portfolio {...compData} borderRadius={borderRadius} />;
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

      {/* Header - Always visible */}
      {componentStatus?.header !== false && sectionVisibility?.header !== false && mergedData.header && (
        <Header {...mergedData.header} links={headerLinks} />
      )}
      
      <main className="min-h-screen bg-site-base relative">
        {/* Store View */}
        {isStoreViewActive && storeProjectId ? (
          <StoreViewWrapper projectId={storeProjectId} storeView={storeView} />
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
                const baseVisibility = componentStatus?.[key as PageSection] !== false && 
                                       sectionVisibility?.[key as PageSection] !== false && 
                                       key !== 'footer' && 
                                       key !== 'chatbot' &&
                                       key !== 'header';
                
                // Para componentes de ecommerce, verificar también visibleIn
                if (isEcommerce) {
                  return baseVisibility && isEcommerceComponentVisibleInLanding(key as PageSection);
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
          <Footer {...resolvedFooterData} />
        </div>
      )}
      
      {/* Chatbot Widget (if enabled in project) */}
      {project.aiAssistantConfig?.isActive && (
        <ChatbotWidget 
          standaloneConfig={project.aiAssistantConfig} 
          standaloneProject={{
            id: project.id || storeProjectId || '',
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

      {/* Powered by badge */}
      <div className="fixed bottom-4 right-4 z-40">
        <a 
          href="https://quimera.ai" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-sm rounded-full text-xs text-white/70 hover:text-white transition-colors shadow-lg"
        >
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" 
            alt="Quimera" 
            className="w-4 h-4"
          />
          <span>Made with Quimera</span>
        </a>
      </div>
    </div>
  );
};

export default PublicWebsitePreview;

