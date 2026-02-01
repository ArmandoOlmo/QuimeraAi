/**
 * ProductSearchPage Component
 * Página de búsqueda y listado de productos con filtros
 */

import React, { useState, useMemo, useEffect } from 'react';
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
    cardText?: string;
    border?: string;
    priceColor?: string;
    salePriceColor?: string;
    mutedText?: string;
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
    /** Show/hide the filter sidebar. Default: true */
    showFilterSidebar?: boolean;
    /** Show/hide the search bar. Default: true */
    showSearchBar?: boolean;
    /** Show/hide the sort dropdown. Default: true */
    showSortOptions?: boolean;
    /** Show/hide view mode toggle (grid/list). Default: true */
    showViewModeToggle?: boolean;
    /** Default view mode. Default: 'grid' */
    defaultViewMode?: 'grid' | 'list';
    /** Products per page (for load more). Default: 12 */
    productsPerPage?: number;
    /** Grid columns for product cards. Default: 4 */
    gridColumns?: 2 | 3 | 4 | 5;
    /** Card style variant. Default: 'modern' */
    cardStyle?: 'minimal' | 'modern' | 'elegant' | 'overlay';
    /** Border radius for cards. Default: 'xl' */
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    /** Gap between cards. Default: 'md' */
    cardGap?: 'sm' | 'md' | 'lg';
    /** Vertical padding. Default: 'md' */
    paddingY?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    /** Horizontal padding. Default: 'md' */
    paddingX?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
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
    showFilterSidebar = true,
    showSearchBar = true,
    showSortOptions = true,
    showViewModeToggle = true,
    defaultViewMode = 'grid',
    productsPerPage = 12,
    gridColumns = 4,
    cardStyle = 'modern',
    borderRadius = 'xl',
    cardGap = 'md',
    paddingY = 'md',
    paddingX = 'md',
}) => {
    // Layout utility classes
    const gridColsClass = {
        2: 'sm:grid-cols-2',
        3: 'sm:grid-cols-2 lg:grid-cols-3',
        4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
    }[gridColumns];

    const cardGapClass = {
        sm: 'gap-3',
        md: 'gap-4 md:gap-6',
        lg: 'gap-6 md:gap-8',
    }[cardGap];

    const paddingYClass = {
        none: 'py-0',
        sm: 'py-4',
        md: 'py-6 md:py-8',
        lg: 'py-8 md:py-12',
        xl: 'py-12 md:py-16',
    }[paddingY];

    const paddingXClass = {
        none: 'px-0',
        sm: 'px-2 sm:px-4',
        md: 'px-4 sm:px-6 lg:px-8',
        lg: 'px-6 sm:px-8 lg:px-12',
        xl: 'px-8 sm:px-12 lg:px-16',
    }[paddingX];

    const borderRadiusClass = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full',
    }[borderRadius];
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [filters, setFilters] = useState<ProductFilters>({
        categorySlug: initialCategory, // Use slug for URL-based navigation
    });
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(defaultViewMode);
    const [showFilters, setShowFilters] = useState(false);

    // Sync viewMode when defaultViewMode prop changes
    useEffect(() => {
        setViewMode(defaultViewMode);
    }, [defaultViewMode]);

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
    } = useProductSearch(storeId, { filters, sortBy, pageSize: productsPerPage });

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

    // Use theme colors if provided, otherwise use defaults
    const colors = themeColors ? {
        text: themeColors.text || '#0f172a',
        heading: themeColors.heading || '#0f172a',
        background: themeColors.background || '#ffffff',
        cardBg: themeColors.cardBackground || '#ffffff',
        cardText: themeColors.cardText || themeColors.text || '#0f172a',
        border: themeColors.border || '#e2e8f0',
        priceColor: themeColors.priceColor || primaryColor,
        salePriceColor: themeColors.salePriceColor || '#ef4444',
        mutedText: themeColors.mutedText || themeColors.text || '#64748b',
    } : {
        text: '#0f172a',
        heading: '#0f172a',
        background: '#f9fafb',
        cardBg: '#ffffff',
        cardText: '#0f172a',
        border: '#e2e8f0',
        priceColor: primaryColor,
        salePriceColor: '#ef4444',
        mutedText: '#64748b',
    };

    return (
        <div
            className={embedded ? `${paddingYClass}` : "min-h-screen transition-colors duration-300"}
            style={{
                backgroundColor: embedded ? (colors.background || 'transparent') : (colors.background || '#f9fafb'),
                color: colors.text
            }}
        >
            {/* Title for embedded mode */}
            {embedded && title && (
                <div className={`max-w-7xl mx-auto ${paddingXClass} mb-6`}>
                    <h1
                        className="text-3xl font-bold"
                        style={{ color: colors?.heading || undefined }}
                    >
                        {title}
                    </h1>
                </div>
            )}

            {/* Header - Only show when NOT embedded */}
            {!embedded && (
                <div
                    className="border-b sticky top-0 z-30 transition-colors duration-300"
                    style={{
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border
                    }}
                >
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
                            {showSearchBar && (
                                <div className="flex-1 max-w-xl">
                                    <SearchBar
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        onSearch={handleSearch}
                                        suggestions={suggestions}
                                        primaryColor={primaryColor}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Bottom Row */}
                        <div className="py-3 flex items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                                {/* Filter Toggle (Mobile) */}
                                {showFilterSidebar && (
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
                                )}

                                {/* Results Count */}
                                <span className="text-sm" style={{ color: colors.mutedText }}>
                                    {totalCount} producto{totalCount !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Sort */}
                                {showSortOptions && (
                                    <div className="relative">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => handleSortChange(e.target.value as SortOption)}
                                            className="appearance-none px-3 py-2 pr-8 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors"
                                            style={{
                                                backgroundColor: colors.cardBg,
                                                borderColor: colors.border,
                                                color: colors.text,
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
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                            size={16}
                                        />
                                    </div>
                                )}

                                {/* View Mode */}
                                {showViewModeToggle && (
                                    <div
                                        className="hidden sm:flex items-center rounded-lg p-1"
                                        style={{ backgroundColor: colors.background }}
                                    >
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                                                ? 'shadow-sm'
                                                : 'text-opacity-70 hover:text-opacity-100'
                                                }`}
                                            style={{
                                                backgroundColor: viewMode === 'grid' ? primaryColor : 'transparent',
                                                color: viewMode === 'grid' ? '#ffffff' : colors.text
                                            }}
                                        >
                                            <Grid size={18} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                                                ? 'shadow-sm'
                                                : 'text-opacity-70 hover:text-opacity-100'
                                                }`}
                                            style={{
                                                backgroundColor: viewMode === 'list' ? primaryColor : 'transparent',
                                                color: viewMode === 'list' ? '#ffffff' : colors.text
                                            }}
                                        >
                                            <List size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Embedded mode toolbar */}
            {embedded && (
                <div className={`max-w-7xl mx-auto ${paddingXClass} mb-6`}>
                    <div
                        className="flex items-center justify-between gap-4 pb-4 border-b"
                        style={{ borderColor: colors?.border || undefined }}
                    >
                        <div className="flex items-center gap-4">
                            {/* Filter Toggle (Mobile) */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                                style={{
                                    backgroundColor: colors?.cardBg || undefined,
                                    color: colors?.text || undefined,
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
                                style={{ color: colors?.text || undefined }}
                            >
                                {totalCount} producto{totalCount !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Sort */}
                            {showSortOptions && (
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => handleSortChange(e.target.value as SortOption)}
                                        className="appearance-none px-3 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2"
                                        style={{
                                            backgroundColor: colors?.cardBg || undefined,
                                            borderColor: colors?.border || undefined,
                                            color: colors?.text || undefined,
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
                                        style={{ color: colors?.text || undefined }}
                                    />
                                </div>
                            )}

                            {/* View Mode */}
                            {showViewModeToggle && (
                                <div
                                    className="hidden sm:flex items-center rounded-lg p-1"
                                    style={{ backgroundColor: colors?.cardBg || undefined }}
                                >
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className="p-2 rounded-md transition-colors"
                                        style={{
                                            backgroundColor: viewMode === 'grid' ? primaryColor : 'transparent',
                                            color: viewMode === 'grid' ? '#ffffff' : colors?.text || undefined,
                                        }}
                                    >
                                        <Grid size={18} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className="p-2 rounded-md transition-colors"
                                        style={{
                                            backgroundColor: viewMode === 'list' ? primaryColor : 'transparent',
                                            color: viewMode === 'list' ? '#ffffff' : colors?.text || undefined,
                                        }}
                                    >
                                        <List size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={`max-w-7xl mx-auto ${embedded ? paddingXClass : 'px-4 sm:px-6 lg:px-8 py-6'}`}>
                <div className="flex gap-6">
                    {/* Sidebar */}
                    {showFilterSidebar && (
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
                            themeColors={embedded && themeColors ? {
                                background: themeColors.cardBackground,
                                text: colors?.text,
                                heading: colors?.heading,
                                border: colors?.border,
                                cardBackground: colors?.cardBg,
                                mutedText: colors?.mutedText,
                                inputBackground: colors?.cardBg,
                            } : undefined}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            onSearch={handleSearch}
                            searchSuggestions={suggestions}
                        />
                    )}

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
                                <h3 className="text-xl font-bold mb-2" style={{ color: colors.heading }}>
                                    No se encontraron productos
                                </h3>
                                <p className="mb-6" style={{ color: colors.mutedText }}>
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
                                    <div className={`grid grid-cols-1 ${gridColsClass} ${cardGapClass}`}>
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
                                                borderRadiusClass={borderRadiusClass}
                                                cardStyle={cardStyle}
                                                colors={embedded ? {
                                                    cardBackground: colors?.cardBg,
                                                    cardText: colors?.cardText,
                                                    heading: colors?.heading,
                                                    mutedText: colors?.mutedText,
                                                    border: colors?.border,
                                                    priceColor: colors?.priceColor,
                                                    salePriceColor: colors?.salePriceColor,
                                                } : undefined}
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
                                                borderRadiusClass={borderRadiusClass}
                                                colors={embedded ? {
                                                    cardBackground: colors?.cardBg,
                                                    cardText: colors?.cardText,
                                                    heading: colors?.heading,
                                                    mutedText: colors?.mutedText,
                                                    border: colors?.border,
                                                    priceColor: colors?.priceColor,
                                                    salePriceColor: colors?.salePriceColor,
                                                } : undefined}
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
interface ProductCardColors {
    cardBackground?: string;
    cardText?: string;
    heading?: string;
    mutedText?: string;
    border?: string;
    priceColor?: string;
    salePriceColor?: string;
}

interface ProductCardProps {
    product: PublicProduct;
    onClick: () => void;
    onAddToCart?: () => void;
    isInWishlist: boolean;
    onToggleWishlist: () => void;
    currencySymbol: string;
    primaryColor: string;
    borderRadiusClass?: string;
    cardStyle?: 'minimal' | 'modern' | 'elegant' | 'overlay';
    colors?: ProductCardColors;
}

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    onClick,
    onAddToCart,
    isInWishlist,
    onToggleWishlist,
    currencySymbol,
    primaryColor,
    borderRadiusClass = 'rounded-xl',
    cardStyle = 'modern',
    colors,
}) => {
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
        ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
        : 0;

    // Merge colors with defaults
    const cardColors = {
        cardBackground: colors?.cardBackground,
        cardText: colors?.cardText,
        heading: colors?.heading,
        mutedText: colors?.mutedText,
        border: colors?.border,
        priceColor: colors?.priceColor || primaryColor,
        salePriceColor: colors?.salePriceColor || '#ef4444',
    };

    // Overlay style - full image with text on top
    if (cardStyle === 'overlay') {
        return (
            <div
                className={`${borderRadiusClass} overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer`}
                onClick={onClick}
            >
                {/* Full Image with Overlay Content */}
                <div className="relative aspect-square overflow-hidden">
                    {product.images?.[0]?.url ? (
                        <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700"
                            style={{ color: cardColors.mutedText }}
                        >
                            <Package size={48} />
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {hasDiscount && (
                            <span
                                className="px-2 py-1 text-white text-xs font-bold rounded-full"
                                style={{ backgroundColor: cardColors.salePriceColor }}
                            >
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

                    {/* Content Overlay - Text on Image */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-semibold text-white truncate">
                            {product.name}
                        </h3>

                        {/* Rating */}
                        {product.reviewStats && product.reviewStats.totalReviews > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                                <RatingStars rating={product.reviewStats.averageRating} size="sm" />
                                <span className="text-xs text-white/70">
                                    ({product.reviewStats.totalReviews})
                                </span>
                            </div>
                        )}

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-lg font-bold text-white">
                                {currencySymbol}{product.price.toFixed(2)}
                            </span>
                            {hasDiscount && (
                                <span className="text-sm line-through text-white/60">
                                    {currencySymbol}{product.compareAtPrice!.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* Add to Cart */}
                        {onAddToCart && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart();
                                }}
                                className="w-full mt-3 py-2 text-white text-sm font-medium rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:brightness-110"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Agregar al carrito
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Card style variations - use theme colors if provided (for non-overlay styles)
    const getCardStyle = () => {
        if (cardColors.cardBackground) {
            const baseStyle = cardStyle === 'minimal'
                ? 'border-0 shadow-none'
                : cardStyle === 'elegant'
                    ? 'shadow-lg border-0'
                    : 'shadow-sm';
            return baseStyle;
        }
        return {
            minimal: 'bg-transparent border-0 shadow-none',
            modern: 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700',
            elegant: 'bg-white dark:bg-gray-800 shadow-lg border-0',
            overlay: '', // Handled separately above
        }[cardStyle];
    };

    // Default styles (minimal, modern, elegant)
    return (
        <div
            className={`${getCardStyle()} ${borderRadiusClass} overflow-hidden group transition-all duration-300 hover:-translate-y-1`}
            style={{
                backgroundColor: cardColors.cardBackground,
                borderColor: cardColors.border,
                borderWidth: cardColors.border ? '1px' : undefined,
                borderStyle: cardColors.border ? 'solid' : undefined,
            }}
        >
            {/* Image */}
            <div
                className="relative aspect-square cursor-pointer overflow-hidden"
                style={{ backgroundColor: cardColors.mutedText ? `${cardColors.mutedText}20` : undefined }}
                onClick={onClick}
            >
                {product.images?.[0]?.url ? (
                    <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ color: cardColors.mutedText }}
                    >
                        <Package size={48} />
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {hasDiscount && (
                        <span
                            className="px-2 py-1 text-white text-xs font-bold rounded-full"
                            style={{ backgroundColor: cardColors.salePriceColor }}
                        >
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
                    className="font-medium truncate cursor-pointer hover:underline"
                    style={{ color: cardColors.heading }}
                    onClick={onClick}
                >
                    {product.name}
                </h3>

                {/* Rating */}
                {product.reviewStats && product.reviewStats.totalReviews > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                        <RatingStars rating={product.reviewStats.averageRating} size="sm" />
                        <span
                            className="text-xs"
                            style={{ color: cardColors.mutedText }}
                        >
                            ({product.reviewStats.totalReviews})
                        </span>
                    </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold" style={{ color: cardColors.priceColor }}>
                        {currencySymbol}{product.price.toFixed(2)}
                    </span>
                    {hasDiscount && (
                        <span
                            className="text-sm line-through"
                            style={{ color: cardColors.mutedText }}
                        >
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
    borderRadiusClass = 'rounded-xl',
    colors,
}) => {
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

    // Merge colors with defaults
    const cardColors = {
        cardBackground: colors?.cardBackground,
        cardText: colors?.cardText,
        heading: colors?.heading,
        mutedText: colors?.mutedText,
        border: colors?.border,
        priceColor: colors?.priceColor || primaryColor,
        salePriceColor: colors?.salePriceColor || '#ef4444',
    };

    return (
        <div
            className={`${borderRadiusClass} overflow-hidden shadow-sm flex`}
            style={{
                backgroundColor: cardColors.cardBackground,
                borderColor: cardColors.border,
                borderWidth: '1px',
                borderStyle: 'solid',
            }}
        >
            {/* Image */}
            <div
                className="w-32 sm:w-48 flex-shrink-0 cursor-pointer"
                style={{ backgroundColor: cardColors.mutedText ? `${cardColors.mutedText}20` : undefined }}
                onClick={onClick}
            >
                {product.images?.[0]?.url ? (
                    <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ color: cardColors.mutedText }}
                    >
                        <Package size={32} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                    <h3
                        className="font-medium cursor-pointer hover:underline"
                        style={{ color: cardColors.heading }}
                        onClick={onClick}
                    >
                        {product.name}
                    </h3>
                    {product.shortDescription && (
                        <p
                            className="text-sm mt-1 line-clamp-2"
                            style={{ color: cardColors.cardText || cardColors.mutedText }}
                        >
                            {product.shortDescription}
                        </p>
                    )}
                    {product.reviewStats && product.reviewStats.totalReviews > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                            <RatingStars rating={product.reviewStats.averageRating} size="sm" />
                            <span
                                className="text-xs"
                                style={{ color: cardColors.mutedText }}
                            >
                                ({product.reviewStats.totalReviews})
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold" style={{ color: cardColors.priceColor }}>
                            {currencySymbol}{product.price.toFixed(2)}
                        </span>
                        {hasDiscount && (
                            <span
                                className="text-sm line-through"
                                style={{ color: cardColors.mutedText }}
                            >
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
