/**
 * RecentlyViewed Component
 * Shows recently viewed products (stored in localStorage)
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { RecentlyViewedData, StorefrontProductItem } from '../../../types/components';
import type { ProductCardVisualVariant } from '../../../types/productCard';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import { createProductCardViewModel } from '../../../utils/productCard';
import { filterRenderableStorefrontProducts } from '../../../utils/ecommerce/productDisplayGuards';
import {
    getStorefrontAspectRatioClass,
    getStorefrontColorWithOpacity,
    getStorefrontContentPositionClass,
    getStorefrontOverlayGradient,
    getStorefrontPaddingXClass,
    getStorefrontPaddingYClass,
    getStorefrontRadiusClass,
    getStorefrontSectionBackgroundStyle,
    getStorefrontTextAlignmentClass,
} from './sectionVisualStyles';

interface RecentlyViewedProps {
    data: RecentlyViewedData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    onProductClick?: (productSlug: string) => void;
}

const STORAGE_KEY = 'quimera_recently_viewed';

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
    data,
    storeId,
    globalColors,
    onProductClick,
}) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);

    const { products: allProducts, isLoading } = usePublicProducts(effectiveStoreId);

    // Get recently viewed product IDs from localStorage
    const [recentIds, setRecentIds] = useState<string[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}_${effectiveStoreId}`);
            if (stored) {
                setRecentIds(JSON.parse(stored));
            }
        } catch {
            // Ignore localStorage errors
        }
    }, [effectiveStoreId]);

    // Filter products to only recently viewed ones
    const recentProducts = React.useMemo(() => {
        if (!recentIds.length) return [];
        
        return recentIds
            .map(id => allProducts.find(p => p.id === id))
            .filter((p): p is StorefrontProductItem => p !== undefined)
            .filter(product => filterRenderableStorefrontProducts([product]).length === 1)
            .slice(0, data.maxProducts || 10);
    }, [allProducts, recentIds, data.maxProducts]);

    // Carousel state
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

    const itemsPerView = data.columns || 5;
    const maxIndex = Math.max(0, recentProducts.length - itemsPerView);

    // Auto scroll
    useEffect(() => {
        if (data.variant === 'carousel' && data.autoScroll && recentProducts.length > itemsPerView) {
            autoScrollRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
            }, data.scrollSpeed || 5000);
        }
        return () => {
            if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        };
    }, [data.variant, data.autoScroll, data.scrollSpeed, maxIndex, itemsPerView, recentProducts.length]);

    const handlePrev = () => setCurrentIndex(prev => Math.max(0, prev - 1));
    const handleNext = () => setCurrentIndex(prev => Math.min(maxIndex, prev + 1));

    // Style helpers
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'md');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'md');

    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'lg'] || 'text-3xl';
    };
    const getDescriptionSize = () => {
        const map = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.descriptionFontSize || 'md'] || 'text-base';
    };
    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'left');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'left');

    const getBorderRadius = () => getStorefrontRadiusClass(data.borderRadius, 'xl');
    const getCardAspectRatio = () => getStorefrontAspectRatioClass((data as any).cardAspectRatio, '4:5');
    const getImageObjectFit = () => (data as any).imageObjectFit || 'cover';

    const getCardGap = () => {
        const map: Record<string, string> = {
            sm: 'gap-3',
            md: 'gap-4',
            lg: 'gap-6',
            xl: 'gap-8',
        };
        return map[data.cardGap || 'md'] || 'gap-4';
    };

    const getCardGapPx = () => {
        const map: Record<string, number> = {
            sm: 12,
            md: 16,
            lg: 24,
            xl: 32,
        };
        return map[data.cardGap || 'md'] || 16;
    };

    const getGridCols = () => {
        const cols = data.columns || 5;
        switch (cols) {
            case 2: return 'sm:grid-cols-2';
            case 3: return 'sm:grid-cols-2 lg:grid-cols-3';
            case 4: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
            case 6: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
            default: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
        }
    };

    // Product Card
    const ProductCard = ({ product }: { product: StorefrontProductItem }) => {
        const card = createProductCardViewModel(product, {
            variant: data.cardStyle,
            currencySymbol: '$',
            showBadges: true,
            showFeaturedBadge: false,
            showRatings: data.showRating,
        });
        if (!card.isRenderable) return null;

        const visualCardStyle = card.visualVariant;
        const cardStyles: Record<ProductCardVisualVariant, string> = {
            minimal: 'bg-transparent',
            modern: `${getBorderRadius()} shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1`,
            elegant: `${getBorderRadius()} shadow-sm hover:shadow-md transition-all duration-300 border`,
            overlay: `${getBorderRadius()} overflow-hidden`,
            luxury: `${getBorderRadius()} shadow-[0_18px_45px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-1 border`,
            marketplace: `${getBorderRadius()} shadow-sm hover:shadow-lg transition-all duration-300 border`,
            editorial: 'bg-transparent',
            compact: `${getBorderRadius()} shadow-sm hover:shadow-md transition-all duration-300 border`,
            imageFirst: `${getBorderRadius()} shadow-sm hover:shadow-lg transition-all duration-300 border`,
            quickBuy: `${getBorderRadius()} shadow-md hover:shadow-xl transition-all duration-300 border`,
        };

        // Overlay style - full image with text on top
        if (visualCardStyle === 'overlay') {
            return (
                <div
                    className={`group cursor-pointer relative ${cardStyles.overlay}`}
                    onClick={() => card.slug && onProductClick?.(card.slug)}
                >
                    <div className={`relative ${getCardAspectRatio()} overflow-hidden`}>
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
                        
                        {/* Gradient Overlay */}
                        <div
                            className="absolute inset-0"
                            style={{
                                background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd),
                            }}
                        />
                        
                        {/* Content on Image */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                {card.badges.slice(0, 2).map(badge => (
                                    <span
                                        key={badge.kind}
                                        className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur-md"
                                        style={{
                                            backgroundColor: badge.kind === 'sale'
                                                ? colors?.accent || '#ef4444'
                                                : 'rgba(255,255,255,0.16)',
                                            color: colors?.buttonText || '#ffffff',
                                        }}
                                    >
                                        {badge.label}
                                    </span>
                                ))}
                            </div>
                            <h4 className="text-sm font-semibold leading-tight text-white line-clamp-2 drop-shadow-sm">
                                {card.name}
                            </h4>
                            {data.showRating && card.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            size={12}
                                            style={{ color: i < Math.round(card.rating!.value) ? colors?.starColor || '#f59e0b' : 'rgba(255,255,255,0.38)' }}
                                            fill={i < Math.round(card.rating!.value) ? 'currentColor' : 'none'}
                                        />
                                    ))}
                                    <span className="ml-1 text-xs text-white/80">{card.rating.displayText}</span>
                                </div>
                            )}
                            {data.showPrice && (
                                <p className="mt-2 font-bold text-white drop-shadow-sm">
                                    {card.displayPrice}
                                    {card.hasDiscount && card.displayCompareAtPrice && (
                                        <span className="ml-2 text-sm font-medium line-through text-white/60">
                                            {card.displayCompareAtPrice}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Default styles (minimal, modern, elegant)
        return (
            <div
                className={`group cursor-pointer ${cardStyles[visualCardStyle]}`}
                style={{ backgroundColor: colors?.cardBackground }}
                onClick={() => card.slug && onProductClick?.(card.slug)}
            >
                <div className={`relative ${getCardAspectRatio()} overflow-hidden ${getBorderRadius()}`}>
                    {card.image?.url ? (
                        <img
                            src={card.image.url}
                            alt={card.image.altText}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            style={{ objectFit: getImageObjectFit() as any }}
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.14, 'rgba(79,70,229,0.14)') }}
                        >
                            <span style={{ color: colors?.cardText }}>Sin imagen</span>
                        </div>
                    )}
                    {card.hasDiscount && (
                        <span
                            className="absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-bold"
                            style={{ backgroundColor: colors?.accent, color: colors?.buttonText || '#ffffff' }}
                        >
                            -{card.discountPercent}%
                        </span>
                    )}
                </div>
                <div className="p-3">
                    <h4
                        className="font-medium text-sm line-clamp-2"
                        style={{ color: colors?.cardText || colors?.heading }}
                    >
                        {card.name}
                    </h4>
                    {data.showRating && card.rating && (
                        <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    size={12}
                                    style={{ color: i < Math.round(card.rating!.value) ? colors?.starColor : (colors?.borderColor || '#d1d5db') }}
                                    fill={i < Math.round(card.rating!.value) ? 'currentColor' : 'none'}
                                />
                            ))}
                            <span className="ml-1 text-xs" style={{ color: colors?.text }}>{card.rating.displayText}</span>
                        </div>
                    )}
                    {data.showPrice && (
                        <div className="mt-1 flex items-center gap-2">
                            <span className="font-semibold" style={{ color: colors?.accent }}>
                                {card.displayPrice}
                            </span>
                            {card.hasDiscount && card.displayCompareAtPrice && (
                                <span className="text-xs line-through" style={{ color: colors?.text, opacity: 0.65 }}>
                                    {card.displayCompareAtPrice}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!isLoading && recentProducts.length === 0) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={getStorefrontSectionBackgroundStyle(data, colors?.background)}>
                <div className="max-w-7xl mx-auto">
                    {(data.title || data.description) && (
                        <div className={`mb-6 flex flex-col ${getTextAlignment()}`}>
                            {data.title && (
                                <h2
                                    className={`${getTitleSize()} font-bold mb-2`}
                                    style={{ color: colors?.heading }}
                                >
                                    {data.title}
                                </h2>
                            )}
                            {data.description && (
                                <p className={getDescriptionSize()} style={{ color: colors?.text }}>
                                    {data.description}
                                </p>
                            )}
                        </div>
                    )}
                    <div
                        className={`${getBorderRadius()} border border-dashed px-5 py-8 text-center`}
                        style={{
                            borderColor: colors?.borderColor,
                            backgroundColor: colors?.cardBackground || colors?.background,
                            color: colors?.text,
                        }}
                    >
                        Los productos vistos recientemente aparecerán aquí.
                    </div>
                </div>
            </section>
        );
    }

    // Carousel variant
    const renderCarousel = () => (
        <div className="relative">
            <div className="overflow-hidden">
                <div
                    className={`flex transition-transform duration-500 ease-out ${getCardGap()}`}
                    style={{
                        transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                    }}
                >
                    {recentProducts.map((product) => (
                        <div
                            key={product.id}
                            className="flex-shrink-0"
                            style={{ width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * getCardGapPx() / itemsPerView}px)` }}
                        >
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Arrows */}
            {data.showArrows && recentProducts.length > itemsPerView && (
                <>
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                        style={{ backgroundColor: colors?.accent, color: colors?.buttonText || '#ffffff' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex >= maxIndex}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                        style={{ backgroundColor: colors?.accent, color: colors?.buttonText || '#ffffff' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </>
            )}
        </div>
    );

    // Grid variant
    const renderGrid = () => (
        <div className={`grid grid-cols-2 ${getGridCols()} ${getCardGap()}`}>
            {recentProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );

    // Compact variant
    const renderCompact = () => (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentProducts.map((product) => {
                const card = createProductCardViewModel(product, {
                    variant: data.cardStyle,
                    currencySymbol: '$',
                    showBadges: false,
                    showRatings: false,
                });
                if (!card.isRenderable) return null;

                return (
                    <div
                        key={product.id}
                        className={`flex-shrink-0 w-32 cursor-pointer group`}
                        onClick={() => card.slug && onProductClick?.(card.slug)}
                    >
                        <div className={`${getCardAspectRatio()} overflow-hidden ${getBorderRadius()} mb-2`}>
                            {card.image?.url ? (
                                <img
                                    src={card.image.url}
                                    alt={card.image.altText}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    style={{ objectFit: getImageObjectFit() as any }}
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-xs"
                                    style={{ backgroundColor: colors?.cardBackground }}
                                >
                                    Imagen pendiente
                                </div>
                            )}
                        </div>
                        <h4
                            className="text-xs font-medium line-clamp-2"
                            style={{ color: colors?.text }}
                        >
                            {card.name}
                        </h4>
                        {data.showPrice && card.displayPrice && (
                            <p className="text-sm font-semibold" style={{ color: colors?.accent }}>
                                {card.displayPrice}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );

    if (isLoading) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={getStorefrontSectionBackgroundStyle(data, colors?.background)}>
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className={`mb-6 flex ${getContentPosition()}`}>
                            <div className="h-8 w-1/4 min-w-48 rounded" style={{ backgroundColor: colors?.borderColor }} />
                        </div>
                        <div className={`grid grid-cols-2 ${getGridCols()} gap-4`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl" style={{ backgroundColor: colors?.borderColor }} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            className={`${getPaddingY()} ${getPaddingX()}`}
            style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                {(data.title || data.description) && (
                    <div className={`mb-6 flex flex-col ${getTextAlignment()}`}>
                        {data.title && (
                            <h2
                                className={`${getTitleSize()} font-bold mb-1`}
                                style={{ color: colors?.heading }}
                            >
                                {data.title}
                            </h2>
                        )}
                        {data.description && (
                            <p className={getDescriptionSize()} style={{ color: colors?.text }}>{data.description}</p>
                        )}
                    </div>
                )}

                {/* Content */}
                {data.variant === 'carousel' && renderCarousel()}
                {data.variant === 'grid' && renderGrid()}
                {data.variant === 'compact' && renderCompact()}
            </div>
        </section>
    );
};

export default RecentlyViewed;

// Helper function to add a product to recently viewed
export const addToRecentlyViewed = (storeId: string, productId: string, maxItems: number = 20) => {
    try {
        const key = `${STORAGE_KEY}_${storeId}`;
        const stored = localStorage.getItem(key);
        let ids: string[] = stored ? JSON.parse(stored) : [];
        
        // Remove if already exists and add to front
        ids = ids.filter(id => id !== productId);
        ids.unshift(productId);
        
        // Limit to maxItems
        ids = ids.slice(0, maxItems);
        
        localStorage.setItem(key, JSON.stringify(ids));
    } catch {
        // Ignore localStorage errors
    }
};
