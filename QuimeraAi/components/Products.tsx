/**
 * Products Component
 * Componente de productos para landing pages generadas
 * Muestra una grilla de productos del ecommerce
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Eye, Heart, Star, Filter, Search, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { ProductsProps, StorefrontProductItem, StyleType } from '../types/components';

// Extended props to include colors
interface ProductsWithColorsProps extends ProductsProps {
    colors?: {
        background?: string;
        text?: string;
        heading?: string;
        accent?: string;
        cardBackground?: string;
        cardText?: string;
        buttonBackground?: string;
        buttonText?: string;
    };
}

const Products: React.FC<ProductsWithColorsProps> = ({
    title = 'Nuestros Productos',
    subtitle = 'Descubre nuestra selección de productos',
    products = [],
    columns = 4,
    showFilters = true,
    showSearch = true,
    showPagination = true,
    productsPerPage = 12,
    layout = 'grid',
    cardStyle = 'modern',
    showAddToCart = true,
    showQuickView = false,
    showWishlist = false,
    onAddToCart,
    onQuickView,
    onWishlist,
    style = 'modern',
    primaryColor = '#6366f1',
    storeUrl,
    colors,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'newest'>('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set());

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(products.map((p) => p.category).filter(Boolean));
        return Array.from(cats) as string[];
    }, [products]);

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let result = [...products];

        // Filter by search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(term) ||
                    p.description?.toLowerCase().includes(term)
            );
        }

        // Filter by category
        if (selectedCategory) {
            result = result.filter((p) => p.category === selectedCategory);
        }

        // Sort
        switch (sortBy) {
            case 'name':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price-asc':
                result.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                result.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
            default:
                // Assume products are already sorted by newest
                break;
        }

        return result;
    }, [products, searchTerm, selectedCategory, sortBy]);

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * productsPerPage;
        return filteredProducts.slice(start, start + productsPerPage);
    }, [filteredProducts, currentPage, productsPerPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, sortBy]);

    const handleWishlistToggle = (productId: string) => {
        setWishlistItems((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
        onWishlist?.(productId);
    };

    // Use custom colors if available, otherwise fall back to style presets
    const effectiveColors = useMemo(() => {
        // Priority: colors prop > primaryColor > defaults based on style
        const accent = colors?.accent || primaryColor;
        const background = colors?.background;
        const heading = colors?.heading;
        const text = colors?.text;
        const cardBackground = colors?.cardBackground;
        const cardText = colors?.cardText;
        const buttonBackground = colors?.buttonBackground || accent;
        const buttonText = colors?.buttonText || '#ffffff';

        return {
            accent,
            background,
            heading,
            text,
            cardBackground,
            cardText,
            buttonBackground,
            buttonText,
        };
    }, [colors, primaryColor]);

    // Style configurations - used for class-based styling when colors not specified
    const getStyleClasses = () => {
        // If custom colors are provided, use a neutral base
        if (colors?.background || colors?.heading || colors?.text) {
            return {
                container: '',
                title: '',
                subtitle: '',
                card: 'shadow-sm',
                cardHover: 'hover:shadow-md hover:-translate-y-1',
                text: '',
                subtext: '',
                button: '',
                input: 'border rounded-lg',
            };
        }

        switch (style) {
            case 'minimal':
                return {
                    container: 'bg-white',
                    title: 'text-gray-900',
                    subtitle: 'text-gray-600',
                    card: 'bg-white border border-gray-200',
                    cardHover: 'hover:shadow-lg',
                    text: 'text-gray-900',
                    subtext: 'text-gray-500',
                    button: 'bg-gray-900 hover:bg-gray-800 text-white',
                    input: 'bg-white border border-gray-300 text-gray-900',
                };
            case 'elegant':
                return {
                    container: 'bg-gray-50',
                    title: 'text-gray-900 font-serif',
                    subtitle: 'text-gray-600',
                    card: 'bg-white shadow-md',
                    cardHover: 'hover:shadow-xl',
                    text: 'text-gray-900',
                    subtext: 'text-gray-500',
                    button: 'bg-black hover:bg-gray-900 text-white',
                    input: 'bg-white border border-gray-200 text-gray-900',
                };
            case 'dark':
                return {
                    container: 'bg-gray-900',
                    title: 'text-white',
                    subtitle: 'text-gray-400',
                    card: 'bg-gray-800 border border-gray-700',
                    cardHover: 'hover:border-gray-600',
                    text: 'text-white',
                    subtext: 'text-gray-400',
                    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
                    input: 'bg-gray-800 border border-gray-700 text-white',
                };
            case 'modern':
            default:
                return {
                    container: 'bg-gray-100',
                    title: 'text-gray-900',
                    subtitle: 'text-gray-600',
                    card: 'bg-white shadow-sm',
                    cardHover: 'hover:shadow-md hover:-translate-y-1',
                    text: 'text-gray-900',
                    subtext: 'text-gray-500',
                    button: 'text-white',
                    input: 'bg-white border border-gray-200 text-gray-900',
                };
        }
    };

    const styles = getStyleClasses();

    const getGridCols = () => {
        switch (columns) {
            case 2:
                return 'sm:grid-cols-2';
            case 3:
                return 'sm:grid-cols-2 lg:grid-cols-3';
            case 5:
                return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
            case 6:
                return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
            case 4:
            default:
                return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
        }
    };

    // Calculate input/select background based on section background
    const getInputBackground = () => {
        if (!effectiveColors.background) return undefined;
        // If background is dark, use slightly lighter input; if light, use white
        const hex = effectiveColors.background.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5 
            ? effectiveColors.cardBackground || 'rgba(255,255,255,0.1)' 
            : '#ffffff';
    };

    const inputBg = getInputBackground();

    return (
        <section 
            className={`py-16 ${styles.container}`}
            style={effectiveColors.background ? { backgroundColor: effectiveColors.background } : undefined}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 
                        className={`text-3xl md:text-4xl font-bold mb-4 ${styles.title}`}
                        style={effectiveColors.heading ? { color: effectiveColors.heading } : undefined}
                    >
                        {title}
                    </h2>
                    {subtitle && (
                        <p 
                            className={`text-lg max-w-2xl mx-auto ${styles.subtitle}`}
                            style={effectiveColors.text ? { color: effectiveColors.text } : undefined}
                        >
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Filters Bar */}
                {(showFilters || showSearch) && (
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        {showSearch && (
                            <div className="relative flex-1">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2"
                                    size={20}
                                    style={{ color: effectiveColors.text || '#9ca3af' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Buscar productos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${styles.input}`}
                                    style={{
                                        backgroundColor: inputBg,
                                        color: effectiveColors.cardText || effectiveColors.text,
                                        borderColor: effectiveColors.accent ? `${effectiveColors.accent}40` : undefined,
                                    }}
                                />
                            </div>
                        )}

                        {showFilters && (
                            <div className="flex gap-4">
                                {categories.length > 0 && (
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className={`px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${styles.input}`}
                                        style={{
                                            backgroundColor: inputBg,
                                            color: effectiveColors.cardText || effectiveColors.text,
                                            borderColor: effectiveColors.accent ? `${effectiveColors.accent}40` : undefined,
                                        }}
                                    >
                                        <option value="">Todas las categorías</option>
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                    className={`px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${styles.input}`}
                                    style={{
                                        backgroundColor: inputBg,
                                        color: effectiveColors.cardText || effectiveColors.text,
                                        borderColor: effectiveColors.accent ? `${effectiveColors.accent}40` : undefined,
                                    }}
                                >
                                    <option value="newest">Más recientes</option>
                                    <option value="name">Nombre</option>
                                    <option value="price-asc">Precio: menor a mayor</option>
                                    <option value="price-desc">Precio: mayor a menor</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Products Count */}
                <p 
                    className={`mb-6 ${styles.subtext}`}
                    style={effectiveColors.text ? { color: effectiveColors.text, opacity: 0.7 } : undefined}
                >
                    {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
                </p>

                {/* Products Grid */}
                {paginatedProducts.length > 0 ? (
                    <div className={`grid grid-cols-1 ${getGridCols()} gap-6`}>
                        {paginatedProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                cardStyle={cardStyle}
                                showAddToCart={showAddToCart}
                                showQuickView={showQuickView}
                                showWishlist={showWishlist}
                                isWishlisted={wishlistItems.has(product.id)}
                                onAddToCart={onAddToCart}
                                onQuickView={onQuickView}
                                onWishlistToggle={handleWishlistToggle}
                                styles={styles}
                                primaryColor={primaryColor}
                                effectiveColors={effectiveColors}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p 
                            className={`text-lg ${styles.subtext}`}
                            style={effectiveColors.text ? { color: effectiveColors.text } : undefined}
                        >
                            No se encontraron productos
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {showPagination && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-12">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg ${styles.input} disabled:opacity-50`}
                            style={{
                                backgroundColor: inputBg,
                                color: effectiveColors.text,
                                borderColor: effectiveColors.accent ? `${effectiveColors.accent}40` : undefined,
                            }}
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                                    currentPage === page
                                        ? `${styles.button}`
                                        : `${styles.input} hover:opacity-80`
                                }`}
                                style={currentPage === page 
                                    ? { backgroundColor: effectiveColors.buttonBackground, color: effectiveColors.buttonText } 
                                    : { 
                                        backgroundColor: inputBg, 
                                        color: effectiveColors.text,
                                        borderColor: effectiveColors.accent ? `${effectiveColors.accent}40` : undefined,
                                    }
                                }
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg ${styles.input} disabled:opacity-50`}
                            style={{
                                backgroundColor: inputBg,
                                color: effectiveColors.text,
                                borderColor: effectiveColors.accent ? `${effectiveColors.accent}40` : undefined,
                            }}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* View All Products Button */}
                {storeUrl && (
                    <div className="flex justify-center mt-12">
                        <a
                            href={storeUrl}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:opacity-90 hover:gap-3"
                            style={{ 
                                backgroundColor: effectiveColors.buttonBackground,
                                color: effectiveColors.buttonText 
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

// Product Card Component
interface ProductCardProps {
    product: StorefrontProductItem;
    cardStyle: 'minimal' | 'modern' | 'elegant' | 'overlay';
    showAddToCart: boolean;
    showQuickView: boolean;
    showWishlist: boolean;
    isWishlisted: boolean;
    onAddToCart?: (productId: string) => void;
    onQuickView?: (productId: string) => void;
    onWishlistToggle: (productId: string) => void;
    styles: ReturnType<typeof Object>;
    primaryColor: string;
    effectiveColors: {
        accent: string;
        background?: string;
        heading?: string;
        text?: string;
        cardBackground?: string;
        cardText?: string;
        buttonBackground: string;
        buttonText: string;
    };
}

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    cardStyle,
    showAddToCart,
    showQuickView,
    showWishlist,
    isWishlisted,
    onAddToCart,
    onQuickView,
    onWishlistToggle,
    styles,
    primaryColor,
    effectiveColors,
}) => {
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
        : 0;

    // Overlay style - full image with text on top
    if (cardStyle === 'overlay') {
        return (
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer">
                {/* Full Image */}
                <div className="relative aspect-square overflow-hidden">
                    {product.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">Sin imagen</span>
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    {/* Discount Badge */}
                    {hasDiscount && (
                        <div
                            className="absolute top-3 left-3 px-2 py-1 rounded-full text-white text-xs font-bold"
                            style={{ backgroundColor: '#ef4444' }}
                        >
                            -{discountPercentage}%
                        </div>
                    )}

                    {/* Out of Stock Badge */}
                    {product.inStock === false && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium">
                                Agotado
                            </span>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {showWishlist && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onWishlistToggle(product.id);
                                }}
                                className={`p-2 rounded-full bg-white/90 shadow-md transition-colors ${
                                    isWishlisted ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                                }`}
                            >
                                <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                            </button>
                        )}
                        {showQuickView && onQuickView && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickView(product.id);
                                }}
                                className="p-2 rounded-full bg-white/90 shadow-md text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <Eye size={18} />
                            </button>
                        )}
                    </div>

                    {/* Content Overlay - Text on Image */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        {product.category && (
                            <p className="text-xs uppercase tracking-wide mb-1 text-white/70">
                                {product.category}
                            </p>
                        )}

                        <h3 className="font-semibold text-white mb-2 line-clamp-2">
                            {product.name}
                        </h3>

                        {/* Rating */}
                        {product.rating !== undefined && (
                            <div className="flex items-center gap-1 mb-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        size={14}
                                        className={i < Math.round(product.rating!) ? 'text-yellow-400' : 'text-white/40'}
                                        fill={i < Math.round(product.rating!) ? 'currentColor' : 'none'}
                                    />
                                ))}
                                {product.reviewCount !== undefined && (
                                    <span className="text-xs ml-1 text-white/70">
                                        ({product.reviewCount})
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Price */}
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">
                                ${product.price.toFixed(2)}
                            </span>
                            {hasDiscount && (
                                <span className="text-sm line-through text-white/60">
                                    ${product.compareAtPrice!.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* Add to Cart Button */}
                        {showAddToCart && product.inStock !== false && onAddToCart && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart(product.id);
                                }}
                                className="w-full mt-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all opacity-0 group-hover:opacity-100 hover:brightness-110"
                                style={{ 
                                    backgroundColor: effectiveColors.buttonBackground,
                                    color: effectiveColors.buttonText 
                                }}
                            >
                                <ShoppingCart size={18} />
                                Agregar al carrito
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Default styles (minimal, modern, elegant)
    return (
        <div
            className={`group relative rounded-xl overflow-hidden transition-all duration-300 ${styles.card} ${styles.cardHover}`}
            style={effectiveColors.cardBackground ? { backgroundColor: effectiveColors.cardBackground } : undefined}
        >
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">Sin imagen</span>
                    </div>
                )}

                {/* Discount Badge */}
                {hasDiscount && (
                    <div
                        className="absolute top-3 left-3 px-2 py-1 rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: '#ef4444' }}
                    >
                        -{discountPercentage}%
                    </div>
                )}

                {/* Out of Stock Badge */}
                {product.inStock === false && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium">
                            Agotado
                        </span>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {showWishlist && (
                        <button
                            onClick={() => onWishlistToggle(product.id)}
                            className={`p-2 rounded-full bg-white shadow-md transition-colors ${
                                isWishlisted ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                            }`}
                        >
                            <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                        </button>
                    )}
                    {showQuickView && onQuickView && (
                        <button
                            onClick={() => onQuickView(product.id)}
                            className="p-2 rounded-full bg-white shadow-md text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <Eye size={18} />
                        </button>
                    )}
                </div>

                {/* Add to Cart Button */}
                {showAddToCart && product.inStock !== false && onAddToCart && (
                    <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onAddToCart(product.id)}
                            className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            style={{ 
                                backgroundColor: effectiveColors.buttonBackground,
                                color: effectiveColors.buttonText 
                            }}
                        >
                            <ShoppingCart size={18} />
                            Agregar al carrito
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {product.category && (
                    <p 
                        className={`text-xs uppercase tracking-wide mb-1 ${styles.subtext}`}
                        style={effectiveColors.cardText || effectiveColors.text ? { color: effectiveColors.cardText || effectiveColors.text, opacity: 0.7 } : undefined}
                    >
                        {product.category}
                    </p>
                )}

                <h3 
                    className={`font-medium mb-2 line-clamp-2 ${styles.text}`}
                    style={effectiveColors.cardText || effectiveColors.heading ? { color: effectiveColors.cardText || effectiveColors.heading } : undefined}
                >
                    {product.name}
                </h3>

                {/* Rating */}
                {product.rating !== undefined && (
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
                            <span 
                                className={`text-xs ml-1 ${styles.subtext}`}
                                style={effectiveColors.cardText || effectiveColors.text ? { color: effectiveColors.cardText || effectiveColors.text, opacity: 0.6 } : undefined}
                            >
                                ({product.reviewCount})
                            </span>
                        )}
                    </div>
                )}

                {/* Price */}
                <div className="flex items-center gap-2">
                    <span 
                        className={`text-lg font-bold ${styles.text}`}
                        style={effectiveColors.accent ? { color: effectiveColors.accent } : undefined}
                    >
                        ${product.price.toFixed(2)}
                    </span>
                    {hasDiscount && (
                        <span 
                            className={`text-sm line-through ${styles.subtext}`}
                            style={effectiveColors.cardText || effectiveColors.text ? { color: effectiveColors.cardText || effectiveColors.text, opacity: 0.5 } : undefined}
                        >
                            ${product.compareAtPrice!.toFixed(2)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Products;



