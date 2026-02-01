/**
 * CategoryProductsSection Component
 * 
 * A section component that renders a category page with filtered products.
 * Used in dynamic pages with dynamicSource: 'categories'
 * 
 * This component wraps ProductSearchPage to work within the page-based architecture,
 * accepting the category data as a prop (pre-fetched for SSR) or loading it client-side.
 */

import React from 'react';
import { Category } from '../../../types';
import ProductSearchPage from '../search/ProductSearchPage';

interface CategoryProductsSectionProps {
    /** Store ID for loading products */
    storeId: string;
    /** Category slug from URL params */
    categorySlug?: string;
    /** Pre-loaded category data (for SSR) */
    category?: Category;
    /** Title override (uses category name if not provided) */
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
 * CategoryProductsSection
 * 
 * Renders a product listing filtered by category within the page architecture.
 * Supports both SSR (pre-loaded category) and CSR (client-side fetch) modes.
 */
const CategoryProductsSection: React.FC<CategoryProductsSectionProps> = ({
    storeId,
    categorySlug,
    category: preloadedCategory,
    title,
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
    const effectiveCategorySlug = categorySlug || preloadedCategory?.slug;
    const effectiveTitle = title || preloadedCategory?.name || 'Categoría';

    if (!effectiveCategorySlug) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-lg text-gray-500">Categoría no especificada</p>
            </div>
        );
    }

    return (
        <section id="category-products" className="category-products-section">
            <ProductSearchPage
                storeId={storeId}
                onProductClick={onProductClick}
                initialCategory={effectiveCategorySlug}
                primaryColor={primaryColor}
                embedded={true}
                title={effectiveTitle}
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

export default CategoryProductsSection;

