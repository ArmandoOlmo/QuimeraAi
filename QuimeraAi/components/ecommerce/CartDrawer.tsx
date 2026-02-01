/**
 * CartDrawer
 * Panel lateral del carrito de compras para el storefront
 * 
 * Uses unified storefront colors system when storeId is provided
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    ShoppingBag,
    Tag,
    ArrowRight,
} from 'lucide-react';
import { CartItem } from '../../types/ecommerce';
import { useGlobalStorefrontColors } from './hooks/useUnifiedStorefrontColors';

/** Custom colors for the cart drawer from storeSettings */
interface CartDrawerColors {
    background?: string;
    heading?: string;
    text?: string;
    accent?: string;
    cardBackground?: string;
    cardText?: string;
    buttonBackground?: string;
    buttonText?: string;
    priceColor?: string;
    borderColor?: string;
}

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    items: CartItem[];
    subtotal: number;
    discountCode?: string;
    discountAmount?: number;
    onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    onRemoveItem: (productId: string, variantId?: string) => void;
    onApplyDiscount: (code: string) => Promise<{ valid: boolean; amount?: number; error?: string }>;
    onRemoveDiscount: () => void;
    onCheckout: () => void;
    currencySymbol?: string;
    /** @deprecated Use storeId instead for unified colors */
    primaryColor?: string;
    freeShippingThreshold?: number;
    /** Store ID for unified colors system */
    storeId?: string;
    /** Custom colors from storeSettings */
    colors?: CartDrawerColors;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
    isOpen,
    onClose,
    items,
    subtotal,
    discountCode,
    discountAmount = 0,
    onUpdateQuantity,
    onRemoveItem,
    onApplyDiscount,
    onRemoveDiscount,
    onCheckout,
    currencySymbol = '$',
    primaryColor,
    freeShippingThreshold = 0,
    storeId = '',
    colors,
}) => {
    const { t } = useTranslation();
    // Use unified colors system - primaryColor prop serves as fallback
    const globalColors = useGlobalStorefrontColors(storeId);
    const themeAccent = primaryColor || globalColors.primary || '#4f46e5';
    
    // Effective colors from storeSettings > primaryColor prop > globalColors
    // Priority: explicit color > theme accent > hardcoded default
    const effectiveColors = {
        background: colors?.background || '#0f172a',
        heading: colors?.heading || '#ffffff',
        text: colors?.text || '#94a3b8',
        accent: colors?.accent || themeAccent,
        cardBackground: colors?.cardBackground || '#1e293b',
        cardText: colors?.cardText || '#e2e8f0',
        buttonBackground: colors?.buttonBackground || colors?.accent || themeAccent,
        buttonText: colors?.buttonText || '#ffffff',
        priceColor: colors?.priceColor || colors?.accent || themeAccent,
        borderColor: colors?.borderColor || '#334155',
    };
    
    const effectivePrimaryColor = effectiveColors.accent;
    const [discountInput, setDiscountInput] = React.useState('');
    
    // Bloquear scroll de toda la página cuando el drawer está abierto
    React.useEffect(() => {
        if (!isOpen) return;

        // Función para prevenir scroll
        const preventScroll = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Prevenir scroll con wheel y touch
        const preventWheel = (e: WheelEvent) => {
            const target = e.target as HTMLElement;
            // Permitir scroll dentro del drawer
            const drawer = document.getElementById('cart-drawer-content');
            if (drawer && drawer.contains(target)) {
                return; // Permitir scroll dentro del drawer
            }
            e.preventDefault();
        };

        const preventTouch = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            const drawer = document.getElementById('cart-drawer-content');
            if (drawer && drawer.contains(target)) {
                return;
            }
            if (e.touches.length > 1) return; // Permitir pinch zoom
            e.preventDefault();
        };

        // Agregar listeners
        document.addEventListener('wheel', preventWheel, { passive: false });
        document.addEventListener('touchmove', preventTouch, { passive: false });
        
        // También aplicar estilos
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('wheel', preventWheel);
            document.removeEventListener('touchmove', preventTouch);
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);
    const [discountError, setDiscountError] = React.useState('');
    const [isApplyingDiscount, setIsApplyingDiscount] = React.useState(false);

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = Math.max(0, subtotal - discountAmount);
    const remainingForFreeShipping = freeShippingThreshold > 0 ? Math.max(0, freeShippingThreshold - subtotal) : 0;

    const handleApplyDiscount = async () => {
        if (!discountInput.trim()) return;

        setIsApplyingDiscount(true);
        setDiscountError('');

        try {
            const result = await onApplyDiscount(discountInput.trim().toUpperCase());
            if (!result.valid) {
                setDiscountError(result.error || t('ecommerce.storefront.cart.invalidCode'));
            } else {
                setDiscountInput('');
            }
        } catch (error) {
            setDiscountError(t('ecommerce.storefront.cart.applyError'));
        } finally {
            setIsApplyingDiscount(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity"
                onClick={onClose}
            />

            {/* Drawer - must be higher z-index than overlay */}
            <div 
                id="cart-drawer-content"
                className="fixed right-0 top-0 bottom-0 w-full max-w-md shadow-2xl z-[10000] flex flex-col overflow-y-auto"
                style={{ 
                    backgroundColor: effectiveColors.background,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div 
                    className="flex items-center justify-between p-4 border-b"
                    style={{ borderColor: effectiveColors.borderColor }}
                >
                    <div className="flex items-center gap-3">
                        <ShoppingCart size={24} style={{ color: effectiveColors.accent }} />
                        <div>
                            <h2
                                className="text-lg font-bold"
                                style={{ color: effectiveColors.heading }}
                            >
                                {t('ecommerce.storefront.cart.title')}
                            </h2>
                            <p
                                className="text-sm"
                                style={{ color: effectiveColors.text }}
                            >
                                {itemCount} {itemCount === 1 ? t('ecommerce.storefront.cart.product') : t('ecommerce.storefront.cart.products')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors hover:opacity-70"
                        style={{ color: effectiveColors.text }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Free Shipping Progress */}
                {freeShippingThreshold > 0 && remainingForFreeShipping > 0 && items.length > 0 && (
                    <div
                        className="px-4 py-3 border-b"
                        style={{
                            backgroundColor: effectiveColors.cardBackground,
                            borderColor: effectiveColors.borderColor
                        }}
                    >
                        <p className="text-sm mb-2" style={{ color: effectiveColors.text }}>
                            {t('ecommerce.storefront.cart.freeShippingProgress', { amount: `${currencySymbol}${remainingForFreeShipping.toFixed(2)}` })}
                        </p>
                        <div 
                            className="h-2 rounded-full overflow-hidden"
                            style={{ backgroundColor: effectiveColors.borderColor }}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%`,
                                    backgroundColor: effectiveColors.accent,
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <ShoppingBag className="mb-4" size={64} style={{ color: effectiveColors.borderColor }} />
                            <h3
                                className="text-lg font-medium mb-2"
                                style={{ color: effectiveColors.heading }}
                            >
                                {t('ecommerce.storefront.cart.empty')}
                            </h3>
                            <p className="mb-6" style={{ color: effectiveColors.text }}>
                                {t('ecommerce.storefront.cart.emptyMessage')}
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 rounded-lg font-medium transition-colors"
                                style={{
                                    backgroundColor: effectiveColors.buttonBackground,
                                    color: effectiveColors.buttonText
                                }}
                            >
                                {t('ecommerce.storefront.cart.continueShopping')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div
                                    key={`${item.productId}-${item.variantId || 'default'}`}
                                    className="flex gap-4 p-3 rounded-xl"
                                    style={{ backgroundColor: effectiveColors.cardBackground }}
                                >
                                    {/* Image */}
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.productName}
                                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                                        />
                                    ) : (
                                        <div 
                                            className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: effectiveColors.borderColor }}
                                        >
                                            <ShoppingBag style={{ color: effectiveColors.text }} size={24} />
                                        </div>
                                    )}

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <h4 
                                            className="font-medium truncate"
                                            style={{ color: effectiveColors.heading }}
                                        >
                                            {item.productName}
                                        </h4>
                                        {item.variantName && (
                                            <p className="text-sm" style={{ color: effectiveColors.text }}>
                                                {item.variantName}
                                            </p>
                                        )}
                                        <p className="font-bold mt-1" style={{ color: effectiveColors.priceColor }}>
                                            {currencySymbol}{item.price.toFixed(2)}
                                        </p>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUpdateQuantity(item.productId, item.quantity - 1, item.variantId);
                                                    }}
                                                    className="p-1 rounded-md transition-colors hover:opacity-70 cursor-pointer"
                                                    style={{ 
                                                        backgroundColor: effectiveColors.borderColor, 
                                                        color: effectiveColors.cardText 
                                                    }}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span 
                                                    className="w-8 text-center font-medium"
                                                    style={{ color: effectiveColors.heading }}
                                                >
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUpdateQuantity(item.productId, item.quantity + 1, item.variantId);
                                                    }}
                                                    className="p-1 rounded-md transition-colors hover:opacity-70 cursor-pointer"
                                                    style={{ 
                                                        backgroundColor: effectiveColors.borderColor, 
                                                        color: effectiveColors.cardText 
                                                    }}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    onRemoveItem(item.productId, item.variantId);
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div 
                        className="border-t p-4 space-y-4"
                        style={{ borderColor: effectiveColors.borderColor }}
                    >
                        {/* Discount Code */}
                        {!discountCode ? (
                            <div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{ color: effectiveColors.text }} />
                                        <input
                                            type="text"
                                            value={discountInput}
                                            onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                                            placeholder={t('ecommerce.storefront.cart.discountCode')}
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                                            style={{
                                                borderColor: effectiveColors.borderColor,
                                                backgroundColor: effectiveColors.background,
                                                color: effectiveColors.heading,
                                                '--tw-ring-color': effectiveColors.accent
                                            } as React.CSSProperties}
                                        />
                                    </div>
                                    <button
                                        onClick={handleApplyDiscount}
                                        disabled={isApplyingDiscount || !discountInput.trim()}
                                        className="px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                                        style={{
                                            backgroundColor: effectiveColors.buttonBackground,
                                            color: effectiveColors.buttonText
                                        }}
                                    >
                                        {isApplyingDiscount ? '...' : t('ecommerce.storefront.cart.apply')}
                                    </button>
                                </div>
                                {discountError && (
                                    <p className="text-red-500 text-sm mt-1">{discountError}</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Tag className="text-green-600" size={18} />
                                    <span className="font-medium text-green-700">
                                        {discountCode}
                                    </span>
                                    <span className="text-green-600">
                                        (-{currencySymbol}{discountAmount.toFixed(2)})
                                    </span>
                                </div>
                                <button
                                    onClick={onRemoveDiscount}
                                    className="text-green-600 hover:text-green-700"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        {/* Totals */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between" style={{ color: effectiveColors.text }}>
                                <span>{t('ecommerce.storefront.cart.subtotal')}</span>
                                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>{t('ecommerce.storefront.cart.discount')}</span>
                                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {freeShippingThreshold > 0 && remainingForFreeShipping === 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>{t('ecommerce.storefront.cart.shipping')}</span>
                                    <span>{t('ecommerce.storefront.cart.free')}</span>
                                </div>
                            )}
                            <div
                                className="flex justify-between text-lg font-bold pt-2 border-t"
                                style={{
                                    color: effectiveColors.heading,
                                    borderColor: effectiveColors.borderColor
                                }}
                            >
                                <span>{t('ecommerce.storefront.cart.total')}</span>
                                <span>{currencySymbol}{total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Checkout Button */}
                        <button
                            onClick={onCheckout}
                            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                backgroundColor: effectiveColors.buttonBackground,
                                color: effectiveColors.buttonText
                            }}
                        >
                            {t('ecommerce.storefront.cart.checkout')}
                            <ArrowRight size={20} />
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-2 transition-colors hover:opacity-70"
                            style={{ color: effectiveColors.text }}
                        >
                            {t('ecommerce.storefront.cart.continueShopping')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;



