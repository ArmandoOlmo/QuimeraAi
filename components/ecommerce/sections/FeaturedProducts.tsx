/**
 * FeaturedProducts Component
 * Displays featured products in carousel, grid, or showcase layout
 * Connected to publicStores data via usePublicProducts hook
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, Eye, Star, ArrowRight } from 'lucide-react';
import { FeaturedProductsData, StorefrontProductItem } from '../../../types/components';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeEditor } from '../../../contexts/EditorContext';

interface FeaturedProductsProps {
    data: FeaturedProductsData;
    storeId?: string;
    onProductClick?: (productSlug: string) => void;
    onAddToCart?: (productId: string) => void;
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
    data,
    storeId,
    onProductClick,
    onAddToCart,
}) => {
    const editorContext = useSafeEditor();
    const effectiveStoreId = storeId || editorContext?.activeProjectId || '';
    
    const { products: allProducts, isLoading } = usePublicProducts(effectiveStoreId, {
        limitCount: data.productsToShow || 8,
        sortBy: data.sourceType === 'newest' ? 'newest' : 'name',
    });

    // Filter products based on sourceType
    const products = React.useMemo(() => {
        if (data.sourceType === 'manual' && data.productIds?.length) {
            return allProducts.filter(p => data.productIds?.includes(p.id));
        }
        if (data.sourceType === 'category' && data.categoryId) {
            return allProducts.filter(p => p.category === data.categoryId);
        }
        if (data.sourceType === 'on-sale') {
            return allProducts.filter(p => p.compareAtPrice && p.compareAtPrice > p.price);
        }
        return allProducts;
    }, [allProducts, data.sourceType, data.productIds, data.categoryId]);

    // Carousel state
    const [currentIndex, setCurrentIndex] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);
    const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

    const itemsPerView = data.columns || 4;
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

    const getGridCols = () => {
        const cols = data.columns || 4;
        switch (cols) {
            case 2: return 'sm:grid-cols-2';
            case 3: return 'sm:grid-cols-2 lg:grid-cols-3';
            case 5: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
            default: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
        }
    };

    const getBorderRadius = () => {
        const map = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-3xl' };
        return map[data.borderRadius || 'xl'] || 'rounded-xl';
    };

    // Product Card Component
    const ProductCard = ({ product }: { product: StorefrontProductItem }) => {
        const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
        const discountPercent = hasDiscount
            ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
            : 0;

        const cardStyles = {
            minimal: 'bg-transparent',
            modern: `${getBorderRadius()} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`,
            elegant: `${getBorderRadius()} shadow-md hover:shadow-lg transition-all duration-300 border`,
            overlay: `${getBorderRadius()} overflow-hidden group`,
        };

        return (
            <div
                className={`relative ${cardStyles[data.cardStyle]} cursor-pointer`}
                style={{ backgroundColor: data.colors.cardBackground }}
                onClick={() => product.slug && onProductClick?.(product.slug)}
            >
                {/* Image */}
                <div className={`relative aspect-square overflow-hidden ${data.cardStyle !== 'overlay' ? getBorderRadius() : ''}`}>
                    {product.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div 
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: data.colors.accent + '20' }}
                        >
                            <span style={{ color: data.colors.cardText }}>Sin imagen</span>
                        </div>
                    )}

                    {/* Badges */}
                    {data.showBadge && hasDiscount && (
                        <div
                            className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold"
                            style={{
                                backgroundColor: data.colors.badgeBackground || '#ef4444',
                                color: data.colors.badgeText || '#ffffff',
                            }}
                        >
                            -{discountPercent}%
                        </div>
                    )}

                    {/* Quick Actions (on hover) */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {data.showAddToCart && onAddToCart && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart(product.id);
                                }}
                                className="p-2 rounded-full bg-white shadow-md hover:scale-110 transition-transform"
                                style={{ color: data.colors.accent }}
                            >
                                <ShoppingCart size={18} />
                            </button>
                        )}
                    </div>

                    {/* Overlay variant - text on image */}
                    {data.cardStyle === 'overlay' && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-4">
                            <h3 className="font-semibold text-white line-clamp-2">{product.name}</h3>
                            {data.showPrice && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-white font-bold">${product.price.toFixed(2)}</span>
                                    {hasDiscount && (
                                        <span className="text-gray-300 text-sm line-through">
                                            ${product.compareAtPrice!.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content (non-overlay variants) */}
                {data.cardStyle !== 'overlay' && (
                    <div className="p-4">
                        <h3
                            className="font-semibold line-clamp-2 mb-1"
                            style={{ color: data.colors.cardText || data.colors.heading }}
                        >
                            {product.name}
                        </h3>

                        {/* Rating */}
                        {data.showRating && product.rating !== undefined && (
                            <div className="flex items-center gap-1 mb-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        size={14}
                                        className={i < Math.round(product.rating!) ? 'text-yellow-400' : 'text-gray-300'}
                                        fill={i < Math.round(product.rating!) ? 'currentColor' : 'none'}
                                    />
                                ))}
                                {product.reviewCount !== undefined && (
                                    <span className="text-xs ml-1" style={{ color: data.colors.text }}>
                                        ({product.reviewCount})
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Price */}
                        {data.showPrice && (
                            <div className="flex items-center gap-2">
                                <span className="font-bold" style={{ color: data.colors.accent }}>
                                    ${product.price.toFixed(2)}
                                </span>
                                {hasDiscount && (
                                    <span className="text-sm line-through" style={{ color: data.colors.text }}>
                                        ${product.compareAtPrice!.toFixed(2)}
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
                    className="flex transition-transform duration-500 ease-out"
                    style={{
                        transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                        gap: '1rem',
                    }}
                >
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="flex-shrink-0"
                            style={{ width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) / itemsPerView}rem)` }}
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
                        style={{ backgroundColor: data.colors.buttonBackground, color: data.colors.buttonText }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex >= maxIndex}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-2 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                        style={{ backgroundColor: data.colors.buttonBackground, color: data.colors.buttonText }}
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
                            style={{ backgroundColor: data.colors.accent }}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    const renderGrid = () => (
        <div className={`grid grid-cols-1 ${getGridCols()} gap-6`}>
            {products.slice(0, data.productsToShow).map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );

    const renderShowcase = () => {
        const mainProduct = products[0];
        const sideProducts = products.slice(1, 5);

        if (!mainProduct) return renderGrid();

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Main featured product */}
                <div className="lg:row-span-2">
                    <div
                        className={`relative h-full min-h-[400px] ${getBorderRadius()} overflow-hidden group cursor-pointer`}
                        onClick={() => mainProduct.slug && onProductClick?.(mainProduct.slug)}
                    >
                        {mainProduct.image ? (
                            <img
                                src={mainProduct.image}
                                alt={mainProduct.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: data.colors.cardBackground }}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                            {data.showBadge && (
                                <span
                                    className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3"
                                    style={{
                                        backgroundColor: data.colors.badgeBackground,
                                        color: data.colors.badgeText,
                                    }}
                                >
                                    Destacado
                                </span>
                            )}
                            <h3 className="text-2xl font-bold text-white mb-2">{mainProduct.name}</h3>
                            {data.showPrice && (
                                <p className="text-xl font-bold text-white">${mainProduct.price.toFixed(2)}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Side products grid */}
                <div className="grid grid-cols-2 gap-4">
                    {sideProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={{ backgroundColor: data.colors.background }}>
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4" />
                        <div className="h-4 bg-gray-700 rounded w-1/2 mb-8" />
                        <div className={`grid grid-cols-1 ${getGridCols()} gap-6`}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="aspect-square bg-gray-700 rounded-xl" />
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
            style={{ backgroundColor: data.colors.background }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                {(data.title || data.description) && (
                    <div className="mb-8">
                        {data.title && (
                            <h2
                                className={`${getTitleSize()} font-bold mb-2`}
                                style={{ color: data.colors.heading }}
                            >
                                {data.title}
                            </h2>
                        )}
                        {data.description && (
                            <p className="text-lg" style={{ color: data.colors.text }}>
                                {data.description}
                            </p>
                        )}
                    </div>
                )}

                {/* Products */}
                {products.length === 0 ? (
                    <div className="text-center py-12" style={{ color: data.colors.text }}>
                        No hay productos disponibles
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
                    <div className="flex justify-center mt-10">
                        <a
                            href={data.viewAllUrl || '#store'}
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: data.colors.buttonBackground,
                                color: data.colors.buttonText,
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
