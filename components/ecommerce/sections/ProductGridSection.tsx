/**
 * ProductGridSection Component
 * 
 * A section component that renders a grid of all products.
 * Used for the main store page.
 */

import React from 'react';
import ProductSearchPage from '../search/ProductSearchPage';

interface ProductGridSectionProps {
    /** Store ID for loading products */
    storeId: string;
    /** Title for the section */
    title?: string;
    /** Primary accent color */
    primaryColor?: string;
    /** Custom colors for the section */
    themeColors?: {
        background?: string;
        text?: string;
        heading?: string;
        cardBackground?: string;
        cardText?: string;
        border?: string;
        priceColor?: string;
        salePriceColor?: string;
        mutedText?: string;
    };
    /** Store display settings */
    showFilterSidebar?: boolean;
    showSearchBar?: boolean;
    showSortOptions?: boolean;
    showViewModeToggle?: boolean;
    defaultViewMode?: 'grid' | 'list';
    productsPerPage?: number;
    gridColumns?: number;
    cardStyle?: 'minimal' | 'modern' | 'classic' | 'bordered';
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    cardGap?: 'sm' | 'md' | 'lg' | 'xl';
    paddingY?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    paddingX?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    /** Navigation callback */
    onProductClick?: (productSlug: string) => void;
}

/**
 * ProductGridSection
 * 
 * Renders a full product listing page within the page architecture.
 */
const ProductGridSection: React.FC<ProductGridSectionProps> = ({
    storeId,
    title = 'Tienda',
    primaryColor = '#6366f1',
    themeColors,
    showFilterSidebar = true,
    showSearchBar = true,
    showSortOptions = true,
    showViewModeToggle = true,
    defaultViewMode = 'grid',
    productsPerPage = 12,
    gridColumns = 4,
    cardStyle = 'modern',
    borderRadius = 'xl',
    cardGap = 'md',
    paddingY = 'md',
    paddingX = 'md',
    onProductClick = (slug) => window.location.href = `/producto/${slug}`,
}) => {
    return (
        <section id="product-grid" className="product-grid-section">
            <ProductSearchPage
                storeId={storeId}
                onProductClick={onProductClick}
                primaryColor={primaryColor}
                embedded={true}
                title={title}
                showFilterSidebar={showFilterSidebar}
                showSearchBar={showSearchBar}
                showSortOptions={showSortOptions}
                showViewModeToggle={showViewModeToggle}
                defaultViewMode={defaultViewMode}
                productsPerPage={productsPerPage}
                gridColumns={gridColumns}
                cardStyle={cardStyle}
                borderRadius={borderRadius}
                cardGap={cardGap}
                paddingY={paddingY}
                paddingX={paddingX}
                themeColors={themeColors}
            />
        </section>
    );
};

export default ProductGridSection;

