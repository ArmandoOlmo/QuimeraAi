/**
 * ProductHero Component
 * Hero banner for featuring products, collections, or sales
 * 
 * Uses unified storefront colors system
 */

import React from 'react';
import { ArrowRight, ShoppingCart } from 'lucide-react';
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
        const map = { sm: 'py-8', md: 'py-12', lg: 'py-16' };
        return map[data.paddingY] || 'py-12';
    };

    const getPaddingX = () => {
        const map = { sm: 'px-4', md: 'px-6', lg: 'px-8' };
        return map[data.paddingX] || 'px-6';
    };

    const getHeadlineSize = () => {
        const map = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl md:text-6xl' };
        return map[data.headlineFontSize || 'xl'] || 'text-5xl';
    };

    const getSubheadlineSize = () => {
        const map = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.subheadlineFontSize || 'md'] || 'text-base';
    };

    const getBorderRadius = () => {
        const map = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-3xl' };
        return map[data.buttonBorderRadius || 'xl'] || 'rounded-xl';
    };

    const getContentPosition = () => {
        const map = {
            left: 'items-start text-left',
            center: 'items-center text-center',
            right: 'items-end text-right',
        };
        return map[data.contentPosition] || 'items-start text-left';
    };

    const getOverlayStyle = () => {
        if (data.overlayStyle === 'none') return 'transparent';
        if (data.overlayStyle === 'solid') {
            return `${colors.overlayEnd}${Math.round((data.overlayOpacity / 100) * 255).toString(16).padStart(2, '0')}`;
        }
        // Gradient
        const opacity = data.overlayOpacity / 100;
        return `linear-gradient(to right, ${colors.overlayEnd}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, transparent)`;
    };

    const handleButtonClick = () => {
        if (data.buttonUrl) {
            window.location.href = data.buttonUrl;
        } else if (data.productId && featuredProduct?.slug) {
            onProductClick?.(featuredProduct.slug);
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

    // Render single layout
    const renderSingle = () => (
        <div
            className="relative overflow-hidden"
            style={{
                height: `${data.height || 500}px`,
                backgroundColor: colors.background,
            }}
        >
            {/* Background Image */}
            {data.backgroundImageUrl && (
                <img
                    src={data.backgroundImageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* Overlay */}
            {data.overlayStyle !== 'none' && (
                <div
                    className="absolute inset-0"
                    style={{
                        background: getOverlayStyle(),
                    }}
                />
            )}

            {/* Content */}
            <div className={`relative h-full ${getPaddingX()} ${getPaddingY()}`}>
                <div className={`max-w-7xl mx-auto h-full flex flex-col justify-center ${getContentPosition()}`}>
                    {/* Badge */}
                    {data.showBadge && data.badgeText && (
                        <span
                            className={`inline-block px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                            style={{
                                backgroundColor: colors.badgeBackground,
                                color: colors.badgeText,
                            }}
                        >
                            {data.badgeText}
                        </span>
                    )}

                    {/* Headline */}
                    <h1
                        className={`${getHeadlineSize()} font-bold mb-4 max-w-3xl`}
                        style={{ color: colors.heading }}
                    >
                        {data.headline}
                    </h1>

                    {/* Subheadline */}
                    {data.subheadline && (
                        <p
                            className={`${getSubheadlineSize()} mb-6 max-w-2xl`}
                            style={{ color: colors.text }}
                        >
                            {data.subheadline}
                        </p>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-3">
                        {data.buttonText && (
                            <button
                                onClick={handleButtonClick}
                                className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                                style={{
                                    backgroundColor: colors.buttonBackground,
                                    color: colors.buttonText,
                                }}
                            >
                                {data.buttonText}
                                <ArrowRight size={20} />
                            </button>
                        )}

                        {/* Add to Cart Button */}
                        {data.showAddToCartButton && featuredProduct && (
                            <button
                                onClick={handleAddToCart}
                                className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90`}
                                style={{
                                    backgroundColor: colors.success,
                                    color: colors.buttonText,
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
    );

    // Render split layout
    const renderSplit = () => (
        <div
            className="relative overflow-hidden"
            style={{
                height: `${data.height || 500}px`,
                backgroundColor: colors.background,
            }}
        >
            <div className="h-full grid grid-cols-1 lg:grid-cols-2">
                {/* Content Side */}
                <div className={`flex flex-col justify-center ${getPaddingX()} ${getPaddingY()}`}>
                    {/* Badge */}
                    {data.showBadge && data.badgeText && (
                        <span
                            className={`inline-block w-fit px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                            style={{
                                backgroundColor: colors.badgeBackground,
                                color: colors.badgeText,
                            }}
                        >
                            {data.badgeText}
                        </span>
                    )}

                    <h1
                        className={`${getHeadlineSize()} font-bold mb-4`}
                        style={{ color: colors.heading }}
                    >
                        {data.headline}
                    </h1>

                    {data.subheadline && (
                        <p
                            className={`${getSubheadlineSize()} mb-6`}
                            style={{ color: colors.text }}
                        >
                            {data.subheadline}
                        </p>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-3">
                        {data.buttonText && (
                            <button
                                onClick={handleButtonClick}
                                className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                                style={{
                                    backgroundColor: colors.buttonBackground,
                                    color: colors.buttonText,
                                }}
                            >
                                {data.buttonText}
                                <ArrowRight size={20} />
                            </button>
                        )}

                        {/* Add to Cart Button */}
                        {data.showAddToCartButton && featuredProduct && (
                            <button
                                onClick={handleAddToCart}
                                className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90`}
                                style={{
                                    backgroundColor: colors.success,
                                    color: colors.buttonText,
                                }}
                            >
                                <ShoppingCart size={20} />
                                {data.addToCartButtonText || 'Añadir al carrito'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Image Side */}
                <div className="relative hidden lg:block">
                    {data.backgroundImageUrl && (
                        <img
                            src={data.backgroundImageUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    )}
                </div>
            </div>
        </div>
    );

    // Render carousel layout (with featured product info)
    const renderCarousel = () => (
        <div
            className="relative overflow-hidden"
            style={{
                height: `${data.height || 500}px`,
                backgroundColor: colors.background,
            }}
        >
            {/* Background Image */}
            {data.backgroundImageUrl && (
                <img
                    src={data.backgroundImageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* Overlay */}
            {data.overlayStyle !== 'none' && (
                <div
                    className="absolute inset-0"
                    style={{
                        background: getOverlayStyle(),
                    }}
                />
            )}

            {/* Content */}
            <div className={`relative h-full ${getPaddingX()} ${getPaddingY()}`}>
                <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Text Content */}
                    <div className={`flex flex-col ${getContentPosition()}`}>
                        {data.showBadge && data.badgeText && (
                            <span
                                className={`inline-block w-fit px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                                style={{
                                    backgroundColor: colors.badgeBackground,
                                    color: colors.badgeText,
                                }}
                            >
                                {data.badgeText}
                            </span>
                        )}

                        <h1
                            className={`${getHeadlineSize()} font-bold mb-4`}
                            style={{ color: colors.heading }}
                        >
                            {data.headline}
                        </h1>

                        {data.subheadline && (
                            <p
                                className={`${getSubheadlineSize()} mb-6`}
                                style={{ color: colors.text }}
                            >
                                {data.subheadline}
                            </p>
                        )}

                        {/* Buttons */}
                        <div className="flex flex-wrap gap-3">
                            {data.buttonText && (
                                <button
                                    onClick={handleButtonClick}
                                    className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                                    style={{
                                        backgroundColor: colors.buttonBackground,
                                        color: colors.buttonText,
                                    }}
                                >
                                    {data.buttonText}
                                    <ArrowRight size={20} />
                                </button>
                            )}

                            {/* Add to Cart Button */}
                            {data.showAddToCartButton && featuredProduct && (
                                <button
                                    onClick={handleAddToCart}
                                    className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90`}
                                    style={{
                                        backgroundColor: colors.success || '#10B981',
                                        color: colors.buttonText || '#FFFFFF',
                                    }}
                                >
                                    <ShoppingCart size={20} />
                                    {data.addToCartButtonText || 'Añadir al carrito'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Featured Product Card */}
                    {featuredProduct && (
                        <div
                            className="hidden lg:block backdrop-blur-sm rounded-2xl p-6 cursor-pointer transition-colors"
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                            onClick={() => featuredProduct.slug && onProductClick?.(featuredProduct.slug)}
                        >
                            {featuredProduct.image && (
                                <img
                                    src={featuredProduct.image}
                                    alt={featuredProduct.name}
                                    className="w-full aspect-square object-cover rounded-xl mb-4"
                                />
                            )}
                            <h3 className="text-xl font-semibold mb-2" style={{ color: colors.buttonText }}>{featuredProduct.name}</h3>
                            <div className="flex items-center justify-between">
                                <p className="text-2xl font-bold" style={{ color: colors.buttonText }}>${featuredProduct.price.toFixed(2)}</p>
                                {data.showAddToCartButton && (
                                    <button
                                        onClick={handleAddToCart}
                                        className="p-3 rounded-full transition-colors"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: colors.buttonText }}
                                        title={data.addToCartButtonText || 'Añadir al carrito'}
                                    >
                                        <ShoppingCart size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div
                className="animate-pulse"
                style={{
                    height: `${data.height || 500}px`,
                    backgroundColor: colors.background,
                }}
            >
                <div className="h-full flex flex-col justify-center items-center">
                    <div className="h-8 w-32 rounded mb-4" style={{ backgroundColor: colors.border }} />
                    <div className="h-12 w-96 rounded mb-4" style={{ backgroundColor: colors.border }} />
                    <div className="h-6 w-64 rounded mb-6" style={{ backgroundColor: colors.border }} />
                    <div className="h-12 w-40 rounded" style={{ backgroundColor: colors.border }} />
                </div>
            </div>
        );
    }

    return (
        <>
            {data.layout === 'single' && renderSingle()}
            {data.layout === 'split' && renderSplit()}
            {data.layout === 'carousel' && renderCarousel()}
        </>
    );
};

export default ProductHero;
