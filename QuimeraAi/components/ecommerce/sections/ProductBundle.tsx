/**
 * ProductBundle Component
 * Displays product bundles with automatic price calculation and savings information
 */

import React from 'react';
import { Plus, ShoppingCart, Tag, Package, Sparkles, Percent } from 'lucide-react';
import { ProductBundleData, StorefrontProductItem } from '../../../types/components';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import { createProductCardViewModel } from '../../../utils/productCard';
import {
    getStorefrontCardGapClass,
    getStorefrontPaddingXClass,
    getStorefrontPaddingYClass,
    getStorefrontRadiusClass,
    getStorefrontSectionBackgroundStyle,
} from './sectionVisualStyles';

interface ProductBundleProps {
    data: ProductBundleData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    onAddToCart?: (productIds: string[]) => void;
    onProductClick?: (productSlug: string) => void;
}

const ProductBundle: React.FC<ProductBundleProps> = ({
    data,
    storeId,
    globalColors,
    onAddToCart,
    onProductClick,
}) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);

    const { products: allProducts, isLoading } = usePublicProducts(effectiveStoreId);

    // Get bundle products
    const bundleProducts = React.useMemo(() => {
        if (!data.productIds?.length) return [];
        return data.productIds
            .map(id => allProducts.find(p => p.id === id))
            .filter((p): p is StorefrontProductItem => p !== undefined);
    }, [allProducts, data.productIds]);

    // Calculate prices automatically from products
    const discountPercent = data.discountPercent || 15;
    const calculatedOriginalPrice = bundleProducts.reduce((sum, p) => sum + p.price, 0);
    const originalPrice = calculatedOriginalPrice > 0 ? calculatedOriginalPrice : (data.originalPrice || 0);
    const bundlePrice = originalPrice * (1 - discountPercent / 100);
    const savings = originalPrice - bundlePrice;
    const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : discountPercent;

    // Style helpers
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'lg');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'md');
    const getCardGap = () => getStorefrontCardGapClass(data.cardGap, 'md');

    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'lg'] || 'text-3xl';
    };

    const getBorderRadius = () => getStorefrontRadiusClass(data.borderRadius, 'xl');

    const handleAddBundle = () => {
        if (onAddToCart && data.productIds) {
            onAddToCart(data.productIds);
        } else if (data.buttonUrl) {
            window.location.href = data.buttonUrl;
        }
    };

    // Product card in bundle
    const BundleProductCard = ({ product, isLast }: { product: StorefrontProductItem; isLast: boolean }) => {
        const card = createProductCardViewModel(product, {
            variant: 'compact',
            currencySymbol: '$',
            showBadges: false,
            showRatings: false,
        });

        return (
            <div className={`flex items-center ${data.cardGap === 'sm' ? 'gap-3' : data.cardGap === 'lg' ? 'gap-6' : data.cardGap === 'xl' ? 'gap-8' : 'gap-4'}`}>
                <div
                    className={`flex-shrink-0 w-24 h-24 ${getBorderRadius()} overflow-hidden cursor-pointer`}
                    onClick={() => product.slug && onProductClick?.(product.slug)}
                >
                    {card.image?.url ? (
                        <img
                            src={card.image.url}
                            alt={card.image.altText}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: colors?.cardBackground }}
                        >
                            <span className="text-xs" style={{ color: colors?.cardText }}>Sin imagen</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4
                        className="font-medium line-clamp-2 cursor-pointer hover:underline"
                        style={{ color: colors?.cardText || colors?.heading }}
                        onClick={() => product.slug && onProductClick?.(product.slug)}
                    >
                        {card.name}
                    </h4>
                    {data.showIndividualPrices && (
                        <p style={{ color: colors?.priceColor || colors?.accent }}>
                            {card.displayPrice}
                        </p>
                    )}
                </div>
                {!isLast && (
                    <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: colors?.accent + '20' }}
                    >
                        <Plus size={16} style={{ color: colors?.accent }} />
                    </div>
                )}
            </div>
        );
    };

    // Horizontal variant
    const renderHorizontal = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden`}
            style={{ backgroundColor: colors?.cardBackground || colors?.background }}
        >
            <div className={`grid grid-cols-1 lg:grid-cols-3 ${getCardGap()} p-6`}>
                {/* Products */}
                <div className={`lg:col-span-2 ${data.cardGap === 'sm' ? 'space-y-3' : data.cardGap === 'lg' ? 'space-y-6' : data.cardGap === 'xl' ? 'space-y-8' : 'space-y-4'}`}>
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
                    style={{ backgroundColor: colors?.cardBackground }}
                >
                    {data.showBadge && data.badgeText && (
                        <span
                            className="inline-flex items-center gap-1 w-fit px-3 py-1 rounded-full text-sm font-semibold mb-4"
                            style={{
                                backgroundColor: colors?.badgeBackground,
                                color: colors?.badgeText,
                            }}
                        >
                            <Tag size={14} />
                            {data.badgeText}
                        </span>
                    )}

                    <h3
                        className={`${getTitleSize()} font-bold mb-2`}
                        style={{ color: colors?.heading }}
                    >
                        {data.title}
                    </h3>

                    {data.description && (
                        <p className="mb-4" style={{ color: colors?.text }}>
                            {data.description}
                        </p>
                    )}

                    <div className="space-y-2 mb-4">
                        {data.showIndividualPrices && (
                            <div className="flex justify-between text-sm" style={{ color: colors?.text }}>
                                <span>Precio individual:</span>
                                <span className="line-through">${originalPrice.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span style={{ color: colors?.text }}>Precio bundle:</span>
                            <span className="text-2xl font-bold" style={{ color: colors?.priceColor }}>
                                ${bundlePrice.toFixed(2)}
                            </span>
                        </div>
                        {data.showSavings && savings > 0 && (
                            <div
                                className="flex justify-between font-semibold"
                                style={{ color: colors?.savingsColor }}
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
                            backgroundColor: colors?.buttonBackground,
                            color: colors?.buttonText,
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
            style={{ backgroundColor: colors?.cardBackground || colors?.background }}
        >
            <div className="p-6">
                {data.showBadge && data.badgeText && (
                    <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold mb-4"
                        style={{
                            backgroundColor: colors?.badgeBackground,
                            color: colors?.badgeText,
                        }}
                    >
                        <Tag size={14} />
                        {data.badgeText}
                    </span>
                )}

                <h3
                    className={`${getTitleSize()} font-bold mb-2`}
                    style={{ color: colors?.heading }}
                >
                    {data.title}
                </h3>

                {data.description && (
                    <p className="mb-6" style={{ color: colors?.text }}>
                        {data.description}
                    </p>
                )}

                {/* Products */}
                <div className={`${data.cardGap === 'sm' ? 'space-y-3' : data.cardGap === 'lg' ? 'space-y-6' : data.cardGap === 'xl' ? 'space-y-8' : 'space-y-4'} mb-6`}>
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
                    style={{ backgroundColor: colors?.cardBackground }}
                >
                    {data.showIndividualPrices && (
                        <div className="flex justify-between text-sm mb-1" style={{ color: colors?.text }}>
                            <span>Precio individual:</span>
                            <span className="line-through">${originalPrice.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span style={{ color: colors?.text }}>Precio bundle:</span>
                        <span className="text-2xl font-bold" style={{ color: colors?.priceColor }}>
                            ${bundlePrice.toFixed(2)}
                        </span>
                    </div>
                    {data.showSavings && savings > 0 && (
                        <div
                            className="text-center mt-2 font-semibold"
                            style={{ color: colors?.savingsColor }}
                        >
                            {data.savingsText || 'Ahorra'} ${savings.toFixed(2)} ({savingsPercent}%)
                        </div>
                    )}
                </div>

                <button
                    onClick={handleAddBundle}
                    className={`w-full py-3 ${getBorderRadius()} font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90`}
                    style={{
                        backgroundColor: colors?.buttonBackground,
                        color: colors?.buttonText,
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
            className={`${getBorderRadius()} overflow-hidden flex items-center ${data.cardGap === 'sm' ? 'gap-3' : data.cardGap === 'lg' ? 'gap-6' : data.cardGap === 'xl' ? 'gap-8' : 'gap-4'} p-4`}
            style={{ backgroundColor: colors?.cardBackground || colors?.background }}
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
                                style={{ backgroundColor: colors?.cardBackground }}
                            />
                        )}
                    </div>
                ))}
                {bundleProducts.length > 3 && (
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-semibold border-2 border-white"
                        style={{
                            backgroundColor: colors?.accent,
                            color: colors?.buttonText || '#ffffff',
                        }}
                    >
                        +{bundleProducts.length - 3}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1">
                <h4 className="font-semibold" style={{ color: colors?.heading }}>
                    {data.title}
                </h4>
                <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: colors?.priceColor }}>
                        ${bundlePrice.toFixed(2)}
                    </span>
                    {data.showSavings && savings > 0 && (
                        <span
                            className="text-sm px-2 py-0.5 rounded-full"
                            style={{
                                backgroundColor: colors?.savingsColor + '20',
                                color: colors?.savingsColor,
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
                    backgroundColor: colors?.buttonBackground,
                    color: colors?.buttonText,
                }}
            >
                {data.buttonText}
            </button>
        </div>
    );

    if (isLoading) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={getStorefrontSectionBackgroundStyle(data, colors?.background)}>
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className={`${getBorderRadius()} p-6`} style={{ backgroundColor: colors?.cardBackground }}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-24 h-24 rounded-xl" style={{ backgroundColor: colors?.borderColor }} />
                                            <div className="flex-1">
                                                <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: colors?.borderColor }} />
                                                <div className="h-4 rounded w-1/4" style={{ backgroundColor: colors?.borderColor }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-xl p-6" style={{ backgroundColor: colors?.accent + '20' }}>
                                    <div className="h-8 rounded w-1/2 mb-4" style={{ backgroundColor: colors?.borderColor }} />
                                    <div className="h-4 rounded w-full mb-6" style={{ backgroundColor: colors?.borderColor }} />
                                    <div className="h-12 rounded" style={{ backgroundColor: colors?.borderColor }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (bundleProducts.length === 0) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={getStorefrontSectionBackgroundStyle(data, colors?.background)}>
                <div className="max-w-4xl mx-auto">
                    <div 
                        className={`${getBorderRadius()} p-8 border-2 border-dashed`}
                        style={{ 
                            backgroundColor: colors?.background + '80',
                            borderColor: colors?.accent + '40'
                        }}
                    >
                        <div className="text-center">
                            <div 
                                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: colors?.accent + '20' }}
                            >
                                <Package size={32} style={{ color: colors?.accent }} />
                            </div>
                            <h3 
                                className="text-xl font-bold mb-2"
                                style={{ color: colors?.heading }}
                            >
                                {data.title || 'Product Bundle'}
                            </h3>
                            <p className="mb-4" style={{ color: colors?.text }}>
                                {data.description || 'Selecciona productos para crear tu bundle'}
                            </p>
                            <div 
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                                style={{ 
                                    backgroundColor: colors?.accent + '15',
                                    color: colors?.accent
                                }}
                            >
                                <Sparkles size={16} />
                                <span>Selecciona productos en el panel de controles</span>
                            </div>
                            
                            {/* Show discount preview */}
                            <div 
                                className="mt-6 p-4 rounded-lg"
                                style={{ backgroundColor: colors?.cardBackground || colors?.background }}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <Percent size={20} style={{ color: colors?.savingsColor || colors?.accent }} />
                                    <span style={{ color: colors?.text }}>
                                        Descuento configurado: <strong style={{ color: colors?.savingsColor || colors?.accent }}>{discountPercent}%</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={`${getPaddingY()} ${getPaddingX()}`} style={getStorefrontSectionBackgroundStyle(data, colors?.background)}>
            <div className="max-w-7xl mx-auto">
                {data.variant === 'horizontal' && renderHorizontal()}
                {data.variant === 'vertical' && renderVertical()}
                {data.variant === 'compact' && renderCompact()}
            </div>
        </section>
    );
};

export default ProductBundle;
