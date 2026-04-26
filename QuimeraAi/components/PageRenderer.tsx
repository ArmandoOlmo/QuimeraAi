/**
 * PageRenderer Component
 * 
 * Renders a single page with its configured sections.
 * This is the core rendering component for the multi-page architecture.
 * 
 * It renders sections in order, applying the page's sectionData and
 * project theme to each section component.
 */

import React, { useMemo, useCallback } from 'react';
import { Project, SitePage } from '../types/project';
import { PageData, ThemeData, PageSection } from '../types';
import { DynamicData, PublicProduct, PublicCategory } from '../utils/metaGenerator';
import { deriveColorsFromPalette } from '../utils/colorUtils';

// Import section components
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
import Features from './Features';
import Testimonials from './Testimonials';
import Pricing from './Pricing';
import Faq from './Faq';
import CTASection from './CTASection';
import Services from './Services';
import Team from './Team';
import Video from './Video';
import Slideshow from './Slideshow';
import Portfolio from './Portfolio';
import Leads from './Leads';
import Newsletter from './Newsletter';
import HowItWorks from './HowItWorks';
import Footer from './Footer';
import BusinessMap from './BusinessMap';
import Menu from './Menu';
import Banner from './Banner';
import TopBar from './TopBar';
import LogoBanner from './LogoBanner';
import SignupFloat from './SignupFloat';
import SectionBackground from './ui/SectionBackground';

// Import ecommerce sections
import FeaturedProducts from './ecommerce/sections/FeaturedProducts';
import CategoryGrid from './ecommerce/sections/CategoryGrid';
import ProductHero from './ecommerce/sections/ProductHero';
import SaleCountdown from './ecommerce/sections/SaleCountdown';
import TrustBadges from './ecommerce/sections/TrustBadges';
import RecentlyViewed from './ecommerce/sections/RecentlyViewed';
import ProductReviews from './ecommerce/sections/ProductReviews';
import CollectionBanner from './ecommerce/sections/CollectionBanner';
import ProductBundle from './ecommerce/sections/ProductBundle';
import AnnouncementBar from './ecommerce/sections/AnnouncementBar';

// Import UI elements
import Separator from './Separator';

// Import dynamic page sections
import ProductDetailSection from './ecommerce/sections/ProductDetailSection';
import CategoryProductsSection from './ecommerce/sections/CategoryProductsSection';
import ArticleContentSection from './ecommerce/sections/ArticleContentSection';
import CartSection from './ecommerce/sections/CartSection';
import CheckoutSection from './ecommerce/sections/CheckoutSection';
import ProductGridSection from './ecommerce/sections/ProductGridSection';
import RealEstateListingsSection from './real-estate/RealEstateListingsSection';
import PropertyDirectoryPage from './real-estate/PropertyDirectoryPage';
import PropertyDetailSection from './real-estate/PropertyDetailSection';

interface PageRendererProps {
    /** The page to render */
    page: SitePage;
    /** The parent project */
    project: Project;
    /** Dynamic data for dynamic pages */
    dynamicData?: DynamicData;
    /** Route parameters extracted from URL */
    routeParams?: Record<string, string>;
    /** Is this in preview/editor mode? */
    isPreview?: boolean;
    /** Products for ecommerce sections */
    storefrontProducts?: PublicProduct[];
    /** Categories for ecommerce sections */
    categories?: PublicCategory[];
    /** Optional internal navigation handler for previews */
    onNavigate?: (href: string) => void;
    /** Render only page content when an outer shell already owns header/footer. */
    contentOnly?: boolean;
}

/**
 * PageRenderer renders a page's sections
 */
const PageRenderer: React.FC<PageRendererProps> = ({
    page,
    project,
    dynamicData,
    routeParams,
    isPreview = false,
    storefrontProducts = [],
    categories = [],
    onNavigate,
    contentOnly = false,
}) => {
    // Get component styles from project (published with the project)
    const componentStyles = project.componentStyles || {};

    // Base data from project and page
    const baseData = useMemo((): PageData => {
        return {
            ...project.data,
            ...page.sectionData,
        } as PageData;
    }, [project.data, page.sectionData]);

    // Helper function to merge componentStyles (defaults) with data (user changes)
    // This replicates the logic from LandingPage.tsx for consistency
    // User changes in data take priority over componentStyles defaults
    // Then derive any missing colors from the template palette
    const mergeComponentData = useCallback((componentKey: string) => {
        const componentData = (baseData as any)[componentKey];
        const styles = (componentStyles as any)[componentKey];

        // If neither exists, return the component data or undefined
        if (!componentData && !styles) return undefined;
        // If only styles exist (no user data), use styles as base
        if (!componentData && styles) return styles;
        // If only data exists (no default styles), return data
        if (!styles) return componentData;

        // First merge the colors: defaults, then user/template colors
        const mergedColors = {
            ...styles.colors,           // default colors first
            ...componentData.colors,    // user/template color changes override
        };

        // Derive any missing colors from the template palette
        // This is CRUCIAL for button colors, card backgrounds, input colors, etc.
        const derivedColors = deriveColorsFromPalette(mergedColors, componentKey);

        // Merge cornerGradient if it exists in styles (defaults first, then user changes)
        const mergedCornerGradient = styles.cornerGradient ? {
            ...styles.cornerGradient,           // default cornerGradient values
            ...componentData.cornerGradient,    // user cornerGradient changes override
        } : componentData.cornerGradient;

        return {
            ...styles,              // defaults first
            ...componentData,       // user changes override defaults
            colors: derivedColors,  // Use derived colors with all missing values filled in
            ...(mergedCornerGradient && { cornerGradient: mergedCornerGradient }),
        };
    }, [baseData, componentStyles]);

    // Create merged data for all components
    const mergedData = useMemo((): PageData => {
        return {
            ...baseData,
            hero: mergeComponentData('hero') || baseData.hero,
            heroSplit: mergeComponentData('heroSplit') || baseData.heroSplit,
            heroGallery: mergeComponentData('heroGallery') || baseData.heroGallery,
            heroWave: mergeComponentData('heroWave') || baseData.heroWave,
            heroNova: mergeComponentData('heroNova') || baseData.heroNova,
            heroLead: mergeComponentData('heroLead') || baseData.heroLead,
            topBar: mergeComponentData('topBar') || baseData.topBar,
            features: mergeComponentData('features') || baseData.features,
            testimonials: mergeComponentData('testimonials') || baseData.testimonials,
            pricing: mergeComponentData('pricing') || baseData.pricing,
            faq: mergeComponentData('faq') || baseData.faq,
            cta: mergeComponentData('cta') || baseData.cta,
            services: mergeComponentData('services') || baseData.services,
            team: mergeComponentData('team') || baseData.team,
            video: mergeComponentData('video') || baseData.video,
            slideshow: mergeComponentData('slideshow') || baseData.slideshow,
            portfolio: mergeComponentData('portfolio') || baseData.portfolio,
            leads: mergeComponentData('leads') || baseData.leads,
            newsletter: mergeComponentData('newsletter') || baseData.newsletter,
            howItWorks: mergeComponentData('howItWorks') || baseData.howItWorks,
            footer: mergeComponentData('footer') || baseData.footer,
            header: mergeComponentData('header') || baseData.header,
            map: mergeComponentData('map') || baseData.map,
            menu: mergeComponentData('menu') || baseData.menu,
            banner: mergeComponentData('banner') || baseData.banner,
            // Ecommerce sections
            featuredProducts: mergeComponentData('featuredProducts') || baseData.featuredProducts,
            categoryGrid: mergeComponentData('categoryGrid') || baseData.categoryGrid,
            productHero: mergeComponentData('productHero') || baseData.productHero,
            saleCountdown: mergeComponentData('saleCountdown') || baseData.saleCountdown,
            trustBadges: mergeComponentData('trustBadges') || baseData.trustBadges,
            recentlyViewed: mergeComponentData('recentlyViewed') || baseData.recentlyViewed,
            productReviews: mergeComponentData('productReviews') || baseData.productReviews,
            collectionBanner: mergeComponentData('collectionBanner') || baseData.collectionBanner,
            productBundle: mergeComponentData('productBundle') || baseData.productBundle,
            announcementBar: mergeComponentData('announcementBar') || baseData.announcementBar,
            cmsFeed: mergeComponentData('cmsFeed') || (baseData as any).cmsFeed,
            realEstateListings: mergeComponentData('realEstateListings') || (baseData as any).realEstateListings,
            logoBanner: mergeComponentData('logoBanner') || (baseData as any).logoBanner,
            signupFloat: mergeComponentData('signupFloat') || (baseData as any).signupFloat,
            separator1: mergeComponentData('separator1') || (baseData as any).separator1,
            separator2: mergeComponentData('separator2') || (baseData as any).separator2,
            separator3: mergeComponentData('separator3') || (baseData as any).separator3,
            separator4: mergeComponentData('separator4') || (baseData as any).separator4,
            separator5: mergeComponentData('separator5') || (baseData as any).separator5,
        } as PageData;
    }, [baseData, mergeComponentData]);

    // Provide default theme values to prevent undefined errors
    const theme = project.theme || {
        primaryColor: '#4f46e5',
        secondaryColor: '#78CDD7',
        accentColor: '#ffffff',
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
        headingColor: '#ffffff',
        fontFamily: 'Inter',
        globalColors: {
            primary: '#4f46e5',
            secondary: '#78CDD7',
            accent: '#ffffff',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#ffffff',
            textMuted: '#94a3b8',
            heading: '#ffffff',
            border: '#334155',
            success: '#22c55e',
            error: '#ef4444',
        }
    };
    const globalColors = theme.globalColors || theme;

    // Path-based navigation handlers for SSR (real URLs, not hash)
    const handleNavigateToProduct = (slug: string) => {
        window.location.href = `/producto/${slug}`;
    };

    const handleNavigateToCategory = (slug: string) => {
        window.location.href = `/categoria/${slug}`;
    };

    const handleNavigateToStore = () => {
        window.location.href = '/tienda';
    };

    const handleNavigateToCart = () => {
        window.location.href = '/carrito';
    };

    const handleNavigateToCheckout = () => {
        window.location.href = '/checkout';
    };

    // Universal link navigation handler for Hero CTAs, Header, Footer, Portfolio
    const handleLinkNavigation = (href: string) => {
        if (onNavigate) {
            onNavigate(href);
            return;
        }
        if (href.startsWith('http://') || href.startsWith('https://')) {
            window.open(href, '_blank');
        } else {
            window.location.href = href;
        }
    };

    // Build header links with priority: CMS Menu > main-menu > Pages > Manual Links
    // This matches the logic in PublicWebsitePreview.tsx for consistency
    const navigationLinks = useMemo(() => {
        const menus = project.menus || [];

        // 0. Explicit manual override
        if (mergedData.header?.menuId === 'manual') {
            return mergedData.header?.links || [];
        }

        // 1. CMS Menu by ID takes priority if configured
        if (mergedData.header?.menuId) {
            const menu = menus.find(m => m.id === mergedData.header?.menuId);
            if (menu && menu.items?.length > 0) {
                return menu.items.map((i: any) => ({ text: i.text, href: i.href, icon: i.icon }));
            }
        }

        // 2. Try main-menu from CMS menus
        const mainMenu = menus.find(m => m.id === 'main' || m.handle === 'main-menu');
        if (mainMenu && mainMenu.items?.length > 0) {
            return mainMenu.items.map((i: any) => ({ text: i.text, href: i.href, icon: i.icon }));
        }

        // 3. Generate from pages if available (multi-page architecture)
        if (project.pages && project.pages.length > 0) {
            const navPages = project.pages
                .filter(p => p.showInNavigation)
                .sort((a, b) => (a.navigationOrder || 0) - (b.navigationOrder || 0));

            if (navPages.length > 0) {
                return navPages.map(p => ({
                    text: p.title,
                    href: p.slug,
                }));
            }
        }

        // 4. Fall back to manual links
        return mergedData.header?.links || [];
    }, [project.pages, project.menus, mergedData.header?.links, mergedData.header?.menuId]);

    // Render a single section
    const renderSection = (section: PageSection, index: number): React.ReactNode => {
        const key = `${section}-${index}`;

        // Common props for sections
        const commonProps = {
            key,
            theme,
            globalColors,
            isPreviewMode: isPreview,
        };

        // Border radius values from theme
        const cardBorderRadius = theme.cardBorderRadius || 'xl';
        const buttonBorderRadius = theme.buttonBorderRadius || 'xl';

        switch (section) {
            case 'header':
                return (
                    <Header
                        key={key}
                        {...mergedData.header}
                        links={navigationLinks}
                        isPreviewMode={isPreview}
                        onNavigate={handleLinkNavigation}
                        forceSolid={page.sections.includes('propertyDetail') || page.sections.includes('propertyDirectory')}
                    />
                );

            case 'hero': {
                // Render correct hero variant based on heroVariant field
                const heroData = mergedData.hero;
                const heroBorderRadius = heroData?.buttonBorderRadius || buttonBorderRadius;
                const heroComponent = (() => {
                    if (heroData?.heroVariant === 'modern') return <HeroModern key={key} {...heroData} borderRadius={heroBorderRadius} onNavigate={handleLinkNavigation} />;
                    if (heroData?.heroVariant === 'gradient') return <HeroGradient key={key} {...heroData} borderRadius={heroBorderRadius} onNavigate={handleLinkNavigation} />;
                    if (heroData?.heroVariant === 'fitness') return <HeroFitness key={key} {...heroData} borderRadius={heroBorderRadius} onNavigate={handleLinkNavigation} />;

                    return <Hero key={key} {...heroData} borderRadius={heroBorderRadius} onNavigate={handleLinkNavigation} />;
                })();
                return <SectionBackground backgroundImageUrl={heroData?.backgroundImageUrl} backgroundColor={heroData?.colors?.background} backgroundOverlayEnabled={heroData?.backgroundOverlayEnabled} backgroundOverlayOpacity={heroData?.backgroundOverlayOpacity} backgroundOverlayColor={heroData?.backgroundOverlayColor} backgroundPosition={heroData?.backgroundPosition}>{heroComponent}</SectionBackground>;
            }

            case 'heroSplit':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.heroSplit?.backgroundImageUrl} backgroundColor={mergedData.heroSplit?.colors?.background} backgroundOverlayEnabled={mergedData.heroSplit?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.heroSplit?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.heroSplit?.backgroundOverlayColor} backgroundPosition={mergedData.heroSplit?.backgroundPosition}>
                        <HeroSplit
                            key={key}
                            {...mergedData.heroSplit}
                            borderRadius={mergedData.heroSplit?.buttonBorderRadius || buttonBorderRadius}
                            onNavigate={handleLinkNavigation}
                        />
                    </SectionBackground>
                );

            case 'heroGallery': {
                const galleryData = mergedData.heroGallery;
                return galleryData ? (
                    <SectionBackground backgroundImageUrl={galleryData?.backgroundImageUrl} backgroundColor={galleryData?.colors?.background} backgroundOverlayEnabled={galleryData?.backgroundOverlayEnabled} backgroundOverlayOpacity={galleryData?.backgroundOverlayOpacity} backgroundOverlayColor={galleryData?.backgroundOverlayColor} backgroundPosition={galleryData?.backgroundPosition}>
                        <HeroGallery
                            key={key}
                            {...galleryData}
                            borderRadius={galleryData.buttonBorderRadius || buttonBorderRadius}
                            onNavigate={handleLinkNavigation}
                        />
                    </SectionBackground>
                ) : null;
            }

            case 'heroWave': {
                const waveData = mergedData.heroWave;
                return waveData ? (
                    <SectionBackground backgroundImageUrl={waveData?.backgroundImageUrl} backgroundColor={waveData?.colors?.background} backgroundOverlayEnabled={waveData?.backgroundOverlayEnabled} backgroundOverlayOpacity={waveData?.backgroundOverlayOpacity} backgroundOverlayColor={waveData?.backgroundOverlayColor} backgroundPosition={waveData?.backgroundPosition}>
                        <HeroWave
                            key={key}
                            {...waveData}
                            borderRadius={waveData.buttonBorderRadius || buttonBorderRadius}
                            onNavigate={handleLinkNavigation}
                        />
                    </SectionBackground>
                ) : null;
            }

            case 'heroNova': {
                const novaData = mergedData.heroNova;
                return novaData ? (
                    <SectionBackground backgroundImageUrl={novaData?.backgroundImageUrl} backgroundColor={novaData?.colors?.background} backgroundOverlayEnabled={novaData?.backgroundOverlayEnabled} backgroundOverlayOpacity={novaData?.backgroundOverlayOpacity} backgroundOverlayColor={novaData?.backgroundOverlayColor} backgroundPosition={novaData?.backgroundPosition}>
                        <HeroNova
                            key={key}
                            {...novaData}
                            borderRadius={novaData.buttonBorderRadius || buttonBorderRadius}
                            onNavigate={handleLinkNavigation}
                        />
                    </SectionBackground>
                ) : null;
            }

            case 'heroLead': {
                const leadData = mergedData.heroLead;
                return leadData ? (
                    <SectionBackground backgroundImageUrl={leadData?.backgroundImageUrl} backgroundColor={leadData?.colors?.background} backgroundOverlayEnabled={leadData?.backgroundOverlayEnabled} backgroundOverlayOpacity={leadData?.backgroundOverlayOpacity} backgroundOverlayColor={leadData?.backgroundOverlayColor} backgroundPosition={leadData?.backgroundPosition}>
                        <HeroLead
                            key={key}
                            {...leadData}
                            cardBorderRadius={leadData.cardBorderRadius || cardBorderRadius}
                            inputBorderRadius={leadData.inputBorderRadius || 'md'}
                            buttonBorderRadius={leadData.buttonBorderRadius || buttonBorderRadius}
                        />
                    </SectionBackground>
                ) : null;
            }

            case 'features':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.features?.backgroundImageUrl} backgroundColor={mergedData.features?.colors?.background} backgroundOverlayEnabled={mergedData.features?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.features?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.features?.backgroundOverlayColor} backgroundPosition={mergedData.features?.backgroundPosition}>
                        <Features
                            key={key}
                            {...mergedData.features}
                            borderRadius={mergedData.features?.borderRadius || cardBorderRadius}
                            onNavigate={handleLinkNavigation}
                        />
                    </SectionBackground>
                );

            case 'testimonials':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.testimonials?.backgroundImageUrl} backgroundColor={mergedData.testimonials?.colors?.background} backgroundOverlayEnabled={mergedData.testimonials?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.testimonials?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.testimonials?.backgroundOverlayColor} backgroundPosition={mergedData.testimonials?.backgroundPosition}>
                        <Testimonials
                            key={key}
                            {...mergedData.testimonials}
                            borderRadius={mergedData.testimonials?.borderRadius || cardBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'pricing':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.pricing?.backgroundImageUrl} backgroundColor={mergedData.pricing?.colors?.background} backgroundOverlayEnabled={mergedData.pricing?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.pricing?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.pricing?.backgroundOverlayColor} backgroundPosition={mergedData.pricing?.backgroundPosition}>
                        <Pricing
                            key={key}
                            {...mergedData.pricing}
                            cardBorderRadius={cardBorderRadius}
                            buttonBorderRadius={buttonBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'faq':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.faq?.backgroundImageUrl} backgroundColor={mergedData.faq?.colors?.background} backgroundOverlayEnabled={mergedData.faq?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.faq?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.faq?.backgroundOverlayColor} backgroundPosition={mergedData.faq?.backgroundPosition}>
                        <Faq
                            key={key}
                            {...mergedData.faq}
                            borderRadius={cardBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'cta':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.cta?.backgroundImageUrl} backgroundColor={mergedData.cta?.colors?.background} backgroundOverlayEnabled={mergedData.cta?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.cta?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.cta?.backgroundOverlayColor} backgroundPosition={mergedData.cta?.backgroundPosition}>
                        <CTASection
                            key={key}
                            {...mergedData.cta}
                            cardBorderRadius={cardBorderRadius}
                            buttonBorderRadius={buttonBorderRadius}
                            onNavigate={handleLinkNavigation}
                        />
                    </SectionBackground>
                );

            case 'services':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.services?.backgroundImageUrl} backgroundColor={mergedData.services?.colors?.background} backgroundOverlayEnabled={mergedData.services?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.services?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.services?.backgroundOverlayColor} backgroundPosition={mergedData.services?.backgroundPosition}>
                        <Services
                            key={key}
                            {...mergedData.services}
                            borderRadius={cardBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'team':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.team?.backgroundImageUrl} backgroundColor={mergedData.team?.colors?.background} backgroundOverlayEnabled={mergedData.team?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.team?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.team?.backgroundOverlayColor} backgroundPosition={mergedData.team?.backgroundPosition}>
                        <Team
                            key={key}
                            {...mergedData.team}
                            borderRadius={cardBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'video':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.video?.backgroundImageUrl} backgroundColor={mergedData.video?.colors?.background} backgroundOverlayEnabled={mergedData.video?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.video?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.video?.backgroundOverlayColor} backgroundPosition={mergedData.video?.backgroundPosition}>
                        <Video
                            key={key}
                            {...mergedData.video}
                        />
                    </SectionBackground>
                );

            case 'slideshow':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.slideshow?.backgroundImageUrl} backgroundColor={mergedData.slideshow?.colors?.background} backgroundOverlayEnabled={mergedData.slideshow?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.slideshow?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.slideshow?.backgroundOverlayColor} backgroundPosition={mergedData.slideshow?.backgroundPosition}>
                        <Slideshow
                            key={key}
                            {...mergedData.slideshow}
                            borderRadius={cardBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'portfolio':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.portfolio?.backgroundImageUrl} backgroundColor={mergedData.portfolio?.colors?.background} backgroundOverlayEnabled={mergedData.portfolio?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.portfolio?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.portfolio?.backgroundOverlayColor} backgroundPosition={mergedData.portfolio?.backgroundPosition}>
                        <Portfolio
                            key={key}
                            {...mergedData.portfolio}
                            borderRadius={cardBorderRadius}
                            onNavigate={handleLinkNavigation}
                        />
                    </SectionBackground>
                );

            case 'leads':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.leads?.backgroundImageUrl} backgroundColor={mergedData.leads?.colors?.background} backgroundOverlayEnabled={mergedData.leads?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.leads?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.leads?.backgroundOverlayColor} backgroundPosition={mergedData.leads?.backgroundPosition}>
                        <Leads
                            key={key}
                            {...mergedData.leads}
                            cardBorderRadius={mergedData.leads?.cardBorderRadius || cardBorderRadius}
                            buttonBorderRadius={mergedData.leads?.buttonBorderRadius || buttonBorderRadius}
                            projectId={project.id}
                        />
                    </SectionBackground>
                );

            case 'newsletter':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.newsletter?.backgroundImageUrl} backgroundColor={mergedData.newsletter?.colors?.background} backgroundOverlayEnabled={mergedData.newsletter?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.newsletter?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.newsletter?.backgroundOverlayColor} backgroundPosition={mergedData.newsletter?.backgroundPosition}>
                        <Newsletter
                            key={key}
                            {...mergedData.newsletter}
                        />
                    </SectionBackground>
                );

            case 'howItWorks':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.howItWorks?.backgroundImageUrl} backgroundColor={mergedData.howItWorks?.colors?.background} backgroundOverlayEnabled={mergedData.howItWorks?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.howItWorks?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.howItWorks?.backgroundOverlayColor} backgroundPosition={mergedData.howItWorks?.backgroundPosition}>
                        <HowItWorks
                            key={key}
                            {...mergedData.howItWorks}
                            borderRadius={cardBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'map':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.map?.backgroundImageUrl} backgroundColor={mergedData.map?.colors?.background} backgroundOverlayEnabled={mergedData.map?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.map?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.map?.backgroundOverlayColor} backgroundPosition={mergedData.map?.backgroundPosition}>
                        <BusinessMap
                            key={key}
                            {...mergedData.map}
                            apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY || ''}
                            borderRadius={cardBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'menu':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.menu?.backgroundImageUrl} backgroundColor={mergedData.menu?.colors?.background} backgroundOverlayEnabled={mergedData.menu?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.menu?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.menu?.backgroundOverlayColor} backgroundPosition={mergedData.menu?.backgroundPosition}>
                        <Menu
                            key={key}
                            {...mergedData.menu}
                            borderRadius={cardBorderRadius}
                        />
                    </SectionBackground>
                );

            case 'banner':
                return (
                    <Banner
                        key={key}
                        {...mergedData.banner}
                    />
                );

            case 'topBar': {
                const topBarData = mergedData.topBar;
                return topBarData ? (
                    <TopBar
                        key={key}
                        {...topBarData}
                        onNavigate={handleLinkNavigation}
                    />
                ) : null;
            }

            case 'logoBanner': {
                const logoBannerData = mergedData.logoBanner;
                return logoBannerData ? (
                    <LogoBanner
                        key={key}
                        {...logoBannerData}
                        onNavigate={handleLinkNavigation}
                    />
                ) : null;
            }

            case 'footer':
                return (
                    <Footer
                        key={key}
                        {...mergedData.footer}
                        onNavigate={handleLinkNavigation}
                    />
                );

            // Ecommerce sections - with path-based navigation for SSR
            case 'featuredProducts':
                return (
                    <FeaturedProducts
                        key={key}
                        data={mergedData.featuredProducts}
                        storeId={project.id}
                        onProductClick={handleNavigateToProduct}
                    />
                );

            case 'categoryGrid':
                return (
                    <CategoryGrid
                        key={key}
                        data={mergedData.categoryGrid}
                        storeId={project.id}
                        onCategoryClick={handleNavigateToCategory}
                    />
                );

            case 'productHero':
                return (
                    <ProductHero
                        key={key}
                        data={mergedData.productHero}
                        storeId={project.id}
                        onProductClick={handleNavigateToProduct}
                    />
                );

            case 'saleCountdown':
                return (
                    <SaleCountdown
                        key={key}
                        data={mergedData.saleCountdown}
                        storeId={project.id}
                        onProductClick={handleNavigateToProduct}
                    />
                );

            case 'trustBadges':
                return (
                    <TrustBadges
                        key={key}
                        data={mergedData.trustBadges}
                    />
                );

            case 'recentlyViewed':
                return (
                    <RecentlyViewed
                        key={key}
                        data={mergedData.recentlyViewed}
                        storeId={project.id}
                        onProductClick={handleNavigateToProduct}
                    />
                );

            case 'productReviews':
                return (
                    <ProductReviews
                        key={key}
                        data={mergedData.productReviews}
                    />
                );

            case 'collectionBanner':
                return (
                    <CollectionBanner
                        key={key}
                        data={mergedData.collectionBanner}
                        onCollectionClick={handleNavigateToCategory}
                    />
                );

            case 'productBundle':
                return (
                    <ProductBundle
                        key={key}
                        data={mergedData.productBundle}
                        storeId={project.id}
                        onProductClick={handleNavigateToProduct}
                    />
                );

            case 'announcementBar':
                return (
                    <AnnouncementBar
                        key={key}
                        data={mergedData.announcementBar}
                    />
                );

            case 'separator1':
            case 'separator2':
            case 'separator3':
            case 'separator4':
            case 'separator5':
                const separatorData = (mergedData as any)[section];
                return separatorData ? <Separator key={key} data={separatorData} /> : null;

            // Dynamic page sections
            case 'productDetail':
            case 'ProductDetailSection':
                return (
                    <ProductDetailSection
                        key={key}
                        storeId={project.id}
                        productSlug={routeParams?.slug}
                        product={dynamicData?.product}
                        colors={{
                            background: globalColors?.background,
                            heading: globalColors?.heading,
                            text: globalColors?.text,
                            accent: globalColors?.primary,
                        }}
                        onNavigateToStore={handleNavigateToStore}
                        onNavigateToCategory={handleNavigateToCategory}
                        onNavigateToProduct={handleNavigateToProduct}
                    />
                );

            case 'categoryProducts':
            case 'CategoryProductsSection':
                return (
                    <CategoryProductsSection
                        key={key}
                        storeId={project.id}
                        categorySlug={routeParams?.slug}
                        category={dynamicData?.category}
                        title={dynamicData?.category?.name}
                        primaryColor={globalColors?.primary}
                        themeColors={{
                            background: 'transparent',
                            text: globalColors?.text,
                            heading: globalColors?.heading,
                            cardBackground: globalColors?.surface,
                            cardText: globalColors?.text,
                            border: globalColors?.border,
                            priceColor: globalColors?.heading,
                            salePriceColor: '#ef4444',
                        }}
                        onProductClick={handleNavigateToProduct}
                    />
                );

            case 'articleContent':
            case 'ArticleContentSection':
                return (
                    <ArticleContentSection
                        key={key}
                        projectId={project.id}
                        articleSlug={routeParams?.slug}
                        article={dynamicData?.article}
                        colors={{
                            background: globalColors?.background,
                            heading: globalColors?.heading,
                            text: globalColors?.text,
                            accent: globalColors?.primary,
                        }}
                        theme={theme}
                        onBack={() => window.location.href = '/blog'}
                    />
                );

            case 'cart':
            case 'CartSection':
                return (
                    <CartSection
                        key={key}
                        storeId={project.id}
                        primaryColor={globalColors?.primary}
                        colors={{
                            background: globalColors?.background,
                            heading: globalColors?.heading,
                            text: globalColors?.text,
                            cardBackground: globalColors?.surface,
                            cardText: globalColors?.heading,
                            accent: globalColors?.primary,
                            border: globalColors?.border,
                            priceColor: globalColors?.heading,
                            buttonBackground: globalColors?.primary,
                            buttonText: '#ffffff',
                        }}
                        onContinueShopping={handleNavigateToStore}
                        onCheckout={handleNavigateToCheckout}
                    />
                );

            case 'checkout':
            case 'CheckoutSection':
                return (
                    <CheckoutSection
                        key={key}
                        storeId={project.id}
                        primaryColor={globalColors?.primary}
                        colors={{
                            background: globalColors?.background,
                            heading: globalColors?.heading,
                            text: globalColors?.text,
                            cardBackground: globalColors?.surface,
                            cardText: globalColors?.heading,
                            accent: globalColors?.primary,
                            border: globalColors?.border,
                            priceColor: globalColors?.heading,
                            buttonBackground: globalColors?.primary,
                            buttonText: '#ffffff',
                            inputBackground: globalColors?.background,
                            inputText: globalColors?.heading,
                        }}
                        onBackToCart={handleNavigateToCart}
                        onOrderComplete={(orderId) => window.location.href = `/pedido/${orderId}`}
                    />
                );

            case 'productGrid':
            case 'ProductGridSection':
                return (
                    <ProductGridSection
                        key={key}
                        storeId={project.id}
                        title="Tienda"
                        primaryColor={globalColors?.primary}
                        themeColors={{
                            background: 'transparent',
                            text: globalColors?.text,
                            heading: globalColors?.heading,
                            cardBackground: globalColors?.surface,
                            cardText: globalColors?.text,
                            border: globalColors?.border,
                            priceColor: globalColors?.heading,
                            salePriceColor: '#ef4444',
                        }}
                        onProductClick={handleNavigateToProduct}
                    />
                );

            case 'realEstateListings':
                return (
                    <SectionBackground backgroundImageUrl={mergedData.realEstateListings?.backgroundImageUrl} backgroundColor={mergedData.realEstateListings?.colors?.background} backgroundOverlayEnabled={mergedData.realEstateListings?.backgroundOverlayEnabled} backgroundOverlayOpacity={mergedData.realEstateListings?.backgroundOverlayOpacity} backgroundOverlayColor={mergedData.realEstateListings?.backgroundOverlayColor} backgroundPosition={mergedData.realEstateListings?.backgroundPosition}>
                        <RealEstateListingsSection
                            key={key}
                            data={mergedData.realEstateListings}
                            projectId={project.id}
                            isPreviewMode={isPreview}
                            theme={theme}
                            globalColors={globalColors}
                            onNavigate={handleLinkNavigation}
                        />
                    </SectionBackground>
                );

            case 'propertyDirectory':
                return (
                    <PropertyDirectoryPage
                        key={key}
                        projectId={project.id}
                        data={mergedData.realEstateListings}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );

            case 'propertyDetail': {
                const propertySlug = page.slug?.replace('/listados/', '').replace(/\/$/, '') || '';
                return (
                    <PropertyDetailSection
                        key={key}
                        projectId={project.id}
                        ownerId={project.userId}
                        propertySlug={propertySlug}
                        theme={theme}
                        globalColors={globalColors}
                        onNavigateToListings={() => {
                            if (onNavigate) {
                                onNavigate('/listados');
                                return;
                            }
                            window.location.href = '/listados';
                        }}
                        onNavigateToProperty={(slug) => {
                            if (onNavigate) {
                                onNavigate(`/listados/${slug}`);
                                return;
                            }
                            window.location.href = `/listados/${slug}`;
                        }}
                    />
                );
            }

            // Non-renderable sections (settings, colors, typography)
            case 'colors':
            case 'typography':
            case 'storeSettings':
            case 'chatbot':
            case 'cmsFeed': // CMS Feed is rendered dynamically via LandingPage with useCMS()
            case 'products': // Legacy products grid - use ProductGridSection instead
            case 'signupFloat': // Rendered as floating overlay outside section loop
                return null;

            default:
                console.warn(`[PageRenderer] Unknown section type: ${section}`);
                return null;
        }
    };

    // Filter and render visible sections
    // Also deduplicate sections (header/footer should only appear once)
    const seenSections = new Set<string>();
    const shellSections: PageSection[] = ['header', 'footer', 'topBar', 'announcementBar'];
    const visibleSections = page.sections.filter(section => {
        if (contentOnly && shellSections.includes(section)) {
            return false;
        }
        // Filter out non-renderable sections
        if (['colors', 'typography', 'storeSettings'].includes(section)) {
            return false;
        }
        // Deduplicate: only allow each section once
        if (seenSections.has(section)) {
            console.warn(`[PageRenderer] Duplicate section "${section}" detected and skipped`);
            return false;
        }
        seenSections.add(section);
        return true;
    });

    // If topBar has aboveHeader, ensure it renders before the header
    const topBarAboveHeader = mergedData.topBar?.aboveHeader;
    let orderedSections = [...visibleSections];
    if (topBarAboveHeader) {
        const topBarIdx = orderedSections.indexOf('topBar');
        const headerIdx = orderedSections.indexOf('header');
        if (topBarIdx > -1 && headerIdx > -1 && topBarIdx > headerIdx) {
            // Move topBar right before header
            orderedSections.splice(topBarIdx, 1);
            orderedSections.splice(headerIdx, 0, 'topBar');
        }
    }

    return (
        <div
            className={contentOnly ? 'w-full' : 'min-h-screen'}
            style={{ backgroundColor: theme.pageBackground || globalColors?.background }}
        >
            {orderedSections.map((section, index) => renderSection(section, index))}

            {/* Floating Sign-Up Overlay (rendered outside normal section flow) */}
            {!contentOnly && mergedData.signupFloat && page.sections.includes('signupFloat' as PageSection) && (
                <SignupFloat
                    {...mergedData.signupFloat}
                    projectId={project.id}
                    ownerId={project.userId}
                    isPreviewMode={true}
                />
            )}
        </div>
    );
};

export default PageRenderer;
