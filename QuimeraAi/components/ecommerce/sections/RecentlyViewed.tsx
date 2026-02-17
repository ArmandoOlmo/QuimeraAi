/**
 * RecentlyViewed Component
 * Shows recently viewed products (stored in localStorage)
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { RecentlyViewedData, StorefrontProductItem } from '../../../types/components';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeProject } from '../../../contexts/project';

interface RecentlyViewedProps {
    data: RecentlyViewedData;
    storeId?: string;
    onProductClick?: (productSlug: string) => void;
}

const STORAGE_KEY = 'quimera_recently_viewed';

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
    data,
    storeId,
    onProductClick,
}) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';

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
    const getPaddingY = () => {
        const map = { sm: 'py-8', md: 'py-12', lg: 'py-16' };
        return map[data.paddingY] || 'py-12';
    };

    const getPaddingX = () => {
        const map = { sm: 'px-4', md: 'px-6', lg: 'px-8' };
        return map[data.paddingX] || 'px-6';
    };

    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'lg'] || 'text-3xl';
    };

    const getBorderRadius = () => {
        const map = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-3xl' };
        return map[data.borderRadius || 'xl'] || 'rounded-xl';
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
        const cardStyles = {
            minimal: 'bg-transparent',
            modern: `${getBorderRadius()} shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1`,
            elegant: `${getBorderRadius()} shadow-sm hover:shadow-md transition-all duration-300 border`,
            overlay: `${getBorderRadius()} overflow-hidden`,
        };

        // Overlay style - full image with text on top
        if (data.cardStyle === 'overlay') {
            return (
                <div
                    className={`group cursor-pointer relative ${cardStyles.overlay}`}
                    onClick={() => product.slug && onProductClick?.(product.slug)}
                >
                    <div className="relative aspect-square overflow-hidden">
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: data.colors?.accent + '20' }}
                            >
                                <span style={{ color: data.colors?.cardText }}>Sin imagen</span>
                            </div>
                        )}
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        
                        {/* Content on Image */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="font-semibold text-sm text-white line-clamp-2">
                                {product.name}
                            </h4>
                            {data.showRating && product.rating !== undefined && (
                                <div className="flex items-center gap-1 mt-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            size={12}
                                            className={i < Math.round(product.rating!) ? 'text-yellow-400' : 'text-white/40'}
                                            fill={i < Math.round(product.rating!) ? 'currentColor' : 'none'}
                                        />
                                    ))}
                                </div>
                            )}
                            {data.showPrice && (
                                <p className="font-bold text-white mt-1">
                                    ${product.price.toFixed(2)}
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
                className={`group cursor-pointer ${cardStyles[data.cardStyle]}`}
                style={{ backgroundColor: data.colors?.cardBackground }}
                onClick={() => product.slug && onProductClick?.(product.slug)}
            >
                <div className={`relative aspect-square overflow-hidden ${getBorderRadius()}`}>
                    {product.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: data.colors?.accent + '20' }}
                        >
                            <span style={{ color: data.colors?.cardText }}>Sin imagen</span>
                        </div>
                    )}
                </div>
                <div className="p-3">
                    <h4
                        className="font-medium text-sm line-clamp-2"
                        style={{ color: data.colors?.cardText || data.colors?.heading }}
                    >
                        {product.name}
                    </h4>
                    {data.showRating && product.rating !== undefined && (
                        <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    size={12}
                                    style={{ color: i < Math.round(product.rating!) ? data.colors?.starColor : (data.colors?.borderColor || '#d1d5db') }}
                                    fill={i < Math.round(product.rating!) ? 'currentColor' : 'none'}
                                />
                            ))}
                        </div>
                    )}
                    {data.showPrice && (
                        <p className="font-semibold mt-1" style={{ color: data.colors?.accent }}>
                            ${product.price.toFixed(2)}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // Don't render if no recent products
    if (!isLoading && recentProducts.length === 0) {
        return null;
    }

    // Carousel variant
    const renderCarousel = () => (
        <div className="relative">
            <div className="overflow-hidden">
                <div
                    className="flex transition-transform duration-500 ease-out gap-4"
                    style={{
                        transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                    }}
                >
                    {recentProducts.map((product) => (
                        <div
                            key={product.id}
                            className="flex-shrink-0"
                            style={{ width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * 16 / itemsPerView}px)` }}
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
                        style={{ backgroundColor: data.colors?.accent, color: data.colors?.buttonText || '#ffffff' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex >= maxIndex}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                        style={{ backgroundColor: data.colors?.accent, color: data.colors?.buttonText || '#ffffff' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </>
            )}
        </div>
    );

    // Grid variant
    const renderGrid = () => (
        <div className={`grid grid-cols-2 ${getGridCols()} gap-4`}>
            {recentProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );

    // Compact variant
    const renderCompact = () => (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentProducts.map((product) => (
                <div
                    key={product.id}
                    className={`flex-shrink-0 w-32 cursor-pointer group`}
                    onClick={() => product.slug && onProductClick?.(product.slug)}
                >
                    <div className={`aspect-square overflow-hidden ${getBorderRadius()} mb-2`}>
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-xs"
                                style={{ backgroundColor: data.colors?.cardBackground }}
                            >
                                Sin imagen
                            </div>
                        )}
                    </div>
                    <h4
                        className="text-xs font-medium line-clamp-2"
                        style={{ color: data.colors?.text }}
                    >
                        {product.name}
                    </h4>
                    {data.showPrice && (
                        <p className="text-sm font-semibold" style={{ color: data.colors?.accent }}>
                            ${product.price.toFixed(2)}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );

    if (isLoading) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={{ backgroundColor: data.colors?.background }}>
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 rounded w-1/4 mb-6" style={{ backgroundColor: data.colors?.borderColor }} />
                        <div className={`grid grid-cols-2 ${getGridCols()} gap-4`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl" style={{ backgroundColor: data.colors?.borderColor }} />
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
            style={{ backgroundColor: data.colors?.background }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                {(data.title || data.description) && (
                    <div className="mb-6">
                        {data.title && (
                            <h2
                                className={`${getTitleSize()} font-bold mb-1`}
                                style={{ color: data.colors?.heading }}
                            >
                                {data.title}
                            </h2>
                        )}
                        {data.description && (
                            <p style={{ color: data.colors?.text }}>{data.description}</p>
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
