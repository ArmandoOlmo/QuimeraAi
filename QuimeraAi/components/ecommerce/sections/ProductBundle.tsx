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
    filterRenderableStorefrontProducts,
    getSafeProductPrice,
} from '../../../utils/ecommerce/productDisplayGuards';
import {
    getStorefrontCardGapClass,
    getStorefrontColorWithOpacity,
    getStorefrontContentPositionClass,
    getStorefrontPaddingXClass,
    getStorefrontPaddingYClass,
    getStorefrontRadiusClass,
    getStorefrontSectionBackgroundStyle,
    getStorefrontTextAlignmentClass,
} from './sectionVisualStyles';

interface ProductBundleProps {
    data: ProductBundleData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    isEditorPreview?: boolean;
    onAddToCart?: (productIds: string[]) => void;
    onProductClick?: (productSlug: string) => void;
}

const ProductBundle: React.FC<ProductBundleProps> = ({
    data,
    storeId,
    globalColors,
    isEditorPreview = false,
    onAddToCart,
    onProductClick,
}) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);

    const { products: allProducts, isLoading } = usePublicProducts(effectiveStoreId, {
        productIds: data.productIds?.length ? data.productIds : undefined,
    });

    // Get bundle products
    const bundleProducts = React.useMemo(() => {
        if (!data.productIds?.length) return [];
        return data.productIds
            .map(id => allProducts.find(p => p.id === id))
            .filter((p): p is StorefrontProductItem => p !== undefined);
    }, [allProducts, data.productIds]);
    const renderableBundleProducts = React.useMemo(
        () => filterRenderableStorefrontProducts(bundleProducts),
        [bundleProducts],
    );

    // Calculate prices automatically from products
    const discountPercent = data.discountPercent || 15;
    const calculatedOriginalPrice = renderableBundleProducts.reduce((sum, product) => {
        const safePrice = getSafeProductPrice(product);
        return sum + (safePrice.value && safePrice.value > 0 ? safePrice.value : 0);
    }, 0);
    const originalPrice = calculatedOriginalPrice > 0 ? calculatedOriginalPrice : (data.originalPrice || 0);
    const bundlePrice = originalPrice * (1 - discountPercent / 100);
    const savings = originalPrice - bundlePrice;
    const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : discountPercent;
    const hasPricedBundle = originalPrice > 0;
    const displayOriginalPrice = hasPricedBundle ? `$${originalPrice.toFixed(2)}` : 'Consultar precio';
    const displayBundlePrice = hasPricedBundle ? `$${bundlePrice.toFixed(2)}` : 'Consultar precio';
    const displaySavings = hasPricedBundle ? `$${savings.toFixed(2)}` : '';
    const activeVariant = data.variant || 'editorial';
    const buttonLabel = data.buttonText || 'Comprar bundle';
    const savingsLabel = data.savingsText || 'Ahorra';

    // Style helpers
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'lg');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'md');
    const getCardGap = () => getStorefrontCardGapClass(data.cardGap, 'md');
    const getProductGap = () => (
        data.cardGap === 'sm' ? 'gap-3' : data.cardGap === 'lg' ? 'gap-6' : data.cardGap === 'xl' ? 'gap-8' : 'gap-4'
    );
    const getProductStackSpacing = () => (
        data.cardGap === 'sm' ? 'space-y-3' : data.cardGap === 'lg' ? 'space-y-6' : data.cardGap === 'xl' ? 'space-y-8' : 'space-y-4'
    );

    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'lg'] || 'text-3xl';
    };
    const getDescriptionSize = () => {
        const map = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.descriptionFontSize || 'md'] || 'text-base';
    };

    const getBorderRadius = () => getStorefrontRadiusClass(data.borderRadius, 'xl');
    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'left');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'center');
    const getCardSurfaceStyle = (elevated = false): React.CSSProperties => ({
        backgroundColor: getStorefrontColorWithOpacity(colors?.cardBackground, data.glassEffect ? 0.78 : 1, colors?.cardBackground || '#ffffff'),
        border: `1px solid ${getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.68, 'rgba(15,23,42,0.12)')}`,
        boxShadow: elevated ? '0 26px 80px rgba(15,23,42,0.16)' : '0 14px 36px rgba(15,23,42,0.08)',
    });
    const getProductRowStyle = (): React.CSSProperties => ({
        backgroundColor: getStorefrontColorWithOpacity(colors?.background, 0.52, 'rgba(255,255,255,0.52)'),
        border: `1px solid ${getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.45, 'rgba(15,23,42,0.1)')}`,
    });
    const getPricePanelStyle = (): React.CSSProperties => ({
        backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.08, 'rgba(79,70,229,0.08)'),
        border: `1px solid ${getStorefrontColorWithOpacity(colors?.accent, 0.22, 'rgba(79,70,229,0.22)')}`,
    });
    const getImageFallbackStyle = (): React.CSSProperties => ({
        backgroundColor: colors?.cardBackground,
        backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.72), transparent 38%), linear-gradient(135deg, #e2e8f0, #f8fafc)',
    });

    const renderBundleBadge = (className = '') => (
        data.showBadge && data.badgeText ? (
            <span
                className={`inline-flex items-center gap-1 w-fit px-3 py-1 rounded-full text-sm font-semibold ${className}`}
                style={{
                    backgroundColor: colors?.badgeBackground,
                    color: colors?.badgeText,
                }}
            >
                <Tag size={14} />
                {data.badgeText}
            </span>
        ) : null
    );

    const handleAddBundle = () => {
        if (onAddToCart && renderableBundleProducts.length > 0) {
            onAddToCart(renderableBundleProducts.map(product => product.id));
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
        if (!card.isRenderable) return null;

        return (
            <div
                className={`group flex items-center ${getProductGap()} ${getBorderRadius()} p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
                style={getProductRowStyle()}
            >
                <button
                    type="button"
                    className={`flex-shrink-0 w-24 h-24 ${getBorderRadius()} overflow-hidden disabled:cursor-default`}
                    onClick={() => product.slug && onProductClick?.(product.slug)}
                    disabled={!product.slug || !onProductClick}
                >
                    {card.image?.url ? (
                        <img
                            src={card.image.url}
                            alt={card.image.altText}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={getImageFallbackStyle()}
                        >
                            <span className="px-2 text-center text-xs font-semibold" style={{ color: colors?.cardText }}>
                                Imagen pendiente
                            </span>
                        </div>
                    )}
                </button>
                <div className="flex-1 min-w-0">
                    <button
                        type="button"
                        className="font-medium line-clamp-2 text-left hover:underline disabled:cursor-default disabled:hover:no-underline"
                        style={{ color: colors?.cardText || colors?.heading }}
                        onClick={() => product.slug && onProductClick?.(product.slug)}
                        disabled={!product.slug || !onProductClick}
                    >
                        {card.name}
                    </button>
                    {data.showIndividualPrices && (
                        <p style={{ color: colors?.priceColor || colors?.accent }}>
                            {card.displayPrice}
                        </p>
                    )}
                </div>
                {!isLast && (
                    <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.14, 'rgba(79,70,229,0.14)') }}
                    >
                        <Plus size={16} style={{ color: colors?.accent }} />
                    </div>
                )}
            </div>
        );
    };

    const BundleProductTile = ({ product, index }: { product: StorefrontProductItem; index: number }) => {
        const card = createProductCardViewModel(product, {
            variant: 'overlay',
            currencySymbol: '$',
            showBadges: false,
            showRatings: false,
        });
        if (!card.isRenderable) return null;

        return (
            <button
                type="button"
                className={`group relative min-h-[260px] overflow-hidden ${getBorderRadius()} text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl disabled:cursor-default`}
                style={{
                    border: `1px solid ${getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.55, 'rgba(15,23,42,0.12)')}`,
                    backgroundColor: colors?.cardBackground,
                }}
                onClick={() => product.slug && onProductClick?.(product.slug)}
                disabled={!product.slug || !onProductClick}
            >
                {card.image?.url ? (
                    <img
                        src={card.image.url}
                        alt={card.image.altText}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={getImageFallbackStyle()}
                    >
                        <span className="px-3 text-center text-sm font-semibold" style={{ color: colors?.cardText }}>
                            Imagen pendiente
                        </span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/28 to-transparent" />
                <div
                    className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                        backgroundColor: getStorefrontColorWithOpacity(colors?.badgeBackground || colors?.accent, 0.92, '#4f46e5'),
                        color: colors?.badgeText || '#ffffff',
                    }}
                >
                    {index + 1}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4">
                    <h4 className="line-clamp-2 text-lg font-semibold text-white">
                        {card.name}
                    </h4>
                    {data.showIndividualPrices && (
                        <p className="mt-1 text-sm font-medium text-white/85">
                            {card.displayPrice}
                        </p>
                    )}
                </div>
            </button>
        );
    };

    // Horizontal variant
    const renderHorizontal = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden`}
            style={getCardSurfaceStyle(true)}
        >
            <div className={`grid grid-cols-1 lg:grid-cols-3 ${getCardGap()} p-6`}>
                {/* Products */}
                <div className={`lg:col-span-2 ${getProductStackSpacing()}`}>
                    {renderableBundleProducts.map((product, index) => (
                        <BundleProductCard
                            key={product.id}
                            product={product}
                            isLast={index === renderableBundleProducts.length - 1}
                        />
                    ))}
                </div>

                {/* Pricing */}
                <div
                    className={`${getBorderRadius()} p-6 flex flex-col justify-center`}
                    style={getPricePanelStyle()}
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
                        className={`${getTitleSize()} font-bold mb-2 ${getTextAlignment()}`}
                        style={{ color: colors?.heading }}
                    >
                        {data.title}
                    </h3>

                    {data.description && (
                        <p className={`mb-4 ${getTextAlignment()}`} style={{ color: colors?.text }}>
                            {data.description}
                        </p>
                    )}

                    <div className="space-y-2 mb-4">
                        {data.showIndividualPrices && (
                            <div className="flex justify-between text-sm" style={{ color: colors?.text }}>
                                <span>Precio individual:</span>
                                <span className="line-through">{displayOriginalPrice}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span style={{ color: colors?.text }}>Precio bundle:</span>
                            <span className="text-2xl font-bold" style={{ color: colors?.priceColor }}>
                                {displayBundlePrice}
                            </span>
                        </div>
                        {data.showSavings && savings > 0 && (
                            <div
                                className="flex justify-between font-semibold"
                                style={{ color: colors?.savingsColor }}
                            >
                                <span>{savingsLabel}:</span>
                                <span>{displaySavings} ({savingsPercent}%)</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddBundle}
                        className={`w-full py-3 ${getBorderRadius()} font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90`}
                        style={{
                            backgroundColor: colors?.buttonBackground,
                            color: colors?.buttonText,
                        }}
                    >
                        <ShoppingCart size={20} />
                        {buttonLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    // Vertical variant
    const renderVertical = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden max-w-md mx-auto`}
            style={getCardSurfaceStyle(true)}
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
                    className={`${getTitleSize()} font-bold mb-2 ${getTextAlignment()}`}
                    style={{ color: colors?.heading }}
                >
                    {data.title}
                </h3>

                {data.description && (
                    <p className={`${getDescriptionSize()} mb-6 ${getTextAlignment()}`} style={{ color: colors?.text }}>
                        {data.description}
                    </p>
                )}

                {/* Products */}
                <div className={`${getProductStackSpacing()} mb-6`}>
                    {renderableBundleProducts.map((product, index) => (
                        <BundleProductCard
                            key={product.id}
                            product={product}
                            isLast={index === renderableBundleProducts.length - 1}
                        />
                    ))}
                </div>

                {/* Pricing */}
                <div
                    className={`${getBorderRadius()} p-4 mb-4`}
                    style={getPricePanelStyle()}
                >
                    {data.showIndividualPrices && (
                        <div className="flex justify-between text-sm mb-1" style={{ color: colors?.text }}>
                            <span>Precio individual:</span>
                            <span className="line-through">{displayOriginalPrice}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span style={{ color: colors?.text }}>Precio bundle:</span>
                        <span className="text-2xl font-bold" style={{ color: colors?.priceColor }}>
                            {displayBundlePrice}
                        </span>
                    </div>
                    {data.showSavings && savings > 0 && (
                        <div
                            className="text-center mt-2 font-semibold"
                            style={{ color: colors?.savingsColor }}
                        >
                            {savingsLabel} {displaySavings} ({savingsPercent}%)
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleAddBundle}
                    className={`w-full py-3 ${getBorderRadius()} font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90`}
                    style={{
                        backgroundColor: colors?.buttonBackground,
                        color: colors?.buttonText,
                    }}
                >
                    <ShoppingCart size={20} />
                    {buttonLabel}
                </button>
            </div>
        </div>
    );

    // Compact variant
    const renderCompact = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden flex items-center ${getProductGap()} p-4`}
            style={getCardSurfaceStyle(true)}
        >
            {/* Product thumbnails */}
            <div className="flex -space-x-3">
                {renderableBundleProducts.slice(0, 3).map((product) => (
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
                {renderableBundleProducts.length > 3 && (
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-semibold border-2 border-white"
                        style={{
                            backgroundColor: colors?.accent,
                            color: colors?.buttonText || '#ffffff',
                        }}
                    >
                        +{renderableBundleProducts.length - 3}
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
                        {displayBundlePrice}
                    </span>
                    {data.showSavings && savings > 0 && (
                        <span
                            className="text-sm px-2 py-0.5 rounded-full"
                            style={{
                                backgroundColor: getStorefrontColorWithOpacity(colors?.savingsColor, 0.14, 'rgba(22,163,74,0.14)'),
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
                type="button"
                onClick={handleAddBundle}
                className={`px-4 py-2 ${getBorderRadius()} font-semibold transition-opacity hover:opacity-90`}
                style={{
                    backgroundColor: colors?.buttonBackground,
                    color: colors?.buttonText,
                }}
            >
                {buttonLabel}
            </button>
        </div>
    );

    const renderEditorial = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden p-5 md:p-8`}
            style={getCardSurfaceStyle(true)}
        >
            <div className={`grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] ${getCardGap()} items-stretch`}>
                <div
                    className={`flex min-h-[360px] flex-col justify-between ${getTextAlignment()} ${getBorderRadius()} p-6 md:p-8`}
                    style={getPricePanelStyle()}
                >
                    <div className={`flex flex-col ${getTextAlignment()}`}>
                        {renderBundleBadge('mb-5')}
                        <h3
                            className={`${getTitleSize()} font-bold leading-tight`}
                            style={{ color: colors?.heading }}
                        >
                            {data.title}
                        </h3>
                        {data.description && (
                            <p
                                className={`${getDescriptionSize()} mt-3 max-w-xl`}
                                style={{ color: colors?.text }}
                            >
                                {data.description}
                            </p>
                        )}
                    </div>

                    <div className="mt-8 w-full">
                        <div className={`${getBorderRadius()} p-4`} style={getCardSurfaceStyle(false)}>
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium" style={{ color: colors?.text }}>
                                        Precio bundle
                                    </p>
                                    <p className="text-3xl font-bold" style={{ color: colors?.priceColor || colors?.heading }}>
                                        {displayBundlePrice}
                                    </p>
                                </div>
                                {data.showSavings && savings > 0 && (
                                    <div
                                        className="rounded-full px-3 py-1 text-sm font-semibold"
                                        style={{
                                            backgroundColor: getStorefrontColorWithOpacity(colors?.savingsColor, 0.14, 'rgba(22,163,74,0.14)'),
                                            color: colors?.savingsColor,
                                        }}
                                    >
                                        {savingsLabel} {savingsPercent}%
                                    </div>
                                )}
                            </div>
                            {data.showIndividualPrices && originalPrice > 0 && (
                                <div className="mt-3 flex justify-between text-sm" style={{ color: colors?.text }}>
                                    <span>Precio individual</span>
                                    <span className="line-through">{displayOriginalPrice}</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleAddBundle}
                                className={`mt-5 flex w-full items-center justify-center gap-2 ${getBorderRadius()} px-5 py-3 font-semibold transition-opacity hover:opacity-90`}
                                style={{
                                    backgroundColor: colors?.buttonBackground,
                                    color: colors?.buttonText,
                                }}
                            >
                                <ShoppingCart size={20} />
                                {buttonLabel}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 ${getCardGap()}`}>
                    {renderableBundleProducts.slice(0, 6).map((product, index) => (
                        <BundleProductTile key={product.id} product={product} index={index} />
                    ))}
                </div>
            </div>
        </div>
    );

    const renderPriceStack = () => (
        <div
            className={`${getBorderRadius()} overflow-hidden p-5 md:p-7`}
            style={getCardSurfaceStyle(true)}
        >
            <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] ${getCardGap()} items-start`}>
                <div>
                    <div className={`mb-6 flex flex-col ${getTextAlignment()}`}>
                        {renderBundleBadge('mb-4')}
                        <h3
                            className={`${getTitleSize()} font-bold leading-tight`}
                            style={{ color: colors?.heading }}
                        >
                            {data.title}
                        </h3>
                        {data.description && (
                            <p
                                className={`${getDescriptionSize()} mt-2 max-w-2xl`}
                                style={{ color: colors?.text }}
                            >
                                {data.description}
                            </p>
                        )}
                    </div>

                    <div className={getProductStackSpacing()}>
                        {renderableBundleProducts.map((product, index) => (
                            <BundleProductCard
                                key={product.id}
                                product={product}
                                isLast={index === renderableBundleProducts.length - 1}
                            />
                        ))}
                    </div>
                </div>

                <aside
                    className={`${getBorderRadius()} p-5 lg:sticky lg:top-6`}
                    style={getPricePanelStyle()}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium" style={{ color: colors?.text }}>
                                Bundle
                            </p>
                            <p className="text-4xl font-bold" style={{ color: colors?.priceColor || colors?.heading }}>
                                {displayBundlePrice}
                            </p>
                        </div>
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-full"
                            style={{
                                backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.14, 'rgba(79,70,229,0.14)'),
                                color: colors?.accent,
                            }}
                        >
                            <Package size={24} />
                        </div>
                    </div>

                    <div className="my-5 space-y-3 text-sm">
                        {data.showIndividualPrices && originalPrice > 0 && (
                            <div className="flex justify-between" style={{ color: colors?.text }}>
                                <span>Individual</span>
                                <span className="line-through">{displayOriginalPrice}</span>
                            </div>
                        )}
                        {data.showSavings && savings > 0 && (
                            <div className="flex justify-between font-semibold" style={{ color: colors?.savingsColor }}>
                                <span>{savingsLabel}</span>
                                <span>{displaySavings}</span>
                            </div>
                        )}
                        <div
                            className="flex justify-between border-t pt-3 font-semibold"
                            style={{
                                borderColor: getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.68, 'rgba(15,23,42,0.12)'),
                                color: colors?.heading,
                            }}
                        >
                            <span>Total</span>
                            <span>{displayBundlePrice}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddBundle}
                        className={`flex w-full items-center justify-center gap-2 ${getBorderRadius()} px-5 py-3 font-semibold transition-opacity hover:opacity-90`}
                        style={{
                            backgroundColor: colors?.buttonBackground,
                            color: colors?.buttonText,
                        }}
                    >
                        <ShoppingCart size={20} />
                        {buttonLabel}
                    </button>
                </aside>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={getStorefrontSectionBackgroundStyle(data, colors?.background)}>
                <div className={`flex max-w-7xl mx-auto ${getContentPosition()}`}>
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
                                <div className="rounded-xl p-6" style={{ backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.14, 'rgba(79,70,229,0.14)') }}>
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

    if (renderableBundleProducts.length === 0 && !isEditorPreview) {
        return null;
    }

    if (renderableBundleProducts.length === 0) {
        return (
            <section className={`${getPaddingY()} ${getPaddingX()}`} style={getStorefrontSectionBackgroundStyle(data, colors?.background)}>
                <div className={`flex max-w-4xl mx-auto ${getContentPosition()}`}>
                    <div 
                        className={`${getBorderRadius()} w-full p-8 border-2 border-dashed`}
                        style={{
                            ...getCardSurfaceStyle(true),
                            borderColor: getStorefrontColorWithOpacity(colors?.accent, 0.35, 'rgba(79,70,229,0.35)'),
                        }}
                    >
                        <div className="text-center">
                            <div 
                                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.14, 'rgba(79,70,229,0.14)') }}
                            >
                                <Package size={32} style={{ color: colors?.accent }} />
                            </div>
                            <h3 
                                className={`${getTitleSize()} font-bold mb-2`}
                                style={{ color: colors?.heading }}
                            >
                                {data.title || 'Product Bundle'}
                            </h3>
                            <p className={`${getDescriptionSize()} mb-4`} style={{ color: colors?.text }}>
                                {data.description || 'Selecciona productos para crear tu bundle'}
                            </p>
                            <div 
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                                style={{ 
                                    backgroundColor: getStorefrontColorWithOpacity(colors?.accent, 0.12, 'rgba(79,70,229,0.12)'),
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
            <div className={`flex max-w-7xl mx-auto ${getContentPosition()}`}>
                <div className="w-full">
                    {activeVariant === 'editorial' && renderEditorial()}
                    {activeVariant === 'price-stack' && renderPriceStack()}
                    {activeVariant === 'horizontal' && renderHorizontal()}
                    {activeVariant === 'vertical' && renderVertical()}
                    {activeVariant === 'compact' && renderCompact()}
                    {!['editorial', 'price-stack', 'horizontal', 'vertical', 'compact'].includes(activeVariant) && renderEditorial()}
                </div>
            </div>
        </section>
    );
};

export default ProductBundle;
