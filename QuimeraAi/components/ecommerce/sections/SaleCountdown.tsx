/**
 * SaleCountdown Component
 * Displays a countdown timer for sales/promotions
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, Tag } from 'lucide-react';
import { SaleCountdownData, StorefrontProductItem } from '../../../types/components';
import type { ProductCardVisualVariant } from '../../../types/productCard';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import { createProductCardViewModel } from '../../../utils/productCard';
import {
    filterRenderableStorefrontProducts,
    getSafeDiscountBadge,
} from '../../../utils/ecommerce/productDisplayGuards';
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
import { buildStorefrontCatalogUrl } from '../../../utils/storefrontRouter';

interface SaleCountdownProps {
    data: SaleCountdownData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    onProductClick?: (productSlug: string) => void;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const SaleCountdown: React.FC<SaleCountdownProps> = ({
    data,
    storeId,
    globalColors,
    onProductClick,
}) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);
    const productListUrl = buildStorefrontCatalogUrl(effectiveStoreId);

    const { products: allProducts } = usePublicProducts(effectiveStoreId, {
        productIds: data.productIds?.length ? data.productIds : undefined,
        limitCount: data.productsToShow || 4,
    });

    // Filter sale products
    const saleProducts = React.useMemo(() => {
        let nextProducts: StorefrontProductItem[];

        if (data.productIds?.length) {
            nextProducts = allProducts.filter(p => data.productIds?.includes(p.id));
        } else {
            nextProducts = allProducts.filter(p => getSafeDiscountBadge(p));
        }

        return filterRenderableStorefrontProducts(nextProducts);
    }, [allProducts, data.productIds]);

    // Countdown timer logic
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const endDate = Date.parse(data.endDate || '');
            if (!Number.isFinite(endDate)) {
                setIsExpired(false);
                return { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }
            const now = new Date().getTime();
            const difference = endDate - now;

            if (difference <= 0) {
                setIsExpired(true);
                return { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }

            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
            };
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [data.endDate]);

    // Style helpers
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'lg');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'md');
    const getCardGap = () => getStorefrontCardGapClass(data.cardGap, 'md');

    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'lg'] || 'text-3xl';
    };
    const getDescriptionSize = () => {
        const map = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.descriptionFontSize || 'md'] || 'text-base';
    };

    const getBorderRadius = () => getStorefrontRadiusClass(data.borderRadius, 'xl');
    const getCardAspectRatio = () => getStorefrontAspectRatioClass((data as any).cardAspectRatio, '4:5');
    const getImageObjectFit = () => (data as any).imageObjectFit || 'cover';
    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'left');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'center');

    // Time unit component
    const TimeUnit = ({ value, label }: { value: number; label: string }) => (
        <div
            className={`flex flex-col items-center p-4 ${getBorderRadius()}`}
            style={{ backgroundColor: colors?.countdownBackground }}
        >
            <span
                className="text-3xl md:text-4xl font-bold tabular-nums"
                style={{ color: colors?.countdownText }}
            >
                {value.toString().padStart(2, '0')}
            </span>
            <span className="text-xs uppercase tracking-wide mt-1" style={{ color: colors?.text }}>
                {label}
            </span>
        </div>
    );

    // Product card for sale items
    const SaleProductCard = ({ product }: { product: StorefrontProductItem }) => {
        const card = createProductCardViewModel(product, {
            variant: data.cardStyle || 'modern',
            currencySymbol: '$',
            showBadges: true,
            showFeaturedBadge: false,
            showRatings: false,
        });
        if (!card.isRenderable) return null;

        const visualCardStyle = card.visualVariant;
        
        // Card style classes
        const cardStyles: Record<ProductCardVisualVariant, string> = {
            minimal: 'bg-transparent',
            modern: `${getBorderRadius()} shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1`,
            elegant: `${getBorderRadius()} shadow-sm hover:shadow-md transition-all duration-300 border`,
            overlay: `${getBorderRadius()} overflow-hidden hover:shadow-xl transition-all duration-300`,
            luxury: `${getBorderRadius()} shadow-[0_18px_45px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1 border`,
            marketplace: `${getBorderRadius()} shadow-sm hover:shadow-lg transition-all duration-300 border`,
            editorial: 'bg-transparent',
            compact: `${getBorderRadius()} shadow-sm hover:shadow-md transition-all duration-300 border`,
            imageFirst: `${getBorderRadius()} shadow-sm hover:shadow-lg transition-all duration-300 border`,
            quickBuy: `${getBorderRadius()} shadow-md hover:shadow-xl transition-all duration-300 border`,
        };

        // Overlay style - full image with text on top
        if (visualCardStyle === 'overlay') {
            return (
                <div
                    className={`group cursor-pointer relative ${cardStyles.overlay}`}
                    onClick={() => card.slug && onProductClick?.(card.slug)}
                >
                    <div className={`relative ${getCardAspectRatio()} overflow-hidden`}>
                        {card.image?.url ? (
                            <img
                                src={card.image.url}
                                alt={card.image.altText}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                style={{ objectFit: getImageObjectFit() as any }}
                            />
                        ) : (
                            <div 
                                className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_42%),linear-gradient(135deg,rgba(251,191,36,0.32),rgba(15,23,42,0.94))]"
                            >
                                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">Sin imagen</span>
                            </div>
                        )}
                        
                        {/* Gradient Overlay */}
                        <div
                            className="absolute inset-0"
                            style={{
                                background: getStorefrontOverlayGradient(colors?.overlayStart, colors?.overlayEnd),
                            }}
                        />
                        
                        {/* Discount Badge */}
                        {card.hasDiscount && (
                            <span
                                className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold"
                                style={{
                                    backgroundColor: colors?.badgeBackground,
                                    color: colors?.badgeText,
                                }}
                            >
                                -{card.discountPercent}%
                            </span>
                        )}
                        
                        {/* Content on Image */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h4 className="text-sm font-semibold leading-tight text-white line-clamp-2 drop-shadow-sm">{card.name}</h4>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="font-bold text-white drop-shadow-sm">{card.displayPrice}</span>
                                {card.hasDiscount && card.displayCompareAtPrice && (
                                    <span className="text-sm line-through text-white/60">
                                        {card.displayCompareAtPrice}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Default styles (minimal, modern, elegant)
        return (
            <div
                className={`group cursor-pointer ${cardStyles[visualCardStyle]} overflow-hidden backdrop-blur-sm`}
                style={{ 
                    backgroundColor: colors?.cardBackground || 'rgba(255,255,255,0.1)',
                    borderColor: visualCardStyle === 'elegant' ? colors?.text + '20' : undefined,
                }}
                onClick={() => card.slug && onProductClick?.(card.slug)}
            >
                <div className={`relative ${getCardAspectRatio()} overflow-hidden`}>
                    {card.image?.url ? (
                        <img
                            src={card.image.url}
                            alt={card.image.altText}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            style={{ objectFit: getImageObjectFit() as any }}
                        />
                    ) : (
                        <div 
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: colors?.background }}
                        >
                            <span style={{ color: colors?.text, opacity: 0.5 }}>Sin imagen</span>
                        </div>
                    )}
                    {card.hasDiscount && (
                        <span
                            className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold"
                            style={{
                                backgroundColor: colors?.badgeBackground,
                                color: colors?.badgeText,
                            }}
                        >
                            -{card.discountPercent}%
                        </span>
                    )}
                </div>
                <div className="p-3">
                    <h4 
                        className="font-medium text-sm line-clamp-1" 
                        style={{ color: colors?.cardText || colors?.heading }}
                    >
                        {card.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold" style={{ color: colors?.cardText || colors?.heading }}>
                            {card.displayPrice}
                        </span>
                        {card.hasDiscount && card.displayCompareAtPrice && (
                            <span className="text-sm line-through" style={{ color: colors?.text, opacity: 0.6 }}>
                                {card.displayCompareAtPrice}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Banner variant
    const renderBanner = () => (
        <div
            className={`${getPaddingY()} ${getPaddingX()} ${getBorderRadius()}`}
            style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
        >
            <div className="max-w-7xl mx-auto">
                <div className={`flex flex-col items-center gap-8 lg:flex-row ${data.contentPosition === 'left' ? 'lg:justify-start' : data.contentPosition === 'right' ? 'lg:justify-end' : 'lg:justify-between'}`}>
                    {/* Content */}
                    <div className={`flex flex-col ${getTextAlignment()}`}>
                        {data.badgeText && (
                            <span
                                className={`inline-flex items-center gap-2 px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                                style={{
                                    backgroundColor: colors?.badgeBackground,
                                    color: colors?.badgeText,
                                }}
                            >
                                <Tag size={14} />
                                {data.badgeText}
                            </span>
                        )}
                        <h2
                            className={`${getTitleSize()} font-bold mb-2`}
                            style={{ color: colors?.heading }}
                        >
                            {data.title}
                        </h2>
                        {data.description && (
                            <p className={`max-w-2xl ${getDescriptionSize()}`} style={{ color: colors?.text }}>{data.description}</p>
                        )}
                        {data.discountText && (
                            <p
                                className="text-2xl font-bold mt-2"
                                style={{ color: colors?.accent }}
                            >
                                {data.discountText}
                            </p>
                        )}
                    </div>

                    {/* Countdown */}
                    {!isExpired ? (
                        <div className="flex gap-3">
                            {data.showDays !== false && <TimeUnit value={timeLeft.days} label="Días" />}
                            {data.showHours !== false && <TimeUnit value={timeLeft.hours} label="Horas" />}
                            {data.showMinutes !== false && <TimeUnit value={timeLeft.minutes} label="Min" />}
                            {data.showSeconds !== false && <TimeUnit value={timeLeft.seconds} label="Seg" />}
                        </div>
                    ) : (
                        <div
                            className={`px-6 py-4 ${getBorderRadius()}`}
                            style={{ backgroundColor: colors?.countdownBackground }}
                        >
                            <p className="text-lg font-semibold" style={{ color: colors?.countdownText }}>
                                ¡Oferta terminada!
                            </p>
                        </div>
                    )}
                </div>

                {/* Products */}
                {data.showProducts && saleProducts.length > 0 && (
                    <div className={`grid grid-cols-2 md:grid-cols-4 ${getCardGap()} mt-8`}>
                        {saleProducts.slice(0, data.productsToShow || 4).map(product => (
                            <SaleProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // Fullwidth variant
    const renderFullwidth = () => (
        <div
            className={`${getPaddingY()} ${getPaddingX()}`}
            style={{
                ...getStorefrontSectionBackgroundStyle(data, colors?.background),
                minHeight: data.height || 300,
            }}
        >
            <div className={`mx-auto flex max-w-7xl flex-col ${getTextAlignment()}`}>
                {data.badgeText && (
                    <span
                        className={`inline-flex items-center gap-2 px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                        style={{
                            backgroundColor: colors?.badgeBackground,
                            color: colors?.badgeText,
                        }}
                    >
                        <Clock size={14} />
                        {data.badgeText}
                    </span>
                )}

                <h2
                    className={`${getTitleSize()} font-bold mb-2`}
                    style={{ color: colors?.heading }}
                >
                    {data.title}
                </h2>

                {data.discountText && (
                    <p
                        className="text-3xl md:text-4xl font-bold mb-6"
                        style={{ color: colors?.accent }}
                    >
                        {data.discountText}
                    </p>
                )}

                {/* Countdown */}
                {!isExpired ? (
                    <div className={`mb-8 flex gap-4 ${getContentPosition()}`}>
                        {data.showDays !== false && <TimeUnit value={timeLeft.days} label="Días" />}
                        {data.showHours !== false && <TimeUnit value={timeLeft.hours} label="Horas" />}
                        {data.showMinutes !== false && <TimeUnit value={timeLeft.minutes} label="Min" />}
                        {data.showSeconds !== false && <TimeUnit value={timeLeft.seconds} label="Seg" />}
                    </div>
                ) : (
                    <p className="text-xl mb-8" style={{ color: colors?.text }}>
                        ¡Esta oferta ha terminado!
                    </p>
                )}

                {data.description && (
                    <p className={`mb-6 max-w-2xl ${getDescriptionSize()}`} style={{ color: colors?.text }}>{data.description}</p>
                )}

                <a
                    href={productListUrl}
                    className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                    style={{
                        backgroundColor: colors?.buttonBackground,
                        color: colors?.buttonText,
                    }}
                >
                    Ver ofertas
                    <ArrowRight size={20} />
                </a>

                {/* Products */}
                {data.showProducts && saleProducts.length > 0 && (
                    <div className={`grid grid-cols-2 md:grid-cols-4 ${getCardGap()} mt-10`}>
                        {saleProducts.slice(0, data.productsToShow || 4).map(product => (
                            <SaleProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // Inline variant (compact)
    const renderInline = () => (
        <div
            className={`${getPaddingY()} ${getPaddingX()}`}
            style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
        >
            <div className={`mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-center ${data.contentPosition === 'left' ? 'md:justify-start' : data.contentPosition === 'right' ? 'md:justify-end' : 'md:justify-between'}`}>
                <div className="flex items-center gap-3">
                    {data.badgeText && (
                        <span
                            className={`px-3 py-1 ${getBorderRadius()} text-sm font-bold`}
                            style={{
                                backgroundColor: colors?.badgeBackground,
                                color: colors?.badgeText,
                            }}
                        >
                            {data.badgeText}
                        </span>
                    )}
                    <span className="font-semibold" style={{ color: colors?.heading }}>
                        {data.title}
                    </span>
                    {data.discountText && (
                        <span className="font-bold" style={{ color: colors?.accent }}>
                            {data.discountText}
                        </span>
                    )}
                </div>

                {!isExpired ? (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock size={16} style={{ color: colors?.accent }} />
                        <span style={{ color: colors?.text }}>
                            {data.showDays !== false && `${timeLeft.days}d `}
                            {data.showHours !== false && `${timeLeft.hours}h `}
                            {data.showMinutes !== false && `${timeLeft.minutes}m `}
                            {data.showSeconds !== false && `${timeLeft.seconds}s`}
                        </span>
                    </div>
                ) : (
                    <span style={{ color: colors?.text }}>Oferta terminada</span>
                )}
            </div>
        </div>
    );

    // Floating variant
    const renderFloating = () => (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${getPaddingX()} py-3 ${getBorderRadius()} shadow-2xl`}
            style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
        >
            <div className="flex items-center gap-4">
                {data.badgeText && (
                    <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                            backgroundColor: colors?.badgeBackground,
                            color: colors?.badgeText,
                        }}
                    >
                        {data.badgeText}
                    </span>
                )}
                <span className="font-semibold text-sm" style={{ color: colors?.heading }}>
                    {data.title}
                </span>
                {!isExpired && (
                    <div className="flex gap-1 text-sm font-mono" style={{ color: colors?.countdownText }}>
                        {data.showHours !== false && (
                            <span className="px-2 py-1 rounded" style={{ backgroundColor: colors?.countdownBackground }}>
                                {timeLeft.hours.toString().padStart(2, '0')}
                            </span>
                        )}
                        <span>:</span>
                        {data.showMinutes !== false && (
                            <span className="px-2 py-1 rounded" style={{ backgroundColor: colors?.countdownBackground }}>
                                {timeLeft.minutes.toString().padStart(2, '0')}
                            </span>
                        )}
                        <span>:</span>
                        {data.showSeconds !== false && (
                            <span className="px-2 py-1 rounded" style={{ backgroundColor: colors?.countdownBackground }}>
                                {timeLeft.seconds.toString().padStart(2, '0')}
                            </span>
                        )}
                    </div>
                )}
                <a
                    href={productListUrl}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{
                        backgroundColor: colors?.buttonBackground,
                        color: colors?.buttonText,
                    }}
                >
                    Ver
                </a>
            </div>
        </div>
    );

    return (
        <>
            {data.variant === 'banner' && renderBanner()}
            {data.variant === 'fullwidth' && renderFullwidth()}
            {data.variant === 'inline' && renderInline()}
            {data.variant === 'floating' && renderFloating()}
        </>
    );
};

export default SaleCountdown;
