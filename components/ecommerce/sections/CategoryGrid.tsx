/**
 * CategoryGrid Component
 * Displays product categories in various grid layouts
 * Connected to publicStores data
 * 
 * Uses unified storefront colors system - colors from Store Settings
 * with optional override from component data.colors
 */

import React from 'react';
import { CategoryGridData, CategoryItem } from '../../../types/components';
import { useSafeEditor } from '../../../contexts/EditorContext';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';

interface CategoryGridProps {
    data: CategoryGridData;
    storeId?: string;
    onCategoryClick?: (categorySlug: string) => void;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({
    data,
    storeId,
    onCategoryClick,
}) => {
    const editorContext = useSafeEditor();
    const effectiveStoreId = storeId || editorContext?.activeProjectId || '';
    
    // Unified colors system - merges global theme with component-specific colors
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors);
    
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
            case 6: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
            default: return 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
        }
    };

    const getBorderRadius = () => {
        const map = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-3xl' };
        return map[data.borderRadius || 'xl'] || 'rounded-xl';
    };

    const getAspectRatio = () => {
        const map = {
            'auto': 'aspect-auto',
            '1:1': 'aspect-square',
            '4:3': 'aspect-[4/3]',
            '3:4': 'aspect-[3/4]',
            '16:9': 'aspect-video',
            '9:16': 'aspect-[9/16]',
        };
        return map[data.imageAspectRatio] || 'aspect-square';
    };

    const getObjectFit = () => {
        return data.imageObjectFit || 'cover';
    };

    // Category Card Component
    const CategoryCard = ({ category }: { category: CategoryItem }) => {
        const handleClick = () => {
            if (category.slug) {
                onCategoryClick?.(category.slug);
            }
        };

        // Cards variant
        if (data.variant === 'cards') {
            return (
                <div
                    onClick={handleClick}
                    className={`group cursor-pointer ${getBorderRadius()} overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                    style={{ backgroundColor: colors?.cardBackground }}
                >
                    <div className={`${getAspectRatio()} overflow-hidden`}>
                        {category.imageUrl ? (
                            <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                                style={{ objectFit: getObjectFit() }}
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: colors?.accent + '20' }}
                            >
                                <span style={{ color: colors?.cardText }}>Sin imagen</span>
                            </div>
                        )}
                    </div>
                    <div className="p-4">
                        <h3
                            className="font-semibold text-lg mb-1"
                            style={{ color: colors?.cardText || colors?.heading }}
                        >
                            {category.name}
                        </h3>
                        {data.showProductCount && category.productCount !== undefined && (
                            <p className="text-sm" style={{ color: colors?.text }}>
                                {category.productCount} productos
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        // Overlay variant
        if (data.variant === 'overlay') {
            return (
                <div
                    onClick={handleClick}
                    className={`group cursor-pointer ${getBorderRadius()} overflow-hidden relative ${getAspectRatio()}`}
                >
                    {category.imageUrl ? (
                        <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                            style={{ objectFit: getObjectFit() }}
                        />
                    ) : (
                        <div
                            className="w-full h-full"
                            style={{ backgroundColor: colors?.cardBackground }}
                        />
                    )}
                    <div
                        className="absolute inset-0 flex flex-col justify-end p-4 transition-opacity"
                        style={{
                            background: `linear-gradient(to top, ${colors?.overlayEnd}, ${colors?.overlayStart})`,
                        }}
                    >
                        <h3 className="font-bold text-xl" style={{ color: colors?.buttonText }}>{category.name}</h3>
                        {data.showProductCount && category.productCount !== undefined && (
                            <p className="text-sm" style={{ color: colors?.buttonText, opacity: 0.8 }}>{category.productCount} productos</p>
                        )}
                    </div>
                </div>
            );
        }

        // Minimal variant
        if (data.variant === 'minimal') {
            return (
                <div
                    onClick={handleClick}
                    className="group cursor-pointer text-center"
                >
                    <div className={`${getAspectRatio()} ${getBorderRadius()} overflow-hidden mb-3 border-2 border-transparent group-hover:border-current transition-colors`}
                        style={{ borderColor: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = colors?.accent}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        {category.imageUrl ? (
                            <img
                                src={category.imageUrl}
                                alt={category.name}
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
                        {category.name}
                    </h3>
                    {data.showProductCount && category.productCount !== undefined && (
                        <p className="text-sm" style={{ color: colors?.text }}>
                            {category.productCount} productos
                        </p>
                    )}
                </div>
            );
        }

        // Banner variant
        if (data.variant === 'banner') {
            return (
                <div
                    onClick={handleClick}
                    className={`group cursor-pointer ${getBorderRadius()} overflow-hidden relative h-48`}
                >
                    {category.imageUrl ? (
                        <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                            style={{ objectFit: getObjectFit() }}
                        />
                    ) : (
                        <div
                            className="w-full h-full"
                            style={{ backgroundColor: colors?.cardBackground }}
                        />
                    )}
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                            background: `linear-gradient(to right, ${colors?.overlayEnd}, ${colors?.overlayStart})`,
                        }}
                    >
                        <div className="text-center">
                            <h3 className="font-bold text-2xl mb-1" style={{ color: colors?.buttonText }}>{category.name}</h3>
                            {data.showProductCount && category.productCount !== undefined && (
                                <p style={{ color: colors?.buttonText, opacity: 0.8 }}>{category.productCount} productos</p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Default to cards
        return null;
    };

    if (isLoading) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={{ backgroundColor: colors?.background }}>
                <div className="max-w-7xl mx-auto">
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
            style={{ backgroundColor: colors?.background, fontFamily: colors?.fontFamily }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                {(data.title || data.description) && (
                    <div className="text-center mb-10">
                        {data.title && (
                            <h2
                                className={`${getTitleSize()} font-bold mb-3`}
                                style={{ color: colors?.heading, fontFamily: colors?.headingFontFamily }}
                            >
                                {data.title}
                            </h2>
                        )}
                        {data.description && (
                            <p className="text-lg max-w-2xl mx-auto" style={{ color: colors?.text }}>
                                {data.description}
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
                    <div className={`grid grid-cols-1 ${getGridCols()} gap-6`}>
                        {categories.map((category) => (
                            <CategoryCard key={category.id} category={category} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default CategoryGrid;
