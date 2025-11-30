/**
 * PublicWebsitePreview Component
 * Renders a website preview independently in the browser without authentication
 * Supports URLs like: /#preview/{userId}/{projectId}
 */

import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, collection, getDocs, query, orderBy } from '../firebase';
import { Project, PageData, ThemeData, PageSection, CMSPost, Menu, FooterData, FontFamily } from '../types';
import { deriveColorsFromPalette } from '../utils/colorUtils';

// Import all website components
import Header from './Header';
import Hero from './Hero';
import HeroModern from './HeroModern';
import HeroGradient from './HeroGradient';
import HeroFitness from './HeroFitness';
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
import BlogPost from './BlogPost';

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

  // Parse URL params from hash: #preview/userId/projectId
  const getIdsFromURL = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#preview/')) {
      const parts = hash.replace('#preview/', '').split('/');
      return { userId: parts[0], projectId: parts[1] };
    }
    // Also support query params: ?userId=...&projectId=...
    const params = new URLSearchParams(window.location.search);
    return {
      userId: params.get('userId') || propUserId,
      projectId: params.get('projectId') || propProjectId
    };
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
        // Try loading from user's projects collection
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        
        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;
          setProject(projectData);
          
          // Load CMS posts for this project
          try {
            const postsCol = collection(db, 'users', userId, 'projects', projectId, 'posts');
            const postsQuery = query(postsCol, orderBy('publishedAt', 'desc'));
            const postsSnap = await getDocs(postsQuery);
            const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CMSPost));
            setCmsPosts(posts);
          } catch (e) {
            console.log('No CMS posts found or error loading:', e);
          }

          // Load menus
          try {
            const menusCol = collection(db, 'users', userId, 'projects', projectId, 'menus');
            const menusSnap = await getDocs(menusCol);
            const loadedMenus = menusSnap.docs.map(d => ({ id: d.id, ...d.data() } as Menu));
            setMenus(loadedMenus);
          } catch (e) {
            console.log('No menus found or error loading:', e);
          }
        } else {
          // Try loading as public template
          const templateRef = doc(db, 'templates', projectId);
          const templateSnap = await getDoc(templateRef);
          
          if (templateSnap.exists()) {
            setProject({ id: templateSnap.id, ...templateSnap.data() } as Project);
          } else {
            setError('Project not found');
          }
        }
      } catch (err) {
        console.error('Error loading project:', err);
        setError('Failed to load project. Make sure the URL is correct.');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [propProjectId, propUserId]);

  // Handle hash routing for articles
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      // Check if navigating to an article within the preview
      if (hash.includes('#article:')) {
        const slug = hash.split('#article:')[1];
        const post = cmsPosts.find(p => p.slug === slug);
        if (post) {
          setActivePost(post);
          window.scrollTo(0, 0);
        }
      } else if (!hash.includes('#preview/')) {
        // Clear article if not in article view (but still in preview)
        setActivePost(null);
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
    }
  }, [project?.theme]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-32 h-32 rounded-full bg-yellow-400/20 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute w-24 h-24 rounded-full bg-yellow-400/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}></div>
            <div className="relative z-10 w-20 h-20 rounded-full bg-slate-800 shadow-2xl flex items-center justify-center border-2 border-yellow-400/30">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032" 
                alt="Loading" 
                className="w-14 h-14 object-contain animate-pulse"
              />
            </div>
          </div>
          <p className="text-slate-400 text-lg animate-pulse">Loading preview...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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
      case 'features':
        return <Features {...compData} borderRadius={borderRadius} />;
      case 'testimonials':
        return <Testimonials {...compData} borderRadius={compData.borderRadius || borderRadius} cardShadow={compData.cardShadow} borderStyle={compData.borderStyle} cardPadding={compData.cardPadding} />;
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
        return <BusinessMap {...compData} borderRadius={borderRadius} />;
      case 'menu':
        return <MenuComponent {...compData} borderRadius={borderRadius} />;
      default:
        return null;
    }
  };

  // Handle back to home from article
  const handleBackToHome = () => {
    const { userId, projectId } = getIdsFromURL();
    window.location.hash = `preview/${userId}/${projectId}`;
    setActivePost(null);
  };

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
        {/* Article View */}
        {activePost ? (
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
              ?.filter(key => 
                componentStatus?.[key as PageSection] !== false && 
                sectionVisibility?.[key as PageSection] !== false && 
                key !== 'footer' && 
                key !== 'chatbot' &&
                key !== 'header'
              )
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
        <ChatbotWidget standaloneConfig={project.aiAssistantConfig} />
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

