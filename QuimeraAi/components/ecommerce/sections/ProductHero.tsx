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
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import { createProductCardViewModel } from '../../../utils/productCard';
import { filterRenderableStorefrontProducts } from '../../../utils/ecommerce/productDisplayGuards';
import {
    getStorefrontContentPositionClass,
    getStorefrontOverlayBackground,
    getStorefrontPaddingXClass,
    getStorefrontPaddingYClass,
    getStorefrontRadiusClass,
    getStorefrontSectionBackgroundStyle,
    getStorefrontTextAlignmentClass,
} from './sectionVisualStyles';
import {
    buildStorefrontCatalogUrl,
    isGenericStorefrontCatalogLink,
} from '../../../utils/storefrontRouter';

interface ProductHeroProps {
    data: ProductHeroData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    onProductClick?: (productSlug: string) => void;
    onCollectionClick?: (collectionSlug: string) => void;
    onAddToCart?: (productId: string) => void;
    onNavigate?: (href: string) => void;
}

const ProductHero: React.FC<ProductHeroProps> = ({
    data,
    storeId,
    globalColors,
    onProductClick,
    onCollectionClick,
    onAddToCart,
    onNavigate,
}) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const productListUrl = buildStorefrontCatalogUrl(effectiveStoreId);
    const websiteCatalogPath = '/tienda/productos';
    const heroSource = data.sourceType || (data.collectionId ? 'collection' : data.productId ? 'product' : 'featured');
    
    // Unified colors system
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);
    
    const { products, isLoading } = usePublicProducts(effectiveStoreId, {
        productIds: heroSource === 'product' && data.productId ? [data.productId] : undefined,
        categoryId: heroSource === 'collection' && data.collectionId ? data.collectionId : undefined,
        limitCount: 1,
    });

    // Get featured product if productId is set
    const featuredProduct = React.useMemo(() => {
        const renderableProducts = filterRenderableStorefrontProducts(products);

        if (heroSource === 'product' && data.productId) {
            return renderableProducts.find(p => p.id === data.productId);
        }
        return renderableProducts[0];
    }, [products, data.productId, heroSource]);
    const featuredProductCard = React.useMemo(() => (
        featuredProduct
            ? createProductCardViewModel(featuredProduct, {
                currencySymbol: '$',
                showFeaturedBadge: false,
            })
            : undefined
    ), [featuredProduct]);

    // Style helpers
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'lg');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'md');
    const getButtonRadius = () => getStorefrontRadiusClass(data.buttonBorderRadius, 'xl');
    const getSectionRadius = () => getStorefrontRadiusClass(data.borderRadius || data.buttonBorderRadius, 'xl');
    const getHeadlineSize = () => {
        const map: Record<string, string> = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl' };
        return map[data.headlineFontSize || 'xl'] || 'text-5xl';
    };
    const getSubheadlineSize = () => {
        const map: Record<string, string> = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.subheadlineFontSize || 'md'] || 'text-base';
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

    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'left');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'left');
    const getOverlayBackground = () => getStorefrontOverlayBackground(data.overlayStyle, (colors as any)?.overlayColor || colors?.background, data.overlayOpacity);
    const getResponsiveSectionClass = () => data.responsiveBehavior === 'hide' ? 'hidden md:block' : '';
    const getSplitLayoutClass = () => data.responsiveBehavior === 'scroll'
        ? 'flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2 lg:grid lg:grid-cols-12 lg:gap-12 lg:overflow-visible lg:pb-0'
        : 'grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12';
    const getSplitItemClass = () => data.responsiveBehavior === 'scroll'
        ? 'min-w-[78vw] snap-start lg:min-w-0'
        : '';

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
        const buttonUrl = data.buttonUrl?.trim();
        if (buttonUrl && isGenericStorefrontCatalogLink(buttonUrl)) {
            if (onNavigate) {
                onNavigate(websiteCatalogPath);
            } else {
                window.location.href = productListUrl;
            }
            return;
        }

        // Check if buttonUrl is a custom URL (not a generic store link)
        // Generic links like '/tienda', '#products', '' are treated as "navigate to product"
        const isCustomUrl = buttonUrl && !isGenericStorefrontCatalogLink(buttonUrl);
        
        if (isCustomUrl) {
            if (onNavigate) {
                onNavigate(buttonUrl);
            } else {
                window.location.href = buttonUrl;
            }
        } else if (featuredProduct?.slug) {
            // Navigate to the featured product (whether explicitly set via productId or default first product)
            navigateToProduct(featuredProduct.slug);
        } else if (featuredProduct?.id) {
            // Fallback: use product ID if no slug available
            navigateToProduct(featuredProduct.id);
        } else if (data.collectionId) {
            onCollectionClick?.(data.collectionId);
        } else {
            if (onNavigate) {
                onNavigate(productListUrl);
            } else {
                window.location.href = productListUrl;
            }
        }
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (featuredProduct?.id && featuredProductCard?.isRenderable) {
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
        const showPrice = data.showPrice !== false;
        const showDescription = data.showDescription !== false;
        const headline = data.headline || featuredProduct?.name || 'Producto destacado';
        const description = data.subheadline || featuredProduct?.description || 'Presenta tu producto principal con una experiencia visual lista para comprar.';
        const features = Array.isArray((featuredProduct as any)?.features)
            ? (featuredProduct as any).features
            : [];

        return (
            <div 
                className={`flex flex-col cursor-pointer ${showImage ? '' : getTextAlignment()}`}
                onClick={handleProductClick}
            >
                {/* Badge */}
                {data.showBadge && data.badgeText && (
                    <span
                        className={`inline-block w-fit px-4 py-1 ${getButtonRadius()} text-sm font-semibold mb-4`}
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
                    className={`${getHeadlineSize()} font-bold mb-4`}
                    style={{ color: colors?.heading }}
                >
                    {headline}
                </h1>

                {/* Description */}
                {showDescription && description && (
                    <p
                        className={`${getSubheadlineSize()} mb-4 max-w-2xl opacity-90`}
                        style={{ color: colors?.text }}
                    >
                        {description}
                    </p>
                )}

                {/* Features */}
                {data.showFeatures !== false && features.length > 0 && (
                    <ul className="mb-6 space-y-2">
                        {features.slice(0, 4).map((feature: any, idx: number) => (
                            <li key={idx} className="flex items-center gap-2" style={{ color: colors?.text }}>
                                <Check size={16} style={{ color: colors?.accent || colors?.buttonBackground }} />
                                <span className="text-sm">{feature}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Price */}
                {showPrice && featuredProductCard?.displayPrice && (
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl font-bold" style={{ color: colors?.heading }}>
                            {featuredProductCard.displayPrice}
                        </span>
                        {featuredProductCard.hasDiscount && featuredProductCard.displayCompareAtPrice && (
                            <span className="text-xl line-through opacity-60" style={{ color: colors?.text }}>
                                {featuredProductCard.displayCompareAtPrice}
                            </span>
                        )}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex flex-wrap gap-3">
                    {data.buttonText && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleButtonClick(); }}
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getButtonRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: colors?.buttonBackground || '#6366f1',
                                color: colors?.buttonText || '#ffffff',
                            }}
                        >
                            {data.buttonText}
                            <ArrowRight size={20} />
                        </button>
                    )}

                    {data.showAddToCartButton && featuredProductCard?.isRenderable && (
                        <button
                            onClick={handleAddToCart}
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getButtonRadius()} font-semibold transition-all hover:opacity-90`}
                            style={{
                                backgroundColor: (colors as any)?.addToCartBackground || colors?.accent || '#10B981',
                                color: (colors as any)?.addToCartText || colors?.buttonText || '#ffffff',
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
                    className={`bg-gray-200 ${getSectionRadius()} flex items-center justify-center ${className}`}
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
                className={`w-full h-full object-cover ${getSectionRadius()} shadow-lg ${className}`}
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
                className={`${getResponsiveSectionClass()} ${getPaddingY()} ${getPaddingX()}`}
                style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
            >
                <div className="max-w-7xl mx-auto">
                    <div className={`${getSplitLayoutClass()} items-center`}>
                        {/* Image Side (Left) */}
                        <div className={`${gridCols.image} ${getSplitItemClass()} order-1`}>
                            <div className={`${getImageSize()} mx-auto lg:mx-0`}>
                                {renderProductImage()}
                            </div>
                        </div>

                        {/* Content Side (Right) */}
                        <div className={`${gridCols.content} ${getSplitItemClass()} order-2`}>
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
                className={`${getResponsiveSectionClass()} ${getPaddingY()} ${getPaddingX()}`}
                style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
            >
                <div className="max-w-7xl mx-auto">
                    <div className={`${getSplitLayoutClass()} items-center`}>
                        {/* Content Side (Left) */}
                        <div className={`${gridCols.content} ${getSplitItemClass()} order-2 lg:order-1`}>
                            {renderProductInfo(true)}
                        </div>

                        {/* Image Side (Right) */}
                        <div className={`${gridCols.image} ${getSplitItemClass()} order-1 lg:order-2`}>
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
        const imageUrl = data.backgroundImageUrl || featuredProduct?.image;
        
        return (
            <div
                className={`${getResponsiveSectionClass()} relative overflow-hidden ${getSectionRadius()}`}
                style={{
                    ...getStorefrontSectionBackgroundStyle(data, colors?.background),
                    minHeight: `${data.height || 520}px`,
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
                    style={{ background: getOverlayBackground() }}
                />

                {/* Content */}
                <div
                    className={`relative flex ${getPaddingY()} ${getPaddingX()} ${getContentPosition()}`}
                    style={{ minHeight: `${data.height || 520}px` }}
                >
                    <div className={`flex w-full max-w-7xl mx-auto ${getContentPosition()}`}>
                        <div className={`max-w-2xl flex flex-col ${getTextAlignment()}`}>
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
                className={`${getResponsiveSectionClass()} ${getPaddingY()} ${getPaddingX()}`}
                style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
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
                                    className={`inline-block px-4 py-1 ${getButtonRadius()} text-sm font-semibold mb-4`}
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
                                className={`${getHeadlineSize()} font-bold mb-4`}
                                style={{ color: colors?.heading }}
                            >
                                {data.headline || featuredProduct?.name || 'Featured Product'}
                            </h1>

                            {/* Description */}
                            {data.showDescription !== false && (data.subheadline || featuredProduct?.description) && (
                                <p
                                    className={`${getSubheadlineSize()} mb-6 max-w-xl opacity-90`}
                                    style={{ color: colors?.text }}
                                >
                                    {data.subheadline || featuredProduct?.description}
                                </p>
                            )}

                            {/* Price */}
                            {data.showPrice !== false && featuredProductCard?.displayPrice && (
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-3xl font-bold" style={{ color: colors?.heading }}>
                                        {featuredProductCard.displayPrice}
                                    </span>
                                    {featuredProductCard.hasDiscount && featuredProductCard.displayCompareAtPrice && (
                                        <span className="text-xl line-through opacity-60" style={{ color: colors?.text }}>
                                            {featuredProductCard.displayCompareAtPrice}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex flex-wrap justify-center gap-3">
                                {data.buttonText && (
                                    <button
                                        onClick={handleButtonClick}
                                    className={`inline-flex items-center gap-2 px-6 py-3 ${getButtonRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                                        style={{
                                            backgroundColor: colors?.buttonBackground || '#6366f1',
                                            color: colors?.buttonText || '#ffffff',
                                        }}
                                    >
                                        {data.buttonText}
                                        <ArrowRight size={20} />
                                    </button>
                                )}

                                {data.showAddToCartButton && featuredProductCard?.isRenderable && (
                                    <button
                                        onClick={handleAddToCart}
                                        className={`inline-flex items-center gap-2 px-6 py-3 ${getButtonRadius()} font-semibold transition-all hover:opacity-90`}
                                        style={{
                                            backgroundColor: (colors as any)?.addToCartBackground || colors?.accent || '#10B981',
                                            color: (colors as any)?.addToCartText || colors?.buttonText || '#ffffff',
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
                style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
            >
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div className={`aspect-square bg-gray-200 ${getSectionRadius()}`} />
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
