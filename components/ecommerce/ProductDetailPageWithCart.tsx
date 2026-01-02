/**
 * ProductDetailPageWithCart
 * Wrapper that connects ProductDetailPage with the storefront cart context
 */

import React from 'react';
import ProductDetailPage from './ProductDetailPage';
import { useStorefrontCart } from './context';
import { PublicProduct, PublicProductVariant } from './hooks/usePublicProduct';

interface ProductDetailPageWithCartProps {
    storeId: string;
    productSlug: string;
    onNavigateToStore?: () => void;
    onNavigateToCategory?: (categorySlug: string) => void;
    onNavigateToProduct?: (productSlug: string) => void;
}

const ProductDetailPageWithCart: React.FC<ProductDetailPageWithCartProps> = ({
    storeId,
    productSlug,
    onNavigateToStore,
    onNavigateToCategory,
    onNavigateToProduct,
}) => {
    const cart = useStorefrontCart();

    const handleAddToCart = (
        product: PublicProduct,
        quantity: number,
        variant?: PublicProductVariant
    ) => {
        cart.addItem(product, quantity, variant);
    };

    return (
        <ProductDetailPage
            storeId={storeId}
            productSlug={productSlug}
            onNavigateToStore={onNavigateToStore}
            onNavigateToCategory={onNavigateToCategory}
            onNavigateToProduct={onNavigateToProduct}
            onAddToCart={handleAddToCart}
        />
    );
};

export default ProductDetailPageWithCart;











