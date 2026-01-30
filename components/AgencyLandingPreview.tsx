/**
 * AgencyLandingPreview
 * Preview component for agency landing pages in the editor
 * Listens for postMessage updates from AgencyLandingEditor
 * Renders the same components as LandingPage but with agency-specific data
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import BusinessMap from './BusinessMap';
import Menu from './Menu';
import Banner from './Banner';
import { FontFamily } from '../types';
import {
    AgencyLandingSection,
    AgencyLandingConfig,
    DEFAULT_AGENCY_THEME,
    DEFAULT_AGENCY_SECTIONS,
} from '../types/agencyLanding';

// Font stacks for CSS variables
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

// Default section data
const DEFAULT_SECTION_DATA: Record<string, any> = {
    header: {
        style: 'sticky-solid',
        layout: 'minimal',
        isSticky: true,
        glassEffect: false,
        height: 64,
        logoType: 'text',
        logoText: 'Mi Agencia',
        logoImageUrl: '',
        logoWidth: 120,
        links: [
            { text: 'Inicio', href: '#hero' },
            { text: 'Servicios', href: '#services' },
            { text: 'Portfolio', href: '#portfolio' },
            { text: 'Contacto', href: '#leads' },
        ],
        hoverStyle: 'underline',
        ctaText: 'Contactar',
        showCta: true,
        showLogin: false,
        loginText: 'Iniciar Sesión',
        colors: {
            background: '#0f172a',
            text: '#f1f5f9',
            accent: '#6366f1',
            border: '#334155',
        },
        buttonBorderRadius: 'lg',
    },
    hero: {
        heroVariant: 'modern',
        headline: 'Transformamos ideas en realidad digital',
        subheadline: 'Somos una agencia de desarrollo web y marketing digital que ayuda a empresas a crecer en el mundo digital.',
        primaryCta: 'Comenzar Ahora',
        secondaryCta: 'Ver Portfolio',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        imageStyle: 'default',
        imageDropShadow: true,
        imageBorderRadius: 'lg',
        imageBorderSize: 'none',
        imageBorderColor: '#334155',
        imageJustification: 'center',
        imagePosition: 'right',
        imageWidth: 500,
        imageHeight: 400,
        imageHeightEnabled: false,
        imageAspectRatio: 'auto',
        imageObjectFit: 'cover',
        paddingY: 'lg',
        paddingX: 'lg',
        sectionBorderSize: 'none',
        sectionBorderColor: '#334155',
        colors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            background: '#0f172a',
            text: '#94a3b8',
            heading: '#f1f5f9',
            buttonBackground: '#6366f1',
            buttonText: '#ffffff',
        },
    },
    features: {
        featuresVariant: 'modern',
        title: 'Nuestras Características',
        description: 'Ofrecemos soluciones completas para tu negocio digital',
        items: [
            { title: 'Diseño Web', description: 'Sitios web modernos y responsivos', imageUrl: '' },
            { title: 'Marketing Digital', description: 'Estrategias que generan resultados', imageUrl: '' },
            { title: 'SEO', description: 'Posicionamiento en buscadores', imageUrl: '' },
        ],
        paddingY: 'lg',
        paddingX: 'lg',
        colors: {
            background: '#1e293b',
            accent: '#6366f1',
            borderColor: '#334155',
            text: '#94a3b8',
            heading: '#f1f5f9',
        },
        gridColumns: 3,
        imageHeight: 200,
        imageObjectFit: 'cover',
    },
    services: {
        servicesVariant: 'cards',
        title: 'Nuestros Servicios',
        description: 'Soluciones completas para tu presencia digital',
        items: [
            { title: 'Desarrollo Web', description: 'Sitios web a medida', icon: 'code' },
            { title: 'E-commerce', description: 'Tiendas online', icon: 'shopping-cart' },
            { title: 'Marketing', description: 'Estrategias digitales', icon: 'megaphone' },
        ],
        paddingY: 'lg',
        paddingX: 'lg',
        colors: {
            background: '#0f172a',
            accent: '#6366f1',
            borderColor: '#334155',
            text: '#94a3b8',
            heading: '#f1f5f9',
        },
    },
    testimonials: {
        testimonialsVariant: 'minimal-cards',
        title: 'Lo que dicen nuestros clientes',
        description: 'Testimonios de clientes satisfechos',
        items: [
            { quote: 'Excelente servicio y resultados increíbles', name: 'Juan Pérez', title: 'CEO, Tech Co' },
            { quote: 'Superaron nuestras expectativas', name: 'María García', title: 'Directora, StartupX' },
        ],
        paddingY: 'lg',
        paddingX: 'lg',
        colors: {
            background: '#1e293b',
            accent: '#8b5cf6',
            borderColor: '#334155',
            text: '#94a3b8',
            heading: '#f1f5f9',
        },
    },
    portfolio: {
        portfolioVariant: 'classic',
        title: 'Nuestro Portfolio',
        description: 'Proyectos que hemos realizado',
        items: [
            { title: 'Proyecto 1', description: 'E-commerce moderno', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400' },
            { title: 'Proyecto 2', description: 'App móvil', imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400' },
            { title: 'Proyecto 3', description: 'Landing page', imageUrl: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400' },
        ],
        paddingY: 'lg',
        paddingX: 'lg',
        colors: {
            background: '#0f172a',
            accent: '#6366f1',
            borderColor: '#334155',
            text: '#94a3b8',
            heading: '#f1f5f9',
        },
    },
    pricing: {
        pricingVariant: 'classic',
        title: 'Planes y Precios',
        description: 'Elige el plan que mejor se adapte a tus necesidades',
        tiers: [
            { name: 'Básico', price: '$99', frequency: '/mes', description: 'Para pequeños negocios', features: ['1 sitio web', 'Soporte email'], buttonText: 'Comenzar', buttonLink: '#', featured: false },
            { name: 'Pro', price: '$199', frequency: '/mes', description: 'Para empresas en crecimiento', features: ['5 sitios web', 'Soporte prioritario', 'SEO incluido'], buttonText: 'Comenzar', buttonLink: '#', featured: true },
            { name: 'Enterprise', price: '$499', frequency: '/mes', description: 'Para grandes empresas', features: ['Sitios ilimitados', 'Soporte 24/7', 'SEO avanzado'], buttonText: 'Contactar', buttonLink: '#', featured: false },
        ],
        paddingY: 'lg',
        paddingX: 'lg',
        colors: {
            background: '#1e293b',
            accent: '#6366f1',
            borderColor: '#334155',
            text: '#94a3b8',
            heading: '#f1f5f9',
        },
    },
    faq: {
        faqVariant: 'classic',
        title: 'Preguntas Frecuentes',
        description: 'Respuestas a las dudas más comunes',
        items: [
            { question: '¿Cuánto tiempo toma un proyecto?', answer: 'Depende de la complejidad, pero en promedio 4-8 semanas.' },
            { question: '¿Ofrecen mantenimiento?', answer: 'Sí, todos nuestros planes incluyen mantenimiento mensual.' },
        ],
        paddingY: 'lg',
        paddingX: 'lg',
        colors: {
            background: '#0f172a',
            accent: '#6366f1',
            borderColor: '#334155',
            text: '#94a3b8',
            heading: '#f1f5f9',
        },
    },
    leads: {
        leadsVariant: 'classic',
        title: 'Contáctanos',
        description: 'Estamos listos para ayudarte con tu próximo proyecto',
        namePlaceholder: 'Tu nombre',
        emailPlaceholder: 'tu@email.com',
        companyPlaceholder: 'Tu empresa',
        messagePlaceholder: 'Cuéntanos sobre tu proyecto...',
        buttonText: 'Enviar Mensaje',
        paddingY: 'lg',
        paddingX: 'lg',
        colors: {
            background: '#1e293b',
            accent: '#6366f1',
            borderColor: '#334155',
            text: '#94a3b8',
            heading: '#f1f5f9',
            buttonBackground: '#6366f1',
            buttonText: '#ffffff',
        },
    },
    cta: {
        title: '¿Listo para empezar?',
        description: 'Contáctanos hoy y transforma tu presencia digital',
        buttonText: 'Comenzar Ahora',
        paddingY: 'lg',
        paddingX: 'lg',
        colors: {
            gradientStart: '#6366f1',
            gradientEnd: '#8b5cf6',
            text: '#ffffff',
            heading: '#ffffff',
            buttonBackground: '#ffffff',
            buttonText: '#6366f1',
        },
    },
    footer: {
        title: 'Mi Agencia',
        description: 'Transformando ideas en realidad digital',
        copyrightText: '© 2024 Mi Agencia. Todos los derechos reservados.',
        linkColumns: [
            { title: 'Servicios', links: [{ text: 'Desarrollo Web', href: '#' }, { text: 'Marketing', href: '#' }] },
            { title: 'Empresa', links: [{ text: 'Sobre Nosotros', href: '#' }, { text: 'Contacto', href: '#' }] },
        ],
        socialLinks: [],
        colors: {
            background: '#0f172a',
            border: '#334155',
            text: '#64748b',
            linkHover: '#6366f1',
            heading: '#f1f5f9',
        },
    },
};

export function AgencyLandingPreview() {
    const [sections, setSections] = useState<AgencyLandingSection[]>(DEFAULT_AGENCY_SECTIONS);
    const [theme, setTheme] = useState(DEFAULT_AGENCY_THEME);
    const [branding, setBranding] = useState<any>(null);

    // Listen for updates from the editor
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Security: Only accept messages from same origin
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'AGENCY_LANDING_UPDATE') {
                console.log('[AgencyPreview] Received update:', event.data.sections?.length || 0, 'sections');
                // #region agent log
                const footerSection = event.data.sections?.find((s:any) => s.type === 'footer');
                const headerSection = event.data.sections?.find((s:any) => s.type === 'header');
                fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AgencyLandingPreview.tsx:handleMessage',message:'Received update from editor',data:{sectionsCount:event.data.sections?.length||0,footerData:footerSection?.data,headerData:headerSection?.data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H7'})}).catch(()=>{});
                // #endregion
                if (event.data.sections) {
                    setSections(event.data.sections);
                }
                if (event.data.theme) {
                    setTheme(event.data.theme);
                }
                if (event.data.branding) {
                    setBranding(event.data.branding);
                }
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
        if (window.parent !== window) {
            console.log('[AgencyPreview] Sending PREVIEW_READY message');
            window.parent.postMessage({ type: 'PREVIEW_READY' }, window.location.origin);
        }

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Inject font variables into :root
    useEffect(() => {
        const root = document.documentElement;
        const headerFont = fontStacks[theme.fontFamilyHeader] || fontStacks.poppins;
        const bodyFont = fontStacks[theme.fontFamilyBody] || fontStacks.mulish;
        const buttonFont = fontStacks[theme.fontFamilyButton] || fontStacks.poppins;

        root.style.setProperty('--font-header', headerFont);
        root.style.setProperty('--font-body', bodyFont);
        root.style.setProperty('--font-button', buttonFont);
        root.style.setProperty('--headings-transform', theme.headingsAllCaps ? 'uppercase' : 'none');
        root.style.setProperty('--headings-spacing', theme.headingsAllCaps ? '0.05em' : 'normal');
        root.style.setProperty('--buttons-transform', theme.buttonsAllCaps ? 'uppercase' : 'none');
        root.style.setProperty('--buttons-spacing', theme.buttonsAllCaps ? '0.05em' : 'normal');
        root.style.setProperty('--navlinks-transform', theme.navLinksAllCaps ? 'uppercase' : 'none');
        root.style.setProperty('--navlinks-spacing', theme.navLinksAllCaps ? '0.05em' : 'normal');
    }, [theme]);

    // Get enabled sections sorted by order
    const enabledSections = useMemo(() => {
        return sections
            .filter(s => s.enabled)
            .sort((a, b) => a.order - b.order);
    }, [sections]);

    // Get section data with defaults
    const getSectionData = (section: AgencyLandingSection) => {
        const defaults = DEFAULT_SECTION_DATA[section.type] || {};
        return { ...defaults, ...section.data };
    };

    // Render a section component
    const renderSection = (section: AgencyLandingSection) => {
        const data = getSectionData(section);
        const borderRadius = theme.cardBorderRadius || 'lg';
        const buttonBorderRadius = theme.buttonBorderRadius || 'lg';

        switch (section.type) {
            case 'header':
                return (
                    <Header
                        key={section.id}
                        {...data}
                        buttonBorderRadius={buttonBorderRadius}
                    />
                );

            case 'hero':
            case 'heroModern':
            case 'heroGradient':
                const heroData = { ...data, heroVariant: section.type === 'heroModern' ? 'modern' : section.type === 'heroGradient' ? 'gradient' : data.heroVariant };
                if (heroData.heroVariant === 'modern') {
                    return <HeroModern key={section.id} {...heroData} borderRadius={buttonBorderRadius} />;
                } else if (heroData.heroVariant === 'gradient') {
                    return <HeroGradient key={section.id} {...heroData} borderRadius={buttonBorderRadius} />;
                } else if (heroData.heroVariant === 'fitness') {
                    return <HeroFitness key={section.id} {...heroData} borderRadius={buttonBorderRadius} />;
                }
                return <Hero key={section.id} {...heroData} borderRadius={buttonBorderRadius} />;

            case 'heroSplit':
                return <HeroSplit key={section.id} {...data} borderRadius={buttonBorderRadius} />;

            case 'features':
                return <Features key={section.id} {...data} borderRadius={borderRadius} />;

            case 'services':
                return <Services key={section.id} {...data} borderRadius={borderRadius} />;

            case 'testimonials':
                return <Testimonials key={section.id} {...data} borderRadius={borderRadius} />;

            case 'portfolio':
                return <Portfolio key={section.id} {...data} borderRadius={borderRadius} />;

            case 'team':
                return <Team key={section.id} {...data} borderRadius={borderRadius} />;

            case 'pricing':
                return <Pricing key={section.id} {...data} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;

            case 'faq':
                return <Faq key={section.id} {...data} borderRadius={borderRadius} />;

            case 'leads':
                return <Leads key={section.id} {...data} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;

            case 'newsletter':
                return <Newsletter key={section.id} {...data} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;

            case 'cta':
                return <CTASection key={section.id} {...data} cardBorderRadius={borderRadius} buttonBorderRadius={buttonBorderRadius} />;

            case 'video':
                return <Video key={section.id} {...data} borderRadius={borderRadius} />;

            case 'slideshow':
                return <Slideshow key={section.id} {...data} borderRadius={borderRadius} />;

            case 'howItWorks':
                return <HowItWorks key={section.id} {...data} borderRadius={borderRadius} />;

            case 'map':
                return <BusinessMap key={section.id} {...data} apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''} borderRadius={borderRadius} />;

            case 'menu':
                return <Menu key={section.id} {...data} borderRadius={borderRadius} />;

            case 'banner':
                return <Banner key={section.id} {...data} buttonBorderRadius={buttonBorderRadius} />;

            case 'footer':
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AgencyLandingPreview.tsx:renderFooter',message:'Rendering footer',data:{sectionId:section.id,sectionDataKeys:Object.keys(section.data||{}),mergedDataKeys:Object.keys(data),backgroundColor:data.backgroundColor},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H8'})}).catch(()=>{});
                // #endregion
                return <Footer key={section.id} {...data} />;

            default:
                return null;
        }
    };

    const pageBackground = theme.pageBackground || theme.globalColors?.background || '#0f172a';

    return (
        <div className="min-h-screen text-slate-200 overflow-x-hidden">
            <style>{`
                /* Override global overflow:hidden from index.html to enable scrolling in preview iframe */
                html, body {
                    overflow: visible !important;
                    overflow-x: hidden !important;
                    height: auto !important;
                    min-height: 100% !important;
                }
                body {
                    overflow-y: auto !important;
                }
                :root {
                    --site-base-bg: ${pageBackground};
                    --site-surface-bg: ${theme.globalColors?.surface || pageBackground};
                }
                body, .bg-site-base { background-color: ${pageBackground}; }
            `}</style>

            {/* Render Header if present */}
            {enabledSections.filter(s => s.type === 'header').map(section => (
                <div key={section.id} id={`section-${section.type}`}>
                    {renderSection(section)}
                </div>
            ))}

            {/* Render content sections (excluding header and footer) */}
            <main className="min-h-screen" style={{ backgroundColor: pageBackground }}>
                {enabledSections
                    .filter(s => s.type !== 'header' && s.type !== 'footer' && s.type !== 'typography')
                    .map(section => (
                        <div key={section.id} id={`section-${section.type}`}>
                            {renderSection(section)}
                        </div>
                    ))}
            </main>

            {/* Render Footer if present */}
            {enabledSections.filter(s => s.type === 'footer').map(section => (
                <div key={section.id} id={`section-${section.type}`}>
                    {renderSection(section)}
                </div>
            ))}
        </div>
    );
}

export default AgencyLandingPreview;
