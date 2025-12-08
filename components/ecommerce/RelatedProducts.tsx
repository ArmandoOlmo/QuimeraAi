/**
 * RelatedProducts Component
 * Grid de productos relacionados para la página de detalle de producto
 */

import React from 'react';
import { ShoppingCart, Eye, Heart, Star } from 'lucide-react';
import { PublicProduct } from './hooks/usePublicProduct';

interface RelatedProductsProps {
    products: PublicProduct[];
    title?: string;
    onProductClick: (slug: string) => void;
    onAddToCart?: (product: PublicProduct) => void;
    onQuickView?: (product: PublicProduct) => void;
    currencySymbol?: string;
    primaryColor?: string;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({
    products,
    title = 'Productos Relacionados',
    onProductClick,
    onAddToCart,
    onQuickView,
    currencySymbol = '$',
    primaryColor = '#6366f1',
}) => {
    if (products.length === 0) {
        return null;
    }

    return (
        <section className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                {title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <RelatedProductCard
                        key={product.id}
                        product={product}
                        onClick={() => onProductClick(product.slug)}
                        onAddToCart={onAddToCart ? () => onAddToCart(product) : undefined}
                        onQuickView={onQuickView ? () => onQuickView(product) : undefined}
                        currencySymbol={currencySymbol}
                        primaryColor={primaryColor}
                    />
                ))}
            </div>
        </section>
    );
};

// Individual Product Card
interface RelatedProductCardProps {
    product: PublicProduct;
    onClick: () => void;
    onAddToCart?: () => void;
    onQuickView?: () => void;
    currencySymbol: string;
    primaryColor: string;
}

const RelatedProductCard: React.FC<RelatedProductCardProps> = ({
    product,
    onClick,
    onAddToCart,
    onQuickView,
    currencySymbol,
    primaryColor,
}) => {
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
        : 0;

    const mainImage = product.images?.[0]?.url;

    return (
        <div className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            {/* Image Container */}
            <div 
                className="relative aspect-square overflow-hidden cursor-pointer"
                onClick={onClick}
            >
                {mainImage ? (
                    <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400 dark:text-gray-500">Sin imagen</span>
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

                {/* Out of Stock Overlay */}
                {!product.inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium text-sm">
                            Agotado
                        </span>
                    </div>
                )}

                {/* Low Stock Warning */}
                {product.inStock && product.lowStock && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-orange-500 rounded-full text-white text-xs font-bold">
                        Últimas unidades
                    </div>
                )}

                {/* Quick Actions */}
                <div className="absolute inset-x-4 bottom-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onQuickView && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickView();
                            }}
                            className="flex-1 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg text-gray-900 dark:text-white font-medium text-sm flex items-center justify-center gap-1 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                            <Eye size={16} />
                            Vista rápida
                        </button>
                    )}
                    {onAddToCart && product.inStock && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart();
                            }}
                            className="p-2 rounded-lg text-white transition-colors"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <ShoppingCart size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 
                    className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 cursor-pointer hover:underline"
                    onClick={onClick}
                >
                    {product.name}
                </h3>

                {/* Price */}
                <div className="flex items-center gap-2">
                    <span 
                        className="text-lg font-bold"
                        style={{ color: primaryColor }}
                    >
                        {currencySymbol}{product.price.toFixed(2)}
                    </span>
                    {hasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                            {currencySymbol}{product.compareAtPrice!.toFixed(2)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelatedProducts;
