/**
 * FilterSidebar Component
 * Sidebar de filtros para búsqueda de productos
 */

import React, { useState } from 'react';
import {
    X,
    ChevronDown,
    ChevronUp,
    Check,
    SlidersHorizontal,
    RotateCcw,
} from 'lucide-react';
import { ProductFilters, PriceRange } from '../hooks/useProductSearch';
import SearchBar from './SearchBar';

interface ThemeColors {
    background?: string;
    text?: string;
    heading?: string;
    border?: string;
    cardBackground?: string;
    mutedText?: string;
    inputBackground?: string;
}

interface FilterSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    filters: ProductFilters;
    onFiltersChange: (filters: ProductFilters) => void;
    onReset: () => void;
    categories: Array<{ id: string; name: string; slug?: string; count: number }>;
    tags: string[];
    priceRange: { min: number; max: number };
    currencySymbol?: string;
    primaryColor?: string;
    /** Theme colors from the parent site for consistent styling */
    themeColors?: ThemeColors;
    // Search props
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    onSearch?: (term: string) => void;
    searchSuggestions?: string[];
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
    isOpen,
    onClose,
    filters,
    onFiltersChange,
    onReset,
    categories,
    tags,
    priceRange,
    currencySymbol = '$',
    primaryColor = '#6366f1',
    themeColors,
    searchTerm = '',
    onSearchChange,
    onSearch,
    searchSuggestions = [],
}) => {
    // Theme colors with fallbacks
    const colors = {
        background: themeColors?.background,
        text: themeColors?.text,
        heading: themeColors?.heading,
        border: themeColors?.border,
        cardBackground: themeColors?.cardBackground,
        mutedText: themeColors?.mutedText,
        inputBackground: themeColors?.inputBackground || themeColors?.cardBackground,
    };
    const hasThemeColors = Boolean(themeColors);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(['categories', 'price', 'availability'])
    );

    const [localPriceMin, setLocalPriceMin] = useState(filters.priceRange?.min ?? priceRange.min);
    const [localPriceMax, setLocalPriceMax] = useState(filters.priceRange?.max ?? priceRange.max);

    const toggleSection = (section: string) => {
        const newSet = new Set(expandedSections);
        if (newSet.has(section)) {
            newSet.delete(section);
        } else {
            newSet.add(section);
        }
        setExpandedSections(newSet);
    };

    const handleCategoryChange = (category: { id: string; slug?: string }) => {
        const isSelected = filters.categoryId === category.id || filters.categorySlug === category.slug;
        onFiltersChange({
            ...filters,
            categoryId: isSelected ? undefined : category.id,
            categorySlug: isSelected ? undefined : category.slug,
        });
    };
    
    // Check if a category is selected (by ID or slug)
    const isCategorySelected = (category: { id: string; slug?: string }) => {
        return filters.categoryId === category.id || filters.categorySlug === category.slug;
    };

    const handleTagToggle = (tag: string) => {
        const currentTags = filters.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter((t) => t !== tag)
            : [...currentTags, tag];
        onFiltersChange({
            ...filters,
            tags: newTags.length > 0 ? newTags : undefined,
        });
    };

    const handlePriceChange = () => {
        onFiltersChange({
            ...filters,
            priceRange: { min: localPriceMin, max: localPriceMax },
        });
    };

    const handleToggleFilter = (key: keyof ProductFilters) => {
        onFiltersChange({
            ...filters,
            [key]: filters[key] ? undefined : true,
        });
    };

    const activeFiltersCount =
        (filters.categoryId || filters.categorySlug ? 1 : 0) +
        (filters.tags?.length || 0) +
        (filters.priceRange ? 1 : 0) +
        (filters.inStock ? 1 : 0) +
        (filters.onSale ? 1 : 0) +
        (filters.featured ? 1 : 0);

    const SectionHeader: React.FC<{
        title: string;
        section: string;
        count?: number;
    }> = ({ title, section, count }) => (
        <button
            onClick={() => toggleSection(section)}
            className="w-full flex items-center justify-between py-3 text-left"
        >
            <span 
                className={hasThemeColors ? "font-medium" : "font-medium text-gray-900 dark:text-white"}
                style={colors?.heading ? { color: colors?.heading } : undefined}
            >
                {title}
                {count !== undefined && count > 0 && (
                    <span
                        className="ml-2 px-2 py-0.5 text-xs rounded-full text-white"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {count}
                    </span>
                )}
            </span>
            {expandedSections.has(section) ? (
                <ChevronUp 
                    size={18} 
                    className={hasThemeColors ? "" : "text-gray-400"}
                    style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                />
            ) : (
                <ChevronDown 
                    size={18}
                    className={hasThemeColors ? "" : "text-gray-400"}
                    style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                />
            )}
        </button>
    );

    const content = (
        <div className="h-full flex flex-col">
            {/* Search Bar */}
            {onSearchChange && onSearch && (
                <div 
                    className={hasThemeColors ? "p-4 border-b" : "p-4 border-b border-gray-200 dark:border-gray-700"}
                    style={colors?.border ? { borderColor: colors?.border } : undefined}
                >
                    <SearchBar
                        value={searchTerm}
                        onChange={onSearchChange}
                        onSearch={onSearch}
                        suggestions={searchSuggestions}
                        primaryColor={primaryColor}
                        themeColors={hasThemeColors ? {
                            background: colors?.cardBackground || colors?.background,
                            text: colors?.text,
                            border: colors?.border,
                            mutedText: colors?.mutedText,
                            inputBackground: colors?.inputBackground,
                        } : undefined}
                    />
                </div>
            )}
            
            {/* Header */}
            <div 
                className={hasThemeColors ? "flex items-center justify-between p-4 border-b" : "flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"}
                style={colors?.border ? { borderColor: colors?.border } : undefined}
            >
                <div className="flex items-center gap-2">
                    <SlidersHorizontal style={{ color: primaryColor }} size={20} />
                    <h2 
                        className={hasThemeColors ? "text-lg font-bold" : "text-lg font-bold text-gray-900 dark:text-white"}
                        style={colors?.heading ? { color: colors?.heading } : undefined}
                    >
                        Filtros
                    </h2>
                    {activeFiltersCount > 0 && (
                        <span
                            className="px-2 py-0.5 text-xs rounded-full text-white"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {activeFiltersCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={onReset}
                            className={hasThemeColors ? "p-2 transition-colors hover:opacity-70" : "p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"}
                            style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                            title="Limpiar filtros"
                        >
                            <RotateCcw size={18} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={hasThemeColors ? "lg:hidden p-2 transition-colors hover:opacity-70" : "lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"}
                        style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {/* Categories */}
                {categories.length > 0 && (
                    <div 
                        className={hasThemeColors ? "border-b" : "border-b border-gray-200 dark:border-gray-700"}
                        style={colors?.border ? { borderColor: colors?.border } : undefined}
                    >
                        <SectionHeader
                            title="Categorías"
                            section="categories"
                            count={filters.categoryId || filters.categorySlug ? 1 : 0}
                        />
                        {expandedSections.has('categories') && (
                            <div className="pb-4 space-y-2">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryChange(category)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                            isCategorySelected(category)
                                                ? 'text-white'
                                                : hasThemeColors 
                                                    ? 'hover:opacity-80'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                        style={
                                            isCategorySelected(category)
                                                ? { backgroundColor: primaryColor }
                                                : { color: colors?.text }
                                        }
                                    >
                                        <span>{category.name}</span>
                                        <span className="text-sm opacity-60">
                                            ({category.count})
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Price Range */}
                <div 
                    className={hasThemeColors ? "border-b" : "border-b border-gray-200 dark:border-gray-700"}
                    style={colors?.border ? { borderColor: colors?.border } : undefined}
                >
                    <SectionHeader
                        title="Precio"
                        section="price"
                        count={filters.priceRange ? 1 : 0}
                    />
                    {expandedSections.has('price') && (
                        <div className="pb-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label 
                                        className={hasThemeColors ? "text-xs mb-1 block" : "text-xs text-gray-500 dark:text-gray-400 mb-1 block"}
                                        style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                                    >
                                        Mínimo
                                    </label>
                                    <div className="relative">
                                        <span 
                                            className={hasThemeColors ? "absolute left-3 top-1/2 -translate-y-1/2" : "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"}
                                            style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                                        >
                                            {currencySymbol}
                                        </span>
                                        <input
                                            type="number"
                                            value={localPriceMin}
                                            onChange={(e) => setLocalPriceMin(Number(e.target.value))}
                                            onBlur={handlePriceChange}
                                            min={priceRange.min}
                                            max={localPriceMax}
                                            className={hasThemeColors 
                                                ? "w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                                                : "w-full pl-7 pr-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2"
                                            }
                                            style={{ 
                                                '--tw-ring-color': primaryColor,
                                                ...(hasThemeColors ? {
                                                    backgroundColor: colors?.inputBackground,
                                                    borderColor: colors?.border,
                                                    color: colors?.text,
                                                } : {})
                                            } as React.CSSProperties}
                                        />
                                    </div>
                                </div>
                                <span 
                                    className={hasThemeColors ? "mt-5" : "text-gray-400 mt-5"}
                                    style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                                >-</span>
                                <div className="flex-1">
                                    <label 
                                        className={hasThemeColors ? "text-xs mb-1 block" : "text-xs text-gray-500 dark:text-gray-400 mb-1 block"}
                                        style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                                    >
                                        Máximo
                                    </label>
                                    <div className="relative">
                                        <span 
                                            className={hasThemeColors ? "absolute left-3 top-1/2 -translate-y-1/2" : "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"}
                                            style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                                        >
                                            {currencySymbol}
                                        </span>
                                        <input
                                            type="number"
                                            value={localPriceMax}
                                            onChange={(e) => setLocalPriceMax(Number(e.target.value))}
                                            onBlur={handlePriceChange}
                                            min={localPriceMin}
                                            max={priceRange.max}
                                            className={hasThemeColors 
                                                ? "w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                                                : "w-full pl-7 pr-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2"
                                            }
                                            style={{ 
                                                '--tw-ring-color': primaryColor,
                                                ...(hasThemeColors ? {
                                                    backgroundColor: colors?.inputBackground,
                                                    borderColor: colors?.border,
                                                    color: colors?.text,
                                                } : {})
                                            } as React.CSSProperties}
                                        />
                                    </div>
                                </div>
                            </div>
                            <input
                                type="range"
                                min={priceRange.min}
                                max={priceRange.max}
                                value={localPriceMax}
                                onChange={(e) => {
                                    setLocalPriceMax(Number(e.target.value));
                                }}
                                onMouseUp={handlePriceChange}
                                onTouchEnd={handlePriceChange}
                                className="w-full accent-primary"
                                style={{ accentColor: primaryColor }}
                            />
                        </div>
                    )}
                </div>

                {/* Availability */}
                <div 
                    className={hasThemeColors ? "border-b" : "border-b border-gray-200 dark:border-gray-700"}
                    style={colors?.border ? { borderColor: colors?.border } : undefined}
                >
                    <SectionHeader title="Disponibilidad" section="availability" />
                    {expandedSections.has('availability') && (
                        <div className="pb-4 space-y-2">
                            <button
                                onClick={() => handleToggleFilter('inStock')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                    filters.inStock
                                        ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                                        : hasThemeColors 
                                            ? 'hover:opacity-80'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                style={!filters.inStock && colors?.text ? { color: colors?.text } : undefined}
                            >
                                <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                        filters.inStock
                                            ? 'border-green-500 bg-green-500'
                                            : hasThemeColors 
                                                ? ''
                                                : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    style={!filters.inStock && colors?.border ? { borderColor: colors?.border } : undefined}
                                >
                                    {filters.inStock && <Check size={14} className="text-white" />}
                                </div>
                                <span>En stock</span>
                            </button>
                            <button
                                onClick={() => handleToggleFilter('onSale')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                    filters.onSale
                                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                        : hasThemeColors 
                                            ? 'hover:opacity-80'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                style={!filters.onSale && colors?.text ? { color: colors?.text } : undefined}
                            >
                                <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                        filters.onSale
                                            ? 'border-red-500 bg-red-500'
                                            : hasThemeColors 
                                                ? ''
                                                : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    style={!filters.onSale && colors?.border ? { borderColor: colors?.border } : undefined}
                                >
                                    {filters.onSale && <Check size={14} className="text-white" />}
                                </div>
                                <span>En oferta</span>
                            </button>
                            <button
                                onClick={() => handleToggleFilter('featured')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                    filters.featured
                                        ? 'text-white'
                                        : hasThemeColors 
                                            ? 'hover:opacity-80'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                style={filters.featured 
                                    ? { backgroundColor: primaryColor } 
                                    : colors?.text ? { color: colors?.text } : {}
                                }
                            >
                                <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                        filters.featured
                                            ? 'border-white bg-white/20'
                                            : hasThemeColors 
                                                ? ''
                                                : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    style={!filters.featured && colors?.border ? { borderColor: colors?.border } : undefined}
                                >
                                    {filters.featured && <Check size={14} className="text-white" />}
                                </div>
                                <span>Destacados</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div>
                        <SectionHeader
                            title="Etiquetas"
                            section="tags"
                            count={filters.tags?.length || 0}
                        />
                        {expandedSections.has('tags') && (
                            <div className="pb-4 flex flex-wrap gap-2">
                                {tags.map((tag) => {
                                    const isSelected = filters.tags?.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => handleTagToggle(tag)}
                                            className={`px-3 py-1.5 text-sm rounded-full border-2 transition-colors ${
                                                isSelected
                                                    ? 'text-white'
                                                    : hasThemeColors
                                                        ? 'hover:opacity-80'
                                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                            }`}
                                            style={
                                                isSelected
                                                    ? { backgroundColor: primaryColor, borderColor: primaryColor }
                                                    : { 
                                                        borderColor: colors?.border, 
                                                        color: colors?.text 
                                                    }
                                            }
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:relative lg:translate-x-0
                    left-0 top-0 h-full lg:h-auto
                    w-80 lg:w-64
                    ${hasThemeColors ? '' : 'bg-white dark:bg-gray-800 lg:bg-transparent dark:lg:bg-transparent'}
                    shadow-xl lg:shadow-none
                    z-50 lg:z-auto
                    transform transition-transform duration-300
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
                style={hasThemeColors ? { backgroundColor: colors?.background } : undefined}
            >
                {content}
            </aside>
        </>
    );
};

export default FilterSidebar;
