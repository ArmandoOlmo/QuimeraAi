/**
 * RelatedProducts Component
 * Grid de productos relacionados para la página de detalle de producto
 */

import React from 'react';
import { ShoppingCart, Eye } from 'lucide-react';
import { PublicProduct } from './hooks/usePublicProduct';
import { createProductCardViewModel } from '../../utils/productCard';
import { filterRenderableStorefrontProducts } from '../../utils/ecommerce/productDisplayGuards';

interface RelatedProductsColors {
    primary?: string;
    heading?: string;
    text?: string;
    mutedText?: string;
    cardBackground?: string;
    border?: string;
    badgeBackground?: string;
    badgeText?: string;
    buttonBackground?: string;
    buttonText?: string;
    salePrice?: string;
    originalPrice?: string;
    warning?: string;
}

interface RelatedProductsProps {
    products: PublicProduct[];
    title?: string;
    onProductClick: (slug: string) => void;
    onAddToCart?: (product: PublicProduct) => void;
    onQuickView?: (product: PublicProduct) => void;
    currencySymbol?: string;
    primaryColor?: string;
    colors?: RelatedProductsColors;
}

const defaultColors: RelatedProductsColors = {
    primary: '#6366f1',
    heading: '#1f2937',
    text: '#6b7280',
    mutedText: '#9ca3af',
    cardBackground: '#ffffff',
    border: '#e5e7eb',
    badgeBackground: '#ef4444',
    badgeText: '#ffffff',
    buttonBackground: '#6366f1',
    buttonText: '#ffffff',
    salePrice: '#ef4444',
    originalPrice: '#9ca3af',
    warning: '#f97316',
};

const RelatedProducts: React.FC<RelatedProductsProps> = ({
    products,
    title = 'Productos Relacionados',
    onProductClick,
    onAddToCart,
    onQuickView,
    currencySymbol = '$',
    primaryColor,
    colors: propColors,
}) => {
    // Merge colors with defaults
    const colors = {
        ...defaultColors,
        ...propColors,
        primary: propColors?.primary || primaryColor || defaultColors.primary,
        buttonBackground: propColors?.buttonBackground || primaryColor || defaultColors.buttonBackground,
    };
    const renderableProducts = React.useMemo(
        () => filterRenderableStorefrontProducts(products),
        [products],
    );

    if (renderableProducts.length === 0) {
        return null;
    }

    return (
        <section 
            className="mt-16 pt-12 border-t"
            style={{ borderColor: colors?.border }}
        >
            <h2 
                className="text-2xl font-bold mb-8"
                style={{ color: colors?.heading }}
            >
                {title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {renderableProducts.map((product) => (
                    <RelatedProductCard
                        key={product.id}
                        product={product}
                        onClick={() => onProductClick(product.slug)}
                        onAddToCart={onAddToCart ? () => onAddToCart(product) : undefined}
                        onQuickView={onQuickView ? () => onQuickView(product) : undefined}
                        currencySymbol={currencySymbol}
                        colors={colors}
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
    colors: RelatedProductsColors;
}

const RelatedProductCard: React.FC<RelatedProductCardProps> = ({
    product,
    onClick,
    onAddToCart,
    onQuickView,
    currencySymbol,
    colors,
}) => {
    const card = createProductCardViewModel(product, {
        variant: 'modern',
        currencySymbol,
        showFeaturedBadge: false,
    });
    if (!card.isRenderable) return null;

    const isAvailable = card.inventory.isAvailable;

    return (
        <div 
            className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: colors?.cardBackground }}
        >
            {/* Image Container */}
            <div 
                className="relative aspect-square overflow-hidden cursor-pointer"
                onClick={onClick}
            >
                {card.image?.url ? (
                    <img
                        src={card.image.url}
                        alt={card.image.altText}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: colors?.border }}
                    >
                        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold" style={{ color: colors?.mutedText }}>
                            Imagen pendiente
                        </span>
                    </div>
                )}

                {/* Discount Badge */}
                {card.hasDiscount && (
                    <div
                        className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: colors?.badgeBackground, color: colors?.badgeText }}
                    >
                        -{card.discountPercent}%
                    </div>
                )}

                {/* Out of Stock Overlay */}
                {!isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span 
                            className="px-4 py-2 rounded-full font-medium text-sm"
                            style={{ backgroundColor: colors?.cardBackground, color: colors?.heading }}
                        >
                            Agotado
                        </span>
                    </div>
                )}

                {/* Low Stock Warning */}
                {isAvailable && product.lowStock && (
                    <div 
                        className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: colors?.warning, color: '#ffffff' }}
                    >
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
                            className="flex-1 py-2 backdrop-blur-sm rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition-colors hover:opacity-90"
                            style={{ backgroundColor: `${colors?.cardBackground}e6`, color: colors?.heading }}
                        >
                            <Eye size={16} />
                            Vista rápida
                        </button>
                    )}
                    {onAddToCart && isAvailable && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart();
                            }}
                            className="p-2 rounded-lg transition-colors hover:opacity-90"
                            style={{ backgroundColor: colors?.buttonBackground, color: colors?.buttonText }}
                        >
                            <ShoppingCart size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 
                    className="font-medium mb-2 line-clamp-2 cursor-pointer hover:underline"
                    onClick={onClick}
                    style={{ color: colors?.heading }}
                >
                    {card.name}
                </h3>

                {/* Price */}
                <div className="flex items-center gap-2">
                    <span 
                        className="text-lg font-bold"
                        style={{ color: colors?.primary }}
                    >
                        {card.displayPrice}
                    </span>
                    {card.hasDiscount && card.displayCompareAtPrice && (
                        <span 
                            className="text-sm line-through"
                            style={{ color: colors?.originalPrice }}
                        >
                            {card.displayCompareAtPrice}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelatedProducts;
