/**
 * ProductHero Component
 * Hero banner for featuring products, collections, or sales
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ProductHeroData } from '../../../types/components';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeEditor } from '../../../contexts/EditorContext';

interface ProductHeroProps {
    data: ProductHeroData;
    storeId?: string;
    onProductClick?: (productSlug: string) => void;
    onCollectionClick?: (collectionSlug: string) => void;
}

const ProductHero: React.FC<ProductHeroProps> = ({
    data,
    storeId,
    onProductClick,
    onCollectionClick,
}) => {
    const editorContext = useSafeEditor();
    const effectiveStoreId = storeId || editorContext?.activeProjectId || '';
    
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
            return `${data.colors.overlayColor}${Math.round((data.overlayOpacity / 100) * 255).toString(16).padStart(2, '0')}`;
        }
        // Gradient
        const opacity = data.overlayOpacity / 100;
        return `linear-gradient(to right, ${data.colors.overlayColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, transparent)`;
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

    // Render single layout
    const renderSingle = () => (
        <div
            className="relative overflow-hidden"
            style={{
                height: `${data.height || 500}px`,
                backgroundColor: data.colors.background,
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
                                backgroundColor: data.colors.badgeBackground,
                                color: data.colors.badgeText,
                            }}
                        >
                            {data.badgeText}
                        </span>
                    )}

                    {/* Headline */}
                    <h1
                        className={`${getHeadlineSize()} font-bold mb-4 max-w-3xl`}
                        style={{ color: data.colors.heading }}
                    >
                        {data.headline}
                    </h1>

                    {/* Subheadline */}
                    {data.subheadline && (
                        <p
                            className={`${getSubheadlineSize()} mb-6 max-w-2xl`}
                            style={{ color: data.colors.text }}
                        >
                            {data.subheadline}
                        </p>
                    )}

                    {/* Button */}
                    {data.buttonText && (
                        <button
                            onClick={handleButtonClick}
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: data.colors.buttonBackground,
                                color: data.colors.buttonText,
                            }}
                        >
                            {data.buttonText}
                            <ArrowRight size={20} />
                        </button>
                    )}
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
                backgroundColor: data.colors.background,
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
                                backgroundColor: data.colors.badgeBackground,
                                color: data.colors.badgeText,
                            }}
                        >
                            {data.badgeText}
                        </span>
                    )}

                    <h1
                        className={`${getHeadlineSize()} font-bold mb-4`}
                        style={{ color: data.colors.heading }}
                    >
                        {data.headline}
                    </h1>

                    {data.subheadline && (
                        <p
                            className={`${getSubheadlineSize()} mb-6`}
                            style={{ color: data.colors.text }}
                        >
                            {data.subheadline}
                        </p>
                    )}

                    {data.buttonText && (
                        <button
                            onClick={handleButtonClick}
                            className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: data.colors.buttonBackground,
                                color: data.colors.buttonText,
                            }}
                        >
                            {data.buttonText}
                            <ArrowRight size={20} />
                        </button>
                    )}
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
                backgroundColor: data.colors.background,
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
                                    backgroundColor: data.colors.badgeBackground,
                                    color: data.colors.badgeText,
                                }}
                            >
                                {data.badgeText}
                            </span>
                        )}

                        <h1
                            className={`${getHeadlineSize()} font-bold mb-4`}
                            style={{ color: data.colors.heading }}
                        >
                            {data.headline}
                        </h1>

                        {data.subheadline && (
                            <p
                                className={`${getSubheadlineSize()} mb-6`}
                                style={{ color: data.colors.text }}
                            >
                                {data.subheadline}
                            </p>
                        )}

                        {data.buttonText && (
                            <button
                                onClick={handleButtonClick}
                                className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                                style={{
                                    backgroundColor: data.colors.buttonBackground,
                                    color: data.colors.buttonText,
                                }}
                            >
                                {data.buttonText}
                                <ArrowRight size={20} />
                            </button>
                        )}
                    </div>

                    {/* Featured Product Card */}
                    {featuredProduct && (
                        <div
                            className="hidden lg:block bg-white/10 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:bg-white/20 transition-colors"
                            onClick={() => featuredProduct.slug && onProductClick?.(featuredProduct.slug)}
                        >
                            {featuredProduct.image && (
                                <img
                                    src={featuredProduct.image}
                                    alt={featuredProduct.name}
                                    className="w-full aspect-square object-cover rounded-xl mb-4"
                                />
                            )}
                            <h3 className="text-xl font-semibold text-white mb-2">{featuredProduct.name}</h3>
                            <p className="text-2xl font-bold text-white">${featuredProduct.price.toFixed(2)}</p>
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
                    backgroundColor: data.colors.background,
                }}
            >
                <div className="h-full flex flex-col justify-center items-center">
                    <div className="h-8 w-32 bg-gray-700 rounded mb-4" />
                    <div className="h-12 w-96 bg-gray-700 rounded mb-4" />
                    <div className="h-6 w-64 bg-gray-700 rounded mb-6" />
                    <div className="h-12 w-40 bg-gray-700 rounded" />
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
