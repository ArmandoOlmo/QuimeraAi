
import React, { useEffect, useState } from 'react';
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
import BlogPost from './BlogPost';
import ChatbotWidget from './ChatbotWidget';
import { PageSection, FontFamily, CMSPost, FooterData } from '../types';
import { useEditor } from '../contexts/EditorContext';

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

const LandingPage: React.FC = () => {
  const { data, theme, componentOrder, activeSection, onSectionSelect, sectionVisibility, componentStatus, cmsPosts, isLoadingCMS, menus, customComponents } = useEditor();
  const [activePost, setActivePost] = useState<CMSPost | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Inject font variables into :root for Tailwind to use
  useEffect(() => {
    const root = document.documentElement;
    const headerFont = fontStacks[theme.fontFamilyHeader];
    const bodyFont = fontStacks[theme.fontFamilyBody];
    const buttonFont = fontStacks[theme.fontFamilyButton];
    
    root.style.setProperty('--font-header', headerFont);
    root.style.setProperty('--font-body', bodyFont);
    root.style.setProperty('--font-button', buttonFont);
    
    console.log('🎨 Fonts Applied:', {
      header: `${theme.fontFamilyHeader} → ${headerFont}`,
      body: `${theme.fontFamilyBody} → ${bodyFont}`,
      button: `${theme.fontFamilyButton} → ${buttonFont}`
    });
  }, [theme.fontFamilyHeader, theme.fontFamilyBody, theme.fontFamilyButton]);

  // Handle Hash Routing for Articles
  useEffect(() => {
      const handleHashChange = () => {
          const hash = window.location.hash;
          const decodedHash = decodeURIComponent(hash); // Handle %20 spaces

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
          } else {
              setActivePost(null);
              setIsRouting(false);
              
              // Handle scrolling for section links (e.g. #features)
              if (hash.length > 1 && !hash.startsWith('#article:')) {
                  // Allow render cycle to complete before scrolling
                  setTimeout(() => {
                      const id = hash.substring(1);
                      const element = document.getElementById(id);
                      if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                  }, 100);
              }
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
      // This triggers hashchange, which sets activePost(null)
  };
  
  // Helper function to render custom components
  const renderCustomComponent = (customComponentId: string) => {
    const customComp = customComponents.find(c => c.id === customComponentId);
    if (!customComp) return null;

    // Merge custom component styles with base data
    const baseComponentData = data[customComp.baseComponent];
    const mergedData = {
      ...baseComponentData,
      ...customComp.styles,
      colors: {
        ...baseComponentData?.colors,
        ...customComp.styles?.colors
      }
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
        return <Features {...mergedData} borderRadius={borderRadius} />;
      case 'testimonials':
        return <Testimonials {...mergedData} borderRadius={mergedData.borderRadius || borderRadius} cardShadow={mergedData.cardShadow} borderStyle={mergedData.borderStyle} cardPadding={mergedData.cardPadding} avatarBorderWidth={mergedData.avatarBorderWidth} avatarBorderColor={mergedData.avatarBorderColor} />;
      case 'slideshow':
        return <Slideshow {...mergedData} borderRadius={borderRadius} />;
      case 'pricing':
        return <Pricing {...mergedData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;
      case 'faq':
        return <Faq {...mergedData} borderRadius={borderRadius} />;
      case 'leads':
        return <Leads {...mergedData} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;
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
      default:
        return null;
    }
  };

  const componentsMap: Record<PageSection, React.ReactNode> = {
    hero: data.hero.heroVariant === 'modern' 
      ? <HeroModern {...data.hero} borderRadius={data.hero.buttonBorderRadius || theme.buttonBorderRadius} />
      : data.hero.heroVariant === 'gradient'
        ? <HeroGradient {...data.hero} borderRadius={data.hero.buttonBorderRadius || theme.buttonBorderRadius} />
        : data.hero.heroVariant === 'fitness'
          ? <HeroFitness {...data.hero} borderRadius={data.hero.buttonBorderRadius || theme.buttonBorderRadius} />
          : <Hero {...data.hero} borderRadius={data.hero.buttonBorderRadius || theme.buttonBorderRadius} />,
    features: <Features {...data.features} borderRadius={theme.cardBorderRadius} />,
    testimonials: <Testimonials {...data.testimonials} borderRadius={data.testimonials.borderRadius || theme.cardBorderRadius} cardShadow={data.testimonials.cardShadow} borderStyle={data.testimonials.borderStyle} cardPadding={data.testimonials.cardPadding} avatarBorderWidth={data.testimonials.avatarBorderWidth} avatarBorderColor={data.testimonials.avatarBorderColor} />,
    slideshow: <Slideshow {...data.slideshow} borderRadius={theme.cardBorderRadius} />,
    pricing: <Pricing {...data.pricing} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />,
    faq: <Faq {...data.faq} borderRadius={theme.cardBorderRadius} />,
    leads: <Leads {...data.leads} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />,
    newsletter: <Newsletter {...data.newsletter} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />,
    cta: <CTASection {...data.cta} cardBorderRadius={theme.cardBorderRadius} buttonBorderRadius={theme.buttonBorderRadius} />,
    portfolio: <Portfolio {...data.portfolio} borderRadius={theme.cardBorderRadius} />,
    services: <Services {...data.services} borderRadius={theme.cardBorderRadius} />,
    team: <Team {...data.team} borderRadius={theme.cardBorderRadius} />,
    video: <Video {...data.video} borderRadius={theme.cardBorderRadius} />,
    howItWorks: <HowItWorks {...data.howItWorks} borderRadius={theme.cardBorderRadius} />,
    chatbot: <ChatbotWidget />,
    footer: <Footer {...data.footer} />,
    header: null,
    typography: null,
  };
  
  // Font variables are now injected directly into :root via useEffect above
  // This ensures Tailwind's font-header, font-body, and font-button classes work correctly

  // Dynamic Menu Resolution
  const headerLinks = data.header.menuId 
    ? menus.find(m => m.id === data.header.menuId)?.items.map(i => ({ text: i.text, href: i.href })) || []
    : data.header.links;

  // Resolve Footer Columns dynamically
  const resolvedFooterData: FooterData = {
      ...data.footer,
      linkColumns: data.footer.linkColumns.map(col => {
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

  // Safe access for background color to prevent crashes if data structure is incomplete
  const pageBackgroundColor = data?.hero?.colors?.background || '#0f172a';

  return (
    <div 
        className={`text-slate-200 overflow-x-hidden transition-colors duration-500`}
        // Use inline style for background color to handle dynamic values safely
        // The `bg-[color]` utility doesn't handle undefined values gracefully in runtime CSS generation
        // Note: Removed font-body class from here - each component applies its own font class
    >
        <style>{`
            body, .bg-site-base { background-color: ${pageBackgroundColor}; }
        `}</style>

      {/* Header is always visible */}
      <Header {...data.header} links={headerLinks} />
      
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

        {/* 4. Home View (Sections) */}
        {!isArticleHash && !activePost && (
            <>
                {componentOrder
                .filter(key => componentStatus[key as PageSection] && sectionVisibility[key as PageSection] && key !== 'footer')
                .map(key => {
                    // Special handling for Chatbot: it floats, so clicking it shouldn't scroll to it usually,
                    // but for editing we wrap it. In preview it's just there.
                    if (key === 'chatbot') {
                         return (
                             <div 
                                key={key}
                                id={key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSectionSelect(key as PageSection);
                                }}
                                className={`absolute inset-0 pointer-events-none z-50 ${activeSection === key ? 'ring-4 ring-primary ring-offset-4 ring-offset-transparent' : ''}`}
                             >
                                <div className="pointer-events-auto h-full w-full">
                                     {componentsMap[key as PageSection]}
                                </div>
                             </div>
                         )
                    }

                    return (
                        <div 
                            id={key} 
                            key={key} 
                            className={`cursor-pointer transition-all duration-200 ${activeSection === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
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
      
      {/* Footer (Hide when reading article) */}
      {!activePost && !showArticleLoading && componentStatus.footer && sectionVisibility.footer && (
         <div 
            id="footer" 
            className={`cursor-pointer transition-all duration-200 ${activeSection === 'footer' ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent z-10 relative' : 'hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-transparent'}`}
            onClick={(e) => {
                 e.stopPropagation();
                 onSectionSelect('footer' as PageSection);
            }}
        >
            <Footer {...resolvedFooterData} />
        </div>
      )}
    </div>
  );
};

export default LandingPage;
