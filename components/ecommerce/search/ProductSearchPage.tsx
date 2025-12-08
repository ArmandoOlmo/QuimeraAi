/**
 * ProductSearchPage Component
 * Página de búsqueda y listado de productos con filtros
 */

import React, { useState, useMemo } from 'react';
import {
    Grid,
    List,
    SlidersHorizontal,
    ChevronDown,
    Loader2,
    Package,
    ArrowLeft,
} from 'lucide-react';
import { useProductSearch, SortOption, ProductFilters } from '../hooks/useProductSearch';
import { useWishlist } from '../hooks/useWishlist';
import { PublicProduct } from '../hooks/usePublicProduct';
import SearchBar from './SearchBar';
import FilterSidebar from './FilterSidebar';
import { WishlistButton } from '../wishlist';
import { RatingStars } from '../reviews';

interface ThemeColors {
    background?: string;
    text?: string;
    heading?: string;
    cardBackground?: string;
    border?: string;
}

interface ProductSearchPageProps {
    storeId: string;
    userId?: string | null;
    onProductClick: (slug: string) => void;
    onAddToCart?: (product: PublicProduct) => void;
    onBack?: () => void;
    initialCategory?: string;
    initialSearch?: string;
    currencySymbol?: string;
    primaryColor?: string;
    /** When true, removes the sticky header and uses a simpler layout for embedding in other pages */
    embedded?: boolean;
    /** Title to show when embedded (e.g., category name) */
    title?: string;
    /** Theme colors from the parent site for embedded mode */
    themeColors?: ThemeColors;
}

const ProductSearchPage: React.FC<ProductSearchPageProps> = ({
    storeId,
    userId,
    onProductClick,
    onAddToCart,
    onBack,
    initialCategory,
    initialSearch = '',
    currencySymbol = '$',
    primaryColor = '#6366f1',
    embedded = false,
    title,
    themeColors,
}) => {
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [filters, setFilters] = useState<ProductFilters>({
        categorySlug: initialCategory, // Use slug for URL-based navigation
    });
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);

    const {
        products,
        totalCount,
        isLoading,
        isLoadingMore,
        hasMore,
        search,
        applyFilters,
        setSortBy: setSort,
        loadMore,
        reset,
        availableCategories,
        availableTags,
        priceStats,
    } = useProductSearch(storeId, { filters, sortBy });

    const wishlist = useWishlist(storeId, userId);

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'newest', label: 'Más recientes' },
        { value: 'oldest', label: 'Más antiguos' },
        { value: 'price_asc', label: 'Precio: menor a mayor' },
        { value: 'price_desc', label: 'Precio: mayor a menor' },
        { value: 'name_asc', label: 'Nombre: A-Z' },
        { value: 'name_desc', label: 'Nombre: Z-A' },
        { value: 'popular', label: 'Más populares' },
    ];

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        search(term);
    };

    const handleFiltersChange = (newFilters: ProductFilters) => {
        setFilters(newFilters);
        applyFilters(newFilters);
    };

    const handleSortChange = (newSort: SortOption) => {
        setSortBy(newSort);
        setSort(newSort);
    };

    const handleReset = () => {
        setSearchTerm('');
        setFilters({});
        setSortBy('newest');
        reset();
    };

    // Suggestions based on products
    const suggestions = useMemo(() => {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();
        const productNames = products
            .filter((p) => p.name.toLowerCase().includes(term))
            .map((p) => p.name)
            .slice(0, 5);
        return productNames;
    }, [searchTerm, products]);

    const activeFiltersCount =
        (filters.categoryId ? 1 : 0) +
        (filters.tags?.length || 0) +
        (filters.priceRange ? 1 : 0) +
        (filters.inStock ? 1 : 0) +
        (filters.onSale ? 1 : 0) +
        (filters.featured ? 1 : 0);

    // Use theme colors when embedded, otherwise use defaults
    const colors = embedded && themeColors ? {
        text: themeColors.text || '#94a3b8',
        heading: themeColors.heading || '#ffffff',
        cardBg: themeColors.cardBackground || '#1e293b',
        border: themeColors.border || '#334155',
    } : {
        text: '',
        heading: '',
        cardBg: '',
        border: '',
    };

    return (
        <div 
            className={embedded ? "pt-6 pb-12" : "min-h-screen bg-gray-50 dark:bg-gray-900"}
            style={embedded ? { backgroundColor: themeColors?.background || 'transparent' } : undefined}
        >
            {/* Title for embedded mode */}
            {embedded && title && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                    <h1 
                        className="text-3xl font-bold"
                        style={{ color: colors.heading || undefined }}
                    >
                        {title}
                    </h1>
                </div>
            )}
            
            {/* Header - Only show when NOT embedded */}
            {!embedded && (
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Top Row */}
                        <div className="py-4 flex items-center gap-4">
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                            )}
                            <div className="flex-1 max-w-xl">
                                <SearchBar
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    onSearch={handleSearch}
                                    suggestions={suggestions}
                                    primaryColor={primaryColor}
                                />
                            </div>
                        </div>

                        {/* Bottom Row */}
                        <div className="py-3 flex items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                                {/* Filter Toggle (Mobile) */}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                                >
                                    <SlidersHorizontal size={18} />
                                    Filtros
                                    {activeFiltersCount > 0 && (
                                        <span
                                            className="px-1.5 py-0.5 text-xs text-white rounded-full"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </button>

                                {/* Results Count */}
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {totalCount} producto{totalCount !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Sort */}
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => handleSortChange(e.target.value as SortOption)}
                                        className="appearance-none px-3 py-2 pr-8 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                    size={16}
                                />
                            </div>

                            {/* View Mode */}
                            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    <Grid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Embedded mode toolbar */}
            {embedded && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                    <div 
                        className="flex items-center justify-between gap-4 pb-4 border-b"
                        style={{ borderColor: colors.border || undefined }}
                    >
                        <div className="flex items-center gap-4">
                            {/* Filter Toggle (Mobile) */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                                style={{ 
                                    backgroundColor: colors.cardBg || undefined,
                                    color: colors.text || undefined,
                                }}
                            >
                                <SlidersHorizontal size={18} />
                                Filtros
                                {activeFiltersCount > 0 && (
                                    <span
                                        className="px-1.5 py-0.5 text-xs text-white rounded-full"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>

                            {/* Results Count */}
                            <span 
                                className="text-sm"
                                style={{ color: colors.text || undefined }}
                            >
                                {totalCount} producto{totalCount !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Sort */}
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => handleSortChange(e.target.value as SortOption)}
                                    className="appearance-none px-3 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2"
                                    style={{ 
                                        backgroundColor: colors.cardBg || undefined,
                                        borderColor: colors.border || undefined,
                                        color: colors.text || undefined,
                                        '--tw-ring-color': primaryColor 
                                    } as React.CSSProperties}
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                                    size={16}
                                    style={{ color: colors.text || undefined }}
                                />
                            </div>

                            {/* View Mode */}
                            <div 
                                className="hidden sm:flex items-center rounded-lg p-1"
                                style={{ backgroundColor: colors.cardBg || undefined }}
                            >
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className="p-2 rounded-md transition-colors"
                                    style={{ 
                                        backgroundColor: viewMode === 'grid' ? primaryColor : 'transparent',
                                        color: viewMode === 'grid' ? '#ffffff' : colors.text || undefined,
                                    }}
                                >
                                    <Grid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className="p-2 rounded-md transition-colors"
                                    style={{ 
                                        backgroundColor: viewMode === 'list' ? primaryColor : 'transparent',
                                        color: viewMode === 'list' ? '#ffffff' : colors.text || undefined,
                                    }}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${embedded ? '' : 'py-6'}`}>
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <FilterSidebar
                        isOpen={showFilters}
                        onClose={() => setShowFilters(false)}
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        onReset={handleReset}
                        categories={availableCategories}
                        tags={availableTags}
                        priceRange={priceStats}
                        currencySymbol={currencySymbol}
                        primaryColor={primaryColor}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onSearch={handleSearch}
                        searchSuggestions={suggestions}
                    />

                    {/* Products */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2
                                    className="animate-spin"
                                    size={48}
                                    style={{ color: primaryColor }}
                                />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-16">
                                <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    No se encontraron productos
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Intenta con otros filtros o términos de búsqueda
                                </p>
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 text-white rounded-lg transition-colors"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Grid View */}
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {products.map((product) => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                onClick={() => onProductClick(product.slug)}
                                                onAddToCart={onAddToCart ? () => onAddToCart(product) : undefined}
                                                isInWishlist={wishlist.isInWishlist(product.id)}
                                                onToggleWishlist={() => wishlist.toggleWishlist(product)}
                                                currencySymbol={currencySymbol}
                                                primaryColor={primaryColor}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    /* List View */
                                    <div className="space-y-4">
                                        {products.map((product) => (
                                            <ProductListItem
                                                key={product.id}
                                                product={product}
                                                onClick={() => onProductClick(product.slug)}
                                                onAddToCart={onAddToCart ? () => onAddToCart(product) : undefined}
                                                isInWishlist={wishlist.isInWishlist(product.id)}
                                                onToggleWishlist={() => wishlist.toggleWishlist(product)}
                                                currencySymbol={currencySymbol}
                                                primaryColor={primaryColor}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Load More */}
                                {hasMore && (
                                    <div className="mt-8 text-center">
                                        <button
                                            onClick={loadMore}
                                            disabled={isLoadingMore}
                                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                                        >
                                            {isLoadingMore ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={18} />
                                                    Cargando...
                                                </>
                                            ) : (
                                                'Cargar más productos'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Product Card Component
interface ProductCardProps {
    product: PublicProduct;
    onClick: () => void;
    onAddToCart?: () => void;
    isInWishlist: boolean;
    onToggleWishlist: () => void;
    currencySymbol: string;
    primaryColor: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    onClick,
    onAddToCart,
    isInWishlist,
    onToggleWishlist,
    currencySymbol,
    primaryColor,
}) => {
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
        ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
        : 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 group">
            {/* Image */}
            <div
                className="relative aspect-square bg-gray-100 dark:bg-gray-700 cursor-pointer overflow-hidden"
                onClick={onClick}
            >
                {product.images?.[0]?.url ? (
                    <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package size={48} />
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {hasDiscount && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                            -{discountPercent}%
                        </span>
                    )}
                    {product.isFeatured && (
                        <span
                            className="px-2 py-1 text-white text-xs font-bold rounded-full"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Destacado
                        </span>
                    )}
                </div>

                {/* Wishlist Button */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <WishlistButton
                        product={product}
                        isInWishlist={isInWishlist}
                        onToggle={async () => onToggleWishlist()}
                        size="sm"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3
                    className="font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                    onClick={onClick}
                >
                    {product.name}
                </h3>

                {/* Rating */}
                {product.reviewStats && product.reviewStats.totalReviews > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                        <RatingStars rating={product.reviewStats.averageRating} size="sm" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({product.reviewStats.totalReviews})
                        </span>
                    </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                        {currencySymbol}{product.price.toFixed(2)}
                    </span>
                    {hasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                            {currencySymbol}{product.compareAtPrice!.toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Add to Cart */}
                {onAddToCart && (
                    <button
                        onClick={onAddToCart}
                        className="w-full mt-3 py-2 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Agregar al carrito
                    </button>
                )}
            </div>
        </div>
    );
};

// Product List Item Component
const ProductListItem: React.FC<ProductCardProps> = ({
    product,
    onClick,
    onAddToCart,
    isInWishlist,
    onToggleWishlist,
    currencySymbol,
    primaryColor,
}) => {
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 flex">
            {/* Image */}
            <div
                className="w-32 sm:w-48 flex-shrink-0 bg-gray-100 dark:bg-gray-700 cursor-pointer"
                onClick={onClick}
            >
                {product.images?.[0]?.url ? (
                    <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package size={32} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                    <h3
                        className="font-medium text-gray-900 dark:text-white cursor-pointer hover:underline"
                        onClick={onClick}
                    >
                        {product.name}
                    </h3>
                    {product.shortDescription && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {product.shortDescription}
                        </p>
                    )}
                    {product.reviewStats && product.reviewStats.totalReviews > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                            <RatingStars rating={product.reviewStats.averageRating} size="sm" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({product.reviewStats.totalReviews})
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold" style={{ color: primaryColor }}>
                            {currencySymbol}{product.price.toFixed(2)}
                        </span>
                        {hasDiscount && (
                            <span className="text-sm text-gray-400 line-through">
                                {currencySymbol}{product.compareAtPrice!.toFixed(2)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <WishlistButton
                            product={product}
                            isInWishlist={isInWishlist}
                            onToggle={async () => onToggleWishlist()}
                            size="sm"
                        />
                        {onAddToCart && (
                            <button
                                onClick={onAddToCart}
                                className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Agregar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductSearchPage;
