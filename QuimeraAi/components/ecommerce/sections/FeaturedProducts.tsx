/**
 * FeaturedProducts Component
 * Displays featured products in carousel, grid, or showcase layout
 * Connected to publicStores data via usePublicProducts hook
 * 
 * Uses unified storefront colors system - colors from Store Settings
 * with optional override from component data.colors
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ShoppingCart, Eye, Star, ArrowRight } from 'lucide-react';
import { FeaturedProductsData, StorefrontProductItem } from '../../../types/components';
import type { ProductCardVisualVariant } from '../../../types/productCard';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import { resolveI18nField } from '../../../utils/i18nContent';
import { createProductCardViewModel } from '../../../utils/productCard';
import {
    filterRenderableStorefrontProducts,
    getSafeDiscountBadge,
} from '../../../utils/ecommerce/productDisplayGuards';
import {
    getStorefrontAspectRatioClass,
    getStorefrontCardGapClass,
    getStorefrontCardGapPx,
    getStorefrontContentPositionClass,
    getStorefrontOverlayGradient,
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

interface FeaturedProductsProps {
    data: FeaturedProductsData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    isEditorPreview?: boolean;
    onProductClick?: (productSlug: string) => void;
    onAddToCart?: (productId: string) => void;
    onNavigate?: (href: string) => void;
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
    data,
    storeId,
    globalColors,
    isEditorPreview = false,
    onProductClick,
    onAddToCart,
    onNavigate,
}) => {
    const { i18n } = useTranslation();
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const title = resolveI18nField(data.title as any, i18n.language);
    const description = resolveI18nField(data.description as any, i18n.language);
    const productListUrl = React.useMemo(() => {
        const rawUrl = typeof data.viewAllUrl === 'string' ? data.viewAllUrl.trim() : '';
        const storefrontProductsUrl = buildStorefrontCatalogUrl(effectiveStoreId);

        return isGenericStorefrontCatalogLink(rawUrl) ? storefrontProductsUrl : rawUrl;
    }, [data.viewAllUrl, effectiveStoreId]);
    
    // Unified colors system - merges global theme with component-specific colors
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);
    
    const { products: allProducts, isLoading } = usePublicProducts(effectiveStoreId, {
        productIds: data.sourceType === 'manual' && data.productIds?.length ? data.productIds : undefined,
        limitCount: data.productsToShow || 8,
        sortBy: data.sourceType === 'newest' ? 'newest' : 'name',
    });

    // Filter products based on sourceType
    const products = React.useMemo(() => {
        let nextProducts = allProducts;

        if (data.sourceType === 'manual' && data.productIds?.length) {
            nextProducts = allProducts.filter(p => data.productIds?.includes(p.id));
        } else if (data.sourceType === 'category' && data.categoryId) {
            nextProducts = allProducts.filter(p => p.category === data.categoryId);
        } else if (data.sourceType === 'on-sale') {
            nextProducts = allProducts.filter(p => getSafeDiscountBadge(p));
        }

        return filterRenderableStorefrontProducts(nextProducts);
    }, [allProducts, data.sourceType, data.productIds, data.categoryId]);

    // Carousel state
    const [currentIndex, setCurrentIndex] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);
    const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
    
    // Responsive items per view - 1 on mobile, configured columns on larger screens
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => {
            const wasMobile = isMobile;
            const nowMobile = window.innerWidth < 768;
            setIsMobile(nowMobile);
            // Reset index when viewport changes to avoid invalid states
            if (wasMobile !== nowMobile) {
                setCurrentIndex(0);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [isMobile]);

    const itemsPerView = isMobile ? 1 : (data.columns || 4);
    const maxIndex = Math.max(0, products.length - itemsPerView);

    // Auto scroll for carousel
    useEffect(() => {
        if (data.variant === 'carousel' && data.autoScroll && products.length > itemsPerView) {
            autoScrollRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
            }, data.scrollSpeed || 5000);
        }
        return () => {
            if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        };
    }, [data.variant, data.autoScroll, data.scrollSpeed, maxIndex, itemsPerView, products.length]);

    const handlePrev = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
    };

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    // Style helpers - matching ProductSearchPage layout options
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'lg');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'md');

    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'lg'] || 'text-3xl';
    };
    const getDescriptionSize = () => {
        const map = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.descriptionFontSize || 'md'] || 'text-lg';
    };
    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'left');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'left');

    const getGridCols = () => {
        const cols = data.columns || 4;
        switch (cols) {
            case 2: return 'sm:grid-cols-2';
            case 3: return 'sm:grid-cols-2 lg:grid-cols-3';
            case 5: return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
            default: return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        }
    };

    const getCardGap = () => {
        return getStorefrontCardGapClass(data.cardGap, 'md');
    };

    const getBorderRadius = () => getStorefrontRadiusClass(data.borderRadius, 'xl');
    const getCardAspectRatio = () => getStorefrontAspectRatioClass((data as any).cardAspectRatio, '4:5');
    const getImageObjectFit = () => (data as any).imageObjectFit || 'cover';

    // Product Card Component
    const ProductCard = ({ product }: { product: StorefrontProductItem }) => {
        const card = createProductCardViewModel(product, {
            variant: data.cardStyle,
            currencySymbol: '$',
            showBadges: data.showBadge,
            showFeaturedBadge: false,
            showRatings: data.showRating,
        });
        if (!card.isRenderable) return null;

        const visualCardStyle = card.visualVariant;

        const cardStyles: Record<ProductCardVisualVariant, string> = {
            minimal: 'bg-transparent',
            modern: `${getBorderRadius()} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`,
            elegant: `${getBorderRadius()} shadow-md hover:shadow-lg transition-all duration-300 border`,
            overlay: `${getBorderRadius()} overflow-hidden group shadow-lg ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`,
            luxury: `${getBorderRadius()} shadow-[0_18px_45px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-1 border`,
            marketplace: `${getBorderRadius()} shadow-sm hover:shadow-lg transition-all duration-300 border`,
            editorial: 'bg-transparent',
            compact: `${getBorderRadius()} shadow-sm hover:shadow-md transition-all duration-300 border`,
            imageFirst: `${getBorderRadius()} shadow-sm hover:shadow-lg transition-all duration-300 border`,
            quickBuy: `${getBorderRadius()} shadow-md hover:shadow-xl transition-all duration-300 border`,
        };

        return (
            <div
                className={`relative ${cardStyles[visualCardStyle]} cursor-pointer`}
                style={{ backgroundColor: colors?.cardBackground }}
                onClick={() => product.slug && onProductClick?.(product.slug)}
            >
                {/* Image */}
                <div className={`relative ${getCardAspectRatio()} overflow-hidden ${visualCardStyle !== 'overlay' ? getBorderRadius() : ''}`}>
                    {card.image?.url ? (
                        <img
                            src={card.image.url}
                            alt={card.image.altText}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            style={{ objectFit: getImageObjectFit() as any }}
                        />
                    ) : (
                        <div 
                            className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_42%),linear-gradient(135deg,rgba(79,70,229,0.34),rgba(15,23,42,0.92))]"
                        >
                            <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">Sin imagen</span>
                        </div>
                    )}

                    {/* Badges */}
                    {data.showBadge && card.hasDiscount && (
                        <div
                            className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold"
                            style={{
                                backgroundColor: colors?.saleBadgeBackground,
                                color: colors?.saleBadgeText,
                            }}
                        >
                            -{card.discountPercent}%
                        </div>
                    )}

                    {/* Quick Actions (on hover) */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {data.showAddToCart && onAddToCart && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (card.isRenderable) onAddToCart(product.id);
                                }}
                                className="p-2 rounded-full shadow-md hover:scale-110 transition-transform"
                                style={{ backgroundColor: colors?.cardBackground, color: colors?.accent }}
                            >
                                <ShoppingCart size={18} />
                            </button>
                        )}
                    </div>

                    {/* Overlay variant - full image card with text anchored over a gradient */}
                    {visualCardStyle === 'overlay' && (
                        <div 
                            className="absolute inset-0 flex flex-col justify-end p-4"
                            style={{ 
                                background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd),
                            }}
                        >
                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                {card.badges.slice(0, 2).map(badge => (
                                    <span
                                        key={badge.kind}
                                        className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur-md"
                                        style={{
                                            backgroundColor: badge.kind === 'sale'
                                                ? colors?.badgeBackground || '#ef4444'
                                                : 'rgba(255,255,255,0.16)',
                                            color: badge.kind === 'sale'
                                                ? colors?.badgeText || '#ffffff'
                                                : colors?.buttonText || '#ffffff',
                                        }}
                                    >
                                        {badge.label}
                                    </span>
                                ))}
                            </div>
                            <h3 className="text-base font-semibold leading-tight line-clamp-2 drop-shadow-sm" style={{ color: colors?.buttonText || '#ffffff' }}>{card.name}</h3>
                            {data.showRating && card.rating && (
                                <div className="mt-2 flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            size={12}
                                            className={i < Math.round(card.rating!.value) ? 'text-yellow-300' : 'text-white/40'}
                                            fill={i < Math.round(card.rating!.value) ? 'currentColor' : 'none'}
                                        />
                                    ))}
                                    <span className="ml-1 text-xs text-white/80">{card.rating.displayText}</span>
                                </div>
                            )}
                            {data.showPrice && card.displayPrice && (
                                <div className="mt-3 flex items-end justify-between gap-3">
                                    <span className="text-lg font-bold drop-shadow-sm" style={{ color: colors?.buttonText || '#ffffff' }}>{card.displayPrice}</span>
                                    {card.hasDiscount && card.displayCompareAtPrice && (
                                        <span className="text-sm line-through" style={{ color: colors?.buttonText || '#ffffff', opacity: 0.7 }}>
                                            {card.displayCompareAtPrice}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content (non-overlay variants) */}
                {visualCardStyle !== 'overlay' && (
                    <div className="p-4">
                        <h3
                            className="font-semibold line-clamp-2 mb-1"
                            style={{ color: colors?.cardText || colors?.heading }}
                        >
                            {card.name}
                        </h3>

                        {/* Rating */}
                        {data.showRating && card.rating && (
                            <div className="flex items-center gap-1 mb-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        size={14}
                                        style={{ color: i < Math.round(card.rating!.value) ? colors?.warning : colors?.border }}
                                        fill={i < Math.round(card.rating!.value) ? 'currentColor' : 'none'}
                                    />
                                ))}
                                <span className="text-xs ml-1" style={{ color: colors?.text }}>
                                    {card.rating.displayText}
                                </span>
                            </div>
                        )}

                        {/* Price */}
                        {data.showPrice && card.displayPrice && (
                            <div className="flex items-center gap-2">
                                <span className="font-bold" style={{ color: colors?.salePrice }}>
                                    {card.displayPrice}
                                </span>
                                {card.hasDiscount && card.displayCompareAtPrice && (
                                    <span className="text-sm line-through" style={{ color: colors?.originalPrice }}>
                                        {card.displayCompareAtPrice}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render variants
    const renderCarousel = () => (
        <div className="relative">
            <div ref={carouselRef} className="overflow-hidden">
                <div
                    className={`flex transition-transform duration-500 ease-out ${getCardGap()}`}
                    style={{
                        transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                    }}
                >
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="flex-shrink-0"
                            style={{ width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * getStorefrontCardGapPx(data.cardGap) / itemsPerView}px)` }}
                        >
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Arrows */}
            {data.showArrows && products.length > itemsPerView && (
                <>
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                        style={{ backgroundColor: colors?.buttonBackground, color: colors?.buttonText }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex >= maxIndex}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                        style={{ backgroundColor: colors?.buttonBackground, color: colors?.buttonText }}
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Dots */}
            {data.showDots && products.length > itemsPerView && (
                <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => handleDotClick(i)}
                            className={`w-2 h-2 rounded-full transition-all ${
                                i === currentIndex ? 'w-6' : 'opacity-50'
                            }`}
                            style={{ backgroundColor: colors?.accent }}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    const renderGrid = () => (
        <div className={`grid grid-cols-1 ${getGridCols()} ${getCardGap()}`}>
            {products.slice(0, data.productsToShow).map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );

    const renderShowcase = () => {
        const mainProduct = products[0];
        const sideProducts = products.slice(1, 5);
        const mainCard = mainProduct
            ? createProductCardViewModel(mainProduct, {
                variant: data.cardStyle,
                currencySymbol: '$',
                showBadges: data.showBadge,
                showRatings: data.showRating,
            })
            : undefined;

        if (!mainProduct) return renderGrid();

        return (
            <div className={`grid grid-cols-1 lg:grid-cols-2 ${getCardGap()}`}>
                {/* Main featured product */}
                <div className="lg:row-span-2">
                    <div
                        className={`relative h-full min-h-[400px] ${getBorderRadius()} overflow-hidden group cursor-pointer`}
                        onClick={() => mainProduct.slug && onProductClick?.(mainProduct.slug)}
                    >
                        {mainCard?.image?.url ? (
                            <img
                                src={mainCard.image.url}
                                alt={mainCard.image.altText}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: colors?.cardBackground }}
                            />
                        )}
                        <div 
                            className="absolute inset-0"
                            style={{ 
                                background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd)
                            }} 
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                            {data.showBadge && (
                                <span
                                    className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3"
                                    style={{
                                        backgroundColor: colors?.badgeBackground,
                                        color: colors?.badgeText,
                                    }}
                            >
                                Destacado
                            </span>
                        )}
                            <h3 className="text-2xl font-bold mb-2" style={{ color: colors?.buttonText }}>{mainCard?.name || mainProduct.name}</h3>
                            {data.showPrice && mainCard?.displayPrice && (
                                <p className="text-xl font-bold" style={{ color: colors?.buttonText }}>{mainCard.displayPrice}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Side products grid */}
                <div className={`grid grid-cols-2 ${getCardGap()}`}>
                    {sideProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={getStorefrontSectionBackgroundStyle(data, colors?.background)}>
                <div className="max-w-7xl mx-auto">
                    {(title || description) && (
                        <div className={`mb-8 flex flex-col ${getTextAlignment()}`}>
                            {title && (
                                <h2
                                    className={`${getTitleSize()} font-bold mb-2`}
                                    style={{ color: colors?.heading, fontFamily: colors?.headingFontFamily }}
                                >
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className={`max-w-2xl ${getDescriptionSize()}`} style={{ color: colors?.text }}>
                                    {description}
                                </p>
                            )}
                        </div>
                    )}
                    <div className="animate-pulse">
                        <div className="h-8 rounded w-1/3 mb-4" style={{ backgroundColor: colors?.border }} />
                        <div className="h-4 rounded w-1/2 mb-8" style={{ backgroundColor: colors?.border }} />
                        <div className={`grid grid-cols-1 ${getGridCols()} ${getCardGap()}`}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className={`aspect-square ${getBorderRadius()}`} style={{ backgroundColor: colors?.border }} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (products.length === 0 && !isEditorPreview) {
        return null;
    }

    return (
        <section
            className={`${getPaddingY()} ${getPaddingX()}`}
            style={{
                ...getStorefrontSectionBackgroundStyle(data, colors?.background),
                fontFamily: colors?.fontFamily,
            }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                {(title || description) && (
                    <div className={`mb-8 flex flex-col ${getTextAlignment()}`}>
                        {title && (
                            <h2
                                className={`${getTitleSize()} font-bold mb-2`}
                                style={{ color: colors?.heading, fontFamily: colors?.headingFontFamily }}
                            >
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p className={`max-w-2xl ${getDescriptionSize()}`} style={{ color: colors?.text }}>
                                {description}
                            </p>
                        )}
                    </div>
                )}

                {/* Products */}
                {products.length === 0 ? (
                    <div className="text-center py-12" style={{ color: colors?.text }}>
                        No hay productos validos para esta seccion.
                    </div>
                ) : (
                    <>
                        {data.variant === 'carousel' && renderCarousel()}
                        {data.variant === 'grid' && renderGrid()}
                        {data.variant === 'showcase' && renderShowcase()}
                    </>
                )}

                {/* View All Button */}
                {data.showViewAll && (
                    <div className={`mt-10 flex ${getContentPosition()}`}>
                        <a
                            href={productListUrl}
                            onClick={(event) => {
                                if (!onNavigate) return;
                                event.preventDefault();
                                onNavigate(productListUrl);
                            }}
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: colors?.buttonBackground,
                                color: colors?.buttonText,
                            }}
                        >
                            Ver todos los productos
                            <ArrowRight size={20} />
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
};

export default FeaturedProducts;
