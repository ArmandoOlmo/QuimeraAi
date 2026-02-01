/**
 * StorefrontHome Component
 * 
 * Renders the Storefront Homepage based on the user's project configuration (`componentOrder`).
 * If components are configured, it renders them in order.
 * If no components are configured, it falls back to a default layout or empty state.
 */

import React, { useMemo } from 'react';
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
} from '../sections';
import ProductSearchPage from '../search/ProductSearchPage';
import { Project } from '../../../types';
import { deriveColorsFromPalette } from '../../../utils/colorUtils'; // Adjust path if needed

interface ThemeColors {
    background?: string;
    text?: string;
    heading?: string;
    cardBackground?: string;
    cardText?: string;
    border?: string;
    priceColor?: string;
    salePriceColor?: string;
    mutedText?: string;
}

interface StorefrontHomeProps {
    storeId: string;
    projectData: Project;
    onNavigateToProduct: (slug: string) => void;
    onNavigateToCategory: (slug: string) => void;
    themeColors: ThemeColors;
}

const StorefrontHome: React.FC<StorefrontHomeProps> = ({
    storeId,
    projectData,
    onNavigateToProduct,
    onNavigateToCategory,
    themeColors
}) => {

    // Map of component keys to React Components
    const COMPONENT_MAP: Record<string, React.FC<any>> = {
        featuredProducts: FeaturedProducts,
        categoryGrid: CategoryGrid,
        productHero: ProductHero,
        saleCountdown: SaleCountdown,
        trustBadges: TrustBadges,
        recentlyViewed: RecentlyViewed,
        productReviews: ProductReviews,
        collectionBanner: CollectionBanner,
        productBundle: ProductBundle,
        announcementBar: AnnouncementBar,
    };

    // Filter component order to only include supported ecommerce sections
    // and check visibility if necessary (though usually 'store' components are visible)
    const sectionsToRender = useMemo(() => {
        if (!projectData?.componentOrder) return [];
        return projectData.componentOrder.filter(key => COMPONENT_MAP[key]);
    }, [projectData]);

    const renderSection = (key: string, index: number) => {
        const Component = COMPONENT_MAP[key];
        if (!Component) return null;

        // Get data for this specific component
        const componentData = projectData.data?.[key] || {};

        // Pass common props
        const commonProps = {
            key: `${key}-${index}`,
            storeId,
            data: componentData,
            onProductClick: onNavigateToProduct,
            onCategoryClick: onNavigateToCategory,
            themeColors,
            // Certain components might need specific props, handled here or inside component default props
        };

        return <Component {...commonProps} />;
    };

    if (sectionsToRender.length === 0) {
        // This case should be handled by StorefrontApp switching to ProductSearchPage,
        // but as a failsafe we can render nothing or a message.
        return null;
    }

    return (
        <div
            className="storefront-home"
            style={{
                backgroundColor: themeColors?.background || '#ffffff',
                color: themeColors?.text || '#0f172a'
            }}
        >
            {sectionsToRender.map((key, index) => renderSection(key, index))}

            {/* Always render the full product search/grid at the bottom for the core ecommerce experience */}
            <div className="container mx-auto px-4 py-8">
                <ProductSearchPage
                    storeId={storeId}
                    // Pass null userId as we are in public view
                    userId={null}
                    embedded={true}
                    // Ensure it receives style props
                    themeColors={themeColors}
                    title="Todos los Productos" // "All Products"
                    showFilterSidebar={true}
                    showSearchBar={true}
                    showSortOptions={true}
                    showViewModeToggle={true}
                    defaultViewMode="grid"
                    gridColumns={4}
                    // Use project primary color if available
                    primaryColor={themeColors.priceColor || '#6366f1'}
                    onProductClick={onNavigateToProduct}
                />
            </div>
        </div>
    );
};

export default StorefrontHome;
