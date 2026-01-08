/**
 * ProductHero Component
 * Hero banner for featuring products with multiple layout options
 * 
 * Layouts:
 * - split: Split layout with image on the left
 * - split-right: Split layout with image on the right
 * - full: Full width background with overlay
 * - centered: Centered content with product card
 */

import React from 'react';
import { ArrowRight, ShoppingCart, Star, Check } from 'lucide-react';
import { ProductHeroData } from '../../../types/components';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeEditor } from '../../../contexts/EditorContext';
import { useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';

interface ProductHeroProps {
    data: ProductHeroData;
    storeId?: string;
    onProductClick?: (productSlug: string) => void;
    onCollectionClick?: (collectionSlug: string) => void;
    onAddToCart?: (productId: string) => void;
}

const ProductHero: React.FC<ProductHeroProps> = ({
    data,
    storeId,
    onProductClick,
    onCollectionClick,
    onAddToCart,
}) => {
    const editorContext = useSafeEditor();
    const effectiveStoreId = storeId || editorContext?.activeProjectId || '';
    
    // Unified colors system
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors);
    
    const { products, isLoading } = usePublicProducts(effectiveStoreId, {
        limitCount: 1,
    });

    // Get featured product if productId is set
    const featuredProduct = React.useMemo(() => {
        if (data.productId) {
            return products.find(p => p.id === data.productId);
        }
        return products[0];
    }, [products, data.productId]);

    // Style helpers
    const getPaddingY = () => {
        const map: Record<string, string> = { none: 'py-0', sm: 'py-8', md: 'py-12', lg: 'py-16', xl: 'py-20' };
        return map[data.paddingY] || 'py-12';
    };

    const getPaddingX = () => {
        const map: Record<string, string> = { none: 'px-0', sm: 'px-4', md: 'px-6', lg: 'px-8', xl: 'px-12' };
        return map[data.paddingX] || 'px-6';
    };

    const getBorderRadius = () => {
        const map: Record<string, string> = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-3xl' };
        return map[data.buttonBorderRadius || 'xl'] || 'rounded-xl';
    };

    const getImageSize = () => {
        const map: Record<string, string> = { 
            small: 'max-w-xs', 
            medium: 'max-w-md', 
            large: 'max-w-lg' 
        };
        return map[data.imageSize || 'medium'] || 'max-w-md';
    };

    const getImageSizeGrid = () => {
        // For split layouts: image column proportions
        const map: Record<string, { image: string, content: string }> = { 
            small: { image: 'lg:col-span-4', content: 'lg:col-span-8' },
            medium: { image: 'lg:col-span-5', content: 'lg:col-span-7' },
            large: { image: 'lg:col-span-6', content: 'lg:col-span-6' },
        };
        return map[data.imageSize || 'medium'] || map.medium;
    };

    // Helper to navigate to product - uses callback if available, otherwise direct hash navigation
    const navigateToProduct = (slugOrId: string) => {
        if (onProductClick) {
            onProductClick(slugOrId);
        } else {
            // Fallback: Direct hash navigation for editor preview or when callback not provided
            window.location.hash = `store/product/${slugOrId}`;
        }
    };

    const handleButtonClick = () => {
        // Check if buttonUrl is a custom URL (not a generic store link)
        // Generic links like '/tienda', '#products', '' are treated as "navigate to product"
        const isCustomUrl = data.buttonUrl && 
            !['#products', '#store', '#tienda', '/tienda', ''].includes(data.buttonUrl.toLowerCase());
        
        if (isCustomUrl) {
            window.location.href = data.buttonUrl!;
        } else if (featuredProduct?.slug) {
            // Navigate to the featured product (whether explicitly set via productId or default first product)
            navigateToProduct(featuredProduct.slug);
        } else if (featuredProduct?.id) {
            // Fallback: use product ID if no slug available
            navigateToProduct(featuredProduct.id);
        } else if (data.collectionId) {
            onCollectionClick?.(data.collectionId);
        }
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (featuredProduct?.id) {
            onAddToCart?.(featuredProduct.id);
        }
    };

    const handleProductClick = () => {
        if (featuredProduct?.slug) {
            navigateToProduct(featuredProduct.slug);
        } else if (featuredProduct?.id) {
            navigateToProduct(featuredProduct.id);
        }
    };

    // Shared product info component
    const renderProductInfo = (showImage = true) => {
        if (!featuredProduct) return null;

        const showPrice = data.showPrice !== false;
        const showDescription = data.showDescription !== false;

        return (
            <div 
                className={`flex flex-col cursor-pointer ${showImage ? '' : 'items-center text-center'}`}
                onClick={handleProductClick}
            >
                {/* Badge */}
                {data.showBadge && data.badgeText && (
                    <span
                        className={`inline-block w-fit px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                        style={{
                            backgroundColor: colors?.badgeBackground || '#ef4444',
                            color: colors?.badgeText || '#ffffff',
                        }}
                    >
                        {data.badgeText}
                    </span>
                )}

                {/* Product Name as Headline */}
                <h1
                    className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
                    style={{ color: colors?.heading }}
                >
                    {data.headline || featuredProduct.name}
                </h1>

                {/* Description */}
                {showDescription && (data.subheadline || featuredProduct.description) && (
                    <p
                        className="text-base md:text-lg mb-4 max-w-2xl opacity-90"
                        style={{ color: colors?.text }}
                    >
                        {data.subheadline || featuredProduct.description}
                    </p>
                )}

                {/* Features */}
                {data.showFeatures !== false && featuredProduct.features && featuredProduct.features.length > 0 && (
                    <ul className="mb-6 space-y-2">
                        {featuredProduct.features.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2" style={{ color: colors?.text }}>
                                <Check size={16} style={{ color: colors?.accent || colors?.buttonBackground }} />
                                <span className="text-sm">{feature}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Price */}
                {showPrice && (
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl font-bold" style={{ color: colors?.heading }}>
                            ${featuredProduct.price.toFixed(2)}
                        </span>
                        {featuredProduct.compareAtPrice && featuredProduct.compareAtPrice > featuredProduct.price && (
                            <span className="text-xl line-through opacity-60" style={{ color: colors?.text }}>
                                ${featuredProduct.compareAtPrice.toFixed(2)}
                            </span>
                        )}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex flex-wrap gap-3">
                    {data.buttonText && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleButtonClick(); }}
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: colors?.buttonBackground || '#6366f1',
                                color: colors?.buttonText || '#ffffff',
                            }}
                        >
                            {data.buttonText}
                            <ArrowRight size={20} />
                        </button>
                    )}

                    {data.showAddToCartButton && (
                        <button
                            onClick={handleAddToCart}
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90`}
                            style={{
                                backgroundColor: colors?.addToCartBackground || colors?.accent || '#10B981',
                                color: colors?.addToCartText || colors?.buttonText || '#ffffff',
                            }}
                        >
                            <ShoppingCart size={20} />
                            {data.addToCartButtonText || 'Añadir al carrito'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Render product image
    const renderProductImage = (className = '') => {
        const imageUrl = featuredProduct?.image || data.backgroundImageUrl;
        if (!imageUrl) {
            // Placeholder
            return (
                <div 
                    className={`bg-gray-200 rounded-2xl flex items-center justify-center ${className}`}
                    style={{ aspectRatio: '1' }}
                >
                    <span className="text-gray-400 text-sm">1200 × 600</span>
                </div>
            );
        }
        
        return (
            <img
                src={imageUrl}
                alt={featuredProduct?.name || 'Product'}
                className={`w-full h-full object-cover rounded-2xl shadow-lg ${className}`}
                onClick={handleProductClick}
                style={{ cursor: 'pointer' }}
            />
        );
    };

    // Layout: Split (Image Left)
    const renderSplit = () => {
        const gridCols = getImageSizeGrid();
        
        return (
            <div
                className={`${getPaddingY()} ${getPaddingX()}`}
                style={{ backgroundColor: colors?.background }}
            >
                <div className="max-w-7xl mx-auto">
                    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center`}>
                        {/* Image Side (Left) */}
                        <div className={`${gridCols.image} order-1`}>
                            <div className={`${getImageSize()} mx-auto lg:mx-0`}>
                                {renderProductImage()}
                            </div>
                        </div>

                        {/* Content Side (Right) */}
                        <div className={`${gridCols.content} order-2`}>
                            {renderProductInfo(true)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Layout: Split Right (Image Right)
    const renderSplitRight = () => {
        const gridCols = getImageSizeGrid();
        
        return (
            <div
                className={`${getPaddingY()} ${getPaddingX()}`}
                style={{ backgroundColor: colors?.background }}
            >
                <div className="max-w-7xl mx-auto">
                    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center`}>
                        {/* Content Side (Left) */}
                        <div className={`${gridCols.content} order-2 lg:order-1`}>
                            {renderProductInfo(true)}
                        </div>

                        {/* Image Side (Right) */}
                        <div className={`${gridCols.image} order-1 lg:order-2`}>
                            <div className={`${getImageSize()} mx-auto lg:ml-auto lg:mr-0`}>
                                {renderProductImage()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Layout: Full Width
    const renderFull = () => {
        const imageUrl = featuredProduct?.image || data.backgroundImageUrl;
        
        return (
            <div
                className="relative overflow-hidden"
                style={{
                    minHeight: '400px',
                    backgroundColor: colors?.background,
                }}
            >
                {/* Background Image */}
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}

                {/* Overlay */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(to right, ${colors?.overlayColor || colors?.background}dd, ${colors?.overlayColor || colors?.background}66)`,
                    }}
                />

                {/* Content */}
                <div className={`relative ${getPaddingY()} ${getPaddingX()}`}>
                    <div className="max-w-7xl mx-auto">
                        <div className="max-w-2xl">
                            {renderProductInfo(false)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Layout: Centered
    const renderCentered = () => {
        return (
            <div
                className={`${getPaddingY()} ${getPaddingX()}`}
                style={{ backgroundColor: colors?.background }}
            >
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col items-center text-center">
                        {/* Product Image */}
                        <div className={`${getImageSize()} w-full mb-8`}>
                            {renderProductImage()}
                        </div>

                        {/* Product Info - Centered */}
                        <div className="flex flex-col items-center">
                            {/* Badge */}
                            {data.showBadge && data.badgeText && (
                                <span
                                    className={`inline-block px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                                    style={{
                                        backgroundColor: colors?.badgeBackground || '#ef4444',
                                        color: colors?.badgeText || '#ffffff',
                                    }}
                                >
                                    {data.badgeText}
                                </span>
                            )}

                            {/* Headline */}
                            <h1
                                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
                                style={{ color: colors?.heading }}
                            >
                                {data.headline || featuredProduct?.name || 'Featured Product'}
                            </h1>

                            {/* Description */}
                            {data.showDescription !== false && (data.subheadline || featuredProduct?.description) && (
                                <p
                                    className="text-base md:text-lg mb-6 max-w-xl opacity-90"
                                    style={{ color: colors?.text }}
                                >
                                    {data.subheadline || featuredProduct?.description}
                                </p>
                            )}

                            {/* Price */}
                            {data.showPrice !== false && featuredProduct && (
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-3xl font-bold" style={{ color: colors?.heading }}>
                                        ${featuredProduct.price.toFixed(2)}
                                    </span>
                                    {featuredProduct.compareAtPrice && featuredProduct.compareAtPrice > featuredProduct.price && (
                                        <span className="text-xl line-through opacity-60" style={{ color: colors?.text }}>
                                            ${featuredProduct.compareAtPrice.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-wrap justify-center gap-3">
                                {data.buttonText && (
                                    <button
                                        onClick={handleButtonClick}
                                        className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                                        style={{
                                            backgroundColor: colors?.buttonBackground || '#6366f1',
                                            color: colors?.buttonText || '#ffffff',
                                        }}
                                    >
                                        {data.buttonText}
                                        <ArrowRight size={20} />
                                    </button>
                                )}

                                {data.showAddToCartButton && featuredProduct && (
                                    <button
                                        onClick={handleAddToCart}
                                        className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90`}
                                        style={{
                                            backgroundColor: colors?.addToCartBackground || colors?.accent || '#10B981',
                                            color: colors?.addToCartText || colors?.buttonText || '#ffffff',
                                        }}
                                    >
                                        <ShoppingCart size={20} />
                                        {data.addToCartButtonText || 'Añadir al carrito'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div
                className={`animate-pulse ${getPaddingY()} ${getPaddingX()}`}
                style={{ backgroundColor: colors?.background }}
            >
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className="aspect-square bg-gray-200 rounded-2xl" />
                        <div className="space-y-4">
                            <div className="h-6 w-24 bg-gray-200 rounded" />
                            <div className="h-12 w-3/4 bg-gray-200 rounded" />
                            <div className="h-6 w-full bg-gray-200 rounded" />
                            <div className="h-10 w-32 bg-gray-200 rounded" />
                            <div className="h-12 w-48 bg-gray-200 rounded" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default to 'split' if layout is not defined
    const layout = data.layout || 'split';
    
    // Debug log - remove after testing
    console.log('[ProductHero] Layout value:', layout, '| data.layout:', data.layout);
    
    switch (layout) {
        case 'split':
            return renderSplit();
        case 'split-right':
            return renderSplitRight();
        case 'full':
            return renderFull();
        case 'centered':
            return renderCentered();
        default:
            // Fallback for legacy layouts
            if (layout === 'single' || layout === 'carousel') {
                return renderFull();
            }
            return renderSplit();
    }
};

export default ProductHero;
