/**
 * ProductComparePage Component
 * Página de comparación de productos lado a lado
 */

import React from 'react';
import {
    X,
    ShoppingCart,
    ArrowLeft,
    Plus,
    Check,
    Star,
    Package,
    Trash2,
} from 'lucide-react';
import { PublicProduct } from './hooks/usePublicProduct';
import { RatingStars } from './reviews';

interface ProductComparePageProps {
    products: PublicProduct[];
    maxProducts: number;
    onRemoveProduct: (productId: string) => void;
    onClearAll: () => void;
    onAddProduct?: () => void;
    onViewProduct?: (slug: string) => void;
    onAddToCart?: (product: PublicProduct) => void;
    onBack?: () => void;
    currencySymbol?: string;
    primaryColor?: string;
}

const ProductComparePage: React.FC<ProductComparePageProps> = ({
    products,
    maxProducts,
    onRemoveProduct,
    onClearAll,
    onAddProduct,
    onViewProduct,
    onAddToCart,
    onBack,
    currencySymbol = '$',
    primaryColor = '#6366f1',
}) => {
    const canAddMore = products.length < maxProducts;

    // Get all unique tags/specs from products
    const allSpecs = React.useMemo(() => {
        const specsSet = new Set<string>();
        products.forEach((product) => {
            product.tags?.forEach((tag) => specsSet.add(tag));
        });
        return Array.from(specsSet).sort();
    }, [products]);

    // Helper to check if product has a spec/tag
    const hasSpec = (product: PublicProduct, spec: string) => {
        return product.tags?.includes(spec) || false;
    };

    if (products.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-6" size={80} />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        Sin productos para comparar
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Agrega productos desde la tienda para compararlos lado a lado
                    </p>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="px-6 py-3 text-white rounded-lg transition-colors"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Explorar productos
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Comparar productos
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {products.length} de {maxProducts} productos
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClearAll}
                            className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                            <span className="hidden sm:inline">Limpiar todo</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-auto">
                <div className="min-w-[768px]">
                    {/* Products Row */}
                    <div className="flex gap-4 mb-6">
                        {/* Empty column for labels */}
                        <div className="w-40 flex-shrink-0" />

                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="flex-1 min-w-[200px] bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
                            >
                                {/* Image */}
                                <div
                                    className="relative aspect-square bg-gray-100 dark:bg-gray-700 cursor-pointer"
                                    onClick={() => onViewProduct?.(product.slug)}
                                >
                                    {product.images?.[0]?.url ? (
                                        <img
                                            src={product.images[0].url}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <Package size={48} />
                                        </div>
                                    )}

                                    {/* Remove Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveProduct(product.id);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-800/90 text-red-500 rounded-full shadow-md hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Product Info */}
                                <div className="p-4">
                                    <h3
                                        className="font-medium text-gray-900 dark:text-white line-clamp-2 cursor-pointer hover:underline"
                                        onClick={() => onViewProduct?.(product.slug)}
                                    >
                                        {product.name}
                                    </h3>

                                    {/* Rating */}
                                    {product.reviewStats && product.reviewStats.totalReviews > 0 && (
                                        <div className="flex items-center gap-1 mt-2">
                                            <RatingStars rating={product.reviewStats.averageRating} size="sm" />
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                ({product.reviewStats.totalReviews})
                                            </span>
                                        </div>
                                    )}

                                    {/* Price */}
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-xl font-bold" style={{ color: primaryColor }}>
                                            {currencySymbol}{product.price.toFixed(2)}
                                        </span>
                                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                                            <span className="text-sm text-gray-400 line-through">
                                                {currencySymbol}{product.compareAtPrice.toFixed(2)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Add to Cart */}
                                    {onAddToCart && (
                                        <button
                                            onClick={() => onAddToCart(product)}
                                            className="w-full mt-4 py-2 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <ShoppingCart size={16} className="inline mr-2" />
                                            Agregar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add Product Card */}
                        {canAddMore && (
                            <div
                                onClick={onAddProduct}
                                className="flex-1 min-w-[200px] bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors py-16"
                            >
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                                    style={{ backgroundColor: `${primaryColor}20` }}
                                >
                                    <Plus size={24} style={{ color: primaryColor }} />
                                </div>
                                <span className="text-gray-500 dark:text-gray-400 font-medium">
                                    Agregar producto
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Comparison Rows */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Description */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <div className="w-40 flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-300">
                                Descripción
                            </div>
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex-1 min-w-[200px] p-4 border-l border-gray-200 dark:border-gray-700"
                                >
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                        {product.shortDescription || product.description || 'Sin descripción'}
                                    </p>
                                </div>
                            ))}
                            {canAddMore && <div className="flex-1 min-w-[200px]" />}
                        </div>

                        {/* Category */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <div className="w-40 flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-300">
                                Categoría
                            </div>
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex-1 min-w-[200px] p-4 border-l border-gray-200 dark:border-gray-700"
                                >
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {product.categoryName || '-'}
                                    </span>
                                </div>
                            ))}
                            {canAddMore && <div className="flex-1 min-w-[200px]" />}
                        </div>

                        {/* Availability */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <div className="w-40 flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-300">
                                Disponibilidad
                            </div>
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex-1 min-w-[200px] p-4 border-l border-gray-200 dark:border-gray-700"
                                >
                                    {product.inStock !== false ? (
                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                            <Check size={16} />
                                            En stock
                                        </span>
                                    ) : (
                                        <span className="text-red-500 text-sm">Agotado</span>
                                    )}
                                </div>
                            ))}
                            {canAddMore && <div className="flex-1 min-w-[200px]" />}
                        </div>

                        {/* Specs/Tags */}
                        {allSpecs.map((spec) => (
                            <div key={spec} className="flex border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <div className="w-40 flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-300 text-sm">
                                    {spec}
                                </div>
                                {products.map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex-1 min-w-[200px] p-4 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center"
                                    >
                                        {hasSpec(product, spec) ? (
                                            <Check size={20} style={{ color: primaryColor }} />
                                        ) : (
                                            <X size={20} className="text-gray-300 dark:text-gray-600" />
                                        )}
                                    </div>
                                ))}
                                {canAddMore && <div className="flex-1 min-w-[200px]" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductComparePage;











