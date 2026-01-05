/**
 * PageRenderer Component
 * 
 * Renders a single page with its configured sections.
 * This is the core rendering component for the multi-page architecture.
 * 
 * It renders sections in order, applying the page's sectionData and
 * project theme to each section component.
 */

import React, { useMemo } from 'react';
import { Project, SitePage } from '../types/project';
import { PageData, ThemeData, PageSection } from '../types';
import { DynamicData, PublicProduct, PublicCategory } from '../utils/metaGenerator';

// Import section components
import Header from './Header';
import Hero from './Hero';
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
    // Merge page section data with project data
    const mergedData = useMemo((): PageData => {
        return {
            ...project.data,
            ...page.sectionData,
        } as PageData;
    }, [project.data, page.sectionData]);
    
    const theme = project.theme;
    const globalColors = theme.globalColors;
    
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
    
    // Build header links from navigation pages
    const navigationLinks = useMemo(() => {
        if (!project.pages || project.pages.length === 0) {
            return mergedData.header?.links || [];
        }
        
        return project.pages
            .filter(p => p.showInNavigation)
            .sort((a, b) => (a.navigationOrder || 0) - (b.navigationOrder || 0))
            .map(p => ({
                text: p.title,
                href: p.slug,
            }));
    }, [project.pages, mergedData.header?.links]);
    
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
        
        switch (section) {
            case 'header':
                return (
                    <Header
                        key={key}
                        data={{
                            ...mergedData.header,
                            links: navigationLinks,
                        }}
                        theme={theme}
                        storefrontProducts={storefrontProducts}
                        isPreviewMode={isPreview}
                    />
                );
                
            case 'hero':
                return (
                    <Hero
                        key={key}
                        data={mergedData.hero}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'heroSplit':
                return (
                    <HeroSplit
                        key={key}
                        data={mergedData.heroSplit}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'features':
                return (
                    <Features
                        key={key}
                        data={mergedData.features}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'testimonials':
                return (
                    <Testimonials
                        key={key}
                        data={mergedData.testimonials}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'pricing':
                return (
                    <Pricing
                        key={key}
                        data={mergedData.pricing}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'faq':
                return (
                    <Faq
                        key={key}
                        data={mergedData.faq}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'cta':
                return (
                    <CTASection
                        key={key}
                        data={mergedData.cta}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'services':
                return (
                    <Services
                        key={key}
                        data={mergedData.services}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'team':
                return (
                    <Team
                        key={key}
                        data={mergedData.team}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'video':
                return (
                    <Video
                        key={key}
                        data={mergedData.video}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'slideshow':
                return (
                    <Slideshow
                        key={key}
                        data={mergedData.slideshow}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'portfolio':
                return (
                    <Portfolio
                        key={key}
                        data={mergedData.portfolio}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'leads':
                return (
                    <Leads
                        key={key}
                        data={mergedData.leads}
                        theme={theme}
                        globalColors={globalColors}
                        projectId={project.id}
                    />
                );
                
            case 'newsletter':
                return (
                    <Newsletter
                        key={key}
                        data={mergedData.newsletter}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'howItWorks':
                return (
                    <HowItWorks
                        key={key}
                        data={mergedData.howItWorks}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'map':
                return (
                    <BusinessMap
                        key={key}
                        data={mergedData.map}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'menu':
                return (
                    <Menu
                        key={key}
                        data={mergedData.menu}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'banner':
                return (
                    <Banner
                        key={key}
                        data={mergedData.banner}
                        theme={theme}
                        globalColors={globalColors}
                    />
                );
                
            case 'footer':
                return (
                    <Footer
                        key={key}
                        data={mergedData.footer}
                        theme={theme}
                        globalColors={globalColors}
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
    const visibleSections = page.sections.filter(section => {
        // Filter out non-renderable sections
        return !['colors', 'typography', 'storeSettings'].includes(section);
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

