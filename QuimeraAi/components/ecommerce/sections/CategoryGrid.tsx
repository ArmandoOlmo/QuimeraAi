/**
 * CategoryGrid Component
 * Displays product categories in various grid layouts
 * Connected to publicStores data
 * 
 * Uses unified storefront colors system - colors from Store Settings
 * with optional override from component data.colors
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryGridData, CategoryItem } from '../../../types/components';
import { useSafeProject } from '../../../contexts/project';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import { resolveI18nField } from '../../../utils/i18nContent';
import {
    getStorefrontAspectRatioClass,
    getStorefrontCardGapClass,
    getStorefrontContentPositionClass,
    getStorefrontOverlayGradient,
    getStorefrontPaddingXClass,
    getStorefrontPaddingYClass,
    getStorefrontRadiusClass,
    getStorefrontSectionBackgroundStyle,
    getStorefrontTextAlignmentClass,
} from './sectionVisualStyles';

interface CategoryGridProps {
    data: CategoryGridData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    onCategoryClick?: (categorySlug: string) => void;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({
    data,
    storeId,
    globalColors,
    onCategoryClick,
}) => {
    const { i18n } = useTranslation();
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const text = React.useCallback((value: any) => resolveI18nField(value, i18n.language), [i18n.language]);
    const title = text(data.title as any);
    const description = text(data.description as any);
    
    // Unified colors system - merges global theme with component-specific colors
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);
    
    const { categories: storeCategories, isLoading } = usePublicProducts(effectiveStoreId);

    // Use provided categories or fetch from store
    const categories: CategoryItem[] = React.useMemo(() => {
        if (data.categories && data.categories.length > 0) {
            return data.categories;
        }
        // Map store categories to CategoryItem format
        return storeCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: '',
            imageUrl: '',
            productCount: 0,
            slug: cat.slug,
        }));
    }, [data.categories, storeCategories]);

    // Style helpers
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
    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'center');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'center');

    const getGridCols = () => {
        const cols = data.columns || 4;
        switch (cols) {
            case 2: return 'sm:grid-cols-2';
            case 3: return 'sm:grid-cols-2 lg:grid-cols-3';
            case 5: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
            case 6: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
            default: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
        }
    };

    const getBorderRadius = () => getStorefrontRadiusClass(data.borderRadius, 'xl');

    const getAspectRatio = () => getStorefrontAspectRatioClass(data.imageAspectRatio, '4:5');

    const getObjectFit = () => {
        return data.imageObjectFit || 'cover';
    };

    const getCardGap = () => {
        return getStorefrontCardGapClass(data.cardGap, 'md');
    };

    // Category Card Component
    const CategoryCard = ({ category, index }: { category: CategoryItem; index: number }) => {
        const categoryName = text(category.name as any);
        const categoryDescription = category.description ? text(category.description as any) : '';
        const imageAlt = category.imageUrl ? categoryName : '';
        const handleClick = () => {
            if (category.slug) {
                onCategoryClick?.(category.slug);
            }
        };
        const baseCardButtonClass = `group relative block w-full text-left ${getBorderRadius()} overflow-hidden transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`;
        const focusStyle = {
            '--tw-ring-color': colors?.accent || '#4f46e5',
        } as React.CSSProperties;
        const placeholderStyle: React.CSSProperties = {
            background: `radial-gradient(circle at top left, rgba(255,255,255,0.24), transparent 42%), linear-gradient(135deg, ${colors?.accent || '#4f46e5'}66, ${colors?.cardBackground || '#0f172a'})`,
        };
        const overlayTextColor = colors?.buttonText || '#ffffff';
        const productCountLabel = data.showProductCount && category.productCount !== undefined
            ? `${category.productCount} productos`
            : '';

        // Cards variant
        if (data.variant === 'cards') {
            return (
                <button
                    type="button"
                    onClick={handleClick}
                    className={`${baseCardButtonClass} shadow-lg ring-1 ring-black/5 hover:-translate-y-1 hover:shadow-2xl`}
                    style={{ ...focusStyle, backgroundColor: colors?.cardBackground }}
                >
                    <div className={`relative ${getAspectRatio()} overflow-hidden`}>
                        {category.imageUrl ? (
                            <img
                                src={category.imageUrl}
                                alt={imageAlt}
                                className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                                style={{ objectFit: getObjectFit() }}
                            />
                        ) : (
                            <div className="h-full w-full" style={placeholderStyle}>
                                <span className="sr-only">Sin imagen</span>
                            </div>
                        )}
                        <div
                            className="absolute inset-0 flex flex-col justify-end p-4"
                            style={{
                                background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd),
                            }}
                        >
                            <h3 className="text-xl font-bold leading-tight drop-shadow-sm" style={{ color: colors?.buttonText || '#ffffff' }}>
                                {categoryName}
                            </h3>
                            {categoryDescription && (
                                <p className="mt-1 line-clamp-2 text-sm" style={{ color: colors?.buttonText || '#ffffff', opacity: 0.82 }}>
                                    {categoryDescription}
                                </p>
                            )}
                            {productCountLabel && (
                                <p className="mt-2 text-sm font-medium" style={{ color: colors?.buttonText || '#ffffff', opacity: 0.86 }}>
                                    {productCountLabel}
                                </p>
                            )}
                        </div>
                    </div>
                </button>
            );
        }

        // Overlay variant
        if (data.variant === 'overlay') {
            return (
                <button
                    type="button"
                    onClick={handleClick}
                    className={`${baseCardButtonClass} ${getAspectRatio()} hover:-translate-y-1 hover:shadow-2xl`}
                    style={focusStyle}
                >
                    {category.imageUrl ? (
                        <img
                            src={category.imageUrl}
                            alt={imageAlt}
                            className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                            style={{ objectFit: getObjectFit() }}
                        />
                    ) : (
                        <div className="w-full h-full" style={placeholderStyle} />
                    )}
                    <div
                        className="absolute inset-0 flex flex-col justify-end p-4 transition-opacity"
                        style={{
                            background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd),
                        }}
                    >
                        <h3 className="text-xl font-bold leading-tight drop-shadow-sm" style={{ color: colors?.buttonText }}>{categoryName}</h3>
                        {categoryDescription && (
                            <p className="mt-1 line-clamp-2 text-sm" style={{ color: colors?.buttonText, opacity: 0.82 }}>
                                {categoryDescription}
                            </p>
                        )}
                        {productCountLabel && (
                            <p className="mt-2 text-sm" style={{ color: colors?.buttonText, opacity: 0.82 }}>{productCountLabel}</p>
                        )}
                    </div>
                </button>
            );
        }

        if (data.variant === 'editorial') {
            return (
                <button
                    type="button"
                    onClick={handleClick}
                    className={`${baseCardButtonClass} min-h-[22rem] shadow-[0_22px_70px_rgba(15,23,42,0.18)] hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(15,23,42,0.24)]`}
                    style={focusStyle}
                >
                    {category.imageUrl ? (
                        <img
                            src={category.imageUrl}
                            alt={imageAlt}
                            className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105"
                            style={{ objectFit: getObjectFit() }}
                        />
                    ) : (
                        <div className="absolute inset-0" style={placeholderStyle} />
                    )}
                    <div
                        className="absolute inset-0"
                        style={{ background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd, 'rgba(0,0,0,0.2)') }}
                    />
                    {productCountLabel && (
                        <span
                            className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur-md"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.16)',
                                color: overlayTextColor,
                            }}
                        >
                            {productCountLabel}
                        </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                        <h3 className="text-2xl font-bold leading-tight drop-shadow-sm" style={{ color: overlayTextColor }}>
                            {categoryName}
                        </h3>
                        {categoryDescription && (
                            <p className="mt-2 line-clamp-2 max-w-sm text-sm leading-6" style={{ color: overlayTextColor, opacity: 0.84 }}>
                                {categoryDescription}
                            </p>
                        )}
                    </div>
                </button>
            );
        }

        if (data.variant === 'bento-overlay') {
            const isFeaturedCard = index === 0;

            return (
                <button
                    type="button"
                    onClick={handleClick}
                    className={`${baseCardButtonClass} ${isFeaturedCard ? 'min-h-[28rem] sm:col-span-2 sm:row-span-2' : 'min-h-[14rem]'} shadow-lg hover:-translate-y-1 hover:shadow-2xl`}
                    style={focusStyle}
                >
                    {category.imageUrl ? (
                        <img
                            src={category.imageUrl}
                            alt={imageAlt}
                            className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-110"
                            style={{ objectFit: getObjectFit() }}
                        />
                    ) : (
                        <div className="absolute inset-0" style={placeholderStyle} />
                    )}
                    <div
                        className="absolute inset-0"
                        style={{ background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd, 'rgba(0,0,0,0.22)') }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                        {productCountLabel && (
                            <span
                                className="mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.16)',
                                    color: overlayTextColor,
                                }}
                            >
                                {productCountLabel}
                            </span>
                        )}
                        <h3 className={`${isFeaturedCard ? 'text-3xl' : 'text-xl'} font-bold leading-tight drop-shadow-sm`} style={{ color: overlayTextColor }}>
                            {categoryName}
                        </h3>
                        {categoryDescription && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6" style={{ color: overlayTextColor, opacity: 0.84 }}>
                                {categoryDescription}
                            </p>
                        )}
                    </div>
                </button>
            );
        }

        // Minimal variant
        if (data.variant === 'minimal') {
            return (
                <button
                    type="button"
                    onClick={handleClick}
                    className="group w-full cursor-pointer text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={focusStyle}
                >
                    <div className={`${getAspectRatio()} ${getBorderRadius()} overflow-hidden mb-3 border-2 border-transparent group-hover:border-current transition-colors`}
                        style={{ borderColor: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = colors?.accent}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        {category.imageUrl ? (
                            <img
                                src={category.imageUrl}
                                alt={imageAlt}
                                className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                                style={{ objectFit: getObjectFit() }}
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: colors?.cardBackground }}
                            >
                                <span style={{ color: colors?.text }}>Sin imagen</span>
                            </div>
                        )}
                    </div>
                    <h3
                        className="font-medium group-hover:underline"
                        style={{ color: colors?.heading }}
                    >
                        {categoryName}
                    </h3>
                    {data.showProductCount && category.productCount !== undefined && (
                        <p className="text-sm" style={{ color: colors?.text }}>
                            {category.productCount} productos
                        </p>
                    )}
                </button>
            );
        }

        // Banner variant
        if (data.variant === 'banner') {
            return (
                <button
                    type="button"
                    onClick={handleClick}
                    className={`${baseCardButtonClass} h-48 hover:-translate-y-1 hover:shadow-2xl`}
                    style={focusStyle}
                >
                    {category.imageUrl ? (
                        <img
                            src={category.imageUrl}
                            alt={imageAlt}
                            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                            style={{ objectFit: getObjectFit() }}
                        />
                    ) : (
                        <div className="w-full h-full" style={placeholderStyle} />
                    )}
                    <div
                        className="absolute inset-0 flex items-end justify-start p-5"
                        style={{
                            background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd, 'rgba(0,0,0,0.28)'),
                        }}
                    >
                        <div>
                            <h3 className="text-2xl font-bold leading-tight drop-shadow-sm" style={{ color: colors?.buttonText }}>{categoryName}</h3>
                            {productCountLabel && (
                                <p className="mt-1" style={{ color: colors?.buttonText, opacity: 0.82 }}>{productCountLabel}</p>
                            )}
                        </div>
                    </div>
                </button>
            );
        }

        // Default to cards
        return null;
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
                                    style={{ color: colors?.heading }}
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
                        <div className={`grid grid-cols-1 ${getGridCols()} gap-6`}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl" style={{ backgroundColor: colors?.border }} />
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
            style={{
                ...getStorefrontSectionBackgroundStyle(data, colors?.background),
                fontFamily: colors?.fontFamily,
            }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                {(title || description) && (
                    <div className={`mb-10 flex flex-col ${getTextAlignment()}`}>
                        {title && (
                            <h2
                                className={`${getTitleSize()} font-bold mb-3`}
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

                {/* Categories Grid */}
                {categories.length === 0 ? (
                    <div className="text-center py-12" style={{ color: colors?.text }}>
                        No hay categorías disponibles
                    </div>
                ) : (
                    <div className={`flex ${getContentPosition()}`}>
                        <div className={`grid w-full grid-cols-1 ${getGridCols()} ${getCardGap()} ${data.variant === 'bento-overlay' ? 'auto-rows-[minmax(220px,auto)]' : ''}`}>
                            {categories.map((category, index) => (
                                <CategoryCard key={category.id} category={category} index={index} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default CategoryGrid;
