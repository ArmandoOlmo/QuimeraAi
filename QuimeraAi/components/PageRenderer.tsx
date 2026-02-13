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

// Import dynamic page sections
import ProductDetailSection from './ecommerce/sections/ProductDetailSection';
import CategoryProductsSection from './ecommerce/sections/CategoryProductsSection';
import ArticleContentSection from './ecommerce/sections/ArticleContentSection';
import CartSection from './ecommerce/sections/CartSection';
import CheckoutSection from './ecommerce/sections/CheckoutSection';
import ProductGridSection from './ecommerce/sections/ProductGridSection';

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

    // Build header links with priority: CMS Menu > main-menu > Pages > Manual Links
    // This matches the logic in PublicWebsitePreview.tsx for consistency
    const navigationLinks = useMemo(() => {
        const menus = project.menus || [];

        // 1. CMS Menu by ID takes priority if configured
        if (mergedData.header?.menuId) {
            const menu = menus.find(m => m.id === mergedData.header?.menuId);
            if (menu && menu.items?.length > 0) {
                return menu.items.map((i: any) => ({ text: i.text, href: i.href }));
            }
        }

        // 2. Try main-menu from CMS menus
        const mainMenu = menus.find(m => m.id === 'main' || m.handle === 'main-menu');
        if (mainMenu && mainMenu.items?.length > 0) {
            return mainMenu.items.map((i: any) => ({ text: i.text, href: i.href }));
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
                    />
                );

            case 'hero':
                // Render correct hero variant based on heroVariant field
                const heroData = mergedData.hero;
                const heroBorderRadius = heroData?.buttonBorderRadius || buttonBorderRadius;

                if (heroData?.heroVariant === 'modern') return <HeroModern key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'gradient') return <HeroGradient key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'fitness') return <HeroFitness key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'editorial') return <HeroEditorial key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'cinematic') return <HeroCinematic key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'minimal') return <HeroMinimal key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'bold') return <HeroBold key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'overlap') return <HeroOverlap key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'verticalSplit') return <HeroVerticalSplit key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'glass') return <HeroGlass key={key} {...heroData} borderRadius={heroBorderRadius} />;
                if (heroData?.heroVariant === 'stacked') return <HeroStacked key={key} {...heroData} borderRadius={heroBorderRadius} />;
                return <Hero key={key} {...heroData} borderRadius={heroBorderRadius} />;

            case 'heroSplit':
                return (
                    <HeroSplit
                        key={key}
                        {...mergedData.heroSplit}
                        borderRadius={mergedData.heroSplit?.buttonBorderRadius || buttonBorderRadius}
                    />
                );

            case 'features':
                return (
                    <Features
                        key={key}
                        {...mergedData.features}
                        borderRadius={mergedData.features?.borderRadius || cardBorderRadius}
                    />
                );

            case 'testimonials':
                return (
                    <Testimonials
                        key={key}
                        {...mergedData.testimonials}
                        borderRadius={mergedData.testimonials?.borderRadius || cardBorderRadius}
                    />
                );

            case 'pricing':
                return (
                    <Pricing
                        key={key}
                        {...mergedData.pricing}
                        cardBorderRadius={cardBorderRadius}
                        buttonBorderRadius={buttonBorderRadius}
                    />
                );

            case 'faq':
                return (
                    <Faq
                        key={key}
                        {...mergedData.faq}
                        borderRadius={cardBorderRadius}
                    />
                );

            case 'cta':
                return (
                    <CTASection
                        key={key}
                        {...mergedData.cta}
                        cardBorderRadius={cardBorderRadius}
                        buttonBorderRadius={buttonBorderRadius}
                    />
                );

            case 'services':
                return (
                    <Services
                        key={key}
                        {...mergedData.services}
                        borderRadius={cardBorderRadius}
                    />
                );

            case 'team':
                return (
                    <Team
                        key={key}
                        {...mergedData.team}
                        borderRadius={cardBorderRadius}
                    />
                );

            case 'video':
                return (
                    <Video
                        key={key}
                        {...mergedData.video}
                    />
                );

            case 'slideshow':
                return (
                    <Slideshow
                        key={key}
                        {...mergedData.slideshow}
                        borderRadius={cardBorderRadius}
                    />
                );

            case 'portfolio':
                return (
                    <Portfolio
                        key={key}
                        {...mergedData.portfolio}
                        borderRadius={cardBorderRadius}
                    />
                );

            case 'leads':
                return (
                    <Leads
                        key={key}
                        {...mergedData.leads}
                        cardBorderRadius={mergedData.leads?.cardBorderRadius || cardBorderRadius}
                        buttonBorderRadius={mergedData.leads?.buttonBorderRadius || buttonBorderRadius}
                        projectId={project.id}
                    />
                );

            case 'newsletter':
                return (
                    <Newsletter
                        key={key}
                        {...mergedData.newsletter}
                    />
                );

            case 'howItWorks':
                return (
                    <HowItWorks
                        key={key}
                        {...mergedData.howItWorks}
                        borderRadius={cardBorderRadius}
                    />
                );

            case 'map':
                return (
                    <BusinessMap
                        key={key}
                        {...mergedData.map}
                        borderRadius={cardBorderRadius}
                    />
                );

            case 'menu':
                return (
                    <Menu
                        key={key}
                        {...mergedData.menu}
                        borderRadius={cardBorderRadius}
                    />
                );

            case 'banner':
                return (
                    <Banner
                        key={key}
                        {...mergedData.banner}
                    />
                );

            case 'footer':
                return (
                    <Footer
                        key={key}
                        {...mergedData.footer}
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

            // Non-renderable sections (settings, colors, typography)
            case 'colors':
            case 'typography':
            case 'storeSettings':
            case 'chatbot':
            case 'products': // Legacy products grid - use ProductGridSection instead
                return null;

            default:
                console.warn(`[PageRenderer] Unknown section type: ${section}`);
                return null;
        }
    };

    // Filter and render visible sections
    // Also deduplicate sections (header/footer should only appear once)
    const seenSections = new Set<string>();
    const visibleSections = page.sections.filter(section => {
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

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: theme.pageBackground || globalColors?.background }}
        >
            {visibleSections.map((section, index) => renderSection(section, index))}
        </div>
    );
};

export default PageRenderer;

