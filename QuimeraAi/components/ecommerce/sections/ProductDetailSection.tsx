/**
 * ProductDetailSection Component
 * 
 * A section component that renders a product detail page.
 * Used in dynamic pages with dynamicSource: 'products'
 * 
 * This component wraps ProductDetailPage to work within the page-based architecture,
 * accepting the product data as a prop (pre-fetched for SSR) or loading it client-side.
 */

import React from 'react';
import { Product } from '../../../types';
import ProductDetailPage from '../ProductDetailPage';
import { useSafeStorefrontCart } from '../context';
import { PublicProduct, PublicProductVariant } from '../hooks/usePublicProduct';

interface ProductDetailSectionProps {
    /** Store ID for loading product data */
    storeId: string;
    /** Product slug from URL params */
    productSlug?: string;
    /** Pre-loaded product data (for SSR) */
    product?: Product;
    /** Custom colors for the section */
    colors?: {
        background?: string;
        heading?: string;
        text?: string;
        accent?: string;
        priceColor?: string;
        cardBackground?: string;
    };
    /** Navigation callbacks */
    onNavigateToStore?: () => void;
    onNavigateToCategory?: (slug: string) => void;
    onNavigateToProduct?: (slug: string) => void;
    /** Add to cart callback - if not provided, uses cart context */
    onAddToCart?: (product: PublicProduct, quantity: number, variant?: PublicProductVariant) => void;
}

/**
 * ProductDetailSection
 * 
 * Renders a full product detail view within the page architecture.
 * Supports both SSR (pre-loaded product) and CSR (client-side fetch) modes.
 */
const ProductDetailSection: React.FC<ProductDetailSectionProps> = ({
    storeId,
    productSlug,
    product: preloadedProduct,
    colors,
    onNavigateToStore = () => window.location.href = '/tienda',
    onNavigateToCategory = (slug) => window.location.href = `/categoria/${slug}`,
    onNavigateToProduct = (slug) => window.location.href = `/producto/${slug}`,
    onAddToCart,
}) => {
    // Use cart context if available (safe version returns no-op when not in provider)
    const cart = useSafeStorefrontCart();
    
    // Use provided onAddToCart or fallback to cart context
    const handleAddToCart = onAddToCart || ((product, quantity, variant) => cart.addItem(product, quantity, variant));
    
    if (!productSlug && !preloadedProduct) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-lg text-gray-500">Producto no especificado</p>
            </div>
        );
    }

    return (
        <section id="product-detail" className="product-detail-section">
            <ProductDetailPage
                storeId={storeId}
                productSlug={productSlug || preloadedProduct?.slug || ''}
                onNavigateToStore={onNavigateToStore}
                onNavigateToCategory={onNavigateToCategory}
                onNavigateToProduct={onNavigateToProduct}
                onAddToCart={handleAddToCart}
                colors={colors}
            />
        </section>
    );
};

export default ProductDetailSection;

