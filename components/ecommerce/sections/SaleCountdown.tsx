/**
 * SaleCountdown Component
 * Displays a countdown timer for sales/promotions
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, Tag } from 'lucide-react';
import { SaleCountdownData, StorefrontProductItem } from '../../../types/components';
import { usePublicProducts } from '../../../hooks/usePublicProducts';
import { useSafeEditor } from '../../../contexts/EditorContext';

interface SaleCountdownProps {
    data: SaleCountdownData;
    storeId?: string;
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
    onProductClick,
}) => {
    const editorContext = useSafeEditor();
    const effectiveStoreId = storeId || editorContext?.activeProjectId || '';

    const { products: allProducts } = usePublicProducts(effectiveStoreId, {
        limitCount: data.productsToShow || 4,
    });

    // Filter sale products
    const saleProducts = React.useMemo(() => {
        if (data.productIds?.length) {
            return allProducts.filter(p => data.productIds?.includes(p.id));
        }
        // Get products on sale
        return allProducts.filter(p => p.compareAtPrice && p.compareAtPrice > p.price);
    }, [allProducts, data.productIds]);

    // Countdown timer logic
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const endDate = new Date(data.endDate).getTime();
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
        const map: Record<string, string> = { 
            none: 'rounded-none', 
            sm: 'rounded-sm', 
            md: 'rounded-md', 
            lg: 'rounded-lg', 
            xl: 'rounded-xl', 
            '2xl': 'rounded-2xl', 
            full: 'rounded-full' 
        };
        return map[data.borderRadius || 'xl'] || 'rounded-xl';
    };

    // Time unit component
    const TimeUnit = ({ value, label }: { value: number; label: string }) => (
        <div
            className={`flex flex-col items-center p-4 ${getBorderRadius()}`}
            style={{ backgroundColor: data.colors?.countdownBackground }}
        >
            <span
                className="text-3xl md:text-4xl font-bold tabular-nums"
                style={{ color: data.colors?.countdownText }}
            >
                {value.toString().padStart(2, '0')}
            </span>
            <span className="text-xs uppercase tracking-wide mt-1" style={{ color: data.colors?.text }}>
                {label}
            </span>
        </div>
    );

    // Product card for sale items
    const SaleProductCard = ({ product }: { product: StorefrontProductItem }) => {
        const discount = product.compareAtPrice
            ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
            : 0;

        const cardStyle = data.cardStyle || 'modern';
        
        // Card style classes
        const cardStyles = {
            minimal: 'bg-transparent',
            modern: `${getBorderRadius()} shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1`,
            elegant: `${getBorderRadius()} shadow-sm hover:shadow-md transition-all duration-300 border`,
            overlay: `${getBorderRadius()} overflow-hidden hover:shadow-xl transition-all duration-300`,
        };

        // Overlay style - full image with text on top
        if (cardStyle === 'overlay') {
            return (
                <div
                    className={`group cursor-pointer relative ${cardStyles.overlay}`}
                    onClick={() => product.slug && onProductClick?.(product.slug)}
                >
                    <div className="relative aspect-square overflow-hidden">
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div 
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: data.colors?.background }}
                            >
                                <span style={{ color: data.colors?.text, opacity: 0.5 }}>Sin imagen</span>
                            </div>
                        )}
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        
                        {/* Discount Badge */}
                        {discount > 0 && (
                            <span
                                className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold"
                                style={{
                                    backgroundColor: data.colors?.badgeBackground,
                                    color: data.colors?.badgeText,
                                }}
                            >
                                -{discount}%
                            </span>
                        )}
                        
                        {/* Content on Image */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="font-semibold text-sm text-white line-clamp-1">{product.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="font-bold text-white">${product.price.toFixed(2)}</span>
                                {product.compareAtPrice && (
                                    <span className="text-sm line-through text-white/60">
                                        ${product.compareAtPrice.toFixed(2)}
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
                className={`group cursor-pointer ${cardStyles[cardStyle]} overflow-hidden backdrop-blur-sm`}
                style={{ 
                    backgroundColor: data.colors?.cardBackground || 'rgba(255,255,255,0.1)',
                    borderColor: cardStyle === 'elegant' ? data.colors?.text + '20' : undefined,
                }}
                onClick={() => product.slug && onProductClick?.(product.slug)}
            >
                <div className="relative aspect-square overflow-hidden">
                    {product.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div 
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: data.colors?.background }}
                        >
                            <span style={{ color: data.colors?.text, opacity: 0.5 }}>Sin imagen</span>
                        </div>
                    )}
                    {discount > 0 && (
                        <span
                            className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold"
                            style={{
                                backgroundColor: data.colors?.badgeBackground,
                                color: data.colors?.badgeText,
                            }}
                        >
                            -{discount}%
                        </span>
                    )}
                </div>
                <div className="p-3">
                    <h4 
                        className="font-medium text-sm line-clamp-1" 
                        style={{ color: data.colors?.cardText || data.colors?.heading }}
                    >
                        {product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold" style={{ color: data.colors?.cardText || data.colors?.heading }}>
                            ${product.price.toFixed(2)}
                        </span>
                        {product.compareAtPrice && (
                            <span className="text-sm line-through" style={{ color: data.colors?.text, opacity: 0.6 }}>
                                ${product.compareAtPrice.toFixed(2)}
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
            style={{ backgroundColor: data.colors?.background }}
        >
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    {/* Content */}
                    <div className="text-center lg:text-left">
                        {data.badgeText && (
                            <span
                                className={`inline-flex items-center gap-2 px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                                style={{
                                    backgroundColor: data.colors?.badgeBackground,
                                    color: data.colors?.badgeText,
                                }}
                            >
                                <Tag size={14} />
                                {data.badgeText}
                            </span>
                        )}
                        <h2
                            className={`${getTitleSize()} font-bold mb-2`}
                            style={{ color: data.colors?.heading }}
                        >
                            {data.title}
                        </h2>
                        {data.description && (
                            <p style={{ color: data.colors?.text }}>{data.description}</p>
                        )}
                        {data.discountText && (
                            <p
                                className="text-2xl font-bold mt-2"
                                style={{ color: data.colors?.accent }}
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
                            style={{ backgroundColor: data.colors?.countdownBackground }}
                        >
                            <p className="text-lg font-semibold" style={{ color: data.colors?.countdownText }}>
                                ¡Oferta terminada!
                            </p>
                        </div>
                    )}
                </div>

                {/* Products */}
                {data.showProducts && saleProducts.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
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
                backgroundColor: data.colors?.background,
                minHeight: data.height || 300,
            }}
        >
            <div className="max-w-7xl mx-auto text-center">
                {data.badgeText && (
                    <span
                        className={`inline-flex items-center gap-2 px-4 py-1 ${getBorderRadius()} text-sm font-semibold mb-4`}
                        style={{
                            backgroundColor: data.colors?.badgeBackground,
                            color: data.colors?.badgeText,
                        }}
                    >
                        <Clock size={14} />
                        {data.badgeText}
                    </span>
                )}

                <h2
                    className={`${getTitleSize()} font-bold mb-2`}
                    style={{ color: data.colors?.heading }}
                >
                    {data.title}
                </h2>

                {data.discountText && (
                    <p
                        className="text-3xl md:text-4xl font-bold mb-6"
                        style={{ color: data.colors?.accent }}
                    >
                        {data.discountText}
                    </p>
                )}

                {/* Countdown */}
                {!isExpired ? (
                    <div className="flex justify-center gap-4 mb-8">
                        {data.showDays !== false && <TimeUnit value={timeLeft.days} label="Días" />}
                        {data.showHours !== false && <TimeUnit value={timeLeft.hours} label="Horas" />}
                        {data.showMinutes !== false && <TimeUnit value={timeLeft.minutes} label="Min" />}
                        {data.showSeconds !== false && <TimeUnit value={timeLeft.seconds} label="Seg" />}
                    </div>
                ) : (
                    <p className="text-xl mb-8" style={{ color: data.colors?.text }}>
                        ¡Esta oferta ha terminado!
                    </p>
                )}

                {data.description && (
                    <p className="mb-6" style={{ color: data.colors?.text }}>{data.description}</p>
                )}

                <a
                    href="/tienda"
                    className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                    style={{
                        backgroundColor: data.colors?.buttonBackground,
                        color: data.colors?.buttonText,
                    }}
                >
                    Ver ofertas
                    <ArrowRight size={20} />
                </a>

                {/* Products */}
                {data.showProducts && saleProducts.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
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
            style={{ backgroundColor: data.colors?.background }}
        >
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {data.badgeText && (
                        <span
                            className={`px-3 py-1 ${getBorderRadius()} text-sm font-bold`}
                            style={{
                                backgroundColor: data.colors?.badgeBackground,
                                color: data.colors?.badgeText,
                            }}
                        >
                            {data.badgeText}
                        </span>
                    )}
                    <span className="font-semibold" style={{ color: data.colors?.heading }}>
                        {data.title}
                    </span>
                    {data.discountText && (
                        <span className="font-bold" style={{ color: data.colors?.accent }}>
                            {data.discountText}
                        </span>
                    )}
                </div>

                {!isExpired ? (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock size={16} style={{ color: data.colors?.accent }} />
                        <span style={{ color: data.colors?.text }}>
                            {data.showDays !== false && `${timeLeft.days}d `}
                            {data.showHours !== false && `${timeLeft.hours}h `}
                            {data.showMinutes !== false && `${timeLeft.minutes}m `}
                            {data.showSeconds !== false && `${timeLeft.seconds}s`}
                        </span>
                    </div>
                ) : (
                    <span style={{ color: data.colors?.text }}>Oferta terminada</span>
                )}
            </div>
        </div>
    );

    // Floating variant
    const renderFloating = () => (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${getPaddingX()} py-3 ${getBorderRadius()} shadow-2xl`}
            style={{ backgroundColor: data.colors?.background }}
        >
            <div className="flex items-center gap-4">
                {data.badgeText && (
                    <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                            backgroundColor: data.colors?.badgeBackground,
                            color: data.colors?.badgeText,
                        }}
                    >
                        {data.badgeText}
                    </span>
                )}
                <span className="font-semibold text-sm" style={{ color: data.colors?.heading }}>
                    {data.title}
                </span>
                {!isExpired && (
                    <div className="flex gap-1 text-sm font-mono" style={{ color: data.colors?.countdownText }}>
                        {data.showHours !== false && (
                            <span className="px-2 py-1 rounded" style={{ backgroundColor: data.colors?.countdownBackground }}>
                                {timeLeft.hours.toString().padStart(2, '0')}
                            </span>
                        )}
                        <span>:</span>
                        {data.showMinutes !== false && (
                            <span className="px-2 py-1 rounded" style={{ backgroundColor: data.colors?.countdownBackground }}>
                                {timeLeft.minutes.toString().padStart(2, '0')}
                            </span>
                        )}
                        <span>:</span>
                        {data.showSeconds !== false && (
                            <span className="px-2 py-1 rounded" style={{ backgroundColor: data.colors?.countdownBackground }}>
                                {timeLeft.seconds.toString().padStart(2, '0')}
                            </span>
                        )}
                    </div>
                )}
                <a
                    href="/tienda"
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{
                        backgroundColor: data.colors?.buttonBackground,
                        color: data.colors?.buttonText,
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
