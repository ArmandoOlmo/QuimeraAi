/**
 * ProductBundle Component
 * Displays product bundles with savings information
 */

import React from 'react';
import { Plus, ShoppingCart, Tag } from 'lucide-react';
import { ProductBundleData, StorefrontProductItem } from '../../../types/components';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeEditor } from '../../../contexts/EditorContext';

interface ProductBundleProps {
    data: ProductBundleData;
    storeId?: string;
    onAddToCart?: (productIds: string[]) => void;
    onProductClick?: (productSlug: string) => void;
}

const ProductBundle: React.FC<ProductBundleProps> = ({
    data,
    storeId,
    onAddToCart,
    onProductClick,
}) => {
    const editorContext = useSafeEditor();
    const effectiveStoreId = storeId || editorContext?.activeProjectId || '';

    const { products: allProducts, isLoading } = usePublicProducts(effectiveStoreId);

    // Get bundle products
    const bundleProducts = React.useMemo(() => {
        if (!data.productIds?.length) return [];
        return data.productIds
            .map(id => allProducts.find(p => p.id === id))
            .filter((p): p is StorefrontProductItem => p !== undefined);
    }, [allProducts, data.productIds]);

    // Calculate prices
    const originalPrice = data.originalPrice || bundleProducts.reduce((sum, p) => sum + p.price, 0);
    const bundlePrice = data.bundlePrice || originalPrice * 0.85; // Default 15% discount
    const savings = originalPrice - bundlePrice;
    const savingsPercent = Math.round((savings / originalPrice) * 100);

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

    const getBorderRadius = () => {
        const map = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-3xl' };
        return map[data.borderRadius || 'xl'] || 'rounded-xl';
    };

    const handleAddBundle = () => {
        if (onAddToCart && data.productIds) {
            onAddToCart(data.productIds);
        } else if (data.buttonUrl) {
            window.location.href = data.buttonUrl;
        }
    };

    // Product card in bundle
    const BundleProductCard = ({ product, isLast }: { product: StorefrontProductItem; isLast: boolean }) => (
        <div className="flex items-center gap-4">
            <div
                className={`flex-shrink-0 w-24 h-24 ${getBorderRadius()} overflow-hidden cursor-pointer`}
                onClick={() => product.slug && onProductClick?.(product.slug)}
            >
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: data.colors.cardBackground }}
                    >
                        <span className="text-xs" style={{ color: data.colors.cardText }}>Sin imagen</span>
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4
                    className="font-medium line-clamp-2 cursor-pointer hover:underline"
                    style={{ color: data.colors.cardText || data.colors.heading }}
                    onClick={() => product.slug && onProductClick?.(product.slug)}
                >
                    {product.name}
                </h4>
                {data.showIndividualPrices && (
                    <p style={{ color: data.colors.priceColor || data.colors.accent }}>
                        ${product.price.toFixed(2)}
                    </p>
                )}
            </div>
            {!isLast && (
                <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: data.colors.accent + '20' }}
                >
                    <Plus size={16} style={{ color: data.colors.accent }} />
                </div>
            )}
        </div>
    );

    // Horizontal variant
    const renderHorizontal = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden`}
            style={{ backgroundColor: data.colors.background }}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                {/* Products */}
                <div className="lg:col-span-2 space-y-4">
                    {bundleProducts.map((product, index) => (
                        <BundleProductCard
                            key={product.id}
                            product={product}
                            isLast={index === bundleProducts.length - 1}
                        />
                    ))}
                </div>

                {/* Pricing */}
                <div
                    className={`${getBorderRadius()} p-6 flex flex-col justify-center`}
                    style={{ backgroundColor: data.colors.cardBackground }}
                >
                    {data.showBadge && data.badgeText && (
                        <span
                            className="inline-flex items-center gap-1 w-fit px-3 py-1 rounded-full text-sm font-semibold mb-4"
                            style={{
                                backgroundColor: data.colors.badgeBackground,
                                color: data.colors.badgeText,
                            }}
                        >
                            <Tag size={14} />
                            {data.badgeText}
                        </span>
                    )}

                    <h3
                        className={`${getTitleSize()} font-bold mb-2`}
                        style={{ color: data.colors.heading }}
                    >
                        {data.title}
                    </h3>

                    {data.description && (
                        <p className="mb-4" style={{ color: data.colors.text }}>
                            {data.description}
                        </p>
                    )}

                    <div className="space-y-2 mb-4">
                        {data.showIndividualPrices && (
                            <div className="flex justify-between text-sm" style={{ color: data.colors.text }}>
                                <span>Precio individual:</span>
                                <span className="line-through">${originalPrice.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span style={{ color: data.colors.text }}>Precio bundle:</span>
                            <span className="text-2xl font-bold" style={{ color: data.colors.priceColor }}>
                                ${bundlePrice.toFixed(2)}
                            </span>
                        </div>
                        {data.showSavings && savings > 0 && (
                            <div
                                className="flex justify-between font-semibold"
                                style={{ color: data.colors.savingsColor }}
                            >
                                <span>{data.savingsText || 'Ahorra'}:</span>
                                <span>${savings.toFixed(2)} ({savingsPercent}%)</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleAddBundle}
                        className={`w-full py-3 ${getBorderRadius()} font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90`}
                        style={{
                            backgroundColor: data.colors.buttonBackground,
                            color: data.colors.buttonText,
                        }}
                    >
                        <ShoppingCart size={20} />
                        {data.buttonText}
                    </button>
                </div>
            </div>
        </div>
    );

    // Vertical variant
    const renderVertical = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden max-w-md mx-auto`}
            style={{ backgroundColor: data.colors.background }}
        >
            <div className="p-6">
                {data.showBadge && data.badgeText && (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold mb-4"
                        style={{
                            backgroundColor: data.colors.badgeBackground,
                            color: data.colors.badgeText,
                        }}
                    >
                        <Tag size={14} />
                        {data.badgeText}
                    </span>
                )}

                <h3
                    className={`${getTitleSize()} font-bold mb-2`}
                    style={{ color: data.colors.heading }}
                >
                    {data.title}
                </h3>

                {data.description && (
                    <p className="mb-6" style={{ color: data.colors.text }}>
                        {data.description}
                    </p>
                )}

                {/* Products */}
                <div className="space-y-4 mb-6">
                    {bundleProducts.map((product, index) => (
                        <BundleProductCard
                            key={product.id}
                            product={product}
                            isLast={index === bundleProducts.length - 1}
                        />
                    ))}
                </div>

                {/* Pricing */}
                <div
                    className={`${getBorderRadius()} p-4 mb-4`}
                    style={{ backgroundColor: data.colors.cardBackground }}
                >
                    {data.showIndividualPrices && (
                        <div className="flex justify-between text-sm mb-1" style={{ color: data.colors.text }}>
                            <span>Precio individual:</span>
                            <span className="line-through">${originalPrice.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span style={{ color: data.colors.text }}>Precio bundle:</span>
                        <span className="text-2xl font-bold" style={{ color: data.colors.priceColor }}>
                            ${bundlePrice.toFixed(2)}
                        </span>
                    </div>
                    {data.showSavings && savings > 0 && (
                        <div
                            className="text-center mt-2 font-semibold"
                            style={{ color: data.colors.savingsColor }}
                        >
                            {data.savingsText || 'Ahorra'} ${savings.toFixed(2)} ({savingsPercent}%)
                        </div>
                    )}
                </div>

                <button
                    onClick={handleAddBundle}
                    className={`w-full py-3 ${getBorderRadius()} font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90`}
                    style={{
                        backgroundColor: data.colors.buttonBackground,
                        color: data.colors.buttonText,
                    }}
                >
                    <ShoppingCart size={20} />
                    {data.buttonText}
                </button>
            </div>
        </div>
    );

    // Compact variant
    const renderCompact = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden flex items-center gap-4 p-4`}
            style={{ backgroundColor: data.colors.background }}
        >
            {/* Product thumbnails */}
            <div className="flex -space-x-3">
                {bundleProducts.slice(0, 3).map((product) => (
                    <div
                        key={product.id}
                        className="w-14 h-14 rounded-full overflow-hidden border-2 border-white"
                    >
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full"
                                style={{ backgroundColor: data.colors.cardBackground }}
                            />
                        )}
                    </div>
                ))}
                {bundleProducts.length > 3 && (
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-semibold border-2 border-white"
                        style={{
                            backgroundColor: data.colors.accent,
                            color: '#fff',
                        }}
                    >
                        +{bundleProducts.length - 3}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1">
                <h4 className="font-semibold" style={{ color: data.colors.heading }}>
                    {data.title}
                </h4>
                <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: data.colors.priceColor }}>
                        ${bundlePrice.toFixed(2)}
                    </span>
                    {data.showSavings && savings > 0 && (
                        <span
                            className="text-sm px-2 py-0.5 rounded-full"
                            style={{
                                backgroundColor: data.colors.savingsColor + '20',
                                color: data.colors.savingsColor,
                            }}
                        >
                            -{savingsPercent}%
                        </span>
                    )}
                </div>
            </div>

            {/* Button */}
            <button
                onClick={handleAddBundle}
                className={`px-4 py-2 ${getBorderRadius()} font-semibold transition-opacity hover:opacity-90`}
                style={{
                    backgroundColor: data.colors.buttonBackground,
                    color: data.colors.buttonText,
                }}
            >
                {data.buttonText}
            </button>
        </div>
    );

    if (isLoading) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className={`${getBorderRadius()} p-6`} style={{ backgroundColor: data.colors.background }}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-24 h-24 bg-gray-700 rounded-xl" />
                                            <div className="flex-1">
                                                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                                                <div className="h-4 bg-gray-700 rounded w-1/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-gray-800 rounded-xl p-6">
                                    <div className="h-8 bg-gray-700 rounded w-1/2 mb-4" />
                                    <div className="h-4 bg-gray-700 rounded w-full mb-6" />
                                    <div className="h-12 bg-gray-700 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (bundleProducts.length === 0) {
        return null;
    }

    return (
        <section className={`${getPaddingY()} ${getPaddingX()}`}>
            <div className="max-w-7xl mx-auto">
                {data.variant === 'horizontal' && renderHorizontal()}
                {data.variant === 'vertical' && renderVertical()}
                {data.variant === 'compact' && renderCompact()}
            </div>
        </section>
    );
};

export default ProductBundle;
